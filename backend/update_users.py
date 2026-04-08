import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth.models import User
from compliance.models import UserProfile

print("=== DATABASE USERS ===")
for u in User.objects.all():
    role = "No Profile"
    if hasattr(u, "profile"):
        role = u.profile.role
    print(f"Username: {u.username} | Email: {u.email} | Role: {role} | Is Active: {u.is_active}")

# Find or update superadmin
super_user = User.objects.filter(profile__role='super_admin').first() or User.objects.filter(is_superuser=True).first()

if super_user:
    super_user.email = "muhammad.hammad.chughtai@gmail.com"
    super_user.set_password("super123")
    super_user.save()
    print(f"\n[UPDATED] SuperAdmin -> Username: {super_user.username}, Password: super123, Email: {super_user.email}")
else:
    print("\n[ERROR] No superadmin found in DB!")

admin_user = User.objects.filter(profile__role='admin').first()
if admin_user:
    admin_user.set_password("admin123")
    admin_user.save()
    print(f"[UPDATED] Admin -> Username: {admin_user.username}, Password: admin123, Email: {admin_user.email}")
else:
    print("[ERROR] No standard admin found in DB!")
