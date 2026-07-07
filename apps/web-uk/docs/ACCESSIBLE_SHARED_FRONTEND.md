# apps/web-uk Shared Accessible Frontend Notes

Last reviewed: 2026-07-07

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

Runtime smoke evidence now has a dedicated command:

```bash
npm run smoke:laravel
```

The command checks Laravel API reachability, web-uk health, unsigned `/account`
redirects, `/login` CSRF handling, login POST redirect behavior, and a signed
`/account` render. It also verifies the default public Laravel-backed module
pages `/volunteering`, `/organisations`, `/organisations/browse`, `/kb`, and
`/help` return successful responses from the web-uk app while it is pointed at
Laravel, plus the signed module pages `/explore`, `/saved`, `/notifications`,
`/members`, `/members/discover`, `/resources`, `/skills`, `/goals`, `/clubs`,
`/wallet`, `/messages`, `/connections`, `/connections/network`, `/matches`,
`/matches/board`, `/activity`, `/achievements`, `/leaderboard`,
`/nexus-score`, `/profile/settings`,
`/settings/appearance`, `/settings/data-rights`, `/federation`, `/courses`,
`/courses/mine`, `/marketplace`, `/marketplace/mine`, `/events`,
`/events/new`, `/listings`, `/search/advanced`, `/premium`, and `/podcasts`,
plus deeper signed subpages
across profile, settings, achievements, leaderboard, federation, courses,
marketplace, static/legal/support, goals, groups, ideation, jobs, message
groups, polls, resource-library, reviews, wallet management, and volunteering
after the same login flow. The harness defaults to Laravel's local E2E fixture
(`e2e.user.a@project-nexus.local`, `TestPassword123!`, tenant slug
`hour-timebank`).

On 2026-07-07 the command passed `93/93` checks end-to-end against a temporary
web-uk process started with `TENANT_ID=2` and
`WEB_UK_BASE_URL=http://127.0.0.1:5293`. A follow-up live probe against
`WEB_UK_BASE_URL=http://127.0.0.1:5294` expanded the default harness, which then
passed `158/158` checks against `WEB_UK_BASE_URL=http://127.0.0.1:5295`.
`/feed` is now part of the default signed page set and renders the local
Blade-style feed page with an empty/error state when Laravel's feed collection
API is unavailable; a later run against
`WEB_UK_BASE_URL=http://127.0.0.1:5297` passed `159/159` checks. The
plain `/connections` index is now also in scope and renders the signed page
with an empty/error state when Laravel's legacy connections API is unavailable,
and a later run against `WEB_UK_BASE_URL=http://127.0.0.1:5298` passed
`160/160` checks. Plain `/members` is now also in scope and renders the signed
member directory with an empty/error state when Laravel's legacy members API is
unavailable; a later run against
`WEB_UK_BASE_URL=http://127.0.0.1:5299` passed `161/161` checks. `/events/new`
and `/marketplace/onboarding` are now also in the default signed scope and
render their Blade-style forms with empty/error setup state when Laravel helper
APIs are unavailable; a later run against
`WEB_UK_BASE_URL=http://127.0.0.1:5302` passed `163/163` checks. The
harness default timeout is now `30000` ms because Laravel-backed
profile/settings and discovery pages can be slow in the local fixture. Keep the
tenant context visible: the same Laravel E2E credentials return `401` when
web-uk does not send Laravel's tenant id `2` as `X-Tenant-ID`. Live probing
still leaves
`/jobs/bias-audit`, `/jobs/talent-search`, and `/marketplace/coupons` outside
because they return feature-gated or role-gated `403`, and leaves signed-in
auth, onboarding, and premium-management redirect pages outside because they do
not render 2xx in the signed E2E session.

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
deeper runtime behavior are not certified; the signed `/explore` page is
covered by the default Laravel runtime smoke.

The public `/kb` and `/kb/{id}` pages are Laravel-backed knowledge-base
candidates. They read Laravel `/api/v2/kb`, `/api/v2/kb/search`, and
`/api/v2/kb/{id}` to render the Blade-style article search, cards, view-count
metadata, cursor load-more link, article back link, author/update metadata,
sanitized article body, and related-article links. Feedback, attachments, admin
editing, tenant routing, localization, article detail runtime smoke, and
ASP.NET backend compatibility are not certified; the `/kb` index is covered by
the default Laravel runtime smoke.

The public auth and email aliases include Laravel-style forgot-password,
reset-password, two-factor, email verification, and newsletter unsubscribe
pages. `/verify-email` renders the Blade missing, invalid, and confirmation
states and calls Laravel `/api/auth/verify-email` when a token is present.
`/newsletter/unsubscribe` renders the Blade missing, invalid, and confirmation
states; when a token is present it calls Laravel `/api/v2/newsletter/unsubscribe`
before rendering the confirmation or invalid state. Tenant-domain routing,
localization, and live email-token runtime behavior are not certified.

The `/account` page is now a local Blade-style protected account hub candidate.
Unsigned requests redirect to `/login`, matching the Laravel accessible account
route. Signed-in requests render the Blade-style account card list for wallet,
messages, connections, notifications, profile, and settings, plus a
CSRF-protected sign-out form. The protected notifications module also exposes
the Laravel accessible `/notifications/group/read` and
`/notifications/delete-all` POST aliases against the Laravel v2 notification API.
The protected wallet module exposes a no-JS `/wallet/donate` form and POST route
against Laravel `/api/v2/wallet/donate` with the same donation status keys.
`/wallet/manage` now renders a Blade-style manage-credits hub backed by Laravel
`/api/v2/wallet/balance`, `/api/v2/wallet/community-fund`, and
`/api/v2/wallet/user-search`, including summary stats, recipient search,
transfer forms, donation target controls, and status states. `/wallet/recipients`
returns Laravel wallet user-search suggestions for progressive enhancement, and
`/wallet/export.csv` streams the Laravel `/api/v2/wallet/statement` CSV
download. Tenant module gates, exact live recipient privacy behavior,
localization, and deeper wallet workflows are not certified; the signed
`/wallet`, `/saved`, and `/notifications` pages are covered by the default
Laravel runtime smoke.
`/saved` now redirects unsigned visitors to `/login?status=auth-required`, reads
Laravel `/api/v2/bookmarks` with the Blade type filter, and renders the
Blade-style saved item list, empty state, status banner, item links, type tags,
and remove forms. Saved-item removal and appreciation send/react POST aliases
are also wired to Laravel `/api/v2/me/saved-items` and `/api/v2/appreciations`.
Saved-collection GET list/detail pages now redirect unsigned visitors to
`/login?status=auth-required`, read Laravel `/api/v2/me/collections` and
`/api/v2/me/collections/{id}/items`, and render Blade-style collection cards,
item cards, pagination, create/edit/delete, and remove-item controls.
Saved-collection create/update/delete and item-remove POST aliases are wired to
Laravel `/api/v2/me/collections` and `/api/v2/me/saved-items/{id}` while keeping
Laravel status redirects such as `collection-created`, `collection-updated`,
`collection-deleted`, and `item-removed`. `/profile/delete-account` now redirects
unsigned visitors to `/login?status=auth-required` and renders the Blade-style
warning, password confirmation, optional reason, confirmation checkbox, and
status error states before its existing Laravel-compatible delete POST alias
runs. `/profile/settings` now redirects unsigned visitors to
`/login?status=auth-required`, loads Laravel-compatible profile, account,
notification, match, skill, passkey, session, and safeguarding payloads where
available, and renders the Blade-style settings links, profile photo, personal
details, public profile, privacy, newsletter, skills, security, language,
notifications, match, personalisation, safeguarding, and data/privacy sections.
`/profile/two-factor` now redirects unsigned visitors to
`/login?status=auth-required`, reads a Laravel-compatible two-step verification
setup/status payload, and renders the Blade-style authenticator app setup,
QR/setup key, verification form, enabled-state backup-code count, disable form,
success banners, and validation error summary.
`/profile/blocked` now redirects unsigned visitors to
`/login?status=auth-required`, reads the Laravel-compatible blocked-members
payload when available, and renders the Blade-style blocked member cards, empty
state, success banner, and unblock forms through the existing member unblock
POST alias.
Public collection and appreciation wall GET pages now redirect unsigned visitors
to `/login?status=auth-required`,
read Laravel `/api/v2/users/{id}/public-collections` and
`/api/v2/users/{id}/appreciations`, and render the Blade-style public collection
cards, thank-you form, appreciation cards, reaction forms, status messages, and
pagination. Tenant routing, localization, runtime smoke tests, and ASP.NET
backend compatibility are not certified.
Member discovery GET `/members/discover` now redirects unsigned visitors to
`/login?status=auth-required`, calls Laravel-compatible
`/api/v2/users?sort=communityrank`, and renders the Blade-style recommended
member page with filter navigation, search, recommendation score progress,
member cards, profile links, and load-more navigation. Member proximity GET
`/members/nearby` now redirects unsigned visitors to
`/login?status=auth-required`, reads the signed-in profile location, calls
Laravel-compatible `/api/v2/members/nearby`, and renders the Blade-style
radius/search page with no-location guidance, member distance cards, profile
links, and load-more navigation. Member reputation GET
`/members/{id}/insights` now redirects unsigned visitors to
`/login?status=auth-required`, reads the signed-in profile plus Laravel
`/api/v2/users/{id}` and `/api/v2/users/{id}/verification-badges`, and renders
the Blade-style NEXUS score, activity stats, verification badges, and earned
badges page. Base directory and profile visual parity, feature gates,
localization, deeper member workflow runtime smoke, and ASP.NET backend
compatibility are not certified; the signed `/members/discover` page is covered
by the default Laravel runtime smoke.
Matches GET pages now redirect unsigned visitors to `/login?status=auth-required`,
call Laravel-compatible `/api/v2/matches/all`, and render the Blade-style
`/matches` summary plus the `/matches/board` stats/filter board. Match-dismiss
POST aliases are wired to Laravel `/api/v2/matches/{id}/dismiss` for both
`/matches/{id}/dismiss` and `/matches/board/{listingId}/dismiss`, including the
board `source` redirect and `#matches-top` fragment. Tenant module gates,
event-source API filtering, localization, runtime smoke tests, and ASP.NET
backend compatibility are not certified.
Exchange action and rating POST aliases are wired to Laravel `/api/v2/exchanges`
for accept/decline/start/complete/confirm/cancel actions and
`/api/v2/exchanges/{id}/rate` for no-JS ratings.
Search advanced GET now redirects unsigned visitors to
`/login?status=auth-required`, calls Laravel `/api/v2/search` with the Blade
advanced-search filters, calls `/api/v2/search/saved` for saved-search cards,
and renders the Blade-style result tabs for listings, members, events, and
groups. Saved-search POST aliases are wired to Laravel `/api/v2/search/saved`:
`/search/saved` stores the Laravel-normalized query allow-list, delete calls
`DELETE /api/v2/search/saved/{id}`, and run calls
`POST /api/v2/search/saved/{id}/run` before redirecting to `/search/advanced`.
The saved-search delete confirmation GET reads the owner-scoped saved-search
list from `/api/v2/search/saved` and renders the Blade-style warning form.
Plain `/connections` now stays renderable with the existing Blade-style empty
state and error banner if Laravel's legacy `/api/connections` endpoint is not
available. `/connections/network` now redirects unsigned visitors to
`/login?status=auth-required`, calls Laravel `/api/v2/connections` for the
accepted, pending-received, and pending-sent sections plus
`/api/v2/connections/pending` for counts, and renders the Blade-style network
tabs, status banners, search form, member cards, connected-since metadata, and
connection action forms. The `/connections/{id}/accept`,
`/connections/{id}/decline`, and `/connections/{id}/remove` POST handlers now
call Laravel v2 connection helpers and preserve Laravel status redirects.
Tenant feature gates, localization, runtime behavior, and ASP.NET backend
compatibility are not certified.
`/achievements` now redirects unsigned visitors to
`/login?status=auth-required`, calls Laravel-compatible gamification profile,
badge, progress, daily reward, and challenge endpoints, and renders the
Blade-style achievements summary, daily reward, challenge, earned badge, and
badge-progress sections. `/achievements/shop` renders the Laravel-style XP shop
from `/api/v2/gamification/shop`, including balance, purchase warnings, item
cards, status banners, and no-JS purchase forms. `/achievements/collections`
renders Laravel badge collections from `/api/v2/gamification/collections`,
including progress, reward XP, completed/bonus states, and earned/locked badge
links. `/achievements/engagement` renders the Laravel-style 12-month engagement
history table from `/api/v2/gamification/engagement-history`, including active
status tags and pluralized activity counts. `/achievements/showcase` renders
the Laravel-style earned-badge checkbox management page from
`/api/v2/gamification/badges`, including success/error status states and the
existing no-JS save form. `/achievements/badges/{key}` renders the Laravel-style
badge detail summary from `/api/v2/gamification/badges/{key}`, including earned
status, metadata rows, showcased state, and the view-all link. Achievement POST
aliases are wired to Laravel `/api/v2/gamification`: daily reward, challenge
claim, shop purchase, and showcase update preserve the Laravel accessible status
redirects for `/achievements`, `/achievements/shop`, and
`/achievements/showcase`.
`/leaderboard` now redirects unsigned visitors to
`/login?status=auth-required`, calls Laravel-compatible gamification
leaderboard and community-dashboard endpoints, and renders the Blade-style
leaderboard tab strip, community impact stats, metric/period filter form, table,
current-user tag, and empty state.
`/leaderboard/competitive` now redirects unsigned visitors, calls the
Laravel-compatible competitive leaderboard and current-season endpoints, and
renders the Blade-style back link, active-season card, active leaderboard tabs,
metric/period filter, rank banner, table, and load-more link.
`/leaderboard/seasons` now redirects unsigned visitors, calls the
Laravel-compatible seasons/current and seasons endpoints, and renders the
Blade-style current-season card, rewards, season leaders, and past-seasons
table.
`/leaderboard/journey` now redirects unsigned visitors, calls the
Laravel-compatible personal-journey endpoint, and renders the Blade-style
summary list, milestones, monthly activity table, badge progression list, and
empty states.
`/leaderboard/spotlight` now redirects unsigned visitors, calls the
Laravel-compatible member-spotlight endpoint, and renders the Blade-style daily
featured-member card list and empty state.
`/nexus-score` and `/nexus-score/tiers` now redirect unsigned visitors, call the
Laravel-compatible gamification NEXUS score endpoint, and render the
Blade-style NEXUS score overview, tier-ladder related link, score panel,
breakdown progress table, insights list, nine-tier ladder with the current tier
highlighted, points-to-next inset, reached/current/locked status tags, and
unavailable-score empty states.
Member profile POST aliases are wired to Laravel v2 APIs for connection
transitions, skill endorsements, block/unblock, profile reviews, and direct
wallet transfers while preserving Laravel profile status redirects.
`/activity` and `/activity/insights` now redirect unsigned visitors to
`/login?status=auth-required`, call the Laravel-compatible profile activity
dashboard endpoint, and render the Blade-style contribution summary, engagement
stats, skills breakdown, monthly hours, detailed-insights navigation, timeline,
dual-bar insights chart, quick stats, and typed activity badges.
Message GET pages now render Laravel Blade direct and group conversations in
Nunjucks. Signed-in `/messages/new/{userId}` requests call Laravel-compatible
`/api/v2/messages/{userId}`, `/api/v2/messages/restriction-status`,
`/api/v2/messages/{userId}/read`, and optional listing context before rendering
the direct conversation title, listing inset, search, older-message link,
message list, reply, voice, and archive controls. Group requests call
Laravel-compatible `/api/v2/conversations/groups`,
`/api/v2/conversations/{id}/messages`, `/api/v2/conversations/{id}/participants`,
and `/api/v2/users/search` for the no-JS member picker. Message POST aliases
are wired to Laravel v2 message and group conversation APIs for archive/restore,
message edit/delete/translate, group create/reply, member add/remove, and group
reactions while preserving Laravel status redirects and anchors. Voice-message
upload proxies multipart audio to `/api/v2/messages/voice` with
Laravel-compatible status redirects.
The group invite GET page now renders the Blade-style signed group-admin invite
surface. `/groups/{id}/invite` reads Laravel-compatible group detail and invite
listing data, then renders the back link, generated invite-link inset, link
expiry form, email invitation form, pending invitation table, revoke forms, and
Laravel status banners. Group invite link/email/revoke POST aliases already call
Laravel-compatible group invite endpoints. `/groups/{id}/notifications` now
reads Laravel-compatible group detail and notification preference data, then
renders the Blade-style frequency radios, channel checkboxes, save form, and
status banners. `/groups/{id}/image` now reads Laravel-compatible group detail
and renders the Blade-style avatar and cover image management page, including
current image previews or empty insets, multipart upload forms, and image
status banners. `/groups/{id}/announcements` and
`/groups/{id}/announcements/{annId}/edit` now read Laravel-compatible group and
announcement data, then render the Blade-style announcement cards, admin
edit/pin/delete controls, create form, edit form, and announcement status
states. `/groups/{id}/discussions`, `/groups/{id}/discussions/new`, and
`/groups/{id}/discussions/{discussionId}` now read Laravel-compatible group and
discussion data, then render the Blade-style discussion cards, member-only start
button, create form, thread article, reply list, reply form, and discussion
status states. `/groups/{id}/files` now reads Laravel-compatible group detail
and file listing data, then renders the Blade-style file table, download/delete
actions, upload form, empty state, and file status banners.
`/groups/{id}/files/{fileId}/download` now proxies the Laravel-compatible
binary download response and preserves safe download headers. `/groups/{id}/manage`
now reads Laravel-compatible member and pending-request data, then renders the
Blade-style management page with request decisions and member role/removal
forms. Owner/admin authorization depth, tenant/feature gates, localization,
deeper resource runtime behavior, and ASP.NET backend compatibility are not
certified; the signed `/resources` page is covered by the default Laravel
runtime smoke.
Resource POST aliases are wired to Laravel v2 APIs for resource upload,
resource delete, admin reorder, resource comments, comment deletion, and
resource reactions while preserving Laravel library/comment status redirects.
Settings POST aliases are wired to Laravel v2 user settings and sub-account
APIs for appearance/theme, weekly availability, GDPR data-right requests,
linked-account request/approve/permission/revoke, and multipart insurance
uploads while preserving Laravel status redirects and anchors. `/settings/appearance`
now redirects unsigned visitors to `/login?status=auth-required`, reads the
current theme from the Laravel-compatible user settings payload when available,
and renders the Blade-style theme form and status states. `/settings/linked-accounts`
now renders the Blade-style incoming/managed linked-account sections, empty
states, request form, relationship choices, permission checkboxes, and status
states while loading Laravel-compatible sub-account payloads when available.
`/settings/data-rights`
renders the Blade-style request form, GDPR status banners, empty request-history
state, and submits through the existing Laravel-compatible POST alias.
`/settings/availability` renders the Blade-style weekly availability grid with
status states and submits through the existing Laravel-compatible POST alias.
`/settings/insurance` redirects unsigned visitors to `/login?status=auth-required`,
loads the Laravel-compatible certificate list when available, renders the
Blade-style certificate cards, empty state, status banners, and multipart
certificate upload form, and submits through the existing Laravel-compatible
POST alias.
Other settings GET pages remain generated preparation pages or local legacy
settings pages, and live linked-account runtime behavior, data-rights history loading,
tenant feature gates, localization, insurance upload/list runtime smoke tests, and
ASP.NET backend compatibility are not certified.
Blog POST aliases are wired to Laravel v2 blog/comment/reaction APIs for
post comments, comment-thread replies, post likes/reactions, and comment
update/delete/reactions while preserving Laravel post and comment-thread status
anchors.
Poll POST aliases are wired to Laravel v2 poll/comment/feed-like APIs for
standard and ranked poll creation, votes, ranked votes, poll deletion, comments,
and likes while preserving Laravel poll, poll detail, ranked-vote, and manage
status redirects.
Feed GET `/feed/posts/{id}` is wired to Laravel v2 post permalink data,
`/feed/item/{type}/{id}` is wired to Laravel v2 polymorphic feed-item data,
`/feed/hashtags` is wired to Laravel v2 hashtag trending/search APIs, and
`/feed/hashtag/{tag}` is wired to the Laravel v2 hashtag post collection API,
rendering Blade-style public post permalink, typed-item permalink, discovery,
and hashtag post-list pages. Feed POST aliases are wired to Laravel v2
feed/social APIs for post create/update/delete, multipart post image upload from
the Blade-style compose form, typed likes/comments/reactions, poll votes,
hide/not-interested, reports, shares, saves, comment update/delete/reactions,
and user mute while preserving Laravel feed status redirects and `#feed-item-*`
anchors.
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

The `/listings/{id}/report`, `/listings/{id}/exchange-request`,
`/listings/{id}/analytics`, and `/listings/{id}/comments` GET pages are now
partial Laravel-backed Blade candidates: they redirect unsigned visitors with
Laravel's `auth-required` status, load the listing from `/api/v2/listings/{id}`,
and render Blade-style report, exchange request, owner analytics, and comment
thread pages. The exchange request form also reads the Laravel wallet balance
endpoint for balance context; the analytics page reads
`/api/v2/listings/{id}/analytics` with Laravel's allowed period selector; the
comments page reads `/api/v2/comments?target_type=listing&target_id={id}`.
Other listing GET pages remain local/protected pages or
generated preparation pages, but the Laravel accessible POST aliases under
`/listings` are local route declarations backed by Laravel v2 listing, comment,
feed-like, and exchange APIs. The aliases cover save/unsave, renew, report,
like, comment/reply, exchange request creation, and AI description generation
redirects while preserving Laravel status keys and `#like` / `#add-comment`
fragments. This remains partial: Blade listing/detail rendering,
generated description value repopulation, image and skill-tag form parity,
owner/requester authorization depth, tenant/feature gates, localization, runtime
smoke tests, and ASP.NET backend compatibility are not certified.

The `/exchanges` and `/exchanges/{id}` pages are now partial Laravel-backed
candidates for the Blade exchange list and detail workflows. Signed-in GET
requests call Laravel `/api/v2/exchanges/config`, `/api/v2/exchanges`,
`/api/v2/exchanges/{id}`, and completed-exchange ratings from
`/api/v2/exchanges/{id}/ratings` to render the Blade-style tab filter, exchange
cards, detail summary, member action link, role-appropriate no-JS action forms,
review form, ratings, and timeline. POST `/exchanges/{id}` and
`/exchanges/{id}/rate` continue to use Laravel v2 exchange action/rating APIs
with Laravel status redirects. This remains partial: exact module/feature gates,
tenant behavior, authorization edge cases, localization, live workflow side
effects, and ASP.NET backend compatibility are not certified.

The `/chat` page is now a partial Laravel-backed candidate for the Blade AI
assistant. Signed-in GET requests call Laravel `/api/ai/conversations` and, when
`?c=` is present, `/api/ai/conversations/{id}` to render the conversation list,
selected thread, warning text, empty/error states, and no-JS message form. POST
`/chat` sends trimmed messages to Laravel `/api/ai/chat` and preserves Laravel
`empty`, `sent`, and `auth-required` redirect statuses. This remains partial:
Laravel tenant `ai_chat` feature-gate proof, provider-enabled notice parity,
fallback reply/tool-card display, localization, runtime smoke tests, and ASP.NET
backend compatibility are not certified.

The `/skills` page is now a partial Laravel-backed candidate for the Blade
skills directory. Unsigned visitors redirect to `/login?status=auth-required`;
signed-in GET requests call Laravel `/api/v2/skills/categories`, optional
`/api/v2/skills/categories/{id}`, and optional
`/api/v2/skills/members?skill=...&limit=40`, then render the Blade-style skill
search form, member result list with proficiency/offers/wants tags, category
skill count table, back-to-categories link, and nested category browser. This
remains partial: exact tenant captions, localization, auth edge cases beyond the
page guard, deeper runtime smoke behavior, and ASP.NET backend compatibility are
not certified; the signed `/skills` page is covered by the default Laravel
runtime smoke.

The `/goals` page is now a partial Laravel-backed candidate for the Blade goals
index. Unsigned visitors redirect to `/login?status=auth-required`; signed-in
GET requests call Laravel `/api/v2/goals?per_page=30` and render Blade-style
status banners, goal navigation links, goal cards with active/completed and
public/private tags, streak and progress display, empty state, and the no-JS
create-goal form. `/goals/templates` now redirects unsigned visitors to
`/login?status=auth-required`, calls Laravel `/api/v2/goals/templates/categories`
and `/api/v2/goals/templates`, and renders the Blade-style category filter,
template cards, target hints, title override form, public checkbox, status
error, and load-more link. `/goals/discover` redirects unsigned visitors to
`/login?status=auth-required`, calls Laravel `/api/v2/goals/discover`, and
renders the Blade-style public buddy-goal list, owner names, progress display,
buddy status errors, empty state, and no-JS buddy form. `/goals/buddying`
redirects unsigned visitors to `/login?status=auth-required`, calls Laravel
`/api/v2/goals/mentoring` and `/api/v2/goals/discover`, and renders the
Blade-style buddying/available-goals sections, owner names, progress display,
nudge and become-buddy forms, status success/error states, and empty states.
`/goals/{id}/edit` redirects unsigned visitors to `/login?status=auth-required`,
loads the goal from Laravel-compatible goal detail data, and renders the
Blade-style owner edit form, prefilled date/check-in/public fields, error state,
and delete warning/form. `/goals/{id}/checkin` redirects unsigned visitors to
`/login?status=auth-required`, loads Laravel-compatible goal detail and recent
check-in data, and renders the Blade-style progress, mood, note, status, and
recent check-in history page. `/goals/{id}/reminder` redirects unsigned visitors
to `/login?status=auth-required`, loads Laravel-compatible goal detail and
reminder data, and renders the Blade-style active/no-reminder status, frequency
radios, enabled checkbox, save form, and remove-warning form.
`/goals/{id}/buddy-actions` redirects unsigned visitors to
`/login?status=auth-required`, loads Laravel-compatible goal detail data, and
renders the Blade-style buddy support type radios, hint text, optional message,
status, and send form. `/goals/{id}/history` redirects unsigned visitors to
`/login?status=auth-required`, loads Laravel-compatible goal detail and progress
history data, and renders the Blade-style chronological timeline, event type
tags, empty state, and cursor pagination link. `/goals/{id}/insights` redirects
unsigned visitors to `/login?status=auth-required`, loads Laravel-compatible goal
detail and insights data, and renders the Blade-style streak, cadence,
check-in, milestone, buddy-support, and owner/buddy action sections.
`/goals/{id}/social` redirects unsigned visitors to
`/login?status=auth-required`, loads Laravel-compatible goal detail, social
summary, and threaded comments data, and renders the Blade-style support toggle,
like/comment counts, reply/delete controls, status banners, validation error,
and add-comment form. Existing goal POST aliases continue to call Laravel v2
goals, comment, and like APIs. This remains partial: the detail GET page, exact
tenant captions, goals feature-gate behavior, localization, runtime persistence,
and ASP.NET backend compatibility are not certified; the signed `/goals` page is
covered by the default Laravel runtime smoke.

The `/coupons` and `/coupons/{id}` pages are now partial Laravel-backed
candidates for the Blade public merchant-coupon browsing flow. Unsigned
visitors redirect to `/login?status=auth-required`; signed-in GET requests call
Laravel `/api/v2/coupons` and `/api/v2/coupons/{id}` and render Blade-style
coupon cards, discount tags, coupon codes, valid-until metadata, empty state,
detail back link, coupon-code panel, redemption guidance, and merchant summary
metadata. This remains partial: exact tenant captions, merchant-coupons feature
gate behavior, QR redemption/validation POST workflows, localization, runtime
persistence, and ASP.NET backend compatibility are not certified.

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

The `/ideation`, `/ideation/new`, `/ideation/{id}`, `/ideation/{id}/edit`,
`/ideation/{id}/manage`, `/ideation/{id}/outcome`,
`/ideation/{id}/drafts`,
`/ideation/{id}/ideas/{ideaId}`, `/ideation/tags`, `/ideation/campaigns`,
`/ideation/campaigns/{id}`, and `/ideation/outcomes` GET pages are now partial
Laravel-backed candidates for the Blade ideation challenge list, create/edit
challenge forms, manage hub, outcome editor, drafts, detail, idea detail, tag-browser,
campaigns, campaign detail, and outcomes dashboard flows. Unsigned visitors redirect to
`/login?status=auth-required`; signed GET requests call Laravel
`/api/v2/ideation-challenges`, `/api/v2/ideation-categories`,
`/api/v2/ideation-templates`, `/api/v2/ideation-challenges/{id}`,
`/api/v2/ideation-challenges/{id}/ideas?limit=30&sort=votes`, and
`/api/v2/ideation-challenges/{id}/ideas?limit=100&sort=votes`,
`/api/v2/ideation-challenges/{id}/ideas/drafts`,
`/api/v2/ideation-challenges/{id}/outcome`,
`/api/v2/ideation-ideas/{ideaId}`,
`/api/v2/ideation-ideas/{ideaId}/comments?per_page=30`,
`/api/v2/ideation-ideas/{ideaId}/media`, `/api/v2/ideation-tags/popular`,
plus `/api/v2/ideation-campaigns?per_page=50`,
`/api/v2/ideation-campaigns/{id}`, and `/api/v2/ideation-outcomes/dashboard`,
then render Blade-style search/status filters, challenge cards, status tags,
idea counts, success/error banners, the create/edit challenge form with
category and template options where Laravel provides them, challenge metadata,
prize inset, idea cards/detail, vote forms, the submit-idea form, draft edit/publish
forms, idea comments, attachments, admin controls, conversion and delete
controls, challenge lifecycle controls, campaign-link controls,
favourite/duplicate/delete management forms, popular tag links, selected-tag
challenge matches, tag empty states, campaign tabs, campaign status banners,
campaign cards, campaign detail metadata, linked challenge cards, challenge
counts, creator metadata, outcome edit forms, outcome stats, and outcome tables.
Existing POST aliases still call Laravel v2 ideation
APIs for challenge create/update/status/favorite, duplicate, delete, campaign
linking, outcome updates, idea submit/draft/comment/vote/status/media/
convert-to-group/delete actions, and campaign create/update/delete plus
challenge unlinking. This remains partial: admin authorization depth, multipart/media
upload proxying, team conversion runtime behavior, tenant/feature gates,
localization, runtime smoke tests, and ASP.NET backend compatibility are not
certified.

The `/group-exchanges`, `/group-exchanges/new`, and `/group-exchanges/{id}` GET
pages are now partial Laravel-backed candidates for the Blade group exchange
workflow. Unsigned visitors redirect to `/login?status=auth-required`; signed
list/detail requests call Laravel `/api/v2/group-exchanges` and
`/api/v2/group-exchanges/{id}`, detail pages also read `/api/v2/users/search`
for the organiser participant picker, and create/detail pages render the
Laravel-style forms that post to the existing aliases. POST aliases under
`/group-exchanges` still call Laravel `/api/v2/group-exchanges` for exchange
creation, participant add/remove, participant confirmation, organiser
completion, and organiser cancellation while preserving Laravel status redirects
and `#group-exchange-top` fragments. This remains partial: full
organiser/participant authorization depth, same-tenant member search parity,
time-credit settlement runtime behavior, feature gates, localization, runtime
smoke tests, and ASP.NET backend compatibility are not certified.

Generated event GET route fallbacks are now cleared from the route matrix.
`/events/browse` renders the Blade-style category chooser with
Laravel event categories from `/api/v2/categories?type=event`,
`/events/{id}/map` now renders a Laravel-backed Blade-style location page
through `/api/v2/events/{id}`, including the event back link, address,
coordinates, no-JS OpenStreetMap embed/links, and no-map states for online or
coordinate-less events, and `/events/{id}/polls` now renders the signed
Blade-style organiser poll attachment page from `/api/v2/events/{id}` plus
`/api/v2/polls?mine=1&per_page=100`. `/events/{id}/translate` now renders the
signed Blade-style translation chooser through `/api/v2/events/{id}`, including
status states, the 11 Laravel locale options, the original description, and the
existing no-JS translate POST target. `/events/{id}/recurring-edit` now renders
the signed Blade-style repeating-event scope edit page through `/api/v2/events/{id}`,
including single/all scope radios, datetime-local fields, the update warning,
and upcoming occurrence links. The Laravel accessible POST aliases under
`/events` are now local route declarations backed by Laravel v2 event, poll, and UGC
translation APIs. The
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
and translated result display after POST, full Blade list/detail rendering,
owner/participant authorization depth, event notification/XP/waitlist promotion
side effects, tenant/feature gates, localization, runtime smoke tests, and
ASP.NET backend compatibility are not certified.

The `/volunteering` page is now a local Blade-style public landing candidate
for the Laravel accessible volunteering page. It renders the caption, lead,
organisation browse link, how-volunteering-works inset, sign-in notice, filter
form, opportunity cards, empty/error states, and cursor load-more link. Its
opportunity list is backed by Laravel `/api/v2/volunteering/opportunities`
using `search`, `category_id`, `is_remote`, `per_page`, and `cursor`
parameters. Its `/volunteering/opportunities/{id}` page is backed by
`/api/v2/volunteering/opportunities/{id}` and renders the Blade-style public
detail, organisation summary, opportunity metadata, available shifts, and safe
apply link. Its `/volunteering/accessibility` page redirects unsigned visitors
to `/login?status=auth-required`, reads saved need rows from Laravel
`/api/v2/volunteering/accessibility-needs`, and renders the Blade-style need
type checkboxes, description, adjustments, emergency contact, status banners,
and no-JS save form. Its `/volunteering/certificates` page redirects unsigned
visitors to `/login?status=auth-required`, reads the member's certificates from
Laravel `/api/v2/volunteering/certificates`, and renders the Blade-style
generate form, status banners, empty state, certificate cards, organisation
hour breakdown, verification code, and download link. Its
`/volunteering/certificates/{code}/download` route first proves the requested
verification code belongs to the signed-in member by reading
`/api/v2/volunteering/certificates`, then streams Laravel's printable certificate
HTML from `/api/v2/volunteering/certificates/{code}/html` with the Blade-style
inline filename. Its
`/volunteering/credentials` page redirects unsigned visitors to
`/login?status=auth-required`, reads the member's credentials from Laravel
`/api/v2/volunteering/credentials`, and renders the Blade-style upload form,
status banners, type options, credential table, status tags, expiry/uploaded
dates, and delete controls. Its `/volunteering/hours` page redirects unsigned
visitors to `/login?status=auth-required`, reads Laravel
`/api/v2/volunteering/hours/summary`, `/api/v2/volunteering/hours`,
`/api/v2/volunteering/applications`, and
`/api/v2/volunteering/my-organisations`, and renders the Blade-style summary
stats, by-organisation/by-month tables, log-hours form, and recent hour-log
cards. Its `/volunteering/wellbeing` page redirects unsigned visitors to
`/login?status=auth-required`, reads Laravel
`/api/v2/volunteering/wellbeing`, and renders the Blade-style wellbeing score,
burnout-risk tag, hours/streak stats, warnings, mood check-in form, status
banners, and recent check-ins table. Its `/volunteering/donations` page
redirects unsigned visitors to `/login?status=auth-required`, reads Laravel
`/api/v2/volunteering/giving-days` and
`/api/v2/volunteering/donations?per_page=20`, and renders the Blade-style
money-donation explanation, fundraising stats, giving-day campaign cards,
donation history table, status banners, and offline bank transfer/PayPal form.
Its `/volunteering/expenses` page redirects unsigned visitors to
`/login?status=auth-required`, reads Laravel
`/api/v2/volunteering/expenses?per_page=50` and
`/api/v2/volunteering/my-organisations?per_page=50`, and renders the
Blade-style expense totals, submit-claim form, status banners, and claims
table.
Its `/volunteering/emergency-alerts` page redirects unsigned visitors to
`/login?status=auth-required`, reads Laravel
`/api/v2/volunteering/emergency-alerts`, and renders the Blade-style urgent
shift request cards, priority tags, metadata summary lists, status banners,
accepted/declined states, and no-JS response forms.
Its `/volunteering/group-signups` page redirects unsigned visitors to
`/login?status=auth-required`, reads Laravel
`/api/v2/volunteering/group-reservations`, and renders the Blade-style group
reservation cards, member status table, leader add/remove member controls,
cancel warning, and status banners.
Its `/volunteering/training` and `/volunteering/incidents` pages redirect
unsigned visitors to `/login?status=auth-required`, read Laravel
`/api/v2/volunteering/training` and `/api/v2/volunteering/incidents`, and
render the Blade-style safeguarding tab navigation, training-record form and
table, incident report form and table, status tags, validation banners, and
confidentiality notice.
Its `/volunteering/waitlist` and `/volunteering/swaps` pages redirect unsigned
visitors to `/login?status=auth-required`, read Laravel
`/api/v2/volunteering/my-waitlists`, `/api/v2/volunteering/swaps`, and
`/api/v2/volunteering/shifts?limit=50`, and render the Blade-style waitlist
cards, leave-waitlist forms, swap request form, sent/received swap cards,
accept/decline controls, cancel controls, status tags, and banners.
Its `/volunteering/my-organisations` and `/volunteering/recommended-shifts`
pages redirect unsigned visitors to `/login?status=auth-required`, read Laravel
`/api/v2/volunteering/my-organisations?per_page=20` and
`/api/v2/volunteering/recommended-shifts?limit=15&min_score=20`, and render the
Blade-style role filter, organisation status cards, dashboard links,
pagination, recommended-shift cards, match-score progress, applied tags, and
opportunity links.
Its `/volunteering/opportunities/create` page redirects unsigned visitors to
`/login?status=auth-required`, reads manageable organisations from
`/api/v2/volunteering/my-organisations?per_page=50`, reads volunteering
categories from `/api/v2/categories?type=volunteering`, filters the form to
approved/active owner-admin organisations, and renders the Blade-style
opportunity creation form and validation status states.
Its organisation-owner pages
(`/volunteering/organisations/{id}/dashboard`, `/manage`, `/settings`,
`/volunteers`, and `/wallet`) redirect unsigned visitors to
`/login?status=auth-required`, read Laravel owner-scoped volunteering APIs for
organisation stats, pending applications, pending hours, public organisation
details, volunteers, wallet summary, and wallet transactions, and render the
Blade-style dashboard stats, quick actions, management review cards, settings
form, volunteers table, wallet auto-pay/deposit forms, transaction table, and
status banners.
Laravel POST aliases now
cover applications, shift signup/cancel, application withdrawal, hours,
accessibility needs, certificate generation, waitlists, swaps, emergency alert
responses, credential delete plus safe upload proxying, wellbeing check-ins,
donations, group reservations, expenses, training, incidents, opportunity
creation, and organisation owner application/hour, settings, and wallet actions
through Laravel v2 volunteering APIs. This remains partial: credential download,
feature gates, tenant-prefixed routes, localization, deeper volunteering
workflow runtime smoke, and ASP.NET backend compatibility are not certified; the
public `/volunteering` landing/search page is covered by the default Laravel
runtime smoke.

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
confirmation depth, localization, deeper organisation workflow runtime smoke,
and ASP.NET backend compatibility are not certified; `/organisations` and
`/organisations/browse` are covered by the default Laravel runtime smoke.

The public support pages now replace the static Help centre and Trust and safety
placeholders. `/help` is backed by Laravel `/api/v2/help/faqs`, preserving the
Blade FAQ search query, grouped GOV.UK accordion structure, empty/no-result
states, and contact CTA. `/trust-and-safety` ports the Laravel Blade safety
warning, exchange flow, platform responsibility, vetting, insurance, dispute,
member responsibility, rights, contact CTA, and community-guidelines link. This
remains partial: tenant-domain routing, localization, deeper FAQ behavior, and
ASP.NET backend compatibility are not certified; `/help` is covered by the
default Laravel runtime smoke.

The public legal footer destinations now replace the static legal and
accessibility placeholders. `/legal` renders the Blade-style legal document card
hub, `/accessibility` renders the Blade accessibility statement, and
`/legal/terms`, `/legal/privacy`, `/legal/cookies`,
`/legal/community-guidelines`, and `/legal/acceptable-use` read tenant-managed
documents from Laravel `/api/v2/legal/{type}`. When Laravel has no published
document, the pages render the same GOV.UK-structured fallback copy as the
Laravel Blade views. This remains partial: tenant-domain routing, localization,
legal acceptance prompts, version history/compare links, live runtime behavior,
and ASP.NET backend compatibility are not certified.

The signed reviews pages now replace the generated review GET preparation
fallbacks. `/reviews` reads Laravel-compatible received, given, pending, and
stats review endpoints and renders the Blade-style summary with pending-review
forms. `/reviews/list` renders the received/given cursor list, and
`/reviews/{id}/comments` renders the Blade-style discussion page from Laravel
review, comment, and reaction APIs. This remains partial: feature gates,
moderation/deletion display, threaded reply depth, localization, live runtime
behavior, and ASP.NET backend compatibility are not certified.

The public about and guide pages now replace the static About, Guide, Features,
and FAQ placeholders. `/about` renders the Blade-style community intro,
four-step how-it-works list, values, contributor credits, open-source links, and
signed-in or signed-out CTA group. `/guide` renders the Blade-style timebanking
explanation, equal-time principle, three-step ordered list, and signed-in or
signed-out CTA group. `/features` renders the Blade-style community feature list
and link back to `/guide`. `/faq` renders the Blade-style GOV.UK accordion with
the five translated timebanking questions and answers. This remains partial:
tenant-domain routing, module-gated CTA visibility, localization, runtime
behavior, live platform stats, and ASP.NET backend compatibility are not
certified.

Additional preparation docs:

- `LARAVEL_ACCESSIBLE_ROUTE_MATRIX.md` maps Blade route families and shell links
  to current `apps/web-uk` equivalents.
- `BLADE_COMPONENT_PORT_AUDIT.md` tracks what visual/workflow patterns have and
  have not been ported from Blade.
- `BACKEND_SWITCHING_CONTRACT.md` documents future Laravel/ASP.NET backend
  switching requirements without implementing a real adapter yet.

Generated route-matrix artifacts live under `docs/generated/` and are refreshed
with `npm run route:matrix`. The current generated baseline is 608 Laravel
accessible route declarations, 690 `apps/web-uk` route declarations, 608 exact
method/path matches, 0 missing Laravel routes, and 83 local-only routes. These
counts include generated Laravel GET preparation pages and are backlog evidence
only; they do not certify workflow parity.

## Before Extraction To Its Own Repo

- Keep this `docs/` folder.
- Keep `AGENTS.md` and `CLAUDE.md`.
- Keep package scripts for brand checks, tests, and Sass build.
- Keep generated CSS reproducible from Sass.
- Keep route/workflow certification docs close to this folder.
