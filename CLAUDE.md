# Project NEXUS .NET Edition - Agent Guide

Last reviewed: 2026-07-03

> WARNING: Before deploying or touching any production container, read
> `.claude/production-containers.md`.
>
> The .NET Edition user-facing SPA is the `nexus-react-frontend` container on
> port `5210`, image `nexus-react-frontend:prod`, built from
> `apps/react-frontend/Dockerfile.prod`. It is run with raw `docker run`, not
> `docker compose`. Never touch the Laravel Edition blue/green PHP containers
> from this repo.

## What This Project Is

This repository is the experimental ASP.NET Core 8 / PostgreSQL backend for
Project NEXUS. It is a clean .NET implementation of the canonical Laravel
Project NEXUS platform, not a PHP migration dump.

The Laravel Edition at `C:\platforms\htdocs\staging` is the current source of
truth for parity. Treat it as read-only reference material. Do not edit it, run
destructive commands in it, deploy it, or touch its production containers from
this workspace.

The objective is now full Laravel parity: API contracts, workflows, frontend
surfaces, admin and super-admin surfaces, accessible frontend behavior,
background jobs, integrations, tenant settings, localization, tests, and
documentation. Earlier "out of scope" exclusions are retired and are now tracked
as parity gaps.

## Current Inventory Snapshot

Backend, API, schema, frontend, localization, and backlog counts were refreshed
from source on 2026-07-04.

| Surface | Laravel Edition (`C:\platforms\htdocs\staging`) | .NET Edition (this repo) |
| --- | ---: | ---: |
| Controllers | 308 PHP controller files | 208 C# controller files |
| Services | 479 PHP service files | 181 C# service files |
| Models/entities | 200 Laravel model files | 186 EF entity files |
| Migrations | 318 Laravel migrations | 85 EF migration classes excluding designers/snapshot |
| API contract | 679 OpenAPI paths / 891 operations | no committed OpenAPI snapshot; 3,351 static operations from `scripts/compare-laravel-api-parity.ps1`; 2,206 static matches / 221 missing source operations |
| Schema tables | 361 Laravel source tables from `scripts/compare-laravel-schema-parity.ps1` | 309 static EF/migration table names; 119 exact matches |
| Frontend routes | 589 React routes / 607 accessible routes from `scripts/compare-laravel-frontend-parity.ps1` | 462 React routes / 136 `apps/web-uk` routes; 393 React matches and 53 accessible matches |
| Localization | 11 locales / 605 locale namespaces; English key scan has 17,280 Laravel keys | 7 locales / 280 locale namespaces; English key scan has 5,575 .NET keys and 157 matches |
| Module docs | 24 curated Laravel module guides | docs recreated in this pass |
| Locales | 11 Laravel locales | 7 React locale directories |

The static operation count is not a parity score. The .NET controllers include
compatibility and admin routes that must be normalized through the parity script
and, eventually, a generated .NET OpenAPI snapshot before they can be compared
fairly with Laravel `openapi.json`.

## Parity Status Policy

Do not claim 100% parity, a 1,000/1,000 score, or production replacement status
until the parity maps in `docs/` show no open gaps and the relevant test suites
pass. Previous numeric parity scores in this repo are retired because they
excluded modules that are now in scope.

The canonical tracking documents are:

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
- Tenant SSO/OIDC login flow: provider administration is implemented, but
  redirect/callback, PKCE state, token validation, account linking, and
  domain-guarded provisioning still require parity work.
- Mailchimp-like audience/template/sync behavior where Laravel still exposes it.
- Partner API and partner portal surfaces.
- Super-admin and platform-level federation/tenant controls.
- The accessible HTML/GOV.UK-style frontend parity surface.

## Frontend Parity Targets

The primary production parity SPA is `apps/react-frontend/`.

- `apps/react-frontend/src/admin/` is the primary admin parity target.
- `apps/web-uk/` is no longer dismissed from parity. It is the .NET accessible
  frontend candidate and must be mapped against Laravel `accessible-frontend/`
  and `routes/govuk-alpha*`.
- `apps/admin/` is a secondary standalone admin app. Do not use it as the main
  Laravel parity target unless a task explicitly asks for standalone-admin work.

## Architecture Invariants

Preserve these invariants when implementing parity:

- ASP.NET Core 8 backend with EF Core and PostgreSQL.
- JWT authentication, refresh-token safety, and admin policies.
- Tenant isolation on every business query and write path.
- CORS origins aligned with deployed frontend domains.
- FIDO2/WebAuthn relying-party domain and origin rules.
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

```bash
docker compose up -d
docker compose logs -f api
docker compose build api && docker compose up -d api
docker compose down
```

Services:

| Service | URL | Notes |
| --- | --- | --- |
| API | `http://localhost:5080` | ASP.NET backend |
| Swagger | `http://localhost:5080/swagger` | Runtime API documentation |
| Health | `http://localhost:5080/health` | Anonymous health endpoint |
| React frontend | `http://localhost:5173` | Primary parity SPA |
| Web UK frontend | `http://localhost:5180` | Accessible parity candidate |
| Standalone admin | `http://localhost:5190` | Secondary admin app |

Test credentials:

- `admin@acme.test` / `Test123!` / tenant slug `acme`
- `member@acme.test` / `Test123!` / tenant slug `acme`
- `admin@globex.test` / `Test123!` / tenant slug `globex`

## Verification Commands

Use the narrowest command that proves the change, then broaden when behavior or
shared contracts are touched.

```bash
dotnet test Nexus.sln --configuration Release
npm --prefix apps/react-frontend run lint
npm --prefix apps/react-frontend run test:ci
npm --prefix apps/admin run build
npm --prefix apps/admin run test
```

For docs-only changes, at minimum run link/path sanity checks with `rg` and
inspect `git diff`.

## Database Migration Workflow

All schema changes flow through EF migrations committed to git.

```bash
make migrate NAME=AddFeature
make migrate-apply
make migrate-status
make drift-check
make test
```

Production migrations require explicit deployment instruction and the production
container guide. Never apply ad-hoc production schema edits.

## Documentation

Documentation that future agents should trust lives under `docs/` and is
indexed by `docs/README.md`. Keep local-only generated audits, scratch output,
and one-off prompts out of committed docs unless they have been curated into a
maintained map.

When updating parity docs, cite local source paths instead of memory and keep
the Laravel repo read-only.
