# Production Server Connection Details

## Development Workflow (MANDATORY)

**NEVER modify production directly. All changes go through local first.**

```
Local Development (Docker) → Test Locally → Deploy to Production (Docker)
```

### Deployment Steps

1. **Make changes locally** - Edit files in local repo
2. **Test with Docker** - `docker compose up` and verify
3. **Upload to production** - scp files to server
4. **Rebuild on production** - `docker compose build && docker compose up -d`

### Production Override Files

Each project has a `compose.prod.yml` in the local repo. On production, copy it:

```bash
# Backend
cp compose.prod.yml compose.override.yml

# Modern Frontend
cp compose.prod.yml compose.override.yml
```

These files contain production-specific CORS, ports, and API URLs.

## SSH Connection

Credentials stored in local password manager. NOT in this file.

## Live URLs (All HTTPS with Let's Encrypt)

| Service | URL | Status |
|---------|-----|--------|
| API | https://api.project-nexus.net | Live |
| AI Service | https://ai.project-nexus.net | Live |
| UK Frontend | https://uk.project-nexus.net | Live |
| App Frontend | https://app.project-nexus.net | Live |
| IE Frontend | https://ie.project-nexus.net | Not deployed |
| Admin | https://admin.project-nexus.net | Not deployed |

## Architecture

```
Internet → Plesk nginx (SSL termination) → Custom nginx configs → Docker containers
```

- **Plesk**: Manages domains, SSL certificates (Let's Encrypt)
- **Custom nginx**: `/etc/nginx/conf.d/*.conf` - reverse proxy to Docker
- **Docker**: Native docker compose (NOT Plesk Docker extension)

## Deployment Locations

| Component | Path |
|-----------|------|
| Backend (API, DB, RabbitMQ, Ollama) | `/opt/nexus-backend/` |
| UK Frontend | `/opt/nexus-uk-frontend/` |
| Modern Frontend | `/opt/nexus-modern-frontend/` |
| nginx configs | `/etc/nginx/conf.d/` |
| SSL certificates | `/opt/psa/var/certificates/` |

## Docker Container Management

```bash
# View all containers
docker ps -a

# Backend services
cd /opt/nexus-backend
docker compose ps
docker compose logs -f api
docker compose restart api

# UK Frontend
cd /opt/nexus-uk-frontend
docker compose ps
docker compose logs -f
docker compose restart

# Modern Frontend
cd /opt/nexus-modern-frontend
docker compose ps
docker compose logs -f
docker compose restart

# Pull AI model (if needed)
docker compose -f /opt/nexus-backend/compose.yml exec llama-service ollama pull llama3.2:3b
```

## Environment Variables

### Backend (.env at /opt/nexus-backend/.env)

- `DB_PASSWORD` - PostgreSQL password
- `JWT_SECRET` - JWT signing secret (must match PHP backend)
- `RABBITMQ_PASSWORD` - RabbitMQ password

### UK Frontend (.env at /opt/nexus-uk-frontend/.env)

- `API_BASE_URL` - Internal Docker network API URL
- `COOKIE_SECRET` - Session cookie secret

### Modern Frontend (.env at /opt/nexus-modern-frontend/.env)

- `NEXT_PUBLIC_API_URL` - Public API URL

## nginx Config Files

| Domain | Config File |
|--------|-------------|
| api.project-nexus.net | `/etc/nginx/conf.d/api.project-nexus.conf` |
| ai.project-nexus.net | `/etc/nginx/conf.d/ai.project-nexus.conf` |
| uk.project-nexus.net | `/etc/nginx/conf.d/uk.project-nexus.conf` |
| app.project-nexus.net | `/etc/nginx/conf.d/app.project-nexus.conf` |

## Port Mappings

| Service | Internal Port | Exposed Port |
|---------|---------------|--------------|
| API | 8080 | 127.0.0.1:5080 |
| PostgreSQL | 5432 | internal only |
| RabbitMQ AMQP | 5672 | internal only |
| RabbitMQ Management | 15672 | internal only |
| Ollama | 11434 | 127.0.0.1:11434 |
| UK Frontend | 3000 | 127.0.0.1:3001 |
| Modern Frontend | 3000 | 127.0.0.1:3002 |

## Redeployment Commands

See deploy.sh in the repo root, or use `make deploy`.

## SSL Certificate Renewal

Managed automatically by Plesk Let's Encrypt extension.

## Troubleshooting

### Check nginx config

```bash
nginx -t
systemctl reload nginx
```

### Check container logs

```bash
docker logs nexus-backend-api
docker logs nexus-uk-frontend
docker logs nexus-modern-frontend
```

### Check health endpoints

```bash
curl -k https://api.project-nexus.net/health
curl -k https://ai.project-nexus.net/api/tags
```

## Deployment Date

Deployed: February 2026
