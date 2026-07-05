# apps/web-uk Shared Accessible Frontend Notes

Last reviewed: 2026-07-05

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

## Before Extraction To Its Own Repo

- Keep this `docs/` folder.
- Keep `AGENTS.md` and `CLAUDE.md`.
- Keep package scripts for brand checks, tests, and Sass build.
- Keep generated CSS reproducible from Sass.
- Keep route/workflow certification docs close to this folder.
