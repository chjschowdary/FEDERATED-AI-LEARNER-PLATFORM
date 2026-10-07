# FederAI Cloud — Database Schema & Data Models

## 1. Relational Architecture (PostgreSQL 16)

The platform utilizes SQLAlchemy ORM with foreign key cascades, unique constraints, and B-Tree indexes for optimal query latency.

```mermaid
erDiagram
    ORGANIZATION ||--o{ USER : contains
    ORGANIZATION ||--o{ FEDERATED_CLIENT : registers
    FEDERATED_CLIENT ||--o{ CLIENT_UPDATE : submits
    FEDERATED_CLIENT ||--o{ SECURITY_EVENT : triggers
    FEDERATION_SESSION ||--o{ TRAINING_ROUND : orchestrates
    FEDERATION_SESSION ||--o{ MODEL_VERSION : produces
    TRAINING_ROUND ||--o{ CLIENT_UPDATE : aggregates
    TRAINING_ROUND ||--o{ SECURITY_EVENT : logs
    USER ||--o{ AUDIT_LOG : initiates

    ORGANIZATION {
        string id PK
        string name
        string tier
        timestamp created_at
    }

    USER {
        string id PK
        string username UK
        string email UK
        string hashed_password
        string role
        string organization_id FK
    }

    FEDERATED_CLIENT {
        string id PK
        string client_id UK
        string name
        string organization_id FK
        float trust_score
        string status
        string current_attack
        int total_rounds_participated
    }

    FEDERATION_SESSION {
        string id PK
        string name
        string status
        int current_round
        int max_rounds
        float target_accuracy
        string strategy
    }

    TRAINING_ROUND {
        string id PK
        string session_id FK
        int round_number
        string status
        float train_loss
        float val_accuracy
        float global_trust_score
        int quarantined_count
    }

    CLIENT_UPDATE {
        string id PK
        string round_id FK
        string client_id FK
        int sample_count
        float local_loss
        float cosine_sim
        float gradient_norm
        boolean is_quarantined
    }

    MODEL_VERSION {
        string id PK
        string session_id FK
        int version_number
        string s3_key
        float validation_accuracy
        boolean is_active
    }

    SECURITY_EVENT {
        string id PK
        string client_id FK
        string event_type
        string severity
        json details
    }

    AUDIT_LOG {
        string id PK
        string user_id FK
        string action
        string resource_type
        timestamp timestamp
    }
```

---

## 2. Table Specifications

### 2.1 `organizations` & `users`
- Manages multi-tenant hospital organizations and operator user credentials.
- Passwords are encrypted using bcrypt salt rounds with strict length and complexity enforcement.

### 2.2 `federated_clients`
- Represents hospital edge compute nodes participating in training.
- Tracks dynamic Bayesian trust score ($0.0 - 100.0$), active status (`ACTIVE`, `TRAINING`, `QUARANTINED`, `OFFLINE`), and simulated adversarial modes for chaos engineering.

### 2.3 `federation_sessions` & `training_rounds`
- Tracks the lifecycle of multi-round federated training experiments.
- Records global validation accuracy, training loss, execution latency, and participation metrics per round.

### 2.4 `client_updates` & `model_versions`
- Detailed audit records of individual gradient submissions per round, including cosine alignment, gradient L2-norm, and DP noise scale.
- Model checkpoint metadata referencing immutable S3 keys with validation accuracy benchmarks.

### 2.5 `security_events` & `audit_logs`
- Append-only compliance log recording all Byzantine anomaly detections, client quarantines, model rollbacks, and administrative actions for HIPAA/SOC2 compliance.
