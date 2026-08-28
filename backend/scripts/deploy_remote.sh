#!/bin/bash
# Runs ON THE EC2 INSTANCE, invoked remotely via `aws ssm send-command`
# (see .github/workflows/deploy.yml) — never over SSH.
#
# Uses a releases/<timestamp> + "current" symlink pattern: each deploy is
# fully extracted into its own directory, and only the very last step swaps
# the symlink. If anything fails before that swap, the previous release is
# still live and untouched — cheap, simple rollback story for an interview.
set -euxo pipefail

BUCKET="$1"
ARTIFACT_KEY="$2"

APP_ROOT="/opt/app"
RELEASE="$APP_ROOT/releases/$(date +%Y%m%d%H%M%S)"
CURRENT_LINK="$APP_ROOT/current"
SHARED_ENV="$APP_ROOT/shared/env.sh"

# Real secrets (DB_PASSWORD, JWT_SECRET) live in this file, created ONCE by
# hand on the instance and never touched by a deploy — the same "shared
# config outside the release directory" pattern Capistrano popularized.
# One-time setup:
#   sudo mkdir -p /opt/app/shared
#   sudo tee /opt/app/shared/env.sh <<'EOF'
#   export DB_PASSWORD="a-real-password"
#   export JWT_SECRET="$(openssl rand -hex 32)"
#   EOF
if [ -f "$SHARED_ENV" ]; then
  # shellcheck disable=SC1090
  source "$SHARED_ENV"
else
  echo "WARNING: $SHARED_ENV not found — using ecosystem.config.js placeholder secrets" >&2
fi

mkdir -p "$RELEASE"
aws s3 cp "s3://$BUCKET/$ARTIFACT_KEY" /tmp/backend.tar.gz
tar xzf /tmp/backend.tar.gz -C "$RELEASE"

cd "$RELEASE"
npm ci --omit=dev
node src/db/migrate.js   # idempotent: CREATE TABLE IF NOT EXISTS

# Point the symlink at the new release, then (re)start pm2 against it.
ln -sfn "$RELEASE" "$CURRENT_LINK"
pm2 startOrReload "$CURRENT_LINK/ecosystem.config.js" --update-env

# Health check against the new process; roll the symlink back on failure.
sleep 3
if ! curl -sf http://127.0.0.1:4000/health > /dev/null; then
  echo "Health check failed — rolling back symlink"
  PREVIOUS=$(ls -1dt "$APP_ROOT"/releases/*/ | sed -n 2p)
  if [ -n "${PREVIOUS:-}" ]; then
    ln -sfn "${PREVIOUS%/}" "$CURRENT_LINK"
    pm2 startOrReload "$CURRENT_LINK/ecosystem.config.js" --update-env
  fi
  exit 1
fi

echo "Deploy succeeded: $RELEASE"

# Keep the last 5 releases on disk, prune the rest.
ls -1dt "$APP_ROOT"/releases/*/ | tail -n +6 | xargs -r rm -rf
