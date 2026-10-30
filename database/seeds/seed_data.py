import os
import sys
import datetime
import bcrypt
import numpy as np
import csv

from database.session import SessionLocal, init_db
from database.models.schema import (
    Organization, User, FederatedClient, FederationSession,
    TrainingRound, ModelVersion, SecurityEvent, AuditLog, SyntheticPatient
)

def hash_password(password: str) -> str:
    pwd_bytes = password.encode('utf-8')[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode('utf-8')

def generate_synthetic_record(external_id: str, client_id: str, seed: int) -> dict:
    np.random.seed(seed)
    age = int(np.clip(np.random.normal(58, 12), 22, 88))
    sex = np.random.choice(["M", "F"], p=[0.52, 0.48])
    
    # Clinical parameters
    sbp = round(float(np.clip(np.random.normal(130, 18), 90, 195)), 1)
    dbp = round(float(np.clip(np.random.normal(82, 10), 60, 115)), 1)
    glucose = round(float(np.clip(np.random.normal(112, 28), 70, 290)), 1)
    chol = round(float(np.clip(np.random.normal(210, 35), 125, 340)), 1)
    ratio = round(float(np.clip(np.random.normal(1.1, 0.3), 0.3, 2.5)), 2)
    bmi = round(float(np.clip(np.random.normal(27.4, 4.5), 18.5, 43.0)), 1)
    troponin = round(float(np.clip(np.random.exponential(0.06), 0.01, 2.2)), 3)
    creatinine = round(float(np.clip(np.random.normal(1.05, 0.35), 0.5, 3.8)), 2)
    crp = round(float(np.clip(np.random.exponential(2.5), 0.2, 18.0)), 2)
    hr = int(np.clip(np.random.normal(74, 11), 52, 115))
    spo2 = round(float(np.clip(np.random.normal(97.2, 1.8), 89.0, 100.0)), 1)
    
    # Ground-truth clinical risk score
    z = (
        0.45 * (age - 55.0) / 15.0 +
        0.60 * (sbp - 125.0) / 20.0 +
        0.35 * (dbp - 80.0) / 12.0 +
        0.55 * (glucose - 100.0) / 30.0 +
        0.40 * (chol - 200.0) / 40.0 +
        -0.50 * (ratio - 1.0) / 0.4 +
        0.38 * (bmi - 26.0) / 5.0 +
        0.85 * (troponin - 0.04) / 0.1 +
        0.42 * (creatinine - 1.0) / 0.3 +
        0.48 * (crp - 2.0) / 2.5 +
        0.25 * (hr - 72.0) / 12.0 +
        -0.65 * (spo2 - 98.0) / 2.0
    )
    prob = 1.0 / (1.0 + np.exp(-z))
    risk_label = 1 if prob >= 0.50 else 0
    
    notes = "Routine clinical telemetry screened under synthetic test protocol."
    
    return {
        "external_ref": external_id,
        "client_id": client_id,
        "age": age,
        "sex": sex,
        "systolic_bp": sbp,
        "diastolic_bp": dbp,
        "fasting_glucose": glucose,
        "cholesterol": chol,
        "hdl_ldl_ratio": ratio,
        "bmi": bmi,
        "troponin": troponin,
        "creatinine": creatinine,
        "crp": crp,
        "resting_hr": hr,
        "spo2": spo2,
        "risk_label": risk_label,
        "is_synthetic": True,
        "notes": notes
    }

def seed_database():
    init_db()
    db = SessionLocal()
    try:
        print("[FedNexus] Checking and seeding database records...")

        # 1. Organizations
        created_orgs = {}
        orgs_data = [
            {"org_id": "org-alpha", "name": "Hospital Alpha (Metropolitan Cardiac Center)", "specialty": "Cardiology & Vascular", "region": "US-East (N. Virginia)", "contact_email": "federation@hospital-alpha.org"},
            {"org_id": "org-beta", "name": "Hospital Beta (Regional General Clinic)", "specialty": "Geriatric & Internal Medicine", "region": "US-East (Ohio)", "contact_email": "ai-ops@hospital-beta.med"},
            {"org_id": "org-gamma", "name": "Hospital Gamma (University Medical Center)", "specialty": "Metabolic & Endocrinology", "region": "EU-West (Frankfurt)", "contact_email": "research@hospital-gamma.edu"},
            {"org_id": "org-delta", "name": "Hospital Delta (Apex Clinical Research)", "specialty": "Emergency & Trauma", "region": "US-West (Oregon)", "contact_email": "admin@hospital-delta.io"},
            {"org_id": "org-epsilon", "name": "Hospital Epsilon (Metropolitan Health Group)", "specialty": "Multispecialty Clinical", "region": "AP-Southeast (Singapore)", "contact_email": "federated@hospital-epsilon.org"}
        ]
        for od in orgs_data:
            org = db.query(Organization).filter(Organization.org_id == od["org_id"]).first()
            if not org:
                org = Organization(**od)
                db.add(org)
                db.flush()
            created_orgs[od["org_id"]] = org

        # 2. Users
        users_data = [
            {"username": "admin", "email": "admin@fednexus.io", "password": "AdminPassword123!", "role": "ADMIN", "org_id": None},
            {"username": "operator", "email": "ops@fednexus.io", "password": "OperatorPass123!", "role": "OPERATOR", "org_id": None},
            {"username": "auditor", "email": "audit@fednexus.io", "password": "AuditorPass123!", "role": "VIEWER", "org_id": None},
            {"username": "client_alpha", "email": "node@hospital-alpha.org", "password": "ClientAlpha123!", "role": "CLIENT", "org_id": created_orgs["org-alpha"].id},
            {"username": "client_beta", "email": "node@hospital-beta.med", "password": "ClientBeta123!", "role": "CLIENT", "org_id": created_orgs["org-beta"].id},
            {"username": "client_gamma", "email": "node@hospital-gamma.edu", "password": "ClientGamma123!", "role": "CLIENT", "org_id": created_orgs["org-gamma"].id},
            {"username": "client_delta", "email": "node@hospital-delta.io", "password": "ClientDelta123!", "role": "CLIENT", "org_id": created_orgs["org-delta"].id},
            {"username": "client_epsilon", "email": "node@hospital-epsilon.org", "password": "ClientEpsilon123!", "role": "CLIENT", "org_id": created_orgs["org-epsilon"].id},
        ]
        for ud in users_data:
            existing_user = db.query(User).filter(User.username == ud["username"]).first()
            if not existing_user:
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
            {"client_id": "client-alpha", "name": "Hospital Alpha Node", "org_id": created_orgs["org-alpha"].id, "ip_address": "10.244.1.15"},
            {"client_id": "client-beta", "name": "Hospital Beta Node", "org_id": created_orgs["org-beta"].id, "ip_address": "10.244.2.22"},
            {"client_id": "client-gamma", "name": "Hospital Gamma Node", "org_id": created_orgs["org-gamma"].id, "ip_address": "10.244.3.08"},
            {"client_id": "client-delta", "name": "Hospital Delta Node", "org_id": created_orgs["org-delta"].id, "ip_address": "10.244.4.45"},
            {"client_id": "client-epsilon", "name": "Hospital Epsilon Node", "org_id": created_orgs["org-epsilon"].id, "ip_address": "10.244.5.12"}
        ]
        for cd in clients_data:
            client = db.query(FederatedClient).filter(FederatedClient.client_id == cd["client_id"]).first()
            if not client:
                c = FederatedClient(
                    client_id=cd["client_id"],
                    name=cd["name"],
                    organization_id=cd["org_id"],
                    status="ACTIVE",
                    dataset_size=0,
                    trust_score=95.0,
                    risk_score=5.0,
                    ip_address=cd["ip_address"],
                    last_heartbeat=datetime.datetime.utcnow()
                )
                db.add(c)
        db.flush()

        # 4. Federation Session
        session = db.query(FederationSession).filter(FederationSession.session_id == "FED-CLINICAL-RISK-2026").first()
        if not session:
            session = FederationSession(
                session_id="FED-CLINICAL-RISK-2026",
                session_name="Cardiovascular Multi-Center Diagnostic Federation",
                status="ACTIVE",
                model_architecture="ClinicalRiskMLP (12->24->12->2)",
                current_round=0,
                max_rounds=25,
                min_clients=3,
                privacy_epsilon=4.0,
                privacy_delta=1e-5,
                aggregation_strategy="FedAvg"
            )
            db.add(session)
            db.flush()

        # 5. Synthetic Patient Records
        patient_count = db.query(SyntheticPatient).count()
        if patient_count == 0:
            print("[FedNexus] Seeding synthetic patient records for federation clients...")
            patient_seq = 10001
            for client_info in clients_data:
                cid = client_info["client_id"]
                # Seed 50 synthetic records per client (250 total)
                for i in range(50):
                    rec = generate_synthetic_record(f"SYN-PT-{patient_seq}", cid, seed=patient_seq)
                    sp = SyntheticPatient(**rec)
                    db.add(sp)
                    patient_seq += 1
            db.flush()
            print(f"[FedNexus] Successfully seeded 250 synthetic patient records.")

        # Update dataset_size on each client to reflect actual patient counts in DB
        for client_info in clients_data:
            cid = client_info["client_id"]
            count = db.query(SyntheticPatient).filter(SyntheticPatient.client_id == cid).count()
            db.query(FederatedClient).filter(FederatedClient.client_id == cid).update({"dataset_size": count})

        # 6. Initial Audit Log
        if db.query(AuditLog).count() == 0:
            audit = AuditLog(
                actor="system",
                action="INITIALIZE_FEDERATION_ENVIRONMENT",
                resource="System",
                result="SUCCESS",
                ip_address="127.0.0.1",
                metadata_json={"bootstrap": True, "platform": "FedNexus"}
            )
            db.add(audit)

        db.commit()
        print("[FedNexus] Database successfully initialized and verified!")
    except Exception as e:
        db.rollback()
        print(f"[FedNexus] Error seeding database: {e}")
        raise e
    finally:
        db.close()

def generate_sample_csv_file(filepath: str = "database/seeds/synthetic_patients_sample.csv", n_records: int = 25):
    """Generates a sample CSV file for testing file import functionality."""
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    records = []
    base_id = 90001
    clients = ["client-alpha", "client-beta", "client-gamma", "client-delta", "client-epsilon"]
    
    headers = [
        "external_ref", "client_id", "age", "sex", "systolic_bp", "diastolic_bp",
        "fasting_glucose", "cholesterol", "hdl_ldl_ratio", "bmi", "troponin",
        "creatinine", "crp", "resting_hr", "spo2", "risk_label", "notes"
    ]
    
    with open(filepath, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=headers)
        writer.writeheader()
        for i in range(n_records):
            cid = clients[i % len(clients)]
            rec = generate_synthetic_record(f"SYN-IMP-{base_id + i}", cid, seed=base_id + i)
            # Remove is_synthetic internal flag for cleaner CSV
            rec.pop("is_synthetic", None)
            writer.writerow(rec)
            
    print(f"[FedNexus] Created sample CSV at {filepath} with {n_records} records.")

if __name__ == "__main__":
    seed_database()
    generate_sample_csv_file()
