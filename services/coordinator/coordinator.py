import asyncio
import datetime
import numpy as np
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from database.session import SessionLocal
from database.models.schema import (
    FederationSession, TrainingRound, ClientUpdate, ModelVersion,
    FederatedClient, SecurityEvent, AuditLog, InfrastructureMetric
)
from federated_learning.models.neural_net import ClinicalRiskMLP
from federated_learning.privacy.differential_privacy import DifferentialPrivacyEngine
from services.client_simulator.simulator import client_simulator
from services.aggregator.aggregator import aggregation_worker
from services.model_service.registry import ModelRegistryService
from services.coordinator.event_bus import event_bus

class FederationCoordinator:
    """
    Central Cloud Orchestrator for Federated AI Training Rounds.
    Controls round scheduling, client recruitment, update ingestion,
    security policy enforcement, and live WebSocket telemetry.
    """
    def __init__(self):
        self.is_running = False
        self.current_session_id = "FED-CLINICAL-RISK-2026"
        self._global_model = ClinicalRiskMLP()
        self.privacy_engine = DifferentialPrivacyEngine(epsilon=4.0, delta=1e-5, clip_norm=1.2)

    def get_global_weights(self) -> np.ndarray:
        return self._global_model.get_flat_weights()

    def set_global_weights(self, weights: np.ndarray) -> None:
        self._global_model.set_flat_weights(weights)

    async def execute_round(
        self,
        round_number: Optional[int] = None,
        selected_client_ids: Optional[List[str]] = None,
        epochs: int = 3,
        lr: float = 0.02,
        strategy: str = "FedAvg",
        epsilon: float = 4.0,
        delta: float = 1e-5,
        attack_client_id: Optional[str] = None,
        attack_type: str = "sign_flipping"
    ) -> Dict[str, Any]:
        
        db: Session = SessionLocal()
        start_time = datetime.datetime.utcnow()
        
        try:
            # 1. Fetch active session
            session = db.query(FederationSession).filter(FederationSession.session_id == self.current_session_id).first()
            if not session:
                session = FederationSession(
                    session_id=self.current_session_id,
                    session_name="Cardiovascular Multi-Center Diagnostic Federation",
                    status="ACTIVE",
                    current_round=0
                )
                db.add(session)
                db.commit()
                db.refresh(session)
                
            actual_round = (session.current_round + 1) if round_number is None else round_number
            session.current_round = actual_round
            session.aggregation_strategy = strategy
            session.privacy_epsilon = epsilon
            
            # 2. Update Privacy Engine configuration
            self.privacy_engine.epsilon = epsilon
            self.privacy_engine.delta = delta
            
            # 3. Create TrainingRound record in DB
            db_round = TrainingRound(
                session_id=session.id,
                round_number=actual_round,
                status="IN_PROGRESS",
                aggregation_strategy=strategy,
                start_time=start_time
            )
            db.add(db_round)
            db.commit()
            db.refresh(db_round)
            
            await event_bus.publish("TRAINING_STARTED", {
                "round_number": actual_round,
                "strategy": strategy,
                "privacy_epsilon": epsilon,
                "timestamp": start_time.isoformat()
            })
            
            # 4. Client Selection
            all_clients = db.query(FederatedClient).all()
            if not selected_client_ids:
                # Select all active, non-quarantined clients (or top N)
                client_pool = [c for c in all_clients if c.status != "QUARANTINED" or c.client_id == attack_client_id]
                selected_client_ids = [c.client_id for c in client_pool] if client_pool else [c.client_id for c in all_clients]
                
            current_weights = self.get_global_weights()
            client_updates = []
            
            # 5. Execute Local Training across Clients
            for cid in selected_client_ids:
                is_attacker = (cid == attack_client_id)
                update_payload = client_simulator.train_client_round(
                    client_id=cid,
                    global_flat_weights=current_weights,
                    epochs=epochs,
                    lr=lr,
                    privacy_engine=self.privacy_engine,
                    simulate_attack=is_attacker,
                    attack_type=attack_type
                )
                client_updates.append(update_payload)
                
                # Broadcast client training completion event
                await event_bus.publish("CLIENT_TRAINED", {
                    "round_number": actual_round,
                    "client_id": cid,
                    "sample_count": update_payload["sample_count"],
                    "accuracy": update_payload["local_final_acc"],
                    "is_attacker": is_attacker
                })
                
            # 6. Aggregation, Security Inspection, and Global Benchmark Validation
            agg_result = aggregation_worker.process_and_aggregate_round(
                client_updates=client_updates,
                strategy_name=strategy,
                round_number=actual_round
            )
            
            # 7. Update Coordinator global model weights
            self.set_global_weights(agg_result["global_weights"])
            
            # 8. Persist Client Updates & Security Events into Database
            for update in client_updates:
                db_client = db.query(FederatedClient).filter(FederatedClient.client_id == update["client_id"]).first()
                if db_client:
                    sec_eval = update.get("security_eval", {})
                    is_quarantined = sec_eval.get("is_threat", False)
                    threat_score = sec_eval.get("threat_score", 0.0)
                    
                    # Update client trust score in DB
                    trust_record = aggregation_worker.trust_engine.get_client_record(db_client.client_id)
                    db_client.trust_score = trust_record["trust_score"]
                    db_client.risk_score = trust_record["risk_score"]
                    db_client.status = "QUARANTINED" if is_quarantined else "ACTIVE"
                    db_client.total_rounds_completed += 1
                    if is_quarantined:
                        db_client.anomalies_detected += 1
                        
                        # Add SecurityEvent record
                        sec_event = SecurityEvent(
                            event_type="MODEL_POISONING_ATTACK",
                            client_id=db_client.client_id,
                            severity="CRITICAL",
                            description=f"Anomalous model gradient detected from {db_client.name}. Threat Score: {threat_score:.1f}. Reasons: {', '.join(sec_eval.get('threat_reasons', []))}",
                            threat_confidence=threat_score,
                            action_taken="QUARANTINED_AND_PENALIZED"
                        )
                        db.add(sec_event)
                        
                        await event_bus.publish("SECURITY_ALERT", {
                            "client_id": db_client.client_id,
                            "threat_score": threat_score,
                            "reasons": sec_eval.get("threat_reasons", []),
                            "action": "QUARANTINED"
                        })
                        
                    cu = ClientUpdate(
                        round_id=db_round.id,
                        client_id=db_client.id,
                        sample_count=update["sample_count"],
                        l2_norm=round(sec_eval.get("l2_norm", 1.0), 4),
                        cosine_similarity=round(sec_eval.get("cosine_similarity", 1.0), 4),
                        threat_score=threat_score,
                        is_quarantined=is_quarantined,
                        quarantine_reason=", ".join(sec_eval.get("threat_reasons", [])) if is_quarantined else None
                    )
                    db.add(cu)
                    
            # 9. Register New Model Version in Model Registry
            registry_svc = ModelRegistryService(db)
            model_ver = registry_svc.register_new_version(
                session_id=session.id,
                round_number=actual_round,
                accuracy=agg_result["global_accuracy"],
                loss=agg_result["global_loss"],
                participants_count=agg_result["verified_count"],
                aggregation_strategy=strategy,
                privacy_epsilon=epsilon,
                weights_data={
                    "weights_flat": agg_result["global_weights"].tolist(),
                    "model_json": agg_result["model_json"]
                },
                is_production=True
            )
            
            end_time = datetime.datetime.utcnow()
            duration = (end_time - start_time).total_seconds()
            
            # 10. Update DB Round Record
            db_round.status = "COMPLETED"
            db_round.participating_clients = len(client_updates)
            db_round.verified_updates = agg_result["verified_count"]
            db_round.quarantined_updates = agg_result["quarantined_count"]
            db_round.global_accuracy = agg_result["global_accuracy"]
            db_round.global_loss = agg_result["global_loss"]
            db_round.duration_seconds = duration
            db_round.end_time = end_time
            
            # 11. Audit Log Record
            audit = AuditLog(
                actor="coordinator",
                action="ROUND_COMPLETED",
                resource=f"TrainingRound:{actual_round}",
                result="SUCCESS",
                metadata_json={
                    "accuracy": agg_result["global_accuracy"],
                    "verified": agg_result["verified_count"],
                    "quarantined": agg_result["quarantined_count"],
                    "model_tag": model_ver.model_tag
                }
            )
            db.add(audit)
            db.commit()
            
            # 12. Broadcast Round Completion Event
            round_summary = {
                "round_number": actual_round,
                "status": "COMPLETED",
                "accuracy": agg_result["global_accuracy"],
                "loss": agg_result["global_loss"],
                "participants_count": len(client_updates),
                "verified_count": agg_result["verified_count"],
                "quarantined_count": agg_result["quarantined_count"],
                "quarantined_clients": agg_result["quarantined_clients"],
                "strategy": strategy,
                "model_version": model_ver.model_tag,
                "duration_seconds": round(duration, 2),
                "cumulative_epsilon": round(self.privacy_engine.cumulative_epsilon_spent, 3),
                "security_summary": agg_result["security_summary"]
            }
            
            await event_bus.publish("ROUND_COMPLETED", round_summary)
            return round_summary
            
        except Exception as e:
            db.rollback()
            print(f"[Coordinator] Round execution error: {e}")
            raise e
        finally:
            db.close()

coordinator = FederationCoordinator()
