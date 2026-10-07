# FederAI Cloud — AWS Infrastructure as Code (Terraform)

## 1. Overview & Modules

The AWS cloud infrastructure is fully codified under `infrastructure/terraform/` using modern HashiCorp Terraform syntax.

```
infrastructure/terraform/
├── main.tf        # AWS Provider configuration & state backend
├── variables.tf   # Configurable parameters (Region, CIDR, EKS node types)
├── vpc.tf         # Multi-AZ VPC, Public/Private subnets, NAT Gateways
├── eks.tf         # Amazon EKS cluster & Managed Node Group IAM roles
├── rds.tf         # Amazon RDS PostgreSQL 16 Multi-AZ instance & Secrets Manager
├── s3.tf          # Amazon S3 Model Checkpoint Registry with KMS & Lifecycle Rules
├── alb.tf         # Application Load Balancer, Target Groups, Path Routing
└── outputs.tf     # Exported resource identifiers & DNS endpoints
```

---

## 2. Execution Guide

### 2.1 Prerequisites
- AWS CLI configured with administrator permissions:
  ```bash
  aws sts get-caller-identity
  ```
- Terraform CLI (v1.5+)

### 2.2 Provisioning AWS Infrastructure
```bash
cd infrastructure/terraform

# Initialize Terraform plugins
terraform init

# Validate configuration syntax
terraform validate

# Review execution plan
terraform plan -out=tfplan

# Apply infrastructure changes
terraform apply tfplan
```

### 2.3 Teardown
To prevent incurring unnecessary cloud costs after testing:
```bash
terraform destroy -auto-approve
```
