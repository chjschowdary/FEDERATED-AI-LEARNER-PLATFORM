# FederAI Cloud — Step-by-Step Viva & Demo Walkthrough Guide

## 1. Overview for Examiners & Evaluators

This guide outlines a scripted demonstration showcasing the full capabilities of FederAI Cloud for academic defense, investor reviews, or enterprise architecture evaluation.

---

## 2. Walkthrough Script

### Step 1: Launch the Command Center
1. Open your browser to [http://localhost:3000](http://localhost:3000).
2. Observe the futuristic glassmorphism dark-mode UI, live telemetry badges, and the top HUD displaying `Active Clients: 5`, `Global Loss: 0.693`, `Accuracy: 50.0%`, and `Status: IDLE`.

### Step 2: Observe the 5 Geographic Hospital Nodes
1. Navigate to the **Federation Map & Nodes** tab.
2. View the 5 distributed medical center nodes:
   - `client-alpha` (Mount Sinai Hospital, NY)
   - `client-beta` (Mayo Clinic, Rochester)
   - `client-gamma` (Stanford Medical Center, CA)
   - `client-delta` (Johns Hopkins Hospital, MD)
   - `client-epsilon` (Cleveland Clinic, OH)
3. Note all trust scores starting at baseline $80.0 / 100.0$ and status `ACTIVE`.

### Step 3: Run Honest Federated Training
1. Navigate to the **Training Controls** tab.
2. Set Target Rounds to `5`, Strategy to `FedAvg`, and ensure `Differential Privacy` is enabled ($\epsilon = 1.0, \delta = 10^{-5}$).
3. Click **Start Training** or **Run Single Round**.
4. Watch the real-time WebSocket state machine transition through `DISPATCHING` $\to$ `COLLECTING` $\to$ `AGGREGATING` $\to$ `EVALUATING`.
5. Observe the validation accuracy climbing from $50.0\%$ to $\approx 78-85\%$, and trust scores increasing for honest contributors.

### Step 4: Byzantine Chaos Attack Injection
1. Under **Federation Map**, select `client-delta` (Johns Hopkins Hospital).
2. Set its attack vector dropdown to **Sign Flipping** and click **Inject Threat**.
3. Select `client-epsilon` (Cleveland Clinic) and set attack vector to **Gradient Scaling (100x)**.
4. Click **Run Single Round**.

### Step 5: Byzantine Detection & Quarantine Isolation
1. Notice that `client-delta` and `client-epsilon` are instantly flagged with red threat indicators.
2. The Security Anomaly Detector identifies:
   - `client-delta`: Negative cosine similarity alignment ($\text{Sim} < 0.0$).
   - `client-epsilon`: Statistical L2-norm Z-score outlier ($Z > 3.0$).
3. Both clients have their trust scores penalized severely and are placed in **QUARANTINED** status.
4. Navigate to the **Security Center** tab to inspect the timestamped cryptographic audit logs and severity breakdown.
5. Notice that the global model accuracy is completely protected because the aggregator discarded the poisoned vectors!

### Step 6: Model Version Registry & Rollback
1. Navigate to the **Model Registry** tab.
2. Inspect the saved model checkpoints in SeaweedFS / S3 storage (`v1`, `v2`, `v3`).
3. Click **Rollback** on `v1` to demonstrate instant zero-downtime model rollbacks.

### Step 7: Cloud Infrastructure & AWS Cost Calculator
1. Navigate to the **Infrastructure** tab to inspect real-time CPU, RAM, Network, and S3 Storage metrics.
2. Navigate to the **Cost Estimator** tab to review dynamic cost forecasting across EKS, Multi-AZ RDS, S3 storage, and ALB data transfer.

### Step 8: Comprehensive Viva Q&A Review
1. Click on the **Viva & Examiner FAQ** tab in the UI or consult the comprehensive exam preparation section in `README.md`.
