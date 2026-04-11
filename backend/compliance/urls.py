"""
compliance/urls.py
──────────────────
DRF router registration for all compliance ViewSets
plus custom endpoints.
"""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register(r"frameworks", views.FrameworkViewSet, basename="framework")
router.register(r"controls", views.ControlViewSet, basename="control")
router.register(r"policies", views.PolicyViewSet, basename="policy")
router.register(r"risks", views.RiskViewSet, basename="risk")
router.register(r"wazuh-mappings", views.WazuhMappingViewSet, basename="wazuhmapping")
router.register(r"scans", views.ComplianceScanViewSet, basename="compliancescan")
router.register(r"scan-results", views.ScanResultViewSet, basename="scanresult")
router.register(r"audit-logs", views.AuditLogViewSet, basename="auditlog")
router.register(r"users", views.UserManagementViewSet, basename="user")

urlpatterns = [
    # Router-generated CRUD endpoints
    path("", include(router.urls)),

    # Custom aggregation endpoint
    path(
        "dashboard-summary/",
        views.DashboardSummaryView.as_view(),
        name="dashboard-summary",
    ),

    # Trigger Wazuh SCA sync from the frontend
    path(
        "run-scan/",
        views.RunScanView.as_view(),
        name="run-scan",
    ),

    # System settings (singleton)
    path(
        "settings/",
        views.SystemSettingsView.as_view(),
        name="system-settings",
    ),

    # Current user profile
    path(
        "auth/me/",
        views.MeView.as_view(),
        name="auth-me",
    ),
    
    # Update user profile
    path(
        "auth/update-profile/",
        views.UpdateProfileView.as_view(),
        name="auth-update-profile",
    ),

    # Toggle user active status
    path(
        "users/<int:pk>/toggle-active/",
        views.UserManagementViewSet.as_view({"patch": "toggle_active"}),
        name="user-toggle-active",
    ),

    # ── Forgot Password & 2FA Flow ─────────────────────
    path("auth/forgot-password/",    views.ForgotPasswordView.as_view(),   name="forgot-password"),
    path("auth/select-method/",      views.SelectMethodView.as_view(),      name="select-method"),
    path("auth/verify-email-otp/",   views.VerifyEmailOTPView.as_view(),    name="verify-email-otp"),
    path("auth/resend-email-otp/",   views.ResendEmailOTPView.as_view(),    name="resend-email-otp"),
    path("auth/verify-totp/",        views.VerifyTOTPView.as_view(),        name="verify-totp"),
    path("auth/verify-login-totp/",  views.VerifyLoginTOTPView.as_view(),   name="verify-login-totp"),
    path("auth/reset-password/",     views.ResetPasswordView.as_view(),     name="reset-password"),
    path("auth/change-password/",    views.ChangePasswordView.as_view(),    name="change-password"),
    path("auth/profile-setup/",      views.ProfileSetupView.as_view(),      name="profile-setup"),

    # Regenerate admin credentials (new password + TOTP secret)
    path(
        "users/<int:pk>/regenerate-credentials/",
        views.UserManagementViewSet.as_view({"post": "regenerate_credentials"}),
        name="user-regenerate-credentials",
    ),

    # Send reminder to user
    path(
        "users/<int:pk>/send-reminder/",
        views.UserManagementViewSet.as_view({"post": "send_reminder"}),
        name="user-send-reminder",
    ),

    # SMTP Settings (Super Admin)
    path(
        "smtp-settings/",
        views.SMTPSettingsView.as_view(),
        name="smtp-settings",
    ),

    # Sudo Verify (re-auth for sensitive actions)
    path(
        "auth/sudo-verify/",
        views.SudoVerifyView.as_view(),
        name="sudo-verify",
    ),
]
