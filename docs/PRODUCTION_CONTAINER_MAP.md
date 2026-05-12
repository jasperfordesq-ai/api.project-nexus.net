# Production Container Map

> **Single source of truth for what runs on the production server.** If you're about to deploy, redeploy, restart, or remove a container — read this first.

**Server:** see `.claude/production-server.md` for the SSH host / key. Use `$NEXUS_DEPLOY_HOST` in scripts. Repo lives at `/opt/nexus-backend/`.
**Reverse proxy:** Plesk-managed **Apache** (NOT nginx) on `:443`. Each vhost lives at `/var/www/vhosts/system/<domain>/conf/vhost_ssl.conf` and `ProxyPass /` targets a `127.0.0.1:<port>` container.
**Active V1 blue/green color:** tracked in `/etc/apache2/conf-enabled/nexus-active-upstreams.conf` (currently `blue`; managed by `scripts/deploy/bluegreen-deploy.sh`).

---

## V2 stack (this repo — `apps/`)

| Domain | → Port | Container | Source | Stack |
|---|---|---|---|---|
| **`platform.project-nexus.net`** | **5210** | **`nexus-react-frontend`** | `apps/react-frontend/` | **Vite + React 18 + TS + HeroUI + Tailwind 4** — main V2 SPA |
| `admin.project-nexus.net` | 5191 | `nexus-admin-dev` | `apps/admin/` | Vite + Refine + Ant Design |
| `api.project-nexus.net` | 5080 | `nexus-backend-api` | `src/Nexus.Api/` | ASP.NET Core 8 |
| `uk.project-nexus.net` | 5180 | `nexus-uk-frontend-dev` | `apps/web-uk/` | Vite + GOV.UK Design System |
| `ie.project-nexus.net` | 5200 | `nexus-web-govie` | (deleted from repo; container is a frozen snapshot) | Vite SPA |

### 🚨 V2 deploy rules

1. **The V2 user-facing SPA is `nexus-react-frontend` on port `5210`.** That is what `platform.project-nexus.net` serves. **It is NOT a `docker compose` service.** Apache's vhost proxies `/` to `127.0.0.1:5210`.
2. The image is `nexus-react-frontend:prod`, built from **`apps/react-frontend/Dockerfile.prod`**.
3. There is no `nexus-react-frontend-dev` anymore — the duplicate Vite container was deleted 2026-05-12. If you see one come back, something is wrong.
4. `docker compose build react-frontend` rebuilds the **wrong image** (`nexus-backend-react-frontend:latest`) for an unrelated compose service that no longer has a vhost. **Do not use compose to deploy the prod SPA.**

### V2 SPA deploy procedure (copy/paste)

> SSH host + key path are in `.claude/production-server.md`. Set `NEXUS_DEPLOY_HOST` and use `$SSH_KEY` from that doc. All commands run *on the server* after `ssh`-ing in.

```bash
# On the server:
cd /opt/nexus-backend
sudo git pull origin main

# Build the prod image from Dockerfile.prod
cd /opt/nexus-backend/apps/react-frontend
sudo docker build -f Dockerfile.prod \
  -t nexus-react-frontend:prod \
  --build-arg BUILD_COMMIT=$(cd /opt/nexus-backend && git rev-parse --short HEAD) .

# Swap the container (NOT via compose — raw docker run)
sudo docker stop nexus-react-frontend
sudo docker rm nexus-react-frontend
sudo docker run -d \
  --name nexus-react-frontend \
  --network nexus-backend-net \
  -p 127.0.0.1:5210:80 \
  --restart unless-stopped \
  nexus-react-frontend:prod
```

Verify from your workstation:

```bash
curl -sI https://platform.project-nexus.net/ | head -5
```

After deploying, a hard refresh (Ctrl+Shift+R) is needed in the browser to bypass the service-worker cache.

---

## V1 stack (legacy PHP/Laravel — **DO NOT TOUCH from this repo**)

The V1 stack is a separate codebase that lives in a different working tree (`C:\platforms\htdocs\staging`). It is deployed on this same server via `scripts/deploy/bluegreen-deploy.sh`. **Never deploy V1 changes from `asp.net-backend/`. Never restart V1 containers without checking the active color.**

### Active pair (blue, serves all V1 traffic)

| Container | Port | Role |
|---|---|---|
| `nexus-blue-php-app` | 8090 | V1 Laravel API + admin (serves `api.project-nexus.ie` + 3 aliases, `accessible.*` + 3 aliases, `/admin` on `timebanks.us` + `pairc-goodman.com`) |
| `nexus-blue-react` | 3000 | V1 React frontend (serves `app.project-nexus.ie` + 3 aliases, `timebanks.us`, apex `hour-timebank.ie` / `timebank.global` / `nexuscivic.ie`) |
| `nexus-blue-sales` | 3003 | V1 sales site (`project-nexus.ie` apex) |
| `nexus-blue-php-queue` | — | V1 PHP queue worker |
| `nexus-blue-php-scheduler` | — | V1 PHP cron scheduler |
| `nexus-crm` | 8081 | CRM (serves `crm.*` 4 aliases + `exchangemembers.com`) |

### Standby pair (green — accepts new builds, does NOT serve traffic)

| Container | Port | Role |
|---|---|---|
| `nexus-green-php-app` | 8190 | Standby V1 Laravel |
| `nexus-green-react` | 3400 | Standby V1 React |
| `nexus-green-sales` | 3103 | Standby V1 sales |

`bluegreen-deploy.sh` builds the green pair, smoke-tests, then atomically flips `Define NEXUS_*_PORT` to point at green and reloads Apache. Removing green = breaking the deploy flow.

---

## Datastores (shared / per-stack)

| Container | Role |
|---|---|
| `nexus-backend-db` | V2 Postgres (used by `nexus-backend-api`) |
| `nexus-backend-rabbitmq` | V2 message queue |
| `nexus-postgres` | (verify usage before touching) |
| `nexus-redis` | V2 Redis |
| `nexus-meilisearch` | V2 semantic search |
| `nexus-php-db` | V1 MariaDB |
| `nexus-php-redis` | V1 Redis |

## Independent stacks (not deployed from this repo)

| Container | Port | Notes |
|---|---|---|
| `nexus-civic-app-prod`, `nexus-civic-db` | 3100 | Civic app — separate project |
| `timebank-web-prod`, `timebank-api-prod`, `timebank-postgres-prod`, `timebank-redis-prod` | 3200/3201 | "Timebank v4" Node app — separate project |
| `portainer` | 9443 | Docker UI |

---

## Removed (do not recreate)

| Item | Removed | Reason |
|---|---|---|
| `nexus-react-frontend-dev` container | 2026-05-12 | Duplicate of `nexus-react-frontend`, no vhost |
| `nexus-backend-react-frontend:latest` image | 2026-05-12 | Backed only the removed dev container |
| `nexus-frontend-dev` container (Next.js 16 `apps/web-modern/`) | 2026-05-12 | Source already deleted from repo; container was a frozen snapshot |
| `nexus-backend-web-modern` image | 2026-05-12 | Same |
| `app.project-nexus.net` Plesk subdomain | 2026-05-12 | Proxied to the deleted Next.js container |
| `ai.project-nexus.net` Plesk subdomain | 2026-05-12 | Old Llama container had already been discontinued; vhost was orphan |

DNS records for `ai.project-nexus.net` and `app.project-nexus.net` still exist on the upstream DNS provider — clean those separately when convenient.
