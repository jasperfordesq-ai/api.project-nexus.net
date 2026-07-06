# Blade Component Port Audit

Last reviewed: 2026-07-06

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
| Cookie banner and settings | `partials/cookie-banner.blade.php`, `views/cookie-settings.blade.php`, `CookieSupportParity::storeCookieConsent()` | `partials/cookie-banner.njk`, `src/views/cookie-settings.njk`, `/cookie-consent` | Partial. The banner appears before the skip link until `nexus_alpha_cookie_consent` is set; `/cookies` renders the analytics yes/no settings form; POST stores local `all` or `essential` values. Laravel `cookie_consents` audit persistence, tenant scoping, localization, and runtime behavior are not certified. |
| Explore gateway | `views/explore.blade.php` | `src/views/explore.njk` | Started. Card order and live-content section structure now mirror Blade. |
| Account hub | `views/account.blade.php` | `src/views/account.njk` | Partial. Unsigned requests redirect to `/login`; signed-in users see the Blade-style card list for wallet, messages, connections, notifications, profile, settings, and a CSRF-protected sign-out form. Tenant feature gating, full account-link coverage, per-module data, route availability checks, and runtime behavior are not certified. |
| Volunteering landing | `views/volunteering.blade.php` | `src/views/volunteering.njk` | Partial. Caption, lead, organisation browse link, how-it-works inset, auth-required notice, filters, opportunity cards, empty/error states, and cursor load-more link are present. Data loads from Laravel `/api/v2/volunteering/opportunities`; applications, recommended shifts, hours, organisation owner tools, feature gates, tenant routing, and POST workflows are not certified. |
| Volunteering opportunity detail | `views/volunteer-opportunity.blade.php` | `src/views/volunteer-opportunity.njk` | Partial. Back link, caption, title, remote tag, description, organisation panel, summary fields, available shifts, auth-required notice, and safe apply link are present. Data loads from Laravel `/api/v2/volunteering/opportunities/{id}`; apply POST, shift signup/cancel, auth redirects, feature gates, tenant routing, and runtime behavior are not certified. |
| Organisations directory | `views/organisations.blade.php` | `src/views/organisations.njk` | Partial. Directory heading, subnavigation, search, empty state, registration copy, terms, and form are present. Directory data loads from Laravel `/api/v2/volunteering/organisations`; API-unavailable warning state is present. |
| Organisations browse | `views/organisations-browse.blade.php` | `src/views/organisations-browse.njk` | Partial. Caption, heading, search, empty state, organisation cards, public stats, website marker, and cursor load-more link are present. Data loads from Laravel `/api/v2/volunteering/organisations`; auth/feature-gate/tenant behavior is not certified. |
| Organisations register | `views/organisations-register.blade.php` | `src/views/organisations-register.njk` | Partial. Back link, caption, standalone form, field hints, validation status anchors, terms, cancel link, and pending notice are present. POST persistence, auth redirect, feature gate, tenant routing, and runtime behavior are not certified. |
| Organisations manage | `views/organisations-manage.blade.php` | `src/views/organisations-manage.njk` | Partial. Back link, caption, empty state, owner/admin cards, pending cards, dashboard links, and register CTA are present. Data loads from Laravel `/api/v2/volunteering/my-organisations` only when signed in; auth redirect, feature gate, tenant routing, and runtime behavior are not certified. |
| Organisation detail | `views/organisation-detail.blade.php` | `src/views/organisation-detail.njk` | Partial. Back link, caption, profile copy, contact summary, jobs link, basic public stats, active opportunity cards, apply links, review cards, rating progress, and empty depth fallbacks are present. Detail data loads from Laravel `/api/v2/volunteering/organisations/{id}?include=public_contract`, `/api/v2/volunteering/opportunities?organization_id={id}`, and `/api/v2/volunteering/reviews/organization/{id}`. |
| Organisation jobs | `views/organisations-jobs.blade.php` | `src/views/organisations-jobs.njk` | Partial. Back link, caption, heading, empty state, job cards, type tags, remote/location, deadline, and view-role links are present. Data loads from Laravel `/api/v2/jobs?organization_id={id}&status=open` only when signed in; auth redirect, feature gate, tenant routing, and runtime behavior are not certified. |
| Organisation opportunity apply | `views/organisations-apply.blade.php` | `src/views/organisations-apply.njk` | Partial. Back link, caption, summary list, already-applied state, auth-required notice, message field, notice, submit button, and cancel link are present. Data loads from Laravel `/api/v2/volunteering/opportunities/{id}`; apply POST, auth redirect, feature gate, tenant routing, and runtime behavior are not certified. |

## Still To Port

| Blade pattern | Why it matters | Suggested ASP.NET implementation |
| --- | --- | --- |
| Tenant logo and shape sizing | Blade supports tenant-uploaded dark logos with aspect-ratio-aware sizing. | Add tenant logo locals after ASP.NET tenant bootstrap exposes compatible logo URLs and validated header colours. |
| Per-tenant header colours | Blade safely validates `#rrggbb` values and picks readable foreground colours. | Add validated colour locals only after tenant setting parity exists. |
| Cookie consent depth | Blade records choices through `CookieConsentService` and tenant-scoped consent audit storage. | Certify tenant scoping, backend audit persistence, localization, route-name generation, and runtime behavior before shared use. |
| No-JS locale preservation | Blade preserves non-locale query params in the language selector. | Add hidden query-param locals and tests once routing helpers are stable. |
| Account hub depth | Blade also conditionally includes matches, group exchanges, gamification, linked accounts, appearance, saved items, reviews, activity, jobs, and other feature-gated links. | Add missing account cards only after each target route and Laravel-compatible backend contract is certified. |
| Module and feature gating | Blade only shows modules enabled for the tenant. | Add a feature/module flag local from ASP.NET tenant bootstrap, matching Laravel semantics. |
| Live Explore content | Blade shows recent listings and upcoming events. | Add data loaders after Laravel-compatible listing/event response shapes are proven. |
| Volunteering workflows | Blade protects the page with auth, volunteering feature checks, applications, recommendations, hours, owner tools, opportunity details, shifts, and POST workflows. | The public `/volunteering` landing/search GET and `/volunteering/opportunities/{id}` detail GET now read Laravel-compatible opportunities data. Applications, recommended shifts, hours, owner tools, apply POST, shift signup/cancel, tenant routing, auth redirects, and feature gates still need certification. |
| Organisations workflows | Blade protects the page with auth, volunteering, and job-vacancy feature checks, lists real organisations, shows detail depth data, posts registrations through `VolunteerService`, reads organisation jobs through `JobVacancyService`, and posts opportunity applications to the existing volunteering apply route. | Directory, browse, manage, detail, organisation jobs, and organisation opportunity apply GET data now read Laravel-compatible APIs. Register GET is visually ported. Tenant routing, auth redirects, feature gates, apply POST workflow, registration validation/persistence, and success/error redirects still need certification. |
| Page-specific subnavs | Commerce, federation, gamification, jobs, messages, and ideation have Blade partial navs. | Port each partial into Nunjucks during module-by-module route parity work. |
| Error and validation summaries | Blade uses consistent GOV.UK error summary behavior. | Audit every form after route/workflow parity is mapped. |

## Do Not Port

- GOV.UK crown, logotype, official header identity, OGL block, or Crown
  copyright wording.
- Laravel/PHP implementation details.
- Production traffic routing before certification.
- ASP.NET-specific visual inventions that diverge from the Blade source.
