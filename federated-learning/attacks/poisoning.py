import numpy as np
from typing import Dict, Any, Tuple

class ModelPoisoningAttack:
    """
    Adversarial Attack Simulation Engine for Federated Learning Security Evaluation.
    """
    @staticmethod
    def sign_flipping(weights_delta: np.ndarray, scale: float = 2.5) -> Tuple[np.ndarray, Dict[str, Any]]:
        """Inverts gradient direction and scales magnitude to disrupt convergence."""
        poisoned = -1.0 * scale * weights_delta
        metadata = {
            "attack_type": "Sign-Flipping Gradient Inversion",
            "scale_factor": scale,
            "original_norm": float(np.linalg.norm(weights_delta)),
            "poisoned_norm": float(np.linalg.norm(poisoned))
        }
        return poisoned, metadata

    @staticmethod
    def gradient_scaling(weights_delta: np.ndarray, multiplier: float = 15.0) -> Tuple[np.ndarray, Dict[str, Any]]:
        """Scales update magnitude to dominate the weighted global centroid."""
        poisoned = weights_delta * multiplier
        metadata = {
            "attack_type": "Gradient Scaling & Centroid Hijack",
            "multiplier": multiplier,
            "original_norm": float(np.linalg.norm(weights_delta)),
            "poisoned_norm": float(np.linalg.norm(poisoned))
        }
        return poisoned, metadata

    @staticmethod
    def random_gaussian_noise(weights_shape: Tuple[int, ...], mean: float = 0.0, std: float = 3.0) -> Tuple[np.ndarray, Dict[str, Any]]:
        """Injects high-variance destructive noise to degrade model accuracy."""
        poisoned = np.random.normal(mean, std, size=weights_shape)
        metadata = {
            "attack_type": "Random High-Variance Noise Poisoning",
            "noise_std": std,
            "poisoned_norm": float(np.linalg.norm(poisoned))
        }
        return poisoned, metadata

    @staticmethod
    def label_flipping_data(y: np.ndarray) -> np.ndarray:
        """Inverts ground-truth diagnostic classification labels."""
        y_flipped = y.copy()
        if len(y.shape) > 1 and y.shape[1] == 2:
            # Swap columns 0 and 1
            y_flipped[:, [0, 1]] = y_flipped[:, [1, 0]]
        else:
            y_flipped = 1 - y_flipped
        return y_flipped
