import os
import json
from typing import Dict, Any, Optional
import boto3
from botocore.exceptions import ClientError

class ArtifactStorage:
    """
    Cloud-agnostic Object Storage Abstraction for Federated AI Artifacts.
    Supports AWS S3, SeaweedFS S3-compatible gateway, and local filesystem fallback.
    """
    def __init__(self):
        self.storage_type = os.getenv("STORAGE_BACKEND", "local").lower()
        self.bucket_name = os.getenv("S3_BUCKET_NAME", "federaicloud-artifacts")
        self.local_base_dir = os.getenv("LOCAL_STORAGE_DIR", "storage")
        
        os.makedirs(os.path.join(self.local_base_dir, "models"), exist_ok=True)
        os.makedirs(os.path.join(self.local_base_dir, "checkpoints"), exist_ok=True)
        os.makedirs(os.path.join(self.local_base_dir, "artifacts"), exist_ok=True)
        
        self.s3_client = None
        if self.storage_type in ["s3", "seaweedfs", "minio"]:
            s3_endpoint = os.getenv("S3_ENDPOINT_URL") # e.g. http://seaweedfs:8333 or AWS endpoint
            aws_key = os.getenv("AWS_ACCESS_KEY_ID", "seaweedadmin")
            aws_secret = os.getenv("AWS_SECRET_ACCESS_KEY", "seaweedsecurepass2026")
            region = os.getenv("AWS_REGION", "us-east-1")
            
            try:
                self.s3_client = boto3.client(
                    "s3",
                    endpoint_url=s3_endpoint,
                    aws_access_key_id=aws_key,
                    aws_secret_access_key=aws_secret,
                    region_name=region
                )
                # Ensure bucket exists
                try:
                    self.s3_client.head_bucket(Bucket=self.bucket_name)
                except ClientError:
                    try:
                        if region == "us-east-1" or not s3_endpoint:
                            self.s3_client.create_bucket(Bucket=self.bucket_name)
                        else:
                            self.s3_client.create_bucket(
                                Bucket=self.bucket_name,
                                CreateBucketConfiguration={"LocationConstraint": region}
                            )
                    except Exception as b_err:
                        print(f"[Storage] Bucket creation notice: {b_err}")
            except Exception as e:
                print(f"[Storage] S3 connection fallback to local storage: {e}")
                self.storage_type = "local"

    def save_model(self, model_tag: str, model_data: Dict[str, Any]) -> str:
        data_str = json.dumps(model_data, indent=2)
        local_path = os.path.join(self.local_base_dir, "models", f"{model_tag}.json")
        with open(local_path, "w") as f:
            f.write(data_str)
            
        if self.storage_type in ["s3", "seaweedfs", "minio"] and self.s3_client:
            try:
                s3_key = f"models/{model_tag}.json"
                self.s3_client.put_object(Bucket=self.bucket_name, Key=s3_key, Body=data_str)
                return f"s3://{self.bucket_name}/{s3_key}"
            except Exception as e:
                print(f"[Storage] Failed to upload to S3, using local path: {e}")
            
        return f"file://{os.path.abspath(local_path)}"

    def load_model(self, model_tag: str) -> Optional[Dict[str, Any]]:
        if self.storage_type in ["s3", "seaweedfs", "minio"] and self.s3_client:
            try:
                s3_key = f"models/{model_tag}.json"
                response = self.s3_client.get_object(Bucket=self.bucket_name, Key=s3_key)
                return json.loads(response["Body"].read().decode("utf-8"))
            except Exception:
                pass
                
        local_path = os.path.join(self.local_base_dir, "models", f"{model_tag}.json")
        if os.path.exists(local_path):
            with open(local_path, "r") as f:
                return json.load(f)
                
        return None

storage_backend = ArtifactStorage()
