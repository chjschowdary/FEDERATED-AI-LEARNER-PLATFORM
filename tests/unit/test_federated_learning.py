import numpy as np
import pytest
from federated_learning.models.neural_net import ClinicalRiskMLP
from federated_learning.datasets.clinical_dataset import generate_clinical_features, FederationDataRepository
from federated_learning.aggregation.strategies import FedAvg, TrimmedMean, Krum, CoordinateWiseMedian

def test_neural_net_forward_and_train():
    model = ClinicalRiskMLP(input_dim=12, hidden_dim1=16, hidden_dim2=8, num_classes=2, seed=42)
    X, y = generate_clinical_features(n_samples=100, mean_shift=np.zeros(12), cov_scale=1.0, class_bias=0.0, seed=42)
    
    init_acc, init_loss = model.evaluate(X, y)
    assert 0.0 <= init_acc <= 1.0
    assert init_loss > 0.0
    
    # Train 2 epochs
    for _ in range(2):
        acc, loss = model.train_epoch(X, y, lr=0.05, batch_size=16)
        
    final_acc, final_loss = model.evaluate(X, y)
    assert final_loss < init_loss or final_acc >= init_acc

def test_neural_net_weights_flattening_and_loading():
    model = ClinicalRiskMLP(input_dim=12, hidden_dim1=16, hidden_dim2=8, num_classes=2, seed=42)
    flat_weights = model.get_flat_weights()
    assert len(flat_weights.shape) == 1
    
    # Modify weights
    new_weights = flat_weights + 0.5
    model.set_flat_weights(new_weights)
    restored_flat = model.get_flat_weights()
    
    assert np.allclose(new_weights, restored_flat)

def test_fedavg_aggregation():
    strategy = FedAvg()
    w1 = np.array([1.0, 2.0, 3.0])
    w2 = np.array([3.0, 4.0, 5.0])
    
    updates = [
        {"client_id": "c1", "weights_flat": w1, "sample_count": 100},
        {"client_id": "c2", "weights_flat": w2, "sample_count": 100}
    ]
    
    agg_w, meta = strategy.aggregate(updates)
    expected = np.array([2.0, 3.0, 4.0])
    assert np.allclose(agg_w, expected)
    assert meta["strategy"] == "FedAvg"

def test_trimmed_mean_aggregation():
    strategy = TrimmedMean(beta=0.2)
    # 5 updates with an extreme outlier
    updates = [
        {"client_id": "c1", "weights_flat": np.array([1.0, 1.0]), "sample_count": 100},
        {"client_id": "c2", "weights_flat": np.array([1.1, 1.1]), "sample_count": 100},
        {"client_id": "c3", "weights_flat": np.array([1.2, 1.2]), "sample_count": 100},
        {"client_id": "c4", "weights_flat": np.array([1.05, 1.05]), "sample_count": 100},
        {"client_id": "c5", "weights_flat": np.array([100.0, 100.0]), "sample_count": 100} # Outlier
    ]
    
    agg_w, meta = strategy.aggregate(updates)
    # Should trim the 100.0 outlier and lowest 1.0
    assert agg_w[0] < 2.0
    assert meta["strategy"] == "TrimmedMean"

def test_krum_aggregation():
    strategy = Krum(expected_byzantine=1)
    updates = [
        {"client_id": "c1", "weights_flat": np.array([2.0, 2.0]), "sample_count": 100},
        {"client_id": "c2", "weights_flat": np.array([2.1, 1.9]), "sample_count": 100},
        {"client_id": "c3", "weights_flat": np.array([1.9, 2.1]), "sample_count": 100},
        {"client_id": "c4", "weights_flat": np.array([50.0, -50.0]), "sample_count": 100} # Byzantine attacker
    ]
    
    agg_w, meta = strategy.aggregate(updates)
    assert agg_w[0] < 3.0
    assert meta["selected_client_id"] != "c4"
