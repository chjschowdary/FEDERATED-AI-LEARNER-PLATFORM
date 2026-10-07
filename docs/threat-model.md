# FederAI Cloud — Threat Model & Attack Vector Resilience

## 1. Adversary Capabilities & Threat Taxonomy

FederAI Cloud operates under the assumption of a Byzantine threat environment where up to $f < K/2$ participating nodes may be compromised, malicious, or misconfigured.

```
┌────────────────────────────────────────────────────────────────────────┐
│                      Federated AI Attack Vectors                       │
├──────────────────────┬──────────────────────┬──────────────────────────┤
│   Data Poisoning     │   Model Poisoning    │   Inference Attacks      │
├──────────────────────┼──────────────────────┼──────────────────────────┤
│ • Label Flipping     │ • Sign Inversion     │ • Membership Inference   │
│ • Feature Perturb.   │ • Gradient Scaling   │ • Model Inversion        │
│ • Backdoor Triggers  │ • Random Noise Blast │ • Reconstruction Attack  │
└──────────────────────┴──────────────────────┴──────────────────────────┘
```

---

## 2. Implemented Attack Vectors

FederAI Cloud includes live simulation harnesses for the following adversarial behaviors:

### 2.1 Sign-Inversion Attack (Sign Flipping)
- **Mechanism:** The attacker inverts the direction of their computed gradient vector:
  $$\Delta w_{\text{malicious}} = -\alpha \cdot \Delta w_{\text{honest}}, \quad \alpha \ge 1.0$$
- **Objective:** Actively degrades global model convergence and forces the optimization path toward catastrophic loss regions.
- **Detection:** Fails Cosine Alignment Check ($\text{Cosine Sim} < 0.0$).

### 2.2 Gradient Scaling Attack
- **Mechanism:** The attacker scales their gradient update by a factor of $\gamma \in [10, 1000]$:
  $$\Delta w_{\text{malicious}} = \gamma \cdot \Delta w_{\text{honest}}$$
- **Objective:** Overwhelms the linear combination in standard FedAvg, dominating the consensus model with malicious weights.
- **Detection:** Fails Statistical L2-Norm Z-Score Check ($Z_k > 3.0$).

### 2.3 Random Gaussian Noise Blast
- **Mechanism:** Replaces the gradient with high-variance Gaussian white noise:
  $$\Delta w_{\text{malicious}} \sim \mathcal{N}\left(0, \sigma_{\text{blast}}^2 \mathbf{I}\right)$$
- **Objective:** Destabilizes SGD momentum buffers and causes gradient divergence.
- **Detection:** Fails both Cosine Similarity and L2-Norm variance thresholds.

### 2.4 Label-Flipping Data Poisoning
- **Mechanism:** Malicious hospital flips class labels locally during training ($y \leftarrow 1 - y$).
- **Objective:** Induces stealthy misclassification on specific target cohorts while maintaining normal gradient magnitudes.
- **Detection:** Detected via localized validation discrepancy and Krum distance clustering.

---

## 3. Defense & Mitigation Matrix

| Threat Vector | Primary Defense | Fallback Defense | Performance Impact |
| :--- | :--- | :--- | :--- |
| **Sign Flipping** | Cosine Similarity Threshold ($\ge 0.0$) | Trimmed Mean / Coordinate Median | Zero false positives on honest nodes |
| **Gradient Scaling** | L2-Norm Z-Score Outlier Filter ($Z \le 3.0$) | Gradient Clipping ($C=1.0$) | Discards updates $> 3\sigma$ from median |
| **Noise Blasting** | Cosine + Norm Joint Filter | Multi-Krum Selection | Malicious nodes quarantined in 1 round |
| **Label Flipping** | Dynamic Bayesian Trust Scoring | Holdout Set Validation | Isolates client within 2-3 rounds |
| **Membership Inference** | DP-SGD Gaussian Noise Injection | Gradient Clipping | Bounded privacy leakage ($\epsilon \le 1.0$) |
