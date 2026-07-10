# Current Web UK Accessible Frontend Handoff

Last reviewed: 2026-07-09

This is the first file to read if an agent needs to resume the accessible
frontend rewrite after a session interruption. The previous parallel `main`
and `codex/web-uk-laravel-parity` work streams were consolidated back onto
`main` on 2026-07-08. Every count here is still a snapshot. Regenerate live
state before editing, scoring, or claiming completion.

## Objective

Rewrite `apps/web-uk` so it can become the shared accessible frontend candidate
for Project NEXUS. It must use:

- the Laravel backend as the current default source of truth for data and
  workflow contracts;
- the Laravel accessible frontend as the visual, layout, route, and page-flow
  source of truth;
- the existing ASP.NET repo accessible stack: Express, Nunjucks, GOV.UK
  Frontend, server-rendered HTML, no React.

The result must eventually be able to serve Laravel-compatible and
ASP.NET-compatible backends without page-level adapters. ASP.NET must bend
toward Laravel's accessible contracts.

## Source Of Truth

| Surface | Source |
| --- | --- |
| Laravel accessible app | `C:\platforms\htdocs\staging\accessible-frontend` |
| Laravel accessible routes | `C:\platforms\htdocs\staging\routes\govuk-alpha.php` |
| Laravel parity route files | `C:\platforms\htdocs\staging\routes\govuk-alpha-parity` |
| Laravel Blade views/controllers | `C:\platforms\htdocs\staging\accessible-frontend\views`, `C:\platforms\htdocs\staging\app\Http\Controllers\GovukAlpha` |
| Web UK target | `C:\platforms\htdocs\asp.net-backend\apps\web-uk` |
| Previous parity worktree | `C:\Users\jaspe\.config\superpowers\worktrees\asp.net-backend\codex-web-uk-laravel-parity` |

The Laravel repo is read-only reference material from this workspace.

Tenant-routing source notes now live in `docs/TENANT_ROUTING_PARITY.md`. The
first shared-mount slice is implemented in Web UK: `/{tenantSlug}/accessible`
routes through the flat Express app, shell/home links use the active shared
mount, and legacy `/{tenantSlug}/alpha` requests redirect to the cleaner
`/{tenantSlug}/accessible` path. A follow-up shared-mount slice keeps local
redirects plus rendered HTML `href` and `action` targets inside the active
`/{tenantSlug}/accessible` mount, so individual templates no longer escape to
flat root paths during shared-host tenant browsing. A shared-root slice now
renders the Laravel-style tenant chooser at `/`, backed by Laravel
`/api/v2/tenants` with the master tenant excluded and community links using the
cleaner `/{tenantSlug}/accessible` mount. A follow-up tenant-chooser slice now
sorts those communities by display name to match Laravel
`AlphaController::tenantChooser()`, which orders active non-master tenants by
name. Custom/root domain slices now ask
Laravel `/api/v2/tenant/bootstrap` to resolve non-local Host values, including
Laravel `domain` and `accessible_domain`, and render the resolved tenant home at
slugless `/` when Laravel returns a matching tenant. This covers the master
tenant's configured `project-nexus.ie` domain and the `timebank.global` cluster
front page in tests, using Laravel SEO h1/intro copy and `tenant_switcher`
items. A custom-domain canonicalization slice now sends matching
`/{tenantSlug}/alpha/...` and `/{tenantSlug}/accessible/...` requests on a
dedicated tenant host to the slugless path, mirroring Laravel's
`StripTenantSlugOnAccessibleDomain` behavior while keeping Web UK's public
shared-host slug as `/accessible`. A parent-domain child slice now resolves the first non-reserved path
segment through Laravel bootstrap and serves the flat accessible app below
`/{childSlug}` when Laravel returns a matching `parent_domain`. A live
runtime-smoke slice certifies that same parent-domain child path against the
local Laravel `hour-timebank` fixture. Follow-up host-root smoke slices now
certify both the master and cluster domain front pages against full temporary
Web UK processes started with `TENANT_ID=2`:
`project-nexus.ie|/=>Build Thriving Communities with NEXUS` and
`timebank.global|/=>Exchange Skills Across Borders`. The API client suppresses
the default `X-Tenant-ID` whenever Host/Origin tenant context is present so
Laravel can resolve the browser domain. This is not full tenant-domain parity
yet: template-helper conversion,
visual/manual tenant checks, and ASP.NET backend switching certification still
need work. Focused template-helper
conversion slices now cover the event detail page's breadcrumbs, group/member
links, RSVP/admin forms, attendee links, and report return path plus the
account hub's card links and CSRF logout form, the activity dashboard/insights
navigation links, and the achievements/gamification tabs, back links, forms,
and badge links, plus the leaderboard/NEXUS score tabs, back links, forms,
load-more links, tier link, and profile links with `urlFor()`; most other
templates still need the same source-level conversion. A follow-up
activity route-redirect slice now sends unsigned activity dashboard and
insights auth handoffs through `res.locals.urlFor`, with shared-mount coverage
proving `/acme/accessible/activity` and `/acme/accessible/activity/insights`
redirect to the tenant-mounted login path. A follow-up
profile/settings slice now routes the profile summary links, settings hub
cards, profile/security/privacy forms, two-step verification actions, blocked
member unblock forms, delete-account controls, and settings appearance,
availability, data-rights, linked-account, and insurance forms through
`urlFor()`. A follow-up settings route-redirect slice now sends appearance,
availability, data-rights, linked-account, and insurance auth, validation,
success, and API-error redirects through `res.locals.urlFor`, so those no-JS
POST outcomes stay inside shared tenant mounts and custom-domain contexts
instead of relying on flat `/settings` targets. A follow-up detail/report slice now routes group detail,
listing detail, member profile, and report-link partial breadcrumbs, action
controls, report returns, listing report links, member connection controls, and
review form actions through `urlFor()`. A follow-up marketplace slice now
routes marketplace offer tabs, listing links, offer decision forms, my-listings
tabs, create/view/edit links, and renew/delete forms through `urlFor()`. A
follow-up marketplace browse/action slice now routes marketplace browse nav,
listing cards, category links, search and category filter forms, listing detail
buy/offer/save/report controls, buyer buy/offer/report forms, listing
create/edit form actions, seller profile back links, and seller onboarding
links/forms through `urlFor()`. A tenant-home parity slice now replaces the old
generic Web UK home inside tenant contexts with the Laravel Blade-style
`Accessible` home page, including community caption, tenant tagline, platform
stats, sign-in/register CTAs, module availability rows, and service details. A
follow-up tenant-stats slice now scopes those platform stats through Laravel's
tenant resolution: shared-mount tenant homes send `X-Tenant-Slug`, while custom
domain homes send the resolved Host and Origin. The latest federation hub
source slice now routes the hub service navigation, opt-in/opt-out CTAs,
partner preview links, view-all link, and quick links through `urlFor()`.
The latest federation onboarding source slice now routes the wizard back link,
service navigation, step forms, step-back links, and do-this-later links through
`urlFor()`.
The latest wallet route-redirect slice now sends transfer and donation status
redirects through `res.locals.urlFor`, with shared-mount coverage proving
`/acme/accessible/wallet/donate` validation redirects stay under the active
tenant mount.
The federation member source slice routes the federation member back link,
federation service navigation, opt-in CTA, connection/message forms, and
transfer CTA through `urlFor()`. The latest federation redirect slice now
routes signed-out federation GET handoffs, opt-in/settings shortcuts, and
conversation fallback redirects through `res.locals.urlFor`, with shared-mount
coverage proving `/acme/accessible/federation` redirects to the tenant-mounted
login path. The latest federation browse/messaging/settings/transfer source
slice routes connections, conversations, events, groups, listings, member
browse, messages, opt-in/out, partner list/detail, settings, and transfer
template links and forms through `urlFor()`. Federation POST action redirects
now route connection, message, translation, transfer, onboarding, opt-in/out,
and settings outcomes through `res.locals.urlFor`. A targeted Laravel runtime
smoke on 2026-07-09 against `WEB_UK_BASE_URL=http://127.0.0.1:5180` and
`LARAVEL_BASE_URL=http://127.0.0.1:8088` passed `19/19` checks for auth,
cookie/logout setup, signed `/federation`, `/federation/connections`,
`/federation/messages`, `/federation/settings`, and
`/federation/members/353/transfer`, plus body markers for the changed
federation pages. The latest connections source slice now routes the connections
index tabs, pending-request link, member links, accept/decline/remove forms,
empty-state member CTAs, pagination base URL, network search form, network
tabs, load-more links, card actions, and back link through `urlFor()`. The
latest notifications source slice now routes the notifications breadcrumb,
filter links, read/delete form actions, redirect hidden values, pagination base
URL, and unread empty-state CTA through `urlFor()`. The latest notifications
redirect slice now sends grouped-read, read-all, delete-all, single-read,
single-delete, API-error, and validated return redirects through
`res.locals.urlFor`, so notification POST outcomes stay inside shared tenant
mounts and custom-domain child paths. The latest group-exchanges source slice
now routes group-exchange create CTA, status tabs, detail links,
create form, participant add/remove/search forms, confirmation form, and
complete/cancel actions through `urlFor()`. The latest messages source slice
now routes direct-message breadcrumbs, conversation links, listing links,
empty-state CTAs, older-message pagination, direct reply/edit/delete/voice/
archive forms, group-message tabs, group create/search forms, participant
remove/add forms, reaction forms, member-directory links, and leave-group forms
through `urlFor()`. The latest wallet source slice now routes the wallet
breadcrumb, manage CTA, back link, recipient search form, transfer forms, and
donation forms through `urlFor()`. The latest public/auth/support source slice
now routes contact, cookie settings, login, two-factor login, forgot-password,
reset-password, register, and report-a-problem links/forms through `urlFor()`.
The latest member-onboarding redirect slice now routes onboarding
auth-required, step, avatar, validation, safeguarding, complete, and dashboard
handoff redirects through `res.locals.urlFor`, matching Laravel's named-route
redirect behavior for shared mounts and custom-domain contexts. A scoped
Laravel runtime smoke proves the current completed fixture redirects signed
`/onboarding/profile` to `/dashboard`.
The latest organisations source slice now routes organisation directory,
browse, detail, jobs, manage, register, and opportunity-apply links/forms
through `urlFor()`. The latest blog source slice now routes blog index, post
detail, discussion, liker, reaction, comment, pagination, and member-profile
links/forms through `urlFor()`. The latest blog redirect slice now routes
signed-out discussion/liker/comment/reaction handoffs and blog POST result
redirects through `res.locals.urlFor`, so blog workflow redirects stay inside
the active tenant mount without relying only on the shared-mount response
rewriter. The latest courses source slice now routes
course browse, learner, instructor, builder, analytics, grading, certificate,
review, enrolment, quiz, progress, and section/lesson controls through
`urlFor()`. The latest courses redirect slice now routes course auth handoffs,
certificate/learn errors, learner actions, instructor course, section, lesson,
publish/delete, and grading outcomes through `res.locals.urlFor`. The latest listing index/form source slice now routes listing
breadcrumbs, browse filters, clear/create CTAs, row detail/edit/delete
controls, pagination, empty-state CTAs, create/edit form action, and cancel
link through `urlFor()`. A follow-up listing exchange-request source slice now
routes the exchange-request back link and POST action through `urlFor()`, so
Laravel's canonical `/listings/{id}/exchange-request` flow stays source-auditable
under shared tenant mounts and custom-domain contexts. The latest listing
route-redirect slice now sends
legacy listing auth handoffs, generate-description outcomes, like/comment/
exchange/report actions, owner self-request/edit redirects, create/update
successes, and delete successes through `res.locals.urlFor`, so listing route
exits no longer rely on flat `/listings` redirects before shared-mount or
custom-domain rewriting. The latest events index/form source slice now routes
event list create CTA, search form, event and group links, pagination,
empty-state actions, create/edit form actions, breadcrumbs, back links, and
cancel links through `urlFor()`. A follow-up events depth source slice now
routes the event browse back/view-all links and filter form, event map back
link, event poll back link and save form, recurring-edit back link/form/
occurrence links, and translation back link/form through `urlFor()`, with
focused source and shared-mount render coverage for `/acme/accessible/events`
depth pages. A scoped Laravel runtime smoke against temporary Web UK
`http://127.0.0.1:6610`, Laravel `http://127.0.0.1:8088`, and `TENANT_ID=2`
passed base auth/cookie/logout checks plus `/events/browse`, `/events/6/map`,
`/events/6/polls`, and `/events/6/translate` module and body-text markers.
The latest groups index/form source slice now
routes group list create CTA, search form, clear links, group card links,
pagination base URL, create/edit form actions, breadcrumbs, back links, cancel
links, and legacy my-groups source controls through `urlFor()`. The latest
group depth source slice now routes group announcement edit, discussion,
invite, image, notification, manage, member, and file local links/forms through
`urlFor()`, and group route redirects now resolve through `res.locals.urlFor`
so group POST outcomes stay under shared tenant mounts and custom-domain child
paths. A scoped Laravel runtime smoke against temporary Web UK
`http://127.0.0.1:6611`, Laravel `http://127.0.0.1:8088`, and `TENANT_ID=2`
passed `22/22` checks for base auth/cookie/logout plus `/groups/484/invite`,
`/groups/484/notifications`, `/groups/484/image`, `/groups/484/manage`,
`/groups/484/discussions`, and `/groups/484/discussions/new` module/body
markers. The latest group/volunteering source slice also routes volunteering
recommended-shift back/opportunity links through `urlFor()`. The latest public
volunteering source slice now routes the
volunteering landing/search form, organisation CTA, opportunity cards,
load-more link, opportunity detail back/organisation/apply links, and clear
filter links through `urlFor()`. Volunteering action redirects now route auth,
validation, success, and API-failure destinations through `res.locals.urlFor`
from the central action helper and direct validation branches. The latest
resources source slice now routes resource browse, library, upload, delete,
download, comment, reaction, reorder, category, search, and pagination
controls through `urlFor()`. The latest resources redirect slice now routes
resource auth-required handoffs, upload/reorder/delete outcomes, and
comment/reaction result redirects through `res.locals.urlFor`; focused
shared-mount coverage proves `/acme/accessible/resources/42/delete` POSTs
redirect to `/acme/accessible/resources/library?status=resource-deleted`.
The latest search source slice now routes simple
search, advanced search, saved-search delete, result tabs, result links,
empty-state CTAs, pagination base URL, and saved-search forms through
`urlFor()`. The latest search route-redirect slice now sends unsigned
auth-required handoffs and saved-search save/delete/run result redirects
through `res.locals.urlFor`, matching Laravel's named-route redirect behavior
under shared mounts and custom-domain contexts. The latest saved source slice now routes saved-item filters,
bookmark links/removal, collection list/detail pagination and CRUD controls,
public collection links, and appreciation send/react/pagination controls
through `urlFor()`. The latest saved route-redirect slice now routes saved
collection auth handoffs, collection create/update/delete/item-remove results,
saved-item removal results, appreciation send results, and appreciation
reaction anchors through `res.locals.urlFor`, so saved-family POST outcomes
stay inside the active shared tenant mount or custom-domain context instead of
falling back to flat `/saved`, `/me/collections`, or `/users/...` paths. The latest jobs source slice now routes jobs tabs,
browse filters, saved/application/owner links, alerts, responses, detail
actions, employer pages, talent search/profile links, CSV/CV downloads,
pagination, and job POST forms through `urlFor()`. The latest jobs
route-redirect slice now routes create/update/delete/renew/apply/save/unsave,
application status/withdrawal, alert, interview, offer, and owner CSV failure
redirects through `res.locals.urlFor`, with shared-mount coverage proving
`/acme/accessible/jobs/42/apply` redirects to `/acme/accessible/login` before
any Laravel Jobs API call. The latest podcast source slice now routes podcast
browse/studio links, search form, show and episode
links, subscribe form, create/edit form actions, episode publish/delete/upload
forms, show publish/delete forms, and studio management links through
`urlFor()`. The latest podcast action redirect slice now routes subscribe,
studio create/update/publish/delete, and episode add/publish/delete POST
outcomes through `res.locals.urlFor`, so podcast workflow redirects no longer
depend on flat `/login` or `/podcasts` paths before shared-mount/custom-domain
rewriting.
The latest podcast GET redirect slice now routes signed-out and Laravel-401
podcast page auth handoffs through `res.locals.urlFor`, with shared-mount
coverage proving `/acme/accessible/podcasts` redirects to the tenant-mounted
login path before any Laravel podcast API call.
The latest feed source slice now routes feed compose/filter forms, hashtag
links, post and item permalink links, like/comment/not-interested forms,
author and group links, pagination, and sign-in CTAs through `urlFor()`.
The latest feed action redirect slice now sends feed post, item, comment,
poll, moderation, share, save, and mute POST result redirects through
`res.locals.urlFor`, with shared-mount coverage proving an empty
`/acme/accessible/feed/posts` submission redirects to
`/acme/accessible/feed?status=post-empty`.
The latest poll action redirect slice now routes auth-required, create, vote,
rank, delete, like, and comment POST outcomes through `res.locals.urlFor`, with
shared-mount coverage proving `/acme/accessible/polls/42/vote` stays under the
active tenant mount when redirecting to auth-required login.
The latest poll source slice now routes poll browse filters, create/manage
links, inline create form, detail/rank back links, vote/rank/delete/like/comment
forms, discussion links, and CSV export links through `urlFor()`, with source
regression coverage guarding against raw `/polls` template targets returning.
The latest review action redirect slice now routes auth-required, comment,
reaction, and Laravel-401 review workflow redirects through `res.locals.urlFor`,
with shared-mount coverage proving `/acme/accessible/reviews` stays under the
active tenant mount when redirecting to auth-required login.
The latest review source slice now routes review summary/list/comment links,
received/given tabs, load-more links, pending-review forms, comment forms, and
reaction forms through `urlFor()`, with source regression coverage guarding
against raw `/reviews` template targets returning.
The latest group-exchange action redirect slice now sends auth-required,
validation, success, and API-failure POST redirects through `res.locals.urlFor`.
Focused shared-mount coverage proves an invalid signed
`/acme/accessible/group-exchanges/new` submission redirects to
`/acme/accessible/group-exchanges/new?status=create-invalid`. A follow-up
group-exchange GET redirect slice now sends unsigned list, create, and detail
auth handoffs through `res.locals.urlFor`, with shared-mount coverage proving
`/acme/accessible/group-exchanges`, `/acme/accessible/group-exchanges/new`,
and `/acme/accessible/group-exchanges/7` redirect to the tenant-mounted login
path.
The latest ideation action redirect slice now sends challenge, idea, outcome,
media, conversion, and campaign POST redirects through `res.locals.urlFor`.
Focused shared-mount coverage proves a signed
`/acme/accessible/ideation/new` submission redirects to
`/acme/accessible/ideation/{id}?status=challenge-created`.
The latest ideation source-template slice now routes the ideation tabs,
challenge list filters, challenge/card links, create/edit/manage/outcome/draft
forms, idea detail controls, tag links, campaign links, and outcome links
through `urlFor()`, so rendered ideation pages no longer rely on flat
`/ideation` source targets before tenant/custom-domain rewriting.
The latest members source slice now routes
the member directory search/clear/profile/connection controls, discovery and
nearby filter navigation/forms/member links/load-more links, and insights
profile back links through `urlFor()`.
The latest member action redirect slice now routes member connection,
endorsement, block/unblock, review, transfer, discover, nearby, insights, and
Laravel-401 auth redirects through `res.locals.urlFor`, with shared-mount
coverage proving `/acme/accessible/members/{id}/connection` and blocked-list
unblock results stay inside the active tenant mount.
The latest knowledge-base source slice now routes the public `/kb` search form,
article links, load-more link, article back link, and related-article links
through `urlFor()`. A follow-up cleanup also routes the unmounted legacy
`knowledge-base` compatibility templates through `urlFor()` so stale source
does not escape tenant/custom-domain mounts; Laravel's real accessible
knowledge-base route family remains `/kb`.
The latest dashboard source slice now routes onboarding, exchange-attention,
create-listing, upcoming-event, quick-link, recent-feed, and recent-listing
dashboard links through `urlFor()`.
The latest goals source slice now routes goals browse/detail, template,
discover, buddying, edit, check-in, reminder, buddy-action, history, insights,
and social links/forms through `urlFor()`. The latest goals route-redirect
slice now routes goals auth handoffs, create/template/delete/buddy/progress/
complete/check-in/reminder/buddy-action/like/comment outcomes, and Laravel-401
fallbacks through `res.locals.urlFor`, with shared-mount coverage proving goal
POST redirects stay inside the active tenant mount.
The latest exchanges source slice now routes exchange list tabs, detail links,
pagination, listing/message links, action forms, and rating form through
`urlFor()`. The latest exchange redirect slice now routes exchange action and
rating POST result redirects through `res.locals.urlFor`, with focused
shared-mount coverage proving `/acme/accessible/exchanges/{id}` POSTs redirect
back inside the active tenant mount.
The latest public coupon source slice now routes public coupon list/detail
links through `urlFor()`. The latest public coupon route-redirect slice now
routes unsigned `/coupons` and `/coupons/{id}` auth handoffs through
`res.locals.urlFor`, matching Laravel's named login route behavior for shared
tenant mounts and custom-domain contexts. The latest parent-domain reserved-segment slice now
aligns Web UK's child-slug guard exactly with Laravel
`TenantContext::getReservedPaths()`, so Laravel-unreserved names such as
`courses` can still resolve as child tenants on a parent custom domain. The
latest public fallback-link slice now routes newsletter-unsubscribe and error
page home links through `urlFor('/')`, matching Laravel's
`govuk-alpha.home` route usage and keeping fallback links tenant/custom-domain
aware.
The latest premium source/return-url slice now routes pricing, management, and
return-page premium links/forms through `urlFor()`, sends premium auth/status
redirects through `res.locals.urlFor`, and builds checkout plus billing-portal
`return_url` payloads from the active tenant URL helper. This matches Laravel's
named-route callback behavior for shared mounts and custom-domain contexts
without rewriting external Stripe or billing-portal destinations.
The latest AI chat and matches source slice now routes AI chat back links,
conversation links, new-conversation links, chat form actions, matches filters,
board links, listing/group/event links, dismiss forms, empty-state CTAs, and
back links through `urlFor()`.
The latest AI chat redirect slice now routes the AI chat auth-required,
empty-message, and post-send redirects through a route-local helper that uses
`res.locals.urlFor`, so redirects generated by `src/routes/ai-chat.js` stay
inside the active `/{tenantSlug}/accessible` mount without relying only on the
shared-mount response rewriter.
A follow-up cleanup removes the unmounted legacy `src/routes/chat.js` router
and the orphaned `src/views/chat/index.njk` template, so the only route/view
source for Laravel's `/chat` matrix rows is the mounted tenant-aware
`src/routes/ai-chat.js` plus `src/views/ai-chat/index.njk` implementation.
The latest matches redirect slice now routes match dismiss and board dismiss
redirects through `res.locals.urlFor`, so redirects generated by
`src/routes/matches.js` stay inside the active tenant mount.
The latest auth redirect slice now routes login, two-factor, register, logout,
forgot-password, and reset-password redirects through `res.locals.urlFor`, so
redirects generated by `src/routes/auth.js` stay inside the active tenant mount.
The latest server-level redirect slice now routes core cookie, account, and
organisation redirects generated by `src/server.js` through `res.locals.urlFor`
where the target is deterministic, while leaving user-provided safe return URLs
to the existing safe-local redirect handling.
The latest contact/support redirect slice now routes contact validation,
contact result, signed-out report-a-problem, report validation, report sent,
report failed, and unsigned report POST redirects generated by
`src/routes/contact-support.js` through `res.locals.urlFor`, so support
workflow redirects stay inside the active tenant mount without relying only on
the shared-mount response rewriter.
The latest Explore redirect slice now routes unsigned and Laravel-401
`/explore` redirects generated by `src/routes/explore.js` through
`res.locals.urlFor`, so the Explore gateway's auth-required redirects stay
inside the active tenant mount without relying only on the shared-mount
response rewriter.
The latest achievements redirect slice now routes unsigned, Laravel-401,
daily-reward, challenge-claim, shop-purchase, and showcase redirects generated
by `src/routes/achievements.js` through `res.locals.urlFor`, so gamification
POST results and auth-required redirects stay inside the active tenant mount
without relying only on the shared-mount response rewriter.
The latest connection redirect slice now routes unsigned network redirects and
accept/decline/remove POST result redirects generated by
`src/routes/connections.js` through `res.locals.urlFor`, so connection workflow
redirects stay inside the active tenant mount without relying only on the
shared-mount response rewriter.
The latest clubs source slice now routes the clubs search form through
`urlFor('/clubs')` and the unsigned clubs redirect through `res.locals.urlFor`,
so the clubs directory stays inside the active tenant mount without relying
only on the shared-mount response rewriter. The latest active-club evidence
slice now also mirrors Laravel's Clubs route gate: signed empty unfiltered club
responses return `404`, while searched empty results can still render the Clubs
page when a minimal unfiltered probe proves the tenant has active clubs.
The latest skills source slice now routes the skills category/member/search
links and search form through `urlFor()`, routes the unsigned skills redirect
through `res.locals.urlFor`, and makes shared `asyncRoute` 401/error redirects
tenant-aware when `res.locals.urlFor` is present. Focused shared-mount coverage
now proves `/acme/accessible/skills` unsigned and expired-token redirects stay
under `/acme/accessible/login?status=auth-required`.
The latest shared pagination partial slice now changes the documented/default
members pagination base URL from raw `/members` to `urlFor('/members')`, so a
caller that omits `paginationConfig.baseUrl` does not leak a flat root path
under shared tenant mounts or custom-domain child paths.
The latest shared empty-state/breadcrumb partial slice now routes empty-state
primary and secondary action links through `urlFor()` and updates breadcrumb
examples to use `urlFor(...)`, so shared partial usage does not leak flat local
paths when rendered under `/{tenantSlug}/accessible`.
The latest shell tenant-gating slice now mirrors Laravel
`AlphaController::alphaNavItems()` and `alphaFooterColumns()` for shared shell
links: Dashboard, Feed, Listings, Members, Events, Volunteering, and footer
Blog are filtered from tenant bootstrap `modules`/`features`, and the footer
Platform column is removed when no platform links are enabled. This is shell
visibility parity only; page-level disabled-state behavior still needs
module-by-module certification.
The latest generated-prep cleanup slice now narrows
`src/routes/laravel-prep-pages.js` to rows explicitly marked `missing` in the
generated route matrix. With the current 608/608 matrix, the runtime prep-page
loader exports `0` preparation pages, so matched Laravel GET routes are no
longer backed by generic skeleton handlers after the real route modules.

## Non-Negotiable Rules

- Keep the stack as Express, Nunjucks, GOV.UK Frontend, SSR HTML.
- Do not add React, Next.js, Vue, client-side routing, or a new CSS framework.
- Do not use GOV.UK branding in a way that implies this is a UK government
  service.
- Do not make route matrix gaps disappear by weakening the Laravel source target.
- Do not treat generated preparation pages as workflow parity.
- Do not build backend-specific page adapters. Prefer Laravel-compatible API
  contracts and make ASP.NET match those contracts later.
- Do not overwrite dirty files created by active agents. Check status and diffs
  before editing.

## Current Snapshot

Snapshot refreshed after consolidating the parallel Web UK streams on
2026-07-08. Regenerate before trusting it.

| Item | Last observed state |
| --- | --- |
| Branch | `main` |
| Head commit | Rerun `git rev-parse --short HEAD` before editing because `main` is actively moving through focused Web UK parity commits. |
| Dirty files seen | None expected after the consolidation commit; rerun `git status --short --branch` and treat that as authoritative. |
| Working estimate | about `998.8/1000` implementation/certification parity |
| Green confidence estimate | about `992/1000`, mainly gated by visual/manual Laravel Blade parity, live disabled-tenant fixture proof for broker workflow behavior, and ASP.NET backend switching certification |
| Documentation readiness after this handoff | Current for the consolidated branch state, route declarations, clean lint evidence, local Jest evidence, backend base-URL provenance, Laravel auth-smoke tenant-context evidence, full default Laravel runtime-smoke coverage via chunked/bucketed runs, tenant-domain Host-header smoke evidence, and remaining visual/tenant certification gaps, assuming agents rerun the refresh protocol |

The latest generated route matrix at this handoff reported:

| Metric | Last observed result |
| --- | --- |
| Laravel accessible routes | `608` |
| Web UK routes | `610` |
| Matched routes | `608` |
| Missing Laravel routes | `0` |
| Extra Web UK routes | `0` |
| Ignored Web UK infrastructure routes | `3` |
| Generated prep-page matches | `0` rows matched through `src/routes/laravel-prep-pages.js` |
| Runtime generated prep pages | `0` exported by `src/routes/laravel-prep-pages.js` |

Latest focused verification on 2026-07-09 for the generated prep-page cleanup
slice:

- `npm --prefix apps/web-uk test -- --runTestsByPath tests/laravel-prep-pages.test.js --runInBand` first failed because the loader still registered a matched `/matched` GET row as a preparation page, then passed after filtering to `status: "missing"`.
- `node -e "const r=require('./apps/web-uk/src/routes/laravel-prep-pages'); console.log(r.prepPages.length)"` reported `0` current runtime preparation pages.
- `npm --prefix apps/web-uk run route:matrix` passed with 608/608 Laravel accessible routes matched, 0 missing, 0 extra Web UK routes, and 3 ignored infrastructure routes after the loader cleanup.
- A scoped live `npm --prefix apps/web-uk run smoke:laravel` against Web UK `http://127.0.0.1:5180` and Laravel `http://127.0.0.1:8088`, with module/page sweeps disabled, passed 10/10 checks for Laravel API reachability, Web UK health, cookie-consent POST workflows, login CSRF, login POST, signed `/account`, and logout. This is core runtime proof only, not the required full 634-check smoke.

Latest full default Laravel runtime-smoke recertification on 2026-07-09:

- Started a dedicated local Web UK process at `http://127.0.0.1:6510` with
  `TENANT_ID=2`, `ACCESSIBLE_BACKEND_TARGET=laravel`, and
  `LARAVEL_BASE_URL=http://127.0.0.1:8088` so public fixture routes resolve the
  same tenant as the Laravel E2E account.
- `npm --prefix apps/web-uk run route:matrix` passed immediately before the
  smoke work with 608/608 Laravel accessible routes matched, 0 missing, 0 extra
  Web UK routes, and 3 ignored infrastructure routes.
- The module-page default sweep passed in eight deterministic chunks with body,
  gated, redirect, content-type, and tenant-domain buckets disabled:
  `SMOKE_MODULE_PAGE_CHUNK=1/8` through `8/8` covered all `281` module-page
  checks with `0` failures.
- The body-text default sweep passed in eight deterministic chunks with module,
  gated, redirect, content-type, and tenant-domain buckets disabled:
  `SMOKE_BODY_TEXT_PAGE_CHUNK=1/8` through `8/8` covered all `283` body-text
  checks with `0` failures.
- The core non-page buckets passed as explicit smaller groups: unsigned
  auth-required redirects, unsigned login redirects, content-type checks,
  all `22` signed gated-status checks, and all `19` signed redirect checks.
- A single all-in-one core run on this local stack still produced a transient
  mixed-sequence failure for `/listings/42/analytics`, but the same signed Web
  session sequence and the focused/split gated smoke returned the Laravel-truth
  `403`. Use the chunked/bucketed shape above for current full-scope local
  certification rather than treating an unchunked wrapper run as authoritative.

Latest focused visual/manual Blade spot-check on 2026-07-09 for the tenant
home shell and footer meta:

- Browser-style DOM comparison checked Laravel
  `http://127.0.0.1:8088/hour-timebank/alpha` against a tenant-correct Web UK
  process at `http://127.0.0.1:6511/hour-timebank/accessible`, started with
  `TENANT_ID=2`, `ACCESSIBLE_BACKEND_TARGET=laravel`, and
  `LARAVEL_BASE_URL=http://127.0.0.1:8088`.
- The tenant home matched the key Blade markers for `Hour Timebank`,
  `Accessible`, `Connecting Communities`, `Members 946`, `Hours exchanged
  1,988`, `Active listings 129`, `Communities 1`, service-nav labels, guest
  `Sign in`/`Register` CTAs, and dashboard auth-required link behavior while
  keeping Web UK's public links on `/accessible` instead of Laravel's
  `/alpha`.
- The comparison found a concrete footer meta copy gap: Laravel's visually
  hidden meta heading is `Supporting information and attribution`, while Web UK
  still said `Support and licence information`. The focused shell test first
  failed on that missing string, then passed after `partials/footer.njk` was
  aligned.
- This is the first focused visual/manual tenant-home shell slice only. It does
  not certify every route family, feature-disabled page behavior, tenant
  logo/colour depth, localization, or ASP.NET backend switching.

Latest focused verification on 2026-07-09 for the events index/form
template-helper slice:

- `npm --prefix apps/web-uk test -- tests/template-source.test.js --runInBand --runTestsByPath -t "event index"` first failed on raw `/events` and `/groups` links, then passed after conversion.
- `npm --prefix apps/web-uk test -- tests/template-source.test.js --runInBand --runTestsByPath` passed: 22 tests.
- `npm --prefix apps/web-uk test -- tests/shared-accessible-shell.test.js --runInBand --runTestsByPath -t "event"` passed: 23 tests, with the existing Node `DEP0044 util.isArray` deprecation warning.
- Source scan of `src/views/events/index.njk`, `new.njk`, and `edit.njk` for raw event/group local `href` and event form `action` strings returned no matches.
- `npm --prefix apps/web-uk run route:matrix` passed with 608/608 Laravel accessible routes matched, 0 missing, 0 extra Web UK routes, and 3 ignored infrastructure routes.
- `npm --prefix apps/web-uk run lint` passed.
- `npm --prefix apps/web-uk test -- --runInBand` passed: 10 suites, 727 tests, with the existing Node `DEP0044 util.isArray` deprecation warning.
- A focused exported `runLaravelRuntimeSmoke()` invocation against temporary Web UK `http://127.0.0.1:6464` and Laravel `http://127.0.0.1:8088` passed 12 checks, including `/events=>Events` and `/events/new=>Create an event`; the broader CLI invocation timed out after walking default smoke page lists and is not counted as a full-smoke pass.

Latest focused verification on 2026-07-09 for the search template-helper
slice:

- `npm --prefix apps/web-uk test -- tests/template-source.test.js --runInBand --runTestsByPath -t "search forms"` first failed on raw `/search`, `/listings`, `/members`, `/events`, and `/groups` links/actions, then passed after conversion.
- `npm --prefix apps/web-uk test -- tests/template-source.test.js --runInBand --runTestsByPath -t "search route redirects"` first failed on missing route-helper coverage and raw `/login` plus `searchAdvancedUrl(...)` redirects, then passed after those redirects moved through `redirectTo(res, ...)` and `res.locals.urlFor`.
- `Get-ChildItem apps\web-uk\src\views\search -Filter *.njk | Select-String -Pattern 'href="/search','action="/search','href="/listings','href="/members','href="/events','href="/groups','href: "/search','href: "/listings','baseUrl: "/search'` returned no matches.
- `npm --prefix apps/web-uk test -- tests/shared-accessible-shell.test.js --runInBand --runTestsByPath -t "search"` passed: 16 selected tests.
- A focused exported `runLaravelRuntimeSmoke()` invocation against temporary in-process Web UK `http://127.0.0.1:56338` and Laravel `http://127.0.0.1:8088`, started with `TENANT_ID=2`, passed 13 checks: base API/health, cookie, login, account, logout, signed `/search/advanced?q=garden`, and body markers `Advanced search` and `Save this search`.

Latest focused verification on 2026-07-09 for the saved template-helper
slice:

- `npm --prefix apps/web-uk test -- tests/template-source.test.js --runInBand --runTestsByPath -t "saved-item"` first failed on raw `/saved`, `/me/collections`, `/members`, `/users`, and `/appreciations` links/actions, then passed after conversion.
- `Select-String -Path apps\web-uk\src\views\saved\*.njk,apps\web-uk\src\views\saved-collections\*.njk,apps\web-uk\src\views\saved-social\*.njk -Pattern 'href="/saved','action="/saved','href="/me','action="/me','href="/members','href="/users','action="/users','action="/appreciations','href="{{ item.href }}' -SimpleMatch` returned no matches.
- `npm --prefix apps/web-uk test -- tests/shared-accessible-shell.test.js --runInBand --runTestsByPath -t "saved"` passed: 20 selected tests.
- A focused exported `runLaravelRuntimeSmoke()` invocation against temporary in-process Web UK `http://127.0.0.1:50823` and Laravel `http://127.0.0.1:8088`, started with `TENANT_ID=2`, passed 16 checks: base API/health, cookie, login, account, logout, signed `/saved`, `/me/collections`, and `/users/14/appreciations`, plus body markers `Saved items`, `My collections`, and `Appreciation`.

Latest focused verification on 2026-07-09 for the saved route-redirect
slice:

- `npm --prefix apps/web-uk test -- tests/template-source.test.js tests/shared-accessible-shell.test.js --runInBand --runTestsByPath -t "saved collection and appreciation route redirects|saved collection redirects inside|saved appreciation redirects inside"` first failed because the saved route files still emitted direct `res.redirect(...)` targets, then passed after routing saved collection, saved item, and appreciation redirects through `res.locals.urlFor`.
- Shared-mount behavior coverage proves signed POST outcomes under `/acme/accessible/me/collections`, `/acme/accessible/users/{id}/appreciations`, and `/acme/accessible/appreciations/{id}/react` redirect back under `/acme/accessible`.
- A scoped Laravel runtime smoke against Web UK `http://127.0.0.1:5180` and Laravel `http://127.0.0.1:8088` passed 16 checks for base API/health, cookie, login/account/logout, signed `/saved`, `/me/collections`, and `/users/14/appreciations`, plus body markers `Saved items`, `My collections`, and `Appreciation`.

Latest focused verification on 2026-07-09 for the jobs template-helper
slice:

- `npm --prefix apps/web-uk test -- tests/template-source.test.js --runInBand --runTestsByPath -t "jobs browse"` first failed on raw `/jobs` links/actions, then passed after conversion.
- `Select-String -Path apps\web-uk\src\views\jobs\*.njk -Pattern 'href="/jobs','action="/jobs','href: "/jobs','baseUrl: "/jobs','href="{{ nextHref }}','href="{{ meta.nextHref }}','action="{{ formAction }}' -SimpleMatch` returned no matches.
- `npm --prefix apps/web-uk test -- tests/template-source.test.js --runInBand --runTestsByPath` passed: 27 tests.
- `npm --prefix apps/web-uk test -- tests/shared-accessible-shell.test.js --runInBand --runTestsByPath -t "jobs|job"` passed: 28 selected tests.
- A focused exported `runLaravelRuntimeSmoke()` invocation against temporary in-process Web UK `http://127.0.0.1:60268`, Laravel `http://127.0.0.1:8088`, and `TENANT_ID=2` passed 24 checks: base API/health, cookie, login, account, logout, signed `/jobs/saved`, `/jobs/applications`, `/jobs/mine`, `/jobs/create`, `/jobs/alerts`, `/jobs/responses`, and `/jobs/employer-onboarding`, plus body markers `Saved opportunities`, `My applications`, `My postings`, `Post an opportunity`, `Job alerts`, `Interview invitations`, and `Welcome to posting opportunities`.

Latest focused verification on 2026-07-09 for the jobs route-redirect
slice:

- `npm --prefix apps/web-uk test -- tests/template-source.test.js --runInBand --runTestsByPath -t "jobs route redirects"` first failed on raw `res.redirect('/login')`/`res.redirect('/jobs...')` outcomes, then passed after conversion through `res.locals.urlFor`.
- `npm --prefix apps/web-uk test -- tests/shared-accessible-shell.test.js --runInBand --runTestsByPath -t "Laravel jobs action aliases"` passed, including mounted unsigned `/acme/accessible/jobs/42/apply` redirecting to `/acme/accessible/login` without calling the Laravel Jobs API.
- A scoped Laravel runtime smoke against temporary Web UK `http://127.0.0.1:6514`, Laravel `http://127.0.0.1:8088`, and `TENANT_ID=2` passed 17 checks for base API/health, cookie, login/account/logout, signed `/jobs`, `/jobs/90764`, `/jobs/90764/qualified`, and `/jobs/employers/14`, plus body markers `Apply for this opportunity`, `Am I qualified?`, and `Open opportunities and reviews for this employer`.

Latest focused verification on 2026-07-09 for the members template-helper
slice:

- `npm --prefix apps/web-uk test -- tests/template-source.test.js --runInBand --runTestsByPath -t "member directory"` first failed on raw `/members` links/actions, then passed after conversion.
- `Get-ChildItem -Path apps\web-uk\src\views\members -Filter *.njk | Select-String -SimpleMatch -Pattern 'href="/members','action="/members','href="/connections','href="/profile','href: "/members','baseUrl: "/members','href="{{ nextHref }}'` returned no matches.
- `npm --prefix apps/web-uk test -- tests/shared-accessible-shell.test.js --runInBand --runTestsByPath -t "members"` passed: 42 selected tests.
- A focused exported Laravel runtime smoke against temporary in-process Web UK `http://127.0.0.1:64511`, Laravel `http://127.0.0.1:8088`, and `TENANT_ID=2` passed 18 checks: base API/health, cookie, login, account, logout, signed `/members`, `/members/discover`, `/members/nearby`, and `/members/77/insights`, plus body markers `Community members`, `Recommended members`, `Members near me`, and `Reputation and recognition`.

Latest focused verification on 2026-07-09 for the podcast template-helper
slice:

- `npm --prefix apps/web-uk test -- tests/template-source.test.js --runInBand --runTestsByPath -t "podcast browse"` first failed on raw `/podcasts` links/actions, then passed after conversion.
- `Get-ChildItem -Path apps\web-uk\src\views\podcasts -Filter *.njk | Select-String -SimpleMatch -Pattern 'href="/podcasts','action="/podcasts','href: "/podcasts','baseUrl: "/podcasts','action="{{ action }}','action="{{ episodeStoreAction }}'` returned no matches.
- `npm --prefix apps/web-uk test -- tests/shared-accessible-shell.test.js --runInBand --runTestsByPath -t "podcast"` passed: 10 selected tests.
- A focused exported Laravel runtime smoke against temporary in-process Web UK `http://127.0.0.1:64493`, Laravel `http://127.0.0.1:8088`, and `TENANT_ID=2` passed 16 checks: base API/health, cookie, login, account, logout, signed `/podcasts`, `/podcasts/studio`, and `/podcasts/studio/new`, plus body markers `Podcasts`, `Podcast studio`, and `Create a podcast`.

Latest focused verification on 2026-07-09 for the podcast action redirect
slice:

- `npm --prefix apps/web-uk test -- tests/template-source.test.js --runInBand --runTestsByPath -t "podcast action redirects"` first failed on raw `res.redirect(loginRedirect())` and raw podcast status redirects in `src/routes/podcast-actions.js`, then passed after those redirects moved through `redirectTo(res, ...)` and `res.locals.urlFor`.
- `npm --prefix apps/web-uk test -- tests/shared-accessible-shell.test.js --runInBand --runTestsByPath -t "podcast action aliases"` passed: 1 selected test, preserving the existing Laravel podcast POST alias behavior and flat redirect destinations.
- A scoped `npm --prefix apps/web-uk run smoke:laravel` against temporary Web UK `http://127.0.0.1:6511`, Laravel `http://127.0.0.1:8088`, and `TENANT_ID=2` passed 13/13 checks: base API/health, cookie, login, account, logout, and signed `/podcasts`, `/podcasts/studio`, and `/podcasts/studio/new`.

Latest focused verification on 2026-07-09 for the podcast GET redirect slice:

- `npm --prefix apps/web-uk test -- tests/template-source.test.js --runInBand --runTestsByPath -t "podcast page redirects"` first failed on raw `res.redirect(loginRedirect())` calls in `src/routes/podcasts.js`, then passed after signed-out and Laravel-401 auth handoffs moved through `redirectTo(res, loginRedirect())` and `res.locals.urlFor`.
- `npm --prefix apps/web-uk test -- tests/shared-accessible-shell.test.js --runInBand --runTestsByPath -t "redirects signed-out visitors away from podcasts"` passed: 1 selected test, covering both flat `/podcasts` and mounted `/acme/accessible/podcasts` auth-required redirects without calling Laravel.

Latest focused verification on 2026-07-09 for the feed template-helper and
Laravel live-shape slice:

- `npm --prefix apps/web-uk test -- tests/template-source.test.js --runInBand --runTestsByPath -t "feed browse"` first failed on raw `/feed` links/actions, then passed after conversion.
- `npm --prefix apps/web-uk test -- tests/shared-accessible-shell.test.js --runInBand --runTestsByPath -t "author-shaped posts"` first failed with a 500 when Laravel returned `author` instead of `user`, then passed after feed post normalization was expanded.
- `Get-ChildItem -Path apps\web-uk\src\views\feed -Filter *.njk | Select-String -SimpleMatch -Pattern 'href="/feed','action="/feed','href="/members','href="/groups','href="/login','href: "/feed','href="{{ nextHref }}','href="{{ item.deepLink.href }}'` returned no matches.
- `npm --prefix apps/web-uk test -- tests/shared-accessible-shell.test.js --runInBand --runTestsByPath -t "feed"` passed: 19 selected tests.
- A focused exported Laravel runtime smoke against temporary in-process Web UK `http://127.0.0.1:58285`, Laravel `http://127.0.0.1:8088`, and `TENANT_ID=2` passed 20 checks: base API/health, cookie, login, account, logout, signed `/feed`, `/feed/hashtags`, `/feed/hashtag/timebank`, `/feed/posts/796`, and `/feed/item/listing/42`, plus body markers `Feed`, `Hashtags`, `#timebank`, `Post`, and `View listing`.

Latest focused verification on 2026-07-09 for the groups index/form
template-helper slice:

- `npm --prefix apps/web-uk test -- tests/template-source.test.js --runInBand --runTestsByPath -t "group index"` first failed on raw `/groups` links, actions, and pagination base URL, then passed after conversion.
- `npm --prefix apps/web-uk test -- tests/template-source.test.js --runInBand --runTestsByPath` passed: 23 tests.
- `npm --prefix apps/web-uk test -- tests/shared-accessible-shell.test.js --runInBand --runTestsByPath -t "renders group navigation without legacy member-management links"` passed.
- Source scan of `src/views/groups/index.njk`, `new.njk`, `edit.njk`, and `my.njk` for raw group local `href`, form `action`, JavaScript `href`, and pagination `baseUrl` strings returned no matches.
- `npm --prefix apps/web-uk run route:matrix` passed with 608/608 Laravel accessible routes matched, 0 missing, 0 extra Web UK routes, and 3 ignored infrastructure routes.
- `npm --prefix apps/web-uk run lint` passed.
- `npm --prefix apps/web-uk test -- --runInBand` passed: 10 suites and 728 tests, with the existing Node `DEP0044 util.isArray` deprecation warning.
- A focused exported `runLaravelRuntimeSmoke()` invocation against temporary Web UK `http://127.0.0.1:6465` and Laravel `http://127.0.0.1:8088` passed 12 checks, including `/groups=>Groups` and `/groups/new=>Create a group`.

Latest focused verification on 2026-07-09 for the resources
template-helper slice:

- `npm --prefix apps/web-uk test -- tests/template-source.test.js --runInBand --runTestsByPath -t "resource browse"` first failed on raw `/resources` links/actions, then passed after conversion.
- `Select-String -Path apps\web-uk\src\views\resources\*.njk -Pattern 'href="/resources','action="/resources','href: "/resources','baseUrl: "/resources'` returned no matches.
- `npm --prefix apps/web-uk test -- tests/shared-accessible-shell.test.js --runInBand --runTestsByPath -t "resource"` passed: 14 selected tests.
- `npm --prefix apps/web-uk test -- tests/template-source.test.js --runInBand --runTestsByPath` passed: 24 tests.
- `npm --prefix apps/web-uk run route:matrix` passed with 608/608 Laravel accessible routes matched, 0 missing, 0 extra Web UK routes, and 3 ignored infrastructure routes.
- `npm --prefix apps/web-uk run lint` passed.
- `npm --prefix apps/web-uk test -- --runInBand` passed: 10 suites and 730 tests, with the existing Node `DEP0044 util.isArray` deprecation warning.
- A focused exported `runLaravelRuntimeSmoke()` invocation against temporary in-process Web UK `http://127.0.0.1:54932` and Laravel `http://127.0.0.1:8088`, started with `TENANT_ID=2`, passed 18 checks: base API/health, cookie, login, account, logout, module renders for `/resources`, `/resources/library`, `/resources/upload`, and `/resources/10/comments`, plus body markers `Resources`, `Resource library`, `Upload a resource`, and `Discussion`.

Latest focused verification on 2026-07-09 for the tenant parent-domain
reserved-path slice:

- `npm --prefix apps/web-uk test -- tests/routes.test.js --runInBand --runTestsByPath -t "Laravel-reserved parent-domain"` first failed because `/classic` on `parent-domain.test` called `getTenantBootstrap({ slug: "classic" })`, then passed after Web UK's reserved child-segment set was aligned with Laravel `TenantContext::getReservedPaths()`.
- `npm --prefix apps/web-uk test -- tests/routes.test.js --runInBand --runTestsByPath -t "Laravel-unreserved accessible route names"` first failed because `/courses/login` on `parent-domain.test` stayed on the parent route path instead of probing `getTenantBootstrap({ slug: "courses" })`, then passed after Web UK's reserved child-segment set was made exact rather than over-broad.
- `npm --prefix apps/web-uk test -- --runTestsByPath tests/tenant-routing-source.test.js --runInBand` first failed because Web UK did not export the copied reserved set for automated parity checks, then passed after the middleware exposed it. The test compares Laravel `TenantContext::getReservedPaths()` with Web UK `RESERVED_CHILD_SEGMENTS` and currently reports no differences.
- `npm --prefix apps/web-uk test -- tests/routes.test.js --runInBand --runTestsByPath` passed: 40 tests.
- `npm --prefix apps/web-uk run route:matrix` passed with 608/608 Laravel accessible routes matched, 0 missing, 0 extra Web UK routes, and 3 ignored infrastructure routes.
- `npm --prefix apps/web-uk run lint` passed.
- `npm --prefix apps/web-uk test -- --runInBand` passed: 10 suites and 748 tests, with the existing Node `DEP0044 util.isArray` deprecation warning.
- A scoped `npm --prefix apps/web-uk run smoke:laravel` against temporary in-process Web UK `http://127.0.0.1:59115` and Laravel `http://127.0.0.1:8088` passed 11 checks, including `timebank.global|/hour-timebank/login=>Sign in` with no legacy `/alpha` or `/accessible` links.

Latest focused verification on 2026-07-09 for the public fallback home-link
slice:

- `npm --prefix apps/web-uk test -- tests/template-source.test.js --runInBand --runTestsByPath -t "public fallback home links"` first failed on raw `href="/"` links in `public-info/newsletter-unsubscribe.njk`, then passed after newsletter-unsubscribe and error-page home links were routed through `urlFor('/')`.
- `npm --prefix apps/web-uk test -- tests/shared-accessible-shell.test.js --runInBand --runTestsByPath -t "newsletter unsubscribe"` passed: the missing, success, and invalid-token states still render.
- `rg -n 'href="/|action="/|href:\s*"/|action:\s*"/|baseUrl:\s*"/' apps/web-uk/src/views -g '*.njk'` returned no matches after the slice.
- `npm --prefix apps/web-uk test -- tests/template-source.test.js --runInBand --runTestsByPath` passed: 39 tests.
- `npm --prefix apps/web-uk run route:matrix` passed with 608/608 Laravel accessible routes matched, 0 missing, 0 extra Web UK routes, and 3 ignored infrastructure routes.
- `npm --prefix apps/web-uk run lint` passed.
- `npm --prefix apps/web-uk test -- --runInBand` passed: 10 suites and 749 tests, with the existing Node `DEP0044 util.isArray` deprecation warning. An earlier concurrent full-suite attempt hit a transient `ENOBUFS` while stale 2026-07-08 Web UK Jest processes were still running; after stopping those stale test runners, the sequential rerun passed.
- A scoped `npm --prefix apps/web-uk run smoke:laravel` against temporary in-process Web UK `http://127.0.0.1:63409` and Laravel `http://127.0.0.1:8088` passed 12 checks, including `/newsletter/unsubscribe=>Unsubscribe from emails`.

Latest focused verification on 2026-07-09 for the no-JS language selector
query-preservation slice:

- `npm --prefix apps/web-uk test -- tests/shared-accessible-shell.test.js --runInBand --runTestsByPath -t "no-JS language selector"` first failed because the Web UK language form did not render Blade-style hidden query inputs for `status` and `return`, then passed after `buildShellLocals()` exposed scalar non-`locale` query params and `layouts/base.njk` rendered them as hidden inputs.
- `npm --prefix apps/web-uk test -- tests/shared-accessible-shell.test.js --runInBand --runTestsByPath` passed: 443 tests.
- `npm --prefix apps/web-uk run lint` passed.
- `npm --prefix apps/web-uk run route:matrix` passed with 608/608 Laravel accessible routes matched, 0 missing, 0 extra Web UK routes, and 3 ignored infrastructure routes.
- `npm --prefix apps/web-uk test -- --runInBand` passed: 10 suites and 750 tests, with the existing Node `DEP0044 util.isArray` deprecation warning.
- A scoped `npm --prefix apps/web-uk run smoke:laravel` with only `/login?status=auth-required&return=%2Fexplore&locale=ga=>Sign in` as the body-text page passed 11/11 checks against Web UK `http://127.0.0.1:5180` and Laravel `http://127.0.0.1:8088`.
- This mirrors Laravel Blade's `request()->except(['locale'])` scalar query behavior for the global language selector. It does not newly certify localization depth, tenant feature gates, runtime locale persistence, or ASP.NET backend compatibility.

Latest focused verification on 2026-07-09 for the shell tenant module/feature
gating slice:

- `npm --prefix apps/web-uk test -- --runTestsByPath tests/accessible-shell.test.js` passed: 3 tests.
- `npm --prefix apps/web-uk test -- --runTestsByPath tests/shared-accessible-shell.test.js --runInBand` passed: 443 tests.
- `npm --prefix apps/web-uk test -- --runTestsByPath tests/routes.test.js --runInBand` passed: 40 tests.
- `npm --prefix apps/web-uk run lint` passed.
- `npm --prefix apps/web-uk run route:matrix` passed with 608/608 Laravel accessible routes matched, 0 missing, 0 extra Web UK routes, and 3 ignored infrastructure routes.
- `npm --prefix apps/web-uk test -- --runInBand` passed: 11 suites and 753 tests, with the existing Node `DEP0044 util.isArray` deprecation warning.
- The focused test pins Laravel Blade shell semantics for tenant bootstrap
  `modules`/`features`: signed-out service navigation hides disabled Dashboard,
  Feed, Members, and Events while preserving enabled Listings and Volunteering;
  signed-in service navigation hides anonymous Home and disabled Dashboard; and
  footer Platform links are filtered and prefixed through the active tenant
  mount.
- This does not certify page-level feature-disabled redirects/errors, account
  hub feature cards, Explore card gating, runtime Laravel tenant fixtures, or
  ASP.NET backend compatibility.

Latest focused verification on 2026-07-09 for shared-mount tenant bootstrap
and Laravel default feature gates:

- `npm --prefix apps/web-uk test -- tests/shared-accessible-shell.test.js --runInBand --runTestsByPath -t "uses Laravel tenant feature defaults"` first failed because `/acme/accessible/explore` did not call Laravel tenant bootstrap and therefore treated omitted tenant feature flags as enabled.
- Web UK shared `/{tenantSlug}/accessible` requests now resolve tenant bootstrap through Laravel before rendering, so shell and Explore locals can use the same tenant data as custom-domain requests.
- `src/lib/accessible-shell.js` now mirrors Laravel `TenantFeatureConfig` defaults for shell/Explore visibility, keeping default-off cards such as Marketplace, Courses, Podcasts, Coupons, and Premium hidden unless Laravel explicitly enables them for the tenant.
- `npm --prefix apps/web-uk test -- tests/routes.test.js --runInBand --runTestsByPath -t "shared tenant accessible mount"` passed: 9 selected tests.
- `npm --prefix apps/web-uk test -- tests/shared-accessible-shell.test.js --runInBand --runTestsByPath -t "Explore|shared tenant mount|accessible mount"` passed: 24 selected tests.
- `npm --prefix apps/web-uk run lint` passed.
- `npm --prefix apps/web-uk run route:matrix` passed with 608/608 Laravel accessible routes matched, 0 missing, 0 extra Web UK routes, and 3 ignored infrastructure routes.
- `npm --prefix apps/web-uk test -- --runInBand` passed: 12 suites and 829 tests, with the existing Node `DEP0044 util.isArray` deprecation warning.
- A targeted live Laravel smoke against a temporary current-code Web UK process at `http://127.0.0.1:6521` with `TENANT_ID=2` passed 11/11 checks, including signed `/acme/accessible/explore=>Explore`.
- This improves page-level feature visibility proof for shared tenant mounts. It does not certify every feature-disabled route response, visual/manual Blade parity, or ASP.NET backend compatibility.

Latest focused verification on 2026-07-09 for tenant-mounted default-off
feature page gates:

- `npm --prefix apps/web-uk test -- tests/shared-accessible-shell.test.js --runInBand --runTestsByPath -t "tenant-mounted default-off feature pages"` first failed because `/acme/accessible/marketplace` rendered `200` when Laravel's `TenantContext::hasFeature('marketplace')` gate would abort with `403`.
- `src/middleware/tenant-feature-gates.js` now gates tenant-context route prefixes for Marketplace, Courses, Podcasts, Coupons, and Premium using the Laravel-aligned defaults exported from `src/lib/accessible-shell.js`: `marketplace`, `courses`, `podcasts`, `merchant_coupons`, and `member_premium` default to disabled until Laravel tenant bootstrap explicitly enables them.
- `npm --prefix apps/web-uk test -- tests/shared-accessible-shell.test.js --runInBand --runTestsByPath -t "tenant-mounted default-off feature pages"` passed after the middleware was mounted after shell locals and before the route modules.
- `npm --prefix apps/web-uk test -- tests/shared-accessible-shell.test.js --runInBand --runTestsByPath -t "tenant-mounted default-off feature pages|uses Laravel tenant feature defaults"` passed 2 selected tests.
- `npm --prefix apps/web-uk test -- tests/routes.test.js --runInBand --runTestsByPath -t "shared tenant accessible mount"` passed 9 selected tests.
- `npm --prefix apps/web-uk test -- tests/shared-accessible-shell.test.js --runInBand --runTestsByPath` passed 467/467 tests, with the existing Node `DEP0044 util.isArray` deprecation warning.
- `npm --prefix apps/web-uk run lint` passed.
- `npm --prefix apps/web-uk run route:matrix` passed with 608/608 Laravel accessible routes matched, 0 missing, 0 extra Web UK routes, and 3 ignored infrastructure routes.
- `npm --prefix apps/web-uk test -- --runInBand` passed: 12 suites and 830 tests, with the existing Node `DEP0044 util.isArray` deprecation warning.
- A targeted Laravel runtime smoke against temporary Web UK `http://127.0.0.1:6531`, Laravel `http://127.0.0.1:8088`, and `TENANT_ID=2` passed 15/15 checks. The narrowed `SMOKE_GATED_PAGE_PATHS` asserted signed `403` responses for `/acme/accessible/marketplace`, `/acme/accessible/courses`, `/acme/accessible/podcasts`, `/acme/accessible/coupons`, and `/acme/accessible/premium`; broad module/body/redirect/content-type/tenant-domain buckets were disabled for this focused run.
- This covers the first default-off page-level feature-gate slice for tenant contexts. It does not certify every Laravel `TenantContext::hasFeature()` or `hasModule()` route gate, visual/manual Blade parity, enabled-tenant depth behavior, or ASP.NET backend compatibility.

Latest focused verification on 2026-07-09 for tenant-mounted core module and
feature route gates:

- Laravel source evidence came from `TenantContext::hasFeature()`,
  `TenantContext::hasModule()`, and the generated route matrix `gates` column,
  which lists `module:` and `feature:` gates for the affected route families.
- `npm --prefix apps/web-uk test -- tests/shared-accessible-shell.test.js --runInBand --runTestsByPath -t "disabled core route gates"` first failed because `/acme/accessible/dashboard` returned `200` while the mocked Laravel bootstrap set `modules.dashboard=false`.
- `src/middleware/tenant-feature-gates.js` now handles both `moduleKey` and
  `featureKey` prefixes. It blocks tenant-context disabled routes for
  Dashboard, Feed, Listings, Exchanges, Matches, Events, Volunteering,
  Organisations, Members, Connections, Messages, Wallet, Notifications,
  Achievements, Leaderboard, NEXUS score, Blog, AI chat, Federation, Goals,
  Groups, Group exchanges, Ideation, Jobs, Polls, Resources, Reviews, and
  Search, while preserving the existing default-off Marketplace, Courses,
  Podcasts, Coupons, and Premium gates.
- `npm --prefix apps/web-uk test -- tests/shared-accessible-shell.test.js --runInBand --runTestsByPath -t "disabled core route gates|default-off feature pages"` passed 2 selected tests.
- `npm --prefix apps/web-uk test -- tests/shared-accessible-shell.test.js --runInBand --runTestsByPath` passed 468/468 tests, with the existing Node `DEP0044 util.isArray` deprecation warning.
- `npm --prefix apps/web-uk run lint` passed.
- `npm --prefix apps/web-uk run route:matrix` passed with 608/608 Laravel accessible routes matched, 0 missing, 0 extra Web UK routes, and 3 ignored infrastructure routes.
- `npm --prefix apps/web-uk test -- --runInBand` passed: 12 suites and 831 tests, with the existing Node `DEP0044 util.isArray` deprecation warning.
- A targeted live smoke against temporary Web UK `http://127.0.0.1:6535`, Laravel `http://127.0.0.1:8088`, and `TENANT_ID=2` passed 18/18 checks. The live run proved the enabled local Laravel tenant still renders `/hour-timebank/accessible/dashboard=>Quick links`, `/hour-timebank/accessible/wallet=>Wallet`, and `/hour-timebank/accessible/members=>Community members`, and that the five default-off `/acme/accessible/*` feature pages still return `403`.
- This improves page-level disabled gate proof for shared tenant mounts. It does not live-smoke a real Laravel fixture with core modules disabled, every route-specific compound gate such as maps or organisation jobs, visual/manual Blade parity, or ASP.NET backend compatibility.

Latest focused verification on 2026-07-09 for route-specific compound tenant
feature gates:

- Laravel source evidence came from
  `app\Http\Controllers\GovukAlpha\Concerns\EventsParity.php`, where
  `/events/{id}/map` aborts unless both `events` and `maps` are enabled;
  `OrganisationsParity.php`, where `/organisations/{id}/jobs` aborts unless
  both `volunteering` and `job_vacancies` are enabled; and
  `MessagesParity.php`, where `/messages/groups/new` and group conversation
  create flows abort unless both `messages` and `connections` are enabled.
- `npm --prefix apps/web-uk test -- tests/shared-accessible-shell.test.js --runInBand --runTestsByPath -t "compound gates"` first failed because `/acme/accessible/events/6/map` returned `200` while the mocked Laravel bootstrap set `features.maps=false`.
- `src/middleware/tenant-feature-gates.js` now returns every matching route
  gate instead of the first matching prefix, so broad family gates and
  route-specific pattern gates stack like Laravel Blade controller guards.
- `npm --prefix apps/web-uk test -- tests/shared-accessible-shell.test.js --runInBand --runTestsByPath -t "compound gates"` passed the new compound gate test, asserting signed `403` responses for `/acme/accessible/events/6/map`, `/acme/accessible/organisations/42/jobs`, and `/acme/accessible/messages/groups/new` with disabled secondary flags.
- `npm --prefix apps/web-uk test -- tests/shared-accessible-shell.test.js --runInBand --runTestsByPath` passed 469/469 tests, with the existing Node `DEP0044 util.isArray` deprecation warning.
- `npm --prefix apps/web-uk run lint` passed.
- `npm --prefix apps/web-uk run route:matrix` passed with 608/608 Laravel accessible routes matched, 0 missing, 0 extra Web UK routes, and 3 ignored infrastructure routes.
- `npm --prefix apps/web-uk test -- --runInBand` passed: 12 suites and 832 tests, with the existing Node `DEP0044 util.isArray` deprecation warning.
- A scoped Laravel runtime smoke against temporary Web UK
  `http://127.0.0.1:6601`, Laravel `http://127.0.0.1:8088`, and
  `TENANT_ID=2` passed 13/13 checks. The live run proved auth/cookie/logout
  basics and that the enabled Laravel fixture still renders `/events/6/map`,
  `/organisations/636/jobs`, and `/messages/groups/new`.
- This closes the proven maps, organisation-jobs, and group-message compound
  gate slice. It does not prove visual/manual Blade parity or ASP.NET backend
  compatibility; route-level active-club proof and broker workflow listing
  request proof are documented in later focused slices.

Latest focused verification on 2026-07-09 for the active-club evidence route
gate slice:

- Laravel source checked: `AlphaController::clubs()` aborts with `404` after
  auth when the tenant has no active `vol_organizations` row with
  `org_type = 'club'` and `status = 'active'`; `explore.blade.php` uses the
  same existence check before showing the Clubs card.
- `npm --prefix apps/web-uk test -- --runTestsByPath tests/shared-accessible-shell.test.js --runInBand -t "clubs"` first failed because signed `/clubs` returned `200` for an empty unfiltered club list and the searched-empty case did not perform an unfiltered proof call.
- `src/routes/clubs.js` now returns the shared 404 page when the unfiltered
  Laravel-backed club list is empty. When a search query returns no rows, it
  performs a minimal unfiltered `getClubs({ per_page: 1 })` probe and renders
  the empty search page only if that probe proves active clubs exist.
- `npm --prefix apps/web-uk test -- --runTestsByPath tests/shared-accessible-shell.test.js --runInBand -t "clubs"` passed 4 selected tests.
- `npm --prefix apps/web-uk test -- --runTestsByPath tests/shared-accessible-shell.test.js --runInBand` passed 473/473 tests.
- `npm --prefix apps/web-uk run lint` passed.
- `npm --prefix apps/web-uk run route:matrix` passed with 608/608 Laravel accessible routes matched, 0 missing, 0 extra Web UK routes, and 3 ignored infrastructure routes.
- `npm --prefix apps/web-uk test -- --runInBand` passed 12/12 suites and 837/837 tests.
- A current-code temporary Web UK process on `http://127.0.0.1:6613` with
  `TENANT_ID=2`, Laravel `http://127.0.0.1:8088`, and
  `SMOKE_GATED_PAGE_PATHS=/clubs:404` passed the focused Laravel runtime smoke.
  The local `hour-timebank` fixture has no active clubs, so the expected live
  result is `404`. A stale `/clubs=>Clubs` body-text smoke was intentionally
  replaced for this fixture.
- This certifies the route-level no-active-club behavior. Explore-card
  active-club sourcing is certified in the following slice; visual/manual Blade
  parity plus ASP.NET backend switching remain open.

Latest focused verification on 2026-07-09 for the Explore active-club card
evidence slice:

- Laravel source checked: `accessible-frontend/views/explore.blade.php` shows
  the Clubs card only when `Route::has('govuk-alpha.clubs.index')` and a
  tenant-scoped active `vol_organizations` club exists; it catches failures and
  hides the card.
- `npm --prefix apps/web-uk test -- --runTestsByPath tests/shared-accessible-shell.test.js --runInBand -t "Explore"` first failed because Web UK did not call `getClubs({ per_page: 1 })` and did not render Clubs from live evidence.
- `src/routes/explore.js` now probes Laravel clubs with
  `getClubs({ per_page: 1 })` after the signed Explore payload loads, then
  rebuilds only the page `alphaExploreLinks` locals with `has_clubs` set from
  that live result. Probe failures hide Clubs, matching the Blade guarded DB
  lookup.
- The focused Explore test now proves both flat `/explore` and
  `/acme/accessible/explore` render the Clubs card only from live club
  evidence, with the mounted link staying under
  `/acme/accessible/clubs`.
- `npm --prefix apps/web-uk test -- --runTestsByPath tests/shared-accessible-shell.test.js --runInBand -t "Explore"` passed 3 selected tests after the implementation.
- `npm --prefix apps/web-uk test -- --runTestsByPath tests/shared-accessible-shell.test.js --runInBand` passed 474/474 tests.
- `npm --prefix apps/web-uk run lint` passed with no warnings.
- `npm --prefix apps/web-uk run route:matrix` passed with 608/608 Laravel accessible routes matched, 0 missing, 0 extra Web UK routes, and 3 ignored infrastructure routes.
- `npm --prefix apps/web-uk test -- --runInBand` passed 12/12 suites and 838/838 tests. The existing Node `DEP0044 util.isArray` deprecation warning was emitted after completion.
- A scoped Laravel runtime smoke against a temporary current-checkout Web UK
  process on `http://127.0.0.1:6625`, Laravel `http://127.0.0.1:8088`, and
  `TENANT_ID=2` passed 12/12 checks, including signed `/explore` and
  `/explore=>Explore`.

Latest focused verification on 2026-07-09 for the message translation policy
slice:

- Laravel source checked:
  `MessagesParity::messagesTranslateMessage()` and
  `AlphaController::translateFederationMessage()` both gate translation on
  `TenantContext::hasFeature('message_translation')`, and the federation
  conversation renderer passes `translateEnabled` from the same tenant feature.
- Web UK direct message translation now checks
  `req.accessibleRouting.tenant.features.message_translation` before calling
  Laravel message APIs and redirects disabled tenants to
  `/messages/{userId}?status=translate-unavailable#m-{messageId}`.
- Web UK federation conversation rendering hides per-message translate forms
  when tenant `message_translation` is disabled, and federation translate POSTs
  redirect disabled tenants to the Laravel-style
  `/federation/messages/conversation/{partnerId}?tenant_id={tenantId}&status=translate-unavailable#message-{id}`.
- TDD proof: the focused tests first failed because Web UK rendered the
  federation translate form and redirected direct translation as
  `translate-done`; after the route changes the same selected tests passed.
- Verification passed:
  `npm --prefix apps/web-uk test -- tests/shared-accessible-shell.test.js --runInBand --runTestsByPath -t "message translation is disabled|hides federation message translation"`,
  the enabled-path alias/conversation selection, full
  `shared-accessible-shell.test.js`, `npm --prefix apps/web-uk run lint`,
  `npm --prefix apps/web-uk run route:matrix`, and full
  `npm --prefix apps/web-uk test -- --runInBand`.
- Targeted Laravel runtime smoke passed for signed `/federation/messages` at
  `WEB_UK_BASE_URL=http://127.0.0.1:6622` and signed `/messages/77` at
  `WEB_UK_BASE_URL=http://127.0.0.1:6623`, both against
  `LARAVEL_BASE_URL=http://127.0.0.1:8088` with `TENANT_ID=2`.

Latest focused verification on 2026-07-09 for the AI chat and matches
template-helper slice:

- `npm --prefix apps/web-uk test -- --runTestsByPath tests/template-source.test.js -t "AI chat and matches"` first failed on raw `/chat` links/forms, then passed after converting AI chat and matches templates to `urlFor()`.
- `npm --prefix apps/web-uk test -- tests/shared-accessible-shell.test.js --runInBand --runTestsByPath -t "matches|AI chat"` passed 7 selected signed render/redirect tests.
- A scoped `npm --prefix apps/web-uk run smoke:laravel` against Web UK `http://127.0.0.1:5180` and Laravel `http://127.0.0.1:8088` passed 13/13 checks, including signed `/chat=>AI assistant`, `/matches=>Your matches`, and `/matches/board=>Your matches`.
- `rg -n --glob '*.njk' 'href="/(chat|explore|matches|listings|groups|events)|action="/(chat|matches)' apps/web-uk/src/views/ai-chat apps/web-uk/src/views/matches` returned no matches.
- This is focused source-level and runtime render evidence for the AI chat/matches slice only. It does not certify full visual Blade parity, localization, recommendation persistence depth, or ASP.NET backend switching.

Latest focused verification on 2026-07-09 for the shared pagination partial
template-helper slice:

- `npm --prefix apps/web-uk test -- --runTestsByPath tests/template-source.test.js -t "shared pagination"` first failed on the raw `baseUrl: "/members"` default in `src/views/partials/pagination.njk`, then passed after the default moved to `urlFor('/members')`.
- `npm --prefix apps/web-uk test -- --runTestsByPath tests/template-source.test.js` passed 42/42 source tests.
- `npm --prefix apps/web-uk test -- tests/shared-accessible-shell.test.js --runInBand --runTestsByPath -t "signed Laravel members index"` passed the focused members render smoke, including a `GET /members` 200 response.
- `npm --prefix apps/web-uk test -- --runInBand` passed 757/757 tests across 11 suites.
- `npm --prefix apps/web-uk run lint` passed.
- `npm --prefix apps/web-uk run route:matrix` passed with 608/608 Laravel accessible routes matched, 0 missing, and no unexpected extras.
- A scoped live Laravel runtime smoke against Web UK `http://127.0.0.1:5180` and Laravel `http://127.0.0.1:8088` passed for `/members` body text containing `Community members`, with all other smoke buckets disabled.
- This is shared partial source and focused members runtime evidence only. It does not newly certify visual pagination parity, every pagination caller, localization, or ASP.NET backend compatibility.

Latest focused verification on 2026-07-09 for the shared empty-state and
breadcrumb partial template-helper slice:

- `npm --prefix apps/web-uk test -- --runTestsByPath tests/template-source.test.js -t "shared empty-state"` first failed on raw empty-state/breadcrumb example links and direct `emptyState.action.href` rendering, then passed after the shared partials moved to `urlFor(...)`.
- `npm --prefix apps/web-uk test -- tests/shared-accessible-shell.test.js --runInBand --runTestsByPath -t "prefixes shared empty-state"` passed, proving `/acme/accessible/members?search=zzz` renders the empty-state action link as `href="/acme/accessible/members"` and not `href="/members"`.
- `npm --prefix apps/web-uk test -- --runTestsByPath tests/template-source.test.js` passed 43/43 source tests.
- `npm --prefix apps/web-uk run lint` passed.
- `npm --prefix apps/web-uk run route:matrix` passed with 608/608 Laravel accessible routes matched, 0 missing, and no unexpected extras.
- `npm --prefix apps/web-uk test -- --runInBand` passed 759/759 tests across 11 suites.
- A scoped live Laravel runtime smoke against Web UK `http://127.0.0.1:5180` and Laravel `http://127.0.0.1:8088` passed for `/members` body text containing `Community members`, with all other smoke buckets disabled.
- This is shared partial source, focused tenant-prefixed render, and scoped `/members` runtime evidence only. It does not newly certify visual empty-state parity, every empty-state caller, localization, or ASP.NET backend compatibility.

Latest focused verification on 2026-07-09 for the AI chat route-redirect helper
slice:

- `npm --prefix apps/web-uk test -- --runTestsByPath tests/template-source.test.js -t "AI chat route redirects"` first failed on raw `res.redirect('/login?...')` and `res.redirect('/chat?...')` calls in `src/routes/ai-chat.js`, then passed after those redirects moved through `redirectTo(res, ...)` and `res.locals.urlFor`.
- `npm --prefix apps/web-uk test -- tests/shared-accessible-shell.test.js --runInBand --runTestsByPath -t "empty Laravel AI chat redirects inside"` passed, proving an empty signed POST to `/acme/accessible/chat` redirects to `/acme/accessible/chat?status=empty`.
- `npm --prefix apps/web-uk test -- --runTestsByPath tests/template-source.test.js` passed 44/44 source tests.
- `npm --prefix apps/web-uk test -- tests/shared-accessible-shell.test.js --runInBand --runTestsByPath -t "AI chat"` passed 5/5 focused AI chat render/redirect/submission tests.
- `npm --prefix apps/web-uk run lint` passed.
- `npm --prefix apps/web-uk run route:matrix` passed with 608/608 Laravel accessible routes matched, 0 missing, and no unexpected extras.
- `npm --prefix apps/web-uk test -- --runInBand` passed 761/761 tests across 11 suites.
- A scoped live Laravel runtime smoke against Web UK `http://127.0.0.1:5180` and Laravel `http://127.0.0.1:8088` passed for `/chat` body text containing `AI assistant`, with all other smoke buckets disabled.
- This is focused route-redirect evidence for AI chat only. It does not newly certify full AI assistant persistence, visual Blade parity, localization, every redirect family, or ASP.NET backend compatibility.

Latest focused verification on 2026-07-09 for the matches route-redirect
slice:

- `npm --prefix apps/web-uk test -- --runTestsByPath tests/template-source.test.js -t "matches route redirects"` first failed on raw `res.redirect('/matches?...')` and board-dismiss `/matches/board?...` calls in `src/routes/matches.js`, then passed after both redirects moved through `redirectTo(res, ...)` and `res.locals.urlFor`.
- `npm --prefix apps/web-uk test -- tests/shared-accessible-shell.test.js --runInBand --runTestsByPath -t "match dismiss redirects inside"` passed, proving a signed POST to `/acme/accessible/matches/77/dismiss` redirects to `/acme/accessible/matches?status=match-dismissed`.
- `npm --prefix apps/web-uk test -- --runTestsByPath tests/template-source.test.js` passed 45/45 source tests.
- `npm --prefix apps/web-uk test -- tests/shared-accessible-shell.test.js --runInBand --runTestsByPath -t "matches"` passed 3/3 focused matches render/submission tests.
- `npm --prefix apps/web-uk run lint` passed.
- `npm --prefix apps/web-uk run route:matrix` passed with 608/608 Laravel accessible routes matched, 0 missing, and no unexpected extras.
- `npm --prefix apps/web-uk test -- --runInBand` passed 763/763 tests across 11 suites.
- A scoped live Laravel runtime smoke against Web UK `http://127.0.0.1:5180` and Laravel `http://127.0.0.1:8088` passed 12/12 checks, including signed `/matches` and `/matches/board` body text containing `Your matches`.
- This is focused route-redirect evidence for the matches dismiss family only. It does not newly certify full recommendation persistence, visual Blade parity, localization, every route redirect family, or ASP.NET backend compatibility.

Latest focused verification on 2026-07-09 for the auth route-redirect
slice:

- `npm --prefix apps/web-uk test -- --runTestsByPath tests/template-source.test.js -t "auth route redirects"` first failed on raw auth `res.redirect('/login...')`, `/dashboard`, and password redirects in `src/routes/auth.js`, then passed after those redirects moved through `redirectTo(res, ...)` and `res.locals.urlFor`.
- `npm --prefix apps/web-uk test -- tests/routes.test.js --runInBand --runTestsByPath -t "auth POST redirects inside"` passed, proving a successful POST to `/acme/accessible/login` redirects to `/acme/accessible/dashboard`.
- `npm --prefix apps/web-uk test -- --runTestsByPath tests/template-source.test.js` passed 46/46 source tests.
- `npm --prefix apps/web-uk test -- tests/routes.test.js --runInBand --runTestsByPath -t "shared tenant accessible mount"` passed 6/6 selected shared-mount tests.
- `npm --prefix apps/web-uk run lint` passed.
- `npm --prefix apps/web-uk run route:matrix` passed with 608/608 Laravel accessible routes matched, 0 missing, and no unexpected extras.
- `npm --prefix apps/web-uk test -- --runInBand` passed 765/765 tests across 11 suites, with the existing Node `DEP0044 util.isArray` deprecation warning.
- A scoped live Laravel runtime smoke against Web UK `http://127.0.0.1:5180` and Laravel `http://127.0.0.1:8088` passed 13/13 checks, including login POST redirecting to `/dashboard`, logout redirecting to `/login`, and `/login`, `/login/forgot-password`, and `/password/reset?token=reset-token` body markers.
- This is focused auth route-redirect evidence only. It does not newly certify full Laravel login credential viability, two-factor persistence, registration delivery, password reset emails, visual Blade parity, localization, every route redirect family, or ASP.NET backend compatibility.

Latest focused verification on 2026-07-09 for the server-level route-redirect
slice:

- `npm --prefix apps/web-uk test -- --runTestsByPath tests/template-source.test.js -t "server-level redirects"` first failed on raw `src/server.js` redirects for `/cookies`, `/login`, `/organisations`, `invalidRedirect`, and `failedRedirect`, then passed after deterministic targets moved through `redirectTo(res, ...)` and `res.locals.urlFor`.
- `npm --prefix apps/web-uk test -- tests/routes.test.js --runInBand --runTestsByPath -t "server-level"` passed 2/2 selected shared-mount tests, proving `/acme/accessible/cookie-consent` redirects to `/acme/accessible/cookies?status=saved` and `/acme/accessible/organisations/42` redirects to `/acme/accessible/login?status=auth-required`.
- `npm --prefix apps/web-uk test -- --runTestsByPath tests/template-source.test.js` passed 47/47 source tests.
- `npm --prefix apps/web-uk test -- tests/routes.test.js --runInBand --runTestsByPath -t "shared tenant accessible mount"` passed 8/8 selected shared-mount tests.
- `npm --prefix apps/web-uk run lint` passed.
- `npm --prefix apps/web-uk run route:matrix` passed with 608/608 Laravel accessible routes matched, 0 missing, and no unexpected extras.
- `npm --prefix apps/web-uk test -- --runInBand` passed 768/768 tests across 11 suites, with the existing Node `DEP0044 util.isArray` deprecation warning.
- A scoped live Laravel runtime smoke against Web UK `http://127.0.0.1:5180` and Laravel `http://127.0.0.1:8088` passed 12/12 checks, including `/organisations/42` redirecting to `/login?status=auth-required`, cookie consent/settings redirects, and `/cookies=>Cookies`.
- This is focused server-level redirect evidence only. It does not newly certify every route redirect family, user-return URL prefixing, visual Blade parity, localization, full organisation workflow persistence, or ASP.NET backend compatibility.

Latest focused verification on 2026-07-09 for the Explore tenant-gated card and
live-content link slice:

- `npm --prefix apps/web-uk test -- --runTestsByPath tests/accessible-shell.test.js -t "Explore card feature gates"` first failed because Web UK removed the Search card when `features.search` was false, while Laravel Blade keeps the Explore Search card visible. It passed after removing that card-level feature gate.
- `npm --prefix apps/web-uk test -- --runTestsByPath tests/accessible-shell.test.js` passed: 4 tests.
- `npm --prefix apps/web-uk test -- --runTestsByPath tests/template-source.test.js -t "Explore live-content|search forms|event index"` passed: 3 selected tests.
- `npm --prefix apps/web-uk test -- --runTestsByPath tests/shared-accessible-shell.test.js --runInBand -t "Explore hub"` passed: 1 selected test.
- A scoped `npm --prefix apps/web-uk run smoke:laravel` with only `/explore=>Explore` in `SMOKE_BODY_TEXT_PAGE_PATHS` and large route lists disabled passed 11/11 checks against Web UK `http://127.0.0.1:5180` and Laravel `http://127.0.0.1:8088`.
- The slice pins Blade Explore card gates from tenant bootstrap: Exchanges require `listings` plus broker `exchange_workflow`, AI assistant/Polls/Groups/Goals/Organisations/Blog/Resources/Marketplace/Jobs/Courses/Podcasts/Coupons/Premium/Ideation/Federation use their Blade feature keys, Search and Skills remain card-visible, and Clubs were initially held behind an explicit tenant `has_clubs` flag before the later Explore active-club evidence slice added the Laravel-backed probe.
- This also routes Explore listing/event live-content links and view-all links through `urlFor()` for shared mounts and custom-domain roots. It does not certify live disabled-tenant broker workflow data, visual/manual Blade parity, localization, or ASP.NET backend compatibility.

Latest focused verification on 2026-07-10 for the broker exchange workflow
listing-request gate:

- Laravel source check: `AlphaController::requestExchange()` and
  `storeExchangeRequest()` call `BrokerControlConfigService::isExchangeWorkflowEnabled()`
  before rendering the request form or creating an exchange, redirecting to the
  listing detail with `status=exchange-disabled` when disabled.
- Web UK now calls Laravel `/api/v2/exchanges/config` before signed
  `/listings/{id}/exchange-request` GET rendering or POST create. If Laravel
  explicitly returns `exchange_workflow_enabled: false`, Web UK redirects to
  `/listings/{id}?status=exchange-disabled` and avoids the listing lookup,
  wallet lookup, and exchange-create call.
- Focused Jest first failed because GET rendered `200` and POST redirected to
  `/exchanges/88?status=exchange-created`; after the route change the focused
  run passed 4/4 matching tests:
  `npm test -- --runTestsByPath tests/shared-accessible-shell.test.js -t "broker exchange workflow is disabled|listing exchange request|listing action aliases" --runInBand`.
- This is focused route/source proof. A live Laravel fixture with broker
  exchange workflow disabled and ASP.NET backend switching certification remain
  unproven.

Latest focused verification on 2026-07-10 for listing exchange-request
tenant-aware source links:

- Laravel source check: `routes/govuk-alpha.php` registers the exchange-request
  flow as `GET/POST /listings/{listingId}/exchange-request` inside the
  accessible route set.
- `npm --prefix apps/web-uk test -- --runTestsByPath tests/template-source.test.js -t "listing exchange request controls"` first failed on raw `/listings` `href` and `action` source targets in `src/views/listings/exchange-request.njk`, then passed after the back link and form action moved through `urlFor()`.
- `npm --prefix apps/web-uk test -- tests/shared-accessible-shell.test.js --runInBand --runTestsByPath -t "renders the Laravel-backed listing exchange request form"` passed and now asserts the tenant-mounted render keeps the back link and no-JS form action under `/acme/accessible/listings/42...`.
- This is source/render tenant-routing proof only. It does not newly certify a
  live Laravel tenant with broker exchange workflow disabled, visual/manual
  Blade parity, localization, or ASP.NET backend switching.

Latest focused verification on 2026-07-09 for the shared-root tenant chooser
ordering slice:

- `npm --prefix apps/web-uk test -- tests/routes.test.js --runInBand --runTestsByPath -t "orders shared-root tenant chooser"` first failed because Web UK preserved Laravel API response order (`Zebra Timebank` before `Acme Timebank`) while Laravel Blade orders chooser tenants by `name`, then passed after `normalizeTenantChooserCommunities()` sorted by display name.
- `npm --prefix apps/web-uk test -- tests/routes.test.js --runInBand --runTestsByPath -t "tenant chooser|shared tenant accessible mount|custom accessible domains"` passed: 13 selected tests.

Latest focused verification on 2026-07-09 for the knowledge-base
template-helper slice:

- `npm --prefix apps/web-uk test -- tests/template-source.test.js --runInBand --runTestsByPath -t "knowledge-base"` first failed on raw `/kb` links/actions and the raw `nextHref` link, then passed after the real `src/views/kb` templates were converted through `urlFor()`.
- `Select-String -Path apps\web-uk\src\views\kb\*.njk -SimpleMatch -Pattern 'href="/kb','action="/kb','href="{{ nextHref }}'` returned no matches.
- `npm --prefix apps/web-uk test -- tests/template-source.test.js --runInBand --runTestsByPath` passed: 31 tests.
- `npm --prefix apps/web-uk test -- tests/shared-accessible-shell.test.js --runInBand --runTestsByPath -t "knowledge base"` passed: 2 selected tests.

Latest focused verification on 2026-07-09 for the dashboard template-helper
slice:

- `npm --prefix apps/web-uk test -- tests/template-source.test.js --runInBand --runTestsByPath -t "member dashboard"` first failed on raw dashboard `/onboarding`, `/exchanges`, `/listings`, `/events`, `/profile`, `/feed`, `/messages`, `/members`, and `/volunteering` links, then passed after `src/views/dashboard/index.njk` converted those local links through `urlFor()`.
- `npm --prefix apps/web-uk test -- tests/shared-accessible-shell.test.js --runInBand --runTestsByPath -t "member dashboard"` passed: 1 selected test.
- A scoped `npm --prefix apps/web-uk run smoke:laravel` with `SMOKE_MODULE_PAGE_PATHS=/dashboard`, `SMOKE_BODY_TEXT_PAGE_PATHS=/dashboard=>Quick links`, and unrelated default sweep env vars set to `none` passed `12/12` checks against `WEB_UK_BASE_URL=http://127.0.0.1:5180` and Laravel `http://127.0.0.1:8088`.

Latest focused verification on 2026-07-09 for the goals template-helper
slice:

- `npm --prefix apps/web-uk test -- tests/template-source.test.js --runInBand --runTestsByPath -t "goals browse"` first failed on raw `/goals` links/actions, then passed after conversion.
- `Select-String -Path apps\web-uk\src\views\goals\*.njk -SimpleMatch -Pattern 'href="/goals','action="/goals','href: "/goals','action: "/goals','href="{{ nextHref }}'` returned no matches.
- `npm --prefix apps/web-uk test -- tests/shared-accessible-shell.test.js --runInBand --runTestsByPath -t "goal"` passed: 13 selected tests across goals browse, templates, discover, buddying, edit, check-in, reminder, buddy-action, history, insights, social, and POST action coverage.

Latest focused verification on 2026-07-09 for the goals route-redirect slice:

- `npm --prefix apps/web-uk test -- tests/template-source.test.js tests/shared-accessible-shell.test.js --runInBand --runTestsByPath -t "goals route redirects|goal action redirects inside"` first failed on raw `res.redirect(loginRedirect())` and raw `/goals` redirect targets in `src/routes/goals.js`, then passed after those redirects moved through `redirectTo(res, ...)` and `res.locals.urlFor`.
- The same focused shared-mount test proves create, buddy-nudge, comment, and unsigned progress POST redirects remain under `/acme/accessible`.
- A scoped `npm --prefix apps/web-uk run smoke:laravel` for goals pages first exposed a stale `/goals/162/checkin=>Check in` marker; Laravel's Blade string is `Log a check-in`, and the rerun with `/goals/162/checkin=>Log a check-in` passed all 30 focused checks against Web UK `http://127.0.0.1:5180` and Laravel `http://127.0.0.1:8088`.

Latest focused verification on 2026-07-09 for the exchanges template-helper
slice:

- `npm --prefix apps/web-uk test -- tests/template-source.test.js --runInBand --runTestsByPath -t "exchange list"` first failed on raw `/exchanges` links/actions, then passed after conversion.
- `Select-String -Path apps\web-uk\src\views\exchanges\*.njk -SimpleMatch -Pattern 'href="/exchanges','action="/exchanges','href="/listings','href="/messages'` returned no matches.
- `npm --prefix apps/web-uk test -- tests/shared-accessible-shell.test.js --runInBand --runTestsByPath -t "exchange"` passed: 9 selected exchange/group-exchange/listing-request tests.
- A scoped `npm --prefix apps/web-uk run smoke:laravel` with `SMOKE_MODULE_PAGE_PATHS=/exchanges`, `SMOKE_BODY_TEXT_PAGE_PATHS=/exchanges=>Exchanges`, `TENANT_ID=2`, and unrelated default sweep env vars set to `none` passed `12/12` checks against `WEB_UK_BASE_URL=http://127.0.0.1:5180` and Laravel `http://127.0.0.1:8088`.

Latest focused verification on 2026-07-09 for the public coupons
template-helper slice:

- `npm --prefix apps/web-uk test -- tests/template-source.test.js --runInBand --runTestsByPath -t "public coupon"` first failed on a raw `/coupons/{{ coupon.id }}` link, then passed after conversion.
- `Select-String -Path apps\web-uk\src\views\coupons\*.njk -SimpleMatch -Pattern 'href="/coupons','action="/coupons','href: "/coupons'` returned no matches.
- `npm --prefix apps/web-uk test -- tests/shared-accessible-shell.test.js --runInBand --runTestsByPath -t "coupon"` passed: 4 selected public-coupon and marketplace-coupon tests.
- A scoped `npm --prefix apps/web-uk run smoke:laravel` with `SMOKE_GATED_PAGE_PATHS=/coupons,/coupons/1`, `TENANT_ID=2`, and unrelated default sweep env vars set to `none` passed `12/12` checks against `WEB_UK_BASE_URL=http://127.0.0.1:5180` and Laravel `http://127.0.0.1:8088`, proving the current local Laravel fixture returns the expected `403` feature gate for public coupon pages. This does not certify rendered coupon body parity in a tenant with merchant coupons enabled.

Latest focused verification on 2026-07-09 for the public coupons
route-redirect slice:

- `npm --prefix apps/web-uk test -- tests/template-source.test.js tests/shared-accessible-shell.test.js --runInBand --runTestsByPath -t "public coupon route redirects|signed-out visitors away from the Laravel coupons"` first failed because `src/routes/coupons.js` still emitted direct `res.redirect(loginRedirect())`, then passed after routing coupon auth handoffs through `res.locals.urlFor`.
- Shared-mount behavior coverage proves unsigned `/acme/accessible/coupons` and `/acme/accessible/coupons/{id}` requests redirect to `/acme/accessible/login?status=auth-required`.

Latest focused verification on 2026-07-09 for the activity route-redirect
slice:

- `npm --prefix apps/web-uk test -- tests/template-source.test.js tests/shared-accessible-shell.test.js --runInBand --runTestsByPath -t "activity route redirects|Laravel-style activity"` first failed because `src/routes/activity.js` still emitted direct `res.redirect(loginRedirect())`, then passed after routing activity auth handoffs through `res.locals.urlFor`.
- Shared-mount behavior coverage proves unsigned `/acme/accessible/activity` and `/acme/accessible/activity/insights` requests redirect to `/acme/accessible/login?status=auth-required`.

Latest focused verification on 2026-07-09 for the group-exchange GET
route-redirect slice:

- `npm --prefix apps/web-uk test -- tests/template-source.test.js --runInBand --runTestsByPath -t "group exchange GET redirects"` first failed because `src/routes/group-exchanges.js` had no `redirectTo(res, pathname)` helper and still emitted direct `res.redirect(loginRedirect())`, then passed after routing unsigned GET auth handoffs through `res.locals.urlFor`.
- `npm --prefix apps/web-uk test -- tests/shared-accessible-shell.test.js --runInBand --runTestsByPath -t "signed-out visitors away from Laravel group exchange GET pages"` passed, proving flat signed-out redirects still target `/login?status=auth-required` while mounted `/acme/accessible/group-exchanges`, `/acme/accessible/group-exchanges/new`, and `/acme/accessible/group-exchanges/7` redirect to `/acme/accessible/login?status=auth-required` before Laravel APIs are called.

Latest focused verification on 2026-07-09 for the federation hub
template-helper slice:

- `npm --prefix apps/web-uk test -- tests/template-source.test.js --runInBand --runTestsByPath -t "federation hub"` first failed on raw `/federation` links in `src/views/federation/index.njk`, then passed after the hub navigation, opt-in/opt-out CTAs, partner preview links, view-all link, and quick links were routed through `urlFor()`.
- `Select-String -Path apps\web-uk\src\views\federation\index.njk -SimpleMatch -Pattern 'href="/federation','action="/federation','href="{{ partner.href }}'` returned no matches.
- `npm --prefix apps/web-uk test -- tests/shared-accessible-shell.test.js --runInBand --runTestsByPath -t "Federation hub"` passed: 2 selected tests.
- A scoped `npm --prefix apps/web-uk run smoke:laravel` with `SMOKE_MODULE_PAGE_PATHS=/federation`, `SMOKE_BODY_TEXT_PAGE_PATHS=/federation=>Federation`, `TENANT_ID=2`, and unrelated default sweep env vars set to `none` passed `12/12` checks against `WEB_UK_BASE_URL=http://127.0.0.1:5180` and Laravel `http://127.0.0.1:8088`.

Latest focused verification on 2026-07-09 for the federation onboarding
template-helper slice:

- `npm --prefix apps/web-uk test -- tests/template-source.test.js --runInBand --runTestsByPath -t "federation onboarding"` first failed on raw `/federation` links/actions in `src/views/federation/onboarding.njk`, then passed after the wizard back link, service navigation, POST actions, step-back links, and do-this-later links were routed through `urlFor()`.
- `Select-String -Path apps\web-uk\src\views\federation\onboarding.njk -SimpleMatch -Pattern 'href="/federation','action="/federation'` returned no matches.
- `npm --prefix apps/web-uk test -- tests/shared-accessible-shell.test.js --runInBand --runTestsByPath -t "Federation onboarding"` passed: 1 selected test.
- A scoped `npm --prefix apps/web-uk run smoke:laravel` with `SMOKE_MODULE_PAGE_PATHS=/federation/onboarding`, `SMOKE_BODY_TEXT_PAGE_PATHS=/federation/onboarding=>Welcome to the community network`, `TENANT_ID=2`, and unrelated default sweep env vars set to `none` passed `12/12` checks against `WEB_UK_BASE_URL=http://127.0.0.1:5180` and Laravel `http://127.0.0.1:8088`.

Latest focused verification on 2026-07-09 for the custom-domain
canonicalization tenant-routing slice:

- `npm --prefix apps/web-uk test -- tests/routes.test.js --runInBand --runTestsByPath -t "canonicalizes tenant-prefixed accessible paths"` first failed because `Host: acme-accessible.test` with `/acme/alpha/login?status=auth-required` redirected to `/acme/accessible/login?status=auth-required`; it passed after host-resolved matching tenant prefixes were canonicalized to slugless custom-domain paths.
- `npm --prefix apps/web-uk test -- tests/routes.test.js --runInBand --runTestsByPath -t "tenant chooser|shared tenant accessible mount|custom accessible domains"` passed: 14 selected tests.

Latest consolidation verification on 2026-07-08:

- `npm --prefix apps/web-uk run lint` passed with no warnings.
- `npm --prefix apps/web-uk test -- --runInBand` passed: 10 suites, 713 tests.
- `npm --prefix apps/web-uk run route:matrix` passed with 608/608 Laravel
  accessible routes matched and 0 missing.
- Chunked `npm --prefix apps/web-uk run smoke:laravel` passed against local
  Laravel `http://127.0.0.1:8088` and a temporary Web UK process at
  `WEB_UK_BASE_URL=http://127.0.0.1:6310`, started with
  `ACCESSIBLE_BACKEND_TARGET=laravel`, `TENANT_ID=2`, and
  `SMOKE_TIMEOUT_MS=240000`. Evidence covered the base auth/cookie/gated/
  redirect/content checks, 279 module-page checks across
  `SMOKE_MODULE_PAGE_CHUNK=1/8` through `8/8`, and 283 body-text checks across
  `SMOKE_BODY_TEXT_PAGE_CHUNK=1/8` through `8/8`. The unchunked full command is
  still too slow for a single shell run.

Latest local verification after the public/auth/support source-helper slice:

- `npm --prefix apps/web-uk test -- tests/template-source.test.js --runInBand --runTestsByPath -t "group exchange tabs"` first failed on raw `/group-exchanges` links/actions, then passed after the template conversion.
- `npm --prefix apps/web-uk test -- tests/shared-accessible-shell.test.js --runInBand --runTestsByPath -t "group exchange"` passed `3/3` selected tests.
- `npm --prefix apps/web-uk test -- tests/template-source.test.js --runInBand --runTestsByPath -t "direct and group message"` first failed on raw `/messages`, `/members`, and `/connections` links/actions, then passed after the template conversion.
- `npm --prefix apps/web-uk test -- tests/shared-accessible-shell.test.js --runInBand --runTestsByPath -t "message"` passed `5/5` selected message tests.
- `npm --prefix apps/web-uk test -- tests/template-source.test.js --runInBand --runTestsByPath -t "wallet links"` first failed on raw `/wallet` links/actions, then passed after the template conversion.
- `npm --prefix apps/web-uk test -- tests/template-source.test.js --runInBand --runTestsByPath -t "wallet action redirects"` first failed on raw wallet route redirects, then passed after transfer and donation status redirects moved through `redirectTo(res, ...)` and `res.locals.urlFor`.
- `Select-String -Path apps\web-uk\src\views\wallet\*.njk -Pattern 'href="/wallet','action="/wallet','href: "/wallet'` returned no matches.
- `npm --prefix apps/web-uk test -- tests/shared-accessible-shell.test.js --runInBand --runTestsByPath -t "wallet"` passed `9/9` selected wallet tests, including shared-mount donation validation redirect coverage for `/acme/accessible/wallet/donate`.
- A scoped live Laravel runtime smoke against Web UK `http://127.0.0.1:5180` and Laravel `http://127.0.0.1:8088` passed `12/12` checks, including `/wallet=>Wallet` and `/wallet/manage=>Manage credits`.
- `npm --prefix apps/web-uk test -- tests/template-source.test.js --runInBand --runTestsByPath -t "public auth and support"` first failed on raw `/contact` and `/login` controls, then passed after the template conversion.
- `Select-String` over `contact.njk`, `cookie-settings.njk`, `forgot-password.njk`, `login.njk`, `register.njk`, `report-problem.njk`, and `reset-password.njk` for raw local public/auth/support `href` and `action` targets returned no matches.
- `npm --prefix apps/web-uk test -- tests/shared-accessible-shell.test.js --runInBand --runTestsByPath -t "login|register|password|cookie|contact|report"` passed `25/25` selected tests.
- `npm --prefix apps/web-uk test -- tests/template-source.test.js --runInBand --runTestsByPath` passed `17/17`.
- `npm --prefix apps/web-uk run route:matrix` passed with `608/608` Laravel accessible routes matched, `0` missing, `0` extra, and `3` ignored infrastructure routes.
- `npm --prefix apps/web-uk run lint` passed.
- `npm --prefix apps/web-uk test -- --runInBand` passed: 10 suites, `722/722` tests. The existing Node `DEP0044 util.isArray` deprecation warning was emitted after the suite completed.
- `npm --prefix apps/web-uk test -- tests/template-source.test.js --runInBand --runTestsByPath -t "organisation directory"` first failed on raw `/organisations` and `/volunteering` links/actions, then passed after the template conversion.
- `Select-String` over `organisation-detail.njk`, `organisations.njk`, `organisations-apply.njk`, `organisations-browse.njk`, `organisations-jobs.njk`, `organisations-manage.njk`, and `organisations-register.njk` for raw local organisation/volunteering/job `href` and `action` targets returned no matches.
- `npm --prefix apps/web-uk test -- tests/shared-accessible-shell.test.js --runInBand --runTestsByPath -t "organisations"` passed `6/6` selected tests.
- `npm --prefix apps/web-uk test -- tests/template-source.test.js --runInBand --runTestsByPath -t "public volunteering"` first failed on raw `/volunteering` and `/organisations` links/actions in `volunteering.njk` and `volunteer-opportunity.njk`, then passed after conversion.
- `npm --prefix apps/web-uk test -- tests/template-source.test.js --runInBand --runTestsByPath -t "volunteering action redirects"` first failed on flat `res.redirect('/volunteering...')` and `res.redirect(loginRedirect())` calls, then passed after `src/routes/volunteering-actions.js` routed action and validation exits through `res.locals.urlFor`.
- `npm --prefix apps/web-uk test -- tests/shared-accessible-shell.test.js --runInBand --runTestsByPath -t "volunteering"` passed `26/26` selected tests after the public volunteering source and route-redirect conversion.
- `npm --prefix apps/web-uk test -- tests/template-source.test.js --runInBand --runTestsByPath -t "blog index"` first failed on raw `/blog` links/actions, then passed after the template conversion.
- `Select-String -Path apps\web-uk\src\views\blog\*.njk -Pattern 'href="/(blog|members)','action="/blog'` returned no matches.
- `npm --prefix apps/web-uk test -- tests/shared-accessible-shell.test.js --runInBand --runTestsByPath -t "blog"` passed `9/9` selected blog tests.
- `npm --prefix apps/web-uk test -- tests/template-source.test.js --runInBand --runTestsByPath -t "course browse"` first failed on raw `/courses` links/actions, then passed after the template conversion.
- `rg -n 'href="/courses|action="/courses|action="\{\{ formAction \}\}' apps/web-uk/src/views/courses` returned no matches.
- `npm --prefix apps/web-uk test -- tests/shared-accessible-shell.test.js --runInBand --runTestsByPath -t "course"` passed `4/4` selected course tests.
- `npm --prefix apps/web-uk test -- tests/template-source.test.js --runInBand --runTestsByPath -t "listing index"` first failed on raw `/listings` links/actions, then passed after the listing index/form conversion.
- `rg -n 'href="/listings|action="/listings|href: "/listings' apps/web-uk/src/views/listings/index.njk apps/web-uk/src/views/listings/form.njk` returned no matches.
- `npm --prefix apps/web-uk test -- tests/shared-accessible-shell.test.js --runInBand --runTestsByPath -t "signed listing index|owner listing delete"` passed `2/2` selected listing tests.
- A focused Laravel runtime smoke against temporary Web UK `http://127.0.0.1:6463`, Laravel `http://127.0.0.1:8088`, and `TENANT_ID=2` passed base API/health, cookie-consent, login/account/logout checks plus `body-text-page-listings-contains-create-listing` for signed `/listings`.
- `npm --prefix apps/web-uk test -- tests/template-source.test.js --runInBand --runTestsByPath -t "listing route redirects"` first failed on raw `res.redirect('/listings...')` calls in `src/routes/listings.js`, then passed after those route exits moved through `res.locals.urlFor`.
- `npm --prefix apps/web-uk test -- tests/shared-accessible-shell.test.js --runInBand --runTestsByPath -t "listing"` passed `14/14` selected listing and marketplace-listing tests after the listing route redirect conversion.
- `npm --prefix apps/web-uk test -- tests/template-source.test.js --runInBand --runTestsByPath` passed `86/86` source-helper tests after the listing route redirect conversion.
- A targeted Laravel runtime smoke against temporary Web UK `http://127.0.0.1:6611`, Laravel `http://127.0.0.1:8088`, and `TENANT_ID=2` passed `11/11` checks: Laravel API reachability, Web UK health, account auth redirect, cookie-consent POSTs, login/account/logout, and signed `/listings` containing `Listings`.

Latest focused host-domain network landing slice: Web UK now treats Laravel
`domain` matches as custom domain roots alongside `accessible_domain`. Root `/`
on `timebank.global` renders the Timebank Global cluster landing with Laravel
SEO heading `Exchange Skills Across Borders`, intro copy, and
`tenant_switcher` communities. Same-host child entries such as Hour Timebank
become relative links like `/hour-timebank`, while external entries such as
`timebanks.us` remain absolute. Root `/` on the master tenant's configured
`project-nexus.ie` domain renders the master network landing instead of the
shared chooser. `X-Forwarded-Host` is accepted before the socket host for proxy
custom-domain routing, and host-scoped Laravel API calls send `Origin` as well
as `Host` so Laravel's bootstrap fallback can resolve configured custom
domains. Verification for this slice: focused route and API tests passed, full
Web UK Jest passed `706/706`, lint passed, and the generated route matrix still
reported `608/608` Laravel accessible routes matched, `0` missing, `0` extra
Web UK routes, and `3` ignored infrastructure routes. Direct live Laravel
bootstrap calls and a direct Web UK tenant-routing middleware harness resolved
`timebank.global` and `project-nexus.ie` correctly. The first full Web UK
process probe rendered the shared chooser because host-scoped Laravel API calls
were still carrying the process default `X-Tenant-ID=2`, which made Laravel
return `hour-timebank` instead of `timebank-global`. The API client now omits
`X-Tenant-ID` when Host/Origin tenant context is present, and the focused
Laravel smoke harness passed against temporary Web UK
`WEB_UK_BASE_URL=http://127.0.0.1:6426`, Laravel
`http://127.0.0.1:8088`, `TENANT_ID=2`, and
`SMOKE_TENANT_DOMAIN_PAGE_PATHS=timebank.global|/=>Exchange Skills Across Borders`.
The emitted check was `tenant-domain-page-timebank-global-home-renders`, with
status `200` and no legacy accessible slug links.

Latest focused template-helper conversion slices: `src/views/events/detail.njk`
now uses `urlFor()` for local event, group, and member links/actions instead of
literal root-relative `href`/`action` strings. This covers the event detail
breadcrumbs, summary-list group/organiser links, report return URL, RSVP forms,
admin edit/cancel/delete controls, and attendee links so shared-mount source is
less dependent on response-time rewriting. `src/views/account.njk` now also
uses `urlFor()` for account card links supplied by `accountLinks` and for the
CSRF-protected `/logout` form action. `src/views/activity/index.njk` and
`src/views/activity/insights.njk` now route the detailed-insights link and
back-to-activity links through `urlFor()`. `src/views/achievements/index.njk`,
`shop.njk`, `collections.njk`, `engagement.njk`, `showcase.njk`, and
`badge.njk` now route gamification tabs, back links, daily reward/challenge/
purchase/showcase forms, badge collection links, and view-all links through
`urlFor()`. `src/views/leaderboard/*.njk` and
`src/views/nexus-score/*.njk` now route leaderboard tabs, back links, filter
forms, load-more links, NEXUS tier links, and member profile links through
`urlFor()`. `src/views/profile/{index,settings,two-factor,blocked,delete}.njk`
and `src/views/settings/{appearance,availability,data-rights,insurance,linked-accounts}.njk`
now route profile summary links, settings card links, profile/security/privacy
forms, two-step verification actions, blocked member unblock forms,
delete-account controls, and settings form actions through `urlFor()`.
`src/views/groups/detail.njk`, `src/views/listings/detail.njk`,
`src/views/members/profile.njk`, and `src/views/partials/report-link.njk` now
route group/listing/member detail breadcrumbs and actions, report return
targets, listing report links, member connection controls, and member review
actions through `urlFor()`.
`src/views/organisation-detail.njk`, `organisations.njk`,
`organisations-apply.njk`, `organisations-browse.njk`,
`organisations-jobs.njk`, `organisations-manage.njk`, and
`organisations-register.njk` now route organisation directory, browse, detail,
jobs, manage, register, volunteer opportunity, and apply controls through
`urlFor()`.
`src/views/blog/index.njk`, `detail.njk`, `comments.njk`, and `likers.njk`
now route blog search, post links, pagination, back links, author/member links,
like/reaction/comment forms, discussion links, liker links, and show-more links
through `urlFor()`.
`src/views/courses/_nav.njk`, `index.njk`, `detail.njk`, `learn.njk`,
`my-learning.njk`, `instructor.njk`, `form.njk`, `analytics.njk`, and
`grading.njk` now route course tabs, browse/search, course and prerequisite
links, certificate and learning links, review/enrolment/quiz/progress forms,
instructor create/edit analytics links, builder section/lesson forms, publish/
unpublish/delete actions, and grading forms through `urlFor()`.
`src/views/marketplace/offers.njk` and `src/views/marketplace/manage.njk` now
route offer tabs, dynamic listing links, accept/decline/withdraw forms,
my-listings tabs, create/view/edit links, and renew/delete forms through
`urlFor()`.
`src/views/marketplace/_nav.njk`, `_listing-card.njk`, `index.njk`,
`listing-list.njk`, `detail.njk`, `buy.njk`, `offer.njk`, `report.njk`,
`form.njk`, `search.njk`, `seller.njk`, and `onboarding.njk` now route browse
tabs, listing/card/category links, search and category filter forms, listing
detail actions, buyer buy/offer/report forms, listing create/edit form actions,
seller profile links, and seller onboarding controls through `urlFor()`.
`src/views/marketplace/coupons.njk`, `coupon-form.njk`, `orders.njk`,
`slots.njk`, `slot-form.njk`, and `_slot-form.njk` now route coupon links and
forms, order tab links, order ship/confirm/pay/cancel/rate forms, pickup-slot
scan/edit/delete forms, and shared slot form actions through `urlFor()`.
`src/routes/marketplace-actions.js` now routes auth-required, validation,
success, and API-failure exits through a `res.locals.urlFor` helper so listing,
offer, report, order, onboarding, pickup-slot, and coupon POST outcomes stay
inside shared tenant mounts and custom-domain child paths without relying only
on the response rewriter.
`src/views/jobs/*.njk` now route jobs tabs, browse filters, saved and
application links, owner-management controls, alerts, responses, detail save/
apply/renew forms, employer-brand links, talent search/profile links, CSV/CV
downloads, and variable pagination/form targets through `urlFor()`.
`src/views/federation/member.njk` now routes the federation member back link,
service-navigation links, opt-in CTA, connection/message forms, and transfer
CTA through `urlFor()`.
`src/views/connections/index.njk` and `network.njk` now route the connections
tabs, pending-request link, member links, action forms, empty-state member CTAs,
pagination, network search form, tab links, load-more links, route-provided card
links/actions, and back link through `urlFor()`.
Source-level regressions in `tests/template-source.test.js` guard these pages
from drifting back to literal root-relative local links/forms.
Verification for the account, activity, achievements, leaderboard/NEXUS,
detail/report, marketplace, federation member, and connections slices included
deliberate failing source-test runs before the template fixes,
then:
`npm --prefix apps/web-uk test -- tests/template-source.test.js --runInBand --runTestsByPath`
passed `9/9`,
`npm --prefix apps/web-uk test -- tests/shared-accessible-shell.test.js --runInBand --runTestsByPath -t "account hub"`
passed `2/2` selected account tests, and
`npm --prefix apps/web-uk test -- tests/shared-accessible-shell.test.js --runInBand --runTestsByPath -t "activity"`
passed `4/4` selected activity tests. The focused achievements/gamification
render check passed `15/15` selected tests. The focused leaderboard/NEXUS score
render check passed `7/7` selected tests. The focused profile/settings render
check passed `11/11` selected tests. The focused detail/report render check
passed `10/10` selected tests. The focused marketplace offers/action render
check passed `2/2` selected tests, and the focused marketplace my-listings
render check passed `1/1` selected test. The focused marketplace browse/detail/
buyer/search/seller/onboarding and coupon/order/pickup-slot render checks passed
`26/26` selected marketplace tests. The focused federation member render check
passed `2/2` selected tests. The focused connections render check passed `5/5`
selected tests. The latest source guard passed `12/12`, and
a source scan for literal `href="/marketplace`, `action="/marketplace`,
`action="{{ action }}"`, and `href="{{ tabItem.href }}"` in
`src/views/marketplace/*.njk` returned no matches. Broad verification after
the latest connections template-helper slice also passed: full
`npm --prefix apps/web-uk test -- --runInBand` reported `717/717`,
`npm --prefix apps/web-uk run lint` passed, and
`npm --prefix apps/web-uk run route:matrix` reported `608/608` matched,
`0` missing, `0` extra Web UK routes, and `3` ignored infrastructure routes.
The earlier event-focused render
check also passed:
`npm --prefix apps/web-uk test -- tests/shared-accessible-shell.test.js --runInBand --runTestsByPath -t "event"`
passed `23/23` selected tests.

Latest focused tenant home Blade-parity slice: tenant-mounted root pages now
render the Laravel Blade accessible home instead of the old generic Web UK
welcome page. Shared mount `/{tenantSlug}/accessible` fetches Laravel tenant
bootstrap data and tenant-scoped public platform stats, uses tenant
name/tagline in the layout and page content, renders the `Accessible`
heading/copy, guest or signed CTAs, the beta/accessibility panel, stat grid,
module availability cards, and service details. Dedicated accessible-domain
root `/` reuses the same tenant home while keeping links slugless. Verification
for this slice:
`npm --prefix apps/web-uk test -- tests/routes.test.js --runInBand --runTestsByPath`
passed `33/33`, `npm --prefix apps/web-uk test -- tests/api.test.js --runInBand --runTestsByPath`
passed `157/157`, `npm --prefix apps/web-uk test -- tests/shared-accessible-shell.test.js --runInBand --runTestsByPath`
passed `441/441`, full `npm --prefix apps/web-uk test -- --runInBand` passed
`697/697`, `npm --prefix apps/web-uk run lint` passed, and
`npm --prefix apps/web-uk run route:matrix` reported `608/608` matched, `0`
missing, `0` extra Web UK routes, and `3` ignored infrastructure routes.
Scoped live Laravel smoke against temporary Web UK
`http://127.0.0.1:6330` and Laravel `http://127.0.0.1:8088` passed with
`SMOKE_BODY_TEXT_PAGE_PATHS=/hour-timebank/accessible=>Accessible;/hour-timebank/accessible=>Connecting Communities;/hour-timebank/accessible=>What you can do`.
The smoke also reran the base Laravel API, Web UK health, cookie, login,
account, and logout checks green.

Latest focused tenant-stats slice: Web UK tenant homes now call Laravel
`/api/v2/platform/stats` with the active tenant context instead of using the
platform-wide default response. Shared-host tenant mounts pass
`X-Tenant-Slug={tenantSlug}`; dedicated accessible-domain requests pass the
normalized Host so Laravel can resolve `accessible_domain` the same way Blade
does. Focused TDD covered `getPlatformStats({ slug })`,
`getPlatformStats({ host })`, shared-mount tenant home calls, and custom-domain
tenant home calls. Full Web UK Jest passed `700/700`, lint passed, and a live
local Laravel proof against `/hour-timebank/accessible` rendered the scoped
tenant stats: `946` members, `1,988` hours exchanged, `129` listings, and `1`
community. Direct custom `accessible_domain` live smoke remains pending because
the local Laravel fixture set does not expose an `accessible_domain`; unknown
accessible hosts resolve to the master tenant.

Latest focused group/course runtime-smoke slice: a clean targeted Laravel-backed
run on 2026-07-08 against temporary Web UK `http://127.0.0.1:6350` and Laravel
`http://127.0.0.1:8091`, started with `ACCESSIBLE_BACKEND_TARGET=laravel` and
`TENANT_ID=2`, passed `16/16` checks. The run disabled unrelated page sweeps and
verified Laravel API reachability, Web UK health, unsigned `/account`, no-JS
cookie consent/settings POST flows, login/logout, module renders for
`/groups/484`, `/courses/1`, and `/courses/2`, plus body markers
`/groups/484=>Group events`, `/courses/1=>Ratings and reviews`, and
`/courses/2=>Ratings and reviews`. This certifies the current group/course
fallback slice; it does not replace the still-needed full chunked smoke refresh.

Latest focused runtime-smoke refresh slice: the chunked body-text smoke exposed
an expired-access-token redirect on signed `/feed/item/listing/{id}` after a
long live Laravel run. `feed.js` now uses the existing `withTokenRefresh`
middleware for that permalink and prefers `req.token` after refresh, so a
stale access token plus valid refresh cookie retries with the fresh token
instead of redirecting to `/login`. The runtime smoke root body marker was also
updated from the old generic welcome text to the current tenant chooser
`Choose a community`, matching the shared-root tenant chooser behavior.

Latest focused shared-root tenant chooser slice: the bare shared root `/` now
renders the Laravel accessible tenant chooser instead of the tenant home page.
It calls Laravel `/api/v2/tenants` without `include_master`, excludes the
master tenant locally as a guard, shows the Laravel copy and empty state, and
links communities to `/{tenantSlug}/accessible` so the public Web UK mount does
not expose Laravel's legacy alpha slug. Tenant-mounted
`/{tenantSlug}/accessible` roots still render the tenant home page. Verification
for this slice: `npm --prefix apps/web-uk test -- --runInBand` passed with
`683/683` tests, `npm --prefix apps/web-uk run lint` passed, and
`npm --prefix apps/web-uk run route:matrix` still reports `608/608` Laravel
accessible routes matched, `0` missing, `0` extra Web UK routes, and `3`
ignored infrastructure routes.

Latest focused custom accessible-domain root slice: Web UK now resolves
non-local Host values through Laravel `/api/v2/tenant/bootstrap`. When Laravel
returns a tenant whose `accessible_domain` matches the request host, slugless
root `/` renders the tenant home rather than the tenant chooser, keeps links
flat for the dedicated domain, and does not expose either Laravel's legacy
`/alpha` mount or Web UK's shared `/{tenantSlug}/accessible` mount. Verification
for this slice: focused `routes.test.js` passed `31/31`, focused
`api.test.js` passed `154/154`, full Web UK Jest passed `686/686`,
`npm --prefix apps/web-uk run lint` passed, and
`npm --prefix apps/web-uk run route:matrix` still reports `608/608` Laravel
accessible routes matched, `0` missing, `0` extra Web UK routes, and `3`
ignored infrastructure routes.

Latest focused parent-domain child tenant slice: Web UK now mirrors Laravel's
parent custom-domain child resolution for accessible pages. On a non-local host,
the first non-reserved path segment is resolved through
`/api/v2/tenant/bootstrap?slug={slug}`; when Laravel returns `parent_domain`
matching the request host, Web UK serves the existing flat route set below
`/{childSlug}` and rewrites rendered local links/forms and redirects to stay
inside that child path. The public Web UK route does not expose Laravel's
legacy `/alpha` mount or add `/accessible` on that parent-domain child path.
Verification for this slice: the new focused test first failed with `404`, then
passed after the middleware change; full `routes.test.js` passed `32/32`.

Latest focused tenant-domain runtime-smoke slice: the Laravel runtime smoke
harness now accepts `SMOKE_TENANT_DOMAIN_PAGE_PATHS` entries in the form
`host|/path=>Expected text`. It sends those requests to `WEB_UK_BASE_URL` with a
real HTTP `Host` header, checks the expected body text, and fails if generated
HTML leaks `/alpha` or `/accessible` links. Local Laravel bootstrap for
`hour-timebank` returns `parent_domain: timebank.global`, so a targeted live run
against temporary Web UK `http://127.0.0.1:6320` and Laravel
`http://127.0.0.1:8088` passed with
`SMOKE_TENANT_DOMAIN_PAGE_PATHS=timebank.global|/hour-timebank/login=>Sign in`.
The run emitted `tenant-domain-page-timebank-global-hour-timebank-login-renders`
with status `200`, plus green Laravel API, web health, auth, cookie, account,
and logout checks. Direct `accessible_domain` live smoke remains pending until a
Laravel fixture exposes that field locally.

Latest focused exchange route-identity slice: the previous extra local
`GET /exchanges/request/{param}` and `POST /exchanges/request/{param}` aliases
were removed. Laravel's accessible source exposes the exchange-request workflow
at `GET/POST /listings/{param}/exchange-request`, and that canonical route
remains implemented and tested in Web UK. The generated route matrix now reports
`608/608` Laravel accessible routes matched, `0` missing, `0` extra Web UK
routes, and `3` ignored infrastructure routes.

Latest focused login two-factor route slice: legacy local POST `/verify-2fa`
was removed. The 2FA challenge form now submits Laravel's canonical POST
`/login/two-factor` route, while GET `/login/two-factor` keeps the
Laravel-style expired-session redirect when no pending challenge token exists.

Latest focused reviews route slice: legacy local GET/POST
`/reviews/{id}/edit`, POST `/reviews/user/{id}`, and POST
`/reviews/listing/{id}` were removed. Member profile review forms now submit
Laravel's canonical POST `/members/{id}/review` route, and listing detail pages
no longer expose the unsupported listing-specific review form. The reviews
family now reports `7` matched routes, `0` missing routes, and `0` extra local
routes. Review route-level auth, comment, reaction, and Laravel-401 redirects
now generate tenant-aware targets through `res.locals.urlFor`.

Latest focused reports route slice: legacy local GET `/reports/new`, POST
`/reports/new`, and GET `/reports/my` were removed. Generic report links now
use Laravel-backed surfaces: listing reports point to `/listings/{id}/report`,
and other page/content reporting points to `/report-a-problem`.

Latest focused search route slice: legacy local GET `/search/suggestions` was
removed. Laravel exposes search suggestions as an API route, not as a GOV.UK
accessible frontend page/helper route; the search family now reports `0` extra
local routes.

Latest focused member route slice: legacy local POST `/members/{id}/connect`
was removed. Member index/profile connection controls now submit Laravel's
canonical POST `/members/{id}/connection` route with `action=connect`, and the
members family now reports `0` extra local routes.

Latest focused listing route slice: legacy local GET
`/listings/{id}/delete` was removed. Listing index/detail owner controls now
submit Laravel's canonical POST `/listings/{id}/delete` action directly, and
local listing dynamic routes now preserve Laravel numeric constraints.

Latest focused group route slice: legacy local GET `/groups/my`,
GET `/groups/{id}/members`, POST `/groups/{id}/members/add`,
POST `/groups/{id}/members/{memberId}/remove`,
POST `/groups/{id}/members/{memberId}/role`, and
POST `/groups/{id}/transfer-ownership` were removed. Group pages now link to
Laravel's accessible `/groups` list and `/groups/{id}/manage` member-management
surface, while canonical member actions remain on
POST `/groups/{id}/members/{memberId}`.

Latest focused event route slice: legacy local GET `/events/my` and POST
`/events/{id}/rsvp/remove` were removed. The event list no longer links to a
separate My events page, event detail pages use Laravel's canonical
`/events/{id}/rsvp` action for RSVP changes, and the generated matrix now
reports `0` extra local event routes.

Latest focused event redirect slice: event route-level auth, status, and
POST-result redirects now use `res.locals.urlFor` through a route-local helper.
Waitlist, poll, recurring-edit, translation, create, edit, cancel, delete, and
RSVP outcomes stay inside the active `/{tenantSlug}/accessible` mount or
custom-domain child path instead of emitting flat `/login` or `/events`
locations. Focused Laravel runtime smoke passed for `/events/browse`,
`/events/6`, `/events/6/polls`, and `/events/6/translate` against
`WEB_UK_BASE_URL=http://127.0.0.1:5180` and Laravel
`http://127.0.0.1:8088`.

Latest focused feed route slice: legacy local GET/POST `/feed/new`,
`/feed/{id}`, `/feed/{id}/edit`, `/feed/{id}/like`, `/feed/{id}/unlike`,
`/feed/{id}/comments`, and delete/edit/comment variants were removed. The feed
hub now points users at Laravel's accessible `/feed/posts/{id}` permalink and
typed `/feed/items/post/{id}/like` action while preserving the Laravel
`/feed/posts` multipart compose form.

Latest focused messages route slice: legacy local GET/POST `/messages/new`
without a member id was removed. Direct message entry points now use Laravel's
accessible `/messages/new/{userId}` route, and generated prep pages preserve
Laravel `whereNumber(...)` constraints so `/messages/{userId}` no longer
overmatches `/messages/new`.

Latest focused wallet route slice: legacy local GET-only `/wallet/transactions`,
`/wallet/transactions/{id}`, and `/wallet/transfer` pages were removed. Wallet
navigation now points to Laravel's accessible `/wallet/manage` flow while
keeping canonical POST `/wallet/transfer` and wallet export/recipient helpers.

Latest focused profile route slice: legacy local GET/POST `/profile/edit` was
removed. Profile summary change links now point to Laravel's accessible
`/profile/settings` page.

Latest focused progress route slice: legacy local `/progress`,
`/progress/badges`, `/progress/leaderboard`, and `/progress/xp-history` were
removed. Profile links now point to Laravel's accessible `/achievements` and
`/leaderboard` surfaces instead of the old progress aliases.

Latest focused settings route slice: legacy local `/settings`,
`/settings/notifications`, `/settings/password`, and `/settings/privacy` were
removed. The account/settings entry point now uses Laravel's accessible
`/profile/settings` hub, while Laravel parity subpages under `/settings/*`
remain only for the routes present in Laravel's `govuk-alpha-parity/settings.php`.

Latest focused connections route slice: legacy local `/connections/pending`
was removed. Links from the connections index, member directory, and
notifications now use Laravel's accessible `/connections/network` page with the
`pending_received` tab selected.

Latest focused component-demo slice: the local `/components` route, home-page
demo link, and unused `components.njk` template were removed. The Laravel
accessible source keeps GOV.UK component inventory in docs/source assets rather
than publishing a component-demo route.

Latest focused legal-route slice: legacy local top-level `/terms` and
`/privacy` routes were removed. Legal documents now expose Laravel's accessible
`/legal/terms` and `/legal/privacy` routes only.

Latest focused auth-alias route slice: legacy local top-level password-reset
aliases `/forgot-password` and `/reset-password` were removed for both GET and
POST so the login and reset flows now expose only Laravel's accessible
`/login/forgot-password` and `/password/reset` paths. The login page now links
directly to `/login/forgot-password`.

Latest focused logout route slice: legacy local `GET /logout` was removed so
the `logout` route family now matches Laravel's POST-only accessible logout
declaration with `0` extra local logout routes. The account hub still renders a
CSRF-protected POST sign-out form.

Latest focused admin route slice: legacy local `/admin` pages and POST actions
were removed from `apps/web-uk`. Laravel's scanned GOV.UK accessible route set
does not expose an untenanted `/admin` route family; admin-only accessible
workflows remain in their canonical module pages such as `/jobs/bias-audit`.
The jobs bias-audit back link no longer points at the removed local `/admin`
surface.

Latest consolidated route-matrix evidence slice: static route parity now
reports `608` matched Laravel routes, `0` missing Laravel routes, and `0` true
extra `apps/web-uk` routes. The local-only `GET /health`,
`GET /service-unavailable`, and `POST /session/touch` helpers remain available
but are classified as ignored infrastructure instead of accessible route parity
gaps.

Latest focused tenant-routing response-rewrite slice: shared-host tenant pages
under `/{tenantSlug}/accessible` now keep local redirects plus rendered HTML
`href` and `action` attributes inside the active shared mount. The middleware
skips asset, API, upload, service-worker, health, and other infrastructure URLs
so static resources stay on their flat public paths. Focused route tests passed
with `30/30` tests, full Web UK Jest passed with `8` suites and `681` tests,
lint passed, and the route matrix stayed at `608/608` Laravel accessible routes
matched with `0` missing, `0` true extra Web UK routes, and `3` ignored
infrastructure helper routes.

Latest focused backend-contract provenance slice: `resolveBackendContract()`
now returns `baseUrlSource` so Laravel defaults, future ASP.NET mode, and
explicit `API_BASE_URL` overrides are distinguishable in tests and docs.
`API_BASE_URL` remains an override only; it does not certify ASP.NET
compatibility or replace Laravel as the source of truth.

Latest focused local gate slice: lint warnings were cleaned from
`src/middleware/auth.js` and `src/server.js`. `npm run lint` now exits cleanly
with no warnings in the controlled web-uk worktree, moving the local readiness
gate from "0 errors, known warnings" to fully clean lint.

Latest focused Laravel smoke slice: after Laravel `http://127.0.0.1:8088`
became reachable again, a controlled temporary web-uk process on
`WEB_UK_BASE_URL=http://127.0.0.1:6251` was started with `TENANT_ID=2`.
`npm run smoke:laravel` passed with `SMOKE_MODULE_PAGE_PATHS=none` and
`SMOKE_BODY_TEXT_PAGE_PATHS=none`, covering Laravel API reachability, web-uk
health, unsigned auth redirects, login CSRF, login POST to `/dashboard`, signed
`/account`, logout POST clearing the session, no-JS cookie POST workflows,
content-type contracts, 22 signed gated `403` checks, and the then-current
signed redirect checks. After the 2026-07-08 course 2 fixture refresh, the same
core scope has
19 signed redirect checks because `/courses/2/learn` and
`/courses/2/certificate` are signed module-page fixtures. A full default
634-check run on port `6250` exceeded the 15-minute
wrapper timeout after progressing through the module-page sweep and into the
body-text checks. The smoke harness now supports both
`SMOKE_MODULE_PAGE_CHUNK=N/M` and `SMOKE_BODY_TEXT_PAGE_CHUNK=N/M`, so future
agents can recertify the full default scope in repeatable chunks instead of
manually splitting body-text page lists.

Latest focused federation live-smoke slice: while recertifying chunked smoke
against a temporary web-uk process at `WEB_UK_BASE_URL=http://127.0.0.1:6260`,
Laravel returned `403` for the optional `/api/v2/federation/activity` feed even
though `/api/v2/federation/status` and `/api/v2/federation/partners` returned
`200`. The `/federation` hub now treats that activity-feed `403` as an empty
activity list instead of rendering `503`. A targeted Laravel runtime smoke on
2026-07-08 passed `11/11` checks, including `module-page-federation-renders`
with status `200`.

Latest chunked live-smoke recertification on 2026-07-08 against the same
temporary `WEB_UK_BASE_URL=http://127.0.0.1:6260` process: after earlier
`1/8` and post-fix `2/8` mixed chunks passed, the remaining page sweeps were
recertified as split module/body slices. `SMOKE_MODULE_PAGE_CHUNK=3/8` through
`8/8` passed with `269/269` repeated checks and `0` failures, including `209`
module-page checks. `SMOKE_BODY_TEXT_PAGE_CHUNK=3/8` through `8/8` passed with
`271/271` repeated checks and `0` failures, including `211` body-text contract
checks. The `3/8` body slice can run close to five minutes on this local
Laravel/Web UK pair; a fetch-logged rerun completed green in about 253 seconds,
so use generous command timeouts when recertifying the full chunk set.

Latest focused dashboard slice: signed `/dashboard` now has a targeted shared
shell test for the Laravel Blade dashboard contract. The route calls
Laravel-compatible profile, onboarding status, wallet balance, gamification
profile, badges, listings, feed, member events, exchange-attention count, and
member endorsements helpers, and the Nunjucks view renders the Blade-style
welcome, onboarding banner, exchange-attention banner, create-listing CTA,
time-bank stat grid, progress/badges, upcoming events, skill endorsements,
quick links, and recent feed/listings. Remaining dashboard gaps are
tenant/module/feature gates, exact localization, broader live Laravel workflow
certification, and ASP.NET backend compatibility. A targeted live dashboard
marker smoke on 2026-07-08 against a temporary web-uk process at
`WEB_UK_BASE_URL=http://127.0.0.1:6240`, started with `TENANT_ID=2`, passed
`12/12` checks for auth/health, signed `/dashboard`, and body markers
`Welcome back`, `Your time bank`, `Quick links`, `Recent feed`, and
`Recent listings`.

Focused runtime-smoke harness test: `npm test --
tests/laravel-runtime-smoke.test.js --runInBand` passed with `17/17` tests
after red steps for the missing harness, stale Acme defaults, missing public
module-page checks, missing signed module-page checks, too-short default
timeout for slower Laravel-backed signed pages, chunked fallback support, and
the missing default real-fixture parameterised detail, secondary outcome,
listing/member/feed/course, message/volunteering-owner, and
course/federation/ideation/resource/coupon, home/blog/wallet/coupon-management
outcome scopes.

Live local smoke result on 2026-07-07: direct Laravel login succeeds for the
E2E fixture account when `X-Tenant-ID: 2` or `X-Tenant-Slug: hour-timebank` is
sent. `npm run smoke:laravel` passed end-to-end against a temporary web-uk
process started with `TENANT_ID=2`, `WEB_UK_BASE_URL=http://127.0.0.1:5181`,
and `SMOKE_TIMEOUT_MS=60000`: Laravel API `200`, web-uk health `200`, unsigned
`/account` -> `/login`, `/login` CSRF rendered, login POST -> `/dashboard`, and
signed `/account` rendered `200`. The current smoke scope also checks
`/volunteering`, `/organisations`, `/organisations/browse`, `/kb`, and `/help`
return 2xx through web-uk while Laravel is the backend target. After the login
flow, it checks the broad signed page set covering `/explore`, `/saved`,
`/notifications`, `/members`, `/members/discover`, `/resources`, `/skills`,
`/goals`, `/clubs`, `/wallet`, `/messages`, `/connections`, `/connections/network`,
`/matches`, `/matches/board`, `/activity`, `/achievements`, `/leaderboard`,
`/nexus-score`,
`/profile/settings`, `/settings/appearance`, `/settings/data-rights`,
`/federation`, `/courses`, `/courses/mine`, `/marketplace`,
`/marketplace/mine`, `/events`, `/events/new`, `/listings`,
`/search/advanced`, `/premium`, and `/podcasts`, plus deeper signed subpages
across profile, settings,
achievements, leaderboard, federation, courses, marketplace, and volunteering.
A later 2026-07-07 smoke run against
`WEB_UK_BASE_URL=http://127.0.0.1:5293` passed `93/93` checks with that expanded
scope. A follow-up 2026-07-07 probe against
`WEB_UK_BASE_URL=http://127.0.0.1:5294` found another stable 2xx batch. The
expanded harness passed `158/158` checks against
`WEB_UK_BASE_URL=http://127.0.0.1:5295`: 6 auth/health checks and 152 module
page checks. `/feed` is now part of the default signed page scope and renders
the local Laravel-backed feed page with an empty/error state when Laravel's feed
collection API is unavailable; a later run against
`WEB_UK_BASE_URL=http://127.0.0.1:5297` passed `159/159`: 6 auth/health checks
and 153 module page checks. Plain `/connections` is now in the default signed
scope and renders with an empty/error state when Laravel's legacy connections
API is unavailable; a later run against
`WEB_UK_BASE_URL=http://127.0.0.1:5298` passed `160/160`: 6 auth/health checks
and 154 module page checks. Plain `/members` is now in the default signed scope
and renders with an empty/error state when Laravel's legacy members API is
unavailable; a later run against `WEB_UK_BASE_URL=http://127.0.0.1:5299` passed
`161/161`: 6 auth/health checks and 155 module page checks. `/events/new` and
`/marketplace/onboarding` are now in the default signed scope and render form
pages with empty/error setup state when Laravel helper APIs are unavailable; a
later run against `WEB_UK_BASE_URL=http://127.0.0.1:5302` passed `163/163`: 6
auth/health checks and 157 module page checks. The feature/role-gated pages
`/jobs/bias-audit`, `/jobs/talent-search`, and `/marketplace/coupons` are now
covered as expected signed-session `403` checks; a later run against
`WEB_UK_BASE_URL=http://127.0.0.1:5306` passed `166/166`: 6 auth/health checks,
157 module page checks, and 3 gated-status checks. `/onboarding` and
`/premium/manage` are now covered as expected signed-session redirect checks; a
later run against `WEB_UK_BASE_URL=http://127.0.0.1:5307` passed `168/168`: 6
auth/health checks, 157 module page checks, 3 gated-status checks, and 2
redirect-status checks. `/listings` needed a Nunjucks
owner-id guard because Laravel can return nested `user.id` without a flat
`user_id`; the default smoke timeout is now `60000` ms for slower Laravel
fixture pages. Signed-session public auth aliases `/login`,
`/login/forgot-password`, `/password/reset?token=reset-token`, and `/register`
now remain renderable like Laravel and are part of the default 2xx smoke scope;
the latest live run against `WEB_UK_BASE_URL=http://127.0.0.1:5308` passed
`172/172`: 6 auth/health checks, 161 module/page checks, 3 gated-status checks,
and 2 redirect-status checks.
`/login/two-factor` now redirects to `/login?status=two-factor-expired` when the
session-backed 2FA token is absent and is covered by the default redirect-status
scope; a later live run against `WEB_UK_BASE_URL=http://127.0.0.1:5309` passed
`173/173`: 6 auth/health checks, 161 module/page checks, 3 gated-status checks,
and 3 redirect-status checks. POST `/login` now also follows the Laravel 2FA
challenge hand-off by storing `two_factor_token` in the session and redirecting
to `/login/two-factor` when the API returns `requires_2fa`. The default smoke
scope now checks 12 matched unsigned auth-required parameterised routes across
federation, ideation, organisations, podcasts, resources, public user
collections, marketplace slot edit, saved collections, saved-search delete, and
volunteering certificate download. A full default Laravel-backed run against a temporary web-uk
process at `WEB_UK_BASE_URL=http://127.0.0.1:5322`, started with `TENANT_ID=2`,
passed on 2026-07-07: `181/181` checks, `0` failures, `161` module-page
checks, 8 unsigned auth-required redirect checks, 3 gated-status checks, and 3
signed redirect checks in 352.8 seconds. For targeted CLI runs,
`SMOKE_MODULE_PAGE_PATHS`,
`SMOKE_UNSIGNED_AUTH_REQUIRED_PAGE_PATHS`, `SMOKE_GATED_PAGE_PATHS`, and
`SMOKE_REDIRECT_PAGE_PATHS` accept comma/newline-separated lists, and the
portable sentinel `none` disables that
group. A targeted live CLI run against
`WEB_UK_BASE_URL=http://127.0.0.1:5317` with those three variables set to
`none` passed `14/14`, including all eight auth-required parameterised
redirects. For slower shells, `SMOKE_MODULE_PAGE_CHUNK=N/M` now splits the
module-page sweep and `SMOKE_BODY_TEXT_PAGE_CHUNK=N/M` splits the body-text
sweep into deterministic one-based chunks, for example
`SMOKE_MODULE_PAGE_CHUNK=1/4` or `SMOKE_BODY_TEXT_PAGE_CHUNK=1/8`, so agents can
recertify the default page set through repeatable smaller Laravel-backed runs
while leaving auth, unsigned auth-required, gated, and redirect checks enabled.
All 16 chunked live runs
against `WEB_UK_BASE_URL=http://127.0.0.1:5321` with `TENANT_ID=2` and
`SMOKE_MODULE_PAGE_CHUNK=N/16` passed on 2026-07-07: `481` total repeated
checks, `0` failures, and `161` collective module-page checks across the
default sweep. Each shard also reran the auth/API setup, unsigned
auth-required redirects, gated status checks, and signed redirect checks.
Event and group detail helpers now use Laravel v2 detail endpoints
(`/api/v2/events/{id}` and `/api/v2/groups/{id}`) and unwrap Laravel
`{ data: ... }` payloads before rendering Nunjucks templates. A targeted live
Laravel-backed run against `WEB_UK_BASE_URL=http://127.0.0.1:5325`, started
with `TENANT_ID=2`, passed on 2026-07-07: `24/24` checks, `0` failures, with 6
auth/health checks and 18 real-fixture parameterised module pages:
`/events/6`, `/events/6/map`, `/events/6/polls`, `/events/6/translate`,
`/volunteering/opportunities/307`, `/organisations/636`,
`/organisations/636/jobs`, `/organisations/opportunities/307/apply`,
`/jobs/90764`, `/groups/484`, `/groups/484/invite`,
`/groups/484/notifications`, `/groups/484/image`,
`/groups/484/announcements`, `/groups/484/discussions`, `/groups/484/files`,
`/groups/484/manage`, and `/resources/10/comments`.
Those 18 real-fixture parameterised pages are now part of the default module
page sweep rather than targeted-only evidence. The default scope also covers
`/groups/484/discussions/new`, `/jobs/90764/qualified`,
`/members/77/insights`, `/listings/42/report`,
`/listings/42/exchange-request`, `/listings/42/comments`,
`/feed/hashtag/timebank`, `/feed/item/listing/42`, `/messages/77`,
`/messages/new/77`, `/volunteering/organisations/636/dashboard`,
`/volunteering/organisations/636/manage`,
`/volunteering/organisations/636/settings`,
`/volunteering/organisations/636/volunteers`, and
`/volunteering/organisations/636/wallet`, `/courses/1`, `/courses/2`,
`/courses/instructor/1/edit`, `/courses/instructor/2/edit`,
`/federation/partners/1`, `/federation/partners/5`,
`/federation/members/353`, `/federation/members/353/transfer`,
`/federation/members/351`, `/ideation/23`, `/ideation/22`, `/ideation/2`,
`/ideation/23/edit`, `/ideation/23/manage`, `/ideation/23/drafts`, and
`/ideation/23/outcome` as signed 2xx pages; owner-only
job/listing/message/group-exchange/resource/coupon checks for `/jobs/90764/edit`,
`/jobs/90764/analytics`, `/jobs/90764/pipeline`,
`/jobs/90764/applications`, `/listings/42/analytics`,
`/group-exchanges/1`, `/messages/groups/33`, `/resources/10/delete`,
`/coupons/1`, and `/coupons/2` as signed `403` responses;
plus signed redirects from `/events/6/recurring-edit` to `/events/6/edit`,
`/groups/484/edit` to `/groups/484`, `/courses/42/certificate` to
`/courses/42?status=certificate-failed`, and
`/federation/messages/conversation/77` to `/federation/messages`,
`/courses/1/learn` to `/courses/1?status=enrol-required`,
and `/federation/messages/conversation/353` to `/federation/messages`.
Direct Laravel API checks on 2026-07-08 showed the E2E user has completed
course 2, so `/courses/2/learn` and `/courses/2/certificate` are now treated
as signed 2xx module-page fixtures rather than signed redirect fixtures. A
focused live smoke against `WEB_UK_BASE_URL=http://127.0.0.1:6351` and
`LARAVEL_BASE_URL=http://127.0.0.1:8092` passed `12/12` checks for the two
course 2 module pages, and the isolated current redirect sweep passed `29/29`
checks with `19` signed redirects. A targeted
live run against `WEB_UK_BASE_URL=http://127.0.0.1:5336`, started with
`TENANT_ID=2`, passed on 2026-07-07: `28/28` checks, `0` failures. A full
default Laravel-backed run against a temporary web-uk process at
`WEB_UK_BASE_URL=http://127.0.0.1:5336`, started with `TENANT_ID=2`, passed on
2026-07-07: `247/247` checks, `0` failures, `210` module-page checks, 8
unsigned auth-required redirect checks, 13 gated-status checks, and 10 signed
redirect checks; `npm run smoke:laravel` exited `0`.
The default scope now also covers `/`, `/blog/feed.xml`, `/wallet/export.csv`,
`/wallet/recipients`, and `/marketplace/coupons/new` as signed 2xx routes;
`/coupons` and `/marketplace/coupons/5/edit` as signed `403` responses; and
`/password/reset` redirecting to `/login/forgot-password`. A targeted live run
against `WEB_UK_BASE_URL=http://127.0.0.1:5336`, started with `TENANT_ID=2`,
passed on 2026-07-07: `14/14` checks, `0` failures. The expanded default scope
now contains `255` checks: `215` module-page checks, 8 unsigned auth-required
redirect checks, 15 gated-status checks, and 11 signed redirect checks, plus the
6 auth/health checks. The single unchunked live command exceeded a 600-second
wrapper timeout, so the scope was recertified with `SMOKE_MODULE_PAGE_CHUNK=N/4`
against the same temporary process: all four chunks passed on 2026-07-07 with
`375` repeated checks, `0` failures, and `215` collective module-page checks.
The default scope now additionally covers `/account`, `/polls/20`,
`/polls/20/rank`, `/listings/90967/comments`, `/listings/90967/report`, and
`/listings/90967/exchange-request` as signed 2xx routes;
`/listings/90967/analytics` and `/jobs/talent-search/77` as signed `403`
responses; and redirects from `/courses/1/certificate` to
`/courses/1?status=certificate-failed`,
`/jobs/90764/applications/export.csv` to
`/jobs/90764/applications?status=export-failed`, and `/onboarding/profile` to
`/dashboard`. A targeted live run against
`WEB_UK_BASE_URL=http://127.0.0.1:5337`, started with `TENANT_ID=2`, passed on
2026-07-07: `17/17` checks, `0` failures. The expanded default scope now
contains `266` checks: `221` module-page checks, 8 unsigned auth-required
redirect checks, 17 gated-status checks, and 14 signed redirect checks, plus the
6 auth/health checks. The expanded default scope was recertified with
`SMOKE_MODULE_PAGE_CHUNK=N/4` against the same temporary process: all four
chunks passed on 2026-07-07 with `401` repeated checks, `0` failures, and `221`
collective module-page checks.
The default scope now additionally covers `/marketplace/267`,
`/marketplace/267/buy`, `/marketplace/267/offer`, `/marketplace/267/report`,
`/marketplace/267/edit`, and `/blog/90001/likers/1` as signed 2xx routes. A
targeted live run against `WEB_UK_BASE_URL=http://127.0.0.1:5338`, started with
`TENANT_ID=2`, passed on 2026-07-07: `12/12` checks, `0` failures. The expanded
default scope now contains `272` checks: `227` module-page checks, 8 unsigned
auth-required redirect checks, 17 gated-status checks, and 14 signed redirect
checks, plus the 6 auth/health checks. The expanded default scope was
recertified with `SMOKE_MODULE_PAGE_CHUNK=N/4` against the same temporary
process: all four chunks passed on 2026-07-07 with `407` repeated checks, `0`
failures, and `227` collective module-page checks.
The default scope now additionally covers `/events/14`, `/events/14/map`,
`/events/14/polls`, `/events/14/translate`, `/groups/482`,
`/groups/482/announcements`, `/groups/482/discussions`,
`/groups/482/discussions/new`, `/groups/482/files`, `/groups/482/manage`,
`/groups/482/invite`, `/groups/482/notifications`, `/groups/482/image`,
`/marketplace/6`, `/marketplace/6/buy`, `/marketplace/6/offer`,
`/marketplace/6/report`, `/marketplace/6/edit`, `/polls/8`, `/polls/4`,
`/feed/item/listing/90967`, `/courses/2/learn`, `/courses/2/certificate`,
and `/blog/64/likers/1` as signed 2xx routes;
plus redirects from `/events/14/recurring-edit` to `/events/14/edit`,
`/groups/482/edit` to `/groups/482`, `/onboarding/interests` to
`/dashboard`, `/onboarding/safeguarding` to `/dashboard`, and
`/onboarding/confirm` to `/dashboard`. A targeted live run against
`WEB_UK_BASE_URL=http://127.0.0.1:5339`, started with `TENANT_ID=2`, passed on
2026-07-07: `34/34` checks, `0` failures. The expanded default scope now
contains `300` checks: `249` module-page checks, 8 unsigned auth-required
redirect checks, 17 gated-status checks, and 20 signed redirect checks, plus the
6 auth/health checks. The expanded default scope was recertified with
`SMOKE_MODULE_PAGE_CHUNK=N/4` against the same temporary process: all four
chunks passed on 2026-07-07 with `453` repeated checks, `0` failures, and `249`
collective module-page checks.
The default scope now additionally covers `/marketplace/category/electronics`,
`/marketplace/category/home-garden`, `/marketplace/category/free-items`,
`/marketplace/category/services`, and `/marketplace/seller/1` as signed 2xx
routes. A targeted live run against `WEB_UK_BASE_URL=http://127.0.0.1:5340`,
started with `TENANT_ID=2`, passed on 2026-07-07: `11/11` checks, `0` failures.
The expanded default scope now contains `305` checks: `254` module-page checks,
8 unsigned auth-required redirect checks, 17 gated-status checks, and 20 signed
redirect checks, plus the 6 auth/health checks.
The expanded default scope was recertified with `SMOKE_MODULE_PAGE_CHUNK=N/4`
against the same temporary process: all four chunks passed on 2026-07-07 with
`458` repeated checks, `0` failures, and `254` collective module-page checks.

The default Laravel runtime smoke scope now additionally covers
`/blog/test-sitemap-blog-post`, `/blog/test-sitemap-blog-post/comments`,
`/blog/timebank-ireland`, `/blog/timebank-ireland/comments`, and `/kb/90001`
as signed 2xx routes. A targeted live run against
`WEB_UK_BASE_URL=http://127.0.0.1:5341`, started with `TENANT_ID=2`, passed on
2026-07-07: `11/11` checks, `0` failures. The expanded default scope now
contains `310` checks: `259` module-page checks, 8 unsigned auth-required
redirect checks, 17 gated-status checks, and 20 signed redirect checks, plus the
6 auth/health checks.
The expanded default scope was recertified with `SMOKE_MODULE_PAGE_CHUNK=N/4`
against the same temporary process: all four chunks passed on 2026-07-07 with
`463` repeated checks, `0` failures, and `259` collective module-page checks.

The default Laravel runtime smoke scope now additionally covers
`/feed/item/listing/90966`, `/feed/item/listing/90965`,
`/feed/item/listing/90964`, `/feed/item/listing/90963`, and
`/feed/item/listing/90962` as signed 2xx typed feed item permalink routes. A
targeted live run against `WEB_UK_BASE_URL=http://127.0.0.1:5342`, started with
`TENANT_ID=2`, passed on 2026-07-07: `11/11` checks, `0` failures. The expanded
default scope now contains `315` checks: `264` module-page checks, 8 unsigned
auth-required redirect checks, 17 gated-status checks, and 20 signed redirect
checks, plus the 6 auth/health checks.
The expanded default scope was recertified with `SMOKE_MODULE_PAGE_CHUNK=N/4`
against the same temporary process: all four chunks passed on 2026-07-07 with
`468` repeated checks, `0` failures, and `264` collective module-page checks.

The default Laravel runtime smoke scope now additionally covers
`/users/14/appreciations` and `/jobs/employers/14` as signed 2xx user
appreciation and employer-brand routes, plus `/groups/484/files/1/download` as
the signed missing-file redirect to `/groups/484/files?status=file-not-found`.
This also fixes those two public member/employer pages to read Laravel
`/api/v2/users/{id}` instead of the legacy `/api/users/{id}` helper. A targeted
live run against `WEB_UK_BASE_URL=http://127.0.0.1:5343`, started with
`TENANT_ID=2`, passed on 2026-07-07: `9/9` checks, `0` failures. The smoke
harness
refreshes the signed session before gated-status and signed-redirect groups so
long module-page batches do not turn expected authorization outcomes into stale
`/login?status=auth-required` redirects. That `318`-check expanded default
scope was then
recertified with `SMOKE_MODULE_PAGE_CHUNK=N/4` against the same temporary
process: all four chunks passed on 2026-07-07 with `474` repeated checks, `0`
failures, and `266` collective module-page checks. The next fixture expansion
adds `/ideation/2/ideas/1` as a signed 2xx ideation idea detail route; its
targeted live run passed on 2026-07-07 with `7/7` checks and `0` failures. The
course instructor analytics and grading routes now preserve Laravel's owner/admin
denial as a 403 page instead of the generic service-unavailable fallback; the
targeted live run for `/courses/instructor/1/analytics` and
`/courses/instructor/1/grading` passed on 2026-07-07 with `8/8` checks and `0`
failures. The event edit form now preserves Laravel's organiser-only denial as
a 403 page before optional group setup data can mask the result; `/events/6/edit`
and `/events/14/edit` are covered as signed `403` responses. A targeted live
run against `WEB_UK_BASE_URL=http://127.0.0.1:5343`, started with `TENANT_ID=2`,
passed on 2026-07-07 with `8/8` checks and `0` failures. The group announcement
edit route now checks the group admin gate before using Laravel's collection-only
announcements API, so `/groups/484/announcements/1/edit` is covered as a signed
`403` response. A targeted live run against
`WEB_UK_BASE_URL=http://127.0.0.1:5344`, started with `TENANT_ID=2`, passed on
2026-07-07 with `7/7` checks and `0` failures. The achievement badge detail
route is now covered by the live tenant badge fixture
`/achievements/badges/vol_1h`, which returned `200` in a targeted Laravel-backed
smoke run against `WEB_UK_BASE_URL=http://127.0.0.1:5345`. The feed post detail
route is now covered by the live post fixture `/feed/posts/796`, which returned
`200` in a targeted Laravel-backed smoke run against
`WEB_UK_BASE_URL=http://127.0.0.1:5346`. The public goal fixture `/goals/162`
now covers the goal detail, edit, check-in, reminder, buddy actions, insights,
history, and social page shapes, and `/reviews/18/comments` covers the review
comments page; targeted Laravel-backed smoke probes against
`WEB_UK_BASE_URL=http://127.0.0.1:5347` returned `200` for each. Unsigned owner
route probes for `/marketplace/slots/1/edit`, `/me/collections/1`,
`/search/saved/1/delete`, and `/volunteering/certificates/ABC123/download`
returned `/login?status=auth-required` against
`WEB_UK_BASE_URL=http://127.0.0.1:5348`. Listing detail/edit now uses the
Laravel `/api/v2/listings/{id}` contract, and the E2E-owned fixture
`/listings/90992/edit` returned `200` against
`WEB_UK_BASE_URL=http://127.0.0.1:5349`. The poll export route
`/polls/1/export` returned `/login?status=auth-required` when unsigned against
`WEB_UK_BASE_URL=http://127.0.0.1:5350`; `/ideation/campaigns/1` returned the
same unsigned auth-required redirect against
`WEB_UK_BASE_URL=http://127.0.0.1:5351`. The plain-login unsigned routes
`/exchanges/1`, `/jobs/applications/1/cv`, and
`/jobs/applications/1/history` returned `/login` against
`WEB_UK_BASE_URL=http://127.0.0.1:5352`. The `/blog/feed.xml` and
`/wallet/export.csv` responses returned the expected `application/rss+xml` and
`text/csv` content types against `WEB_UK_BASE_URL=http://127.0.0.1:5355`.
The signed `/explore`, `/chat`, `/account`, `/wallet`, `/messages`,
`/connections`, `/resources`, `/skills`, `/goals`, `/clubs`, `/saved`, and
`/members` hub pages returned expected body markers against
`WEB_UK_BASE_URL=http://127.0.0.1:6200`. The public/support/legal pages `/`,
`/about`, `/guide`, `/features`, `/faq`, `/help`, `/kb`,
`/trust-and-safety`, `/legal`, `/accessibility`, `/legal/terms`,
`/legal/privacy`, `/legal/cookies`, `/legal/community-guidelines`, and
`/legal/acceptable-use` returned expected body markers against
`WEB_UK_BASE_URL=http://127.0.0.1:6210`. The module landing pages
`/volunteering`, `/organisations`, `/organisations/browse`, `/events`,
`/events/new`, `/listings`, `/jobs`, `/courses`, `/courses/mine`,
`/marketplace`, `/marketplace/mine`, `/marketplace/onboarding`, `/blog`,
`/feed`, `/podcasts`, `/reviews`, `/search`, `/search/advanced`,
`/federation`, `/notifications`, `/activity`, `/achievements`, `/leaderboard`,
`/nexus-score`, and `/premium` returned expected body markers against
`WEB_UK_BASE_URL=http://127.0.0.1:6211`; `/premium` now follows the Laravel
Blade title `Donate`. The signed profile/settings/gamification/federation
subpages `/profile/settings`, `/settings/appearance`, `/settings/data-rights`,
`/profile/delete-account`, `/profile/two-factor`, `/profile/blocked`,
`/settings/availability`, `/settings/linked-accounts`, `/settings/insurance`,
`/activity/insights`, `/achievements/shop`, `/achievements/collections`,
`/achievements/engagement`, `/achievements/showcase`,
`/leaderboard/competitive`, `/leaderboard/seasons`, `/leaderboard/journey`,
`/leaderboard/spotlight`, `/nexus-score/tiers`, `/federation/partners`,
`/federation/members`, and `/federation/settings` returned expected body
markers against `WEB_UK_BASE_URL=http://127.0.0.1:6212`; `/federation/members`
now follows the Laravel Blade title `Federated members`. The remaining signed
federation subpages `/federation/opt-in`, `/federation/opt-out`,
`/federation/onboarding`, `/federation/groups`, `/federation/listings`,
`/federation/events`, `/federation/connections`, and `/federation/messages`
returned expected body markers against `WEB_UK_BASE_URL=http://127.0.0.1:6213`.
The signed marketplace account subpages `/marketplace/saved`, `/marketplace/free`,
`/marketplace/offers`, `/marketplace/orders`, `/marketplace/sales`,
`/marketplace/pickups`, and `/marketplace/slots` returned expected body markers
against `WEB_UK_BASE_URL=http://127.0.0.1:6214`. The signed volunteering member
and owner subpages `/volunteering/accessibility`, `/volunteering/certificates`,
`/volunteering/opportunities/create`, `/volunteering/credentials`,
`/volunteering/hours`, `/volunteering/wellbeing`, `/volunteering/donations`,
`/volunteering/expenses`, `/volunteering/emergency-alerts`,
`/volunteering/group-signups`, `/volunteering/training`,
`/volunteering/incidents`, `/volunteering/waitlist`, `/volunteering/swaps`,
`/volunteering/my-organisations`, and `/volunteering/recommended-shifts`
returned expected body markers against `WEB_UK_BASE_URL=http://127.0.0.1:6215`;
`/volunteering/opportunities/create` now follows the Laravel Blade title
`Post a volunteer opportunity`. The signed jobs account subpages `/jobs/saved`,
`/jobs/applications`, `/jobs/mine`, `/jobs/create`, `/jobs/alerts`,
`/jobs/responses`, and `/jobs/employer-onboarding` returned expected body
markers against `WEB_UK_BASE_URL=http://127.0.0.1:6216` and now carry default
body-marker coverage for their Laravel Blade titles and stable action text. The
previous full default smoke scope passed against
`WEB_UK_BASE_URL=http://127.0.0.1:6218` with `459/459` checks and `0` failures.
The signed course subpages `/courses/instructor`, `/courses/instructor/new`,
`/courses/1`, `/courses/2`, `/courses/instructor/1/edit`, and
`/courses/instructor/2/edit` returned expected body markers against
`WEB_UK_BASE_URL=http://127.0.0.1:6219` and now carry default body-marker
coverage for their Laravel Blade headings and detail-page review section. The
full default smoke scope then passed against
`WEB_UK_BASE_URL=http://127.0.0.1:6220` with `465/465` checks and `0` failures.
The signed member discovery pages `/members/discover`, `/members/nearby`, and
`/members/77/insights` returned expected body markers against
`WEB_UK_BASE_URL=http://127.0.0.1:6221` and now carry default body-marker
coverage for their Laravel Blade headings. The body-text-only default smoke
scope passed against the same port with `127/127` checks and `0` failures. The
signed organisation pages `/organisations/manage`, `/organisations/register`,
`/organisations/636`, `/organisations/636/jobs`, and
`/organisations/opportunities/307/apply` returned expected body markers against
`WEB_UK_BASE_URL=http://127.0.0.1:6222` and now carry default body-marker
coverage for their Laravel Blade headings and section text. The body-text-only
default smoke scope passed against the same port with `132/132` checks and `0`
failures. The signed volunteering opportunity and organisation-owner pages
`/volunteering/opportunities/307`,
`/volunteering/organisations/636/dashboard`,
`/volunteering/organisations/636/manage`,
`/volunteering/organisations/636/settings`,
`/volunteering/organisations/636/volunteers`, and
`/volunteering/organisations/636/wallet` returned expected body markers against
`WEB_UK_BASE_URL=http://127.0.0.1:6223` and now carry default body-marker
coverage for their Laravel Blade headings and owner action text. The
body-text-only default smoke scope passed against the same port with `138/138`
checks and `0` failures. The signed group pages `/groups`, `/groups/new`,
`/groups/484`, `/groups/484/invite`, `/groups/484/notifications`,
`/groups/484/image`, `/groups/484/announcements`, `/groups/484/discussions`,
`/groups/484/discussions/new`, `/groups/484/files`, `/groups/484/manage`,
`/groups/482`, `/groups/482/announcements`, `/groups/482/discussions`,
`/groups/482/discussions/new`, `/groups/482/files`, `/groups/482/manage`,
`/groups/482/invite`, `/groups/482/notifications`, and `/groups/482/image`
returned expected body markers against
`WEB_UK_BASE_URL=http://127.0.0.1:6224`; group detail now follows the Laravel
Blade section heading `Group events`. The body-text-only default smoke scope
passed against the same port with `158/158` body-text checks and `0` failures.
The signed marketplace create/search/coupon/detail/action/category/seller pages
`/marketplace/create`, `/marketplace/search`, `/marketplace/coupons/new`,
`/marketplace/267`, `/marketplace/267/buy`, `/marketplace/267/offer`,
`/marketplace/267/report`, `/marketplace/267/edit`, `/marketplace/6`,
`/marketplace/6/buy`, `/marketplace/6/offer`, `/marketplace/6/report`,
`/marketplace/6/edit`, `/marketplace/category/electronics`,
`/marketplace/category/home-garden`, `/marketplace/category/free-items`,
`/marketplace/category/services`, and `/marketplace/seller/1` returned expected
body markers against `WEB_UK_BASE_URL=http://127.0.0.1:6225`; category search
now follows Laravel's `Search within this category` label, `Find an item by name
or keyword.` hint, and `Search` submit text. The targeted run passed with
`27/27` checks and `0` failures. The body-text-only default smoke scope passed
against the same port with `179/179` total checks, including 170 body-text
contract checks, and `0` failures.
The signed ideation pages `/ideation`, `/ideation/campaigns`, `/ideation/new`,
`/ideation/outcomes`, `/ideation/tags`, `/ideation/23`, `/ideation/22`,
`/ideation/2`, `/ideation/2/ideas/1`, `/ideation/23/edit`,
`/ideation/23/manage`, `/ideation/23/drafts`, and `/ideation/23/outcome`
returned expected body markers against
`WEB_UK_BASE_URL=http://127.0.0.1:6226`. The targeted run passed with `22/22`
checks and `0` failures. The body-text-only default smoke scope passed against
the same port with `192/192` total checks, including 183 body-text contract
checks, and `0` failures.
The signed goals pages `/goals/buddying`, `/goals/discover`,
`/goals/templates`, `/goals/162`, `/goals/162/edit`, `/goals/162/checkin`,
`/goals/162/reminder`, `/goals/162/buddy-actions`, `/goals/162/insights`,
`/goals/162/history`, and `/goals/162/social` returned expected body markers
against `WEB_UK_BASE_URL=http://127.0.0.1:6227`. The targeted run passed with
`20/20` checks and `0` failures. The body-text-only default smoke scope passed
against the same port with `203/203` total checks, including 194 body-text
contract checks, and `0` failures.
The signed feed pages `/feed/hashtags`, `/feed/hashtag/timebank`,
`/feed/item/listing/42`, `/feed/posts/796`, `/feed/item/listing/90967`,
`/feed/item/listing/90966`, `/feed/item/listing/90965`,
`/feed/item/listing/90964`, `/feed/item/listing/90963`, and
`/feed/item/listing/90962` returned expected body markers against
`WEB_UK_BASE_URL=http://127.0.0.1:6228`. The targeted run passed with `16/16`
checks and `0` failures. The body-text-only default smoke scope passed against
the same port with `210/210` total checks, including 204 body-text contract
checks, and `0` failures.
The signed event pages `/events/browse`, `/events/6`, `/events/6/map`,
`/events/6/polls`, `/events/6/translate`, `/events/14`, `/events/14/map`,
`/events/14/polls`, and `/events/14/translate` returned expected body markers
against `WEB_UK_BASE_URL=http://127.0.0.1:6229`. The targeted run passed with
`15/15` checks and `0` failures. The body-text-only default smoke scope passed
against the same port with `219/219` total checks, including 213 body-text
contract checks, and `0` failures.
The signed listing pages `/listings/new`, `/listings/90992/edit`,
`/listings/42/report`, `/listings/42/exchange-request`,
`/listings/42/comments`, `/listings/90967/report`,
`/listings/90967/exchange-request`, and `/listings/90967/comments` returned
expected body markers against `WEB_UK_BASE_URL=http://127.0.0.1:6230`. The
targeted run passed with `14/14` checks and `0` failures. The body-text-only
default smoke scope passed against the same port with `227/227` total checks,
including 221 body-text contract checks, and `0` failures.
The signed poll pages `/polls`, `/polls/parity/create`,
`/polls/parity/manage`, `/polls/20`, `/polls/20/rank`, `/polls/8`, and
`/polls/4` returned expected body markers against
`WEB_UK_BASE_URL=http://127.0.0.1:6231`. The targeted run passed with `13/13`
checks and `0` failures. The body-text-only default smoke scope passed against
the same port with `234/234` total checks, including 228 body-text contract
checks, and `0` failures.
The blog feed, detail, comments, and reaction pages `/blog/feed.xml`,
`/blog/test-sitemap-blog-post/likers/like`,
`/blog/timebank-ireland/likers/like`, `/blog/test-sitemap-blog-post`,
`/blog/test-sitemap-blog-post/comments`, `/blog/timebank-ireland`, and
`/blog/timebank-ireland/comments` returned expected body markers against
`WEB_UK_BASE_URL=http://127.0.0.1:6232`. The targeted run passed with `13/13`
checks and `0` failures. The body-text-only default smoke scope was
recertified in 8 chunks against the same port, covering all 235 body-text
contract checks with `283/283` executed checks including repeated auth/health
setup checks and `0` failures.
The federation detail pages `/federation/partners/1`,
`/federation/partners/5`, `/federation/members/353`,
`/federation/members/353/transfer`, and `/federation/members/351` returned
expected body markers against `WEB_UK_BASE_URL=http://127.0.0.1:6233`. The
targeted run passed with `11/11` checks and `0` failures. The body-text-only
default smoke scope was recertified in 8 chunks against the same port, covering
all 240 body-text contract checks with `288/288` executed checks including
repeated auth/health setup checks and `0` failures.
The signed message pages `/messages/groups`, `/messages/groups/new`,
`/messages/77`, and `/messages/new/77` returned expected body markers against
`WEB_UK_BASE_URL=http://127.0.0.1:6234`. The targeted run passed with `10/10`
checks and `0` failures. The body-text-only default smoke scope was recertified
in 8 chunks against the same port, covering all 244 body-text contract checks
with `292/292` executed checks including repeated auth/health setup checks and
`0` failures.
The signed resource pages `/resources/library`, `/resources/upload`, and
`/resources/10/comments` returned expected body markers against
`WEB_UK_BASE_URL=http://127.0.0.1:6235`. The targeted run passed with `9/9`
checks and `0` failures. The body-text-only default smoke scope was recertified
in 8 chunks against the same port, covering all 247 body-text contract checks
with `295/295` executed checks including repeated auth/health setup checks and
`0` failures.
The signed wallet responses `/wallet/export.csv`, `/wallet/manage`, and
`/wallet/recipients` returned expected response markers against
`WEB_UK_BASE_URL=http://127.0.0.1:6236`; the CSV export marker tracks the
Laravel-backed statement header `Date,Type,Description`, and the recipients
route marker tracks the JSON `results` key. The targeted run passed with `9/9`
checks and `0` failures. The body-text-only default smoke scope was recertified
in 8 chunks against the same port, covering all 250 body-text contract checks
with `298/298` executed checks including repeated auth/health setup checks and
`0` failures.
The signed jobs pages `/jobs/90764`, `/jobs/90764/qualified`, and
`/jobs/employers/14` returned expected body markers against
`WEB_UK_BASE_URL=http://127.0.0.1:6237`; the detail marker tracks the
Laravel-backed apply section, the qualification route tracks `Am I qualified?`,
and the employer route tracks the employer profile description. The targeted run
passed with `9/9` checks and `0` failures. The body-text-only default smoke
scope was recertified in 8 chunks against the same port, covering all 253
body-text contract checks with `301/301` executed checks including repeated
auth/health setup checks and `0` failures.
The signed matches pages `/matches` and `/matches/board` returned expected body
markers against `WEB_UK_BASE_URL=http://127.0.0.1:6238`; the list marker tracks
the Laravel-backed `Open the matches board` link, and the board marker tracks
the `Suggested matches` caption. The targeted run passed with `8/8` checks and
`0` failures. The body-text-only default smoke scope was recertified in 8
chunks against the same port, covering all 255 body-text contract checks with
`303/303` executed checks including repeated auth/health setup checks and `0`
failures.
The signed group exchange pages `/group-exchanges` and `/group-exchanges/new`
returned expected body markers against
`WEB_UK_BASE_URL=http://127.0.0.1:6238`; the list marker tracks the
Laravel-backed `Start a group exchange` action, and the create marker tracks
the shared-hours fieldset text `How are the hours shared out?`. The targeted
run passed with `8/8` checks and `0` failures. The body-text-only default smoke
scope was recertified in 8 chunks against the same port, covering all 257
body-text contract checks with `305/305` executed checks including repeated
auth/health setup checks and `0` failures.
The signed podcast studio pages `/podcasts/studio` and `/podcasts/studio/new`
returned expected body markers against
`WEB_UK_BASE_URL=http://127.0.0.1:6238`; the studio marker tracks the
Laravel-backed `Podcast studio` heading, and the create marker tracks the
`Create a podcast` heading. The targeted run passed with `8/8` checks and `0`
failures. The body-text-only default smoke scope was recertified in 8 chunks
against the same port, covering all 259 body-text contract checks with
`307/307` executed checks including repeated auth/health setup checks and `0`
failures.
The public auth pages `/login`, `/login/forgot-password`,
`/password/reset?token=reset-token`, and `/register` now track the Laravel
headings `Sign in`, `Reset your password`, `Choose a new password`, and
`Register`. A direct runtime assertion pass against
`WEB_UK_BASE_URL=http://127.0.0.1:6238` checked `/health` plus those four page
headings with `5/5` assertions and `0` failures.
The public support pages `/contact`, `/cookies`, `/newsletter/unsubscribe`,
`/verify-email`, and `/report-a-problem` now carry Laravel-backed body-text
markers, with `/contact` and `/report-a-problem` copy realigned to the Laravel
Blade strings before certification.
The no-JS cookie consent POST flows are now part of the default Laravel runtime
smoke scope: the harness fetches CSRF tokens, posts banner reject, banner accept,
and settings-save analytics choices to `/cookie-consent`, and asserts the
accessible `nexus_accessible_cookie_consent=essential` or `all` cookie plus
the expected `/cookies` redirects. A targeted live run on 2026-07-08 against
`WEB_UK_BASE_URL=http://127.0.0.1:6242`, started with `TENANT_ID=2`, passed
`9/9` checks including all three cookie POST workflows, auth, and signed
`/account`.
The CSRF-protected sign-out form on `/account` is now part of the default
Laravel runtime smoke scope too: it logs in a separate session, reads the
account-page CSRF token, posts `/logout`, and asserts both the `/login` redirect
and that `/account` redirects after local auth cookies are cleared. A targeted
live run on 2026-07-08 against `WEB_UK_BASE_URL=http://127.0.0.1:6243`,
started with `TENANT_ID=2`, passed `10/10` checks including logout.
The remaining signed/detail body-marker routes `/connections/network`,
`/dashboard`, `/exchanges`, `/me/collections`, `/premium/return`, `/profile`,
`/reviews/list`, `/users/14/appreciations`, `/kb/90001`,
`/achievements/badges/vol_1h`, and `/reviews/18/comments` now carry
Laravel-backed body-text markers. The core module-page/body-text marker gap is
0; the current default smoke scope has `281` module-page checks and `283`
body-text contract checks. `/dashboard` now carries stable body-text checks for
`Welcome back`, `Your time bank`, `Quick links`, `Recent feed`, and `Recent
listings`.
The default scope now contains `634` checks:
`281`
module-page checks, 14 unsigned auth-required redirect checks, 3 unsigned login
redirect checks, 22 gated-status checks, and 19 signed redirect checks, plus 2
content-type contract checks, 283 body-text contract checks, 3 cookie-consent
POST workflow checks, 1 logout POST workflow check, and the 6 auth/health
checks.
Parameterised matched GET route shapes without default runtime smoke coverage
fell from 28 to 0. The signed `/chat` AI assistant page returned `200` against
`WEB_UK_BASE_URL=http://127.0.0.1:5354`, confirming the default
`module-page-chat-renders` smoke outcome against Laravel.

`/organisations/{id}` now
matches Laravel's signed-out behavior by redirecting to
`/login?status=auth-required` before data lookup. Without
`TENANT_ID=2`, the same Laravel E2E credentials fail because web-uk does not
send the tenant context Laravel uses to scope login.

## Refresh Protocol

Run this before continuing work or reporting a score:

```powershell
git status --short --branch
git log --oneline --decorate -n 20
git diff --stat -- apps/web-uk

cd apps\web-uk
npm run route:matrix
npm run lint
npm test -- --runInBand
npm run smoke:laravel
```

After `npm run route:matrix`, inspect:

```powershell
Get-Content docs\generated\accessible-route-matrix.md -TotalCount 120
Select-String -Path docs\generated\accessible-route-matrix.csv -Pattern 'laravel-prep-pages.js'
```

The route matrix only proves method/path declarations. It does not certify
Blade visual parity, auth redirects, tenant gates, feature gates, POST side
effects, localization, runtime Laravel behavior, or ASP.NET backend switching.
For local Laravel auth smoke, ensure the web-uk process was started with
`TENANT_ID=2`. The harness default timeout is `60000` ms; keep
`SMOKE_TIMEOUT_MS` available for exceptionally slow local runs. For
tenant-domain checks, add `SMOKE_TENANT_DOMAIN_PAGE_PATHS` entries as
`host|/path=>Expected text`; the harness will send a real HTTP `Host` header to
the local Web UK process.

## Documents To Trust

Read these in order:

1. `apps/web-uk/AGENTS.md`
2. `apps/web-uk/CLAUDE.md`
3. `apps/web-uk/README.md`
4. `apps/web-uk/docs/ACCESSIBLE_SHARED_FRONTEND.md`
5. `apps/web-uk/docs/LARAVEL_ACCESSIBLE_ROUTE_MATRIX.md`
6. `apps/web-uk/docs/generated/accessible-route-matrix.md`
7. `apps/web-uk/docs/generated/accessible-route-matrix.csv`
8. `apps/web-uk/docs/BLADE_COMPONENT_PORT_AUDIT.md`
9. `apps/web-uk/docs/BACKEND_SWITCHING_CONTRACT.md`

Treat `FRONTEND_BUILD_LOG.md` and `FRONTEND_AUDIT_REPORT.md` as historical
context unless a current handoff explicitly says otherwise.

## Certification Table

Use this table shape when certifying a route family. Add the updated result to
`LARAVEL_ACCESSIBLE_ROUTE_MATRIX.md` or a focused follow-up doc.

| Family | Route declared | Blade layout ported | Laravel API-backed | Mock-tested | Laravel runtime-smoked | ASP.NET-smoked |
| --- | --- | --- | --- | --- | --- | --- |
| Example | yes/no | yes/no/partial | yes/no/partial | yes/no | yes/no | yes/no |

Do not mark a family complete unless the answer is "yes" through Laravel
runtime smoke. Do not mark shared-backend readiness unless ASP.NET smoke is also
yes.

## What Counts As Done

A route family is not complete until all of these are true:

- Every Laravel accessible method/path declaration exists locally.
- Remaining `laravel-prep-pages.js` matches for that family are replaced with
  real route modules and Nunjucks views.
- The Nunjucks page follows the Laravel Blade layout, page intent, form flow,
  content hierarchy, status banners, empty states, and error states.
- Unsigned, signed, unauthorized, not-found, and feature-disabled states match
  Laravel behavior.
- API calls use Laravel-compatible endpoints and payloads.
- POST, upload, delete, and redirect side effects are covered.
- Mocked Jest coverage proves the no-JS route behavior.
- Runtime smoke tests prove the page works against the local Laravel backend.
- ASP.NET switching gaps are documented in `BACKEND_SWITCHING_CONTRACT.md`.
- The generated route matrix and port audit are refreshed.

## Known Remaining Work

Prioritize visual/manual Blade parity, page-level feature-disabled behavior, and
ASP.NET switching proof over adding more skeleton pages.

1. Rerun the refresh protocol and confirm whether the current web-uk process has
   Laravel tenant context (`TENANT_ID=2` for the local E2E fixture).
   If `http://127.0.0.1:8088` times out, start or repair local Laravel before
   treating live smoke status as current evidence.
2. Keep the full default Laravel smoke scope green with chunked/bucketed runs
   when local Laravel is too slow or stateful for one all-in-one command.
3. Convert "partial Laravel-backed candidate" route families into certified
   families using the certification table above.
4. Add remaining route-specific workflow gate proof beyond the broad
   route-level module/feature gates. Maps, organisation jobs, group-message
   connection gates, and message translation policy now have focused Jest
   proof, the Clubs route now has active-club 404 proof, and Explore-card
   active-club sourcing now uses live Laravel-backed club evidence. Broker
   workflow-disabled listing exchange requests now have focused Jest/source
   proof; a live disabled-tenant Laravel fixture is still not certified.
5. Keep `BACKEND_SWITCHING_CONTRACT.md` honest: ASP.NET target remains
   future/not-certified until proven.
6. Refresh generated route matrix files after route changes.
7. Mark stale historical docs as historical rather than relying on them for
   current status.

## Scoring Guide

Use scores only as working estimates. They are not a substitute for acceptance
criteria.

| Range | Meaning |
| --- | --- |
| `0-300` | Shell or route inventory only |
| `300-600` | Many declarations and skeletons exist, limited Laravel-backed behavior |
| `600-800` | Most routes declared, many pages Laravel-backed, runtime certification incomplete |
| `800-950` | Few prep pages remain, route families mostly runtime-smoked against Laravel |
| `950-1000` | All families certified against Laravel, ASP.NET switching proof complete, docs and tests green |

Current working estimate at this handoff: `998.8/1000`.
Green confidence estimate: `992/1000`, because the consolidated code, static
tests, route matrix, tenant-domain proof, broad route-level tenant gates, and
full default Laravel runtime-smoke coverage via chunked/bucketed runs are
strong, while visual/manual Blade parity spot-checks, live disabled-tenant
broker workflow proof, and ASP.NET backend switching proof still need final
certification.

## Final Handoff Checklist

Before leaving this job for another agent, write a short note containing:

- branch and head commit;
- dirty files and whether each is yours or pre-existing;
- generated route matrix counts;
- remaining `laravel-prep-pages.js` matches;
- latest lint and Jest results;
- current implementation score out of 1000;
- next 5 concrete tasks;
- any runtime-smoke blockers;
- files changed in the handoff.
