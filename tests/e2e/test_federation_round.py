import pytest
import asyncio
from fastapi.testclient import TestClient
from services.api_gateway.main import app
from database.session import init_db, SessionLocal
from database.seeds.seed_data import seed_database
from database.models.schema import ModelVersion, SecurityEvent, FederatedClient

@pytest.fixture(scope="module", autouse=True)
def setup_test_db():
    init_db()
    seed_database()

client = TestClient(app)

def test_e2e_federation_round_with_threat_quarantine():
    # 1. Login as Admin
    login_res = client.post("/api/auth/login", json={"username": "admin", "password": "AdminPassword123!"})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # 2. Start a training round with simulated attack from Hospital Delta
    payload = {
        "epochs": 2,
        "lr": 0.03,
        "strategy": "TrimmedMean",
        "epsilon": 4.0,
        "delta": 1e-5,
        "simulate_attack": True,
        "attack_client_id": "client-delta",
        "attack_type": "sign_flipping"
    }
    
    start_res = client.post("/api/federation/start", json=payload, headers=headers)
    assert start_res.status_code == 200
    round_data = start_res.json()
    
    assert round_data["status"] == "COMPLETED"
    assert round_data["quarantined_count"] == 1
    assert "client-delta" in round_data["quarantined_clients"]
    assert round_data["verified_count"] >= 4
    assert round_data["accuracy"] > 0.0
    
    # 3. Verify Database State
    db = SessionLocal()
    try:
        # Check that Hospital Delta is quarantined with lower trust
        delta_client = db.query(FederatedClient).filter(FederatedClient.client_id == "client-delta").first()
        assert delta_client.status == "QUARANTINED"
        assert delta_client.trust_score < 60.0
        
        # Check that security event was logged
        sec_event = db.query(SecurityEvent).filter(SecurityEvent.client_id == "client-delta").first()
        assert sec_event is not None
        assert "Anomalous" in sec_event.description or "Gradient" in sec_event.description
        
        # Check that a new model version was created and marked PRODUCTION
        latest_model = db.query(ModelVersion).order_by(ModelVersion.version_number.desc()).first()
        assert latest_model.version_number >= 2
        assert latest_model.status == "PRODUCTION"
    finally:
        db.close()
