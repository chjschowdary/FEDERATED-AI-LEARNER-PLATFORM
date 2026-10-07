import { api } from './services/api.js';
import { renderCommandCenter } from './components/CommandCenter.js';
import { renderFederationMap } from './components/FederationMap.js';
import { renderTrainingControl } from './components/TrainingControl.js';
import { renderModelRegistry } from './components/ModelRegistry.js';
import { renderSecurityCenter } from './components/SecurityCenter.js';
import { renderInfrastructureView } from './components/InfrastructureView.js';
import { renderCostEstimator } from './components/CostEstimator.js';
import { renderVivaReview } from './components/VivaReview.js';
import { renderAuditLogs } from './components/AuditLogs.js';

class FederAIApp {
  constructor() {
    this.currentView = 'command';
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
      this.renderLoginModal();
      return;
    }

    this.renderLayout();
    await this.refreshState();

    api.connectWebSocket();
    api.onWebSocketMessage((event) => {
      this.handleWebSocketEvent(event);
    });

    // Auto refresh telemetry every 8s
    setInterval(() => this.refreshState(false), 8000);
  }

  async refreshState(reRender = true) {
    try {
      const [status, clients, models, securityEvents, infrastructure, auditLogs] = await Promise.all([
        api.getFederationStatus(),
        api.getClients(),
        api.getModels(),
        api.getSecurityEvents(),
        api.getInfrastructureHealth(),
        api.getAuditLogs()
      ]);

      this.state = { status, clients, models, securityEvents, infrastructure, auditLogs };
      
      if (reRender) {
        this.renderCurrentView();
      }
    } catch (err) {
      console.error('Failed to fetch federation state:', err);
    }
  }

  handleWebSocketEvent(event) {
    const logBox = document.getElementById('telemetry-log');
    if (logBox) {
      const line = document.createElement('div');
      const time = new Date().toLocaleTimeString();
      
      if (event.event_type === 'TRAINING_STARTED') {
        line.style.color = 'var(--accent-sky)';
        line.textContent = `[${time}] [TRAINING] Round #${event.payload.round_number} launched (${event.payload.strategy}).`;
      } else if (event.event_type === 'CLIENT_TRAINED') {
        line.style.color = event.payload.is_attacker ? 'var(--accent-rose)' : 'var(--text-secondary)';
        line.textContent = `[${time}] [CLIENT] Node ${event.payload.client_id} finished training (Acc: ${event.payload.accuracy}%).`;
      } else if (event.event_type === 'SECURITY_ALERT') {
        line.style.color = 'var(--accent-rose)';
        line.textContent = `[${time}] [THREAT DETECTED] ${event.payload.client_id} quarantined! Confidence: ${event.payload.threat_score}%.`;
      } else if (event.event_type === 'ROUND_COMPLETED') {
        line.style.color = 'var(--accent-emerald)';
        line.textContent = `[${time}] [SUCCESS] Round #${event.payload.round_number} complete! Global Acc: ${event.payload.accuracy}%.`;
      } else {
        line.textContent = `[${time}] [EVENT] ${event.event_type}`;
      }

      logBox.appendChild(line);
      logBox.scrollTop = logBox.scrollHeight;
    }

    if (['ROUND_COMPLETED', 'SECURITY_ALERT', 'TRAINING_STARTED'].includes(event.event_type)) {
      this.refreshState(true);
    }
  }

  navigate(viewName) {
    const user = api.user || { role: 'ADMIN' };
    const isAdminOrOp = (user.role === 'ADMIN' || user.role === 'OPERATOR');
    
    // Strict RBAC: Non-admin/non-operator users cannot access Training Control
    if (viewName === 'training' && !isAdminOrOp) {
      viewName = 'command';
    }

    this.currentView = viewName;
    document.querySelectorAll('.nav-btn').forEach(btn => {
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
      this.currentView = 'command';
    }

    switch (this.currentView) {
      case 'command':
        renderCommandCenter(container, this.state);
        break;
      case 'map':
        renderFederationMap(container, this.state);
        break;
      case 'training':
        if (isAdminOrOp) {
          renderTrainingControl(container, this.state);
        } else {
          renderCommandCenter(container, this.state);
        }
        break;
      case 'models':
        renderModelRegistry(container, this.state);
        break;
      case 'security':
        renderSecurityCenter(container, this.state);
        break;
      case 'infrastructure':
        renderInfrastructureView(container, this.state);
        break;
      case 'cost':
        renderCostEstimator(container);
        break;
      case 'viva':
        renderVivaReview(container);
        break;
      case 'audit':
        renderAuditLogs(container, this.state);
        break;
      default:
        renderCommandCenter(container, this.state);
    }
  }

  renderLayout() {
    const user = api.user || { username: 'admin', role: 'ADMIN', organization_name: 'FederAI Cloud Admin' };
    const isAuditor = (user.role === 'VIEWER' || user.role === 'AUDITOR');
    const isClient = (user.role === 'CLIENT');
    const isAdminOrOp = (user.role === 'ADMIN' || user.role === 'OPERATOR');

    // Dynamic Role Banner
    let roleBanner = '';
    if (isAuditor) {
      roleBanner = `
        <div style="background: rgba(245, 158, 11, 0.14); border-bottom: 1px solid rgba(245, 158, 11, 0.35); padding: 10px 24px; display: flex; align-items: center; justify-content: space-between; font-size: 0.82rem; color: #fbbf24; flex-wrap: wrap; gap: 8px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
            <span><strong>COMPLIANCE AUDIT MODE (READ-ONLY):</strong> Training control and threat injection buttons are removed for regulatory audit integrity. Viewing verified HMAC Audit Logs, Model Checksums, and Privacy Budgets.</span>
          </div>
          <span style="font-size: 0.72rem; padding: 2px 8px; border-radius: 4px; background: rgba(245, 158, 11, 0.2); border: 1px solid rgba(245, 158, 11, 0.4); font-weight: 600;">HIPAA / GDPR / SOC-2 AUDIT</span>
        </div>
      `;
    } else if (isClient) {
      roleBanner = `
        <div style="background: rgba(16, 185, 129, 0.14); border-bottom: 1px solid rgba(16, 185, 129, 0.35); padding: 10px 24px; display: flex; align-items: center; justify-content: space-between; font-size: 0.82rem; color: #34d399; flex-wrap: wrap; gap: 8px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>
            <span><strong>HOSPITAL ALPHA CLIENT ENCLAVE:</strong> Viewing local private clinical dataset telemetry (1,200 EHR records) and Differential Privacy budget. Global training orchestration is centrally managed by cloud operators.</span>
          </div>
          <span style="font-size: 0.72rem; padding: 2px 8px; border-radius: 4px; background: rgba(16, 185, 129, 0.2); border: 1px solid rgba(16, 185, 129, 0.4); font-weight: 600;">MOUNT SINAI EDGE NODE</span>
        </div>
      `;
    } else if (user.role === 'OPERATOR') {
      roleBanner = `
        <div style="background: rgba(14, 165, 233, 0.12); border-bottom: 1px solid rgba(14, 165, 233, 0.3); padding: 10px 24px; display: flex; align-items: center; justify-content: space-between; font-size: 0.82rem; color: var(--accent-sky); flex-wrap: wrap; gap: 8px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
            <span><strong>OPERATIONS & SIMULATION CONSOLE:</strong> Full orchestration permissions enabled for federated round dispatch, consensus strategy tuning, and Byzantine threat testing.</span>
          </div>
          <span style="font-size: 0.72rem; padding: 2px 8px; border-radius: 4px; background: rgba(14, 165, 233, 0.2); border: 1px solid var(--accent-sky); font-weight: 600;">DEVOPS / ML-OPS</span>
        </div>
      `;
    }

    document.getElementById('app').innerHTML = `
      <header class="top-nav">
        <div class="nav-brand">
          <div class="brand-icon">F</div>
          <div>
            <div class="brand-title">FederAI Cloud</div>
            <div style="font-size: 0.65rem; color: var(--text-muted); margin-top: -2px;">Train Together. Share Intelligence, Not Data.</div>
          </div>
          <span class="brand-tag">UNIFIED VIVA EDITION</span>
        </div>

        <nav class="nav-links">
          <button class="nav-btn ${this.currentView === 'command' ? 'active' : ''}" data-view="command">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
            Command Center
          </button>
          <button class="nav-btn ${this.currentView === 'map' ? 'active' : ''}" data-view="map">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"></polygon><line x1="8" y1="2" x2="8" y2="18"></line><line x1="16" y1="6" x2="16" y2="22"></line></svg>
            Federation Map
          </button>
          
          <!-- Strict RBAC: Training Control Tab ONLY rendered for Admin and Operator -->
          ${isAdminOrOp ? `
            <button class="nav-btn ${this.currentView === 'training' ? 'active' : ''}" data-view="training">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
              Training Control
            </button>
          ` : ''}

          <button class="nav-btn ${this.currentView === 'models' ? 'active' : ''}" data-view="models">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg>
            Model Registry
          </button>
          <button class="nav-btn ${this.currentView === 'security' ? 'active' : ''}" data-view="security">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
            Security & Threat
          </button>
          <button class="nav-btn ${this.currentView === 'infrastructure' ? 'active' : ''}" data-view="infrastructure">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect><rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect><line x1="6" y1="6" x2="6.01" y2="6"></line><line x1="6" y1="18" x2="6.01" y2="18"></line></svg>
            Unified Infrastructure
          </button>
          <button class="nav-btn ${this.currentView === 'cost' ? 'active' : ''}" data-view="cost">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
            Cloud Cost
          </button>
          <button class="nav-btn ${this.currentView === 'viva' ? 'active' : ''}" data-view="viva">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
            Viva Q&A Review
          </button>
          <button class="nav-btn ${this.currentView === 'audit' ? 'active' : ''}" data-view="audit">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
            Audit Logs
          </button>
        </nav>

        <div class="nav-user" style="display: flex; align-items: center; gap: 12px;">
          <!-- 1-Click Role Switcher for Live Reviewer Presentation -->
          <div style="display: flex; align-items: center; gap: 6px; background: rgba(15, 23, 42, 0.85); padding: 5px 10px; border-radius: var(--radius-md); border: 1px solid var(--accent-sky);">
            <span style="font-size: 0.7rem; color: var(--accent-sky); font-weight: 700;">DEMO ROLE:</span>
            <select id="quick-role-select" class="form-control mono" style="padding: 2px 8px; font-size: 0.75rem; height: 26px; width: auto; background: transparent; border: none; color: #ffffff; font-weight: 600; cursor: pointer;">
              <option value="admin" ${user.username === 'admin' ? 'selected' : ''}>👑 Administrator (Full Ops)</option>
              <option value="operator" ${user.username === 'operator' ? 'selected' : ''}>🛠️ Operator (Training & Chaos)</option>
              <option value="auditor" ${user.username === 'auditor' ? 'selected' : ''}>🔍 Compliance Auditor (Read-Only)</option>
              <option value="client_alpha" ${user.username === 'client_alpha' ? 'selected' : ''}>🏥 Hospital Alpha (Edge Enclave)</option>
            </select>
          </div>

          <div style="text-align: right;">
            <div style="font-size: 0.82rem; font-weight: 600; color: #ffffff;">${user.username}</div>
            <div style="font-size: 0.68rem; color: var(--text-muted);">${user.role} &bull; ${user.organization_name || 'FederAI Admin'}</div>
          </div>

          <button id="btn-logout" class="btn btn-secondary" style="padding: 6px 10px; font-size: 0.75rem;">
            Logout
          </button>
        </div>
      </header>

      ${roleBanner}

      <main class="content-view" id="view-content"></main>
    `;

    // Navigation events
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.navigate(btn.dataset.view);
      });
    });

    // 1-Click Role Switcher handler
    document.getElementById('quick-role-select')?.addEventListener('change', async (e) => {
      const targetUser = e.target.value;
      try {
        await api.quickSwitchUser(targetUser);
        const newUser = api.user;
        const newIsAdminOrOp = (newUser && (newUser.role === 'ADMIN' || newUser.role === 'OPERATOR'));
        
        // If switching to Auditor or Hospital Node while on Training tab, reset view to Command Center
        if (this.currentView === 'training' && !newIsAdminOrOp) {
          this.currentView = 'command';
        }
        
        this.renderLayout();
        await this.refreshState(true);
      } catch (err) {
        alert(`Failed to switch role: ${err.message}`);
      }
    });

    document.getElementById('btn-logout')?.addEventListener('click', () => {
      api.logout();
    });

    this.renderCurrentView();
  }

  renderLoginModal() {
    document.getElementById('app').innerHTML = `
      <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px;">
        <div class="glass-panel" style="max-width: 480px; width: 100%; padding: 36px; text-align: center;">
          <div style="display: inline-flex; align-items: center; justify-content: center; width: 56px; height: 56px; border-radius: 14px; background: linear-gradient(135deg, #0ea5e9, #8b5cf6); color: #ffffff; font-size: 1.6rem; font-weight: 800; margin-bottom: 20px; box-shadow: 0 0 25px rgba(14, 165, 233, 0.4);">
            F
          </div>
          <h2 style="font-size: 1.6rem; margin-bottom: 8px;">FederAI Cloud</h2>
          <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 24px;">Unified Secure Federated AI Platform & Control Plane</p>

          <form id="login-form" style="text-align: left;">
            <div class="form-group">
              <label class="form-label">Username</label>
              <input type="text" id="login-username" class="form-control mono" value="admin" required>
            </div>
            <div class="form-group">
              <label class="form-label">Password</label>
              <input type="password" id="login-password" class="form-control mono" value="AdminPassword123!" required>
            </div>
            <button type="submit" class="btn btn-primary" style="width: 100%; padding: 12px; margin-top: 12px; font-size: 0.95rem;">
              Sign In to Command Center
            </button>
          </form>

          <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid var(--border-subtle); text-align: left; font-size: 0.75rem;">
            <div style="color: var(--text-muted); margin-bottom: 8px;"><strong>1-Click Quick Demo Sign In:</strong></div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
              <button class="btn btn-secondary btn-quick-login" data-u="admin" data-p="AdminPassword123!" style="font-size: 0.75rem; padding: 8px;">
                👑 Administrator
              </button>
              <button class="btn btn-secondary btn-quick-login" data-u="operator" data-p="OperatorPass123!" style="font-size: 0.75rem; padding: 8px;">
                🛠️ Operator
              </button>
              <button class="btn btn-secondary btn-quick-login" data-u="auditor" data-p="AuditorPass123!" style="font-size: 0.75rem; padding: 8px;">
                🔍 Compliance Auditor
              </button>
              <button class="btn btn-secondary btn-quick-login" data-u="client_alpha" data-p="ClientAlpha123!" style="font-size: 0.75rem; padding: 8px;">
                🏥 Hospital Alpha
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.querySelectorAll('.btn-quick-login').forEach(btn => {
      btn.addEventListener('click', async () => {
        try {
          await api.login(btn.dataset.u, btn.dataset.p);
          this.init();
        } catch (err) {
          alert(`Quick login failed: ${err.message}`);
        }
      });
    });

    document.getElementById('login-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const u = document.getElementById('login-username').value;
      const p = document.getElementById('login-password').value;

      try {
        await api.login(u, p);
        this.init();
      } catch (err) {
        alert(`Login failed: ${err.message}`);
      }
    });
  }
}

window.app = new FederAIApp();
window.addEventListener('DOMContentLoaded', () => {
  window.app.init();
});
