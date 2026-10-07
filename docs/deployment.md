# FederAI Cloud — Deployment Guide

## 1. Local Development Quickstart

### Prerequisites
- Python 3.11+
- Docker & Docker Compose
- Git

### 1.1 Automated Setup with Make
```bash
# Clone the repository
git clone https://github.com/federaicloud/cloud_federated.git
cd cloud_federated

# Install dependencies in virtual environment
make install

# Seed the database with default organizations, clients, and initial model
make seed

# Run the complete test suite
make test
```

### 1.2 Running via Docker Compose
To launch the full microservices stack including PostgreSQL, RabbitMQ, SeaweedFS S3 Gateway, FastAPI Backend, Nginx Frontend, Prometheus, and Grafana:

```bash
docker compose up -d
```

Verify service status:
```bash
docker compose ps
```

Access services:
- **FederAI Command Center (Web UI):** [http://localhost:3000](http://localhost:3000)
- **FastAPI OpenAPI Interactive Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)
- **SeaweedFS S3 Gateway API:** [http://localhost:8333](http://localhost:8333)
- **RabbitMQ Management UI:** [http://localhost:15672](http://localhost:15672) (User: `guest`, Pass: `guest`)
- **Prometheus Metrics Engine:** [http://localhost:9090](http://localhost:9090)
- **Grafana Observability Dashboard:** [http://localhost:3001](http://localhost:3001) (User: `admin`, Pass: `admin`)

---

## 2. Default Seed Credentials

| Role | Username | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **System Administrator** | `admin` | `AdminPassword123!` | Full platform control, RBAC, sessions, and client operations |
| **Federation Operator** | `operator` | `OperatorPass123!` | Training orchestration, attack simulation, unquarantine |
| **Compliance Auditor** | `auditor` | `AuditorPass123!` | Read-only access to audit logs, security events, models |
| **Hospital Alpha Client** | `client_alpha` | `ClientAlpha123!` | Client node telemetry and gradient submission |
