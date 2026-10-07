import numpy as np
from typing import Dict, Any, List, Optional, Tuple
from federated_learning.models.neural_net import ClinicalRiskMLP
from federated_learning.datasets.clinical_dataset import FederationDataRepository
from federated_learning.privacy.differential_privacy import DifferentialPrivacyEngine
from federated_learning.attacks.poisoning import ModelPoisoningAttack

class FederatedClientSimulator:
    """
    Simulates decentralized on-premise healthcare client nodes.
    Each client trains privately on its isolated dataset, applies differential privacy,
    and transmits ONLY protected weight deltas to the cloud aggregation tier.
    """
    def __init__(self):
        self.data_repo = FederationDataRepository()

    def train_client_round(
        self,
        client_id: str,
        global_flat_weights: np.ndarray,
        epochs: int = 3,
        lr: float = 0.02,
        batch_size: int = 32,
        privacy_engine: Optional[DifferentialPrivacyEngine] = None,
        simulate_attack: bool = False,
        attack_type: str = "sign_flipping"
    ) -> Dict[str, Any]:
        
        # 1. Access isolated private dataset
        X, y = self.data_repo.get_client_dataset(client_id)
        n_samples = X.shape[0]
        
        # Attack simulation: Label flipping during local training
        if simulate_attack and attack_type == "label_flipping":
            y = ModelPoisoningAttack.label_flipping_data(y)
            
        # 2. Instantiate local model initialized with global parameters
        local_model = ClinicalRiskMLP()
        local_model.set_flat_weights(global_flat_weights)
        
        initial_acc, initial_loss = local_model.evaluate(X, y)
        
        # 3. Local training loop
        losses = []
        for ep in range(epochs):
            acc, loss = local_model.train_epoch(X, y, lr=lr, batch_size=batch_size, global_weights=global_flat_weights)
            losses.append(loss)
            
        final_acc, final_loss = local_model.evaluate(X, y)
        local_flat_weights = local_model.get_flat_weights()
        
        # 4. Compute weight update delta: Delta_w = w_local - w_global
        weights_delta = local_flat_weights - global_flat_weights
        
        attack_metadata = None
        # Attack simulation: Parameter space manipulation
        if simulate_attack:
            if attack_type == "sign_flipping":
                weights_delta, attack_metadata = ModelPoisoningAttack.sign_flipping(weights_delta, scale=3.5)
            elif attack_type == "gradient_scaling":
                weights_delta, attack_metadata = ModelPoisoningAttack.gradient_scaling(weights_delta, multiplier=20.0)
            elif attack_type == "random_noise":
                weights_delta, attack_metadata = ModelPoisoningAttack.random_gaussian_noise(weights_delta.shape, std=5.0)
                
        # 5. Apply Local Differential Privacy (Clipping + Calibrated Noise)
        dp_stats = None
        if privacy_engine and not simulate_attack:
            weights_delta, dp_stats = privacy_engine.apply_differential_privacy(weights_delta)
            
        # Reconstruct updated model representation for aggregation
        transmitted_weights = global_flat_weights + weights_delta
        
        org_name = FederationDataRepository.CLIENT_CONFIGS.get(client_id, {}).get("name", client_id)
        
        return {
            "client_id": client_id,
            "organization_name": org_name,
            "sample_count": n_samples,
            "weights_flat": transmitted_weights.tolist(),
            "weights_delta": weights_delta.tolist(),
            "weights_delta_norm": float(np.linalg.norm(weights_delta)),
            "local_initial_acc": round(initial_acc * 100, 2),
            "local_final_acc": round(final_acc * 100, 2),
            "local_loss": round(final_loss, 4),
            "epochs_trained": epochs,
            "is_attack_simulated": simulate_attack,
            "attack_metadata": attack_metadata,
            "privacy_stats": dp_stats
        }

client_simulator = FederatedClientSimulator()
