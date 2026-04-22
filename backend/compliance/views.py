"""
compliance/views.py
───────────────────
DRF ViewSets and API views for the GRC compliance engine.

Write-enabled ViewSets for Policy, Control.
SystemSettings singleton API.
UserManagement for Super Admins.
Audit logging on all write operations.
"""

import io
import re
import traceback
import secrets
import string

from django.contrib.auth.models import User
from django.core.management import call_command
from django.db.models import Avg, Count, Q
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny, BasePermission, SAFE_METHODS
from django.utils import timezone
from django.http import HttpResponse
from django.template.loader import render_to_string
import xhtml2pdf.pisa as pisa

from .models import (
    ComplianceScan,
    Control,
    Framework,
    Policy,
    Risk,
    ScanResult,
    WazuhMapping,
    AuditLog,
    UserProfile,
    SystemSettings,
    SMTPSettings,
)
from .serializers import (
    ComplianceScanSerializer,
    ControlSerializer,
    FrameworkSerializer,
    PolicySerializer,
    RiskSerializer,
    ScanResultSerializer,
    WazuhMappingSerializer,
    AuditLogSerializer,
    UserProfileSerializer,
    SystemSettingsSerializer,
    UserManagementSerializer,
    CreateUserSerializer,
    SMTPSettingsSerializer,
)


# ── Custom permission ──────────────────────────────
class IsSuperAdmin(BasePermission):
    """Only allows access to super_admin role users."""

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        try:
            return request.user.profile.role == "super_admin"
        except UserProfile.DoesNotExist:
            return request.user.is_superuser


class IsAdminOrSuperAdmin(BasePermission):
    """
    Allow read-only access to all authenticated users.
    Restricts write operations (POST, PUT, PATCH, DELETE) to Admin or Super Admin roles.
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        # 1. Always allow safe methods (GET, HEAD, OPTIONS)
        if request.method in SAFE_METHODS:
            return True

        # 2. Check for staff/superadmin flag as a fallback
        if request.user.is_superuser:
            return True

        # 3. Check custom profile role
        try:
            role = request.user.profile.role
            return role in ["super_admin", "admin"]
        except UserProfile.DoesNotExist:
            return False

# ── Helper ─────────────────────────────────────────
def _audit(user, action, module, status_val="Success"):
    """Shortcut to create an AuditLog entry."""
    AuditLog.objects.create(
        user=user if user and user.is_authenticated else None,
        action=action,
        module=module,
        status=status_val,
    )


def _generate_strong_password(length=14):
    """Generate a password with letters, digits, AND at least 1 special character."""
    special = "!@#$%^&*"
    charset = string.ascii_letters + string.digits + special
    while True:
        pwd = "".join(secrets.choice(charset) for _ in range(length))
        # Must have at least 1 uppercase, 1 lowercase, 1 digit, 1 special
        if (any(c.isupper() for c in pwd) and
                any(c.islower() for c in pwd) and
                any(c.isdigit() for c in pwd) and
                any(c in special for c in pwd)):
            return pwd


def _get_smtp_config():
    """Dynamically fetch SMTP credentials from the SMTPSettings singleton."""
    smtp = SMTPSettings.load()
    return {
        "host": smtp.host or "smtp.gmail.com",
        "port": smtp.port or 587,
        "username": smtp.username,
        "password": smtp.password,
        "use_tls": smtp.use_tls,
    }


def _generate_qr_bytes(username, totp_secret):
    """Generate a QR code image as raw PNG bytes (for email attachment)."""
    try:
        import pyotp, qrcode, io as _io
        totp = pyotp.TOTP(totp_secret)
        uri = totp.provisioning_uri(name=username, issuer_name="GRC Platform")
        qr = qrcode.QRCode(version=1, box_size=8, border=4)
        qr.add_data(uri)
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white")
        buf = _io.BytesIO()
        img.save(buf, format="PNG")
        return buf.getvalue()
    except Exception as e:
        print(f"[QR ERROR] {e}")
        return None


def _chunk_secret(secret, chunk=4):
    """Break long TOTP secret into space-separated groups for mobile readability."""
    return " ".join(secret[i:i+chunk] for i in range(0, len(secret), chunk))


def _send_invite_email(receiver_email, username, password, totp_secret, role="admin", account_expiry_date=None):
    """Send role-specific invite email with credentials + QR code as CID attachment."""
    import smtplib
    from email.mime.multipart import MIMEMultipart
    from email.mime.text import MIMEText
    from email.mime.image import MIMEImage

    smtp_cfg = _get_smtp_config()

    role_label = "Super Administrator" if role == "super_admin" else ("Auditor" if role == "auditor" else "Administrator")
    secret_chunked = _chunk_secret(totp_secret)
    qr_bytes = _generate_qr_bytes(username, totp_secret)

    # Use cid:qrcode if we have the image, otherwise show the secret prominently
    if qr_bytes:
        qr_section = """
        <div style="text-align:center;margin:8px 0;">
            <img src="cid:qrcode" alt="QR Code" width="200" height="200"
                 style="display:block;margin:0 auto;border:4px solid #e2e8f0;border-radius:8px;" />
        </div>"""
    else:
        qr_section = """
        <p style="color:#dc2626;font-size:13px;">
            QR code could not be generated. Use the secret key below to manually add the account.
        </p>"""

    # ── Auditor-specific expiry block ──
    if role == "auditor":
        if account_expiry_date:
            try:
                expiry_str = account_expiry_date.strftime("%d %B %Y, %H:%M UTC")
            except Exception:
                expiry_str = str(account_expiry_date)
            access_block = f"""
        <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:14px;margin-bottom:16px;">
          <p style="margin:0 0 6px;color:#c2410c;font-weight:bold;font-size:13px;">&#x23F0; Time-Bound Auditor Access</p>
          <p style="margin:0;color:#9a3412;font-size:13px;line-height:1.6;">
            Your auditor account is active until <strong>{expiry_str}</strong>.<br>
            After this date, access will be automatically revoked. Contact your Super Administrator to renew.
          </p>
        </div>"""
        else:
            access_block = """
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:14px;margin-bottom:16px;">
          <p style="margin:0 0 6px;color:#15803d;font-weight:bold;font-size:13px;">&#x2705; Unrestricted Auditor Access</p>
          <p style="margin:0;color:#166534;font-size:13px;">Your account has no expiry date set. Contact your Super Administrator for more information.</p>
        </div>"""
        role_subtitle = "Auditor Portal Access &mdash; New Account"
    else:
        access_block = ""
        role_subtitle = "Admin Portal Access &mdash; New Account"

    html = f"""
    <html><body style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:16px;">

      <div style="background:#0f172a;padding:24px;border-radius:12px 12px 0 0;text-align:center;">
        <h1 style="color:#38bdf8;margin:0;font-size:22px;">&#x1F6E1; GRC Compliance Platform</h1>
        <p style="color:#94a3b8;margin:8px 0 0;font-size:14px;">{role_subtitle}</p>
      </div>

      <div style="border:1px solid #e2e8f0;border-top:none;padding:24px;border-radius:0 0 12px 12px;background:#fff;">
        <p style="margin:0 0 8px;font-size:15px;color:#0f172a;">Hello <strong>{username}</strong>,</p>
        <p style="margin:0 0 16px;font-size:14px;color:#334155;">
          You have been granted <strong>{role_label}</strong> access to the GRC Compliance Platform.
        </p>

        {access_block}

        <!-- Credentials -->
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin-bottom:16px;">
          <h3 style="margin:0 0 12px;color:#0f172a;font-size:15px;">&#x1F511; Login Credentials</h3>
          <table style="width:100%;border-collapse:collapse;font-size:14px;">
            <tr>
              <td style="padding:7px 8px;color:#64748b;width:40%;vertical-align:top;">Username</td>
              <td style="padding:7px 8px;font-weight:bold;color:#0f172a;font-family:monospace;word-break:break-all;">{username}</td>
            </tr>
            <tr style="background:#f1f5f9;">
              <td style="padding:7px 8px;color:#64748b;vertical-align:top;">Password</td>
              <td style="padding:7px 8px;font-weight:bold;color:#0f172a;font-family:monospace;word-break:break-all;">{password}</td>
            </tr>
          </table>
        </div>

        <!-- QR Code / Authenticator -->
        <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:16px;margin-bottom:16px;">
          <h3 style="margin:0 0 10px;color:#0f172a;font-size:15px;">&#x1F4F1; Set Up Authenticator App</h3>
          <p style="color:#64748b;font-size:13px;margin:0 0 12px;line-height:1.5;">
            Open <strong>Google Authenticator</strong> or <strong>Microsoft Authenticator</strong> &rarr;
            tap <em>Add Account</em> &rarr; <em>Work or School/Other</em> &rarr; <em>Scan QR Code</em>.<br>
            Your app will display: <strong>{username} @ GRC Platform</strong>
          </p>
          {qr_section}
          <div style="margin-top:14px;background:#e0f2fe;border-radius:6px;padding:10px;">
            <p style="margin:0 0 6px;font-size:12px;color:#0369a1;font-weight:bold;">&#x1F511; Manual Entry (TOTP Secret Key):</p>
            <p style="margin:0;font-family:monospace;font-size:13px;font-weight:bold;
                     color:#0f172a;letter-spacing:1px;word-break:break-all;line-height:1.8;">
              {secret_chunked}
            </p>
            <p style="margin:6px 0 0;font-size:11px;color:#64748b;">
              Use this if you cannot scan the QR code. Select &ldquo;Enter setup key&rdquo; in the app.
            </p>
          </div>
        </div>

        <!-- Security Notice -->
        <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:12px;">
          <p style="margin:0 0 6px;color:#dc2626;font-weight:bold;font-size:13px;">&#x26A0;&#xFE0F; Security Notice</p>
          <ul style="color:#b91c1c;margin:0;padding-left:18px;font-size:12px;line-height:2;">
            <li>Change your password on first login.</li>
            <li>Do <strong>not</strong> share your credentials or TOTP secret with anyone.</li>
            <li>Portal: <a href="http://localhost:5173" style="color:#2563eb;">http://localhost:5173</a></li>
          </ul>
        </div>
      </div>
      <p style="text-align:center;color:#94a3b8;font-size:11px;margin-top:16px;">
        &copy; 2026 GRC Compliance Management System &mdash; This is an automated message.
      </p>
    </body></html>
    """

    try:
        # outer container must be "related" so we can attach CID images
        msg_root = MIMEMultipart("related")
        msg_root["Subject"] = f"GRC Platform \u2014 Your {role_label} Account Credentials"
        msg_root["From"] = smtp_cfg["username"]
        msg_root["To"] = receiver_email

        # inner alternative (plain + html)
        msg_alt = MIMEMultipart("alternative")
        msg_root.attach(msg_alt)
        msg_alt.attach(MIMEText(
            f"GRC Platform — {role_label} Account\nUsername: {username}\nPassword: {password}\nTOTP Secret: {totp_secret}",
            "plain"
        ))
        msg_alt.attach(MIMEText(html, "html"))

        # attach QR image with Content-ID so email clients render it inline
        if qr_bytes:
            qr_img = MIMEImage(qr_bytes, "png")
            qr_img.add_header("Content-ID", "<qrcode>")
            qr_img.add_header("Content-Disposition", "inline", filename="qrcode.png")
            msg_root.attach(qr_img)

        with smtplib.SMTP(smtp_cfg["host"], smtp_cfg["port"], timeout=15) as smtp:
            smtp.ehlo()
            if smtp_cfg["use_tls"]:
                smtp.starttls(); smtp.ehlo()
            smtp.login(smtp_cfg["username"], smtp_cfg["password"])
            smtp.sendmail(smtp_cfg["username"], receiver_email, msg_root.as_string())
        print(f"[INVITE EMAIL] Sent to {receiver_email}")
    except Exception as e:
        print(f"[EMAIL ERROR] {e}")


def _send_reminder_email(receiver_email, username):
    """Send reminder email requiring password change."""
    import smtplib
    from email.mime.multipart import MIMEMultipart
    from email.mime.text import MIMEText

    smtp_cfg = _get_smtp_config()

    html = f"""
    <html><body style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:16px;">
      <div style="background:#0f172a;padding:24px;border-radius:12px 12px 0 0;text-align:center;">
        <h1 style="color:#38bdf8;margin:0;font-size:20px;">&#x1F6E1; GRC Compliance Platform</h1>
        <p style="color:#94a3b8;margin:8px 0 0;font-size:14px;">Action Required &mdash; Password Expired</p>
      </div>
      <div style="border:1px solid #e2e8f0;border-top:none;padding:20px;border-radius:0 0 12px 12px;background:#fff;">
        <p style="margin:0 0 16px;font-size:14px;">
          Hello <strong>{username}</strong>,
        </p>
        <p style="margin:0 0 16px;font-size:14px;color:#334155;">
          A Super Administrator has requested that you immediately log in and change your password.
          Your account is currently flagged as having a default or expired password.
        </p>
        <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:12px;margin:20px 0;">
          <p style="margin:0 0 6px;color:#dc2626;font-weight:bold;font-size:13px;">&#x26A0;&#xFE0F; Mandatory Step</p>
          <ul style="color:#b91c1c;margin:0;padding-left:18px;font-size:12px;line-height:2;">
            <li>Login to the portal: <a href="http://localhost:5173" style="color:#2563eb;">http://localhost:5173</a></li>
            <li>Go to <strong>Settings &gt; My Identity &amp; Security</strong>.</li>
            <li>Enter a new strong password complying with our security policy.</li>
          </ul>
        </div>
      </div>
    </body></html>
    """

    try:
        msg_root = MIMEMultipart("alternative")
        msg_root["Subject"] = "ACTION REQUIRED: Change Your GRC Portal Password"
        msg_root["From"] = smtp_cfg["username"]
        msg_root["To"] = receiver_email

        msg_root.attach(MIMEText(f"Hello {username}, a Super Admin has requested that you change your password.", "plain"))
        msg_root.attach(MIMEText(html, "html"))

        with smtplib.SMTP(smtp_cfg["host"], smtp_cfg["port"], timeout=15) as smtp:
            smtp.ehlo()
            if smtp_cfg["use_tls"]:
                smtp.starttls(); smtp.ehlo()
            smtp.login(smtp_cfg["username"], smtp_cfg["password"])
            smtp.sendmail(smtp_cfg["username"], receiver_email, msg_root.as_string())
        print(f"[REMINDER EMAIL] Sent to {receiver_email}")
    except Exception as e:
        print(f"[REMINDER EMAIL ERROR] {e}")


def _send_status_email(receiver_email, username, action):
    """Send account revoke/restore notification email."""
    import smtplib
    from email.mime.multipart import MIMEMultipart
    from email.mime.text import MIMEText

    smtp_cfg = _get_smtp_config()

    is_restored = (action == "restored")
    header_color = "#15803d" if is_restored else "#991b1b"
    header_bg = "#f0fdf4" if is_restored else "#fef2f2"
    border_color = "#bbf7d0" if is_restored else "#fecaca"
    icon = "\u2705" if is_restored else "\u26d4"
    action_title = "Account Restored" if is_restored else "Account Revoked"
    action_body = (
        "Your GRC Platform account has been <strong>restored</strong> by a Super Administrator. You may now log in."
        if is_restored else
        "Your GRC Platform account has been <strong>revoked</strong> by a Super Administrator. You can no longer access the portal."
    )
    next_steps = (
        'Visit the portal to log in: <a href="http://localhost:5173" style="color:#2563eb;">http://localhost:5173</a>'
        if is_restored else
        "If you believe this is an error, please contact your Super Administrator."
    )

    html = f"""
    <html><body style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:16px;">
      <div style="background:#0f172a;padding:24px;border-radius:12px 12px 0 0;text-align:center;">
        <h1 style="color:#38bdf8;margin:0;font-size:22px;">&#x1F6E1; GRC Compliance Platform</h1>
        <p style="color:#94a3b8;margin:8px 0 0;font-size:14px;">Account Status Update</p>
      </div>
      <div style="border:1px solid #e2e8f0;border-top:none;padding:24px;border-radius:0 0 12px 12px;background:#fff;">
        <p style="margin:0 0 16px;font-size:15px;color:#0f172a;">Hello <strong>{username}</strong>,</p>
        <div style="background:{header_bg};border:1px solid {border_color};border-radius:8px;padding:16px;margin-bottom:16px;">
          <p style="margin:0 0 8px;color:{header_color};font-weight:bold;font-size:15px;">{icon} {action_title}</p>
          <p style="margin:0;color:#334155;font-size:14px;line-height:1.6;">{action_body}</p>
        </div>
        <p style="font-size:13px;color:#64748b;">{next_steps}</p>
      </div>
      <p style="text-align:center;color:#94a3b8;font-size:11px;margin-top:16px;">
        &copy; 2026 GRC Compliance Management System &mdash; This is an automated message.
      </p>
    </body></html>
    """

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"GRC Platform \u2014 Your Account Has Been {action_title}"
        msg["From"] = smtp_cfg["username"]
        msg["To"] = receiver_email
        msg.attach(MIMEText(f"Hello {username}, your GRC account has been {action}.", "plain"))
        msg.attach(MIMEText(html, "html"))
        with smtplib.SMTP(smtp_cfg["host"], smtp_cfg["port"], timeout=15) as smtp:
            smtp.ehlo()
            if smtp_cfg["use_tls"]:
                smtp.starttls(); smtp.ehlo()
            smtp.login(smtp_cfg["username"], smtp_cfg["password"])
            smtp.sendmail(smtp_cfg["username"], receiver_email, msg.as_string())
        print(f"[STATUS EMAIL] {action_title} sent to {receiver_email}")
    except Exception as e:
        print(f"[STATUS EMAIL ERROR] {e}")



# ═══════════════════════════════════════════════════
# CORE MODEL VIEWSETS (read + write)
# ═══════════════════════════════════════════════════


class FrameworkViewSet(viewsets.ReadOnlyModelViewSet):
    """GET /api/frameworks/ and /api/frameworks/{id}/"""

    queryset = Framework.objects.prefetch_related("controls").all()
    serializer_class = FrameworkSerializer
    permission_classes = [IsAuthenticated]


class ControlViewSet(viewsets.ModelViewSet):
    """CRUD /api/controls/"""

    queryset = Control.objects.select_related("framework").prefetch_related("wazuh_mappings").all()
    serializer_class = ControlSerializer
    permission_classes = [IsAuthenticated, IsAdminOrSuperAdmin]
    filterset_fields = ["framework"]


    def perform_create(self, serializer):
        obj = serializer.save()
        _audit(self.request.user, f"created control '{obj.control_code}'", "Control")

    def perform_update(self, serializer):
        obj = serializer.save()
        _audit(self.request.user, f"updated control '{obj.control_code}'", "Control")


class PolicyViewSet(viewsets.ModelViewSet):
    """CRUD /api/policies/"""

    queryset = Policy.objects.prefetch_related("controls__framework").all()
    serializer_class = PolicySerializer
    permission_classes = [IsAuthenticated, IsAdminOrSuperAdmin]

    def perform_create(self, serializer):
        obj = serializer.save()
        _audit(self.request.user, f"created new policy '{obj.title}'", "Policy")

    def perform_update(self, serializer):
        obj = serializer.save()
        _audit(self.request.user, f"updated policy '{obj.title}'", "Policy")

    def perform_destroy(self, instance):
        title = instance.title
        instance.delete()
        _audit(self.request.user, f"deleted policy '{title}'", "Policy")


class RiskViewSet(viewsets.ReadOnlyModelViewSet):
    """GET /api/risks/ and /api/risks/{id}/"""

    queryset = Risk.objects.select_related("control__framework").all()
    serializer_class = RiskSerializer
    filterset_fields = ["severity", "control"]


class WazuhMappingViewSet(viewsets.ReadOnlyModelViewSet):
    """GET /api/wazuh-mappings/ and /api/wazuh-mappings/{id}/"""

    queryset = WazuhMapping.objects.select_related("control__framework").all()
    serializer_class = WazuhMappingSerializer


class ComplianceScanViewSet(viewsets.ReadOnlyModelViewSet):
    """GET /api/scans/ and /api/scans/{id}/"""

    queryset = ComplianceScan.objects.prefetch_related(
        "results__mapping__control__framework"
    ).all()
    serializer_class = ComplianceScanSerializer
    filterset_fields = ["agent_id"]


class ScanResultViewSet(viewsets.ReadOnlyModelViewSet):
    """GET /api/scan-results/ and /api/scan-results/{id}/"""

    queryset = ScanResult.objects.select_related(
        "scan", "mapping__control__framework"
    ).all()
    serializer_class = ScanResultSerializer
    filterset_fields = ["is_passed", "scan"]


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """GET /api/audit-logs/ — read-only access to the audit trail."""

    queryset = AuditLog.objects.select_related("user").all()
    serializer_class = AuditLogSerializer
    permission_classes = [IsAuthenticated]


# ═══════════════════════════════════════════════════
# SYSTEM SETTINGS (singleton)
# ═══════════════════════════════════════════════════


class SystemSettingsView(APIView):
    """
    GET  /api/settings/  → returns the current settings
    PATCH /api/settings/ → updates the settings
    """
    permission_classes = [IsAuthenticated, IsAdminOrSuperAdmin]

    def get(self, request):
        settings = SystemSettings.load()
        return Response(SystemSettingsSerializer(settings).data)

    def patch(self, request):
        settings = SystemSettings.load()
        serializer = SystemSettingsSerializer(settings, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        _audit(request.user, "updated System Settings", "Settings")

        # Re-sync Celery Beat schedule if scan_frequency changed
        if "scan_frequency" in request.data:
            try:
                from compliance.scheduler import sync_celery_beat_schedule
                sync_celery_beat_schedule()
            except Exception:
                pass  # Non-critical — schedule will sync on next restart

        return Response(serializer.data)


# ═══════════════════════════════════════════════════
# USER MANAGEMENT (Super Admin only)
# ═══════════════════════════════════════════════════


class UserManagementViewSet(viewsets.ViewSet):
    """
    /api/users/
    - GET  (list)    → all users with profile.role
    - POST (create)  → create new admin user
    - PATCH /{id}/toggle-active/ → revoke/restore
    - DELETE /{id}/  → permanently delete
    """

    permission_classes = [IsSuperAdmin]

    def list(self, request):
        users = User.objects.select_related("profile").exclude(
            username="AnonymousUser"
        ).order_by("username")
        serializer = UserManagementSerializer(users, many=True, context={"request": request})
        return Response(serializer.data)

    def create(self, request):
        ser = CreateUserSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        email = ser.validated_data["email"]
        username = ser.validated_data.get("username") or email.split("@")[0].lower().replace(".", "_")
        role = ser.validated_data.get("role", "admin")
        account_expiry_date = ser.validated_data.get("account_expiry_date", None)

        if User.objects.filter(username=username).exists():
            return Response(
                {"error": f"Username '{username}' already exists."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Generate a strong password with letters, digits, and special chars
        password = _generate_strong_password()

        # Generate a UNIQUE TOTP secret per user
        import pyotp as _pyotp
        totp_secret = _pyotp.random_base32()

        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            is_staff=True,
        )
        profile = UserProfile.objects.create(
            user=user, 
            role=role, 
            totp_secret=totp_secret,
            account_expiry_date=account_expiry_date
        )
        _audit(request.user, f"invited new admin '{username}' ({email})", "Admin")

        # Send invite email with QR code in background
        import threading as _threading
        t = _threading.Thread(
            target=_send_invite_email,
            args=(email, username, password, totp_secret, role),
            kwargs={'account_expiry_date': account_expiry_date}
        )
        t.daemon = True
        t.start()

        return Response(
            {
                "id": user.id,
                "username": username,
                "email": email,
                "role": role,
                "temp_password": password,
                "totp_secret": totp_secret,
                "message": f"User '{username}' created. Invite email with QR code sent to {email}.",
            },
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["patch"], url_path="toggle-active")
    def toggle_active(self, request, pk=None):
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)

        user.is_active = not user.is_active
        user.save(update_fields=["is_active"])

        action_word = "restored" if user.is_active else "revoked"
        _audit(request.user, f"{action_word} access for '{user.username}'", "Admin")

        # Send revoke/restore notification email in background
        import threading as _threading
        _t = _threading.Thread(
            target=_send_status_email,
            args=(user.email, user.username, action_word)
        )
        _t.daemon = True
        _t.start()

        return Response({
            "id": user.id,
            "username": user.username,
            "is_active": user.is_active,
            "message": f"Access {action_word} for {user.username}.",
        })

    @action(detail=True, methods=["post"], url_path="regenerate-credentials")
    def regenerate_credentials(self, request, pk=None):
        """
        POST /api/users/{id}/regenerate-credentials/
        SuperAdmin resets an admin's password + TOTP secret and sends new QR code email.
        Use case: admin's phone is stolen.
        """
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)

        new_email = request.data.get("email")
        if new_email and new_email != user.email:
            # check if exists
            if User.objects.filter(email=new_email).exclude(pk=pk).exists():
                return Response({"error": "Email is already taken."}, status=status.HTTP_400_BAD_REQUEST)
            user.email = new_email
            # intentionally don't save yet, it will save below

        # Generate new credentials
        new_password = _generate_strong_password()
        import pyotp as _pyotp
        new_totp_secret = _pyotp.random_base32()

        user.set_password(new_password)
        # Re-activate the user (in case they were auto-deactivated due to expiry)
        user.is_active = True
        user.save()

        profile, _ = UserProfile.objects.get_or_create(user=user)
        profile.totp_secret = new_totp_secret

        # ── Update expiry date if provided (auditor renewal) ──
        new_expiry = request.data.get("account_expiry_date")
        if new_expiry:
            from django.utils.dateparse import parse_datetime
            parsed = parse_datetime(new_expiry)
            if parsed:
                profile.account_expiry_date = parsed

        # Reset password changed timestamp so they are forced to set a new password
        profile.password_changed_at = None
        profile.save()

        _audit(request.user, f"regenerated credentials for '{user.username}'", "Admin")

        # Send new credentials email
        import threading as _threading
        t = _threading.Thread(
            target=_send_invite_email,
            args=(user.email, user.username, new_password, new_totp_secret, getattr(profile, 'role', 'admin')),
            kwargs={'account_expiry_date': getattr(profile, 'account_expiry_date', None)}
        )
        t.daemon = True
        t.start()

        return Response({
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "message": f"Credentials regenerated and sent to {user.email}.",
        })

    @action(detail=True, methods=["post"], url_path="send-reminder")
    def send_reminder(self, request, pk=None):
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)
            
        _audit(request.user, f"sent password reminder to '{user.username}'", "Admin")
        
        # Fire thread to send email securely
        import threading as _threading
        t = _threading.Thread(
            target=_send_reminder_email,
            args=(user.email, user.username)
        )
        t.daemon = True
        t.start()
        
        return Response({
            "message": f"Reminder email successfully queued for {user.email}."
        }, status=status.HTTP_200_OK)

    def destroy(self, request, pk=None):
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)

        username = user.username
        user.delete()
        _audit(request.user, f"permanently deleted admin '{username}'", "Admin")

        return Response(
            {"message": f"User '{username}' deleted permanently."},
            status=status.HTTP_200_OK,
        )


# ═══════════════════════════════════════════════════
# DASHBOARD SUMMARY
# ═══════════════════════════════════════════════════


class DashboardSummaryView(APIView):
    """
    GET /api/dashboard-summary/

    Returns an aggregated snapshot for the frontend dashboard.
    Includes the threshold from SystemSettings.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        settings = SystemSettings.load()

        # ── 1. Latest scan per agent ────────────────
        latest_scan_ids = (
            ComplianceScan.objects
            .order_by("agent_id", "-scan_date")
            .distinct("agent_id")
            .values_list("id", flat=True)
        )

        if not latest_scan_ids:
            return Response(
                {
                    "total_agents_scanned": 0,
                    "overall_compliance_score": 0.0,
                    "passing_threshold": settings.passing_score_threshold,
                    "status": "No Data",
                    "framework_scores": [],
                    "top_failed_controls": [],
                    "recent_scans": [],
                },
                status=status.HTTP_200_OK,
            )

        latest_scans = ComplianceScan.objects.filter(id__in=latest_scan_ids)

        # ── 2. Aggregate metrics ────────────────────
        total_agents = latest_scans.count()
        avg_score = latest_scans.aggregate(avg=Avg("overall_score"))["avg"] or 0.0
        rounded_score = round(avg_score, 1)

        # Compare against threshold
        compliance_status = "Healthy" if rounded_score >= settings.passing_score_threshold else "Critical"

        # ── 3. Per-framework compliance breakdown (Optimized) ───
        framework_scores = []
        frameworks_annotated = Framework.objects.annotate(
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

        for fw in frameworks_annotated:
            total = fw.total_checks
            passed = fw.passed_checks
            score = round((passed / total) * 100, 1) if total > 0 else 0.0
            framework_scores.append(
                {
                    "framework_id": fw.id,
                    "framework_name": f"{fw.name} v{fw.version}",
                    "total_checks": total,
                    "passed_checks": passed,
                    "score": score,
                }
            )

        # ── 4. Top failed controls ──────────────────
        top_failed = (
            ScanResult.objects
            .filter(scan__in=latest_scans, is_passed=False)
            .values(
                "mapping__control__id",
                "mapping__control__control_code",
                "mapping__control__title",
                "mapping__control__framework__name",
            )
            .annotate(fail_count=Count("id"))
            .order_by("-fail_count")[:10]
        )

        top_failed_controls = [
            {
                "control_id": item["mapping__control__id"],
                "control_code": item["mapping__control__control_code"],
                "control_title": item["mapping__control__title"],
                "framework_name": item["mapping__control__framework__name"],
                "fail_count": item["fail_count"],
            }
            for item in top_failed
        ]

        # ── 5. Recent scans ────────────────────────
        recent_scans = list(
            ComplianceScan.objects
            .order_by("-scan_date")[:5]
            .values("id", "agent_id", "scan_date", "overall_score")
        )

        # ── 6. Total Admins ────────────────────────
        total_admins = User.objects.filter(is_active=True).count()

        # ── 7. Recent Activity (Mini Audit Log) ──
        recent_activity = list(
            AuditLog.objects
            .filter(module__icontains="Policy")
            .order_by("-timestamp")[:10]
            .values("id", "user__username", "action", "module", "timestamp", "status")
        )

        return Response(
            {
                "total_agents_scanned": total_agents,
                "overall_compliance_score": rounded_score,
                "passing_threshold": settings.passing_score_threshold,
                "status": compliance_status,
                "framework_scores": framework_scores,
                "top_failed_controls": top_failed_controls,
                "recent_scans": recent_scans,
                "total_admins": total_admins,
                "recent_activity": recent_activity,
            },
            status=status.HTTP_200_OK,
        )


class GenerateReportView(APIView):
    """
    GET /api/generate-report/?framework_id=1
    Generates a framework-specific compliance PDF report.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        framework_id = request.query_params.get("framework_id")
        if not framework_id:
            return Response({"error": "framework_id is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            framework = Framework.objects.get(id=framework_id)
        except Framework.DoesNotExist:
            return Response({"error": "Framework not found."}, status=status.HTTP_404_NOT_FOUND)

        # 1. Fetch latest scans
        latest_scan_ids = (
            ComplianceScan.objects
            .order_by("agent_id", "-scan_date")
            .distinct("agent_id")
            .values_list("id", flat=True)
        )
        latest_scans = ComplianceScan.objects.filter(id__in=latest_scan_ids)

        # 2. Filter ScanResults by framework and latest scans
        results = ScanResult.objects.filter(
            scan__in=latest_scans,
            mapping__control__framework=framework
        ).select_related("mapping__control", "scan")

        # 3. Calculate metrics for THIS framework
        total_checks = results.count()
        passed_checks = results.filter(is_passed=True).count()
        score = round((passed_checks / total_checks) * 100, 1) if total_checks > 0 else 0.0

        failed_controls_qs = results.filter(is_passed=False).values(
            "mapping__control__control_code",
            "mapping__control__title",
        ).annotate(fail_count=Count("id")).order_by("-fail_count")

        failed_controls = [
            {
                "code": item["mapping__control__control_code"],
                "title": item["mapping__control__title"],
                "fails": item["fail_count"]
            } for item in failed_controls_qs
        ]

        # 4. Prepare context
        context = {
            "framework": framework,
            "total_agents": latest_scans.values("agent_id").distinct().count(),
            "compliance_score": score,
            "total_checks": total_checks,
            "passed_checks": passed_checks,
            "failed_controls": failed_controls,
            "generation_date": timezone.now(),
            "generated_by": request.user.username,
        }

        # 5. Render HTML to PDF
        html = render_to_string("compliance/compliance_report.html", context)
        result = io.BytesIO()
        pdf = pisa.pisaDocument(io.BytesIO(html.encode("UTF-8")), result)

        if not pdf.err:
            response = HttpResponse(result.getvalue(), content_type="application/pdf")
            filename = f"Compliance_Report_{framework.name.replace(' ', '_')}_{timezone.now().strftime('%Y%m%d')}.pdf"
            response["Content-Disposition"] = f'attachment; filename="{filename}"'
            return response

        return Response({"error": "PDF generation failed."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ═══════════════════════════════════════════════════
# RUN MANUAL SCAN
# ═══════════════════════════════════════════════════


class RunScanView(APIView):
    """
    POST /api/run-scan/
    Triggers the sync_wazuh_scans management command.
    """
    permission_classes = [IsAuthenticated, IsAdminOrSuperAdmin]

    def post(self, request):
        try:
            out = io.StringIO()
            call_command("sync_wazuh_scans", stdout=out)
            _audit(request.user, "ran a manual Wazuh SCA scan", "Scan")
            return Response(
                {"message": "Scan completed successfully!", "details": out.getvalue()},
                status=status.HTTP_200_OK,
            )
        except Exception as exc:
            _audit(request.user, f"manual scan failed: {exc}", "Scan", "Alert")
            return Response(
                {"error": str(exc), "traceback": traceback.format_exc()},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


# ═══════════════════════════════════════════════════
# AUTH — CURRENT USER PROFILE
# ═══════════════════════════════════════════════════


class MeView(APIView):
    """
    GET /api/auth/me/
    Returns the currently authenticated user's username, email,
    and their GRC role from the UserProfile model.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        try:
            profile = user.profile
            role = profile.role
            password_changed_at = profile.password_changed_at
            display_name = profile.display_name
            phone_number = profile.phone_number or ""
            designation = profile.designation or ""
            timezone = profile.timezone or "UTC"
            profile_pic = profile.get_image_base64()
            needs_setup = password_changed_at is None
        except UserProfile.DoesNotExist:
            if user.is_superuser:
                profile = UserProfile.objects.create(user=user, role="super_admin")
                role = "super_admin"
            else:
                role = "admin"
            password_changed_at = None
            display_name = ""
            phone_number = ""
            designation = ""
            timezone = "UTC"
            profile_pic = None
            needs_setup = True

        return Response(
            {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "role": role,
                "is_superuser": user.is_superuser,
                "display_name": display_name,
                "phone_number": phone_number,
                "designation": designation,
                "timezone": timezone,
                "profile_picture": profile_pic,
                "password_changed_at": password_changed_at,
                "needs_setup": needs_setup,
            },
            status=status.HTTP_200_OK,
        )


class UpdateProfileView(APIView):
    """
    PATCH /api/auth/update-profile/
    Allows an authenticated user to update their own profile details.
    Supports multipart/form-data for avatar uploads.
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    MAX_AVATAR_SIZE = 5 * 1024 * 1024  # 5 MB

    def patch(self, request):
        try:
            profile = request.user.profile
        except UserProfile.DoesNotExist:
            profile = UserProfile.objects.create(user=request.user, role="admin")

        if "display_name" in request.data:
            profile.display_name = request.data["display_name"]
        if "phone_number" in request.data:
            phone = request.data["phone_number"]
            if not re.match(r'^[0-9+\-\s()]{7,20}$', phone):
                return Response(
                    {"error": "Invalid phone number format. Use 7-20 digits, +, -, spaces, or ()."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            profile.phone_number = phone

        if "designation" in request.data:
            designation = request.data["designation"]
            if not re.match(r'^[a-zA-Z\s\-]+$', designation):
                return Response(
                    {"error": "Invalid designation. Use alphabets, spaces, and hyphens only."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            profile.designation = designation

        if "timezone" in request.data:
            profile.timezone = request.data["timezone"]

        if "profile_picture" in request.FILES:
            pic = request.FILES["profile_picture"]
            # ── Size check ──
            if pic.size > self.MAX_AVATAR_SIZE:
                return Response(
                    {"error": "Profile picture must be under 5 MB."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            # ── Image validity check using PIL ──
            try:
                from PIL import Image as PILImage
                img = PILImage.open(pic)
                img.verify()  # raises if not a valid image
                pic.seek(0)   # reset after verify
            except Exception:
                return Response(
                    {"error": "Uploaded file is not a valid image."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            # Use the new method to compress and save binary data
            profile.save_profile_pic(pic)
            
        if request.data.get("delete_picture") == "true":
            profile.profile_pic_binary = None

        profile.save()
        return Response({"message": "Profile updated successfully."}, status=status.HTTP_200_OK)


# ═══════════════════════════════════════════════════
# AUTH — FORGOT PASSWORD & 2FA FLOW
# ═══════════════════════════════════════════════════

import pyotp
import random
import time
import threading
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from django.contrib.auth.models import User
from django.core.cache import cache


def _send_email_otp(receiver_email, otp):
    """Send OTP via Gmail SMTP — premium branded password reset email."""
    try:
        smtp_cfg = _get_smtp_config()
        msg = MIMEMultipart("alternative")
        msg["Subject"] = "GRC Platform \u2014 Your Password Reset Code"
        msg["From"] = smtp_cfg["username"]
        msg["To"] = receiver_email
        html = f"""
        <html><body style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:16px;">

          <div style="background:#0f172a;padding:28px 24px;border-radius:12px 12px 0 0;text-align:center;">
            <h1 style="color:#38bdf8;margin:0;font-size:22px;">&#x1F6E1; GRC Compliance Platform</h1>
            <p style="color:#94a3b8;margin:8px 0 0;font-size:14px;">Secure Password Reset</p>
          </div>

          <div style="border:1px solid #e2e8f0;border-top:none;padding:28px 24px;border-radius:0 0 12px 12px;background:#fff;">
            <p style="margin:0 0 8px;font-size:15px;color:#0f172a;">Hello,</p>
            <p style="margin:0 0 24px;font-size:14px;color:#334155;line-height:1.6;">
              We received a request to reset your GRC Platform password.<br>
              Use the verification code below to proceed. <strong>Do not share this code with anyone.</strong>
            </p>

            <!-- OTP Code Block -->
            <div style="background:#0f172a;border-radius:12px;padding:28px 20px;text-align:center;margin-bottom:24px;">
              <p style="color:#94a3b8;font-size:12px;margin:0 0 12px;text-transform:uppercase;letter-spacing:2px;">Your One-Time Password</p>
              <div style="font-size:42px;font-weight:bold;letter-spacing:14px;color:#38bdf8;
                          font-family:monospace;text-align:center;line-height:1.2;">{otp}</div>
              <p style="color:#64748b;font-size:12px;margin:16px 0 0;">Valid for <strong style="color:#f8fafc;">2 minutes</strong> only</p>
            </div>

            <!-- Warning Block -->
            <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:14px;margin-bottom:16px;">
              <p style="margin:0 0 6px;color:#dc2626;font-weight:bold;font-size:13px;">&#x26A0;&#xFE0F; Security Warning</p>
              <ul style="color:#b91c1c;margin:0;padding-left:18px;font-size:12px;line-height:2.0;">
                <li>This code expires in <strong>2 minutes</strong>.</li>
                <li>Never share this code with anyone, including GRC staff.</li>
                <li>If you did not request this, please ignore this email.</li>
              </ul>
            </div>
          </div>

          <p style="text-align:center;color:#94a3b8;font-size:11px;margin-top:16px;">
            &copy; 2026 GRC Compliance Management System &mdash; This is an automated message.
          </p>
        </body></html>
        """
        msg.attach(MIMEText(html, "html"))
        with smtplib.SMTP(smtp_cfg["host"], smtp_cfg["port"], timeout=10) as smtp:
            smtp.ehlo()
            if smtp_cfg["use_tls"]:
                smtp.starttls(); smtp.ehlo()
            smtp.login(smtp_cfg["username"], smtp_cfg["password"])
            smtp.sendmail(smtp_cfg["username"], receiver_email, msg.as_string())
    except Exception as e:
        print(f"[EMAIL ERROR] {e}")


class ForgotPasswordView(APIView):
    """
    POST /api/auth/forgot-password/
    Body: { "email": "user@example.com" }
    Looks up the user by email and stores pending_user in cache for 10 min.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get("email", "").strip()
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response(
                {"error": "Email address not found in system."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Store pending reset info in cache (key = email)
        cache.set(f"reset_pending_{email}", user.username, timeout=600)
        return Response({"message": "Email found. Proceed to select method.", "email": email})


class SelectMethodView(APIView):
    """
    POST /api/auth/select-method/
    Body: { "email": "...", "method": "email" | "app" }
    If method=email: generates OTP, sends it, stores in cache.
    If method=app: just confirms to go to verify-otp page.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get("email", "").strip()
        method = request.data.get("method", "")

        # Verify the reset session is valid
        username = cache.get(f"reset_pending_{email}")
        if not username:
            return Response(
                {"error": "Session expired. Please start again."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if method == "app":
            return Response({"message": "Proceed to authenticator verification."})

        elif method == "email":
            otp = random.randint(100000, 999999)
            expiry = time.time() + 120  # 2 minutes

            # Store OTP and expiry in cache
            cache.set(f"email_otp_{email}", str(otp), timeout=130)
            cache.set(f"email_otp_expiry_{email}", expiry, timeout=130)

            # Send email in background thread
            t = threading.Thread(target=_send_email_otp, args=(email, otp))
            t.daemon = True
            t.start()

            return Response({"message": "OTP sent to email."})

        return Response({"error": "Invalid method."}, status=status.HTTP_400_BAD_REQUEST)


class VerifyEmailOTPView(APIView):
    """
    POST /api/auth/verify-email-otp/
    Body: { "email": "...", "otp": "123456" }
    Returns remaining_time if needed, or success.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get("email", "").strip()
        entered_otp = str(request.data.get("otp", "")).strip()

        saved_otp = cache.get(f"email_otp_{email}")
        expiry = cache.get(f"email_otp_expiry_{email}")
        username = cache.get(f"reset_pending_{email}")

        if not username:
            return Response(
                {"error": "Session expired. Please start again."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not saved_otp or not expiry:
            return Response(
                {"error": "OTP expired. Please request a new one."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if time.time() > expiry:
            return Response(
                {"error": "OTP has expired. Please request a new one."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if entered_otp != saved_otp:
            return Response(
                {"error": "Invalid OTP. Please try again."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # OTP correct — mark as verified
        cache.set(f"reset_verified_{email}", True, timeout=300)
        return Response({"message": "OTP verified. Proceed to reset password."})


class ResendEmailOTPView(APIView):
    """
    POST /api/auth/resend-email-otp/
    Body: { "email": "..." }
    """
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get("email", "").strip()
        username = cache.get(f"reset_pending_{email}")

        if not username:
            return Response(
                {"error": "Session expired. Please start again."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        otp = random.randint(100000, 999999)
        expiry = time.time() + 120

        cache.set(f"email_otp_{email}", str(otp), timeout=130)
        cache.set(f"email_otp_expiry_{email}", expiry, timeout=130)

        t = threading.Thread(target=_send_email_otp, args=(email, otp))
        t.daemon = True
        t.start()

        return Response({"message": "New OTP sent.", "expiry": expiry})


class VerifyTOTPView(APIView):
    """
    POST /api/auth/verify-totp/
    Body: { "email": "...", "code": "123456" }
    Verifies the authenticator app TOTP code for password reset.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get("email", "").strip()
        code = str(request.data.get("code", "")).strip()
        username = cache.get(f"reset_pending_{email}")

        if not username:
            return Response(
                {"error": "Session expired. Please start again."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            user = User.objects.get(username=username)
            totp_secret = getattr(user.profile, "totp_secret", "") or ""
            if not totp_secret:
                return Response({"error": "2FA not configured for this account."}, status=status.HTTP_400_BAD_REQUEST)
        except (User.DoesNotExist, UserProfile.DoesNotExist):
            return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)

        totp = pyotp.TOTP(totp_secret)
        if totp.verify(code, valid_window=1):
            cache.set(f"reset_verified_{email}", True, timeout=300)
            return Response({"message": "Authenticator code verified."})
        else:
            return Response(
                {"error": "Invalid Authenticator Code!"},
                status=status.HTTP_400_BAD_REQUEST,
            )


class VerifyLoginTOTPView(APIView):
    """
    POST /api/auth/verify-login-totp/
    Body: { "username": "...", "code": "123456" }
    Verifies the TOTP code after login (2FA step).
    Returns full JWT tokens on success.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get("username", "").strip()
        code = str(request.data.get("code", "")).strip()

        try:
            user = User.objects.get(username=username)
            totp_secret = getattr(user.profile, "totp_secret", "") or ""
            if not totp_secret:
                return Response({"error": "2FA not configured for this account."}, status=status.HTTP_400_BAD_REQUEST)
        except (User.DoesNotExist, UserProfile.DoesNotExist):
            return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)

        totp = pyotp.TOTP(totp_secret)
        if totp.verify(code, valid_window=1):
            # Generate JWT tokens manually
            from rest_framework_simplejwt.tokens import RefreshToken
            refresh = RefreshToken.for_user(user)
            try:
                role = user.profile.role
            except UserProfile.DoesNotExist:
                role = "admin"
            return Response({
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "username": user.username,
                "role": role,
            })
        else:
            return Response(
                {"error": "Invalid Authenticator Code!"},
                status=status.HTTP_400_BAD_REQUEST,
            )


class ResetPasswordView(APIView):
    """
    POST /api/auth/reset-password/
    Body: { "email": "...", "password": "newpass", "password2": "newpass" }
    Resets the user's password after OTP or TOTP verification.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get("email", "").strip()
        password = request.data.get("password", "")
        password2 = request.data.get("password2", "")

        if password != password2:
            return Response(
                {"error": "Passwords do not match!"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if len(password) < 6:
            return Response(
                {"error": "Password must be at least 6 characters."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Check verified flag
        verified = cache.get(f"reset_verified_{email}")
        username = cache.get(f"reset_pending_{email}")

        if not verified or not username:
            return Response(
                {"error": "Not verified. Please complete OTP verification first."},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)

        if password != password2:
            return Response({"error": "Passwords do not match."}, status=status.HTTP_400_BAD_REQUEST)

        # Basic complexity backend validation
        import re
        if len(password) < 8 or not re.search(r'[A-Z]', password) or not re.search(r'[a-z]', password) or not re.search(r'\d', password) or not re.search(r'[@$!%*?&]', password):
            return Response({"error": "Password does not meet complexity requirements."}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(password)
        user.save()

        # Record password change timestamp (same as ChangePasswordView)
        from django.utils import timezone
        try:
            user_profile = UserProfile.objects.get(user=user)
            user_profile.password_changed_at = timezone.now()
            user_profile.save(update_fields=["password_changed_at"])
        except UserProfile.DoesNotExist:
            pass

        # Clean up cache
        cache.delete(f"reset_pending_{email}")
        cache.delete(f"reset_verified_{email}")
        cache.delete(f"email_otp_{email}")
        cache.delete(f"email_otp_expiry_{email}")

        _audit(None, f"Password reset for user '{username}'", "Auth")
        return Response({"message": "Password reset successfully! Please login with your new password."})


class ProfileSetupView(APIView):
    """
    Called when a user logs in for the first time or post-reset and is forced to set 
    their profile information and a new password.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        data = request.data
        new_password = data.get("new_password")
        display_name = data.get("display_name", "")
        designation = data.get("designation", "")
        phone_number = data.get("phone_number", "")
        timezone = data.get("timezone", "UTC")

        if not new_password:
            return Response({"error": "New password is required."}, status=status.HTTP_400_BAD_REQUEST)

        # Basic complexity backend validation
        import re
        if len(new_password) < 8 or not re.search(r'[A-Z]', new_password) or not re.search(r'[a-z]', new_password) or not re.search(r'\d', new_password) or not re.search(r'[@$!%*?&]', new_password):
            return Response({"error": "Password does not meet complexity requirements."}, status=status.HTTP_400_BAD_REQUEST)

        # Update Password
        user.set_password(new_password)
        user.save()

        # Update Profile
        try:
            profile = user.profile
        except:
            profile = UserProfile.objects.create(user=user, role="admin")
        
        # Regex validation for phone and designation
        if phone_number and not re.match(r'^[0-9+\-\s()]{7,20}$', phone_number):
            return Response({"error": "Invalid phone number format."}, status=status.HTTP_400_BAD_REQUEST)
        if designation and not re.match(r'^[a-zA-Z\s\-]+$', designation):
            return Response({"error": "Invalid designation format."}, status=status.HTTP_400_BAD_REQUEST)

        profile.display_name = display_name
        profile.designation = designation
        profile.phone_number = phone_number
        from django.utils.timezone import now
        profile.password_changed_at = now()
        profile.save()

        return Response({"message": "Profile setup completed successfully."}, status=status.HTTP_200_OK)


class ChangePasswordView(APIView):
    """
    POST /api/auth/change-password/
    Body: { "old_password": "...", "new_password": "...", "new_password2": "..." }
    Allows a logged-in user to change their own password.
    Records the timestamp in profile.password_changed_at for SuperAdmin visibility.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        old_password = request.data.get("old_password", "")
        new_password = request.data.get("new_password", "")
        confirm_password = request.data.get("confirm_password", "")

        if not request.user.check_password(old_password):
            return Response(
                {"error": "Current password is incorrect."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if new_password != confirm_password:
            return Response(
                {"error": "New passwords do not match."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Complexity: min 8 chars, uppercase, lowercase, digit, special
        if (len(new_password) < 8
                or not re.search(r'[A-Z]', new_password)
                or not re.search(r'[a-z]', new_password)
                or not re.search(r'\d', new_password)
                or not re.search(r'[@$!%*?&]', new_password)):
            return Response(
                {"error": "Password must be at least 8 characters with uppercase, lowercase, digit, and special character (@$!%*?&)."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        request.user.set_password(new_password)
        request.user.save()

        # Record timestamp
        from django.utils import timezone
        try:
            profile = request.user.profile
            profile.password_changed_at = timezone.now()
            profile.save(update_fields=["password_changed_at"])
        except UserProfile.DoesNotExist:
            pass

        _audit(request.user, "changed their own password", "Auth")
        return Response({"message": "Password changed successfully. Please log in again."})


# ═══════════════════════════════════════════════════
# SMTP SETTINGS (Super Admin only)
# ═══════════════════════════════════════════════════


class SMTPSettingsView(APIView):
    """
    GET  /api/smtp-settings/  → returns current SMTP config (password masked)
    PATCH /api/smtp-settings/ → updates SMTP config
    """
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        smtp = SMTPSettings.load()
        return Response(SMTPSettingsSerializer(smtp).data)

    def patch(self, request):
        smtp = SMTPSettings.load()
        serializer = SMTPSettingsSerializer(smtp, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        _audit(request.user, "updated SMTP configuration", "Settings")
        return Response(serializer.data)


class SudoVerifyView(APIView):
    """
    POST /api/auth/sudo-verify/
    Body: { "password": "..." }
    Verifies the current user's password for sudo-sensitive actions.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        password = request.data.get("password", "")
        if request.user.check_password(password):
            return Response({"valid": True})
        return Response(
            {"valid": False, "error": "Invalid password."},
            status=status.HTTP_403_FORBIDDEN,
        )


class CustomTokenObtainPairView(APIView):
    """
    POST /api/auth/token/
    Custom login view that checks account_expiry_date before issuing tokens.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        from .serializers import CustomTokenObtainPairSerializer
        serializer = CustomTokenObtainPairSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(serializer.validated_data, status=status.HTTP_200_OK)
