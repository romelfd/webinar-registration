# IAM role for the EC2 instance itself. Two policies attached:
#  1. AWS-managed SSM policy, so GitHub Actions can push deploys via
#     "aws ssm send-command" instead of SSH + long-lived key management.
#  2. A hand-written policy scoped to ONLY the exports bucket, ONLY the
#     actions the app needs — this is the concrete answer to "how would you
#     scope an IAM role for an EC2 instance that only needs one S3 bucket."

resource "aws_iam_role" "ec2" {
  name = "${var.project_name}-ec2-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ec2_ssm" {
  role       = aws_iam_role.ec2.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_role_policy" "ec2_s3_exports" {
  name = "${var.project_name}-ec2-s3-exports"
  role = aws_iam_role.ec2.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["s3:GetObject", "s3:PutObject", "s3:ListBucket"]
      Resource = [
        aws_s3_bucket.exports.arn,
        "${aws_s3_bucket.exports.arn}/*",
      ]
    }]
  })
}

resource "aws_iam_instance_profile" "ec2" {
  name = "${var.project_name}-ec2-profile"
  role = aws_iam_role.ec2.name
}
