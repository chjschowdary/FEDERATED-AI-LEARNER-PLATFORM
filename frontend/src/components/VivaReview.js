export function renderVivaReview(container) {
  const topics = [
    {
      tag: "FEDERATED LEARNING",
      q: "How does FedNexus train clinical AI across multiple medical centers without centralizing private datasets?",
      a: "FedNexus adheres strictly to the federated learning paradigm: synthetic patient health records remain isolated in each medical center's database enclave. Only local parameter updates (weight deltas) are transmitted to the cloud coordinator. The coordinator computes a global consensus model using Byzantine-robust Federated Averaging (FedAvg / Trimmed Mean / Multi-Krum) and broadcasts the improved weights back to all participants."
    },
    {
      tag: "DIFFERENTIAL PRIVACY",
      q: "How does Differential Privacy guarantee protection against model inversion & membership inference?",
      a: "Even gradient updates can theoretically leak subtle statistical patterns about training samples. FedNexus applies (epsilon, delta)-Differential Privacy (DP-SGD): each local gradient vector is bounded via L2-norm clipping (max sensitivity C) and perturbed with calibrated Gaussian noise. This guarantees mathematically that the presence or absence of any single patient's record cannot be inferred from the model."
    },
    {
      tag: "BYZANTINE ROBUSTNESS",
      q: "How does the platform detect and neutralize malicious poisoned gradient attacks (e.g., Hospital Delta)?",
      a: "The coordinator executes multi-tiered anomaly detection: (1) Directional Cosine Alignment against the median consensus vector, (2) Statistical L2-norm Z-score outlier filtering, and (3) Byzantine-resilient aggregation algorithms (Trimmed Mean and Multi-Krum). Updates with negative cosine similarity or excessive norms are quarantined immediately and client trust scores are downgraded."
    },
    {
      tag: "DYNAMIC TRUST SCORING",
      q: "How is the explainable trust score calculated for each participating client?",
      a: "Each client node maintains an adaptive Bayesian trust score [0-100]. Honest rounds conforming to consensus award incremental reward (+2 to +4 pts). Detected anomalies or gradient inversions incur severe penalties (-35 to -60 pts proportional to threat confidence). Clients falling below 40 are classified as QUARANTINED and excluded from aggregation."
    },
    {
      tag: "SECURE AGGREGATION",
      q: "How does Zero-Sum Masking prevent the central server from inspecting individual updates?",
      a: "FedNexus implements pairwise random blinding masks (r_ij = -r_ji) between clients. Each client adds its combined masks to its local gradient update. When the server aggregates all masked updates, the pairwise masks cancel out algebraically to zero, yielding the exact global sum while keeping every individual update completely hidden."
    },
    {
      tag: "KUBERNETES & RESILIENCE",
      q: "How does the cloud infrastructure scale and recover from worker pod failures?",
      a: "All microservices (API Gateway, Coordinator, Aggregator, Security) are containerized with Kubernetes Deployments and Horizontal Pod Autoscalers (HPA). Liveness and readiness health probes automatically replace unhealthy or crashed pods with zero downtime behind the Application Load Balancer (ALB)."
    },
    {
      tag: "MODEL REGISTRY & ROLLBACK",
      q: "What disaster recovery and lineage tracking mechanisms exist for trained models?",
      a: "Every training round registers an immutable ModelVersion checkpoint in PostgreSQL metadata and S3 object storage with lineage links (accuracy, loss, participants, epsilon). If a post-aggregation anomaly or performance degradation is discovered, administrators can trigger an instant single-click Model Rollback to restore the previous stable production model."
    },
    {
      tag: "CLINICAL DATA ENCLAVES",
      q: "How is the 12-dimensional ClinicalRiskMLP feature space structured in PostgreSQL?",
      a: "Each synthetic patient record includes non-identifying demographics (age, sex) and 12 continuous clinical parameters (systolic/diastolic BP, fasting glucose, cholesterol, HDL/LDL ratio, BMI, troponin I, creatinine, CRP, resting HR, SpO2). These map directly to the normalized feature vector used by the neural network."
    }
  ];

  container.innerHTML = `
    <div class="page-header">
      <div>
        <h2 class="page-title">Technical Viva & Architectural Defense Reference</h2>
        <p class="page-description">Core mathematical principles, Byzantine defense mechanisms, and cloud-native architecture concepts for project examination.</p>
      </div>
      <span class="badge badge-neutral">${topics.length} Architecture Concepts</span>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
      ${topics.map((t, idx) => `
        <div class="card">
          <div class="card-header">
            <span class="badge badge-neutral" style="font-size: 0.72rem; letter-spacing: 0.04em;">${t.tag}</span>
            <span class="mono" style="font-size: 0.72rem; color: var(--text-muted);">#0${idx + 1}</span>
          </div>
          <div class="card-body">
            <h4 style="font-size: 0.95rem; margin-bottom: 8px; color: var(--text-primary); font-weight: 600;">
              ${t.q}
            </h4>
            <p style="font-size: 0.82rem; color: var(--text-secondary); line-height: 1.6;">
              ${t.a}
            </p>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}
