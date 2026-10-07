# Terraform Module Outputs

output "vpc_id" {
  description = "VPC Identifier"
  value       = aws_vpc.main.id
}

output "eks_cluster_name" {
  description = "EKS Cluster Name"
  value       = aws_eks_cluster.federaicloud.name
}

output "eks_cluster_endpoint" {
  description = "EKS Control Plane Endpoint"
  value       = aws_eks_cluster.federaicloud.endpoint
}

output "rds_endpoint" {
  description = "PostgreSQL Managed Instance Endpoint"
  value       = aws_db_instance.postgres.endpoint
}

output "s3_model_bucket" {
  description = "S3 Model Checkpoint Storage Bucket Name"
  value       = aws_s3_bucket.model_storage.id
}

output "alb_dns_name" {
  description = "Public Load Balancer DNS Endpoint"
  value       = aws_lb.external.dns_name
}
