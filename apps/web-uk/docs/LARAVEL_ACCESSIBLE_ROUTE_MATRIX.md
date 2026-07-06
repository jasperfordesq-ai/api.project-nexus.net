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
| ASP.NET `apps/web-uk` | 580 | Express app/router/static-page declarations scanned from local source after shell prep; this includes preparation skeletons, generated Laravel GET fallback pages, and route modules that may not be certified workflows yet. |
| Exact method/path matches | 498 | Static matches only. This does not prove workflow, auth, tenant, API, localization, or visual parity. |
| Missing Laravel routes | 110 | Laravel accessible declarations without an exact local method/path equivalent. These are now primarily POST/state-changing workflows. |
| Extra `apps/web-uk` routes | 83 | Local-only routes, legacy routes, admin routes, helpers, or paths with shapes that do not yet match Laravel. |

These are declaration counts, not a parity score. Laravel registers the route
set in slug and custom-domain modes, and many route families include POST
workflow handlers that `apps/web-uk` does not have yet.

## Header And Footer Contract

| Blade link | Laravel path | `apps/web-uk` path | Current ASP.NET status |
| --- | --- | --- | --- |
| Brand | `/` or `/{tenantSlug}/alpha` | `/` | Implemented local equivalent. |
| My account | `/account` | `/account` | Partial Blade-style candidate: unsigned users redirect to `/login`; signed-in users see local wallet, messages, connections, notifications, profile, and settings cards plus CSRF sign-out. Notification group-read/delete-all, wallet donate, saved-item removal, saved-collection CRUD/item-remove, match-dismiss, appreciation send/react, onboarding step, and settings POST aliases call Laravel-compatible endpoints. Laravel feature gating, full account-link coverage, backend data, tenant routing, realtime behavior, and runtime certification are not complete. |
| Home | `/` | `/` | Implemented local equivalent. |
| Dashboard | `/dashboard` | `/dashboard` | Implemented route; backend contract not certified. |
| Feed | `/feed` | `/feed` | Implemented local route with Laravel-compatible POST aliases for post create/update/delete, typed engagement, poll votes, moderation/report/share/save, comment mutation/reactions, and mute; Blade feed rendering, filters, hashtag/detail pages, feature gates, tenant behavior, and runtime behavior are not certified. |
| Listings | `/listings` | `/listings` | Implemented local/protected route with Laravel-compatible POST aliases for save/unsave, renew, report, like, comments/replies, exchange requests, and AI description generation; Blade rendering, generated value repopulation, tenant gates, localization, and runtime behavior are not certified. |
| Members | `/members` | `/members` | Implemented local route with profile-action POST aliases for connection, endorsement, block/unblock, review, and transfer wired to Laravel v2 endpoints; Blade profile rendering, member directory parity, tenant guards, feature gates, and runtime behavior are not certified. |
| Events | `/events` | `/events` | Implemented local/protected route with Laravel-compatible POST aliases for waitlists, check-in, polls, recurring updates, and translation requests; Blade rendering, side effects, tenant gates, localization, and runtime behavior are not certified. |
| Volunteering | `/volunteering`, `/volunteering/opportunities/{id}` | `/volunteering`, `/volunteering/opportunities/:id` | Partial Laravel-backed candidate: public landing/search GET renders Blade-style intro, organisation link, how-it-works inset, auth notice, filters, opportunity cards, and cursor load-more from `/api/v2/volunteering/opportunities`; detail GET renders `/api/v2/volunteering/opportunities/{id}` with public metadata, shifts, and safe apply link; POST aliases now cover member applications, hours, shifts, accessibility, certificates, waitlists, swaps, credentials, wellbeing, donations, group reservations, expenses, safeguarding, opportunity create, and organisation owner actions through Laravel v2 volunteering APIs. GET depth rendering, multipart credential uploads, tenant/auth gates, feature gates, localization, and runtime behavior are not certified. |
| Explore | `/explore` | `/explore` | Implemented skeleton. |
| Sign in | `/login` | `/login` | Implemented local equivalent. Forgot-password, reset-password, two-factor, and resend-verification Laravel aliases now route to local handlers. |
| Register | `/register` | `/register` | Implemented local equivalent. |
| Report a problem with this page | `/report-a-problem?return=...` | `/report-a-problem?return=...` | Partial Laravel-backed candidate. Signed-out visitors redirect to `/contact?problem_url=...`; signed-in visitors get a structured support report form that posts to Laravel `/api/v2/support/reports`. |
| Cookies | `/cookies`, `/cookie-consent` POST | `/cookies`, `/cookie-consent` POST | Partial Blade-style candidate: banner renders before the skip link until `nexus_alpha_cookie_consent` is present; settings page renders the analytics yes/no form; POST stores local `all` or `essential` values. Laravel `cookie_consents` audit persistence, tenant scoping, localization, and runtime certification are not complete. |

## Footer Column Contract

| Column | Blade links | `apps/web-uk` current status |
| --- | --- | --- |
| Platform | Listings, Members, Events, Volunteering, Blog | Listings/Members/Events implemented; Volunteering is a partial Laravel-backed landing/search/detail candidate with Laravel-backed POST aliases; Blog GET pages are preparation pages with Laravel-backed POST aliases. |
| Support | Help centre, Knowledge base, Trust and safety, Contact, About | Contact/About implemented; Help/Knowledge base/Trust and safety skeletons exist. |
| Legal | Legal, Terms of service, Privacy policy, Community guidelines, Acceptable use, Cookie policy, Accessibility statement | Local skeletons exist for the Laravel footer destinations; old `/terms` and `/privacy` still exist as legacy local routes. |

## Explore Contract

| Blade Explore card | Laravel route | `apps/web-uk` path | Current ASP.NET status |
| --- | --- | --- | --- |
| Exchanges | `/exchanges` | `/exchanges` | Preparation skeleton. |
| AI assistant | `/chat` | `/chat` | GET remains a preparation skeleton; POST `/chat` now sends the no-JS form message to Laravel `/api/ai/chat` and redirects with Laravel `empty`, `sent`, or `auth-required` status keys. Thread rendering, AI feature gates, provider behavior, localization, and runtime smoke tests are not certified. |
| Polls | `/polls` | `/polls` | GET remains a preparation skeleton; POST aliases now cover poll creation, parity ranked creation, vote, ranked vote, delete, like, and comment through Laravel v2 poll/comment/feed-like APIs. Poll listing/detail rendering, ranked result display, ownership/visibility gates, tenant routing, and runtime behavior are not certified. |
| Search | `/search` | `/search` | Implemented local route with saved-search POST aliases for `/search/saved`, `/search/saved/{id}/delete`, and `/search/saved/{id}/run` wired to Laravel `/api/v2/search/saved`; result rendering, advanced-search Blade parity, feature gates, and runtime behavior are not certified. |
| Groups | `/groups` | `/groups` | Implemented route; backend contract not certified. |
| Goals | `/goals` | `/goals` | Preparation skeleton. |
| Skills | `/skills` | `/skills` | Preparation skeleton. |
| Organisations | `/organisations`, `/organisations/browse`, `/organisations/register`, `/organisations/manage`, `/organisations/{id}`, `/organisations/{id}/jobs`, `/organisations/opportunities/{id}/apply` | `/organisations`, `/organisations/browse`, `/organisations/register`, `/organisations/manage`, `/organisations/:id`, `/organisations/:id/jobs`, `/organisations/opportunities/:id/apply` | Partial Laravel-backed candidate: directory/search and browse render `/api/v2/volunteering/organisations`; register and manage GET render Blade-style forms/pages; `/organisations` POST and `/organisations/register` POST validate required fields/terms, require signed auth, and submit to `/api/v2/volunteering/organisations`; manage calls `/api/v2/volunteering/my-organisations` when signed in; detail renders `/api/v2/volunteering/organisations/{id}?include=public_contract`, `/api/v2/volunteering/opportunities?organization_id={id}`, and `/api/v2/volunteering/reviews/organization/{id}`; jobs reads `/api/v2/jobs?organization_id={id}&status=open` when signed in; apply GET reads `/api/v2/volunteering/opportunities/{id}`; tenant/feature/runtime gates not certified. |
| Blog | `/blog` | `/blog` | GET remains a preparation skeleton; POST aliases now cover post comments, comment-thread replies, post likes/reactions, and comment update/delete/reactions through Laravel v2 blog/comment/reaction APIs. Blog listing/detail rendering, rich comment thread display, likers page behavior, feature gates, and runtime behavior are not certified. |
| Resources | `/resources` | `/resources` | GET remains a preparation skeleton; POST aliases now cover upload safe-failure, reorder, delete, reactions, comment add, and comment delete with Laravel-compatible status redirects. Multipart upload, library rendering, admin state, and runtime behavior are not certified. |
| Marketplace | `/marketplace` | `/marketplace` | GET pages remain preparation pages; POST aliases now cover listing create/update/delete/renew, save/unsave, buy, offer, report, offer decisions, order actions, seller onboarding, pickup slots, and seller coupons through Laravel v2 marketplace APIs. Blade rendering, seller dashboards, hosted no-JS checkout redirects, media uploads, tenant/feature gates, and runtime behavior are not certified. |
| Jobs | `/jobs` | `/jobs` | Preparation skeleton. |
| Courses | `/courses` | `/courses` | Preparation skeleton. |
| Podcasts | `/podcasts` | `/podcasts` | Preparation skeleton. |
| Coupons | `/coupons` | `/coupons` | Preparation skeleton. |
| Premium | `/premium` | `/premium` | GET remains a preparation skeleton; POST `/premium/subscribe`, `/premium/portal`, and `/premium/cancel` now call Laravel `/api/v2/member-premium/*` endpoints and preserve Laravel success/failure redirects. Tier display, subscription state, Stripe runtime behavior, feature gates, and tenant-prefixed return URLs are not certified. |
| Ideation | `/ideation` | `/ideation` | GET routes remain preparation pages; POST aliases now call Laravel v2 ideation APIs for challenge, idea, outcome, vote, media, conversion, and campaign actions. |
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
| Listings | 0 | none exact | POST aliases now cover `/listings/{id}/save`, `/listings/{id}/unsave`, `/listings/{id}/renew`, `/listings/{id}/report`, `/listings/{id}/like`, `/listings/{id}/comments`, `/listings/{id}/exchange-request`, and `/listings/generate-description` through Laravel v2 listing, comment, feed-like, and exchange APIs. GET listing/detail/comment/report/exchange-request pages remain local or preparation pages; generated description value repopulation, image and skill-tag form parity, owner/requester authorization depth, tenant gates, localization, runtime behavior, and ASP.NET backend compatibility are not certified. |
| Onboarding | 0 | none exact | GET routes still have generated Laravel preparation pages. POST aliases now cover `/onboarding/{step}` and `/onboarding/avatar`: profile saves bio through the profile API, category choices are held in Express session state, safeguarding preserves Laravel Blade `safeguarding[id]` fields and submits to `/api/v2/onboarding/safeguarding`, and confirm submits to `/api/v2/onboarding/complete`. Avatar upload redirects with `avatar-failed` until multipart proxying exists. Blade visual parity, tenant-configured steps, upload persistence, localization, and runtime behavior are not certified. |
| Saved collections | 0 | none exact | POST aliases now cover create/update/delete and item removal through Laravel `/api/v2/me/collections` and `/api/v2/me/saved-items/{id}` with Laravel status redirects. GET collection pages remain generated preparation pages; pagination, public collections, tenant routing, Blade visual parity, and runtime behavior are not certified. |
| Matches | 0 | none exact | `/matches/{id}/dismiss` and `/matches/board/{listingId}/dismiss` now call Laravel `/api/v2/matches/{id}/dismiss` and preserve Laravel redirect status/source/fragment behavior. GET match pages, tenant module gates, visual parity, and runtime behavior are not certified. |
| Exchanges | 0 | none exact | `/exchanges/{id}` action POST and `/exchanges/{id}/rate` now call Laravel `/api/v2/exchanges/{id}` action endpoints and `/api/v2/exchanges/{id}/rate`. GET exchange detail, participant authorization, tenant module gates, history display, rating display, and runtime behavior are not certified. |
| AI chat | 0 | none exact | POST `/chat` now calls Laravel `/api/ai/chat`, trims messages to the Laravel 4,000-character limit, preserves valid conversation IDs, and redirects to `/chat?c={id}&status=sent` or `/chat?status=empty`. GET chat remains a generated preparation page; conversation list/thread rendering, AI feature gates, fallback reply display, tool cards, localization, and runtime behavior are not certified. |
| Blog | 0 | none exact | POST aliases now cover `/blog/{slug}/comments`, `/blog/{slug}/comments/add`, `/blog/{slug}/like`, `/blog/{slug}/react`, and `/blog/comments/{id}/update|delete|react` through Laravel `/api/v2/blog/{slug}`, `/api/v2/comments`, and `/api/v2/reactions`. GET blog pages remain preparation pages; Blade listing/detail rendering, rich comment-thread display, likers page behavior, feature gates, tenant routing, localization, and runtime behavior are not certified. |
| Polls | 0 | none exact | POST aliases now cover `/polls`, `/polls/parity/create`, `/polls/{id}/vote`, `/polls/{id}/rank`, `/polls/{id}/delete`, `/polls/{id}/like`, and `/polls/{id}/comment` through Laravel `/api/v2/polls`, `/api/v2/comments`, and `/api/v2/feed/like`. GET poll pages remain preparation pages; Blade listing/detail/ranked-vote rendering, poll ownership actions, visibility checks, tenant routing, localization, and runtime behavior are not certified. |
| Premium | 0 | none exact | POST aliases now cover subscribe, billing portal, and cancel through Laravel `/api/v2/member-premium/checkout`, `/api/v2/member-premium/billing-portal`, and `/api/v2/member-premium/cancel`. GET pricing/manage pages remain preparation pages; Stripe checkout/portal runtime, tenant return URLs, subscription state display, feature gates, localization, and ASP.NET backend compatibility are not certified. |
| Reviews | 0 | none exact | POST aliases now cover `/reviews`, `/reviews/{id}/comments`, and `/reviews/{id}/react` through Laravel `/api/v2/reviews`, `/api/v2/comments`, and `/api/v2/reactions` with Laravel status redirects. GET review pages remain existing local/preparation pages; moderation display, threaded comments rendering, reaction summaries, feature gates, tenant behavior, localization, and runtime behavior are not certified. |
| Search | 0 | none exact | Saved-search POST aliases now cover `/search/saved`, `/search/saved/{id}/delete`, and `/search/saved/{id}/run` through Laravel `/api/v2/search/saved`; save/run query parameters are normalized to Laravel's allow-list and redirect back to `/search/advanced`. GET delete confirmation and search pages remain preparation/local pages; Blade advanced-search rendering, feature gates, tenant behavior, localization, and runtime behavior are not certified. |
| Achievements | 0 | none exact | POST aliases now cover daily reward, challenge claim, shop purchase, and showcase update through Laravel `/api/v2/gamification/*` endpoints with Laravel status redirects. GET achievements/gamification pages remain generated preparation pages or local legacy progress pages; Blade visual parity, earned badge ownership display, feature gates, tenant behavior, localization, and runtime behavior are not certified. |
| Members | 0 | none exact | POST aliases now cover member connection transitions, skill endorsement add/remove, block/unblock, profile review, and profile transfer through Laravel v2 APIs with Laravel status redirects. Existing GET pages remain local/preparation pages; Blade profile visual parity, live connection-state rendering, tenant guards, feature gates, self-action checks, localization, and runtime behavior are not certified. |
| Resources | 0 | none exact | POST aliases now cover resource upload (safe `resource-upload-failed` redirect until multipart proxying exists), admin reorder, delete, reactions, comment add, and comment delete. Delete/reorder/comments/reactions use Laravel v2 resource/comment/reaction APIs; GET library/comments/upload/delete pages remain generated preparation pages, and multipart upload persistence, rich library rendering, admin permissions, tenant gates, localization, and runtime behavior are not certified. |
| Account hub depth | varies by family | matches, group exchanges, gamification, linked accounts, saved items, reviews, activity, jobs, appearance | Partial `/account` candidate only. Feature-gated account links, per-module data, route availability checks, tenant behavior, and ASP.NET backend compatibility are not certified. |
| Volunteering | 0 | none exact | POST aliases now cover `/volunteering/opportunities/{id}/apply`, shift signup/cancel, application withdrawal, hours, accessibility, certificate generation, waitlist leave, swaps, emergency alert responses, credential delete plus safe upload failure, wellbeing check-ins, donations, group reservation member/cancel actions, expenses, training, incidents, opportunity create, and organisation owner application/hour/settings/wallet actions through Laravel v2 volunteering APIs. GET depth pages still rely on generated preparation pages, multipart credential upload proxying is not implemented, and Blade visual depth, recommended shifts, tenant-prefixed routes, auth/feature gates, localization, runtime behavior, and ASP.NET backend compatibility are not certified. |
| Organisations | 0 exact route gaps | none exact | Exact Laravel accessible organisation route declarations are now present locally. Directory/search and browse use `/api/v2/volunteering/organisations`; register GET renders the Blade-style form and validation status anchors; `/organisations` POST and `/organisations/register` POST validate required fields/terms, require signed auth, submit to `/api/v2/volunteering/organisations`, and use Laravel status redirects; manage GET reads `/api/v2/volunteering/my-organisations` when signed in; detail uses `/api/v2/volunteering/organisations/{id}?include=public_contract`, `/api/v2/volunteering/opportunities?organization_id={id}`, and `/api/v2/volunteering/reviews/organization/{id}`; organisation jobs reads `/api/v2/jobs?organization_id={id}&status=open` when signed in; apply GET reads `/api/v2/volunteering/opportunities/{id}`, all with mocked contract tests. Auth enforcement depth, volunteering/job feature gates, tenant-prefixed routes, runtime registration persistence, apply confirmation depth, localization, and runtime certification are not complete. |
| Group exchanges | 0 | none exact | POST aliases now cover `/group-exchanges/new`, participant add/remove, confirm, complete, and cancel through Laravel `/api/v2/group-exchanges` endpoints while preserving Laravel status redirects and `#group-exchange-top` fragments. GET list/detail/create pages still rely on generated preparation pages, and Blade detail rendering, organiser/participant authorization depth, same-tenant member search, time-credit settlement behavior, feature gates, localization, runtime behavior, and ASP.NET backend compatibility are not certified. |
| Feed typed engagement | 0 | none exact | POST aliases now cover `/feed/posts`, `/feed/polls/{id}/vote`, `/feed/items/{type}/{id}/like|comments|not-interested|react`, `/feed/posts/{id}/update|delete|hide|report|react|share|save`, `/feed/comments/{id}/update|delete|react`, and `/feed/users/{id}/mute` through Laravel v2 feed/comment/reaction/share/saved APIs. GET feed rendering, polymorphic detail, hashtags, rich comments/reaction counts, tenant gates, localization, and runtime behavior are not certified. |
| Marketplace/commerce | 0 | none exact | Marketplace POST aliases now cover `/marketplace/create`, listing update/delete/renew/save/unsave/buy/offer/report, offer accept/decline/withdraw, order ship/confirm/cancel/pay/rate, seller onboarding, pickup slot create/update/delete/scan, and seller coupon create/update/delete through Laravel v2 marketplace APIs. GET routes still have preparation pages, hosted no-JS Stripe checkout is represented by v2 payment-intent creation rather than an external Checkout redirect, address/onboarding depth and media uploads are not implemented, and Blade rendering, tenant/feature gates, localization, runtime behavior, and ASP.NET backend compatibility are not certified. Courses and podcasts remain separate commerce-family gaps. |
| Events | 0 | none exact | POST aliases now cover `/events/{id}/waitlist`, `/events/{id}/waitlist/leave`, `/events/{id}/attendees/{attendeeId}/check-in`, `/events/{id}/polls`, `/events/{id}/polls/{pollId}/vote`, `/events/{id}/recurring-edit`, and `/events/{id}/translate` through Laravel v2 event, poll, and UGC translation APIs. GET pages remain existing local/protected routes or generated preparation pages; rendered translation results, Blade list/detail parity, owner/participant authorization depth, notification/XP/waitlist promotion side effects, tenant gates, localization, runtime behavior, and ASP.NET backend compatibility are not certified. |
| Federation | 11 | connections, messages, transfers, opt-in/out, settings | GET routes have preparation pages; federation POST workflows are not certified. |
| Jobs | 17 | alerts, applications, employer brand, onboarding, talent search, qualification, analytics | GET routes have preparation pages; job application/employer POST workflows are not certified. |
| Ideation | 0 | none exact | POST aliases now cover challenge create/update/status/favorite/duplicate/delete/link campaign/outcome, idea submit/draft/comment/comment delete/vote/status/media/convert/delete, and campaign create/update/unlink/delete through Laravel v2 ideation APIs. GET routes still rely on generated preparation pages, and Blade rendering, admin authorization depth, media upload proxying, team conversion runtime behavior, tenant/feature gates, localization, runtime behavior, and ASP.NET backend compatibility are not certified. |
| Settings | 0 | none exact | POST aliases now cover appearance/theme, weekly availability, GDPR data-right requests, linked-account request/approve/permission/revoke, and insurance upload safe failure through Laravel v2 user settings/sub-account APIs while preserving Laravel status redirects. GET settings pages remain generated preparation pages or local legacy settings pages; multipart insurance proxying, linked-account data rendering, tenant feature gates, localization, runtime behavior, and ASP.NET backend compatibility are not certified. |

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
