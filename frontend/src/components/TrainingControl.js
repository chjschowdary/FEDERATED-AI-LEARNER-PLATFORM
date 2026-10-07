import { api } from '../services/api.js';

export function renderTrainingControl(container, state) {
  const status = state.status || {};
  const user = api.user || { role: 'ADMIN' };
  const isAuditor = (user.role === 'VIEWER' || user.role === 'AUDITOR');
  const isClient = (user.role === 'CLIENT');
  const isAdminOrOp = (user.role === 'ADMIN' || user.role === 'OPERATOR');

  let actionSectionHtml = '';
  if (isAuditor) {
    actionSectionHtml = `
      <div style="margin-top: 24px; padding: 18px; background: rgba(245, 158, 11, 0.1); border-radius: var(--radius-md); border: 1px dashed rgba(245, 158, 11, 0.4); text-align: center;">
        <div style="color: var(--accent-amber); font-weight: 700; font-size: 0.9rem; display: flex; align-items: center; justify-content: center; gap: 8px;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
          COMPLIANCE AUDITOR READ-ONLY MODE
        </div>
        <p style="font-size: 0.78rem; color: #fde68a; margin-top: 6px;">
          Orchestration execution and threat injection triggers are locked to preserve regulatory audit impartiality. Use the Audit Logs and Security Center tabs to inspect historical telemetry.
        </p>
      </div>
    `;
  } else if (isClient) {
    actionSectionHtml = `
      <div style="margin-top: 24px; padding: 18px; background: rgba(16, 185, 129, 0.1); border-radius: var(--radius-md); border: 1px dashed rgba(16, 185, 129, 0.4); text-align: center;">
        <div style="color: var(--accent-emerald); font-weight: 700; font-size: 0.9rem; display: flex; align-items: center; justify-content: center; gap: 8px;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>
          HOSPITAL EDGE NODE ENCLAVE (AUTOMATIC LOCAL SGD)
        </div>
        <p style="font-size: 0.78rem; color: #a7f3d0; margin-top: 6px;">
          Your local edge node trains automatically when the central coordinator dispatches global rounds. Global orchestration is managed by system operators.
        </p>
      </div>
    `;
  } else {
    actionSectionHtml = `
      <div style="margin-top: 16px; padding: 16px; background: rgba(10, 15, 26, 0.7); border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <strong style="font-size: 0.9rem; color: var(--text-primary);">Adversarial Attack Simulation</strong>
            <p style="font-size: 0.75rem; color: var(--text-muted);">Simulates an adversary injecting malicious updates from Hospital Delta.</p>
          </div>
          <label class="switch">
            <input type="checkbox" id="train-attack-toggle">
            <span class="slider"></span>
          </label>
        </div>

        <div id="attack-options" style="margin-top: 12px; display: none;">
          <label class="form-label">Attack Vector</label>
          <select id="train-attack-type" class="form-control form-select">
            <option value="sign_flipping" selected>Sign-Flipping Gradient Inversion (Inverts convergence direction)</option>
            <option value="gradient_scaling">Gradient Scaling & Centroid Hijack (20x magnitude)</option>
            <option value="random_noise">Random High-Variance Noise Poisoning</option>
            <option value="label_flipping">Label-Flipping Diagnostic Corruption</option>
          </select>
        </div>
      </div>

      <div style="margin-top: 24px;">
        <button id="btn-run-full-round" class="btn btn-primary" style="width: 100%; padding: 14px; font-size: 0.95rem;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
          Launch Federation Round #${(status.current_round || 0) + 1}
        </button>
      </div>
    `;
  }

  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
      <div>
        <h2 style="font-size: 1.5rem; color: var(--text-primary);">Federated Training Control Center</h2>
        <p style="font-size: 0.875rem; color: var(--text-muted);">Configure hyperparameters, privacy bounds, aggregation algorithms, and test attack resilience.</p>
      </div>
      <div>
        ${isAdminOrOp ? `
          <button id="btn-reset-federation" class="btn btn-secondary">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg>
            Reset Environment
          </button>
        ` : ''}
      </div>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 32px;">
      <!-- Hyperparameter & Strategy Form -->
      <div class="glass-panel" style="padding: 24px;">
        <h3 style="font-size: 1.15rem; margin-bottom: 16px;">Round Configuration</h3>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
          <div class="form-group">
            <label class="form-label">Local Epochs (E)</label>
            <input type="number" id="train-epochs" class="form-control mono" value="3" min="1" max="20" ${!isAdminOrOp ? 'disabled' : ''}>
          </div>
          <div class="form-group">
            <label class="form-label">Learning Rate (&eta;)</label>
            <input type="number" id="train-lr" class="form-control mono" value="0.02" step="0.005" min="0.001" max="0.5" ${!isAdminOrOp ? 'disabled' : ''}>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Aggregation Algorithm</label>
          <select id="train-strategy" class="form-control form-select" ${!isAdminOrOp ? 'disabled' : ''}>
            <option value="FedAvg">FedAvg — Weighted Federated Averaging (McMahan et al.)</option>
            <option value="TrimmedMean" selected>Trimmed Mean — Coordinate-wise &beta;=0.15 Trimming (Yin et al.)</option>
            <option value="Krum">Multi-Krum — Pairwise Byzantine Distance Minimization (Blanchard et al.)</option>
            <option value="Median">Coordinate-wise Median — Non-Parametric Byzantine Defense</option>
          </select>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
          <div class="form-group">
            <label class="form-label">Differential Privacy &epsilon; (Epsilon)</label>
            <input type="number" id="train-epsilon" class="form-control mono" value="4.0" step="0.5" min="0.1" max="20.0" ${!isAdminOrOp ? 'disabled' : ''}>
          </div>
          <div class="form-group">
            <label class="form-label">DP &delta; (Delta)</label>
            <input type="text" id="train-delta" class="form-control mono" value="1e-5" readonly>
          </div>
        </div>

        ${actionSectionHtml}
      </div>

      <!-- Live Execution Telemetry Tracker -->
      <div class="glass-panel" style="padding: 24px; display: flex; flex-direction: column; justify-content: space-between;">
        <div>
          <h3 style="font-size: 1.15rem; margin-bottom: 8px;">Round Execution Telemetry</h3>
          <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 20px;">Live lifecycle tracking across the cloud aggregation pipeline.</p>

          <div class="step-tracker">
            <div class="step-item" id="step-1">1</div>
            <div class="step-item" id="step-2">2</div>
            <div class="step-item" id="step-3">3</div>
            <div class="step-item" id="step-4">4</div>
            <div class="step-item" id="step-5">5</div>
          </div>

          <div style="display: flex; justify-content: space-between; font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; margin-bottom: 24px;">
            <span>1. Dispatch</span>
            <span>2. Train</span>
            <span>3. DP Noise</span>
            <span>4. Threat Scan</span>
            <span>5. Aggregate</span>
          </div>

          <div id="round-live-feedback" style="background: rgba(10, 15, 26, 0.7); border-radius: var(--radius-md); padding: 16px; font-family: var(--font-mono); font-size: 0.8rem; min-height: 140px; color: var(--text-secondary); line-height: 1.6;">
            <div>&bull; Federation State: <span style="color: var(--accent-emerald); font-weight: 600;">${status.federation_status || 'IDLE'}</span></div>
            <div>&bull; Active Session: <span style="color: #ffffff;">${status.session_id || 'FED-CLINICAL-RISK-2026'}</span></div>
            <div>&bull; Current Round: <span class="mono" style="color: var(--accent-sky);">#${status.current_round || 0}</span></div>
            <div>&bull; Privacy Budget Spent: <span class="mono" style="color: var(--accent-purple);">&epsilon;=${status.privacy_budget_spent || '0.00'}</span></div>
            <div>&bull; Threat Level: <span style="color: var(--accent-emerald);">${status.threat_level || 'NOMINAL'}</span></div>
          </div>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-subtle); padding-top: 16px; font-size: 0.8rem; color: var(--text-muted);">
          <span>Orchestrator Conduit: WebSocket Active</span>
          <span class="mono" style="color: var(--accent-sky);">Round Latency ~0.35s</span>
        </div>
      </div>
    </div>
  `;

  // Attach handlers if Admin / Operator
  if (isAdminOrOp) {
    const attackToggle = container.querySelector('#train-attack-toggle');
    const attackOptions = container.querySelector('#attack-options');

    attackToggle?.addEventListener('change', () => {
      attackOptions.style.display = attackToggle.checked ? 'block' : 'none';
    });

    container.querySelector('#btn-run-full-round')?.addEventListener('click', async () => {
      const btn = container.querySelector('#btn-run-full-round');
      btn.disabled = true;
      btn.textContent = 'Orchestrating Round in Cloud...';

      const isAttack = attackToggle?.checked || false;
      const attackType = container.querySelector('#train-attack-type')?.value || 'sign_flipping';

      // Step animations
      const setStep = (num, text) => {
        for (let i = 1; i <= 5; i++) {
          const el = container.querySelector(`#step-${i}`);
          if (el) {
            el.className = 'step-item';
            if (i < num) el.classList.add('completed');
            if (i === num) el.classList.add('active');
          }
        }
        const fb = container.querySelector('#round-live-feedback');
        if (fb) {
          fb.innerHTML += `<div>&bull; ${text}</div>`;
          fb.scrollTop = fb.scrollHeight;
        }
      };

      try {
        setStep(1, 'Dispatching global weights v1 to 5 edge hospital nodes...');
        await new Promise(r => setTimeout(r, 400));
        
        setStep(2, 'Hospital nodes computing local SGD gradients on private EHR datasets...');
        await new Promise(r => setTimeout(r, 400));
        
        setStep(3, 'Applying Gaussian L2-gradient clipping (C=1.0) & (ε=4.0, δ=1e-5) privacy noise...');
        await new Promise(r => setTimeout(r, 400));

        setStep(4, isAttack ? `Threat Scanner: Analyzing updates for directional cosine & norm outliers... [INJECTED ATTACK: ${attackType}]` : 'Threat Scanner: Verifying directional cosine similarity against consensus...');
        
        const res = await api.startRound({
          strategy: container.querySelector('#train-strategy')?.value || 'TrimmedMean',
          simulate_attack: isAttack,
          attack_type: attackType,
          attack_client_id: 'client-delta'
        });

        setStep(5, `Aggregated verified updates via ${res.strategy || 'FedAvg'}. New accuracy: ${res.accuracy}% (Loss: ${res.loss})`);
        
        if (res.quarantined_count > 0) {
          const fb = container.querySelector('#round-live-feedback');
          if (fb) {
            fb.innerHTML += `<div style="color: var(--accent-rose); font-weight: 700; margin-top: 8px;">⚠️ ALERT: ${res.quarantined_count} Byzantine node(s) quarantined! Malicious updates discarded from consensus.</div>`;
          }
        }

        btn.disabled = false;
        btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg> Launch Federation Round #${(res.round_number || 0) + 1}`;
        
        if (window.app) window.app.refreshState(false);
      } catch (err) {
        alert(`Round execution failed: ${err.message}`);
        btn.disabled = false;
        btn.textContent = 'Launch Federation Round';
      }
    });

    container.querySelector('#btn-reset-federation')?.addEventListener('click', async () => {
      if (confirm('Are you sure you want to reset the federation state back to Round 0?')) {
        try {
          await api.resetFederation();
          alert('Federation session successfully reset back to baseline v1.0.');
          if (window.app) window.app.refreshState(true);
        } catch (err) {
          alert(`Reset failed: ${err.message}`);
        }
      }
    });
  }
}
