# FederAI Cloud — System Architecture

## 1. Executive Summary

**FederAI Cloud** is an enterprise-grade, cloud-native platform designed to orchestrate privacy-preserving, Byzantine-resilient Federated Machine Learning across distributed, heterogeneous client environments. 

Under traditional centralized AI workflows, raw sensitive data (such as electronic health records, financial transactions, or proprietary client metrics) must be gathered into a central data lake for model training. This poses grave regulatory compliance risks (HIPAA, GDPR, CCPA) and opens massive attack vectors for catastrophic data leaks.

FederAI Cloud reverses this paradigm: **the model travels to the data; only sanitized gradient updates travel back.**

```
                                 ┌────────────────────────────────────────────────┐
                                 │              FederAI Cloud Platform            │
                                 │                                                │
 ┌────────────────────────┐      │  ┌──────────────┐         ┌─────────────────┐  │
 │  Federated Hospital A  │─────▶│  │  API Gateway │◀───────▶│   Coordinator   │  │
 │   (Private EHR Data)   │      │  │  (FastAPI)   │         │ (State Machine) │  │
 └────────────────────────┘      │  └───────┬──────┘         └────────┬────────┘  │
                                 │          │                         │           │
 ┌────────────────────────┐      │          ▼                         ▼           │
 │  Federated Hospital B  │─────▶│  ┌──────────────┐         ┌─────────────────┐  │
 │   (Private EHR Data)   │      │  │   Security   │◀───────▶│   Aggregator    │  │
 └────────────────────────┘      │  │ (Trust & DP) │         │ (FedAvg / Krum) │  │
                                 │  └──────────────┘         └────────┬────────┘  │
 ┌────────────────────────┐      │                                    │           │
 │  Federated Hospital C  │─────▶│  ┌──────────────┐         ┌────────▼────────┐  │
 │   (Private EHR Data)   │      │  │ PostgreSQL DB│         │  S3 / SeaweedFS │  │
 └────────────────────────┘      │  │  (Metadata)  │         │ (Model Weights) │  │
                                 │  └──────────────┘         └─────────────────┘  │
                                 └────────────────────────────────────────────────┘
```

---

## 2. Core Subsystems

### 2.1 API Gateway & Ingress Layer
- **Tech Stack:** FastAPI, Uvicorn, Python 3.11.
- **Responsibilities:**
  - Terminates TLS/HTTP and WebSocket connections.
  - Enforces JSON Web Token (JWT) cryptographic authentication and Role-Based Access Control (RBAC).
  - Emits real-time SSE / WebSocket state events (`round_started`, `client_submitted`, `round_completed`, `security_quarantine`).
  - Serves Prometheus runtime metrics at `/metrics`.

### 2.2 Orchestration Coordinator
- **Responsibilities:**
  - Manages the lifecycle of federated training sessions and discrete training rounds.
  - Implements the formal Round State Machine:
    $$\text{IDLE} \longrightarrow \text{INITIALIZING} \longrightarrow \text{DISPATCHING} \longrightarrow \text{COLLECTING} \longrightarrow \text{AGGREGATING} \longrightarrow \text{EVALUATING} \longrightarrow \text{COMPLETED}$$
  - Coordinates client synchronization, gradient timeouts, and fallback policies.

### 2.3 Byzantine-Resilient Aggregator
- **Responsibilities:**
  - Aggregates client parameter deltas into a new global model checkpoint.
  - Supports multiple aggregation strategies:
    1. **FedAvg (Federated Averaging):** Sample-weighted linear combination.
    2. **Trimmed Mean:** Coordinate-wise $\beta$-fraction outlier truncation.
    3. **Multi-Krum:** Pairwise Euclidean distance minimization for Byzantine resilience against $(2f+2)$ attackers.
    4. **Coordinate-wise Median:** Robust median aggregation across individual parameter dimensions.

### 2.4 Security & Anomaly Detection Engine
- **Responsibilities:**
  - **Vector Anomaly Detection:** Computes directional cosine similarity between local client update vectors $\Delta w_k$ and the collective consensus gradient vector $\Delta w_{\text{consensus}}$.
  - **Magnitude Anomaly Detection:** Calculates dynamic Z-scores on gradient L2-norms:
    $$Z_k = \frac{\|\Delta w_k\|_2 - \mu_{\|\Delta w\|}}{\sigma_{\|\Delta w\|} + \epsilon}$$
  - **Bayesian Dynamic Trust Scoring:** Maintains an adaptive $0-100$ trust score per participant, automatically applying severe penalties and quarantine isolating malicious nodes.

### 2.5 Differential Privacy Engine
- **Responsibilities:**
  - Calculates L2-norm gradient clipping threshold $C$:
    $$\bar{g} = g \cdot \min\left(1, \frac{C}{\|g\|_2}\right)$$
  - Injects calibrated Gaussian or Laplace noise according to $(\epsilon, \delta)$ privacy parameters:
    $$\sigma = \frac{\sqrt{2 \ln(1.25/\delta)} \cdot C}{\epsilon}$$
  - Tracks privacy budget depletion via the Moments Accountant simulator.

### 2.6 Persistence & Model Registry Layer
- **PostgreSQL 16:** Relational storage for organizations, client nodes, sessions, training rounds, audit logs, and security quarantine events.
- **S3-Compatible Object Store (SeaweedFS / AWS S3):** Immutable versioned storage for global model checkpoints (`v1`, `v2`, etc.) and client gradient artifacts with automatic rollback capability.
