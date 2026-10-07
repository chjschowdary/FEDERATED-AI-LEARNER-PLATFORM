# FederAI Cloud — Federated Learning Engine & Mathematical Foundations

## 1. Problem Formulation

Let $K$ denote the set of participating client nodes (e.g., hospitals or clinical research centers), where each client $k \in \{1, \dots, K\}$ possesses a private local dataset $\mathcal{D}_k = \{(x_i, y_i)\}_{i=1}^{n_k}$ with $n_k = |\mathcal{D}_k|$ samples. The total number of distributed samples across the federation is $N = \sum_{k=1}^K n_k$.

The objective of federated learning is to minimize the global empirical risk function $F(w)$ over model parameters $w \in \mathbb{R}^d$ without sharing raw data:

$$\min_{w \in \mathbb{R}^d} F(w) \triangleq \sum_{k=1}^K \frac{n_k}{N} F_k(w)$$

where the local loss on client $k$ is defined as:

$$F_k(w) = \frac{1}{n_k} \sum_{i \in \mathcal{D}_k} \ell(f(x_i; w), y_i)$$

---

## 2. Aggregation Algorithms

FederAI Cloud implements four robust aggregation operators:

### 2.1 Federated Averaging (FedAvg)
Standard baseline proposed by McMahan et al. (2017). The server updates global weights $w^{(t+1)}$ as a weighted linear combination of local client parameters $w_k^{(t+1)}$:

$$w^{(t+1)} = \sum_{k \in \mathcal{S}_t} \frac{n_k}{N_t} w_k^{(t+1)}$$

where $\mathcal{S}_t \subseteq \{1, \dots, K\}$ is the set of active participants in round $t$ and $N_t = \sum_{k \in \mathcal{S}_t} n_k$.

### 2.2 Trimmed Mean
For each parameter coordinate $j \in \{1, \dots, d\}$, the server sorts the updates $\{w_{k, j}\}_{k=1}^K$, trims the smallest and largest $\beta$-fraction ($0 \le \beta < 0.5$), and averages the remaining components:

$$w_j^{(t+1)} = \frac{1}{(1 - 2\beta)K} \sum_{k \in \mathcal{U}_j} w_{k, j}$$

**Resilience:** Tolerates up to $\beta K$ Byzantine malicious nodes attempting extreme gradient poisoning.

### 2.3 Multi-Krum
Selects the update vector(s) that minimize the sum of Euclidean distances to their $K - f - 2$ closest neighbors, where $f$ is the maximum number of Byzantine adversaries:

$$k^* = \arg\min_{i \in \{1, \dots, K\}} \sum_{j \in \mathcal{N}_i} \|w_i - w_j\|_2^2$$

where $\mathcal{N}_i$ represents the $K - f - 2$ closest update vectors to $w_i$. Multi-Krum averages the top $m$ candidates with the lowest Krum scores.

### 2.4 Coordinate-Wise Median
Computes the median value independently along every parameter dimension $j$:

$$w_j^{(t+1)} = \text{median}\left(w_{1, j}^{(t+1)}, w_{2, j}^{(t+1)}, \dots, w_{K, j}^{(t+1)}\right)$$

---

## 3. Deep Learning Architecture: Clinical Risk MLP

FederAI Cloud evaluates distributed federated optimization on a custom deep Multi-Layer Perceptron (`ClinicalRiskMLP`):

- **Input Dimension:** 12 normalized clinical biomarkers (Age, Systolic BP, Diastolic BP, Glucose, Total Cholesterol, HDL, LDL, Heart Rate, Respiration Rate, SpO2, BMI, High-Sensitivity CRP).
- **Architecture:** $12 \xrightarrow{\text{Dense + ReLU}} 24 \xrightarrow{\text{Dense + ReLU}} 12 \xrightarrow{\text{Dense + Softmax}} 2$ (Binary Clinical Risk Prediction).
- **Parameter Count:** 662 trainable weights and biases.
- **Optimization:** Mini-batch SGD with momentum and weight decay.
- **Non-IID Partitioning:** 5 hospital partitions with Dirichlet distribution skew ($\alpha = 0.5$) modeling real-world clinical demographic variability.
