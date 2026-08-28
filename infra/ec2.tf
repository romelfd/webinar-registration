# Latest Amazon Linux 2023 AMI, resolved via SSM Parameter Store instead of
# a hardcoded AMI ID — the hardcoded-ID approach is the #1 way Terraform
# configs silently rot as AMIs age out of a region.
data "aws_ssm_parameter" "al2023_ami" {
  name = "/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64"
}

resource "aws_instance" "app" {
  ami                    = data.aws_ssm_parameter.al2023_ami.value
  instance_type          = var.instance_type
  subnet_id              = aws_subnet.public.id
  vpc_security_group_ids = [aws_security_group.web.id]
  iam_instance_profile   = aws_iam_instance_profile.ec2.name
  key_name               = var.key_pair_name

  user_data = templatefile("${path.module}/user_data.sh.tftpl", {
    exports_bucket = aws_s3_bucket.exports.bucket
  })

  tags = { Name = "${var.project_name}-app" }
}
