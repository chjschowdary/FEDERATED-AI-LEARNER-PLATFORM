export function renderVivaReview(container) {
  const topics = [
    {
      tag: "FEDERATED LEARNING",
      q: "How does FederAI Cloud train AI across multiple hospitals without exposing private clinical datasets?",
      a: "FederAI Cloud adopts the federated learning paradigm: raw patient records remain strictly within on-premise hospital environments. Only parameter updates (weight deltas) are transmitted to the cloud aggregator. The server computes a consensus model using Byzantine-robust Federated Averaging (FedAvg / Trimmed Mean) and broadcasts the improved global weights back to all participants."
    },
    {
      tag: "DIFFERENTIAL PRIVACY",
      q: "How does Differential Privacy guarantee protection against model inversion & membership inference attacks?",
      a: "Even gradient updates can theoretically leak subtle statistical patterns about training samples. FederAI Cloud applies (epsilon, delta)-Differential Privacy: each local gradient vector is bounded via L2-norm clipping (max sensitivity S) and perturbed with calibrated Gaussian noise. This ensures no single patient record can significantly sway the model weights beyond a provable mathematical privacy budget."
    },
    {
      tag: "BYZANTINE ROBUSTNESS",
      q: "How does the platform detect and neutralize malicious poisoned gradient attacks (e.g., Hospital Delta)?",
      a: "The Aggregation Worker executes multi-metric anomaly detection: (1) Cosine similarity alignment against the median consensus vector, (2) Statistical L2-norm Z-score outlier thresholding, and (3) Byzantine-resilient algorithms (Trimmed Mean and Krum). Updates exhibiting inverted directions or abnormal norms are quarantined immediately and client trust scores are penalized."
    },
    {
      tag: "DYNAMIC TRUST SCORING",
      q: "How is the explainable trust score calculated for each participating client?",
      a: "Every client maintains a Bayesian trust score [0-100]. Honest rounds conforming to federation consensus yield incremental reward (+2 to +4 pts). Detected anomalies or gradient inversions incur severe penalties (-35 to -60 pts proportional to threat confidence). Clients falling below 50 are classified as HIGH RISK / QUARANTINED and excluded from aggregation."
    },
    {
      tag: "SECURE AGGREGATION",
      q: "How does Zero-Sum Cryptographic Masking prevent the central server from inspecting individual updates?",
      a: "FederAI Cloud implements pairwise random blinding masks (r_ij = -r_ji) between clients. Each client adds its combined masks to its local gradient update. When the server aggregates all masked updates, the pairwise masks cancel out algebraically to zero, yielding the exact global sum while keeping every individual update completely hidden."
    },
    {
      tag: "KUBERNETES & HPA",
      q: "How does the cloud infrastructure scale and recover from worker node failures?",
      a: "All microservices (API Gateway, Coordinator, Aggregator, Security) are containerized and deployed as Kubernetes Deployments with Horizontal Pod Autoscalers (HPA) targeting 70% CPU. Liveness and readiness health probes automatically replace unhealthy or crashed pods with zero downtime behind the Application Load Balancer."
    },
    {
      tag: "TERRAFORM IAC",
      q: "How is the cloud infrastructure provisioned reproducibly?",
      a: "Infrastructure as Code is specified in Terraform using AWS as the reference cloud. Terraform provisions the VPC (public/private subnets, NAT gateways, security groups), Amazon EKS Kubernetes Cluster, managed Multi-AZ RDS PostgreSQL database, S3 Object Storage with IAM access policies, and Application Load Balancer."
    },
    {
      tag: "MODEL REGISTRY & ROLLBACK",
      q: "What disaster recovery and lineage tracking mechanisms exist for trained models?",
      a: "Every training round registers an immutable ModelVersion checkpoint in PostgreSQL metadata and S3 object storage with lineage links (accuracy, loss, participants, epsilon). If a post-aggregation anomaly or performance degradation is discovered, administrators can trigger an instant single-click Model Rollback to restore the previous stable production model."
    },
    {
      tag: "OBSERVABILITY & TRACING",
      q: "How are metrics and audit trails captured across distributed services?",
      a: "Prometheus scrapes standard metrics (/metrics endpoint) tracking request counts, round latency histograms, and global accuracy gauges. Immutable audit logs record every privileged action (logins, round triggers, quarantines, rollbacks) with timestamps, actor IDs, and IP addresses in PostgreSQL."
    },
    {
      tag: "NON-IID DATASETS",
      q: "How does FederAI Cloud handle Non-IID (Non-Independent and Identically Distributed) data across hospitals?",
      a: "In real-world healthcare, hospitals serve distinct demographics (e.g. Hospital Alpha specializes in cardiology, Hospital Beta in geriatrics). FederAI Cloud generates realistic non-IID clinical feature distributions and provides FedProx / Trimmed Mean aggregation algorithms designed specifically to maintain stability and prevent divergence under non-IID client skew."
    }
  ];

  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
      <div>
        <h2 style="font-size: 1.5rem; color: var(--text-primary);">Viva Examination & Architecture Defense Guide</h2>
        <p style="font-size: 0.875rem; color: var(--text-muted);">Comprehensive architectural explanations, mathematical formulations, and cloud-native concepts for viva review.</p>
      </div>
      <div>
        <span class="badge badge-purple">10 Key Architectural Concepts</span>
      </div>
    </div>

    <div class="viva-grid">
      ${topics.map((t, idx) => `
        <div class="glass-panel viva-card">
          <div>
            <div class="viva-header">
              <span class="viva-tag">${t.tag}</span>
              <span class="mono" style="font-size: 0.75rem; color: var(--text-muted);">#0${idx + 1}</span>
            </div>
            <div class="viva-q">${t.q}</div>
          </div>
          <div class="viva-a">${t.a}</div>
        </div>
      `).join('')}
    </div>
  `;
}
