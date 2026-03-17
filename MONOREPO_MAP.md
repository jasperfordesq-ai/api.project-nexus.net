# Project NEXUS -- Monorepo Map

> Keep this file accurate. Claude reads it at the start of every session.

---

## What This Is

A **full-stack monorepo** containing:
- One **ASP.NET Core 8 backend API** (the canonical backend)
- Five **frontend apps** (admin, modern, UK, GOV.IE, React/V1)
- One **Docker Compose file** that runs all of them together

All development is **Docker-only**. No dotnet run. No npm run dev on the host.

---

## Service Map (All 8 Docker Services)

| Service Name | Container | Host Port | Internal Port | Stack | Location |
|---|---|---|---|---|---|
| api | nexus-backend-api | **5080** | 8080 | ASP.NET Core 8 | src/Nexus.Api/ |
| db | nexus-backend-db | (internal) | 5432 | PostgreSQL 16.4 | Docker volume |
| rabbitmq | nexus-backend-rabbitmq | 5672, **15672** | 5672, 15672 | RabbitMQ | Docker volume |
| llama-service | nexus-backend-llama | 11434 | 11434 | Ollama AI | Docker volume |
| admin | nexus-admin-dev | **5190** | 5173 | Refine + Ant Design | apps/admin/ |
| web-modern | nexus-frontend-dev | **5170** | 3002 | Next.js + HeroUI | apps/web-modern/ |
| web-uk | nexus-uk-frontend-dev | **5180** | 3001 | GOV.UK DS (Express) | apps/web-uk/ |
| web-govie | nexus-web-govie | **5200** | 80 | React + Vite + nginx | apps/web-govie/ |
| react-frontend | nexus-react-frontend-dev | **5173** | 5173 | React 18 + Vite + HeroUI | apps/react-frontend/ |

**Bold ports** = open in browser during local dev.

---

## Frontend App Details

### Admin Panel (apps/admin/)

| Property | Value |
|---|---|
| Stack | React 18 + TypeScript + Refine v4 + Ant Design 5 + Vite 6 |
| Dev URL | http://localhost:5190 |
| Package manager | npm |
| Dev mode | Hot reload via volume mount |
| Pages | 36 real pages across 7 nav groups |
| Tests | 25 unit tests (Vitest) |
| Dockerfile dev target | dev |
| Dockerfile prod target | production (nginx static) |
| Auth | JWT via POST /api/auth/login |
| API target | http://api:8080 (Docker) / http://localhost:5080 (browser) |

### Modern Frontend (apps/web-modern/)

| Property | Value |
|---|---|
| Stack | Next.js 16.1.6 + React 19 + TypeScript + Tailwind CSS 4 + HeroUI |
| Dev URL | http://localhost:5170 |
| Package manager | npm |
| Dev mode | Hot reload via volume mount |
| Routes | 57 Next.js routes |
| Tests | 102 Jest tests |
| Dockerfile dev target | dev |
| Dockerfile prod target | production (standalone Next.js server) |
| Real-time | SignalR (@microsoft/signalr 8.0.7) |

### UK Frontend (apps/web-uk/)

| Property | Value |
|---|---|
| Stack | Node.js + Express 4.21 + GOV.UK Frontend 5.6 + Nunjucks |
| Dev URL | http://localhost:5180 |
| Package manager | npm |
| Dev mode | nodemon + sass watch via volume mount |
| Routes | 19 Express route files |
| Dockerfile dev target | development |
| Dockerfile prod target | production (non-root user) |
| CSS build | sass src/assets/scss to public/css |
| Brand check | Script runs on every start, validates non-govt affiliation |

### GOV.IE Frontend (apps/web-govie/)

| Property | Value |
|---|---|
| Stack | React 18 + TypeScript + Vite 5 + @govie-ds/react 1.9 |
| Dev URL | http://localhost:5200 |
| Package manager | **pnpm** -- ONLY app using pnpm |
| Pages | 14 pages |
| Dockerfile | Two-stage: pnpm build then nginx alpine |
| Build mode | Production nginx -- NO hot-reload. Rebuild to see changes. |
| Build args | VITE_API_BASE_URL, VITE_APP_NAME, VITE_APP_VERSION, VITE_TENANT_SLUG |
| Brand rules | Custom teal #006B6B / amber #C8640C. Non-affiliation disclaimer MANDATORY. |

> GOV.IE IMPORTANT: Unlike the other frontends, web-govie has no hot-reload.
> To see code changes: docker compose build web-govie && docker compose up -d web-govie

### React Frontend (apps/react-frontend/)

| Property | Value |
|---|---|
| Stack | React 18 + TypeScript + Vite + Tailwind CSS + HeroUI + i18next |
| Dev URL | http://localhost:5173 |
| Production domain | platform.project-nexus.net |
| Package manager | npm |
| Dev mode | Hot reload via volume mount (Vite HMR) |
| Pages | ~200 pages/components (largest frontend) |
| Tests | Vitest suite |
| Dockerfile dev target | dev |
| Dockerfile prod target | production (nginx static) |
| Real-time | SignalR (@microsoft/signalr 8.0.7) |
| Auth | JWT via POST /api/auth/login |
| Passkeys | WebAuthn via /passkeys/* endpoints |
| Origin | V1 PHP React frontend, converted for ASP.NET Core 8 backend |
| API adapter | `normalizeEndpoint()` strips /v2/ prefix; `camelToSnake`/`snakeToCamel` transforms |

---

## Deployment Commands

### Start Services

    # Start everything (all 7 services)
    docker compose up -d

    # Backend only (no frontends)
    docker compose up -d api db rabbitmq

    # Backend + one specific frontend
    docker compose up -d api db rabbitmq admin
    docker compose up -d api db rabbitmq web-modern
    docker compose up -d api db rabbitmq web-uk
    docker compose up -d api db rabbitmq web-govie
    docker compose up -d api db rabbitmq react-frontend

    # Add a frontend to an already-running backend
    docker compose up -d admin
    docker compose up -d web-modern
    docker compose up -d web-uk
    docker compose up -d web-govie
    docker compose up -d react-frontend

### Rebuild After Code Changes

    docker compose build api && docker compose up -d api
    docker compose build admin && docker compose up -d admin
    docker compose build web-modern && docker compose up -d web-modern
    docker compose build web-uk && docker compose up -d web-uk
    docker compose build web-govie && docker compose up -d web-govie
    docker compose build react-frontend && docker compose up -d react-frontend

    # Rebuild everything
    docker compose build && docker compose up -d

    # Force rebuild (ignore layer cache)
    docker compose build --no-cache api
    docker compose build --no-cache web-govie
    docker compose build --no-cache react-frontend

### Logs

    docker compose logs -f              # All services
    docker compose logs -f api          # API only
    docker compose logs -f admin        # Admin panel
    docker compose logs -f web-modern   # Modern frontend
    docker compose logs -f web-uk       # UK frontend
    docker compose logs -f web-govie    # GOV.IE frontend
    docker compose logs -f react-frontend # React frontend (V1)

### Stop / Clean

    docker compose down                 # Stop all, keep data (volumes preserved)
    docker compose down -v              # Stop all, delete data (clean slate)
    docker compose stop web-uk          # Stop one service

### Status

    docker compose ps
    curl http://localhost:5080/health

---

## Database

    docker compose exec db psql -U postgres -d nexus_dev
    docker compose exec api dotnet ef migrations add <MigrationName>
    docker compose exec api dotnet ef database update
    scripts/db-backup.sh
    scripts/db-restore.sh <backup-file>

---

## AI Model (Ollama)

    docker compose exec llama-service ollama pull llama3.2:3b     # fast dev model
    docker compose exec llama-service ollama pull llama3.2:11b    # smarter, 12GB+ RAM
    docker compose exec llama-service ollama list

---

## Testing

    dotnet test                              # Backend integration tests (run on HOST)
    cd e2e && npx playwright test            # E2E (requires Docker stack running)
    cd apps/admin && npm test                # Admin unit tests
    cd apps/web-modern && npm test           # Modern frontend tests

---

## Production Deployment

Rule: Never touch production directly. Fix locally, then test, then deploy.

### Production URLs

| App | URL | Status |
|---|---|---|
| API | https://api.project-nexus.net | Live |
| AI (Ollama) | https://ai.project-nexus.net | Live |
| Modern Frontend | https://app.project-nexus.net | Live |
| UK Frontend | https://uk.project-nexus.net | Live |
| GOV.IE Frontend | https://ie.project-nexus.net | Not yet deployed |
| Admin Panel | https://admin.project-nexus.net | Not yet deployed |

### Production Architecture

    Internet -> Plesk nginx (SSL termination)
                  -> /etc/nginx/conf.d/*.conf (reverse proxy configs)
                  -> Docker containers (127.0.0.1 only)

### Production Server Paths (post-monorepo, 2026-03-08)

| Component | Path |
|---|---|
| All code | /opt/nexus-backend/ |
| API | /opt/nexus-backend/src/Nexus.Api/ |
| Admin panel | /opt/nexus-backend/apps/admin/ |
| Modern frontend | /opt/nexus-backend/apps/web-modern/ |
| UK frontend | /opt/nexus-backend/apps/web-uk/ |
| GOV.IE frontend | /opt/nexus-backend/apps/web-govie/ |
| nginx configs | /etc/nginx/conf.d/ |

> MIGRATION NOTE: Before 2026-03-08, UK was at /opt/nexus-uk-frontend/ and Modern was at
> /opt/nexus-modern-frontend/. These paths are now STALE. Update nginx configs on next deploy.

### Production Deploy Commands

    cd /opt/nexus-backend
    cp compose.prod.yml compose.override.yml
    git pull origin main
    docker compose build
    docker compose up -d
    docker compose ps
    curl https://api.project-nexus.net/health

    # Deploy individual frontend only
    docker compose build web-uk && docker compose up -d web-uk
    docker compose build admin && docker compose up -d admin
    docker compose build web-govie && docker compose up -d web-govie

---

## Environment Variables

### Required for API

| Variable | Notes |
|---|---|
| JWT_SECRET | 32+ chars, must match PHP system |
| Cors__AllowedOrigins__* | One per frontend; env vars only -- NOT appsettings.json |
| ConnectionStrings__DefaultConnection | PostgreSQL connection string |

### CORS Origins Reference

    # Local development (already in compose.yml)
    Cors__AllowedOrigins__0=http://localhost:5080
    Cors__AllowedOrigins__1=http://localhost:5170
    Cors__AllowedOrigins__2=http://localhost:5180
    Cors__AllowedOrigins__3=http://localhost:5190
    Cors__AllowedOrigins__4=http://localhost:5200

    # Production (compose.override.yml or appsettings.Production.json)
    Cors__AllowedOrigins__0=https://api.project-nexus.net
    Cors__AllowedOrigins__1=https://app.project-nexus.net
    Cors__AllowedOrigins__2=https://uk.project-nexus.net
    Cors__AllowedOrigins__3=https://admin.project-nexus.net
    Cors__AllowedOrigins__4=https://ie.project-nexus.net

### Frontend Env Files

| App | File | Key Variables |
|---|---|---|
| web-modern | apps/web-modern/.env.docker | NEXT_PUBLIC_API_URL=http://localhost:5080 |
| web-uk | apps/web-uk/.env.docker | API_BASE_URL=http://localhost:5080, COOKIE_SECRET=dev-secret |
| web-govie | Build args in compose.yml | VITE_API_BASE_URL, VITE_APP_NAME, VITE_TENANT_SLUG |

---

## Package Manager Rules

| App | Manager | Note |
|---|---|---|
| apps/admin/ | npm | npm install, npm run dev |
| apps/web-modern/ | npm | npm install, npm run dev |
| apps/web-uk/ | npm | npm install, npm run dev |
| apps/web-govie/ | **pnpm** | pnpm install, pnpm dev -- DO NOT use npm here |

---

## Test Credentials (Local Only)

| Email | Password | Role | Tenant |
|---|---|---|---|
| admin@acme.test | Test123! | admin | acme |
| member@acme.test | Test123! | member | acme |
| admin@globex.test | Test123! | admin | globex |

---

## Repository Layout

    asp.net-backend/
    -- compose.yml               <- SOURCE OF TRUTH (7 services)
    -- compose.prod.yml          <- Production overrides
    -- Dockerfile                <- API multi-stage build
    -- Nexus.sln
    -- src/Nexus.Api/            <- ASP.NET Core 8 backend
    --     Controllers/          <- 107 controllers, ~723 endpoints
    --     Services/             <- 83 services
    --     Entities/             <- 141 EF Core entities
    --     Hubs/                 <- SignalR MessagesHub
    --     Migrations/
    -- tests/
    --     Nexus.Api.Tests/      <- Integration tests (Testcontainers)
    --     Nexus.Messaging.Tests/
    -- e2e/                      <- Playwright E2E tests
    -- apps/
    --     admin/                <- port 5190
    --     web-modern/           <- port 5170
    --     web-uk/               <- port 5180
    --     web-govie/            <- port 5200
    -- scripts/
    --     db-backup.sh
    --     db-restore.sh
    --     deploy.sh

---

## Key Documents

| File | Purpose |
|---|---|
| CLAUDE.md | Master project instructions -- AI reads this every session |
| MONOREPO_MAP.md | This file -- structure and all deployment commands |
| DOCKER_CONTRACT.md | Docker rules and guaranteed command reference |
| MASTER_DEPLOYMENT_CHECKLIST.md | Full 9-phase production deployment checklist |
| FRONTEND_INTEGRATION.md | API integration guide for member-facing frontends |
| ADMIN_INTEGRATION.md | Admin panel API patterns and 70+ admin endpoints |
| .claude/production-server.md | Production server SSH, nginx configs, paths |

---

## Monorepo Migration History (2026-03-08)

| Old location | New canonical location |
|---|---|
| ../nexus-admin/ | apps/admin/ |
| ../nexus-modern-frontend/ | apps/web-modern/ |
| ../nexus-uk-frontend/ | apps/web-uk/ |
| (created directly in monorepo) | apps/web-govie/ |

One compose.yml now controls all 7 services. One git push covers everything.
Old external folders still exist on disk but are no longer maintained.

---

## Docker: What Actually Runs in Docker

All 4 frontend apps and the backend run in the same compose.yml. Confirmed from compose.yml:

| Service | Mode | depends_on api? | Health check? |
|---|---|---|---|
| api | Production build | -- (is the dependency) | YES (curl /health) |
| db | -- | api depends on db | YES (pg_isready) |
| rabbitmq | -- | api depends on rabbitmq | YES (rabbitmq-diagnostics) |
| llama-service | -- | api depends on started | YES (curl /api/tags) |
| admin | Dev (hot reload) | YES (api healthy) | no |
| web-modern | Dev (hot reload) | no | no |
| web-uk | Dev (hot reload) | no | no |
| web-govie | Prod nginx | no | YES (wget /health) |

Notes:
- web-modern and web-uk will start even if API is not up yet. They will just show errors
  until the API becomes healthy. This is by design (frontends are client-side).
- admin waits for api to be healthy before starting -- prevents wasted hot-reload cycles.
- web-govie is the only frontend running in production nginx mode (not dev server).

Hot reload (live edit, no rebuild required):
- admin, web-modern, web-uk: source is volume-mounted -- save file, see change instantly
- web-govie: NO hot reload -- must rebuild: docker compose build web-govie && docker compose up -d web-govie

---

## V1 Deployment Lessons (Applied to V2)

The legacy PHP V1 codebase (C:\platforms\htdocs\staging) has production-grade deployment
infrastructure built up over years. Key patterns and how they apply to V2:

### 1. Makefile as the Command Hub (V1 has it, V2 has it)

V1 Makefile targets:
    make dev                     # Start Docker
    make migrate FILE=...        # Run migration locally
    make migrate-prod FILE=...   # Run on production
    make migrate-prod-dry FILE=..# Dry-run first
    make backup-prod-db          # Backup production database
    make drift-check             # Compare local vs prod migrations
    make build                   # Build frontend
    make test                    # Run all tests

V2 has a Makefile too. Use it. Add targets for frontend builds if missing.

### 2. Always Backup Before Production Migration (V1 lesson)

V1 always auto-backups DB before any production migration:
    1. SSH to server
    2. Take snapshot: /opt/nexus-php/backups/manual_backup_YYYYMMDD_HHMMSS.sql
    3. Verify dump with marker
    4. Only then apply migration

V2 equivalent:
    scripts/db-backup.sh                             # run this FIRST
    docker compose exec api dotnet ef database update

Always do: backup -> apply -> verify. Never migrate cold.

### 3. Entrypoint Script Pattern (V1 uses it, V2 could benefit)

V1 container entrypoint does:
    1. Wait for MySQL / Redis / Vault with netcat checks
    2. Run migrations if RUN_MIGRATIONS=true
    3. Clear and warm caches
    4. Set directory permissions
    5. Then start the main process

V2: The ASP.NET API auto-migrates on startup (db.Database.MigrateAsync() in Program.cs).
The api service depends_on db (healthy), so migration runs after DB is ready.
No entrypoint script needed for V2 currently.

### 4. Docker Profiles for Optional Tools (V1 lesson)

V1 uses Docker profiles to opt into optional services:
    docker compose --profile tools up -d      # includes phpMyAdmin on :8091
    docker compose --profile monitoring up -d # includes DataDog

V2 could add profiles for:
    docker compose --profile tools up -d      # add Adminer (DB browser)
    docker compose --profile monitoring up -d # add Prometheus/Grafana
Currently V2 has no profiles -- everything is always-on.

### 5. Redis for Caching and Sessions (V1 uses it)

V1 has Redis in compose: CACHE_DRIVER=redis, SESSION_DRIVER=file, QUEUE_CONNECTION=sync
V2 does NOT have Redis -- uses in-memory cache for passkey challenges (5min TTL).
If session scaling becomes an issue, add Redis to compose.yml.

### 6. Feature Flags via Env Vars (V1 pattern)

V1 controls features with env vars:
    FEATURE_AI_CHAT=true
    FEATURE_GAMIFICATION=true
    FEATURE_FEDERATION=false
    FEATURE_WEBPUSH=true

V2 does not have formal feature flags yet.
Consider adding to appsettings or environment for tenant-specific feature control.

### 7. Production SSH Key Auth (Both use it)

V1 production: Azure VM (azureuser@20.224.171.253) via project-nexus.pem
V2 production: Plesk server (see .claude/production-server.md for connection details)
Both use SSH key auth -- credentials in local password manager, not in repo.

### 8. Migration Drift Detection (V1 has it)

V1: make drift-check compares local vs production migration state
V2: scripts/migration-drift-check.sh or .bat -- use it before production deploys
    scripts/migration-drift-check.bat    # Windows
    scripts/migration-drift-check.sh     # Linux/Mac

### 9. Structured JSON Logging in Nginx (V1 does it)

V1 nginx config has two log formats: combined and JSON.
JSON format includes request_time and upstream times for monitoring.
V2 nginx configs are in /etc/nginx/conf.d/ on the production server.
Consider adding JSON log format to V2 nginx configs for easier log parsing.

### 10. Backup Location and Listing (V1 pattern to adopt)

V1 backup script:
    - Creates timestamped backup at /opt/nexus-php/backups/
    - Prints the restore command immediately after backup
    - Lists recent backups after completion

V2 backup script (scripts/db-backup.sh) should do the same.
Recommended backup path: /opt/nexus-backend/backups/ on production server.

### 11. V1 vs V2 Infrastructure Comparison

| Aspect | V1 (PHP) | V2 (ASP.NET) |
|---|---|---|
| Language | PHP 8.2 | C# / ASP.NET Core 8 |
| Database | MariaDB 10.11 | PostgreSQL 16.4 |
| Web server | Apache (dev) / Nginx+FPM (prod) | Kestrel (always) |
| Cache | Redis 7 | In-memory (ASP.NET IMemoryCache) |
| Queue | RabbitMQ (sync in dev) | RabbitMQ |
| Search | Meilisearch | Meilisearch |
| AI | OpenAI / Gemini / Anthropic / Ollama | Ollama (local) |
| Real-time | Pusher | SignalR |
| Production server | Azure VM | Plesk-managed Linux server |
| Migrations | SQL files in migrations/ folder | EF Core migrations |
| Backup | scripts/backup-production-db.sh | scripts/db-backup.sh |
| Drift check | make drift-check | scripts/migration-drift-check.sh |
| Feature flags | FEATURE_* env vars | Not yet implemented |
| Docker profiles | Yes (tools, monitoring) | No (all services always-on) |
| Cloudflare | Yes (IP trusting configured) | Not configured in nginx yet |

### 12. V1 Production Deploy Sequence (adopt for V2)

V1 deployment sequence:
    1. Run tests locally (make test)
    2. Take database backup (make backup-prod-db)
    3. Check migration drift (make drift-check)
    4. Apply migrations with dry-run first (make migrate-prod-dry FILE=...)
    5. Apply migrations for real (make migrate-prod FILE=...)
    6. Deploy code (git pull + docker compose build + up -d)
    7. Verify health endpoints

V2 recommended sequence:
    1. dotnet test                                     # tests pass?
    2. scripts/db-backup.sh                           # backup FIRST
    3. scripts/migration-drift-check.sh               # any drift?
    4. git pull origin main                           # on server
    5. docker compose build && docker compose up -d   # rebuild + restart
    6. docker compose logs -f api                     # watch startup + migrations
    7. curl https://api.project-nexus.net/health      # verify healthy

---

## Cloudflare / Reverse Proxy Configuration

### Cloudflare Cache Purge -- ALREADY IMPLEMENTED IN V2

V2 has FULL Cloudflare cache purging, ported from V1. Three components:

**1. scripts/deploy.sh (Step 7)** -- Automatic purge after every successful deploy
   Reads token from local Windows path or CLOUDFLARE_API_TOKEN env var.
   Purges all 8 zones. Non-blocking -- deployment succeeds even if purge fails.

**2. scripts/purge-cloudflare-cache.sh** -- Standalone bash script (run on server)
   Usage: bash scripts/purge-cloudflare-cache.sh
   Reads token from /opt/nexus-backend/.cloudflare-api-token or CLOUDFLARE_API_TOKEN

**3. scripts/purge-cloudflare-cache.bat** -- Standalone batch script (Windows dev)
   Usage: scripts\purge-cloudflare-cache.bat
   Reads token from C:\Users\USERNAME\cloudflare-api-token.txt or CLOUDFLARE_API_TOKEN

### All 8 Cloudflare Zone IDs

| Domain | Zone ID | V2 subdomains? |
|---|---|---|
| project-nexus.net | ab50a7ee4c5f427b7bc436db26496c7d | YES -- api, app, uk, ie, admin, ai |
| project-nexus.ie | d6d9903416081a10ac2d496d9b8456fb | V1 domain |
| hour-timebank.ie | 54502ac7dc583e8acdb9b5ed87b0ba60 | V1 domain |
| timebankireland.ie | 9b5f481234f8f1ab134bf943d6193816 | V1 domain |
| timebank.global | 7ac1e69f5a1fdc7894236548adf7be1e | V1 domain |
| nexuscivic.ie | 65eb5427905a35e7c6186977f8c5a370 | V1 domain |
| exchangemembers.com | 2a86de7c12258fb6343dc090b6581367 | V1 domain |
| festivalflags.ie | e9009e5ca261271de5ea7de4aa3ede62 | V1 domain |

Zone IDs are public values -- safe to hardcode in scripts.

### Cloudflare API Token Setup

DO NOT store the token in .env or the repo. Use filesystem:

    # Production server
    echo YOUR_TOKEN > /opt/nexus-backend/.cloudflare-api-token
    chmod 600 /opt/nexus-backend/.cloudflare-api-token

    # Windows dev machine
    # Save to: C:\Users\USERNAME\cloudflare-api-token.txt

    # Or set env var (any platform)
    export CLOUDFLARE_API_TOKEN=your_token_here

Get/create token at: Cloudflare Dashboard -> My Profile -> API Tokens
Scope needed: Zone -> Cache Purge -> Purge for all zones

### Reverse Proxy / IP Forwarding (Current State)

V2 has two layers of proxy-aware config in the API:

1. UseForwardedHeaders (Program.cs line 586)
   Trusts X-Forwarded-For and X-Forwarded-Proto from nginx (127.0.0.1).
   Current chain: Client -> Plesk nginx -> Kestrel -- WORKING CORRECTLY

2. RateLimitingMiddleware -- DefaultTrustedProxies (Docker network CIDRs):
   10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 127.0.0.1
   Configurable via: RateLimiting:TrustedProxies in appsettings

If Cloudflare is ever added in front (current chain works without it), add these
to appsettings.Production.json under RateLimiting:TrustedProxies:
    103.21.244.0/22, 103.22.200.0/22, 103.31.4.0/22, 104.16.0.0/13,
    104.24.0.0/14, 108.162.192.0/18, 131.0.72.0/22, 141.101.64.0/18,
    162.158.0.0/15, 172.64.0.0/13, 173.245.48.0/20, 188.114.96.0/20,
    190.93.240.0/20, 197.234.240.0/22, 198.41.128.0/17
Fetch current Cloudflare IPs: cloudflare.com/ips-v4 and cloudflare.com/ips-v6

### deploy.sh REMOTE_DIR

Fixed 2026-03-08: `REMOTE_DIR` corrected to `/opt/nexus-backend` (was `/opt/nexus-api`).

---
