from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("compliance", "0007_userprofile_account_expiry_date_and_more"),
    ]

    operations = [
        migrations.CreateModel(
            name="SMTPSettings",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "host",
                    models.CharField(
                        default="smtp.gmail.com",
                        help_text="SMTP server hostname, e.g. 'smtp.gmail.com'.",
                        max_length=255,
                    ),
                ),
                (
                    "port",
                    models.PositiveIntegerField(
                        default=587,
                        help_text="SMTP server port, e.g. 587 for STARTTLS.",
                    ),
                ),
                (
                    "username",
                    models.CharField(
                        blank=True,
                        default="",
                        help_text="SMTP login username / email address.",
                        max_length=255,
                    ),
                ),
                (
                    "password",
                    models.CharField(
                        blank=True,
                        default="",
                        help_text="SMTP login password or app-specific password.",
                        max_length=255,
                    ),
                ),
                (
                    "use_tls",
                    models.BooleanField(
                        default=True,
                        help_text="Whether to use STARTTLS when connecting.",
                    ),
                ),
                (
                    "updated_at",
                    models.DateTimeField(auto_now=True),
                ),
            ],
            options={
                "verbose_name": "SMTP Settings",
                "verbose_name_plural": "SMTP Settings",
            },
        ),
    ]
