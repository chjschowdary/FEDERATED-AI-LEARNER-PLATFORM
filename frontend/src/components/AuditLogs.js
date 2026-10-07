import { api } from '../services/api.js';

export function renderAuditLogs(container, state) {
  const logs = state.auditLogs || [];

  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
      <div>
        <h2 style="font-size: 1.5rem; color: var(--text-primary);">System Audit Trail & Observability Logs</h2>
        <p style="font-size: 0.875rem; color: var(--text-muted);">Immutable audit records capturing privileged user actions, security interventions, and round completions.</p>
      </div>
      <div>
        <span class="badge badge-active">${logs.length} Logged Events</span>
      </div>
    </div>

    <div class="glass-panel" style="padding: 20px;">
      <table class="data-table">
        <thead>
          <tr>
            <th>Timestamp</th>
            <th>Actor</th>
            <th>Action</th>
            <th>Resource</th>
            <th>Result</th>
            <th>IP Address</th>
          </tr>
        </thead>
        <tbody>
          ${logs.map(l => `
            <tr>
              <td class="mono" style="font-size: 0.75rem; color: var(--text-muted);">${new Date(l.timestamp).toLocaleString()}</td>
              <td><strong style="color: var(--accent-sky);">${l.actor}</strong></td>
              <td><span class="mono" style="color: var(--text-primary);">${l.action}</span></td>
              <td class="mono" style="font-size: 0.75rem;">${l.resource}</td>
              <td><span class="badge ${l.result === 'SUCCESS' ? 'badge-active' : 'badge-danger'}">${l.result}</span></td>
              <td class="mono" style="font-size: 0.75rem; color: var(--text-muted);">${l.ip_address}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}
