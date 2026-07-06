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

`/organisations`, `/organisations/browse`, `/organisations/register`,
`/organisations/manage`, `/organisations/{id}`, and `/organisations/{id}/jobs`
GET are local Blade-style visual/data candidates based on the Laravel
accessible organisations pages. The directory GET reads
`/api/v2/volunteering/organisations` with `search` and `per_page` query params
and keeps a warning state for API unavailability. The browse GET uses the same
collection with `search`, `per_page`, and cursor-style load-more pagination. The
register GET renders the standalone Blade-style form and validation status
anchors, but POST persistence is not certified. The manage GET reads
`/api/v2/volunteering/my-organisations` when a signed token is present and
renders owner/admin and pending rows, but Laravel auth redirect behavior is not
certified. Its detail GET reads
`/api/v2/volunteering/organisations/{id}?include=public_contract` and renders
profile, contact, jobs-link, basic public stats, and empty depth sections. The
organisation jobs GET reads `/api/v2/jobs?organization_id={id}&status=open`
when signed in and renders Blade-style job cards. It is
not a backend adapter and must not be treated as proof that Laravel or ASP.NET
organisation workflows are ready in this app. The remaining work includes
tenant-prefixed routing, auth redirects, volunteering feature gates,
job-vacancy feature gates, registration persistence, POST validation behavior,
redirects, organisation apply workflows, detail opportunities/reviews depth
data, localization, and runtime smoke tests.

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
