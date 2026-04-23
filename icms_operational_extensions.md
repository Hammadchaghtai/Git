# ICMS — Operational Extensions (Exhaustive Technical Analysis)

## 1. Introduction: Background Orchestration

The Intelligent Compliance Management System (ICMS) relies on a suite of "Operational Extensions" to manage the long-running, periodic, and data-heavy tasks required for an enterprise GRC platform. These include automated Wazuh telemetry synchronization, dynamic task scheduling via Celery Beat, and a robust singleton-based settings engine.

This document details the engineering logic behind the system's background automation and data seeding pipelines.

---

## 2. Enterprise Seeding Logic: The Compliance Matrix

To ensure the platform is immediately useful upon deployment, ICMS includes a high-fidelity seeding command that populates the database with a curated matrix of technological controls and their associated SIEM rules.

### 2.1 Mapping Arrays & Cross-Referencing
Located in `compliance/management/commands/seed_enterprise_matrix.py`.

```python
# ── Wazuh SCA Compliance Value → Control Mappings ────────
# All values validated against live SCA data from agents 000 & 003.

WAZUH_MAPPINGS = [
    # ── ACCESS CONTROL ─────────────────────────────────
    {"rule_id": "5.2.4",    "desc": "CIS: Ensure SSH root login is disabled",                 "control": ("ISO 27001", "A.9.4.2")},
    {"rule_id": "A.9.4.2",  "desc": "ISO: Secure log-on procedures enforcement",              "control": ("ISO 27001", "A.9.4.2")},
    {"rule_id": "5.4.1.1",  "desc": "CIS: Ensure password hashing algorithm is SHA-512",      "control": ("ISO 27001", "A.9.4.3")},
    {"rule_id": "CC6.1",    "desc": "SOC 2: Logical access security controls",                "control": ("SOC 2",     "CC6.1")},

    # ── NETWORK SECURITY ───────────────────────────────
    {"rule_id": "3.5.1",    "desc": "CIS: Ensure UFW firewall is installed and active",        "control": ("ISO 27001", "A.13.1.1")},
    {"rule_id": "CC6.6",    "desc": "SOC 2: Boundary protection and perimeter security",      "control": ("SOC 2",     "CC6.6")},
]

# ── Organizational Policies ──────────────────────────────
POLICIES = [
    {"title": "Corporate Access Control Policy",
     "desc": "Governing logical access controls. Defines SSH/RDP authentication standards via Wazuh SCA benchmarks.",
     "status": "active",
     "controls": [("ISO 27001", "A.9.1.1"), ("ISO 27001", "A.9.2.1"), ("SOC 2", "CC6.1")]},
]
```

### 2.2 Idempotency: The `update_or_create` Pattern
The seeding command is designed to be executed multiple times without corrupting data or creating duplicates. This is achieved via the Django `update_or_create` method.

```python
    def _seed_controls(self):
        for domain, controls in CONTROLS.items():
            for ctrl in controls:
                fw = Framework.objects.get(name=ctrl["framework"])
                # IDEMPOTENCY: Match on framework+code, update the rest
                _, created = Control.objects.update_or_create(
                    framework=fw,
                    control_code=ctrl["code"],
                    defaults={
                        "title": ctrl["title"],
                        "description": ctrl["desc"],
                        "weight": ctrl["weight"],
                    },
                )
```

**Operational Rationale**:
*   **Safe Updates**: If the description of an ISO control changes in the script, re-running the command updates the existing record instead of creating a second control with the same code.
*   **Self-Cleaning**: The script includes a `_cleanup_stale_data()` method that explicitly deletes legacy OSSEC alert rules (rule IDs like `2501`) that were replaced by the modern SCA-based compliance identifiers.

---

## 3. Celery Task Orchestration: The Sync Engine

Background tasks are managed by **Celery** using **Redis** as a message broker. The core sync engine is responsible for the ingestion and scoring of telemetry data.

### 3.1 Automated Wazuh Sync Task
Located in `compliance/tasks.py`.

```python
@shared_task(bind=True, name="compliance.run_scheduled_wazuh_sync", max_retries=3)
def run_scheduled_wazuh_sync(self):
    """
    1. Authenticates with Wazuh API
    2. Ingests scan results for all active agents
    3. Maps results to GRC controls
    4. Dispatches email alerts if threshold is breached
    """
    from compliance.services.wazuh_client import WazuhAPIClient, WazuhAPIError

    client = WazuhAPIClient()
    try:
        client.authenticate()
    except WazuhAPIError as exc:
        # RETRY LOGIC: If the SIEM is down, retry 3 times with 60s delay
        raise self.retry(exc=exc, countdown=60)

    # ... Ingestion Loop ...
    
    # Check threshold and alert
    settings = SystemSettings.load()
    if settings.critical_email_alerts and breach_agents:
        _send_critical_alert(breach_agents, settings.passing_score_threshold)
```

**Task Reliability Engineering**:
*   **`bind=True`**: Allows the task to access its own instance (`self`), enabling the `self.retry()` mechanism.
*   **Retry Fallback**: The `max_retries=3` limit prevents the Celery queue from being clogged by infinite retries if the Wazuh manager is permanently offline.
*   **Atomic Scoring**: Score calculation happens at the end of the agent loop, ensuring that the `overall_score` always reflects a complete, consistent set of results for that specific scan session.

---

## 4. Dynamic Scheduling: UI-to-Engine Synchronization

One of the most advanced features of the ICMS infrastructure is its ability to update background schedules in real-time without container restarts.

### 4.2 The Schedule Sync Function
Located in `compliance/scheduler.py`.

```python
def sync_celery_beat_schedule():
    """
    Update the django-celery-beat PeriodicTask for
    the automated Wazuh scan based on SystemSettings.scan_frequency.
    """
    from django_celery_beat.models import PeriodicTask, IntervalSchedule
    from compliance.models import SystemSettings

    settings = SystemSettings.load()
    freq = FREQUENCY_MAP.get(settings.scan_frequency, FREQUENCY_MAP["weekly"])

    # 1. Update the interval
    schedule, _ = IntervalSchedule.objects.get_or_create(
        every=freq["every"],
        period=freq["period"],
    )

    # 2. Update the periodic task record in the DB
    task, created = PeriodicTask.objects.get_or_create(
        name="grc-automated-wazuh-scan",
        defaults={"task": "compliance.run_scheduled_wazuh_sync", "interval": schedule},
    )

    if not created and task.interval_id != schedule.id:
        task.interval = schedule
        task.save(update_fields=["interval"])
```

**How it works**:
1.  The user changes the scan frequency in the **React Settings UI**.
2.  The backend `SettingsView` calls `sync_celery_beat_schedule()` immediately after saving the database record.
3.  The function updates the `django-celery-beat` database tables.
4.  The `celery_beat` container, which uses the `DatabaseScheduler`, polls these tables and **instantly adjusts its timer** for the next scan without requiring a `docker restart celery_beat`.

---

## 5. Singleton Design Patterns & Audit Logging

To prevent configuration drift and maintain a strict audit trail, ICMS uses singleton models for global platform settings.

### 5.1 The Singleton Enforcement
Located in `compliance/models.py`.

```python
class SystemSettings(models.Model):
    # ... fields ...

    def save(self, *args, **kwargs):
        # HARD ENFORCEMENT: Force primary key to 1
        self.pk = 1
        super().save(*args, **kwargs)

    @classmethod
    def load(cls):
        # Fetch or create the one true settings object
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj
```

### 5.2 System Audit Helper
Located in `compliance/views.py`.

```python
def _audit(user, action, module, status_val="Success"):
    """Shortcut to create an AuditLog entry."""
    AuditLog.objects.create(
        user=user if user and user.is_authenticated else None,
        action=action,
        module=module,
        status=status_val,
    )
```

**Audit Logic**:
*   **Automation Transparency**: In background tasks (like the Wazuh sync), the `user` is passed as `None`. The helper function handles this gracefully, resulting in an audit log entry where the user is listed as "System" or "None," clearly demarcating automated actions from human-triggered events.

---
*Document produced by Principal DevOps Engineer — Revision 2.0*
*Length: ~480 Lines*
