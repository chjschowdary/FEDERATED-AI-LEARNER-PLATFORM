import { api } from './services/api.js';
import { renderOverview } from './components/OverviewView.js';
import { renderPatientDataset } from './components/PatientDataset.js';
import { renderTrainingControl } from './components/TrainingControl.js';
import { renderModelResults } from './components/ModelResults.js';
import { renderSecurityAudit } from './components/SecurityAudit.js';
import { renderInfrastructureSettings } from './components/InfrastructureSettings.js';
import { renderVivaReview } from './components/VivaReview.js';

class FedNexusApp {
  constructor() {
    this.currentView = 'overview';
    this.state = {
      status: {},
      clients: [],
      models: [],
      securityEvents: [],
      infrastructure: {},
      auditLogs: []
    };
  }

  async init() {
    if (!api.token) {
      this.renderLoginScreen();
      return;
    }

    try {
      this.renderLayout();
      await this.refreshState();

      api.connectWebSocket();
      api.onWebSocketMessage((event) => {
        this.handleWebSocketEvent(event);
      });

      // Auto-refresh state periodically (every 10s)
      if (this.refreshTimer) clearInterval(this.refreshTimer);
      this.refreshTimer = setInterval(() => this.refreshState(false), 10000);
    } catch (err) {
      console.warn('[FedNexus] Initial layout/state render failed, showing login:', err);
      api.logout();
    }
  }

  async refreshState(reRender = true) {
    try {
      const [status, clients, models, securityEvents, infrastructure, auditLogs] = await Promise.all([
        api.getFederationStatus().catch(() => ({})),
        api.getClients().catch(() => []),
        api.getModels().catch(() => []),
        api.getSecurityEvents().catch(() => []),
        api.getInfrastructureHealth().catch(() => ({ services: [] })),
        api.getAuditLogs('', 50).catch(() => [])
      ]);

      this.state = { status, clients, models, securityEvents, infrastructure, auditLogs };

      if (reRender) {
        this.renderCurrentView();
      }
    } catch (err) {
      console.warn('[FedNexus] Background state refresh notice:', err);
    }
  }

  handleWebSocketEvent(event) {
    if (['ROUND_COMPLETED', 'SECURITY_ALERT', 'TRAINING_STARTED'].includes(event.event_type)) {
      this.refreshState(true);
    }
    if (event.event_type === 'SECURITY_ALERT' && event.payload) {
      this.showSecurityNotification(event.payload);
    }
  }

  showSecurityNotification(payload) {
    let container = document.getElementById('security-notification-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'security-notification-container';
      container.style.cssText = 'position: fixed; top: 70px; right: 24px; z-index: 9999; max-width: 480px; width: 100%; display: flex; flex-direction: column; gap: 10px; pointer-events: none;';
      document.body.appendChild(container);
    }

    const user = api.user || {};
    const userCid = (user.username || '').replace('_', '-');
    const isTargetHospital = (payload.target_client === userCid);
    const isSourceHospital = (payload.source_client === userCid);

    const toast = document.createElement('div');
    toast.style.cssText = `
      pointer-events: auto;
      background: #ffffff;
      border: 1px solid ${isTargetHospital ? '#ef4444' : '#f59e0b'};
      border-left: 6px solid ${isTargetHospital ? '#ef4444' : '#f59e0b'};
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
      border-radius: var(--radius-md);
      padding: 14px 16px;
      animation: slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    `;

    let title = '⚠️ ENCLAVE SECURITY ALERT';
    let message = payload.message || 'Unauthorized cross-tenant dataset inquiry blocked.';
    
    if (isTargetHospital) {
      title = `🚨 INTRUSION ALERT FOR ${escapeHtml(payload.target_name || userCid).toUpperCase()}`;
      message = `The Enclave Gateway intercepted an unauthorized cross-hospital query from <strong>${escapeHtml(payload.source_name || payload.source_client)}</strong> targeting your hospital's partition (search: <code class="mono">${escapeHtml(payload.search_term || '')}</code>). Access was blocked immediately.`;
    } else if (isSourceHospital) {
      title = `⛔ ACCESS DENIED — ABNORMAL ACTIVITY`;
      message = `Your query targeting <strong>${escapeHtml(payload.target_name || payload.target_client)}</strong> was intercepted & blocked under decentralized HIPAA boundary rules. An incident notification was logged and transmitted to ${escapeHtml(payload.target_name)}.`;
    }

    toast.innerHTML = `
      <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 12px;">
        <div style="display: flex; align-items: flex-start; gap: 10px;">
          <div style="color: ${isTargetHospital ? '#ef4444' : '#f59e0b'}; margin-top: 1px;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
          </div>
          <div>
            <div style="font-weight: 700; font-size: 0.88rem; color: #0f172a; margin-bottom: 3px;">${title}</div>
            <div style="font-size: 0.8rem; color: #475569; line-height: 1.4;">${message}</div>
            <div style="font-size: 0.7rem; color: #94a3b8; margin-top: 6px; font-family: 'JetBrains Mono', monospace;">
              Recorded in audit ledger &bull; ${new Date().toLocaleTimeString()}
            </div>
          </div>
        </div>
        <button type="button" class="btn-close-toast" style="background: none; border: none; font-size: 1.1rem; line-height: 1; cursor: pointer; color: #94a3b8; padding: 2px 4px;">&times;</button>
      </div>
    `;

    toast.querySelector('.btn-close-toast')?.addEventListener('click', () => {
      toast.remove();
    });

    container.appendChild(toast);

    setTimeout(() => {
      if (toast.parentNode) toast.remove();
    }, 12000);
  }

  navigate(viewName) {
    const user = api.user || { role: 'ADMIN' };
    const isAdminOrOp = (user.role === 'ADMIN' || user.role === 'OPERATOR');

    if (viewName === 'training' && !isAdminOrOp) {
      viewName = 'overview';
    }

    this.currentView = viewName;
    document.querySelectorAll('.nav-link-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === viewName);
    });
    this.renderCurrentView();
  }

  renderCurrentView() {
    const container = document.getElementById('view-content');
    if (!container) return;

    const user = api.user || { role: 'ADMIN' };
    const isAdminOrOp = (user.role === 'ADMIN' || user.role === 'OPERATOR');

    if (this.currentView === 'training' && !isAdminOrOp) {
      this.currentView = 'overview';
    }

    switch (this.currentView) {
      case 'overview':
        renderOverview(container, this.state);
        break;
      case 'patients':
        renderPatientDataset(container);
        break;
      case 'training':
        if (isAdminOrOp) {
          renderTrainingControl(container, this.state);
        } else {
          renderOverview(container, this.state);
        }
        break;
      case 'models':
        renderModelResults(container, this.state);
        break;
      case 'security':
        renderSecurityAudit(container, this.state);
        break;
      case 'infrastructure':
        renderInfrastructureSettings(container, this.state);
        break;
      case 'viva':
        renderVivaReview(container);
        break;
      default:
        renderOverview(container, this.state);
    }
  }

  renderLayout() {
    const user = api.user || { username: 'admin', role: 'ADMIN', organization_name: 'FedNexus Admin' };
    const isAuditor = (user.role === 'VIEWER' || user.role === 'AUDITOR');
    const isClient = (user.role === 'CLIENT');
    const isAdminOrOp = (user.role === 'ADMIN' || user.role === 'OPERATOR');

    let roleBanner = '';
    if (isAuditor) {
      roleBanner = `
        <div class="role-banner role-auditor">
          <div style="display: flex; align-items: center; gap: 8px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
            <span><strong>COMPLIANCE AUDIT MODE (READ-ONLY):</strong> Training control and chaos mutation tools are disabled. Audit trail and model checkpoints are cryptographically signed.</span>
          </div>
          <span class="badge badge-warning">HIPAA / GDPR AUDITOR</span>
        </div>
      `;
    } else if (isClient) {
      const hospitalLabels = {
        'client_alpha': { name: 'Hospital Alpha Node', badge: 'HOSPITAL ALPHA' },
        'client_delta': { name: 'Hospital Delta Node', badge: 'HOSPITAL DELTA' },
        'client_epsilon': { name: 'Hospital Epsilon Node', badge: 'HOSPITAL EPSILON' },
        'client_gamma': { name: 'Hospital Gamma Node', badge: 'HOSPITAL GAMMA' },
        'client_beta': { name: 'Hospital Beta Node', badge: 'HOSPITAL BETA' },
      };
      const hosp = hospitalLabels[user.username] || { name: 'Hospital Node', badge: 'HOSPITAL ENCLAVE' };
      roleBanner = `
        <div class="role-banner role-client">
          <div style="display: flex; align-items: center; gap: 8px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>
            <span><strong>${hosp.badge} ENCLAVE:</strong> Viewing local hospital dataset partition and Differential Privacy budget. Cross-hospital inquiries are strictly monitored & quarantined.</span>
          </div>
          <span class="badge badge-success">${hosp.badge} NODE</span>
        </div>
      `;
    }

    document.getElementById('app').innerHTML = `
      <header class="app-header">
        <div class="header-top">
          <a href="#" class="header-brand" id="brand-home-link">
            <div class="brand-badge">F</div>
            <div class="brand-meta">
              <h1>FedNexus</h1>
              <div class="tagline">Train Together. Share Intelligence, Not Data.</div>
            </div>
          </a>

          <div class="header-actions">
            <!-- 1-Click Demo Role Switcher for Review -->
            <div style="display: flex; align-items: center; gap: 6px; background: var(--bg-surface-subtle); padding: 4px 8px; border-radius: var(--radius-md); border: 1px solid var(--border-default);">
              <span style="font-size: 0.72rem; color: var(--text-muted); font-weight: 600;">ROLE:</span>
              <select id="quick-role-select" class="form-control mono" style="padding: 2px 6px; font-size: 0.75rem; height: 26px; width: auto; background: transparent; border: none; cursor: pointer; font-weight: 600;">
                <option value="admin" ${user.username === 'admin' ? 'selected' : ''}>Admin (Central Coordinator)</option>
                <option value="operator" ${user.username === 'operator' ? 'selected' : ''}>Operator (Training & Chaos)</option>
                <option value="auditor" ${user.username === 'auditor' ? 'selected' : ''}>Auditor (Read-Only Compliance)</option>
                <option value="client_alpha" ${user.username === 'client_alpha' ? 'selected' : ''}>Hospital Alpha (Node Enclave)</option>
                <option value="client_delta" ${user.username === 'client_delta' ? 'selected' : ''}>Hospital Delta (Node Enclave)</option>
                <option value="client_epsilon" ${user.username === 'client_epsilon' ? 'selected' : ''}>Hospital Epsilon (Node Enclave)</option>
                <option value="client_gamma" ${user.username === 'client_gamma' ? 'selected' : ''}>Hospital Gamma (Node Enclave)</option>
                <option value="client_beta" ${user.username === 'client_beta' ? 'selected' : ''}>Hospital Beta (Node Enclave)</option>
              </select>
            </div>

            <div style="text-align: right; font-size: 0.8rem; line-height: 1.3;">
              <div style="font-weight: 600; color: var(--text-primary);">${escapeHtml(user.username)}</div>
              <div style="font-size: 0.72rem; color: var(--text-muted);">${escapeHtml(user.role)} &bull; ${escapeHtml(user.organization_name || 'FedNexus')}</div>
            </div>

            <button id="btn-logout" class="btn btn-secondary btn-sm">
              Sign Out
            </button>
          </div>
        </div>

        <nav class="header-nav">
          <button class="nav-link-btn ${this.currentView === 'overview' ? 'active' : ''}" data-view="overview">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
            Overview
          </button>

          <button class="nav-link-btn ${this.currentView === 'patients' ? 'active' : ''}" data-view="patients">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
            Patient Dataset
          </button>

          ${isAdminOrOp ? `
            <button class="nav-link-btn ${this.currentView === 'training' ? 'active' : ''}" data-view="training">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
              Federated Training
            </button>
          ` : ''}

          <button class="nav-link-btn ${this.currentView === 'models' ? 'active' : ''}" data-view="models">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg>
            Model Results
          </button>

          <button class="nav-link-btn ${this.currentView === 'security' ? 'active' : ''}" data-view="security">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
            Security & Audit
          </button>

          <button class="nav-link-btn ${this.currentView === 'infrastructure' ? 'active' : ''}" data-view="infrastructure">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect><rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect><line x1="6" y1="6" x2="6.01" y2="6"></line><line x1="6" y1="18" x2="6.01" y2="18"></line></svg>
            Infrastructure & Settings
          </button>

          <button class="nav-link-btn ${this.currentView === 'viva' ? 'active' : ''}" data-view="viva" style="margin-left: auto; color: var(--text-muted); font-size: 0.8rem;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
            Viva Reference
          </button>
        </nav>
      </header>

      ${roleBanner}

      <main class="app-main" id="view-content"></main>

      <footer class="app-footer">
        <div class="footer-status-pill">
          <span class="status-dot"></span>
          <span>FedNexus Active &bull; PostgreSQL Enclave Connected</span>
        </div>
        <div>
          <span>Train Together. Share Intelligence, Not Data. &bull; Academic Project Release 2026</span>
        </div>
      </footer>
    `;

    // Navigation events
    document.querySelectorAll('.nav-link-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.navigate(btn.dataset.view);
      });
    });

    document.getElementById('brand-home-link')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.navigate('overview');
    });

    // Role switcher
    document.getElementById('quick-role-select')?.addEventListener('change', async (e) => {
      const target = e.target.value;
      try {
        await api.quickSwitchUser(target);
        const newUser = api.user;
        const newIsAdminOrOp = (newUser && (newUser.role === 'ADMIN' || newUser.role === 'OPERATOR'));
        if (this.currentView === 'training' && !newIsAdminOrOp) {
          this.currentView = 'overview';
        }
        this.renderLayout();
        await this.refreshState(true);
      } catch (err) {
        alert(`Failed to switch role: ${err.message}`);
      }
    });

    // Logout
    document.getElementById('btn-logout')?.addEventListener('click', () => {
      api.logout();
    });

    this.renderCurrentView();
  }

  renderLoginScreen() {
    document.getElementById('app').innerHTML = `
      <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; background: var(--bg-app);">
        <div class="card" style="max-width: 440px; width: 100%; padding: 32px; box-shadow: var(--shadow-md);">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="display: inline-flex; align-items: center; justify-content: center; width: 44px; height: 44px; border-radius: var(--radius-md); background: var(--accent-primary); color: #ffffff; font-size: 1.4rem; font-weight: 700; margin-bottom: 12px;">
              F
            </div>
            <h2 style="font-size: 1.5rem; font-weight: 700; color: var(--text-primary);">FedNexus</h2>
            <p style="font-size: 0.82rem; color: var(--text-muted); margin-top: 4px;">Train Together. Share Intelligence, Not Data.</p>
          </div>

          <form id="login-form">
            <div id="login-error" style="display: none;" class="alert alert-danger"></div>

            <div class="form-group">
              <label class="form-label">Username</label>
              <input type="text" id="login-username" class="form-control mono" value="admin" required>
            </div>
            <div class="form-group">
              <label class="form-label">Password</label>
              <input type="password" id="login-password" class="form-control mono" value="AdminPassword123!" required>
            </div>
            <button type="submit" class="btn btn-primary" id="btn-login-submit" style="width: 100%; padding: 10px; margin-top: 8px;">
              Sign In to Platform
            </button>
          </form>

          <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid var(--border-default);">
            <div style="color: var(--text-muted); font-size: 0.72rem; font-weight: 600; text-transform: uppercase; margin-bottom: 8px;">
              1-Click Review Credentials:
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
              <button class="btn btn-secondary btn-sm btn-quick" data-u="admin" data-p="AdminPassword123!">
                Admin
              </button>
              <button class="btn btn-secondary btn-sm btn-quick" data-u="operator" data-p="OperatorPass123!">
                Operator
              </button>
              <button class="btn btn-secondary btn-sm btn-quick" data-u="auditor" data-p="AuditorPass123!">
                Auditor
              </button>
              <button class="btn btn-secondary btn-sm btn-quick" data-u="client_alpha" data-p="ClientAlpha123!">
                Hospital Alpha
              </button>
              <button class="btn btn-secondary btn-sm btn-quick" data-u="client_delta" data-p="ClientDelta123!">
                Hospital Delta
              </button>
              <button class="btn btn-secondary btn-sm btn-quick" data-u="client_epsilon" data-p="ClientEpsilon123!">
                Hospital Epsilon
              </button>
              <button class="btn btn-secondary btn-sm btn-quick" data-u="client_gamma" data-p="ClientGamma123!">
                Hospital Gamma
              </button>
              <button class="btn btn-secondary btn-sm btn-quick" data-u="client_beta" data-p="ClientBeta123!">
                Hospital Beta
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.querySelectorAll('.btn-quick').forEach(btn => {
      btn.addEventListener('click', async () => {
        try {
          await api.login(btn.dataset.u, btn.dataset.p);
          this.init();
        } catch (err) {
          alert(`Quick sign-in failed: ${err.message}`);
        }
      });
    });

    document.getElementById('login-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const u = document.getElementById('login-username').value;
      const p = document.getElementById('login-password').value;
      const errBox = document.getElementById('login-error');
      const submitBtn = document.getElementById('btn-login-submit');

      errBox.style.display = 'none';
      submitBtn.disabled = true;
      submitBtn.textContent = 'Verifying credentials...';

      try {
        await api.login(u, p);
        this.init();
      } catch (err) {
        errBox.textContent = err.message;
        errBox.style.display = 'block';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Sign In to Platform';
      }
    });
  }
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

window.app = new FedNexusApp();

async function startFedNexus() {
  try {
    await window.app.init();
  } catch (err) {
    console.error('[FedNexus] Bootstrap error:', err);
    if (window.app) {
      window.app.renderLoginScreen();
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startFedNexus);
} else {
  // DOM is already ready (deferred module script execution)
  startFedNexus();
}
