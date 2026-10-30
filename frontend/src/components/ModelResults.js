import { api } from '../services/api.js';

export async function renderModelResults(container, state) {
  container.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: center; padding: 60px;">
      <div style="width: 28px; height: 28px; border-radius: 50%; border: 2px solid var(--border-default); border-top-color: var(--accent-primary); animation: spin 0.8s linear infinite;"></div>
    </div>
  `;

  try {
    const models = await api.getModels().catch(() => []);
    const user = api.user || { role: 'ADMIN' };
    const canRollback = (user.role === 'ADMIN' || user.role === 'OPERATOR');

    const activeModel = models.find(m => m.status === 'PRODUCTION') || models[0] || null;

    container.innerHTML = `
      <div class="page-header">
        <div>
          <h2 class="page-title">Global Model Results & Version Registry</h2>
          <p class="page-description">Immutable versioning, evaluation benchmarks, and artifact storage for global ClinicalRiskMLP checkpoints.</p>
        </div>
        <div class="toolbar-group">
          <button class="btn btn-secondary btn-sm" id="btn-refresh-models">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg>
            Refresh
          </button>
        </div>
      </div>

      <!-- Active Production Model Card -->
      ${activeModel ? `
        <div class="card" style="margin-bottom: 20px;">
          <div class="card-header">
            <div class="card-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg>
              Active Production Model &bull; <span class="mono">${escapeHtml(activeModel.model_tag)}</span>
            </div>
            <span class="badge badge-success">Active Production Version</span>
          </div>
          <div class="card-body">
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 18px;">
              <div style="background: var(--bg-surface-subtle); padding: 12px; border-radius: var(--radius-md); border: 1px solid var(--border-default);">
                <div class="stat-label">Holdout Accuracy</div>
                <div style="font-size: 1.4rem; font-weight: 700; color: var(--status-success);" class="mono">
                  ${activeModel.accuracy ? activeModel.accuracy.toFixed(1) + '%' : 'N/A'}
                </div>
              </div>
              <div style="background: var(--bg-surface-subtle); padding: 12px; border-radius: var(--radius-md); border: 1px solid var(--border-default);">
                <div class="stat-label">Cross-Entropy Loss</div>
                <div style="font-size: 1.4rem; font-weight: 700; color: var(--text-primary);" class="mono">
                  ${activeModel.loss ? activeModel.loss.toFixed(4) : 'N/A'}
                </div>
              </div>
              <div style="background: var(--bg-surface-subtle); padding: 12px; border-radius: var(--radius-md); border: 1px solid var(--border-default);">
                <div class="stat-label">Training Round</div>
                <div style="font-size: 1.4rem; font-weight: 700; color: var(--accent-primary);" class="mono">
                  Round #${activeModel.round_number}
                </div>
              </div>
              <div style="background: var(--bg-surface-subtle); padding: 12px; border-radius: var(--radius-md); border: 1px solid var(--border-default);">
                <div class="stat-label">Privacy Guarantee</div>
                <div style="font-size: 1.4rem; font-weight: 700; color: var(--text-primary);" class="mono">
                  &epsilon; &le; ${activeModel.privacy_epsilon || 4.0}
                </div>
              </div>
            </div>

            <div style="font-size: 0.85rem; color: var(--text-secondary); line-height: 1.8; margin-bottom: 16px;">
              <div><strong>Network Topology:</strong> Multilayer Perceptron (Input: 12 clinical vitals &rarr; Hidden 1: 24 (ReLU) &rarr; Hidden 2: 12 (ReLU) &rarr; Softmax: 2 classes)</div>
              <div><strong>Consensus Strategy:</strong> ${escapeHtml(activeModel.aggregation_strategy || 'FedAvg')} with Byzantine Cosine & Z-Score Anomaly Filtering</div>
              <div><strong>Storage Artifact URI:</strong> <code class="mono" style="background: var(--bg-surface-subtle); padding: 2px 6px; border-radius: 4px;">${escapeHtml(activeModel.artifact_uri || 's3://federaicloud-artifacts/models/')}</code></div>
              <div><strong>Registered Timestamp:</strong> ${formatDate(activeModel.created_at)}</div>
            </div>

            <button class="btn btn-primary btn-sm btn-download-artifact" data-version="${activeModel.version_number}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
              Download Model Weights (JSON Artifact)
            </button>
          </div>
        </div>
      ` : `
        <div class="card" style="margin-bottom: 20px; padding: 30px; text-align: center;">
          <div class="empty-state-title">No Model Versions Registered Yet</div>
          <div class="empty-state-text">Execute a training round from the Federated Training console to register the first model checkpoint.</div>
        </div>
      `}

      <!-- Model Version History Table -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
            Model Version History
          </div>
          <span class="badge badge-neutral">${models.length} Versions Logged</span>
        </div>
        <div class="card-body" style="padding: 0;">
          <table class="data-table">
            <thead>
              <tr>
                <th>Version</th>
                <th>Model Tag</th>
                <th>Round</th>
                <th>Holdout Accuracy</th>
                <th>Loss</th>
                <th>Strategy</th>
                <th>Privacy &epsilon;</th>
                <th>Status</th>
                <th>Created At</th>
                <th style="text-align: right;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${models.length > 0 ? models.map(m => `
                <tr>
                  <td><strong class="mono">v${m.version_number}</strong></td>
                  <td class="mono" style="font-size: 0.8rem;">${escapeHtml(m.model_tag)}</td>
                  <td class="mono">#${m.round_number}</td>
                  <td><strong class="mono" style="color: var(--status-success);">${m.accuracy ? m.accuracy.toFixed(1) + '%' : '-'}</strong></td>
                  <td class="mono">${m.loss ? m.loss.toFixed(4) : '-'}</td>
                  <td><span class="badge badge-neutral">${escapeHtml(m.aggregation_strategy || 'FedAvg')}</span></td>
                  <td class="mono">&le; ${m.privacy_epsilon || 4.0}</td>
                  <td>
                    <span class="badge ${m.status === 'PRODUCTION' ? 'badge-success' : 'badge-neutral'}">
                      ${escapeHtml(m.status)}
                    </span>
                  </td>
                  <td class="mono" style="font-size: 0.75rem; color: var(--text-muted);">${formatDate(m.created_at)}</td>
                  <td style="text-align: right; white-space: nowrap;">
                    <button class="btn btn-secondary btn-sm btn-download-artifact" data-version="${m.version_number}" title="Download JSON artifact">
                      Download
                    </button>
                    ${canRollback && m.status !== 'PRODUCTION' ? `
                      <button class="btn btn-secondary btn-sm btn-rollback-model" data-version="${m.version_number}" title="Rollback to this version">
                        Rollback
                      </button>
                    ` : ''}
                  </td>
                </tr>
              `).join('') : `
                <tr><td colspan="10" class="empty-state">No model versions stored in registry.</td></tr>
              `}
            </tbody>
          </table>
        </div>
      </div>
    `;

    // Refresh
    document.getElementById('btn-refresh-models')?.addEventListener('click', () => {
      renderModelResults(container, state);
    });

    // Download artifact buttons
    container.querySelectorAll('.btn-download-artifact').forEach(btn => {
      btn.addEventListener('click', async () => {
        const v = parseInt(btn.dataset.version, 10);
        try {
          await api.downloadModelArtifact(v);
        } catch (err) {
          alert(`Failed to download artifact: ${err.message}`);
        }
      });
    });

    // Rollback buttons
    container.querySelectorAll('.btn-rollback-model').forEach(btn => {
      btn.addEventListener('click', async () => {
        const v = parseInt(btn.dataset.version, 10);
        if (confirm(`Rollback production model to version v${v}? Active global weights will be replaced with this checkpoint.`)) {
          try {
            await api.rollbackModel(v);
            alert(`Model rolled back to v${v} successfully.`);
            renderModelResults(container, state);
          } catch (err) {
            alert(`Failed to rollback model: ${err.message}`);
          }
        }
      });
    });

  } catch (err) {
    container.innerHTML = `
      <div class="alert alert-danger">Failed to load models: ${escapeHtml(err.message)}</div>
    `;
  }
}

function formatDate(isoStr) {
  if (!isoStr) return '-';
  try {
    const d = new Date(isoStr);
    return d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch (_) {
    return isoStr;
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

