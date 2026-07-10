# Full Laravel Parity Remediation Runbook

Last reviewed: 2026-07-10

This is the maintained execution map for completing both parity workstreams:

1. finish `apps/web-uk` as the accessible frontend against the Laravel backend;
2. make the ASP.NET backend a contract-compatible twin of Laravel for both the
   canonical Laravel React frontend and the accessible frontend.

The counts below are a dated audit snapshot, not permanent truth. Regenerate
them before editing, scoring, or claiming completion. This runbook supersedes
older numeric scores and completion claims in the handoff documents, while the
handoffs remain useful for detailed implementation history and commands.

## Objective

The required end state is a two-frontends-by-two-backends compatibility model:

| Frontend | Laravel backend | ASP.NET backend |
| --- | --- | --- |
| Canonical React at `C:\platforms\htdocs\staging\react-frontend` | Source-of-truth baseline | Same contracts and workflows, runtime-certified |
| Accessible Web UK at `apps/web-uk` | Laravel-first and fully certified | Same Web UK code and page flows, runtime-certified after backend parity |

Do not achieve this by adding ASP.NET-specific behavior to the canonical React
frontend or page-level backend adapters to Web UK. ASP.NET must implement the
Laravel contracts.

## Source Of Truth And Boundaries

| Surface | Path | Rule |
| --- | --- | --- |
| Laravel backend | `C:\platforms\htdocs\staging` | Read-only reference |
| Canonical React frontend | `C:\platforms\htdocs\staging\react-frontend` | Read-only contract consumer |
| Laravel accessible frontend | `C:\platforms\htdocs\staging\accessible-frontend` | Read-only visual, content, accessibility, and workflow reference |
| Laravel accessible routes | `C:\platforms\htdocs\staging\routes\govuk-alpha.php` and `routes\govuk-alpha-parity` | Read-only route truth |
| ASP.NET backend | `C:\platforms\htdocs\asp.net-backend\src` | Backend implementation target |
| Accessible Web UK | `C:\platforms\htdocs\asp.net-backend\apps\web-uk` | Accessible implementation target |
| Legacy React copy | `apps/react-frontend` | Frozen; do not modify without explicit user approval |

Before any production deployment or production-container action, stop and read
`.claude/production-containers.md`. This runbook does not authorize production
deployment or touching production containers. Never modify the Laravel repo or
Laravel Edition containers from this worktree.

## 2026-07-10 Audit Baseline

Repository snapshot at audit time:

- ASP.NET `main`: `faad7fd7`, equal to `origin/main`, tracked worktree clean.
- Laravel `main`: `93e4266b7`, equal to `origin/main`, with a pre-existing
  modification in `react-frontend/package-lock.json` that must be preserved.

### Scores

Scores separate implementation progress from evidence-backed readiness. Static
route coverage is not a completion score.

| Surface | Score | Meaning |
| --- | ---: | --- |
| ASP.NET static API method/path inventory | 998.8/1000 | 2,433 of 2,436 Laravel operations matched |
| ASP.NET implementation parity | 640/1000 | Broad implementation with material workflow, schema, integration, and localization gaps |
| ASP.NET certification confidence | 420/1000 | Current full-suite and frontend-on-ASP proof is insufficient |
| Web UK Laravel-first implementation | 910/1000 | Route conversion is advanced; several source and presentation gaps remain |
| Web UK Laravel-first certification | 755/1000 | Current Jest, accessibility, localization, and exhaustive live proof are incomplete |
| Web UK ASP.NET switchability proof | 80/1000 | Resolver/configuration exists; no route family is end-to-end certified against current ASP.NET |

### Fresh evidence

| Check | 2026-07-10 result |
| --- | --- |
| ASP.NET static operations | 4,309 |
| Laravel source operations | 2,436 |
| Static method/path matches | 2,433 matched, 3 missing |
| Explicit admin compatibility behavior | At least 196 of 329 `AdminExplicitParityController` route declarations reached generic fallbacks at audit time |
| Schema inventory | 361 Laravel tables, 131 exact matches, 230 missing names, 193 ASP.NET-only names |
| ASP.NET backend localization comparator | 7/11 locales, 49/605 namespaces, 157 comparable English keys matched, 5,018 missing |
| Web UK authoritative locale catalogs | 11/11 locales, 24 namespaces, and 7,337 string keys per locale with zero missing or extra keys relative to English |
| Web UK translation depth | Each non-English Laravel catalog still has 3,903-3,951 English-identical values (53.2%-53.9%); 16 namespaces are wholly English-identical in the read-only source |
| Web UK conservative template localization | 1,595 safe static substitutions across 257 templates; the post-write audit reports 290 templates and zero remaining conservative matches, which is not a contextual-copy completion claim |
| ASP.NET Release build | Passed with 0 errors and 4 xUnit warnings |
| Focused ASP.NET regression | Failed: stale catch-all test expected 202 and received 404 |
| Web UK route matrix | 608/608 matched, 0 missing, 0 extra application routes, 3 infrastructure routes ignored |
| Web UK Jest | 31/31 suites and 1,021/1,021 tests passed after the localization/RTL, tenant-boundary, contextual identity/auth/accessibility, Explore, and profile-status slices |
| Web UK lint and CSS build | Passed |
| Web UK brand guard | Passed at the audit baseline; rerun with the final certification set |
| Current-source Blade marker spot-check | 19/19 passed; this is not screenshot or WCAG certification |
| Current-source browser accessibility gate | Expanded 12/12 Playwright Chromium/axe cases passed: nine representative public shared-mount pages plus three Arabic RTL pages at 320px, covering language/direction, structure, unique IDs, horizontal reflow, and serious/critical violations. Manual certification remains. |
| Current-source Laravel core smoke | 10/10 passed |
| Current-source module smoke sample | Chunk 1/8 passed 106/106; exhaustive eight-chunk recertification was not rerun during the audit |

Repository activity was substantial: 125 backend/test commits landed from July
7 through the audit, including 59 from July 9 onward. Scores must reflect both
that implementation movement and the lower amount of current green evidence.

### Key evidence anchors

- Missing Laravel route declarations:
  `C:\platforms\htdocs\staging\routes\api.php:2160`, `:2161`, and `:2885`.
- Canonical React group-exchange start call:
  `C:\platforms\htdocs\staging\react-frontend\src\pages\group-exchanges\GroupExchangeDetailPage.tsx:231`.
- ASP.NET generic admin fallbacks and recorded-only write path:
  `src\Nexus.Api\Controllers\AdminExplicitParityController.cs:246`, `:487`,
  `:529`, `:671`, `:1257`, and `:5536`.
- Scheduled-job false-success path:
  `src\Nexus.Api\Controllers\AdminCompatibilityController.cs:3955`.
- Current Web UK reserved-path parity assertion:
  `apps\web-uk\tests\tenant-routing-source.test.js:25`.
- Web UK tenant routing list:
  `apps\web-uk\src\middleware\tenant-routing.js:25`; Laravel source list:
  `C:\platforms\htdocs\staging\app\Core\TenantContext.php:516`.
- Completed tenant-URL source boundary: all 54 audited root-relative controls
  across 17 volunteering templates now use `urlFor()`, their three generated
  cursor links use the same helper, and an app-wide Nunjucks regression permits
  only the intentional root public asset paths.
- ASP.NET switching remains intentionally labelled future/not-certified in
  `apps\web-uk\src\lib\backend-contract.js:9`.

### Web UK localization/RTL progress after the audit baseline

The current slice adds a real request-scoped localization foundation rather
than treating the language selector as completion. Locale resolution follows a
valid query locale, session, an available request user/profile, a signed-token
profile preference, weighted `Accept-Language`, then English. Valid query and
profile choices seed the session; responses declare `Content-Language`;
request-scoped `AsyncLocalStorage` carries the locale into API/download
requests; signed profile reads are memoized per request; and display formatting,
document `lang`, and document direction use the resolved locale.

The deterministic catalog sync and audits prove structural parity with the
read-only Laravel source, while the conservative template pass wires only
semantically safe exact matches. They do not solve untranslated upstream data
or contextual route/template copy. In particular, `activity`, `blogreviews`,
`connections`, `events`, `federation`, `feed`, `gamification`, `ideation`,
`listings`, `members`, `organisations`, `saved`, `search`, `settings`,
`volunteering`, and `wallet` are wholly English-identical across every
non-English Laravel catalog. No score was recalculated from this slice alone,
and the Laravel-first completion gate remains open.

A follow-up now gives all nine representative public browser-gate pages
localized document titles and primary headings, translates exact auth
validation/status/API-code states at render time, and localizes scoped dynamic
ARIA/visually-hidden labels in advanced search, saved collections, connection
network, and course learning. The full Jest and 12-case browser gates remain
green. This narrows the contextual backlog; it does not remove the hundreds of
remaining family-specific strings or the authoritative untranslated namespaces.

Explore now delegates its page and 19 feature-gated cards to explicit Laravel
keys, and profile/settings translates 45 exact status/error keys at render time.
The immutable `92357a95` residual audit still measured 381 effective hard-coded
title sites, 153 static H1s, 3,178 pure static nodes, 53 dynamic accessible-label
occurrences, and about 715 raw route-message candidates before those two slices.
Jobs now delegates 16 fixed document titles, its exact status/error families,
and selected high-impact detail/history/talent/bias/qualification copy to
authoritative keys while preserving user-authored dynamic content. Fresh
ephemeral Laravel proof passed 41/41 signed/gated/redirect/body checks plus a
13/13 Irish/Arabic rendered-output run. Marketplace now delegates 20 fixed
document titles, 56 exact status/error tokens, its shared navigation, and its
high-impact browse chrome to Laravel keys. A fresh current-source Laravel run
passed 33/33 base, signed-page, feature-gate, and Irish/Arabic output checks.
The remaining family-specific hard-coded copy and mutation/upload/destructive
proof keep Marketplace open. Laravel's non-English
`premium.*` Explore copy is also stale relative to current English donation
semantics and requires an upstream catalog fix.

The profile two-factor enrolment contract now follows Laravel's status-then-
setup sequence, accepts `qr_code_url`, renders one-time backup codes on the
verification POST, preserves rate/service failures, and localizes its remaining
high-impact setup chrome. Focused tests passed 31 selected assertions. Live
successful enrolment remains blocked on a disposable security-test fixture;
the complete current Web UK gate passed 38/38 suites and 1,177/1,177 tests. Do
not mutate a persistent member merely to create proof.

The profile deletion form now uses Laravel's pending-erasure contract instead
of the immediate `/api/v2/users/me` purge. It submits to
`POST /api/gdpr/delete-account`, maps password/auth/service failures, and clears
the Web UK cache, server session, and all auth cookies only after success.
Focused proof passed 11 assertions and safe current-source Laravel GET plus
Irish/Arabic rendering passed 13/13 checks; the complete current Web UK gate
passed 39/39 suites and 1,187/1,187 tests. A successful live POST is blocked
on a disposable isolated GDPR fixture; it must not be run against the shared
smoke member.

## Workstream A: Accessible Frontend To Laravel Completion

This workstream ends at complete, evidence-backed Laravel-first certification.
It must not wait for ASP.NET parity, and it must not implement ASP.NET-specific
page branches. Preserve backend-neutral contracts so the same frontend can be
smoked against ASP.NET later.

### Immediate blockers

1. **Completed 2026-07-10:** synchronized the 21 parent-domain reserved route
   segments added to Laravel `TenantContext`, restored full Jest to green, and
   added behavior coverage for every new segment plus the existing automatic
   source-drift comparison.
2. **Completed 2026-07-10:** replaced all 54 direct root-relative internal
   `href` and `action` attributes across 17 volunteering templates with the
   tenant-aware URL helper, wrapped the three generated cursor consumers, and
   added app-wide source plus mounted query/fragment render regression
   coverage. The same slice made `urlFor()` idempotent, tenant-scoped cookie
   return redirects, the legal-hub document links, and the session-timeout
   login/logout flow; timeout sign-out is now a CSRF-protected POST rather than
   an unsupported GET.
3. **Completed 2026-07-10:** ported the current Laravel accessible changes:
   - donation display resolves the uppercase tenant currency and donation POST
     no longer sends hard-coded EUR; amounts above 1,000,000 are rejected;
   - the two advisory screen-reader prefixes say `Warning` while genuine error
     summaries retain `There is a problem`;
   - safeguarding field failures link to all five affected controls while the
     two generic failures remain plain text;
   - **Completed 2026-07-10:** the federation hub CTA now enters onboarding,
     and the tenant-scoped session-backed privacy/communication/confirm flow
     retains choices, finalizes from a confirm-only request, preserves state on
     failure, clears it only on success, and has Laravel API read-back proof.
4. Reconcile every `Partial` and `Started` row in
   `apps/web-uk/docs/BLADE_COMPONENT_PORT_AUDIT.md` against current Laravel
   Blade, controllers, API calls, validation, gates, banners, empty states,
   error states, and POST/upload/delete side effects.
5. **Localization/RTL foundation substantially advanced 2026-07-10, but still
   open:** Web UK imports all 11 offered Laravel locales across 24 namespaces
   and 7,337 keys with zero structural drift; resolves locale per request;
   propagates it to API calls and formatters; emits correct `lang`/`dir`; and
   completed 1,595 conservative substitutions across 257 templates. Finish the
   contextual route titles, headings, validation/status copy, ARIA labels, and
   residual unsafe-to-infer strings. The authoritative read-only Laravel
   catalogs also leave 16 namespaces and 53.2%-53.9% of each non-English locale
   English-identical, so those source translations need an external owner
   before every offered locale can be certified. A language selector,
   structurally complete catalogs, or a zero-safe-match audit is not translated
   output completion.
6. **Expanded automated foundation completed 2026-07-10:** Playwright Chromium
   plus `@axe-core/playwright` now starts a fresh current-checkout Web UK
   listener and gates 12 cases: nine representative public pages plus three
   Arabic RTL pages at 320px, covering document direction, structure, unique
   IDs, horizontal reflow, and serious/critical axe violations. Continue
   expanding authenticated, error, upload, destructive, and additional RTL
   states, and perform a recorded manual pass for keyboard use, focus order and
   visibility, screen-reader announcements, zoom/reflow, contrast, error
   summaries, and RTL behavior.
   The source-level error-summary focus audit is complete for current Nunjucks
   source: all 135 summaries carry `tabindex="-1"`, down from six omissions at
   the 2026-07-10 audit.
7. Rebuild/restart a current-source Web UK process. Do not use a stale port 5180
   process as certification evidence.
8. Rerun the complete Laravel smoke scope, chunked if necessary, including
   signed/unsigned, unauthorized, not-found, feature-disabled, tenant-domain,
   custom-domain, forms, uploads, destructive actions, redirects, and body-copy
   checks.
9. Refresh the route matrix, component audit, switching contract, and Web UK
   handoff with exact command output. Remove superseded scores and false
   completion claims.

### Laravel-first 1000/1000 gate

Do not claim this workstream complete until all of the following are true:

- every current Laravel accessible method/path is represented by a real Web UK
  route and page rather than a preparation handler;
- layouts, content hierarchy, navigation, forms, validation, status banners,
  empty/error states, gates, redirects, uploads, and side effects match Laravel;
- tenant mounts, parent/custom domains, and tenant-aware URLs work without
  response-rewrite dependence hiding source errors;
- authentication and authorization work against Laravel for all relevant roles;
- all offered locales render translated, correctly formatted output and RTL is
  proven where applicable;
- Jest, lint, brand guard, route matrix, accessibility automation, visual
  review, manual WCAG review, and the full Laravel runtime smoke scope pass;
- no known Laravel Blade/controller/route drift remains;
- docs contain reproducible evidence and no unsupported 1000/1000 claim;
- the worktree contains no unrelated staged changes.

ASP.NET smoke is a separate shared-switchability gate. Record it honestly as
pending rather than blocking Laravel-first completion.

## Workstream B: ASP.NET As A Laravel-Compatible Twin

This workstream is contract and workflow parity, not route transcription. Drive
each slice from Laravel routes/controllers plus actual canonical React call
sites. Web UK is an additional consumer once Laravel-first conversion is green.

### P0: close current contract and safety regressions

1. Implement and test the three currently missing operations:
   - `GET /api/v2/admin/volunteering/wellbeing/alerts`;
   - `PUT /api/v2/admin/volunteering/wellbeing/alerts/{id}`;
   - `POST /api/v2/group-exchanges/{id}/start`.
2. Complete the entire group-exchange contract: filters, pagination, response
   fields, participants, split calculations, pending-confirmation state,
   completion wallet mutations, transaction IDs, credit conservation, and
   notifications.
3. Inventory every canonical React-used route that reaches a generic catch-all,
   recorded-only write, unconditional empty response, mock secret, or fabricated
   success. Replace each with a real workflow or an explicit honest unsupported
   result while implementing the remaining workflow. Never return a success
   envelope for an operation that did not happen.
4. Correct scheduled-job `run now`: execute the compatible operation and record
   its real outcome, or fail explicitly. Do not record success without running
   the job.
5. Match current role semantics: supported roles, tenant-super-admin flag,
   authorization policies, validation, response values, and migrations.
6. Match Laravel's AI-provider test authorization and throttling.
7. Add the `features.explore` bootstrap contract.
8. Port regression tests for Laravel's recent cross-tenant read and route-auth
   fixes. Prove tenant isolation with negative tests, not only happy paths.

> **2026-07-10 backend progress:** P0 items 1 and 2 now have real wellbeing and
> group-exchange workflows with focused tests. P0 item 4 now fails closed: the
> manual-run endpoint executes real `ListingExpiry` and `JobVacancyExpiry`
> jobs, persists their outcomes, prevents overlapping scheduled/manual
> execution, excludes inactive tenants, and returns explicit unsupported,
> busy, disabled, and failure responses. Only 2 of the 42 Laravel cron
> definitions are mapped; the other 40 are reported disabled/unsupported. P0
> item 5 now has explicit user privilege columns, DB-backed policies,
> stale-token rejection, canonical v2 auth errors, protected explicit-God
> targets, and focused role regression coverage. Fresh migration-chain/runtime
> certification remains open. P0 item 3 now includes real canonical federation
> partnership list/approve/reject behavior: receiver-only pending transitions,
> atomic audit, post-commit in-app notifications, Laravel error envelopes, and
> one-winner concurrency tests. It does not yet include Laravel federation-level
> permission fields, durable rejection metadata, localized push, initial-sync
> scheduling, or canonical audit-read visibility. Volunteering approval remains
> an unconditional compatibility success pending its ShiftId/capacity migration.
> This progress does not close the catch-all inventory, wider
> scheduled/provider backlog, or the backend 1000/1000 gate.

### P1: replace compatibility scaffolding with domain behavior

1. Prioritize React-used/admin-used fallbacks in
   `AdminExplicitParityController`, `AdminParityController`, volunteering,
   identity, moderation, safeguarding, groups, jobs, courses, podcasts, billing,
   marketplace, federation, Verein/Clubs, partner APIs, and regional analytics.
2. For each route family, match request/query/multipart shapes, response
   envelopes, pagination, validation, status codes, auth/tenant errors,
   not-found behavior, feature gates, persistence, events, notifications,
   uploads, downloads, and provider side effects.
3. Close or explicitly map schema gaps. A renamed/table-alias entry requires
   evidence for columns, types, keys, constraints, tenancy, soft deletion,
   relationships, indexes, migration state, and workflow use.
4. Finish real Stripe/payment/portal/webhook behavior, SSO redirect/callback,
   PKCE and token validation, provider webhooks, media processing, scheduled
   jobs, Mailchimp-equivalent behavior, realtime, and other documented provider
   gaps. Where credentials are unavailable, complete deterministic adapters and
   tests, then record the external live-verification blocker precisely.
5. Close backend/admin/email/API/accessibility localization gaps for all Laravel
   locales and relevant keys.
6. Split oversized compatibility controllers when doing so reduces collisions
   and allows focused ownership/tests; preserve public contracts throughout.

Admin and WebAuthn route-owner collisions found in the 2026-07-10 slice were
removed and are now guarded by live endpoint-table ownership tests. Ownership
is not evidence that every remaining handler has workflow parity.

### Backend 1000/1000 gate

Do not claim completion until all of the following are true:

- a current Laravel route/OpenAPI/call-site inventory has zero unexplained
  method/path gaps;
- no canonical frontend-used operation depends on generic, empty,
  recorded-only, mocked, or fabricated-success behavior;
- request, response, validation, error, auth, tenant, feature, upload,
  pagination, status, persistence, event, notification, and provider contracts
  match Laravel for every in-scope workflow;
- schema and localization maps have no unexplained gaps;
- recent Laravel tenant/security regression cases pass against ASP.NET;
- the full ASP.NET build and test suites pass from a clean checkout;
- a fresh current-source image/runtime has the complete migration history and
  no missing-table errors;
- the unchanged canonical Laravel React frontend passes representative and then
  exhaustive workflow smoke against ASP.NET;
- the unchanged certified Web UK frontend passes its same smoke buckets against
  ASP.NET;
- parity docs are refreshed from live evidence and no stale score is presented
  as current truth;
- the worktree contains no unrelated staged changes.

## Autonomous Execution Loop

Both sessions must use this loop until their workstream's completion gate is
met or only genuine external blockers remain:

1. **Refresh:** read instructions and handoffs; inspect both repos' heads,
   status, recent commits, generated matrices, failing tests, and active local
   runtime versions. Never overwrite another agent's work.
2. **Choose:** select the highest-impact unblocked workflow-sized gap. Prefer
   end-to-end behavior over raw endpoint/page counts.
3. **Trace:** follow the Laravel route, controller/service/model/view and the
   consuming React or accessible call site. Write the exact contract and
   acceptance cases before implementation.
4. **Implement:** make the smallest coherent production-quality slice, including
   migrations/configuration and focused tests where required.
5. **Verify:** run focused tests first, then relevant broader suites, comparators,
   and runtime smoke. A static match, marker check, skipped test, stale process,
   or unrun suite is not passing evidence.
6. **Document:** update the maintained map/handoff with exact commands, outcomes,
   remaining gaps, and any environmental caveat.
7. **Publish:** inspect the diff and worktree, commit only the coherent in-scope
   slice, and push it. Never force-push. If publishing fails, record the exact
   reason and continue safe local work where possible.
8. **Repeat:** immediately choose the next highest-impact gap. Do not stop after
   planning, documentation, one passing slice, or an improved score.

Sessions launched with this runbook are authorized to implement, test, document,
commit, and push verified in-scope changes. This does not authorize production
deployment, production-container changes, destructive external actions, or
modification of the Laravel reference repo.

## Refresh And Verification Commands

Start at the repository root:

```powershell
cd C:\platforms\htdocs\asp.net-backend
git status --short --branch
git log --oneline --decorate -n 30
git diff --stat
git -C C:\platforms\htdocs\staging status --short --branch
git -C C:\platforms\htdocs\staging log --oneline --decorate -n 30
```

Backend baseline:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\test-compare-laravel-api-parity.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\test-compare-laravel-schema-parity.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\test-compare-laravel-localization-parity.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\test-export-laravel-parity-backlog.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\compare-laravel-api-parity.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\compare-laravel-schema-parity.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\compare-laravel-localization-parity.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\compare-laravel-frontend-parity.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\export-laravel-parity-backlog.ps1
dotnet build Nexus.sln --configuration Release --no-restore
dotnet test Nexus.sln --configuration Release --no-restore
```

The test scripts validate comparator behavior. The non-`test-` commands refresh
the live artifacts used for current counts. Interpret the generic frontend
comparator cautiously and use Web UK's dedicated route matrix for its current
accessible route coverage.

Accessible baseline:

```powershell
cd C:\platforms\htdocs\asp.net-backend\apps\web-uk
npm run brand:check
npm run lint
npm run build:css
npm test -- --runInBand
npm run locales:audit
npm run locales:audit-templates -- --summary
npm run route:matrix
npm run visual:blade
npm run smoke:laravel:local
npm run smoke:federation:local
```

Use the chunk controls documented in
`apps/web-uk/docs/CURRENT_WEB_UK_HANDOFF.md` for exhaustive module and body-text
recertification. Record every chunk and do not extrapolate from one chunk.

## Evidence And Blocker Rules

- Never claim a suite passed if it was not run, timed out, was filtered, used a
  stale process/image, or skipped relevant cases.
- Never convert route counts, table-name counts, commits, or marker checks into
  behavioral parity claims.
- Keep implementation progress and green/certification confidence as separate
  scores with an explicit rubric.
- A missing credential, unavailable provider, production secret, account
  permission, or external service can be an external blocker. Record the exact
  command, error, affected acceptance criterion, safe local proof completed, and
  what a human must supply.
- A failing test, difficult implementation, stale local process, missing local
  migration, or large backlog is not automatically an external blocker. Fix it
  or move to another unblocked in-scope slice while continuing the loop.
- Do not stop while meaningful unblocked work remains.

## Required Final Handoff

At the end of either session, report and record:

- branch, head, upstream state, and commits pushed;
- dirty files, separated into session-owned and pre-existing changes;
- exact before/after comparator and route-matrix counts;
- exact build, test, accessibility, and runtime-smoke commands and results;
- completed workflow families and remaining gaps;
- implementation score and certification-confidence score, each with rubric;
- external blockers with evidence and owner/action needed;
- the next five concrete tasks if any work remains.
