# Project NEXUS -- Monorepo Map

> Keep this file accurate. Codex reads it at the start of every session.

## What This Is

A full-stack monorepo containing:
- One ASP.NET Core 8 backend API.
- Three supported frontend apps: `apps/react-frontend/`, `apps/admin/`, and `apps/web-uk/`.
- Docker Compose configuration for local and production-like runs.

All backend development is Docker-only. Tests can run on the host where documented.

## Service Map

| Service Name | Container | Host Port | Internal Port | Stack | Location |
|---|---|---:|---:|---|---|
| api | nexus-backend-api | 5080 | 8080 | ASP.NET Core 8 | src/Nexus.Api/ |
| db | nexus-backend-db | internal | 5432 | PostgreSQL 16.4 | Docker volume |
| rabbitmq | nexus-backend-rabbitmq | 5672, 15672 | 5672, 15672 | RabbitMQ | Docker volume |
| react-frontend | nexus-react-frontend-dev | 5173 | 5173 | React 18 + Vite | apps/react-frontend/ |
| admin | nexus-admin-dev | 5190 | 5190 | Refine + Ant Design + Vite | apps/admin/ |
| web-uk | nexus-uk-frontend-dev | 5180 | 3001 | GOV.UK Design System + Express | apps/web-uk/ |

## Frontend Apps

### React Frontend

`apps/react-frontend/` is the canonical V1 parity SPA. It also contains the embedded production parity admin UI under `src/admin/`, mounted at `/admin/*`.

### Admin Panel

`apps/admin/` is retained as a standalone admin app for separate admin-service work. It is not the primary V1 parity admin target unless explicitly requested.

### UK Frontend

`apps/web-uk/` is retained for the GOV.UK Design System frontend. It remains out of scope for V1 parity unless explicitly requested.

## Local Commands

```bash
docker compose up -d
docker compose logs -f api
docker compose build api && docker compose up -d api
docker compose build react-frontend && docker compose up -d react-frontend
docker compose build admin && docker compose up -d admin
docker compose build web-uk && docker compose up -d web-uk
docker compose down
```

## Testing

```bash
dotnet test
cd e2e && npx playwright test
cd apps/react-frontend && npm test -- --run
cd apps/admin && npm test
cd apps/web-uk && npm run brand:check
```

## Production URLs

| App | URL | Status |
|---|---|---|
| API | https://api.project-nexus.net | Live |
| React frontend | https://platform.project-nexus.net | Live |
| UK frontend | https://uk.project-nexus.net | Live |
| Admin panel | https://admin.project-nexus.net | Deployment target |
| AI | https://ai.project-nexus.net | Live |

## Production Paths

| Component | Path |
|---|---|
| All code | /opt/nexus-backend/ |
| API | /opt/nexus-backend/src/Nexus.Api/ |
| React frontend | /opt/nexus-backend/apps/react-frontend/ |
| Admin panel | /opt/nexus-backend/apps/admin/ |
| UK frontend | /opt/nexus-backend/apps/web-uk/ |
| nginx configs | /etc/nginx/conf.d/ |

## CORS Origins

Local development origins are configured in `compose.yml`:

```bash
Cors__AllowedOrigins__0=http://localhost:5080
Cors__AllowedOrigins__1=http://localhost:5173
Cors__AllowedOrigins__2=http://localhost:5180
Cors__AllowedOrigins__3=http://localhost:5190
```

Production origins are configured through environment variables:

```bash
Cors__AllowedOrigins__0=https://platform.project-nexus.net
Cors__AllowedOrigins__1=https://uk.project-nexus.net
Cors__AllowedOrigins__2=https://admin.project-nexus.net
Cors__AllowedOrigins__3=https://api.project-nexus.net
```

## Repository Layout

```text
asp.net-backend/
  compose.yml
  compose.prod.yml
  Dockerfile
  Nexus.sln
  src/Nexus.Api/
  tests/
  e2e/
  apps/
    admin/
    react-frontend/
    web-uk/
  scripts/
```
