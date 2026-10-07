import pytest
from fastapi.testclient import TestClient
from services.api_gateway.main import app
from database.session import init_db
from database.seeds.seed_data import seed_database

@pytest.fixture(scope="module", autouse=True)
def setup_test_db():
    init_db()
    seed_database()

client = TestClient(app)

def test_health_and_readiness():
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "HEALTHY"
    
    res_ready = client.get("/ready")
    assert res_ready.status_code == 200

def test_login_and_auth_me():
    # Valid login
    res = client.post("/api/auth/login", json={"username": "admin", "password": "AdminPassword123!"})
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["user"]["username"] == "admin"
    assert data["user"]["role"] == "ADMIN"
    
    token = data["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # /api/auth/me
    res_me = client.get("/api/auth/me", headers=headers)
    assert res_me.status_code == 200
    assert res_me.json()["username"] == "admin"

def test_federation_status():
    res = client.get("/api/federation/status")
    assert res.status_code == 200
    data = res.json()
    assert "federation_status" in data
    assert "global_accuracy" in data
    assert "active_clients_count" in data
    assert data["total_clients_count"] >= 5

def test_list_clients():
    res = client.get("/api/clients")
    assert res.status_code == 200
    clients = res.json()
    assert len(clients) >= 5
    assert any(c["client_id"] == "client-alpha" for c in clients)

def test_infrastructure_health_and_cost():
    res_infra = client.get("/api/infrastructure/health")
    assert res_infra.status_code == 200
    assert res_infra.json()["cluster_status"] == "OPTIMAL"
    
    res_cost = client.get("/api/cost/estimate?nodes=3&storage_gb=100")
    assert res_cost.status_code == 200
    data = res_cost.json()
    assert data["monthly_total_usd"] > 0
    assert "eks_control_plane" in data["breakdown"]
