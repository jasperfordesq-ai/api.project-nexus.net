# Project NEXUS .NET Documentation

Last reviewed: 2026-07-03

This directory contains the maintained documentation for the Project NEXUS .NET
Edition. The canonical Laravel source for parity is
`C:\platforms\htdocs\staging`, which must remain read-only from this repo.

## Start Here

| Document | Purpose |
| --- | --- |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Runtime boundaries, application surfaces, and invariants for the .NET edition. |
| [MODULES.md](MODULES.md) | Module-by-module Laravel source paths, .NET target paths, and parity status. |
| [LARAVEL_PARITY_MAP.md](LARAVEL_PARITY_MAP.md) | Canonical parity gap register and implementation backlog. |
| [PARITY_BACKLOG.md](PARITY_BACKLOG.md) | Generated backlog rollup, priority semantics, and implementation consumption rules. |
| [API_PARITY.md](API_PARITY.md) | API contract inventory and comparison policy. |
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
- Treat `apps/react-frontend/` as the primary SPA/admin parity target.
- Treat `apps/web-uk/` as the .NET accessible frontend candidate and map it
  against Laravel `accessible-frontend/`.
