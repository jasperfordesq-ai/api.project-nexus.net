# Laravel Accessible Route Matrix

Last reviewed: 2026-07-06

## Purpose

This matrix tracks how `apps/web-uk` lines up with the Laravel Blade accessible
frontend. It is preparation evidence only. It does not certify route parity,
workflow parity, backend compatibility, or production readiness.

## Sources

Laravel source of truth:

- `C:\platforms\htdocs\staging\routes\govuk-alpha.php`
- `C:\platforms\htdocs\staging\routes\govuk-alpha-parity`
- `C:\platforms\htdocs\staging\accessible-frontend\views`

ASP.NET candidate:

- `C:\platforms\htdocs\asp.net-backend\apps\web-uk\src\server.js`
- `C:\platforms\htdocs\asp.net-backend\apps\web-uk\src\routes`
- `C:\platforms\htdocs\asp.net-backend\apps\web-uk\src\views`

## Current Static Count

Generated artifacts live in:

```text
docs/generated/accessible-route-matrix.md
docs/generated/accessible-route-matrix.csv
docs/generated/accessible-route-matrix.json
```

Refresh them with:

```bash
npm run route:matrix
```

| Surface | Static route declarations | Meaning |
| --- | ---: | --- |
| Laravel `govuk-alpha*` | 608 | Laravel Blade accessible source route declarations scanned from route files, including the tenant chooser/root route. |
| ASP.NET `apps/web-uk` | 417 | Express app/router/static-page declarations scanned from local source after shell prep; this includes preparation skeletons, generated Laravel GET fallback pages, and route modules that may not be certified workflows yet. |
| Exact method/path matches | 335 | Static matches only. This does not prove workflow, auth, tenant, API, localization, or visual parity. |
| Missing Laravel routes | 273 | Laravel accessible declarations without an exact local method/path equivalent. These are now primarily POST/state-changing workflows. |
| Extra `apps/web-uk` routes | 83 | Local-only routes, legacy routes, admin routes, helpers, or paths with shapes that do not yet match Laravel. |

These are declaration counts, not a parity score. Laravel registers the route
set in slug and custom-domain modes, and many route families include POST
workflow handlers that `apps/web-uk` does not have yet.

## Header And Footer Contract

| Blade link | Laravel path | `apps/web-uk` path | Current ASP.NET status |
| --- | --- | --- | --- |
| Brand | `/` or `/{tenantSlug}/alpha` | `/` | Implemented local equivalent. |
| My account | `/account` | `/account` | Partial Blade-style candidate: unsigned users redirect to `/login`; signed-in users see local wallet, messages, connections, notifications, profile, and settings cards plus CSRF sign-out. Notification group-read/delete-all, wallet donate, saved-item removal, saved-collection CRUD/item-remove, match-dismiss, appreciation send/react, and onboarding step POST aliases call Laravel-compatible endpoints. Laravel feature gating, full account-link coverage, backend data, tenant routing, realtime behavior, and runtime certification are not complete. |
| Home | `/` | `/` | Implemented local equivalent. |
| Dashboard | `/dashboard` | `/dashboard` | Implemented route; backend contract not certified. |
| Feed | `/feed` | `/feed` | Implemented route; backend contract not certified. |
| Listings | `/listings` | `/listings` | Implemented route; backend contract not certified. |
| Members | `/members` | `/members` | Implemented route; backend contract not certified. |
| Events | `/events` | `/events` | Implemented route; backend contract not certified. |
| Volunteering | `/volunteering`, `/volunteering/opportunities/{id}` | `/volunteering`, `/volunteering/opportunities/:id` | Partial Laravel-backed candidate: public landing/search GET renders Blade-style intro, organisation link, how-it-works inset, auth notice, filters, opportunity cards, and cursor load-more from `/api/v2/volunteering/opportunities`; detail GET renders `/api/v2/volunteering/opportunities/{id}` with public metadata, shifts, and safe apply link; applications, hours, owner tools, tenant/auth gates, apply POST, shift signup/cancel, and other POST workflows not certified. |
| Explore | `/explore` | `/explore` | Implemented skeleton. |
| Sign in | `/login` | `/login` | Implemented local equivalent. Forgot-password, reset-password, two-factor, and resend-verification Laravel aliases now route to local handlers. |
| Register | `/register` | `/register` | Implemented local equivalent. |
| Report a problem with this page | `/report-a-problem?return=...` | `/report-a-problem?return=...` | Partial Laravel-backed candidate. Signed-out visitors redirect to `/contact?problem_url=...`; signed-in visitors get a structured support report form that posts to Laravel `/api/v2/support/reports`. |
| Cookies | `/cookies`, `/cookie-consent` POST | `/cookies`, `/cookie-consent` POST | Partial Blade-style candidate: banner renders before the skip link until `nexus_alpha_cookie_consent` is present; settings page renders the analytics yes/no form; POST stores local `all` or `essential` values. Laravel `cookie_consents` audit persistence, tenant scoping, localization, and runtime certification are not complete. |

## Footer Column Contract

| Column | Blade links | `apps/web-uk` current status |
| --- | --- | --- |
| Platform | Listings, Members, Events, Volunteering, Blog | Listings/Members/Events implemented; Volunteering is a partial Laravel-backed landing/search candidate; Blog is a preparation skeleton. |
| Support | Help centre, Knowledge base, Trust and safety, Contact, About | Contact/About implemented; Help/Knowledge base/Trust and safety skeletons exist. |
| Legal | Legal, Terms of service, Privacy policy, Community guidelines, Acceptable use, Cookie policy, Accessibility statement | Local skeletons exist for the Laravel footer destinations; old `/terms` and `/privacy` still exist as legacy local routes. |

## Explore Contract

| Blade Explore card | Laravel route | `apps/web-uk` path | Current ASP.NET status |
| --- | --- | --- | --- |
| Exchanges | `/exchanges` | `/exchanges` | Preparation skeleton. |
| AI assistant | `/chat` | `/chat` | Preparation skeleton. |
| Polls | `/polls` | `/polls` | Preparation skeleton. |
| Search | `/search` | `/search` | Implemented route; backend contract not certified. |
| Groups | `/groups` | `/groups` | Implemented route; backend contract not certified. |
| Goals | `/goals` | `/goals` | Preparation skeleton. |
| Skills | `/skills` | `/skills` | Preparation skeleton. |
| Organisations | `/organisations`, `/organisations/browse`, `/organisations/register`, `/organisations/manage`, `/organisations/{id}`, `/organisations/{id}/jobs`, `/organisations/opportunities/{id}/apply` | `/organisations`, `/organisations/browse`, `/organisations/register`, `/organisations/manage`, `/organisations/:id`, `/organisations/:id/jobs`, `/organisations/opportunities/:id/apply` | Partial Laravel-backed candidate: directory/search and browse render `/api/v2/volunteering/organisations`; register and manage GET render Blade-style forms/pages; `/organisations` POST and `/organisations/register` POST validate required fields/terms, require signed auth, and submit to `/api/v2/volunteering/organisations`; manage calls `/api/v2/volunteering/my-organisations` when signed in; detail renders `/api/v2/volunteering/organisations/{id}?include=public_contract`, `/api/v2/volunteering/opportunities?organization_id={id}`, and `/api/v2/volunteering/reviews/organization/{id}`; jobs reads `/api/v2/jobs?organization_id={id}&status=open` when signed in; apply GET reads `/api/v2/volunteering/opportunities/{id}`; tenant/feature/runtime gates not certified. |
| Blog | `/blog` | `/blog` | Preparation skeleton. |
| Resources | `/resources` | `/resources` | Preparation skeleton. |
| Marketplace | `/marketplace` | `/marketplace` | Preparation skeleton. |
| Jobs | `/jobs` | `/jobs` | Preparation skeleton. |
| Courses | `/courses` | `/courses` | Preparation skeleton. |
| Podcasts | `/podcasts` | `/podcasts` | Preparation skeleton. |
| Coupons | `/coupons` | `/coupons` | Preparation skeleton. |
| Premium | `/premium` | `/premium` | Preparation skeleton. |
| Ideation | `/ideation` | `/ideation` | Preparation skeleton. |
| Federation | `/federation` | `/federation` | Preparation skeleton. |
| Clubs | `/clubs` | `/clubs` | Preparation skeleton. |

## Major Missing Route Families

These Laravel route families still need detailed page-by-page mapping and
runtime tests before `apps/web-uk` can be shared:

| Family | Missing route count | Examples | Current status |
| --- | ---: | --- | --- |
| Tenant routing | structural | shared-domain `/{tenantSlug}/alpha`, custom accessible domains | Not implemented in `apps/web-uk`. |
| Cookie/report POST workflows | 0 | none exact | Cookie choice POST is a partial local candidate. Contact POST and report-problem POST are Laravel-backed candidates using `/api/v2/contact` and `/api/v2/support/reports`, with status-key redirects and mocked contract tests. Cookie audit persistence, tenant scoping, production Turnstile, localization, notification side effects, and ASP.NET backend compatibility are not certified. |
| Legal document sourcing | 0 exact route gaps | `/legal/*` tenant documents | Skeleton GET pages only; document data sourcing and tenant-specific fallback behavior are not certified. |
| Onboarding | 0 | none exact | GET routes still have generated Laravel preparation pages. POST aliases now cover `/onboarding/{step}` and `/onboarding/avatar`: profile saves bio through the profile API, category choices are held in Express session state, safeguarding preserves Laravel Blade `safeguarding[id]` fields and submits to `/api/v2/onboarding/safeguarding`, and confirm submits to `/api/v2/onboarding/complete`. Avatar upload redirects with `avatar-failed` until multipart proxying exists. Blade visual parity, tenant-configured steps, upload persistence, localization, and runtime behavior are not certified. |
| Saved collections | 0 | none exact | POST aliases now cover create/update/delete and item removal through Laravel `/api/v2/me/collections` and `/api/v2/me/saved-items/{id}` with Laravel status redirects. GET collection pages remain generated preparation pages; pagination, public collections, tenant routing, Blade visual parity, and runtime behavior are not certified. |
| Matches | 0 | none exact | `/matches/{id}/dismiss` and `/matches/board/{listingId}/dismiss` now call Laravel `/api/v2/matches/{id}/dismiss` and preserve Laravel redirect status/source/fragment behavior. GET match pages, tenant module gates, visual parity, and runtime behavior are not certified. |
| Account hub depth | varies by family | matches, group exchanges, gamification, linked accounts, saved items, reviews, activity, jobs, appearance | Partial `/account` candidate only. Feature-gated account links, per-module data, route availability checks, tenant behavior, and ASP.NET backend compatibility are not certified. |
| Volunteering | 28 | applications, hours, organisations, expenses, wellbeing, safeguards, certificates, waitlists, swaps | Partial Laravel-backed candidate for `/volunteering` GET and `/volunteering/opportunities/{id}` GET only. Other GET routes now have generated Laravel preparation pages. Landing reads `/api/v2/volunteering/opportunities` with `search`, `category_id`, `is_remote`, `per_page`, and `cursor`; detail reads `/api/v2/volunteering/opportunities/{id}`. Applications, recommended shifts, hours, organisations owner tools, expenses, wellbeing, tenant-prefixed routes, auth redirects, feature gates, apply POST, shift signup/cancel, other POST workflows, localization, and runtime certification are not complete. |
| Organisations | 0 exact route gaps | none exact | Exact Laravel accessible organisation route declarations are now present locally. Directory/search and browse use `/api/v2/volunteering/organisations`; register GET renders the Blade-style form and validation status anchors; `/organisations` POST and `/organisations/register` POST validate required fields/terms, require signed auth, submit to `/api/v2/volunteering/organisations`, and use Laravel status redirects; manage GET reads `/api/v2/volunteering/my-organisations` when signed in; detail uses `/api/v2/volunteering/organisations/{id}?include=public_contract`, `/api/v2/volunteering/opportunities?organization_id={id}`, and `/api/v2/volunteering/reviews/organization/{id}`; organisation jobs reads `/api/v2/jobs?organization_id={id}&status=open` when signed in; apply GET reads `/api/v2/volunteering/opportunities/{id}`, all with mocked contract tests. Auth enforcement depth, volunteering/job feature gates, tenant-prefixed routes, runtime registration persistence, apply POST workflow, localization, and runtime certification are not complete. |
| Exchanges and group exchanges | 8 | requests, accept/decline, ready/confirm/cancel, group exchange participants | GET routes have preparation pages; POST workflows are not certified. |
| Feed typed engagement | 17 | likes, comments, reactions, share, save, hide, report | Partial route equivalents only; generated GET preparation pages cover missing read routes. |
| Marketplace/commerce | 25 | marketplace, seller, orders, coupons, courses, premium, podcasts | GET routes have preparation pages; seller/buyer POST workflows are not certified. |
| Federation | 11 | connections, messages, transfers, opt-in/out, settings | GET routes have preparation pages; federation POST workflows are not certified. |
| Jobs | 17 | alerts, applications, employer brand, onboarding, talent search, qualification, analytics | GET routes have preparation pages; job application/employer POST workflows are not certified. |
| Ideation | 22 | campaigns, challenges, drafts, outcomes, tags, idea voting | GET routes have preparation pages; challenge/idea POST workflows are not certified. |
| Resources/search/settings | 17 | resources comments/upload/delete, saved searches, linked accounts, appearance, data rights, insurance, availability | Partial or missing POST workflow coverage. Saved item and appreciation POST aliases are now present, but saved/appreciation GET pages remain generated preparation pages. |

## Next Certification Work

For each family, create a module matrix with:

- Laravel route name and method/path.
- Blade view file.
- ASP.NET Express route and Nunjucks view.
- Backend API calls used by that page.
- Request, response, redirect, validation, CSRF, auth, tenant, feature-gate, and
  localization behavior.
- Runtime smoke result against ASP.NET.

Use `docs/generated/accessible-route-matrix.csv` as the working backlog seed.
It includes the Laravel handler, inferred Blade view, auth classification,
feature/module gates, API/service hints, and current `apps/web-uk` target view
where a static method/path match exists.

Missing Laravel GET routes are also served by
`src/routes/laravel-prep-pages.js` after all real route modules. These pages are
deliberate preparation fallbacks; they prevent 404s and preserve route
discoverability, but they do not certify page workflow parity.
