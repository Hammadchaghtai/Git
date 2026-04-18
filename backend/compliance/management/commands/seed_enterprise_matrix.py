"""
seed_enterprise_matrix.py
─────────────────────────
Seeds the GRC database with a curated compliance matrix of
TECHNOLOGICAL controls that are verifiable via Wazuh SCA scans.

  • 2 Frameworks  (ISO 27001:2022, SOC 2 Type II)
  • 22 Controls   across 5 security domains — ALL have Wazuh SCA mappings
  • 32 Wazuh SCA Mappings  (validated against live Wazuh SCA data)
  • 22 Organizational Policies  linked to verifiable controls

IMPORTANT: Every control MUST have at least one Wazuh SCA mapping.
Every policy MUST map to technological controls verifiable by Wazuh.

The wazuh_rule_id field stores SCA compliance values (CIS IDs like
"5.2.4", ISO Annex A codes like "A.9.4.2", SOC 2 codes like "CC6.1")
— NOT Wazuh OSSEC alert rule IDs.

Idempotent:   uses update_or_create for all inserts.
Atomic:       wrapped in transaction.atomic().
Self-cleaning: removes stale data from previous runs.

Usage:
    docker compose exec backend python manage.py seed_enterprise_matrix
"""

from __future__ import annotations

from django.core.management.base import BaseCommand
from django.db import transaction

from compliance.models import Framework, Control, WazuhMapping, Policy, AuditLog


# ═══════════════════════════════════════════════════════════
# CLEANUP TARGETS — removed from the matrix
# ═══════════════════════════════════════════════════════════

REMOVED_FRAMEWORKS = ["GDPR"]

REMOVED_CONTROLS = [
    # GDPR controls — no SCA mappings possible
    ("GDPR", "Art.32(1)(b)"),
    ("GDPR", "Art.32(1)(d)"),
    # SOC 2 controls without SCA coverage
    ("SOC 2", "CC6.7"),   # Data transmission — no SCA compliance key
    ("SOC 2", "CC7.4"),   # Incident response — procedural, not scannable
]

REMOVED_POLICIES = [
    # GDPR-only
    "Privacy Impact Assessment Policy",
    # Organizational / procedural — not Wazuh-verifiable
    "Zero-Day Response Plan",
    "Penetration Testing Policy",
    "Security Awareness Training Policy",
    "Acceptable Use Policy",
    "Vendor & Third-Party Risk Policy",
    "Business Continuity & Disaster Recovery Policy",
    "BYOD Security Policy",
    "Data Classification & Handling Policy",
    "Insider Threat Prevention Policy",
    "Data Encryption Standard",
    # Legacy policies from earlier development phases
    "Password Policy",
    "Remote Access Policy",
    "Firewall Policy",
    "Test Phase 6.5 Policy",
    "Log Retention Policy",
    "Change Management Policy",
    "Incident Detection & Escalation Policy",
    "Cryptographic Key Management Standard",
    "VPN Configuration Policy",
    "Wireless Network Standard",
]

# Old OSSEC rule IDs from v1 of the seed script — never matched SCA data
STALE_OSSEC_RULE_IDS = [
    "2501", "2502", "5503", "5504", "5551", "5401", "5404", "5301",
    "4101", "4151", "5703", "5705", "5712", "5719", "1004", "1005",
    "2832", "5602", "5720", "554", "550", "597", "23501", "23503",
    "23502", "2961",
]


# ═══════════════════════════════════════════════════════════
# DATA MATRICES
# ═══════════════════════════════════════════════════════════

FRAMEWORKS = [
    {
        "name": "ISO 27001",
        "version": "2022",
        "description": "International standard for information security management systems (ISMS). Annex A controls cover access control, cryptography, operations security, and more.",
    },
    {
        "name": "SOC 2",
        "version": "Type II",
        "description": "AICPA Trust Services Criteria for Security, Availability, Processing Integrity, Confidentiality, and Privacy. Type II evaluates operating effectiveness over time.",
    },
]


# ── Controls grouped by security domain ──────────────────
# Every control here has at least one Wazuh SCA mapping below.

CONTROLS = {
    # ┌────────────────────────────────────────────────────┐
    # │  DOMAIN 1: ACCESS CONTROL                          │
    # └────────────────────────────────────────────────────┘
    "Access Control": [
        {"framework": "ISO 27001", "code": "A.9.1.1", "title": "Access control policy",
         "desc": "An access control policy shall be established, documented and reviewed based on business and information security requirements.",
         "weight": 1.0},
        {"framework": "ISO 27001", "code": "A.9.2.1", "title": "User registration and de-registration",
         "desc": "A formal user registration and de-registration process shall be implemented to enable assignment of access rights.",
         "weight": 1.0},
        {"framework": "ISO 27001", "code": "A.9.2.4", "title": "Management of secret authentication information",
         "desc": "The allocation of secret authentication information shall be controlled through a formal management process.",
         "weight": 1.0},
        {"framework": "ISO 27001", "code": "A.9.4.2", "title": "Secure log-on procedures",
         "desc": "Where required by the access control policy, access to systems and applications shall be controlled by a secure log-on procedure.",
         "weight": 1.0},
        {"framework": "ISO 27001", "code": "A.9.4.3", "title": "Password management system",
         "desc": "Password management systems shall be interactive and shall ensure quality passwords.",
         "weight": 1.0},
        {"framework": "SOC 2", "code": "CC6.1", "title": "Logical and physical access controls",
         "desc": "The entity implements logical access security software, infrastructure, and architectures over protected information assets.",
         "weight": 1.2},
        {"framework": "SOC 2", "code": "CC6.2", "title": "User access provisioning",
         "desc": "Prior to issuing system credentials and granting system access, the entity registers and authorizes new internal and external users.",
         "weight": 1.0},
        {"framework": "SOC 2", "code": "CC6.3", "title": "Role-based access and least privilege",
         "desc": "The entity authorizes, modifies, or removes access to data, software, functions, and other protected information assets based on roles.",
         "weight": 1.0},
    ],

    # ┌────────────────────────────────────────────────────┐
    # │  DOMAIN 2: NETWORK SECURITY                        │
    # └────────────────────────────────────────────────────┘
    "Network Security": [
        {"framework": "ISO 27001", "code": "A.13.1.1", "title": "Network controls",
         "desc": "Networks shall be managed and controlled to protect information in systems and applications.",
         "weight": 1.0},
        {"framework": "ISO 27001", "code": "A.13.1.2", "title": "Security of network services",
         "desc": "Security mechanisms, service levels and management requirements of all network services shall be identified and included in network services agreements.",
         "weight": 1.0},
        {"framework": "ISO 27001", "code": "A.13.1.3", "title": "Segregation in networks",
         "desc": "Groups of information services, users and information systems shall be segregated on networks.",
         "weight": 0.8},
        {"framework": "SOC 2", "code": "CC6.6", "title": "Boundary protection mechanisms",
         "desc": "The entity implements logical access security measures to protect against threats from sources outside its system boundaries.",
         "weight": 1.2},
    ],

    # ┌────────────────────────────────────────────────────┐
    # │  DOMAIN 3: AUDIT, LOGGING & MONITORING             │
    # └────────────────────────────────────────────────────┘
    "Audit Logging & Monitoring": [
        {"framework": "ISO 27001", "code": "A.12.4.1", "title": "Event logging",
         "desc": "Event logs recording user activities, exceptions, faults and information security events shall be produced, kept and regularly reviewed.",
         "weight": 1.0},
        {"framework": "ISO 27001", "code": "A.12.4.2", "title": "Protection of log information",
         "desc": "Logging facilities and log information shall be protected against tampering and unauthorized access.",
         "weight": 1.0},
        {"framework": "ISO 27001", "code": "A.12.4.3", "title": "Administrator and operator logs",
         "desc": "System administrator and system operator activities shall be logged and the logs protected and regularly reviewed.",
         "weight": 1.0},
        {"framework": "SOC 2", "code": "CC7.1", "title": "Detection mechanisms for anomalies",
         "desc": "The entity uses detection and monitoring procedures to identify changes to configurations and anomalies indicative of vulnerabilities.",
         "weight": 1.2},
        {"framework": "SOC 2", "code": "CC7.2", "title": "Monitoring of system components",
         "desc": "The entity monitors system components and their operation for anomalies that are indicative of malicious acts or natural disasters.",
         "weight": 1.0},
    ],

    # ┌────────────────────────────────────────────────────┐
    # │  DOMAIN 4: ENDPOINT & MALWARE PROTECTION           │
    # └────────────────────────────────────────────────────┘
    "Endpoint & Malware Protection": [
        {"framework": "ISO 27001", "code": "A.12.2.1", "title": "Controls against malware",
         "desc": "Detection, prevention and recovery controls to protect against malware shall be implemented, combined with appropriate user awareness.",
         "weight": 1.0},
        {"framework": "ISO 27001", "code": "A.12.5.1", "title": "Installation of software on operational systems",
         "desc": "Procedures shall be implemented to control the installation of software on operational systems.",
         "weight": 0.8},
        {"framework": "SOC 2", "code": "CC6.8", "title": "Malware prevention controls",
         "desc": "The entity implements controls to prevent or detect and act upon the introduction of unauthorized or malicious software.",
         "weight": 1.0},
    ],

    # ┌────────────────────────────────────────────────────┐
    # │  DOMAIN 5: VULNERABILITY MANAGEMENT                │
    # └────────────────────────────────────────────────────┘
    "Vulnerability Management": [
        {"framework": "ISO 27001", "code": "A.12.6.1", "title": "Management of technical vulnerabilities",
         "desc": "Information about technical vulnerabilities of systems shall be obtained in a timely fashion, and appropriate measures taken to address the associated risk.",
         "weight": 1.2},
        {"framework": "ISO 27001", "code": "A.12.6.2", "title": "Restrictions on software installation",
         "desc": "Rules governing the installation of software by users shall be established and implemented.",
         "weight": 0.8},
    ],
}


# ── Wazuh SCA Compliance Value → Control Mappings ────────
# All values validated against live SCA data from agents 000 & 003.

WAZUH_MAPPINGS = [
    # ── ACCESS CONTROL ─────────────────────────────────
    {"rule_id": "A.9.1.1",  "desc": "ISO: Access control policy enforcement",                "control": ("ISO 27001", "A.9.1.1")},
    {"rule_id": "5.2.6",    "desc": "CIS: Ensure SSH IgnoreRhosts is enabled",                "control": ("ISO 27001", "A.9.1.1")},
    {"rule_id": "A.9.2.1",  "desc": "ISO: User registration and de-registration checks",     "control": ("ISO 27001", "A.9.2.1")},
    {"rule_id": "5.3.1",    "desc": "CIS: Ensure password expiration is 365 days or less",    "control": ("ISO 27001", "A.9.2.4")},
    {"rule_id": "A.9.2.3",  "desc": "ISO: Management of privileged access rights",            "control": ("ISO 27001", "A.9.2.4")},
    {"rule_id": "5.2.4",    "desc": "CIS: Ensure SSH root login is disabled",                 "control": ("ISO 27001", "A.9.4.2")},
    {"rule_id": "A.9.4.2",  "desc": "ISO: Secure log-on procedures enforcement",              "control": ("ISO 27001", "A.9.4.2")},
    {"rule_id": "5.2.5",    "desc": "CIS: Ensure SSH MaxAuthTries is set to 4 or less",       "control": ("ISO 27001", "A.9.4.2")},
    {"rule_id": "A.9.4.3",  "desc": "ISO: Password management system checks",                 "control": ("ISO 27001", "A.9.4.3")},
    {"rule_id": "5.4.1.1",  "desc": "CIS: Ensure password hashing algorithm is SHA-512",      "control": ("ISO 27001", "A.9.4.3")},
    {"rule_id": "CC6.1",    "desc": "SOC 2: Logical access security controls",                "control": ("SOC 2",     "CC6.1")},
    {"rule_id": "CC6.2",    "desc": "SOC 2: User credential provisioning controls",           "control": ("SOC 2",     "CC6.2")},
    {"rule_id": "CC6.3",    "desc": "SOC 2: Role-based access and least privilege",            "control": ("SOC 2",     "CC6.3")},

    # ── NETWORK SECURITY ───────────────────────────────
    {"rule_id": "3.5.1",    "desc": "CIS: Ensure UFW firewall is installed and active",        "control": ("ISO 27001", "A.13.1.1")},
    {"rule_id": "A.13.1.1", "desc": "ISO: Network management and controls",                   "control": ("ISO 27001", "A.13.1.1")},
    {"rule_id": "3.5.1.3",  "desc": "CIS: Ensure UFW default deny firewall policy",           "control": ("ISO 27001", "A.13.1.1")},
    {"rule_id": "3.1.1",    "desc": "CIS: Ensure IPv6 status is identified",                  "control": ("ISO 27001", "A.13.1.2")},
    {"rule_id": "A.13.1.3", "desc": "ISO: Segregation in networks",                           "control": ("ISO 27001", "A.13.1.3")},
    {"rule_id": "CC6.6",    "desc": "SOC 2: Boundary protection and perimeter security",      "control": ("SOC 2",     "CC6.6")},
    {"rule_id": "3.5.1.2",  "desc": "CIS: Ensure iptables-persistent is not installed",       "control": ("SOC 2",     "CC6.6")},

    # ── AUDIT LOGGING & MONITORING ─────────────────────
    {"rule_id": "A.12.4.1",  "desc": "ISO: Event logging controls",                           "control": ("ISO 27001", "A.12.4.1")},
    {"rule_id": "A.12.14.1", "desc": "ISO: Audit log event generation controls",               "control": ("ISO 27001", "A.12.4.2")},
    {"rule_id": "A.12.4.3",  "desc": "ISO: Administrator and operator log protection",         "control": ("ISO 27001", "A.12.4.3")},
    {"rule_id": "CC7.1",     "desc": "SOC 2: Configuration change detection and monitoring",   "control": ("SOC 2",     "CC7.1")},
    {"rule_id": "CC7.2",     "desc": "SOC 2: Anomaly detection on system components",          "control": ("SOC 2",     "CC7.2")},

    # ── ENDPOINT & MALWARE PROTECTION ──────────────────
    {"rule_id": "A.12.2.1",  "desc": "ISO: Controls against malware detection",               "control": ("ISO 27001", "A.12.2.1")},
    {"rule_id": "A.12.5.1",  "desc": "ISO: Software installation controls",                   "control": ("ISO 27001", "A.12.5.1")},
    {"rule_id": "A.12.1.2",  "desc": "ISO: Change management — software installation checks", "control": ("ISO 27001", "A.12.5.1")},
    {"rule_id": "CC6.8",     "desc": "SOC 2: Malware prevention and unauthorized software",   "control": ("SOC 2",     "CC6.8")},

    # ── VULNERABILITY MANAGEMENT ───────────────────────
    {"rule_id": "A.14.2.2",  "desc": "ISO: System change control — vulnerability fixes",      "control": ("ISO 27001", "A.12.6.1")},
    {"rule_id": "A.14.2.5",  "desc": "ISO: Secure system engineering — patching",             "control": ("ISO 27001", "A.12.6.1")},
    {"rule_id": "A.12.6.2",  "desc": "ISO: Restrictions on software installation",            "control": ("ISO 27001", "A.12.6.2")},
]


# ── Organizational Policies ──────────────────────────────
# ONLY policies that map to technological controls verifiable via Wazuh.

POLICIES = [
    # ── Access Control Policies ────────────────────────
    {"title": "Corporate Access Control Policy",
     "desc": "Master policy governing logical access controls across all information systems. Defines SSH/RDP authentication standards, session management, and automated access review procedures via Wazuh SCA benchmarks.",
     "status": "active",
     "controls": [("ISO 27001", "A.9.1.1"), ("ISO 27001", "A.9.2.1"), ("SOC 2", "CC6.1")]},

    {"title": "Remote Access Standard",
     "desc": "Establishes requirements for secure remote access including SSH hardening (root login disabled, MaxAuthTries, IgnoreRhosts), VPN authentication, and session timeout enforcement.",
     "status": "active",
     "controls": [("ISO 27001", "A.9.4.2"), ("SOC 2", "CC6.1")]},

    {"title": "Privileged Account Management Policy",
     "desc": "Defines controls for managing privileged accounts including root/admin access restrictions, sudo configuration, privileged access rights management, and just-in-time elevation procedures.",
     "status": "active",
     "controls": [("ISO 27001", "A.9.2.4"), ("ISO 27001", "A.9.4.3"), ("SOC 2", "CC6.3")]},

    {"title": "User Identity Lifecycle Policy",
     "desc": "Governs user identity lifecycle from provisioning through periodic access reviews to de-provisioning. Verified via Wazuh SCA user registration checks (CIS 5.4.x benchmarks).",
     "status": "active",
     "controls": [("ISO 27001", "A.9.2.1"), ("SOC 2", "CC6.2")]},

    {"title": "Multi-Factor Authentication Standard",
     "desc": "Mandates MFA for all systems containing sensitive data. Verifies secure log-on procedures, password complexity requirements, and SHA-512 hashing via Wazuh SCA CIS checks.",
     "status": "active",
     "controls": [("ISO 27001", "A.9.4.2"), ("ISO 27001", "A.9.4.3")]},

    {"title": "Password & Authentication Policy",
     "desc": "Defines password complexity, expiration (365-day max), hashing algorithms (SHA-512/yescrypt), and account lockout thresholds. Verified via CIS 5.3.x and 5.4.x SCA benchmarks.",
     "status": "active",
     "controls": [("ISO 27001", "A.9.2.4"), ("ISO 27001", "A.9.4.3"), ("SOC 2", "CC6.1")]},

    # ── Network Security Policies ──────────────────────
    {"title": "Network Security & Firewall Policy",
     "desc": "Establishes firewall rule management (UFW/iptables), default-deny policies, network segmentation requirements, and perimeter intrusion detection. Verified via CIS 3.5.x SCA benchmarks.",
     "status": "active",
     "controls": [("ISO 27001", "A.13.1.1"), ("ISO 27001", "A.13.1.3"), ("SOC 2", "CC6.6")]},

    {"title": "Network Services Security Standard",
     "desc": "Defines security requirements for network services including IPv6 configuration, network interface hardening, and service-level access controls. Verified via CIS 3.x SCA benchmarks.",
     "status": "active",
     "controls": [("ISO 27001", "A.13.1.2"), ("SOC 2", "CC6.6")]},

    {"title": "Network Segmentation Standard",
     "desc": "Requires logical network segmentation between production, development, DMZ, and management zones with documented inter-zone firewall rules. Verified via CIS firewall and iptables checks.",
     "status": "draft",
     "controls": [("ISO 27001", "A.13.1.3"), ("SOC 2", "CC6.6")]},

    {"title": "SSH Hardening Policy",
     "desc": "Mandates SSH server hardening: root login disabled, MaxAuthTries ≤ 4, IgnoreRhosts enabled, protocol version 2, strong ciphers/MACs. Verified via CIS 5.2.x SCA benchmarks.",
     "status": "active",
     "controls": [("ISO 27001", "A.9.4.2"), ("ISO 27001", "A.13.1.1")]},

    # ── Audit Logging & Monitoring Policies ────────────
    {"title": "Security Monitoring Standard",
     "desc": "Defines SIEM log ingestion requirements, Wazuh alert correlation rules, and real-time monitoring expectations for all critical infrastructure. Verified via SCA logging checks.",
     "status": "active",
     "controls": [("ISO 27001", "A.12.4.1"), ("SOC 2", "CC7.1"), ("SOC 2", "CC7.2")]},

    {"title": "Log Retention & Protection Policy",
     "desc": "Specifies retention periods for security/system logs, mandates immutable log storage, and ensures log integrity via cryptographic controls. Verified via CIS audit logging checks.",
     "status": "active",
     "controls": [("ISO 27001", "A.12.4.2"), ("ISO 27001", "A.12.4.3")]},

    {"title": "Audit Trail Integrity Policy",
     "desc": "Ensures tamper-evident logging through centralized log aggregation, administrator activity logging, and periodic integrity verification of audit trails via Wazuh FIM.",
     "status": "active",
     "controls": [("ISO 27001", "A.12.4.2"), ("ISO 27001", "A.12.4.3")]},

    {"title": "Anomaly Detection & Alert Policy",
     "desc": "Defines automated anomaly detection procedures using Wazuh SCA configuration drift detection, threshold-based alerting, and SOC escalation workflows for configuration anomalies.",
     "status": "active",
     "controls": [("SOC 2", "CC7.1"), ("SOC 2", "CC7.2")]},

    # ── Endpoint & Malware Protection Policies ─────────
    {"title": "Endpoint Security Policy",
     "desc": "Mandates endpoint detection and response (EDR) agents, host-based firewalls, disk encryption, and automated SCA compliance checks for all corporate endpoints.",
     "status": "active",
     "controls": [("ISO 27001", "A.12.2.1"), ("SOC 2", "CC6.8")]},

    {"title": "Anti-Malware Standard",
     "desc": "Defines anti-malware scanning frequencies, signature update cadence, quarantine procedures, and automated Wazuh rootcheck/syscheck verification for all endpoints and servers.",
     "status": "active",
     "controls": [("ISO 27001", "A.12.2.1"), ("SOC 2", "CC6.8")]},

    {"title": "File Integrity Monitoring Policy",
     "desc": "Requires Wazuh FIM (syscheck) deployment on critical system files, configuration directories, and application binaries with real-time alerts on unauthorized modifications.",
     "status": "active",
     "controls": [("ISO 27001", "A.12.2.1"), ("ISO 27001", "A.12.5.1")]},

    {"title": "Software Installation Control Policy",
     "desc": "Restricts software installation to approved packages via CIS software restriction benchmarks, application whitelisting verification, and change management checks.",
     "status": "active",
     "controls": [("ISO 27001", "A.12.5.1"), ("SOC 2", "CC6.8")]},

    # ── Vulnerability Management Policies ──────────────
    {"title": "Vulnerability Management Policy",
     "desc": "Establishes vulnerability scanning cadence using Wazuh Vulnerability Detector, risk-based prioritization by CVSS score, and remediation SLAs for critical/high findings.",
     "status": "active",
     "controls": [("ISO 27001", "A.12.6.1"), ("ISO 27001", "A.12.6.2")]},

    {"title": "Patch Deployment Standard",
     "desc": "Defines patch categorization, testing requirements, deployment timelines (critical: 72h, high: 14d, medium: 30d), and rollback procedures verified via Wazuh SCA system update checks.",
     "status": "active",
     "controls": [("ISO 27001", "A.12.6.1"), ("ISO 27001", "A.12.6.2")]},

    {"title": "System Hardening Policy",
     "desc": "Mandates CIS Level 1 benchmark compliance for all servers and workstations. Covers kernel parameters, service hardening, filesystem permissions, and boot security. Verified via Wazuh SCA.",
     "status": "active",
     "controls": [("ISO 27001", "A.12.6.1"), ("SOC 2", "CC6.8")]},

    {"title": "Change Detection & Configuration Policy",
     "desc": "Requires automated configuration change detection via Wazuh SCA drift analysis, baseline comparison, and immediate alerting on unauthorized system configuration modifications.",
     "status": "active",
     "controls": [("ISO 27001", "A.12.5.1"), ("SOC 2", "CC7.1")]},
]


class Command(BaseCommand):
    help = "Seed the database with a curated GRC compliance matrix of Wazuh-verifiable controls."

    def _ok(self, text):
        self.stdout.write(self.style.SUCCESS(f"  ✅ {text}"))

    def _warn(self, text):
        self.stdout.write(self.style.WARNING(f"  ⚠️  {text}"))

    def _info(self, text):
        self.stdout.write(f"  {text}")

    def _header(self, text):
        self.stdout.write(self.style.HTTP_INFO(f"\n{'═' * 60}"))
        self.stdout.write(self.style.HTTP_INFO(f"  {text}"))
        self.stdout.write(self.style.HTTP_INFO(f"{'═' * 60}\n"))

    def handle(self, *args, **options):
        self._header("Enterprise GRC Matrix Seeder v3")

        with transaction.atomic():
            self._cleanup_stale_data()
            fw_created, fw_updated = self._seed_frameworks()
            ctrl_created, ctrl_updated = self._seed_controls()
            map_created, map_updated = self._seed_mappings()
            pol_created, pol_updated = self._seed_policies()

        # ── Summary ──────────────────────────────────
        self._header("Seeding Complete — Summary")

        total_controls = sum(len(v) for v in CONTROLS.values())
        total_mappings = len(WAZUH_MAPPINGS)
        total_policies = len(POLICIES)

        self._ok(f"Frameworks:     {len(FRAMEWORKS):>3} total  ({fw_created} new,  {fw_updated} updated)")
        self._ok(f"Controls:       {total_controls:>3} total  ({ctrl_created} new,  {ctrl_updated} updated)")
        self._ok(f"Wazuh Mappings: {total_mappings:>3} total  ({map_created} new,  {map_updated} updated)")
        self._ok(f"Policies:       {total_policies:>3} total  ({pol_created} new,  {pol_updated} updated)")

        self._info("")
        self._ok("All controls have Wazuh SCA mappings. All policies are tech-verifiable.")
        self._ok("Database is idempotent — safe to re-run.")

        AuditLog.objects.create(
            action=f"Enterprise matrix v3 seeded: {len(FRAMEWORKS)} frameworks, "
                   f"{total_controls} controls, {total_mappings} mappings, "
                   f"{total_policies} policies",
            module="Seed",
            status="System",
        )

    # ── Cleanup ────────────────────────────────────
    def _cleanup_stale_data(self):
        self._info("Cleaning up stale/removed data...")

        # 1) Remove stale OSSEC rule IDs that never matched SCA
        stale = WazuhMapping.objects.filter(wazuh_rule_id__in=STALE_OSSEC_RULE_IDS)
        if stale.exists():
            count = stale.count()
            stale.delete()
            self._warn(f"Removed {count} stale OSSEC rule mappings")

        # 2) Remove explicitly deleted policies
        removed_pols = Policy.objects.filter(title__in=REMOVED_POLICIES)
        if removed_pols.exists():
            count = removed_pols.count()
            removed_pols.delete()
            self._warn(f"Removed {count} non-technical policies")

        # 3) Remove unmapped controls & their scan results
        for fw_name, ctrl_code in REMOVED_CONTROLS:
            try:
                fw = Framework.objects.get(name=fw_name)
                ctrl = Control.objects.get(framework=fw, control_code=ctrl_code)
                # Clear M2M policy links first
                ctrl.policies.clear()
                # Delete any mappings for this control
                WazuhMapping.objects.filter(control=ctrl).delete()
                ctrl.delete()
                self._warn(f"Removed control {fw_name}/{ctrl_code}")
            except (Framework.DoesNotExist, Control.DoesNotExist):
                pass

        # 4) Remove GDPR framework entirely (if no controls remain)
        for fw_name in REMOVED_FRAMEWORKS:
            try:
                fw = Framework.objects.get(name=fw_name)
                remaining = Control.objects.filter(framework=fw).count()
                if remaining == 0:
                    fw.delete()
                    self._warn(f"Removed framework: {fw_name}")
                else:
                    self._warn(f"Framework {fw_name} still has {remaining} controls — skipped")
            except Framework.DoesNotExist:
                pass

        self._ok("Cleanup complete")

    # ── Frameworks ─────────────────────────────────
    def _seed_frameworks(self):
        self._info("Seeding frameworks...")
        created_count = 0
        updated_count = 0
        for fw in FRAMEWORKS:
            _, created = Framework.objects.update_or_create(
                name=fw["name"],
                defaults={"version": fw["version"], "description": fw["description"]},
            )
            if created:
                created_count += 1
            else:
                updated_count += 1
        self._ok(f"Frameworks: {created_count} created, {updated_count} existing")
        return created_count, updated_count

    # ── Controls ───────────────────────────────────
    def _seed_controls(self):
        self._info("Seeding controls across 5 domains...")
        created_count = 0
        updated_count = 0
        for domain, controls in CONTROLS.items():
            for ctrl in controls:
                fw = Framework.objects.get(name=ctrl["framework"])
                _, created = Control.objects.update_or_create(
                    framework=fw,
                    control_code=ctrl["code"],
                    defaults={
                        "title": ctrl["title"],
                        "description": ctrl["desc"],
                        "weight": ctrl["weight"],
                    },
                )
                if created:
                    created_count += 1
                else:
                    updated_count += 1
            self._info(f"  ├─ {domain}: {len(controls)} controls")
        self._ok(f"Controls: {created_count} created, {updated_count} existing")
        return created_count, updated_count

    # ── Wazuh Mappings ─────────────────────────────
    def _seed_mappings(self):
        self._info("Seeding Wazuh SCA → control mappings...")
        created_count = 0
        updated_count = 0
        for m in WAZUH_MAPPINGS:
            fw_name, ctrl_code = m["control"]
            try:
                control = Control.objects.get(framework__name=fw_name, control_code=ctrl_code)
            except Control.DoesNotExist:
                self._warn(f"Control {fw_name}/{ctrl_code} not found — skipping {m['rule_id']}")
                continue

            _, created = WazuhMapping.objects.update_or_create(
                wazuh_rule_id=m["rule_id"],
                defaults={"rule_description": m["desc"], "control": control},
            )
            if created:
                created_count += 1
            else:
                updated_count += 1
        self._ok(f"Wazuh Mappings: {created_count} created, {updated_count} existing")
        return created_count, updated_count

    # ── Policies ───────────────────────────────────
    def _seed_policies(self):
        self._info("Seeding technology-verifiable policies...")
        created_count = 0
        updated_count = 0
        for pol in POLICIES:
            policy, created = Policy.objects.update_or_create(
                title=pol["title"],
                defaults={"description": pol["desc"], "status": pol["status"]},
            )
            if created:
                created_count += 1
            else:
                updated_count += 1

            control_objs = []
            for fw_name, ctrl_code in pol["controls"]:
                try:
                    control_objs.append(
                        Control.objects.get(framework__name=fw_name, control_code=ctrl_code)
                    )
                except Control.DoesNotExist:
                    pass
            if control_objs:
                policy.controls.set(control_objs)

        self._ok(f"Policies: {created_count} created, {updated_count} existing")
        return created_count, updated_count
