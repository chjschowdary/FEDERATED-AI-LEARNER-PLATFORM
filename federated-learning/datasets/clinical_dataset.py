import numpy as np
from typing import Dict, Tuple, Any

def generate_clinical_features(n_samples: int, mean_shift: np.ndarray, cov_scale: float, class_bias: float, seed: int) -> Tuple[np.ndarray, np.ndarray]:
    """
    Generates realistic 12-dimensional non-IID clinical diagnostic feature matrices.
    Features:
    0: Age (standardized)
    1: Systolic Blood Pressure (SBP)
    2: Diastolic Blood Pressure (DBP)
    3: Fasting Blood Glucose
    4: Total Cholesterol
    5: HDL / LDL Ratio
    6: Body Mass Index (BMI)
    7: High-Sensitivity Troponin I
    8: Serum Creatinine
    9: C-Reactive Protein (Inflammation marker)
    10: Resting Heart Rate
    11: Oxygen Saturation (SpO2)
    """
    np.random.seed(seed)
    
    # Base ground-truth risk weights
    true_weights = np.array([0.45, 0.60, 0.35, 0.55, 0.40, -0.50, 0.38, 0.85, 0.42, 0.48, 0.25, -0.65])
    
    # Generate features with organization-specific distribution shift
    base_features = np.random.randn(n_samples, 12) * cov_scale + mean_shift
    
    # Latent clinical risk score with non-linear interaction
    logits = np.dot(base_features, true_weights) + class_bias + 0.15 * (base_features[:, 0] * base_features[:, 7])
    probs = 1.0 / (1.0 + np.exp(-logits))
    
    # Sample binary labels (0 = Low/Moderate Risk, 1 = High Critical Clinical Risk)
    labels_1d = (np.random.rand(n_samples) < probs).astype(int)
    
    # Convert to one-hot encoding for Cross-Entropy
    labels_onehot = np.zeros((n_samples, 2))
    labels_onehot[np.arange(n_samples), labels_1d] = 1.0
    
    return base_features, labels_onehot

class FederationDataRepository:
    """
    Simulates decentralized data repositories for participating healthcare institutions.
    Data NEVER leaves the local client boundary!
    """
    CLIENT_CONFIGS = {
        "client-alpha": {
            "name": "Hospital Alpha (Cardiac Center)",
            "n_samples": 1200,
            "mean_shift": np.array([0.5, 0.7, 0.4, 0.1, 0.3, -0.2, 0.4, 0.9, 0.2, 0.4, 0.3, -0.2]),
            "cov_scale": 1.1,
            "class_bias": 0.4,
            "seed": 101,
            "specialty": "Cardiology & Vascular Surgery"
        },
        "client-beta": {
            "name": "Hospital Beta (Regional General)",
            "n_samples": 850,
            "mean_shift": np.array([0.8, 0.3, 0.2, 0.2, 0.1, -0.1, 0.2, 0.2, 0.5, 0.2, 0.1, -0.1]),
            "cov_scale": 0.9,
            "class_bias": 0.1,
            "seed": 102,
            "specialty": "Geriatric & Internal Medicine"
        },
        "client-gamma": {
            "name": "Hospital Gamma (University Clinic)",
            "n_samples": 1500,
            "mean_shift": np.array([0.1, 0.4, 0.3, 0.9, 0.6, -0.4, 0.6, 0.3, 0.1, 0.5, 0.2, 0.0]),
            "cov_scale": 1.2,
            "class_bias": 0.3,
            "seed": 103,
            "specialty": "Metabolic & Endocrinology"
        },
        "client-delta": {
            "name": "Hospital Delta (Apex Research / Target)",
            "n_samples": 600,
            "mean_shift": np.array([-0.2, 0.2, 0.1, 0.3, 0.2, 0.0, 0.1, 0.4, 0.3, 0.3, -0.1, -0.3]),
            "cov_scale": 1.0,
            "class_bias": -0.2,
            "seed": 104,
            "specialty": "Emergency & Trauma"
        },
        "client-epsilon": {
            "name": "Hospital Epsilon (Metropolitan Health)",
            "n_samples": 950,
            "mean_shift": np.array([0.3, 0.5, 0.5, 0.4, 0.5, -0.3, 0.3, 0.5, 0.2, 0.3, 0.2, -0.1]),
            "cov_scale": 1.05,
            "class_bias": 0.2,
            "seed": 105,
            "specialty": "Multispecialty Healthcare"
        }
    }

    def __init__(self):
        self._cache: Dict[str, Tuple[np.ndarray, np.ndarray]] = {}
        self._val_data: Optional[Tuple[np.ndarray, np.ndarray]] = None

    def get_client_dataset(self, client_id: str) -> Tuple[np.ndarray, np.ndarray]:
        if client_id not in self._cache:
            cfg = self.CLIENT_CONFIGS.get(client_id, self.CLIENT_CONFIGS["client-alpha"])
            X, y = generate_clinical_features(
                n_samples=cfg["n_samples"],
                mean_shift=cfg["mean_shift"],
                cov_scale=cfg["cov_scale"],
                class_bias=cfg["class_bias"],
                seed=cfg["seed"]
            )
            self._cache[client_id] = (X, y)
        return self._cache[client_id]

    def get_global_validation_dataset(self) -> Tuple[np.ndarray, np.ndarray]:
        """
        Global holdout validation benchmark dataset for evaluating aggregated global models.
        """
        if self._val_data is None:
            # Aggregate cross-demographic distribution
            X, y = generate_clinical_features(
                n_samples=1500,
                mean_shift=np.zeros(12),
                cov_scale=1.0,
                class_bias=0.1,
                seed=999
            )
            self._val_data = (X, y)
        return self._val_data
