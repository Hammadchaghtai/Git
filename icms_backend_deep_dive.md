# ICMS — Backend Engineering Deep Dive (Exhaustive Technical Analysis)

## 1. Relational Schema Specification: The Relational Core

The Intelligent Compliance Management System (ICMS) backend is architected on **Django 5.1** and **PostgreSQL 18**, utilizing a highly normalized schema to maintain data integrity across Governance, Risk, and Telemetry layers. This section provides an exhaustive walkthrough of the domain models.

### 1.1 Governance Layer Models

#### `Framework` Model
The top-level grouping for all regulatory standards.
```python
class Framework(models.Model):
    name = models.CharField(
        max_length=120,
        unique=True,
        help_text="Framework name, e.g. 'ISO 27001'",
    )
    version = models.CharField(
        max_length=30,
        help_text="Version identifier, e.g. '2022'",
    )
    description = models.TextField(
        blank=True,
        default="",
        help_text="Optional long description of the framework.",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
```
*   **`name`**: A `unique=True` constraint ensures that we do not duplicate framework entries. It is capped at 120 characters to prevent database index bloat.
*   **`version`**: This allows the system to support side-by-side versions of the same framework (e.g., ISO 27001:2013 and ISO 27001:2022).
*   **`description`**: A `TextField` providing context for auditors.
*   **`created_at / updated_at`**: Automatic timestamps used for audit trails.

#### `Control` Model
The atomic auditable requirement.
```python
class Control(models.Model):
    framework = models.ForeignKey(
        Framework,
        on_delete=models.CASCADE,
        related_name="controls",
    )
    control_code = models.CharField(
        max_length=30,
        help_text="Control identifier, e.g. 'A.9.2.4'",
    )
    title = models.CharField(
        max_length=255,
        help_text="Short title of the control.",
    )
    description = models.TextField(
        blank=True,
        default="",
        help_text="Full description of what the control requires.",
    )
    weight = models.FloatField(
        default=1.0,
        validators=[MinValueValidator(0.0)],
        help_text="Relative weight used in compliance score calculation.",
    )
```
*   **`framework`**: Uses `on_delete=models.CASCADE` ensuring that if a framework is removed, all its associated controls are purged to maintain referential integrity.
*   **`control_code`**: A human-readable identifier (e.g., "A.5.1").
*   **`weight`**: A `FloatField` with a `MinValueValidator(0.0)` constraint. This field is designed for future prioritization where a failure in a "Critical" control can penalize the score more heavily than a "Minor" one.
*   **Constraints**: `unique_together = ["framework", "control_code"]` ensures that within a single framework, control codes remain unique.

### 1.2 Wazuh Integration Layer

#### `WazuhMapping` Model
The "Rosetta Stone" mapping SIEM rule IDs to GRC controls.
```python
class WazuhMapping(models.Model):
    wazuh_rule_id = models.CharField(
        max_length=50,
        unique=True,
        help_text="Wazuh SCA check / rule ID (e.g. '28504').",
    )
    rule_description = models.TextField(
        blank=True,
        default="",
        help_text="Human-readable description of the Wazuh rule.",
    )
    control = models.ForeignKey(
        Control,
        on_delete=models.CASCADE,
        related_name="wazuh_mappings",
    )
```
*   **`wazuh_rule_id`**: Stores the exact ID from the Wazuh SCA policy. It is indexed and `unique=True` for high-speed lookups during the ingestion loop.
*   **`control`**: Linked to the governance layer. This model allows multiple Wazuh rules to point to a single GRC control (N:1 mapping).

#### `ScanResult` Model
The persistent outcome of a telemetry check.
```python
class ScanResult(models.Model):
    scan = models.ForeignKey(
        ComplianceScan,
        on_delete=models.CASCADE,
        related_name="results",
    )
    mapping = models.ForeignKey(
        WazuhMapping,
        on_delete=models.CASCADE,
        related_name="scan_results",
    )
    is_passed = models.BooleanField(
        default=False,
        help_text="True if the agent passed this check.",
    )
    raw_log_data = models.JSONField(
        blank=True,
        default=dict,
        help_text="Raw JSON payload returned by the Wazuh SCA API.",
    )
```
*   **`is_passed`**: A boolean outcome from the telemetry engine.
*   **`raw_log_data`**: A `JSONField` storing the entire check payload. This is critical for auditing, allowing a user to click a failing control and see exactly *why* it failed (e.g., "File /etc/shadow permissions are 644 instead of 600").

---

## 2. Algorithmic Flow: Wazuh SCA Ingestion

The ingestion engine is split into a service-level HTTP client and a management-level orchestration command.

### 2.1 The `WazuhAPIClient` Implementation
Located in `compliance/services/wazuh_client.py`.

```python
    def authenticate(self) -> str:
        url = f"{self.base_url}/security/user/authenticate"
        resp = requests.get(
            url,
            auth=(self.user, self.password),
            verify=self.verify_ssl,
            timeout=15,
        )
        if resp.status_code != 200:
            raise WazuhAPIError(f"Authentication failed ({resp.status_code}): {resp.text}")

        data = resp.json()
        self._token = data.get("data", {}).get("token")
        return self._token

    def get_sca_checks(self, agent_id: str, policy_id: str | None = None) -> list[dict[str, Any]]:
        all_checks: list[dict[str, Any]] = []
        if not policy_id:
            policies = self.get_sca_policies(agent_id)
            policy_ids = [p["policy_id"] for p in policies if "policy_id" in p]
        
        for pid in policy_ids:
            data = self._get(f"/sca/{agent_id}/checks/{pid}", params={"limit": 500})
            checks = data.get("data", {}).get("affected_items", [])
            all_checks.extend(checks)
        return all_checks
```

**JSON Payload Specification (Wazuh Response)**:
When ICMS calls `get_sca_checks`, Wazuh returns a list of items structured as follows:
```json
{
  "id": 28504,
  "policy_id": "cis_ubuntu22-04",
  "title": "Ensure permissions on /etc/shadow are configured",
  "result": "failed",
  "compliance": [
    { "key": "cis", "value": "5.2.3" },
    { "key": "iso_27001", "value": "A.9.2.4" }
  ],
  "description": "The /etc/shadow file contains the hashed passwords for all users."
}
```

### 2.2 The "Worst-Case Priority" Deduplication Logic
The core ingestion logic resides in `sync_wazuh_scans.py`. The "Worst-Case Priority" algorithm ensures that if a control is checked multiple times (e.g., by different SCA policies), a single failure triggers a compliance gap.

**10-Step Logical Trace**:
1.  **Initialize `seen_mappings`**: A dictionary `{ mapping_id: ScanResult_Object }` is created for the current agent scan.
2.  **Iterate Wazuh Checks**: The system loops through `checks` returned by `WazuhAPIClient`.
3.  **Identify Mapping**: For each `check`, the system parses the `compliance` array.
4.  **Lookup Mapping**: If a `value` (e.g., "A.9.2.4") matches a `WazuhMapping.wazuh_rule_id` in the database, the `mapping` object is retrieved.
5.  **Check for Duplicates**: The system checks `if mapping.pk in seen_mappings`.
6.  **First Encounter**: If not seen, a new `ScanResult` is created and stored in `seen_mappings`.
7.  **Subsequent Encounter**: If the `mapping.pk` is already in the dictionary, the existing `ScanResult` object is retrieved.
8.  **Evaluate Priority**: The algorithm checks: `if existing.is_passed and not is_passed:`.
9.  **Downgrade Result**: If the existing result was a `PASS` but this new telemetry indicates a `FAIL`, the `existing.is_passed` is flipped to `False`.
10. **Persist State**: `existing.save(update_fields=["is_passed", "raw_log_data"])` is called. This ensures the system always reflects the **worst** compliance state detected.

---

## 3. Reporting Engine: PDF Generation Spec

The ICMS reporting engine generates server-side PDFs using the `xhtml2pdf` library, which enforces strict CSS2.1 compliance.

### 3.1 `GenerateReportView` Breakdown
Located in `compliance/views.py`.

```python
class GenerateReportView(APIView):
    def get(self, request):
        framework_id = request.query_params.get("framework_id")
        framework = Framework.objects.get(id=framework_id)

        # 1. Fetch latest scan per agent using PostgreSQL-specific distinct()
        latest_scan_ids = (
            ComplianceScan.objects
            .order_by("agent_id", "-scan_date")
            .distinct("agent_id")
            .values_list("id", flat=True)
        )
        latest_scans = ComplianceScan.objects.filter(id__in=latest_scan_ids)

        # 2. Aggregating failures across the entire fleet
        failed_controls_qs = ScanResult.objects.filter(
            scan__in=latest_scans, 
            mapping__control__framework=framework,
            is_passed=False
        ).values(
            "mapping__control__control_code",
            "mapping__control__title",
        ).annotate(fail_count=Count("id")).order_by("-fail_count")

        # 3. Context Preparation
        context = {
            "framework": framework,
            "compliance_score": score, # calculated as (passed/total)*100
            "failed_controls": failed_controls,
            "generation_date": timezone.now(),
        }

        # 4. Binary Stream Pipeline
        html = render_to_string("compliance/compliance_report.html", context)
        result = io.BytesIO()
        pdf = pisa.pisaDocument(io.BytesIO(html.encode("UTF-8")), result)
        return HttpResponse(result.getvalue(), content_type="application/pdf")
```

### 3.2 CSS Layout Specifications (xhtml2pdf Constraints)
The following CSS block from `compliance_report.html` demonstrates how ICMS simulates modern UI layouts within the restricted CSS2.1 environment.

```css
<style>
    @page { size: A4; margin: 1.5cm; }
    
    /* ── The Report Header Simulator ── */
    .report-header {
        width: 100%;
        border-bottom: 2px solid #6D28D9;
        padding-bottom: 10pt;
        margin-bottom: 20pt;
    }
    
    /* ── The "Card" Simulator (Using Tables) ── */
    .summary-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 30pt;
        background-color: #f8fafc;
        border: 1px solid #e2e8f0;
    }
    .score-value {
        font-size: 56pt;
        font-weight: bold;
        color: #6D28D9;
    }
    
    /* ── Data Rows ── */
    .data-table { width: 100%; border-collapse: collapse; }
    .data-table th { background-color: #f8fafc; padding: 12pt; border-bottom: 2px solid #cbd5e1; }
    .data-table td { padding: 12pt; border-bottom: 1px solid #e2e8f0; }
</style>
```

**Technical Rationale for Table-Based Layouts**:
The `xhtml2pdf` renderer does not support **Flexbox** or **CSS Grid**. Consequently, the executive summary "cards" seen in the PDF are actually constructed using `<table>` elements with `width="100%"` and `border-collapse: collapse`. Column widths are explicitly set as percentages (e.g., `width="40%"` for the score, `width="60%"` for details) to force alignment that resembles a modern dashboard grid.

---

## 4. Scoring Logic: Weighted Arithmetic

The backend calculates compliance using a weighted average. While currently most weights are set to `1.0`, the system is architected for risk-based scoring.

**The Equation**:
`Score = (Sum(PassedControlWeight) / Sum(TotalMappedControlWeight)) * 100`

This logic is executed within the `sync_wazuh_scans` command. After the deduplication loop, the system counts the number of distinct `WazuhMapping` objects encountered and compares them against the number of `is_passed=True` flags.

---
*Document produced by Principal Systems Architect — Revision 2.0*
*Length: ~480 Lines*
