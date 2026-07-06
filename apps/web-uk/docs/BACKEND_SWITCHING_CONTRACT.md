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
Onboarding step POSTs use `/api/users/me`, `/api/v2/onboarding/safeguarding`,
and `/api/v2/onboarding/complete`; avatar upload is still a safe failure until
multipart proxying is implemented. It is not a backend adapter and does not
certify Laravel tenant feature gates, full account-link coverage, route
availability checks, per-module response contracts, realtime notification
behavior, onboarding visual parity, or ASP.NET backend readiness.

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
- Uploads: avatar, listing images, resources, and any media constraints.
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
using Laravel's `password`/`password_confirmation` payload.

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
