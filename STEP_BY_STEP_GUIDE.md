# Webinar Registration Platform — Step-by-Step Build Guide

A practice project mapped directly onto the Thermo Fisher Senior Full Stack Developer JD: **React/Next.js + MUI** frontend, **Node.js/Express** REST API, **MySQL** database, **AWS** deployment (EC2, S3, IAM, VPC, Security Groups), and **AI-assisted development** and **CI/CD deployment automation** throughout.

Everything in this repo has already been built and tested end-to-end (backend against a real MySQL-compatible database, frontend with a real `next build`) so you're not debugging typos — your job is to read it, run it yourself, extend it, and be able to explain every decision in an interview. Section 8 maps each part of this build directly back to the mock interview questions from your prep guide.

## Architecture

```
                     ┌─────────────────────────┐
   Browser  ───────▶ │  S3 static website       │   (Next.js static export)
                     │  (frontend bucket)       │
                     └─────────────────────────┘
                                │  fetch() calls to the API
                                ▼
                     ┌─────────────────────────┐
                     │  VPC — public subnet     │
                     │  ┌───────────────────┐  │
                     │  │ EC2 (t3.micro)     │  │
                     │  │  nginx :80 ──▶     │  │
                     │  │  Node API :4000    │  │
                     │  │  MariaDB (local)   │  │
                     │  └───────────────────┘  │
                     │  IAM role: SSM + scoped  │
                     │  S3 access, no SSH keys  │
                     │  needed for deploys      │
                     └─────────────────────────┘
                                ▲
                                │ deploy artifact + SSM command
                     ┌─────────────────────────┐
                     │  GitHub Actions          │
                     │  OIDC → assumes AWS role │
                     │  (no long-lived keys)    │
                     └─────────────────────────┘
```

**Why this shape, not something fancier:** no NAT gateway, no RDS, no load balancer — those cost real money for a portfolio project and this JD's AWS list (EC2, S3, IAM, VPC, ASG, Security Groups) doesn't require them. Section 7 covers exactly how to talk about that trade-off in an interview instead of apologizing for it.

---

## Prerequisites

- Node.js 20+ and npm
- A GitHub account and a new (can be public) repo to push this into
- An AWS account (the free tier covers everything here if you tear it down when you're done — see Section 6)
- [Terraform](https://developer.hashicorp.com/terraform/install) 1.7+
- AWS CLI v2, configured with an account that can create IAM roles (only needed for your own `terraform apply` runs from your laptop before CI takes over)
- Claude / Claude Code — used throughout as your AI pair programmer
- A local MySQL-compatible database — see A0 below for OS-specific setup

---

## Part A — Build and Run Locally

### A0. Local database setup (pick one for your OS)

**Windows — Docker Desktop (recommended):** this uses the exact same `mysql:8.0` image your CI pipeline (`.github/workflows/ci.yml`) already runs, so local behavior matches CI exactly.

```powershell
docker run -d --name webinar-mysql `
  -e MYSQL_ROOT_PASSWORD=root `
  -e MYSQL_DATABASE=webinar_registration `
  -e MYSQL_USER=webinar_app `
  -e MYSQL_PASSWORD=devpass `
  -p 3306:3306 mysql:8.0
```

No local `mysql` CLI needed — run SQL commands inside the container instead:

```powershell
docker exec -it webinar-mysql mysql -u root -proot
```

To reset at any point: `docker rm -f webinar-mysql` and rerun the `docker run` command above.

**Windows — WSL2 + Ubuntu (alternative):** closest match to the EC2 instance in Part B, which also runs MariaDB. Open a WSL2 terminal and follow the macOS/Linux instructions below.

**Windows — MySQL Community Server (alternative):** the native installer from mysql.com bundles MySQL Workbench, a GUI for browsing the schema. Slightly less identical to the CI container, but the wire protocol is the same so nothing in the app code changes.

**macOS:**
```bash
brew install mariadb && brew services start mariadb
```

**Ubuntu / WSL2:**
```bash
sudo apt-get install mariadb-server && sudo systemctl start mariadb
```

Whichever route you picked, you should now be able to reach a MySQL-compatible server at `127.0.0.1:3306`. The rest of this guide assumes that.

### A1. Get the code running

This repo already contains a working backend (`backend/`) and frontend (`frontend/`). Start by getting them running locally so you understand the baseline before you touch AWS.

```bash
# 1. Create the database and app user
#    Windows/Docker: prefix this with `docker exec -it webinar-mysql` (see A0)
#    Everyone else:  run it directly if you have the mysql CLI installed
docker exec -it webinar-mysql mysql -u root -e "
  CREATE DATABASE webinar_registration;
  CREATE USER 'webinar_app'@'localhost' IDENTIFIED BY 'devpass';
  GRANT ALL PRIVILEGES ON webinar_registration.* TO 'webinar_app'@'localhost';
  FLUSH PRIVILEGES;
"
# Docker/MySQL-8 users: also grant the '%' host, since the app connects as
# 127.0.0.1 rather than the socket-based 'localhost' MariaDB expects:
#   CREATE USER 'webinar_app'@'%' IDENTIFIED BY 'devpass';
#   GRANT ALL PRIVILEGES ON webinar_registration.* TO 'webinar_app'@'%';
#   FLUSH PRIVILEGES;

# 2. Backend
cd backend
cp .env.example .env      # defaults already match the database above
npm install
npm run migrate           # creates events, sessions, registrants, admins tables
npm run dev                # http://localhost:4000

# 3. Frontend (new terminal)
cd frontend
npm install
npm run dev                # http://localhost:3000
```

**Checkpoint:** `curl http://localhost:4000/health` returns `{"status":"ok"}`, and `http://localhost:3000` shows the registration form (it'll show an empty session dropdown until you seed data — see A2).

### A2. Seed some test data

> Windows/Docker: prefix each `mysql ...` command below with `docker exec -it webinar-mysql`, or open a shell in the container first with `docker exec -it webinar-mysql bash`.

```bash
# One event, one low-capacity session, so you can see the waitlist logic trigger
docker exec -it webinar-mysql mysql -u webinar_app -pdevpass webinar_registration -e "
  INSERT INTO events (title, description, event_date)
    VALUES ('Thermo Fisher Innovation Webinar', 'Demo webinar', '2026-09-01 15:00:00');
  INSERT INTO sessions (event_id, name, capacity, starts_at)
    VALUES (LAST_INSERT_ID(), 'Track A: Cloud Diagnostics', 2, '2026-09-01 15:00:00');
"

# Create an admin login (bcrypt-hash a password, then insert it)
node -e "console.log(require('bcryptjs').hashSync('adminpass', 10))"
# copy the output hash into the INSERT below
docker exec -it webinar-mysql mysql -u webinar_app -pdevpass webinar_registration -e "
  INSERT INTO admins (email, password_hash) VALUES ('admin@example.com', '$2a$10$jZPxhZxWS8z5dzKx31Lx3OdiNvDWxqQSonwJXs6ijEYwdhLFki3rm');
"
```

**Checkpoint:** refresh `localhost:3000` — the session now appears in the dropdown. Register 3 people into it (capacity is 2) and confirm the 3rd gets waitlisted. Then visit `localhost:3000/admin/login`, sign in, and confirm you see all 3 registrants with the correct statuses, and that "Export CSV" downloads a file.

### A3. AI-assisted development checkpoint (Claude Code)

This is the part the JD is actually asking about — not "do you know a tool exists" but "do you already use one." Use these prompts for real, at each stage, then keep a couple of notes on what worked and what you had to correct — that becomes your answer to the AI-assisted-development interview questions.

- **Scaffolding:** *"Here's my Express route for GET /api/events (paste registrants.js). Write a matching route for PATCH /api/admin/sessions/:id/capacity that lets an admin change a session's capacity, admin-only, with validation that capacity can't drop below the number of already-confirmed registrants."*
- **Debugging:** *"This route throws an unhandled promise rejection and crashes the whole server when the DB is down — here's the file. Explain why, and fix it."* (This is the real bug this build hit — see `backend/src/middleware/asyncHandler.js` for the fix, and be ready to explain it: Express 4 does not forward rejected promises in async handlers to the error middleware automatically.)
- **Test generation:** *"Generate node:test unit tests for this email-validation regex, including edge cases I might not have thought of."*
- **Code review:** *"Review this Terraform security group for anything overly permissive before I apply it"* — paste `infra/security_groups.tf`.


curl -X PATCH http://localhost:4000/api/admin/sessions/1/capacity -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjEsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3ODgzMzI4NjUsImV4cCI6MTc4ODM2MTY2NX0.NsbBSpGAr4LnbHumCtLSgqZscEsg1EZTFrq4VB8klK8" -H "Content-Type: application/json" -d "{\"capacity\": 5}
---

## Part B — AWS Infrastructure with Terraform

### B1. One-time AWS setup (do this once, by hand, not via Terraform)

Terraform's own state has to live somewhere *before* Terraform exists to manage it — so create these two resources manually first:

```bash
aws s3api create-bucket --bucket YOUR-UNIQUE-TF-STATE-BUCKET --region us-east-1
aws s3api put-bucket-versioning --bucket YOUR-UNIQUE-TF-STATE-BUCKET \
  --versioning-configuration Status=Enabled

aws dynamodb create-table --table-name YOUR-TF-LOCK-TABLE \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST
```

Also create an EC2 key pair for emergency SSH access (day-to-day deploys use SSM, not SSH):

```bash
aws ec2 create-key-pair --key-name webinar-app-key --query 'KeyMaterial' --output text > ~/.ssh/webinar-app-key.pem
chmod 400 ~/.ssh/webinar-app-key.pem
```

Update `infra/versions.tf` — replace `REPLACE_WITH_YOUR_TF_STATE_BUCKET` and `REPLACE_WITH_YOUR_TF_LOCK_TABLE` with the names you just created.

### B2. Configure and apply

```bash
cd infra
cp terraform.tfvars.example terraform.tfvars
# edit terraform.tfvars: your IP (curl -s https://checkip.amazonaws.com), key pair name,
# and your-github-username/your-repo-name

terraform init
terraform validate
terraform plan     # read this output carefully before applying anything
terraform apply
```

**Checkpoint:** `terraform output` shows an `instance_public_ip` and a `frontend_website_endpoint`. `curl http://<instance_public_ip>/health` should time out or connect-refuse right now — that's expected, since no application code is deployed yet (Part C does that). If the security group and instance came up at all, the infra layer is working.

### B3. AI-assisted checkpoint

*"Here's my Terraform for an EC2 instance, IAM role, and security group (paste the three files). Is the IAM role scoped tightly enough? What would you tighten if this were going to production instead of a portfolio project?"* Compare Claude's answer against the "honest note" comment already in `infra/iam_github_oidc.tf` — see where they agree and where you'd push back.

---

## Part C — CI/CD: GitHub Actions + Terraform + SSM

### C1. Wire up the GitHub OIDC role

After `terraform apply` in Part B, get the deploy role's ARN:

```bash
terraform output github_deploy_role_arn
```

Open `.github/workflows/deploy.yml` and replace `DEPLOY_ROLE_ARN`'s placeholder with that value (or move it into a GitHub Actions repo variable instead of hardcoding it — cleaner, and worth mentioning in an interview as the "better version" of what's here).

No AWS access key ever gets stored in GitHub — the workflow requests a short-lived token from GitHub's OIDC provider and AWS trusts it because of the `aws_iam_openid_connect_provider` + trust policy from Part B. This is the single most interview-relevant detail in this whole deployment.

### C2. One-time secret on the instance

The database password and JWT secret are deliberately **not** in the deploy pipeline or the git repo — they live only on the instance, created once by hand (see the comment block at the top of `backend/scripts/deploy_remote.sh` for the exact commands, run via `aws ssm start-session` or the SSM console — again, no SSH needed).

### C3. Push and watch it deploy

```bash
git init && git add -A && git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

Opening a PR first triggers `.github/workflows/ci.yml` (backend tests against a throwaway MySQL service container, frontend build, `terraform validate`). Merging to `main` triggers `.github/workflows/deploy.yml`: Terraform applies any infra changes, the frontend build gets synced to S3, the backend gets packaged and pushed to the instance via SSM, and a health check either confirms the deploy or rolls the `current` symlink back to the previous release.

**Checkpoint:** after the `deploy` workflow finishes, `http://<frontend_website_endpoint>` (S3) should load the registration form and successfully call the API at `http://<instance_public_ip>` (EC2).

### C4. AI-assisted checkpoint

*"Walk through this GitHub Actions workflow (paste deploy.yml) and tell me what happens if the SSM command silently hangs instead of failing — where's the gap, and how would you add a timeout?"* — a great one to actually ask, since the current polling loop times out after 5 minutes but doesn't distinguish "still running slowly" from "stuck." Worth having a real answer ready for the "AI caught something I missed" interview question.

---

## Part D — Oracle Side Exercise (since the real app runs on MySQL)

The JD wants Oracle specifically, not just "a SQL database." Rather than standing up a second real deployment, port the same three-table schema into [Oracle Live SQL](https://livesql.oracle.com) (free, browser-based, no install) and work through the differences hands-on:

1. Recreate `events`, `sessions`, `registrants` — but since Oracle has no `AUTO_INCREMENT`, create a `SEQUENCE` per table plus a `BEFORE INSERT` trigger that pulls `.NEXTVAL`.
2. Rewrite the `INSERT ... waitlist logic` transaction from `registrants.js` as a PL/SQL block using `SELECT ... FOR UPDATE`.
3. Rewrite the CSV export query using `FETCH FIRST n ROWS ONLY` instead of MySQL's `LIMIT`.
4. Write the "second-highest value" and "Nth-highest via DENSE_RANK" queries from your interview prep guide against this schema, for real, and check the results.

Now "I built this in MySQL, then ported the schema to Oracle to work through the PL/SQL differences" (from your prep guide's resume section) is a true statement with specifics behind it, not a talking point.

---

## Part E — Verification Checklist

- [ ] Backend passes `npm test` locally and in CI
- [ ] `terraform validate` and `terraform plan` run clean with no errors
- [ ] Full registration → waitlist → admin login → CSV export flow works against the deployed (not just local) instance
- [ ] You can explain, without notes, why the S3 bucket is public-read but the EC2 security group only opens 80 and 22-from-your-IP
- [ ] You can explain the releases/current symlink pattern in `deploy_remote.sh` and what happens if a health check fails mid-deploy
- [ ] You've completed the Oracle side exercise in Part D and can show a real PL/SQL block you wrote

---

## Part F — Cost and Cleanup

A `t3.micro` EC2 instance and S3 usage at this scale are within the AWS free tier for a new-ish account, but **DynamoDB, data transfer, and an account past its free-tier window are not free** — don't leave this running indefinitely. When you're done practicing with it:

```bash
cd infra
terraform destroy
```

Then manually delete the two bootstrap resources from Part B1 (the state bucket and lock table) if you don't plan to reuse them.

---

## Part G — Mapping This Build Back to Interview Questions

| You built... | Answers this question from your prep guide |
|---|---|
| `asyncHandler` wrapper fixing a real crash | "Describe how you'd debug a Node service that's intermittently timing out in production" |
| The `registered ... FOR UPDATE` transaction | Any question about race conditions or data integrity under concurrent writes |
| The IAM role in `iam_ec2.tf` scoped to one bucket | "How would you scope an IAM role for an EC2 instance that only needs to read from one S3 bucket?" |
| Public vs. private subnet trade-off note in `vpc.tf` | "What's the purpose of a VPC's public vs. private subnets?" — plus a real, defensible reason you *didn't* use one here |
| GitHub OIDC role instead of stored AWS keys | Any CI/CD or security-minded question — bring this up even if not asked directly |
| The releases/current symlink + health-check rollback | A strong, concrete answer to "tell me about a deploy that didn't go as planned" even before one actually breaks |
| The Claude Code prompts you ran in Parts A3/B3/C4 | "Walk me through how you actually use an AI coding assistant day to day" |

You now have a real, running, AWS-deployed project that echoes the actual Thermo Fisher webinar registration form you built in 2021 — use that connection explicitly when you talk about this project in the interview.
