# Current Laravel Backend Parity Handoff

Last reviewed: 2026-07-10

> **Current audit notice (2026-07-10):** Read the verified slice below and
> `docs/FULL_PARITY_REMEDIATION_RUNBOOK.md` before using the historical numeric
> snapshot or score. Route closure is not workflow, schema, localization, or
> runtime certification.

This is the first file to read if an agent needs to resume the Laravel backend
parity job after a session interruption. The implementation branches may still
be moving, so treat every numeric snapshot below as advisory. Regenerate the
live state before editing code or claiming progress.

## Objective

Make the ASP.NET backend contract-compatible with the Laravel backend so the
canonical Laravel React frontend can run against either backend without
frontend adapters.

The target is not "similar behavior". The target is compatible methods, paths,
aliases, request bodies, query strings, multipart fields, response envelopes,
pagination metadata, validation errors, status codes, auth behavior, tenant
behavior, upload behavior, feature flags, realtime/bootstrap config, and
workflow side effects.

## Source Of Truth

| Surface | Source |
| --- | --- |
| Laravel backend | `C:\platforms\htdocs\staging` |
| Laravel OpenAPI | `C:\platforms\htdocs\staging\openapi.json` |
| Laravel routes | `C:\platforms\htdocs\staging\routes` |
| Laravel React frontend contract | `C:\platforms\htdocs\staging\react-frontend` |
| ASP.NET backend target | `C:\platforms\htdocs\asp.net-backend` |

The Laravel repo is read-only reference material from this workspace. Do not
edit it, deploy it, run destructive commands in it, or touch Laravel production
containers from this repo.

## Non-Negotiable Rules

- Do not modify `apps/react-frontend/` unless the user explicitly approves that
  exact frontend change. It is a frozen historical copy.
- Do not make the Laravel React frontend weaker or add ASP.NET-specific frontend
  branches to hide backend incompatibility.
- Do not claim 1000/1000 parity until generated docs show no open gaps and
  runtime smoke tests prove the Laravel React frontend can exercise the ASP.NET
  backend without contract failures.
- Do not overwrite dirty files created by another active agent. Check status and
  diffs before editing.
- Keep generated scratch artifacts out of committed docs unless curated into a
  maintained map.

## Latest Verified Backend Slice — 2026-07-10

Backend commit `d2132a50` (`Harden backend auth roles and scheduled parity`) is
on `main` and was pushed to `origin/main`. Concurrent dirty files under
`apps/web-uk/` belong to another active workstream and were not staged or
modified by this backend slice. Follow-up commit `bcc317e3` adds the
fail-closed migration-discovery quarantine gate and fixes the CI model-drift
exit-code interpretation; `b6ab9d17` documents it. Commit `92440f48` replaces
the canonical federation partnership list/approve/reject stubs with the first
real receiver-scoped decision workflow. The current follow-up slice replaces
the core volunteering placeholder successes with PostgreSQL-backed,
tenant-scoped transactions. Its latest source migration is
`20260710171315_AdminVolunteerApprovalWorkflow`; EF discovery/model drift, the
76-migration fresh chain, and the wider 180-test contract regression are green.

| Area | Verified completed behavior | Explicit remaining gap |
| --- | --- | --- |
| Roles | `CanonicalRoleSemantics` adds `is_admin`, `is_super_admin`, `is_tenant_super_admin`, and `is_god`; named policies read current DB state and reject inactive, deleted, role-drifted, or tenant-drifted users; v2 failures use canonical errors. Role-only `god` never satisfies `GodOnly`, and explicit-God targets cannot be deleted, suspended, banned, reset, or impersonated by lower privilege tiers. | Resource-level SuperPanel/hub rules, notifications, audit side effects, and full application-runtime proof remain. |
| 2FA | Password login uses opaque 64-character challenges bound to user, tenant, and TOTP enrollment; `/api/totp/verify` supports TOTP and backup codes, limits attempts, consumes successful or drifted challenges, and rechecks account/tenant state. Canonical setup/verify/disable uses a real SVG QR code, atomic enabled-state/backup-code persistence, and password-confirmed disable. Unsupported forced first-login admin enrollment now fails startup when either legacy flag is enabled instead of emitting a lockout challenge. | Challenges are process-local; trusted-device lifecycle, security notifications, a TOTP-specific encryption key, multi-node proof, and a compatible first-login enrollment client remain open. |
| Passkeys | `PasskeysController` solely owns all nine canonical `/api/webauthn/*` routes. Registration/authentication use real FIDO options; challenges expire after 120 seconds and are atomically consumed once per process; credential management uses opaque IDs scoped to the authenticated user and tenant. | Anonymous discovery can remain tenantless when no tenant resolves; challenge state is process-local; sign-counter concurrency, multi-instance behavior, and browser smoke remain open. |
| Scheduler | Natural and manual runs share one execution gate/body; real run/registry outcomes are recorded; inactive tenants are excluded and per-tenant failures aggregate. V2 manual execution requires platform-super access. `listing-expiry` and `job-expiry` execute real jobs; unmapped jobs return 501, busy returns 409, and non-persisted/failure outcomes return 500. The list reports only these two mappings active and the other 40 disabled with `execution_supported:false`. | 40 of 42 catalog jobs remain unmapped; fresh-runtime `scheduled_job_runs` proof remains open. |
| Broker writes | Canonical risk-tag, monitoring, unreviewed-count, and configuration aliases have one `AdminBrokerController` owner under DB-backed `BrokerOrAdmin` authorization. Risk-tag and monitoring writes persist and are covered by a live broker test; tenant-wide configuration writes remain admin-only rather than allowing unsafe arbitrary broker keys. | Canonical risk/monitoring columns, notification/audit fidelity, and granular broker-safe configuration keys remain incomplete. Archive reads are still compatibility scaffolding. |
| Federation partnership decisions | Canonical `/api[/v2]/admin/federation/partnerships` lists incoming and outgoing rows without changing the legacy outgoing-only route. Approve/reject require the receiving tenant, conditionally transition only `pending`, atomically persist one receiver-to-requester audit row, return Laravel status/error envelopes, and notify initiating-tenant admins only after commit. Same-action and approve-versus-reject races produce one winner and one side-effect set. | Laravel federation-level permission initialization, durable rejection actor/time/reason columns, localized link/push notifications, durable initial-sync scheduling, and canonical audit-log read visibility remain open. This is core decision-state parity, not complete federation parity. |
| Transactional volunteering core | Selected-shift applications enforce feature, tenant, public/future shift, capacity, duplicate, and guardian-consent gates; optional auto-approval and later admin/organizer decisions share shift-row capacity locks. Admin and organizer decisions conditionally transition pending applications, persist reviewer/org-note state, and apply their surface-specific post-commit bell, link, push, and email policies. Direct signup/cancellation, group reservations and roster mutation, waitlist join/leave/claim, displaced-shift re-offers, stale-offer expiry, and the scheduled expiry job use tenant-scoped transactions and one-winner capacity/queue locking. Guardian consent is shared across apply, signup, waitlist, and group-add entry paths and supports opportunity scope plus expiry. | Unchanged-frontend runtime smoke remains pending. Volunteer-organisation status/membership ownership is not represented in the ASP.NET schema, so organisation fields/manager grants remain narrower. Localized built-in notification/email copy, live provider delivery, and unrelated long-tail volunteering compatibility handlers remain open. |
| Route ownership | Synthetic duplicate owners were removed, six federation credit-agreement actions use literal routes, and the live endpoint-table test enforces one owner per verb/normalized admin template plus expected owners for high-risk routes. The comparator requires all six literal actions before treating Laravel's constrained `{action}` route as covered. | Ownership covers admin routes, not all API routes, and does not prove handler semantics. Recorded-only/catch-all handlers remain elsewhere. |

Verification evidence for this slice:

- combined Release build: success, 4 pre-existing `xUnit1031` warnings, 0 errors;
- `AdminRouteOwnershipParityTests` + `AdminV2RouteAliasUnitTests`: 134/134;
- roles, hidden privilege routes, role writers, 2FA, TOTP, and passkeys: 63/63;
- `Phase73NewScheduledJobsTests`: 16/16 after one Testcontainers-only startup retry;
- exact React cron/security contracts: 3/3;
- canonical broker persistence contract: 1/1;
- API comparator: 2,436/2,436 matched, 0 missing;
- pre-volunteering EF Release baseline: 75 migrations, latest
  `20260710092435_CanonicalRoleSemantics`; no pending model changes.
- pre-volunteering migration discovery quarantine baseline: 1/1, with 104 source classes split into
  75 EF-discovered and 29 explicitly quarantined classes.
- federation partnership workflow: 6/6 PostgreSQL-backed tests, including
  simultaneous approve/approve and approve/reject races;
- adjacent legacy federation, compatibility, and route-ownership regressions:
  129/129; corrected dual-route reflection coverage: 2/2;
- post-federation-review API Release build: 0 warnings, 0 errors; test-project
  build: 4 pre-existing `xUnit1031` warnings, 0 errors; EF reported no model
  drift at that pre-volunteering baseline.
- current transactional volunteering focused regression: 61/61 passed;
- current API and test-project Release builds: green with no compile errors;
- latest volunteering migration source:
  `20260710171315_AdminVolunteerApprovalWorkflow`;
- final migration discovery: 105 source classes, 76 EF-discovered, 29 explicitly
  quarantined; EF reports no pending model changes;
- blank disposable PostgreSQL: all 76 discovered migrations applied, latest
  history id `20260710171315_AdminVolunteerApprovalWorkflow`; container removed;
- wider volunteering route/auth/notification/legacy contract regression:
  180/180 passed.

The new migration deliberately has no destructive downgrade path. Its `Down`
fails before changing schema because the former unique
tenant/opportunity/user application index cannot be restored after legitimate
declined/withdrawn reapplication history without data loss.

Migration discovery now fails closed in CI, but schema reconciliation remains a
red gate: 29 legacy classes are explicitly quarantined because they are
not discoverable by EF. Because most contain non-idempotent DDL, do not restore
their metadata until supported database histories and schemas are reconciled.
The gate prevents silent inventory drift; the disposable proof certifies the 76
discovered migrations, not replay safety for those 29 classes. No production
database or container was touched.

## Historical Snapshot (2026-07-07)

Snapshot captured during documentation handoff work on 2026-07-07. Regenerate
before trusting it.

| Item | Last observed state |
| --- | --- |
| Backend branch | `main` in `C:\platforms\htdocs\asp.net-backend` |
| Backend head commit | `44695cf0 Add Laravel React backend parity endpoints` |
| Backend remote delta | `main...origin/main [ahead 52]` |
| Backend dirty files seen | `src/Nexus.Api/Controllers/ShiftManagementController.cs`, `src/Nexus.Api/Services/ShiftManagementService.cs`, `tests/Nexus.Api.Tests/LaravelReactFrontendContractTests.cs`, plus `codex-write-test.tmp` |
| Working estimate | about `600/1000` implementation parity |
| Documentation readiness after this handoff | `1000/1000` for resuming safely, assuming agents rerun the refresh protocol |

The latest earlier audit found static API route coverage closed but deeper
backend parity still incomplete:

| Comparator | Last observed result |
| --- | --- |
| API source operations | `2432` Laravel source ops, `2432` matched, `0` missing |
| ASP.NET static operations | `4221` operations |
| Schema | `361` Laravel tables, `319` ASP.NET table names, `127` exact matches, `234` missing, `192` extra |
| Localization | `11` Laravel locales vs `7` .NET locales; `605` Laravel namespaces vs `280` .NET namespaces; `49` namespace matches; `4942` missing English keys in matched namespaces |
| Build | `dotnet build Nexus.sln --configuration Release --no-restore` passed earlier on 2026-07-07 |
| Test risk | Full `dotnet test` was previously blocked by Windows Application Control loading `OpenTelemetry.Exporter.Prometheus.AspNetCore.dll` |

## Refresh Protocol

Run this in the backend checkout before continuing work or reporting a score:

```powershell
cd C:\platforms\htdocs\asp.net-backend
git status --short --branch
git log --oneline --decorate -n 20
git diff --stat

powershell -NoProfile -ExecutionPolicy Bypass -File scripts\test-compare-laravel-api-parity.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\test-compare-laravel-schema-parity.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\test-compare-laravel-localization-parity.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\test-export-laravel-parity-backlog.ps1

dotnet build Nexus.sln --configuration Release --no-restore
dotnet test Nexus.sln --configuration Release --no-restore
```

If `dotnet test` is blocked by Windows Application Control, record the exact
blocked DLL and command output in the final handoff note. Do not treat that as a
passing test run.

## Documents To Trust

Read these in order:

1. `AGENTS.md`
2. `CLAUDE.md`
3. `docs/README.md`
4. `docs/API_PARITY.md`
5. `docs/LARAVEL_PARITY_MAP.md`
6. `docs/SCHEMA_PARITY.md`
7. `docs/LOCALIZATION_PARITY.md`
8. `docs/PARITY_BACKLOG.md`
9. `docs/REACT_FRONTEND_RETIREMENT.md`

Some older count tables are intentionally historical. The comparator commands
above are the source of current numeric truth.

## What Counts As Done

A module or endpoint family is not complete until all of these are true:

- Laravel React call sites are identified.
- Laravel OpenAPI and route declarations are matched by ASP.NET.
- `/api/v2` aliases exist where Laravel React expects them.
- Request/query/multipart shapes match.
- Response envelopes, pagination, validation errors, auth errors, tenant errors,
  and not-found behavior match.
- Tenant scoping and feature/module gates match Laravel behavior.
- Focused ASP.NET regression tests cover the contract.
- Runtime smoke tests prove the Laravel React frontend can use the ASP.NET
  backend for the workflow.
- Docs are updated with evidence and any remaining gaps.

## Known Remaining Work

Prioritize workflow-complete slices over raw endpoint count. Route declarations
are mostly closed; the remaining work is contract correctness.

1. Reconcile supported database histories and schemas for the explicit
   29-entry migration quarantine before restoring any missing metadata.
2. Replace the remaining 40 unmapped cron definitions with real jobs or keep
   them explicitly disabled/unsupported until equivalent work executes.
3. Close the remaining volunteering organisation ownership/status,
   localization/provider, long-tail handler, and frontend-runtime gaps. Finish
   federation permission/rejection
   schema, initial-sync/outbox, localized notification, and canonical audit-read
   parity before broker archive reads.
4. Complete multi-node challenge storage, trusted devices, auth security
   notifications, TOTP key separation, and WebAuthn sign-counter concurrency.
5. Close or explicitly alias schema gaps, especially renamed-table families.
6. Close localization gaps for backend, admin, email, API, and accessible copy.
7. Convert static API matches into runtime-proven Laravel React workflows and
   add browser smoke for the highest-risk auth/admin/provider paths.
8. Update `docs/PARITY_BACKLOG.md` after each completed workflow batch.

## Scoring Guide

Use scores only as working estimates. They are not a substitute for acceptance
criteria.

| Range | Meaning |
| --- | --- |
| `0-300` | Inventory or skeleton only |
| `300-600` | Broad routes exist, limited contract proof |
| `600-800` | Most route/API surface exists, major runtime/schema/localization gaps remain |
| `800-950` | Runtime-proven workflows dominate, remaining gaps are narrow and documented |
| `950-1000` | No known route/API/schema/localization gaps; full regression and smoke suites pass |

Current working estimate at this handoff: `600/1000`.

## Final Handoff Checklist

Before leaving this job for another agent, write a short note containing:

- branch and head commit;
- dirty files and whether each is yours or pre-existing;
- refreshed comparator counts;
- latest build/test commands and results;
- current implementation score out of 1000;
- next 5 concrete tasks;
- any blocked commands with exact error text;
- files changed in the handoff.
