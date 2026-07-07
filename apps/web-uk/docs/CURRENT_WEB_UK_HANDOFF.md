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
| Head commit | Run `git rev-parse --short HEAD` in this worktree; this handoff may be updated before or after focused commits. |
| Dirty files seen | Latest focused edits add signed-session public auth alias parity and smoke coverage. Rerun `git status --short --branch` and treat that as authoritative. |
| Working estimate | about `920/1000` implementation/certification parity |
| Documentation readiness after this handoff | Current for route declarations, Laravel auth-smoke tenant-context evidence, default public module-page smoke scope, and broader signed module-page smoke scope, assuming agents rerun the refresh protocol |

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
tests/laravel-runtime-smoke.test.js` passed with `6/6` tests after red steps
for the missing harness, stale Acme defaults, missing public module-page checks,
missing signed module-page checks, and a too-short default timeout for slower
Laravel-backed signed pages.

Live local smoke result on 2026-07-07: direct Laravel login succeeds for the
E2E fixture account when `X-Tenant-ID: 2` or `X-Tenant-Slug: hour-timebank` is
sent. `npm run smoke:laravel` passed end-to-end against a temporary web-uk
process started with `TENANT_ID=2`, `WEB_UK_BASE_URL=http://127.0.0.1:5181`,
and `SMOKE_TIMEOUT_MS=60000`: Laravel API `200`, web-uk health `200`, unsigned
`/account` -> `/login`, `/login` CSRF rendered, login POST -> `/dashboard`, and
signed `/account` rendered `200`. The current smoke scope also checks
`/volunteering`, `/organisations`, `/organisations/browse`, `/kb`, and `/help`
return 2xx through web-uk while Laravel is the backend target. After the login
flow, it checks the broad signed page set covering `/explore`, `/saved`,
`/notifications`, `/members`, `/members/discover`, `/resources`, `/skills`,
`/goals`, `/clubs`, `/wallet`, `/messages`, `/connections`, `/connections/network`,
`/matches`, `/matches/board`, `/activity`, `/achievements`, `/leaderboard`,
`/nexus-score`,
`/profile/settings`, `/settings/appearance`, `/settings/data-rights`,
`/federation`, `/courses`, `/courses/mine`, `/marketplace`,
`/marketplace/mine`, `/events`, `/events/new`, `/listings`,
`/search/advanced`, `/premium`, and `/podcasts`, plus deeper signed subpages
across profile, settings,
achievements, leaderboard, federation, courses, marketplace, and volunteering.
A later 2026-07-07 smoke run against
`WEB_UK_BASE_URL=http://127.0.0.1:5293` passed `93/93` checks with that expanded
scope. A follow-up 2026-07-07 probe against
`WEB_UK_BASE_URL=http://127.0.0.1:5294` found another stable 2xx batch. The
expanded harness passed `158/158` checks against
`WEB_UK_BASE_URL=http://127.0.0.1:5295`: 6 auth/health checks and 152 module
page checks. `/feed` is now part of the default signed page scope and renders
the local Laravel-backed feed page with an empty/error state when Laravel's feed
collection API is unavailable; a later run against
`WEB_UK_BASE_URL=http://127.0.0.1:5297` passed `159/159`: 6 auth/health checks
and 153 module page checks. Plain `/connections` is now in the default signed
scope and renders with an empty/error state when Laravel's legacy connections
API is unavailable; a later run against
`WEB_UK_BASE_URL=http://127.0.0.1:5298` passed `160/160`: 6 auth/health checks
and 154 module page checks. Plain `/members` is now in the default signed scope
and renders with an empty/error state when Laravel's legacy members API is
unavailable; a later run against `WEB_UK_BASE_URL=http://127.0.0.1:5299` passed
`161/161`: 6 auth/health checks and 155 module page checks. `/events/new` and
`/marketplace/onboarding` are now in the default signed scope and render form
pages with empty/error setup state when Laravel helper APIs are unavailable; a
later run against `WEB_UK_BASE_URL=http://127.0.0.1:5302` passed `163/163`: 6
auth/health checks and 157 module page checks. The feature/role-gated pages
`/jobs/bias-audit`, `/jobs/talent-search`, and `/marketplace/coupons` are now
covered as expected signed-session `403` checks; a later run against
`WEB_UK_BASE_URL=http://127.0.0.1:5306` passed `166/166`: 6 auth/health checks,
157 module page checks, and 3 gated-status checks. `/onboarding` and
`/premium/manage` are now covered as expected signed-session redirect checks; a
later run against `WEB_UK_BASE_URL=http://127.0.0.1:5307` passed `168/168`: 6
auth/health checks, 157 module page checks, 3 gated-status checks, and 2
redirect-status checks. `/listings` needed a Nunjucks
owner-id guard because Laravel can return nested `user.id` without a flat
`user_id`; the default smoke timeout is now `60000` ms for slower Laravel
fixture pages. Signed-session public auth aliases `/login`,
`/login/forgot-password`, `/password/reset?token=reset-token`, and `/register`
now remain renderable like Laravel and are part of the default 2xx smoke scope;
the latest live run against `WEB_UK_BASE_URL=http://127.0.0.1:5308` passed
`172/172`: 6 auth/health checks, 161 module/page checks, 3 gated-status checks,
and 2 redirect-status checks.
`/login/two-factor` remains outside that generic scope because Laravel redirects
it when the session-backed 2FA token is absent. Without
`TENANT_ID=2`, the same Laravel E2E credentials fail because web-uk does not
send the tenant context Laravel uses to scope login.

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
For local Laravel auth smoke, ensure the web-uk process was started with
`TENANT_ID=2`. The harness default timeout is `60000` ms; keep
`SMOKE_TIMEOUT_MS` available for exceptionally slow local runs.

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

1. Rerun the refresh protocol and confirm whether the current web-uk process has
   Laravel tenant context (`TENANT_ID=2` for the local E2E fixture).
2. Keep expanding runtime smoke coverage from auth/account into module families
   that are currently only mocked.
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

Current working estimate at this handoff: `920/1000`.

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
