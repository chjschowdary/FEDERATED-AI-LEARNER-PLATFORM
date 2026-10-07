# FederAI Cloud — Kubernetes Production Deployment

## 1. Kubernetes Architecture

FederAI Cloud packages declarative Kubernetes manifests structured under `infrastructure/kubernetes/` for deployment on Amazon EKS or local Minikube/Kind clusters.

```
infrastructure/kubernetes/
├── 00-namespace.yaml             # Dedicated 'federaicloud' namespace
├── 01-configmaps-secrets.yaml    # Environment configurations & database credentials
├── 02-postgres.yaml              # PostgreSQL StatefulSet & ClusterIP Service
├── 03-rabbitmq.yaml              # RabbitMQ StatefulSet & AMQP/Management Service
├── 04-storage.yaml               # SeaweedFS S3 Object Storage Deployment & PVC
├── 05-backend-deployment.yaml    # FastAPI Backend Deployment (2 Replicas) & Service
├── 06-frontend-deployment.yaml   # Nginx Frontend Deployment (2 Replicas) & Service
├── 07-hpa.yaml                   # Horizontal Pod Autoscalers (CPU/Memory 70%)
└── 08-ingress.yaml               # NGINX Ingress Controller routing rules
```

---

## 2. Step-by-Step Cluster Deployment

### 2.1 Apply Manifests
```bash
# Create dedicated namespace
kubectl apply -f infrastructure/kubernetes/00-namespace.yaml

# Create ConfigMaps and Secrets
kubectl apply -f infrastructure/kubernetes/01-configmaps-secrets.yaml

# Deploy Stateful Storage Tier (PostgreSQL, RabbitMQ, SeaweedFS)
kubectl apply -f infrastructure/kubernetes/02-postgres.yaml
kubectl apply -f infrastructure/kubernetes/03-rabbitmq.yaml
kubectl apply -f infrastructure/kubernetes/04-storage.yaml

# Deploy Application Tier (FastAPI Backend, Nginx Frontend)
kubectl apply -f infrastructure/kubernetes/05-backend-deployment.yaml
kubectl apply -f infrastructure/kubernetes/06-frontend-deployment.yaml

# Configure Autoscaling & Ingress
kubectl apply -f infrastructure/kubernetes/07-hpa.yaml
kubectl apply -f infrastructure/kubernetes/08-ingress.yaml
```

### 2.2 Verify Pod Health & Endpoints
```bash
kubectl get pods -n federaicloud
kubectl get svc -n federaicloud
kubectl get hpa -n federaicloud
```

### 2.3 Horizontal Pod Autoscaling (HPA)
The backend service scales dynamically between 2 and 10 pods when average CPU or Memory utilization exceeds 70%, ensuring elasticity during intensive model aggregation rounds.
