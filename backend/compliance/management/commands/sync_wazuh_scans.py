"""
sync_wazuh_scans.py
───────────────────
Management command that polls the Wazuh Manager SCA API, ingests
pass/fail check results, maps them to GRC controls via the
WazuhMapping table, and calculates a per-agent compliance score.

Usage:
    python manage.py sync_wazuh_scans
    python manage.py sync_wazuh_scans --agent 001
"""

from __future__ import annotations

from django.core.management.base import BaseCommand
from django.utils import timezone

from compliance.models import ComplianceScan, ScanResult, WazuhMapping, AuditLog, AgentProfile
from compliance.services.wazuh_client import WazuhAPIClient, WazuhAPIError


class Command(BaseCommand):
    help = (
        "Poll the Wazuh SCA API, ingest check results, "
        "map them to GRC controls, and calculate compliance scores."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--agent",
            type=str,
            default=None,
            help="Sync only a specific agent ID (e.g. '001'). "
            "If omitted, all active agents are synced.",
        )

    # ── console helpers ─────────────────────────────

    def _header(self, text: str) -> None:
        self.stdout.write(self.style.HTTP_INFO(f"\n{'═' * 60}"))
        self.stdout.write(self.style.HTTP_INFO(f"  {text}"))
        self.stdout.write(self.style.HTTP_INFO(f"{'═' * 60}\n"))

    def _info(self, text: str) -> None:
        self.stdout.write(f"  {text}")

    def _ok(self, text: str) -> None:
        self.stdout.write(self.style.SUCCESS(f"  ✅ {text}"))

    def _warn(self, text: str) -> None:
        self.stdout.write(self.style.WARNING(f"  ⚠️  {text}"))

    def _fail(self, text: str) -> None:
        self.stdout.write(self.style.ERROR(f"  ❌ {text}"))

    # ── main entry point ────────────────────────────

    def handle(self, *args, **options):
        self._header("Wazuh SCA → GRC Compliance Sync")

        # 1. Build the API client
        client = WazuhAPIClient()

        # 2. Authenticate
        self._info(f"Connecting to Wazuh at {client.base_url} ...")
        try:
            client.authenticate()
            self._ok("Authenticated successfully (JWT token acquired).\n")
        except WazuhAPIError as exc:
            self._fail(f"Authentication failed: {exc}")
            return

        # 3. Resolve agent list
        target_agent = options.get("agent")
        if target_agent:
            agents = [{"id": target_agent, "name": f"agent-{target_agent}"}]
            self._info(f"Single-agent mode: {target_agent}\n")
        else:
            try:
                agents = client.get_active_agents()
                self._ok(f"Found {len(agents)} active agent(s).\n")
            except WazuhAPIError as exc:
                self._fail(f"Could not fetch agents: {exc}")
                return

        if not agents:
            self._warn("No active agents found. Nothing to sync.")
            return

        # Pre-load all mapped rule IDs for fast lookup
        mapping_lookup: dict[str, WazuhMapping] = {
            m.wazuh_rule_id: m for m in WazuhMapping.objects.select_related("control")
        }
        self._info(
            f"Loaded {len(mapping_lookup)} Wazuh→Control mapping(s) from DB.\n"
        )

        total_scans = 0
        total_results = 0

        # 4. Process each agent
        for agent in agents:
            agent_id = agent.get("id", "unknown")
            agent_name = agent.get("name", "unknown")
            agent_ip = agent.get("ip", "—")

            # ── Save/Update AgentProfile ──────────────────
            AgentProfile.objects.update_or_create(
                agent_id=agent_id,
                defaults={"wazuh_name": agent_name},
            )

            self._header(f"Agent {agent_id}  ·  {agent_name}  ·  {agent_ip}")

            # Fetch SCA checks
            try:
                checks = client.get_sca_checks(agent_id)
                self._ok(f"Retrieved {len(checks)} SCA check(s).")
            except WazuhAPIError as exc:
                self._fail(f"Could not fetch SCA checks: {exc}")
                continue

            if not checks:
                self._warn("No SCA checks returned — skipping agent.")
                continue

            # Create a new ComplianceScan record
            scan = ComplianceScan.objects.create(
                agent_id=agent_id,
                scan_date=timezone.now(),
                overall_score=0.0,
            )
            total_scans += 1

            mapped_count = 0
            passed_count = 0
            unmapped_ids: list[str] = []
            # ── Deduplication: track mapping IDs already processed ──
            # Key = mapping.pk, Value = ScanResult instance
            # If a duplicate mapping arrives, prioritize FAIL over PASS.
            seen_mappings: dict[int, ScanResult] = {}

            for check in checks:
                check_id = str(check.get("id", ""))
                check_result = check.get("result", "").lower()

                # ── Match via the 'compliance' array ──
                compliance_entries = check.get("compliance", [])
                compliance_values: set[str] = set()
                for entry in compliance_entries:
                    raw = str(entry.get("value", ""))
                    for v in raw.split(","):
                        compliance_values.add(v.strip())

                # Find the first matching mapping
                mapping = None
                for val in compliance_values:
                    if val in mapping_lookup:
                        mapping = mapping_lookup[val]
                        break

                if not mapping:
                    unmapped_ids.append(check_id)
                    continue

                is_passed = check_result == "passed"

                # ── Dedup: only keep one result per mapping ──
                if mapping.pk in seen_mappings:
                    existing = seen_mappings[mapping.pk]
                    # Prioritize failure: if existing passed and new one failed,
                    # update the existing record to failed
                    if existing.is_passed and not is_passed:
                        existing.is_passed = False
                        existing.raw_log_data = check
                        existing.save(update_fields=["is_passed", "raw_log_data"])
                        passed_count -= 1  # was counted as pass, now it's a fail
                        self._info(
                            f"  [DEDUP ❌]  Rule {mapping.wazuh_rule_id} → "
                            f"downgraded to FAIL"
                        )
                    else:
                        self._info(
                            f"  [DEDUP ──]  Rule {mapping.wazuh_rule_id} → "
                            f"skipped duplicate"
                        )
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

                status = "PASS ✅" if is_passed else "FAIL ❌"
                self._info(
                    f"  [{status}]  Rule {mapping.wazuh_rule_id} → "
                    f"{mapping.control.control_code}  "
                    f"({mapping.rule_description[:50]})"
                )

            # Calculate and save the compliance score
            if mapped_count > 0:
                score = round((passed_count / mapped_count) * 100, 1)
            else:
                score = 0.0

            scan.overall_score = score
            scan.save(update_fields=["overall_score"])

            # Summary for this agent
            self.stdout.write("")
            self._ok(f"Mapped checks:   {mapped_count}")
            self._ok(f"Passed:          {passed_count}/{mapped_count}")

            if unmapped_ids:
                self._warn(
                    f"Unmapped checks: {len(unmapped_ids)}  "
                    f"(IDs not in WazuhMapping table)"
                )

            score_style = (
                self.style.SUCCESS if score >= 70 else self.style.WARNING
            )
            self.stdout.write(
                score_style(f"\n  📊 Overall Compliance Score: {score}%\n")
            )

        # ── Grand summary ───────────────────────────
        self._header("Sync Complete")
        self._ok(f"Agents processed:  {total_scans}")
        self._ok(f"Results ingested:  {total_results}")
        self._ok(f"Mappings in DB:    {len(mapping_lookup)}")
        self.stdout.write("")

        # ── Audit log ───────────────────────────────
        AuditLog.objects.create(
            action=f"generated a scheduled scan ({total_scans} agent(s), {total_results} result(s))",
            module="Scan",
            status="System",
        )

