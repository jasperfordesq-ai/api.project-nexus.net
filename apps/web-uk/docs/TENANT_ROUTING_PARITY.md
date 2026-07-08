# Web UK Tenant Routing Parity

Last reviewed: 2026-07-08

This note records the Laravel tenant-routing contract that `apps/web-uk` must
clone before it can be called tenant-domain parity complete.

## Laravel Source Of Truth

Read these Laravel files before changing Web UK tenant routing:

- `C:\platforms\htdocs\staging\routes\govuk-alpha.php`
- `C:\platforms\htdocs\staging\app\Core\TenantContext.php`
- `C:\platforms\htdocs\staging\app\Http\Middleware\EnsureAccessibleCustomDomain.php`
- `C:\platforms\htdocs\staging\app\Http\Middleware\InjectHostTenantSlug.php`
- `C:\platforms\htdocs\staging\app\Http\Middleware\StripTenantSlugOnAccessibleDomain.php`
- `C:\platforms\htdocs\staging\app\Http\Controllers\GovukAlpha\AlphaController.php`
- `C:\platforms\htdocs\staging\app\Http\Controllers\Api\TenantBootstrapController.php`

Laravel registers the same accessible route set twice:

1. Shared platform hosts use `/{tenantSlug}/alpha/...`; the path identifies the
   tenant.
2. Dedicated accessible custom domains use slugless paths; the host identifies
   the tenant through `tenants.accessible_domain`, Laravel injects the route
   tenant slug for controller compatibility, and response rewriting strips
   `/{tenantSlug}/alpha` from generated HTML links and redirects.

Laravel root behavior is also tenant-aware:

- Shared root `/` renders the tenant chooser.
- A dedicated accessible custom-domain root `/` renders that tenant's accessible
  home. Laravel bootstrap may expose either `accessible_domain` or the broader
  tenant `domain`, depending on fixture/source path.
- The master tenant is seeded as ID `1` and is excluded from the chooser. When
  Laravel bootstrap exposes a configured master domain, such as
  `project-nexus.ie` locally, that host should render the master network landing
  instead of the shared chooser.
- Parent custom-domain routing can resolve direct child tenants from the first
  non-reserved path segment, for example `parent-domain.test/child-slug`.
- `/api/v2/tenant/bootstrap?slug={slug}` is the public Laravel data source for
  tenant metadata. Its payload includes `domain`, `accessible_domain`, and
  `parent_domain` when those are configured.

## Web UK Canonical Public Slug

The user does not want new public Web UK routes to expose `alpha`. Web UK should
therefore use `/accessible` as the cleaner shared-host mount while preserving
Laravel route parity internally.

Current implemented slice:

- `GET /{tenantSlug}/accessible` and nested paths are stripped to the existing
  flat Express route set for local route matching.
- `GET /{tenantSlug}/alpha...` redirects permanently to the same
  `/{tenantSlug}/accessible...` path.
- The shared shell locals now expose `urlFor()` and prefix header, service-nav,
  footer, cookie, report-problem, and home-page CTA links under the active
  shared mount.
- Shared-mount local redirects are rewritten back under
  `/{tenantSlug}/accessible`, so auth redirects such as `/dashboard` to
  `/login` stay inside the tenant-visible accessible path.
- Rendered HTML responses under the shared mount rewrite local root-relative
  `href` and `action` attributes to the active `/{tenantSlug}/accessible`
  prefix while leaving assets, API paths, health checks, service-worker paths,
  uploads, and other infrastructure URLs unprefixed.
- Shared root `/` renders the Laravel-style tenant chooser backed by
  `/api/v2/tenants` without `include_master`, excludes the master tenant, and
  links communities to the cleaner `/{tenantSlug}/accessible` mount.
- Tenant-mounted roots render the Laravel Blade-style tenant home instead of
  the old generic Web UK home. Shared mount `/{tenantSlug}/accessible` loads
  tenant bootstrap and tenant-scoped public platform stats, renders the
  `Accessible` page, and rewrites links under the active shared mount. Web UK
  forwards the active tenant slug to Laravel `/api/v2/platform/stats` with
  `X-Tenant-Slug`, matching Laravel's path-resolved `TenantContext`.
- Non-local Host values are resolved through Laravel
  `/api/v2/tenant/bootstrap`; when Laravel returns a tenant whose
  `accessible_domain` or `domain` matches the request host, Web UK treats the
  request as a slugless custom-domain route. `X-Forwarded-Host` is accepted
  before the socket host for reverse-proxy custom-domain routing.
- Dedicated custom-domain root `/` renders the resolved tenant home and keeps
  generated local links flat, matching Laravel's custom-domain behavior without
  exposing either `/alpha` or `/{tenantSlug}/accessible`. For this mode, Web UK
  forwards the resolved Host and Origin to Laravel `/api/v2/platform/stats` and
  `/api/v2/tenant/bootstrap` so host-resolved tenant stats use the same lookup
  path as Laravel's accessible runtime.
- Master and parent/cluster custom-domain roots render Laravel SEO h1/intro
  copy plus `tenant_switcher` communities. Same-host switcher URLs are converted
  to relative paths, while external community domains remain absolute.
- Parent-domain child tenant paths now resolve the first non-reserved path
  segment through Laravel `/api/v2/tenant/bootstrap?slug={slug}`. When Laravel
  returns `parent_domain` matching the request host, Web UK serves the flat
  accessible app below `/{childSlug}` and rewrites local links and redirects to
  remain under that child path. This mirrors Laravel's parent custom-domain
  child resolution without exposing either `/alpha` or `/accessible`.

Current gaps:

- Most individual templates still contain direct root-relative paths. Shared
  tenant-mount rendering now protects those links at response time, but the
  templates still need gradual conversion to `urlFor()` or equivalent helpers
  so custom-domain and flat-host modes remain easier to audit. The first
  focused source conversion covers `src/views/events/detail.njk`, including
  breadcrumbs, group/member links, RSVP/admin forms, attendee links, and the
  report return path. The next focused source conversion covers
  `src/views/account.njk`, including account card links and the CSRF-protected
  logout form action. The following focused source conversion covers the
  activity dashboard and insights templates, including the detailed-insights
  link and back-to-activity links. The latest focused source conversion covers
  the achievements/gamification templates, including tabs, back links, daily
  reward/challenge/purchase/showcase forms, badge collection links, and badge
  detail links. The newest focused source conversion covers the leaderboard
  and NEXUS score templates, including tabs, back links, filter forms,
  load-more links, tier links, and member profile links. The latest focused
  source conversion covers the profile and settings templates, including
  profile summary links, settings card links, profile/security/privacy forms,
  two-step verification actions, blocked member unblock forms, delete-account
  controls, and settings appearance, availability, data-rights,
  linked-account, and insurance form actions. The latest focused source
  conversion covers group detail, listing detail, member profile, and the
  shared report-link partial, including breadcrumbs, action controls, report
  return targets, listing report links, member connection controls, and member
  review actions. The latest focused source conversion covers marketplace
  offers and my-listings management templates, including offer tabs, dynamic
  listing links, offer decision forms, my-listings tabs, create/view/edit
  links, and renew/delete forms. The latest focused source conversion also
  covers marketplace browse, detail, buyer-action, search, seller profile, and
  onboarding templates, including browse tabs, listing/card/category links,
  search and category filter forms, listing detail buy/offer/save/report
  controls, buyer buy/offer/report forms, listing create/edit form actions,
  seller profile links, and seller onboarding controls. The latest focused
  source conversion also covers marketplace coupon, order, and pickup-slot
  management templates, including coupon links/forms, order tabs and actions,
  and pickup-slot scan/edit/delete forms. The marketplace source-template
  family now has source-level `urlFor()` coverage for local marketplace links
  and forms. The latest focused source conversion covers the federation member
  detail template, including the back link, federation service navigation,
  opt-in CTA, connection/message forms, and transfer CTA. The latest focused
  source conversion covers the connections index and network templates,
  including tabs, pending-request links, member links, action forms,
  empty-state member CTAs, pagination, search form, load-more links, and
  route-provided card links/actions. The latest focused source conversion
  covers the notifications index template, including breadcrumbs, filters,
  read/delete form actions, redirect hidden values, pagination, and the unread
  empty-state CTA. The latest focused source conversion covers the group
  exchange list/create/detail templates, including the create CTA, status tabs,
  detail links, create form, participant add/remove/search forms, confirmation
  form, and complete/cancel actions.
- Custom-domain routing is covered by Jest for host-resolved root requests,
  including Laravel `domain`, `accessible_domain`, master-domain, cluster-domain,
  forwarded-host, and host-scoped platform-stats lookup behavior. Direct live
  Laravel bootstrap calls and a direct Web UK middleware harness resolve
  `timebank.global` and `project-nexus.ie` correctly. A full temporary Web UK
  process smoke now also covers `timebank.global|/=>Exchange Skills Across
  Borders` with `TENANT_ID=2`; host-scoped bootstrap/stats calls suppress that
  default `X-Tenant-ID` so Laravel resolves from Host/Origin instead.
- Parent-domain child-tenant paths are covered by Jest for a parent-host child
  login page and by live Laravel runtime smoke against the local
  `hour-timebank` fixture, whose public bootstrap payload includes
  `parent_domain: timebank.global`.
- Shared tenant-root home rendering is covered by Jest and a scoped live
  Laravel smoke against `/hour-timebank/accessible`, checking `Accessible`,
  `Connecting Communities`, and `What you can do` in the rendered page body.
- Tenant-scoped home stats are covered by focused Jest for shared-mount slug
  routing and custom accessible-domain host routing. A live local Laravel check
  on 2026-07-08 for `/hour-timebank/accessible` rendered the tenant-scoped
  stats from `X-Tenant-Slug=hour-timebank`: `946` members, `1,988` hours
  exchanged, `129` listings, and `1` community.

## First Verified Slice

The first shared-mount runtime test is in:

```text
apps/web-uk/tests/routes.test.js
```

It verifies that `/acme/accessible` renders the existing home page with prefixed
shell links and that `/acme/alpha/login?status=auth-required` redirects to
`/acme/accessible/login?status=auth-required`.

The second shared-mount runtime slice verifies that protected-route redirects
and rendered login-page form/link targets remain under
`/acme/accessible/...` instead of escaping to flat root paths.

The third shared-root slice verifies that `/` renders Laravel's tenant chooser,
excludes the master tenant, and links active communities to
`/{tenantSlug}/accessible` instead of Laravel's legacy alpha mount.

The fourth tenant-domain slice verifies that a non-local Host resolved by
Laravel tenant bootstrap as `accessible_domain` renders the tenant home at
slugless `/`, does not render the tenant chooser, and does not leak
`/{tenantSlug}/accessible` or `/{tenantSlug}/alpha` into root-page links.

The fifth parent-domain child slice verifies that
`parent-domain.test/{childSlug}/login` resolves `{childSlug}` through Laravel
tenant bootstrap, renders the child tenant's login page, keeps form and
registration links under `/{childSlug}`, and does not leak either `/alpha` or
`/accessible`.

The sixth runtime-smoke slice adds `SMOKE_TENANT_DOMAIN_PAGE_PATHS` to
`scripts/laravel-runtime-smoke.js`. Each entry uses
`host|/path=>Expected text`, sends the request to `WEB_UK_BASE_URL` with a real
HTTP `Host` header, asserts the expected body text, and rejects generated
`/alpha` or `/accessible` links. On 2026-07-08, a live run against Laravel
`http://127.0.0.1:8088` and a temporary Web UK process at
`http://127.0.0.1:6320` passed with
`SMOKE_TENANT_DOMAIN_PAGE_PATHS=timebank.global|/hour-timebank/login=>Sign in`.
The emitted check was
`tenant-domain-page-timebank-global-hour-timebank-login-renders`.

The seventh tenant-home slice verifies that `/{tenantSlug}/accessible` renders
Laravel's Blade-style tenant home, including tenant name, tagline, module
availability, sign-in status, and platform stats. A scoped live smoke on
2026-07-08 against Laravel `http://127.0.0.1:8088` and temporary Web UK
`http://127.0.0.1:6330` passed body-text checks for
`/hour-timebank/accessible=>Accessible`,
`/hour-timebank/accessible=>Connecting Communities`, and
`/hour-timebank/accessible=>What you can do`.

The eighth tenant-home stats slice verifies that Web UK does not fetch
platform-wide stats for tenant home pages. Shared-mount requests now call
Laravel `/api/v2/platform/stats` with the active `X-Tenant-Slug`, while
custom accessible-domain requests call the same endpoint with the resolved
request `Host`. Focused Jest covers both request shapes, and a live local
Laravel proof on 2026-07-08 rendered `/hour-timebank/accessible` with the
tenant-scoped stat values `946`, `1,988`, `129`, and `1`.

The ninth host-domain network landing slice verifies that Laravel `domain`
hosts are treated as custom root hosts, not only `accessible_domain` hosts.
Tests cover `timebank.global` rendering the Timebank Global cluster landing,
`project-nexus.ie` rendering the master network landing, and `X-Forwarded-Host:
timebank.global` resolving ahead of a local socket host. The page uses Laravel
SEO h1/intro text and `tenant_switcher` communities, converts same-host
community links to relative paths, preserves external domains, and never emits
the legacy `/alpha` slug. API tests also prove host-scoped bootstrap/stats
calls send `Origin: https://{host}` with the normalized Host.

The tenth host-root runtime slice fixes the live-process gap that Jest did not
cover: local Laravel runtime smokes start Web UK with `TENANT_ID=2` for auth,
but that default tenant id was being added to host-scoped public bootstrap and
platform stats calls. Laravel prioritizes `X-Tenant-ID`, so the full process
received `hour-timebank` bootstrap data and fell back to the shared chooser for
`Host: timebank.global`. Web UK now omits `X-Tenant-ID` whenever Host/Origin
tenant context is present. A focused smoke on 2026-07-08 against temporary Web
UK `http://127.0.0.1:6426` and Laravel `http://127.0.0.1:8088` passed
`SMOKE_TENANT_DOMAIN_PAGE_PATHS=timebank.global|/=>Exchange Skills Across
Borders`, emitting `tenant-domain-page-timebank-global-home-renders`.

The eleventh template-helper source slice extends the direct `urlFor()`
conversion from event detail into the account hub. `src/views/account.njk` now
passes `accountLinks` card targets and the `/logout` form action through
`urlFor()`, with a source-level regression in
`tests/template-source.test.js` plus a focused account render test proving the
flat `/account` output remains unchanged.

The twelfth template-helper source slice extends the same direct `urlFor()`
conversion into activity pages. `src/views/activity/index.njk` now passes the
detailed-insights link through `urlFor('/activity/insights')`, and
`src/views/activity/insights.njk` passes both back-to-activity links through
`urlFor('/activity')`. A source-level regression plus focused activity render
tests prove the flat `/activity` and `/activity/insights` output remains
unchanged.

The thirteenth template-helper source slice extends the same direct `urlFor()`
conversion into the achievements and gamification pages. The achievements
index, XP shop, collections, engagement history, showcase, and badge detail
templates now pass their tabs, back links, daily reward form, challenge claim
forms, shop purchase form, showcase save form, collection badge links, and
view-all links through `urlFor()`. A source-level regression plus focused
achievements/gamification render tests prove the flat `/achievements` family
output remains unchanged.

The fourteenth template-helper source slice extends the same direct `urlFor()`
conversion into leaderboard and NEXUS score pages. The leaderboard index,
competitive, seasons, journey, spotlight, NEXUS score overview, and NEXUS tier
ladder templates now pass tabs, back links, filter form actions, load-more
links, tier links, and data-driven member profile links through `urlFor()`. A
source-level regression plus focused leaderboard/NEXUS score render tests prove
the flat `/leaderboard` and `/nexus-score` family output remains unchanged.

The fifteenth template-helper source slice extends the same direct `urlFor()`
conversion into the profile and settings pages. The profile summary, profile
settings, two-step verification, blocked-members, delete-account, appearance,
availability, data-rights, linked-accounts, and insurance templates now pass
their local links and form actions through `urlFor()`, including settings hub
card links and dynamic member unblock forms. A source-level regression plus
focused profile/settings render tests prove the flat `/profile` and
`/settings/*` output remains unchanged.

The sixteenth template-helper source slice extends the same direct `urlFor()`
conversion into group detail, listing detail, member profile, and the shared
report-link partial. Those templates now pass detail breadcrumbs, edit/delete/
join/leave/member/review actions, report return targets, listing report links,
member connection controls, and member review form targets through `urlFor()`.
A source-level regression plus focused group/listing/member/report render tests
prove the flat `/groups`, `/listings`, `/members`, and `/report-a-problem`
output remains unchanged.

The seventeenth template-helper source slice extends the same direct `urlFor()`
conversion into the marketplace offer and my-listings management pages.
`src/views/marketplace/offers.njk` now passes offer tabs, dynamic listing
links, and accept/decline/withdraw forms through `urlFor()`;
`src/views/marketplace/manage.njk` now passes my-listings tabs, create/view/edit
links, and renew/delete forms through `urlFor()`. A source-level regression
plus focused marketplace render tests prove the flat `/marketplace/offers` and
`/marketplace/mine` output remains unchanged.

The eighteenth template-helper source slice extends direct `urlFor()`
conversion into the marketplace browse, detail, buyer-action, search, seller
profile, and onboarding templates. `src/views/marketplace/_nav.njk`,
`_listing-card.njk`, `index.njk`, `listing-list.njk`, `detail.njk`,
`buy.njk`, `offer.njk`, `report.njk`, `form.njk`, `search.njk`, `seller.njk`,
and `onboarding.njk` now route browse tabs, listing/card/category links, search
and category filter forms, listing detail buy/offer/save/report controls,
buyer buy/offer/report forms, listing create/edit form actions, seller profile
links, and seller onboarding controls through `urlFor()`. A source-level
regression plus focused marketplace render tests prove the flat marketplace
output remains unchanged. At that point the remaining marketplace
source-template conversion work was narrowed to coupon, order, and pickup-slot
management templates.

The nineteenth template-helper source slice closes that remaining marketplace
source-template gap. `src/views/marketplace/coupons.njk`, `coupon-form.njk`,
`orders.njk`, `slots.njk`, `slot-form.njk`, and `_slot-form.njk` now route
coupon links and forms, order tab links, order ship/confirm/pay/cancel/rate
forms, pickup-slot scan/edit/delete forms, and shared slot form actions through
`urlFor()`. The source-level regression now covers all marketplace templates
that previously had literal marketplace-local links/forms, and a source scan
for raw marketplace `href`/`action` strings returns no matches.

The twentieth template-helper source slice extends direct `urlFor()` conversion
into the notifications inbox. `src/views/notifications/index.njk` now routes
the Home breadcrumb, all/unread filter links, read-all action, per-notification
read/delete actions, redirect hidden values, pagination base URL, and unread
empty-state CTA through `urlFor()`. The source-level regression first failed on
the raw `/notifications` links/actions, then passed after conversion; a source
scan for notification-local raw `href`/`action` strings and the old
`notificationLink` hidden value returns no matches.

The twenty-first template-helper source slice extends direct `urlFor()`
conversion into group exchanges. `src/views/group-exchanges/index.njk`,
`create.njk`, and `detail.njk` now route the create CTA, status filter tabs,
detail links, create form, participant search/add/remove forms, participant
confirmation form, and complete/cancel forms through `urlFor()`. The
source-level regression first failed on the raw `/group-exchanges` links and
actions, then passed after conversion; a source scan for group-exchange-local
raw `href`/`action` strings returns no matches.

The twenty-second template-helper source slice extends direct `urlFor()`
conversion into messages. `src/views/messages/index.njk`, `conversation.njk`,
`direct-conversation.njk`, `groups.njk`, `group-create.njk`, and
`group-conversation.njk` now route direct-message breadcrumbs, conversation
links, listing/member/connection links, empty-state CTAs, older-message
pagination, direct reply/edit/delete/voice/archive forms, group-message tabs,
group create/search/member/reaction forms, and leave-group controls through
`urlFor()`. The source-level regression first failed on raw `/messages`,
`/members`, and `/connections` targets, then passed after conversion; a source
scan for message-local raw `href`/`action` strings returns no matches.

The twenty-third template-helper source slice extends direct `urlFor()`
conversion into wallet pages. `src/views/wallet/index.njk` and
`manage.njk` now route the wallet breadcrumb, manage CTA, back link, recipient
search form, transfer forms, and donation forms through `urlFor()`. The
source-level regression first failed on raw `/wallet` links and actions, then
passed after conversion; a source scan for wallet-local raw `href`/`action`
strings returns no matches.

The twenty-fourth template-helper source slice extends direct `urlFor()`
conversion into public auth and support pages. `contact.njk`,
`cookie-settings.njk`, `login.njk`, `forgot-password.njk`,
`reset-password.njk`, `register.njk`, and `report-problem.njk` now route their
local contact, cookie, login, two-factor, forgot-password, reset-password,
register, legal-cookie-policy, and report-a-problem links/forms through
`urlFor()`. The source-level regression first failed on raw `/contact` and
`/login` controls, then passed after conversion; a targeted source scan for
public/auth/support raw `href`/`action` strings returns no matches.

Verification command:

```powershell
npm --prefix apps/web-uk test -- tests/template-source.test.js --runInBand --runTestsByPath -t "public auth and support"
npm --prefix apps/web-uk test -- tests/shared-accessible-shell.test.js --runInBand --runTestsByPath -t "login|register|password|cookie|contact|report"
npm --prefix apps/web-uk test -- tests/template-source.test.js --runInBand --runTestsByPath -t "wallet links"
npm --prefix apps/web-uk test -- tests/shared-accessible-shell.test.js --runInBand --runTestsByPath -t "wallet"
npm --prefix apps/web-uk test -- tests/template-source.test.js --runInBand --runTestsByPath -t "group exchange tabs"
npm --prefix apps/web-uk test -- tests/shared-accessible-shell.test.js --runInBand --runTestsByPath -t "group exchange"
npm --prefix apps/web-uk test -- tests/template-source.test.js --runInBand --runTestsByPath
npm --prefix apps/web-uk run route:matrix
npm --prefix apps/web-uk run lint
npm --prefix apps/web-uk test -- --runInBand
npm --prefix apps/web-uk test -- tests/template-source.test.js --runInBand --runTestsByPath -t "notifications filters"
npm --prefix apps/web-uk test -- tests/shared-accessible-shell.test.js --runInBand --runTestsByPath -t "notifications"
npm --prefix apps/web-uk test -- tests/template-source.test.js --runInBand --runTestsByPath
npm --prefix apps/web-uk run route:matrix
npm --prefix apps/web-uk run lint
npm --prefix apps/web-uk test -- --runInBand
npm --prefix apps/web-uk test -- tests/routes.test.js --runInBand --runTestsByPath
npm --prefix apps/web-uk test -- laravel-runtime-smoke.test.js --runInBand
$env:SMOKE_TENANT_DOMAIN_PAGE_PATHS = 'timebank.global|/hour-timebank/login=>Sign in'
npm --prefix apps/web-uk run smoke:laravel
$env:SMOKE_BODY_TEXT_PAGE_PATHS = '/hour-timebank/accessible=>Accessible;/hour-timebank/accessible=>Connecting Communities;/hour-timebank/accessible=>What you can do'
npm --prefix apps/web-uk run smoke:laravel
```
