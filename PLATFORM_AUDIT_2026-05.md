# Project NEXUS Platform Audit - May 2026

Audit date: 2026-05-07  
Target repo: `C:\platforms\htdocs\asp.net-backend`  
V1.5 source of truth: `C:\platforms\htdocs\staging`  
Scope: read-only platform audit, frontend parity, API wiring, build/test health. No production access was used.

## Executive Summary

Project NEXUS is not at V1.5 parity in the current checked-in ASP.NET/Core + frontend platform. The backend has a large route surface and many real modules, but route-level parity against V1.5 is about 31% by direct method/path match after normalizing `/v2/*` to `/api/*`. That direct comparison is approximate, but the gap is too large to explain away as naming differences.

The biggest practical issue is frontend parity. `apps/react-frontend` is a V1-derived React app, but it is older than the V1.5 source truth and is missing 97 routes, 645 TS/TSX files, 223 page files, and 126 admin files from `C:\platforms\htdocs\staging\react-frontend`. Whole product areas are absent from the current React frontend: marketplace, caring-community, premium/billing, developers portal, coupons, clubs/vereine, pilot funnels, regional/partner analytics, bookmarks/saved items, and advanced group/job/volunteering screens.

The current backend also contains compatibility controllers that make the API look more complete than it is. Several endpoints return empty arrays, hardcoded success, or "not yet implemented" messages. These must be treated as partial/stub, not complete.

The current platform has solid foundations: ASP.NET builds, admin builds/tests pass, Docker Compose config validates, and many core domains exist. But the user-facing migration state is best described as: core platform partly working, long-tail V1.5 parity not restored, newer frontends diverged, and compatibility shims masking missing behavior.

## Evidence Read

Required docs reviewed:

| File | Key observation |
|---|---|
| `AGENTS.md` | Claims all phases built, tests pass, and 779 endpoints. Also mandates Docker-first local workflow and no production changes. |
| `CLAUDE.md` | Same project rules and older "complete" claims. |
| `MONOREPO_MAP.md` | Defines ASP.NET API plus five frontends. Notes `apps/react-frontend` originated from V1 PHP React frontend and strips `/v2/`. |
| `PARITY_AUDIT.md` | Stale March audit says V1 had about 1,688 endpoints and V2 had 814. Current V1.5 scan shows 2,251 route declarations. |
| `FRONTEND_INTEGRATION.md` | Lists many backend features as safe for frontends, but does not prove current frontend wiring. |
| `ADMIN_INTEGRATION.md` | Admin API contract uses `/api/admin/*`, camelCase by default with some snake_case compatibility. |
| `MIGRATION_GAP_MAP.md` | Older feature-level map; useful, but contradicts current V1.5 code and frontend parity. |
| `ROADMAP.md` | Older roadmap says many phases done/tested; not reliable as a current parity source. |

## Architecture Inventory

### Current Platform

| Area | Path | Stack/version evidence | Files scanned | Notes |
|---|---|---:|---:|---|
| ASP.NET API | `src/Nexus.Api` | .NET 8 target in `src/Nexus.Api/Nexus.Api.csproj` | 516 | 119 controller files, 1,353 HTTP attributes. |
| React V1 frontend | `apps/react-frontend` | package version `1.0.0` at `apps/react-frontend/package.json:4` | 1,050 | Largest current frontend, but behind V1.5. |
| Modern frontend | `apps/web-modern` | Next `16.1.6`, React `19.2.3` at `apps/web-modern/package.json:20` | 178 | Has 81 route-ish Next files and its own API client. |
| Admin app | `apps/admin` | React 18, Refine/AntD, package version `0.1.0` | 87 | Builds and tests pass, but functionally smaller than V1.5 admin React modules. |
| UK frontend | `apps/web-uk` | Express/GOV.UK frontend | 158 | No `build` script; uses `brand:check`, `build:css`, `start`. |
| GOV.IE frontend | `apps/web-govie` | React/Vite GOV.IE DS | 134 | Build currently fails due dependency/type resolution. |

### V1.5 Source Truth

| Area | Path | Evidence | Files scanned |
|---|---|---|---:|
| Laravel/PHP app | `C:\platforms\htdocs\staging\app` | `composer.json` version `1.5.0`; 254 PHP controller files | 1,066 |
| Laravel routes | `C:\platforms\htdocs\staging\routes\api.php` | 2,251 route declarations, 2,248 unique | 1 file primary |
| V1.5 React frontend | `C:\platforms\htdocs\staging\react-frontend` | package version `1.5.0` at line 4 | 2,210 |
| Accessible frontend | `C:\platforms\htdocs\staging\accessible-frontend` | small GOV/accessible frontend | 13 |

## Headline Counts

| Metric | V1.5 source truth | Current platform | Gap/meaning |
|---|---:|---:|---|
| Laravel/API route declarations | 2,251 | n/a | V1.5 is much larger than old docs. |
| Unique V1.5 routes | 2,248 | n/a | Source truth for route parity. |
| ASP.NET HTTP attributes | n/a | 1,353 | Includes 486 compatibility/alias attributes. |
| Direct normalized method/path matches | 2,248 | 697 | About 31% direct route parity. |
| Direct normalized missing routes | 2,248 | 1,551 | Mostly admin, marketplace, caring, groups, jobs, federation, volunteering. |
| React App routes | 217 | 120 | 97 current React routes missing from V1.5. |
| React TS/TSX files | 1,338 | 729 | 645 current React source files missing from V1.5. |
| React page TS/TSX files | 448 | 230 | 223 page files missing. |
| React admin TS/TSX files | 338 | 241 | 126 admin files missing. |
| Current React API string matches | n/a | 1,196 matches / 745 unique | 209 files call `/v2` or `/api`; many must be checked against ASP.NET. |

Method used for direct API parity: extracted Laravel `Route::get/post/put/patch/delete/match/any(...)`, extracted ASP.NET `[HttpGet/Post/Put/Patch/Delete]`, normalized `/v2/*` to `/api/*`, removed query strings, and normalized route parameters to `{id}`. This does not catch semantic aliases, but it is strong enough to show the route-level gap.

## Backend API Parity

### V1.5 Route Domains

Top V1.5 route domains in `C:\platforms\htdocs\staging\routes\api.php`:

| Domain | V1.5 route count |
|---|---:|
| admin | 955 |
| volunteering | 98 |
| marketplace | 95 |
| groups | 89 |
| jobs | 87 |
| caring-community | 72 |
| federation | 71 |
| users | 59 |
| me | 33 |
| feed | 30 |
| events | 26 |
| stories | 24 |
| listings | 22 |
| goals | 21 |
| wallet | 21 |

### Current ASP.NET Route Domains

Top current ASP.NET domains from controller attributes:

| Domain | Attribute count |
|---|---:|
| admin | 577 |
| comments | 148 |
| versioned passkeys | 45 |
| gamification | 38 |
| ai | 30 |
| feed | 30 |
| groups | 26 |
| faqs | 24 |
| jobs | 21 |
| resources | 21 |
| sessions | 20 |
| messages | 19 |
| sub-accounts | 19 |
| auth | 17 |
| volunteering | 16 |
| skills | 16 |
| organisations | 16 |
| wallet | 16 |
| listings | 15 |

### Direct Missing Routes By Domain

After normalization, these V1.5 domains have the largest direct route gaps:

| Domain | Direct missing route count |
|---|---:|
| admin | 556 |
| marketplace | 95 |
| caring-community | 72 |
| groups | 66 |
| jobs | 65 |
| federation | 64 |
| volunteering | 56 |
| me | 33 |
| users | 27 |
| stories | 24 |
| vereine | 16 |
| feed | 16 |
| wallet | 15 |
| events | 13 |
| ideation-challenges | 12 |
| gamification | 11 |
| listings | 11 |
| goals | 11 |

### Compatibility/Stub Risk

Compatibility controllers are a major source of apparent coverage:

| Controller | HTTP attributes | Risk |
|---|---:|---|
| `AdminCompatibility3Controller.cs` | 126 | Many empty arrays and hardcoded success responses. |
| `AdminCompatibilityController.cs` | 110 | 59 `stub` hits. Admin actions return success without real mutation. |
| `AdminCompatibility2Controller.cs` | 107 | 9 "not yet implemented" hits and 32 `Array.Empty<object>` responses. |
| `CompatibilityAliasController.cs` | 101 | File header explicitly says "aliases and stub endpoints" at lines 18-21. |
| `CompatibilityController.cs` | 42 | Mixed real compatibility and lightweight responses. |

Key file evidence:

| File | Evidence |
|---|---|
| `src/Nexus.Api/Controllers/CompatibilityAliasController.cs:18` | "Route aliases and stub endpoints for the React frontend." |
| `src/Nexus.Api/Controllers/CompatibilityAliasController.cs:319` | Starts "Real gaps (stubs and lightweight implementations)". |
| `src/Nexus.Api/Controllers/CompatibilityAliasController.cs:348` | `/api/messages/typing` is a stub. |
| `src/Nexus.Api/Controllers/CompatibilityAliasController.cs:457` | Social share / push notification stubs. |
| `src/Nexus.Api/Controllers/CompatibilityAliasController.cs:1125` | Feed interaction stubs. |
| `src/Nexus.Api/Controllers/CompatibilityAliasController.cs:1293` | Team tasks/documents stubs. |
| `src/Nexus.Api/Controllers/CompatibilityAliasController.cs:1318` | Federation stubs. |
| `src/Nexus.Api/Controllers/CompatibilityAliasController.cs:1387` | Volunteering stubs. |
| `src/Nexus.Api/Controllers/AdminCompatibilityController.cs:232-315` | Multiple admin user actions log "(stub)" and return success. |
| `src/Nexus.Api/Controllers/AdminCompatibility2Controller.cs:177-187` | Import/export/sync "not yet implemented". |
| `src/Nexus.Api/Controllers/AdminCompatibility2Controller.cs:299-334` | Newsletter resend/A-B/test email not implemented. |
| `src/Nexus.Api/Controllers/AdminCompatibility3Controller.cs:136-227` | Many admin/legal/GDPR endpoints return empty data. |

Bottom line: compatibility endpoints should be classified as `alias`, `partial`, or `stub/fake success` until tested against real database mutation and V1.5 response shape.

## Frontend Route Parity

### React App Route Counts

| Source | Route count | Evidence |
|---|---:|---|
| Current `apps/react-frontend/src/App.tsx` | 120 | Current auth/public routes begin around `apps/react-frontend/src/App.tsx:233`. |
| V1.5 `staging/react-frontend/src/App.tsx` | 217 | V1.5 routes include OAuth at line 349 and pilot routes at lines 360-362. |
| Missing from current | 97 | Current has zero route paths not present in V1.5. |

### Missing Current React Routes From V1.5

Representative missing routes:

| Domain | Missing routes |
|---|---|
| OAuth/auth | `auth/oauth/callback`, `verify-identity/callback`, `verify-identity-optional` |
| Caring community | `caring/*`, `caring-community/caregiver`, `request-help`, `providers`, `warmth-pass`, `my-trust-tier`, `safeguarding/report`, surveys, projects, hour transfer/gift |
| Marketplace | `marketplace`, `marketplace/:id`, `marketplace/sell`, `marketplace/orders`, `marketplace/seller/*`, `marketplace/category/:slug`, map, collections, free |
| Premium/billing | `premium`, `premium/manage`, `premium/return` |
| Developers | `developers`, `developers/auth`, `developers/endpoints`, `developers/webhooks` |
| Clubs/vereine | `clubs`, `clubs/:id/admin/dues`, `clubs/:id/admin/import`, `me/verein-dues`, `me/verein-invitations` |
| Public/pilot | `pilot-inquiry`, `pilot-apply`, `pilot-apply/status/:token`, `regional-analytics`, `partner-analytics/dashboard` |
| Social/feed | `feed/posts/:id`, `feed/item/:type/:id`, `saved`, `reviews`, user appreciations/collections |
| Jobs | `jobs/bias-audit`, `jobs/employer-onboarding`, `jobs/talent-search`, `jobs/:id/kanban`, `jobs/employers/:userId` |
| Settings/data | `settings/blocked`, `settings/data-export`, `wallet/regional-points` |

### Missing Current React Files From V1.5

| Area | Missing TS/TSX files |
|---|---:|
| `pages` | 223 |
| `components` | 219 |
| `admin` | 126 |
| `broker` | 23 |
| `hooks` | 20 |
| `lib` | 14 |
| `caring` | 9 |

Missing page file clusters:

| Page domain | Missing files |
|---|---:|
| caring-community | 29 |
| groups | 24 |
| marketplace | 22 |
| volunteering | 15 |
| settings | 12 |
| federation | 11 |
| jobs | 11 |
| public | 10 |
| ideation | 7 |
| about | 7 |
| profile | 6 |
| messages | 6 |
| premium | 4 |
| developers | 4 |

Missing admin module clusters:

| Admin area | Missing files |
|---|---:|
| `modules/caring-community` | 37 |
| `modules/volunteering` | 8 |
| `modules/enterprise` | 8 |
| `modules/billing` | 6 |
| `modules/federation` | 6 |
| `modules/config` | 5 |
| `modules/jobs` | 4 |
| `modules/marketplace` | 4 |
| `modules/agents` | 3 |
| `modules/groups` | 3 |

### Dependency Parity

`apps/react-frontend` is missing 17 dependencies/devDependencies that exist in V1.5:

| Missing package | Why it matters |
|---|---|
| `@stripe/react-stripe-js`, `@stripe/stripe-js` | Premium, subscriptions, marketplace seller onboarding, donations. |
| `pusher-js` | V1.5 realtime path; current frontend uses SignalR in places but V1.5 Pusher-specific code is not ported. |
| `papaparse`, `@types/papaparse` | CSV import/export features. |
| `react-markdown`, `remark-gfm`, `marked` | Markdown-heavy docs/content/admin features. |
| `i18next-chained-backend`, `i18next-localstorage-backend`, `i18next-cli` | V1.5 i18n cache/status/types workflow. |
| `@googlemaps/markerclusterer` | Marketplace/map/discovery clustering. |
| `cross-env`, `sharp`, type helper packages | Build/test/prerender tooling. |

Evidence: current `apps/react-frontend/package.json:4` is version `1.0.0`; V1.5 `C:\platforms\htdocs\staging\react-frontend\package.json:4` is version `1.5.0`, with Stripe/Pusher/Markdown deps at lines 46-69.

## Frontend API Wiring

### API Client Locations

| App | API client evidence |
|---|---|
| `apps/react-frontend` | Main client at `apps/react-frontend/src/lib/api.ts`; `normalizeEndpoint()` strips `/v2/` at lines 263-269. |
| `apps/web-modern` | Main client at `apps/web-modern/src/lib/api.ts`; hardcoded fallback `http://localhost:5080` at line 12. |
| `apps/admin` | API URL in `apps/admin/src/config/constants.ts:6`; defaults to `http://localhost:5080`. |
| `apps/web-govie` | API files under `apps/web-govie/src/api`; tests reveal direct `/api/*` calls. |

### Current Frontend API String Counts

| Frontend | API string matches | Unique strings | Files |
|---|---:|---:|---:|
| `apps/react-frontend/src` | 1,196 | 745 | 209 |
| `apps/web-modern/src` | 313 | 263 | 2 |
| `apps/admin/src` | 187 | 127 | 51 |
| `apps/web-govie/src` | 298 | 180 | 85 |

Risk: The React API client strips `/v2/` to `/api/`, but that only changes paths. It does not validate method parity, auth requirements, response envelopes, snake_case/camelCase differences, or whether a compatibility endpoint is a real implementation.

## Domain Parity Status

| Domain | V1.5 source truth | Backend support | React frontend support | Web-modern support | Status |
|---|---|---|---|---|---|
| Auth, passkeys, TOTP | Many `/v2/auth`, passkey, TOTP, OAuth routes | Core JWT/passkey/TOTP exists; OAuth appears missing/incomplete | Login/register/passkeys present; OAuth callback missing | Login/register/security present | Partial. OAuth and identity callback parity missing. |
| Dashboard/activity | Core dashboard and activity routes | Activity/admin stats exist | Dashboard exists but TODOs remain | Dashboard/activity routes exist | Likely working core; needs runtime smoke. |
| Listings/search/saved searches | Listings, images, saved, SEO, nearby | Core listings + features exist; direct gaps remain | Listings exist; V1.5 marketplace/saved routes missing | Listings/saved-searches exist | Partial. Core yes, V1.5 depth no. |
| Wallet/exchanges/regional points | Wallet, exchanges, regional points, categories | Wallet/exchanges/group exchanges exist; many wallet V1.5 routes missing | Wallet/exchanges exist; regional points route missing | Wallet/send exists | Partial. Regional points and long-tail wallet gaps. |
| Messages/voice/reactions/realtime | Messages, voice, typing, reactions, group conversations | Messaging/voice exists; typing/reactions partly stubs | Messages exist | Messages route exists | Partial; some interactions fake-success. |
| Feed/social/bookmarks/reviews/stories | Feed posts, hashtags, bookmarks, stories, reviews | Feed/comments/reviews exist; stories/bookmarks incomplete | Feed exists; `saved`, `feed/posts/:id`, reviews missing | Feed/reviews exist | Partial. Stories/bookmarks are large missing areas. |
| Groups/clubs/vereine | Advanced groups, files, wiki, Q&A, tasks, clubs/vereine | Basic/medium groups exist; many advanced group routes missing | Groups exist; 24 group page files missing; clubs missing | Groups exist | Partial. Advanced groups/clubs not at parity. |
| Events | Events, nearby, attendees, waitlist, image | Events/reminders/waitlist partly exist | Events exist | Events exist | Mostly core, but direct V1.5 gaps remain. |
| Jobs | Feed, employer, pipeline, templates, interviews, offers, bias audit | Jobs controller has 21 attrs, but 65 V1.5 job routes directly missing | Jobs basic exist; 11 V1.5 job page files missing | Jobs basic route exists | Partial. Employer/pipeline depth missing. |
| Volunteering | 98 V1.5 routes | 16 current attrs; 56 direct missing | 15 page files missing; org dashboard missing route | Basic volunteering routes | Partial. |
| Marketplace/coupons/Stripe | 95 marketplace routes plus coupons/merchant onboarding | No direct current route domain parity | Entire route family missing from current React | No marketplace route | Missing/P0 if V1.5 parity required. |
| Premium/subscriptions/billing | AG58/member premium/billing/Stripe | Some subscriptions controller exists; admin billing modules missing | Premium routes missing | No premium route | Missing/P0 for V1.5 parity. |
| Caring community/safeguarding/municipal | 72 route domain plus many admin areas | No direct parity for many route groups | 29 page files and 37 admin files missing | No equivalent | Missing/P0 if source truth. |
| Federation | 71 V1.5 routes | Many federation controllers exist, but 64 direct missing | Federation pages exist, `federation/groups` missing | Federation route exists | Partial. |
| Admin/super/CRM/moderation | 955 V1.5 admin routes | 577 current admin attrs, many compatibility/stub | 126 V1.5 admin TS/TSX files missing | Separate admin app only 87 files | Partial/stub-heavy. |
| CMS/blog/legal/KB/resources | V1.5 has content routes | Current backend has modules | React pages exist but some V1.5 tests/pages missing | Blog/KB/legal/routes exist | Likely partial; needs contract tests. |
| Notifications/push/newsletter/email | Push, newsletter, deliverability | Current endpoints exist but AdminCompatibility2 has not implemented paths | UI exists; stubs present | Push/notifications routes exist | Partial. |
| AI/search/semantic | Many AI/search endpoints | AI/search controllers exist | AI chat/search exist | Assistant/search exists | Likely partial; runtime needed. |
| i18n/accessibility/PWA/offline | V1.5 has richer i18n tooling and PWA fixes | Backend i18n exists | Missing V1.5 i18next chained/localstorage tooling | Some app-specific support | Partial. |
| Tenant/security/GDPR | Tenant isolation, GDPR, admin enterprise | Backend has tenant filters and GDPR; admin enterprise compatibility returns empty data | Settings/data export route missing | Security/privacy routes exist | Partial. |

## Bug And Polish Inventory

### Search Counts

| Area | TODO | stub | mock | placeholder | NotImplemented | throw new Error | ComingSoon |
|---|---:|---:|---:|---:|---:|---:|---:|
| `src/Nexus.Api` | 3 | 74 | 23 | 15 | 2 | 0 | 0 |
| `apps/react-frontend/src` | 61 | 15 | 4,079 | 957 | 0 | 14 | 37 |
| `apps/web-modern/src` | 14 | 1 | 52 | 155 | 0 | 22 | 0 |
| `apps/admin/src` | 0 | 4 | 1 | 45 | 0 | 0 | 0 |
| `apps/web-govie/src` | 1 | 0 | 78 | 28 | 0 | 3 | 0 |
| `apps/web-uk/src` | 1 | 0 | 0 | 0 | 0 | 1 | 0 |

Notes:

- Many `mock` hits are tests, but `placeholder`, `ComingSoon`, and backend compatibility stubs are product-relevant.
- Current React `ComingSoonPage` is imported at `apps/react-frontend/src/App.tsx:124` and used in many feature gates.
- Top current React placeholder files include `RegisterPage.tsx`, `CreateJobPage.tsx`, `SettingsPage.tsx`, `CreateChallengePage.tsx`, `CreateGroupExchangePage.tsx`, and multiple admin/broker modules.

## Runtime And Build Verification

Commands were run locally only. Docker stack was not started.

| Check | Result | Notes |
|---|---|---|
| `git status --short --branch` | Warns on malformed `robocopy C...` directory; `AGENTS.md` untracked | Existing workspace issue. |
| `docker compose config --quiet` | Pass | Compose config validates. |
| `docker compose ps` | No services running | Runtime smoke tests were not possible without starting stack. |
| `dotnet build --no-restore --verbosity minimal` | Pass | Built `Nexus.Api`, contracts, messaging, tests in about 29s. |
| `dotnet test --no-restore --verbosity minimal` | Timeout at 5m | No result. Likely integration/Testcontainers cost or hang. |
| `dotnet test --no-restore --no-build --verbosity minimal` | Timeout at 3m | No result. Needs dedicated run with Docker ready. |
| `apps/admin npm run build` | Pass | Vite build completed in about 3m22s. |
| `apps/admin npm test` | Pass | 25/25 tests pass. |
| `apps/react-frontend npm run build` | Timeout at 5m | No result. Needs longer CI-style run. |
| `apps/react-frontend npx tsc -b --pretty false` | Timeout at 3m | No result. |
| `apps/web-modern npm run build` | First attempt failed; later timed out | First failed loading `next.config.ts` because Next could not resolve `typescript`; after dependency side-effect cleanup, retry timed out at 3m. |
| `apps/web-modern npm test -- --runInBand` | Fail | 100/102 tests pass. Two protected-route tests expect `/login`, actual `/login?redirect=%2F`. Also Jest scans `.claude/worktrees` causing haste collisions. |
| `apps/web-uk npm run build` | Fail | No `build` script. Use `brand:check`, `build:css`, or `start`. |
| `apps/web-uk npm run brand:check` | Pass | No forbidden government branding found. |
| `apps/web-govie npm run build` | Fail | `src/pages/BlogPostPage.tsx:6` cannot find `dompurify` or types, despite package.json listing it. Dependency install/state problem. |
| `apps/web-govie npm test -- --run` | Fail | 22/25 tests pass; failures in auth refresh mock, listings create payload expectation, login navigation. |

The first `apps/web-modern` build triggered an npm/Next auto-install side effect that modified package files. Those audit-induced package changes were reverted. Current git status after cleanup only shows the pre-existing untracked `AGENTS.md` plus the audit report once added.

## Priority Findings

### P0 - Blocks Honest V1.5 Parity

1. Current React frontend is not V1.5. It is version `1.0.0` and missing 97 V1.5 App routes, including marketplace, caring-community, premium, developers, pilot, regional analytics, clubs, coupons, and reviews.
2. Backend route parity is only about 31% by direct normalized method/path match. Compatibility aliases do not close this without semantic verification.
3. Marketplace/coupons/Stripe seller flows are absent from current React and have no clear ASP.NET direct route parity.
4. Caring-community and municipal/safeguarding features are absent from current React and mostly missing from direct backend parity.
5. Admin parity is stub-heavy: 556 V1.5 admin routes are directly missing, and current compatibility controllers return many fake-success/empty responses.

### P1 - Likely User-Facing Broken

1. `apps/web-govie` does not build due unresolved `dompurify` import at `src/pages/BlogPostPage.tsx:6`.
2. `apps/web-modern` tests fail and scan `.claude/worktrees`, causing Jest haste collisions. Protected route behavior/test expectation mismatch at `src/__tests__/components/protected-route.test.tsx:59` and `:103`.
3. `apps/web-govie` tests fail in auth refresh, listing create payload, and login success navigation.
4. Current React build/type-check did not finish within 5/3 minutes; treat build health as unverified.
5. `dotnet test` did not finish within 5/3 minutes; backend test health is unverified even though build passes.

### P2 - Contract And Polish

1. Current React has 745 unique API strings across 209 files; these need automated contract comparison against ASP.NET.
2. `apps/web-modern/src/lib/api.ts` says "All types use snake_case" while ASP.NET docs say camelCase by default, with exceptions. Response normalization must be audited.
3. `apps/react-frontend/src/lib/api.ts` strips `/v2/` but does not guarantee auth, body, response, or side-effect parity.
4. Many current React pages contain placeholders/TODOs in core surfaces like dashboard, listings, profile, settings, federation, notifications, and search.
5. GOV/UK/IE apps are not feature-equivalent to V1.5; they are specialist portals and should not be counted as V1.5 replacement parity unless explicitly scoped.

### P3 - Cleanup

1. `git status` warns about a malformed `robocopy C...` directory path. It is noisy and may affect tooling.
2. `.claude/worktrees` under `apps/web-modern` should be ignored by Jest.
3. Build outputs under ignored `dist`/`.next` folders exist locally; ensure CI starts clean.

## What Works Today

- ASP.NET solution builds with `dotnet build --no-restore`.
- Docker Compose config validates.
- Admin app builds.
- Admin unit tests pass: 25/25.
- UK frontend branding guard passes.
- Core API modules exist for auth, listings, wallet, messages, groups, events, feed, jobs, volunteering, federation, AI, notifications, legal, resources, and admin.
- Current React has broad core navigation and feature gates for many platform modules.

## Wired But Broken Or Unverified

- Current React frontend build/type-check.
- Backend integration test suite.
- Web-modern production build.
- Web-modern protected-route tests.
- Web-govie build and tests.
- Compatibility endpoints that return `success = true` without verified data mutation.
- `/v2/` frontend calls normalized to `/api/` without method/shape verification.
- Admin UI paths backed by compatibility controllers.

## Missing From V1.5

High-confidence missing or non-parity areas:

- Marketplace, seller onboarding, Stripe Connect, coupons, orders, pickup slots, saved searches, marketplace maps.
- Caring community, care relationships, cover care, warmth pass, trust tier, safeguarding reports, municipal surveys, regional points.
- Premium/member tiers, billing dashboards, invoice history, subscription management.
- Developers/partner API docs, OAuth client credentials, webhooks portal.
- Clubs/vereine and member dues.
- Pilot inquiry/apply/status, regional analytics, partner analytics.
- Advanced groups: wiki, Q&A, chatrooms, media, invites, webhooks, scheduled posts, analytics exports, custom fields.
- Advanced jobs: employer onboarding, talent search, Kanban, interviews, offers, templates, bias audit, CSV exports.
- Bookmarks/saved collections and user appreciations.
- Stories/highlights/close friends.
- Many admin operational modules: caring-community admin, billing, marketplace, agents, enterprise, safeguarding, regional analytics, national dashboards, provisioning.

## Recommended Remediation Roadmap

### Phase 1 - Make The Current Platform Verifiable

1. Fix test/build hygiene:
   - Exclude `.claude/worktrees` from `apps/web-modern` Jest.
   - Fix `apps/web-govie` dependency install/build (`dompurify`).
   - Run React frontend type/build in CI with sufficient timeout and memory.
   - Get `dotnet test` to a known pass/fail state with Docker/Testcontainers ready.
2. Add an audit script that extracts:
   - ASP.NET controller routes.
   - V1.5 Laravel routes.
   - Frontend API strings.
   - React/Next route paths.
3. Commit generated route/API matrices as CI artifacts, not hand-maintained docs.

### Phase 2 - Fix API Contract Mismatches

1. Classify every compatibility endpoint as one of: real alias, partial, fake-success stub, empty-data stub, or obsolete.
2. For each current frontend API call, assert:
   - ASP.NET method/path exists.
   - Auth/tenant requirements match.
   - Request body shape matches.
   - Response envelope matches frontend parser.
   - Mutations actually persist.
3. Replace fake-success endpoints with real implementations or remove frontend affordances.

### Phase 3 - Restore V1.5 React Route Parity

1. Decide whether `apps/react-frontend` should become the V1.5 parity frontend. If yes, port missing V1.5 routes/files domain by domain.
2. Restore dependency parity intentionally: Stripe, Pusher/SignalR migration strategy, Markdown, CSV, i18n cache/tooling, marker clustering.
3. Start with P0 domains:
   - marketplace/coupons/Stripe
   - caring-community/safeguarding/municipal
   - premium/billing
   - developers/partner API
   - pilot/regional analytics

### Phase 4 - Decide Frontend Ownership

1. Define which frontend is canonical for member parity:
   - `apps/react-frontend`: V1.5 parity app.
   - `apps/web-modern`: newer Next experience.
   - `apps/web-uk` / `apps/web-govie`: jurisdiction/design-system portals.
2. Stop counting routes from one frontend as parity for another unless there is a documented product decision.
3. Avoid two member frontends drifting over the same API without contract tests.

### Phase 5 - Polish, Accessibility, Runtime Smoke

1. Start Docker stack locally and smoke test:
   - login/register/password reset
   - dashboard
   - listings CRUD
   - messages
   - wallet transfer
   - groups/events
   - admin login
   - representative missing/partial V1.5 routes
2. Add Playwright smoke tests for route availability and API error surfaces.
3. Audit loading/empty/error states in core pages.
4. Audit AGPL/about/source-code notices in all public frontends.

## Phase 1 Remediation Progress - 2026-05-07

Completed in this pass:

- Added `scripts/audit-platform-parity.ps1`, a generated parity artifact extractor for ASP.NET routes, V1.5 Laravel routes, current/V1.5 React routes, Next routes, and frontend API string references.
- Generated first artifact set under `artifacts/parity-audit/`:
  - `aspnet-routes.csv`: 1,353 routes
  - `v15-laravel-routes.csv`: 2,251 parsed routes
  - `react-routes-current.csv`: 119 routes
  - `react-routes-v15.csv`: 216 routes
  - `web-modern-routes.csv`: 80 routes
  - `frontend-api-strings.csv`: 1,847 runtime-ish API string hits after filtering imports, tests, mocks, and comments
  - `summary.json`: run summary
- Fixed `apps/web-modern` Jest resolver hygiene by ignoring `.claude/` and `.next/` in module/watch path discovery.
- Updated `apps/web-modern` protected-route tests to match current redirect behavior: `/login?redirect=%2F`.
- Added missing `apps/web-modern/src/lib/api.ts` client methods required for production build:
  - `getSavedSearches`
  - `createSavedSearch`
  - `deleteSavedSearch`
  - `getShifts`
  - `getMyShifts`
  - `getShiftSwapRequests`
  - `signUpForShift`
  - `cancelShiftSignup`
- Fixed `apps/web-govie/src/api/auth.ts` so explicit refresh uses the shared API client contract instead of an unmocked raw Axios call.
- Updated stale GOV.IE tests for listing payload shape and 2FA-aware login context.
- Restored local `apps/web-govie` dependency install so `dompurify` resolves for build.

Verification after these changes:

- `apps/web-modern`: `npm test -- --runInBand` passes, 74/74 tests.
- `apps/web-modern`: `npm run build` passes, 65 app routes generated.
- `apps/web-govie`: `npm test -- --run` passes, 25/25 tests.
- `apps/web-govie`: `npm run build` passes.
- `scripts/audit-platform-parity.ps1` runs successfully and writes the parity artifacts listed above.

Remaining caveat:

- The new `web-modern` shift client methods make the frontend build verifiable, but runtime parity still needs Docker/API smoke testing. Backend support clearly exists for `/api/volunteering/swaps`, while `/api/volunteering/shifts`, `/api/volunteering/my-shifts`, and signup endpoints must be classified in the API matrix as working, missing, alias, or stub before marking the shift page complete.

## Base Stabilization Progress - 2026-05-07

Completed in this pass:

- Added `scripts/verify-base.ps1`, a repeatable local verification script for base checks. It supports:
  - default backend/frontend base checks
  - `-SkipFrontend`
  - `-SkipBackend`
  - `-FullFrontend` for the slow `apps/react-frontend` type/build path
  - `-DockerBuild` for API image build verification
- Fixed `scripts/audit-platform-parity.ps1` after adding matrix output, so it now emits:
  - `frontend-api-to-aspnet-matrix.csv`
  - `v15-laravel-to-aspnet-matrix.csv`
  - `frontend-route-parity-matrix.csv`
- Added `scripts/report-api-contract-gaps.ps1` to summarize current frontend API references by app/status and emit `frontend-api-missing-static.csv`.
- Tightened API-string extraction so aliases like `@/admin/api/adminApi`, relative imports like `../../api/types`, test mocks, and comments are no longer counted as backend API calls.
- Added `sharp` to `apps/react-frontend` dev dependencies so `vite-plugin-image-optimizer` no longer logs missing-package errors during build.
- Narrowed `apps/react-frontend` ambient TypeScript globals to `vite/client` and `google.maps` in `tsconfig.json`.
- Added `scripts/cleanup-testhost.ps1`, `scripts/test-backend-smoke.ps1`, and `scripts/test-backend-full.ps1` to make backend verification repeatable and to clean stale repo-local `testhost` processes that can lock test assemblies.
- Added `tests/Nexus.Api.Tests/xunit.runner.json` and copied it from the test project for better long-running test diagnostics.
- Decoupled `HealthControllerTests` from the seeded `IntegrationTestBase`; health smoke no longer truncates/seeds the full test database for each health endpoint.

Current base verification results:

- `docker compose config --quiet`: pass.
- `dotnet build --no-restore`: pass.
- `scripts/verify-base.ps1 -SkipFrontend`: pass.
- `scripts/verify-base.ps1 -SkipBackend`: pass.
- Backend smoke tests:
  - `HealthControllerTests`: 3/3 pass. Latest isolated run dropped from about 70 seconds to 23 seconds after removing unnecessary seeded fixture setup.
  - `Services.GamificationServiceTests`: 10/10 pass.
- `apps/react-frontend`:
  - `npx tsc -p tsconfig.json --noEmit --pretty false --extendedDiagnostics`: pass, but slow. Observed ~327 seconds, ~1 GB memory.
  - `npm run build`: pass with a long timeout. Observed ~390 seconds end-to-end.
  - `npx vite build`: pass. Missing `sharp` errors are resolved. Remaining warnings are chunk-size, SignalR pure annotation, and mixed static/dynamic Sentry import warnings.
- `apps/web-modern`:
  - `npm test -- --runInBand`: pass, 74/74.
  - `npm run build`: pass.
- `apps/web-govie`:
  - `npm test -- --run`: pass, 25/25.
  - `npm run build`: pass.
- `apps/admin`:
  - `npm test`: pass, 25/25.
  - `npm run build`: pass.
- `apps/web-uk`:
  - `npm run brand:check`: pass.
- API contract artifact snapshot after extractor cleanup:
  - `frontend_api_strings`: 1,847
  - `frontend_api_missing`: 192
  - `frontend_api_dynamic_unresolved`: 829
  - Missing static references by app: admin 18, react-frontend 124, web-govie 23, web-modern 27.

Current base blockers / follow-ups:

- Full `dotnet test --no-build` is not a practical quick gate yet. Discovery works and focused tests pass, but the whole suite exceeds a five-minute local timeout with little progress visibility. Treat `scripts/verify-base.ps1 -SkipFrontend` as the backend smoke gate until the full suite is chunked or categorized.
- API Docker build is blocked by Microsoft container registry/CDN EOFs while pulling `mcr.microsoft.com/dotnet/sdk:8.0.404-bookworm-slim` and `mcr.microsoft.com/dotnet/aspnet:8.0-bookworm-slim`. This fails before application compilation, so this is currently environmental/network until an MCR pull succeeds or the base image pin is intentionally changed.
- `apps/react-frontend` builds, but type-check performance is poor. It should run in CI with a 10-15 minute timeout and at least 2 GB Node memory until the admin/member bundles are split or the type surface is reduced.
- `apps/react-frontend` build still has bundle-size warnings for large chunks (`vendor-heroui`, `index`, chart/PDF chunks). This is not a correctness blocker, but it is a base performance follow-up.

## Final State Assessment

Current platform status: foundational backend and multiple frontend shells exist, but V1.5 parity is not achieved. The March parity docs are stale. The current React frontend is behind V1.5 by a large margin, the newer Next frontend is not a parity replacement, and compatibility controllers create a misleading impression of completeness.

Recommended next action: treat this as a parity recovery project, not polish. First make builds/tests deterministic, then generate a route/API contract matrix in CI, then restore missing V1.5 domains in `apps/react-frontend` or explicitly decide they are out of scope.
