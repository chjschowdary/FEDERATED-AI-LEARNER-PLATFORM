# Amazon RDS PostgreSQL Managed Database

resource "aws_db_subnet_group" "rds" {
  name       = "${var.environment}-federaicloud-rds-subnet-group"
  subnet_ids = aws_subnet.private[*].id

  tags = {
    Name        = "${var.environment}-federaicloud-rds-subnet-group"
    Environment = var.environment
    Project     = "FederAI-Cloud"
  }
}

resource "aws_security_group" "rds_sg" {
  name        = "${var.environment}-federaicloud-rds-sg"
  description = "Allow inbound PostgreSQL traffic from EKS worker nodes"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.eks_cluster_sg.id]
    description     = "PostgreSQL from EKS"
  }

  egress {
    from_port        = 0
    to_port          = 0
    protocol         = "-1"
    cidr_blocks      = ["0.0.0.0/0"]
    ipv6_cidr_blocks = ["::/0"]
  }

  tags = {
    Name        = "${var.environment}-federaicloud-rds-sg"
    Environment = var.environment
    Project     = "FederAI-Cloud"
  }
}

resource "random_password" "db_password" {
  length  = 24
  special = false
}

resource "aws_secretsmanager_secret" "db_secret" {
  name                    = "${var.environment}/federaicloud/rds-credentials"
  recovery_window_in_days = 0

  tags = {
    Environment = var.environment
    Project     = "FederAI-Cloud"
  }
}

resource "aws_secretsmanager_secret_version" "db_secret_val" {
  secret_id = aws_secretsmanager_secret.db_secret.id
  secret_string = jsonencode({
    engine   = "postgres"
    host     = aws_db_instance.postgres.address
    port     = aws_db_instance.postgres.port
    username = "federaidba"
    password = random_password.db_password.result
    database = "federaicloud"
  })
}

resource "aws_db_instance" "postgres" {
  identifier        = "${var.environment}-federaicloud-db"
  allocated_storage = 50
  max_allocated_storage = 500
  storage_type      = "gp3"
  engine            = "postgres"
  engine_version    = "16.2"
  instance_class    = var.db_instance_class
  
  db_name  = "federaicloud"
  username = "federaidba"
  password = random_password.db_password.result

  db_subnet_group_name   = aws_db_subnet_group.rds.name
  vpc_security_group_ids = [aws_security_group.rds_sg.id]

  multi_az               = var.environment == "production" ? true : false
  publicly_accessible    = false
  skip_final_snapshot    = var.environment == "production" ? false : true
  final_snapshot_identifier = "${var.environment}-federaicloud-db-final-snapshot"
  storage_encrypted      = true
  deletion_protection    = var.environment == "production" ? true : false

  backup_retention_period = 30
  backup_window          = "03:00-04:00"
  maintenance_window     = "Sun:04:30-Sun:05:30"

  auto_minor_version_upgrade = true

  tags = {
    Name        = "${var.environment}-federaicloud-postgres"
    Environment = var.environment
    Project     = "FederAI-Cloud"
  }
}
