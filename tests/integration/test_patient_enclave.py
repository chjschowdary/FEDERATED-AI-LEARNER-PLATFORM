import io
import pytest
from fastapi.testclient import TestClient
from services.api_gateway.main import app
from database.session import init_db, SessionLocal
from database.seeds.seed_data import seed_database
from database.models.schema import SyntheticPatient, FederatedClient

@pytest.fixture(scope="module", autouse=True)
def setup_test_db():
    init_db()
    seed_database()

client = TestClient(app)

def get_admin_headers():
    res = client.post("/api/auth/login", json={"username": "admin", "password": "AdminPassword123!"})
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

def test_patient_list_and_pagination():
    res = client.get("/api/patients?page=1&page_size=10")
    assert res.status_code == 200
    data = res.json()
    assert data["total"] >= 250
    assert len(data["items"]) == 10
    assert data["page"] == 1
    assert data["total_pages"] >= 25

def test_patient_filter_by_client_and_risk():
    res = client.get("/api/patients?client_id=client-alpha&risk_label=1")
    assert res.status_code == 200
    data = res.json()
    assert all(item["client_id"] == "client-alpha" for item in data["items"])
    assert all(item["risk_label"] == 1 for item in data["items"])

def test_patient_stats():
    res = client.get("/api/patients/stats")
    assert res.status_code == 200
    data = res.json()
    assert data["total_patients"] >= 250
    assert data["high_risk_count"] + data["low_risk_count"] == data["total_patients"]
    assert "client-alpha" in data["by_client"]

def test_patient_crud_lifecycle():
    headers = get_admin_headers()
    
    # 1. Create Patient
    payload = {
        "external_ref": "SYN-TEST-9999",
        "client_id": "client-beta",
        "age": 52,
        "sex": "F",
        "systolic_bp": 138.0,
        "diastolic_bp": 88.0,
        "fasting_glucose": 115.0,
        "cholesterol": 215.0,
        "hdl_ldl_ratio": 1.1,
        "bmi": 28.2,
        "troponin": 0.05,
        "creatinine": 1.1,
        "crp": 2.2,
        "resting_hr": 76,
        "spo2": 97.5,
        "risk_label": 0,
        "notes": "Automated integration test record."
    }
    create_res = client.post("/api/patients", json=payload, headers=headers)
    assert create_res.status_code == 201
    created_id = create_res.json()["id"]
    
    # 2. Get Patient by ID
    get_res = client.get(f"/api/patients/{created_id}")
    assert get_res.status_code == 200
    assert get_res.json()["external_ref"] == "SYN-TEST-9999"
    assert get_res.json()["age"] == 52
    
    # 3. Update Patient
    update_res = client.put(f"/api/patients/{created_id}", json={"age": 53, "risk_label": 1}, headers=headers)
    assert update_res.status_code == 200
    assert update_res.json()["age"] == 53
    assert update_res.json()["risk_label"] == 1
    
    # 4. Delete Patient
    del_res = client.delete(f"/api/patients/{created_id}", headers=headers)
    assert del_res.status_code == 200
    assert del_res.json()["status"] == "DELETED"
    
    # 5. Verify 404 after deletion
    verify_res = client.get(f"/api/patients/{created_id}")
    assert verify_res.status_code == 404

def test_patient_csv_export():
    res = client.get("/api/patients/export/csv")
    assert res.status_code == 200
    assert res.headers["content-type"].startswith("text/csv")
    content = res.text
    assert "external_ref,client_id,age,sex" in content
    assert "SYN-PT-" in content

def test_patient_csv_import():
    headers = get_admin_headers()
    import time
    ts = int(time.time())
    ref1 = f"SYN-CSV-{ts}-1"
    ref2 = f"SYN-CSV-{ts}-2"
    csv_content = (
        "external_ref,client_id,age,sex,systolic_bp,diastolic_bp,fasting_glucose,"
        "cholesterol,hdl_ldl_ratio,bmi,troponin,creatinine,crp,resting_hr,spo2,risk_label,notes\n"
        f"{ref1},client-alpha,60,M,140.0,85.0,120.0,230.0,0.9,29.0,0.06,1.2,3.0,78,96.0,1,Import test\n"
        f"{ref2},client-gamma,45,F,118.0,76.0,95.0,180.0,1.4,23.5,0.02,0.8,1.2,68,99.0,0,Import test\n"
    )
    files = {"file": ("test_import.csv", io.BytesIO(csv_content.encode("utf-8")), "text/csv")}
    import_res = client.post("/api/patients/import-csv", files=files, headers=headers)
    assert import_res.status_code == 200
    data = import_res.json()
    assert data["imported_count"] == 2
    assert data["total_errors"] == 0

def test_dashboard_and_settings_endpoints():
    headers = get_admin_headers()
    
    # Dashboard stats
    dash_res = client.get("/api/dashboard/stats")
    assert dash_res.status_code == 200
    dash_data = dash_res.json()
    assert "active_clients_count" in dash_data
    assert "total_synthetic_patients" in dash_data
    assert "patients_by_client" in dash_data
    
    # Settings
    settings_res = client.get("/api/settings", headers=headers)
    assert settings_res.status_code == 200
    settings_data = settings_res.json()
    assert "user" in settings_data
    assert "federation" in settings_data
    assert "database" in settings_data

def test_security_radar_and_chaos_endpoints():
    headers = get_admin_headers()
    
    # Security Radar
    radar_res = client.get("/api/security/radar")
    assert radar_res.status_code == 200
    radar_data = radar_res.json()
    assert len(radar_data) >= 5
    assert any("trust" in c for c in radar_data)
    
    # Pod failure simulation
    chaos_res = client.post(
        "/api/infrastructure/simulate-failure",
        json={"service_name": "aggregator-worker"},
        headers=headers
    )
    assert chaos_res.status_code == 200
    assert chaos_res.json()["status"] == "POD_TERMINATED_HEALING_TRIGGERED"

def test_federation_pause_and_reset():
    headers = get_admin_headers()
    
    pause_res = client.post("/api/federation/pause", headers=headers)
    assert pause_res.status_code == 200
    assert pause_res.json()["status"] == "PAUSED"
    
    reset_res = client.post("/api/federation/reset", headers=headers)
    assert reset_res.status_code == 200
    assert reset_res.json()["status"] == "RESET"

def test_hospital_enclave_isolation_and_cross_search_alert():
    # 1. Login as Hospital Alpha
    alpha_login = client.post("/api/auth/login", json={"username": "client_alpha", "password": "ClientAlpha123!"})
    assert alpha_login.status_code == 200
    alpha_token = alpha_login.json()["access_token"]
    alpha_headers = {"Authorization": f"Bearer {alpha_token}"}
    
    # 2. Alpha querying own dataset: must ONLY receive Hospital Alpha records
    alpha_res = client.get("/api/patients?page=1&page_size=20", headers=alpha_headers)
    assert alpha_res.status_code == 200
    alpha_data = alpha_res.json()
    assert len(alpha_data["items"]) > 0
    assert all(item["client_id"] == "client-alpha" for item in alpha_data["items"])
    
    # 3. Alpha searching for "delta": must trigger ABNORMAL ACTIVITY & 403 Forbidden
    cross_search_res = client.get("/api/patients?search=delta", headers=alpha_headers)
    assert cross_search_res.status_code == 403
    assert "SECURITY ALERT" in cross_search_res.json()["detail"]
    assert "Hospital Delta" in cross_search_res.json()["detail"]
    
    # 4. Alpha trying to pass client_id=client-delta: must also trigger 403
    cross_filter_res = client.get("/api/patients?client_id=client-delta", headers=alpha_headers)
    assert cross_filter_res.status_code == 403
    assert "SECURITY ALERT" in cross_filter_res.json()["detail"]
    
    # 5. Check that SecurityEvent was recorded in the database
    admin_headers = get_admin_headers()
    sec_events_res = client.get("/api/security/events", headers=admin_headers)
    assert sec_events_res.status_code == 200
    events = sec_events_res.json()
    assert any(e["event_type"] == "CROSS_TENANT_SEARCH_VIOLATION" and e["client_id"] == "client-alpha" for e in events)
    
    # 6. Verify Hospital Delta isolation
    delta_login = client.post("/api/auth/login", json={"username": "client_delta", "password": "ClientDelta123!"})
    assert delta_login.status_code == 200
    delta_headers = {"Authorization": f"Bearer {delta_login.json()['access_token']}"}
    delta_res = client.get("/api/patients", headers=delta_headers)
    assert delta_res.status_code == 200
    assert all(item["client_id"] == "client-delta" for item in delta_res.json()["items"])
    
    # 7. Verify Hospital Epsilon isolation
    eps_login = client.post("/api/auth/login", json={"username": "client_epsilon", "password": "ClientEpsilon123!"})
    assert eps_login.status_code == 200
    eps_headers = {"Authorization": f"Bearer {eps_login.json()['access_token']}"}
    eps_res = client.get("/api/patients", headers=eps_headers)
    assert eps_res.status_code == 200
    assert all(item["client_id"] == "client-epsilon" for item in eps_res.json()["items"])
    
    # 8. Verify Hospital Gamma isolation
    gamma_login = client.post("/api/auth/login", json={"username": "client_gamma", "password": "ClientGamma123!"})
    assert gamma_login.status_code == 200
    gamma_headers = {"Authorization": f"Bearer {gamma_login.json()['access_token']}"}
    gamma_res = client.get("/api/patients", headers=gamma_headers)
    assert gamma_res.status_code == 200
    assert all(item["client_id"] == "client-gamma" for item in gamma_res.json()["items"])
