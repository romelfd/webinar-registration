output "instance_id" {
  description = "EC2 instance ID — used as the target for SSM deploy commands"
  value       = aws_instance.app.id
}

output "instance_public_ip" {
  value = aws_instance.app.public_ip
}

output "frontend_bucket" {
  value = aws_s3_bucket.frontend.bucket
}

output "frontend_website_endpoint" {
  value = aws_s3_bucket_website_configuration.frontend.website_endpoint
}

output "exports_bucket" {
  value = aws_s3_bucket.exports.bucket
}

output "github_deploy_role_arn" {
  description = "Put this in the GitHub Actions workflow's `role-to-assume` input"
  value       = aws_iam_role.github_deploy.arn
}
