"""
core/celery.py
──────────────
Celery application factory for the GRC Platform.
Uses Django settings for configuration and auto-discovers tasks in
all installed apps' `tasks.py` modules.
"""

import os
from celery import Celery

# Set the default Django settings module for the 'celery' program.
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")

app = Celery("core")

# Read config from Django settings, using the `CELERY_` namespace.
app.config_from_object("django.conf:settings", namespace="CELERY")

# Auto-discover tasks.py in all registered Django apps.
app.autodiscover_tasks()


@app.task(bind=True, ignore_result=True)
def debug_task(self):
    """Quick health-check task for Celery."""
    print(f"Request: {self.request!r}")
