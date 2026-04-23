# ICMS — Core Logic, Security & Backend Engineering

## 1. Role-Based Access Control (RBAC)

### 1.1 Role Hierarchy

The platform implements a three-tier role hierarchy via the `UserProfile.Role` enum:

| Role | Code | Permissions |
|---|---|---|
| **Super Admin** | `super_admin` | Full platform control. User management, SMTP config, system settings, all CRUD operations. |
| **Admin** | `admin` | Read + write access to policies, controls, scans. Cannot manage users or system settings. |
| **Auditor** | `auditor` | **Read-only** access. Can view dashboards, policies, scans, and download reports. Cannot create, edit, or delete anything. |

### 1.2 Permission Classes (Backend Implementation)

The RBAC system is implemented as custom DRF `BasePermission` classes in `compliance/views.py`:

#### `IsSuperAdmin`
```python
class IsSuperAdmin(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        try:
            return request.user.profile.role == "super_admin"
        except UserProfile.DoesNotExist:
            return request.user.is_superuser
```
- Used exclusively on: `UserManagementViewSet`, `SMTPSettingsView`.
- Falls back to Django's `is_superuser` flag if no `UserProfile` exists (handles initial bootstrapping).

#### `IsAdminOrSuperAdmin`
```python
class IsAdminOrSuperAdmin(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method in SAFE_METHODS:
            return True   # ← Auditors get through here (GET, HEAD, OPTIONS)
        if request.user.is_superuser:
            return True
        try:
            role = request.user.profile.role
            return role in ["super_admin", "admin"]
        except UserProfile.DoesNotExist:
            return False
```
- Used on: `ControlViewSet`, `PolicyViewSet`, `SystemSettingsView`, `RunScanView`.
- **Key behavior:** `SAFE_METHODS` (GET/HEAD/OPTIONS) always return `True`, meaning **Auditors can read everything** but are blocked from any write operation (POST/PUT/PATCH/DELETE).

### 1.3 Frontend RBAC Enforcement

#### Sidebar Navigation Filtering
`DashboardLayout.jsx` uses a `NAV_MAP` object keyed by role:
- **Super Admin:** Sees all pages + "Manage Admins" (with amber `SUPER` badge).
- **Admin:** Sees all pages except "Manage Admins".
- **Auditor:** Sees a reduced set with a grey `VIEW` badge on Policies (indicating read-only).

#### Route Guards (`App.jsx`)
Three guard components wrap routes:
1. `ProtectedRoute` — Requires authentication. Redirects to `/login` if not. Checks `needsSetup` for first-login redirection.
2. `SetupRoute` — Only accessible when `needs_setup === true` (first-time password change).
3. `GuestRoute` — Accessible only when NOT authenticated (redirects to `/` if already logged in).

The `ManageAdmins` page has an additional `requiredRole="super_admin"` guard.

#### Global 403 Interceptor (`api/axios.js`)
The Axios response interceptor catches `403 Forbidden` responses and dispatches a custom DOM event:
```javascript
if (error.response?.status === 403) {
    const msg = error.response.data?.error || error.response.data?.detail 
                || "Permission Denied: You do not have the required role...";
    window.dispatchEvent(new CustomEvent('grc-access-denial', { 
        detail: { message: msg } 
    }));
}
```
`DashboardLayout.jsx` listens for `'grc-access-denial'` events and displays a red toast notification. This ensures that even if an auditor somehow reaches a restricted UI element, the backend rejection is visually communicated.

---

## 2. Authentication Architecture

### 2.1 JWT Token Flow

1. **Login:** `POST /api/auth/token/` → `CustomTokenObtainPairView` → `CustomTokenObtainPairSerializer`.
2. The serializer calls `django.contrib.auth.authenticate()`.
3. **Account Expiry Check:** If `profile.account_expiry_date < now()`, the account is auto-deactivated and login is rejected.
4. **2FA Check:** If `profile.totp_secret` is set, the serializer returns `{ requires_2fa: true, username }` — **no tokens are issued yet**.
5. **2FA Verification:** Frontend routes to `/verify-otp` → user enters 6-digit code → `POST /api/auth/verify-login-totp/` → if valid, full JWT tokens are issued.
6. Tokens are stored in `localStorage`:
   - `grc_access_token` — 1-day lifetime
   - `grc_refresh_token` — 7-day lifetime, rotated on each refresh

### 2.2 Token Refresh (Automatic)
The Axios interceptor handles `401` responses:
1. On first `401`, attempts `POST /api/auth/token/refresh/` with the stored refresh token.
2. If successful, stores the new access token (and rotated refresh token) and retries the original request.
3. If refresh fails, clears all tokens and redirects to `/login`.

### 2.3 Password Reset Flow (Multi-Step)
1. `POST /api/auth/forgot-password/` — Validates email exists, stores `reset_pending_{email}` in Django cache (10 min TTL).
2. `POST /api/auth/select-method/` — User chooses `email` (OTP) or `app` (TOTP).
   - **Email:** Generates 6-digit OTP, stores in cache with 2-minute expiry, sends via SMTP in a background thread.
   - **App:** Redirects to TOTP verification page.
3. `POST /api/auth/verify-email-otp/` or `POST /api/auth/verify-totp/` — Validates the code. On success, sets `reset_verified_{email}` in cache.
4. `POST /api/auth/reset-password/` — Requires `reset_verified_{email}` flag. Sets new password. Clears all cache keys. Records `password_changed_at` on `UserProfile`.

### 2.4 First-Login Profile Setup
When a new user is created by a Super Admin, their `password_changed_at` is `None`. The `MeView` returns `needs_setup: true`, which triggers the `SetupRoute` guard to redirect them to `/profile-setup`. This page forces them to:
- Set a new strong password (min 8 chars, uppercase, lowercase, digit, special character)
- Fill in display name, designation, and phone number

### 2.5 Sudo Verification
Sensitive operations (e.g., changing SMTP settings) require re-authentication:
- `POST /api/auth/sudo-verify/` — Takes the user's password and returns `{ valid: true/false }`.
- The frontend gates certain actions behind this check.

---

## 3. User Management System (Super Admin)

### 3.1 User Creation Flow
`POST /api/users/` (Super Admin only):
1. Accepts `email`, optional `username` (defaults to email prefix), `role`, and optional `account_expiry_date`.
2. Generates a 14-character strong password using `secrets.choice()` with enforced complexity (uppercase + lowercase + digit + special).
3. Generates a unique TOTP secret via `pyotp.random_base32()`.
4. Creates `User` + `UserProfile` records.
5. Fires a background thread to send an invite email containing:
   - Login credentials
   - QR code (inline CID attachment) for authenticator app setup
   - Manual TOTP secret (space-separated groups for readability)
   - Expiry notice (for auditor accounts)

### 3.2 Account Lifecycle Actions
| Action | Endpoint | Behavior |
|---|---|---|
| **Toggle Active** | `PATCH /api/users/{id}/toggle-active/` | Flips `is_active`. Sends revoke/restore notification email. |
| **Regenerate Credentials** | `POST /api/users/{id}/regenerate-credentials/` | New password + TOTP secret. Re-activates if deactivated. Sends new invite email with QR code. |
| **Send Reminder** | `POST /api/users/{id}/send-reminder/` | Emails user to change their password immediately. |
| **Delete** | `DELETE /api/users/{id}/` | Permanent deletion from database. |

### 3.3 Time-Bound Auditor Access
Auditor accounts can have an `account_expiry_date`. The `CustomTokenObtainPairSerializer` checks this date on every login attempt. If expired:
- The account is auto-deactivated (`is_active = False`)
- Login is rejected with: "Account has expired. Contact your Super Administrator."
- The Super Admin can renew via `regenerate-credentials` with a new expiry date.

---

## 4. Compliance Mapping Logic

### 4.1 The Bridge Pattern: `WazuhMapping`

The `WazuhMapping` model is the critical bridge between the SIEM and the governance layer:

```
Wazuh SCA Check (rule_id: "2.1.1.1")
        │
        ▼
WazuhMapping (wazuh_rule_id: "2.1.1.1" → control_id: 42)
        │
        ▼
Control (control_code: "A.9.2.4", framework_id: 1 [ISO 27001])
```

**Key constraint:** `wazuh_rule_id` is unique. Each Wazuh rule maps to exactly one `Control`.

### 4.2 Multi-Framework Coverage

A single Wazuh SCA check can satisfy controls across multiple frameworks **indirectly**:
- The same technical check (e.g., "Ensure SSH root login is disabled") may appear as separate compliance values in the Wazuh `compliance` array.
- The `seed_enterprise_matrix.py` management command creates separate `WazuhMapping` entries for each framework's control code.
- Example: Wazuh check with compliance values `["2.1.1.1", "CC6.1"]` would match:
  - `WazuhMapping(wazuh_rule_id="2.1.1.1")` → ISO 27001 Control A.8.9
  - `WazuhMapping(wazuh_rule_id="CC6.1")` → SOC 2 Control CC6.1

### 4.3 Scan Result Processing & Deduplication

The `sync_wazuh_scans` command implements careful deduplication:

```python
seen_mappings: dict[int, ScanResult] = {}

for check in checks:
    # ... find matching WazuhMapping ...
    
    if mapping.pk in seen_mappings:
        existing = seen_mappings[mapping.pk]
        # Prioritize FAIL over PASS (worst-case principle)
        if existing.is_passed and not is_passed:
            existing.is_passed = False
            existing.save()
        continue  # Skip duplicate
    
    result = ScanResult.objects.create(scan=scan, mapping=mapping, is_passed=is_passed)
    seen_mappings[mapping.pk] = result
```

This ensures that if a Wazuh agent reports the same mapped check multiple times (e.g., from different SCA policies), only one `ScanResult` per mapping per scan is stored, and failures take precedence.

### 4.4 Score Calculation

Per-agent score:
```
score = (passed_count / mapped_count) * 100
```

Dashboard overall score:
```
Avg(ComplianceScan.overall_score) across latest scan per unique agent
```

Per-framework score (using Django `.annotate()`):
```python
Framework.objects.annotate(
    total_checks=Count(
        "controls__wazuh_mappings__scan_results",
        filter=Q(controls__wazuh_mappings__scan_results__scan__in=latest_scans)
    ),
    passed_checks=Count(
        "controls__wazuh_mappings__scan_results",
        filter=Q(
            controls__wazuh_mappings__scan_results__scan__in=latest_scans,
            controls__wazuh_mappings__scan_results__is_passed=True
        )
    )
)
```

---

## 5. N+1 Query Optimization

### 5.1 The Problem
The original dashboard view made separate database queries for each framework to calculate compliance scores, resulting in 20+ queries on a system with 2 frameworks and 10 agents.

### 5.2 The Fix
The `DashboardSummaryView` now uses a single `Framework.objects.annotate()` call that traverses the entire ORM relationship chain (`controls → wazuh_mappings → scan_results → scan`) in a single SQL query with `COUNT` and `FILTER` aggregations.

### 5.3 Other Query Optimizations
| Location | Optimization |
|---|---|
| `ControlViewSet` | `.select_related("framework").prefetch_related("wazuh_mappings")` |
| `PolicyViewSet` | `.prefetch_related("controls__framework")` |
| `ComplianceScanViewSet` | `.prefetch_related("results__mapping__control__framework")` |
| `ScanResultViewSet` | `.select_related("scan", "mapping__control__framework")` |
| `AuditLogViewSet` | `.select_related("user")` |
| `UserManagementViewSet.list` | `.select_related("profile")` |
| `sync_wazuh_scans` | Pre-loads all `WazuhMapping` objects into a `dict` before processing (avoids per-check DB lookups). |

---

## 6. The Server-Side PDF Engine

### 6.1 Technology
- **Library:** `xhtml2pdf` (also known as `pisa`). Version `>=0.2.16`.
- **Template Engine:** Django's `render_to_string()` with standard Django template language.
- **System Dependencies:** Requires `libcairo2-dev` installed at the OS level (handled in Dockerfile).

### 6.2 Critical Constraint: CSS2 Only
`xhtml2pdf` has severe CSS limitations. The following will cause **500 Internal Server Error** (parser crash):

| Feature | Status | Error |
|---|---|---|
| CSS Flexbox (`display: flex`) | ❌ NOT SUPPORTED | Silently ignored (broken layout) |
| CSS Grid (`display: grid`) | ❌ NOT SUPPORTED | Silently ignored |
| `@page { @top-left { ... } }` | ❌ CRASHES | `TypeError: 'NotImplementedType' object is not iterable` |
| `@page { @bottom-right { ... } }` | ❌ CRASHES | Same as above |
| `@page { @frame ... }` | ⚠️ Unreliable | Works in some versions, crashes in others |
| Modern selectors (`:nth-child`, `:is()`) | ❌ NOT SUPPORTED | Ignored or crashes |
| `border-radius` on `<span>` | ⚠️ Limited | Only works with `display: inline-block` |
| `background-color` on `<div>` | ✅ Works | — |
| `<table>` layouts | ✅ Fully supported | **This is the only reliable layout method** |

### 6.3 Safe Template Pattern
The current templates follow this crash-proof pattern:
```html
<style>
    @page { size: A4; margin: 1.5cm; }
    /* ALL other styling uses flat CSS2 properties */
</style>
<body>
    <!-- Header simulated via a <table> at the top of the document -->
    <table class="report-header">
        <tr>
            <td class="header-left">ICMS Compliance Report</td>
            <td class="header-right">Date: {{ generation_date }}</td>
        </tr>
    </table>
    <!-- ALL content uses <table> layouts with explicit width= attributes -->
</body>
```

### 6.4 Report Views

#### `GenerateReportView` (`GET /api/generate-report/?framework_id=X`)
1. Validates `framework_id` query parameter.
2. Finds the latest scan per unique agent.
3. Filters `ScanResult` objects by `mapping__control__framework=framework`.
4. Calculates per-framework `total_checks`, `passed_checks`, `compliance_score`.
5. Aggregates failed controls with `annotate(fail_count=Count("id"))`.
6. Renders `compliance_report.html` with context → `pisa.pisaDocument()` → `HttpResponse(content_type='application/pdf')`.

#### `GenerateAuditReportView` (`GET /api/generate-audit-report/`)
1. Queries the latest 200 `AuditLog` entries with `.select_related("user")`.
2. Calculates `total_entries`, `success_count`, `alert_count`.
3. Renders `audit_report.html` → same PDF pipeline.

### 6.5 Frontend Download Pattern
The `Reports.jsx` page uses a **raw `fetch()` call** instead of the Axios instance to download PDFs:
```javascript
const token = localStorage.getItem('grc_access_token');
const response = await fetch(
    `http://localhost:8000/api/generate-report/?framework_id=${selectedFw}`,
    { headers: { Authorization: `Bearer ${token}` } }
);
const blob = await response.blob();
const url = window.URL.createObjectURL(blob);
// ... create <a> element, click it, revoke URL
```
**Why not Axios?** The Axios response interceptor attempts to JSON-parse error responses, which corrupts binary PDF blob data. Using raw `fetch()` bypasses this entirely.

---

## 7. Audit Logging

### 7.1 The `_audit()` Helper
Every write operation in the backend calls:
```python
def _audit(user, action, module, status_val="Success"):
    AuditLog.objects.create(
        user=user if user and user.is_authenticated else None,
        action=action, module=module, status=status_val,
    )
```

### 7.2 Logged Events
| Module | Events Logged |
|---|---|
| `Auth` | Password reset, password change |
| `Policy` | Create, update, delete |
| `Control` | Create, update |
| `Admin` | User invited, credentials regenerated, access revoked/restored, reminder sent, user deleted |
| `Scan` | Manual scan triggered, scan completed/failed |
| `Settings` | System settings updated, SMTP settings updated |

### 7.3 Automated Events
The `sync_wazuh_scans` command creates a system-level audit log (no user attached):
```python
AuditLog.objects.create(
    action=f"generated a scheduled scan ({total_scans} agent(s), {total_results} result(s))",
    module="Scan", status="System",
)
```

---

## 8. Email Notification System

### 8.1 SMTP Configuration
Stored as a singleton `SMTPSettings` model. Credentials are dynamically loaded per-email via `_get_smtp_config()`.

### 8.2 Email Templates
All emails use inline HTML with a consistent dark-header design:
- **Invite Email:** Contains login credentials, QR code (CID attachment), manual TOTP secret, and role-specific messaging.
- **Reminder Email:** Mandatory password change notification.
- **Status Email:** Account revoked/restored notification.
- **OTP Email:** 6-digit code with 2-minute expiry, styled in a dark-slate code block.

### 8.3 Background Thread Pattern
All emails are sent in daemon threads to avoid blocking API responses:
```python
import threading
t = threading.Thread(target=_send_invite_email, args=(...))
t.daemon = True
t.start()
```

---

## 9. Celery & Redis Architecture

### 9.1 Configuration
```python
# core/settings.py
CELERY_BROKER_URL = 'redis://redis:6379/0'
CELERY_RESULT_BACKEND = 'redis://redis:6379/0'
CELERY_BEAT_SCHEDULER = 'django_celery_beat.schedulers:DatabaseScheduler'
```

### 9.2 Docker Services
- **`celery_worker`:** Runs `celery -A core worker --loglevel=info`. Executes background tasks.
- **`celery_beat`:** Runs `celery -A core beat --loglevel=info --scheduler django_celery_beat.schedulers:DatabaseScheduler`. Fires periodic scans based on `SystemSettings.scan_frequency`.

### 9.3 Schedule Sync
When a Super Admin changes `scan_frequency` in the UI, the `SystemSettingsView.patch()` method calls:
```python
from compliance.scheduler import sync_celery_beat_schedule
sync_celery_beat_schedule()
```
This dynamically updates the Celery Beat schedule in the database without requiring a container restart.

---

## 10. Pagination

The platform uses a custom flexible pagination class:
```python
# core/settings.py
REST_FRAMEWORK = {
    'DEFAULT_PAGINATION_CLASS': 'compliance.pagination.FlexiblePagePagination',
    'PAGE_SIZE': 20,
}
```
This allows the frontend to control page size via `?page_size=50` query parameter (used by the audit log on the Reports page).

---

*Document generated from codebase analysis — April 23, 2026*
