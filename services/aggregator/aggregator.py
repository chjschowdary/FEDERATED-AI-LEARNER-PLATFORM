import numpy as np
from typing import List, Dict, Any, Tuple
from federated_learning.models.neural_net import ClinicalRiskMLP
from federated_learning.datasets.clinical_dataset import FederationDataRepository
from federated_learning.aggregation.strategies import get_aggregation_strategy
from services.security.anomaly_detector import ThreatAnomalyDetector
from services.security.trust_engine import TrustScoreEngine

class AggregationWorker:
    """
    Secure Aggregation & Verification Worker.
    Orchestrates anomaly threat filtering, Byzantine-robust aggregation,
    and global performance validation.
    """
    def __init__(self):
        self.anomaly_detector = ThreatAnomalyDetector()
        self.trust_engine = TrustScoreEngine()
        self.data_repo = FederationDataRepository()

    def process_and_aggregate_round(
        self,
        client_updates: List[Dict[str, Any]],
        strategy_name: str = "FedAvg",
        round_number: int = 1,
        **strategy_kwargs
    ) -> Dict[str, Any]:
        
        if not client_updates:
            raise ValueError("No client updates provided for aggregation.")

        # 1. Threat Detection & Anomaly Inspection
        valid_updates, quarantined_updates, security_summary = self.anomaly_detector.detect_anomalies(client_updates)
        
        # 2. Dynamic Trust Score Updates
        for update in client_updates:
            cid = update["client_id"]
            org = update.get("organization_name", cid)
            eval_record = update.get("security_eval", {})
            self.trust_engine.update_trust(cid, org, eval_record, round_number)

        # 3. Byzantine-Robust Aggregation over VERIFIED updates
        if not valid_updates:
            # Emergency fallback: if all quarantined (e.g. extreme attack), retain prior consensus or use robust median
            strategy = get_aggregation_strategy("median")
            new_global_weights, agg_meta = strategy.aggregate(client_updates)
            agg_meta["status"] = "ALL_UPDATES_FLAGGED_MEDIAN_APPLIED"
        else:
            strategy = get_aggregation_strategy(strategy_name, **strategy_kwargs)
            new_global_weights, agg_meta = strategy.aggregate(valid_updates)
            agg_meta["status"] = "SUCCESS"

        # 4. Global Model Evaluation on Holdout Clinical Benchmark
        eval_model = ClinicalRiskMLP()
        eval_model.set_flat_weights(new_global_weights)
        
        X_val, y_val = self.data_repo.get_global_validation_dataset()
        global_acc, global_loss = eval_model.evaluate(X_val, y_val)

        return {
            "round_number": round_number,
            "global_accuracy": round(global_acc * 100, 2),
            "global_loss": round(global_loss, 4),
            "total_submitted": len(client_updates),
            "verified_count": len(valid_updates),
            "quarantined_count": len(quarantined_updates),
            "aggregation_strategy": strategy_name,
            "aggregation_metadata": agg_meta,
            "security_summary": security_summary,
            "global_weights": new_global_weights,
            "model_json": eval_model.export_json(),
            "quarantined_clients": [q["client_id"] for q in quarantined_updates]
        }

aggregation_worker = AggregationWorker()
