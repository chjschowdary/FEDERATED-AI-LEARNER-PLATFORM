import { api } from '../services/api.js';

export async function renderSecurityAudit(container, state) {
  container.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: center; padding: 60px;">
      <div style="width: 28px; height: 28px; border-radius: 50%; border: 2px solid var(--border-default); border-top-color: var(--accent-primary); animation: spin 0.8s linear infinite;"></div>
    </div>
  `;

  try {
    const [secEvents, radarData, auditLogs] = await Promise.all([
      api.getSecurityEvents().catch(() => []),
      api.getSecurityRadar().catch(() => []),
      api.getAuditLogs('', 100).catch(() => [])
    ]);

    const user = api.user || { role: 'ADMIN' };
    const canUnquarantine = (user.role === 'ADMIN' || user.role === 'OPERATOR');

    container.innerHTML = `
      <div class="page-header">
        <div>
          <h2 class="page-title">Security & Compliance Audit Center</h2>
          <p class="page-description">Byzantine anomaly detection telemetry, client trust scoring, and cryptographic audit records.</p>
        </div>
        <div class="toolbar-group">
          <button class="btn btn-secondary btn-sm" id="btn-refresh-security">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg>
            Refresh
          </button>
        </div>
      </div>

      <!-- Byzantine Radar Card -->
      <div class="card" style="margin-bottom: 20px;">
        <div class="card-header">
          <div class="card-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
            Byzantine Consensus Radar & Client Trust Metrics
          </div>
          <span class="badge badge-neutral">${radarData.length} Evaluated Nodes</span>
        </div>
        <div class="card-body">
          <p style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 14px;">
            Nodes submit gradient vectors &Delta;w. The coordinator measures Directional Cosine Alignment (&gt;0.0) against the median consensus and Gradient Norm Z-Score (&le;3.0) before applying Bayesian Trust updates.
          </p>

          <div class="radar-card-container">
            ${radarData.length > 0 ? radarData.map(c => `
              <div class="radar-row">
                <div class="radar-client-meta">
                  <strong style="font-size: 0.85rem;">${escapeHtml(c.organization || c.client_id)}</strong>
                  <span class="mono" style="font-size: 0.72rem; color: var(--text-muted);">${escapeHtml(c.client_id)}</span>
                </div>

                <div class="radar-bars">
                  <div style="display: flex; justify-content: space-between; font-size: 0.72rem; color: var(--text-secondary);">
                    <span>Trust Rating: <strong>${c.trust.toFixed(1)}/100</strong></span>
                    <span>Cosine Alignment: <strong>${c.alignment.toFixed(0)}%</strong></span>
                    <span>Norm Stability: <strong>${c.norm_stability.toFixed(0)}%</strong></span>
                  </div>
                  <div class="bar-track">
                    <div class="bar-fill ${c.status === 'QUARANTINED' ? 'bar-fill-danger' : 'bar-fill-trust'}" style="width: ${c.trust}%;"></div>
                  </div>
                </div>

                <div style="min-width: 110px; text-align: right;">
                  <span class="badge ${c.status === 'QUARANTINED' ? 'badge-danger' : 'badge-success'}">
                    ${escapeHtml(c.status)}
                  </span>
                  ${c.status === 'QUARANTINED' && canUnquarantine ? `
                    <button class="btn btn-secondary btn-sm btn-unquarantine" data-id="${c.client_id}" style="margin-left: 6px;">
                      Restore
                    </button>
                  ` : ''}
                </div>
              </div>
            `).join('') : `
              <div class="empty-state">No client radar metrics available.</div>
            `}
          </div>
        </div>
      </div>

      <!-- Real Recorded Security Anomaly Events -->
      <div class="card" style="margin-bottom: 20px;">
        <div class="card-header">
          <div class="card-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
            Recorded Byzantine Anomaly Events
          </div>
          <span class="badge ${secEvents.length > 0 ? 'badge-danger' : 'badge-neutral'}">
            ${secEvents.length} Recorded
          </span>
        </div>
        <div class="card-body" style="padding: 0;">
          <table class="data-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Event Type</th>
                <th>Client Node</th>
                <th>Severity</th>
                <th>Threat Confidence</th>
                <th>Action Taken</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              ${secEvents.length > 0 ? secEvents.map(e => `
                <tr>
                  <td class="mono" style="font-size: 0.78rem; color: var(--text-muted);">${formatDate(e.timestamp)}</td>
                  <td><span class="badge badge-danger">${escapeHtml(e.event_type)}</span></td>
                  <td class="mono"><strong>${escapeHtml(e.client_id)}</strong></td>
                  <td>
                    <span class="badge ${e.severity === 'CRITICAL' ? 'badge-danger' : 'badge-warning'}">
                      ${escapeHtml(e.severity)}
                    </span>
                  </td>
                  <td class="mono"><strong>${e.threat_confidence ? e.threat_confidence.toFixed(1) + '%' : '-'}</strong></td>
                  <td><span class="badge badge-neutral">${escapeHtml(e.action_taken)}</span></td>
                  <td style="font-size: 0.8rem; color: var(--text-secondary); max-width: 320px;">
                    ${escapeHtml(e.description || '-')}
                  </td>
                </tr>
              `).join('') : `
                <tr>
                  <td colspan="7" class="empty-state">
                    <div class="empty-state-title">No Security Events Recorded</div>
                    <div class="empty-state-text">No Byzantine anomalies or attacks have been recorded. All hospital gradient updates have passed cosine and norm verification.</div>
                  </td>
                </tr>
              `}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Comprehensive Audit Trail -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
            Platform Audit Trail (PostgreSQL Verified)
          </div>
          <span class="badge badge-neutral">${auditLogs.length} Events</span>
        </div>
        <div class="card-body" style="padding: 0;">
          <table class="data-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Resource</th>
                <th>Result</th>
                <th>IP Address</th>
                <th>Metadata</th>
              </tr>
            </thead>
            <tbody>
              ${auditLogs.length > 0 ? auditLogs.map(a => `
                <tr>
                  <td class="mono" style="font-size: 0.76rem; color: var(--text-muted);">${formatDate(a.timestamp)}</td>
                  <td><strong>${escapeHtml(a.actor)}</strong></td>
                  <td><span class="badge badge-neutral mono" style="font-size: 0.72rem;">${escapeHtml(a.action)}</span></td>
                  <td class="mono" style="font-size: 0.8rem;">${escapeHtml(a.resource || '-')}</td>
                  <td>
                    <span class="badge ${a.result === 'SUCCESS' ? 'badge-success' : 'badge-danger'}">
                      ${escapeHtml(a.result)}
                    </span>
                  </td>
                  <td class="mono" style="font-size: 0.78rem; color: var(--text-muted);">${escapeHtml(a.ip_address || '-')}</td>
                  <td class="mono" style="font-size: 0.72rem; color: var(--text-muted); max-width: 240px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    ${a.metadata ? JSON.stringify(a.metadata) : '-'}
                  </td>
                </tr>
              `).join('') : `
                <tr><td colspan="7" class="empty-state">No audit logs recorded.</td></tr>
              `}
            </tbody>
          </table>
        </div>
      </div>
    `;

    document.getElementById('btn-refresh-security')?.addEventListener('click', () => {
      renderSecurityAudit(container, state);
    });

    container.querySelectorAll('.btn-unquarantine').forEach(btn => {
      btn.addEventListener('click', async () => {
        const clientId = btn.dataset.id;
        try {
          await api.unquarantineClient(clientId);
          alert(`Client '${clientId}' unquarantined successfully.`);
          renderSecurityAudit(container, state);
        } catch (err) {
          alert(`Failed to unquarantine: ${err.message}`);
        }
      });
    });

  } catch (err) {
    container.innerHTML = `
      <div class="alert alert-danger">Failed to load security audit data: ${escapeHtml(err.message)}</div>
    `;
  }
}

function formatDate(isoStr) {
  if (!isoStr) return '-';
  try {
    const d = new Date(isoStr);
    return d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
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

