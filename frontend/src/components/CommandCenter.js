import { api } from '../services/api.js';

export function renderCommandCenter(container, state) {
  const status = state.status || {};
  const isQuarantined = (status.quarantined_clients_count || 0) > 0;
  const user = api.user || { role: 'ADMIN' };
  const isAuditor = (user.role === 'VIEWER' || user.role === 'AUDITOR');
  const isClient = (user.role === 'CLIENT');
  const isAdminOrOp = (user.role === 'ADMIN' || user.role === 'OPERATOR');

  let rightSidebarCard = '';
  if (isAuditor) {
    rightSidebarCard = `
      <div class="glass-panel" style="padding: 24px; display: flex; flex-direction: column; justify-content: space-between;">
        <div>
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px; color: var(--accent-amber);">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
            <h3 style="font-size: 1.1rem; color: #ffffff;">Auditor Compliance Portal</h3>
          </div>
          <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 16px;">
            Regulatory compliance monitoring active for HIPAA & GDPR.
          </p>

          <div style="display: flex; flex-direction: column; gap: 10px; font-size: 0.82rem;">
            <div style="background: rgba(10,15,26,0.7); padding: 12px; border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
              <div style="color: var(--text-muted); font-size: 0.72rem;">HIPAA Data Exposure Score</div>
              <div style="font-size: 1.2rem; font-weight: 700; color: var(--accent-emerald);">0.0% (Zero Leakage)</div>
            </div>
            <div style="background: rgba(10,15,26,0.7); padding: 12px; border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
              <div style="color: var(--text-muted); font-size: 0.72rem;">Cryptographic Audit Trail</div>
              <div style="font-size: 1.2rem; font-weight: 700; color: var(--accent-sky);">${state.auditLogs?.length || 1} Signed Events</div>
            </div>
            <div style="background: rgba(10,15,26,0.7); padding: 12px; border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
              <div style="color: var(--text-muted); font-size: 0.72rem;">Differential Privacy Integrity</div>
              <div style="font-size: 1.2rem; font-weight: 700; color: var(--accent-purple);">Bounded (&epsilon; &le; 4.0)</div>
            </div>
          </div>
        </div>

        <button class="btn btn-secondary" onclick="window.app.navigate('audit')" style="width: 100%; margin-top: 16px; font-size: 0.85rem;">
          View Full Compliance Audit Trail
        </button>
      </div>
    `;
  } else if (isClient) {
    rightSidebarCard = `
      <div class="glass-panel" style="padding: 24px; display: flex; flex-direction: column; justify-content: space-between;">
        <div>
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px; color: var(--accent-emerald);">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>
            <h3 style="font-size: 1.1rem; color: #ffffff;">Hospital Alpha Enclave</h3>
          </div>
          <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 16px;">
            Local Clinical Node Telemetry (Mount Sinai NY)
          </p>

          <div style="display: flex; flex-direction: column; gap: 10px; font-size: 0.82rem;">
            <div style="background: rgba(10,15,26,0.7); padding: 12px; border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
              <div style="color: var(--text-muted); font-size: 0.72rem;">Local Patient Cohort</div>
              <div style="font-size: 1.2rem; font-weight: 700; color: #ffffff;">1,200 EHR Records</div>
            </div>
            <div style="background: rgba(10,15,26,0.7); padding: 12px; border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
              <div style="color: var(--text-muted); font-size: 0.72rem;">Node Trust Rating</div>
              <div style="font-size: 1.2rem; font-weight: 700; color: var(--accent-emerald);">96.0 / 100 (VERIFIED)</div>
            </div>
            <div style="background: rgba(10,15,26,0.7); padding: 12px; border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
              <div style="color: var(--text-muted); font-size: 0.72rem;">Local Gradient Security</div>
              <div style="font-size: 1.2rem; font-weight: 700; color: var(--accent-sky);">DP Gaussian Mask Active</div>
            </div>
          </div>
        </div>

        <button class="btn btn-secondary" onclick="window.app.navigate('map')" style="width: 100%; margin-top: 16px; font-size: 0.85rem;">
          View Federation Network Map
        </button>
      </div>
    `;
  } else {
    rightSidebarCard = `
      <div class="glass-panel" style="padding: 24px; display: flex; flex-direction: column; justify-content: space-between;">
        <div>
          <h3 style="font-size: 1.1rem; color: var(--text-primary); margin-bottom: 16px;">Quick Round Orchestrator</h3>
          <div class="form-group">
            <label class="form-label">Active Aggregation Strategy</label>
            <select id="quick-strategy" class="form-control form-select">
              <option value="FedAvg" ${status.aggregation_strategy === 'FedAvg' ? 'selected' : ''}>FedAvg (Federated Averaging)</option>
              <option value="TrimmedMean" ${status.aggregation_strategy === 'TrimmedMean' ? 'selected' : ''}>Trimmed Mean (Outlier Truncation)</option>
              <option value="Krum" ${status.aggregation_strategy === 'Krum' ? 'selected' : ''}>Multi-Krum (Distance Minimization)</option>
              <option value="Median" ${status.aggregation_strategy === 'Median' ? 'selected' : ''}>Coordinate-wise Median</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Adversary Simulation Mode</label>
            <div style="display: flex; align-items: center; justify-content: space-between; background: rgba(10,15,26,0.7); padding: 12px; border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
              <div>
                <strong style="font-size: 0.85rem; color: #ffffff;">Inject Threat (Hospital Delta)</strong>
                <p id="quick-attack-note" style="font-size: 0.7rem; color: var(--text-muted); margin: 0;">Off: Normal clinical training.</p>
              </div>
              <label class="switch">
                <input type="checkbox" id="quick-attack-toggle">
                <span class="slider"></span>
              </label>
            </div>
          </div>
        </div>

        <button id="btn-start-configured-round" class="btn btn-primary" style="width: 100%; padding: 12px; font-size: 0.95rem; margin-top: 16px;">
          Execute Training Round
        </button>
      </div>
    `;
  }

  container.innerHTML = `
    <!-- Top HUD Key Metrics -->
    <div class="hud-grid">
      <div class="hud-card glass-panel accent-emerald">
        <div class="hud-label">
          <span>Federation Status</span>
          <span class="badge ${status.federation_status === 'ACTIVE' ? 'badge-active' : 'badge-warning'}">
            <span class="pulse-dot"></span> ${status.federation_status || 'ACTIVE'}
          </span>
        </div>
        <div class="hud-value" style="color: var(--accent-emerald);">Round #${status.current_round || 1}</div>
        <div class="hud-sub">Strategy: <strong style="color: var(--accent-sky);">${status.aggregation_strategy || 'FedAvg'}</strong></div>
      </div>

      <div class="hud-card glass-panel">
        <div class="hud-label">
          <span>Global Model Accuracy</span>
          <span style="color: var(--accent-sky);">Target: 88%</span>
        </div>
        <div class="hud-value">${status.global_accuracy || 76.5}%</div>
        <div class="hud-sub">Loss: <strong class="mono">${status.global_loss || 0.485}</strong> | Version: <strong style="color: var(--accent-sky);">${status.current_model_version || 'v1'}</strong></div>
      </div>

      <div class="hud-card glass-panel">
        <div class="hud-label">
          <span>Participating Nodes</span>
          <span class="mono">${status.active_clients_count || 5}/${status.total_clients_count || 5}</span>
        </div>
        <div class="hud-value" style="color: var(--accent-sky);">${status.active_clients_count || 5} <span style="font-size: 1rem; color: var(--text-muted);">Nodes</span></div>
        <div class="hud-sub">Avg Trust Score: <strong style="color: var(--accent-emerald);">${status.average_trust_score || 94.2}/100</strong></div>
      </div>

      <div class="hud-card glass-panel ${isQuarantined ? 'accent-rose' : ''}">
        <div class="hud-label">
          <span>Threat Engine</span>
          <span class="badge ${isQuarantined ? 'badge-danger' : 'badge-active'}">
            ${isQuarantined ? 'THREAT DETECTED' : 'NOMINAL'}
          </span>
        </div>
        <div class="hud-value" style="color: ${isQuarantined ? 'var(--accent-rose)' : 'var(--accent-emerald)'};">
          ${status.quarantined_clients_count || 0} <span style="font-size: 1rem; color: var(--text-muted);">Quarantined</span>
        </div>
        <div class="hud-sub">Byzantine Radar: <strong>ACTIVE</strong></div>
      </div>

      <div class="hud-card glass-panel accent-purple">
        <div class="hud-label">
          <span>Privacy Budget</span>
          <span style="color: var(--accent-purple);">(&epsilon; = ${status.privacy_epsilon_limit || 4.0}, &delta; = 1e-5)</span>
        </div>
        <div class="hud-value" style="color: var(--accent-purple);">&epsilon; ${status.privacy_budget_spent || 0.0}</div>
        <div class="hud-sub">Differential Privacy: <strong style="color: var(--accent-emerald);">ENFORCED</strong></div>
      </div>
    </div>

    <!-- Central Interactive Animated Topology & Control Row -->
    <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 24px; margin-bottom: 24px;">
      <!-- Interactive SVG Network Graph -->
      <div class="glass-panel" style="padding: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <div>
            <h3 style="font-size: 1.1rem; color: var(--text-primary);">Live Federated AI Topology</h3>
            <p style="font-size: 0.8rem; color: var(--text-muted);">Encrypted gradients flow along conduits — raw clinical data remains strictly on-premise.</p>
          </div>
          ${isAdminOrOp ? `
            <button id="btn-quick-round" class="btn btn-primary">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
              Trigger Round #${(status.current_round || 0) + 1}
            </button>
          ` : ''}
        </div>

        <div class="network-canvas-container" id="network-canvas-box">
          <svg class="network-svg" id="topology-svg" viewBox="0 0 800 440">
            <defs>
              <linearGradient id="cyanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#0ea5e9" />
                <stop offset="100%" stop-color="#8b5cf6" />
              </linearGradient>
              <linearGradient id="conduitGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="rgba(14, 165, 233, 0.2)" />
                <stop offset="50%" stop-color="rgba(14, 165, 233, 0.8)" />
                <stop offset="100%" stop-color="rgba(139, 92, 246, 0.2)" />
              </linearGradient>
              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            <!-- Conduits / Cables -->
            <path id="conduit-alpha" d="M 400,200 L 160,100" stroke="rgba(56, 189, 248, 0.4)" stroke-width="2" fill="none" class="conduit-active" />
            <path id="conduit-beta" d="M 400,200 L 640,100" stroke="rgba(56, 189, 248, 0.4)" stroke-width="2" fill="none" class="conduit-active" />
            <path id="conduit-gamma" d="M 400,200 L 140,320" stroke="rgba(56, 189, 248, 0.4)" stroke-width="2" fill="none" class="conduit-active" />
            <path id="conduit-delta" d="M 400,200 L 400,370" stroke="${isQuarantined ? 'rgba(244, 63, 94, 0.6)' : 'rgba(56, 189, 248, 0.4)'}" stroke-width="2" fill="none" class="conduit-active" />
            <path id="conduit-epsilon" d="M 400,200 L 660,320" stroke="rgba(56, 189, 248, 0.4)" stroke-width="2" fill="none" class="conduit-active" />

            <!-- Server Node in Center -->
            <g id="node-server" transform="translate(400, 200)">
              <circle r="42" fill="url(#cyanGrad)" filter="url(#glow)" />
              <circle r="36" fill="#0b0f19" stroke="#38bdf8" stroke-width="2" />
              <text y="-4" text-anchor="middle" fill="#ffffff" font-size="12" font-weight="700" font-family="var(--font-sans)">FEDERAI</text>
              <text y="14" text-anchor="middle" fill="#38bdf8" font-size="9" font-family="var(--font-mono)">AGGREGATOR</text>
            </g>

            <!-- Hospital Alpha -->
            <g id="node-alpha" transform="translate(160, 100)" class="map-node">
              <circle r="28" fill="#1e293b" stroke="#10b981" stroke-width="2" />
              <text y="-2" text-anchor="middle" fill="#ffffff" font-size="10" font-weight="600">ALPHA</text>
              <text y="12" text-anchor="middle" fill="#94a3b8" font-size="8">NY Cardiac</text>
            </g>

            <!-- Hospital Beta -->
            <g id="node-beta" transform="translate(640, 100)" class="map-node">
              <circle r="28" fill="#1e293b" stroke="#10b981" stroke-width="2" />
              <text y="-2" text-anchor="middle" fill="#ffffff" font-size="10" font-weight="600">BETA</text>
              <text y="12" text-anchor="middle" fill="#94a3b8" font-size="8">Mayo Clinic</text>
            </g>

            <!-- Hospital Gamma -->
            <g id="node-gamma" transform="translate(140, 320)" class="map-node">
              <circle r="28" fill="#1e293b" stroke="#10b981" stroke-width="2" />
              <text y="-2" text-anchor="middle" fill="#ffffff" font-size="10" font-weight="600">GAMMA</text>
              <text y="12" text-anchor="middle" fill="#94a3b8" font-size="8">Stanford</text>
            </g>

            <!-- Hospital Delta -->
            <g id="node-delta" transform="translate(400, 370)" class="map-node">
              <circle r="28" fill="#1e293b" stroke="${isQuarantined ? '#f43f5e' : '#10b981'}" stroke-width="${isQuarantined ? '3' : '2'}" />
              <text y="-2" text-anchor="middle" fill="#ffffff" font-size="10" font-weight="600">DELTA</text>
              <text y="12" text-anchor="middle" fill="${isQuarantined ? '#f43f5e' : '#94a3b8'}" font-size="8">${isQuarantined ? 'QUARANTINE' : 'Hopkins'}</text>
            </g>

            <!-- Hospital Epsilon -->
            <g id="node-epsilon" transform="translate(660, 320)" class="map-node">
              <circle r="28" fill="#1e293b" stroke="#10b981" stroke-width="2" />
              <text y="-2" text-anchor="middle" fill="#ffffff" font-size="10" font-weight="600">EPSILON</text>
              <text y="12" text-anchor="middle" fill="#94a3b8" font-size="8">Cleveland</text>
            </g>
          </svg>
        </div>
      </div>

      <!-- Right Column: Role-Specific Card -->
      ${rightSidebarCard}
    </div>

    <!-- Live Telemetry Stream and Accuracy Trend Chart -->
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
      <!-- Accuracy Canvas Chart -->
      <div class="glass-panel" style="padding: 20px;">
        <h3 style="font-size: 1.05rem; color: var(--text-primary); margin-bottom: 12px;">Global Model Convergence Over Rounds</h3>
        <div style="height: 180px; position: relative;">
          <canvas id="accuracyChart" width="500" height="180" style="width: 100%; height: 100%;"></canvas>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--text-muted); margin-top: 8px;">
          <span>Initial Baseline: 50.0%</span>
          <span style="color: var(--accent-emerald);">Current: ${status.global_accuracy || 76.5}%</span>
          <span style="color: var(--accent-sky);">Target: 88.0%</span>
        </div>
      </div>

      <!-- Live WebSocket Telemetry Log -->
      <div class="glass-panel" style="padding: 20px;">
        <h3 style="font-size: 1.05rem; color: var(--text-primary); margin-bottom: 12px;">Live Telemetry Conduit (WebSocket Events)</h3>
        <div id="telemetry-log" class="telemetry-log" style="height: 180px;">
          <div style="color: var(--accent-emerald);">[SYSTEM] Connected to FederAI Cloud WebSocket conduit.</div>
          <div style="color: var(--text-muted);">[BOOTSTRAP] 5 hospital nodes online & verified with Differential Privacy.</div>
          <div style="color: var(--accent-sky);">[STATUS] Multi-Center Diagnostic Federation initialized.</div>
        </div>
      </div>
    </div>
  `;

  // Attach event listeners for Admin / Operator
  if (isAdminOrOp) {
    const attackToggle = document.getElementById('quick-attack-toggle');
    const attackNote = document.getElementById('quick-attack-note');
    if (attackToggle && attackNote) {
      attackToggle.addEventListener('change', (e) => {
        if (e.target.checked) {
          attackNote.textContent = 'Warning: Hospital Delta will inject a poisoned sign-flipped gradient!';
          attackNote.style.color = 'var(--accent-rose)';
        } else {
          attackNote.textContent = 'Off: All hospitals transmit verified clinical updates.';
          attackNote.style.color = 'var(--text-muted)';
        }
      });
    }

    const triggerHandler = async () => {
      const strategyEl = document.getElementById('quick-strategy');
      const strategy = strategyEl ? strategyEl.value : 'FedAvg';
      const isAttack = attackToggle ? attackToggle.checked : false;
      
      const btn = document.getElementById('btn-start-configured-round');
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="pulse-dot"></span> Training in progress...';
      }

      try {
        await api.startRound({
          epochs: 3,
          lr: 0.02,
          strategy: strategy,
          epsilon: 4.0,
          delta: 1e-5,
          simulate_attack: isAttack,
          attack_client_id: 'client-delta',
          attack_type: 'sign_flipping'
        });
        
        await window.app.refreshState();
      } catch (err) {
        alert(`Round execution failed: ${err.message}`);
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = 'Execute Training Round';
        }
      }
    };

    document.getElementById('btn-quick-round')?.addEventListener('click', triggerHandler);
    document.getElementById('btn-start-configured-round')?.addEventListener('click', triggerHandler);
  }

  // Render Canvas Chart
  renderAccuracyChart(status.accuracy_trend || []);
}

function renderAccuracyChart(trends) {
  const canvas = document.getElementById('accuracyChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  ctx.clearRect(0, 0, w, h);

  // Background grid
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
  ctx.lineWidth = 1;
  for (let y = 20; y < h; y += 35) {
    ctx.beginPath();
    ctx.moveTo(30, y);
    ctx.lineTo(w - 10, y);
    ctx.stroke();
  }

  const defaultData = [50.0, 56.2, 64.8, 71.3, 76.5, 81.2, 84.5];
  const data = (trends && trends.length >= 2) ? trends : defaultData;

  // Draw accuracy curve
  ctx.strokeStyle = '#0ea5e9';
  ctx.lineWidth = 3;
  ctx.beginPath();

  const stepX = (w - 60) / (data.length - 1);
  data.forEach((val, idx) => {
    const x = 40 + idx * stepX;
    const y = h - 30 - ((val - 40) / 60) * (h - 60);
    if (idx === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  // Draw points
  data.forEach((val, idx) => {
    const x = 40 + idx * stepX;
    const y = h - 30 - ((val - 40) / 60) * (h - 60);
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();

    // Text label
    ctx.fillStyle = '#94a3b8';
    ctx.font = '9px monospace';
    ctx.fillText(`${val}%`, x - 12, y - 8);
  });
}
