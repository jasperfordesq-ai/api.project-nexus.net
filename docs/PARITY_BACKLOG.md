# Laravel Parity Implementation Backlog

Last reviewed: 2026-07-03

Canonical source: `C:\platforms\htdocs\staging` (read-only).

This document summarizes the generated implementation backlog. The full row-level
backlog is intentionally ignored by git and regenerated under
`artifacts/parity/backlog/` from the current API, schema, frontend, and
localization parity artifacts.

## Current Generated Rollup

Generated with `scripts/export-laravel-parity-backlog.ps1` on 2026-07-05 after
refreshing the API and schema artifacts and reusing the current 2026-07-04
frontend and localization artifacts.

| Metric | Count |
| --- | ---: |
| Total open backlog items | 6,672 |
| P0 items | 238 |
| P1 items | 6,430 |
| P2 items | 4 |
| API items | 181 |
| Schema items | 239 |
| Frontend items | 750 |
| Localization items | 5,502 |

These counts are not a parity score. They are implementation queue inputs
derived from static comparison artifacts.

## Area Rollup

| Area | Items |
| --- | ---: |
| Localization | 4,672 |
| Verein / Clubs | 669 |
| Accessible frontend | 466 |
| Unclassified parity gap | 431 |
| Mailchimp-like communications | 161 |
| Caring Community / National KISS | 115 |
| Marketplace / commerce | 74 |
| Partner API / portal | 39 |
| Identity verification providers | 35 |
| Regional Analytics | 10 |

P0 currently contains 238 items, led by Regional Analytics, unclassified API
contract gaps, marketplace commerce, Partner API, and Verein/Clubs. The P0 bucket means "implement or triage before admin
polish"; it does not mean every item is ready for one-commit implementation.

## Generated Artifacts

The exporter writes:

```text
artifacts/parity/backlog/parity-backlog.json
artifacts/parity/backlog/parity-backlog.csv
artifacts/parity/backlog/parity-backlog.md
```

Regenerate from the current comparison artifacts with:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\test-export-laravel-parity-backlog.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\export-laravel-parity-backlog.ps1
```

If source artifacts are stale, rerun the source comparators first:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\compare-laravel-api-parity.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\compare-laravel-schema-parity.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\compare-laravel-frontend-parity.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\compare-laravel-localization-parity.ps1
```

## Priority Semantics

- **P0**: missing API contracts and former-exclusion foundations that block
  user-facing workflows or accessible parity.
- **P1**: schema, frontend, namespace, and key gaps needed to complete module
  workflows after the blocking contracts are understood.
- **P2**: locale-level completion and lower-risk translation coverage that
  should close before any final parity claim.

## Consumption Rules

- Treat backlog rows as evidence-backed starting points, not automatic
  implementation instructions.
- Read the Laravel source path before implementing a row.
- Prefer batches that close a workflow end-to-end: API contract, schema,
  frontend route, localization, tests, and docs.
- Keep `apps/react-frontend/` as the primary SPA/admin target and `apps/web-uk/`
  as the accessible frontend target.
- Preserve ASP.NET Core, EF Core/PostgreSQL, JWT, tenant isolation, CORS,
  FIDO2/WebAuthn, AGPL, and production-container invariants.

## Acceptance Criteria

- Every backlog item is either implemented, intentionally aliased, replaced by a
  documented equivalent .NET workflow, or explicitly deferred by product
  decision outside this technical parity goal.
- API items include auth, tenant isolation, validation, response shape, error
  shape, and regression tests.
- Schema items include EF mappings, migrations, indexes/constraints where
  required, and tenant-safety verification.
- Frontend items include route/view behavior, API wiring, feature gates,
  localization, and accessibility checks.
- Localization items include namespace/key aliases where direct filename parity
  is not the right .NET target.
