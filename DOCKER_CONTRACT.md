# Docker Contract - Nexus Backend

**Docker Compose is the source of truth for running this backend locally.**

## Quick Start

```bash
# Start the stack
docker compose up -d

# View logs
docker compose logs -f api

# Stop the stack
docker compose down

# Rebuild after code changes
docker compose build api && docker compose up -d api
```

## Stack Overview

| Service | Container Name | Port (Host) | Port (Container) | Description |
|---------|---------------|-------------|------------------|-------------|
| api | nexus-backend-api | 5080 | 8080 | ASP.NET Core 8 API |
| db | nexus-backend-db | (internal) | 5432 | PostgreSQL 16 |

## URLs

- **API Health**: http://localhost:5080/health
- **Swagger JSON**: http://localhost:5080/swagger/v1/swagger.json
- **Swagger UI**: http://localhost:5080/swagger (open in browser)

## Volumes

| Volume Name | Purpose |
|-------------|---------|
| nexus-backend-db-data | PostgreSQL data persistence |

## Network

| Network Name | Purpose |
|--------------|---------|
| nexus-backend-net | Isolated network for this stack |

## Environment Variables

Docker environment is configured directly in `compose.yml`. For custom values:

1. Copy `.env.docker` to `.env`
2. Edit values in `.env`
3. Restart with `docker compose up -d`

### Required Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `JWT_SECRET` | DevSecret32CharactersMinimumHere! | JWT signing secret (min 32 chars) |

### Configured in compose.yml

| Variable | Value | Description |
|----------|-------|-------------|
| `ASPNETCORE_ENVIRONMENT` | Development | Enables Swagger, auto-migrations, seed data |
| `ConnectionStrings__DefaultConnection` | Host=db;... | Docker DB connection |
| `Cors__AllowedOrigins__*` | localhost:3000-3002, 5080 | CORS origins |

## Migrations

Migrations run automatically in Development mode when the API starts.

To apply migrations manually:
```bash
docker compose exec api dotnet ef database update
```

To add a new migration (run from host):
```bash
dotnet ef migrations add <Name> --project src/Nexus.Api
```

## Seed Data

Seed data runs automatically in Development mode. Test credentials:

| Email | Password | Tenant |
|-------|----------|--------|
| admin@acme.test | Test123! | acme |
| member@acme.test | Test123! | acme |
| admin@globex.test | Test123! | globex |

## Database Backup & Restore

```bash
# Backup
scripts\db-backup.bat           # Windows
./scripts/db-backup.sh          # Linux/macOS

# Restore (requires typing YES to confirm)
scripts\db-restore.bat <file>   # Windows
./scripts/db-restore.sh <file>  # Linux/macOS
```

Backups are stored in `backups/db/` (gitignored).

## Common Commands

```bash
# Start everything
docker compose up -d

# View API logs
docker compose logs -f api

# Rebuild API after code changes
docker compose build api && docker compose up -d api

# Shell into API container
docker compose exec api bash

# Shell into DB container
docker compose exec db psql -U postgres -d nexus_dev

# Stop everything (data persists)
docker compose down

# Stop and remove volumes (DESTROYS DATA)
docker compose down -v

# Check container status
docker compose ps
```

## Rules for AI Tools / Automation

1. **Assume Docker** - All commands should target Docker, not host-installed services
2. **No localhost DB** - Database is at `Host=db;Port=5432` inside Docker, not localhost:5434
3. **Use docker compose exec** - To run commands inside containers:
   ```bash
   docker compose exec api dotnet ef ...
   docker compose exec db psql -U postgres ...
   ```
4. **Check health first** - Before running commands, verify containers are healthy:
   ```bash
   docker compose ps
   ```
5. **Rebuild after changes** - Code changes require:
   ```bash
   docker compose build api && docker compose up -d api
   ```

## Fallback: Non-Docker Workflow

The non-Docker workflow is preserved for cases where Docker isn't available:

```bash
# Start PostgreSQL on port 5434 (host)
docker-compose up -d  # Old docker-compose.yml (just Postgres)

# Run API directly
$env:ASPNETCORE_ENVIRONMENT="Development"
dotnet run --project src/Nexus.Api
```

Note: The old `docker-compose.yml` only runs PostgreSQL on port 5434 for the non-Docker workflow.

## Troubleshooting

### API won't start
```bash
# Check logs
docker compose logs api

# Common issues:
# - DB not ready: wait for db health check
# - Port conflict: check if 5080 is in use
```

### Database connection failed
```bash
# Verify DB is healthy
docker compose ps

# Check DB logs
docker compose logs db
```

### Stale code running
```bash
# Force rebuild
docker compose build --no-cache api
docker compose up -d api
```

### Clean slate
```bash
# Remove everything including data
docker compose down -v
docker compose up -d
```
