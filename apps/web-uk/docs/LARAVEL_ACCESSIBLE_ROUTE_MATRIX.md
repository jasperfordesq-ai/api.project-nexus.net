# Laravel Accessible Route Matrix

Last reviewed: 2026-07-05

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
| ASP.NET `apps/web-uk` | 160 | Express app/router declarations scanned from local source after shell prep; this includes route modules that may not be mounted as certified workflows yet. |

These are declaration counts, not a parity score. Laravel registers the route
set in slug and custom-domain modes, and many route families include POST
workflow handlers that `apps/web-uk` does not have yet.

## Header And Footer Contract

| Blade link | Laravel path | `apps/web-uk` path | Current ASP.NET status |
| --- | --- | --- | --- |
| Brand | `/` or `/{tenantSlug}/alpha` | `/` | Implemented local equivalent. |
| My account | `/account` | `/account` | Implemented Blade-style candidate hub; feature/module gates, auth enforcement, live counts, and backend workflows are not certified. |
| Home | `/` | `/` | Implemented local equivalent. |
| Dashboard | `/dashboard` | `/dashboard` | Implemented route; backend contract not certified. |
| Feed | `/feed` | `/feed` | Implemented route; backend contract not certified. |
| Listings | `/listings` | `/listings` | Implemented route; backend contract not certified. |
| Members | `/members` | `/members` | Implemented route; backend contract not certified. |
| Events | `/events` | `/events` | Implemented route; backend contract not certified. |
| Volunteering | `/volunteering` | `/volunteering` | Local Blade-style index candidate; live opportunities, applications, hours, organisations, shifts, and backend workflows are not certified. |
| Explore | `/explore` | `/explore` | Implemented skeleton. |
| Sign in | `/login` | `/login` | Implemented local equivalent. |
| Register | `/register` | `/register` | Implemented local equivalent. |
| Report a problem with this page | `/report-a-problem?return=...` | `/report-a-problem?return=...` | Implemented candidate workflow; backend persistence not certified. |
| Cookies | `/cookies` | `/cookies` | Implemented candidate page; backend/session persistence not certified. |

## Footer Column Contract

| Column | Blade links | `apps/web-uk` current status |
| --- | --- | --- |
| Platform | Listings, Members, Events, Volunteering, Blog | Listings/Members/Events implemented; Volunteering has a local Blade-style index/search/empty-state candidate; Blog has a local Blade-style search/empty-state index candidate. |
| Support | Help centre, Knowledge base, Trust and safety, Contact, FAQ, About | Contact/About implemented; Help centre and Knowledge base have local Blade-style search/empty-state candidates; FAQ has a local Blade-style accordion candidate; Trust and safety has a local Blade-style guidance candidate; Contact has a local Blade-style form candidate but Laravel Turnstile/backend delivery is not certified. |
| Legal | Legal, Terms of service, Privacy policy, Community guidelines, Acceptable use, Cookie policy, Accessibility statement | Legal hub and legal document routes have local Blade-style fallback candidates; tenant-managed document data, version metadata, sanitized rich content, localization persistence, and backend runtime behaviour are not certified. Old `/terms` and `/privacy` still exist as legacy local routes. |

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
| Organisations | `/organisations` | `/organisations` | Preparation skeleton. |
| Blog | `/blog` | `/blog` | Local Blade-style index candidate; live posts, categories, feature gate, feed, post detail, comments/likes, and backend runtime are not certified. |
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
| Tenant routing | shared-domain `/{tenantSlug}/alpha`, custom accessible domains | Local shared-domain alias started for `/{tenantSlug}/alpha/...` so prepared pages can render through the same Express handlers with prefixed shell links, no-JS form actions, and local redirects for contact/report/cookie workflows. Laravel tenant lookup, custom-domain resolution, feature gates, and backend workflow certification are not complete. |
| Cookie/report POST workflows | `/cookie-consent`, `/report-a-problem` POST | Both have local no-JS candidate workflows. Laravel cookie/session persistence and `support_reports` persistence are not certified. |
| Account hub | `/account` | Local Blade-style candidate card hub with tenant-prefixed links. Laravel feature/module gates, auth enforcement, unread counts, and destination workflow parity are not certified. |
| Timebanking guide | `/guide` | Local Blade-style guide candidate with equality section, ordered three-step list, and tenant-prefixed register/listings/wallet CTAs. Laravel feature/module gates, auth/session behavior, localization persistence, and runtime route certification are not complete. |
| Feature summary | `/features` | Local Blade-style feature summary candidate with spaced bullet list and tenant-prefixed guide CTA. Laravel feature/module gates, localization persistence, and runtime route certification are not complete. |
| Help centre | `/help` | Local Blade-style search/empty-state candidate with tenant-prefixed contact CTA. Live FAQ group loading, search filtering, localization persistence, and runtime route certification are not complete. |
| Knowledge base | `/kb`, `/kb/{id}` | Local Blade-style index search/empty-state candidate for `/kb` only. Live article data, pagination, `/kb/{id}` article detail, localization persistence, and runtime route certification are not complete. |
| Blog | `/blog`, `/blog/feed.xml`, `/blog/{slug}`, comments/likes | Local Blade-style index search/empty-state candidate for `/blog` only. Blog feature gate, live posts/categories, cursor pagination, RSS feed, post detail, comments/likes, localization, and runtime certification are not complete. |
| FAQ | `/faq` | Local Blade-style accordion candidate with Laravel English strings. Laravel localization persistence and runtime route certification are not complete. |
| Accessibility statement | `/accessibility` | Local Blade-style statement candidate with WCAG summary list and tenant-prefixed legal/contact links. Laravel localization persistence and runtime route certification are not complete. |
| Trust and safety | `/trust-and-safety` | Local Blade-style safety guidance candidate with warning text, guidance sections, tenant-prefixed contact CTA, and community guidelines link. Laravel localization persistence, safeguarding workflow handling, and runtime route certification are not complete. |
| Legal document sourcing | `/legal`, `/legal/*` tenant documents | Local Blade-style legal hub and fallback document candidates. Tenant-managed document loading, version metadata, sanitized rich content, localization persistence, and runtime route certification are not complete. |
| Onboarding | `/onboarding`, `/onboarding/{step}` | Missing. |
| Volunteering | opportunities, hours, organisations, expenses, wellbeing | Local Blade-style index/search/empty-state candidate for `/volunteering` only. Live opportunities, categories, applications, recommended shifts, community projects, hours logging, organisation management, accessibility needs, certificates, waitlist, swaps, group sign-ups, expenses, donations, POST workflows, feature gates, localization, and runtime certification are not complete. |
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
