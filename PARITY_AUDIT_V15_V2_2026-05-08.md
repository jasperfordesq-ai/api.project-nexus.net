# Project NEXUS V1.5 to V2 Parity Audit

Audit date: 2026-05-08  
V2 target: `C:\platforms\htdocs\asp.net-backend`  
V1.5 source truth: `C:\platforms\htdocs\staging`  
Scope: static parity audit only. No production access, no deploy, no database mutation.

## Verdict

V2 is not at full V1.5 migration parity.

The ASP.NET backend has a large surface area and covers many core timebanking features, but direct API parity against the V1.5 Laravel source truth is about 44.6% after normalizing V1.5 `/v2/*` routes to V2 `/api/*`. Only 274 of 2,251 V1.5 route declarations are native method/path matches. Another 642 match compatibility controllers, and 87 share a path with a method mismatch. That means a large amount of current coverage is compatibility or alias coverage, not proven functional equivalence.

The frontend gap is also substantial. V1.5 React has 216 application routes; current V2 React has 119 exact route matches, 1 route covered only by `web-modern`, and 96 V1.5 routes missing. V1.5 React has 1,341 TS/TSX source files under `src`; V2's imported React app has 730, with 647 V1.5 files missing by relative path.

## Method

1. Regenerated parity artifacts with `scripts\audit-platform-parity.ps1`.
2. Recomputed backend parity with V1.5 `/api/v2/*` normalized to V2 `/api/*`.
3. Counted ASP.NET controllers, services, entities, and tests from `src/Nexus.Api` and `tests/Nexus.Api.Tests`.
4. Counted V1.5 Laravel controllers, services, models, and tests from `app`, `routes`, and `tests`.
5. Compared V1.5 React routes and TS/TSX source files against V2 `apps/react-frontend`.

Generated artifacts are in `artifacts\parity-audit\`.

## Platform Inventory

| Metric | V1.5 source truth | V2 current | Notes |
|---|---:|---:|---|
| Backend route declarations | 2,251 | 1,624 HTTP attributes | V2 includes many compatibility attributes. |
| Unique backend method/path pairs | 2,229 | 1,590 | Parameters normalized by shape. |
| Backend controllers | 254 PHP files | 122 C# files | File count, not class count. |
| Backend services | 418 PHP files | 93 C# files | V1.5 has a deeper service layer. |
| Data models/entities | 178 Eloquent model files | 166 EF entity files | Broad model parity, but not domain-complete. |
| Backend tests | 556 unit + 296 feature PHP tests | 128 C# integration/unit test files | Test volume is not equivalent by assertion count. |
| React app routes | 216 | 119 exact + 1 web-modern only | 96 V1.5 app routes missing. |
| React TS/TSX source files | 1,341 | 730 | 647 V1.5 files missing by relative path. |

Version evidence:

| Platform | Evidence |
|---|---|
| V1.5 backend | `C:\platforms\htdocs\staging\composer.json` has version `1.5.0` and Laravel `^12.54`. |
| V1.5 React | `C:\platforms\htdocs\staging\react-frontend\package.json` has version `1.5.0`. |
| V2 backend | `src\Nexus.Api\Nexus.Api.csproj` targets `net8.0`. |
| V2 React import | `apps\react-frontend\package.json` has version `1.0.0`. |
| V2 web-modern | `apps\web-modern\package.json` has version `0.1.0`, Next `16.1.6`, React `19.2.3`. |

## Backend Route Parity

Fair normalized comparison:

| Status | Count | Meaning |
|---|---:|---|
| Native method/path exact | 274 | V1.5 route maps to non-compat ASP.NET endpoint. |
| Compatibility method/path exact | 642 | V1.5 route maps to compatibility/alias controller. |
| Path exists, method mismatch | 87 | Same path exists but verb differs. Needs manual review. |
| Missing | 1,248 | No normalized V2 method/path route. |
| Total V1.5 declarations | 2,251 | From `C:\platforms\htdocs\staging\routes\api.php`. |

Normalized direct coverage: `1003 / 2251 = 44.6%`.

Native exact route coverage only: `274 / 2251 = 12.2%`.

The stricter generated CSV that does not rewrite `/api/v2/*` to `/api/*` reports 2,181 missing routes. That stricter number is useful as a compatibility-warning view, but the normalized 1,248 missing count is the fairer migration-parity number.

## Compatibility Risk

V2 has 707 HTTP attributes in compatibility controllers:

| Controller | Attribute count |
|---|---:|
| `ReactFrontendCompatibilityController` | 218 |
| `AdminCompatibility3Controller` | 126 |
| `AdminCompatibilityController` | 110 |
| `AdminCompatibility2Controller` | 107 |
| `CompatibilityAliasController` | 102 |
| `CompatibilityController` | 44 |

These routes materially inflate apparent parity. Evidence:

| File | Evidence |
|---|---|
| `src\Nexus.Api\Controllers\CompatibilityAliasController.cs:18` | File is explicitly "Route aliases and stub endpoints for the React frontend." |
| `src\Nexus.Api\Controllers\CompatibilityAliasController.cs:332` | Starts "Real gaps (stubs and lightweight implementations)". |
| `src\Nexus.Api\Controllers\CompatibilityAliasController.cs:361` | `/api/messages/typing` is documented as a stub. |
| `src\Nexus.Api\Controllers\CompatibilityAliasController.cs:470` | Social share and push notification stubs. |
| `src\Nexus.Api\Controllers\CompatibilityAliasController.cs:1187` | Feed interaction stubs. |
| `src\Nexus.Api\Controllers\CompatibilityAliasController.cs:1355` | Team tasks/documents stubs. |
| `src\Nexus.Api\Controllers\CompatibilityAliasController.cs:1380` | Federation stubs. |
| `src\Nexus.Api\Controllers\CompatibilityAliasController.cs:1449` | Volunteering stubs. |
| `src\Nexus.Api\Controllers\AdminCompatibilityController.cs:232` | Admin 2FA reset logs as stub. |
| `src\Nexus.Api\Controllers\AdminCompatibility2Controller.cs:182` | Export returns "not yet implemented". |
| `src\Nexus.Api\Controllers\AdminCompatibility3Controller.cs:136` | Several admin endpoints return empty arrays. |

For migration planning, compatibility endpoints should be treated as `partial` until they are backed by real services, persistence, authorization, tests, and V1.5 response-shape compatibility.

## Backend Domain Coverage

| Domain | V1.5 routes | Matched | Missing | Coverage | Native | Compat | Mismatch | Parity |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| admin | 956 | 482 | 474 | 50.4% | 68 | 395 | 19 | Partial, compat-heavy |
| volunteering | 98 | 64 | 34 | 65.3% | 25 | 25 | 14 | Partial |
| marketplace | 95 | 0 | 95 | 0.0% | 0 | 0 | 0 | Missing |
| groups | 91 | 31 | 60 | 34.1% | 18 | 9 | 4 | Partial |
| jobs | 87 | 25 | 62 | 28.7% | 19 | 6 | 0 | Partial |
| federation | 86 | 34 | 52 | 39.5% | 18 | 14 | 2 | Partial, compat-heavy |
| caring-community | 72 | 0 | 72 | 0.0% | 0 | 0 | 0 | Missing |
| users | 59 | 38 | 21 | 64.4% | 8 | 26 | 4 | Partial, compat-heavy |
| auth | 36 | 18 | 18 | 50.0% | 11 | 6 | 1 | Partial |
| me | 36 | 1 | 35 | 2.8% | 0 | 1 | 0 | Missing self-service aliases |
| feed | 33 | 18 | 15 | 54.5% | 1 | 17 | 0 | Partial, compat-heavy |
| gamification | 29 | 21 | 8 | 72.4% | 3 | 15 | 3 | Partial, compat-heavy |
| events | 28 | 17 | 11 | 60.7% | 9 | 6 | 2 | Partial |
| wallet | 26 | 16 | 10 | 61.5% | 9 | 4 | 3 | Partial |
| listings | 24 | 16 | 8 | 66.7% | 8 | 7 | 1 | Partial |
| stories | 24 | 0 | 24 | 0.0% | 0 | 0 | 0 | Missing |
| goals | 22 | 21 | 1 | 95.5% | 4 | 14 | 3 | Near complete, compat-heavy |
| messages | 21 | 15 | 6 | 71.4% | 6 | 5 | 4 | Partial |
| notifications | 17 | 10 | 7 | 58.8% | 9 | 0 | 1 | Partial |
| ai | 16 | 13 | 3 | 81.2% | 12 | 0 | 1 | Mostly covered |
| vereine | 16 | 0 | 16 | 0.0% | 0 | 0 | 0 | Missing |
| ideation-challenges | 14 | 13 | 1 | 92.9% | 0 | 10 | 3 | Near complete, compat-heavy |
| exchanges | 13 | 13 | 0 | 100.0% | 4 | 9 | 0 | Route complete, compat-heavy |
| social | 13 | 1 | 12 | 7.7% | 0 | 1 | 0 | Missing |
| polls | 12 | 10 | 2 | 83.3% | 5 | 4 | 1 | Mostly covered |
| ideation-ideas | 11 | 11 | 0 | 100.0% | 0 | 9 | 2 | Route complete, compat-heavy |
| kb | 11 | 7 | 4 | 63.6% | 0 | 4 | 3 | Partial |
| resources | 10 | 9 | 1 | 90.0% | 9 | 0 | 0 | Mostly covered |
| partner | 10 | 0 | 10 | 0.0% | 0 | 0 | 0 | Missing |
| group-exchanges | 9 | 9 | 0 | 100.0% | 5 | 3 | 1 | Route complete |
| legal | 9 | 6 | 3 | 66.7% | 0 | 6 | 0 | Partial, compat-heavy |
| explore | 9 | 0 | 9 | 0.0% | 0 | 0 | 0 | Missing |
| webauthn | 9 | 0 | 9 | 0.0% | 0 | 0 | 0 | V2 has passkeys, but V1.5 route aliases missing |
| search | 7 | 5 | 2 | 71.4% | 2 | 3 | 0 | Partial |
| subscriptions | 6 | 0 | 6 | 0.0% | 0 | 0 | 0 | Missing direct route parity |
| cookie-consent | 6 | 2 | 4 | 33.3% | 1 | 1 | 0 | Partial |

## Major Missing Backend Domains

| Domain | Missing route count | Migration impact |
|---|---:|---|
| Marketplace | 95 | Full marketplace/ecommerce-style module absent from V2 backend parity. |
| Caring community | 72 | Caregiver, help request, warmth pass, care provider, trust tier, safeguarding community features absent. |
| Jobs | 62 | Basic jobs exist, but V1.5 advanced jobs pipeline, team, alerts, interviews, scorecards, bias audit, referrals are not route-complete. |
| Groups | 60 | Core groups exist, but advanced groups, media, wiki, QA, scheduled posts, webhooks, tags, recommendations are incomplete. |
| Federation | 52 | Federation base exists, but V1.5 protocol-specific and aggregate route coverage is incomplete. |
| Stories | 24 | Story/success-story APIs absent. |
| Vereine/clubs | 16 | Club dues/federation flows absent. |
| Social | 12 | Social/appreciation/saved collection/bookmark parity incomplete. |
| Partner/developer APIs | 10 | Partner API/developer portal backend parity incomplete. |
| Explore/WebAuthn aliases | 18 combined | Some features exist semantically elsewhere, but V1.5 route compatibility is missing. |

## Current Frontend Parity

Route parity:

| Status | Count |
|---|---:|
| V1.5 route also present in current React | 119 |
| V1.5 route present only in `web-modern` | 1 |
| V1.5 route missing from current V2 frontends | 96 |

Missing frontend route clusters:

| Cluster | Missing routes |
|---|---:|
| caring-community | 24 |
| marketplace | 23 |
| jobs | 5 |
| developers | 4 |
| `me/*` self-service | 4 |
| clubs | 3 |
| premium/billing | 3 |
| advertise/coupons/feed/settings/users/volunteering | 2 each |

Missing source-file clusters from V1.5 React:

| Source cluster | Missing TS/TSX files |
|---|---:|
| `components/` | 220 |
| `pages/` | 223 |
| `admin/` | 125 |
| `broker/` | 23 |
| `hooks/` | 20 |
| `lib/` | 16 |
| `caring/` | 9 |

Current frontend API wiring:

| API string status | Count | Meaning |
|---|---:|---|
| exists | 539 | Frontend call maps to native ASP.NET route. |
| exists-any-method | 431 | Path exists but method could not be confidently inferred. |
| exists-compatibility | 972 | Frontend call maps to compatibility controller. |
| missing | 160 | No ASP.NET route found. |
| method-mismatch | 4 | Route path exists, method differs. |

This means the current frontend is not merely missing V1.5 screens; many of the screens it does have depend on compatibility endpoints.

## Migration Readiness By Area

| Area | Status | Notes |
|---|---|---|
| Core exchange workflow | Strong route parity | Exchanges and group-exchanges route-complete, but many matches are compatibility routes. |
| Listings/wallet/events/messages | Partial | Core exists, but direct V1.5 route and advanced behavior parity are incomplete. |
| Users/profile/self-service | Partial | User routes exist, but `/me/*`, blocked users, exports, sessions, social/self-service flows are incomplete. |
| Admin | Partial and high risk | 50.4% normalized route coverage; 395 of 482 matched routes hit compatibility controllers. |
| Gamification/goals/ideation | Mixed | Many routes covered, but heavily compatibility-backed. Needs behavior verification. |
| Volunteering | Partial | 65.3% route coverage, but V1.5 still has missing wellbeing, expenses, advanced alerts, certificates, custom forms, and org-wallet details. |
| Federation | Partial | V2 has federation architecture, but V1.5 route compatibility is only 39.5%. |
| Marketplace | Missing | 95 V1.5 routes missing. |
| Caring community | Missing | 72 V1.5 routes missing and many frontend routes absent. |
| Premium/billing/coupons/merchant | Mostly missing | V1.5 has routes and UI; V2 direct parity is absent or minimal. |
| Clubs/vereine | Missing | V1.5 club dues/federation workflows absent. |
| Stories/success stories | Missing | API and frontend parity absent. |

## Priority Migration Backlog

1. Replace compatibility endpoints with real implementations or explicitly mark them out of migration scope. Do this before claiming parity.
2. Restore V1.5 React route parity for marketplace, caring-community, jobs, developers, premium/billing, clubs, and `me/*` settings pages.
3. Implement full backend route parity for marketplace and caring-community first; they are the largest true zero-coverage domains.
4. Convert admin compatibility endpoints into native admin services, starting with user actions, newsletter/email, content moderation, legal/GDPR, tenant settings, and reporting.
5. Add a normalized route parity artifact to CI so `/api/v2/*` to `/api/*` normalization is consistently tracked.
6. For every compatibility route retained, add tests proving V1.5 response shape, authorization behavior, tenant isolation, and persistence side effects.
7. Treat "route complete" domains as not done until behavior-level parity tests exist against V1.5 scenarios.

## Bottom Line

V2 has a credible ASP.NET foundation and many core domains exist, but it is not a complete migration from V1.5. The honest status is:

- Core timebanking backend: partially migrated.
- Long-tail V1.5 backend: substantially missing.
- Admin backend: broad but compatibility-heavy.
- Current React frontend: significantly behind V1.5.
- Marketplace and caring-community: absent from V2 parity.
- Migration parity claim: not supportable yet without qualifying compatibility stubs and missing route domains.
