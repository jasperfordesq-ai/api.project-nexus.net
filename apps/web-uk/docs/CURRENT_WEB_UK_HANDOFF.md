# Current Web UK Accessible Frontend Handoff

Last reviewed: 2026-07-07

This is the first file to read if an agent needs to resume the accessible
frontend rewrite after a session interruption. The branch is actively being
worked by other agents, so every count here is a snapshot. Regenerate live
state before editing, scoring, or claiming completion.

## Objective

Rewrite `apps/web-uk` so it can become the shared accessible frontend candidate
for Project NEXUS. It must use:

- the Laravel backend as the current default source of truth for data and
  workflow contracts;
- the Laravel accessible frontend as the visual, layout, route, and page-flow
  source of truth;
- the existing ASP.NET repo accessible stack: Express, Nunjucks, GOV.UK
  Frontend, server-rendered HTML, no React.

The result must eventually be able to serve Laravel-compatible and
ASP.NET-compatible backends without page-level adapters. ASP.NET must bend
toward Laravel's accessible contracts.

## Source Of Truth

| Surface | Source |
| --- | --- |
| Laravel accessible app | `C:\platforms\htdocs\staging\accessible-frontend` |
| Laravel accessible routes | `C:\platforms\htdocs\staging\routes\govuk-alpha.php` |
| Laravel parity route files | `C:\platforms\htdocs\staging\routes\govuk-alpha-parity` |
| Laravel Blade views/controllers | `C:\platforms\htdocs\staging\accessible-frontend\views`, `C:\platforms\htdocs\staging\app\Http\Controllers\GovukAlpha` |
| Web UK target | `C:\platforms\htdocs\asp.net-backend\apps\web-uk` |
| Active worktree used by current agents | `C:\Users\jaspe\.config\superpowers\worktrees\asp.net-backend\codex-web-uk-laravel-parity` |

The Laravel repo is read-only reference material from this workspace.

## Non-Negotiable Rules

- Keep the stack as Express, Nunjucks, GOV.UK Frontend, SSR HTML.
- Do not add React, Next.js, Vue, client-side routing, or a new CSS framework.
- Do not use GOV.UK branding in a way that implies this is a UK government
  service.
- Do not make route matrix gaps disappear by weakening the Laravel source target.
- Do not treat generated preparation pages as workflow parity.
- Do not build backend-specific page adapters. Prefer Laravel-compatible API
  contracts and make ASP.NET match those contracts later.
- Do not overwrite dirty files created by active agents. Check status and diffs
  before editing.

## Current Snapshot

Snapshot refreshed during runtime-smoke harness work on 2026-07-07.
Regenerate before trusting it.

| Item | Last observed state |
| --- | --- |
| Branch | `codex/web-uk-laravel-parity` |
| Head commit | `7a124da7 feat: add Laravel group manage page` |
| Dirty files seen | Generated route-matrix docs plus the in-progress Laravel runtime smoke harness files. Rerun `git status --short --branch` and treat that as authoritative. |
| Working estimate | about `790/1000` implementation/certification parity |
| Documentation readiness after this handoff | Current for route declarations and runtime-smoke blocker evidence, assuming agents rerun the refresh protocol |

The latest generated route matrix at this handoff reported:

| Metric | Last observed result |
| --- | --- |
| Laravel accessible routes | `608` |
| Web UK routes | `690` |
| Matched routes | `608` |
| Missing Laravel routes | `0` |
| Extra Web UK routes | `83` |
| Generated prep-page matches | `0` rows matched through `src/routes/laravel-prep-pages.js` |

Focused runtime-smoke harness test: `npm test -- --runInBand
tests/laravel-runtime-smoke.test.js` passed with `2/2` tests after a red step
where `scripts/laravel-runtime-smoke.js` did not exist.

Live local smoke result on 2026-07-07: `npm run smoke:laravel` reached
Laravel `/api/v2/groups?limit=1` (`200`), web-uk `/health` (`200`), unsigned
`/account` -> `/login`, and `/login` CSRF rendering. It did not certify auth:
the login POST returned `200` instead of redirecting to `/dashboard`, and
direct Laravel `/api/auth/login` calls returned `401` for the documented
`member@acme.test`/`admin@acme.test` credentials with both `Test123!` and
`NexusV2!Demo#2026`.

## Refresh Protocol

Run this before continuing work or reporting a score:

```powershell
git status --short --branch
git log --oneline --decorate -n 20
git diff --stat -- apps/web-uk

cd apps\web-uk
npm run route:matrix
npm run lint
npm test -- --runInBand
npm run smoke:laravel
```

After `npm run route:matrix`, inspect:

```powershell
Get-Content docs\generated\accessible-route-matrix.md -TotalCount 120
Select-String -Path docs\generated\accessible-route-matrix.csv -Pattern 'laravel-prep-pages.js'
```

The route matrix only proves method/path declarations. It does not certify
Blade visual parity, auth redirects, tenant gates, feature gates, POST side
effects, localization, runtime Laravel behavior, or ASP.NET backend switching.
The smoke command is expected to fail until the local Laravel seed credentials
or auth state are restored; treat that failure as runtime evidence, not a
frontend parity pass.

## Documents To Trust

Read these in order:

1. `apps/web-uk/AGENTS.md`
2. `apps/web-uk/CLAUDE.md`
3. `apps/web-uk/README.md`
4. `apps/web-uk/docs/ACCESSIBLE_SHARED_FRONTEND.md`
5. `apps/web-uk/docs/LARAVEL_ACCESSIBLE_ROUTE_MATRIX.md`
6. `apps/web-uk/docs/generated/accessible-route-matrix.md`
7. `apps/web-uk/docs/generated/accessible-route-matrix.csv`
8. `apps/web-uk/docs/BLADE_COMPONENT_PORT_AUDIT.md`
9. `apps/web-uk/docs/BACKEND_SWITCHING_CONTRACT.md`

Treat `FRONTEND_BUILD_LOG.md` and `FRONTEND_AUDIT_REPORT.md` as historical
context unless a current handoff explicitly says otherwise.

## Certification Table

Use this table shape when certifying a route family. Add the updated result to
`LARAVEL_ACCESSIBLE_ROUTE_MATRIX.md` or a focused follow-up doc.

| Family | Route declared | Blade layout ported | Laravel API-backed | Mock-tested | Laravel runtime-smoked | ASP.NET-smoked |
| --- | --- | --- | --- | --- | --- | --- |
| Example | yes/no | yes/no/partial | yes/no/partial | yes/no | yes/no | yes/no |

Do not mark a family complete unless the answer is "yes" through Laravel
runtime smoke. Do not mark shared-backend readiness unless ASP.NET smoke is also
yes.

## What Counts As Done

A route family is not complete until all of these are true:

- Every Laravel accessible method/path declaration exists locally.
- Remaining `laravel-prep-pages.js` matches for that family are replaced with
  real route modules and Nunjucks views.
- The Nunjucks page follows the Laravel Blade layout, page intent, form flow,
  content hierarchy, status banners, empty states, and error states.
- Unsigned, signed, unauthorized, not-found, and feature-disabled states match
  Laravel behavior.
- API calls use Laravel-compatible endpoints and payloads.
- POST, upload, delete, and redirect side effects are covered.
- Mocked Jest coverage proves the no-JS route behavior.
- Runtime smoke tests prove the page works against the local Laravel backend.
- ASP.NET switching gaps are documented in `BACKEND_SWITCHING_CONTRACT.md`.
- The generated route matrix and port audit are refreshed.

## Known Remaining Work

Prioritize replacing generated prep pages and certifying runtime behavior over
adding more skeleton pages.

1. Rerun the refresh protocol and confirm the current smoke/auth state.
2. Restore or identify valid local Laravel seed credentials so
   `npm run smoke:laravel` can certify the login/dashboard path.
3. Convert "partial Laravel-backed candidate" route families into certified
   families using the certification table above.
4. Add runtime smoke coverage against local Laravel for tenant/auth/feature-gate
   behavior.
5. Keep `BACKEND_SWITCHING_CONTRACT.md` honest: ASP.NET target remains
   future/not-certified until proven.
6. Refresh generated route matrix files after route changes.
7. Mark stale historical docs as historical rather than relying on them for
   current status.

## Scoring Guide

Use scores only as working estimates. They are not a substitute for acceptance
criteria.

| Range | Meaning |
| --- | --- |
| `0-300` | Shell or route inventory only |
| `300-600` | Many declarations and skeletons exist, limited Laravel-backed behavior |
| `600-800` | Most routes declared, many pages Laravel-backed, runtime certification incomplete |
| `800-950` | Few prep pages remain, route families mostly runtime-smoked against Laravel |
| `950-1000` | All families certified against Laravel, ASP.NET switching proof complete, docs and tests green |

Current working estimate at this handoff: `660/1000`.

## Final Handoff Checklist

Before leaving this job for another agent, write a short note containing:

- branch and head commit;
- dirty files and whether each is yours or pre-existing;
- generated route matrix counts;
- remaining `laravel-prep-pages.js` matches;
- latest lint and Jest results;
- current implementation score out of 1000;
- next 5 concrete tasks;
- any runtime-smoke blockers;
- files changed in the handoff.
