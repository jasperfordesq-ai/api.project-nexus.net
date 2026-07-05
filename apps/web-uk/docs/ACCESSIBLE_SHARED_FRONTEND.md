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

Backend target configuration lives in:

```text
src/lib/backend-config.js
```

`backend-config.js` defaults `apps/web-uk` to the Laravel backend target. This
does not make the frontend production-ready; it only records the Laravel-first
direction while route, form, tenant, auth, and workflow contracts are certified
module by module. ASP.NET remains explicitly pending backend parity.

The app can locally render prepared pages under Laravel's shared-domain
accessible route shape, such as `/{tenantSlug}/alpha/explore`. The alias keeps
shell links, no-JS form actions, and local redirects inside the same prefix for
the prepared cookie, contact, and report-problem workflows. It does not certify
tenant resolution, custom accessible domains, feature gates, auth/session
behavior, or backend persistence.

The shell feeds:

- custom Project NEXUS `nexus-alpha-header`
- GOV.UK service navigation
- no-JS cookie banner before the skip link
- no-JS language selector
- footer columns
- Explore card list

The `/explore` page is a skeleton copied from the Laravel accessible information
architecture. It does not certify ASP.NET backend or workflow parity.

The `/cookies` page and `/cookie-consent` POST handler are local no-JS candidate
workflows copied from the Blade pattern so the banner and settings page are
usable during preparation. They record the same `nexus_alpha_cookie_consent`
cookie name and keep local redirects safe, but they do not certify Laravel
session persistence, tenant scoping, or ASP.NET backend compatibility.

The global language switcher is a no-JS GET form copied from the Blade shell
pattern. It preserves scalar non-locale query parameters as hidden inputs when a
visitor changes language. It does not certify Laravel locale persistence
middleware, translated content parity, or ASP.NET backend compatibility.

The `/report-a-problem` GET/POST workflow is also a local no-JS candidate copied
from the Blade pattern. It preserves the signed-out contact redirect, signed-in
form, field validation, impact radios, safe page URL handling, and confirmation
reference shape. It does not certify Laravel `support_reports` persistence,
notifications, tenant scoping, or ASP.NET backend compatibility.

The `/contact` GET/POST workflow is a local no-JS candidate copied from the
Blade pattern. It preserves the report-problem prefill, validation summary,
subject choices, signed-out account hint, and success state. It does not certify
Turnstile verification, Laravel contact delivery, tenant scoping, or ASP.NET
backend compatibility.

Additional preparation docs:

- `ACCESSIBLE_PREPARATION_SCORECARD.md` explains the preparation-only score and
  what remains outside preparation.
- `LARAVEL_ACCESSIBLE_ROUTE_MATRIX.md` maps Blade route families and shell links
  to current `apps/web-uk` equivalents.
- `LARAVEL_ACCESSIBLE_ROUTE_INVENTORY.md` is generated from Laravel route files
  and lists all accessible route declarations.
- `BLADE_VIEW_INVENTORY.md` is generated from Laravel Blade accessible views and
  current Nunjucks views.
- `AUTH_FORM_CONTRACT_MATRIX.md` is generated from Laravel Blade accessible auth
  forms and current Nunjucks auth forms.
- `BLADE_COMPONENT_PORT_AUDIT.md` tracks what visual/workflow patterns have and
  have not been ported from Blade.
- `BACKEND_SWITCHING_CONTRACT.md` documents future Laravel/ASP.NET backend
  switching requirements without implementing a real adapter yet.
- `ACCESSIBLE_BACKEND_CONTRACT_MATRIX.md` is generated from Laravel route
  families and lists backend contract proof areas.

Regenerate the inventories with:

```bash
npm run audit:accessible-prep
```

## Before Extraction To Its Own Repo

- Keep this `docs/` folder.
- Keep `AGENTS.md` and `CLAUDE.md`.
- Keep package scripts for brand checks, tests, and Sass build.
- Keep generated CSS reproducible from Sass.
- Keep route/workflow certification docs close to this folder.
