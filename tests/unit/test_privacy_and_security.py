import numpy as np
import pytest
from federated_learning.privacy.differential_privacy import DifferentialPrivacyEngine, SecureAggregationProtocol
from federated_learning.attacks.poisoning import ModelPoisoningAttack
from services.security.anomaly_detector import ThreatAnomalyDetector
from services.security.trust_engine import TrustScoreEngine

def test_differential_privacy_clipping_and_noise():
    dp = DifferentialPrivacyEngine(epsilon=2.0, delta=1e-5, clip_norm=1.0)
    
    # Large delta vector
    delta_vector = np.array([5.0, 5.0, 5.0, 5.0])
    perturbed, stats = dp.apply_differential_privacy(delta_vector)
    
    assert stats["status"] == "PROTECTED"
    assert stats["clipped_l2_norm"] <= 1.0001
    assert stats["noise_std_dev"] > 0.0
    assert not np.allclose(delta_vector, perturbed)
    assert dp.cumulative_epsilon_spent > 0.0

def test_secure_aggregation_zero_sum_masks():
    clients = ["client_a", "client_b", "client_c"]
    masks = SecureAggregationProtocol.generate_zero_sum_masks(clients, vector_dim=10, seed=123)
    
    # Verify that the sum of all client masks cancels out to zero
    summed_mask = sum(masks[c] for c in clients)
    assert np.allclose(summed_mask, np.zeros(10), atol=1e-7)

def test_anomaly_detector_catches_sign_flipping():
    detector = ThreatAnomalyDetector()
    
    # Normal consensus updates
    normal_update = np.array([0.5, 0.4, 0.6, -0.3, 0.2])
    u1 = {"client_id": "c1", "weights_flat": normal_update + np.random.normal(0, 0.02, 5), "organization_name": "Hospital A"}
    u2 = {"client_id": "c2", "weights_flat": normal_update + np.random.normal(0, 0.02, 5), "organization_name": "Hospital B"}
    u3 = {"client_id": "c3", "weights_flat": normal_update + np.random.normal(0, 0.02, 5), "organization_name": "Hospital C"}
    
    # Malicious sign-flipped update
    poisoned_update, _ = ModelPoisoningAttack.sign_flipping(normal_update, scale=2.5)
    u_malicious = {"client_id": "c_attacker", "weights_flat": poisoned_update, "organization_name": "Hospital Malicious"}
    
    updates = [u1, u2, u3, u_malicious]
    valid, quarantined, summary = detector.detect_anomalies(updates)
    
    assert len(quarantined) == 1
    assert quarantined[0]["client_id"] == "c_attacker"
    assert len(valid) == 3
    assert summary["threat_level"] == "CRITICAL"

def test_trust_score_engine_penalizes_threat():
    trust_engine = TrustScoreEngine(base_trust=90.0)
    trust_engine.initialize_client("c_test", "Test Hospital")
    
    # Normal pass
    r1 = trust_engine.update_trust("c_test", "Test Hospital", {"is_threat": False, "threat_score": 10.0}, round_number=1)
    assert r1["trust_score"] >= 90.0
    assert r1["status"] == "TRUSTED"
    
    # Threat detected
    r2 = trust_engine.update_trust("c_test", "Test Hospital", {"is_threat": True, "threat_score": 88.0}, round_number=2)
    assert r2["trust_score"] < 50.0
    assert r2["status"] == "HIGH_RISK"
    assert r2["anomalies_detected"] == 1
