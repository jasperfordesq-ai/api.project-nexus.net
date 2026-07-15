# Project NEXUS .NET Edition - Agent Guide

Last reviewed: 2026-07-15

> WARNING: Before deploying or touching any production container, read
> `.claude/production-containers.md`.
>
> The .NET Edition user-facing SPA is the `nexus-react-frontend` container on
> port `5210`, image `nexus-react-frontend:prod`, built from
> `apps/react-frontend/Dockerfile.prod`. It is run with raw `docker run`, not
> `docker compose`. This is the currently deployed legacy client, not the
> canonical development source; `apps/react-frontend` remains frozen. Never
> touch the Laravel Edition blue/green PHP containers from this repo.

## What This Project Is

This repository is the experimental ASP.NET Core 8 / PostgreSQL backend for
Project NEXUS. It is a clean .NET implementation of the canonical Laravel
Project NEXUS platform, not a PHP migration dump.

The Laravel Edition at `C:\platforms\htdocs\staging` is the current source of
truth for parity. Treat it as read-only reference material. Do not edit it, run
destructive commands in it, deploy it, or touch its production containers from
this workspace.

The objective is an externally contract-identical ASP.NET implementation of the
Laravel contracts: API contracts, workflows, frontend-consumed behavior, admin
and super-admin surfaces, accessible frontend behavior, background jobs,
integrations, tenant settings, localization, tests, and documentation. Earlier
"out of scope" exclusions are retired and are tracked as contract-identity gaps.

The binding decision is
[`docs/decisions/ADR-0001-contract-identical-backends.md`](docs/decisions/ADR-0001-contract-identical-backends.md).
Historical "parity," "compatible," and "contract-correct" wording is shorthand
for externally observable contract identity, not route-count similarity or
"close enough" behavior. The end state is two unchanged frontends by two
backends: canonical React and shared accessible Web UK must each run against
Laravel and ASP.NET by configuration only. Laravel remains the behavior
baseline; ASP.NET reproduces its consumed contracts and workflows.

## React Frontend Retirement And Contract Policy

The separate React frontend in this repo, `apps/react-frontend/`, is now a
legacy/outdated fork. It is frozen as historical reference only. Do not continue
feature development in it, do not treat it as the source of truth, and do not
copy it back over the Laravel React frontend.

The canonical React frontend is:

```text
C:\platforms\htdocs\staging\react-frontend
```

That frontend is production software. The Laravel backend is production and is
the source of truth for the frontend API contract. The ASP.NET backend is
development-only and must become contract-identical at the externally
observable boundary used by the Laravel React
frontend.

Default rule for agents: do not modify frontend files in this repo unless the
user explicitly approves that specific frontend change. Backend parity work
should happen in ASP.NET controllers, services, DTOs, auth/tenant handling,
OpenAPI/contracts, tests, and docs.

For every API call made by the Laravel React frontend, ASP.NET must expose the
same compatible contract:

- same HTTP method and path, including `/api/v2/...` aliases where the Laravel
  React frontend expects them;
- compatible request payloads, query parameters, multipart/upload fields, and
  headers;
- compatible response envelopes, pagination metadata, status codes, validation
  errors, auth errors, tenant errors, and not-found behavior;
- compatible auth refresh, tenant bootstrap, feature/module flags, upload URL,
  and realtime configuration behavior.

Do not "fix" compatibility by weakening the Laravel React frontend or by adding
ASP.NET-specific conditionals to production React pages. If a difference is
unavoidable, document it as a temporary adapter requirement and prefer fixing
the ASP.NET backend first.

Compatibility claims require proof:

- a route/API matrix comparing Laravel React API calls, Laravel routes/OpenAPI,
  and ASP.NET routes/OpenAPI;
- focused ASP.NET regression tests for matched endpoints;
- runtime smoke tests showing the Laravel React frontend can exercise the
  implemented ASP.NET endpoints without request/response shape failures.

See `docs/REACT_FRONTEND_RETIREMENT.md` for the maintained policy.

## Current Status Sources

Do not copy fast-changing counts into this first-read guide. Read and refresh the
workstream-specific status source instead:

- `docs/CURRENT_ASPNET_CONTRACT_STATUS.md` is the current ASP.NET fixed-rubric
  score, evidence boundary, published-but-unscored work, and next queue.
- `apps/web-uk/docs/CURRENT_LARAVEL_FIRST_PARITY_STATUS.md` is the current Web UK
  fixed-rubric score, route/API ledgers, certification boundary, and next queue.
- `docs/FULL_PARITY_REMEDIATION_RUNBOOK.md` defines the shared 1000-point rubric
  and the two-frontends-by-two-backends completion gate.

Generated route, schema, localization, and frontend inventories are evidence,
not completion scores. Regenerate them at the recorded Laravel and ASP.NET SHAs
before reporting them. Never combine a newly discovered denominator with an old
numerator or silently rescore an already named baseline.

## Parity Status Policy

Do not claim 100% parity, a 1,000/1,000 score, or production replacement status
until the parity maps in `docs/` show no open gaps and the relevant test suites
pass. Previous numeric parity scores in this repo are retired because they
excluded modules that are now in scope.

If an agent is resuming backend work, start with
`docs/CURRENT_ASPNET_CONTRACT_STATUS.md`. If resuming accessible frontend work,
start with `apps/web-uk/docs/CURRENT_LARAVEL_FIRST_PARITY_STATUS.md`. The older
`CURRENT_LARAVEL_PARITY_HANDOFF.md` and `CURRENT_WEB_UK_HANDOFF.md` files are
chronological histories: their old “latest” headings, counts, and scores are not
current status.

The canonical tracking documents are:

- `docs/FULL_PARITY_REMEDIATION_RUNBOOK.md` - fixed cross-workstream rubric,
  shared completion evidence gates, and autonomous execution loop; it links to
  the two canonical status documents for their live queues.
- `docs/CURRENT_ASPNET_CONTRACT_STATUS.md` - current backend score, evidence,
  blockers, and resume queue.
- `apps/web-uk/docs/CURRENT_LARAVEL_FIRST_PARITY_STATUS.md` - current accessible
  frontend score, evidence, blockers, and resume queue.
- `docs/CURRENT_LARAVEL_PARITY_HANDOFF.md` - historical backend implementation
  log; never use its old scores as current.
- `docs/LARAVEL_PARITY_MAP.md` - gap register and backlog.
- `docs/PARITY_BACKLOG.md` - generated backlog rollup and implementation queue rules.
- `docs/API_PARITY.md` - API contract comparison method and known gaps.
- `docs/SCHEMA_PARITY.md` - database/entity/table comparison method and known gaps.
- `docs/FRONTEND_PARITY.md` - React and accessible frontend route comparison method and known gaps.
- `docs/LOCALIZATION_PARITY.md` - locale, namespace, and translation-key comparison method and known gaps.
- `docs/MODULES.md` - module-by-module source and target map.
- `docs/ARCHITECTURE.md` - .NET runtime and boundary map.

## Former Exclusions Are Now Gaps

The following Laravel surfaces are explicitly in scope for full parity and must
be tracked until implemented or intentionally superseded by a documented .NET
equivalent:

- Caring Community, including municipal/KISS, care-provider, caregiver, warmth,
  civic digest, forecasting, and caring admin surfaces.
- Marketplace and commerce, including listings, seller profiles, orders,
  payments, escrow, pickup slots, coupons, local advertising, merchant
  onboarding, and marketplace AI/discovery.
- Verein / Clubs membership, dues, federation, and cross-invitation workflows.
- Regional Analytics and National KISS dashboard/reporting.
- Non-Stripe identity providers present in Laravel: Veriff, Onfido, Jumio, and
  Idenfy.
- Tenant SSO/OIDC login flow: provider administration plus the public
  redirect/callback and browser exchange are implemented with signed durable
  state, browser and server PKCE, nonce/JWKS validation, public-HTTPS endpoint
  checks, tenant-qualified identity linking, domain/provisioning policy gates,
  one-time callback grants, and refresh-token issuance. Live IdP/browser proof,
  the complete suite, and exact-SHA CI remain certification gaps.
- Mailchimp-like audience/template/sync behavior where Laravel still exposes it.
- Partner API and partner portal surfaces.
- Super-admin and platform-level federation/tenant controls.
- The accessible HTML/GOV.UK-style frontend parity surface.

## Frontend Parity Targets

The primary production React frontend is no longer the copy in this repo. The
canonical React frontend is the Laravel repo frontend at
`C:\platforms\htdocs\staging\react-frontend`.

- `apps/react-frontend/` is a frozen legacy copy kept for historical reference
  only. Do not modify it unless explicitly approved.
- `apps/react-frontend/src/admin/` may be inspected to understand old .NET
  adapter work, but it is not the forward development target.
- `apps/web-uk/` is the explicitly approved implementation target for the
  future shared accessible frontend. Laravel Blade defines its browser routes,
  links, layout, content hierarchy, forms, redirects, tenant behaviour and
  workflows; the Laravel backend defines its HTTP/auth/module/upload/download/
  side-effect contract. Its location in this repository does not make ASP.NET
  authoritative.
- If resuming the accessible frontend work after an interrupted session, start
  with `apps/web-uk/docs/CURRENT_LARAVEL_FIRST_PARITY_STATUS.md`.
- The Laravel Blade accessible frontend remains the current visual/workflow
  source of truth. Port its shell, information architecture, footer, card-list,
  and Explore patterns into `apps/web-uk` while keeping the Express/Nunjucks/GOV.UK
  Frontend stack.
- Web UK work must not modify ASP.NET backend source, tests, migrations, schema,
  fixtures or runtime data. It must not edit Laravel source, run Laravel
  migrations, alter/query/clean its ordinary local database, or touch
  production. The ordinary local Laravel database is a confidential,
  production-derived snapshot and is never a test fixture. Live mutation,
  upload, download, or destructive certification requires a separately
  provisioned disposable Laravel environment; cleanup against the ordinary
  local database is not an acceptable substitute.
- ASP.NET switching is a separate future gate: once that backend is ready, rerun
  the same unchanged Web UK suite by changing configuration only. Never add
  ASP.NET-specific page, template, validation, redirect or workflow branches.
- Do not point production utility-bar traffic at `apps/web-uk` until accessible
  route, workflow, tenant-domain, auth, localization, accessibility, and runtime
  smoke certification passes.
- `apps/admin/` is a secondary standalone admin app. Do not use it as the main
  Laravel parity target unless a task explicitly asks for standalone-admin work.
- Current backend work should make ASP.NET compatible with the Laravel React API
  contract, especially the routes and response shapes used by the production
  Laravel React frontend.

## Architecture Invariants

Preserve these invariants when implementing parity:

- ASP.NET Core 8 backend with EF Core and PostgreSQL.
- JWT authentication, refresh-token safety, and admin policies.
- Privileged authorization is database-backed. Rehydrate the current user role,
  tenant, activation state, and `is_admin`, `is_super_admin`,
  `is_tenant_super_admin`, and `is_god` flags before granting access; reject
  stale role or tenant claims. `GodOnly` requires the explicit `is_god` flag.
- Tenant isolation on every business query and write path.
- CORS origins aligned with deployed frontend domains.
- FIDO2/WebAuthn relying-party domain and origin rules.
- Authentication challenges must be opaque, time-bounded, single-use
  capabilities, never bearer tokens. The current 2FA and WebAuthn challenge
  stores are process-local; distributed challenge continuity remains an open
  production-readiness gap.
- Manual scheduled-job endpoints may report success only after a registered
  equivalent job executes and its successful outcome is persisted. Unmapped,
  busy, disabled, cancelled, and failed executions must fail explicitly.
- Keep one controller owner per HTTP verb and normalized `/api/admin` or
  `/api/v2/admin` route template. Preserve `AdminRouteOwnershipParityTests`
  when adding aliases or replacing compatibility handlers.
- No raw provider PII persisted beyond documented sanitized audit data.
- Migrations committed to git; no direct production database edits.
- AGPL-3.0-or-later license and NOTICE attribution preserved.

All new C# source files must include:

```csharp
// Copyright (c) 2024-2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.
```

## Local Development

Docker is required for the local application stack. Do not use `dotnet run` as
the normal development path.

```powershell
Copy-Item .env.example .env
# Replace JWT_SECRET in .env with a local-only random value.
docker compose up -d db rabbitmq api
docker compose logs -f api
docker compose build api && docker compose up -d api
docker compose down
```

Services:

| Service | URL | Notes |
| --- | --- | --- |
| API | `http://127.0.0.1:5080` | ASP.NET backend |
| Swagger | `http://127.0.0.1:5080/swagger` | Development-only runtime API documentation |
| Health | `http://127.0.0.1:5080/health` | Anonymous health endpoint |
| React frontend | `http://127.0.0.1:5273` | Legacy/frozen .NET React copy; use only when explicitly approved |
| Web UK frontend | `http://127.0.0.1:5180` | Laravel-first shared accessible frontend; ASP.NET switching is a separate certification gate |
| Standalone admin | `http://127.0.0.1:5190` | Secondary admin app |

Test credentials:

- `admin@acme.test` / `NexusV2!Demo#2026` / tenant slug `acme`
- `member@acme.test` / `NexusV2!Demo#2026` / tenant slug `acme`
- `admin@globex.test` / `NexusV2!Demo#2026` / tenant slug `globex`

These identities exist only in the fictitious Development seed. See
[`docs/system/LOCAL_DEVELOPMENT.md`](docs/system/LOCAL_DEVELOPMENT.md) for the
supported startup path and database boundary.

## Verification Commands

Use the narrowest command that proves the change, then broaden when behavior or
shared contracts are touched.

```bash
dotnet test Nexus.sln --configuration Release
npm --prefix apps/admin run build
npm --prefix apps/admin run test
```

Only run `apps/react-frontend` checks when the user explicitly approves work in
that legacy/frozen frontend. For backend contract compatibility, prefer ASP.NET
regression tests plus route/API matrix and runtime smoke tests against the
canonical Laravel React frontend.

For docs-only changes, at minimum run link/path sanity checks with `rg` and
inspect `git diff`. For maintained documentation changes, also run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/check-documentation-consistency.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/check-markdown-links.ps1
git diff --check
```

## Database Migration Workflow

All schema changes flow through EF migrations committed to git. The runtime API
image does not contain the .NET SDK or the repository source, so the historical
`make migrate*` and `docker compose exec api dotnet ef` commands are not a
supported workflow.

Use the host .NET 8 SDK and an explicitly disposable PostgreSQL connection as
documented in [`docs/database-migrations.md`](docs/database-migrations.md).

Production migrations require explicit deployment instruction and the production
container guide. Never apply ad-hoc production schema edits.

## Documentation

Documentation that future agents should trust lives under `docs/` and is
indexed by `docs/README.md`. Keep local-only generated audits, scratch output,
and one-off prompts out of committed docs unless they have been curated into a
maintained map.

Audience entry points are [`docs/user/README.md`](docs/user/README.md),
[`docs/admin/README.md`](docs/admin/README.md),
[`docs/api/README.md`](docs/api/README.md), and
[`docs/system/README.md`](docs/system/README.md). Support and private security
reporting live in [`SUPPORT.md`](SUPPORT.md) and [`SECURITY.md`](SECURITY.md).

When updating parity docs, cite local source paths instead of memory and keep
the Laravel repo read-only.
