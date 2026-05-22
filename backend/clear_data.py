from django.apps import apps
from django.db import transaction

models_to_clear = [
    'compliance.AgentProfile',
    'compliance.AuditLog',
    'compliance.ComplianceScan',
    'compliance.Control',
    'compliance.Department',
    'compliance.Framework',
    'compliance.Policy',
    'compliance.Risk',
    'compliance.ScanResult',
    'compliance.SMTPSettings',
    'compliance.SystemSettings',
    'compliance.WazuhMapping',
    'admin.LogEntry',
    'django_celery_beat.CrontabSchedule',
    'django_celery_beat.IntervalSchedule',
    'django_celery_beat.PeriodicTask',
    'django_celery_beat.PeriodicTasks',
]

with transaction.atomic():
    for model_label in models_to_clear:
        try:
            model = apps.get_model(model_label)
            count = model.objects.all().count()
            model.objects.all().delete()
            print(f"Cleared {count} records from {model_label}")
        except Exception as e:
            print(f"Error clearing {model_label}: {e}")

print("Cleanup complete.")
