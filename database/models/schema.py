from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import declarative_base, relationship
import datetime

Base = declarative_base()

class Organization(Base):
    __tablename__ = "organizations"
    
    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(String(64), unique=True, index=True, nullable=False)
    name = Column(String(128), nullable=False)
    specialty = Column(String(128), default="General Healthcare")
    region = Column(String(64), default="US-East")
    contact_email = Column(String(128), nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    clients = relationship("FederatedClient", back_populates="organization")
    users = relationship("User", back_populates="organization")

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(64), unique=True, index=True, nullable=False)
    email = Column(String(128), unique=True, index=True, nullable=False)
    hashed_password = Column(String(256), nullable=False)
    role = Column(String(32), default="OPERATOR", nullable=False) # ADMIN, OPERATOR, CLIENT, VIEWER
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    organization = relationship("Organization", back_populates="users")

class FederatedClient(Base):
    __tablename__ = "federated_clients"
    
    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(String(64), unique=True, index=True, nullable=False)
    name = Column(String(128), nullable=False)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    status = Column(String(32), default="ACTIVE") # ACTIVE, TRAINING, IDLE, QUARANTINED, OFFLINE
    dataset_size = Column(Integer, default=1000)
    trust_score = Column(Float, default=85.0)
    risk_score = Column(Float, default=15.0)
    last_heartbeat = Column(DateTime, default=datetime.datetime.utcnow)
    total_rounds_completed = Column(Integer, default=0)
    anomalies_detected = Column(Integer, default=0)
    ip_address = Column(String(64), default="10.244.0.1")
    
    organization = relationship("Organization", back_populates="clients")
    updates = relationship("ClientUpdate", back_populates="client")

class FederationSession(Base):
    __tablename__ = "federation_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(64), unique=True, index=True, nullable=False)
    session_name = Column(String(128), nullable=False)
    status = Column(String(32), default="INITIALIZING") # ACTIVE, PAUSED, COMPLETED
    model_architecture = Column(String(64), default="ClinicalRiskMLP")
    current_round = Column(Integer, default=0)
    max_rounds = Column(Integer, default=20)
    min_clients = Column(Integer, default=3)
    privacy_epsilon = Column(Float, default=4.0)
    privacy_delta = Column(Float, default=1e-5)
    aggregation_strategy = Column(String(64), default="FedAvg")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    
    rounds = relationship("TrainingRound", back_populates="session")
    models = relationship("ModelVersion", back_populates="session")

class TrainingRound(Base):
    __tablename__ = "training_rounds"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("federation_sessions.id"), nullable=False)
    round_number = Column(Integer, nullable=False)
    status = Column(String(32), default="IN_PROGRESS") # IN_PROGRESS, COMPLETED, FAILED
    aggregation_strategy = Column(String(64), default="FedAvg")
    participating_clients = Column(Integer, default=0)
    verified_updates = Column(Integer, default=0)
    quarantined_updates = Column(Integer, default=0)
    global_accuracy = Column(Float, default=0.0)
    global_loss = Column(Float, default=0.0)
    duration_seconds = Column(Float, default=0.0)
    start_time = Column(DateTime, default=datetime.datetime.utcnow)
    end_time = Column(DateTime, nullable=True)
    
    session = relationship("FederationSession", back_populates="rounds")
    updates = relationship("ClientUpdate", back_populates="round")

class ClientUpdate(Base):
    __tablename__ = "client_updates"
    
    id = Column(Integer, primary_key=True, index=True)
    round_id = Column(Integer, ForeignKey("training_rounds.id"), nullable=False)
    client_id = Column(Integer, ForeignKey("federated_clients.id"), nullable=False)
    sample_count = Column(Integer, default=100)
    l2_norm = Column(Float, default=1.0)
    cosine_similarity = Column(Float, default=1.0)
    threat_score = Column(Float, default=0.0)
    is_quarantined = Column(Boolean, default=False)
    quarantine_reason = Column(Text, nullable=True)
    submitted_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    round = relationship("TrainingRound", back_populates="updates")
    client = relationship("FederatedClient", back_populates="updates")

class ModelVersion(Base):
    __tablename__ = "model_versions"
    
    id = Column(Integer, primary_key=True, index=True)
    model_tag = Column(String(64), unique=True, index=True, nullable=False)
    version_number = Column(Integer, nullable=False)
    session_id = Column(Integer, ForeignKey("federation_sessions.id"), nullable=True)
    round_number = Column(Integer, default=0)
    accuracy = Column(Float, default=0.0)
    loss = Column(Float, default=0.0)
    participants_count = Column(Integer, default=0)
    aggregation_strategy = Column(String(64), default="FedAvg")
    privacy_epsilon = Column(Float, default=4.0)
    artifact_uri = Column(String(256), nullable=False)
    status = Column(String(32), default="CANDIDATE") # PRODUCTION, CANDIDATE, ARCHIVED, ROLLED_BACK
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    session = relationship("FederationSession", back_populates="models")

class SecurityEvent(Base):
    __tablename__ = "security_events"
    
    id = Column(Integer, primary_key=True, index=True)
    event_type = Column(String(64), nullable=False) # MODEL_POISONING, UNAUTHORIZED_ACCESS, ANOMALOUS_NORM, GRADIENT_INVERSION
    client_id = Column(String(64), nullable=True)
    severity = Column(String(32), default="WARNING") # INFO, WARNING, CRITICAL
    description = Column(Text, nullable=False)
    threat_confidence = Column(Float, default=0.0)
    action_taken = Column(String(128), default="LOGGED") # QUARANTINED, BLOCKED, TRUST_PENALTY
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    actor = Column(String(64), default="system")
    action = Column(String(128), nullable=False)
    resource = Column(String(128), nullable=False)
    result = Column(String(32), default="SUCCESS")
    ip_address = Column(String(64), default="127.0.0.1")
    metadata_json = Column(JSON, nullable=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

class InfrastructureMetric(Base):
    __tablename__ = "infrastructure_metrics"
    
    id = Column(Integer, primary_key=True, index=True)
    service_name = Column(String(64), nullable=False)
    cpu_percent = Column(Float, default=0.0)
    memory_mb = Column(Float, default=0.0)
    request_rate = Column(Float, default=0.0)
    replica_count = Column(Integer, default=1)
    status = Column(String(32), default="HEALTHY")
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
