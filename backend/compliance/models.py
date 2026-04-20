"""
compliance/models.py
────────────────────
Core GRC (Governance, Risk & Compliance) domain models.

Entity Relationship Overview
────────────────────────────
Framework ──< Control ──< Risk
                │
                ├──< WazuhMapping ──< ScanResult >── ComplianceScan
                │
                └──>< Policy  (M2M)
"""

from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator


# ═══════════════════════════════════════════════════
# 1. GOVERNANCE LAYER
# ═══════════════════════════════════════════════════

class Framework(models.Model):
    """
    A compliance framework such as ISO 27001:2022 or SOC 2 Type II.
    Acts as the top-level grouping for all controls.
    """

    name = models.CharField(
        max_length=120,
        unique=True,
        help_text="Framework name, e.g. 'ISO 27001'",
    )
    version = models.CharField(
        max_length=30,
        help_text="Version identifier, e.g. '2022'",
    )
    description = models.TextField(
        blank=True,
        default="",
        help_text="Optional long description of the framework.",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        verbose_name_plural = "Frameworks"

    def __str__(self) -> str:
        return f"{self.name} v{self.version}"


class Control(models.Model):
    """
    A single auditable control within a Framework.
    Example: ISO 27001 → A.9.2.4 "Management of secret authentication
    information of users".
    """

    framework = models.ForeignKey(
        Framework,
        on_delete=models.CASCADE,
        related_name="controls",
    )
    control_code = models.CharField(
        max_length=30,
        help_text="Control identifier, e.g. 'A.9.2.4'",
    )
    title = models.CharField(
        max_length=255,
        help_text="Short title of the control.",
    )
    description = models.TextField(
        blank=True,
        default="",
        help_text="Full description of what the control requires.",
    )
    weight = models.FloatField(
        default=1.0,
        validators=[MinValueValidator(0.0)],
        help_text="Relative weight used in compliance score calculation.",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["framework", "control_code"]
        unique_together = ["framework", "control_code"]
        verbose_name_plural = "Controls"

    def __str__(self) -> str:
        return f"[{self.framework.name}] {self.control_code}"


class Policy(models.Model):
    """
    An organizational policy document that satisfies one or more Controls
    across potentially multiple Frameworks.
    """

    class PolicyStatus(models.TextChoices):
        ACTIVE = "active", "Active"
        DRAFT = "draft", "Draft"
        DISABLED = "disabled", "Disabled"

    title = models.CharField(max_length=255)
    description = models.TextField(
        blank=True,
        default="",
        help_text="Full policy text or summary.",
    )
    status = models.CharField(
        max_length=10,
        choices=PolicyStatus.choices,
        default=PolicyStatus.ACTIVE,
    )
    controls = models.ManyToManyField(
        Control,
        related_name="policies",
        blank=True,
        help_text="Controls this policy satisfies.",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["title"]
        verbose_name_plural = "Policies"

    def __str__(self) -> str:
        return self.title


# ═══════════════════════════════════════════════════
# 2. RISK LAYER
# ═══════════════════════════════════════════════════

class Risk(models.Model):
    """
    A risk entry linked to a specific Control.
    Captures severity, numeric score, and recommended remediation.
    """

    class Severity(models.TextChoices):
        LOW = "Low", "Low"
        MEDIUM = "Medium", "Medium"
        HIGH = "High", "High"
        CRITICAL = "Critical", "Critical"

    control = models.ForeignKey(
        Control,
        on_delete=models.CASCADE,
        related_name="risks",
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    severity = models.CharField(
        max_length=10,
        choices=Severity.choices,
        default=Severity.LOW,
    )
    risk_score = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(10)],
        help_text="Risk score from 1 (minimal) to 10 (catastrophic).",
    )
    remediation_steps = models.TextField(
        blank=True,
        default="",
        help_text="Actionable steps to mitigate or eliminate this risk.",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-risk_score"]
        verbose_name_plural = "Risks"

    def __str__(self) -> str:
        return f"{self.title} ({self.severity} – {self.risk_score}/10)"


# ═══════════════════════════════════════════════════
# 3. WAZUH INTEGRATION LAYER
# ═══════════════════════════════════════════════════

class WazuhMapping(models.Model):
    """
    The critical bridge between Wazuh SCA rule results and
    governance Controls.  Maps a Wazuh rule/check ID to the
    corresponding ISO 27001 / SOC 2 Control.
    """

    wazuh_rule_id = models.CharField(
        max_length=50,
        unique=True,
        help_text="Wazuh SCA check / rule ID (e.g. '28504').",
    )
    rule_description = models.TextField(
        blank=True,
        default="",
        help_text="Human-readable description of the Wazuh rule.",
    )
    control = models.ForeignKey(
        Control,
        on_delete=models.CASCADE,
        related_name="wazuh_mappings",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Wazuh → Control Mapping"
        verbose_name_plural = "Wazuh → Control Mappings"

    def __str__(self) -> str:
        return f"Wazuh {self.wazuh_rule_id} → {self.control.control_code}"


# ═══════════════════════════════════════════════════
# 4. SCAN / RESULTS LAYER
# ═══════════════════════════════════════════════════

class ComplianceScan(models.Model):
    """
    A point-in-time compliance scan for a single Wazuh agent.
    The overall_score is calculated by the scoring service after
    all ScanResults are ingested.
    """

    agent_id = models.CharField(
        max_length=20,
        help_text="Wazuh agent ID (e.g. '001').",
    )
    scan_date = models.DateTimeField(
        help_text="Timestamp when the scan was performed / ingested.",
    )
    overall_score = models.FloatField(
        default=0.0,
        validators=[MinValueValidator(0.0), MaxValueValidator(100.0)],
        help_text="Weighted compliance score (0-100%).",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-scan_date"]
        verbose_name_plural = "Compliance Scans"

    def __str__(self) -> str:
        return f"Agent {self.agent_id} – {self.scan_date:%Y-%m-%d %H:%M} – {self.overall_score:.1f}%"


class ScanResult(models.Model):
    """
    An individual pass/fail result for one Wazuh check within a
    ComplianceScan.  Linked through WazuhMapping to the governance
    Control it evaluates.
    """

    scan = models.ForeignKey(
        ComplianceScan,
        on_delete=models.CASCADE,
        related_name="results",
    )
    mapping = models.ForeignKey(
        WazuhMapping,
        on_delete=models.CASCADE,
        related_name="scan_results",
    )
    is_passed = models.BooleanField(
        default=False,
        help_text="True if the agent passed this check.",
    )
    raw_log_data = models.JSONField(
        blank=True,
        default=dict,
        help_text="Raw JSON payload returned by the Wazuh SCA API.",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-scan__scan_date"]
        verbose_name_plural = "Scan Results"

    def __str__(self) -> str:
        status = "✅ PASS" if self.is_passed else "❌ FAIL"
        return f"{status} – {self.mapping.wazuh_rule_id} (Scan {self.scan_id})"


# ═══════════════════════════════════════════════════
# 5. USER PROFILES & ROLES
# ═══════════════════════════════════════════════════

class UserProfile(models.Model):
    """
    Extends the default Django User with a GRC role.
    Uses OneToOneField to avoid replacing AUTH_USER_MODEL.
    """

    class Role(models.TextChoices):
        SUPER_ADMIN = "super_admin", "Super Admin"
        ADMIN = "admin", "Admin"
        AUDITOR = "auditor", "Auditor"

    user = models.OneToOneField(
        "auth.User",
        on_delete=models.CASCADE,
        related_name="profile",
    )
    role = models.CharField(
        max_length=15,
        choices=Role.choices,
        default=Role.ADMIN,
    )
    # TOTP secret for authenticator app — generated uniquely per user
    totp_secret = models.CharField(
        max_length=64,
        blank=True,
        default="",
        help_text="Base32 TOTP secret for 2FA authenticator app.",
    )
    # Track when the user last changed their own password
    password_changed_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Timestamp of the user's last self-initiated password change.",
    )
    # Enhanced Profile Fields
    display_name = models.CharField(max_length=100, blank=True, default="", help_text="User's real name")
    phone_number = models.CharField(max_length=20, blank=True, default="", help_text="Contact number for emergency / manage admins")
    designation = models.CharField(max_length=100, blank=True, default="", help_text="Job title or department")
    timezone = models.CharField(max_length=50, default="UTC", help_text="User timezone preference")
    profile_pic_binary = models.BinaryField(null=True, blank=True, help_text="Binary image data compressed and stored directly in DB")
    
    # Time-Bound Access (Mainly for Auditors)
    account_expiry_date = models.DateTimeField(
        null=True,
        blank=True,
        help_text="If set, the account will be automatically deactivated after this date.",
    )
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "User Profile"
        verbose_name_plural = "User Profiles"

    def __str__(self) -> str:
        return f"{self.user.username} ({self.get_role_display()})"

    def save_profile_pic(self, uploaded_file):
        import io
        from PIL import Image

        # 1. Open the image
        img = Image.open(uploaded_file)
        
        # Ensure image is in RGB mode (required for JPEG saving if it's RGBA/PNG)
        if img.mode != 'RGB':
            img = img.convert('RGB')
        
        # 2. Set max resolution (720p equivalent)
        output_size = (1280, 720)
        img.thumbnail(output_size) # Maintains aspect ratio

        # 3. Compress to JPEG
        buffer = io.BytesIO()
        img.save(buffer, format="JPEG", quality=80, optimize=True)
        
        # 4. Save binary data
        self.profile_pic_binary = buffer.getvalue()
        self.save()

    def get_image_base64(self):
        """Returns a base64 encoded data URI for React to render"""
        import base64
        if not self.profile_pic_binary:
            return None
        encoded = base64.b64encode(self.profile_pic_binary).decode('utf-8')
        return f"data:image/jpeg;base64,{encoded}"


# ═══════════════════════════════════════════════════
# 6. AUDIT LOG
# ═══════════════════════════════════════════════════

class AuditLog(models.Model):
    """
    Records notable events across the GRC platform.
    user is nullable to allow system-generated entries.
    """

    class Status(models.TextChoices):
        SUCCESS = "Success", "Success"
        ALERT = "Alert", "Alert"
        SYSTEM = "System", "System"

    user = models.ForeignKey(
        "auth.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audit_logs",
    )
    action = models.CharField(max_length=255)
    module = models.CharField(
        max_length=50,
        help_text="e.g. 'Auth', 'Policy', 'Scan', 'Settings'",
    )
    timestamp = models.DateTimeField(auto_now_add=True)
    status = models.CharField(
        max_length=10,
        choices=Status.choices,
        default=Status.SYSTEM,
    )

    class Meta:
        ordering = ["-timestamp"]
        verbose_name = "Audit Log"
        verbose_name_plural = "Audit Logs"

    def __str__(self) -> str:
        who = self.user.username if self.user else "System"
        return f"[{self.status}] {who}: {self.action}"


# ═══════════════════════════════════════════════════
# 7. SYSTEM SETTINGS (SINGLETON)
# ═══════════════════════════════════════════════════

class SystemSettings(models.Model):
    """
    Singleton settings row for the GRC platform.
    Only one row should ever exist (enforced by save()).
    """

    class ScanFrequency(models.TextChoices):
        DAILY = "daily", "Daily (Recommended for High Risk)"
        WEEKLY = "weekly", "Weekly (Standard)"
        MONTHLY = "monthly", "Monthly"

    class RetentionPolicy(models.TextChoices):
        SIX_MONTHS = "6months", "6 Months"
        ONE_YEAR = "1year", "1 Year (ISO Requirement)"
        THREE_YEARS = "3years", "3 Years"

    passing_score_threshold = models.IntegerField(
        default=80,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text="Compliance score below this value triggers Critical status.",
    )
    scan_frequency = models.CharField(
        max_length=10,
        choices=ScanFrequency.choices,
        default=ScanFrequency.WEEKLY,
    )
    audit_log_retention = models.CharField(
        max_length=10,
        choices=RetentionPolicy.choices,
        default=RetentionPolicy.ONE_YEAR,
    )
    critical_email_alerts = models.BooleanField(default=True)
    weekly_report = models.BooleanField(default=False)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "System Settings"
        verbose_name_plural = "System Settings"

    def save(self, *args, **kwargs):
        # Enforce singleton: always use pk=1
        self.pk = 1
        super().save(*args, **kwargs)

    @classmethod
    def load(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj

    def __str__(self) -> str:
        return f"System Settings (threshold={self.passing_score_threshold}%)"


# ═══════════════════════════════════════════════════
# 8. SMTP SETTINGS (SINGLETON)
# ═══════════════════════════════════════════════════

class SMTPSettings(models.Model):
    """
    Singleton SMTP configuration row for the GRC platform.
    Stores the email server credentials used for all outbound
    notifications (invites, reminders, OTPs).
    Only one row should ever exist (enforced by save()).
    """

    host = models.CharField(
        max_length=255,
        default="smtp.gmail.com",
        help_text="SMTP server hostname, e.g. 'smtp.gmail.com'.",
    )
    port = models.PositiveIntegerField(
        default=587,
        help_text="SMTP server port, e.g. 587 for STARTTLS.",
    )
    username = models.CharField(
        max_length=255,
        blank=True,
        default="",
        help_text="SMTP login username / email address.",
    )
    password = models.CharField(
        max_length=255,
        blank=True,
        default="",
        help_text="SMTP login password or app-specific password.",
    )
    use_tls = models.BooleanField(
        default=True,
        help_text="Whether to use STARTTLS when connecting.",
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "SMTP Settings"
        verbose_name_plural = "SMTP Settings"

    def save(self, *args, **kwargs):
        # Enforce singleton: always use pk=1
        self.pk = 1
        super().save(*args, **kwargs)

    @classmethod
    def load(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj

    def __str__(self) -> str:
        return f"SMTP Settings ({self.host}:{self.port})"
