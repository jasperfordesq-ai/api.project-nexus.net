# Production Container Map

Last inventory verification: 2026-05-12 (not rechecked live by the 2026-07-15 documentation audit)

Status: **Maintained operator reference - dated inventory, verify live after authorization**

> **Single source of truth for what currently runs on the production server.**
> This is an inventory and component-specific operator reference, not standing
> authorization to deploy, redeploy, restart, or remove anything. Obtain an
> explicit production instruction before acting.

Operational deployment does not define product authority. The React image
currently serving the .NET Edition is built from the frozen legacy copy in this
repository; the canonical React client and Laravel API contract live in
`C:\platforms\htdocs\staging`. The deployed Web UK container remains an
experimental surface and is not the certified replacement for Laravel Blade.

**Server:** see `.claude/production-server.md` for the SSH host / key. Use `$NEXUS_DEPLOY_HOST` in scripts. Repo lives at `/opt/nexus-backend/`.
**Reverse proxy:** Plesk-managed **Apache** (NOT nginx) on `:443`. Each vhost lives at `/var/www/vhosts/system/<domain>/conf/vhost_ssl.conf` and `ProxyPass /` targets a `127.0.0.1:<port>` container.
**Active V1 blue/green color:** tracked in `/etc/apache2/conf-enabled/nexus-active-upstreams.conf`. It was recorded as `blue` on 2026-05-12; never assume that color is still active. Verify it live only after explicit authorization.

---

## .NET Edition stack (this repo — `apps/`)

| Domain | → Port | Container | Source | Stack |
|---|---|---|---|---|
| **`platform.project-nexus.net`** | **5210** | **`nexus-react-frontend`** | `apps/react-frontend/` | **Vite + React 18 + TS + HeroUI + Tailwind 4** — main .NET Edition SPA |
| `admin.project-nexus.net` | 5191 | `nexus-admin-dev` | `apps/admin/` | Vite + Refine + Ant Design |
| `api.project-nexus.net` | 5080 | `nexus-backend-api` | `src/Nexus.Api/` | ASP.NET Core 8 |
| `uk.project-nexus.net` | 5180 | `nexus-uk-frontend-dev` | `apps/web-uk/` | Express + Nunjucks + GOV.UK Frontend; experimental and not certified as the shared accessible frontend |
| `ie.project-nexus.net` | 5200 | `nexus-web-govie` | (deleted from repo; container is a frozen snapshot) | Vite SPA |

### 🚨 .NET Edition deploy rules

1. **The .NET Edition user-facing SPA is `nexus-react-frontend` on port `5210`.** That is what `platform.project-nexus.net` serves. **It is NOT a `docker compose` service.** Apache's vhost proxies `/` to `127.0.0.1:5210`.
2. The image is `nexus-react-frontend:prod`, built from **`apps/react-frontend/Dockerfile.prod`**.
3. There is no `nexus-react-frontend-dev` anymore — the duplicate Vite container was deleted 2026-05-12. If you see one come back, something is wrong.
4. `docker compose build react-frontend` rebuilds the **wrong image** (`nexus-backend-react-frontend:latest`) for an unrelated compose service that no longer has a vhost. **Do not use compose to deploy the prod SPA.**
5. The deployed SPA's legacy status does not authorize feature work in
   `apps/react-frontend`; ASP.NET must conform to the canonical Laravel React
   contracts.

### Web UK deployment hold

`compose.prod.yml` currently supplies Web UK with an explicit
`API_BASE_URL=http://api:8080` override. The Web UK resolver treats that as an
ASP.NET target, while ASP.NET is not yet certified for the unchanged accessible
frontend. Therefore the root production Compose path is **not an approved Web UK
release procedure**. Do not deploy or repoint Web UK from it until the backend
switching gate is complete and the configuration has been explicitly reviewed.
Laravel remains the current Web UK certification backend.

### .NET Edition SPA release boundary

The former copy/paste procedure used mutable `git pull`/`:prod` state and
stopped the serving container before proving a replacement. It is withdrawn.
After explicit authorization, a reviewed replacement plan must at minimum:

1. name and verify the exact full source SHA and clean build context;
2. build an immutable SHA-tagged image and record its digest;
3. preserve the running container/image until the candidate is independently
   healthy;
4. define an atomic port/proxy cutover or another no-gap replacement method;
5. retain a verified rollback target and abort threshold;
6. verify public headers/content and the service-worker/cache result; and
7. record the final container ID, image digest, source SHA, and health evidence.

The deployed SPA remains a raw-container component, not a root Compose service.
This inventory does not supply the missing mutation commands and does not
authorize rebuilding the frozen source.

---

## Laravel Edition stack (canonical PHP/Laravel — **DO NOT TOUCH from this repo**)

The Laravel Edition stack is a separate codebase that lives in a different working tree (`C:\platforms\htdocs\staging`). It is the canonical, in-production platform, deployed on this same server via `scripts/deploy/bluegreen-deploy.sh`. **Never deploy Laravel Edition changes from `asp.net-backend/`. Never restart Laravel Edition containers without checking the active color.**

### Recorded active pair (blue on 2026-05-12; verify live before use)

| Container | Port | Role |
|---|---|---|
| `nexus-blue-php-app` | 8090 | V1 Laravel API + admin (serves `api.project-nexus.ie` + 3 aliases, `accessible.*` + 3 aliases, `/admin` on `timebanks.us` + `pairc-goodman.com`) |
| `nexus-blue-react` | 3000 | V1 React frontend (serves `app.project-nexus.ie` + 3 aliases, `timebanks.us`, apex `hour-timebank.ie` / `timebank.global` / `nexuscivic.ie`) |
| `nexus-blue-sales` | 3003 | V1 sales site (`project-nexus.ie` apex) |
| `nexus-blue-php-queue` | — | V1 PHP queue worker |
| `nexus-blue-php-scheduler` | — | V1 PHP cron scheduler |
| `nexus-crm` | 8081 | Nexus CRM (serves `crm.project-nexus.ie` + 3 aliases: `crm.hour-timebank.ie`, `crm.timebank.global`, `crm.nexuscivic.ie`). The CRM is NOT a V1 PHP/Laravel app — it's a standalone Docker service unrelated to the blue/green pair, and is safe to redeploy independently. The legacy `exchangemembers.com` URL is dead — Plesk vhost removed 2026-05-12. |

### Recorded standby pair (green on 2026-05-12; verify live before use)

| Container | Port | Role |
|---|---|---|
| `nexus-green-php-app` | 8190 | Standby V1 Laravel |
| `nexus-green-react` | 3400 | Standby V1 React |
| `nexus-green-sales` | 3103 | Standby V1 sales |

At the dated inventory, `bluegreen-deploy.sh` built the standby pair,
smoke-tested it, then changed `Define NEXUS_*_PORT` and reloaded Apache. Never
run or modify that Laravel process from this repository; verify the live color
and use the Laravel repository's current procedure after separate authorization.

---

## Datastores (shared / per-stack)

| Container | Role |
|---|---|
| `nexus-backend-db` | .NET Edition Postgres (used by `nexus-backend-api`) |
| `nexus-backend-rabbitmq` | .NET Edition message queue |
| `nexus-postgres` | (verify usage before touching) |
| `nexus-redis` | .NET Edition Redis |
| `nexus-meilisearch` | .NET Edition semantic search |
| `nexus-php-db` | Laravel Edition MariaDB |
| `nexus-php-redis` | Laravel Edition Redis |

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
