# Supervisor Progress Report: Automated GRC Platform

> **Date:** April 14, 2026
> **Project:** Automated Governance, Risk, and Compliance (GRC) Platform
> **Role:** Lead Technical Architect
> **Status:** Advanced Implementation Phase

## 1. Executive Summary

The Automated GRC Platform has reached a highly mature state, operating as a fully containerized, full-stack application. Our core objective of bringing automated, continuous compliance monitoring has been successfully realized. By directly mapping live Security Information and Event Management (SIEM) data against industry-standard compliance frameworks (e.g., ISO 27001, SOC 2 Type II), the platform minimizes manual auditing overhead. The architecture is currently stable, utilizing modern protocols to guarantee security, modularity, and high availability.

## 2. System Architecture & Tech Stack

The platform is designed around a modern, microservices-oriented architecture, orchestrated via **Docker Compose**. This ensures environment consistency across development, testing, and production phases. 

Our core technology stack comprises:
- **Backend Framework:** Python 3.12 with **Django REST Framework (DRF)**. This ensures rapid API development, reliable ORM operations, and secure business logic execution.
- **Database Layer:** **PostgreSQL 18** acts as the primary persistence layer, housing everything from complex relational governance mappings to immutable audit logs.
- **Frontend Architecture:** **React 18** configured with **Vite** for optimized build times and Hot Module Replacement (HMR). 
- **Styling Engine:** **Tailwind CSS v4** is employed to handle the application's enterprise-grade UI/UX, facilitating rapid aesthetic iteration without bloated style sheets.
- **Agent Integrations:** Direct linkage to an external **Wazuh** Manager, coupled with a local Postgres Model Context Protocol (MCP) server for advanced AI-driven database capabilities.

## 3. SIEM Integration & Data Pipeline (The Wazuh Engine)

The beating heart of our automated compliance engine is the integration with the Wazuh SIEM via a robust, custom REST API client (`WazuhAPIClient`). 

### Core Mechanics & Backend Logic
- **Automated Data Ingestion:** A dedicated command module (`sync_wazuh_scans.py`) polls the Wazuh Security Configuration Assessment (SCA) API using JWT-secured authentication. It pulls the latest configuration checks from connected agents.
- **Parsing the Compliance Array:** The engine dynamically parses the multi-faceted `compliance` array returned by Wazuh (e.g., CIS benchmarks, PCI DSS mappings). 
- **Deduplication of Micro-Checks:** Wazuh often generates multiple technical micro-checks for a single policy. Our pipeline implements a sophisticated deduplication algorithm, condensing these into a streamlined 1-to-1 scan result representation. Crucially, the system naturally prioritizes `FAIL` results over `PASS` during this aggregation to ensure strict, uncompromising compliance reporting.
- **High-Level Governance Mapping:** Through the relational `WazuhMapping` model, granular technical metrics (e.g., "Check ID 28504: SSH Root Login Disabled") are systematically routed and mapped to high-level governance controls (e.g., ISO 27001 Control A.9.2.4). This demystifies technical telemetry for non-technical auditing staff.

## 4. Backend Security & Role-Based Access Control (RBAC)

Security is deeply embedded into the application’s backend infrastructure. 

### Authentication & Authorization
- **JWT Security:** We utilize JSON Web Tokens (JWT) for stateless, scalable API security. 
- **CustomTokenObtainPairSerializer:** To accommodate the strictly regulated auditing environment, we extended the default JWT behavior with a custom serializer. This enforces hard **Account Expiry dates**—automatically revoking access for temporary auditors precisely when their engagement concludes.
- **Strict 3-Tier RBAC:** The platform enforces a rigid hierarchy utilizing a tailored `UserProfile` model: `Super Admin`, `Admin`, and `Auditor`.

### Data Integrity & Credential Safety
- **Immutable Audit Logging:** Every create, update, or delete action executed within the system generates an immutable `AuditLog` entry (tracking User, Action, Module, Timestamp, and Context). 
- **Dynamic SMTP Configuration:** Outbound alerting is handled via a singleton `SMTPSettings` configuration. To maintain paramount security, plaintext passwords are purposefully masked and purged from API responses via the `SMTPSettingsSerializer`, preventing credential leakage on the frontend. 

## 5. Frontend Engineering & UX

The frontend is engineered not just for functionality, but to provide a cohesive, enterprise SaaS experience.

### Client-Side Capabilities
- **Role-Based Routing:** The React application features dynamic routing logic, adapting the navigation schema and UI components in real-time based on the user's JWT-injected role.
- **Real-Time Client-Side Reporting:** Leveraging the `jspdf` and `jspdf-autotable` libraries, the application allows users to generate comprehensive, styled PDF reports of their compliance posture and audit trails entirely on the client side. This offloads resource-intensive document generation from the backend API.

### Enterprise UI/UX Aesthetics
- **Polished Slate Paradigm:** The UI/UX is built around a professional **Slate (`#0f172a`) dark mode palette**, projecting an authoritative and polished aesthetic fitting for enterprise security software.
- **Interactive State Mechanisms:** Dynamic status dropdowns allow administrators to instantly toggle policies between Active, Draft, and Disabled states. 
- **Relational Policy Manager:** We designed a robust multi-select Policy Management Interface. Front-end architectures seamlessly link dense organizational policies to multiple governance controls concurrently, backed by efficient, flattened `PolicySerializer` responses. 

---
*Report generated for the Final Year Project Supervisory Review.*
