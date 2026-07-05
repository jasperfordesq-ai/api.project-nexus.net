# Accessible Shared Frontend Direction

Last reviewed: 2026-07-05

## Decision

`apps/web-uk/` is the future shared accessible frontend candidate for Project
NEXUS. It should keep the ASP.NET repo's preferred accessible stack:

- Express
- Nunjucks
- GOV.UK Frontend
- server-rendered HTML
- progressive enhancement only

The production Laravel Blade accessible frontend remains the source of truth for
look, layout, information architecture, routes, and workflows until this
candidate has been certified module by module.

Laravel source of truth:

```text
C:\platforms\htdocs\staging\accessible-frontend
C:\platforms\htdocs\staging\routes\govuk-alpha.php
C:\platforms\htdocs\staging\routes\govuk-alpha-parity
```

ASP.NET candidate:

```text
C:\platforms\htdocs\asp.net-backend\apps\web-uk
```

## Current Status

This work prepares the skeleton and guardrails only. It does not certify
production readiness, route parity, workflow parity, tenant-domain parity, auth
parity, localization parity, or API compatibility.

Current local preparation docs in `apps/web-uk/docs/`:

- `LARAVEL_ACCESSIBLE_ROUTE_MATRIX.md`
- `BLADE_COMPONENT_PORT_AUDIT.md`
- `BACKEND_SWITCHING_CONTRACT.md`

The React utility-bar link must continue pointing at the production Laravel
accessible frontend until `apps/web-uk` has passed route, workflow, accessibility,
tenant, auth, and runtime smoke certification.

## Official GOV.UK Sources

Use the public GOV.UK sources as upstream references:

- `alphagov/govuk-frontend`: https://github.com/alphagov/govuk-frontend
- `alphagov/govuk-design-system`: https://github.com/alphagov/govuk-design-system
- GOV.UK Design System: https://design-system.service.gov.uk/
- GOV.UK Frontend technical docs: https://frontend.design-system.service.gov.uk/

`govuk-frontend` is the reusable package for service teams. The GOV.UK Design
System website points implementation reuse to `govuk-frontend`.

## Branding Rules

Project NEXUS is not a UK government service.

Do not use:

- GOV.UK crown, crest, Royal Arms, or logotype
- `govukHeader` macro
- `govukFooter` macro
- Open Government Licence block or Crown copyright wording
- public wording that says or implies this is a GOV.UK service

Do use:

- GOV.UK typography, spacing, grid, forms, tables, buttons, summaries, phase
  banner, service navigation, skip link, and accessibility patterns
- custom Project NEXUS header and footer
- AGPL/source attribution required by this project

## Visual Source Of Truth

The ASP.NET accessible frontend should visually follow the Laravel Blade
accessible frontend, especially:

- custom `nexus-alpha-header`
- dark header and accent strip
- tenant/service brand area
- no-JS language selector
- lean GOV.UK service navigation
- "My account" header link when signed in
- phase banner below navigation
- `nexus-alpha-card-list` and `nexus-alpha-card`
- footer columns and AGPL/source metadata
- Explore page as the gateway to discovery modules

Do not invent a separate visual language in `apps/web-uk`.

## Future Repository Plan

When route/workflow parity matures, `apps/web-uk` should move into its own
repository as the shared accessible frontend. Before that move, this folder must
have its own `AGENTS.md`, `CLAUDE.md`, README, docs, tests, and versioned
contract notes so agents can work safely after extraction.

## Acceptance Gates Before Shared Use

- Route matrix maps every Laravel `govuk-alpha*` route to an `apps/web-uk`
  route, intentional redirect, or documented replacement.
- Runtime smoke tests cover tenant resolution, auth redirects, CSRF forms,
  feature gates, and key workflows.
- Rendered pages pass accessibility smoke checks.
- API calls used by `apps/web-uk` match the canonical Laravel contracts or are
  backed by documented ASP.NET compatibility endpoints.
- The React utility-bar link is changed only after the shared accessible frontend
  has a production deployment path and rollback plan.
