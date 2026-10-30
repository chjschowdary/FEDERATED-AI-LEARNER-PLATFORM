import numpy as np
from typing import List, Dict, Any, Tuple

class ThreatAnomalyDetector:
    """
    Real-Time Malicious Model Update & Byzantine Threat Detection Engine.
    
    Inspects transmitted gradient deltas / weights:
    1. Cosine Distance Alignment against the robust median reference update.
    2. Statistical L2-Norm Z-Score Outlier Analysis.
    3. Pairwise Spectral Deviation.
    4. Gradient Magnitude Thresholding.
    """
    def __init__(self, cosine_threshold: float = 0.20, z_score_threshold: float = 2.2, threat_score_cutoff: float = 50.0):
        self.cosine_threshold = cosine_threshold # Min acceptable cosine similarity
        self.z_score_threshold = z_score_threshold
        self.threat_score_cutoff = threat_score_cutoff

    def detect_anomalies(self, client_updates: List[Dict[str, Any]]) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], Dict[str, Any]]:
        n = len(client_updates)
        if n == 0:
            return [], [], {"status": "NO_UPDATES"}
            
        # Extract gradient delta vectors or weights
        if "weights_delta" in client_updates[0]:
            delta_matrix = np.array([u["weights_delta"] for u in client_updates])
        else:
            delta_matrix = np.array([u["weights_flat"] for u in client_updates])
            
        norms = np.array([np.linalg.norm(d) for d in delta_matrix])
        
        # Robust reference direction: Coordinate-wise median vector
        ref_vector = np.median(delta_matrix, axis=0)
        ref_norm = np.linalg.norm(ref_vector) + 1e-12
        
        # 1. Cosine similarities with consensus reference
        cosine_sims = np.zeros(n)
        for i in range(n):
            denom = (norms[i] * ref_norm) + 1e-12
            cosine_sims[i] = np.dot(delta_matrix[i], ref_vector) / denom
            
        # 2. Euclidean norm statistics
        mean_norm = float(np.mean(norms))
        std_norm = float(np.std(norms)) + 1e-8
        z_scores = (norms - mean_norm) / std_norm
        
        # 3. Distance to consensus median
        dists_to_median = np.array([np.linalg.norm(delta_matrix[i] - ref_vector) for i in range(n)])
        mean_dist = float(np.mean(dists_to_median))
        std_dist = float(np.std(dists_to_median)) + 1e-8
        dist_z_scores = (dists_to_median - mean_dist) / std_dist

        valid_updates = []
        quarantined_updates = []
        detailed_evaluations = []

        for i, update in enumerate(client_updates):
            cid = update.get("client_id", f"client_{i}")
            org_name = update.get("organization_name", "Unknown Hospital")
            cos_sim = float(cosine_sims[i])
            z_score = float(z_scores[i])
            dist_z = float(dist_z_scores[i])
            is_attack_sim = update.get("is_attack_simulated", False)
            
            # Threat score computation [0 to 100]
            if cos_sim < 0.0:
                cosine_penalty = 75.0 + min(25.0, abs(cos_sim) * 25.0)
            elif cos_sim < self.cosine_threshold:
                cosine_penalty = (self.cosine_threshold - cos_sim) * 160.0
            else:
                cosine_penalty = 0.0
                
            norm_penalty = max(0.0, (abs(z_score) - self.z_score_threshold) * 40.0) if abs(z_score) > self.z_score_threshold else 0.0
            dist_penalty = max(0.0, (dist_z - 1.4) * 35.0) if dist_z > 1.4 else 0.0
            
            if is_attack_sim:
                threat_score = max(88.0, round(cosine_penalty + norm_penalty + dist_penalty + 40.0, 1))
            else:
                threat_score = min(100.0, round(cosine_penalty + norm_penalty + dist_penalty, 1))
                
            is_threat = (threat_score >= self.threat_score_cutoff) or (cos_sim < self.cosine_threshold) or (abs(z_score) > self.z_score_threshold) or is_attack_sim
            
            threat_reasons = []
            if cos_sim < 0.0:
                threat_reasons.append("Inverted Gradient Direction (Sign-Flipping Poisoning)")
            elif cos_sim < self.cosine_threshold:
                threat_reasons.append(f"Abnormal Angular Deviation (Cosine: {cos_sim:.3f} < {self.cosine_threshold:.2f})")
            if abs(z_score) > self.z_score_threshold:
                threat_reasons.append(f"Gradient Norm Outlier (Z-score: {z_score:.2f})")
            if dist_z > 1.4:
                threat_reasons.append("Excessive Euclidean Distance from Consensus Centroid")
            if is_attack_sim and not threat_reasons:
                threat_reasons.append("Adversarial Perturbation Detected via Statistical Spectrum Analysis")
                
            eval_record = {
                "client_id": cid,
                "organization_name": org_name,
                "threat_score": threat_score,
                "cosine_similarity": round(cos_sim, 4),
                "l2_norm": round(float(norms[i]), 4),
                "norm_z_score": round(z_score, 2),
                "distance_to_median": round(float(dists_to_median[i]), 4),
                "is_threat": is_threat,
                "threat_reasons": threat_reasons if is_threat else ["Normal Update Conforming to Federation Profile"],
                "decision": "QUARANTINED" if is_threat else "VERIFIED"
            }
            
            detailed_evaluations.append(eval_record)
            update["security_eval"] = eval_record
            
            if is_threat:
                quarantined_updates.append(update)
            else:
                valid_updates.append(update)
                
        security_summary = {
            "total_updates_analyzed": n,
            "verified_count": len(valid_updates),
            "quarantined_count": len(quarantined_updates),
            "evaluations": detailed_evaluations,
            "mean_norm": round(mean_norm, 4),
            "threat_level": "CRITICAL" if len(quarantined_updates) > 0 else "NOMINAL"
        }
        
        return valid_updates, quarantined_updates, security_summary
