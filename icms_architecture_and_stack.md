# ICMS — Architecture & Technology Stack

## 1. System Identity

**Name:** Intelligent Compliance Management System (ICMS)  
**Purpose:** An enterprise-grade, automated Governance, Risk & Compliance (GRC) platform that integrates with the Wazuh SIEM to continuously assess organizational compliance posture against frameworks such as ISO 27001:2022 and SOC 2 Type II.  
**Deployment Model:** Fully containerized via Docker Compose. All services run as independent containers on a single host, communicating over a Docker bridge network.

---

## 2. Technology Stack (Complete Inventory)

### 2.1 Backend — Django REST Framework

| Component | Technology | Version Range |
|---|---|---|
| Runtime | Python 3.12 (slim) | `python:3.12-slim` |
| Framework | Django + DRF | `>=5.1, <5.2` / `>=3.15, <4.0` |
| Database Driver | psycopg (binary) | `>=3.2, <4.0` |
| JWT Authentication | SimpleJWT | `>=5.3, <6.0` |
| CORS | django-cors-headers | `>=4.6, <5.0` |
| Environment | python-decouple | `>=3.8, <4.0` |
| 2FA (TOTP) | pyotp + qrcode | `>=2.9` / `>=7.4` |
| Image Processing | Pillow | `>=10.0, <12.0` |
| Background Tasks | Celery + Redis | `>=5.4` / `>=5.0` |
| Periodic Scheduler | django-celery-beat | `>=2.7, <3.0` |
| PDF Generation | xhtml2pdf | `>=0.2.16` |
| Wazuh Integration | requests + urllib3 | `>=2.32, <3.0` |

### 2.2 Frontend — React SPA

| Component | Technology |
|---|---|
| Build Tool | Vite |
| UI Framework | React 18+ |
| Styling | Tailwind CSS v4 (with `@theme` custom tokens) |
| HTTP Client | Axios (with interceptors for JWT + 403 handling) |
| Routing | React Router v6 |
| Icons | Lucide React |
| Charts | Recharts |

### 2.3 Infrastructure — Docker Compose Services

The platform is orchestrated via `docker-compose.yml` with **7 services**:

| Service | Image | Port | Purpose |
|---|---|---|---|
| `db` | `postgres:18` | 5432 | Primary database. Health-checked with `pg_isready`. |
| `backend` | Custom (Dockerfile) | 8000 | Django API server. Auto-runs migrations on boot. |
| `frontend` | Custom (Dockerfile) | 5173 | Vite dev server. Node modules are volume-excluded. |
| `redis` | `redis:7-alpine` | 6379 | Celery message broker. Health-checked with `redis-cli ping`. |
| `celery_worker` | (backend image) | — | Executes async tasks (Wazuh scans). |
| `celery_beat` | (backend image) | — | Periodic task scheduler using `DatabaseScheduler`. |
| `mcp-server` | `crystaldba/postgres-mcp` | 8001 | SSE-based Postgres MCP server for AI tooling. |

### 2.4 External Integration — Wazuh SIEM

| Parameter | Value |
|---|---|
| Protocol | HTTPS (self-signed, `verify_ssl=False`) |
| Host | `192.168.100.100:55000` (configurable via env) |
| Auth | HTTP Basic → JWT bearer token |
| Credential Source | `WAZUH_API_HOST`, `WAZUH_API_USER`, `WAZUH_API_PASSWORD` env vars |

---

## 3. Service Architecture Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                    Docker Compose Network                    │
│                                                              │
│  ┌────────────┐     ┌────────────┐     ┌────────────────┐   │
│  │  Frontend   │────▸│  Backend   │────▸│  PostgreSQL    │   │
│  │  (Vite)    │     │  (Django)  │     │  (postgres:18) │   │
│  │  :5173     │     │  :8000     │     │  :5432         │   │
│  └────────────┘     └─────┬──────┘     └────────────────┘   │
│                           │                                  │
│                     ┌─────┴──────┐                           │
│                     │   Redis    │                           │
│                     │ :6379      │                           │
│                     └─────┬──────┘                           │
│                           │                                  │
│                ┌──────────┼──────────┐                       │
│                │          │          │                        │
│          ┌─────┴────┐ ┌──┴───────┐                          │
│          │  Celery   │ │  Celery  │                          │
│          │  Worker   │ │  Beat    │                          │
│          └──────────┘ └──────────┘                           │
│                                                              │
└──────────────────────────────────────────────────────────────┘
                           │
                    HTTPS (55000)
                           │
                    ┌──────┴──────┐
                    │  Wazuh SIEM │
                    │  Manager    │
                    │  (VM/Host)  │
                    └─────────────┘
```

---

## 4. Data Flow: Wazuh Scan → Frontend Dashboard

This is the core value chain of the platform. Here is the precise, step-by-step data flow:

### Step 1: Scan Trigger
A compliance scan is initiated in one of three ways:
1. **Manual:** A user clicks "Run Scan" in the UI → `POST /api/run-scan/` → Django calls `python manage.py sync_wazuh_scans` synchronously.
2. **Scheduled:** Celery Beat fires a periodic task (frequency set in `SystemSettings` singleton: daily/weekly/monthly) → the same management command runs asynchronously via the Celery Worker.
3. **CLI:** `docker compose exec backend python manage.py sync_wazuh_scans --agent 001`.

### Step 2: Wazuh API Interaction (`WazuhAPIClient`)
The `sync_wazuh_scans` management command:
1. Instantiates `WazuhAPIClient` (reads credentials from environment variables).
2. Authenticates via `GET /security/user/authenticate` using HTTP Basic Auth → receives a Wazuh JWT token.
3. Calls `GET /agents?status=active` to discover all active agents.
4. For each agent, calls `GET /sca/{agent_id}` to list SCA policies, then `GET /sca/{agent_id}/checks/{policy_id}` to retrieve individual pass/fail checks.

### Step 3: GRC Mapping & Ingestion
For each SCA check returned by Wazuh:
1. The check's `compliance` array (e.g., `[{"key": "cis", "value": "2.1.1.1"}]`) is parsed.
2. Each compliance value is looked up against the `WazuhMapping` table (pre-loaded in memory as a `dict` keyed by `wazuh_rule_id`).
3. If a match is found, a `ScanResult` record is created: `{ scan, mapping, is_passed, raw_log_data }`.
4. **Deduplication logic:** If a mapping appears multiple times, the engine prioritizes the FAIL result (worst-case principle).

### Step 4: Score Calculation
After all checks for an agent are processed:
- `overall_score = (passed_count / mapped_count) * 100`
- The `ComplianceScan.overall_score` field is updated.

### Step 5: Dashboard Aggregation (`DashboardSummaryView`)
When the frontend loads `/`:
1. `GET /api/dashboard-summary/` is called.
2. The view finds the latest scan per unique agent (`DISTINCT ON agent_id`).
3. It calculates:
   - **Overall compliance score:** `Avg(overall_score)` across all latest scans.
   - **Per-framework breakdown:** Using `Framework.objects.annotate()` with `Count()` and `Q()` filters to count total and passed checks per framework — **this is the N+1 optimization** (single SQL query instead of 20+).
   - **Top failed controls:** Aggregated from `ScanResult` with `annotate(fail_count=Count("id"))`.
   - **Recent scans:** Last 5 scans ordered by date.
4. The response is a single JSON payload consumed by `Dashboard.jsx`.

### Step 6: Frontend Rendering
- `Dashboard.jsx` receives the JSON and renders Recharts bar/pie charts, compliance score gauges, and a top-failed-controls list.
- All data is mapped through `useState` and `useEffect` hooks. The Axios interceptor automatically attaches the JWT token to every request.

---

## 5. Database Schema (Entity Relationships)

```
Framework ──< Control ──< Risk
                │
                ├──< WazuhMapping ──< ScanResult >── ComplianceScan
                │
                └──>< Policy  (M2M via control_ids)

User (auth.User) ──── UserProfile (1:1, role/totp_secret/expiry)
                 └──< AuditLog (nullable FK)

SystemSettings (Singleton, pk=1)
SMTPSettings   (Singleton, pk=1)
```

### Key Models

| Model | Purpose | Key Fields |
|---|---|---|
| `Framework` | Compliance standard (ISO 27001, SOC 2) | `name`, `version` |
| `Control` | Auditable control within a framework | `control_code`, `title`, `weight`, FK→Framework |
| `Policy` | Organizational policy document | `title`, `status`, M2M→Controls |
| `Risk` | Risk entry linked to a control | `severity`, `risk_score` (1-10), `remediation_steps` |
| `WazuhMapping` | Bridge: Wazuh rule → GRC Control | `wazuh_rule_id` (unique), FK→Control |
| `ComplianceScan` | Point-in-time scan for one agent | `agent_id`, `scan_date`, `overall_score` |
| `ScanResult` | Individual pass/fail for one check | `is_passed`, `raw_log_data` (JSON), FK→Scan, FK→WazuhMapping |
| `UserProfile` | Role + 2FA + profile extension | `role` (super_admin/admin/auditor), `totp_secret`, `account_expiry_date` |
| `AuditLog` | Platform event log | `action`, `module`, `status`, FK→User (nullable) |
| `SystemSettings` | Singleton config | `passing_score_threshold`, `scan_frequency`, `audit_log_retention` |
| `SMTPSettings` | Singleton SMTP config | `host`, `port`, `username`, `password`, `use_tls` |

---

## 6. Backend Dockerfile & System Dependencies

The backend Dockerfile (`backend/Dockerfile`) is a single-stage `python:3.12-slim` build:

```dockerfile
RUN apt-get update \
    && apt-get install -y --no-install-recommends gcc libpq-dev \
       pkg-config libcairo2-dev \
    && rm -rf /var/lib/apt/lists/*
```

**Why `libcairo2-dev`?** The `xhtml2pdf` library depends on `pycairo` for rendering fonts and graphics in PDFs. Without this system library, the Docker build fails with C-binding compilation errors.

---

## 7. Environment Variables

All secrets are loaded via `python-decouple` from `backend/.env`:

| Variable | Purpose |
|---|---|
| `SECRET_KEY` | Django secret key |
| `DEBUG` | Debug mode toggle |
| `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT` | PostgreSQL connection |
| `WAZUH_API_HOST`, `WAZUH_API_USER`, `WAZUH_API_PASSWORD` | Wazuh SIEM credentials |
| `CELERY_BROKER_URL`, `CELERY_RESULT_BACKEND` | Redis connection strings |

---

## 8. Management Commands

| Command | File | Purpose |
|---|---|---|
| `sync_wazuh_scans` | `sync_wazuh_scans.py` | Polls Wazuh SCA API, ingests results, calculates scores |
| `seed_enterprise_matrix` | `seed_enterprise_matrix.py` | Seeds ISO 27001 and SOC 2 frameworks, controls, and WazuhMappings |
| `seed_grc_data` | `seed_grc_data.py` | Seeds sample policies, risks, and audit logs |
| `seed_users` | `seed_users.py` | Creates initial superadmin and test users |

---

## 9. API Endpoint Map

### Router-Generated (DRF ViewSets)
| Endpoint | ViewSet | Methods |
|---|---|---|
| `/api/frameworks/` | `FrameworkViewSet` | GET (read-only) |
| `/api/controls/` | `ControlViewSet` | CRUD (admin+) |
| `/api/policies/` | `PolicyViewSet` | CRUD (admin+) |
| `/api/risks/` | `RiskViewSet` | GET (read-only) |
| `/api/wazuh-mappings/` | `WazuhMappingViewSet` | GET (read-only) |
| `/api/scans/` | `ComplianceScanViewSet` | GET (read-only) |
| `/api/scan-results/` | `ScanResultViewSet` | GET (read-only) |
| `/api/audit-logs/` | `AuditLogViewSet` | GET (read-only) |
| `/api/users/` | `UserManagementViewSet` | CRUD (super_admin) |

### Custom API Views
| Endpoint | View | Method | Purpose |
|---|---|---|---|
| `/api/dashboard-summary/` | `DashboardSummaryView` | GET | Aggregated dashboard data |
| `/api/generate-report/` | `GenerateReportView` | GET | Compliance PDF download |
| `/api/generate-audit-report/` | `GenerateAuditReportView` | GET | Audit trail PDF download |
| `/api/run-scan/` | `RunScanView` | POST | Trigger manual Wazuh sync |
| `/api/settings/` | `SystemSettingsView` | GET/PATCH | System configuration |
| `/api/smtp-settings/` | `SMTPSettingsView` | GET/PATCH | SMTP configuration |
| `/api/auth/token/` | `CustomTokenObtainPairView` | POST | Login (with 2FA check) |
| `/api/auth/me/` | `MeView` | GET | Current user profile |
| `/api/auth/update-profile/` | `UpdateProfileView` | PATCH | Update own profile |
| `/api/auth/forgot-password/` | `ForgotPasswordView` | POST | Initiate password reset |
| `/api/auth/select-method/` | `SelectMethodView` | POST | Choose email/app OTP |
| `/api/auth/verify-email-otp/` | `VerifyEmailOTPView` | POST | Verify email OTP |
| `/api/auth/resend-email-otp/` | `ResendEmailOTPView` | POST | Resend email OTP |
| `/api/auth/verify-totp/` | `VerifyTOTPView` | POST | Verify TOTP for reset |
| `/api/auth/verify-login-totp/` | `VerifyLoginTOTPView` | POST | Verify TOTP on login |
| `/api/auth/reset-password/` | `ResetPasswordView` | POST | Set new password |
| `/api/auth/change-password/` | `ChangePasswordView` | POST | Change own password |
| `/api/auth/profile-setup/` | `ProfileSetupView` | POST | First-login setup |
| `/api/auth/sudo-verify/` | `SudoVerifyView` | POST | Re-authenticate for sensitive ops |

---

## 10. Frontend Routing

| Path | Component | Guard |
|---|---|---|
| `/login` | `Login.jsx` | GuestRoute (redirects authenticated users) |
| `/verify-otp` | `VerifyOTP.jsx` | None (intermediate 2FA step) |
| `/forgot-password` | `ForgotPassword.jsx` | GuestRoute |
| `/profile-setup` | `ProfileSetup.jsx` | SetupRoute (only if `needs_setup`) |
| `/` | `Dashboard.jsx` | ProtectedRoute |
| `/scans` | `Scans.jsx` | ProtectedRoute |
| `/frameworks` | `Frameworks.jsx` | ProtectedRoute |
| `/policies` | `Policies.jsx` | ProtectedRoute |
| `/reports` | `Reports.jsx` | ProtectedRoute |
| `/settings` | `Settings.jsx` | ProtectedRoute |
| `/manage-admins` | `ManageAdmins.jsx` | ProtectedRoute + `requiredRole="super_admin"` |

---

*Document generated from codebase analysis — April 23, 2026*
