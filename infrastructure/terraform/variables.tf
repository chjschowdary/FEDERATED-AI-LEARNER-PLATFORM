variable "aws_region" {
  type        = string
  default     = "us-east-1"
  description = "AWS Deployment Region"
}

variable "environment" {
  type        = string
  default     = "production"
  description = "Deployment environment tier"
}

variable "vpc_cidr" {
  type        = string
  default     = "10.0.0.0/16"
  description = "VPC CIDR Block"
}

variable "cluster_name" {
  type        = string
  default     = "federaicloud-production-eks"
  description = "Amazon EKS Cluster Identifier"
}

variable "db_instance_class" {
  type        = string
  default     = "db.m6g.large"
  description = "RDS PostgreSQL Instance Class"
}

variable "node_instance_type" {
  type        = string
  default     = "m6i.large"
  description = "EKS Managed Node Group EC2 Instance Type"
}
