# Lets GitHub Actions assume an AWS role using a short-lived OIDC token
# instead of a long-lived AWS access key stored as a GitHub secret. This is
# the single best "we do this properly" detail you can bring up when asked
# about IAM or CI/CD in an interview.
#
# NOTE: thumbprints below are GitHub's published OIDC thumbprints as of this
# writing. AWS has supported skipping thumbprint verification for well-known
# providers since 2023 — if `aws_iam_openid_connect_provider` rejects these,
# check AWS's current guidance and update.

resource "aws_iam_openid_connect_provider" "github" {
  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = [
    "6938fd4d98bab03faadb97b34396831e3780aea1",
    "1c58a3a8518e8759bf075b76b750d4f2df264fcd",
  ]
}

resource "aws_iam_role" "github_deploy" {
  name = "${var.project_name}-github-deploy"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Federated = aws_iam_openid_connect_provider.github.arn }
      Action    = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = {
          "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
        }
       StringLike = {
          "token.actions.githubusercontent.com:sub" = "repo:${split("/", var.github_repo)[0]}@*/${split("/", var.github_repo)[1]}@*:ref:refs/heads/main"
        
          
        }
      }
    }]
  })
}

# Deliberately narrow: just enough to run `terraform plan/apply` on THIS
# stack, upload the frontend build to S3, and send SSM deploy commands to
# the app instance — not admin access to the account.
resource "aws_iam_role_policy" "github_deploy_permissions" {
  name = "${var.project_name}-github-deploy-permissions"
  role = aws_iam_role.github_deploy.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "TerraformState"
        Effect = "Allow"
        Action = ["s3:GetObject", "s3:PutObject", "s3:ListBucket"]
        Resource = [
          "arn:aws:s3:::romel-tfstate-webinar-app",
          "arn:aws:s3:::romel-tfstate-webinar-app/*",
        ]
      },
      {
        Sid      = "TerraformLock"
        Effect   = "Allow"
        Action   = ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:DeleteItem"]
        Resource = "arn:aws:dynamodb:*:*:table/romel-tf-locks"
      },
      {
        Sid    = "ManageStackResources"
        Effect = "Allow"
        Action = [
          "ec2:Describe*", "ec2:RunInstances", "ec2:TerminateInstances",
          "ec2:CreateTags", "ec2:*SecurityGroup*", "ec2:*Vpc*", "ec2:*Subnet*",
          "ec2:*RouteTable*", "ec2:*InternetGateway*",
          # iam:Get*/List* (rather than only the specific calls we knew we'd
          # need) because `terraform plan`/`apply` re-reads every attribute
          # of every managed resource on every run -- not just when creating
          # something new -- and it's hard to predict every read-only IAM call
          # involved in advance. Your local AWS credentials have full admin
          # access, which is why this gap never showed up locally.
          "iam:Get*", "iam:List*", "iam:PassRole", "iam:*InstanceProfile*",
          "iam:*OpenIDConnectProvider*",
          "s3:CreateBucket", "s3:PutBucketPolicy", "s3:PutBucketWebsite",
          "s3:PutBucketPublicAccessBlock", "s3:Get*",
          "ssm:GetParameter", "ssm:GetParameters",
        ]
        Resource = "*"
      },
      {
        Sid      = "DeployFrontend"
        Effect   = "Allow"
        Action   = ["s3:PutObject", "s3:DeleteObject", "s3:ListBucket"]
        Resource = ["*"]
      },
      {
        Sid      = "DeployViaSSM"
        Effect   = "Allow"
        Action   = ["ssm:SendCommand", "ssm:GetCommandInvocation"]
        Resource = "*"
      },
    ]
  })
}

# Honest note for interviews: "ManageStackResources" above uses Resource = "*"
# because Terraform needs to create/describe VPC, subnet, and EC2 resources
# before they have ARNs to scope to. In a real org, this gets tightened with
# IAM condition keys (aws:RequestTag, aws:ResourceTag) or by having a
# platform team pre-provision the VPC so app teams only ever touch tagged
# resources within it. Naming that trade-off out loud is a stronger answer
# than pretending this policy is fully least-privilege.
