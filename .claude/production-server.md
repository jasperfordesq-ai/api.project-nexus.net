# Production Server Notes

Last reviewed: 2026-07-15

Status: **Maintained operator pointer - no standing authorization**

This file is a short operator pointer. The authoritative domain, port,
container, proxy, and component-specific deployment map is
[`production-containers.md`](./production-containers.md). Read it immediately
before any production action.

> These notes do not authorize a deployment. Production changes require an
> explicit user instruction for the named component. Never touch the Laravel
> Edition blue/green containers from this repository.

## Connection And Repository

| Field | Value |
|---|---|
| Host | `azureuser@20.224.171.253` |
| SSH key | `/c/ssh-keys/project-nexus.pem` on the configured workstation |
| Repository | `/opt/nexus-backend/` |
| Suggested environment variable | `NEXUS_DEPLOY_HOST="azureuser@20.224.171.253"` |

The path is a workstation hint, not proof that the key exists or is authorized
for the requested action. Set any shell-specific `$SSH_KEY` variable explicitly
only after verifying the current key path and scope; never copy key material
into logs or repository files.

Plesk-managed **Apache**, not nginx, terminates HTTPS and proxies each domain to
its loopback-bound container port. Do not edit or deploy from an assumed nginx
layout.

## Operationally Deployed Surfaces

| Surface | Domain | Container/port | Product status |
|---|---|---|---|
| ASP.NET API | `api.project-nexus.net` | `nexus-backend-api` / `5080` | Experimental .NET backend |
| .NET Edition React SPA | `platform.project-nexus.net` | `nexus-react-frontend` / `5210` | Deployed legacy client; source is frozen, not the canonical React contract |
| Web UK | `uk.project-nexus.net` | `nexus-uk-frontend-dev` / `5180` | Experimental deployment; not certified as the shared accessible replacement |
| Standalone admin | `admin.project-nexus.net` | `nexus-admin-dev` / `5191` | Secondary admin surface |

The canonical React client and Laravel backend remain in the separate Laravel
repository. Operationally serving a legacy or experimental .NET surface does
not make it a product or contract source of truth.

## Deployment Rules

There is no safe blanket `docker compose build && docker compose up` production
procedure for this repository:

- the deployed React SPA uses the component-specific raw `docker run` procedure
  in `production-containers.md`, not Compose;
- the root `compose.prod.yml` Web UK override currently selects uncertified
  ASP.NET and is not an approved Web UK release path;
- Laravel Edition deployments use their own blue/green repository and procedure
  and must never be initiated here.

After explicit authorization, follow only the named component procedure in
`production-containers.md`, verify the exact image/source SHA, and verify the
corresponding health and browser endpoint. Secrets remain on the server and out
of git; CORS and WebAuthn origins must match the deployed domains.
