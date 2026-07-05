# Blade Component Port Audit

Last reviewed: 2026-07-05

## Purpose

This audit lists reusable Laravel Blade accessible frontend patterns that should
be ported into `apps/web-uk` while preserving the Express/Nunjucks/GOV.UK
Frontend stack.

## Ported Or Started

| Blade pattern | Laravel source | ASP.NET target | Status |
| --- | --- | --- | --- |
| Custom dark header | `accessible-frontend/views/layout.blade.php` | `src/views/layouts/base.njk` | Started. Text brand, language selector, My account link, and service navigation are present. |
| Header visual layer | `accessible-frontend/src/app.scss` | `src/assets/scss/main.scss` | Started. Dark header, accent strip, language form, nav badge, card list, and link-button patterns are present. |
| Service navigation | `AlphaController::alphaNavItems()` | `src/lib/accessible-shell.js` | Started. Header labels now mirror Blade IA. Feature-gate behavior is not implemented yet. |
| Footer columns | `AlphaController::alphaFooterColumns()` | `src/lib/accessible-shell.js` and `partials/footer.njk` | Started. Platform, Support, and Legal columns mirror Blade labels and local path equivalents. |
| Footer meta | `layout.blade.php` | `partials/footer.njk` | Started. Report problem, Cookies, POST sign-out, AGPL attribution, and source link are present. |
| Explore gateway | `views/explore.blade.php` | `src/views/explore.njk` | Started. Card order and live-content section structure now mirror Blade. |
| Organisations directory | `views/organisations.blade.php` | `src/views/organisations.njk` | Partial. Directory heading, subnavigation, search, empty state, registration copy, terms, and form are present. Directory data loads from Laravel `/api/v2/volunteering/organisations`; API-unavailable warning state is present. |

## Still To Port

| Blade pattern | Why it matters | Suggested ASP.NET implementation |
| --- | --- | --- |
| Tenant logo and shape sizing | Blade supports tenant-uploaded dark logos with aspect-ratio-aware sizing. | Add tenant logo locals after ASP.NET tenant bootstrap exposes compatible logo URLs and validated header colours. |
| Per-tenant header colours | Blade safely validates `#rrggbb` values and picks readable foreground colours. | Add validated colour locals only after tenant setting parity exists. |
| Cookie banner | Blade includes the GOV.UK cookie banner before the skip link. | Add Nunjucks cookie-banner partial and POST contract after cookie consent backend parity exists. |
| No-JS locale preservation | Blade preserves non-locale query params in the language selector. | Add hidden query-param locals and tests once routing helpers are stable. |
| Account hub | Blade moves wallet, messages, connections, matches, group exchanges, gamification, profile, and settings into My account. | Build an `account` route/view fed by existing modules, then certify backend calls. |
| Module and feature gating | Blade only shows modules enabled for the tenant. | Add a feature/module flag local from ASP.NET tenant bootstrap, matching Laravel semantics. |
| Live Explore content | Blade shows recent listings and upcoming events. | Add data loaders after Laravel-compatible listing/event response shapes are proven. |
| Organisations workflows | Blade protects the page with auth and volunteering feature checks, lists real organisations, and posts registrations through `VolunteerService`. | Directory data now reads Laravel's public organisations API. Tenant routing, auth redirects, feature gates, registration validation/persistence, and success/error redirects still need certification. |
| Page-specific subnavs | Commerce, federation, gamification, jobs, messages, and ideation have Blade partial navs. | Port each partial into Nunjucks during module-by-module route parity work. |
| Error and validation summaries | Blade uses consistent GOV.UK error summary behavior. | Audit every form after route/workflow parity is mapped. |

## Do Not Port

- GOV.UK crown, logotype, official header identity, OGL block, or Crown
  copyright wording.
- Laravel/PHP implementation details.
- Production traffic routing before certification.
- ASP.NET-specific visual inventions that diverge from the Blade source.
