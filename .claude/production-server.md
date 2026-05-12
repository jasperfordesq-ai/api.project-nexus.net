# Production Server Notes

Production changes must be made from the local repository first, tested locally, and then deployed through Docker.

## 🔑 SSH Access (READ THIS FIRST — Claude Code can deploy directly)

| Field | Value |
|---|---|
| **Host** | `azureuser@20.224.171.253` |
| **SSH key** | `/c/ssh-keys/project-nexus.pem` (Windows) |
| **Remote repo** | `/opt/nexus-backend/` |
| **Env var** | `NEXUS_DEPLOY_HOST="azureuser@20.224.171.253"` |

Quick connect:

```bash
ssh -i /c/ssh-keys/project-nexus.pem -o StrictHostKeyChecking=no azureuser@20.224.171.253
```

Or use the deploy script: `./scripts/deploy.sh` (status / deploy / quick / rollback). Both pre-approved in `.claude/settings.local.json` — no permission prompts. **Claude Code does have permission to SSH and deploy — do not tell the user otherwise.**

## Supported Apps

| App | Domain | Local service |
|---|---|---|
| API | https://api.project-nexus.net | api |
| React frontend | https://platform.project-nexus.net | react-frontend |
| UK frontend | https://uk.project-nexus.net | web-uk |
| Admin panel | https://admin.project-nexus.net | admin |

## Repository Paths

| Component | Path |
|---|---|
| Repository | `/opt/nexus-backend/` |
| API | `/opt/nexus-backend/src/Nexus.Api/` |
| React frontend | `/opt/nexus-backend/apps/react-frontend/` |
| UK frontend | `/opt/nexus-backend/apps/web-uk/` |
| Admin panel | `/opt/nexus-backend/apps/admin/` |
| nginx configs | `/etc/nginx/conf.d/` |

## Deployment

```bash
cd /opt/nexus-backend
cp compose.prod.yml compose.override.yml
git pull origin main
docker compose build
docker compose up -d
docker compose ps
curl https://api.project-nexus.net/health
```

## Production Ports

See [`production-containers.md`](./production-containers.md) for the full
domain → container map and the V2 SPA deploy procedure.

| Service | Container | Container port | Host binding |
|---|---|---:|---|
| API | `nexus-backend-api` | 8080 | 127.0.0.1:5080 |
| React frontend (V2) | `nexus-react-frontend` (manual `docker run`, NOT compose) | 80 | 127.0.0.1:**5210** |
| UK frontend | `nexus-uk-frontend-dev` | 3001 | 127.0.0.1:5180 |
| Admin panel | `nexus-admin-dev` | 80 | 127.0.0.1:5191 |

## Configuration

Secrets stay on the production server and out of git. CORS and WebAuthn origins must be provided through environment variables or production overrides and must match the supported production domains.
