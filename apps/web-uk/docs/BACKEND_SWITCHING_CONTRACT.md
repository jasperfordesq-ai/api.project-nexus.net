# Backend Switching Contract

Last reviewed: 2026-07-06

## Decision

`apps/web-uk` may become a shared accessible frontend for Laravel and ASP.NET in
the future. Its default backend contract is now Laravel-first, but this does not
certify completed page workflows or production traffic. The Laravel Blade
accessible frontend remains the source of truth, and ASP.NET must become
compatible with that behavior.

Backend target resolution lives in:

```text
src/lib/backend-contract.js
```

## Future Modes

| Mode | Meaning | Current status |
| --- | --- | --- |
| Laravel-compatible | The frontend talks to endpoints and page workflows matching the Laravel accessible frontend. | Default target. Source of truth, but individual workflows still require route/data/form certification. |
| ASP.NET-compatible | The frontend talks to ASP.NET endpoints that intentionally mimic Laravel accessible contracts. | Development-only; selectable for future work, not certified. |

## Local Backend Defaults

| Variable | Default | Meaning |
| --- | --- | --- |
| `ACCESSIBLE_BACKEND_TARGET` | `laravel` | Laravel is the default backend contract target. |
| `LARAVEL_BASE_URL` | `http://127.0.0.1:8088` | Local Laravel staging backend URL, matching `C:\platforms\htdocs\staging\.env`. |
| `ASPNET_BASE_URL` | `http://localhost:5080` | Future ASP.NET target when explicitly selected. Not certified. |
| `API_BASE_URL` | unset | Explicit URL override for local testing. Prefer `LARAVEL_BASE_URL` for Laravel-first work. |

## Laravel Runtime Smoke

The Laravel-backed runtime proof command is:

```bash
npm run smoke:laravel
```

It runs `scripts/laravel-runtime-smoke.js` against `WEB_UK_BASE_URL`
(`http://127.0.0.1:5180` by default) and `LARAVEL_BASE_URL`
(`http://127.0.0.1:8088` by default). The harness checks Laravel API
reachability, web-uk health, unsigned `/account` redirect behavior, `/login`
CSRF rendering, login POST redirect to `/dashboard`, and signed `/account`
rendering. It also checks the default public Laravel-backed module pages
`/volunteering`, `/organisations`, `/organisations/browse`, `/kb`, and `/help`
return successful responses through web-uk while Laravel is the backend target.
After login, it checks the signed Laravel-backed base pages and deeper module
pages across the public auth aliases, about/legal/support, explore, saved items,
notifications, member discovery, resources, skills, goals, clubs, wallet,
messages, connections, matches, activity, achievements, leaderboard, NEXUS
score, profile, settings, federation, courses, marketplace, events, listings,
jobs, groups, ideation, polls, search, premium, podcasts, and volunteering.
Before the login flow, it also verifies all eight matched auth-required
parameterised pages across federation, ideation, organisations, podcasts,
resources, and public user collections redirect to
`/login?status=auth-required` without requiring fixture records.
Override local auth with `SMOKE_EMAIL`, `SMOKE_PASSWORD`, and `SMOKE_TENANT`;
the defaults target the Laravel local E2E fixture:
`e2e.user.a@project-nexus.local`, `TestPassword123!`, tenant slug
`hour-timebank`.

The local Laravel E2E users currently live under tenant id `2`, so the web-uk
process must be started with `TENANT_ID=2` for Laravel login/API calls to carry
the correct `X-Tenant-ID` context. Current local result on 2026-07-07:
`WEB_UK_BASE_URL=http://127.0.0.1:5181 SMOKE_TIMEOUT_MS=60000 npm run
smoke:laravel` passed against a temporary web-uk process started with
`TENANT_ID=2`. Without that tenant context, Laravel returns `401` for the same
valid E2E credentials. Later 2026-07-07 smoke runs expanded the default signed
page list from the broader base module pages to deep profile, settings,
achievement, leaderboard, federation, course, marketplace, and volunteering
subpages. The latest run against
`WEB_UK_BASE_URL=http://127.0.0.1:5293` passed `93/93` checks. A follow-up live
probe against `WEB_UK_BASE_URL=http://127.0.0.1:5294` identified another stable
2xx batch, and the expanded harness passed `158/158` checks against
`WEB_UK_BASE_URL=http://127.0.0.1:5295`. `/feed` is now included in the default
signed smoke list and renders a Laravel-backed feed page with an empty/error
state when Laravel's feed collection API is unavailable; a later run against
`WEB_UK_BASE_URL=http://127.0.0.1:5297` passed `159/159`. Plain `/connections`
is now included in the default signed smoke scope and renders with an
empty/error state when Laravel's legacy connections API is unavailable; a later
run against `WEB_UK_BASE_URL=http://127.0.0.1:5298` passed `160/160`. Plain
`/members` is now included in the default signed smoke scope and renders with an
empty/error state when Laravel's legacy members API is unavailable; a later run
against `WEB_UK_BASE_URL=http://127.0.0.1:5299` passed `161/161`. `/events/new`
and `/marketplace/onboarding` are now included in the default signed smoke scope
and render form pages with empty/error setup state when Laravel helper APIs are
unavailable; a later run against `WEB_UK_BASE_URL=http://127.0.0.1:5302` passed
`163/163`. The feature/role-gated pages `/jobs/bias-audit`,
`/jobs/talent-search`, and `/marketplace/coupons` are now covered as expected
signed-session `403` checks; a later run against
`WEB_UK_BASE_URL=http://127.0.0.1:5306` passed `166/166`. `/onboarding` and
`/premium/manage` are now covered as expected signed-session redirect checks; a
later run against `WEB_UK_BASE_URL=http://127.0.0.1:5307` passed `168/168`.
Signed public auth aliases `/login`,
`/login/forgot-password`, `/password/reset?token=reset-token`, and `/register`
are now covered by the default 2xx smoke scope; a later run against
`WEB_UK_BASE_URL=http://127.0.0.1:5308` passed `172/172`: 6 auth/health checks,
161 module/page checks, 3 gated-status checks, and 2 redirect-status checks.
`/login/two-factor` is now covered as a signed-session redirect when the
session-backed 2FA token is absent; a later run against
`WEB_UK_BASE_URL=http://127.0.0.1:5309` passed `173/173`: 6 auth/health checks,
161 module/page checks, 3 gated-status checks, and 3 redirect-status checks.
The default smoke scope now includes all eight matched unsigned auth-required
parameterised redirect checks. A full default Laravel-backed run against a
temporary web-uk process at `WEB_UK_BASE_URL=http://127.0.0.1:5322`, started
with `TENANT_ID=2`, passed on 2026-07-07: `181/181` checks, `0` failures,
`161` module-page checks, 8 unsigned auth-required redirect checks, 3
gated-status checks, and 3 signed redirect checks in 352.8 seconds.
For targeted CLI runs, `SMOKE_MODULE_PAGE_PATHS`,
`SMOKE_UNSIGNED_AUTH_REQUIRED_PAGE_PATHS`, `SMOKE_GATED_PAGE_PATHS`, and
`SMOKE_REDIRECT_PAGE_PATHS` accept comma/newline-separated lists, and the
portable sentinel `none` disables that group. A targeted live CLI run against
`WEB_UK_BASE_URL=http://127.0.0.1:5317` with those three variables set to
`none` passed `14/14`, including all eight auth-required parameterised
redirects. For slower shells, `SMOKE_MODULE_PAGE_CHUNK=N/M` can split only the
module-page sweep into deterministic one-based chunks, for example
`SMOKE_MODULE_PAGE_CHUNK=1/4`, so agents can recertify the full default page
list in repeatable smaller Laravel-backed runs without disabling the auth,
unsigned auth-required, gated, or redirect checks.
All 16 chunked live runs against `WEB_UK_BASE_URL=http://127.0.0.1:5321` with
`TENANT_ID=2` and `SMOKE_MODULE_PAGE_CHUNK=N/16` passed on 2026-07-07:
`481` total repeated checks, `0` failures, and `161` collective module-page
checks across the default sweep. Each shard also reran the auth/API setup,
unsigned auth-required redirects, gated status checks, and signed redirect
checks.
A targeted real-fixture parameterised run against
`WEB_UK_BASE_URL=http://127.0.0.1:5325`, started with `TENANT_ID=2`, passed on
2026-07-07: `24/24` checks, `0` failures, with 6 auth/health checks and 18
module-page checks across event detail/depth, volunteering opportunity detail,
organisation detail/jobs/apply, job detail, group detail/depth, and resource
comments. This specifically verifies Laravel v2 event/group detail payload
unwrapping for `/events/6` and `/groups/484`; it does not certify ASP.NET mode.
The same 18 stable real-fixture pages are now included in the default module
page sweep. The default scope also covers `/groups/484/discussions/new`,
`/jobs/90764/qualified`, `/members/77/insights`, `/listings/42/report`,
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
`/jobs/90764/analytics`, `/jobs/90764/pipeline`, `/jobs/90764/applications`,
`/listings/42/analytics`, `/group-exchanges/1`, `/messages/groups/33`,
`/resources/10/delete`, `/coupons/1`, and `/coupons/2` as
signed `403` responses; plus signed redirects from `/events/6/recurring-edit`
to `/events/6/edit`, `/groups/484/edit` to `/groups/484`,
`/courses/42/certificate` to `/courses/42?status=certificate-failed`, and
`/federation/messages/conversation/77` to `/federation/messages`,
`/courses/1/learn` to `/courses/1?status=enrol-required`,
`/courses/2/learn` to `/courses/2?status=enrol-required`, and
`/federation/messages/conversation/353` to `/federation/messages`. A targeted
live run against `WEB_UK_BASE_URL=http://127.0.0.1:5336`, started with
`TENANT_ID=2`, passed on 2026-07-07: `28/28` checks, `0` failures. A full
default Laravel-backed run against `WEB_UK_BASE_URL=http://127.0.0.1:5336`,
started with `TENANT_ID=2`, passed on 2026-07-07: `247/247` checks, `0`
failures, `210` module-page checks, 8 unsigned auth-required redirect checks,
13 gated-status checks, and 10 signed redirect checks; `npm run smoke:laravel`
exited `0`.
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

## Current Page Candidates

`/account` GET is a local Blade-style protected account hub candidate. Unsigned
requests redirect to `/login`, and signed-in requests render local account cards
for wallet, messages, connections, notifications, profile, and settings. The
notifications module includes Laravel accessible aliases for
`/notifications/group/read` and `/notifications/delete-all`, backed by
`/api/v2/notifications/group/read` and `DELETE /api/v2/notifications`. The wallet
module includes the Laravel accessible `/wallet/donate` POST, backed by
`/api/v2/wallet/donate`. Saved-item removal and appreciation send/react aliases
are backed by `/api/v2/me/saved-items` and `/api/v2/appreciations`.
Saved-collection aliases are backed by `/api/v2/me/collections` plus
`/api/v2/me/saved-items/{id}` for item removal.
Match-dismiss aliases are backed by `/api/v2/matches/{id}/dismiss`.
Exchange action/rating aliases are backed by `/api/v2/exchanges/{id}` action
endpoints and `/api/v2/exchanges/{id}/rate`.
Onboarding step POSTs use `/api/users/me`, `/api/v2/users/me/avatar`,
`/api/v2/onboarding/safeguarding`, and `/api/v2/onboarding/complete`. It is not
a backend adapter and does not certify Laravel tenant feature gates, full
account-link coverage, route availability checks, per-module response contracts,
realtime notification behavior, onboarding visual parity, or ASP.NET backend
readiness.

`/cookies` GET and `/cookie-consent` POST are local Blade-style no-JS cookie
candidates. They render the Laravel-style analytics settings form and set the
same first-party `nexus_alpha_cookie_consent` values (`all` or `essential`) used
by Laravel's accessible frontend. They do not certify Laravel `cookie_consents`
audit persistence, tenant-scoped consent behavior, localized copy, report-a-
problem workflows, or ASP.NET backend readiness.

`/volunteering` GET is a local Blade-style public landing/search candidate
based on the Laravel accessible volunteering page. It reads
`/api/v2/volunteering/opportunities` with `search`, `category_id`, `is_remote`,
`per_page`, and `cursor` query params, and keeps empty/error states for API
unavailability. `/volunteering/opportunities/{id}` GET reads
`/api/v2/volunteering/opportunities/{id}` and renders the public Blade-style
detail, metadata, shifts, and a safe apply link. It is not a backend adapter and
does not certify applications, recommended shifts, hours, organisation owner
tools, apply POST, shift signup/cancel, feature gates, tenant routing, auth
redirects, or POST workflows.

`/organisations`, `/organisations/browse`, `/organisations/register`,
`/organisations/manage`, `/organisations/{id}`, `/organisations/{id}/jobs`, and
`/organisations/opportunities/{id}/apply` GET are local Blade-style visual/data
candidates based on the Laravel accessible organisations pages. The directory GET reads
`/api/v2/volunteering/organisations` with `search` and `per_page` query params
and keeps a warning state for API unavailability. The browse GET uses the same
collection with `search`, `per_page`, and cursor-style load-more pagination. The
register GET renders the standalone Blade-style form and validation status
anchors. `/organisations` POST and `/organisations/register` POST validate the
same required fields/terms, require a signed token, submit to
`/api/v2/volunteering/organisations`, and redirect with Laravel status keys. The
manage GET reads `/api/v2/volunteering/my-organisations` when a signed token is
present and renders owner/admin and pending rows, but Laravel auth redirect
behavior is not certified. Its detail GET reads
`/api/v2/volunteering/organisations/{id}?include=public_contract` and renders
profile, contact, jobs-link, basic public stats, active opportunities from
`/api/v2/volunteering/opportunities?organization_id={id}`, and volunteer
reviews from `/api/v2/volunteering/reviews/organization/{id}`. The organisation
jobs GET reads `/api/v2/jobs?organization_id={id}&status=open` when signed in
and renders Blade-style job cards. The organisation opportunity apply GET reads
`/api/v2/volunteering/opportunities/{id}` and renders the Blade-style
confirmation page that posts to the existing volunteering apply route when
signed in. It is
not a backend adapter and must not be treated as proof that Laravel or ASP.NET
organisation workflows are ready in this app. The remaining work includes
tenant-prefixed routing, auth redirects, volunteering feature gates,
job-vacancy feature gates, registration runtime persistence, organisation apply
POST workflow, localization, and runtime smoke tests.

## Required Compatibility Areas

Before switching backends, every certified route family needs proof for:

- Tenant resolution: shared slug paths and custom accessible domains.
- Auth/session: login, logout, refresh, 2FA, redirects, and signed-in state.
- CSRF/forms: token names, form POST behavior, validation failures, and replay
  handling.
- Feature and module gates: hidden links, disabled pages, 403/404 behavior, and
  tenant configuration.
- Request shape: query params, form fields, multipart names, and route params.
- Response shape: page data, lists, pagination, empty states, errors, and status
  codes.
- Uploads: avatar, listing images, event cover images, resources, and any media
  constraints. Event cover-image clearing/removal still needs an explicit
  Laravel-compatible API contract before this frontend can expose the Blade
  remove-current-image checkbox.
- Redirects: success/failure destinations and flash messages.
- Localization: locale selection, RTL, translated labels, and validation copy.
- Realtime or async status: messages, notifications, and unread-count behavior.

Use `docs/generated/accessible-route-matrix.csv` as the route-by-route backlog
seed before certifying any family. It is refreshed with `npm run route:matrix`
and records Laravel route names, handlers, inferred Blade views, feature/module
gates, auth classification, API/service hints, and current `apps/web-uk`
method/path matches.

`src/routes/laravel-prep-pages.js` registers generated Laravel GET preparation
pages after all real route modules. These fallback pages count as route
existence only. They are not backend adapters and must not be used as proof of
Laravel or ASP.NET workflow compatibility.

`src/routes/contact-support.js` is a Laravel-backed candidate for the accessible
contact/support routes. `/contact` POST submits to Laravel `/api/v2/contact`;
signed-in `/report-a-problem` POST submits to Laravel `/api/v2/support/reports`.
The routes mirror Laravel status keys and validation shape, but tenant-domain
routing, Turnstile production behavior, localization, notification side effects,
and ASP.NET backend compatibility still need runtime certification.

The auth router also exposes Laravel accessible aliases for
`/login/forgot-password`, `/password/reset`, `/login/two-factor`, and
`/login/resend-verification`. These map to the existing local forgot-password,
reset-password, 2FA, and verification-resend handlers, with the reset API helper
using Laravel's `password`/`password_confirmation` payload. Login responses with
`requires_2fa` use Laravel's `two_factor_token`, store it in the web session,
and redirect to `/login/two-factor`; missing challenge tokens redirect back to
`/login?status=two-factor-required`.

## Local Environment Shape

Keep three local surfaces distinct:

| Surface | Path | Role |
| --- | --- | --- |
| Laravel source | `C:\platforms\htdocs\staging` | Production source of truth; read-only from this repo. |
| ASP.NET backend | `C:\platforms\htdocs\asp.net-backend` | Development backend that must match Laravel contracts. |
| Accessible candidate | `C:\platforms\htdocs\asp.net-backend\apps\web-uk` | Future shared accessible frontend candidate. |

Future extraction should move `apps/web-uk` into its own repository only after
it has independent `AGENTS.md`, `CLAUDE.md`, README, docs, tests, route matrix,
and backend contract notes.

## Non-Negotiable Guardrails

- Do not make ASP.NET route gaps disappear by weakening the accessible frontend.
- Do not point React utility-bar traffic at `apps/web-uk` until route/workflow
  certification and rollback planning are complete.
- Do not claim shared readiness from static route counts or skeleton pages.
- Prefer making ASP.NET match Laravel accessible behavior over adding
  backend-specific branches in Nunjucks views.
