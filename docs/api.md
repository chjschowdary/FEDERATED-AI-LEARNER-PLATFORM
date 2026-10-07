# FederAI Cloud — REST & WebSocket API Specification

## 1. Authentication & Security

All protected REST API endpoints require a standard Bearer Token header:
```http
Authorization: Bearer <JWT_ACCESS_TOKEN>
```

Tokens are obtained via the `POST /api/auth/token` OAuth2 password flow.

---

## 2. API Endpoints

### 2.1 Authentication & Status
- **`POST /api/auth/token`**
  - Authenticates users with username/password and returns JWT access token and role.
- **`GET /api/auth/me`**
  - Returns authenticated user profile, role, and organization.
- **`GET /api/federation/status`**
  - Returns comprehensive real-time HUD status: active session, current round, global accuracy, convergence rate, trust score, and active clients.

### 2.2 Federation Orchestration
- **`POST /api/federation/session/start`**
  - Starts or advances federated training rounds.
  - Body: `{"max_rounds": 20, "target_accuracy": 0.88, "strategy": "FedAvg", "dp_enabled": true}`
- **`POST /api/federation/session/pause`**
  - Pauses ongoing federated training.
- **`POST /api/federation/session/reset`**
  - Resets training session and models back to Round 0 baseline.
- **`POST /api/federation/round/execute`**
  - Synchronously executes a single discrete training round (useful for step-by-step demonstration and debugging).

### 2.3 Client Management & Threat Injection
- **`GET /api/federation/clients`**
  - Lists all registered federated clients with trust scores and statuses.
- **`POST /api/federation/clients/{id}/attack`**
  - Sets simulated attack vector on a client node for Byzantine chaos testing (`none`, `sign_flip`, `gradient_scale`, `noise_blast`, `label_flip`).
- **`POST /api/federation/clients/{id}/unquarantine`**
  - Reinstates a quarantined client node with restored trust baseline.

### 2.4 Model Registry & Checkpoints
- **`GET /api/federation/models`**
  - Lists all registered global model checkpoints with accuracy metrics and S3 object keys.
- **`POST /api/federation/models/{version}/rollback`**
  - Reverts the active global model to a previous stable checkpoint version.

### 2.5 Security, Analytics & Infrastructure
- **`GET /api/federation/security/events`**
  - Returns recent Byzantine threat detections and quarantine logs.
- **`GET /api/federation/infrastructure/metrics`**
  - Returns live telemetry on CPU, Memory, Network, S3 Storage, and Database IOPS.
- **`GET /api/federation/cost/estimate`**
  - Returns calculated AWS monthly and per-round infrastructure cost breakdowns.
- **`GET /api/federation/audit/logs`**
  - Returns immutable administrative audit trail.

---

## 3. Real-Time WebSocket API

- **Endpoint:** `ws://localhost:8000/api/ws`
- **Events Emitted by Server:**
  - `round_started`: Dispatched when coordinator initiates round.
  - `client_submitted`: Dispatched when client submits local update.
  - `security_quarantine`: Dispatched when Byzantine detector quarantines a malicious node.
  - `round_completed`: Dispatched when aggregator updates global model with new loss and accuracy.
