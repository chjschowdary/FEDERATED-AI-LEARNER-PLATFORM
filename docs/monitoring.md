# FederAI Cloud — Monitoring, Telemetry & Observability

## 1. Observability Architecture

FederAI Cloud provides deep white-box observability across machine learning convergence, Byzantine security threats, and cloud infrastructure health.

```
┌────────────────────────┐      ┌────────────────────────┐      ┌────────────────────────┐
│  FastAPI Backend Pods  │─────▶│   Prometheus Engine    │─────▶│   Grafana Dashboards   │
│ (Custom ML / FL / Sec) │      │  (Scraping :8000/metrics)│    │   (Visual Real-Time)   │
└────────────────────────┘      └────────────────────────┘      └────────────────────────┘
```

---

## 2. Exported Prometheus Metrics

The platform exports rich runtime metrics at `GET /metrics`:

| Metric Name | Type | Description |
| :--- | :--- | :--- |
| `federai_current_round` | Gauge | Active federated training round number |
| `federai_global_loss` | Gauge | Current global training loss across federation |
| `federai_global_accuracy` | Gauge | Validation accuracy of the latest aggregated global model |
| `federai_active_clients` | Gauge | Number of participating client nodes in the current round |
| `federai_quarantined_clients` | Gauge | Number of clients currently isolated in quarantine |
| `federai_byzantine_attacks_total` | Counter | Cumulative Byzantine attack vectors intercepted |
| `federai_round_duration_seconds` | Histogram | Execution latency of end-to-end training and aggregation rounds |

---

## 3. Pre-Configured Grafana Dashboard

A comprehensive dashboard is provisioned automatically at [http://localhost:3001](http://localhost:3001):
- **Federation Convergence:** Real-time dual-axis chart of Global Validation Accuracy vs. Training Loss over successive rounds.
- **Client Dynamic Trust Matrix:** Dynamic heatmap and radar tracking individual hospital trust scores ($0-100$).
- **Byzantine Security Radar:** Instant alert panel showing detected sign-inversion, gradient scaling, and noise attacks.
- **Cloud Infrastructure Telemetry:** Real-time CPU, RAM, Network I/O, S3 storage consumption, and API response time percentiles (p50, p95, p99).
