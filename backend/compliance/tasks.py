"""
compliance/tasks.py
───────────────────
Celery background tasks for automated Wazuh SIEM scans and
critical compliance alert dispatching via SMTP.
"""

from __future__ import annotations

import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from celery import shared_task
from django.utils import timezone

logger = logging.getLogger("celery.compliance")


@shared_task(bind=True, name="compliance.run_scheduled_wazuh_sync", max_retries=3)
def run_scheduled_wazuh_sync(self):
    """
    Automated Celery task that:
      1. Connects to the Wazuh SCA API and ingests scan results
      2. Maps results to GRC controls via WazuhMapping
      3. Calculates per-agent compliance scores
      4. If critical_email_alerts is enabled AND the score drops
         below the passing_score_threshold, dispatches a
         "CRITICAL: Compliance Threshold Breached" email to
         all super_admin users via dynamic SMTP settings.
    """
    # Import models inside the task to ensure Django is fully loaded
    from compliance.models import (
        ComplianceScan,
        ScanResult,
        WazuhMapping,
        AuditLog,
        SystemSettings,
        SMTPSettings,
        UserProfile,
    )
    from compliance.services.wazuh_client import WazuhAPIClient, WazuhAPIError

    logger.info("═" * 60)
    logger.info("  Scheduled Wazuh SCA → GRC Compliance Sync")
    logger.info("═" * 60)

    # ── 1. Authenticate with Wazuh ─────────────────────
    client = WazuhAPIClient()
    try:
        client.authenticate()
        logger.info("✅ Authenticated with Wazuh API.")
    except WazuhAPIError as exc:
        logger.error(f"❌ Wazuh authentication failed: {exc}")
        raise self.retry(exc=exc, countdown=60)

    # ── 2. Get active agents ───────────────────────────
    try:
        agents = client.get_active_agents()
        logger.info(f"✅ Found {len(agents)} active agent(s).")
    except WazuhAPIError as exc:
        logger.error(f"❌ Could not fetch agents: {exc}")
        raise self.retry(exc=exc, countdown=60)

    if not agents:
        logger.warning("⚠️  No active agents found. Exiting.")
        return "No active agents."

    # ── 3. Pre-load Wazuh→Control mappings ─────────────
    mapping_lookup = {
        m.wazuh_rule_id: m
        for m in WazuhMapping.objects.select_related("control")
    }
    logger.info(f"Loaded {len(mapping_lookup)} Wazuh→Control mappings.")

    total_scans = 0
    total_results = 0
    breach_agents = []   # Track agents that breached the threshold

    # ── 4. Process each agent ──────────────────────────
    for agent in agents:
        agent_id = agent.get("id", "unknown")
        agent_name = agent.get("name", "unknown")

        logger.info(f"── Agent {agent_id} ({agent_name}) ──")

        try:
            checks = client.get_sca_checks(agent_id)
            logger.info(f"  Retrieved {len(checks)} SCA checks.")
        except WazuhAPIError as exc:
            logger.error(f"  ❌ Could not fetch SCA checks: {exc}")
            continue

        if not checks:
            logger.warning("  ⚠️  No SCA checks — skipping agent.")
            continue

        # Create scan record
        scan = ComplianceScan.objects.create(
            agent_id=agent_id,
            scan_date=timezone.now(),
            overall_score=0.0,
        )
        total_scans += 1

        mapped_count = 0
        passed_count = 0
        seen_mappings = {}

        for check in checks:
            check_result = check.get("result", "").lower()

            # Match via compliance array
            compliance_entries = check.get("compliance", [])
            compliance_values = set()
            for entry in compliance_entries:
                raw = str(entry.get("value", ""))
                for v in raw.split(","):
                    compliance_values.add(v.strip())

            # Find matching mapping
            mapping = None
            for val in compliance_values:
                if val in mapping_lookup:
                    mapping = mapping_lookup[val]
                    break

            if not mapping:
                continue

            is_passed = check_result == "passed"

            # Dedup: one result per mapping, prioritize failure
            if mapping.pk in seen_mappings:
                existing = seen_mappings[mapping.pk]
                if existing.is_passed and not is_passed:
                    existing.is_passed = False
                    existing.raw_log_data = check
                    existing.save(update_fields=["is_passed", "raw_log_data"])
                    passed_count -= 1
                continue

            result = ScanResult.objects.create(
                scan=scan,
                mapping=mapping,
                is_passed=is_passed,
                raw_log_data=check,
            )
            seen_mappings[mapping.pk] = result
            mapped_count += 1
            total_results += 1
            if is_passed:
                passed_count += 1

        # Calculate score
        score = round((passed_count / mapped_count) * 100, 1) if mapped_count > 0 else 0.0
        scan.overall_score = score
        scan.save(update_fields=["overall_score"])

        logger.info(f"  📊 Score: {score}% ({passed_count}/{mapped_count} passed)")

        # Track threshold breaches for alerting
        settings = SystemSettings.load()
        if score < settings.passing_score_threshold:
            breach_agents.append({
                "agent_id": agent_id,
                "agent_name": agent_name,
                "score": score,
                "threshold": settings.passing_score_threshold,
            })

    # ── 5. Grand summary + audit log ───────────────────
    logger.info("═" * 60)
    logger.info(f"  Sync complete: {total_scans} agent(s), {total_results} result(s)")
    logger.info("═" * 60)

    AuditLog.objects.create(
        action=f"Celery: automated scan ({total_scans} agent(s), {total_results} result(s))",
        module="Scan",
        status="System",
    )

    # ── 6. Critical email alerting ─────────────────────
    settings = SystemSettings.load()
    if settings.critical_email_alerts and breach_agents:
        logger.warning(
            f"🚨 {len(breach_agents)} agent(s) breached threshold — dispatching alerts."
        )
        _send_critical_alert(breach_agents, settings.passing_score_threshold)

    return f"Sync done: {total_scans} scans, {total_results} results, {len(breach_agents)} breach(es)."


def _send_critical_alert(breach_agents: list[dict], threshold: int) -> None:
    """
    Send a critical compliance alert email to all super_admin users
    using SMTP credentials from the SMTPSettings singleton.
    """
    from compliance.models import SMTPSettings, UserProfile
    from django.contrib.auth.models import User

    smtp = SMTPSettings.load()

    if not smtp.username or not smtp.password:
        logger.error("❌ SMTP not configured — cannot send critical alerts.")
        return

    # Collect super_admin email addresses
    super_admins = User.objects.filter(
        profile__role=UserProfile.Role.SUPER_ADMIN,
        is_active=True,
        email__isnull=False,
    ).exclude(email="")

    recipients = [u.email for u in super_admins]
    if not recipients:
        logger.warning("⚠️  No super_admin emails found — skipping alert.")
        return

    # Build the email body
    agent_rows = "\n".join(
        f"  • Agent {a['agent_id']} ({a['agent_name']}): {a['score']}%  "
        f"(threshold: {a['threshold']}%)"
        for a in breach_agents
    )

    subject = "🚨 CRITICAL: GRC Compliance Threshold Breached"
    body = f"""\
CRITICAL COMPLIANCE ALERT
{'═' * 40}

The following Wazuh agents have compliance scores BELOW the
configured passing threshold of {threshold}%:

{agent_rows}

Action Required:
  1. Review the failing controls in the GRC Dashboard.
  2. Coordinate with your security team for immediate remediation.
  3. Re-run a manual scan after applying fixes to verify compliance.

This is an automated alert from the GRC Compliance Platform.
Timestamp: {timezone.now().strftime('%Y-%m-%d %H:%M:%S UTC')}
"""

    msg = MIMEMultipart()
    msg["From"] = smtp.username
    msg["To"] = ", ".join(recipients)
    msg["Subject"] = subject
    msg.attach(MIMEText(body, "plain"))

    try:
        if smtp.use_tls:
            server = smtplib.SMTP(smtp.host, smtp.port)
            server.starttls()
        else:
            server = smtplib.SMTP(smtp.host, smtp.port)

        server.login(smtp.username, smtp.password)
        server.sendmail(smtp.username, recipients, msg.as_string())
        server.quit()

        logger.info(f"✅ Critical alert sent to {len(recipients)} super_admin(s).")

        # Audit log entry for the alert
        from compliance.models import AuditLog
        AuditLog.objects.create(
            action=f"Critical compliance alert emailed to {len(recipients)} super_admin(s): "
                   f"{', '.join(recipients)}",
            module="Alert",
            status="System",
        )
    except Exception as exc:
        logger.error(f"❌ Failed to send critical alert email: {exc}")
