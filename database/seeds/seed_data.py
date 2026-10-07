import os
import sys
import datetime
import bcrypt
from database.session import SessionLocal, init_db
from database.models.schema import (
    Organization, User, FederatedClient, FederationSession,
    TrainingRound, ModelVersion, SecurityEvent, AuditLog, InfrastructureMetric
)

def hash_password(password: str) -> str:
    pwd_bytes = password.encode('utf-8')[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode('utf-8')

def seed_database():
    init_db()
    db = SessionLocal()
    try:
        # Check if already seeded
        if db.query(Organization).first():
            print("Database already contains seed data. Skipping...")
            return

        print("Seeding FederAI Cloud database...")

        # 1. Organizations
        orgs_data = [
            {"org_id": "org-alpha", "name": "Hospital Alpha (Metropolitan Cardiac Center)", "specialty": "Cardiology & Vascular", "region": "US-East (N. Virginia)", "contact_email": "federation@hospital-alpha.org"},
            {"org_id": "org-beta", "name": "Hospital Beta (Regional General Clinic)", "specialty": "Geriatric & Internal Medicine", "region": "US-East (Ohio)", "contact_email": "ai-ops@hospital-beta.med"},
            {"org_id": "org-gamma", "name": "Hospital Gamma (University Medical Center)", "specialty": "Metabolic & Endocrinology", "region": "EU-West (Frankfurt)", "contact_email": "research@hospital-gamma.edu"},
            {"org_id": "org-delta", "name": "Hospital Delta (Apex Clinical Research)", "specialty": "Emergency & Trauma", "region": "US-West (Oregon)", "contact_email": "admin@hospital-delta.io"},
            {"org_id": "org-epsilon", "name": "Hospital Epsilon (Metropolitan Health Group)", "specialty": "Multispecialty Clinical", "region": "AP-Southeast (Singapore)", "contact_email": "federated@hospital-epsilon.org"}
        ]
        
        created_orgs = {}
        for od in orgs_data:
            org = Organization(**od)
            db.add(org)
            db.flush()
            created_orgs[od["org_id"]] = org

        # 2. Users
        users_data = [
            {"username": "admin", "email": "admin@federaicloud.io", "password": "AdminPassword123!", "role": "ADMIN", "org_id": None},
            {"username": "operator", "email": "ops@federaicloud.io", "password": "OperatorPass123!", "role": "OPERATOR", "org_id": None},
            {"username": "auditor", "email": "audit@federaicloud.io", "password": "AuditorPass123!", "role": "VIEWER", "org_id": None},
            {"username": "client_alpha", "email": "node@hospital-alpha.org", "password": "ClientAlpha123!", "role": "CLIENT", "org_id": created_orgs["org-alpha"].id},
            {"username": "client_beta", "email": "node@hospital-beta.med", "password": "ClientBeta123!", "role": "CLIENT", "org_id": created_orgs["org-beta"].id},
            {"username": "client_gamma", "email": "node@hospital-gamma.edu", "password": "ClientGamma123!", "role": "CLIENT", "org_id": created_orgs["org-gamma"].id},
            {"username": "client_delta", "email": "node@hospital-delta.io", "password": "ClientDelta123!", "role": "CLIENT", "org_id": created_orgs["org-delta"].id},
            {"username": "client_epsilon", "email": "node@hospital-epsilon.org", "password": "ClientEpsilon123!", "role": "CLIENT", "org_id": created_orgs["org-epsilon"].id},
        ]
        for ud in users_data:
            user = User(
                username=ud["username"],
                email=ud["email"],
                hashed_password=hash_password(ud["password"]),
                role=ud["role"],
                organization_id=ud["org_id"]
            )
            db.add(user)

        # 3. Federated Clients
        clients_data = [
            {"client_id": "client-alpha", "name": "Hospital Alpha Node", "org_id": created_orgs["org-alpha"].id, "dataset_size": 1200, "trust_score": 96.0, "risk_score": 4.0, "ip_address": "10.244.1.15", "specialty": "Cardiology"},
            {"client_id": "client-beta", "name": "Hospital Beta Node", "org_id": created_orgs["org-beta"].id, "dataset_size": 850, "trust_score": 92.5, "risk_score": 7.5, "ip_address": "10.244.2.22", "specialty": "Geriatrics"},
            {"client_id": "client-gamma", "name": "Hospital Gamma Node", "org_id": created_orgs["org-gamma"].id, "dataset_size": 1500, "trust_score": 98.0, "risk_score": 2.0, "ip_address": "10.244.3.08", "specialty": "Endocrinology"},
            {"client_id": "client-delta", "name": "Hospital Delta Node", "org_id": created_orgs["org-delta"].id, "dataset_size": 600, "trust_score": 82.0, "risk_score": 18.0, "ip_address": "10.244.4.45", "specialty": "Emergency Care"},
            {"client_id": "client-epsilon", "name": "Hospital Epsilon Node", "org_id": created_orgs["org-epsilon"].id, "dataset_size": 950, "trust_score": 94.0, "risk_score": 6.0, "ip_address": "10.244.5.12", "specialty": "Multispecialty"}
        ]
        for cd in clients_data:
            c = FederatedClient(
                client_id=cd["client_id"],
                name=cd["name"],
                organization_id=cd["org_id"],
                status="ACTIVE",
                dataset_size=cd["dataset_size"],
                trust_score=cd["trust_score"],
                risk_score=cd["risk_score"],
                ip_address=cd["ip_address"],
                last_heartbeat=datetime.datetime.utcnow()
            )
            db.add(c)

        # 4. Initial Active Federation Session
        session = FederationSession(
            session_id="FED-CLINICAL-RISK-2026",
            session_name="Cardiovascular Multi-Center Diagnostic Federation",
            status="ACTIVE",
            model_architecture="ClinicalRiskMLP (12->24->12->2)",
            current_round=1,
            max_rounds=25,
            min_clients=3,
            privacy_epsilon=4.0,
            privacy_delta=1e-5,
            aggregation_strategy="FedAvg"
        )
        db.add(session)
        db.flush()

        # 5. Base Model Version v1.0.0
        model_v1 = ModelVersion(
            model_tag="model-clinical-v1",
            version_number=1,
            session_id=session.id,
            round_number=0,
            accuracy=76.5,
            loss=0.485,
            participants_count=5,
            aggregation_strategy="FedAvg",
            privacy_epsilon=4.0,
            artifact_uri="s3://federaicloud-artifacts/models/model_v1.json",
            status="PRODUCTION"
        )
        db.add(model_v1)

        # 6. Initial Infrastructure Metrics
        services = [
            ("api-gateway", 12.4, 210.0, 48.2, 3, "HEALTHY"),
            ("coordinator", 8.1, 185.0, 22.0, 2, "HEALTHY"),
            ("aggregator-worker", 24.5, 420.0, 18.5, 3, "HEALTHY"),
            ("security-engine", 14.8, 260.0, 31.0, 2, "HEALTHY"),
            ("model-service", 6.2, 195.0, 15.0, 2, "HEALTHY"),
            ("database-postgresql", 18.2, 512.0, 85.0, 1, "HEALTHY"),
            ("message-broker-rabbitmq", 9.5, 320.0, 120.0, 1, "HEALTHY"),
            ("object-storage-minio", 4.1, 160.0, 42.0, 1, "HEALTHY")
        ]
        for s_name, cpu, mem, req, reps, stat in services:
            metric = InfrastructureMetric(
                service_name=s_name,
                cpu_percent=cpu,
                memory_mb=mem,
                request_rate=req,
                replica_count=reps,
                status=stat,
                timestamp=datetime.datetime.utcnow()
            )
            db.add(metric)

        # 7. Initial Audit Log
        audit = AuditLog(
            actor="admin",
            action="INITIALIZE_FEDERATION_INFRASTRUCTURE",
            resource="FederationSession:FED-CLINICAL-RISK-2026",
            result="SUCCESS",
            ip_address="127.0.0.1",
            metadata_json={"bootstrap": True, "total_nodes": 5}
        )
        db.add(audit)

        db.commit()
        print("Database successfully seeded!")
    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
