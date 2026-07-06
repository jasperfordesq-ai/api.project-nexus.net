# apps/web-uk Shared Accessible Frontend Notes

Last reviewed: 2026-07-06

`apps/web-uk` is the ASP.NET repo's future shared accessible frontend candidate.
It is not production-ready, does not certify production readiness, and must not
replace the Laravel Blade accessible frontend until certification is complete.

## Source Of Truth

Visual and workflow source:

```text
C:\platforms\htdocs\staging\accessible-frontend
C:\platforms\htdocs\staging\routes\govuk-alpha.php
C:\platforms\htdocs\staging\routes\govuk-alpha-parity
```

Local implementation:

```text
apps/web-uk
```

Backend target resolution is Laravel-first and lives in:

```text
apps/web-uk\src\lib\backend-contract.js
```

By default, `apps/web-uk` resolves API calls to the local Laravel staging base
URL `http://127.0.0.1:8088`. `ACCESSIBLE_BACKEND_TARGET=aspnet` remains future
work and must not be treated as certified compatibility.

## Stack

- Express
- Nunjucks
- GOV.UK Frontend
- Sass
- HTML-first server rendering
- progressive enhancement only

Do not add React, Vue, Next.js, client-side routing, or another CSS framework.

## GOV.UK Upstream References

- `alphagov/govuk-frontend`: https://github.com/alphagov/govuk-frontend
- `alphagov/govuk-design-system`: https://github.com/alphagov/govuk-design-system
- GOV.UK Design System: https://design-system.service.gov.uk/
- GOV.UK Frontend technical docs: https://frontend.design-system.service.gov.uk/

Use GOV.UK Frontend for reusable components and patterns. Do not copy
government identity.

## Current Prep Work

The app now has a shared shell contract in:

```text
src/lib/accessible-shell.js
```

The shell feeds:

- custom Project NEXUS `nexus-alpha-header`
- GOV.UK service navigation
- no-JS language selector
- footer columns
- Explore card list

The `/explore` page is a skeleton copied from the Laravel accessible information
architecture. It does not certify ASP.NET backend or workflow parity.

The `/account` page is now a local Blade-style protected account hub candidate.
Unsigned requests redirect to `/login`, matching the Laravel accessible account
route. Signed-in requests render the Blade-style account card list for wallet,
messages, connections, notifications, profile, and settings, plus a
CSRF-protected sign-out form. This remains partial: Laravel tenant feature
gating, full account-link coverage, per-module backend data, route availability
checks, localization, runtime smoke tests, and ASP.NET backend compatibility are
not certified.

The cookie banner and `/cookies` page are now local Blade-style no-JS
candidates. The shell renders the GOV.UK cookie banner before the skip link
until the Laravel-compatible `nexus_alpha_cookie_consent` cookie is present.
Accept/reject/save posts use `/cookie-consent` and store `all` or `essential`
locally, matching Laravel's first-party choice cookie values. This remains
partial: Laravel `cookie_consents` audit persistence, tenant scoping, route-name
generation, localization, runtime smoke tests, and ASP.NET backend
compatibility are not certified.

The `/volunteering` page is now a local Blade-style public landing candidate
for the Laravel accessible volunteering page. It renders the caption, lead,
organisation browse link, how-volunteering-works inset, sign-in notice, filter
form, opportunity cards, empty/error states, and cursor load-more link. Its
opportunity list is backed by Laravel `/api/v2/volunteering/opportunities`
using `search`, `category_id`, `is_remote`, `per_page`, and `cursor`
parameters. Its `/volunteering/opportunities/{id}` page is backed by
`/api/v2/volunteering/opportunities/{id}` and renders the Blade-style public
detail, organisation summary, opportunity metadata, available shifts, and safe
apply link. This remains partial: applications, recommended shifts, hours,
organisation owner tools, apply POST, shift signup/cancel, feature gates,
tenant-prefixed routes, localization, runtime smoke tests, and ASP.NET backend
compatibility are not certified.

The `/organisations` page is now a local Blade-style candidate for the Laravel
accessible organisations directory. It includes the caption, subnavigation,
search form, empty state, status banners, registration copy, registration form,
terms, and pending notice. Its directory list is backed by the Laravel
`/api/v2/volunteering/organisations` collection using `search` and `per_page`
parameters. Its `/organisations/browse` page is also backed by that collection,
using `search`, `per_page`, and cursor-style load-more pagination. Its
`/organisations/register` page renders the Blade-style standalone registration
form and Laravel validation status anchors. `/organisations` POST and
`/organisations/register` POST validate the same required fields/terms, require a
signed token, submit to Laravel `/api/v2/volunteering/organisations`, and redirect
with Laravel status keys. Its `/organisations/manage` page renders the Blade-style
manage entry and, when a signed token is present, reads
`/api/v2/volunteering/my-organisations` for owner/admin and pending rows. Its
detail page is backed by
`/api/v2/volunteering/organisations/{id}?include=public_contract` for profile,
contact, basic public stats, and Laravel-backed depth sections from
`/api/v2/volunteering/opportunities?organization_id={id}` and
`/api/v2/volunteering/reviews/organization/{id}`. Its
`/organisations/{id}/jobs` page renders the Blade-style organisation job
openings view and, when a signed token is present, reads
`/api/v2/jobs?organization_id={id}&status=open`. Its
`/organisations/opportunities/{id}/apply` page renders the Blade-style apply
confirmation page and reads `/api/v2/volunteering/opportunities/{id}`. This
remains partial: auth enforcement, volunteering/job feature gates,
tenant-prefixed routes, organisation registration runtime persistence, apply POST
workflow, localization, runtime smoke tests, and ASP.NET backend compatibility are
not certified.

Additional preparation docs:

- `LARAVEL_ACCESSIBLE_ROUTE_MATRIX.md` maps Blade route families and shell links
  to current `apps/web-uk` equivalents.
- `BLADE_COMPONENT_PORT_AUDIT.md` tracks what visual/workflow patterns have and
  have not been ported from Blade.
- `BACKEND_SWITCHING_CONTRACT.md` documents future Laravel/ASP.NET backend
  switching requirements without implementing a real adapter yet.

Generated route-matrix artifacts live under `docs/generated/` and are refreshed
with `npm run route:matrix`. The 2026-07-06 generated baseline is 608 Laravel
accessible route declarations, 403 `apps/web-uk` route declarations, 321 exact
method/path matches, 287 missing Laravel routes, and 83 local-only routes. These
counts include generated Laravel GET preparation pages and are backlog evidence
only; they do not certify workflow parity.

## Before Extraction To Its Own Repo

- Keep this `docs/` folder.
- Keep `AGENTS.md` and `CLAUDE.md`.
- Keep package scripts for brand checks, tests, and Sass build.
- Keep generated CSS reproducible from Sass.
- Keep route/workflow certification docs close to this folder.
