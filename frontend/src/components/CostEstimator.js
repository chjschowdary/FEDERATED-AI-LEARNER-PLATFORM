import { api } from '../services/api.js';

export function renderCostEstimator(container) {
  let nodes = 3;
  let storageGb = 100;
  let monthlyReqs = 5.0;

  async function updateCost() {
    try {
      const data = await api.getCostEstimate(nodes, storageGb, monthlyReqs);
      
      const breakdown = data.breakdown || {};
      document.getElementById('cost-total').textContent = `$${data.monthly_total_usd.toFixed(2)}`;
      document.getElementById('cost-eks').textContent = `$${breakdown.eks_control_plane.toFixed(2)}`;
      document.getElementById('cost-ec2').textContent = `$${breakdown.worker_nodes_ec2.toFixed(2)}`;
      document.getElementById('cost-rds').textContent = `$${breakdown.managed_rds_postgresql.toFixed(2)}`;
      document.getElementById('cost-s3').textContent = `$${breakdown.s3_object_storage.toFixed(2)}`;
      document.getElementById('cost-alb').textContent = `$${breakdown.application_load_balancer.toFixed(2)}`;
      document.getElementById('cost-cw').textContent = `$${breakdown.cloudwatch_monitoring_logs.toFixed(2)}`;
    } catch (err) {
      console.error('Cost estimate error:', err);
    }
  }

  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
      <div>
        <h2 style="font-size: 1.5rem; color: var(--text-primary);">Cloud Cost & Resource Estimation</h2>
        <p style="font-size: 0.875rem; color: var(--text-muted);">Transparent, configurable AWS reference cost model for enterprise federated AI deployment.</p>
      </div>
      <div>
        <span class="badge badge-cyan">AWS Pricing Reference: us-east-1</span>
      </div>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
      <!-- Interactive Sliders Form -->
      <div class="glass-panel" style="padding: 24px;">
        <h3 style="font-size: 1.15rem; margin-bottom: 20px;">Workload Capacity Parameters</h3>

        <div class="form-group" style="margin-bottom: 24px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <label class="form-label">EKS Worker Nodes (m6i.large: 2 vCPU, 8GB)</label>
            <strong class="mono" id="val-nodes" style="color: var(--accent-sky);">3 Nodes</strong>
          </div>
          <input type="range" id="range-nodes" min="1" max="15" value="3">
        </div>

        <div class="form-group" style="margin-bottom: 24px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <label class="form-label">S3 Artifact & Model Storage</label>
            <strong class="mono" id="val-storage" style="color: var(--accent-sky);">100 GB</strong>
          </div>
          <input type="range" id="range-storage" min="10" max="2000" step="50" value="100">
        </div>

        <div class="form-group" style="margin-bottom: 24px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <label class="form-label">Monthly Ingress Gradient Requests</label>
            <strong class="mono" id="val-reqs" style="color: var(--accent-sky);">5.0 Million</strong>
          </div>
          <input type="range" id="range-reqs" min="0.5" max="50" step="0.5" value="5.0">
        </div>
      </div>

      <!-- Cost Summary Card -->
      <div class="glass-panel" style="padding: 24px; display: flex; flex-direction: column; justify-content: space-between;">
        <div>
          <div style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase;">Estimated Monthly Expenditure</div>
          <div id="cost-total" style="font-size: 2.8rem; font-weight: 800; color: var(--accent-emerald); font-family: var(--font-mono); margin: 8px 0 20px;">
            $514.88
          </div>

          <table class="data-table">
            <tbody>
              <tr>
                <td>Amazon EKS Control Plane</td>
                <td class="mono" id="cost-eks" style="text-align: right;">$73.00</td>
              </tr>
              <tr>
                <td>EC2 Compute Instances (m6i.large)</td>
                <td class="mono" id="cost-ec2" style="text-align: right;">$210.24</td>
              </tr>
              <tr>
                <td>Managed Amazon RDS PostgreSQL (db.m6g.large Multi-AZ)</td>
                <td class="mono" id="cost-rds" style="text-align: right;">$180.00</td>
              </tr>
              <tr>
                <td>Amazon S3 Model Weights Storage</td>
                <td class="mono" id="cost-s3" style="text-align: right;">$4.30</td>
              </tr>
              <tr>
                <td>Application Load Balancer (ALB + LCU)</td>
                <td class="mono" id="cost-alb" style="text-align: right;">$28.00</td>
              </tr>
              <tr>
                <td>Amazon CloudWatch & Prometheus Telemetry</td>
                <td class="mono" id="cost-cw" style="text-align: right;">$22.50</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  // Attach slider event listeners
  const rNodes = document.getElementById('range-nodes');
  const rStorage = document.getElementById('range-storage');
  const rReqs = document.getElementById('range-reqs');

  rNodes?.addEventListener('input', (e) => {
    nodes = parseInt(e.target.value);
    document.getElementById('val-nodes').textContent = `${nodes} Nodes`;
    updateCost();
  });

  rStorage?.addEventListener('input', (e) => {
    storageGb = parseInt(e.target.value);
    document.getElementById('val-storage').textContent = `${storageGb} GB`;
    updateCost();
  });

  rReqs?.addEventListener('input', (e) => {
    monthlyReqs = parseFloat(e.target.value);
    document.getElementById('val-reqs').textContent = `${monthlyReqs.toFixed(1)} Million`;
    updateCost();
  });

  updateCost();
}
