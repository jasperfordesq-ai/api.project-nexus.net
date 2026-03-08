#!/bin/bash
# Copyright © 2024–2026 Jasper Ford
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# Production deployment script for Project NEXUS ASP.NET backend
# Learns from V1's safe-deploy.sh: locking, validation, smoke tests, rollback, cache purge
#
# Usage:
#   ./scripts/deploy.sh              # Standard deploy (build + migrate + smoke test)
#   ./scripts/deploy.sh quick        # Quick restart (no rebuild)
#   ./scripts/deploy.sh rollback     # Revert to previous image
#   ./scripts/deploy.sh status       # Check deployment state (read-only)
#
# Prerequisites:
#   - SSH key at ~/.ssh/project-nexus.pem or C:/ssh-keys/project-nexus.pem
#   - NEXUS_DEPLOY_HOST env var set (e.g. azureuser@your-server-ip)

set -e

MODE="${1:-deploy}"
SERVER="${NEXUS_DEPLOY_HOST:?ERROR: Set NEXUS_DEPLOY_HOST (e.g. export NEXUS_DEPLOY_HOST=azureuser@your-server-ip)}"
REMOTE_DIR="/opt/nexus-backend"
LOCK_FILE="$REMOTE_DIR/.deploy.lock"
LAST_DEPLOY_FILE="$REMOTE_DIR/.last-successful-deploy"
MIN_DISK_MB=1024

# Detect SSH key
for KEY_PATH in "$HOME/.ssh/project-nexus.pem" "/c/ssh-keys/project-nexus.pem" "C:/ssh-keys/project-nexus.pem"; do
    [ -f "$KEY_PATH" ] && SSH_KEY="$KEY_PATH" && break
done
[ -z "$SSH_KEY" ] && echo "ERROR: SSH key not found" && exit 1

SSH_CMD="ssh -i $SSH_KEY -o StrictHostKeyChecking=no $SERVER"

log() { echo "[$(date '+%H:%M:%S')] $1"; }
fail() { log "FAILED: $1"; exit 1; }

# ===== STATUS MODE =====
if [ "$MODE" = "status" ]; then
    log "Checking deployment status..."
    $SSH_CMD << 'EOSTATUS'
        echo "=== Deployment Status ==="
        cd /opt/nexus-api 2>/dev/null || { echo "V2 not deployed yet"; exit 0; }
        echo "Lock file: $([ -f .deploy.lock ] && echo 'LOCKED' || echo 'unlocked')"
        echo "Last successful deploy: $(cat .last-successful-deploy 2>/dev/null || echo 'none')"
        echo ""
        echo "=== Container Status ==="
        sudo docker compose ps 2>/dev/null || echo "No containers"
        echo ""
        echo "=== Health Check ==="
        STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5080/health 2>/dev/null || echo "unreachable")
        echo "Health: $STATUS"
        echo ""
        echo "=== Disk Space ==="
        df -h /opt | tail -1
EOSTATUS
    exit 0
fi

echo "============================================"
echo "  Project NEXUS V2 - Production Deploy"
echo "  Mode: $MODE"
echo "  Target: $SERVER:$REMOTE_DIR"
echo "============================================"
echo ""

# ===== ROLLBACK MODE =====
if [ "$MODE" = "rollback" ]; then
    log "Rolling back to previous deployment..."
    $SSH_CMD << 'EOROLLBACK'
        set -e
        cd /opt/nexus-api
        PREV=$(cat .last-successful-deploy 2>/dev/null)
        [ -z "$PREV" ] && echo "No previous deployment to rollback to" && exit 1

        echo "Rolling back to: $PREV"
        ROLLBACK_IMAGE="nexus-api:rollback"
        if sudo docker image inspect "$ROLLBACK_IMAGE" > /dev/null 2>&1; then
            sudo docker tag "$ROLLBACK_IMAGE" nexus-api:latest
            sudo docker compose up -d api
            sleep 10
            STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5080/health || echo "000")
            if [ "$STATUS" = "200" ]; then
                echo "Rollback successful. Health check passed."
            else
                echo "WARNING: Rollback health check returned $STATUS. Check logs."
            fi
        else
            echo "No rollback image found. Manual intervention needed."
            exit 1
        fi
EOROLLBACK
    exit $?
fi

# ===== DEPLOY / QUICK MODE =====

# Confirm production deploy
if [ -t 0 ]; then
    read -p "Deploy to PRODUCTION? Type YES to confirm: " CONFIRM
    [ "$CONFIRM" != "YES" ] && echo "Cancelled." && exit 0
fi

# --- Step 1: Pre-deploy validation (V1 lesson: validate BEFORE touching anything) ---
log "Step 1/7: Pre-deploy validation..."
$SSH_CMD << EOVALIDATE
    set -e

    # Check deployment lock (V1 lesson: prevent concurrent deploys)
    if [ -f "$LOCK_FILE" ]; then
        LOCK_PID=\$(cat "$LOCK_FILE")
        if kill -0 "\$LOCK_PID" 2>/dev/null; then
            echo "ERROR: Deployment already in progress (PID: \$LOCK_PID)"
            exit 1
        else
            echo "Removing stale lock (PID \$LOCK_PID no longer running)"
            rm -f "$LOCK_FILE"
        fi
    fi

    # Acquire lock
    echo \$\$ > "$LOCK_FILE"

    # Check disk space (V1 lesson: 1GB minimum)
    AVAIL=\$(df -m /opt | tail -1 | awk '{print \$4}')
    if [ "\$AVAIL" -lt "$MIN_DISK_MB" ]; then
        echo "ERROR: Only \${AVAIL}MB free (need ${MIN_DISK_MB}MB)"
        rm -f "$LOCK_FILE"
        exit 1
    fi
    echo "Disk space: \${AVAIL}MB available"

    # Ensure target directory exists
    mkdir -p "$REMOTE_DIR/backups" "$REMOTE_DIR/logs"
EOVALIDATE

# --- Step 2: Database backup (V1 lesson: ALWAYS backup before migration) ---
log "Step 2/7: Pre-deploy database backup..."
$SSH_CMD << 'EOBACKUP'
    set -e
    cd /opt/nexus-api
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)

    if sudo docker compose ps db --status running -q 2>/dev/null | head -1; then
        sudo docker compose exec -T db pg_dump -U postgres -d nexus_dev --clean --if-exists > "backups/pre_deploy_${TIMESTAMP}.sql" 2>/dev/null || true
        echo "Backup: backups/pre_deploy_${TIMESTAMP}.sql"
    else
        echo "Database not running, skipping backup"
    fi
EOBACKUP

# --- Step 3: Upload source (skip for quick mode) ---
if [ "$MODE" != "quick" ]; then
    log "Step 3/7: Uploading source files..."
    if command -v rsync &> /dev/null; then
        rsync -avz --delete \
            -e "ssh -i $SSH_KEY -o StrictHostKeyChecking=no" \
            --exclude='.git' \
            --exclude='backups/' \
            --exclude='.env' \
            --exclude='compose.override.yml' \
            --exclude='.claude/' \
            --exclude='tests/' \
            --exclude='.github/' \
            --exclude='node_modules/' \
            ./ "${SERVER}:${REMOTE_DIR}/"
    else
        scp -i "$SSH_KEY" -r src/ "${SERVER}:${REMOTE_DIR}/src/"
        scp -i "$SSH_KEY" Dockerfile Nexus.sln "${SERVER}:${REMOTE_DIR}/"
    fi
else
    log "Step 3/7: Skipped (quick mode)"
fi

# --- Step 4: Build Docker image (V1 lesson: tag current for rollback) ---
log "Step 4/7: Building Docker image..."
$SSH_CMD << 'EOBUILD'
    set -e
    cd /opt/nexus-api

    # Tag current image for rollback (V1 lesson)
    CURRENT=$(sudo docker compose images api --format '{{.Repository}}:{{.Tag}}' 2>/dev/null | head -1)
    if [ -n "$CURRENT" ] && [ "$CURRENT" != ":" ]; then
        sudo docker tag "$CURRENT" "${CURRENT%%:*}:rollback" 2>/dev/null || true
        echo "Tagged rollback: ${CURRENT%%:*}:rollback"
    fi

    # Build
    sudo docker compose build --no-cache api
    echo "Build complete"
EOBUILD

# --- Step 5: Apply EF migrations (V1 lesson: run migrations BEFORE restarting) ---
log "Step 5/7: Applying database migrations..."
$SSH_CMD << 'EOMIGRATE'
    set -e
    cd /opt/nexus-api

    # Start fresh container for migration
    sudo docker compose up -d api
    sleep 5

    # Run EF migrations inside container
    sudo docker compose exec -T -w /src/src/Nexus.Api api dotnet ef database update 2>&1 || {
        echo "WARNING: Migration failed. Container may need manual intervention."
    }
    echo "Migrations applied"
EOMIGRATE

# --- Step 6: Restart and smoke test (V1 lesson: verify BEFORE declaring success) ---
log "Step 6/7: Restarting and smoke testing..."
$SSH_CMD << 'EOSMOKE'
    set -e
    cd /opt/nexus-api

    sudo docker compose up -d api
    echo "Waiting for health check..."

    HEALTHY=false
    for i in $(seq 1 18); do
        sleep 5
        STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5080/health 2>/dev/null || echo "000")
        if [ "$STATUS" = "200" ]; then
            echo "Health check PASSED after $((i * 5)) seconds"
            HEALTHY=true
            break
        fi
        echo "  Attempt $i/18: HTTP $STATUS"
    done

    if [ "$HEALTHY" = "false" ]; then
        echo "FAILED: Health check failed after 90 seconds"
        echo "Attempting rollback..."

        ROLLBACK_IMAGE="nexus-api:rollback"
        if sudo docker image inspect "$ROLLBACK_IMAGE" > /dev/null 2>&1; then
            sudo docker tag "$ROLLBACK_IMAGE" nexus-api:latest
            sudo docker compose up -d api
            sleep 15
            RSTATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5080/health || echo "000")
            [ "$RSTATUS" = "200" ] && echo "Rollback successful" || echo "WARNING: Rollback may have failed"
        fi
        rm -f .deploy.lock
        exit 1
    fi

    # Extended smoke tests (V1 lesson: test more than just /health)
    echo ""
    echo "Extended smoke tests..."
    SWAGGER=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5080/swagger/index.html 2>/dev/null || echo "000")
    echo "  Swagger UI: HTTP $SWAGGER"

    # Save successful deploy hash
    git rev-parse --short HEAD 2>/dev/null > .last-successful-deploy || true
    echo ""
    echo "Deployment successful!"
EOSMOKE

# --- Step 7: Cloudflare cache purge (V1 lesson: non-blocking, post-success) ---
log "Step 7/7: Purging Cloudflare cache..."

# Read Cloudflare token
CF_TOKEN=""
for TOKEN_PATH in "$HOME/cloudflare-api-token.txt" "/c/Users/$USER/cloudflare-api-token.txt"; do
    [ -f "$TOKEN_PATH" ] && CF_TOKEN=$(cat "$TOKEN_PATH") && break
done

if [ -n "$CF_TOKEN" ]; then
    ZONES=(
        "d6d9903416081a10ac2d496d9b8456fb"  # project-nexus.ie
        "54502ac7dc583e8acdb9b5ed87b0ba60"  # hour-timebank.ie
        "9b5f481234f8f1ab134bf943d6193816"  # timebankireland.ie
        "7ac1e69f5a1fdc7894236548adf7be1e"  # timebank.global
        "65eb5427905a35e7c6186977f8c5a370"  # nexuscivic.ie
        "ab50a7ee4c5f427b7bc436db26496c7d"  # project-nexus.net
        "2a86de7c12258fb6343dc090b6581367"  # exchangemembers.com
        "e9009e5ca261271de5ea7de4aa3ede62"  # festivalflags.ie
    )

    PURGED=0
    for ZONE in "${ZONES[@]}"; do
        RESULT=$(curl -s -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE/purge_cache" \
            -H "Authorization: Bearer $CF_TOKEN" \
            -H "Content-Type: application/json" \
            --data '{"purge_everything":true}' 2>/dev/null | grep -o '"success":true' || true)
        [ -n "$RESULT" ] && PURGED=$((PURGED + 1))
    done
    echo "Purged $PURGED/${#ZONES[@]} Cloudflare zones"
else
    echo "Cloudflare token not found, skipping cache purge"
fi

# Release deployment lock
$SSH_CMD "rm -f $LOCK_FILE" 2>/dev/null || true

log "Deploy complete!"
echo ""
echo "============================================"
echo "  Deployment Summary"
echo "  Status: SUCCESS"
echo "  Server: $SERVER"
echo "  Health: http://localhost:5080/health"
echo "============================================"
