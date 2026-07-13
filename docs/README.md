# Project NEXUS .NET Documentation

Last reviewed: 2026-07-13

This directory contains the maintained documentation for the Project NEXUS .NET
Edition. The canonical Laravel source for parity is
`C:\platforms\htdocs\staging`, which must remain read-only from this repo.

## Start Here

| Document | Purpose |
| --- | --- |
| [FULL_PARITY_REMEDIATION_RUNBOOK.md](FULL_PARITY_REMEDIATION_RUNBOOK.md) | Current cross-workstream audit, prioritized remediation queue, autonomous execution loop, and evidence-backed completion gates for ASP.NET and Web UK parity. |
| [CURRENT_LARAVEL_PARITY_HANDOFF.md](CURRENT_LARAVEL_PARITY_HANDOFF.md) | Resume protocol, live-state refresh commands, current blockers, and next-step rules for the Laravel backend parity job. Start here if an agent is taking over mid-stream. |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Runtime boundaries, application surfaces, and invariants for the .NET edition. |
| [MODULES.md](MODULES.md) | Module-by-module Laravel source paths, .NET target paths, and parity status. |
| [LARAVEL_PARITY_MAP.md](LARAVEL_PARITY_MAP.md) | Canonical parity gap register and implementation backlog. |
| [PARITY_BACKLOG.md](PARITY_BACKLOG.md) | Generated backlog rollup, priority semantics, and implementation consumption rules. |
| [API_PARITY.md](API_PARITY.md) | API contract inventory and comparison policy. |
| [REACT_FRONTEND_RETIREMENT.md](REACT_FRONTEND_RETIREMENT.md) | Retirement policy for the old ASP.NET React fork and contract-compatibility rules for the Laravel React frontend. |
| [ACCESSIBLE_SHARED_FRONTEND.md](ACCESSIBLE_SHARED_FRONTEND.md) | Current architecture, two Laravel sources of truth, repository/data boundaries, GOV.UK upstream references, and guardrails for the shared Web UK implementation. |
| [../apps/web-uk/docs/CURRENT_LARAVEL_FIRST_PARITY_STATUS.md](../apps/web-uk/docs/CURRENT_LARAVEL_FIRST_PARITY_STATUS.md) | Current Laravel-first status, cross-session ownership boundaries, blockers, and ordered completion queue. Read this before older Web UK handoffs. |
| [../apps/web-uk/docs/CURRENT_WEB_UK_HANDOFF.md](../apps/web-uk/docs/CURRENT_WEB_UK_HANDOFF.md) | Resume protocol, route-matrix refresh commands, certification rules, and next-step checklist for the accessible Web UK rewrite. |
| [SCHEMA_PARITY.md](SCHEMA_PARITY.md) | Database table/entity/migration parity inventory and generated report policy. |
| [FRONTEND_PARITY.md](FRONTEND_PARITY.md) | React and accessible frontend route parity inventory and generated report policy. |
| [LOCALIZATION_PARITY.md](LOCALIZATION_PARITY.md) | Locale, namespace, and translation-key parity inventory. |
| [database-migrations.md](database-migrations.md) | EF Core migration workflow and drift prevention. |
| [REGISTRATION_POLICY_ENGINE.md](REGISTRATION_POLICY_ENGINE.md) | Registration and identity-verification architecture. |

## Documentation Rules

- Do not claim 100% parity until the parity map shows no open gaps and
  verification passes.
- Keep Laravel references source-backed and path-specific.
- Keep generated one-off reports out of committed docs unless curated into a
  maintained map.
- Preserve production warnings from `CLAUDE.md` and
  `.claude/production-containers.md`.
- Treat `apps/react-frontend/` as a legacy/frozen React copy, not the forward
  development target.
- Treat `C:\platforms\htdocs\staging\react-frontend` as the canonical React
  frontend contract target for ASP.NET backend compatibility.
- Do not modify frontend files unless the user explicitly approves that specific
  frontend change.
- Treat `apps/web-uk/` as the shared accessible frontend implementation target;
  its repository location does not make ASP.NET authoritative.
- Treat Laravel Blade as the product/UI source of truth and the Laravel
  backend/API as the backend-contract source of truth for `apps/web-uk/`.
- Do not modify ASP.NET backend code, migrations, schema, fixtures, or runtime
  data from the Web UK workstream.
- Treat the Laravel repository, schema, and ordinary local database as read-only
  from Web UK work. Mutation certification requires a dedicated disposable
  environment or explicit authorization with verified cleanup.
- Do not point production utility-bar traffic at `apps/web-uk/` until accessible
  route/workflow/tenant/auth/accessibility certification passes.
