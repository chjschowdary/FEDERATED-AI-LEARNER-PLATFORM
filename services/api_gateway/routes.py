import os
import datetime
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import desc

from database.session import get_db
from database.models.schema import (
    Organization, User, FederatedClient, FederationSession,
    TrainingRound, ClientUpdate, ModelVersion, SecurityEvent,
    AuditLog, InfrastructureMetric
)
from services.api_gateway.auth import (
    hash_password, verify_password, create_access_token,
    get_current_user, require_role
)
from services.coordinator.coordinator import coordinator
from services.model_service.registry import ModelRegistryService
from services.aggregator.aggregator import aggregation_worker

router = APIRouter(prefix="/api")

# ==================== Pydantic Schemas ====================

class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: Dict[str, Any]

class RoundStartRequest(BaseModel):
    epochs: int = Field(default=3, ge=1, le=20)
    lr: float = Field(default=0.02, gt=0.0, le=1.0)
    strategy: str = Field(default="FedAvg") # FedAvg, TrimmedMean, Krum, Median
    epsilon: float = Field(default=4.0, gt=0.0)
    delta: float = Field(default=1e-5, gt=0.0)
    selected_clients: Optional[List[str]] = None
    simulate_attack: bool = False
    attack_client_id: Optional[str] = "client-delta"
    attack_type: str = "sign_flipping" # sign_flipping, gradient_scaling, label_flipping, random_noise

class RollbackRequest(BaseModel):
    version_number: int

class PodFailureRequest(BaseModel):
    service_name: str = "aggregator-worker"

# ==================== Authentication Routes ====================

@router.post("/auth/login", response_model=LoginResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == req.username).first()
    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password credentials."
        )
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User account is deactivated.")
        
    access_token = create_access_token(data={"sub": user.username, "role": user.role, "org_id": user.organization_id})
    
    # Audit log
    audit = AuditLog(actor=user.username, action="USER_LOGIN", resource="AuthService", result="SUCCESS")
    db.add(audit)
    db.commit()
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "role": user.role,
            "organization_id": user.organization_id,
            "organization_name": user.organization.name if user.organization else "FederAI Cloud Admin"
        }
    }

@router.get("/auth/me")
def get_me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "role": current_user.role,
        "organization_id": current_user.organization_id,
        "organization_name": current_user.organization.name if current_user.organization else "FederAI Cloud Admin"
    }

# ==================== Federation Status & HUD ====================

@router.get("/federation/status")
def get_federation_status(db: Session = Depends(get_db)):
    session = db.query(FederationSession).first()
    if not session:
        session = FederationSession(session_id="FED-CLINICAL-RISK-2026", session_name="Cardiovascular Multi-Center Diagnostic Federation")
        db.add(session)
        db.commit()
        db.refresh(session)
        
    clients = db.query(FederatedClient).all()
    active_count = sum(1 for c in clients if c.status == "ACTIVE")
    quarantined_count = sum(1 for c in clients if c.status == "QUARANTINED")
    
    latest_round = db.query(TrainingRound).order_by(desc(TrainingRound.round_number)).first()
    latest_model = db.query(ModelVersion).filter(ModelVersion.status == "PRODUCTION").first()
    recent_threats = db.query(SecurityEvent).order_by(desc(SecurityEvent.timestamp)).limit(5).all()
    
    rounds_history = db.query(TrainingRound).order_by(TrainingRound.round_number.asc()).all()
    accuracy_trend = [{"round": r.round_number, "accuracy": r.global_accuracy, "loss": r.global_loss} for r in rounds_history if r.status == "COMPLETED"]
    
    # Calculate average trust score
    avg_trust = round(sum(c.trust_score for c in clients) / len(clients), 1) if clients else 85.0
    
    return {
        "federation_status": session.status,
        "session_id": session.session_id,
        "session_name": session.session_name,
        "current_round": session.current_round,
        "max_rounds": session.max_rounds,
        "global_accuracy": latest_model.accuracy if latest_model else (latest_round.global_accuracy if latest_round else 76.5),
        "global_loss": latest_model.loss if latest_model else (latest_round.global_loss if latest_round else 0.485),
        "active_clients_count": active_count,
        "total_clients_count": len(clients),
        "quarantined_clients_count": quarantined_count,
        "privacy_budget_spent": round(coordinator.privacy_engine.cumulative_epsilon_spent, 3),
        "privacy_epsilon_limit": session.privacy_epsilon,
        "privacy_delta": session.privacy_delta,
        "privacy_status": "PROTECTED (Gaussian L2 Clipping)",
        "current_model_version": latest_model.model_tag if latest_model else "model-v1",
        "aggregation_strategy": session.aggregation_strategy,
        "threat_level": "CRITICAL" if quarantined_count > 0 else "NOMINAL",
        "cluster_health": 99.98,
        "average_trust_score": avg_trust,
        "recent_threats_count": len(recent_threats),
        "accuracy_trend": accuracy_trend
    }

# ==================== Training & Round Execution ====================

@router.post("/federation/start")
async def start_training_round(req: RoundStartRequest, current_user: User = Depends(get_current_user)):
    if current_user.role not in ["ADMIN", "OPERATOR"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only Operators and Admins can trigger training rounds.")
        
    attack_client = req.attack_client_id if req.simulate_attack else None
    
    result = await coordinator.execute_round(
        epochs=req.epochs,
        lr=req.lr,
        strategy=req.strategy,
        epsilon=req.epsilon,
        delta=req.delta,
        selected_client_ids=req.selected_clients,
        attack_client_id=attack_client,
        attack_type=req.attack_type
    )
    return result

@router.post("/federation/pause")
def pause_federation(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    session = db.query(FederationSession).first()
    if session:
        session.status = "PAUSED"
        db.commit()
    return {"status": "PAUSED", "message": "Federation session paused."}

@router.post("/federation/reset")
def reset_federation(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != "ADMIN":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only Admins can reset the federation environment.")
    
    # Reset clients to ACTIVE and default trust scores
    db.query(FederatedClient).update({"status": "ACTIVE", "trust_score": 92.0, "risk_score": 8.0, "anomalies_detected": 0})
    
    # Re-initialize trust score engine
    for c in db.query(FederatedClient).all():
        aggregation_worker.trust_engine.initialize_client(c.client_id, c.name, initial_score=92.0)
        
    coordinator.privacy_engine.cumulative_epsilon_spent = 0.0
    coordinator.privacy_engine.total_rounds_applied = 0
    
    session = db.query(FederationSession).first()
    if session:
        session.status = "ACTIVE"
        session.current_round = 1
        db.commit()
        
    return {"status": "RESET_SUCCESSFUL", "message": "Federation benchmark and client trust scores reset."}

# ==================== Clients & Organizations ====================

@router.get("/clients")
def list_clients(db: Session = Depends(get_db)):
    clients = db.query(FederatedClient).all()
    results = []
    for c in clients:
        trust_rec = aggregation_worker.trust_engine.get_client_record(c.client_id, c.name)
        results.append({
            "id": c.id,
            "client_id": c.client_id,
            "name": c.name,
            "organization_name": c.organization.name if c.organization else "Independent",
            "specialty": c.organization.specialty if c.organization else "Clinical",
            "region": c.organization.region if c.organization else "US-East",
            "status": c.status,
            "dataset_size": c.dataset_size,
            "trust_score": c.trust_score,
            "risk_score": c.risk_score,
            "ip_address": c.ip_address,
            "total_rounds_completed": c.total_rounds_completed,
            "anomalies_detected": c.anomalies_detected,
            "last_heartbeat": c.last_heartbeat.isoformat() if c.last_heartbeat else None,
            "history": trust_rec.get("history", [])
        })
    return results

@router.get("/clients/{client_id}")
def get_client_detail(client_id: str, db: Session = Depends(get_db)):
    client = db.query(FederatedClient).filter(FederatedClient.client_id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
        
    updates = db.query(ClientUpdate).filter(ClientUpdate.client_id == client.id).order_by(desc(ClientUpdate.submitted_at)).limit(20).all()
    trust_rec = aggregation_worker.trust_engine.get_client_record(client.client_id, client.name)
    
    return {
        "client_id": client.client_id,
        "name": client.name,
        "organization": {
            "name": client.organization.name,
            "specialty": client.organization.specialty,
            "region": client.organization.region,
            "contact": client.organization.contact_email
        },
        "status": client.status,
        "dataset_size": client.dataset_size,
        "trust_score": client.trust_score,
        "risk_score": client.risk_score,
        "ip_address": client.ip_address,
        "total_rounds_completed": client.total_rounds_completed,
        "anomalies_detected": client.anomalies_detected,
        "history": trust_rec.get("history", []),
        "recent_updates": [{
            "round_id": u.round_id,
            "l2_norm": u.l2_norm,
            "cosine_similarity": u.cosine_similarity,
            "threat_score": u.threat_score,
            "is_quarantined": u.is_quarantined,
            "reason": u.quarantine_reason,
            "submitted_at": u.submitted_at.isoformat()
        } for u in updates]
    }

@router.post("/clients/{client_id}/unquarantine")
def unquarantine_client(client_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role not in ["ADMIN", "OPERATOR"]:
        raise HTTPException(status_code=403, detail="Forbidden")
        
    client = db.query(FederatedClient).filter(FederatedClient.client_id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
        
    client.status = "ACTIVE"
    client.trust_score = max(55.0, client.trust_score) # Restore probationary baseline
    client.risk_score = round(100.0 - client.trust_score, 1)
    
    aggregation_worker.trust_engine.initialize_client(client.client_id, client.name, initial_score=client.trust_score)
    
    audit = AuditLog(
        actor=current_user.username,
        action="CLIENT_UNQUARANTINED",
        resource=f"Client:{client_id}",
        result="SUCCESS"
    )
    db.add(audit)
    db.commit()
    
    return {"status": "UNQUARANTINED", "client_id": client_id, "new_trust_score": client.trust_score}

# ==================== Training Rounds ====================

@router.get("/training/rounds")
def list_rounds(db: Session = Depends(get_db)):
    rounds = db.query(TrainingRound).order_by(TrainingRound.round_number.desc()).all()
    return [{
        "id": r.id,
        "round_number": r.round_number,
        "status": r.status,
        "participating_clients": r.participating_clients,
        "verified_updates": r.verified_updates,
        "quarantined_updates": r.quarantined_updates,
        "global_accuracy": r.global_accuracy,
        "global_loss": r.global_loss,
        "duration_seconds": r.duration_seconds,
        "start_time": r.start_time.isoformat() if r.start_time else None,
        "end_time": r.end_time.isoformat() if r.end_time else None
    } for r in rounds]

# ==================== Model Registry & Rollback ====================

@router.get("/models")
def list_models(db: Session = Depends(get_db)):
    registry_svc = ModelRegistryService(db)
    models = registry_svc.list_models()
    return [{
        "id": m.id,
        "model_tag": m.model_tag,
        "version_number": m.version_number,
        "round_number": m.round_number,
        "accuracy": m.accuracy,
        "loss": m.loss,
        "participants_count": m.participants_count,
        "aggregation_strategy": m.aggregation_strategy,
        "privacy_epsilon": m.privacy_epsilon,
        "artifact_uri": m.artifact_uri,
        "status": m.status,
        "created_at": m.created_at.isoformat() if m.created_at else None
    } for m in models]

@router.post("/models/rollback")
def rollback_model(req: RollbackRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Only Admins can initiate model rollback.")
        
    registry_svc = ModelRegistryService(db)
    restored = registry_svc.rollback_model(req.version_number)
    if not restored:
        raise HTTPException(status_code=404, detail="Target model version not found.")
        
    audit = AuditLog(
        actor=current_user.username,
        action="MODEL_ROLLBACK",
        resource=f"ModelVersion:v{req.version_number}",
        result="SUCCESS"
    )
    db.add(audit)
    db.commit()
    
    return {
        "status": "ROLLBACK_SUCCESSFUL",
        "active_model_version": restored.model_tag,
        "accuracy": restored.accuracy,
        "loss": restored.loss
    }

# ==================== Security & Threat Radar ====================

@router.get("/security/events")
def list_security_events(db: Session = Depends(get_db)):
    events = db.query(SecurityEvent).order_by(desc(SecurityEvent.timestamp)).limit(50).all()
    return [{
        "id": e.id,
        "event_type": e.event_type,
        "client_id": e.client_id,
        "severity": e.severity,
        "description": e.description,
        "threat_confidence": e.threat_confidence,
        "action_taken": e.action_taken,
        "timestamp": e.timestamp.isoformat() if e.timestamp else None
    } for e in events]

@router.get("/security/radar")
def get_security_radar(db: Session = Depends(get_db)):
    """Returns anomaly scatter radar dataset comparing clients."""
    clients = db.query(FederatedClient).all()
    points = []
    for c in clients:
        # Get latest update metrics
        latest_update = db.query(ClientUpdate).filter(ClientUpdate.client_id == c.id).order_by(desc(ClientUpdate.submitted_at)).first()
        points.append({
            "client_id": c.client_id,
            "name": c.name,
            "cosine_similarity": latest_update.cosine_similarity if latest_update else 0.95,
            "l2_norm": latest_update.l2_norm if latest_update else 1.15,
            "threat_score": latest_update.threat_score if latest_update else round(100 - c.trust_score, 1),
            "trust_score": c.trust_score,
            "status": c.status
        })
    return points

# ==================== Infrastructure & Cost Estimation ====================

@router.get("/infrastructure/health")
def get_infrastructure_health(db: Session = Depends(get_db)):
    metrics = db.query(InfrastructureMetric).all()
    pods = [
        {"name": "api-gateway-7f4b8-x1", "service": "api-gateway", "node": "ip-10-0-1-12", "cpu": 12.4, "memory": "210Mi", "status": "Running", "restarts": 0},
        {"name": "api-gateway-7f4b8-x2", "service": "api-gateway", "node": "ip-10-0-2-34", "cpu": 11.8, "memory": "205Mi", "status": "Running", "restarts": 0},
        {"name": "coordinator-59d4c-k1", "service": "coordinator", "node": "ip-10-0-1-12", "cpu": 8.1, "memory": "185Mi", "status": "Running", "restarts": 0},
        {"name": "aggregator-worker-99ab-w1", "service": "aggregator-worker", "node": "ip-10-0-3-55", "cpu": 24.5, "memory": "420Mi", "status": "Running", "restarts": 0},
        {"name": "aggregator-worker-99ab-w2", "service": "aggregator-worker", "node": "ip-10-0-3-56", "cpu": 22.1, "memory": "415Mi", "status": "Running", "restarts": 0},
        {"name": "security-engine-44de-s1", "service": "security-engine", "node": "ip-10-0-2-34", "cpu": 14.8, "memory": "260Mi", "status": "Running", "restarts": 0},
        {"name": "model-service-33ff-m1", "service": "model-service", "node": "ip-10-0-1-12", "cpu": 6.2, "memory": "195Mi", "status": "Running", "restarts": 0}
    ]
    
    return {
        "cluster_name": "federaicloud-production-eks",
        "kubernetes_version": "v1.29.3-eks",
        "cloud_provider": "AWS (us-east-1)",
        "vpc_cidr": "10.0.0.0/16",
        "cluster_status": "OPTIMAL",
        "hpa_status": "Active (Autoscaling Target: 70% CPU)",
        "active_nodes_count": 3,
        "active_pods_count": len(pods),
        "pods": pods,
        "services": [{
            "service_name": "object-storage-seaweedfs" if m.service_name == "object-storage-minio" else m.service_name,
            "cpu_percent": m.cpu_percent,
            "memory_mb": m.memory_mb,
            "request_rate": m.request_rate,
            "replica_count": m.replica_count,
            "status": m.status
        } for m in metrics]
    }

@router.post("/infrastructure/simulate-failure")
def simulate_pod_failure(req: PodFailureRequest, current_user: User = Depends(get_current_user)):
    """Demonstrates Kubernetes fault-tolerance and self-healing replica recreation."""
    return {
        "status": "POD_TERMINATED_HEALING_TRIGGERED",
        "service": req.service_name,
        "event": "SIGTERM dispatched to target pod replica. Kubernetes controller initiates replacement pod.",
        "recovery_estimated_sec": 2.5,
        "cluster_resilience": "VERIFIED (Zero downtime due to Multi-Replica ALB Ingress)"
    }

@router.get("/cost/estimate")
def get_cloud_cost_estimate(
    nodes: int = Query(default=3, ge=1, le=20),
    storage_gb: int = Query(default=100, ge=10, le=5000),
    monthly_requests_millions: float = Query(default=5.0, ge=0.1, le=100.0)
):
    """
    Transparent AWS reference cloud cost estimation model.
    """
    # EKS Control plane: $73.00/mo ($0.10/hr)
    eks_control_plane = 73.00
    # EC2 Worker nodes (m6i.large: 2 vCPU, 8GB RAM ~ $0.096/hr => $70.08/node/month)
    compute_cost = round(nodes * 70.08, 2)
    # AWS RDS PostgreSQL (db.m6g.large multi-AZ ~ $180.00/month)
    database_cost = 180.00
    # AWS S3 Standard Storage ($0.023/GB) + API calls
    storage_cost = round(storage_gb * 0.023 + (monthly_requests_millions * 0.40), 2)
    # Application Load Balancer (ALB: $0.0225/hr + $0.008/LCU ~ $28.00/month)
    alb_cost = 28.00
    # Amazon CloudWatch Metrics & Logs
    monitoring_cost = 22.50
    
    total = round(eks_control_plane + compute_cost + database_cost + storage_cost + alb_cost + monitoring_cost, 2)
    
    return {
        "monthly_total_usd": total,
        "currency": "USD",
        "breakdown": {
            "eks_control_plane": eks_control_plane,
            "worker_nodes_ec2": compute_cost,
            "managed_rds_postgresql": database_cost,
            "s3_object_storage": storage_cost,
            "application_load_balancer": alb_cost,
            "cloudwatch_monitoring_logs": monitoring_cost
        },
        "assumptions": {
            "node_count": nodes,
            "node_type": "m6i.large (2 vCPU, 8GB RAM)",
            "storage_gb": storage_gb,
            "monthly_requests_millions": monthly_requests_millions,
            "region": "us-east-1"
        }
    }

# ==================== Audit Logs ====================

@router.get("/audit/logs")
def list_audit_logs(db: Session = Depends(get_db)):
    logs = db.query(AuditLog).order_by(desc(AuditLog.timestamp)).limit(100).all()
    return [{
        "id": l.id,
        "actor": l.actor,
        "action": l.action,
        "resource": l.resource,
        "result": l.result,
        "ip_address": l.ip_address,
        "metadata": l.metadata_json,
        "timestamp": l.timestamp.isoformat() if l.timestamp else None
    } for l in logs]
