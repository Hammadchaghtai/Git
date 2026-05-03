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

# Mapping from SystemSettings.ScanFrequency to django-celery-beat Crontab parameters
FREQUENCY_MAP = {
    "daily": {"minute": "0", "hour": "0", "day_of_week": "*", "day_of_month": "*"},
    "weekly": {"minute": "0", "hour": "0", "day_of_week": "1", "day_of_month": "*"},  # Monday Midnight
    "monthly": {"minute": "0", "hour": "0", "day_of_week": "*", "day_of_month": "1"}, # 1st of month Midnight
}

TASK_NAME = "compliance.run_scheduled_wazuh_sync"
SCHEDULE_NAME = "grc-automated-wazuh-scan"

ARCHIVE_TASK_NAME = "compliance.archive_audit_logs"
ARCHIVE_SCHEDULE_NAME = "grc-audit-log-archival"

WEEKLY_REPORT_TASK_NAME = "compliance.send_weekly_report"
WEEKLY_REPORT_SCHEDULE_NAME = "grc-weekly-monday-report"


def sync_celery_beat_schedule():
    """
    Create or update the django-celery-beat PeriodicTask for
    the automated Wazuh scan based on SystemSettings.scan_frequency.
    Also ensures the archival and weekly report tasks are scheduled.
    """
    try:
        from django_celery_beat.models import PeriodicTask, CrontabSchedule
        from compliance.models import SystemSettings
    except Exception:
        return

    try:
        settings = SystemSettings.load()
    except Exception:
        logger.debug("SystemSettings table not ready — skipping schedule sync.")
        return

    freq = FREQUENCY_MAP.get(settings.scan_frequency, FREQUENCY_MAP["weekly"])

    # 1. Main Scan Task (Midnight based on frequency)
    schedule, _ = CrontabSchedule.objects.get_or_create(
        minute=freq["minute"],
        hour=freq["hour"],
        day_of_week=freq["day_of_week"],
        day_of_month=freq["day_of_month"],
        month_of_year="*",
    )

    task, created = PeriodicTask.objects.get_or_create(
        name=SCHEDULE_NAME,
        defaults={
            "task": TASK_NAME,
            "crontab": schedule,
            "enabled": True,
        },
    )

    if not created:
        if task.crontab_id != schedule.id:
            task.crontab = schedule
            task.save(update_fields=["crontab"])
            logger.info(f"Updated Celery Beat schedule: {SCHEDULE_NAME}")

    # 2. Audit Log Archival Task (Daily at 1:00 AM)
    archive_schedule, _ = CrontabSchedule.objects.get_or_create(
        minute="0",
        hour="1",
        day_of_week="*",
        day_of_month="*",
        month_of_year="*",
    )

    PeriodicTask.objects.get_or_create(
        name=ARCHIVE_SCHEDULE_NAME,
        defaults={
            "task": ARCHIVE_TASK_NAME,
            "crontab": archive_schedule,
            "enabled": True,
        },
    )

    # 3. Weekly Monday Report Task (Every Monday at 8:00 AM)
    report_schedule, _ = CrontabSchedule.objects.get_or_create(
        minute="0",
        hour="8",
        day_of_week="1",  # Monday
        day_of_month="*",
        month_of_year="*",
    )

    PeriodicTask.objects.get_or_create(
        name=WEEKLY_REPORT_SCHEDULE_NAME,
        defaults={
            "task": WEEKLY_REPORT_TASK_NAME,
            "crontab": report_schedule,
            "enabled": True,
        },
    )
