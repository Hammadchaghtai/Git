"""
compliance/serializers.py
─────────────────────────
DRF serializers for all GRC models.

Nested serializers flatten related data so the frontend doesn't
need to make multiple requests.
"""

from django.contrib.auth.models import User
from rest_framework import serializers

from .models import (
    ComplianceScan,
    Control,
    Framework,
    Policy,
    Risk,
    ScanResult,
    WazuhMapping,
    UserProfile,
    AuditLog,
    SystemSettings,
    SMTPSettings,
    Department,
    AgentProfile,
)


# ═══════════════════════════════════════════════════
# GOVERNANCE LAYER
# ═══════════════════════════════════════════════════


class FrameworkSerializer(serializers.ModelSerializer):
    controls_count = serializers.IntegerField(
        source="controls.count", read_only=True
    )

    class Meta:
        model = Framework
        fields = [
            "id",
            "name",
            "version",
            "description",
            "controls_count",
            "created_at",
            "updated_at",
        ]


class WazuhMappingBriefSerializer(serializers.ModelSerializer):
    """Lightweight serializer for nesting inside ControlSerializer."""
    class Meta:
        model = WazuhMapping
        fields = ["id", "wazuh_rule_id", "rule_description"]


class ControlSerializer(serializers.ModelSerializer):
    framework_name = serializers.CharField(
        source="framework.name", read_only=True
    )
    framework_version = serializers.CharField(
        source="framework.version", read_only=True
    )
    wazuh_mappings = WazuhMappingBriefSerializer(
        many=True, read_only=True
    )

    class Meta:
        model = Control
        fields = [
            "id",
            "control_code",
            "title",
            "description",
            "weight",
            "framework",
            "framework_name",
            "framework_version",
            "wazuh_mappings",
            "created_at",
        ]


class DepartmentSerializer(serializers.ModelSerializer):
    policy_count = serializers.SerializerMethodField()
    agent_count = serializers.SerializerMethodField()

    class Meta:
        model = Department
        fields = ["id", "name", "description", "policy_count", "agent_count", "created_at", "updated_at"]

    def get_policy_count(self, obj):
        return obj.policies.count()

    def get_agent_count(self, obj):
        return obj.agents.count()


class AgentProfileSerializer(serializers.ModelSerializer):
    display_name = serializers.CharField(read_only=True)
    department_name = serializers.CharField(source="department.name", read_only=True)
    department_id = serializers.PrimaryKeyRelatedField(
        queryset=Department.objects.all(),
        source="department",
        required=False,
        allow_null=True,
        write_only=True,
    )

    class Meta:
        model = AgentProfile
        fields = ["id", "agent_id", "wazuh_name", "custom_alias", "display_name",
                  "department", "department_id", "department_name", "created_at", "updated_at"]
        read_only_fields = ["agent_id", "wazuh_name"]


class PolicySerializer(serializers.ModelSerializer):
    controls = ControlSerializer(many=True, read_only=True)
    control_ids = serializers.PrimaryKeyRelatedField(
        queryset=Control.objects.all(),
        many=True,
        write_only=True,
        source="controls",
        required=False,
    )
    departments = DepartmentSerializer(many=True, read_only=True)
    department_ids = serializers.PrimaryKeyRelatedField(
        queryset=Department.objects.all(),
        many=True,
        write_only=True,
        source="departments",
        required=False,
    )

    class Meta:
        model = Policy
        fields = [
            "id",
            "title",
            "description",
            "status",
            "controls",
            "control_ids",
            "departments",
            "department_ids",
            "created_at",
            "updated_at",
        ]


class RiskSerializer(serializers.ModelSerializer):
    control_code = serializers.CharField(
        source="control.control_code", read_only=True
    )
    framework_name = serializers.CharField(
        source="control.framework.name", read_only=True
    )

    class Meta:
        model = Risk
        fields = [
            "id",
            "title",
            "description",
            "severity",
            "risk_score",
            "remediation_steps",
            "control",
            "control_code",
            "framework_name",
            "created_at",
        ]


# ═══════════════════════════════════════════════════
# WAZUH MAPPING
# ═══════════════════════════════════════════════════


class WazuhMappingSerializer(serializers.ModelSerializer):
    control_code = serializers.CharField(
        source="control.control_code", read_only=True
    )
    framework_name = serializers.CharField(
        source="control.framework.name", read_only=True
    )

    class Meta:
        model = WazuhMapping
        fields = [
            "id",
            "wazuh_rule_id",
            "rule_description",
            "control",
            "control_code",
            "framework_name",
        ]


# ═══════════════════════════════════════════════════
# SCAN / RESULTS LAYER
# ═══════════════════════════════════════════════════


class ScanResultSerializer(serializers.ModelSerializer):
    """
    Flattened result — includes the control description and framework
    name from the related WazuhMapping → Control → Framework chain.
    """

    wazuh_rule_id = serializers.CharField(
        source="mapping.wazuh_rule_id", read_only=True
    )
    rule_description = serializers.CharField(
        source="mapping.rule_description", read_only=True
    )
    control_code = serializers.CharField(
        source="mapping.control.control_code", read_only=True
    )
    control_title = serializers.CharField(
        source="mapping.control.title", read_only=True
    )
    framework_name = serializers.CharField(
        source="mapping.control.framework.name", read_only=True
    )

    control_id = serializers.IntegerField(
        source="mapping.control.id", read_only=True
    )

    class Meta:
        model = ScanResult
        fields = [
            "id",
            "is_passed",
            "control_id",
            "wazuh_rule_id",
            "rule_description",
            "control_code",
            "control_title",
            "framework_name",
            "raw_log_data",
            "created_at",
        ]


class ComplianceScanSerializer(serializers.ModelSerializer):
    """Scan with nested results — single request gives the full picture."""

    results = ScanResultSerializer(many=True, read_only=True)
    total_checks = serializers.IntegerField(
        source="results.count", read_only=True
    )
    passed_checks = serializers.SerializerMethodField()
    display_name = serializers.SerializerMethodField()
    department_name = serializers.SerializerMethodField()

    class Meta:
        model = ComplianceScan
        fields = [
            "id",
            "agent_id",
            "display_name",
            "department_name",
            "scan_date",
            "overall_score",
            "total_checks",
            "passed_checks",
            "results",
            "created_at",
        ]

    def get_passed_checks(self, obj) -> int:
        return obj.results.filter(is_passed=True).count()

    def get_display_name(self, obj) -> str:
        try:
            profile = AgentProfile.objects.get(agent_id=obj.agent_id)
            return profile.custom_alias or profile.wazuh_name or obj.agent_id
        except AgentProfile.DoesNotExist:
            return obj.agent_id

    def get_department_name(self, obj) -> str:
        try:
            profile = AgentProfile.objects.get(agent_id=obj.agent_id)
            return profile.department.name if profile.department else "Unassigned"
        except AgentProfile.DoesNotExist:
            return "Unassigned"


# ═══════════════════════════════════════════════════
# USER PROFILE & AUDIT LOG
# ═══════════════════════════════════════════════════


class UserProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)

    class Meta:
        model = UserProfile
        fields = ["username", "email", "role", "created_at"]


class AuditLogSerializer(serializers.ModelSerializer):
    user = serializers.CharField(source="user.username", default="System", read_only=True)

    class Meta:
        model = AuditLog
        fields = ["id", "user", "action", "module", "timestamp", "status"]


# ═══════════════════════════════════════════════════
# SYSTEM SETTINGS
# ═══════════════════════════════════════════════════


class SystemSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = SystemSettings
        fields = [
            "passing_score_threshold",
            "scan_frequency",
            "audit_log_retention",
            "critical_email_alerts",
            "weekly_report",
            "total_reports_generated",
            "updated_at",
        ]


# ═══════════════════════════════════════════════════
# USER MANAGEMENT (for Super Admin)
# ═══════════════════════════════════════════════════


class UserManagementSerializer(serializers.ModelSerializer):
    """For listing/managing users with their profile roles."""
    role = serializers.CharField(source="profile.role", read_only=True)
    is_active = serializers.BooleanField()
    password_changed_at = serializers.DateTimeField(source="profile.password_changed_at", read_only=True, default=None)
    account_expiry_date = serializers.DateTimeField(source="profile.account_expiry_date", read_only=True, default=None)
    display_name = serializers.CharField(source="profile.display_name", read_only=True, default="")
    phone_number = serializers.CharField(source="profile.phone_number", read_only=True, default="")
    designation = serializers.CharField(source="profile.designation", read_only=True, default="")
    profile_picture = serializers.SerializerMethodField()

    def get_profile_picture(self, obj):
        try:
            return obj.profile.get_image_base64()
        except Exception:
            return None

    class Meta:
        model = User
        fields = [
            "id", "username", "email", "is_active", "role", 
            "date_joined", "password_changed_at", "account_expiry_date",
            "display_name", "phone_number", "designation", "profile_picture"
        ]
        read_only_fields = ["id", "username", "date_joined"]


class CreateUserSerializer(serializers.Serializer):
    """For creating new admin users."""
    email = serializers.EmailField()
    username = serializers.CharField(max_length=150, required=False)
    role = serializers.ChoiceField(
        choices=UserProfile.Role.choices,
        default="admin",
    )
    account_expiry_date = serializers.DateTimeField(required=False, allow_null=True)


# ═══════════════════════════════════════════════════
# SMTP SETTINGS
# ═══════════════════════════════════════════════════


class SMTPSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = SMTPSettings
        fields = [
            "host",
            "port",
            "username",
            "password",
            "use_tls",
            "updated_at",
        ]
        extra_kwargs = {
            "password": {"write_only": True},
        }

    def to_representation(self, instance):
        """Mask the password in read responses."""
        data = super().to_representation(instance)
        # Password is write_only, but show a placeholder if it's configured
        data["password_configured"] = bool(instance.password)
        return data


# ═══════════════════════════════════════════════════
# CUSTOM JWT LOGIN (Account Expiry Enforcement)
# ═══════════════════════════════════════════════════


class CustomTokenObtainPairSerializer(serializers.Serializer):
    """
    Wraps the default JWT token-obtain flow and injects an
    account_expiry_date check before returning tokens.
    """
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        from django.contrib.auth import authenticate
        from django.utils import timezone
        from rest_framework.exceptions import AuthenticationFailed

        user = authenticate(
            username=attrs["username"],
            password=attrs["password"],
        )
        if user is None:
            raise AuthenticationFailed("Invalid username or password.")

        if not user.is_active:
            raise AuthenticationFailed("This account has been deactivated.")

        # ── Account Expiry Check ──
        if user.is_superuser:
            pass # Superusers never expire
        else:
            try:
                profile = user.profile
                if profile.account_expiry_date and profile.account_expiry_date < timezone.now():
                    if user.is_active:
                        user.is_active = False
                        user.save(update_fields=["is_active"])
                        from compliance.models import AuditLog
                        AuditLog.objects.create(user=user, action="account automatically expired", module="Auth", status="System")
                    raise AuthenticationFailed("Account has expired. Contact your Super Administrator.")
            except Exception:
                pass

        # ── Check if 2FA is required ──
        try:
            totp_secret = user.profile.totp_secret
        except UserProfile.DoesNotExist:
            totp_secret = ""

        if totp_secret:
            # Don't issue tokens yet — frontend must route to TOTP verification
            return {
                "requires_2fa": True,
                "username": user.username,
            }

        # No 2FA configured — issue tokens directly
        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = RefreshToken.for_user(user)
        try:
            role = user.profile.role
        except UserProfile.DoesNotExist:
            role = "admin"

        return {
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "username": user.username,
            "role": role,
        }
