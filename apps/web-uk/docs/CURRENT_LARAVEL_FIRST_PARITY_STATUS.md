# Current Laravel-First Accessible Frontend Status

Last audited: 2026-07-14

This is the short, current coordination document for `apps/web-uk`. Read it
before starting or resuming accessible-frontend work. It overrides older route,
test, localization, and readiness counts in narrative handoffs, while
`BLADE_COMPONENT_PORT_AUDIT.md` remains the detailed evidence ledger.

## Goal And Source Of Truth

`apps/web-uk` must become a complete observable-behaviour clone of the Laravel
Blade accessible frontend while retaining the Express/Nunjucks/GOV.UK Frontend
stack. In this documentation, "full-stack frontend" means the server-rendered
web application owns browser routes, Nunjucks rendering, sessions, CSRF,
progressive enhancement, form handling, redirects, and backend API mediation.
It does not own backend business logic, database schema, or persistence.

- Product/UI source of truth: Laravel Blade defines browser routes, links,
  layout, navigation, content hierarchy, forms, validation presentation,
  redirects, tenant behaviour, and workflows:
  `C:\platforms\htdocs\staging\accessible-frontend`
- Backend-contract source of truth: the Laravel backend defines HTTP methods and
  paths, request/response shapes, status codes, auth, roles, modules, uploads,
  downloads, persistence, and side effects:
  `C:\platforms\htdocs\staging`
- Target frontend: `C:\platforms\htdocs\asp.net-backend\apps\web-uk`
- Canonical public mount: `/{tenantSlug}/accessible`
- Canonical Hour Timebank evidence URL: `/hour-timebank/accessible` (and nested
  paths beneath it)
- Legacy `/{tenantSlug}/alpha`: redirect compatibility only
- Never use `/hour-timebank/alpha` as a comparison, browser-test, or evidence
  URL; it exists only to verify the legacy redirect.
- Current and certification backend: Laravel
- Future second backend: ASP.NET, incomplete, not authoritative, and not
  certified

Laravel source and its ordinary local database are read-only from this
workstream. Do not solve a missing Laravel API by inventing frontend-only
behaviour, editing Laravel, running Laravel migrations, altering its schema,
querying its database directly, or performing database cleanup. Real mutation,
upload, download, and destructive certification requires a dedicated disposable
Laravel test environment or explicit user authorization with verified cleanup.

ASP.NET is not a source of truth for this frontend and is not part of the
frontend implementation loop. Do not inspect it to decide frontend behaviour
and do not modify its controllers, services,
entities, tests, or migrations. The separate ASP.NET parity workstream must
make that backend satisfy the already-established Laravel contract. Later
switching proof must change backend configuration only and rerun the same
unchanged Web UK suite.

## Concurrent-Session Ownership

The accessible-frontend session owns `apps/web-uk/**` only. The ASP.NET parity
session owns backend work, including `src/Nexus.Api/**`,
`tests/Nexus.Api.Tests/**`, and backend migrations. During concurrent work:

1. Run `git status --short` and `git log -1 --oneline` before every slice.
2. Preserve every unrelated dirty file. Never reset, restore, move, or stage it.
3. Stage explicit `apps/web-uk/...` paths; never use `git add -A` or
   `git commit -a`.
4. Keep one bounded frontend behavior and its evidence in each commit.
5. Recheck `HEAD` and the scoped diff immediately before staging because both
   sessions share this working directory.
6. If an unexpected `apps/web-uk` change appears, inspect ownership before
   editing the same file.
7. Do not modify the frozen `apps/react-frontend` copy or any production
   container.

## Local Laravel Boundary Incident

This workstream previously violated the read-only boundary by applying two
existing Laravel migrations to the ordinary local MySQL database and leaving
disposable mutation residue. A production read-only inventory on 2026-07-13
established that both migrations were already legitimate production schema,
recorded there in batch `96`; this workstream did not create or deploy either
production schema change.

With explicit owner authorization, production was dumped consistently to
`/opt/nexus-php/backups/incident-production-20260713T145005Z.sql.gz`. The dump
passed gzip, completion-marker, SHA-256, and isolated restore checks, was copied
to Laravel's Git-ignored `backups/incident-recovery/` directory, and did not
alter production rows or schema. The pre-repair local database was separately
preserved there as `incident-local-before-repair-20260713T150209Z.sql.gz`.

The local `nexus` database was then reinitialized from the verified production
dump. It now matches the audited production snapshot: 11 tenants, 360 users,
383 Laravel migration rows, both questioned migrations in batch `96`, both
group-template columns, all ten event-accessibility columns, and zero matches
for `Codex` across every text column. Laravel and MariaDB returned healthy after
restart. The Laravel repository remained unchanged apart from its pre-existing
`react-frontend/package-lock.json` and untracked `.codex/` state; neither backup
is eligible for Git staging because `/backups/` is ignored.

Consequences for this workstream:

- do not apply or roll back any Laravel migration;
- do not delete or repair any Laravel row;
- treat the ordinary local Laravel database as a confidential, production-data
  snapshot for read-only comparison, never as a disposable certification
  fixture;
- run future mutation certification only against an isolated disposable Laravel
  environment whose complete cleanup can be verified.

Do not append another general progress narrative to
`CURRENT_WEB_UK_HANDOFF.md`. Update this file only when the source SHAs,
blocker set, route-gap set, or certification state materially changes. Put
detailed row evidence in `BLADE_COMPONENT_PORT_AUDIT.md` in the same scoped
commit as the implementation it describes.

## Audited Baseline

The frontend baseline for the current checkout includes the Event registration,
account-hub reconciliation, Event Communications, lifecycle-history, and recurrence-
history slices; its published parent is repository commit `674a2f1f`; the current
checkout also contains the appreciation-safeguarding parity slice. The Laravel source
baseline is `903d03d3`. The first SHA names the
repository snapshot containing Web UK; it does not make ASP.NET authoritative.
Refresh the Laravel Blade/API source and Web UK implementation before relying on
these numbers after either source moves.

| Measure | Audited result | Meaning |
|---|---:|---|
| Laravel accessible HTML routes | 689 | Current source inventory |
| Web UK routes | 690 | Includes deliberate local compatibility routes |
| Matched Laravel routes | 683/689 (99.13%) | Declaration coverage only |
| Missing Laravel routes | 6 | All are Event workflows |
| Extra Web UK routes | 5 | Four 404 tombstones plus one binary proxy |
| Ignored infrastructure routes | 3 | Health/root infrastructure |
| Jest | 48/48 suites, 1,632/1,632 tests | Fresh green code gate |
| Locale catalog shape | 11 locales, 36 namespaces, 8,837 keys | Structural parity plus static-key resolution gate |
| Static locale usage | 7,019 references, 5,339 unique keys, 0 unresolved | Current complete-reference audit |
| Template localization | 320 templates, 0 conservative matches | Current hard-coded-copy audit |
| Blade marker check | 19/19 | Text-marker spotcheck, not visual certification |
| Automated accessibility | Latest recorded 87/87 | Manual AT review remains open |

The generated route matrix was refreshed against the same route inventories
and reports the counts above. It remains declaration evidence, not runtime or
workflow certification.

## Rotating Authentication Session Refresh

Web UK now follows Laravel's current rotating-session contract across login,
two-factor completion, refresh, and logout. A successful session requires the
complete access/refresh pair plus Laravel-declared access and refresh lifetimes;
cookies use those exact lifetimes. Optional-auth and protected pages refresh a
missing or expiring JWT before route handling, preserve mounted tenant authority,
and serialize single-use refreshes behind a SHA-256-derived in-process key.

Temporary backend failures preserve the refresh cookie for a later attempt while
withholding an expired access token from the current request. Authoritative
credential failures clear the complete local pair. Logout submits the refresh
token even after access expiry so Laravel can revoke the token family. Mocked
contract coverage is green within the 48-suite, 1,615-test aggregate. No live login, refresh,
logout, Laravel runtime smoke, database write, or migration was run for this
slice because the ordinary Laravel database is the protected production-derived
snapshot.

## Passkey Reauthentication And Session Revocation

Passkey rename and removal now match Laravel's current high-risk-action
boundary. Both forms require the current password; Web UK exchanges it through
`POST /api/webauthn/security-confirm` and submits the returned short-lived
confirmation token to the requested operation. Missing or rejected passwords,
missing credentials, and the last-sign-in-method guard remain distinct,
localized settings errors. A successful removal must include Laravel's
`sessions_revoked` evidence; Web UK then invalidates its session, clears the
complete cookie pair, and shows the Blade success message on sign-in. Mocked
contract proof covers these paths. No real passkey, session, or database record
was changed.

Laravel also revokes every access, refresh-family, and Sanctum session after a
successful password change or TOTP disable. Web UK now invalidates its local
session and clears the complete cookie pair after either success instead of
carrying visibly authenticated but server-revoked credentials into the next
request. Password failures read Laravel's standard `errors[0].code` envelope,
preserving distinct incorrect, reused, weak, and generic states. These paths are
mock-certified only; no account credential or factor was changed.

## Direct Marketplace Checkout Refresh

Current Laravel commit `fed93dfd1` hardened direct marketplace purchasing. Web
UK now follows that Blade/API contract: the GET loads seller shipping options
and available pickup slots, filters paid shipping for free or time-credit-only
orders, and issues a session-bound idempotency key. The POST rejects forged or
stale keys before any order call, re-reads authoritative checkout data, requires
a cash/time-credit choice for hybrid listings, validates delivery and pickup
choices, and sends the exact order fields. The form now uses the source catalog,
field-linked error summary, old-input replay, delivery prices, localized pickup
times and remaining capacity, and suppresses confirmation when a shipping-only
listing has no option. Focused mocked contract proof covers the successful and
failure paths; no live order or database mutation was run.

The accepted-offer POST now applies the same trust boundary: it derives the
listing from the authenticated accepted-offer collection, ignores a forged
submitted listing ID, and revalidates offer-scoped shipping and pickup choices
before creating an order.

Marketplace prices now also mirror Laravel's dedicated money formatter: labels
use uppercase stored currency codes, comma grouping, and the same Stripe
zero-decimal currency list. Focused proof covers `JPY 1,200` without a false
`.00` suffix alongside the existing GBP and hybrid cases.

## Podcast Browse And Studio Capability Refresh

Current Laravel podcast browse metadata now drives Web UK category choices and
numeric pagination. Search, sort, validated category, and page filters survive
every tenant-safe page link; an unknown category is removed and the browse is
reissued without the invalid filter, matching Blade's tenant category
allow-list. Browse and detail artwork now carry Blade's
`referrerpolicy="no-referrer"`, and card descriptions use the same bounded
plain-text presentation.

The browse Studio link and Studio create button are no longer unconditional.
Web UK consumes `/api/v2/podcasts/mine` capability metadata, preserves access
for an existing author, and rejects a direct create-form request when the
backend says another show cannot be created. Focused default-English proof
covers permitted and denied states, invalid categories, preserved pagination,
and artwork hardening. The full non-mutating gate passes 47/47 suites and
1,604/1,604 tests; brand, lint, CSS, locale shape, static-key resolution,
template localization, route matrix, and `git diff --check` are green. No local
Laravel smoke or live mutation ran against the production-derived database.

## Podcast Show Metadata And Artwork Refresh

Podcast create and manage now mirror Blade's show fields: create-only slug,
artwork, language, author, owner email, copyright, funding URL, explicit-content
flag, and configuration-aware visibility choices. New-show defaults use the
signed-in profile and request locale where Laravel's API exposes them. Show
metadata continues through JSON `POST`/`PUT`; artwork uses Laravel's dedicated
multipart `POST /api/v2/podcasts/{id}/artwork` contract with field `image`.

Web UK now parses only the two show multipart paths before CSRF validation and
caps artwork at Laravel ImageUploader's 8 MB limit. Temporary files are removed
on every outcome. If create metadata succeeds but artwork is rejected, the user
is sent to the created show's manage page with a save-failure state rather than
being told the show does not exist. Mocked proof covers create, update, upload,
and rejected-artwork recovery without calling a live mutation endpoint. The
full gate is 47/47 suites and 1,604/1,604 tests; 6,868 static references resolve
to 5,241 unique keys with zero unresolved keys, and all 316 templates have zero
conservative localization matches.

## Podcast Episode Metadata And Cover Refresh

Podcast episode create and edit now mirror Blade's full default-English field
set: create-only slug, summary and description, episode/season/duration values,
hosted audio or external audio URL, MIME and byte metadata, type, visibility,
explicit flag, schedule, configuration-gated transcript and chapters, and
optional cover artwork. Episode edit posts to Blade's existing show-update
action with hidden `episode_id`; Web UK dispatches that form to Laravel's JSON
or method-spoofed multipart episode update contract rather than inventing an
extra accessible route. Covers use the dedicated
`POST /api/v2/podcasts/{showId}/episodes/{episodeId}/cover` endpoint with field
`image`.

Audio parsing follows Laravel's current 250 MB default ceiling while still
enforcing the tenant-advertised lower limit; covers retain the 8 MB image cap,
and temporary files are removed on every outcome. If create succeeds and the
separate cover call fails, the manage-page recovery state says saving failed
instead of falsely saying the episode was not created. Mocked proof covers
JSON and multipart create/update, metadata, cover upload, and rejected-cover
recovery. No live Laravel mutation ran. The full gate is 47/47 suites and
1,605/1,605 tests; 6,889 static references resolve to 5,253 unique keys with
zero unresolved keys, all 317 templates have zero conservative localization
matches, and the route matrix remains 683/689 matched with five documented
extras.

Podcast subscription toggles now omit `notify_new_episodes` exactly as Blade
does. Laravel therefore applies its authoritative default of enabling new-
episode notifications when a subscription is created, instead of Web UK
silently storing `false`. Mocked action proof covers subscribe, unsubscribe,
failure, and the exact payload boundary; no live subscription was changed.

## Event Detail Attendee Roster Refresh

Event detail now consumes Laravel's canonical attendee projection in Blade's
single flat reading-order list. It renders the member display name or localized
unknown-member fallback, trusted backend-relative avatar or initial placeholder,
and the same going/interested/not-going status mapping and tag colours as Blade;
the previous grouped headings and invented member-profile links are removed.

The request now uses Blade's 50-row `status=all` contract, forwards the opaque
`attendees_cursor`, preserves other query parameters on the `rel="next"` link,
and distinguishes a failed roster load from a genuinely empty roster. The
failure summary matches Blade's content while retaining Web UK's established
focusable-error-summary convention. Mocked proof covers canonical rows, cursor
encoding, query preservation, empty and failed reads, and asset resolution.
The full non-mutating gate passes 47/47 suites and 1,607/1,607 tests; lint,
branding, 6,891 static references / 5,254 unique keys / zero unresolved keys,
the 317-template zero-match audit, diff check, and the unchanged 683/689 route
matrix are green. No Laravel runtime or database mutation was run.

## Event Registration Questionnaire Refresh

The attendee questionnaire now selects only Laravel's first invited, confirmed,
or pending registration, renders the published form description, and matches
Blade's short text, long text, single-choice, multiple-choice, consent, and
waiver controls. Native required state remains disabled for conditional
questions; configured length and selection constraints are bounded by Blade's
500/10,000-character hard limits. Invalid no-JavaScript submissions preserve
answers, render field-linked summary and inline errors, and stop before either
registration-product mutation call. Issued and accepted invitations now use
Blade's summary cards, localized type/status, issued-only Accept action, and
empty state instead of a bare action form. Guest capture now matches Blade's
name, email, telephone, ticket-entitlement, privacy, and notification fields;
guest summaries localize status and expose the labelled, confirmed cancellation
form only for captured guests. Focused Event Registration proof passes 8/8; the
organizer policy and form lists now also show Blade's description, status,
revision, event-timezone-local inputs, required controls, and form versions.
Double-brace Laravel catalogue placeholders interpolate without visible braces.
Organizer submission, campaign, and guest collections now expose Blade's
previous/next navigation while preserving sibling collection parameters and
returning to the matching section anchor.
Submission review/export, campaign, attendance, and retention controls now use
Blade's GOV.UK form groups, module hooks, explicit submit semantics, and checkbox
modules; incomplete policy status fails closed to localized copy.
The form editor now exposes Blade's governed classification, help, required,
validation, consent/waiver version, conditional visibility, guidance, and cancel
controls instead of hiding fields already supported by the Laravel contract.
Invalid or handled-conflict editor submissions now replay all authoring values
with Blade's localized error summary; incomplete input stops before mutation.
The full non-mutating gate passes 48/48 suites and 1,631/1,631 tests with green lint,
brand, CSS, route, and localization gates. No Laravel runtime or database
mutation was run.

## Localization P0 Closed In Current Slice

The previously identified raw-key risk is fixed and guarded. The generator now
imports every Laravel `event_*.php` catalog plus `safeguarding.php` alongside `govuk_alpha*.php`, and
the runtime resolves namespaces from the generated catalog rather than a fixed
allowlist.

Event analytics, communications, calendar, recurrence, registration, and
template references now use the current Laravel Blade keys. The complete-static
key gate scans Web UK source and fails when a literal `t()` or `tc()` reference
does not resolve in the English generated catalog.

A fresh proof run records:

- 11 locales, 36 namespaces, and 8,837 keys per locale;
- zero missing or extra keys in every locale;
- 6,854 complete static references and 5,230 unique referenced keys;
- zero unresolved complete static references;
- 315 templates and zero conservative hard-coded-copy matches;
- an English and Irish Event-template library render with no raw key leakage;
- focused Event and Jobs-response localization/operation proof and full
  47/47-suite, 1,603/1,603-test proof;
- green brand, lint, CSS, and `git diff --check` gates.

The live Blade marker comparator also uses the canonical
`/{tenantSlug}/accessible` Laravel mount and passed 19/19. `/alpha` remains a
legacy redirect-compatibility route and must not be used as the comparison
source.

The existing `locales:audit-templates` command looks for conservative
hard-coded English matches; it does not prove that referenced keys resolve.
The new `locales:audit-keys` command supplies that separate proof. Dynamic keys
still require focused route rendering because no static scanner can prove
runtime values.

Do not claim complete localization parity merely from this gate: backend-authored
copy, dynamic-key families, English-identical source values, contextual quality,
and manual language review remain separate evidence boundaries.

## Six Missing Route Contracts

Five missing routes are the Event moderation queue and approve/reject
confirmation/actions:

- `GET /events/moderation`
- `GET /events/moderation/{id}/approve`
- `GET /events/moderation/{id}/reject`
- `POST /events/moderation/{id}/approve`
- `POST /events/moderation/{id}/reject`

Laravel exposes related `/api/v2/admin/events` list/detail/approve/reject APIs,
but they are not yet contract-identical to Blade. The API list uses Event
publication state and Event creation order; Blade uses pending moderation-queue
rows and queue-submission order. API approval uses a general approval workflow;
Blade requires an atomic pending moderation decision. Do not mark these five
routes certified until Laravel exposes equivalent queue membership, ordering,
and race-safe decision semantics.

The sixth missing route is:

- `POST /events/{id}/check-in/code`

Blade's online signed-code flow resolves the attendee and current attendance
version server-side. The existing offline-scan API instead requires a device
secret, expected attendance version, and idempotency key. Exact parity needs a
safe Laravel online-scan contract or an intentional source-contract change.

Record these as upstream API-boundary gaps. Do not hide them with synthetic
success, unsafe orchestration, or a generic preparation page.

## Remaining Certification Work

After the localization P0, the remaining priority order is:

1. The repaired ordinary local Laravel database is a contract-current but
   confidential production snapshot, not a destructive test fixture. Provision
   a dedicated disposable clone before rerunning the Event mutation gate or
   exhaustive Laravel mutation smoke; never run those gates against the
   production-derived local database. "All quarters classified" is not the same
   as all checks passing.
2. Continue reconciling recent Event flows and unresolved component-audit rows.
   The July 14 Messages, Group create/detail, onboarding, and Feed/Groups/Wallet
   pagination slices are published and should not be repeated without a new
   concrete source mismatch.
3. Compare significant states per route: guest, member, owner, tenant admin,
   feature-disabled, empty, populated, validation failure, authorization
   failure, pagination, mutation, upload, and download.
4. Add representative screenshot/layout comparison. `visual:blade` is a
   normalized marker check only.
5. Complete manual keyboard, screen-reader, focus-order, error-summary, no-JS,
   zoom/reflow, forced-colour, and disabled-user evidence.
6. Add a generated frontend-consumer API ledger covering method/path, tenant
   authority, role, request shape, response/status/error envelope, redirects,
   side effects, cleanup, Laravel implementation, frontend consumer, and tests.
7. Harden production concerns separately: persistent sessions, production-only
   secrets/configuration, and request timeouts/abort handling.

ASP.NET proof is a separate later gate, not remaining frontend implementation
work. First certify the frontend against Laravel. When the separate backend
parity workstream declares ASP.NET ready, change only backend configuration and
run the same evidence suite; do not introduce an ASP.NET-specific frontend
adapter.

## Current Verification Gate

From the repository root:

```powershell
npm --prefix apps/web-uk run brand:check
npm --prefix apps/web-uk run lint
npm --prefix apps/web-uk test -- --runInBand
npm --prefix apps/web-uk run build:css
npm --prefix apps/web-uk run route:matrix
npm --prefix apps/web-uk run locales:sync
npm --prefix apps/web-uk run locales:audit
npm --prefix apps/web-uk run locales:audit-keys
npm --prefix apps/web-uk run locales:audit-templates -- --summary
npm --prefix apps/web-uk run test:accessibility
npm --prefix apps/web-uk run visual:blade
npm --prefix apps/web-uk run smoke:laravel:local
git diff --check -- apps/web-uk
```

Record the exact Laravel and Web UK SHAs, fixture identity, commands, pass/fail
counts, retained failures, and cleanup result. Route equality, a focused test,
or a stale listener is not certification.
