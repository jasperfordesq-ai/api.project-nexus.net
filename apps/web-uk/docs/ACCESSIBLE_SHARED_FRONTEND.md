# apps/web-uk Shared Accessible Frontend Notes

Last reviewed: 2026-07-06

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

Backend target resolution is Laravel-first and lives in:

```text
apps/web-uk\src\lib\backend-contract.js
```

By default, `apps/web-uk` resolves API calls to the local Laravel staging base
URL `http://127.0.0.1:8088`. `ACCESSIBLE_BACKEND_TARGET=aspnet` remains future
work and must not be treated as certified compatibility.

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

The shell feeds:

- custom Project NEXUS `nexus-alpha-header`
- GOV.UK service navigation
- no-JS language selector
- footer columns
- Explore card list and Laravel-backed live discovery sections

The `/explore` page is a protected Laravel-backed candidate. It redirects
unsigned visitors to `/login?status=auth-required`, calls Laravel
`/api/v2/explore`, renders the Blade Explore card list, and shows live listing
and event sections when the aggregate response includes them. Tenant feature
gating, exact recent-listing source parity, clubs detection, localization, and
runtime behavior are not certified.

The `/account` page is now a local Blade-style protected account hub candidate.
Unsigned requests redirect to `/login`, matching the Laravel accessible account
route. Signed-in requests render the Blade-style account card list for wallet,
messages, connections, notifications, profile, and settings, plus a
CSRF-protected sign-out form. The protected notifications module also exposes
the Laravel accessible `/notifications/group/read` and
`/notifications/delete-all` POST aliases against the Laravel v2 notification API.
The protected wallet module exposes a no-JS `/wallet/donate` form and POST route
against Laravel `/api/v2/wallet/donate` with the same donation status keys.
Saved-item removal and appreciation send/react POST aliases are also wired to
Laravel `/api/v2/me/saved-items` and `/api/v2/appreciations`.
Saved-collection create/update/delete and item-remove POST aliases are wired to
Laravel `/api/v2/me/collections` and `/api/v2/me/saved-items/{id}` while keeping
Laravel status redirects such as `collection-created`, `collection-updated`,
`collection-deleted`, and `item-removed`.
Match-dismiss POST aliases are wired to Laravel `/api/v2/matches/{id}/dismiss`
for both `/matches/{id}/dismiss` and `/matches/board/{listingId}/dismiss`,
including the board `source` redirect and `#matches-top` fragment.
Exchange action and rating POST aliases are wired to Laravel `/api/v2/exchanges`
for accept/decline/start/complete/confirm/cancel actions and
`/api/v2/exchanges/{id}/rate` for no-JS ratings.
Search saved-search POST aliases are wired to Laravel `/api/v2/search/saved`:
`/search/saved` stores the Laravel-normalized query allow-list, delete calls
`DELETE /api/v2/search/saved/{id}`, and run calls
`POST /api/v2/search/saved/{id}/run` before redirecting to `/search/advanced`.
Achievement POST aliases are wired to Laravel `/api/v2/gamification`: daily
reward, challenge claim, shop purchase, and showcase update preserve the
Laravel accessible status redirects for `/achievements`, `/achievements/shop`,
and `/achievements/showcase`.
Member profile POST aliases are wired to Laravel v2 APIs for connection
transitions, skill endorsements, block/unblock, profile reviews, and direct
wallet transfers while preserving Laravel profile status redirects.
Message POST aliases are wired to Laravel v2 message and group conversation
APIs for archive/restore, message edit/delete/translate, group create/reply,
member add/remove, and group reactions while preserving Laravel status redirects
and anchors. Voice-message upload proxies multipart audio to
`/api/v2/messages/voice` with Laravel-compatible status redirects.
Resource POST aliases are wired to Laravel v2 APIs for resource upload,
resource delete, admin reorder, resource comments, comment deletion, and
resource reactions while preserving Laravel library/comment status redirects.
Settings POST aliases are wired to Laravel v2 user settings and sub-account
APIs for appearance/theme, weekly availability, GDPR data-right requests,
linked-account request/approve/permission/revoke, and multipart insurance
uploads while preserving Laravel status redirects and anchors. Settings GET
pages remain generated preparation pages or local legacy settings pages, and
linked-account data rendering, tenant feature gates, localization, insurance
upload runtime smoke tests, and ASP.NET backend compatibility are not certified.
Blog POST aliases are wired to Laravel v2 blog/comment/reaction APIs for
post comments, comment-thread replies, post likes/reactions, and comment
update/delete/reactions while preserving Laravel post and comment-thread status
anchors.
Poll POST aliases are wired to Laravel v2 poll/comment/feed-like APIs for
standard and ranked poll creation, votes, ranked votes, poll deletion, comments,
and likes while preserving Laravel poll, poll detail, ranked-vote, and manage
status redirects.
Feed POST aliases are wired to Laravel v2 feed/social APIs for post
create/update/delete, multipart post image upload from the Blade-style compose
form, typed likes/comments/reactions, poll votes, hide/not-interested, reports,
shares, saves, comment update/delete/reactions, and user mute while preserving Laravel feed status redirects and
`#feed-item-*` anchors.
The member onboarding POST aliases now cover `/onboarding/{step}` and
`/onboarding/avatar`: profile saves bio through the profile API, interests and
skills are held in the Express session, safeguarding uses Laravel's Blade-style
`safeguarding[id]` fields and `/api/v2/onboarding/safeguarding`, and confirm
uses `/api/v2/onboarding/complete`. Avatar upload proxies multipart image data
to `/api/v2/users/me/avatar`.
This remains partial: Laravel tenant feature gating, full account-link coverage,
per-module backend data, route availability checks, localization, realtime
behavior, runtime smoke tests, and ASP.NET backend compatibility are not
certified.

The cookie banner and `/cookies` page are now local Blade-style no-JS
candidates. The shell renders the GOV.UK cookie banner before the skip link
until the Laravel-compatible `nexus_alpha_cookie_consent` cookie is present.
Accept/reject/save posts use `/cookie-consent` and store `all` or `essential`
locally, matching Laravel's first-party choice cookie values. This remains
partial: Laravel `cookie_consents` audit persistence, tenant scoping, route-name
generation, localization, runtime smoke tests, and ASP.NET backend
compatibility are not certified.

Listing GET pages remain local/protected pages or generated preparation pages,
but the Laravel accessible POST aliases under `/listings` are now local route
declarations backed by Laravel v2 listing, comment, feed-like, and exchange
APIs. The aliases cover save/unsave, renew, report, like, comment/reply,
exchange request creation, and AI description generation redirects while
preserving Laravel status keys and `#like` / `#add-comment` fragments. This
remains partial: Blade listing/detail/comment/report/exchange-request rendering,
generated description value repopulation, image and skill-tag form parity,
owner/requester authorization depth, tenant/feature gates, localization, runtime
smoke tests, and ASP.NET backend compatibility are not certified.

The `/chat` page is now a partial Laravel-backed candidate for the Blade AI
assistant. Signed-in GET requests call Laravel `/api/ai/conversations` and, when
`?c=` is present, `/api/ai/conversations/{id}` to render the conversation list,
selected thread, warning text, empty/error states, and no-JS message form. POST
`/chat` sends trimmed messages to Laravel `/api/ai/chat` and preserves Laravel
`empty`, `sent`, and `auth-required` redirect statuses. This remains partial:
Laravel tenant `ai_chat` feature-gate proof, provider-enabled notice parity,
fallback reply/tool-card display, localization, runtime smoke tests, and ASP.NET
backend compatibility are not certified.

Marketplace GET pages remain preparation pages, but the Laravel accessible POST
aliases under `/marketplace` are now local route declarations backed by Laravel
v2 marketplace APIs. The aliases cover listing create/update/delete/renew,
listing image upload from the Blade-style create/edit form, save/unsave, buy,
offer, report, offer accept/decline/withdraw, order ship, confirm, cancel, pay
intent creation, rate, seller profile onboarding, pickup slot
create/update/delete/scan, and seller coupon create/update/delete. This remains
partial: marketplace Blade rendering, seller dashboard data, hosted no-JS
Stripe checkout redirects, address/onboarding depth, merchant profile image
uploads, tenant/feature gates, localization, runtime smoke tests, and ASP.NET
backend compatibility are not certified.

Podcast GET pages remain preparation pages, but the Laravel accessible POST
aliases under `/podcasts` are now local route declarations backed by Laravel v2
podcast APIs. The aliases cover show subscription, studio show
create/update/publish/delete, and episode add/publish/delete including
multipart audio uploads to `/api/v2/podcasts/{showId}/episodes`. This remains
partial: RSS/media rendering, author configuration gates, moderation state,
localization, runtime smoke tests, and ASP.NET backend compatibility are not
certified.

Ideation GET pages remain preparation pages, but the Laravel accessible POST
aliases under `/ideation` are now local route declarations backed by Laravel v2
ideation APIs. The aliases cover challenge create/update/status/favorite,
duplicate, delete, campaign linking, and outcome updates; idea submit, draft,
comment, vote, status, media, convert-to-group, and delete actions; and campaign
create/update/delete plus challenge unlinking. This remains partial: Blade
rendering, admin authorization depth, multipart/media upload proxying, team
conversion runtime behavior, tenant/feature gates, localization, runtime smoke
tests, and ASP.NET backend compatibility are not certified.

Group exchange GET pages remain preparation pages, but the Laravel accessible
POST aliases under `/group-exchanges` are now local route declarations backed by
Laravel `/api/v2/group-exchanges`. The aliases cover group exchange creation,
participant add/remove, participant confirmation, organiser completion, and
organiser cancellation while preserving Laravel status redirects and
`#group-exchange-top` fragments. This remains partial: Blade detail rendering,
organiser/participant authorization depth, same-tenant member search, time-credit
settlement runtime behavior, feature gates, localization, runtime smoke tests,
and ASP.NET backend compatibility are not certified.

Event GET pages remain existing local/protected pages or preparation pages, but
the Laravel accessible POST aliases under `/events` are now local route
declarations backed by Laravel v2 event, poll, and UGC translation APIs. The
aliases cover waitlist join/leave, attendee check-in, poll attach/update, poll
vote, recurring event update, translation request redirects, and cover image
uploads from the Blade-style create/edit forms through
`/api/v2/events/{id}/image` while the list, detail, and edit pages show the
current Laravel cover image when the event payload includes one. The create and
edit forms now also load Laravel event categories from `/api/v2/categories` and
carry the category plus Laravel's online/remote attendance fields (`is_online`,
`online_link`, `allow_remote_attendance`, and `video_url`) into event
create/update payloads. The create form now renders Laravel recurrence controls
and sends recurring creates through `/api/v2/events/recurring`, following the
Laravel template response shape for redirects. Redirects preserve Laravel status
keys and `#poll-*` fragments. This remains partial: cover image removal is still
blocked by the absence of a Laravel v2 clear/delete event-image API contract,
and recurring series edit/display depth, full Blade list/detail rendering,
owner/participant authorization depth, rendered translation result display,
event notification/XP/waitlist promotion side effects, tenant/feature gates,
localization, runtime smoke tests, and ASP.NET backend compatibility are not
certified.

The `/volunteering` page is now a local Blade-style public landing candidate
for the Laravel accessible volunteering page. It renders the caption, lead,
organisation browse link, how-volunteering-works inset, sign-in notice, filter
form, opportunity cards, empty/error states, and cursor load-more link. Its
opportunity list is backed by Laravel `/api/v2/volunteering/opportunities`
using `search`, `category_id`, `is_remote`, `per_page`, and `cursor`
parameters. Its `/volunteering/opportunities/{id}` page is backed by
`/api/v2/volunteering/opportunities/{id}` and renders the Blade-style public
detail, organisation summary, opportunity metadata, available shifts, and safe
apply link. Laravel POST aliases now cover applications, shift signup/cancel,
application withdrawal, hours, accessibility needs, certificate generation,
waitlists, swaps, emergency alert responses, credential delete plus safe upload
proxying, wellbeing check-ins, donations, group reservations, expenses,
training, incidents, opportunity creation, and organisation owner
application/hour, settings, and wallet actions through Laravel v2 volunteering
APIs. This remains partial: recommended shifts and other GET depth pages still
use generated preparation pages, and feature gates, tenant-prefixed routes,
localization, runtime smoke tests, and ASP.NET backend compatibility are not
certified.

The `/organisations` page is now a local Blade-style candidate for the Laravel
accessible organisations directory. It includes the caption, subnavigation,
search form, empty state, status banners, registration copy, registration form,
terms, and pending notice. Its directory list is backed by the Laravel
`/api/v2/volunteering/organisations` collection using `search` and `per_page`
parameters. Its `/organisations/browse` page is also backed by that collection,
using `search`, `per_page`, and cursor-style load-more pagination. Its
`/organisations/register` page renders the Blade-style standalone registration
form and Laravel validation status anchors. `/organisations` POST and
`/organisations/register` POST validate the same required fields/terms, require a
signed token, submit to Laravel `/api/v2/volunteering/organisations`, and redirect
with Laravel status keys. Its `/organisations/manage` page renders the Blade-style
manage entry and, when a signed token is present, reads
`/api/v2/volunteering/my-organisations` for owner/admin and pending rows. Its
detail page is backed by
`/api/v2/volunteering/organisations/{id}?include=public_contract` for profile,
contact, basic public stats, and Laravel-backed depth sections from
`/api/v2/volunteering/opportunities?organization_id={id}` and
`/api/v2/volunteering/reviews/organization/{id}`. Its
`/organisations/{id}/jobs` page renders the Blade-style organisation job
openings view and, when a signed token is present, reads
`/api/v2/jobs?organization_id={id}&status=open`. Its
`/organisations/opportunities/{id}/apply` page renders the Blade-style apply
confirmation page and reads `/api/v2/volunteering/opportunities/{id}`. This
remains partial: auth enforcement, volunteering/job feature gates,
tenant-prefixed routes, organisation registration runtime persistence, apply
confirmation depth, localization, runtime smoke tests, and ASP.NET backend
compatibility are not certified.

Additional preparation docs:

- `LARAVEL_ACCESSIBLE_ROUTE_MATRIX.md` maps Blade route families and shell links
  to current `apps/web-uk` equivalents.
- `BLADE_COMPONENT_PORT_AUDIT.md` tracks what visual/workflow patterns have and
  have not been ported from Blade.
- `BACKEND_SWITCHING_CONTRACT.md` documents future Laravel/ASP.NET backend
  switching requirements without implementing a real adapter yet.

Generated route-matrix artifacts live under `docs/generated/` and are refreshed
with `npm run route:matrix`. The 2026-07-06 generated baseline is 608 Laravel
accessible route declarations, 599 `apps/web-uk` route declarations, 517 exact
method/path matches, 91 missing Laravel routes, and 83 local-only routes. These
counts include generated Laravel GET preparation pages and are backlog evidence
only; they do not certify workflow parity.

## Before Extraction To Its Own Repo

- Keep this `docs/` folder.
- Keep `AGENTS.md` and `CLAUDE.md`.
- Keep package scripts for brand checks, tests, and Sass build.
- Keep generated CSS reproducible from Sass.
- Keep route/workflow certification docs close to this folder.
