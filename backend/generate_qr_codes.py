"""
generate_qr_codes.py
────────────────────
Run inside Docker to generate QR code images for ALL existing users
and also assign unique TOTP secrets to users who still have the old default.

Usage:
    docker compose exec backend python generate_qr_codes.py
"""
import os, sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

import pyotp
import qrcode
from pathlib import Path
from django.contrib.auth.models import User
from compliance.models import UserProfile

OLD_DEFAULT = "LNQQV4GJKFA27GFQQWVUELXUX7MECTFI"
QR_DIR = Path(__file__).parent / "qr_codes"
QR_DIR.mkdir(exist_ok=True)

print("=" * 55)
print("    GRC Platform — QR Code Generator")
print("=" * 55)

for user in User.objects.all():
    try:
        profile = user.profile
    except UserProfile.DoesNotExist:
        profile = UserProfile.objects.create(user=user, role="admin")

    # If still using old default or empty secret, generate a unique one
    if not profile.totp_secret or profile.totp_secret == OLD_DEFAULT:
        profile.totp_secret = pyotp.random_base32()
        profile.save(update_fields=["totp_secret"])
        print(f"  ✅ Generated new TOTP secret for: {user.username}")
    else:
        print(f"  ℹ  Existing TOTP secret for:      {user.username}")

    # Generate QR code
    totp = pyotp.TOTP(profile.totp_secret)
    uri = totp.provisioning_uri(name=user.username, issuer_name="GRC Platform")

    qr = qrcode.QRCode(version=1, box_size=10, border=4)
    qr.add_data(uri)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")

    path = QR_DIR / f"{user.username}.png"
    img.save(str(path))
    print(f"     📄 QR saved → qr_codes/{user.username}.png")
    print(f"     🔑 Secret  → {profile.totp_secret}")

print()
print(f"Done! {User.objects.count()} QR codes saved in /backend/qr_codes/")
print("Scan with Microsoft Authenticator → Add Account → Work or School")
