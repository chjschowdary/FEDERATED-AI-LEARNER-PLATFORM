/**
 * FedNexus — Consolidated API Client & WebSocket Telemetry Manager
 * Fully connected to FastAPI backend routes with resilient error handling.
 */

class ApiService {
  constructor() {
    // Detect base URL: In Docker/Nginx on port 80/443 use origin;
    // In standalone local dev (e.g. port 3000 or 5173), fallback to backend at :8000
    const port = window.location.port;
    if (port === '3000' || port === '5173') {
      this.baseUrl = `${window.location.protocol}//${window.location.hostname}:8000`;
    } else if (window.location.origin && window.location.origin.startsWith('http')) {
      this.baseUrl = window.location.origin;
    } else {
      this.baseUrl = 'http://localhost:8000';
    }

    this.token = localStorage.getItem('fednexus_token') || localStorage.getItem('federaicloud_token') || null;
    this.user = JSON.parse(localStorage.getItem('fednexus_user') || localStorage.getItem('federaicloud_user') || 'null');
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
        throw new Error('Session expired or unauthorized. Please sign in again.');
      }
      if (!response.ok) {
        let errorDetail = `HTTP Error ${response.status}`;
        try {
          const errorData = await response.json();
          if (errorData.detail) {
            errorDetail = typeof errorData.detail === 'string' ? errorData.detail : JSON.stringify(errorData.detail);
          }
        } catch (_) {}
        throw new Error(errorDetail);
      }
      return await response.json();
    } catch (err) {
      console.error(`[FedNexus API Error] ${endpoint}:`, err);
      throw err;
    }
  }

  // ==================== Authentication ====================

  async login(username, password) {
    const data = await this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    this.token = data.access_token;
    this.user = data.user;
    localStorage.setItem('fednexus_token', this.token);
    localStorage.setItem('fednexus_user', JSON.stringify(this.user));
    return data;
  }

  async quickSwitchUser(targetUsername) {
    const creds = {
      'admin': 'AdminPassword123!',
      'operator': 'OperatorPass123!',
      'auditor': 'AuditorPass123!',
      'client_alpha': 'ClientAlpha123!',
      'client_delta': 'ClientDelta123!',
      'client_epsilon': 'ClientEpsilon123!',
      'client_gamma': 'ClientGamma123!',
      'client_beta': 'ClientBeta123!'
    };
    const password = creds[targetUsername] || 'AdminPassword123!';
    return this.login(targetUsername, password);
  }

  logout() {
    this.token = null;
    this.user = null;
    localStorage.removeItem('fednexus_token');
    localStorage.removeItem('fednexus_user');
    localStorage.removeItem('federaicloud_token');
    localStorage.removeItem('federaicloud_user');
    if (this.ws) {
      try { this.ws.close(); } catch (_) {}
      this.ws = null;
    }
    if (window.app && typeof window.app.renderLoginScreen === 'function') {
      window.app.renderLoginScreen();
    }
  }

  // ==================== Overview & Dashboard ====================

  async getDashboardStats() {
    return this.request('/api/dashboard/stats');
  }

  async getFederationStatus() {
    return this.request('/api/federation/status');
  }

  // ==================== Patient Dataset Enclave ====================

  async getPatients({ page = 1, pageSize = 15, search = '', clientId = '', riskLabel = '' } = {}) {
    const params = new URLSearchParams();
    params.set('page', page);
    params.set('page_size', pageSize);
    if (search && search.trim()) params.set('search', search.trim());
    if (clientId && clientId !== 'all') params.set('client_id', clientId);
    if (riskLabel !== '' && riskLabel !== 'all' && riskLabel !== null && riskLabel !== undefined) {
      params.set('risk_label', riskLabel);
    }
    return this.request(`/api/patients?${params.toString()}`);
  }

  async getPatientStats() {
    return this.request('/api/patients/stats');
  }

  async getPatient(patientId) {
    return this.request(`/api/patients/${patientId}`);
  }

  async createPatient(payload) {
    return this.request('/api/patients', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async updatePatient(patientId, payload) {
    return this.request(`/api/patients/${patientId}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  }

  async deletePatient(patientId) {
    return this.request(`/api/patients/${patientId}`, {
      method: 'DELETE'
    });
  }

  async importPatientsCsv(file) {
    const url = `${this.baseUrl}/api/patients/import-csv`;
    const formData = new FormData();
    formData.append('file', file);

    const headers = {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData
    });

    if (response.status === 401) {
      this.logout();
      throw new Error('Session expired or unauthorized');
    }
    if (!response.ok) {
      let msg = `Upload failed with HTTP ${response.status}`;
      try {
        const err = await response.json();
        if (err.detail) msg = typeof err.detail === 'string' ? err.detail : JSON.stringify(err.detail);
      } catch (_) {}
      throw new Error(msg);
    }
    return await response.json();
  }

  async downloadPatientsCsv() {
    const url = `${this.baseUrl}/api/patients/export/csv`;
    const headers = {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(`Export failed: HTTP ${response.status}`);
    }
    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `fednexus_synthetic_patients_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(downloadUrl);
  }

  // ==================== Federated Training ====================

  async getClients() {
    return this.request('/api/clients');
  }

  async getClientDetail(clientId) {
    return this.request(`/api/clients/${clientId}`);
  }

  async unquarantineClient(clientId) {
    return this.request(`/api/clients/${clientId}/unquarantine`, {
      method: 'POST'
    });
  }

  async startRound(params) {
    return this.request('/api/federation/start', {
      method: 'POST',
      body: JSON.stringify(params)
    });
  }

  async pauseFederation() {
    return this.request('/api/federation/pause', {
      method: 'POST'
    });
  }

  async resetFederation() {
    return this.request('/api/federation/reset', {
      method: 'POST'
    });
  }

  async getRounds() {
    return this.request('/api/training/rounds');
  }

  // ==================== Model Registry ====================

  async getModels() {
    return this.request('/api/models');
  }

  async rollbackModel(versionNumber) {
    return this.request('/api/models/rollback', {
      method: 'POST',
      body: JSON.stringify({ version_number: versionNumber })
    });
  }

  async downloadModelArtifact(versionNumber) {
    const url = `${this.baseUrl}/api/models/${versionNumber}/artifact`;
    const headers = {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(`Failed to download model artifact: HTTP ${response.status}`);
    }
    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `fednexus_model_v${versionNumber}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(downloadUrl);
  }

  // ==================== Security & Audit ====================

  async getSecurityEvents() {
    return this.request('/api/security/events');
  }

  async getSecurityRadar() {
    return this.request('/api/security/radar');
  }

  async getAuditLogs(action = '', limit = 100) {
    const params = new URLSearchParams();
    if (action) params.set('action', action);
    params.set('limit', limit);
    return this.request(`/api/audit/logs?${params.toString()}`);
  }

  // ==================== Infrastructure & Settings ====================

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

  async getSettings() {
    return this.request('/api/settings');
  }

  // ==================== WebSocket Telemetry ====================

  connectWebSocket() {
    const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    let wsHost = window.location.host;
    if (window.location.port === '3000' || window.location.port === '5173') {
      wsHost = `${window.location.hostname}:8000`;
    }
    const wsUrl = `${wsProto}//${wsHost}/api/ws`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('[FedNexus WS] Telemetry channel connected');
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          this.wsListeners.forEach(listener => listener(msg));
        } catch (_) {}
      };

      this.ws.onclose = () => {
        setTimeout(() => this.connectWebSocket(), 4000);
      };

      this.ws.onerror = (err) => {
        console.warn('[FedNexus WS] Telemetry conduit warning:', err);
      };
    } catch (err) {
      console.warn('[FedNexus WS] Connection exception:', err);
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
