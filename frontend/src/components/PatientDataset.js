import { api } from '../services/api.js';

export function renderPatientDataset(container) {
  let state = {
    page: 1,
    pageSize: 15,
    search: '',
    clientId: 'all',
    riskLabel: 'all',
    totalRecords: 0,
    totalPages: 1,
    patients: [],
    stats: null,
    clients: [],
    isLoading: false
  };

  async function loadData() {
    state.isLoading = true;
    render();

    try {
      state.securityViolation = null;
      const [patientsRes, statsRes, clientsRes] = await Promise.all([
        api.getPatients({
          page: state.page,
          pageSize: state.pageSize,
          search: state.search,
          clientId: state.clientId,
          riskLabel: state.riskLabel
        }),
        api.getPatientStats().catch(() => null),
        api.getClients().catch(() => [])
      ]);

      state.patients = patientsRes.items || [];
      state.totalRecords = patientsRes.total || 0;
      state.totalPages = patientsRes.total_pages || 1;
      state.stats = statsRes;
      state.clients = clientsRes;
    } catch (err) {
      console.error('Failed to load patient dataset:', err);
      state.securityViolation = err.message;
      state.patients = [];
      state.totalRecords = 0;
      state.totalPages = 1;
    } finally {
      state.isLoading = false;
      render();
    }
  }

  function render() {
    const user = api.user || { role: 'ADMIN' };
    const canModify = (user.role === 'ADMIN' || user.role === 'OPERATOR');
    const isClient = (user.role === 'CLIENT');
    const clientOwnId = (user.username || '').replace('_', '-');

    container.innerHTML = `
      <div class="page-header">
        <div>
          <h2 class="page-title">Patient Dataset (Synthetic Clinical Enclaves)</h2>
          <p class="page-description">Decentralized synthetic electronic health records partitioned across participating hospital nodes.</p>
        </div>
        <div class="toolbar-group">
          <button class="btn btn-secondary btn-sm" id="btn-refresh-patients" ${state.isLoading ? 'disabled' : ''}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg>
            Refresh
          </button>
          <button class="btn btn-secondary btn-sm" id="btn-export-csv">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            Export CSV
          </button>
          ${canModify ? `
            <button class="btn btn-secondary btn-sm" id="btn-import-csv">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
              Import CSV
            </button>
            <button class="btn btn-primary btn-sm" id="btn-add-patient">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              Add Record
            </button>
          ` : ''}
        </div>
      </div>

      <div class="disclaimer-banner">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
        <span>
          <strong>Research Disclaimer:</strong> This dataset comprises strictly non-identifying synthetic patient parameters generated for cardiovascular clinical risk assessment. Local records are held inside the database enclave of each hospital node.
        </span>
      </div>

      <!-- Stats Bar -->
      ${state.stats ? `
        <div class="stats-grid" style="grid-template-columns: repeat(4, 1fr); margin-bottom: 16px;">
          <div class="stat-card" style="padding: 12px 16px;">
            <div class="stat-label">Total Cohort</div>
            <div class="stat-value" style="font-size: 1.3rem;">${state.stats.total_patients}</div>
          </div>
          <div class="stat-card" style="padding: 12px 16px;">
            <div class="stat-label">High Risk Cases</div>
            <div class="stat-value" style="font-size: 1.3rem; color: var(--status-danger);">
              ${state.stats.high_risk_count}
              <span style="font-size: 0.75rem; font-weight: normal; color: var(--text-muted);">
                (${state.stats.total_patients ? ((state.stats.high_risk_count / state.stats.total_patients) * 100).toFixed(1) : 0}%)
              </span>
            </div>
          </div>
          <div class="stat-card" style="padding: 12px 16px;">
            <div class="stat-label">Low/Moderate Risk</div>
            <div class="stat-value" style="font-size: 1.3rem; color: var(--status-success);">${state.stats.low_risk_count}</div>
          </div>
          <div class="stat-card" style="padding: 12px 16px;">
            <div class="stat-label">Hospital Partitions</div>
            <div class="stat-value" style="font-size: 1.3rem;">${Object.keys(state.stats.by_client || {}).length} Active</div>
          </div>
        </div>
      ` : ''}

      <!-- Search and Filter Toolbar -->
      <div class="card" style="margin-bottom: 16px; padding: 12px 16px;">
        <div class="toolbar" style="margin-bottom: 0;">
          <div class="toolbar-group" style="flex: 1; max-width: 400px;">
            <input type="text" id="patient-search-input" class="form-control" placeholder="Search by Reference ID or clinical notes..." value="${escapeHtml(state.search)}">
          </div>

          <div class="toolbar-group">
            <select id="patient-client-filter" class="form-control" style="width: auto;">
              ${isClient ? `
                <option value="${clientOwnId}" ${state.clientId === clientOwnId ? 'selected' : ''}>My Enclave (${clientOwnId})</option>
                <option value="all" ${state.clientId === 'all' ? 'selected' : ''}>⚠️ All Hospitals (Enclave Restricted)</option>
                <option value="client-delta" ${state.clientId === 'client-delta' ? 'selected' : ''}>⚠️ Hospital Delta (Restricted)</option>
                <option value="client-alpha" ${state.clientId === 'client-alpha' ? 'selected' : ''}>⚠️ Hospital Alpha (Restricted)</option>
                <option value="client-epsilon" ${state.clientId === 'client-epsilon' ? 'selected' : ''}>⚠️ Hospital Epsilon (Restricted)</option>
                <option value="client-gamma" ${state.clientId === 'client-gamma' ? 'selected' : ''}>⚠️ Hospital Gamma (Restricted)</option>
              ` : `
                <option value="all" ${state.clientId === 'all' ? 'selected' : ''}>All Hospital Nodes</option>
                ${state.clients.map(c => `
                  <option value="${c.client_id}" ${state.clientId === c.client_id ? 'selected' : ''}>
                    ${escapeHtml(c.name)} (${c.client_id})
                  </option>
                `).join('')}
              `}
            </select>

            <select id="patient-risk-filter" class="form-control" style="width: auto;">
              <option value="all" ${state.riskLabel === 'all' ? 'selected' : ''}>All Risk Levels</option>
              <option value="1" ${state.riskLabel === '1' ? 'selected' : ''}>High Risk Only</option>
              <option value="0" ${state.riskLabel === '0' ? 'selected' : ''}>Low/Moderate Risk</option>
            </select>

            <button class="btn btn-secondary btn-sm" id="btn-apply-filters">
              Filter
            </button>

            ${(state.search || state.clientId !== 'all' || state.riskLabel !== 'all') ? `
              <button class="btn btn-secondary btn-sm" id="btn-clear-filters" style="color: var(--text-muted);">
                Reset
              </button>
            ` : ''}
          </div>
        </div>
      </div>

      <!-- Security Violation Alert -->
      ${state.securityViolation ? `
        <div class="alert alert-danger" style="margin-bottom: 16px; border-left: 5px solid #ef4444; background: #fef2f2; color: #991b1b; padding: 14px 18px; border-radius: var(--radius-md); display: flex; align-items: flex-start; gap: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="flex-shrink: 0; margin-top: 2px;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
          <div>
            <div style="font-weight: 700; font-size: 0.92rem; margin-bottom: 4px;">ABNORMAL ACTIVITY DETECTED & BLOCKED</div>
            <div style="font-size: 0.85rem; line-height: 1.45;">${escapeHtml(state.securityViolation)}</div>
            <div style="font-size: 0.76rem; color: #b91c1c; margin-top: 6px; font-weight: 600;">Security violation has been logged to the immutable audit ledger and an intrusion alert was automatically dispatched to the affected hospital node.</div>
          </div>
        </div>
      ` : ''}

      <!-- Patient Table Card -->
      <div class="card">
        <div class="card-body" style="padding: 0;">
          <div class="table-container" style="border: none;">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Ref ID</th>
                  <th>Hospital Client</th>
                  <th>Demographics</th>
                  <th>Blood Pressure</th>
                  <th>Glucose</th>
                  <th>Cholesterol</th>
                  <th>Troponin I</th>
                  <th>SpO2</th>
                  <th>Risk Classification</th>
                  <th style="text-align: right;">Actions</th>
                </tr>
              </thead>
              <tbody>
                ${state.isLoading ? `
                  <tr>
                    <td colspan="10" style="text-align: center; padding: 40px;">
                      <div style="display: inline-block; width: 20px; height: 20px; border-radius: 50%; border: 2px solid var(--border-default); border-top-color: var(--accent-primary); animation: spin 0.8s linear infinite;"></div>
                      <div style="margin-top: 8px; color: var(--text-muted); font-size: 0.82rem;">Querying PostgreSQL enclave records...</div>
                    </td>
                  </tr>
                ` : state.patients.length > 0 ? state.patients.map(p => `
                  <tr>
                    <td><strong class="mono" style="font-size: 0.8rem;">${escapeHtml(p.external_ref)}</strong></td>
                    <td>
                      <span class="badge badge-neutral" style="font-size: 0.72rem;">
                        ${escapeHtml(p.client_id)}
                      </span>
                    </td>
                    <td>${p.age}y / ${escapeHtml(p.sex)}</td>
                    <td class="mono" style="font-size: 0.8rem;">${p.systolic_bp}/${p.diastolic_bp} <span style="color: var(--text-muted); font-size: 0.7rem;">mmHg</span></td>
                    <td class="mono" style="font-size: 0.8rem;">${p.fasting_glucose} <span style="color: var(--text-muted); font-size: 0.7rem;">mg/dL</span></td>
                    <td class="mono" style="font-size: 0.8rem;">${p.cholesterol} <span style="color: var(--text-muted); font-size: 0.7rem;">mg/dL</span></td>
                    <td class="mono" style="font-size: 0.8rem;">${p.troponin} <span style="color: var(--text-muted); font-size: 0.7rem;">ng/mL</span></td>
                    <td class="mono" style="font-size: 0.8rem;">${p.spo2}%</td>
                    <td>
                      <span class="badge ${p.risk_label === 1 ? 'badge-danger' : 'badge-success'}">
                        ${p.risk_label === 1 ? 'High Risk (1)' : 'Low Risk (0)'}
                      </span>
                    </td>
                    <td style="text-align: right; white-space: nowrap;">
                      <button class="btn btn-secondary btn-sm btn-view-patient" data-id="${p.id}" title="View Details">
                        View
                      </button>
                      ${canModify ? `
                        <button class="btn btn-secondary btn-sm btn-edit-patient" data-id="${p.id}" title="Edit Record">
                          Edit
                        </button>
                        <button class="btn btn-danger btn-sm btn-delete-patient" data-id="${p.id}" data-ref="${escapeHtml(p.external_ref)}" title="Delete Record">
                          Delete
                        </button>
                      ` : ''}
                    </td>
                  </tr>
                `).join('') : `
                  <tr>
                    <td colspan="10" class="empty-state">
                      <div class="empty-state-title">No Patient Records Found</div>
                      <div class="empty-state-text">No synthetic patient records matched your filter criteria. Try adjusting your search or clearing filters.</div>
                    </td>
                  </tr>
                `}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Pagination Bar -->
        <div class="pagination">
          <div>
            Showing <strong>${state.patients.length > 0 ? ((state.page - 1) * state.pageSize) + 1 : 0}</strong> to <strong>${Math.min(state.page * state.pageSize, state.totalRecords)}</strong> of <strong>${state.totalRecords}</strong> records
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <label style="font-size: 0.78rem; color: var(--text-muted);">Rows per page:</label>
            <select id="patient-page-size" class="form-control" style="width: auto; padding: 3px 6px; font-size: 0.78rem;">
              <option value="15" ${state.pageSize === 15 ? 'selected' : ''}>15</option>
              <option value="25" ${state.pageSize === 25 ? 'selected' : ''}>25</option>
              <option value="50" ${state.pageSize === 50 ? 'selected' : ''}>50</option>
              <option value="100" ${state.pageSize === 100 ? 'selected' : ''}>100</option>
            </select>

            <button class="btn btn-secondary btn-sm" id="btn-prev-page" ${state.page <= 1 ? 'disabled' : ''}>
              &larr; Prev
            </button>
            <span style="font-weight: 600; padding: 0 4px;">Page ${state.page} / ${state.totalPages}</span>
            <button class="btn btn-secondary btn-sm" id="btn-next-page" ${state.page >= state.totalPages ? 'disabled' : ''}>
              Next &rarr;
            </button>
          </div>
        </div>
      </div>

      <!-- Modal Container Placeholder -->
      <div id="patient-modal-container"></div>
    `;

    attachEvents();
  }

  function attachEvents() {
    // Refresh
    document.getElementById('btn-refresh-patients')?.addEventListener('click', () => {
      loadData();
    });

    // Search on Enter
    document.getElementById('patient-search-input')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        state.search = e.target.value.trim();
        state.page = 1;
        loadData();
      }
    });

    // Apply Filters button
    document.getElementById('btn-apply-filters')?.addEventListener('click', () => {
      state.search = document.getElementById('patient-search-input')?.value.trim() || '';
      state.clientId = document.getElementById('patient-client-filter')?.value || 'all';
      state.riskLabel = document.getElementById('patient-risk-filter')?.value || 'all';
      state.page = 1;
      loadData();
    });

    // Reset Filters button
    document.getElementById('btn-clear-filters')?.addEventListener('click', () => {
      state.search = '';
      state.clientId = 'all';
      state.riskLabel = 'all';
      state.page = 1;
      loadData();
    });

    // Page navigation
    document.getElementById('btn-prev-page')?.addEventListener('click', () => {
      if (state.page > 1) {
        state.page--;
        loadData();
      }
    });

    document.getElementById('btn-next-page')?.addEventListener('click', () => {
      if (state.page < state.totalPages) {
        state.page++;
        loadData();
      }
    });

    // Page size change
    document.getElementById('patient-page-size')?.addEventListener('change', (e) => {
      state.pageSize = parseInt(e.target.value, 10);
      state.page = 1;
      loadData();
    });

    // Export CSV
    document.getElementById('btn-export-csv')?.addEventListener('click', async () => {
      try {
        await api.downloadPatientsCsv();
      } catch (err) {
        alert(`Failed to export CSV: ${err.message}`);
      }
    });

    // Import CSV Modal trigger
    document.getElementById('btn-import-csv')?.addEventListener('click', () => {
      openImportModal();
    });

    // Add Patient Modal trigger
    document.getElementById('btn-add-patient')?.addEventListener('click', () => {
      openPatientFormModal(null);
    });

    // View Details button
    container.querySelectorAll('.btn-view-patient').forEach(btn => {
      btn.addEventListener('click', () => {
        const patientId = parseInt(btn.dataset.id, 10);
        openPatientViewModal(patientId);
      });
    });

    // Edit button
    container.querySelectorAll('.btn-edit-patient').forEach(btn => {
      btn.addEventListener('click', async () => {
        const patientId = parseInt(btn.dataset.id, 10);
        try {
          const patient = await api.getPatient(patientId);
          openPatientFormModal(patient);
        } catch (err) {
          alert(`Error fetching patient: ${err.message}`);
        }
      });
    });

    // Delete button
    container.querySelectorAll('.btn-delete-patient').forEach(btn => {
      btn.addEventListener('click', () => {
        const patientId = parseInt(btn.dataset.id, 10);
        const ref = btn.dataset.ref;
        openDeleteConfirmModal(patientId, ref);
      });
    });
  }

  // ==================== Patient View Details Modal ====================
  async function openPatientViewModal(patientId) {
    const modalContainer = document.getElementById('patient-modal-container');
    if (!modalContainer) return;

    modalContainer.innerHTML = `
      <div class="modal-overlay">
        <div class="modal-content" style="max-width: 580px;">
          <div class="modal-header">
            <h3>Patient Clinical Enclave Record</h3>
            <button class="modal-close-btn" id="modal-close">&times;</button>
          </div>
          <div class="modal-body" id="modal-view-body">
            <div style="text-align: center; padding: 20px;">
              <div style="width: 24px; height: 24px; border-radius: 50%; border: 2px solid var(--border-default); border-top-color: var(--accent-primary); animation: spin 0.8s linear infinite; display: inline-block;"></div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" id="modal-close-btn">Close</button>
          </div>
        </div>
      </div>
    `;

    const close = () => { modalContainer.innerHTML = ''; };
    document.getElementById('modal-close')?.addEventListener('click', close);
    document.getElementById('modal-close-btn')?.addEventListener('click', close);

    try {
      const p = await api.getPatient(patientId);
      const viewBody = document.getElementById('modal-view-body');
      if (!viewBody) return;

      viewBody.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
          <div>
            <div style="font-size: 1.2rem; font-weight: 700;" class="mono">${escapeHtml(p.external_ref)}</div>
            <div style="font-size: 0.8rem; color: var(--text-muted);">Hospital Partition: <strong>${escapeHtml(p.client_id)}</strong></div>
          </div>
          <span class="badge ${p.risk_label === 1 ? 'badge-danger' : 'badge-success'}" style="font-size: 0.85rem; padding: 4px 10px;">
            ${p.risk_label === 1 ? 'High Clinical Risk' : 'Low / Moderate Risk'}
          </span>
        </div>

        <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 12px;">
          <strong>Demographics:</strong> ${p.age} years old, biological ${p.sex}
        </div>

        <div class="stat-label">12 Clinical Parameters (ClinicalRiskMLP Model Inputs)</div>
        <div class="clinical-params-grid">
          <div class="param-item">
            <span class="param-name">Systolic BP</span>
            <span class="param-val">${p.systolic_bp} <small style="font-size: 0.65rem; color: var(--text-muted);">mmHg</small></span>
          </div>
          <div class="param-item">
            <span class="param-name">Diastolic BP</span>
            <span class="param-val">${p.diastolic_bp} <small style="font-size: 0.65rem; color: var(--text-muted);">mmHg</small></span>
          </div>
          <div class="param-item">
            <span class="param-name">Fasting Glucose</span>
            <span class="param-val">${p.fasting_glucose} <small style="font-size: 0.65rem; color: var(--text-muted);">mg/dL</small></span>
          </div>
          <div class="param-item">
            <span class="param-name">Cholesterol</span>
            <span class="param-val">${p.cholesterol} <small style="font-size: 0.65rem; color: var(--text-muted);">mg/dL</small></span>
          </div>
          <div class="param-item">
            <span class="param-name">HDL/LDL Ratio</span>
            <span class="param-val">${p.hdl_ldl_ratio}</span>
          </div>
          <div class="param-item">
            <span class="param-name">Body Mass Index</span>
            <span class="param-val">${p.bmi}</span>
          </div>
          <div class="param-item">
            <span class="param-name">Troponin I</span>
            <span class="param-val">${p.troponin} <small style="font-size: 0.65rem; color: var(--text-muted);">ng/mL</small></span>
          </div>
          <div class="param-item">
            <span class="param-name">Creatinine</span>
            <span class="param-val">${p.creatinine} <small style="font-size: 0.65rem; color: var(--text-muted);">mg/dL</small></span>
          </div>
          <div class="param-item">
            <span class="param-name">C-Reactive Protein</span>
            <span class="param-val">${p.crp} <small style="font-size: 0.65rem; color: var(--text-muted);">mg/L</small></span>
          </div>
          <div class="param-item">
            <span class="param-name">Resting Heart Rate</span>
            <span class="param-val">${p.resting_hr} <small style="font-size: 0.65rem; color: var(--text-muted);">bpm</small></span>
          </div>
          <div class="param-item">
            <span class="param-name">SpO2 Oxygen</span>
            <span class="param-val">${p.spo2}%</span>
          </div>
          <div class="param-item">
            <span class="param-name">Database Target</span>
            <span class="param-val">${p.risk_label}</span>
          </div>
        </div>

        ${p.notes ? `
          <div style="margin-top: 14px; background: var(--bg-surface-subtle); padding: 10px 14px; border-radius: var(--radius-md); font-size: 0.8rem;">
            <strong>Clinical Notes:</strong> ${escapeHtml(p.notes)}
          </div>
        ` : ''}

        <div style="margin-top: 14px; font-size: 0.72rem; color: var(--text-muted); display: flex; justify-content: space-between;">
          <span>Created: ${p.created_at ? new Date(p.created_at).toLocaleString() : '-'}</span>
          <span>Updated: ${p.updated_at ? new Date(p.updated_at).toLocaleString() : '-'}</span>
        </div>
      `;
    } catch (err) {
      document.getElementById('modal-view-body').innerHTML = `
        <div class="alert alert-danger">Failed to load record: ${escapeHtml(err.message)}</div>
      `;
    }
  }

  // ==================== Add / Edit Patient Modal ====================
  function openPatientFormModal(patientToEdit = null) {
    const isEdit = !!patientToEdit;
    const modalContainer = document.getElementById('patient-modal-container');
    if (!modalContainer) return;

    modalContainer.innerHTML = `
      <div class="modal-overlay">
        <div class="modal-content" style="max-width: 680px;">
          <div class="modal-header">
            <h3>${isEdit ? `Edit Patient Record (${escapeHtml(patientToEdit.external_ref)})` : 'Add Synthetic Patient Record'}</h3>
            <button class="modal-close-btn" id="modal-close">&times;</button>
          </div>
          <form id="patient-form">
            <div class="modal-body" style="max-height: 70vh;">
              <div id="patient-form-error" style="display: none;" class="alert alert-danger"></div>

              <div class="form-grid-2">
                <div class="form-group">
                  <label class="form-label">Reference ID <span class="unit">(Unique Synthetic Ref)</span></label>
                  <input type="text" id="p-external-ref" class="form-control mono" required minlength="3" maxlength="64"
                    value="${isEdit ? escapeHtml(patientToEdit.external_ref) : `SYN-PT-${Math.floor(10000 + Math.random() * 90000)}`}"
                    ${isEdit ? 'disabled' : ''}>
                </div>

                <div class="form-group">
                  <label class="form-label">Target Hospital Enclave</label>
                  <select id="p-client-id" class="form-control" required ${isEdit ? 'disabled' : ''}>
                    ${state.clients.map(c => `
                      <option value="${c.client_id}" ${patientToEdit?.client_id === c.client_id ? 'selected' : ''}>
                        ${escapeHtml(c.name)} (${c.client_id})
                      </option>
                    `).join('')}
                  </select>
                </div>
              </div>

              <div class="form-grid-3">
                <div class="form-group">
                  <label class="form-label">Age <span class="unit">(years, 18-105)</span></label>
                  <input type="number" id="p-age" class="form-control" required min="18" max="105"
                    value="${patientToEdit?.age || 55}">
                </div>
                <div class="form-group">
                  <label class="form-label">Biological Sex</label>
                  <select id="p-sex" class="form-control">
                    <option value="M" ${patientToEdit?.sex === 'M' ? 'selected' : ''}>Male (M)</option>
                    <option value="F" ${patientToEdit?.sex === 'F' ? 'selected' : ''}>Female (F)</option>
                    <option value="Other" ${patientToEdit?.sex === 'Other' ? 'selected' : ''}>Other</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Risk Target Label</label>
                  <select id="p-risk-label" class="form-control" required>
                    <option value="0" ${patientToEdit?.risk_label === 0 ? 'selected' : ''}>0 — Low/Moderate Risk</option>
                    <option value="1" ${patientToEdit?.risk_label === 1 ? 'selected' : ''}>1 — High Critical Risk</option>
                  </select>
                </div>
              </div>

              <div class="stat-label" style="margin-top: 8px;">12 Standardized Clinical Risk Model Parameters</div>

              <div class="form-grid-3">
                <div class="form-group">
                  <label class="form-label">Systolic BP <span class="unit">(mmHg)</span></label>
                  <input type="number" step="0.1" id="p-systolic-bp" class="form-control" required min="70" max="240"
                    value="${patientToEdit?.systolic_bp || 128.0}">
                </div>
                <div class="form-group">
                  <label class="form-label">Diastolic BP <span class="unit">(mmHg)</span></label>
                  <input type="number" step="0.1" id="p-diastolic-bp" class="form-control" required min="40" max="150"
                    value="${patientToEdit?.diastolic_bp || 82.0}">
                </div>
                <div class="form-group">
                  <label class="form-label">Fasting Glucose <span class="unit">(mg/dL)</span></label>
                  <input type="number" step="0.1" id="p-glucose" class="form-control" required min="50" max="450"
                    value="${patientToEdit?.fasting_glucose || 105.0}">
                </div>
              </div>

              <div class="form-grid-3">
                <div class="form-group">
                  <label class="form-label">Cholesterol <span class="unit">(mg/dL)</span></label>
                  <input type="number" step="0.1" id="p-cholesterol" class="form-control" required min="80" max="500"
                    value="${patientToEdit?.cholesterol || 205.0}">
                </div>
                <div class="form-group">
                  <label class="form-label">HDL/LDL Ratio</label>
                  <input type="number" step="0.01" id="p-ratio" class="form-control" required min="0.1" max="5.0"
                    value="${patientToEdit?.hdl_ldl_ratio || 1.15}">
                </div>
                <div class="form-group">
                  <label class="form-label">BMI <span class="unit">(kg/m²)</span></label>
                  <input type="number" step="0.1" id="p-bmi" class="form-control" required min="12" max="60"
                    value="${patientToEdit?.bmi || 26.5}">
                </div>
              </div>

              <div class="form-grid-3">
                <div class="form-group">
                  <label class="form-label">Troponin I <span class="unit">(ng/mL)</span></label>
                  <input type="number" step="0.001" id="p-troponin" class="form-control" required min="0" max="10"
                    value="${patientToEdit?.troponin || 0.035}">
                </div>
                <div class="form-group">
                  <label class="form-label">Creatinine <span class="unit">(mg/dL)</span></label>
                  <input type="number" step="0.01" id="p-creatinine" class="form-control" required min="0.2" max="10"
                    value="${patientToEdit?.creatinine || 1.05}">
                </div>
                <div class="form-group">
                  <label class="form-label">CRP <span class="unit">(mg/L)</span></label>
                  <input type="number" step="0.01" id="p-crp" class="form-control" required min="0" max="50"
                    value="${patientToEdit?.crp || 1.8}">
                </div>
              </div>

              <div class="form-grid-2">
                <div class="form-group">
                  <label class="form-label">Resting Heart Rate <span class="unit">(bpm)</span></label>
                  <input type="number" id="p-hr" class="form-control" required min="35" max="180"
                    value="${patientToEdit?.resting_hr || 72}">
                </div>
                <div class="form-group">
                  <label class="form-label">SpO2 Saturation <span class="unit">(%)</span></label>
                  <input type="number" step="0.1" id="p-spo2" class="form-control" required min="70" max="100"
                    value="${patientToEdit?.spo2 || 98.0}">
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Clinical Observations & Notes <span class="unit">(optional)</span></label>
                <textarea id="p-notes" class="form-control" rows="2" maxlength="500">${patientToEdit?.notes ? escapeHtml(patientToEdit.notes) : 'Synthetic clinical benchmark record.'}</textarea>
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" id="modal-close-btn">Cancel</button>
              <button type="submit" class="btn btn-primary" id="btn-submit-patient">
                ${isEdit ? 'Save Changes' : 'Add to Hospital Enclave'}
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    const close = () => { modalContainer.innerHTML = ''; };
    document.getElementById('modal-close')?.addEventListener('click', close);
    document.getElementById('modal-close-btn')?.addEventListener('click', close);

    document.getElementById('patient-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = document.getElementById('btn-submit-patient');
      const errBox = document.getElementById('patient-form-error');
      errBox.style.display = 'none';
      submitBtn.disabled = true;
      submitBtn.textContent = 'Saving to database...';

      const payload = {
        age: parseInt(document.getElementById('p-age').value, 10),
        sex: document.getElementById('p-sex').value,
        systolic_bp: parseFloat(document.getElementById('p-systolic-bp').value),
        diastolic_bp: parseFloat(document.getElementById('p-diastolic-bp').value),
        fasting_glucose: parseFloat(document.getElementById('p-glucose').value),
        cholesterol: parseFloat(document.getElementById('p-cholesterol').value),
        hdl_ldl_ratio: parseFloat(document.getElementById('p-ratio').value),
        bmi: parseFloat(document.getElementById('p-bmi').value),
        troponin: parseFloat(document.getElementById('p-troponin').value),
        creatinine: parseFloat(document.getElementById('p-creatinine').value),
        crp: parseFloat(document.getElementById('p-crp').value),
        resting_hr: parseInt(document.getElementById('p-hr').value, 10),
        spo2: parseFloat(document.getElementById('p-spo2').value),
        risk_label: parseInt(document.getElementById('p-risk-label').value, 10),
        notes: document.getElementById('p-notes').value.trim() || null
      };

      try {
        if (isEdit) {
          await api.updatePatient(patientToEdit.id, payload);
        } else {
          payload.external_ref = document.getElementById('p-external-ref').value.trim();
          payload.client_id = document.getElementById('p-client-id').value;
          await api.createPatient(payload);
        }
        close();
        loadData();
      } catch (err) {
        errBox.textContent = err.message;
        errBox.style.display = 'block';
        submitBtn.disabled = false;
        submitBtn.textContent = isEdit ? 'Save Changes' : 'Add to Hospital Enclave';
      }
    });
  }

  // ==================== CSV Import Modal ====================
  function openImportModal() {
    const modalContainer = document.getElementById('patient-modal-container');
    if (!modalContainer) return;

    modalContainer.innerHTML = `
      <div class="modal-overlay">
        <div class="modal-content" style="max-width: 540px;">
          <div class="modal-header">
            <h3>Import Synthetic Patients via CSV</h3>
            <button class="modal-close-btn" id="modal-close">&times;</button>
          </div>
          <form id="csv-import-form">
            <div class="modal-body">
              <div id="import-error-banner" style="display: none;" class="alert alert-danger"></div>
              <div id="import-success-banner" style="display: none;" class="alert alert-success"></div>

              <p style="font-size: 0.84rem; color: var(--text-secondary); margin-bottom: 14px;">
                Upload a structured CSV file containing clinical diagnostic records. Every record will be verified against the 12-dimensional schema and partitioned into its respective hospital node.
              </p>

              <div class="form-group">
                <label class="form-label">Select CSV File</label>
                <input type="file" id="csv-file-input" class="form-control" accept=".csv" required>
              </div>

              <div style="background: var(--bg-surface-subtle); padding: 12px; border-radius: var(--radius-md); border: 1px solid var(--border-default); font-size: 0.78rem;">
                <strong>Required CSV Headers:</strong><br>
                <span class="mono" style="color: var(--text-muted); font-size: 0.72rem; word-break: break-all;">
                  external_ref, client_id, age, sex, systolic_bp, diastolic_bp, fasting_glucose, cholesterol, hdl_ldl_ratio, bmi, troponin, creatinine, crp, resting_hr, spo2, risk_label, notes
                </span>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" id="modal-close-btn">Close</button>
              <button type="submit" class="btn btn-primary" id="btn-upload-csv">
                Upload & Ingest Records
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    const close = () => { modalContainer.innerHTML = ''; };
    document.getElementById('modal-close')?.addEventListener('click', close);
    document.getElementById('modal-close-btn')?.addEventListener('click', close);

    document.getElementById('csv-import-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fileInput = document.getElementById('csv-file-input');
      const file = fileInput?.files?.[0];
      if (!file) {
        alert('Please select a .csv file first.');
        return;
      }

      const submitBtn = document.getElementById('btn-upload-csv');
      const errBanner = document.getElementById('import-error-banner');
      const succBanner = document.getElementById('import-success-banner');
      errBanner.style.display = 'none';
      succBanner.style.display = 'none';

      submitBtn.disabled = true;
      submitBtn.textContent = 'Ingesting and validating...';

      try {
        const res = await api.importPatientsCsv(file);
        if (res.imported_count > 0) {
          succBanner.innerHTML = `Successfully ingested <strong>${res.imported_count}</strong> synthetic patient records into hospital enclaves!`;
          succBanner.style.display = 'block';
          submitBtn.textContent = 'Import Complete';
          setTimeout(() => {
            close();
            loadData();
          }, 1500);
        } else {
          errBanner.innerHTML = `Failed to ingest records. Errors:<br>${(res.errors || []).join('<br>')}`;
          errBanner.style.display = 'block';
          submitBtn.disabled = false;
          submitBtn.textContent = 'Upload & Ingest Records';
        }
      } catch (err) {
        errBanner.textContent = err.message;
        errBanner.style.display = 'block';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Upload & Ingest Records';
      }
    });
  }

  // ==================== Delete Confirmation Modal ====================
  function openDeleteConfirmModal(patientId, externalRef) {
    const modalContainer = document.getElementById('patient-modal-container');
    if (!modalContainer) return;

    modalContainer.innerHTML = `
      <div class="modal-overlay">
        <div class="modal-content" style="max-width: 440px;">
          <div class="modal-header">
            <h3>Confirm Deletion</h3>
            <button class="modal-close-btn" id="modal-close">&times;</button>
          </div>
          <div class="modal-body">
            <p style="font-size: 0.88rem; color: var(--text-primary);">
              Are you sure you want to delete patient record <strong class="mono">${escapeHtml(externalRef)}</strong>?
            </p>
            <p style="font-size: 0.8rem; color: var(--status-danger); margin-top: 8px;">
              This will permanently delete this record from PostgreSQL and recalculate the client enclave dataset size.
            </p>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" id="modal-close-btn">Cancel</button>
            <button class="btn btn-danger" id="btn-confirm-delete">Delete Record</button>
          </div>
        </div>
      </div>
    `;

    const close = () => { modalContainer.innerHTML = ''; };
    document.getElementById('modal-close')?.addEventListener('click', close);
    document.getElementById('modal-close-btn')?.addEventListener('click', close);

    document.getElementById('btn-confirm-delete')?.addEventListener('click', async () => {
      const btn = document.getElementById('btn-confirm-delete');
      btn.disabled = true;
      btn.textContent = 'Deleting...';
      try {
        await api.deletePatient(patientId);
        close();
        loadData();
      } catch (err) {
        alert(`Failed to delete record: ${err.message}`);
        btn.disabled = false;
        btn.textContent = 'Delete Record';
      }
    });
  }

  // Initial load
  loadData();
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

