# Backend Switching Contract

Last reviewed: 2026-07-05

## Decision

`apps/web-uk` may become a shared accessible frontend for Laravel and ASP.NET in
the future, but this pass does not implement real backend adapters or switch
production traffic. The Laravel Blade accessible frontend remains the source of
truth, and ASP.NET must become compatible with that behavior.

## Laravel-First Backend Target

`src/lib/backend-config.js` is the single configuration point for backend
targeting in `apps/web-uk`. It defaults to the Laravel backend because the
Laravel backend and Blade accessible frontend are the current source of truth.

Use `LARAVEL_BACKEND_URL` for the Laravel backend base URL. `API_BASE_URL`
remains a legacy fallback so older local commands and tests continue to work,
but new accessible frontend work should prefer the Laravel-specific variable.

ASP.NET remains pending backend parity. Setting `ACCESSIBLE_BACKEND_TARGET` to
`aspnet` must not be treated as certification; it only records the intended
future mode while ASP.NET continues to bend toward Laravel's accessible
contracts.

## Laravel Accessible Web Routes

Laravel's Blade accessible frontend is not a JSON API frontend. It is a
server-rendered web route set registered in two modes:

| Mode | Laravel route shape | `apps/web-uk` env |
| --- | --- | --- |
| Shared platform domain | `/{tenantSlug}/alpha/...` | `ACCESSIBLE_ROUTE_MODE=tenant-slug` and `ACCESSIBLE_TENANT_SLUG=<slug>` |
| Custom accessible domain | bare paths such as `/dashboard` | `ACCESSIBLE_ROUTE_MODE=custom-domain` |

Use `buildLaravelAccessiblePath()` and `buildLaravelAccessibleUrl()` from
`src/lib/backend-config.js` when documenting or testing Laravel accessible web
routes. Use `buildBackendUrl()` for JSON API calls. Do not treat Blade routes as
API endpoints.

`apps/web-uk` also has a local preparation alias for shared-domain Laravel
paths. Requests shaped like `/{tenantSlug}/alpha/...` are rewritten internally
to the matching local Express path while shell links, cookie/report/contact form
actions, local redirects, and the language form stay under the same prefix. This
is only local route-shape preparation; it does not certify Laravel tenant
lookup, custom accessible-domain resolution, feature gates, auth/session
behavior, or backend persistence.

## Future Modes

| Mode | Meaning | Current status |
| --- | --- | --- |
| Laravel-compatible | The frontend talks to endpoints and page workflows matching the Laravel accessible frontend. | Source of truth only; no Express adapter is implemented here. |
| ASP.NET-compatible | The frontend talks to ASP.NET endpoints that intentionally mimic Laravel accessible contracts. | Development-only; not certified. |

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
