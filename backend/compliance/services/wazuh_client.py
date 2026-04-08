"""
compliance/services/wazuh_client.py
────────────────────────────────────
HTTP client for the Wazuh Manager REST API (v4.x).

Handles JWT authentication, agent listing, and SCA check retrieval.
SSL verification is disabled by default since Wazuh typically ships
with self-signed certificates.

Usage:
    from compliance.services.wazuh_client import WazuhAPIClient

    client = WazuhAPIClient()
    client.authenticate()
    agents  = client.get_active_agents()
    checks  = client.get_sca_checks(agent_id="001")
"""

from __future__ import annotations

import logging
from typing import Any

import requests
import urllib3
from decouple import config

# Silence InsecureRequestWarning for self-signed certs
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

logger = logging.getLogger(__name__)


class WazuhAPIError(Exception):
    """Raised when the Wazuh API returns a non-2xx response."""


class WazuhAPIClient:
    """Thin wrapper around the Wazuh Manager REST API."""

    def __init__(
        self,
        host: str | None = None,
        user: str | None = None,
        password: str | None = None,
        port: int = 55000,
        verify_ssl: bool = False,
    ) -> None:
        self.host = host or config("WAZUH_API_HOST", default="192.168.100.100")
        self.user = user or config("WAZUH_API_USER", default="wazuh")
        self.password = password or config("WAZUH_API_PASSWORD", default="")
        self.port = port
        self.verify_ssl = verify_ssl

        self.base_url = f"https://{self.host}:{self.port}"
        self._token: str | None = None

    # ── helpers ─────────────────────────────────────

    @property
    def _auth_headers(self) -> dict[str, str]:
        """Return Authorization header with the current JWT token."""
        if not self._token:
            raise WazuhAPIError("Not authenticated. Call authenticate() first.")
        return {"Authorization": f"Bearer {self._token}"}

    def _get(self, endpoint: str, params: dict | None = None) -> dict[str, Any]:
        """Perform an authenticated GET and return the JSON body."""
        url = f"{self.base_url}{endpoint}"
        resp = requests.get(
            url,
            headers=self._auth_headers,
            params=params,
            verify=self.verify_ssl,
            timeout=30,
        )
        if resp.status_code != 200:
            raise WazuhAPIError(
                f"GET {endpoint} returned {resp.status_code}: {resp.text}"
            )
        return resp.json()

    # ── public API ──────────────────────────────────

    def authenticate(self) -> str:
        """
        Authenticate with Wazuh using Basic Auth and retrieve a JWT token.
        POST /security/user/authenticate
        """
        url = f"{self.base_url}/security/user/authenticate"
        resp = requests.get(
            url,
            auth=(self.user, self.password),
            verify=self.verify_ssl,
            timeout=15,
        )
        if resp.status_code != 200:
            raise WazuhAPIError(
                f"Authentication failed ({resp.status_code}): {resp.text}"
            )

        data = resp.json()
        self._token = data.get("data", {}).get("token")
        if not self._token:
            raise WazuhAPIError(f"No token in response: {data}")

        logger.info("Wazuh authentication successful.")
        return self._token

    def get_active_agents(self) -> list[dict[str, Any]]:
        """
        Return a list of active agents.
        GET /agents?status=active
        Each item contains at least: id, name, ip, os.platform, ...
        """
        data = self._get("/agents", params={"status": "active", "limit": 500})
        agents = data.get("data", {}).get("affected_items", [])
        logger.info("Found %d active agent(s).", len(agents))
        return agents

    def get_sca_policies(self, agent_id: str) -> list[dict[str, Any]]:
        """
        Return the list of SCA policies for an agent.
        GET /sca/{agent_id}
        """
        data = self._get(f"/sca/{agent_id}")
        return data.get("data", {}).get("affected_items", [])

    def get_sca_checks(
        self,
        agent_id: str,
        policy_id: str | None = None,
        limit: int = 500,
    ) -> list[dict[str, Any]]:
        """
        Return SCA pass/fail checks for an agent.
        GET /sca/{agent_id}/checks/{policy_id}

        If no policy_id is given, fetches policies first and retrieves
        checks for ALL of them.
        """
        all_checks: list[dict[str, Any]] = []

        if policy_id:
            policy_ids = [policy_id]
        else:
            # Discover all SCA policies for this agent
            policies = self.get_sca_policies(agent_id)
            policy_ids = [p["policy_id"] for p in policies if "policy_id" in p]

        for pid in policy_ids:
            data = self._get(
                f"/sca/{agent_id}/checks/{pid}",
                params={"limit": limit},
            )
            checks = data.get("data", {}).get("affected_items", [])
            all_checks.extend(checks)
            logger.info(
                "Agent %s | Policy %s → %d checks", agent_id, pid, len(checks)
            )

        return all_checks
