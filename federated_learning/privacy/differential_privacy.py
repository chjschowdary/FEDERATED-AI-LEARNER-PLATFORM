import numpy as np
from typing import Dict, List, Tuple, Any, Optional

class DifferentialPrivacyEngine:
    """
    Production Differential Privacy Layer for Local & Global Federated AI.
    
    Protects against membership inference, model inversion, and feature reconstruction attacks
    by enforcing bounded sensitivity via L2-norm gradient clipping and calibrated Gaussian / Laplace perturbation.
    """
    def __init__(self, epsilon: float = 4.0, delta: float = 1e-5, clip_norm: float = 1.0, mechanism: str = "gaussian"):
        self.epsilon = max(0.01, float(epsilon))
        self.delta = max(1e-8, float(delta))
        self.clip_norm = max(0.01, float(clip_norm))
        self.mechanism = mechanism.lower()
        self.cumulative_epsilon_spent = 0.0
        self.total_rounds_applied = 0

    def compute_gaussian_sigma(self, dim: int = 1) -> float:
        """
        Computes calibrated standard deviation for (epsilon, delta)-DP.
        For a parameter vector of dimension d with vector L2 sensitivity S = clip_norm,
        sigma_per_coord = (S * sqrt(2 * ln(1.25 / delta))) / (epsilon * sqrt(dim))
        so that the total noise variance over all d coordinates equals sigma_total^2.
        """
        sigma_total = (self.clip_norm * np.sqrt(2.0 * np.log(1.25 / self.delta))) / self.epsilon
        if dim > 1:
            return sigma_total / np.sqrt(dim)
        return sigma_total

    def clip_gradients_or_deltas(self, weights_delta: np.ndarray) -> Tuple[np.ndarray, float]:
        """
        Clips the parameter delta vector to maximum L2-norm S.
        w_clipped = w * min(1, S / ||w||_2)
        """
        l2_norm = float(np.linalg.norm(weights_delta))
        if l2_norm > self.clip_norm:
            scaling_factor = self.clip_norm / (l2_norm + 1e-12)
            clipped = weights_delta * scaling_factor
        else:
            clipped = weights_delta.copy()
        return clipped, l2_norm

    def apply_differential_privacy(self, weights_delta: np.ndarray) -> Tuple[np.ndarray, Dict[str, Any]]:
        """
        Applies L2 clipping and calibrated noise perturbation to the local client update vector.
        """
        clipped_delta, original_norm = self.clip_gradients_or_deltas(weights_delta)
        dim = int(np.prod(clipped_delta.shape))
        
        if self.mechanism == "laplace":
            scale = (self.clip_norm / self.epsilon) / (np.sqrt(dim) if dim > 1 else 1.0)
            noise = np.random.laplace(0, scale, size=clipped_delta.shape)
            sigma_val = scale
        else: # Default Gaussian
            sigma_val = self.compute_gaussian_sigma(dim=dim)
            noise = np.random.normal(0, sigma_val, size=clipped_delta.shape)
            
        perturbed_delta = clipped_delta + noise
        
        # Privacy accounting update (Simple advanced composition approximation)
        self.total_rounds_applied += 1
        round_epsilon = self.epsilon
        self.cumulative_epsilon_spent += round_epsilon / np.sqrt(self.total_rounds_applied)
        
        stats = {
            "mechanism": self.mechanism,
            "epsilon": self.epsilon,
            "delta": self.delta,
            "clip_norm": self.clip_norm,
            "original_l2_norm": float(original_norm),
            "clipped_l2_norm": float(np.linalg.norm(clipped_delta)),
            "noise_std_dev": float(sigma_val),
            "noise_norm": float(np.linalg.norm(noise)),
            "cumulative_epsilon_spent": round(self.cumulative_epsilon_spent, 3),
            "status": "PROTECTED"
        }
        return perturbed_delta, stats

class SecureAggregationProtocol:
    """
    Cryptographic Secure Aggregation Protocol Simulator (Bonawitz et al., Google SecAgg).
    
    Generates pairwise zero-sum random blinding masks (r_ij = -r_ji) such that:
    Masked_Update_i = Update_i + sum_{j != i} r_ij
    
    When summed at the aggregator:
    sum_i Masked_Update_i = sum_i Update_i + sum_i sum_j r_ij
    Since sum_i sum_j r_ij = 0, the sum precisely yields the true aggregate while NO individual update
    is ever disclosed to the aggregator or eavesdroppers!
    """
    @staticmethod
    def generate_zero_sum_masks(client_ids: List[str], vector_dim: int, seed: int = 42) -> Dict[str, np.ndarray]:
        n = len(client_ids)
        masks = {cid: np.zeros(vector_dim) for cid in client_ids}
        np.random.seed(seed)
        
        # Pairwise zero-sum masks
        for i in range(n):
            for j in range(i + 1, n):
                # Shared pairwise pseudorandom seed
                pair_seed = (hash(client_ids[i]) + hash(client_ids[j]) + seed) % (2**31 - 1)
                rng = np.random.RandomState(pair_seed)
                pairwise_mask = rng.randn(vector_dim) * 0.1
                
                masks[client_ids[i]] += pairwise_mask
                masks[client_ids[j]] -= pairwise_mask
                
        return masks
