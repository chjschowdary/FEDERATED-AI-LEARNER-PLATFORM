import numpy as np
from typing import List, Dict, Any, Tuple, Optional

class AggregationStrategy:
    """Base class for Federated Aggregation Strategies."""
    def aggregate(self, client_updates: List[Dict[str, Any]]) -> Tuple[np.ndarray, Dict[str, Any]]:
        raise NotImplementedError

class FedAvg(AggregationStrategy):
    """
    Standard Federated Averaging (McMahan et al., 2017).
    w_global = sum_{k=1}^K (n_k / N) * w_k
    """
    def aggregate(self, client_updates: List[Dict[str, Any]]) -> Tuple[np.ndarray, Dict[str, Any]]:
        if not client_updates:
            raise ValueError("Cannot aggregate empty client updates list.")
        
        total_samples = sum(u["sample_count"] for u in client_updates)
        flat_weights_list = [np.array(u["weights_flat"]) for u in client_updates]
        sample_weights = [u["sample_count"] / total_samples for u in client_updates]
        
        aggregated_weights = np.zeros_like(flat_weights_list[0])
        for weights, weight_ratio in zip(flat_weights_list, sample_weights):
            aggregated_weights += weight_ratio * weights
            
        metadata = {
            "strategy": "FedAvg",
            "total_participants": len(client_updates),
            "total_samples": total_samples,
            "weights_variance": float(np.var([np.linalg.norm(w) for w in flat_weights_list]))
        }
        return aggregated_weights, metadata

class TrimmedMean(AggregationStrategy):
    """
    Coordinate-wise Trimmed Mean Byzantine-robust Aggregation (Yin et al., 2018).
    For each parameter coordinate, sorts updates and trims the largest and smallest beta fraction.
    """
    def __init__(self, beta: float = 0.15):
        self.beta = beta

    def aggregate(self, client_updates: List[Dict[str, Any]]) -> Tuple[np.ndarray, Dict[str, Any]]:
        if not client_updates:
            raise ValueError("Cannot aggregate empty client updates.")
            
        flat_matrix = np.array([u["weights_flat"] for u in client_updates]) # Shape: (K, D)
        k, d = flat_matrix.shape
        
        trim_count = int(np.floor(self.beta * k))
        
        if trim_count == 0 or 2 * trim_count >= k:
            # Fallback to mean if too few clients to trim
            aggregated = np.mean(flat_matrix, axis=0)
        else:
            sorted_matrix = np.sort(flat_matrix, axis=0)
            trimmed = sorted_matrix[trim_count:k - trim_count, :]
            aggregated = np.mean(trimmed, axis=0)
            
        metadata = {
            "strategy": "TrimmedMean",
            "beta": self.beta,
            "trimmed_per_side": trim_count,
            "effective_clients_used": k - 2 * trim_count,
            "total_participants": k
        }
        return aggregated, metadata

class Krum(AggregationStrategy):
    """
    Krum Byzantine-resilient Aggregation (Blanchard et al., 2017).
    Selects the candidate update vector that minimizes the sum of squared distances
    to its (n - f - 2) closest neighbors, where f is the expected number of Byzantine attackers.
    """
    def __init__(self, expected_byzantine: int = 1):
        self.expected_byzantine = expected_byzantine

    def aggregate(self, client_updates: List[Dict[str, Any]]) -> Tuple[np.ndarray, Dict[str, Any]]:
        n = len(client_updates)
        if n < 3:
            # Fallback for very small groups
            return FedAvg().aggregate(client_updates)
            
        f = min(self.expected_byzantine, (n - 3) // 2) if n > 3 else 0
        neighbors_count = max(1, n - f - 2)
        
        flat_matrix = np.array([u["weights_flat"] for u in client_updates])
        
        # Compute pairwise squared Euclidean distances
        distances = np.zeros((n, n))
        for i in range(n):
            for j in range(i + 1, n):
                d2 = np.sum((flat_matrix[i] - flat_matrix[j]) ** 2)
                distances[i, j] = d2
                distances[j, i] = d2
                
        scores = np.zeros(n)
        for i in range(n):
            # Sort distances from candidate i to all other candidates
            sorted_dists = np.sort(distances[i])
            # Exclude self-distance (which is 0 at index 0)
            scores[i] = np.sum(sorted_dists[1:neighbors_count + 1])
            
        best_idx = int(np.argmin(scores))
        selected_weights = flat_matrix[best_idx].copy()
        
        metadata = {
            "strategy": "Krum",
            "selected_client_id": client_updates[best_idx].get("client_id", f"client_{best_idx}"),
            "krum_score": float(scores[best_idx]),
            "byzantine_tolerance_f": f,
            "neighbors_evaluated": neighbors_count
        }
        return selected_weights, metadata

class CoordinateWiseMedian(AggregationStrategy):
    """
    Coordinate-wise Median defense against arbitrary Byzantine noise attacks.
    """
    def aggregate(self, client_updates: List[Dict[str, Any]]) -> Tuple[np.ndarray, Dict[str, Any]]:
        flat_matrix = np.array([u["weights_flat"] for u in client_updates])
        aggregated = np.median(flat_matrix, axis=0)
        metadata = {
            "strategy": "CoordinateWiseMedian",
            "total_participants": len(client_updates)
        }
        return aggregated, metadata

def get_aggregation_strategy(name: str, **kwargs) -> AggregationStrategy:
    name_lower = name.lower().replace("-", "").replace("_", "")
    if "krum" in name_lower:
        return Krum(expected_byzantine=kwargs.get("expected_byzantine", 1))
    elif "trimmed" in name_lower:
        return TrimmedMean(beta=kwargs.get("beta", 0.15))
    elif "median" in name_lower:
        return CoordinateWiseMedian()
    else:
        return FedAvg()
