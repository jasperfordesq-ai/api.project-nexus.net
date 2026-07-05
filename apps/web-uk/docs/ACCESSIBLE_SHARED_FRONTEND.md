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

The `/features` page is a local Blade-style candidate copied from the Laravel
feature summary page. It uses the same caption, lead copy, spaced GOV.UK bullet
list, and CTA to the guide page. It does not certify Laravel feature/module
gates, runtime web-route behaviour, tenant-specific content, localization
persistence, or ASP.NET backend compatibility.

The `/guide` page is a local Blade-style candidate copied from the Laravel
timebanking guide page. It uses the same caption, lead copy, equality section,
ordered three-step list, getting-started copy, and signed-in/signed-out CTA
shape. It does not certify Laravel feature/module gates, auth/session behaviour,
runtime web-route behaviour, tenant-specific content, localization persistence,
or ASP.NET backend compatibility.

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

The `/account` page is a local Blade-style candidate copied from the Laravel
account hub shape. It uses the same card-list pattern for wallet, messages,
connections, notifications, reviews, activity, saved items, jobs, matches, group
exchanges, gamification, profile, and settings links, and those links stay inside
the `/{tenantSlug}/alpha` prefix during shared-domain preparation. It does not
certify Laravel feature/module gating, auth enforcement, unread counts, live
data, destination workflows, or ASP.NET backend compatibility.

The `/faq` page is a local Blade-style candidate copied from the Laravel FAQ
shape. It uses the GOV.UK accordion pattern and the current Laravel English FAQ
strings for the five common timebanking questions. It does not certify Laravel
localization persistence, tenant-specific content, runtime web-route behaviour,
or ASP.NET backend compatibility.

The `/help` page is a local Blade-style candidate copied from the Laravel Help
centre shape. It uses the same search form, search hint, empty/no-results inset
state, contact CTA, and tenant-prefixed contact link. It does not certify live
FAQ group loading, search filtering, Laravel localization persistence,
tenant-specific content, runtime web-route behaviour, or ASP.NET backend
compatibility.

The `/kb` page is a local Blade-style candidate copied from the Laravel
Knowledge base index shape. It uses the same search form, search hint, articles
heading, empty/no-results inset state, and tenant-prefixed form action. It does
not certify live article loading, pagination, `/kb/{id}` article detail,
Laravel localization persistence, tenant-specific content, runtime web-route
behaviour, or ASP.NET backend compatibility.

The `/blog` page is a local Blade-style candidate copied from the Laravel Blog
index shape. It uses the same caption, lead copy, search form, search hint,
posts heading, empty/no-results inset state, and tenant-prefixed form action.
It does not certify the Laravel blog feature gate, live post loading,
categories, cursor pagination, `/blog/{slug}` post detail, `/blog/feed.xml`,
comments, likes, Laravel localization persistence, tenant-specific content,
runtime web-route behaviour, or ASP.NET backend compatibility.

The `/volunteering` page is a local Blade-style candidate copied from the
Laravel Volunteering index shape. It includes the caption, lead copy,
organisation browse link, "How volunteering works" inset, organisation gateway,
hours summary shell, volunteering tools, tabs, search/filter form, result count,
and empty/no-results inset state with tenant-prefixed links. It does not certify
the Laravel volunteering feature gate, live opportunities, categories,
applications, recommended shifts, community projects, hours logging,
organisation management, accessibility needs, certificates, waitlist, swaps,
group sign-ups, expenses, donations, post workflows, Laravel localization
persistence, tenant-specific content, runtime web-route behaviour, or ASP.NET
backend compatibility.

The `/accessibility` page is a local Blade-style candidate copied from the
Laravel accessibility statement shape. It uses the same back link, statement
sections, WCAG 2.2 Level AA summary list, support feature sections, feedback
link, and testing section. It does not certify Laravel localization persistence,
tenant-specific content, runtime web-route behaviour, or ASP.NET backend
compatibility.

The `/legal` and `/legal/*` pages are local Blade-style candidates copied from
the Laravel legal hub and fallback legal-document shapes. The hub uses the same
card-list layout and tenant-prefixed links for Terms of service, Privacy policy,
Cookie policy, Community guidelines, Acceptable use policy, and Accessibility
statement. The document routes render Laravel's general fallback policy copy
when no tenant-managed document is available. They do not certify tenant-managed
legal document loading, version metadata, sanitized rich content, Laravel
localization persistence, runtime web-route behaviour, or ASP.NET backend
compatibility.

The `/trust-and-safety` page is a local Blade-style candidate copied from the
Laravel trust and safety page. It uses the same GOV.UK warning text, safety
section headings, bullet-list guidance, contact CTA, and community guidelines
link. It does not certify Laravel localization persistence, tenant-specific
content, runtime web-route behaviour, safeguarding-report handling, or ASP.NET
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
