# Copyright © 2024–2026 Jasper Ford
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# Project NEXUS - Database Migration & Operations Makefile
# ========================================================
# Canonical migration workflow. All schema changes go through these targets.
#
# Prerequisites:
#   - Docker Compose running: docker compose up -d
#   - For production: NEXUS_DEPLOY_HOST and SSH key configured
#
# Usage:
#   make migrate NAME=AddNewFeature      # Create + apply migration locally
#   make migrate-apply                    # Apply pending migrations locally
#   make migrate-prod                     # Apply pending migrations on production
#   make backup-prod-db                   # Backup production database
#   make drift-check                      # Compare local vs production migrations
#   make migrate-status                   # Show local migration status
#   make migrate-list                     # List all migrations

.DEFAULT_GOAL := help
SHELL := /bin/bash

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
PROJECT      := src/Nexus.Api
COMPOSE      := docker compose
CONTAINER_DB := nexus-backend-db
PROD_DIR     := /opt/nexus-backend

# Production SSH (set via environment variables, never hardcoded)
SSH_HOST     := $(NEXUS_DEPLOY_HOST)
SSH_KEY_PATH := $(or $(wildcard $(HOME)/.ssh/project-nexus.pem),$(wildcard /c/ssh-keys/project-nexus.pem),$(wildcard C:/ssh-keys/project-nexus.pem))
SSH_CMD      := ssh -i "$(SSH_KEY_PATH)" $(SSH_HOST)

# ---------------------------------------------------------------------------
# Local Development
# ---------------------------------------------------------------------------

## Create and apply a new migration locally (requires NAME=MigrationName)
migrate:
ifndef NAME
	$(error NAME is required. Usage: make migrate NAME=AddSomeFeature)
endif
	@echo "=== Creating migration: $(NAME) ==="
	$(COMPOSE) exec api dotnet ef migrations add $(NAME) \
		--project /app/$(PROJECT)
	@echo ""
	@echo "=== Applying migrations ==="
	$(COMPOSE) exec api dotnet ef database update \
		--project /app/$(PROJECT)
	@echo ""
	@echo "Migration '$(NAME)' created and applied."
	@echo "IMPORTANT: Commit the new migration files in src/Nexus.Api/Migrations/"

## Apply all pending migrations locally (no new migration created)
migrate-apply:
	@echo "=== Applying pending migrations locally ==="
	$(COMPOSE) exec api dotnet ef database update \
		--project /app/$(PROJECT)

## Show current migration status (applied vs pending)
migrate-status:
	@echo "=== Local migration status ==="
	$(COMPOSE) exec api dotnet ef migrations list \
		--project /app/$(PROJECT)

## List all migrations with applied/pending state
migrate-list:
	@echo "=== All migrations ==="
	$(COMPOSE) exec api dotnet ef migrations list \
		--project /app/$(PROJECT)

## Remove the last migration (only if not applied to database)
migrate-rollback:
	@echo "=== Removing last migration ==="
	$(COMPOSE) exec api dotnet ef migrations remove \
		--project /app/$(PROJECT)

## Generate SQL script for all pending migrations (for review)
migrate-script:
	@echo "=== Generating SQL script ==="
	$(COMPOSE) exec api dotnet ef migrations script \
		--idempotent \
		--project /app/$(PROJECT) \
		--output /app/migrations.sql
	@echo "SQL script written to migrations.sql in container"

# ---------------------------------------------------------------------------
# Production
# ---------------------------------------------------------------------------

## Apply pending migrations on production (with backup first)
migrate-prod:
ifndef SSH_HOST
	$(error NEXUS_DEPLOY_HOST is required. Export it as user@host)
endif
	@echo "============================================"
	@echo "  PRODUCTION MIGRATION"
	@echo "============================================"
	@echo "Target: $(SSH_HOST):$(PROD_DIR)"
	@echo ""
	@read -p "Apply migrations to PRODUCTION? Type YES to confirm: " confirm; \
	if [ "$$confirm" != "YES" ]; then \
		echo "Cancelled."; \
		exit 1; \
	fi
	@echo ""
	@echo "Step 1: Pre-migration backup..."
	$(SSH_CMD) 'set -e; cd $(PROD_DIR); \
		TIMESTAMP=$$(date +%Y%m%d_%H%M%S); \
		mkdir -p backups; \
		sudo docker compose exec -T db pg_dump -U postgres -d nexus_prod --clean --if-exists \
			| gzip > "backups/pre_migrate_$${TIMESTAMP}.sql.gz"; \
		echo "Backup: pre_migrate_$${TIMESTAMP}.sql.gz"'
	@echo ""
	@echo "Step 2: Applying migrations..."
	$(SSH_CMD) 'set -e; cd $(PROD_DIR); \
		sudo docker compose exec -T api dotnet ef database update \
			--project /app/$(PROJECT); \
		echo "Migrations applied successfully."'
	@echo ""
	@echo "Step 3: Health check..."
	$(SSH_CMD) 'STATUS=$$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5080/health); \
		if [ "$$STATUS" = "200" ]; then \
			echo "Health check PASSED"; \
		else \
			echo "WARNING: Health check returned HTTP $$STATUS"; \
			echo "Check logs: sudo docker compose logs --tail 50 api"; \
		fi'

## Show pending migrations on production
migrate-prod-status:
ifndef SSH_HOST
	$(error NEXUS_DEPLOY_HOST is required. Export it as user@host)
endif
	@echo "=== Production migration status ==="
	$(SSH_CMD) 'cd $(PROD_DIR); \
		sudo docker compose exec -T api dotnet ef migrations list \
			--project /app/$(PROJECT)'

## Backup production database
backup-prod-db:
ifndef SSH_HOST
	$(error NEXUS_DEPLOY_HOST is required. Export it as user@host)
endif
	@echo "=== Production database backup ==="
	$(SSH_CMD) 'set -e; cd $(PROD_DIR); \
		TIMESTAMP=$$(date +%Y%m%d_%H%M%S); \
		mkdir -p backups; \
		sudo docker compose exec -T db pg_dump -U postgres -d nexus_prod --clean --if-exists \
			| gzip > "backups/manual_$${TIMESTAMP}.sql.gz"; \
		SIZE=$$(ls -lh "backups/manual_$${TIMESTAMP}.sql.gz" | awk "{print \$$5}"); \
		echo "Backup created: manual_$${TIMESTAMP}.sql.gz ($$SIZE)"; \
		ls -t backups/manual_*.sql.gz 2>/dev/null | tail -n +31 | xargs -r rm --; \
		echo "Rotated backups (keeping last 30)"'

# ---------------------------------------------------------------------------
# Drift Check
# ---------------------------------------------------------------------------

## Compare local vs production migration history
drift-check:
ifndef SSH_HOST
	@echo "=== Local-only drift check (no production access) ==="
	@echo "Checking for uncommitted model changes..."
	$(COMPOSE) exec api dotnet ef migrations has-pending-model-changes \
		--project /app/$(PROJECT) \
		&& echo "WARNING: Model has changes without a migration!" \
		|| echo "OK: Model matches last migration."
	@echo ""
	@echo "To compare with production, set NEXUS_DEPLOY_HOST and re-run."
else
	@echo "=== Migration drift check: Local vs Production ==="
	@bash scripts/migration-drift-check.sh
endif

# ---------------------------------------------------------------------------
# Convenience
# ---------------------------------------------------------------------------

## Rebuild and restart the API container
rebuild:
	$(COMPOSE) build api && $(COMPOSE) up -d api

## View API logs
logs:
	$(COMPOSE) logs -f api

## Run tests (on host, not Docker)
test:
	dotnet test Nexus.sln --configuration Release

## Start the full stack
up:
	$(COMPOSE) up -d

## Stop the full stack
down:
	$(COMPOSE) down

## Reset database (destroys all data)
reset-db:
	@read -p "This will DESTROY all local data. Type YES to confirm: " confirm; \
	if [ "$$confirm" != "YES" ]; then \
		echo "Cancelled."; \
		exit 1; \
	fi
	$(COMPOSE) down -v
	$(COMPOSE) up -d

# ---------------------------------------------------------------------------
# Help
# ---------------------------------------------------------------------------

## Show this help
help:
	@echo ""
	@echo "Project NEXUS - Available targets:"
	@echo "==================================="
	@echo ""
	@echo "LOCAL DEVELOPMENT:"
	@echo "  make migrate NAME=<Name>  Create + apply migration"
	@echo "  make migrate-apply        Apply pending migrations"
	@echo "  make migrate-status       Show migration status"
	@echo "  make migrate-list         List all migrations"
	@echo "  make migrate-rollback     Remove last unapplied migration"
	@echo "  make migrate-script       Generate idempotent SQL script"
	@echo ""
	@echo "PRODUCTION:"
	@echo "  make migrate-prod         Apply migrations (with backup)"
	@echo "  make migrate-prod-status  Show production migration status"
	@echo "  make backup-prod-db       Backup production database"
	@echo ""
	@echo "DRIFT CHECK:"
	@echo "  make drift-check          Compare local vs production migrations"
	@echo ""
	@echo "OPERATIONS:"
	@echo "  make rebuild              Rebuild + restart API"
	@echo "  make logs                 Follow API logs"
	@echo "  make test                 Run tests"
	@echo "  make up                   Start stack"
	@echo "  make down                 Stop stack"
	@echo "  make reset-db             Reset database (destroys data)"
	@echo ""
	@echo "ENVIRONMENT VARIABLES:"
	@echo "  NEXUS_DEPLOY_HOST         Production SSH target (user@host)"
	@echo "  JWT_SECRET                JWT signing key (required)"
	@echo ""
