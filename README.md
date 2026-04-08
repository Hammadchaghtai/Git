# GRC Platform (FYP Project)

Welcome to the Governance, Risk, and Compliance (GRC) Platform repository. This platform is designed to provide comprehensive tools and interfaces for managing organizational compliance, assessing risks, and enforcing security policies.

## 🚀 Overview

The GRC Platform is a full-stack web application designed for security monitoring and compliance management. It integrates a robust backend API, a modern reactive frontend, and external security tools (such as Wazuh) for comprehensive governance.

### **Tech Stack**

*   **Frontend**: React (built with Vite)
*   **Backend**: Django REST Framework
*   **Database**: PostgreSQL
*   **Security Integration**: Wazuh SIEM
*   **Containerization**: Docker & Docker Compose
*   **Model Context Protocol**: Postgres MCP Server

## 📁 Project Structure

```text
fyp-project/
├── backend/                # Django REST framework API and core logic
├── frontend/               # React frontend application (Vite)
├── docker-compose.yml      # Orchestrates the containers for local development
└── .gitignore              # Project-wide ignore definitions
```

## 🛠️ Getting Started

### Prerequisites

Ensure you have the following installed to run this project:
*   [Docker](https://docs.docker.com/get-docker/)
*   [Docker Compose](https://docs.docker.com/compose/install/)

### Installation & Setup

1.  **Clone the Repository**
    ```sh
    git clone <your-private-repo-url>
    cd fyp-project
    ```

2.  **Environment Variables**
    Review or add a `.env` file in the `backend/` directory with your local credentials. See the `docker-compose.yml` for default environment mappings.

3.  **Run with Docker Compose**
    Start all the necessary services (Frontend, Backend, Database, MCP server):
    ```sh
    docker compose up -d
    ```

4.  **Backend Initialization**
    On the first run, the backend container uses a waiting state (`sleep infinity`) to allow execution of migrations or startup commands:
    ```sh
    docker compose exec backend python manage.py migrate --noinput
    docker compose exec backend python manage.py runserver 0.0.0.0:8000
    ```
    Once the backend API is live, the React frontend should seamlessly connect.

5.  **Load Seed Data**
    To populate the local setup with the pre-existing project data (Users, Frameworks, Compliance Mappings), run the following command to load the fixtures:
    ```sh
    docker compose exec backend python manage.py loaddata seed_data.json
    ```

## 🔒 Security Data via Wazuh

This platform directly integrates with your Wazuh SIEM instance using the configured manager nodes for real-time risk assessment and automated alerts.

## 📜 License

This project is part of a Final Year Project (FYP). Contact the author for permissions and usage details.
