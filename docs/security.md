# FederAI Cloud — Security Architecture & Privacy Safeguards

## 1. Multi-Layer Defense in Depth

FederAI Cloud incorporates cryptographic, algorithmic, and dynamic statistical defenses across all architectural layers.

```
┌────────────────────────────────────────────────────────────┐
│ Layer 4: Role-Based Access Control (RBAC) & Audit Logging   │
├────────────────────────────────────────────────────────────┤
│ Layer 3: Dynamic Bayesian Trust Scoring & Quarantine       │
├────────────────────────────────────────────────────────────┤
│ Layer 2: Vector Alignment & Outlier Anomaly Detection      │
├────────────────────────────────────────────────────────────┤
│ Layer 1: Differential Privacy (DP-SGD) & Secure Masking    │
└────────────────────────────────────────────────────────────┘
```

---

## 2. Algorithmic Differential Privacy ($\epsilon, \delta$)

To mathematically prevent membership inference and training data reconstruction attacks from gradient inspection, FederAI Cloud enforces **Local Differential Privacy (LDP)** via Gaussian and Laplace perturbation mechanisms.

### 2.1 Gradient L2-Norm Clipping
Before adding noise, each client's gradient vector $g_k = \nabla F_k(w)$ is clipped to a bounded L2-norm threshold $C$:

$$\bar{g}_k = g_k \cdot \min\left(1, \frac{C}{\|g_k\|_2}\right)$$

This establishes a strict upper bound on the global sensitivity $\Delta S = \frac{2C}{n_k}$.

### 2.2 Gaussian Mechanism
Noise sampled from a zero-mean Gaussian distribution is added to the clipped gradient:

$$\tilde{g}_k = \bar{g}_k + \mathcal{N}\left(0, \sigma^2 \mathbf{I}\right), \quad \text{where } \sigma = \frac{C \sqrt{2 \ln(1.25 / \delta)}}{\epsilon}$$

The mechanism satisfies $(\epsilon, \delta)$-Differential Privacy for any query over neighboring clinical datasets $\mathcal{D}, \mathcal{D}'$ differing by a single patient record:

$$\mathbb{P}\left[\mathcal{M}(\mathcal{D}) \in \mathcal{S}\right] \le e^\epsilon \cdot \mathbb{P}\left[\mathcal{M}(\mathcal{D}') \in \mathcal{S}\right] + \delta$$

### 2.3 Privacy Budget Accounting
The platform continuously tracks cumulative privacy loss $\epsilon_{\text{total}}$ per client across successive rounds using the **Moments Accountant**, halting training when the user-defined privacy budget threshold is exhausted.

---

## 3. Dynamic Bayesian Trust Engine

Every registered client node possesses a dynamic trust score $T_k \in [0, 100]$, initialized at baseline $T_0 = 80.0$.

### 3.1 Bayesian Update Mechanics
Following each training round $t$:
- **Honest Contribution:** If update $\Delta w_k$ passes all directional and magnitude anomaly checks, trust increases:
  $$T_k^{(t+1)} = \min\left(100, T_k^{(t)} + \alpha_{\text{reward}} \cdot \text{Sim}(\Delta w_k, \Delta w_{\text{consensus}})\right)$$
- **Adversarial / Poisoning Event:** If update $\Delta w_k$ is identified as an attack vector, trust is severely penalized:
  $$T_k^{(t+1)} = \max\left(0, T_k^{(t)} - \beta_{\text{penalty}} \cdot \left(1 + Z_{\text{norm}}\right)\right)$$

### 3.2 Automated Quarantine Policy
- When $T_k < 40.0$, the client is automatically placed into **QUARANTINED** status.
- Its gradient update is immediately discarded from the aggregation pool, and an alert is broadcast via WebSockets to security operators.
- Quarantined clients can only be reinstated through manual cryptographic authorization by an operator (`POST /api/federation/clients/{id}/unquarantine`).
