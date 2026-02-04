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

```
Host: 20.224.171.253
User: azureuser
Key: C:\ssh-keys\project-nexus.pem
```

## Quick Connect Command

```bash
ssh -i "C:\ssh-keys\project-nexus.pem" azureuser@20.224.171.253
```

## Plesk Admin

- URL: https://20.224.171.253:8443
- Username: admin
- Password: DruryLane66350!

## Application Credentials (Production)

| Tenant | Email | Password | Role |
|--------|-------|----------|------|
| acme | admin@acme.test | Nx@Acm3Pr0d9Kx7 | Admin |
| globex | admin@globex.test | Gl0b3xAdm2026Zq | Admin |
| acme | member@acme.test | Acm3MbrX7Pr0d9v | Member |

**Note:** Local dev uses `Test123!` for all accounts. Production uses secure passwords above.

## Live URLs (All HTTPS with Let's Encrypt)

| Service | URL | Status |
|---------|-----|--------|
| API | https://api.project-nexus.net | ✅ Live |
| AI Service | https://ai.project-nexus.net | ✅ Live |
| UK Frontend | https://uk.project-nexus.net | ✅ Live |
| App Frontend | https://app.project-nexus.net | ✅ Live |
| IE Frontend | https://ie.project-nexus.net | ❌ Not deployed |
| Admin | https://admin.project-nexus.net | ❌ Not deployed |

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
- `API_BASE_URL=http://172.17.0.1:5080`
- `COOKIE_SECRET` - Session cookie secret

### Modern Frontend (.env at /opt/nexus-modern-frontend/.env)
- `NEXT_PUBLIC_API_URL=https://api.project-nexus.net`

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

### Backend

```bash
# From local machine:
scp -i "C:\ssh-keys\project-nexus.pem" -r src/ Dockerfile compose.yml compose.prod.yml azureuser@20.224.171.253:/opt/nexus-backend/

# On server:
cd /opt/nexus-backend
cp compose.prod.yml compose.override.yml  # IMPORTANT: production config
sudo docker compose down
sudo docker compose build --no-cache api
sudo docker compose up -d
```

### UK Frontend

```bash
# From local machine:
scp -i "C:\ssh-keys\project-nexus.pem" -r src/ Dockerfile compose.yml azureuser@20.224.171.253:/opt/nexus-uk-frontend/

# On server:
cd /opt/nexus-uk-frontend
sudo docker compose down
sudo docker compose build --no-cache
sudo docker compose up -d
```

### Modern Frontend

```bash
# From local machine:
scp -i "C:\ssh-keys\project-nexus.pem" -r src/ Dockerfile compose.yml compose.prod.yml azureuser@20.224.171.253:/opt/nexus-modern-frontend/

# On server:
cd /opt/nexus-modern-frontend
cp compose.prod.yml compose.override.yml  # IMPORTANT: production config
sudo docker compose --profile production down
sudo docker compose --profile production build --no-cache frontend-prod
sudo docker compose --profile production up -d frontend-prod
```

## SSL Certificate Renewal

Managed automatically by Plesk Let's Encrypt extension. To manually renew:
```bash
plesk bin extension --exec letsencrypt cli.php -d api.project-nexus.net -m your@email.com
```

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
