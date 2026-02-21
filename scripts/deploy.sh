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

SERVER="azureuser@20.224.171.253"
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
  sudo docker compose build --no-cache api
  sudo docker compose up -d api

  echo "Waiting for health check..."
  for i in $(seq 1 18); do
    sleep 5
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5080/health || echo "000")
    if [ "$STATUS" = "200" ]; then
      echo ""
      echo "Deploy successful! Health check passed after $((i * 5)) seconds."
      exit 0
    fi
    echo "  Attempt $i: HTTP $STATUS"
  done

  echo ""
  echo "WARNING: Health check failed after 90 seconds."
  echo "Check logs: sudo docker compose logs --tail 50 api"
  exit 1
EOF
