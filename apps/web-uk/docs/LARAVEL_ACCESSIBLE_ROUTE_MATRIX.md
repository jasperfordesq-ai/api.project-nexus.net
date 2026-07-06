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

| Surface | Static route declarations | Meaning |
| --- | ---: | --- |
| Laravel `govuk-alpha*` | 608 | Laravel Blade accessible source route declarations scanned from route files. |
| ASP.NET `apps/web-uk` | 163 | Express app/router declarations scanned from local source after shell prep; this includes route modules that may not be mounted as certified workflows yet. |

These are declaration counts, not a parity score. Laravel registers the route
set in slug and custom-domain modes, and many route families include POST
workflow handlers that `apps/web-uk` does not have yet.

## Header And Footer Contract

| Blade link | Laravel path | `apps/web-uk` path | Current ASP.NET status |
| --- | --- | --- | --- |
| Brand | `/` or `/{tenantSlug}/alpha` | `/` | Implemented local equivalent. |
| My account | `/account` | `/account` | Preparation skeleton. |
| Home | `/` | `/` | Implemented local equivalent. |
| Dashboard | `/dashboard` | `/dashboard` | Implemented route; backend contract not certified. |
| Feed | `/feed` | `/feed` | Implemented route; backend contract not certified. |
| Listings | `/listings` | `/listings` | Implemented route; backend contract not certified. |
| Members | `/members` | `/members` | Implemented route; backend contract not certified. |
| Events | `/events` | `/events` | Implemented route; backend contract not certified. |
| Volunteering | `/volunteering` | `/volunteering` | Preparation skeleton. |
| Explore | `/explore` | `/explore` | Implemented skeleton. |
| Sign in | `/login` | `/login` | Implemented local equivalent. |
| Register | `/register` | `/register` | Implemented local equivalent. |
| Report a problem with this page | `/report-a-problem?return=...` | `/report-a-problem?return=...` | Preparation skeleton. |
| Cookies | `/cookies` | `/cookies` | Preparation skeleton. |

## Footer Column Contract

| Column | Blade links | `apps/web-uk` current status |
| --- | --- | --- |
| Platform | Listings, Members, Events, Volunteering, Blog | Listings/Members/Events implemented; Volunteering and Blog are preparation skeletons. |
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
| Organisations | `/organisations`, `/organisations/browse`, `/organisations/register`, `/organisations/manage`, `/organisations/{id}` | `/organisations`, `/organisations/browse`, `/organisations/register`, `/organisations/manage`, `/organisations/:id` | Partial Laravel-backed candidate: directory/search and browse render `/api/v2/volunteering/organisations`; register and manage GET render Blade-style forms/pages; manage calls `/api/v2/volunteering/my-organisations` when signed in; detail renders `/api/v2/volunteering/organisations/{id}?include=public_contract`; auth/tenant gates not certified. |
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

| Family | Examples | Current status |
| --- | --- | --- |
| Tenant routing | shared-domain `/{tenantSlug}/alpha`, custom accessible domains | Not implemented in `apps/web-uk`. |
| Cookie/report POST workflows | `/cookie-consent`, `/report-a-problem` POST | Skeleton GET pages only. |
| Legal document sourcing | `/legal/*` tenant documents | Skeleton GET pages only. |
| Onboarding | `/onboarding`, `/onboarding/{step}` | Missing. |
| Volunteering | opportunities, hours, organisations, expenses, wellbeing | Skeleton landing only. |
| Organisations | `/organisations`, `/organisations/browse`, `/organisations/register`, `/organisations/manage`, `/organisations/{id}`, `/organisations/{id}/jobs`, `/organisations/opportunities/{id}/apply` | Partial Laravel-backed candidate for `/organisations`, `/organisations/browse`, `/organisations/register` GET, `/organisations/manage` GET, and `/organisations/{id}` GET only. Directory/search and browse use `/api/v2/volunteering/organisations`; register GET renders the Blade-style form and validation status anchors without POST persistence; manage GET reads `/api/v2/volunteering/my-organisations` when signed in; detail uses `/api/v2/volunteering/organisations/{id}?include=public_contract`, all with mocked contract tests. Auth enforcement, volunteering feature gate, tenant-prefixed routes, registration persistence, jobs/apply workflows, depth opportunities/reviews, localization, and runtime certification are not complete. |
| Exchanges | requests, accept/decline, ready/confirm/cancel | Skeleton landing only. |
| Feed typed engagement | likes, comments, reactions, share, save, hide, report | Partial route equivalents only. |
| Marketplace/commerce | marketplace, seller, orders, coupons, courses, podcasts | Mostly skeleton links only. |
| Federation | members, listings, events, groups, messages, transfers | Skeleton landing only. |
| Resources/search/saved/settings | full parity route families | Partial or missing. |

## Next Certification Work

For each family, create a module matrix with:

- Laravel route name and method/path.
- Blade view file.
- ASP.NET Express route and Nunjucks view.
- Backend API calls used by that page.
- Request, response, redirect, validation, CSRF, auth, tenant, feature-gate, and
  localization behavior.
- Runtime smoke result against ASP.NET.
