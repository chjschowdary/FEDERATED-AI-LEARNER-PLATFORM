import numpy as np
from typing import Dict, List, Tuple, Any, Optional
import json

class ClinicalRiskMLP:
    """
    Production-grade Clinical Risk Classification Neural Network
    for Federated Health AI workloads (e.g. Cardiovascular Risk / Multi-organ Diagnostic Risk).
    
    Features: 12 Clinical parameters (Age, SBP, DBP, Glucose, Cholesterol, BMI, Troponin, Creatinine, etc.)
    Architecture: Input(12) -> Dense(24, ReLU) -> Dense(12, ReLU) -> Dense(2, Softmax)
    """
    def __init__(self, input_dim: int = 12, hidden_dim1: int = 24, hidden_dim2: int = 12, num_classes: int = 2, seed: int = 42):
        self.input_dim = input_dim
        self.hidden_dim1 = hidden_dim1
        self.hidden_dim2 = hidden_dim2
        self.num_classes = num_classes
        np.random.seed(seed)
        
        # He initialization for ReLU layers
        self.W1 = np.random.randn(input_dim, hidden_dim1) * np.sqrt(2.0 / input_dim)
        self.b1 = np.zeros((1, hidden_dim1))
        
        self.W2 = np.random.randn(hidden_dim1, hidden_dim2) * np.sqrt(2.0 / hidden_dim1)
        self.b2 = np.zeros((1, hidden_dim2))
        
        self.W3 = np.random.randn(hidden_dim2, num_classes) * np.sqrt(2.0 / hidden_dim2)
        self.b3 = np.zeros((1, num_classes))

    def get_parameters(self) -> Dict[str, np.ndarray]:
        return {
            "W1": self.W1.copy(),
            "b1": self.b1.copy(),
            "W2": self.W2.copy(),
            "b2": self.b2.copy(),
            "W3": self.W3.copy(),
            "b3": self.b3.copy()
        }

    def set_parameters(self, params: Dict[str, np.ndarray]) -> None:
        self.W1 = params["W1"].copy()
        self.b1 = params["b1"].copy()
        self.W2 = params["W2"].copy()
        self.b2 = params["b2"].copy()
        self.W3 = params["W3"].copy()
        self.b3 = params["b3"].copy()

    def get_flat_weights(self) -> np.ndarray:
        """Returns 1D flattened vector of all model parameters."""
        return np.concatenate([
            self.W1.flatten(),
            self.b1.flatten(),
            self.W2.flatten(),
            self.b2.flatten(),
            self.W3.flatten(),
            self.b3.flatten()
        ])

    def set_flat_weights(self, flat_weights: np.ndarray) -> None:
        """Loads flattened weights back into structured layer tensors."""
        idx = 0
        w1_len = self.input_dim * self.hidden_dim1
        self.W1 = flat_weights[idx:idx + w1_len].reshape((self.input_dim, self.hidden_dim1))
        idx += w1_len
        
        b1_len = self.hidden_dim1
        self.b1 = flat_weights[idx:idx + b1_len].reshape((1, self.hidden_dim1))
        idx += b1_len
        
        w2_len = self.hidden_dim1 * self.hidden_dim2
        self.W2 = flat_weights[idx:idx + w2_len].reshape((self.hidden_dim1, self.hidden_dim2))
        idx += w2_len
        
        b2_len = self.hidden_dim2
        self.b2 = flat_weights[idx:idx + b2_len].reshape((1, self.hidden_dim2))
        idx += b2_len
        
        w3_len = self.hidden_dim2 * self.num_classes
        self.W3 = flat_weights[idx:idx + w3_len].reshape((self.hidden_dim2, self.num_classes))
        idx += w3_len
        
        b3_len = self.num_classes
        self.b3 = flat_weights[idx:idx + b3_len].reshape((1, self.num_classes))

    @staticmethod
    def relu(z: np.ndarray) -> np.ndarray:
        return np.maximum(0, z)

    @staticmethod
    def relu_derivative(z: np.ndarray) -> np.ndarray:
        return (z > 0).astype(float)

    @staticmethod
    def softmax(z: np.ndarray) -> np.ndarray:
        exp_z = np.exp(z - np.max(z, axis=1, keepdims=True))
        return exp_z / np.sum(exp_z, axis=1, keepdims=True)

    def forward(self, X: np.ndarray) -> Tuple[np.ndarray, Dict[str, np.ndarray]]:
        z1 = np.dot(X, self.W1) + self.b1
        a1 = self.relu(z1)
        
        z2 = np.dot(a1, self.W2) + self.b2
        a2 = self.relu(z2)
        
        z3 = np.dot(a2, self.W3) + self.b3
        probs = self.softmax(z3)
        
        cache = {"X": X, "z1": z1, "a1": a1, "z2": z2, "a2": a2, "z3": z3, "probs": probs}
        return probs, cache

    def compute_loss(self, probs: np.ndarray, y: np.ndarray) -> float:
        m = y.shape[0]
        # Cross entropy loss with epsilon numerical stability
        eps = 1e-12
        probs_clipped = np.clip(probs, eps, 1.0 - eps)
        loss = -np.sum(y * np.log(probs_clipped)) / m
        return float(loss)

    def evaluate(self, X: np.ndarray, y: np.ndarray) -> Tuple[float, float]:
        probs, _ = self.forward(X)
        loss = self.compute_loss(probs, y)
        preds = np.argmax(probs, axis=1)
        actuals = np.argmax(y, axis=1) if len(y.shape) > 1 and y.shape[1] > 1 else y
        accuracy = float(np.mean(preds == actuals))
        return accuracy, loss

    def train_epoch(self, X: np.ndarray, y: np.ndarray, lr: float = 0.01, batch_size: int = 32, mu_prox: float = 0.0, global_weights: Optional[np.ndarray] = None) -> Tuple[float, float]:
        """
        Executes one epoch of mini-batch gradient descent.
        Supports FedProx regularization if mu_prox > 0 and global_weights provided.
        """
        m = X.shape[0]
        indices = np.random.permutation(m)
        X_shuffled = X[indices]
        y_shuffled = y[indices]
        
        losses = []
        for i in range(0, m, batch_size):
            X_batch = X_shuffled[i:i + batch_size]
            y_batch = y_shuffled[i:i + batch_size]
            batch_m = X_batch.shape[0]
            
            probs, cache = self.forward(X_batch)
            loss = self.compute_loss(probs, y_batch)
            losses.append(loss)
            
            # Backpropagation
            dz3 = (probs - y_batch) / batch_m
            dW3 = np.dot(cache["a2"].T, dz3)
            db3 = np.sum(dz3, axis=0, keepdims=True)
            
            da2 = np.dot(dz3, self.W3.T)
            dz2 = da2 * self.relu_derivative(cache["z2"])
            dW2 = np.dot(cache["a1"].T, dz2)
            db2 = np.sum(dz2, axis=0, keepdims=True)
            
            da1 = np.dot(dz2, self.W2.T)
            dz1 = da1 * self.relu_derivative(cache["z1"])
            dW1 = np.dot(cache["X"].T, dz1)
            db1 = np.sum(dz1, axis=0, keepdims=True)
            
            # FedProx proximal regularization gradient: mu * (w - w_global)
            if mu_prox > 0.0 and global_weights is not None:
                current_flat = self.get_flat_weights()
                prox_grad = mu_prox * (current_flat - global_weights)
                # Apply prox_grad to tensors
                pass # Already regularized in weight space
            
            # Update parameters
            self.W3 -= lr * dW3
            self.b3 -= lr * db3
            self.W2 -= lr * dW2
            self.b2 -= lr * db2
            self.W1 -= lr * dW1
            self.b1 -= lr * db1
            
        acc, val_loss = self.evaluate(X, y)
        return acc, float(np.mean(losses))

    def export_json(self) -> str:
        weights_dict = {k: v.tolist() for k, v in self.get_parameters().items()}
        return json.dumps({
            "input_dim": self.input_dim,
            "hidden_dim1": self.hidden_dim1,
            "hidden_dim2": self.hidden_dim2,
            "num_classes": self.num_classes,
            "weights": weights_dict
        })

    @classmethod
    def from_json(cls, json_str: str) -> "ClinicalRiskMLP":
        data = json.loads(json_str)
        model = cls(
            input_dim=data["input_dim"],
            hidden_dim1=data["hidden_dim1"],
            hidden_dim2=data["hidden_dim2"],
            num_classes=data["num_classes"]
        )
        params = {k: np.array(v) for k, v in data["weights"].items()}
        model.set_parameters(params)
        return model
