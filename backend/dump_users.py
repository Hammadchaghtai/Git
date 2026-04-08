import os
import django
import json

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth.models import User

out = []
for u in User.objects.all():
    role = "No Profile"
    if hasattr(u, "profile"): role = u.profile.role
    out.append({"username": u.username, "email": u.email, "role": role})

# If no super_admin exists or email isn't set, create/update one
super_admin = User.objects.filter(profile__role='super_admin').first() or User.objects.filter(is_superuser=True).first()

if not super_admin:
    # Get the mock superadmin if it exists
    super_admin = User.objects.filter(username='superadmin').first()

if super_admin:
    super_admin.email = "muhammad.hammad.chughtai@gmail.com"
    super_admin.set_password("super123")
    super_admin.save()
    out.append({"NOTICE": "Updated superadmin password to super123 and email."})
else:
    # create it
    from compliance.models import UserProfile
    u = User.objects.create_superuser('superadmin', 'muhammad.hammad.chughtai@gmail.com', 'super123')
    UserProfile.objects.get_or_create(user=u, role='super_admin')
    out.append({"NOTICE": "Created new superadmin! Username: superadmin, Password: super123"})

admin = User.objects.filter(username='admin').first()
if admin:
    admin.set_password("admin123")
    admin.save()

with open('users_dump.json', 'w') as f:
    json.dump(out, f, indent=4)
