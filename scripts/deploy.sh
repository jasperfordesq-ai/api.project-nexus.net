#!/bin/bash
# Copyright © 2024–2026 Jasper Ford
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# Manual deployment script for Project NEXUS backend
# Usage: ./scripts/deploy.sh
#
# This is a fallback for when GitHub Actions CD is not available.
# Prefer using the automated deploy workflow when possible.

set -e

SERVER="${NEXUS_DEPLOY_HOST:?ERROR: NEXUS_DEPLOY_HOST not set. Export it as user@host (e.g. export NEXUS_DEPLOY_HOST=azureuser@your-server-ip)}"
REMOTE_DIR="/opt/nexus-backend"

# Detect SSH key location
if [ -f "$HOME/.ssh/project-nexus.pem" ]; then
    SSH_KEY="$HOME/.ssh/project-nexus.pem"
elif [ -f "/c/ssh-keys/project-nexus.pem" ]; then
    SSH_KEY="/c/ssh-keys/project-nexus.pem"
elif [ -f "C:/ssh-keys/project-nexus.pem" ]; then
    SSH_KEY="C:/ssh-keys/project-nexus.pem"
else
    echo "ERROR: SSH key not found. Expected at ~/.ssh/project-nexus.pem or C:/ssh-keys/project-nexus.pem"
    exit 1
fi

echo "============================================"
echo "  Project NEXUS - Manual Deploy"
echo "============================================"
echo ""
echo "Target: $SERVER:$REMOTE_DIR"
echo "SSH Key: $SSH_KEY"
echo ""

read -p "Deploy to PRODUCTION? Type YES to confirm: " CONFIRM
if [ "$CONFIRM" != "YES" ]; then
    echo "Cancelled."
    exit 0
fi

echo ""
echo "Step 1: Pre-deployment backup..."
ssh -i "$SSH_KEY" "$SERVER" << 'EOF'
  set -e
  cd /opt/nexus-backend
  TIMESTAMP=$(date +%Y%m%d_%H%M%S)
  mkdir -p backups
  sudo docker compose exec -T db pg_dump -U postgres -d nexus_prod --clean --if-exists > "backups/pre_deploy_${TIMESTAMP}.sql"
  echo "Backup: pre_deploy_${TIMESTAMP}.sql"
EOF

echo ""
echo "Step 2: Uploading source files..."
rsync -avz --delete \
    -e "ssh -i $SSH_KEY" \
    --exclude='.git' \
    --exclude='backups/' \
    --exclude='.env' \
    --exclude='compose.override.yml' \
    --exclude='*.md' \
    --exclude='.claude/' \
    --exclude='tests/' \
    --exclude='.github/' \
    --exclude='backend_prod_dump.sql' \
    ./ "${SERVER}:${REMOTE_DIR}/"

echo ""
echo "Step 3: Building and restarting API container..."
ssh -i "$SSH_KEY" "$SERVER" << 'EOF'
  set -e
  cd /opt/nexus-backend
  [ ! -f compose.override.yml ] && cp compose.prod.yml compose.override.yml

  # Tag current image so we can rollback on failure
  CURRENT_IMAGE=$(sudo docker compose images api --format '{{.Repository}}:{{.Tag}}' 2>/dev/null | head -1)
  if [ -n "$CURRENT_IMAGE" ] && [ "$CURRENT_IMAGE" != ":" ]; then
    sudo docker tag "$CURRENT_IMAGE" "${CURRENT_IMAGE%%:*}:rollback" 2>/dev/null || true
    echo "Tagged current image for rollback: ${CURRENT_IMAGE%%:*}:rollback"
  fi

  sudo docker compose build --no-cache api
  sudo docker compose up -d api

  echo "Waiting for health check..."
  HEALTHY=false
  for i in $(seq 1 18); do
    sleep 5
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5080/health || echo "000")
    if [ "$STATUS" = "200" ]; then
      echo ""
      echo "Deploy successful! Health check passed after $((i * 5)) seconds."
      HEALTHY=true
      break
    fi
    echo "  Attempt $i: HTTP $STATUS"
  done

  if [ "$HEALTHY" = "false" ]; then
    echo ""
    echo "Health check failed after 90 seconds. Attempting rollback..."
    ROLLBACK_IMAGE="${CURRENT_IMAGE%%:*}:rollback"
    if sudo docker image inspect "$ROLLBACK_IMAGE" > /dev/null 2>&1; then
      sudo docker tag "$ROLLBACK_IMAGE" "$CURRENT_IMAGE"
      sudo docker compose up -d api
      sleep 15
      RSTATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5080/health || echo "000")
      if [ "$RSTATUS" = "200" ]; then
        echo "Rollback successful - previous version restored."
      else
        echo "WARNING: Rollback may have failed. Manual intervention needed."
        echo "Check logs: sudo docker compose logs --tail 50 api"
      fi
    else
      echo "No rollback image available. Manual intervention needed."
      echo "Check logs: sudo docker compose logs --tail 50 api"
    fi
    exit 1
  fi
EOF
