"""
compliance/scheduler.py
───────────────────────
Syncs the Celery Beat periodic task schedule with the
scan_frequency setting from the SystemSettings singleton.

Called on Django app ready() and whenever SystemSettings
is updated via the Settings API.
"""

from __future__ import annotations

import logging

logger = logging.getLogger("celery.compliance")

# Mapping from SystemSettings.ScanFrequency to django-celery-beat IntervalSchedule
FREQUENCY_MAP = {
    "daily": {"every": 1, "period": "days"},
    "weekly": {"every": 7, "period": "days"},
    "monthly": {"every": 30, "period": "days"},
}

TASK_NAME = "compliance.run_scheduled_wazuh_sync"
SCHEDULE_NAME = "grc-automated-wazuh-scan"


def sync_celery_beat_schedule():
    """
    Create or update the django-celery-beat PeriodicTask for
    the automated Wazuh scan based on SystemSettings.scan_frequency.
    """
    try:
        from django_celery_beat.models import PeriodicTask, IntervalSchedule
        from compliance.models import SystemSettings
    except Exception:
        return

    try:
        settings = SystemSettings.load()
    except Exception:
        logger.debug("SystemSettings table not ready — skipping schedule sync.")
        return

    freq = FREQUENCY_MAP.get(settings.scan_frequency, FREQUENCY_MAP["weekly"])

    # Get or create the interval
    schedule, _ = IntervalSchedule.objects.get_or_create(
        every=freq["every"],
        period=freq["period"],
    )

    # Get or create the periodic task
    task, created = PeriodicTask.objects.get_or_create(
        name=SCHEDULE_NAME,
        defaults={
            "task": TASK_NAME,
            "interval": schedule,
            "enabled": True,
        },
    )

    if not created:
        # Update if the frequency changed
        if task.interval_id != schedule.id:
            task.interval = schedule
            task.save(update_fields=["interval"])
            logger.info(
                f"Updated Celery Beat schedule: {SCHEDULE_NAME} → "
                f"every {freq['every']} {freq['period']}"
            )
    else:
        logger.info(
            f"Created Celery Beat schedule: {SCHEDULE_NAME} → "
            f"every {freq['every']} {freq['period']}"
        )
