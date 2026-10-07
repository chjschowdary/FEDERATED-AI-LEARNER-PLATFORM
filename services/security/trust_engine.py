from typing import Dict, Any, List, Optional
import datetime

class TrustScoreEngine:
    """
    Dynamic, Explainable Bayesian Trust & Risk Scoring Engine.
    
    Tracks behavioral history, update consistency, anomaly frequency,
    and participation consistency for all federated client nodes.
    
    Trust Score [0 - 100]:
    - >= 80: TRUSTED (Eligible for full participation in high-tier federation rounds)
    - 50 - 79: MONITORED (Participates under strict anomaly inspection)
    - < 50: HIGH RISK / QUARANTINED (Excluded from aggregation)
    """
    def __init__(self, base_trust: float = 85.0):
        self.client_trust_registry: Dict[str, Dict[str, Any]] = {}
        self.base_trust = base_trust

    def initialize_client(self, client_id: str, org_name: str, initial_score: Optional[float] = None) -> Dict[str, Any]:
        score = initial_score if initial_score is not None else self.base_trust
        self.client_trust_registry[client_id] = {
            "client_id": client_id,
            "organization_name": org_name,
            "trust_score": float(score),
            "risk_score": round(100.0 - score, 1),
            "status": self.get_status(score),
            "rounds_participated": 0,
            "rounds_passed": 0,
            "anomalies_detected": 0,
            "consecutive_honest_rounds": 0,
            "last_evaluated": datetime.datetime.utcnow().isoformat(),
            "history": []
        }
        return self.client_trust_registry[client_id]

    @staticmethod
    def get_status(score: float) -> str:
        if score >= 80.0:
            return "TRUSTED"
        elif score >= 50.0:
            return "MONITORED"
        else:
            return "HIGH_RISK"

    def get_client_record(self, client_id: str, org_name: str = "Unknown") -> Dict[str, Any]:
        if client_id not in self.client_trust_registry:
            return self.initialize_client(client_id, org_name)
        return self.client_trust_registry[client_id]

    def update_trust(self, client_id: str, org_name: str, security_eval: Dict[str, Any], round_number: int) -> Dict[str, Any]:
        record = self.get_client_record(client_id, org_name)
        old_score = record["trust_score"]
        is_threat = security_eval.get("is_threat", False)
        threat_score = security_eval.get("threat_score", 0.0)
        
        record["rounds_participated"] += 1
        
        if is_threat:
            # Harsh penalty for malicious behavior proportional to threat confidence
            penalty = 35.0 + (threat_score * 0.25)
            new_score = max(5.0, old_score - penalty)
            record["anomalies_detected"] += 1
            record["consecutive_honest_rounds"] = 0
            reason = f"Security Violation: Anomaly detected (Threat Score: {threat_score:.1f})"
        else:
            # Incremental positive reinforcement
            record["rounds_passed"] += 1
            record["consecutive_honest_rounds"] += 1
            reward = min(4.0, 1.5 + (record["consecutive_honest_rounds"] * 0.5))
            new_score = min(100.0, old_score + reward)
            reason = "Verified honest update conforming to consensus"
            
        record["trust_score"] = round(new_score, 1)
        record["risk_score"] = round(100.0 - new_score, 1)
        record["status"] = self.get_status(new_score)
        record["last_evaluated"] = datetime.datetime.utcnow().isoformat()
        
        history_entry = {
            "round": round_number,
            "previous_trust": round(old_score, 1),
            "new_trust": round(new_score, 1),
            "delta": round(new_score - old_score, 1),
            "threat_score": threat_score,
            "status": record["status"],
            "reason": reason,
            "timestamp": datetime.datetime.utcnow().isoformat()
        }
        
        record["history"].append(history_entry)
        # Keep last 25 historical entries
        if len(record["history"]) > 25:
            record["history"] = record["history"][-25:]
            
        return record

    def get_all_scores(self) -> List[Dict[str, Any]]:
        return list(self.client_trust_registry.values())
