import { api } from '../services/api.js';

export function renderModelRegistry(container, state) {
  const models = state.models || [];

  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
      <div>
        <h2 style="font-size: 1.5rem; color: var(--text-primary);">Federated Model Registry & Lineage</h2>
        <p style="font-size: 0.875rem; color: var(--text-muted);">Immutable checkpoint registry tracking model weights, validation accuracy, privacy budgets, and lineage lineage.</p>
      </div>
      <div>
        <span class="badge badge-active">${models.length} Model Checkpoints</span>
      </div>
    </div>

    <!-- Active Production Model Banner -->
    ${models.filter(m => m.status === 'PRODUCTION').map(prod => `
      <div class="glass-panel" style="padding: 24px; margin-bottom: 24px; border-left: 4px solid var(--accent-emerald); background: rgba(16, 185, 129, 0.05);">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="badge badge-active"><span class="pulse-dot"></span> LIVE IN PRODUCTION</span>
              <span class="mono" style="font-size: 0.85rem; color: var(--accent-sky); font-weight: 700;">${prod.model_tag}</span>
            </div>
            <h3 style="font-size: 1.25rem; margin-top: 6px;">Clinical Diagnostic Risk Network</h3>
            <p class="mono" style="font-size: 0.75rem; color: var(--text-muted); margin-top: 4px;">URI: ${prod.artifact_uri}</p>
          </div>
          <div style="display: flex; gap: 24px; text-align: right;">
            <div>
              <div style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase;">Accuracy</div>
              <div style="font-size: 1.6rem; font-weight: 700; color: var(--accent-emerald);">${prod.accuracy}%</div>
            </div>
            <div>
              <div style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase;">Loss</div>
              <div style="font-size: 1.6rem; font-weight: 700; color: var(--text-primary);" class="mono">${prod.loss}</div>
            </div>
          </div>
        </div>
      </div>
    `).join('')}

    <!-- Models Table -->
    <div class="glass-panel" style="padding: 20px;">
      <h3 style="font-size: 1.1rem; margin-bottom: 16px;">Model Checkpoints & History</h3>
      
      <table class="data-table">
        <thead>
          <tr>
            <th>Version</th>
            <th>Round</th>
            <th>Validation Accuracy</th>
            <th>Loss</th>
            <th>Participants</th>
            <th>Strategy</th>
            <th>Privacy &epsilon;</th>
            <th>Status</th>
            <th>Created</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          ${models.map(m => {
            const isProd = m.status === 'PRODUCTION';
            return `
              <tr>
                <td><strong class="mono" style="color: var(--accent-sky);">${m.model_tag}</strong></td>
                <td>Round #${m.round_number}</td>
                <td><strong style="color: ${m.accuracy >= 90 ? 'var(--accent-emerald)' : 'var(--text-primary)'};">${m.accuracy}%</strong></td>
                <td class="mono">${m.loss}</td>
                <td class="mono">${m.participants_count} Nodes</td>
                <td>${m.aggregation_strategy}</td>
                <td class="mono">&epsilon; ${m.privacy_epsilon}</td>
                <td>
                  <span class="badge ${isProd ? 'badge-active' : (m.status === 'ROLLED_BACK' ? 'badge-warning' : 'badge-cyan')}">
                    ${m.status}
                  </span>
                </td>
                <td style="font-size: 0.75rem; color: var(--text-muted);">${m.created_at ? new Date(m.created_at).toLocaleTimeString() : 'Initial'}</td>
                <td>
                  ${!isProd ? (
                    (api.user && (api.user.role === 'ADMIN' || api.user.role === 'OPERATOR')) ? `
                      <button class="btn btn-secondary btn-rollback" data-ver="${m.version_number}" style="padding: 4px 10px; font-size: 0.75rem;">
                        Rollback to v${m.version_number}
                      </button>
                    ` : `
                      <span style="font-size: 0.75rem; color: var(--text-muted);">S3 Archived</span>
                    `
                  ) : `
                    <span style="font-size: 0.75rem; color: var(--accent-emerald);">Active</span>
                  `}
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;

  // Attach Rollback handlers
  container.querySelectorAll('.btn-rollback').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const ver = parseInt(e.target.dataset.ver);
      if (confirm(`Are you sure you want to rollback active production model to version v${ver}?`)) {
        try {
          await api.rollbackModel(ver);
          await window.app.refreshState();
        } catch (err) {
          alert(`Rollback failed: ${err.message}`);
        }
      }
    });
  });
}
