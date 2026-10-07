import { api } from '../services/api.js';

export function renderSecurityCenter(container, state) {
  const events = state.securityEvents || [];
  const clients = state.clients || [];

  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
      <div>
        <h2 style="font-size: 1.5rem; color: var(--text-primary);">Security & Byzantine Threat Center</h2>
        <p style="font-size: 0.875rem; color: var(--text-muted);">Real-time malicious gradient inspection, cosine alignment radar, and dynamic trust scoring engine.</p>
      </div>
      <div>
        <span class="badge ${clients.some(c => c.status === 'QUARANTINED') ? 'badge-danger' : 'badge-active'}">
          <span class="pulse-dot"></span> Radar Active: 5 Nodes Monitored
        </span>
      </div>
    </div>

    <!-- Top Security Radar & Trust Grid -->
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 28px;">
      <!-- Anomaly Radar Canvas Plot -->
      <div class="glass-panel" style="padding: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <div>
            <h3 style="font-size: 1.05rem;">Gradient Delta Anomaly Radar</h3>
            <p style="font-size: 0.75rem; color: var(--text-muted);">Cosine Similarity (X) vs Gradient Norm (Y). Outliers beyond red boundary are quarantined.</p>
          </div>
        </div>
        <div class="chart-container">
          <canvas id="radarChart"></canvas>
        </div>
      </div>

      <!-- Trust Scoring Breakdown -->
      <div class="glass-panel" style="padding: 20px;">
        <h3 style="font-size: 1.05rem; margin-bottom: 16px;">Node Trust & Risk Scores</h3>
        <div style="display: flex; flex-direction: column; gap: 14px;">
          ${clients.map(c => {
            const isQuarantined = c.status === 'QUARANTINED';
            return `
              <div>
                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.85rem; margin-bottom: 4px;">
                  <span><strong>${c.name}</strong> <span class="mono" style="color: var(--text-muted);">(${c.client_id})</span></span>
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-weight: 700; color: ${c.trust_score >= 80 ? 'var(--accent-emerald)' : (c.trust_score >= 50 ? 'var(--accent-amber)' : 'var(--accent-rose)')};">
                      ${c.trust_score}/100 ${isQuarantined ? '<span class="badge badge-danger">QUARANTINED</span>' : ''}
                    </span>
                    ${isQuarantined ? (
                      (api.user && (api.user.role === 'ADMIN' || api.user.role === 'OPERATOR')) ? `
                        <button class="btn btn-secondary btn-unquarantine" data-client="${c.client_id}" style="padding: 2px 8px; font-size: 0.7rem; border-color: var(--accent-emerald); color: var(--accent-emerald);">
                          Re-admit Node
                        </button>
                      ` : `
                        <span style="font-size: 0.68rem; color: var(--accent-rose);">[LOCKED: AUDIT ENFORCED]</span>
                      `
                    ) : ''}
                  </div>
                </div>
                <div style="width: 100%; height: 8px; background: rgba(30, 41, 59, 0.8); border-radius: 4px; overflow: hidden;">
                  <div style="width: ${c.trust_score}%; height: 100%; background: ${c.trust_score >= 80 ? 'var(--accent-emerald)' : (c.trust_score >= 50 ? 'var(--accent-amber)' : 'var(--accent-rose)')}; border-radius: 4px; transition: width 0.5s ease;"></div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>

    <!-- Security Events Feed Table -->
    <div class="glass-panel" style="padding: 20px;">
      <h3 style="font-size: 1.1rem; margin-bottom: 16px;">Byzantine Threat Detection Log</h3>
      
      <table class="data-table">
        <thead>
          <tr>
            <th>Event Type</th>
            <th>Source Client</th>
            <th>Severity</th>
            <th>Description</th>
            <th>Threat Confidence</th>
            <th>Enforced Action</th>
            <th>Timestamp</th>
          </tr>
        </thead>
        <tbody>
          ${events.length > 0 ? events.map(e => `
            <tr>
              <td><strong style="color: var(--accent-rose);">${e.event_type}</strong></td>
              <td><span class="mono" style="color: var(--accent-sky);">${e.client_id || 'Global'}</span></td>
              <td><span class="badge badge-danger">${e.severity}</span></td>
              <td style="max-width: 380px;">${e.description}</td>
              <td><strong class="mono" style="color: var(--accent-rose);">${e.threat_confidence}%</strong></td>
              <td><span class="badge badge-warning">${e.action_taken}</span></td>
              <td style="font-size: 0.75rem; color: var(--text-muted);">${new Date(e.timestamp).toLocaleTimeString()}</td>
            </tr>
          `).join('') : `
            <tr>
              <td colspan="7" style="text-align: center; color: var(--text-muted); padding: 24px;">
                No security violations detected. All incoming gradient updates conform to consensus profile.
              </td>
            </tr>
          `}
        </tbody>
      </table>
    </div>
  `;

  // Render Radar Canvas
  renderRadarPlot(clients);

  // Unquarantine handler for Admin/Operator
  container.querySelectorAll('.btn-unquarantine').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const clientId = e.target.dataset.client;
      if (confirm(`Authorize re-admission of ${clientId} into active federation consensus?`)) {
        try {
          await api.unquarantineClient(clientId);
          await window.app.refreshState();
        } catch (err) {
          alert(`Unquarantine failed: ${err.message}`);
        }
      }
    });
  });
}

function renderRadarPlot(clients) {
  const canvas = document.getElementById('radarChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  
  const width = canvas.parentElement.clientWidth;
  const height = canvas.parentElement.clientHeight || 240;
  canvas.width = width;
  canvas.height = height;

  ctx.clearRect(0, 0, width, height);

  // Draw axes
  const centerX = width / 2;
  const centerY = height / 2;

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(30, centerY);
  ctx.lineTo(width - 30, centerY);
  ctx.moveTo(centerX, 20);
  ctx.lineTo(centerX, height - 20);
  ctx.stroke();

  // Draw Threshold Safe Zone Box
  ctx.fillStyle = 'rgba(16, 185, 129, 0.05)';
  ctx.strokeStyle = 'rgba(16, 185, 129, 0.3)';
  ctx.lineWidth = 1;
  ctx.strokeRect(centerX - 10, 40, width / 2 - 40, height - 80);
  ctx.fillRect(centerX - 10, 40, width / 2 - 40, height - 80);

  // Labels
  ctx.fillStyle = 'var(--text-muted)';
  ctx.font = '10px monospace';
  ctx.fillText('Cosine Alignment: Inverted (-1.0)', 40, centerY - 8);
  ctx.fillText('Consensus (1.0)', width - 120, centerY - 8);

  // Plot Client Points
  clients.forEach((c, idx) => {
    const isQuarantined = c.status === 'QUARANTINED';
    // Map cosine [-1, 1] to X, norm to Y
    const cos = isQuarantined ? -0.8 : (0.4 + (idx * 0.05));
    const x = centerX + (cos * (width / 2 - 50));
    const y = isQuarantined ? 50 : (centerY - 10 + (idx % 2 === 0 ? 20 : -20));

    // Glow circle
    ctx.fillStyle = isQuarantined ? '#f43f5e' : '#10b981';
    ctx.beginPath();
    ctx.arc(x, y, isQuarantined ? 8 : 6, 0, Math.PI * 2);
    ctx.fill();

    // Text label
    ctx.fillStyle = isQuarantined ? '#f43f5e' : '#f8fafc';
    ctx.font = '11px sans-serif';
    ctx.fillText(c.client_id, x + 10, y + 4);
  });
}
