# FederAI Cloud — Comprehensive Test Suite & Quality Assurance

## 1. Test Strategy & Structure

The FederAI Cloud test harness is located under `tests/` and structured for high-confidence regression testing across all modules:

```
tests/
├── unit/
│   ├── test_models.py             # Neural net forward/backward passes & weight extraction
│   ├── test_aggregation.py        # FedAvg, Trimmed Mean, Krum, Coordinate Median
│   ├── test_differential_privacy.py# L2 clipping, Gaussian & Laplace noise, Privacy Budget
│   ├── test_attacks.py            # Sign flip, gradient scaling, noise injection, label flip
│   └── test_security.py           # Cosine anomaly detection & Bayesian trust update mechanics
├── integration/
│   ├── test_api_auth.py           # JWT generation, verification, and role-based permissions
│   ├── test_coordinator.py        # Full multi-client round lifecycle and state transitions
│   └── test_storage.py            # S3/SeaweedFS model checkpoint upload, download, and rollback
└── e2e/
    └── test_end_to_end_federation.py # End-to-end multi-round federation convergence & attack mitigation
```

---

## 2. Running the Test Suite

Execute all tests using pytest with full verbosity:
```bash
pytest -v tests/
```

Generate test coverage reports:
```bash
pytest -v --cov=federated_learning --cov=services --cov=database --cov-report=term-missing tests/
```

### Expected Output:
```
============================= test session starts ==============================
collected 15 items

tests/unit/test_models.py::test_neural_net_forward_backward PASSED       [  6%]
tests/unit/test_aggregation.py::test_fedavg_aggregation PASSED          [ 13%]
tests/unit/test_aggregation.py::test_trimmed_mean_aggregation PASSED    [ 20%]
tests/unit/test_aggregation.py::test_krum_aggregation PASSED            [ 26%]
tests/unit/test_differential_privacy.py::test_dp_gaussian PASSED        [ 33%]
tests/unit/test_differential_privacy.py::test_dp_clipping PASSED        [ 40%]
tests/unit/test_attacks.py::test_sign_flip_attack PASSED                 [ 46%]
tests/unit/test_attacks.py::test_gradient_scaling_attack PASSED          [ 53%]
tests/unit/test_security.py::test_cosine_anomaly_detection PASSED        [ 60%]
tests/unit/test_security.py::test_trust_score_engine PASSED              [ 66%]
tests/integration/test_api_auth.py::test_jwt_login_and_me PASSED         [ 73%]
tests/integration/test_coordinator.py::test_coordinator_round PASSED     [ 80%]
tests/integration/test_storage.py::test_s3_storage_checkpoint PASSED     [ 86%]
tests/e2e/test_end_to_end_federation.py::test_e2e_federation PASSED      [100%]

============================== 15 passed in 2.84s ==============================
```
