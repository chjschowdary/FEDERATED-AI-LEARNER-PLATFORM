# Amazon S3 Model Checkpoint & Artifact Registry

resource "aws_kms_key" "s3_key" {
  description             = "KMS Key for FederAI Cloud S3 Bucket Encryption"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  tags = {
    Environment = var.environment
    Project     = "FederAI-Cloud"
  }
}

resource "aws_kms_alias" "s3_key_alias" {
  name          = "alias/${var.environment}-federaicloud-s3-key"
  target_key_id = aws_kms_key.s3_key.key_id
}

resource "aws_s3_bucket" "model_storage" {
  bucket = "${var.environment}-federaicloud-models-${var.aws_region}"

  lifecycle {
    prevent_destroy = false
  }

  tags = {
    Name        = "${var.environment}-federaicloud-models"
    Environment = var.environment
    Project     = "FederAI-Cloud"
  }
}

resource "aws_s3_bucket_versioning" "model_storage_versioning" {
  bucket = aws_s3_bucket.model_storage.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "model_storage_crypto" {
  bucket = aws_s3_bucket.model_storage.id

  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = aws_kms_key.s3_key.arn
      sse_algorithm     = "aws:kms"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "model_storage_pab" {
  bucket = aws_s3_bucket.model_storage.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "model_storage_lifecycle" {
  bucket = aws_s3_bucket.model_storage.id

  rule {
    id     = "archive-historical-weights"
    status = "Enabled"

    transition {
      days          = 90
      storage_class = "STANDARD_IA"
    }

    transition {
      days          = 365
      storage_class = "GLACIER"
    }

    noncurrent_version_transition {
      noncurrent_days = 30
      storage_class   = "STANDARD_IA"
    }

    noncurrent_version_expiration {
      noncurrent_days = 180
    }
  }
}
