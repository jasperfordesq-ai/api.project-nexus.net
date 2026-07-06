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

The `/organisations` page is now a local Blade-style candidate for the Laravel
accessible organisations directory. It includes the caption, subnavigation,
search form, empty state, status banners, registration copy, registration form,
terms, and pending notice. Its directory list is backed by the Laravel
`/api/v2/volunteering/organisations` collection using `search` and `per_page`
parameters. Its `/organisations/browse` page is also backed by that collection,
using `search`, `per_page`, and cursor-style load-more pagination. Its
`/organisations/register` page renders the Blade-style standalone registration
form and Laravel validation status anchors, but does not certify POST
persistence. Its `/organisations/manage` page renders the Blade-style manage
entry and, when a signed token is present, reads
`/api/v2/volunteering/my-organisations` for owner/admin and pending rows. Its
detail page is backed by
`/api/v2/volunteering/organisations/{id}?include=public_contract` for profile,
contact, and basic public stats. Its `/organisations/{id}/jobs` page renders
the Blade-style organisation job openings view and, when a signed token is
present, reads `/api/v2/jobs?organization_id={id}&status=open`. Its
`/organisations/opportunities/{id}/apply` page renders the Blade-style apply
confirmation page and reads `/api/v2/volunteering/opportunities/{id}`. This
remains partial: auth enforcement, volunteering/job feature gates,
tenant-prefixed routes, organisation registration persistence, apply POST
workflow, detail depth opportunities/reviews, localization, runtime smoke
tests, and ASP.NET backend compatibility are not certified.

Additional preparation docs:

- `LARAVEL_ACCESSIBLE_ROUTE_MATRIX.md` maps Blade route families and shell links
  to current `apps/web-uk` equivalents.
- `BLADE_COMPONENT_PORT_AUDIT.md` tracks what visual/workflow patterns have and
  have not been ported from Blade.
- `BACKEND_SWITCHING_CONTRACT.md` documents future Laravel/ASP.NET backend
  switching requirements without implementing a real adapter yet.

## Before Extraction To Its Own Repo

- Keep this `docs/` folder.
- Keep `AGENTS.md` and `CLAUDE.md`.
- Keep package scripts for brand checks, tests, and Sass build.
- Keep generated CSS reproducible from Sass.
- Keep route/workflow certification docs close to this folder.
