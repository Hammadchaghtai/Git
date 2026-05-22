"""
seed_users.py
─────────────
Creates initial GRC users with profiles and some audit log entries.

Usage:
    python manage.py seed_users
"""

from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from compliance.models import UserProfile, AuditLog

import pyotp


# ── Default credentials ──────────────────────────────────
# These are DEMO credentials for initial deployment.
# Change them immediately after first login!
USERS = [
    {
        "username": "superadmin",
        "password": "SuperGRC@2026!",
        "email": "superadmin@grc.local",
        "role": "super_admin",
        "is_superuser": True,
        "is_staff": True,
    },
    {
        "username": "admin",
        "password": "AdminGRC@2026!",
        "email": "admin@grc.local",
        "role": "admin",
        "is_superuser": False,
        "is_staff": True,
    },
    {
        "username": "auditor",
        "password": "AuditGRC@2026!",
        "email": "auditor@grc.local",
        "role": "auditor",
        "is_superuser": False,
        "is_staff": False,
    },
]


class Command(BaseCommand):
    help = "Create initial GRC users with profiles and seed audit log entries."

    def handle(self, *args, **options):
        self.stdout.write(self.style.HTTP_INFO("\n═══ Seeding Users ═══\n"))

        for u in USERS:
            user, created = User.objects.get_or_create(
                username=u["username"],
                defaults={
                    "email": u["email"],
                    "is_superuser": u["is_superuser"],
                    "is_staff": u["is_staff"],
                },
            )
            if created:
                user.set_password(u["password"])
                user.save()
                self.stdout.write(self.style.SUCCESS(f"  ✅ Created user: {u['username']}"))
            else:
                self.stdout.write(f"  ⏭️  User '{u['username']}' already exists.")

            # Create or update profile with a unique TOTP secret
            profile, profile_created = UserProfile.objects.get_or_create(
                user=user,
                defaults={"role": u["role"]},
            )
            if profile.role != u["role"]:
                profile.role = u["role"]
                profile.save()

            # Generate TOTP secret if not set
            if not profile.totp_secret:
                profile.totp_secret = pyotp.random_base32()
                profile.save(update_fields=["totp_secret"])
                self.stdout.write(self.style.SUCCESS(
                    f"  🔑 Generated TOTP secret for: {u['username']}"
                ))

        # Seed some audit log entries
        SEED_LOGS = [
            {"username": "admin",      "action": "updated Policy 'Access Control V2'",            "module": "Policy",   "status": "Success"},
            {"username": None,         "action": "generated a scheduled ISO 27001 compliance check", "module": "Scan", "status": "System"},
            {"username": "admin",      "action": "approved a policy change",                      "module": "Policy",   "status": "Success"},
            {"username": None,         "action": "detected 3 failed login attempts from IP 192.168.1.55", "module": "Auth", "status": "Alert"},
            {"username": "superadmin", "action": "created new policy 'Remote Access'",             "module": "Policy",   "status": "Success"},
            {"username": "superadmin", "action": "modified user roles for 'guest_user'",          "module": "Settings", "status": "Success"},
            {"username": None,         "action": "backup completed successfully",                 "module": "System",   "status": "System"},
            {"username": "auditor",    "action": "downloaded Compliance Report PDF",              "module": "Reports",  "status": "Success"},
            {"username": None,         "action": "scan completed (2 agents, 12 results)",         "module": "Scan",     "status": "System"},
        ]

        if AuditLog.objects.count() == 0:
            for log in SEED_LOGS:
                user = None
                if log["username"]:
                    user = User.objects.filter(username=log["username"]).first()
                AuditLog.objects.create(
                    user=user,
                    action=log["action"],
                    module=log["module"],
                    status=log["status"],
                )
            self.stdout.write(self.style.SUCCESS(f"\n  ✅ Seeded {len(SEED_LOGS)} audit log entries."))
        else:
            self.stdout.write("  ⏭️  Audit logs already exist — skipping seed.")

        self.stdout.write(self.style.SUCCESS("\n  🎉 User seeding complete!"))

        # Print credentials table for convenience
        self.stdout.write(self.style.HTTP_INFO("\n  ┌─────────────────────────────────────────────────┐"))
        self.stdout.write(self.style.HTTP_INFO("  │         DEFAULT LOGIN CREDENTIALS               │"))
        self.stdout.write(self.style.HTTP_INFO("  ├──────────────┬──────────────────┬────────────────┤"))
        self.stdout.write(self.style.HTTP_INFO("  │ Username     │ Password         │ Role           │"))
        self.stdout.write(self.style.HTTP_INFO("  ├──────────────┼──────────────────┼────────────────┤"))
        for u in USERS:
            self.stdout.write(self.style.WARNING(
                f"  │ {u['username']:<12} │ {u['password']:<16} │ {u['role']:<14} │"
            ))
        self.stdout.write(self.style.HTTP_INFO("  └──────────────┴──────────────────┴────────────────┘"))
        self.stdout.write(self.style.ERROR("\n  ⚠️  Change these passwords immediately after first login!\n"))
