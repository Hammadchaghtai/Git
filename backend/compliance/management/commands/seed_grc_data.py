"""
seed_grc_data.py
────────────────
Custom management command to populate the database with initial
GRC mapping data (Frameworks, Controls, Policies, Risks, WazuhMappings).

Usage:
    python manage.py seed_grc_data

Safe to run multiple times — uses get_or_create to prevent duplicates.
"""

from django.core.management.base import BaseCommand

from compliance.models import Control, Framework, Policy, Risk, WazuhMapping


class Command(BaseCommand):
    help = "Seed the database with initial GRC frameworks, controls, policies, risks, and Wazuh mappings."

    # ── Colours for console output ──────────────────
    SUCCESS_TAG = "  ✅ Created"
    EXISTS_TAG = "  ⏭️  Exists"

    def _log(self, created: bool, label: str) -> None:
        """Print a coloured status line."""
        if created:
            self.stdout.write(self.style.SUCCESS(f"{self.SUCCESS_TAG}: {label}"))
        else:
            self.stdout.write(self.style.WARNING(f"{self.EXISTS_TAG}: {label}"))

    # ── Main entry point ────────────────────────────
    def handle(self, *args, **options):
        self.stdout.write(self.style.HTTP_INFO("\n═══ Seeding GRC Data ═══\n"))

        # ── 1. FRAMEWORKS ───────────────────────────
        self.stdout.write(self.style.MIGRATE_HEADING("▸ Frameworks"))

        iso, iso_created = Framework.objects.get_or_create(
            name="ISO 27001",
            defaults={"version": "2022"},
        )
        self._log(iso_created, f"Framework: {iso}")

        soc, soc_created = Framework.objects.get_or_create(
            name="SOC 2",
            defaults={"version": "Type II"},
        )
        self._log(soc_created, f"Framework: {soc}")

        # ── 2. CONTROLS ────────────────────────────
        self.stdout.write(self.style.MIGRATE_HEADING("\n▸ Controls"))

        ctrl1, c = Control.objects.get_or_create(
            framework=iso,
            control_code="A.9.2.4",
            defaults={
                "title": "Management of secret authentication information",
                "description": "Management of secret authentication information",
            },
        )
        self._log(c, f"Control: {ctrl1}")

        ctrl2, c = Control.objects.get_or_create(
            framework=iso,
            control_code="A.9.4.2",
            defaults={
                "title": "Secure log-on procedures",
                "description": "Secure log-on procedures",
            },
        )
        self._log(c, f"Control: {ctrl2}")

        ctrl3, c = Control.objects.get_or_create(
            framework=iso,
            control_code="A.13.1.1",
            defaults={
                "title": "Network controls",
                "description": "Network controls",
            },
        )
        self._log(c, f"Control: {ctrl3}")

        ctrl4, c = Control.objects.get_or_create(
            framework=soc,
            control_code="CC6.1",
            defaults={
                "title": "Logical Access",
                "description": "Logical Access",
            },
        )
        self._log(c, f"Control: {ctrl4}")

        ctrl5, c = Control.objects.get_or_create(
            framework=soc,
            control_code="CC6.6",
            defaults={
                "title": "Boundary Protection",
                "description": "Boundary Protection",
            },
        )
        self._log(c, f"Control: {ctrl5}")

        # ── 3. POLICIES ────────────────────────────
        self.stdout.write(self.style.MIGRATE_HEADING("\n▸ Policies"))

        pol1, c = Policy.objects.get_or_create(
            title="Password Policy",
            defaults={
                "description": "All user passwords must meet complexity and aging requirements.",
            },
        )
        pol1.controls.add(ctrl1)
        self._log(c, f"Policy: {pol1}  →  {ctrl1.control_code}")

        pol2, c = Policy.objects.get_or_create(
            title="Remote Access Policy",
            defaults={
                "description": "Root/Admin accounts must not be accessible via remote protocols.",
            },
        )
        pol2.controls.add(ctrl2)
        self._log(c, f"Policy: {pol2}  →  {ctrl2.control_code}")

        pol3, c = Policy.objects.get_or_create(
            title="Firewall Policy",
            defaults={
                "description": "All endpoints must have host-based firewalls enabled.",
            },
        )
        pol3.controls.add(ctrl3, ctrl5)
        self._log(c, f"Policy: {pol3}  →  {ctrl3.control_code}, {ctrl5.control_code}")

        # ── 4. RISKS ───────────────────────────────
        self.stdout.write(self.style.MIGRATE_HEADING("\n▸ Risks"))

        risk1, c = Risk.objects.get_or_create(
            control=ctrl1,
            title="Credential Compromise",
            defaults={
                "description": "High risk of credential stuffing.",
                "severity": Risk.Severity.HIGH,
                "risk_score": 8,
            },
        )
        self._log(c, f"Risk: {risk1}")

        risk2, c = Risk.objects.get_or_create(
            control=ctrl2,
            title="Network Takeover",
            defaults={
                "description": "Critical risk of full system compromise via network.",
                "severity": Risk.Severity.CRITICAL,
                "risk_score": 10,
            },
        )
        self._log(c, f"Risk: {risk2}")

        risk3, c = Risk.objects.get_or_create(
            control=ctrl3,
            title="Lateral Movement",
            defaults={
                "description": "Unfiltered network exposure.",
                "severity": Risk.Severity.HIGH,
                "risk_score": 8,
            },
        )
        self._log(c, f"Risk: {risk3}")

        # ── 5. WAZUH MAPPINGS ──────────────────────
        self.stdout.write(self.style.MIGRATE_HEADING("\n▸ Wazuh Mappings"))

        wm1, c = WazuhMapping.objects.get_or_create(
            wazuh_rule_id="5.3.1",
            defaults={
                "rule_description": "Ensure password expiration is 365 days or less.",
                "control": ctrl1,
            },
        )
        self._log(c, f"WazuhMapping: {wm1}")

        wm2, c = WazuhMapping.objects.get_or_create(
            wazuh_rule_id="5.2.4",
            defaults={
                "rule_description": "Ensure SSH root login is disabled.",
                "control": ctrl2,
            },
        )
        self._log(c, f"WazuhMapping: {wm2}")

        wm3, c = WazuhMapping.objects.get_or_create(
            wazuh_rule_id="3.5.1",
            defaults={
                "rule_description": "Ensure Uncomplicated Firewall (UFW) is installed and active.",
                "control": ctrl3,
            },
        )
        self._log(c, f"WazuhMapping: {wm3}")

        # ── Done ───────────────────────────────────
        self.stdout.write(
            self.style.SUCCESS(
                "\n═══ GRC seed complete! "
                f"({Framework.objects.count()} frameworks, "
                f"{Control.objects.count()} controls, "
                f"{Policy.objects.count()} policies, "
                f"{Risk.objects.count()} risks, "
                f"{WazuhMapping.objects.count()} mappings) ═══\n"
            )
        )
