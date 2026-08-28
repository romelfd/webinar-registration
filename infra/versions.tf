terraform {
  required_version = ">= 1.7.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Remote state so `terraform apply` from GitHub Actions and from your laptop
  # both see the same state file. Create the bucket + lock table once, by hand,
  # BEFORE running `terraform init` (see README Step 9.1) — you can't create
  # your own state backend using Terraform that depends on that backend.
  backend "s3" {
  bucket         = "romel-tfstate-webinar-app"
  key            = "webinar-registration/terraform.tfstate"
  region         = "us-east-1"
  dynamodb_table = "romel-tf-locks"
  encrypt        = true
  }
}

provider "aws" {
  region = var.aws_region
}
