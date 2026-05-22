# 🛡️ GRC Compliance Management Platform

A full-stack **Governance, Risk & Compliance (GRC)** platform that automates security compliance monitoring by integrating with [Wazuh SIEM](https://wazuh.com/). It continuously maps real-time SCA (Security Configuration Assessment) scan results to industry-standard compliance frameworks (**ISO 27001:2022** and **SOC 2 Type II**), calculates weighted compliance scores per endpoint, and provides executive-grade PDF reports — all through a modern React dashboard.

---

## 📸 Features

| Feature | Description |
|---------|-------------|
| **Automated Compliance Scoring** | Maps Wazuh SCA checks to ISO 27001 & SOC 2 controls with weighted scoring |
| **Real-Time Dashboard** | Live compliance scores, trend charts, risk heatmaps, and department breakdowns |
| **Framework Management** | 2 frameworks, 22 controls across 5 security domains, 32 Wazuh mappings |
| **Policy Engine** | 22 technology-verifiable policies linked to auditable controls |
| **Risk Registry** | Risk entries with severity levels (Low → Critical) and remediation steps |
| **PDF Report Generation** | Server-rendered compliance & audit trail reports via xhtml2pdf |
| **Role-Based Access Control** | Super Admin, Admin, and Auditor roles with granular permissions |
| **Two-Factor Authentication** | TOTP-based 2FA with QR code provisioning via authenticator apps |
| **User Lifecycle Management** | Invite via email, time-bound auditor access, account revoke/restore |
| **Email Notifications** | SMTP-based invite emails with QR codes, password reminders, status updates |
| **Automated Scans** | Celery Beat scheduled scans (daily/weekly/monthly) |
| **Audit Logging** | Complete audit trail of all user and system actions |
| **Department Management** | Organize agents and policies by organizational department |
| **Agent Profiles** | Custom naming and department assignment for Wazuh agents |

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        Docker Compose                            │
│                                                                  │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────────┐ │
│  │ Frontend │   │ Backend  │   │  Celery   │   │ Celery Beat  │ │
│  │ React +  │──▶│ Django   │──▶│  Worker   │   │  Scheduler   │ │
│  │  Vite    │   │  DRF     │   │          │   │              │ │
│  │ :5173    │   │ :8000    │   └──────────┘   └──────────────┘ │
│  └──────────┘   └────┬─────┘         │               │         │
│                      │               │               │         │
│                      ▼               ▼               ▼         │
│               ┌──────────┐    ┌──────────┐                     │
│               │PostgreSQL│    │  Redis   │                     │
│               │  :5432   │    │  :6379   │                     │
│               └──────────┘    └──────────┘                     │
└──────────────────────────────────────────────────────────────────┘
                       │
                       ▼
              ┌────────────────┐
              │  Wazuh Manager │
              │  (External)    │
              │  :55000 API    │
              └────────────────┘
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, Vite 8, Tailwind CSS 4, Recharts, Lucide Icons |
| **Backend** | Django 5.1, Django REST Framework 3.15, SimpleJWT |
| **Database** | PostgreSQL 18 |
| **Task Queue** | Celery 5.4 + Redis 7 + django-celery-beat |
| **2FA** | PyOTP + QR Code generation |
| **Reports** | xhtml2pdf (server-side PDF rendering) |
| **SIEM** | Wazuh Manager API (SCA compliance checks) |
| **Container** | Docker + Docker Compose |

---

## 🚀 Quick Start

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) & [Docker Compose](https://docs.docker.com/compose/install/) installed
- A **Wazuh Manager** instance with active agents (optional — the platform works without it, scans will just return empty results)

### 1. Clone the Repository

```bash
git clone https://github.com/mab2004/fyp-project.git
cd fyp-project
```

### 2. Configure Environment

```bash
# Copy the example env file for the backend
cp .env.example backend/.env
```

Edit `backend/.env` and update these values:

```env
# Django — generate a real secret for production
SECRET_KEY=django-insecure-replace-this-with-a-real-secret-key-2026

# PostgreSQL (must match docker-compose.yml)
DB_NAME=grc_platform
DB_USER=grc_admin
DB_PASSWORD=grc_secret_2026
DB_HOST=db
DB_PORT=5432

# Wazuh Manager API — point to your Wazuh instance
WAZUH_API_HOST=192.168.100.100
WAZUH_API_USER=wazuh
WAZUH_API_PASSWORD=your-wazuh-api-password
```

> **Note:** If you don't have a Wazuh instance, leave the default values. The platform will still run — compliance scans will simply return no results until a Wazuh manager is connected.

### 3. Build & Start All Services

```bash
docker compose up --build -d
```

This starts **6 services**:

| Service | Port | Description |
|---------|------|-------------|
| `frontend` | [localhost:5173](http://localhost:5173) | React dashboard |
| `backend` | [localhost:8000](http://localhost:8000) | Django REST API |
| `db` | 5432 | PostgreSQL database |
| `redis` | 6379 | Celery message broker |
| `celery_worker` | — | Background task executor |
| `celery_beat` | — | Periodic task scheduler |

### 4. Seed the Database

```bash
docker compose exec backend python manage.py seed_all
```

This single command runs all seeders in the correct order:
1. **Users** — Creates Super Admin, Admin, and Auditor accounts
2. **Enterprise Matrix** — 2 frameworks, 22 controls, 32 Wazuh mappings, 22 policies
3. **Departments** — IT, HR, Finance, Operations, Legal, Engineering, Executive
4. **System Settings** — Initializes the singleton settings row

### 5. Login

Open [http://localhost:5173](http://localhost:5173) and sign in.

---

## 🔐 Default Credentials

| Role | Username | Password | Access Level |
|------|----------|----------|-------------|
| **Super Admin** | `superadmin` | `SuperGRC@2026!` | Full platform access, user management, system settings |
| **Admin** | `admin` | `AdminGRC@2026!` | Policy/control management, scans, reports |
| **Auditor** | `auditor` | `AuditGRC@2026!` | Read-only access, report downloads |

> ⚠️ **Change these passwords immediately after first login!**  
> Go to **Settings → My Identity & Security** to update your password.

### Two-Factor Authentication (2FA)

Each user has a unique TOTP secret generated during seeding. On your first login:

1. Go to **Settings → Authenticator Setup**
2. Scan the QR code with **Google Authenticator** or **Microsoft Authenticator**
3. Enter the 6-digit code to verify

---

## 📖 Management Commands

All commands are run inside the backend container:

```bash
docker compose exec backend python manage.py <command>
```

| Command | Description |
|---------|-------------|
| `seed_all` | Runs all seeders in order (users, matrix, departments, settings) |
| `seed_users` | Creates default user accounts with profiles and audit logs |
| `seed_enterprise_matrix` | Seeds frameworks, controls, Wazuh mappings, and policies |
| `seed_grc_data` | Lightweight seeder (3 controls, 3 mappings — for quick testing) |
| `sync_wazuh_scans` | Pulls SCA results from Wazuh and calculates compliance scores |
| `sync_wazuh_scans --agent 001` | Sync a specific agent only |

---

## 🔌 Wazuh Integration

The platform bridges **Wazuh SCA scan results** to **GRC compliance controls**:

```
Wazuh SCA Check → compliance.value → WazuhMapping → Control → Framework
                                                        ↓
                                               Compliance Score (%)
```

### How It Works

1. **Wazuh agents** run SCA benchmarks (CIS, PCI DSS, etc.) on endpoints
2. The `sync_wazuh_scans` command polls the Wazuh API for results
3. Each SCA check's `compliance.value` field is matched against the `WazuhMapping` table
4. Pass/fail results are stored as `ScanResult` records
5. A **weighted compliance score** (0–100%) is calculated per agent

### Automated Scanning

Celery Beat automatically triggers scans based on the configured frequency:
- **Daily** — recommended for high-risk environments
- **Weekly** — standard (default)
- **Monthly** — minimum compliance

Change the frequency from **Settings → Compliance Engine** in the dashboard.

---

## 📁 Project Structure

```
fyp-project/
├── docker-compose.yml          # All 6 services orchestration
├── .env.example                # Environment variable template
│
├── backend/
│   ├── Dockerfile              # Python 3.12-slim + system deps
│   ├── requirements.txt        # Python dependencies
│   ├── manage.py               # Django management entry point
│   ├── core/                   # Django project config
│   │   ├── settings.py         # Database, JWT, CORS, Celery config
│   │   ├── urls.py             # API route registration
│   │   ├── celery.py           # Celery app initialization
│   │   └── wsgi.py / asgi.py
│   └── compliance/             # Main GRC application
│       ├── models.py           # 11 domain models (Framework → ScanResult)
│       ├── views.py            # 20+ API endpoints & ViewSets
│       ├── serializers.py      # DRF serializers
│       ├── urls.py             # URL routing
│       ├── tasks.py            # Celery async tasks
│       ├── scheduler.py        # Celery Beat schedule sync
│       ├── admin.py            # Django admin configuration
│       ├── services/
│       │   └── wazuh_client.py # Wazuh REST API client
│       ├── management/commands/
│       │   ├── seed_all.py     # Master seeder (runs everything)
│       │   ├── seed_users.py   # User + profile seeder
│       │   ├── seed_enterprise_matrix.py  # Full compliance matrix
│       │   ├── seed_grc_data.py           # Lightweight test seeder
│       │   └── sync_wazuh_scans.py        # Wazuh SCA sync engine
│       ├── templates/compliance/
│       │   ├── compliance_report.html     # PDF report template
│       │   └── audit_report.html          # Audit trail PDF template
│       └── migrations/         # Database migration files
│
└── frontend/
    ├── Dockerfile              # Node 20-alpine
    ├── package.json            # React 19, Vite 8, Tailwind CSS 4
    ├── vite.config.js
    ├── index.html              # App entry point
    └── src/
        ├── App.jsx             # Router & route definitions
        ├── main.jsx            # React DOM mount
        ├── index.css           # Tailwind + custom styles
        ├── api/axios.js        # Axios instance with JWT interceptors
        ├── context/
        │   ├── AuthContext.jsx  # JWT auth state management
        │   └── ThemeContext.jsx # Dark/light theme toggle
        ├── layouts/
        │   └── DashboardLayout.jsx  # Sidebar + topbar layout
        ├── components/
        │   └── Toast.jsx       # Toast notification system
        ├── pages/
        │   ├── Login.jsx       # Login + 2FA verification
        │   ├── VerifyOTP.jsx   # TOTP verification screen
        │   ├── ForgotPassword.jsx
        │   ├── ProfileSetup.jsx
        │   ├── Dashboard.jsx   # Main dashboard with charts
        │   ├── Frameworks.jsx  # Framework & control explorer
        │   ├── Policies.jsx    # Policy CRUD management
        │   ├── Scans.jsx       # Compliance scan results
        │   ├── ComplianceChecks.jsx  # Detailed check drill-down
        │   ├── Reports.jsx     # PDF report generation
        │   ├── ManageAdmins.jsx # User lifecycle management
        │   └── Settings.jsx    # System settings & profile
        └── utils/
            └── logFailure.js   # Audit log helper
```

---

## 🗄️ Data Model

```
Framework ──< Control ──< Risk
                │
                ├──< WazuhMapping ──< ScanResult >── ComplianceScan
                │
                └──>< Policy (M2M) ──>< Department (M2M)

UserProfile ──> User (Django Auth)
AgentProfile ──> Department

SystemSettings (Singleton)
SMTPSettings (Singleton)
AuditLog
```

---

## 🔧 Common Operations

### Trigger a Manual Scan

```bash
# Scan all active Wazuh agents
docker compose exec backend python manage.py sync_wazuh_scans

# Scan a specific agent
docker compose exec backend python manage.py sync_wazuh_scans --agent 001
```

### View Container Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f backend
docker compose logs -f celery_worker
```

### Reset the Database

```bash
docker compose down -v          # Remove containers + volumes
docker compose up --build -d    # Rebuild from scratch
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py seed_all
```

### Access Django Admin

Navigate to [http://localhost:8000/admin/](http://localhost:8000/admin/) and login with the superadmin credentials.

### Access the REST API

The API is available at `http://localhost:8000/api/`. Key endpoints:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/token/` | POST | Obtain JWT access + refresh tokens |
| `/api/token/refresh/` | POST | Refresh an expired access token |
| `/api/frameworks/` | GET | List all compliance frameworks |
| `/api/controls/` | GET/POST | List or create controls |
| `/api/policies/` | GET/POST/PUT/DELETE | Full policy CRUD |
| `/api/scans/` | GET | List all compliance scans |
| `/api/scan-results/` | GET | Detailed scan check results |
| `/api/risks/` | GET | Risk registry |
| `/api/wazuh-mappings/` | GET | Wazuh → Control mappings |
| `/api/audit-logs/` | GET | Audit trail |
| `/api/users/` | GET/POST | User management (Super Admin) |
| `/api/settings/` | GET/PATCH | System settings |
| `/api/departments/` | GET/POST/DELETE | Department management |
| `/api/generate-report/` | GET | Download compliance PDF |
| `/api/generate-audit-report/` | GET | Download audit trail PDF |
| `/api/trigger-scan/` | POST | Trigger manual Wazuh scan |

---

## 📧 Email Configuration

To enable email notifications (user invites, password reminders, account status):

1. Login as Super Admin
2. Go to **Settings → SMTP Configuration**
3. Enter your SMTP credentials:
   - **Host:** `smtp.gmail.com`
   - **Port:** `587`
   - **Username:** Your Gmail address
   - **Password:** [App-specific password](https://myaccount.google.com/apppasswords)
   - **Use TLS:** Enabled

---

## 👥 Authors

- **Muhammad Ali bin Asim** — Full-Stack Development
- **Hammad Chughtai** — Wazuh Integration & Security Architecture
- **Ubaid ur Rehman** — Frontend Design & Implementation

---

## 📄 License

This project was developed as a Final Year Project (FYP) at the National University of Computer and Emerging Sciences (FAST-NUCES), Islamabad.
