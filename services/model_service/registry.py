from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from database.models.schema import ModelVersion, FederationSession
from services.model_service.storage import storage_backend

class ModelRegistryService:
    """
    Model Registry & Lineage Management Service.
    Tracks model checkpoints, metrics, lineage, and supports rolling back models.
    """
    def __init__(self, db: Session):
        self.db = db

    def register_new_version(
        self,
        session_id: int,
        round_number: int,
        accuracy: float,
        loss: float,
        participants_count: int,
        aggregation_strategy: str,
        privacy_epsilon: float,
        weights_data: Dict[str, Any],
        is_production: bool = True
    ) -> ModelVersion:
        
        latest = self.db.query(ModelVersion).order_by(ModelVersion.version_number.desc()).first()
        next_ver = (latest.version_number + 1) if latest else 1
        model_tag = f"model-clinical-v{next_ver}"
        
        artifact_uri = storage_backend.save_model(model_tag, weights_data)
        
        if is_production:
            self.db.query(ModelVersion).filter(ModelVersion.status == "PRODUCTION").update({"status": "ARCHIVED"})
            
        model_ver = ModelVersion(
            model_tag=model_tag,
            version_number=next_ver,
            session_id=session_id,
            round_number=round_number,
            accuracy=round(accuracy, 2),
            loss=round(loss, 4),
            participants_count=participants_count,
            aggregation_strategy=aggregation_strategy,
            privacy_epsilon=round(privacy_epsilon, 2),
            artifact_uri=artifact_uri,
            status="PRODUCTION" if is_production else "CANDIDATE"
        )
        self.db.add(model_ver)
        self.db.commit()
        self.db.refresh(model_ver)
        return model_ver

    def rollback_model(self, target_version_number: int) -> Optional[ModelVersion]:
        target = self.db.query(ModelVersion).filter(ModelVersion.version_number == target_version_number).first()
        if not target:
            return None
            
        self.db.query(ModelVersion).filter(ModelVersion.status == "PRODUCTION").update({"status": "ARCHIVED"})
        target.status = "PRODUCTION"
        self.db.commit()
        self.db.refresh(target)
        return target

    def list_models(self) -> List[ModelVersion]:
        return self.db.query(ModelVersion).order_by(ModelVersion.version_number.desc()).all()
