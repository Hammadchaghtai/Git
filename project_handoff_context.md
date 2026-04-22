# Project Context: Intelligent Compliance Management System (ICMS)

## 1. Project Identity & Architecture
**Current State:** ICMS is a hardened, enterprise-grade GRC (Governance, Risk, and Compliance) platform. It has transitioned from a legacy prototype to a production-ready containerized architecture.

*   **Stack:** 
    *   **Backend:** Dockerized Django (DRF) serving a RESTful API.
    *   **Frontend:** React (Vite) + Tailwind CSS (Cyber-SaaS Aesthetic).
    *   **Async Processing:** Celery + Redis (Handles SCA scans and Wazuh data ingestion).
    *   **Database:** PostgreSQL (Optimized with `.annotate()` and `.select_related()` to eliminate N+1 queries).
    *   **SIEM Integration:** Native Wazuh API connectivity for real-time telemetry and compliance auditing.

---

## 2. The "Cyber-SaaS" Design System (Strict Rules)
The platform has undergone a massive visual pivot. Any further UI development MUST strictly adhere to these design tokens:

*   **Canvas:** Background is `bg-slate-50`. Avoid plain white or dead black backgrounds.
*   **Surfaces:** Use "Cyber-Cards" — `bg-white`, `rounded-2xl`, `shadow-xl`. **NEVER** use harsh 1px borders or standard HTML `<table>` tags in the React frontend.
*   **Brand Color:** Deep Violet (`#6D28D9` / `violet-700`). This is used for primary buttons, active sidebar states, and progress indicators.
*   **Typography:** Modern Sans-Serif (Inter/Roboto). Use `tracking-tight` for headings.
*   **Status Semantics:** Use "Soft Pills" instead of harsh badges.
    *   *Success:* `bg-emerald-100 text-emerald-700 rounded-full px-3 py-1 text-xs font-bold`.
    *   *Alert/Fail:* `bg-rose-100 text-rose-700 rounded-full px-3 py-1 text-xs font-bold`.

---

## 3. Security & Backend State
*   **RBAC:** Implemented via custom DRF permission classes. `IsAdminOrSuperAdmin` ensures that while Administrators have full CRUD, Auditors/Staff remain in a strictly read-only state.
*   **Auth Flow:** JWT-based with a custom `CustomTokenObtainPairView`.
*   **Global Interceptors:** The frontend uses an Axios interceptor to catch `403 Forbidden` errors and trigger global toast notifications, preventing silent auth failures.
*   **Data Optimization:** Dashboard views are optimized via Django's `.annotate()`, reducing 20+ queries down to a single efficient database hit.

---

## 4. The PDF Reporting Engine
The platform generates server-side Compliance and Audit Trail reports.

*   **Technology:** `xhtml2pdf` (Django-pisa).
*   **Critical Constraint:** `xhtml2pdf` does **NOT** support CSS3 (Flexbox/Grid) or modern @page margin boxes. 
*   **Templates:** `compliance_report.html` and `audit_report.html` use strict **HTML <table> layouts** and CSS2. If editing templates, avoid nesting at-rules inside `@page` or the engine will return a 500 error.
*   **Dependencies:** The backend Dockerfile includes `libcairo2-dev`, `libpango1.0-dev`, and `libgdk-pixbuf2.0-dev` to handle complex C-binding PDF rendering requirements.

---

## 5. Pending Tasks (Action Items for Partner)
The core logic and infrastructure are stable. The remaining focus is on extreme UI/UX polish:

1.  **Refactor Legacy Tables:** Search all React components (e.g., `Policies.jsx`, `ManageAdmins.jsx`, `Dashboard.jsx`) and replace any remaining `<table>` structures with modern **Flexbox/Grid rows** inside Cyber-Cards.
2.  **Empty States:** Implement branded SVG empty states for lists with zero results (Identity registry, policy list).
3.  **Loading Spinners:** Replace standard text loading indicators with custom Deep Violet pulse animations.
4.  **Edge-Case Modals:** Ensure all confirmation modals (e.g., "Delete Policy") follow the `rounded-2xl` and `shadow-2xl` design pattern.
5.  **Audit Trail Polish:** Ensure the live audit list in the UI matches the premium server-side PDF output in terms of data density and categorization.

---
*Document Generated: April 22, 2026*
