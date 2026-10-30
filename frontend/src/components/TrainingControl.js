import { api } from '../services/api.js';

export function renderTrainingControl(container, state) {
  let isTraining = false;
  let roundsHistory = [];
  let clientsList = state.clients || [];

  // Retain form inputs across background refreshes
  let formState = {
    epochs: 3,
    lr: 0.02,
    strategy: 'FedAvg',
    epsilon: 4.0,
    simulateAttack: false,
    attackClientId: 'client-delta',
    attackType: 'sign_flipping'
  };

  // Retain live terminal logs across re-renders
  const terminalLogs = [
    { time: null, text: '[SYS] Ready to receive federation coordinator events.', color: 'var(--text-muted)' },
    { time: null, text: '[SYS] Architecture: ClinicalRiskMLP (Input: 12 -> Hidden: 24 -> 12 -> Output: 2).', color: 'var(--text-muted)' },
    { time: null, text: '[SYS] Holdout test benchmark loaded into memory.', color: 'var(--text-muted)' }
  ];

  function captureFormState() {
    const epochsInput = document.getElementById('train-epochs');
    if (epochsInput) formState.epochs = parseInt(epochsInput.value, 10) || 3;
    const lrInput = document.getElementById('train-lr');
    if (lrInput) formState.lr = parseFloat(lrInput.value) || 0.02;
    const strategyInput = document.getElementById('train-strategy');
    if (strategyInput) formState.strategy = strategyInput.value;
    const epsilonInput = document.getElementById('train-epsilon');
    if (epsilonInput) formState.epsilon = parseFloat(epsilonInput.value) || 4.0;
    const simAttackInput = document.getElementById('train-simulate-attack');
    if (simAttackInput) formState.simulateAttack = simAttackInput.checked;
    const attackClientInput = document.getElementById('train-attack-client');
    if (attackClientInput) formState.attackClientId = attackClientInput.value;
    const attackTypeInput = document.getElementById('train-attack-type');
    if (attackTypeInput) formState.attackType = attackTypeInput.value;
  }

  async function loadRounds() {
    captureFormState();
    try {
      const [rounds, clients] = await Promise.all([
        api.getRounds().catch(() => []),
        api.getClients().catch(() => [])
      ]);
      roundsHistory = rounds || [];
      clientsList = clients || [];
      render();
    } catch (err) {
      console.warn('Failed to refresh rounds:', err);
    }
  }

  function appendTerminal(text, color = 'var(--text-primary)') {
    const time = new Date().toLocaleTimeString();
    terminalLogs.push({ time, text, color });
    const term = document.getElementById('training-terminal');
    if (term) {
      const line = document.createElement('div');
      line.className = 'terminal-line';
      line.style.color = color;
      line.textContent = `[${time}] ${text}`;
      term.appendChild(line);
      term.scrollTop = term.scrollHeight;
    }
  }

  function render() {
    const user = api.user || { role: 'ADMIN' };
    const canControl = (user.role === 'ADMIN' || user.role === 'OPERATOR');
    const fedStatus = state.status || {};
    const isPaused = fedStatus.federation_status === 'PAUSED';

    // Find any hospital client that has reduced trust, is quarantined, or has detected anomalies
    const incidentClients = clientsList.filter(c => 
      c.status === 'QUARANTINED' || 
      c.trust_score < 80.0 || 
      (c.latest_trust_change && c.latest_trust_change.delta < 0) ||
      (c.anomalies_detected > 0 && c.trust_score < 95.0)
    );

    container.innerHTML = `
      <div class="page-header">
        <div>
          <h2 class="page-title">Federated Training Orchestration</h2>
          <p class="page-description">Coordinate distributed model training across private hospital enclaves with Byzantine anomaly detection and Differential Privacy.</p>
        </div>
        <div class="toolbar-group">
          ${canControl ? `
            <button class="btn btn-secondary btn-sm" id="btn-pause-round" ${isTraining ? '' : 'disabled'}>
              ${isPaused ? 'Resume Session' : 'Pause Training'}
            </button>
            <button class="btn btn-danger btn-sm" id="btn-reset-session">
              Reset Session
            </button>
          ` : ''}
          <button class="btn btn-secondary btn-sm" id="btn-refresh-training">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg>
            Refresh
          </button>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
        <!-- Training Configuration Card -->
        <div class="card">
          <div class="card-header">
            <div class="card-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
              Training Hyperparameters & Security
            </div>
            <span class="badge badge-neutral">Round #${(fedStatus.current_round || 0) + 1}</span>
          </div>
          <form id="training-form">
            <div class="card-body">
              <div id="training-alert" style="display: none;" class="alert"></div>

              <div class="form-grid-2">
                <div class="form-group">
                  <label class="form-label">Local Epochs <span class="unit">(1 - 20)</span></label>
                  <input type="number" id="train-epochs" class="form-control" value="${formState.epochs}" min="1" max="20" required ${!canControl ? 'disabled' : ''}>
                </div>
                <div class="form-group">
                  <label class="form-label">Learning Rate <span class="unit">(&eta;)</span></label>
                  <input type="number" step="0.005" id="train-lr" class="form-control" value="${formState.lr}" min="0.001" max="0.5" required ${!canControl ? 'disabled' : ''}>
                </div>
              </div>

              <div class="form-grid-2">
                <div class="form-group">
                  <label class="form-label">Aggregation Strategy</label>
                  <select id="train-strategy" class="form-control" ${!canControl ? 'disabled' : ''}>
                    <option value="FedAvg" ${formState.strategy === 'FedAvg' ? 'selected' : ''}>FedAvg (Standard Weighted Consensus)</option>
                    <option value="TrimmedMean" ${formState.strategy === 'TrimmedMean' ? 'selected' : ''}>Trimmed Mean (Robust &beta;-Trim)</option>
                    <option value="Krum" ${formState.strategy === 'Krum' ? 'selected' : ''}>Multi-Krum (Geometric Distance Consensus)</option>
                  </select>
                </div>

                <div class="form-group">
                  <label class="form-label">Differential Privacy &epsilon; <span class="unit">(Privacy Budget)</span></label>
                  <input type="number" step="0.5" id="train-epsilon" class="form-control" value="${formState.epsilon}" min="0.5" max="20" required ${!canControl ? 'disabled' : ''}>
                </div>
              </div>

              <!-- Byzantine Attack Simulation Toggle -->
              <div style="background: var(--bg-surface-subtle); border: 1px solid var(--border-default); border-radius: var(--radius-md); padding: 12px; margin-top: 6px;">
                <label style="display: flex; align-items: center; gap: 8px; font-weight: 600; font-size: 0.82rem; cursor: pointer;">
                  <input type="checkbox" id="train-simulate-attack" ${formState.simulateAttack ? 'checked' : ''} ${!canControl ? 'disabled' : ''}>
                  Simulate Byzantine Adversarial Vector
                </label>
                <div id="attack-options" style="display: ${formState.simulateAttack ? 'grid' : 'none'}; margin-top: 10px;" class="form-grid-2">
                  <div class="form-group" style="margin-bottom: 0;">
                    <label class="form-label">Target Adversarial Node</label>
                    <select id="train-attack-client" class="form-control" ${!canControl ? 'disabled' : ''}>
                      ${clientsList.map(c => `
                        <option value="${c.client_id}" ${c.client_id === formState.attackClientId ? 'selected' : ''}>
                          ${escapeHtml(c.name)} (${c.client_id})
                        </option>
                      `).join('')}
                    </select>
                  </div>
                  <div class="form-group" style="margin-bottom: 0;">
                    <label class="form-label">Attack Type</label>
                    <select id="train-attack-type" class="form-control" ${!canControl ? 'disabled' : ''}>
                      <option value="sign_flipping" ${formState.attackType === 'sign_flipping' ? 'selected' : ''}>Sign Flipping (-1.5 * &Delta;w)</option>
                      <option value="gradient_scaling" ${formState.attackType === 'gradient_scaling' ? 'selected' : ''}>Gradient Scaling (100 * &Delta;w)</option>
                      <option value="label_flipping" ${formState.attackType === 'label_flipping' ? 'selected' : ''}>Label Inversion (Local Poisoning)</option>
                      <option value="random_noise" ${formState.attackType === 'random_noise' ? 'selected' : ''}>Gaussian Noise Injection</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div class="card-footer" style="display: flex; justify-content: flex-end;">
              ${canControl ? `
                <button type="submit" class="btn btn-primary" id="btn-start-round" ${isTraining ? 'disabled' : ''}>
                  ${isTraining ? 'Training in Progress...' : 'Launch Training Round'}
                </button>
              ` : `
                <span style="font-size: 0.8rem; color: var(--text-muted);">Read-Only Mode: Sign in as Administrator or Operator to trigger training.</span>
              `}
            </div>
          </form>
        </div>

        <!-- Live Telemetry Terminal Card -->
        <div class="card" style="display: flex; flex-direction: column;">
          <div class="card-header">
            <div class="card-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></svg>
              Live Telemetry & Pipeline Events
            </div>
            <span class="badge badge-neutral mono" style="font-size: 0.7rem;">WebSocket / Stream</span>
          </div>
          <div class="card-body" style="flex: 1; display: flex; flex-direction: column;">
            <div class="terminal-box" id="training-terminal" style="flex: 1; min-height: 220px; overflow-y: auto;">
              ${terminalLogs.map(log => `
                <div class="terminal-line" style="color: ${log.color};">
                  ${log.time ? `<span style="opacity: 0.8;">[${log.time}]</span> ` : ''}${escapeHtml(log.text)}
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>

      <!-- Participating Hospital Nodes Matrix -->
      <div class="card" style="margin-bottom: 20px;">
        <div class="card-header">
          <div class="card-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect><rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect><line x1="6" y1="6" x2="6.01" y2="6"></line><line x1="6" y1="18" x2="6.01" y2="18"></line></svg>
            Hospital Nodes Telemetry & Bayesian Trust
          </div>
          <span class="badge badge-neutral">${clientsList.length} Connected Enclaves</span>
        </div>
        <div class="card-body" style="padding: 0;">
          <table class="data-table">
            <thead>
              <tr>
                <th>Client Node</th>
                <th>Medical Institution</th>
                <th>Specialty & Region</th>
                <th style="text-align: right;">Enclave Dataset</th>
                <th>Trust Score</th>
                <th>Node Status</th>
                <th style="text-align: right;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${clientsList.length > 0 ? clientsList.map(c => `
                <tr>
                  <td><strong class="mono" style="font-size: 0.82rem;">${escapeHtml(c.client_id)}</strong></td>
                  <td>${escapeHtml(c.name)}</td>
                  <td style="color: var(--text-muted); font-size: 0.8rem;">
                    ${escapeHtml(c.specialty || c.organization?.specialty || 'General')} &bull; ${escapeHtml(c.region || c.organization?.region || 'US')}
                  </td>
                  <td style="text-align: right;" class="mono">
                    <strong>${c.dataset_size || 50}</strong> <small style="color: var(--text-muted);">records</small>
                  </td>
                  <td>
                    <div style="display: flex; align-items: center; gap: 8px;">
                      <strong class="mono" style="font-size: 0.85rem; color: ${c.trust_score >= 80 ? 'var(--status-success)' : c.trust_score >= 50 ? 'var(--status-warning)' : 'var(--status-danger)'};">
                        ${c.trust_score.toFixed(1)}
                      </strong>
                      <div class="bar-track" style="width: 60px;">
                        <div class="bar-fill ${c.trust_score >= 80 ? 'bar-fill-trust' : 'bar-fill-danger'}" style="width: ${c.trust_score}%;"></div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span class="badge ${c.status === 'ACTIVE' || c.status === 'READY' ? 'badge-success' : 'badge-danger'}">
                      ${escapeHtml(c.status)}
                    </span>
                  </td>
                  <td style="text-align: right;">
                    ${c.status === 'QUARANTINED' && canControl ? `
                      <button class="btn btn-secondary btn-sm btn-unquarantine" data-id="${c.client_id}">
                        Unquarantine
                      </button>
                    ` : `
                      <span style="font-size: 0.75rem; color: var(--text-muted);">-</span>
                    `}
                  </td>
                </tr>
              `).join('') : `
                <tr><td colspan="7" class="empty-state">No hospital clients found.</td></tr>
              `}
            </tbody>
          </table>
        </div>
      </div>

      <!-- DEDICATED SECTION: Hospital Trust Penalties & Quarantine Incident Diagnostics -->
      <div class="card" style="margin-bottom: 20px;">
        <div class="card-header">
          <div class="card-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
            </svg>
            Hospital Trust Penalties & Quarantine Incident Diagnostics
          </div>
          ${incidentClients.length > 0 ? `
            <span class="badge badge-danger">${incidentClients.length} Node${incidentClients.length > 1 ? 's' : ''} Flagged</span>
          ` : `
            <span class="badge badge-success">All ${clientsList.length} Nodes Nominal</span>
          `}
        </div>
        <div class="card-body">
          ${incidentClients.length > 0 ? `
            <div style="display: flex; flex-direction: column; gap: 16px;">
              ${incidentClients.map(c => {
                const isQuarantined = (c.status === 'QUARANTINED');
                const threatScore = c.threat_score || (c.latest_trust_change ? c.latest_trust_change.threat_score : (c.risk_score || 88.0));
                const penaltyVal = (35.0 + threatScore * 0.25);
                const prevTrust = c.latest_trust_change ? c.latest_trust_change.previous_trust : 95.0;
                const currentTrust = c.trust_score;
                const delta = c.latest_trust_change ? c.latest_trust_change.delta : (currentTrust - prevTrust);
                
                // Detailed diagnostic explanation
                const rawReason = c.latest_quarantine_reason || 
                                  (c.latest_trust_change ? c.latest_trust_change.reason : null) || 
                                  'Byzantine gradient anomaly detected during statistical consensus verification';

                return `
                  <div class="incident-card ${isQuarantined ? 'incident-card-quarantined' : 'incident-card-penalized'}">
                    <div class="incident-header">
                      <div style="display: flex; align-items: center; gap: 10px;">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${isQuarantined ? 'var(--status-danger)' : 'var(--status-warning)'}" stroke-width="2">
                          <circle cx="12" cy="12" r="10"></circle>
                          <line x1="12" y1="8" x2="12" y2="12"></line>
                          <line x1="12" y1="16" x2="12.01" y2="16"></line>
                        </svg>
                        <div>
                          <strong style="font-size: 0.92rem; color: var(--text-primary);">${escapeHtml(c.name)}</strong>
                          <span class="mono" style="font-size: 0.8rem; color: var(--text-muted); margin-left: 6px;">(${escapeHtml(c.client_id)})</span>
                        </div>
                      </div>
                      <div style="display: flex; align-items: center; gap: 10px;">
                        <span class="badge ${isQuarantined ? 'badge-danger' : 'badge-warning'}">
                          ${isQuarantined ? 'QUARANTINED & ISOLATED' : 'TRUST SCORE DEGRADED'}
                        </span>
                        ${isQuarantined && canControl ? `
                          <button class="btn btn-secondary btn-sm btn-unquarantine" data-id="${c.client_id}">
                            Approve & Unquarantine Node
                          </button>
                        ` : ''}
                      </div>
                    </div>

                    <div class="incident-body">
                      <!-- 4-Metric Diagnostic Grid -->
                      <div class="incident-metrics-grid">
                        <div class="incident-metric-box">
                          <div class="incident-metric-label">Trust Score Trajectory</div>
                          <div class="incident-metric-value" style="color: ${currentTrust >= 80 ? 'var(--status-success)' : currentTrust >= 50 ? 'var(--status-warning)' : 'var(--status-danger)'};">
                            ${prevTrust.toFixed(1)} &rarr; ${currentTrust.toFixed(1)}
                            <span style="font-size: 0.8rem; font-weight: normal; color: var(--status-danger); margin-left: 4px;">
                              (${delta >= 0 ? '+' : ''}${delta.toFixed(1)} pts)
                            </span>
                          </div>
                          <div style="font-size: 0.73rem; color: var(--text-muted); margin-top: 3px;">
                            ${currentTrust < 50 ? 'High Risk Status' : 'Monitored Status'}
                          </div>
                        </div>

                        <div class="incident-metric-box">
                          <div class="incident-metric-label">Threat Confidence Score</div>
                          <div class="incident-metric-value" style="color: var(--status-danger);">
                            ${threatScore.toFixed(1)}%
                          </div>
                          <div style="font-size: 0.73rem; color: var(--text-muted); margin-top: 3px;">
                            ${threatScore >= 50 ? 'Exceeds Anomaly Cutoff (50.0%)' : 'Sub-Threshold Anomaly'}
                          </div>
                        </div>

                        <div class="incident-metric-box">
                          <div class="incident-metric-label">Bayesian Penalty Formula</div>
                          <div class="incident-metric-value mono" style="font-size: 0.88rem; color: var(--text-primary);">
                            -${penaltyVal.toFixed(1)} pts
                          </div>
                          <div style="font-size: 0.73rem; color: var(--text-muted); margin-top: 3px;">
                            P = 35.0 + (0.25 &times; ThreatScore)
                          </div>
                        </div>

                        <div class="incident-metric-box">
                          <div class="incident-metric-label">Consensus Enforcement</div>
                          <div class="incident-metric-value" style="color: ${isQuarantined ? 'var(--status-danger)' : 'var(--status-warning)'};">
                            ${isQuarantined ? 'Zero-Weighted Isolation' : 'Strict Verification'}
                          </div>
                          <div style="font-size: 0.73rem; color: var(--text-muted); margin-top: 3px;">
                            ${isQuarantined ? 'Weights excluded from global model' : 'Monitored for repeat anomalies'}
                          </div>
                        </div>
                      </div>

                      <!-- Exact Technical Reason for Reduction & Quarantine -->
                      <div class="incident-reason-box ${isQuarantined ? '' : 'warning-tone'}">
                        <div class="incident-reason-title" style="color: ${isQuarantined ? 'var(--status-danger)' : 'var(--status-warning)'};">
                          Diagnostic Root Cause & Reason for Score Reduction / Quarantine:
                        </div>
                        <div style="font-size: 0.85rem; font-weight: 600; color: var(--text-primary); margin-bottom: 6px;">
                          ${escapeHtml(rawReason)}
                        </div>
                        <div style="font-size: 0.78rem; color: var(--text-secondary); line-height: 1.5;">
                          <strong>Why Trust Was Reduced:</strong> The dynamic Bayesian Trust Engine detected that this node transmitted a model update that diverged from the coordinate-wise median consensus. In accordance with platform security policy, a base penalty of 35.0 pts plus 0.25 &times; threat confidence was deducted.<br>
                          ${isQuarantined ? `
                            <strong>Why Quarantined:</strong> The threat score of ${threatScore.toFixed(1)}% exceeded the safety threshold of 50.0%. To prevent model poisoning and preserve convergence for all remaining hospitals, the coordinator placed this enclave in quarantine and set its aggregation weight to 0.00.
                          ` : `
                            <strong>Current Action:</strong> The node remains active under enhanced monitoring. Additional anomalous updates will trigger immediate automated quarantine.
                          `}
                        </div>
                        ${c.latest_trust_change && c.latest_trust_change.timestamp ? `
                          <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 8px;">
                            Incident Recorded: ${formatDate(c.latest_trust_change.timestamp)}
                          </div>
                        ` : ''}
                      </div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          ` : `
            <div style="display: flex; align-items: center; gap: 16px; padding: 14px; background: var(--status-success-bg); border: 1px solid var(--status-success-border); border-radius: var(--radius-md);">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--status-success)" stroke-width="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
              <div style="flex: 1;">
                <h4 style="margin: 0; font-size: 0.9rem; font-weight: 600; color: var(--status-success);">
                  All Connected Hospital Nodes Operating at Nominal Trust
                </h4>
                <p style="margin: 3px 0 0 0; font-size: 0.8rem; color: var(--text-secondary);">
                  Every enclave update in the active session has satisfied Byzantine consensus alignment (Cosine Similarity &ge; 0.20, Gradient Norm Z-score &le; 2.20). No active quarantine isolations or trust degradation penalties are currently in effect.
                </p>
              </div>
              <div style="text-align: right;" class="mono">
                <span style="font-size: 0.75rem; color: var(--text-muted);">Active Compliance</span><br>
                <strong style="color: var(--status-success); font-size: 1rem;">100.0%</strong>
              </div>
            </div>
          `}
        </div>
      </div>

      <!-- Training Rounds History -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
            Completed Rounds History
          </div>
          <span class="badge badge-neutral">${roundsHistory.length} Rounds Executed</span>
        </div>
        <div class="card-body" style="padding: 0;">
          <table class="data-table">
            <thead>
              <tr>
                <th>Round</th>
                <th>Status</th>
                <th>Strategy</th>
                <th>Nodes Participated</th>
                <th>Verified Updates</th>
                <th>Quarantined</th>
                <th>Holdout Accuracy</th>
                <th>Loss</th>
                <th>Duration</th>
                <th>Completed At</th>
              </tr>
            </thead>
            <tbody>
              ${roundsHistory.length > 0 ? roundsHistory.map(r => `
                <tr>
                  <td><strong class="mono">#${r.round_number}</strong></td>
                  <td><span class="badge badge-success">${escapeHtml(r.status)}</span></td>
                  <td><span class="badge badge-neutral">${escapeHtml(r.aggregation_strategy || 'FedAvg')}</span></td>
                  <td class="mono">${r.participating_clients || '-'}</td>
                  <td class="mono" style="color: var(--status-success);">${r.verified_updates || '-'}</td>
                  <td class="mono" style="color: ${r.quarantined_updates > 0 ? 'var(--status-danger)' : 'var(--text-muted)'};">
                    ${r.quarantined_updates || 0}
                  </td>
                  <td><strong class="mono" style="color: var(--status-success);">${r.global_accuracy ? r.global_accuracy.toFixed(1) + '%' : '-'}</strong></td>
                  <td class="mono">${r.global_loss ? r.global_loss.toFixed(4) : '-'}</td>
                  <td class="mono" style="font-size: 0.78rem;">${r.duration_seconds ? r.duration_seconds.toFixed(2) + 's' : '-'}</td>
                  <td class="mono" style="font-size: 0.75rem; color: var(--text-muted);">${formatDate(r.end_time || r.start_time)}</td>
                </tr>
              `).join('') : `
                <tr><td colspan="10" class="empty-state">No training rounds have been executed yet.</td></tr>
              `}
            </tbody>
          </table>
        </div>
      </div>
    `;

    // Ensure terminal scrolls to latest output after render
    const term = document.getElementById('training-terminal');
    if (term) term.scrollTop = term.scrollHeight;

    attachEvents();
  }

  function attachEvents() {
    // Attack toggle
    const attackCheckbox = document.getElementById('train-simulate-attack');
    const attackOptions = document.getElementById('attack-options');
    attackCheckbox?.addEventListener('change', () => {
      formState.simulateAttack = attackCheckbox.checked;
      if (attackOptions) {
        attackOptions.style.display = attackCheckbox.checked ? 'grid' : 'none';
      }
    });

    // Capture form values when inputs change
    document.getElementById('train-epochs')?.addEventListener('change', (e) => {
      formState.epochs = parseInt(e.target.value, 10) || 3;
    });
    document.getElementById('train-lr')?.addEventListener('change', (e) => {
      formState.lr = parseFloat(e.target.value) || 0.02;
    });
    document.getElementById('train-strategy')?.addEventListener('change', (e) => {
      formState.strategy = e.target.value;
    });
    document.getElementById('train-epsilon')?.addEventListener('change', (e) => {
      formState.epsilon = parseFloat(e.target.value) || 4.0;
    });
    document.getElementById('train-attack-client')?.addEventListener('change', (e) => {
      formState.attackClientId = e.target.value;
    });
    document.getElementById('train-attack-type')?.addEventListener('change', (e) => {
      formState.attackType = e.target.value;
    });

    // Refresh
    document.getElementById('btn-refresh-training')?.addEventListener('click', () => {
      loadRounds();
    });

    // Pause
    document.getElementById('btn-pause-round')?.addEventListener('click', async () => {
      try {
        const res = await api.pauseFederation();
        appendTerminal(`Federation session paused: ${res.status}`, 'var(--status-warning)');
        loadRounds();
      } catch (err) {
        alert(`Failed to pause: ${err.message}`);
      }
    });

    // Reset session
    document.getElementById('btn-reset-session')?.addEventListener('click', async () => {
      if (confirm('Reset the active federation session? This resets all client status to READY and sets round to 0.')) {
        try {
          const res = await api.resetFederation();
          appendTerminal(`Federation session reset. Active nodes: ${res.active_clients}`, 'var(--status-warning)');
          loadRounds();
        } catch (err) {
          alert(`Failed to reset: ${err.message}`);
        }
      }
    });

    // Start training round
    document.getElementById('training-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      captureFormState();

      const alertBox = document.getElementById('training-alert');
      const startBtn = document.getElementById('btn-start-round');
      alertBox.style.display = 'none';

      isTraining = true;
      startBtn.disabled = true;
      startBtn.textContent = 'Training in Progress...';

      appendTerminal(`[LAUNCH] Dispatching global model weights to hospital enclaves (${formState.strategy})...`, 'var(--accent-primary)');

      try {
        const result = await api.startRound({
          epochs: formState.epochs,
          lr: formState.lr,
          strategy: formState.strategy,
          epsilon: formState.epsilon,
          delta: 1e-5,
          simulate_attack: formState.simulateAttack,
          attack_client_id: formState.simulateAttack ? formState.attackClientId : null,
          attack_type: formState.simulateAttack ? formState.attackType : 'sign_flipping'
        });

        appendTerminal(`[SUCCESS] Round #${result.round_number || ''} completed! Accuracy: ${result.accuracy ? result.accuracy.toFixed(1) + '%' : 'N/A'}, Loss: ${result.loss ? result.loss.toFixed(4) : 'N/A'}`, 'var(--status-success)');
        if (result.quarantined_count > 0) {
          appendTerminal(`[ALERT] Byzantine threat detected! Quarantined node: ${result.quarantined_clients.join(', ')}`, 'var(--status-danger)');
        }

        alertBox.className = 'alert alert-success';
        alertBox.innerHTML = `Round completed successfully! Global Accuracy: <strong>${result.accuracy ? result.accuracy.toFixed(1) + '%' : 'N/A'}</strong> (Loss: ${result.loss ? result.loss.toFixed(4) : 'N/A'})`;
        alertBox.style.display = 'block';

      } catch (err) {
        appendTerminal(`[ERROR] Training failed: ${err.message}`, 'var(--status-danger)');
        alertBox.className = 'alert alert-danger';
        alertBox.textContent = `Training failed: ${err.message}`;
        alertBox.style.display = 'block';
      } finally {
        isTraining = false;
        startBtn.disabled = false;
        startBtn.textContent = 'Launch Training Round';
        loadRounds();
      }
    });

    // Unquarantine buttons (both in table and in diagnostic incident cards)
    container.querySelectorAll('.btn-unquarantine').forEach(btn => {
      btn.addEventListener('click', async () => {
        const clientId = btn.dataset.id;
        try {
          await api.unquarantineClient(clientId);
          appendTerminal(`Node '${clientId}' unquarantined and restored to active pool with nominal trust.`, 'var(--status-success)');
          loadRounds();
        } catch (err) {
          alert(`Failed to unquarantine: ${err.message}`);
        }
      });
    });
  }

  // Subscribe to live WebSocket updates
  const unsubscribeWs = api.onWebSocketMessage((event) => {
    if (event.event_type === 'TRAINING_STARTED') {
      appendTerminal(`Round #${event.payload.round_number} started with strategy ${event.payload.strategy}.`, 'var(--accent-primary)');
    } else if (event.event_type === 'CLIENT_TRAINED') {
      const isAttacker = event.payload.is_attacker;
      appendTerminal(`Node '${event.payload.client_id}' computed SGD update (Acc: ${event.payload.accuracy}%).`, isAttacker ? 'var(--status-danger)' : 'var(--text-secondary)');
    } else if (event.event_type === 'SECURITY_ALERT') {
      appendTerminal(`Threat anomaly detected! Node '${event.payload.client_id}' quarantined!`, 'var(--status-danger)');
    } else if (event.event_type === 'ROUND_COMPLETED') {
      appendTerminal(`Round #${event.payload.round_number} completed. Global Accuracy: ${event.payload.accuracy}%.`, 'var(--status-success)');
      loadRounds();
    }
  });

  loadRounds();
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
