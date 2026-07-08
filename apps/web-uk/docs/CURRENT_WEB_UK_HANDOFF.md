# Current Web UK Accessible Frontend Handoff

Last reviewed: 2026-07-08

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
| Dirty files seen | Latest focused edits record the full default Laravel runtime-smoke evidence. Rerun `git status --short --branch` and treat that as authoritative. |
| Working estimate | about `945/1000` implementation/certification parity |
| Documentation readiness after this handoff | Current for route declarations, backend base-URL provenance, Laravel auth-smoke tenant-context evidence, default public module-page smoke scope, broader signed module-page smoke scope, unsigned auth-required parameterised redirect smoke scope, full default runtime smoke, chunked runtime-smoke fallback evidence, and default real-fixture parameterised detail smoke evidence, assuming agents rerun the refresh protocol |

The latest generated route matrix at this handoff reported:

| Metric | Last observed result |
| --- | --- |
| Laravel accessible routes | `608` |
| Web UK routes | `610` |
| Matched routes | `608` |
| Missing Laravel routes | `0` |
| Extra Web UK routes | `0` |
| Ignored Web UK infrastructure routes | `3` |
| Generated prep-page matches | `0` rows matched through `src/routes/laravel-prep-pages.js` |

Latest focused login two-factor route slice: legacy local POST `/verify-2fa`
was removed. The 2FA challenge form now submits Laravel's canonical POST
`/login/two-factor` route, while GET `/login/two-factor` keeps the
Laravel-style expired-session redirect when no pending challenge token exists.

Latest focused reviews route slice: legacy local GET/POST
`/reviews/{id}/edit`, POST `/reviews/user/{id}`, and POST
`/reviews/listing/{id}` were removed. Member profile review forms now submit
Laravel's canonical POST `/members/{id}/review` route, and listing detail pages
no longer expose the unsupported listing-specific review form. The reviews
family now reports `7` matched routes, `0` missing routes, and `0` extra local
routes.

Latest focused reports route slice: legacy local GET `/reports/new`, POST
`/reports/new`, and GET `/reports/my` were removed. Generic report links now
use Laravel-backed surfaces: listing reports point to `/listings/{id}/report`,
and other page/content reporting points to `/report-a-problem`.

Latest focused search route slice: legacy local GET `/search/suggestions` was
removed. Laravel exposes search suggestions as an API route, not as a GOV.UK
accessible frontend page/helper route; the search family now reports `0` extra
local routes.

Latest focused member route slice: legacy local POST `/members/{id}/connect`
was removed. Member index/profile connection controls now submit Laravel's
canonical POST `/members/{id}/connection` route with `action=connect`, and the
members family now reports `0` extra local routes.

Latest focused listing route slice: legacy local GET
`/listings/{id}/delete` was removed. Listing index/detail owner controls now
submit Laravel's canonical POST `/listings/{id}/delete` action directly, and
local listing dynamic routes now preserve Laravel numeric constraints.

Latest focused group route slice: legacy local GET `/groups/my`,
GET `/groups/{id}/members`, POST `/groups/{id}/members/add`,
POST `/groups/{id}/members/{memberId}/remove`,
POST `/groups/{id}/members/{memberId}/role`, and
POST `/groups/{id}/transfer-ownership` were removed. Group pages now link to
Laravel's accessible `/groups` list and `/groups/{id}/manage` member-management
surface, while canonical member actions remain on
POST `/groups/{id}/members/{memberId}`.

Latest focused event route slice: legacy local GET `/events/my` and POST
`/events/{id}/rsvp/remove` were removed. The event list no longer links to a
separate My events page, event detail pages use Laravel's canonical
`/events/{id}/rsvp` action for RSVP changes, and the generated matrix now
reports `0` extra local event routes.

Latest focused feed route slice: legacy local GET/POST `/feed/new`,
`/feed/{id}`, `/feed/{id}/edit`, `/feed/{id}/like`, `/feed/{id}/unlike`,
`/feed/{id}/comments`, and delete/edit/comment variants were removed. The feed
hub now points users at Laravel's accessible `/feed/posts/{id}` permalink and
typed `/feed/items/post/{id}/like` action while preserving the Laravel
`/feed/posts` multipart compose form.

Latest focused messages route slice: legacy local GET/POST `/messages/new`
without a member id was removed. Direct message entry points now use Laravel's
accessible `/messages/new/{userId}` route, and generated prep pages preserve
Laravel `whereNumber(...)` constraints so `/messages/{userId}` no longer
overmatches `/messages/new`.

Latest focused wallet route slice: legacy local GET-only `/wallet/transactions`,
`/wallet/transactions/{id}`, and `/wallet/transfer` pages were removed. Wallet
navigation now points to Laravel's accessible `/wallet/manage` flow while
keeping canonical POST `/wallet/transfer` and wallet export/recipient helpers.

Latest focused profile route slice: legacy local GET/POST `/profile/edit` was
removed. Profile summary change links now point to Laravel's accessible
`/profile/settings` page.

Latest focused progress route slice: legacy local `/progress`,
`/progress/badges`, `/progress/leaderboard`, and `/progress/xp-history` were
removed. Profile links now point to Laravel's accessible `/achievements` and
`/leaderboard` surfaces instead of the old progress aliases.

Latest focused settings route slice: legacy local `/settings`,
`/settings/notifications`, `/settings/password`, and `/settings/privacy` were
removed. The account/settings entry point now uses Laravel's accessible
`/profile/settings` hub, while Laravel parity subpages under `/settings/*`
remain only for the routes present in Laravel's `govuk-alpha-parity/settings.php`.

Latest focused connections route slice: legacy local `/connections/pending`
was removed. Links from the connections index, member directory, and
notifications now use Laravel's accessible `/connections/network` page with the
`pending_received` tab selected.

Latest focused component-demo slice: the local `/components` route, home-page
demo link, and unused `components.njk` template were removed. The Laravel
accessible source keeps GOV.UK component inventory in docs/source assets rather
than publishing a component-demo route.

Latest focused legal-route slice: legacy local top-level `/terms` and
`/privacy` routes were removed. Legal documents now expose Laravel's accessible
`/legal/terms` and `/legal/privacy` routes only.

Latest focused auth-alias route slice: legacy local top-level password-reset
aliases `/forgot-password` and `/reset-password` were removed for both GET and
POST so the login and reset flows now expose only Laravel's accessible
`/login/forgot-password` and `/password/reset` paths. The login page now links
directly to `/login/forgot-password`.

Latest focused logout route slice: legacy local `GET /logout` was removed so
the `logout` route family now matches Laravel's POST-only accessible logout
declaration with `0` extra local logout routes. The account hub still renders a
CSRF-protected POST sign-out form.

Latest focused admin route slice: legacy local `/admin` pages and POST actions
were removed from `apps/web-uk`. Laravel's scanned GOV.UK accessible route set
does not expose an untenanted `/admin` route family; admin-only accessible
workflows remain in their canonical module pages such as `/jobs/bias-audit`.
The jobs bias-audit back link no longer points at the removed local `/admin`
surface.

Latest focused route-matrix evidence slice: the generator now separates
documented local infrastructure helpers from true accessible route extras.
Static route parity now reports `608` matched Laravel routes, `0` missing
Laravel routes, and `0` true extra `apps/web-uk` routes. The local-only
`GET /health`, `GET /service-unavailable`, and `POST /session/touch` helpers
remain available but are classified as ignored infrastructure instead of
accessible route parity gaps.

Latest focused backend-contract provenance slice: `resolveBackendContract()`
now returns `baseUrlSource` so Laravel defaults, future ASP.NET mode, and
explicit `API_BASE_URL` overrides are distinguishable in tests and docs.
`API_BASE_URL` remains an override only; it does not certify ASP.NET
compatibility or replace Laravel as the source of truth.

Latest focused dashboard slice: signed `/dashboard` now has a targeted shared
shell test for the Laravel Blade dashboard contract. The route calls
Laravel-compatible profile, onboarding status, wallet balance, gamification
profile, badges, listings, feed, member events, exchange-attention count, and
member endorsements helpers, and the Nunjucks view renders the Blade-style
welcome, onboarding banner, exchange-attention banner, create-listing CTA,
time-bank stat grid, progress/badges, upcoming events, skill endorsements,
quick links, and recent feed/listings. Remaining dashboard gaps are
tenant/module/feature gates, exact localization, broader live Laravel workflow
certification, and ASP.NET backend compatibility. A targeted live dashboard
marker smoke on 2026-07-08 against a temporary web-uk process at
`WEB_UK_BASE_URL=http://127.0.0.1:6240`, started with `TENANT_ID=2`, passed
`12/12` checks for auth/health, signed `/dashboard`, and body markers
`Welcome back`, `Your time bank`, `Quick links`, `Recent feed`, and
`Recent listings`.

Focused runtime-smoke harness test: `npm test --
tests/laravel-runtime-smoke.test.js --runInBand` passed with `17/17` tests
after red steps for the missing harness, stale Acme defaults, missing public
module-page checks, missing signed module-page checks, too-short default
timeout for slower Laravel-backed signed pages, chunked fallback support, and
the missing default real-fixture parameterised detail, secondary outcome,
listing/member/feed/course, message/volunteering-owner, and
course/federation/ideation/resource/coupon, home/blog/wallet/coupon-management
outcome scopes.

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
`/login/two-factor` now redirects to `/login?status=two-factor-expired` when the
session-backed 2FA token is absent and is covered by the default redirect-status
scope; a later live run against `WEB_UK_BASE_URL=http://127.0.0.1:5309` passed
`173/173`: 6 auth/health checks, 161 module/page checks, 3 gated-status checks,
and 3 redirect-status checks. POST `/login` now also follows the Laravel 2FA
challenge hand-off by storing `two_factor_token` in the session and redirecting
to `/login/two-factor` when the API returns `requires_2fa`. The default smoke
scope now checks 12 matched unsigned auth-required parameterised routes across
federation, ideation, organisations, podcasts, resources, public user
collections, marketplace slot edit, saved collections, saved-search delete, and
volunteering certificate download. A full default Laravel-backed run against a temporary web-uk
process at `WEB_UK_BASE_URL=http://127.0.0.1:5322`, started with `TENANT_ID=2`,
passed on 2026-07-07: `181/181` checks, `0` failures, `161` module-page
checks, 8 unsigned auth-required redirect checks, 3 gated-status checks, and 3
signed redirect checks in 352.8 seconds. For targeted CLI runs,
`SMOKE_MODULE_PAGE_PATHS`,
`SMOKE_UNSIGNED_AUTH_REQUIRED_PAGE_PATHS`, `SMOKE_GATED_PAGE_PATHS`, and
`SMOKE_REDIRECT_PAGE_PATHS` accept comma/newline-separated lists, and the
portable sentinel `none` disables that
group. A targeted live CLI run against
`WEB_UK_BASE_URL=http://127.0.0.1:5317` with those three variables set to
`none` passed `14/14`, including all eight auth-required parameterised
redirects. For slower shells, `SMOKE_MODULE_PAGE_CHUNK=N/M` now splits only
the module-page sweep into deterministic one-based chunks, for example
`SMOKE_MODULE_PAGE_CHUNK=1/4`, so agents can recertify the default page set
through repeatable smaller Laravel-backed runs while leaving auth, unsigned
auth-required, gated, and redirect checks enabled. All 16 chunked live runs
against `WEB_UK_BASE_URL=http://127.0.0.1:5321` with `TENANT_ID=2` and
`SMOKE_MODULE_PAGE_CHUNK=N/16` passed on 2026-07-07: `481` total repeated
checks, `0` failures, and `161` collective module-page checks across the
default sweep. Each shard also reran the auth/API setup, unsigned
auth-required redirects, gated status checks, and signed redirect checks.
Event and group detail helpers now use Laravel v2 detail endpoints
(`/api/v2/events/{id}` and `/api/v2/groups/{id}`) and unwrap Laravel
`{ data: ... }` payloads before rendering Nunjucks templates. A targeted live
Laravel-backed run against `WEB_UK_BASE_URL=http://127.0.0.1:5325`, started
with `TENANT_ID=2`, passed on 2026-07-07: `24/24` checks, `0` failures, with 6
auth/health checks and 18 real-fixture parameterised module pages:
`/events/6`, `/events/6/map`, `/events/6/polls`, `/events/6/translate`,
`/volunteering/opportunities/307`, `/organisations/636`,
`/organisations/636/jobs`, `/organisations/opportunities/307/apply`,
`/jobs/90764`, `/groups/484`, `/groups/484/invite`,
`/groups/484/notifications`, `/groups/484/image`,
`/groups/484/announcements`, `/groups/484/discussions`, `/groups/484/files`,
`/groups/484/manage`, and `/resources/10/comments`.
Those 18 real-fixture parameterised pages are now part of the default module
page sweep rather than targeted-only evidence. The default scope also covers
`/groups/484/discussions/new`, `/jobs/90764/qualified`,
`/members/77/insights`, `/listings/42/report`,
`/listings/42/exchange-request`, `/listings/42/comments`,
`/feed/hashtag/timebank`, `/feed/item/listing/42`, `/messages/77`,
`/messages/new/77`, `/volunteering/organisations/636/dashboard`,
`/volunteering/organisations/636/manage`,
`/volunteering/organisations/636/settings`,
`/volunteering/organisations/636/volunteers`, and
`/volunteering/organisations/636/wallet`, `/courses/1`, `/courses/2`,
`/courses/instructor/1/edit`, `/courses/instructor/2/edit`,
`/federation/partners/1`, `/federation/partners/5`,
`/federation/members/353`, `/federation/members/353/transfer`,
`/federation/members/351`, `/ideation/23`, `/ideation/22`, `/ideation/2`,
`/ideation/23/edit`, `/ideation/23/manage`, `/ideation/23/drafts`, and
`/ideation/23/outcome` as signed 2xx pages; owner-only
job/listing/message/group-exchange/resource/coupon checks for `/jobs/90764/edit`,
`/jobs/90764/analytics`, `/jobs/90764/pipeline`,
`/jobs/90764/applications`, `/listings/42/analytics`,
`/group-exchanges/1`, `/messages/groups/33`, `/resources/10/delete`,
`/coupons/1`, and `/coupons/2` as signed `403` responses;
plus signed redirects from `/events/6/recurring-edit` to `/events/6/edit`,
`/groups/484/edit` to `/groups/484`, `/courses/42/certificate` to
`/courses/42?status=certificate-failed`, and
`/federation/messages/conversation/77` to `/federation/messages`,
`/courses/1/learn` to `/courses/1?status=enrol-required`,
`/courses/2/learn` to `/courses/2?status=enrol-required`, and
`/federation/messages/conversation/353` to `/federation/messages`. A targeted
live run against `WEB_UK_BASE_URL=http://127.0.0.1:5336`, started with
`TENANT_ID=2`, passed on 2026-07-07: `28/28` checks, `0` failures. A full
default Laravel-backed run against a temporary web-uk process at
`WEB_UK_BASE_URL=http://127.0.0.1:5336`, started with `TENANT_ID=2`, passed on
2026-07-07: `247/247` checks, `0` failures, `210` module-page checks, 8
unsigned auth-required redirect checks, 13 gated-status checks, and 10 signed
redirect checks; `npm run smoke:laravel` exited `0`.
The default scope now also covers `/`, `/blog/feed.xml`, `/wallet/export.csv`,
`/wallet/recipients`, and `/marketplace/coupons/new` as signed 2xx routes;
`/coupons` and `/marketplace/coupons/5/edit` as signed `403` responses; and
`/password/reset` redirecting to `/login/forgot-password`. A targeted live run
against `WEB_UK_BASE_URL=http://127.0.0.1:5336`, started with `TENANT_ID=2`,
passed on 2026-07-07: `14/14` checks, `0` failures. The expanded default scope
now contains `255` checks: `215` module-page checks, 8 unsigned auth-required
redirect checks, 15 gated-status checks, and 11 signed redirect checks, plus the
6 auth/health checks. The single unchunked live command exceeded a 600-second
wrapper timeout, so the scope was recertified with `SMOKE_MODULE_PAGE_CHUNK=N/4`
against the same temporary process: all four chunks passed on 2026-07-07 with
`375` repeated checks, `0` failures, and `215` collective module-page checks.
The default scope now additionally covers `/account`, `/polls/20`,
`/polls/20/rank`, `/listings/90967/comments`, `/listings/90967/report`, and
`/listings/90967/exchange-request` as signed 2xx routes;
`/listings/90967/analytics` and `/jobs/talent-search/77` as signed `403`
responses; and redirects from `/courses/1/certificate` to
`/courses/1?status=certificate-failed`,
`/jobs/90764/applications/export.csv` to
`/jobs/90764/applications?status=export-failed`, and `/onboarding/profile` to
`/dashboard`. A targeted live run against
`WEB_UK_BASE_URL=http://127.0.0.1:5337`, started with `TENANT_ID=2`, passed on
2026-07-07: `17/17` checks, `0` failures. The expanded default scope now
contains `266` checks: `221` module-page checks, 8 unsigned auth-required
redirect checks, 17 gated-status checks, and 14 signed redirect checks, plus the
6 auth/health checks. The expanded default scope was recertified with
`SMOKE_MODULE_PAGE_CHUNK=N/4` against the same temporary process: all four
chunks passed on 2026-07-07 with `401` repeated checks, `0` failures, and `221`
collective module-page checks.
The default scope now additionally covers `/marketplace/267`,
`/marketplace/267/buy`, `/marketplace/267/offer`, `/marketplace/267/report`,
`/marketplace/267/edit`, and `/blog/90001/likers/1` as signed 2xx routes. A
targeted live run against `WEB_UK_BASE_URL=http://127.0.0.1:5338`, started with
`TENANT_ID=2`, passed on 2026-07-07: `12/12` checks, `0` failures. The expanded
default scope now contains `272` checks: `227` module-page checks, 8 unsigned
auth-required redirect checks, 17 gated-status checks, and 14 signed redirect
checks, plus the 6 auth/health checks. The expanded default scope was
recertified with `SMOKE_MODULE_PAGE_CHUNK=N/4` against the same temporary
process: all four chunks passed on 2026-07-07 with `407` repeated checks, `0`
failures, and `227` collective module-page checks.
The default scope now additionally covers `/events/14`, `/events/14/map`,
`/events/14/polls`, `/events/14/translate`, `/groups/482`,
`/groups/482/announcements`, `/groups/482/discussions`,
`/groups/482/discussions/new`, `/groups/482/files`, `/groups/482/manage`,
`/groups/482/invite`, `/groups/482/notifications`, `/groups/482/image`,
`/marketplace/6`, `/marketplace/6/buy`, `/marketplace/6/offer`,
`/marketplace/6/report`, `/marketplace/6/edit`, `/polls/8`, `/polls/4`,
`/feed/item/listing/90967`, and `/blog/64/likers/1` as signed 2xx routes;
plus redirects from `/events/14/recurring-edit` to `/events/14/edit`,
`/groups/482/edit` to `/groups/482`, `/courses/2/certificate` to
`/courses/2?status=certificate-failed`, `/onboarding/interests` to
`/dashboard`, `/onboarding/safeguarding` to `/dashboard`, and
`/onboarding/confirm` to `/dashboard`. A targeted live run against
`WEB_UK_BASE_URL=http://127.0.0.1:5339`, started with `TENANT_ID=2`, passed on
2026-07-07: `34/34` checks, `0` failures. The expanded default scope now
contains `300` checks: `249` module-page checks, 8 unsigned auth-required
redirect checks, 17 gated-status checks, and 20 signed redirect checks, plus the
6 auth/health checks. The expanded default scope was recertified with
`SMOKE_MODULE_PAGE_CHUNK=N/4` against the same temporary process: all four
chunks passed on 2026-07-07 with `453` repeated checks, `0` failures, and `249`
collective module-page checks.
The default scope now additionally covers `/marketplace/category/electronics`,
`/marketplace/category/home-garden`, `/marketplace/category/free-items`,
`/marketplace/category/services`, and `/marketplace/seller/1` as signed 2xx
routes. A targeted live run against `WEB_UK_BASE_URL=http://127.0.0.1:5340`,
started with `TENANT_ID=2`, passed on 2026-07-07: `11/11` checks, `0` failures.
The expanded default scope now contains `305` checks: `254` module-page checks,
8 unsigned auth-required redirect checks, 17 gated-status checks, and 20 signed
redirect checks, plus the 6 auth/health checks.
The expanded default scope was recertified with `SMOKE_MODULE_PAGE_CHUNK=N/4`
against the same temporary process: all four chunks passed on 2026-07-07 with
`458` repeated checks, `0` failures, and `254` collective module-page checks.

The default Laravel runtime smoke scope now additionally covers
`/blog/test-sitemap-blog-post`, `/blog/test-sitemap-blog-post/comments`,
`/blog/timebank-ireland`, `/blog/timebank-ireland/comments`, and `/kb/90001`
as signed 2xx routes. A targeted live run against
`WEB_UK_BASE_URL=http://127.0.0.1:5341`, started with `TENANT_ID=2`, passed on
2026-07-07: `11/11` checks, `0` failures. The expanded default scope now
contains `310` checks: `259` module-page checks, 8 unsigned auth-required
redirect checks, 17 gated-status checks, and 20 signed redirect checks, plus the
6 auth/health checks.
The expanded default scope was recertified with `SMOKE_MODULE_PAGE_CHUNK=N/4`
against the same temporary process: all four chunks passed on 2026-07-07 with
`463` repeated checks, `0` failures, and `259` collective module-page checks.

The default Laravel runtime smoke scope now additionally covers
`/feed/item/listing/90966`, `/feed/item/listing/90965`,
`/feed/item/listing/90964`, `/feed/item/listing/90963`, and
`/feed/item/listing/90962` as signed 2xx typed feed item permalink routes. A
targeted live run against `WEB_UK_BASE_URL=http://127.0.0.1:5342`, started with
`TENANT_ID=2`, passed on 2026-07-07: `11/11` checks, `0` failures. The expanded
default scope now contains `315` checks: `264` module-page checks, 8 unsigned
auth-required redirect checks, 17 gated-status checks, and 20 signed redirect
checks, plus the 6 auth/health checks.
The expanded default scope was recertified with `SMOKE_MODULE_PAGE_CHUNK=N/4`
against the same temporary process: all four chunks passed on 2026-07-07 with
`468` repeated checks, `0` failures, and `264` collective module-page checks.

The default Laravel runtime smoke scope now additionally covers
`/users/14/appreciations` and `/jobs/employers/14` as signed 2xx user
appreciation and employer-brand routes, plus `/groups/484/files/1/download` as
the signed missing-file redirect to `/groups/484/files?status=file-not-found`.
This also fixes those two public member/employer pages to read Laravel
`/api/v2/users/{id}` instead of the legacy `/api/users/{id}` helper. A targeted
live run against `WEB_UK_BASE_URL=http://127.0.0.1:5343`, started with
`TENANT_ID=2`, passed on 2026-07-07: `9/9` checks, `0` failures. The smoke
harness
refreshes the signed session before gated-status and signed-redirect groups so
long module-page batches do not turn expected authorization outcomes into stale
`/login?status=auth-required` redirects. That `318`-check expanded default
scope was then
recertified with `SMOKE_MODULE_PAGE_CHUNK=N/4` against the same temporary
process: all four chunks passed on 2026-07-07 with `474` repeated checks, `0`
failures, and `266` collective module-page checks. The next fixture expansion
adds `/ideation/2/ideas/1` as a signed 2xx ideation idea detail route; its
targeted live run passed on 2026-07-07 with `7/7` checks and `0` failures. The
course instructor analytics and grading routes now preserve Laravel's owner/admin
denial as a 403 page instead of the generic service-unavailable fallback; the
targeted live run for `/courses/instructor/1/analytics` and
`/courses/instructor/1/grading` passed on 2026-07-07 with `8/8` checks and `0`
failures. The event edit form now preserves Laravel's organiser-only denial as
a 403 page before optional group setup data can mask the result; `/events/6/edit`
and `/events/14/edit` are covered as signed `403` responses. A targeted live
run against `WEB_UK_BASE_URL=http://127.0.0.1:5343`, started with `TENANT_ID=2`,
passed on 2026-07-07 with `8/8` checks and `0` failures. The group announcement
edit route now checks the group admin gate before using Laravel's collection-only
announcements API, so `/groups/484/announcements/1/edit` is covered as a signed
`403` response. A targeted live run against
`WEB_UK_BASE_URL=http://127.0.0.1:5344`, started with `TENANT_ID=2`, passed on
2026-07-07 with `7/7` checks and `0` failures. The achievement badge detail
route is now covered by the live tenant badge fixture
`/achievements/badges/vol_1h`, which returned `200` in a targeted Laravel-backed
smoke run against `WEB_UK_BASE_URL=http://127.0.0.1:5345`. The feed post detail
route is now covered by the live post fixture `/feed/posts/796`, which returned
`200` in a targeted Laravel-backed smoke run against
`WEB_UK_BASE_URL=http://127.0.0.1:5346`. The public goal fixture `/goals/162`
now covers the goal detail, edit, check-in, reminder, buddy actions, insights,
history, and social page shapes, and `/reviews/18/comments` covers the review
comments page; targeted Laravel-backed smoke probes against
`WEB_UK_BASE_URL=http://127.0.0.1:5347` returned `200` for each. Unsigned owner
route probes for `/marketplace/slots/1/edit`, `/me/collections/1`,
`/search/saved/1/delete`, and `/volunteering/certificates/ABC123/download`
returned `/login?status=auth-required` against
`WEB_UK_BASE_URL=http://127.0.0.1:5348`. Listing detail/edit now uses the
Laravel `/api/v2/listings/{id}` contract, and the E2E-owned fixture
`/listings/90992/edit` returned `200` against
`WEB_UK_BASE_URL=http://127.0.0.1:5349`. The poll export route
`/polls/1/export` returned `/login?status=auth-required` when unsigned against
`WEB_UK_BASE_URL=http://127.0.0.1:5350`; `/ideation/campaigns/1` returned the
same unsigned auth-required redirect against
`WEB_UK_BASE_URL=http://127.0.0.1:5351`. The plain-login unsigned routes
`/exchanges/1`, `/jobs/applications/1/cv`, and
`/jobs/applications/1/history` returned `/login` against
`WEB_UK_BASE_URL=http://127.0.0.1:5352`. The `/blog/feed.xml` and
`/wallet/export.csv` responses returned the expected `application/rss+xml` and
`text/csv` content types against `WEB_UK_BASE_URL=http://127.0.0.1:5355`.
The signed `/explore`, `/chat`, `/account`, `/wallet`, `/messages`,
`/connections`, `/resources`, `/skills`, `/goals`, `/clubs`, `/saved`, and
`/members` hub pages returned expected body markers against
`WEB_UK_BASE_URL=http://127.0.0.1:6200`. The public/support/legal pages `/`,
`/about`, `/guide`, `/features`, `/faq`, `/help`, `/kb`,
`/trust-and-safety`, `/legal`, `/accessibility`, `/legal/terms`,
`/legal/privacy`, `/legal/cookies`, `/legal/community-guidelines`, and
`/legal/acceptable-use` returned expected body markers against
`WEB_UK_BASE_URL=http://127.0.0.1:6210`. The module landing pages
`/volunteering`, `/organisations`, `/organisations/browse`, `/events`,
`/events/new`, `/listings`, `/jobs`, `/courses`, `/courses/mine`,
`/marketplace`, `/marketplace/mine`, `/marketplace/onboarding`, `/blog`,
`/feed`, `/podcasts`, `/reviews`, `/search`, `/search/advanced`,
`/federation`, `/notifications`, `/activity`, `/achievements`, `/leaderboard`,
`/nexus-score`, and `/premium` returned expected body markers against
`WEB_UK_BASE_URL=http://127.0.0.1:6211`; `/premium` now follows the Laravel
Blade title `Donate`. The signed profile/settings/gamification/federation
subpages `/profile/settings`, `/settings/appearance`, `/settings/data-rights`,
`/profile/delete-account`, `/profile/two-factor`, `/profile/blocked`,
`/settings/availability`, `/settings/linked-accounts`, `/settings/insurance`,
`/activity/insights`, `/achievements/shop`, `/achievements/collections`,
`/achievements/engagement`, `/achievements/showcase`,
`/leaderboard/competitive`, `/leaderboard/seasons`, `/leaderboard/journey`,
`/leaderboard/spotlight`, `/nexus-score/tiers`, `/federation/partners`,
`/federation/members`, and `/federation/settings` returned expected body
markers against `WEB_UK_BASE_URL=http://127.0.0.1:6212`; `/federation/members`
now follows the Laravel Blade title `Federated members`. The remaining signed
federation subpages `/federation/opt-in`, `/federation/opt-out`,
`/federation/onboarding`, `/federation/groups`, `/federation/listings`,
`/federation/events`, `/federation/connections`, and `/federation/messages`
returned expected body markers against `WEB_UK_BASE_URL=http://127.0.0.1:6213`.
The signed marketplace account subpages `/marketplace/saved`, `/marketplace/free`,
`/marketplace/offers`, `/marketplace/orders`, `/marketplace/sales`,
`/marketplace/pickups`, and `/marketplace/slots` returned expected body markers
against `WEB_UK_BASE_URL=http://127.0.0.1:6214`. The signed volunteering member
and owner subpages `/volunteering/accessibility`, `/volunteering/certificates`,
`/volunteering/opportunities/create`, `/volunteering/credentials`,
`/volunteering/hours`, `/volunteering/wellbeing`, `/volunteering/donations`,
`/volunteering/expenses`, `/volunteering/emergency-alerts`,
`/volunteering/group-signups`, `/volunteering/training`,
`/volunteering/incidents`, `/volunteering/waitlist`, `/volunteering/swaps`,
`/volunteering/my-organisations`, and `/volunteering/recommended-shifts`
returned expected body markers against `WEB_UK_BASE_URL=http://127.0.0.1:6215`;
`/volunteering/opportunities/create` now follows the Laravel Blade title
`Post a volunteer opportunity`. The signed jobs account subpages `/jobs/saved`,
`/jobs/applications`, `/jobs/mine`, `/jobs/create`, `/jobs/alerts`,
`/jobs/responses`, and `/jobs/employer-onboarding` returned expected body
markers against `WEB_UK_BASE_URL=http://127.0.0.1:6216` and now carry default
body-marker coverage for their Laravel Blade titles and stable action text. The
previous full default smoke scope passed against
`WEB_UK_BASE_URL=http://127.0.0.1:6218` with `459/459` checks and `0` failures.
The signed course subpages `/courses/instructor`, `/courses/instructor/new`,
`/courses/1`, `/courses/2`, `/courses/instructor/1/edit`, and
`/courses/instructor/2/edit` returned expected body markers against
`WEB_UK_BASE_URL=http://127.0.0.1:6219` and now carry default body-marker
coverage for their Laravel Blade headings and detail-page review section. The
full default smoke scope then passed against
`WEB_UK_BASE_URL=http://127.0.0.1:6220` with `465/465` checks and `0` failures.
The signed member discovery pages `/members/discover`, `/members/nearby`, and
`/members/77/insights` returned expected body markers against
`WEB_UK_BASE_URL=http://127.0.0.1:6221` and now carry default body-marker
coverage for their Laravel Blade headings. The body-text-only default smoke
scope passed against the same port with `127/127` checks and `0` failures. The
signed organisation pages `/organisations/manage`, `/organisations/register`,
`/organisations/636`, `/organisations/636/jobs`, and
`/organisations/opportunities/307/apply` returned expected body markers against
`WEB_UK_BASE_URL=http://127.0.0.1:6222` and now carry default body-marker
coverage for their Laravel Blade headings and section text. The body-text-only
default smoke scope passed against the same port with `132/132` checks and `0`
failures. The signed volunteering opportunity and organisation-owner pages
`/volunteering/opportunities/307`,
`/volunteering/organisations/636/dashboard`,
`/volunteering/organisations/636/manage`,
`/volunteering/organisations/636/settings`,
`/volunteering/organisations/636/volunteers`, and
`/volunteering/organisations/636/wallet` returned expected body markers against
`WEB_UK_BASE_URL=http://127.0.0.1:6223` and now carry default body-marker
coverage for their Laravel Blade headings and owner action text. The
body-text-only default smoke scope passed against the same port with `138/138`
checks and `0` failures. The signed group pages `/groups`, `/groups/new`,
`/groups/484`, `/groups/484/invite`, `/groups/484/notifications`,
`/groups/484/image`, `/groups/484/announcements`, `/groups/484/discussions`,
`/groups/484/discussions/new`, `/groups/484/files`, `/groups/484/manage`,
`/groups/482`, `/groups/482/announcements`, `/groups/482/discussions`,
`/groups/482/discussions/new`, `/groups/482/files`, `/groups/482/manage`,
`/groups/482/invite`, `/groups/482/notifications`, and `/groups/482/image`
returned expected body markers against
`WEB_UK_BASE_URL=http://127.0.0.1:6224`; group detail now follows the Laravel
Blade section heading `Group events`. The body-text-only default smoke scope
passed against the same port with `158/158` body-text checks and `0` failures.
The signed marketplace create/search/coupon/detail/action/category/seller pages
`/marketplace/create`, `/marketplace/search`, `/marketplace/coupons/new`,
`/marketplace/267`, `/marketplace/267/buy`, `/marketplace/267/offer`,
`/marketplace/267/report`, `/marketplace/267/edit`, `/marketplace/6`,
`/marketplace/6/buy`, `/marketplace/6/offer`, `/marketplace/6/report`,
`/marketplace/6/edit`, `/marketplace/category/electronics`,
`/marketplace/category/home-garden`, `/marketplace/category/free-items`,
`/marketplace/category/services`, and `/marketplace/seller/1` returned expected
body markers against `WEB_UK_BASE_URL=http://127.0.0.1:6225`; category search
now follows Laravel's `Search within this category` label, `Find an item by name
or keyword.` hint, and `Search` submit text. The targeted run passed with
`27/27` checks and `0` failures. The body-text-only default smoke scope passed
against the same port with `179/179` total checks, including 170 body-text
contract checks, and `0` failures.
The signed ideation pages `/ideation`, `/ideation/campaigns`, `/ideation/new`,
`/ideation/outcomes`, `/ideation/tags`, `/ideation/23`, `/ideation/22`,
`/ideation/2`, `/ideation/2/ideas/1`, `/ideation/23/edit`,
`/ideation/23/manage`, `/ideation/23/drafts`, and `/ideation/23/outcome`
returned expected body markers against
`WEB_UK_BASE_URL=http://127.0.0.1:6226`. The targeted run passed with `22/22`
checks and `0` failures. The body-text-only default smoke scope passed against
the same port with `192/192` total checks, including 183 body-text contract
checks, and `0` failures.
The signed goals pages `/goals/buddying`, `/goals/discover`,
`/goals/templates`, `/goals/162`, `/goals/162/edit`, `/goals/162/checkin`,
`/goals/162/reminder`, `/goals/162/buddy-actions`, `/goals/162/insights`,
`/goals/162/history`, and `/goals/162/social` returned expected body markers
against `WEB_UK_BASE_URL=http://127.0.0.1:6227`. The targeted run passed with
`20/20` checks and `0` failures. The body-text-only default smoke scope passed
against the same port with `203/203` total checks, including 194 body-text
contract checks, and `0` failures.
The signed feed pages `/feed/hashtags`, `/feed/hashtag/timebank`,
`/feed/item/listing/42`, `/feed/posts/796`, `/feed/item/listing/90967`,
`/feed/item/listing/90966`, `/feed/item/listing/90965`,
`/feed/item/listing/90964`, `/feed/item/listing/90963`, and
`/feed/item/listing/90962` returned expected body markers against
`WEB_UK_BASE_URL=http://127.0.0.1:6228`. The targeted run passed with `16/16`
checks and `0` failures. The body-text-only default smoke scope passed against
the same port with `210/210` total checks, including 204 body-text contract
checks, and `0` failures.
The signed event pages `/events/browse`, `/events/6`, `/events/6/map`,
`/events/6/polls`, `/events/6/translate`, `/events/14`, `/events/14/map`,
`/events/14/polls`, and `/events/14/translate` returned expected body markers
against `WEB_UK_BASE_URL=http://127.0.0.1:6229`. The targeted run passed with
`15/15` checks and `0` failures. The body-text-only default smoke scope passed
against the same port with `219/219` total checks, including 213 body-text
contract checks, and `0` failures.
The signed listing pages `/listings/new`, `/listings/90992/edit`,
`/listings/42/report`, `/listings/42/exchange-request`,
`/listings/42/comments`, `/listings/90967/report`,
`/listings/90967/exchange-request`, and `/listings/90967/comments` returned
expected body markers against `WEB_UK_BASE_URL=http://127.0.0.1:6230`. The
targeted run passed with `14/14` checks and `0` failures. The body-text-only
default smoke scope passed against the same port with `227/227` total checks,
including 221 body-text contract checks, and `0` failures.
The signed poll pages `/polls`, `/polls/parity/create`,
`/polls/parity/manage`, `/polls/20`, `/polls/20/rank`, `/polls/8`, and
`/polls/4` returned expected body markers against
`WEB_UK_BASE_URL=http://127.0.0.1:6231`. The targeted run passed with `13/13`
checks and `0` failures. The body-text-only default smoke scope passed against
the same port with `234/234` total checks, including 228 body-text contract
checks, and `0` failures.
The blog feed, detail, comments, and reaction pages `/blog/feed.xml`,
`/blog/test-sitemap-blog-post/likers/like`,
`/blog/timebank-ireland/likers/like`, `/blog/test-sitemap-blog-post`,
`/blog/test-sitemap-blog-post/comments`, `/blog/timebank-ireland`, and
`/blog/timebank-ireland/comments` returned expected body markers against
`WEB_UK_BASE_URL=http://127.0.0.1:6232`. The targeted run passed with `13/13`
checks and `0` failures. The body-text-only default smoke scope was
recertified in 8 chunks against the same port, covering all 235 body-text
contract checks with `283/283` executed checks including repeated auth/health
setup checks and `0` failures.
The federation detail pages `/federation/partners/1`,
`/federation/partners/5`, `/federation/members/353`,
`/federation/members/353/transfer`, and `/federation/members/351` returned
expected body markers against `WEB_UK_BASE_URL=http://127.0.0.1:6233`. The
targeted run passed with `11/11` checks and `0` failures. The body-text-only
default smoke scope was recertified in 8 chunks against the same port, covering
all 240 body-text contract checks with `288/288` executed checks including
repeated auth/health setup checks and `0` failures.
The signed message pages `/messages/groups`, `/messages/groups/new`,
`/messages/77`, and `/messages/new/77` returned expected body markers against
`WEB_UK_BASE_URL=http://127.0.0.1:6234`. The targeted run passed with `10/10`
checks and `0` failures. The body-text-only default smoke scope was recertified
in 8 chunks against the same port, covering all 244 body-text contract checks
with `292/292` executed checks including repeated auth/health setup checks and
`0` failures.
The signed resource pages `/resources/library`, `/resources/upload`, and
`/resources/10/comments` returned expected body markers against
`WEB_UK_BASE_URL=http://127.0.0.1:6235`. The targeted run passed with `9/9`
checks and `0` failures. The body-text-only default smoke scope was recertified
in 8 chunks against the same port, covering all 247 body-text contract checks
with `295/295` executed checks including repeated auth/health setup checks and
`0` failures.
The signed wallet responses `/wallet/export.csv`, `/wallet/manage`, and
`/wallet/recipients` returned expected response markers against
`WEB_UK_BASE_URL=http://127.0.0.1:6236`; the CSV export marker tracks the
Laravel-backed statement header `Date,Type,Description`, and the recipients
route marker tracks the JSON `results` key. The targeted run passed with `9/9`
checks and `0` failures. The body-text-only default smoke scope was recertified
in 8 chunks against the same port, covering all 250 body-text contract checks
with `298/298` executed checks including repeated auth/health setup checks and
`0` failures.
The signed jobs pages `/jobs/90764`, `/jobs/90764/qualified`, and
`/jobs/employers/14` returned expected body markers against
`WEB_UK_BASE_URL=http://127.0.0.1:6237`; the detail marker tracks the
Laravel-backed apply section, the qualification route tracks `Am I qualified?`,
and the employer route tracks the employer profile description. The targeted run
passed with `9/9` checks and `0` failures. The body-text-only default smoke
scope was recertified in 8 chunks against the same port, covering all 253
body-text contract checks with `301/301` executed checks including repeated
auth/health setup checks and `0` failures.
The signed matches pages `/matches` and `/matches/board` returned expected body
markers against `WEB_UK_BASE_URL=http://127.0.0.1:6238`; the list marker tracks
the Laravel-backed `Open the matches board` link, and the board marker tracks
the `Suggested matches` caption. The targeted run passed with `8/8` checks and
`0` failures. The body-text-only default smoke scope was recertified in 8
chunks against the same port, covering all 255 body-text contract checks with
`303/303` executed checks including repeated auth/health setup checks and `0`
failures.
The signed group exchange pages `/group-exchanges` and `/group-exchanges/new`
returned expected body markers against
`WEB_UK_BASE_URL=http://127.0.0.1:6238`; the list marker tracks the
Laravel-backed `Start a group exchange` action, and the create marker tracks
the shared-hours fieldset text `How are the hours shared out?`. The targeted
run passed with `8/8` checks and `0` failures. The body-text-only default smoke
scope was recertified in 8 chunks against the same port, covering all 257
body-text contract checks with `305/305` executed checks including repeated
auth/health setup checks and `0` failures.
The signed podcast studio pages `/podcasts/studio` and `/podcasts/studio/new`
returned expected body markers against
`WEB_UK_BASE_URL=http://127.0.0.1:6238`; the studio marker tracks the
Laravel-backed `Podcast studio` heading, and the create marker tracks the
`Create a podcast` heading. The targeted run passed with `8/8` checks and `0`
failures. The body-text-only default smoke scope was recertified in 8 chunks
against the same port, covering all 259 body-text contract checks with
`307/307` executed checks including repeated auth/health setup checks and `0`
failures.
The public auth pages `/login`, `/login/forgot-password`,
`/password/reset?token=reset-token`, and `/register` now track the Laravel
headings `Sign in`, `Reset your password`, `Choose a new password`, and
`Register`. A direct runtime assertion pass against
`WEB_UK_BASE_URL=http://127.0.0.1:6238` checked `/health` plus those four page
headings with `5/5` assertions and `0` failures.
The public support pages `/contact`, `/cookies`, `/newsletter/unsubscribe`,
`/verify-email`, and `/report-a-problem` now carry Laravel-backed body-text
markers, with `/contact` and `/report-a-problem` copy realigned to the Laravel
Blade strings before certification.
The no-JS cookie consent POST flows are now part of the default Laravel runtime
smoke scope: the harness fetches CSRF tokens, posts banner reject, banner accept,
and settings-save analytics choices to `/cookie-consent`, and asserts the
Laravel-compatible `nexus_alpha_cookie_consent=essential` or `all` cookie plus
the expected `/cookies` redirects. A targeted live run on 2026-07-08 against
`WEB_UK_BASE_URL=http://127.0.0.1:6242`, started with `TENANT_ID=2`, passed
`9/9` checks including all three cookie POST workflows, auth, and signed
`/account`.
The CSRF-protected sign-out form on `/account` is now part of the default
Laravel runtime smoke scope too: it logs in a separate session, reads the
account-page CSRF token, posts `/logout`, and asserts both the `/login` redirect
and that `/account` redirects after local auth cookies are cleared. A targeted
live run on 2026-07-08 against `WEB_UK_BASE_URL=http://127.0.0.1:6243`,
started with `TENANT_ID=2`, passed `10/10` checks including logout.
The remaining signed/detail body-marker routes `/connections/network`,
`/dashboard`, `/exchanges`, `/me/collections`, `/premium/return`, `/profile`,
`/reviews/list`, `/users/14/appreciations`, `/kb/90001`,
`/achievements/badges/vol_1h`, and `/reviews/18/comments` now carry
Laravel-backed body-text markers. The module-page/body-text marker gap is now
0: `279` module-page checks and `283` body-text contract checks. `/dashboard`
now carries stable body-text checks for `Welcome back`, `Your time bank`,
`Quick links`, `Recent feed`, and `Recent listings`.
The default scope now contains `634` checks:
`279`
module-page checks, 14 unsigned auth-required redirect checks, 3 unsigned login
redirect checks, 22 gated-status checks, and 21 signed redirect checks, plus 2
content-type contract checks, 283 body-text contract checks, 3 cookie-consent
POST workflow checks, 1 logout POST workflow check, and the 6 auth/health
checks.
Parameterised matched GET route shapes without default runtime smoke coverage
fell from 28 to 0. The signed `/chat` AI assistant page returned `200` against
`WEB_UK_BASE_URL=http://127.0.0.1:5354`, confirming the default
`module-page-chat-renders` smoke outcome against Laravel.

`/organisations/{id}` now
matches Laravel's signed-out behavior by redirecting to
`/login?status=auth-required` before data lookup. Without
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
   If `http://127.0.0.1:8088` times out, start or repair local Laravel before
   treating live smoke status as current evidence.
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

Current working estimate at this handoff: `945/1000`.

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
