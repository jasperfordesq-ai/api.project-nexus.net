# Current Laravel Backend Parity Handoff

Last reviewed: 2026-07-07

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

## Current Snapshot

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

1. Regenerate comparators and update stale count tables in curated docs.
2. Finish dirty in-progress backend parity work without overwriting other
   agents' changes.
3. Convert static API matches into runtime-proven workflow contracts.
4. Close or explicitly alias schema gaps, especially renamed-table families.
5. Close localization gaps for backend, admin, email, API, and accessible copy.
6. Add Laravel React smoke coverage for high-value workflows.
7. Resolve the `dotnet test` blocker or document the approved local workaround.
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
