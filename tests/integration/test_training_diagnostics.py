import pytest
from fastapi.testclient import TestClient
from services.api_gateway.main import app
from database.session import init_db, SessionLocal
from database.seeds.seed_data import seed_database
from database.models.schema import FederatedClient
from services.aggregator.aggregator import aggregation_worker

@pytest.fixture(scope="module", autouse=True)
def setup_db():
    init_db()
    seed_database()
    db = SessionLocal()
    db.query(FederatedClient).update({"status": "ACTIVE", "trust_score": 95.0, "risk_score": 5.0, "anomalies_detected": 0})
    db.commit()
    db.close()
    aggregation_worker.trust_engine.client_trust_registry.clear()

client = TestClient(app)

def test_training_diagnostics_reasons_and_unquarantine():
    # 1. Login as Admin
    login_res = client.post("/api/auth/login", json={"username": "admin", "password": "AdminPassword123!"})
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Trigger training round with Byzantine sign-flipping attack on client-delta
    attack_payload = {
        "epochs": 2,
        "lr": 0.02,
        "strategy": "FedAvg",
        "epsilon": 4.0,
        "delta": 1e-5,
        "simulate_attack": True,
        "attack_client_id": "client-delta",
        "attack_type": "sign_flipping"
    }
    res = client.post("/api/federation/start", json=attack_payload, headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "COMPLETED"
    assert "client-delta" in data["quarantined_clients"]

    # 3. Query GET /api/clients and verify diagnostic fields
    clients_res = client.get("/api/clients", headers=headers)
    assert clients_res.status_code == 200
    clients_data = clients_res.json()
    delta_node = next((c for c in clients_data if c["client_id"] == "client-delta"), None)
    assert delta_node is not None
    assert delta_node["status"] == "QUARANTINED"
    assert delta_node["trust_score"] < 60.0
    assert delta_node["threat_score"] >= 50.0
    assert delta_node["latest_quarantine_reason"] is not None
    assert "Sign-Flipping" in delta_node["latest_quarantine_reason"] or "Inverted" in delta_node["latest_quarantine_reason"] or "Security Violation" in str(delta_node.get("latest_trust_change"))

    # Verify latest_trust_change details
    ltc = delta_node.get("latest_trust_change")
    assert ltc is not None
    assert ltc["delta"] < 0
    assert "Security Violation" in ltc["reason"] or "Sign-Flipping" in ltc["reason"]

    # 4. Unquarantine client-delta
    unq_res = client.post("/api/clients/client-delta/unquarantine", headers=headers)
    assert unq_res.status_code == 200
    assert unq_res.json()["status"] == "UNQUARANTINED"
    assert unq_res.json()["new_trust_score"] >= 85.0

    # Verify client is now ACTIVE with restored trust
    clients_res2 = client.get("/api/clients", headers=headers)
    delta_node2 = next((c for c in clients_res2.json() if c["client_id"] == "client-delta"), None)
    assert delta_node2["status"] == "ACTIVE"
    assert delta_node2["trust_score"] >= 85.0

    # 5. Run a normal training round with NO attacks
    normal_payload = {
        "epochs": 2,
        "lr": 0.02,
        "strategy": "FedAvg",
        "epsilon": 4.0,
        "delta": 1e-5,
        "simulate_attack": False
    }
    normal_res = client.post("/api/federation/start", json=normal_payload, headers=headers)
    assert normal_res.status_code == 200
    normal_data = normal_res.json()
    assert normal_data["status"] == "COMPLETED"
    assert normal_data["quarantined_count"] == 0
    assert normal_data["verified_count"] >= 4
