variable "aws_region" {
  description = "AWS region to deploy into"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Short name used to prefix/tag all resources"
  type        = string
  default     = "webinar-registration"
}

variable "my_ip_cidr" {
  description = "Your own IP in CIDR form (e.g. 1.2.3.4/32) — the only address allowed to SSH into the instance"
  type        = string
}

variable "instance_type" {
  description = "EC2 instance type (t3.micro / t2.micro are AWS free-tier eligible)"
  type        = string
  default     = "t3.micro"
}

variable "key_pair_name" {
  description = "Name of an existing EC2 key pair, for emergency SSH access (day-to-day deploys use SSM, not SSH)"
  type        = string
}

variable "github_repo" {
  description = "GitHub repo allowed to assume the deploy role, as \"owner/repo\""
  type        = string
}
