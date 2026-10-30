import { api } from '../services/api.js';

export async function renderInfrastructureSettings(container, state) {
  container.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: center; padding: 60px;">
      <div style="width: 28px; height: 28px; border-radius: 50%; border: 2px solid var(--border-default); border-top-color: var(--accent-primary); animation: spin 0.8s linear infinite;"></div>
    </div>
  `;

  try {
    const [infraData, settingsData, costData] = await Promise.all([
      api.getInfrastructureHealth().catch(() => ({ services: [] })),
      api.getSettings().catch(() => ({})),
      api.getCostEstimate(3, 100, 5.0).catch(() => null)
    ]);

    const services = infraData.services || [];
    const user = settingsData.user || api.user || {};
    const federation = settingsData.federation || {};
    const dbInfo = settingsData.database || {};
    const storageInfo = settingsData.storage || {};

    let currentCost = costData || { monthly_total_usd: 375.58, breakdown: {} };

    container.innerHTML = `
      <div class="page-header">
        <div>
          <h2 class="page-title">Infrastructure Telemetry & Settings</h2>
          <p class="page-description">Cloud infrastructure health, Kubernetes self-healing chaos testing, AWS cost model, and platform settings.</p>
        </div>
        <div class="toolbar-group">
          <button class="btn btn-secondary btn-sm" id="btn-refresh-infra">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg>
            Refresh
          </button>
        </div>
      </div>

      <!-- Microservices Cluster Health Grid -->
      <div class="card" style="margin-bottom: 20px;">
        <div class="card-header">
          <div class="card-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect><rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect><line x1="6" y1="6" x2="6.01" y2="6"></line><line x1="6" y1="18" x2="6.01" y2="18"></line></svg>
            Microservice Cluster Health & External Consoles
          </div>
          <span class="badge badge-success">Cluster Optimal (3 Nodes)</span>
        </div>
        <div class="card-body">
          <div class="services-matrix">
            ${services.map(s => `
              <div class="service-health-card">
                <div class="service-info">
                  <h4>${escapeHtml(s.service_name)}</h4>
                  <p>CPU: <span class="mono">${s.cpu_percent ? s.cpu_percent.toFixed(1) + '%' : '-'}</span> &bull; Mem: <span class="mono">${s.memory_mb ? s.memory_mb.toFixed(0) + 'MB' : '-'}</span></p>
                  <p>Replicas: <span class="mono">${s.replica_count || 1}</span> &bull; Rate: <span class="mono">${s.request_rate || 0} req/s</span></p>
                </div>
                <span class="badge ${s.status === 'HEALTHY' ? 'badge-success' : 'badge-danger'}">
                  ${escapeHtml(s.status)}
                </span>
              </div>
            `).join('')}
          </div>

          <!-- Quick Links to Running Dashboards -->
          <div style="margin-top: 16px; padding-top: 14px; border-top: 1px solid var(--border-default); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
            <div style="font-size: 0.8rem; color: var(--text-muted);">
              <strong>External Telemetry Portals:</strong>
            </div>
            <div style="display: flex; gap: 8px;">
              <a href="http://localhost:3000" target="_blank" rel="noopener noreferrer" class="btn btn-secondary btn-sm">
                Open Grafana Dashboard (:3000) &rarr;
              </a>
              <a href="http://localhost:15672" target="_blank" rel="noopener noreferrer" class="btn btn-secondary btn-sm">
                Open RabbitMQ UI (:15672) &rarr;
              </a>
              <a href="http://localhost:8000/docs" target="_blank" rel="noopener noreferrer" class="btn btn-secondary btn-sm">
                Open OpenAPI / Swagger Docs (:8000/docs) &rarr;
              </a>
            </div>
          </div>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
        <!-- Kubernetes Pod Failure Simulation Card -->
        <div class="card">
          <div class="card-header">
            <div class="card-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
              Kubernetes Self-Healing Simulation
            </div>
            <span class="badge badge-neutral">Chaos Testing</span>
          </div>
          <div class="card-body">
            <p style="font-size: 0.82rem; color: var(--text-secondary); margin-bottom: 14px;">
              Dispatch a simulated SIGTERM kill signal to an active worker replica. Verifies Kubernetes replica reconciliation and multi-pod ALB zero-downtime resilience.
            </p>

            <div class="form-group">
              <label class="form-label">Target Pod Service</label>
              <select id="chaos-service-select" class="form-control">
                <option value="aggregator-worker">aggregator-worker (Byzantine consensus pod)</option>
                <option value="coordinator">coordinator (Federation round engine)</option>
                <option value="api-gateway">api-gateway (FastAPI ingress pod)</option>
              </select>
            </div>

            <button class="btn btn-danger btn-sm" id="btn-trigger-pod-kill">
              Dispatch SIGTERM Pod Termination
            </button>

            <div id="chaos-result-box" style="display: none; margin-top: 14px; background: var(--bg-surface-subtle); border: 1px solid var(--border-default); border-radius: var(--radius-md); padding: 12px; font-size: 0.8rem;">
              <div style="font-weight: 600; color: var(--status-success); margin-bottom: 4px;" id="chaos-status"></div>
              <div style="color: var(--text-secondary);" id="chaos-event"></div>
              <div style="color: var(--text-muted); font-size: 0.75rem; margin-top: 4px;" id="chaos-resilience"></div>
            </div>
          </div>
        </div>

        <!-- Transparent Cloud Cost Estimator Card -->
        <div class="card">
          <div class="card-header">
            <div class="card-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
              AWS Production Reference Cost Estimator
            </div>
            <span class="badge badge-neutral">Transparent Model</span>
          </div>
          <div class="card-body">
            <div class="cost-total-banner">
              <div>
                <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; font-weight: 600;">Monthly Projected Cost</div>
                <div class="cost-amount" id="cost-total-display">$${currentCost.monthly_total_usd.toFixed(2)} / mo</div>
              </div>
              <div style="text-align: right; font-size: 0.75rem; color: var(--text-muted);">
                Reference: AWS us-east-1<br>EKS + RDS Multi-AZ + S3
              </div>
            </div>

            <div class="range-slider-group">
              <div class="range-slider-header">
                <span>EKS Worker Nodes: <strong id="val-nodes">3</strong></span>
                <span class="mono" style="color: var(--text-muted);">$70.08 / node</span>
              </div>
              <input type="range" id="slider-nodes" class="range-slider" min="1" max="15" value="3">
            </div>

            <div class="range-slider-group">
              <div class="range-slider-header">
                <span>S3 Model Storage: <strong id="val-storage">100</strong> GB</span>
                <span class="mono" style="color: var(--text-muted);">$0.023 / GB</span>
              </div>
              <input type="range" id="slider-storage" class="range-slider" min="20" max="2000" step="20" value="100">
            </div>

            <div class="range-slider-group">
              <div class="range-slider-header">
                <span>Monthly API Requests: <strong id="val-reqs">5.0</strong> M</span>
                <span class="mono" style="color: var(--text-muted);">$0.40 / M</span>
              </div>
              <input type="range" id="slider-reqs" class="range-slider" min="0.5" max="50" step="0.5" value="5.0">
            </div>
          </div>
        </div>
      </div>

      <!-- System Settings & Metadata Card -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
            System Settings & Environment Metadata
          </div>
          <span class="badge badge-neutral">Production Verified</span>
        </div>
        <div class="card-body">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
            <div>
              <h4 style="margin-bottom: 8px;">Active Authenticated Session</h4>
              <div style="font-size: 0.82rem; color: var(--text-secondary); line-height: 1.8;">
                <div><strong>User:</strong> <span class="mono">${escapeHtml(user.username || 'admin')}</span></div>
                <div><strong>Role:</strong> <span class="badge badge-neutral">${escapeHtml(user.role || 'ADMIN')}</span></div>
                <div><strong>Email:</strong> ${escapeHtml(user.email || 'admin@fednexus.io')}</div>
                <div><strong>Organization:</strong> ${escapeHtml(user.organization || 'FedNexus Central')}</div>
              </div>
            </div>

            <div>
              <h4 style="margin-bottom: 8px;">Database & Storage Tier</h4>
              <div style="font-size: 0.82rem; color: var(--text-secondary); line-height: 1.8;">
                <div><strong>Database Status:</strong> <span class="badge badge-success">${escapeHtml(dbInfo.status || 'CONNECTED')}</span></div>
                <div><strong>Database Engine:</strong> ${escapeHtml(dbInfo.type || 'PostgreSQL 16')}</div>
                <div><strong>Object Storage Engine:</strong> <span class="mono">${escapeHtml(storageInfo.backend || 's3 / minio')}</span></div>
                <div><strong>Managed Tables:</strong> <span style="font-size: 0.75rem; color: var(--text-muted);">synthetic_patients, federated_clients, federation_sessions, training_rounds, model_versions, audit_logs</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    attachEvents();
  } catch (err) {
    container.innerHTML = `
      <div class="alert alert-danger">Failed to load infrastructure settings: ${escapeHtml(err.message)}</div>
    `;
  }

  function attachEvents() {
    // Refresh
    document.getElementById('btn-refresh-infra')?.addEventListener('click', () => {
      renderInfrastructureSettings(container, state);
    });

    // Chaos pod kill
    document.getElementById('btn-trigger-pod-kill')?.addEventListener('click', async () => {
      const sName = document.getElementById('chaos-service-select')?.value || 'aggregator-worker';
      const btn = document.getElementById('btn-trigger-pod-kill');
      btn.disabled = true;
      btn.textContent = 'Dispatching SIGTERM...';

      try {
        const res = await api.simulatePodFailure(sName);
        const resBox = document.getElementById('chaos-result-box');
        resBox.style.display = 'block';
        document.getElementById('chaos-status').textContent = `STATUS: ${res.status}`;
        document.getElementById('chaos-event').textContent = res.event;
        document.getElementById('chaos-resilience').textContent = `Recovery: ~${res.recovery_estimated_sec}s &bull; ${res.cluster_resilience}`;
      } catch (err) {
        alert(`Chaos failure simulation error: ${err.message}`);
      } finally {
        btn.disabled = false;
        btn.textContent = 'Dispatch SIGTERM Pod Termination';
      }
    });

    // Cost Estimator Sliders
    const sNodes = document.getElementById('slider-nodes');
    const sStorage = document.getElementById('slider-storage');
    const sReqs = document.getElementById('slider-reqs');

    async function updateCost() {
      const nodes = parseInt(sNodes.value, 10);
      const storage = parseInt(sStorage.value, 10);
      const reqs = parseFloat(sReqs.value);

      document.getElementById('val-nodes').textContent = nodes;
      document.getElementById('val-storage').textContent = storage;
      document.getElementById('val-reqs').textContent = reqs.toFixed(1);

      try {
        const cost = await api.getCostEstimate(nodes, storage, reqs);
        document.getElementById('cost-total-display').textContent = `$${cost.monthly_total_usd.toFixed(2)} / mo`;
      } catch (err) {
        console.warn('Cost calculation update warning:', err);
      }
    }

    sNodes?.addEventListener('input', updateCost);
    sStorage?.addEventListener('input', updateCost);
    sReqs?.addEventListener('input', updateCost);
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

