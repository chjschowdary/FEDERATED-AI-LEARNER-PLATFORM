/**
 * FederAI Cloud API Client & WebSocket Telemetry Manager
 */

class ApiService {
  constructor() {
    this.baseUrl = window.location.origin.includes('http') ? window.location.origin : 'http://localhost:8000';
    this.token = localStorage.getItem('federaicloud_token') || null;
    this.user = JSON.parse(localStorage.getItem('federaicloud_user') || 'null');
    this.ws = null;
    this.wsListeners = [];
  }

  getHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const config = {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...(options.headers || {})
      }
    };

    try {
      const response = await fetch(url, config);
      if (response.status === 401) {
        this.logout();
        throw new Error('Session expired or unauthorized');
      }
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP Error ${response.status}`);
      }
      return await response.json();
    } catch (err) {
      console.error(`[API Error] ${endpoint}:`, err);
      throw err;
    }
  }

  // Auth
  async login(username, password) {
    const data = await this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    this.token = data.access_token;
    this.user = data.user;
    localStorage.setItem('federaicloud_token', this.token);
    localStorage.setItem('federaicloud_user', JSON.stringify(this.user));
    return data;
  }

  async quickSwitchUser(targetUsername) {
    const creds = {
      'admin': 'AdminPassword123!',
      'operator': 'OperatorPass123!',
      'auditor': 'AuditorPass123!',
      'client_alpha': 'ClientAlpha123!'
    };
    const password = creds[targetUsername] || 'AdminPassword123!';
    return this.login(targetUsername, password);
  }

  logout() {
    this.token = null;
    this.user = null;
    localStorage.removeItem('federaicloud_token');
    localStorage.removeItem('federaicloud_user');
    window.location.reload();
  }

  // Federation & Rounds
  async getFederationStatus() {
    return this.request('/api/federation/status');
  }

  async startRound(params) {
    return this.request('/api/federation/start', {
      method: 'POST',
      body: JSON.stringify(params)
    });
  }

  async pauseFederation() {
    return this.request('/api/federation/pause', { method: 'POST' });
  }

  async resetFederation() {
    return this.request('/api/federation/reset', { method: 'POST' });
  }

  // Clients
  async getClients() {
    return this.request('/api/clients');
  }

  async getClientDetail(clientId) {
    return this.request(`/api/clients/${clientId}`);
  }

  async unquarantineClient(clientId) {
    return this.request(`/api/clients/${clientId}/unquarantine`, { method: 'POST' });
  }

  // Model Registry
  async getModels() {
    return this.request('/api/models');
  }

  async rollbackModel(versionNumber) {
    return this.request('/api/models/rollback', {
      method: 'POST',
      body: JSON.stringify({ version_number: versionNumber })
    });
  }

  // Security & Radar
  async getSecurityEvents() {
    return this.request('/api/security/events');
  }

  async getSecurityRadar() {
    return this.request('/api/security/radar');
  }

  // Infrastructure & Cost
  async getInfrastructureHealth() {
    return this.request('/api/infrastructure/health');
  }

  async simulatePodFailure(serviceName = 'aggregator-worker') {
    return this.request('/api/infrastructure/simulate-failure', {
      method: 'POST',
      body: JSON.stringify({ service_name: serviceName })
    });
  }

  async getCostEstimate(nodes = 3, storageGb = 100, monthlyReqs = 5.0) {
    return this.request(`/api/cost/estimate?nodes=${nodes}&storage_gb=${storageGb}&monthly_requests_millions=${monthlyReqs}`);
  }

  // Audit
  async getAuditLogs() {
    return this.request('/api/audit/logs');
  }

  // WebSocket Telemetry
  connectWebSocket() {
    const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = window.location.host || 'localhost:8000';
    const wsUrl = `${wsProto}//${wsHost}/api/ws`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('[WS] Connected to FederAI Cloud Telemetry Conduit');
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          this.wsListeners.forEach(listener => listener(msg));
        } catch (e) {
          // ignore keep-alive pong
        }
      };

      this.ws.onclose = () => {
        console.log('[WS] Connection closed. Reconnecting in 3s...');
        setTimeout(() => this.connectWebSocket(), 3000);
      };

      this.ws.onerror = (err) => {
        console.warn('[WS] Telemetry conduit warning:', err);
      };
    } catch (err) {
      console.warn('[WS] Failed to connect WebSocket:', err);
    }
  }

  onWebSocketMessage(callback) {
    this.wsListeners.push(callback);
    return () => {
      this.wsListeners = this.wsListeners.filter(cb => cb !== callback);
    };
  }
}

export const api = new ApiService();
