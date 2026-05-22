"""
seed_all.py
───────────
One-command database seeder for the GRC Platform.
Runs all seed commands in the correct order:

  1. seed_users           → Super Admin, Admin, Auditor + audit log entries
  2. seed_enterprise_matrix → Frameworks, Controls, Wazuh Mappings, Policies
  3. seed_departments     → Organizational departments

Usage:
    docker compose exec backend python manage.py seed_all

Safe to run multiple times — all sub-commands are idempotent.
"""

from django.core.management.base import BaseCommand
from django.core.management import call_command

from compliance.models import Department, SystemSettings


# ── Default Departments ──────────────────────────────────
DEPARTMENTS = [
    {"name": "IT",          "description": "Information Technology — manages infrastructure, networks, servers, and endpoint security."},
    {"name": "HR",          "description": "Human Resources — employee onboarding, offboarding, and personnel security."},
    {"name": "Finance",     "description": "Finance & Accounting — financial controls, fraud prevention, and payment security."},
    {"name": "Operations",  "description": "Business Operations — day-to-day operational continuity and process management."},
    {"name": "Legal",       "description": "Legal & Compliance — regulatory affairs, contracts, and legal risk management."},
    {"name": "Engineering", "description": "Software Engineering — application development, DevOps, and code security."},
    {"name": "Executive",   "description": "Executive Leadership — strategic governance, risk oversight, and board reporting."},
]


class Command(BaseCommand):
    help = "Run all seed commands to fully initialize the GRC database."

    def handle(self, *args, **options):
        self.stdout.write(self.style.HTTP_INFO(
            "\n"
            "╔═══════════════════════════════════════════════════════╗\n"
            "║       GRC Platform — Full Database Seeder            ║\n"
            "╚═══════════════════════════════════════════════════════╝\n"
        ))

        # ── 1. Users ──────────────────────────────────────
        self.stdout.write(self.style.MIGRATE_HEADING("\n▶ Step 1/4: Seeding Users..."))
        call_command("seed_users", stdout=self.stdout, stderr=self.stderr)

        # ── 2. Enterprise Matrix ──────────────────────────
        self.stdout.write(self.style.MIGRATE_HEADING("\n▶ Step 2/4: Seeding Enterprise Compliance Matrix..."))
        call_command("seed_enterprise_matrix", stdout=self.stdout, stderr=self.stderr)

        # ── 3. Departments ────────────────────────────────
        self.stdout.write(self.style.MIGRATE_HEADING("\n▶ Step 3/4: Seeding Departments..."))
        created_count = 0
        for dept in DEPARTMENTS:
            _, created = Department.objects.get_or_create(
                name=dept["name"],
                defaults={"description": dept["description"]},
            )
            if created:
                created_count += 1
                self.stdout.write(self.style.SUCCESS(f"  ✅ Created department: {dept['name']}"))
            else:
                self.stdout.write(f"  ⏭️  Department '{dept['name']}' already exists.")
        self.stdout.write(self.style.SUCCESS(
            f"\n  Departments: {created_count} created, {len(DEPARTMENTS) - created_count} existing"
        ))

        # ── 4. System Settings (initialize singleton) ─────
        self.stdout.write(self.style.MIGRATE_HEADING("\n▶ Step 4/4: Initializing System Settings..."))
        settings = SystemSettings.load()
        self.stdout.write(self.style.SUCCESS(
            f"  ✅ System Settings initialized (threshold={settings.passing_score_threshold}%, "
            f"scan_frequency={settings.scan_frequency})"
        ))

        # ── Summary ───────────────────────────────────────
        self.stdout.write(self.style.HTTP_INFO(
            "\n"
            "╔═══════════════════════════════════════════════════════╗\n"
            "║       ✅ Database seeding complete!                   ║\n"
            "╠═══════════════════════════════════════════════════════╣\n"
            "║  Next steps:                                         ║\n"
            "║  1. Login at http://localhost:5173                    ║\n"
            "║  2. Use superadmin / SuperGRC@2026!                   ║\n"
            "║  3. Set up TOTP in Settings → Authenticator           ║\n"
            "║  4. Change your password immediately                  ║\n"
            "╚═══════════════════════════════════════════════════════╝\n"
        ))
