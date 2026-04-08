"""
compliance/admin.py
───────────────────
Django Admin configuration for all GRC models.
Each model is registered with relevant list_display, search_fields,
and list_filter for easy navigation.
"""

from django.contrib import admin

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
)


# ═══════════════════════════════════════════════════
# GOVERNANCE LAYER
# ═══════════════════════════════════════════════════


@admin.register(Framework)
class FrameworkAdmin(admin.ModelAdmin):
    list_display = ("name", "version", "created_at")
    search_fields = ("name", "version")
    ordering = ("name",)


@admin.register(Control)
class ControlAdmin(admin.ModelAdmin):
    list_display = ("control_code", "title", "framework", "weight")
    list_filter = ("framework",)
    search_fields = ("control_code", "title", "description")
    ordering = ("framework", "control_code")


@admin.register(Policy)
class PolicyAdmin(admin.ModelAdmin):
    list_display = ("title", "created_at", "updated_at")
    search_fields = ("title", "description")
    filter_horizontal = ("controls",)  # nice M2M widget


# ═══════════════════════════════════════════════════
# RISK LAYER
# ═══════════════════════════════════════════════════


@admin.register(Risk)
class RiskAdmin(admin.ModelAdmin):
    list_display = ("title", "control", "severity", "risk_score")
    list_filter = ("severity",)
    search_fields = ("title", "description", "control__control_code")
    ordering = ("-risk_score",)


# ═══════════════════════════════════════════════════
# WAZUH INTEGRATION LAYER
# ═══════════════════════════════════════════════════


@admin.register(WazuhMapping)
class WazuhMappingAdmin(admin.ModelAdmin):
    list_display = ("wazuh_rule_id", "rule_description", "control")
    list_filter = ("control__framework",)
    search_fields = ("wazuh_rule_id", "rule_description", "control__control_code")


# ═══════════════════════════════════════════════════
# SCAN / RESULTS LAYER
# ═══════════════════════════════════════════════════


@admin.register(ComplianceScan)
class ComplianceScanAdmin(admin.ModelAdmin):
    list_display = ("agent_id", "scan_date", "overall_score", "created_at")
    list_filter = ("agent_id",)
    search_fields = ("agent_id",)
    ordering = ("-scan_date",)


@admin.register(ScanResult)
class ScanResultAdmin(admin.ModelAdmin):
    list_display = ("scan", "mapping", "is_passed", "created_at")
    list_filter = ("is_passed", "mapping__control__framework")
    search_fields = (
        "mapping__wazuh_rule_id",
        "scan__agent_id",
    )


# ═══════════════════════════════════════════════════
# USER PROFILES & AUDIT LOG
# ═══════════════════════════════════════════════════


class UserProfileInline(admin.StackedInline):
    model = UserProfile
    can_delete = False
    verbose_name_plural = "Profile"


# Extend the default User admin to show the profile inline
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import User

class UserAdmin(BaseUserAdmin):
    inlines = [UserProfileInline]

admin.site.unregister(User)
admin.site.register(User, UserAdmin)


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "role", "created_at")
    list_filter = ("role",)
    search_fields = ("user__username", "user__email")


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ("timestamp", "user", "action", "module", "status")
    list_filter = ("status", "module")
    search_fields = ("action", "user__username")
    ordering = ("-timestamp",)
    readonly_fields = ("timestamp",)


@admin.register(SystemSettings)
class SystemSettingsAdmin(admin.ModelAdmin):
    list_display = ("passing_score_threshold", "scan_frequency", "critical_email_alerts", "updated_at")

    def has_add_permission(self, request):
        # Prevent creating more than one settings row
        return not SystemSettings.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False
