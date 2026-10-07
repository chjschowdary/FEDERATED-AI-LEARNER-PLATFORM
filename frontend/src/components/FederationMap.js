import { api } from '../services/api.js';

export function renderFederationMap(container, state) {
  const clients = state.clients || [];

  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
      <div>
        <h2 style="font-size: 1.5rem; color: var(--text-primary);">Federation Organization Network</h2>
        <p style="font-size: 0.875rem; color: var(--text-muted);">Decentralized healthcare nodes participating in cross-institutional privacy-preserving AI.</p>
      </div>
      <div style="display: flex; gap: 12px;">
        <span class="badge badge-active">${clients.filter(c => c.status === 'ACTIVE').length} Active Nodes</span>
        <span class="badge ${clients.some(c => c.status === 'QUARANTINED') ? 'badge-danger' : 'badge-cyan'}">
          ${clients.filter(c => c.status === 'QUARANTINED').length} Quarantined
        </span>
      </div>
    </div>

    <!-- Client Cards Grid -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: 20px; margin-bottom: 32px;">
      ${clients.map(client => {
        const isQuarantined = client.status === 'QUARANTINED';
        return `
          <div class="glass-panel" style="padding: 24px; position: relative; border-left: 4px solid ${isQuarantined ? 'var(--accent-rose)' : 'var(--accent-emerald)'};">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
              <div>
                <span class="mono" style="font-size: 0.75rem; color: var(--accent-sky);">${client.client_id}</span>
                <h3 style="font-size: 1.15rem; color: var(--text-primary); margin-top: 2px;">${client.name}</h3>
                <p style="font-size: 0.8rem; color: var(--text-secondary);">${client.specialty} &bull; ${client.region}</p>
              </div>
              <span class="badge ${isQuarantined ? 'badge-danger' : 'badge-active'}">
                <span class="pulse-dot"></span> ${client.status}
              </span>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 16px 0; background: rgba(10, 15, 26, 0.6); padding: 12px; border-radius: var(--radius-md);">
              <div>
                <div style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase;">Trust Score</div>
                <div style="font-size: 1.25rem; font-weight: 700; color: ${client.trust_score >= 80 ? 'var(--accent-emerald)' : (client.trust_score >= 50 ? 'var(--accent-amber)' : 'var(--accent-rose)')};">
                  ${client.trust_score}/100
                </div>
              </div>
              <div>
                <div style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase;">Private Records</div>
                <div style="font-size: 1.25rem; font-weight: 700; color: var(--text-primary);" class="mono">
                  ${client.dataset_size.toLocaleString()}
                </div>
              </div>
              <div>
                <div style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase;">Rounds Done</div>
                <div style="font-size: 0.95rem; font-weight: 600; color: var(--text-secondary);" class="mono">
                  ${client.total_rounds_completed}
                </div>
              </div>
              <div>
                <div style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase;">Anomalies</div>
                <div style="font-size: 0.95rem; font-weight: 600; color: ${client.anomalies_detected > 0 ? 'var(--accent-rose)' : 'var(--text-secondary)'};" class="mono">
                  ${client.anomalies_detected}
                </div>
              </div>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 16px;">
              <span class="mono" style="font-size: 0.75rem; color: var(--text-muted);">IP: ${client.ip_address}</span>
              ${isQuarantined ? (
                (api.user && (api.user.role === 'ADMIN' || api.user.role === 'OPERATOR')) ? `
                  <button class="btn btn-danger btn-unquarantine" data-cid="${client.client_id}" style="padding: 6px 12px; font-size: 0.75rem;">
                    Restore & Unquarantine
                  </button>
                ` : `
                  <span class="badge badge-danger" style="font-size: 0.7rem;">ISOLATED IN QUARANTINE</span>
                `
              ) : `
                <button class="btn btn-secondary btn-inspect-client" data-cid="${client.client_id}" style="padding: 6px 12px; font-size: 0.75rem;">
                  Inspect Telemetry
                </button>
              `}
            </div>
          </div>
        `;
      }).join('')}
    </div>

    <!-- Client Detail Modal Drawer Container -->
    <div id="client-drawer-container"></div>
  `;

  // Attach Unquarantine handlers
  container.querySelectorAll('.btn-unquarantine').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const cid = e.target.dataset.cid;
      try {
        await api.unquarantineClient(cid);
        await window.app.refreshState();
      } catch (err) {
        alert(`Failed to unquarantine client: ${err.message}`);
      }
    });
  });

  // Attach Inspect Client handlers
  container.querySelectorAll('.btn-inspect-client').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const cid = e.target.dataset.cid;
      openClientDrawer(cid);
    });
  });
}

async function openClientDrawer(clientId) {
  const drawerContainer = document.getElementById('client-drawer-container');
  if (!drawerContainer) return;

  try {
    const detail = await api.getClientDetail(clientId);
    
    drawerContainer.innerHTML = `
      <div class="modal-overlay" id="modal-overlay">
        <div class="modal-container glass-panel">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <div>
              <span class="mono" style="font-size: 0.75rem; color: var(--accent-sky);">${detail.client_id}</span>
              <h2 style="font-size: 1.35rem; color: var(--text-primary);">${detail.name}</h2>
              <p style="font-size: 0.85rem; color: var(--text-muted);">${detail.organization.specialty} &bull; ${detail.organization.region}</p>
            </div>
            <button id="btn-close-drawer" class="btn btn-secondary" style="padding: 6px 10px;">&times;</button>
          </div>

          <div style="margin-bottom: 20px;">
            <h4 style="font-size: 0.95rem; margin-bottom: 10px;">Trust Evaluation History</h4>
            <div style="max-height: 180px; overflow-y: auto; background: rgba(10, 15, 26, 0.7); border-radius: var(--radius-md); padding: 12px;">
              ${(detail.history || []).length > 0 ? detail.history.map(h => `
                <div style="display: flex; justify-content: space-between; font-size: 0.8rem; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.04);">
                  <span>Round #${h.round}: ${h.reason}</span>
                  <span style="color: ${h.delta >= 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)'}; font-weight: 700;">
                    ${h.new_trust}/100 (${h.delta >= 0 ? '+' : ''}${h.delta})
                  </span>
                </div>
              `).join('') : '<div style="color: var(--text-muted); font-size: 0.8rem;">No historical score updates yet.</div>'}
            </div>
          </div>

          <div>
            <h4 style="font-size: 0.95rem; margin-bottom: 10px;">Recent Gradient Telemetry</h4>
            <table class="data-table">
              <thead>
                <tr>
                  <th>Round</th>
                  <th>L2 Norm</th>
                  <th>Cosine Similarity</th>
                  <th>Threat Score</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${(detail.recent_updates || []).map(u => `
                  <tr>
                    <td>R#${u.round_id}</td>
                    <td class="mono">${u.l2_norm}</td>
                    <td class="mono" style="color: ${u.cosine_similarity < 0 ? 'var(--accent-rose)' : 'var(--accent-emerald)'};">
                      ${u.cosine_similarity}
                    </td>
                    <td class="mono" style="color: ${u.threat_score > 50 ? 'var(--accent-rose)' : 'var(--text-primary)'};">
                      ${u.threat_score}
                    </td>
                    <td>
                      <span class="badge ${u.is_quarantined ? 'badge-danger' : 'badge-active'}">
                        ${u.is_quarantined ? 'QUARANTINED' : 'VERIFIED'}
                      </span>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    document.getElementById('btn-close-drawer')?.addEventListener('click', () => {
      drawerContainer.innerHTML = '';
    });
    document.getElementById('modal-overlay')?.addEventListener('click', (e) => {
      if (e.target.id === 'modal-overlay') drawerContainer.innerHTML = '';
    });
  } catch (err) {
    alert(`Failed to load client details: ${err.message}`);
  }
}
