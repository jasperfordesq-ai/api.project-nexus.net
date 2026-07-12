# Full Laravel Parity Remediation Runbook

Last reviewed: 2026-07-12

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

## 2026-07-12 ASP.NET Safeguarding And Messaging Checkpoint

Laravel at `C:\platforms\htdocs\staging` and the canonical React frontend remain
the read-only contract sources. This backend-only slice did not authorize or
require frontend changes; preserve unrelated `apps/web-uk` edits.

The new safeguarding domain stores metadata only. Migration 112 creates the
five exact Laravel tables `tenant_safeguarding_settings`,
`member_vetting_attestations`, `member_vetting_attestation_events`,
`safeguarding_vetting_review_requests`, and
`safeguarding_policy_rotation_events`. Legacy vetting rows never authorize the
new contact policy, event/rotation history is append-only, and controllers
reject certificate files, reference numbers, arbitrary statuses, free text,
expiry dates, and other sensitive evidence.

Focused onboarding, member, administrator/broker vetting, policy rotation, and
safeguarding-option owners replace the generic recorded responses. Option
mutations use trigger/type allowlists, locks, live-selection weakening guards,
member re-evaluation, and audit. The exact risk buckets are onboarding save
5/minute, option mutation and vetting decision 60/minute, policy update
20/minute, policy rotation 5/minute, member mutation 10/minute, and message
restriction status 30/minute. Vetting throttles use Laravel `errors[]` and
retry/version/tenant headers.

Migration 113 adds `messaging_disabled` to
`user_monitoring_restrictions`, a documented workflow adapter for Laravel's
`user_messaging_restrictions`. Live status/admin monitoring now expire stale
state, validate reason and tenant/user boundaries, persist the flag/expiry,
audit/notify, and clear safeguarding-created approval on removal. Migration 114
widens preference values, requires consent time, installs one unique
tenant/user/option selection, and cascades tenant/option dependencies.

The recorded chain is now 115 migrations through
`20260712060051_DirectMessageStateParity`. A blank PostgreSQL replay applied all
115. A populated 114-to-115 upgrade preserved existing message content/read
timestamps and initialized new state to false/null; the nullable deletion-audit
user relationship uses `ON DELETE SET NULL`. The migration is forward-only. A
retained valid populated 113-to-114 upgrade preserved safeguarding rows and
filled null consent times from `CreatedAt`; a duplicate tenant/user/option
fixture raised `P0001` before DDL/data mutation, left history at 113, and left
no partial migration-114 schema. Exact catalog containment and
`has-pending-model-changes` are green. No production resource was touched.

Direct text send/thread now has detected attachment content, partial/staged
cleanup, sanitization and Unicode length, first-conversation serialization,
same-tenant inactive-recipient compatibility, corrected partner/attachment
projection, and awaited notification/XP/realtime effects. Blocked POST attempts
alert safeguarding staff once; reads do not. Voice send now uses a dedicated
detected-audio policy, preflight plus locked policy recheck, one transaction for
all graph rows, independent rollback/file cleanup, minimum-one-second duration,
and normal message effects. Spoofed audio and restricted sends leave no ghost
state. Provider transcription remains open.

The direct-message P0 state slice is implemented: sender-only edit accepts
React's `body`, enforces 24 hours, sanitizes, rechecks live policy, and persists
edited metadata; participant-safe delete records durable `self|everyone`
visibility instead of hard deletion; and partner-ID conversation archive/
restore persists per-user state, separates active/archived inbox reads, filters
hidden unread rows, and restores without deleting history.

Coordinator assistance now replaces the former synthetic success stub with a
server-authoritative policy recheck. It returns Laravel-style HTTP 422 errors
for self/nonpositive, missing/cross-tenant, unrestricted, and unavailable
requests; only genuine vetting/contact restrictions alert active tenant staff.
In-app plus email delivery is transactionally serialized and suppressed for
ten minutes after success, while failed or no-staff delivery remains retryable.
Every accepted request is audited and uses an independent authenticated
5-per-300-second bucket. Focused PostgreSQL coverage passed 16/16 and route
ownership passed 1/1.

Group exchange create/add/start/confirm/complete/cancel now follows Laravel's
caller and role order, dual-role/participant semantics, caller-visible status,
lifecycle guards, deterministic locking with caller-order policy evaluation,
canonical provider transaction rows, hidden ledger adapters, exact failure
contracts, conservation, idempotency, and first-writer behavior. Notification
depth and frontend runtime smoke remain open.

This checkpoint does not close direct messaging. Execute the remaining audited
residual in this order:

1. **P1 reactions completed 2026-07-12:** exact six-emoji allowlist, durable
   unique reactions, policy on add but withdrawal after closure, serialized
   toggles, participant-scoped batch aggregation, and independent rate buckets
   passed focused PostgreSQL and route-owner coverage 9/9. Migration 116 blank
   replay and model-drift checks are green.
2. **P1 typing completed 2026-07-12:** full message preflight, first-contact
   behavior without persistence, exact private tenant-user Pusher channel and
   `typing` payload, signed REST transport, best-effort delivery, exact response,
   and independent 60/minute bucket pass endpoint/route 7/7 plus transport 1/1.
3. **P1 read/unread completed 2026-07-12:** partner-ID mark-read and unread
   counts now use exact minimal envelopes, explicit tenant-scoped conversation
   resolution, Laravel receiver-visibility rules, no extra V2 read-receipt
   event, and independent authenticated 60/minute buckets. Route/policy
   ownership passed 1/1; focused disposable-PostgreSQL runtime passed 3/3; the
   combined direct-message regression passed 44/44.

Replace route-only and false-oracle tests for those handlers with two-user,
reload, tenant, policy, and side-effect assertions. The final deterministic
direct-message state gate passed 39/39 with zero failed or skipped, covering
migration/model contracts, edit/delete, archive/restore, concurrency, rate
limits, unread metadata, sanitizer oracles, and corrected route ownership. The broader exact regression
completed 57/58; its sole existing first-writer race subsequently passed in
isolation. A separate class aggregate completed 12/13 and was interrupted only
by disposable PostgreSQL OOM `exit 137`; the race was green in isolation.
Neither aggregate is fully green. Do not report full-suite, CI, unchanged-
frontend runtime, or backend 1000/1000 green from this checkpoint.

## 2026-07-12 ASP.NET Volunteer Hours Ledger Checkpoint (Preceding)

The current backend slice replaces the former unavailable/recorded-only
volunteer-hours paths with one canonical `VolunteerHoursService` workflow across
eight Laravel routes: member list/create/summary/pending-review/verify,
organisation pending review, administrator list, and administrator verify.
Member and administrator decisions use locked, tenant-scoped `vol_logs` rows,
strict Laravel action validation, canonical request/error envelopes, separate
rate buckets, and Laravel-aligned organisation, opportunity, reviewer, and
feature-policy authorization.

An approved whole-hour log mints the personal time-credit transaction, records
the matching volunteer-organisation payment (including a permitted negative
organisation balance), and awards the configured XP exactly once. Sub-hour
approval still awards XP but returns the canonical no-whole-hours result without
creating either credit ledger row. Existing payout and XP evidence is validated
semantically before reuse; contradictory or incomplete evidence aborts and
rolls back instead of duplicating or guessing a settlement. Caring support
relationship hour logging and decisions now converge on the same canonical
ledger, including the configured flag administrators and trusted-review policy.
Direct Caring logging accepts sub-hour values and uses the raw request hours for
the whole-hour floor and regional-points calculation before storing the rounded
two-decimal hours value. Normal non-Caring reviewed decisions run post-commit
decision bell/push side effects. Approved decisions force immediate email;
declined decisions send immediate email only when the global notification
frequency is explicitly `instant`. Tenant-default frequency fallback,
daily/monthly notification-queue delivery, and recipient locale/provider
breadth remain open. Provider failure does not roll back the canonical
decision. The post-approval badge sweep covers every badge family represented
in ASP.NET; Laravel-only badge families and realtime badge broadcast remain
open. Reviewed Caring decisions deliberately emit no decision bell, push, or
email.

The tenant-scoped `FeedActivity` entity/configuration/service now provides
Laravel's canonical idempotent feed projection. Approved-hour publication uses
`source_type=volunteer_hours`, respects `show_on_leaderboard`, and excludes the
organisation-facing free-text description. Other feed producers, admin
moderation consumers, compatibility cleanup, and historical backfill remain on
the feed backlog.

`20260711192124_VolunteerHoursLedgerParity` is migration 111. It hardens
`vol_logs` status/hours/provenance, installs
tenant-composite relationships and active natural-key uniqueness, links personal
transactions to `VolunteerLogId`, and enforces unique organisation-payment and
volunteer-hour XP evidence. Its source also defines `feed_activity` and the
user's nullable public-hours preference used by privacy-aware publication. It
never inserts legacy transaction, payment, or XP value: uniquely provable
existing evidence may be linked, evidence-free approved
whole-hour organisation rows are downgraded to `pending`, and approved Caring
sub-hour rows remain valid without fabricated evidence. At that checkpoint,
non-production certification applied all 111 migrations to a blank PostgreSQL
database and directly verified the
exact 13-column/eight-index `feed_activity` schema, nullable-boolean
`users.show_on_leaderboard` defaulting to `true`, all 11 column-specific
`ON DELETE SET NULL` relationships, and the volunteer-user `CASCADE`
relationship. A valid populated 110-to-111 upgrade preserved and linked existing
evidence without minting. A deliberately invalid fixture raised PostgreSQL
`P0001` atomically, left history at 110, and left no partial migration-111 DDL.
`has-pending-model-changes` is green; disposable Docker cleanup left zero
matching resources. No production database or container was touched.

The Debug API/test builds and required solution-wide Release build complete with
zero errors; the only warnings are the same four pre-existing `xUnit1031`
warnings in the test project. The Release build took 4m36s. One disposable Linux run
discovered 3,007 tests and passed 53/53: all 51
`VolunteerHoursParityTests` plus both `V15FeedActivityCompatibilityTests`.
Windows Smart App Control blocks the freshly rebuilt unsigned API assembly, so
the run used Linux without weakening host policy. The clean affected rerun then
discovered 3,007 tests, selected 243, and passed 243/243 with zero failed and zero
skipped in 418.639s. Do not report the full 3,007-test suite, CI, unchanged-
frontend runtime, or backend 1000/1000 as green from this checkpoint.

## 2026-07-11 ASP.NET Volunteer QR Attendance Checkpoint (Preceding)

The preceding backend slice implements Laravel's four QR-attendance routes:
personal token issue at
`GET /api/v2/volunteering/shifts/{id}/checkin`, coordinator verification at
`POST /api/v2/volunteering/checkin/verify/{token}`, coordinator checkout at
`POST /api/v2/volunteering/checkin/checkout/{token}`, and sanitized shift
history at `GET /api/v2/volunteering/shifts/{id}/checkins`.

Issuance requires the authenticated volunteer's exact approved shift
assignment and creates/reuses one globally unique 64-lowercase-hex token.
Verification/checkout/roster access requires an active tenant/platform administrator,
the volunteer-organisation owner, or an active organisation `owner`, `admin`,
`manager`, or `coordinator`. Laravel timing boundaries, late checkout for an
already checked-in volunteer, idempotent verification, sanitized history, and
canonical 404 masking for malformed/unknown/cross-tenant token lookups are
covered. An authenticated same-tenant caller without coordinator permission
receives 403 `FORBIDDEN`. Checkout intentionally uses a safer conditional
single-winner transition under concurrency.

QR attendance itself never creates volunteer logs/hours, personal or
organisation transactions, balance movement, XP, or rewards. The separate
canonical volunteer-hours workflow described above now owns logging,
verification, settlement, and XP. An outgoing `shift.completed` webhook and
child-to-parent tenant-domain inheritance remain open.

The same checkpoint repairs the V2 member/admin shift-swap lifecycle. Member
list/request/respond/cancel and administrator pending/decision routes now bind
Laravel/React snake-case fields and `{action}` payloads, return canonical
envelopes, enforce the volunteering gate and Laravel rate buckets, and derive
administrator approval from tenant configuration. Direct and admin-approved
decisions lock both shifts and exact approved applications, atomically exchange
only `VolunteerApplication.ShiftId`, and leave QR rows/tokens attached to their
original shifts as historical evidence. Stale, started, or overlapping
assignments leave the request and applications unchanged; identical concurrent
requests serialize to one pending row; only pending/admin-pending requests can
be cancelled. Notification/localization side effects and global per-user
assignment serialization across distinct concurrent swaps or other approval
writers, unchanged-frontend runtime swap smoke, and Laravel's longer-than-1,000
character text-message storage remain open; ASP.NET rejects the latter with an
explicit HTTP 400 rather than a database 500.

Evidence at the preceding 110-migration checkpoint:

- then-latest migration at that checkpoint:
  `20260711143546_VolunteerQrAttendanceParity`;
- at that checkpoint, EF discovered/applied 110 IDs and reported no model drift;
- test-project build: 0 errors and 4 pre-existing `xUnit1031` warnings;
- migration-discovery regression: green;
- QR attendance suite: 32/32;
- attendance persistence-failure 500 regression: 1/1;
- shift-swap assignment/member/admin/concurrency suite: 12/12;
- route/auth subset: 5/5;
- affected legacy-hours/caring/demo/route-alias/volunteering gate: 90/90;
- ambient-transaction regression: green;
- blank and populated databases upgraded from the preceding 109-ID state to
  110, preserving historical hours/transaction evidence and leaving historical
  tokens/coordinator IDs null;
- duplicate-attendance and cross-tenant preflight fixtures both failed
  atomically at 109 before DDL; and
- the uniquely named disposable PostgreSQL container was removed.

Do not claim CI green. Descendant CI run `29154079189` was later cancelled after
its completed Integration Tests job reported 51 failures out of 2,888 tests.
The only direct regression from the preceding `bfeafb2e`
backend slice was nested transaction handling; it is fixed and green locally.
The remaining failures still need independent triage.

## 2026-07-11 ASP.NET Financial Safety And Evidence Checkpoint (Preceding)

That preceding backend slice hardens personal, volunteer-organisation, and generic
organisation wallets; completes the group-exchange settlement state machine;
replaces V15 wallet false-success reads with persisted values; adds Caring
loyalty/estate transaction evidence; and makes unsafe incomplete financial
paths fail closed. Neither frontend nor the read-only Laravel source was
modified.

Generic organisation public/private visibility, membership authorization, and
wallet writes now use canonical owner/status/tenant rules. Verified-only
donate/transfer/admin-grant paths share lifecycle/advisory locks. Deletion takes
the same lifecycle lock and refuses any organisation whose wallet has a
balance, counters, or transaction history; a concurrency regression proves an
in-flight wallet write wins and its evidence remains. Tenant-composite keys and
role checks backstop the application policy. User search is active same-tenant,
name-only, excludes self/suspended users and email, and is limited to 30/minute.

Group exchange has server-owned draft/start/confirm/complete/cancel transitions,
positive immutable splits, distinct provider/receiver roles, all-party
confirmation, shared wallet locks, and real `group_exchange` ledger rows. V15
community-fund summary/history, pending count, and starting balance use
persisted tenant data; starting-balance configuration is admin-only. Unsafe
donation/deposit/withdraw aliases are HTTP 503 with no write.

Federation external reads now enforce owner opt-in, active state, tenant match,
visibility, and blocked-partner boundaries. Caller-supplied message/review
identity, partner webhook list/create, V2 ingest, cancellation after pristine
`Pending`, and unsupported financial settlement return stable HTTP 503 without
mutation. These are safety contracts pending real authenticated workflows.

Caring loyalty debit/refund and positive hour-estate settlement rows now carry
authoritative tenant-composite transaction IDs. Concurrent loyalty reversal has
one winner. A legacy applied redemption without a valid debit link fails manual
reconciliation rather than minting a refund; legacy null links are retained for
operator review. Repeat estate report/settle and post-settlement nomination are
rejected.

Current evidence:

- test-project build: 0 errors and 4 pre-existing `xUnit1031` warnings;
- high-risk regression: initial command 103/106; two corrected assertions and
  the isolated fixture-startup retry then passed 3/3;
- fail-closed contract suite: 119/119 with explicit unavailable/no-write/no-
  balance-mutation assertions;
- post-audit organisation/federation regressions: 24/24;
- final migration-discovery, partner-consent, cancellation, route-owner, and
  rounded-zero regressions: 30/30;
- latest migration:
  `20260711100817_LoyaltyEstateOrganisationEvidence`;
- EF model drift: none; EF discovers 109 migrations after restoring
  `AddAiMessageTenantId` metadata;
- blank disposable PostgreSQL: all 109 IDs applied from
  `20260202085043_InitialCreate` through the latest migration; history contains
  109 rows and the non-null `ai_messages.TenantId` column, tenant index, and
  foreign key were inspected directly;
- discovery repair now includes the essential designer-less
  `20260303120000_AddAiMessageTenantId`; obsolete
  `20260305120000_AddTenantUpdatedAt` remains intentionally excluded because
  `InitialCreate` already creates `tenants.UpdatedAt`;
- populated database at the preceding migration: valid upgrade green with
  legacy rows retained and known organisation-role casing normalized;
- deliberately invalid cross-tenant organisation-wallet transaction: latest
  preflight aborted and left the preceding migration history/schema intact;
- API comparator fixture green; at that checkpoint the live result was
  2,436/2,449 matched. Its exact 13 missing operations were
  `GET /api/admin/vetting/policy`,
  `PUT /api/admin/vetting/policy`, `POST /api/admin/vetting/policy/rotate`,
  `POST /api/admin/vetting/reviews/{reviewid}/resolve`,
  `POST /api/admin/vetting/user/{userid}/confirm`,
  `POST /api/admin/vetting/user/{userid}/revoke`, `GET /api/pwa/manifest`,
  `POST /api/admin/prerender/reset-all`, `POST /api/prerender/invalidate`,
  `GET /api/safeguarding/my-vetting-status`,
  `POST /api/safeguarding/confirm-policy-review`,
  `POST /api/safeguarding/vetting-review-request`, and
  `POST /api/volunteering/guardian-consents/verify/{token}`; this remains route-
  shape evidence only;
- schema comparator fixture green; the live result is 333 Laravel migration
  files, 113 ASP.NET migration source files, 368 Laravel source tables, 331
  ASP.NET tables, 137 exact matches, 231 missing, and 194 ASP.NET-only;
- all disposable databases/container were removed; no production database or
  container was touched.

The copy-ready `BEGIN TRANSACTION READ ONLY` report in
`docs/database-migrations.md` inventories ambiguous legacy self-transfers,
admin grants, starting-balance configuration/grants, loyalty, estate, Caring
hour transfer, and federated-hour-transfer candidates. It reports balance
effects but never fixes or links rows. Every candidate needs a documented manual
disposition before a reviewed forward remediation.

These focused slices were not converted into a new global score. The previous
`690/1000` implementation and `500/1000` certification estimates are historical
baselines, not current values. The backend 1000/1000 gate remains red: legacy
one-to-one exchange, sub-account pooling, community-fund writes, federation
settlement, provider/localization depth, the full 3,007-test suite, CI, and
unchanged-frontend runtime proof are not complete.

## 2026-07-10 Current Web UK Checkpoint

This checkpoint supersedes the Web UK scores and test counts in the audit
baseline below. It does not change the ASP.NET workstream scores.

| Surface | Score | Meaning |
| --- | ---: | --- |
| Web UK Laravel-first implementation | 900/1000 | An independent pre-publication audit scored 896; publishing the clean, documented `apps/web-uk` slice supplies the remaining repository-hygiene points, but substantive component, workflow, localization, and manual-accessibility gaps remain. |
| Web UK Laravel-first certification | 765/1000 | An independent pre-publication audit scored 760; publication improves reproducibility, while live mutation/upload/destructive evidence and manual certification remain materially incomplete. |
| Web UK ASP.NET switchability proof | 80/1000 | Unchanged and outside this Laravel-first session. |

Current evidence at commit `702ece83`:

- `45/45` Jest suites and `1,386/1,386` tests passed; lint, brand policy, CSS
  compilation, and scoped diff checks passed.
- The route matrix reports `608/608` Laravel routes matched, `0` missing, `0`
  extra parity routes, and `3` ignored infrastructure routes. This remains
  declaration evidence, not workflow certification.
- Locale structure is complete across `11` locales, `24` namespaces, and
  `7,337` keys, but every non-English catalog still has `3,903-3,951`
  English-identical values and `16` wholly English namespaces.
- The conservative source audit reports `290` templates and `0` remaining safe
  exact-value substitutions; current browser inspection still found English
  contextual copy on the Arabic dashboard.
- Chromium/axe passed `22/22`; the live Blade marker comparator passed `19/19`.
  Limited 320-pixel RTL/reflow/forced-colour inspection is recorded, but native
  keyboard traversal, screen-reader, and full manual WCAG evidence remain open.
- Deterministic serial Laravel smoke covered all `639` distinct current default
  read/auth/gate/body checks: base `93/93`, all `276` module pages, and all
  `270` body markers. Two 60-second request aborts passed isolated `11/11`
  retries. This does not prove mutation, upload, download, or destructive side
  effects.
- Component reconciliation still records `111` Partial and `19` Started rows,
  `130` open in total and `0` Complete. Some rows also mention future ASP.NET
  switching, so use their explicit Laravel gaps rather than status alone.

The Laravel-first 1000/1000 gate is therefore not met, and meaningful local
work remains. The permitted external-blocker-only stop condition is not met.

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
| ASP.NET static API method/path inventory | 944/1000 | 2,438 of 2,583 current Laravel operations matched, with 145 route-shape gaps after the expanded supplemental inventory; this is route-shape coverage, not behavioral parity |
| ASP.NET implementation parity | 640/1000 | Broad implementation with material workflow, schema, integration, and localization gaps |
| ASP.NET certification confidence | 420/1000 | Current full-suite and frontend-on-ASP proof is insufficient |
| Web UK Laravel-first implementation | 910/1000 | Route conversion is advanced; several source and presentation gaps remain |
| Web UK Laravel-first certification | 755/1000 | Current Jest, accessibility, localization, and exhaustive live proof are incomplete |
| Web UK ASP.NET switchability proof | 80/1000 | Resolver/configuration exists; no route family is end-to-end certified against current ASP.NET |

### Fresh evidence

| Check | Current result or retained historical evidence |
| --- | --- |
| ASP.NET static operations | 4,316 |
| Laravel source operations | 2,583 |
| Static method/path matches | 2,438 matched, 145 missing |
| Explicit admin compatibility behavior | At least 196 of 329 `AdminExplicitParityController` route declarations reached generic fallbacks at audit time |
| Schema inventory | Live: 333 Laravel migration files, 117 ASP.NET migration source files, 115 runtime migrations, 368 Laravel source tables, 336 ASP.NET tables, 142 exact matches, 226 missing names, and 194 ASP.NET-only names |
| ASP.NET backend localization comparator | 7/11 locales, 49/605 namespaces, 157 comparable English keys matched, 5,018 missing |
| Web UK authoritative locale catalogs | 11/11 locales, 24 namespaces, and 7,337 string keys per locale with zero missing or extra keys relative to English |
| Web UK translation depth | Each non-English Laravel catalog still has 3,903-3,951 English-identical values (53.2%-53.9%); 16 namespaces are wholly English-identical in the read-only source |
| Web UK conservative template localization | 1,595 safe static substitutions across 257 templates; the post-write audit reports 290 templates and zero remaining conservative matches, which is not a contextual-copy completion claim |
| ASP.NET API/test builds | Debug API/test and required solution-wide Release builds passed with zero errors; the only warnings are the same four pre-existing `xUnit1031` warnings, and Release took 4m36s. |
| Transactional volunteering regression | Prior core 61/61; guardian lifecycle 7/7; recurring-pattern CRUD 13/13 plus route ownership 1/1; recurring-shift generation/scheduler 13/13; volunteer-organisation relationship/lifecycle 13/13; wallet integration 6/6; QR attendance 32/32 plus persistence-failure 1/1; shift-swap assignment/member/admin/concurrency 12/12; affected-module gate 90/90; route/auth 5/5; ambient-transaction regression green. Current focused proof is one 53/53 disposable-Linux run: all 51 `VolunteerHoursParityTests` plus both `V15FeedActivityCompatibilityTests`, with 3,007 tests discovered. The clean affected rerun selected and passed 243/243 with zero failed/skipped in 418.639s. The full 3,007-test suite remains open. |
| Migration runtime chain | Recorded inventory is 116 EF-discovered/applicable migrations through `20260712104503_DurableMessageReactions`. Blank 116 is green with exact snake_case reaction columns/indexes/unique key and no model drift; blank/populated migration-115 state proof and retained migration-114 atomic-abort/catalog evidence remain. No production resource was touched. |
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
- Transactional volunteering anchors are
  `src\Nexus.Api\Services\VolunteerService.cs`,
  `src\Nexus.Api\Services\AdminVolunteerApprovalService.cs`,
  `src\Nexus.Api\Services\ShiftManagementService.cs`, and
  `src\Nexus.Api\Controllers\VolunteeringParityController.cs`. Guardian
  lifecycle anchors are `src\Nexus.Api\Services\VolunteerGuardianConsentService.cs`,
  `src\Nexus.Api\Controllers\VolunteerAdminController.cs`,
  `src\Nexus.Api\Services\Scheduled\VolunteerGuardianConsentExpiryJob.cs`,
  `src\Nexus.Api\Migrations\20260710192521_GuardianConsentLifecycle.cs`,
  `tests\Nexus.Api.Tests\GuardianConsentLifecycleTests.cs`, and
  `tests\Nexus.Api.Tests\GuardianConsentRouteOwnershipTests.cs`. Recurring
  generation anchors are `src\Nexus.Api\Services\ShiftManagementService.cs`,
  `src\Nexus.Api\Services\Scheduled\VolunteerRecurringShiftGenerationJob.cs`,
  `src\Nexus.Api\Migrations\20260710211122_RecurringShiftGenerationParity.cs`,
  and `tests\Nexus.Api.Tests\RecurringShiftGenerationTests.cs`. Recurring CRUD
  anchors are `src\Nexus.Api\Controllers\ShiftManagementController.cs`,
  `src\Nexus.Api\Migrations\20260710221715_RecurringShiftPatternCrudParity.cs`,
  `tests\Nexus.Api.Tests\RecurringShiftCrudTests.cs`, and
  `tests\Nexus.Api.Tests\RecurringShiftRouteOwnershipTests.cs`.
  Volunteer-organisation anchors are
  `src\Nexus.Api\Entities\VolunteerOrganisation.cs`,
  `src\Nexus.Api\Services\VolunteerOrganisationService.cs`,
  `src\Nexus.Api\Migrations\20260711010201_VolunteerOrganisationRelationshipsParity.cs`,
  and `tests\Nexus.Api.Tests\VolunteerOrganisationRelationshipTests.cs`.
  Wallet anchors are
  `src\Nexus.Api\Services\VolunteerOrganisationWalletService.cs`,
  `src\Nexus.Api\Controllers\VolunteerOrganisationWalletController.cs`,
  `src\Nexus.Api\Controllers\AdminVolunteerOrganisationWalletController.cs`,
  `src\Nexus.Api\Migrations\20260711083852_WalletLedgerFederationPartnerParity.cs`,
  and `tests\Nexus.Api.Tests\VolunteerOrganisationWalletTests.cs`.
  Preceding generic-organisation/group/financial-evidence anchors are
  `src\Nexus.Api\Services\OrganisationLifecycleLock.cs`,
  `src\Nexus.Api\Services\OrgWalletService.cs`,
  `src\Nexus.Api\Services\GroupExchangeService.cs`,
  `src\Nexus.Api\Services\CaringLoyaltyService.cs`,
  `src\Nexus.Api\Services\CaringHourEstateService.cs`,
  `src\Nexus.Api\Migrations\20260711100817_LoyaltyEstateOrganisationEvidence.cs`,
  `tests\Nexus.Api.Tests\GenericOrganisationSecurityTests.cs`,
  `tests\Nexus.Api.Tests\GroupExchangeControllerTests.cs`, and
  `tests\Nexus.Api.Tests\CaringLoyaltyLedgerConcurrencyTests.cs`.
  Current QR-attendance anchors are
  `src\Nexus.Api\Services\VolunteerAttendanceService.cs`,
  `src\Nexus.Api\Controllers\VolunteeringParityController.cs`,
  `src\Nexus.Api\Migrations\20260711143546_VolunteerQrAttendanceParity.cs`, and
  `tests\Nexus.Api.Tests\VolunteerAttendanceParityTests.cs`.
  Current volunteer-hours anchors are
  `src\Nexus.Api\Services\VolunteerHoursService.cs`,
  `src\Nexus.Api\Controllers\VolunteerHoursController.cs`,
  `src\Nexus.Api\Migrations\20260711192124_VolunteerHoursLedgerParity.cs`, and
  `tests\Nexus.Api.Tests\VolunteerHoursParityTests.cs`.
  Current safeguarding/messaging anchors are
  `src\Nexus.Api\Controllers\AdminSafeguardingVettingController.cs`,
  `src\Nexus.Api\Controllers\SafeguardingVettingMemberController.cs`,
  `src\Nexus.Api\Controllers\OnboardingSafeguardingController.cs`,
  `src\Nexus.Api\Services\SafeguardingInteractionPolicy.cs`,
  `src\Nexus.Api\Migrations\20260712020049_SafeguardingVettingAttestationParity.cs`,
  `src\Nexus.Api\Migrations\20260712022243_MessagingDisabledRestrictionParity.cs`,
  `src\Nexus.Api\Migrations\20260712023810_SafeguardingPreferenceDependencyParity.cs`,
  `src\Nexus.Api\Migrations\20260712060051_DirectMessageStateParity.cs`,
  `tests\Nexus.Api.Tests\SafeguardingVettingControllerTests.cs`,
  `tests\Nexus.Api.Tests\DirectMessageParityCorrectionsTests.cs`, and
  `tests\Nexus.Api.Tests\VoiceMessageParityRegressionTests.cs`, plus the direct-
  message state schema/migration/edit-delete/archive-restore tests.
  Historical focused proof is the prior 61/61 core, clean 7/7 guardian lifecycle, clean
  13/13 recurring CRUD plus 1/1 route ownership, clean 13/13 recurring
  generation/scheduler, clean 13/13 organisation relationships/lifecycle, and
  clean 6/6 transactional wallets. The preceding financial proof is the initial
  103/106 high-risk run plus corrected/retried 3/3 and the 119/119 fail-closed
  suite. Current proof is the 32/32 attendance suite, 5/5 route/auth subset,
  green ambient-transaction regression, and the retained green 111-migration
  hours replay. Migration 114's invalid atomic-abort/catalog proof remains
  retained; blank 115, populated 114-to-115, and model drift are green. The final
  deterministic direct-message state gate passed 39/39. The broader exact
  regression completed 57/58 with the existing race green in isolation; the
  class aggregate completed 12/13 before PostgreSQL OOM `exit 137`, again with
  the race green isolated. Neither aggregate is fully green. The preceding hours/feed
  proof adds zero-error Debug and solution-wide Release builds with only four
  pre-existing `xUnit1031` warnings (Release took 4m36s) and one 53/53
  disposable-Linux run: all 51
  `VolunteerHoursParityTests` plus both `V15FeedActivityCompatibilityTests`, with
  3,007 tests discovered. The clean affected rerun selected and passed 243/243
  with zero failed/skipped in 418.639s. The full 3,007-test suite, CI, and
  unchanged-frontend runtime proof remain open.

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

### Current contract and safety regressions

1. **P0 completed 2026-07-12:** sender-only 24-hour edit, scoped participant
   delete, and partner-ID per-user archive/restore now persist durable state.
   Restricted-only coordinator help, durable policy-aware reactions/batch,
   full-preflight signed-Pusher typing, and tenant-scoped read/unread behavior
   with exact envelopes and independent 60/minute buckets are also complete.
   Continue the next canonical-frontend-used fallback inventory; use two-user
   reload, tenant, policy, cleanup, and side-effect tests and remove false
   oracles.
2. Run the full ASP.NET suite and CI, then complete unchanged-frontend
   member, organisation, administrator, and Caring runtime smoke. The focused
   53/53 and affected 243/243 gates are green, but the discovery count is not a
   full-suite pass.
3. Finish the residual group-exchange contract around notification fidelity,
   list/detail pagination/shape audit, and unchanged-frontend runtime smoke. The
   start/confirm/complete ledger workflow itself is now real and must not be
   conflated with the separate legacy one-to-one `Exchange` service.
4. Implement each financial workflow that still fails closed: two-party legacy
   exchange confirmation, managed-user sub-account approval, canonical
   community-fund donation/deposit/withdrawal, and durable authenticated
   federation settlement.
5. Run the read-only legacy financial candidate report, document manual
   disposition and current/proposed balance impact, and implement only reviewed
   forward remediations. Never infer evidence by amount or timestamp proximity.
6. Inventory every canonical React-used route that reaches a generic catch-all,
   recorded-only write, unconditional empty response, mock secret, or fabricated
   success. Replace each with a real workflow or an explicit honest unsupported
   result while implementing the remaining workflow. Never return a success
   envelope for an operation that did not happen.
7. Correct scheduled-job `run now`: execute the compatible operation and record
   its real outcome, or fail explicitly. Do not record success without running
   the job.
8. Match current role semantics: supported roles, tenant-super-admin flag,
   authorization policies, validation, response values, and migrations.
9. Match Laravel's AI-provider test authorization and throttling.
10. Add the `features.explore` bootstrap contract.
11. Port regression tests for Laravel's recent cross-tenant read and route-auth
   fixes. Prove tenant isolation with negative tests, not only happy paths.

> **2026-07-10 backend progress, extended 2026-07-11:** The previously missing
> wellbeing and group-exchange routes now have real workflows with focused
> tests. Scheduled `run now` also fails closed: the
> manual-run endpoint executes real `ListingExpiry` and `JobVacancyExpiry`
> jobs, persists their outcomes, prevents overlapping scheduled/manual
> execution, excludes inactive tenants, and returns explicit unsupported,
> busy, disabled, and failure responses. `volunteer-expire-consents` maps to
> the real global guardian-consent expiry job, while `recurring-shifts` now
> maps to a 06:00 UTC all-active-tenant 14-day sweep. Four of the 42 Laravel
> cron definitions are executable and the other 38 are reported disabled/
> unsupported. Role semantics now have explicit user privilege columns,
> DB-backed policies,
> stale-token rejection, canonical v2 auth errors, protected explicit-God
> targets, and focused role regression coverage. The recorded chain inventory is
> 115 migrations through `DirectMessageStateParity`; blank 115, populated
> 114-to-115, and model-drift gates are green. Migration 114's invalid atomic-
> abort/catalog proof and migration 111's no-mint proof remain retained. Full
> application runtime remains open. Canonical federation partnership list/approve/reject now has
> real receiver-only pending transitions,
> atomic audit, post-commit in-app notifications, Laravel error envelopes, and
> one-winner concurrency tests. It does not yet include Laravel federation-level
> permission fields, durable rejection metadata, localized push, initial-sync
> scheduling, or canonical audit-read visibility. Core volunteering now has real
> transactional behavior: selected-shift apply, admin/organizer decisions,
> direct signup/cancellation, group reservations and roster changes, waitlist
> join/leave/claim, displaced-shift re-offers, and stale-offer expiry use
> tenant-scoped persistence, conditional transitions, shared capacity locks,
> and surface-specific post-commit notification delivery. The shared guardian
> gate covers apply, signup, waitlist, and group-add entry paths. Its full
> lifecycle now provides safe member requests/reads, hashed single-use email
> credentials, tenant-scoped anonymous activation, authorized withdrawal,
> cursor-paginated admin reads, canonical throttling, admin-config convergence,
> audited email attempts, post-commit bells, global expiry, and explicit 410s
> for legacy mutation bypasses. The prior core is 61/61, the guardian lifecycle
> is clean at 7/7, and the combined workflow/guardian/ownership run was 67/68;
> its sole PostgreSQL fixture-clear timeout occurred before the test body and
> that exact case then passed 1/1 in isolation. The guardian ownership/migration
> focus is 97/97. The API and test-project Release builds are
> green. Recurring generation now preserves Laravel's original recurrence
> anchor, strict ISO weekdays and true-empty day behavior, biweekly parity,
> month-end clamping, end/max bounds, and counter accuracy. Pattern-row locks,
> a filtered unique occurrence key, and targeted conflict handling make
> scheduled/manual retries race-safe; per-pattern errors fail the persisted job
> after the remaining tenants continue. The focused set is 13/13. Recurring
> CRUD now matches Laravel's array payloads and `{data,meta}` envelopes,
> active-plus-inactive newest-first reads, create defaults, presence-aware PUT,
> organizer/current-admin authorization, direct-key/blob feature convergence,
> independent 60/10-per-minute buckets, and two-stage deactivation/future-shift
> cleanup. Cleanup preserves historical shifts, expenses, and wellbeing rows,
> deactivates matching alerts, and clears blocking swap destinations. The
> focused CRUD set is 13/13 and route ownership is 1/1. It also proves exact
> site-role authorization, allowed-field timestamp semantics, lossless decoded
> day arrays, and authorization/feature gates before action throttles. The
> creator shadow FK is replaced by tenant-preflighted `CreatedBy`; capacity,
> spots, occurrence maximums, and generated counts enforce Laravel's unsigned
> semantics while explicit zero remains valid. Dedicated canonical
> volunteer-organisation storage now backs member/admin/public lifecycle,
> opportunity creation, dashboard projections, transaction aggregates, and
> exact manager authorization without reusing the generic organisation domain.
> Member wallet summary/history/deposit and admin history/adjustment now have
> singular focused owners and real atomic storage. Advisory locks, tenant
> predicates, signed-balance validation, and a nullable-leg personal-ledger
> adapter make deposits/adjustments race-safe without fabricating counterpart
> users. The earlier focused wallet set was 6/6 and its disjoint affected groups
> were 213/213. The 2026-07-11 extension adds locked generic-organisation
> lifecycle/wallet rules, wallet-evidence-preserving delete refusal, the full
> group-exchange state machine, persisted V15 community-fund/starting-balance
> reads, privacy-safe wallet search, and linked loyalty/estate evidence. The
> latest migration is `20260712104503_DurableMessageReactions`; the recorded
> EF inventory is 116 migrations. Blank 116 and model-drift gates are green
> with exact reaction schema; blank 115 and populated 114-to-115 remain green
> with content/read timestamps preserved, false/null defaults, and audit FK
> `SET NULL`; migration 115 is forward-only. Migration
> 114's invalid duplicate `P0001` atomic-abort/no-partial-schema and catalog-
> containment proof remains retained. Migration 111's
> feed/privacy/FK replay remains retained evidence. The
> preceding financial migration's valid populated upgrade
> preserves legacy rows and normalizes known role casing; its invalid
> cross-tenant wallet-transaction upgrade aborts before changing history or
> schema. The initial high-risk run was 103/106, the corrected/retried cases
> passed 3/3, and the fail-closed contract suite passes 119/119. The current QR
> attendance workflow covers all four Laravel routes with exact-assignment token
> issue, coordinator verification/late checkout, sanitized history, and no
> financial/reward side effects. Its focused suite passes 32/32, the injected
> persistence-failure contract passes 1/1, route/auth is 5/5, and the
> ambient-transaction regression is green. Member/admin V2 shift
> swaps now use canonical payloads/envelopes and atomically exchange approved
> application assignments without moving QR evidence; setting-driven admin
> approval, pending-only cancellation, and duplicate-request serialization are
> covered by a 12/12 focused suite. Swap notifications/localization, global
> per-user assignment serialization across distinct concurrent writers, and
> unchanged-frontend smoke remain
> open. The affected legacy-hours/caring/demo/route-alias/volunteering gate is
> 90/90. The subsequent volunteer-hours slice now gives the eight Laravel
> member/organisation/admin routes one locked `vol_logs` workflow, exact-once
> personal and organisation settlement, XP evidence, and Caring convergence.
> Debug API/test and solution-wide Release builds have zero errors and only the
> same four pre-existing `xUnit1031` warnings; Release took 4m36s. One disposable-
> Linux run discovered 3,007 tests and passed
> 53/53: all 51 `VolunteerHoursParityTests` plus both
> `V15FeedActivityCompatibilityTests`. The clean affected rerun selected and
> passed 243/243 with zero failed/skipped in 418.639s. The full 3,007-test suite,
> CI, and unchanged-frontend smoke remain open.
> The volunteering migrations
> handle unsafe histories explicitly: the former unique application index
> cannot be restored after legitimate reapplication history, and hashed
> guardian credentials/status semantics cannot be safely discarded. The QR
> attendance migration is also forward-only because downgrade would discard
> token, lifecycle-status, and coordinator evidence and make pending attendance
> timestamps non-nullable. Restore a tested pre-migration backup or use a
> reviewed forward remediation; do not force its `Down()` path.
> The recurrence index migration is reversible but fails closed when duplicate
> historical occurrences require manual linked-history reconciliation.
> The recurring CRUD migration fails closed on divergent, missing, or
> cross-tenant creator ownership and restores the shadow FK deterministically
> on downgrade. `CreatedBy` deliberately uses non-destructive `RESTRICT`
> instead of Laravel's user-delete cascade until ownership deletion effects are
> explicitly proven. Volunteer-hour reads/approval mutations and the admin
> timebank organisation-wallet overview remain; localized built-in guardian
> delivery copy and the full tenant-link fallback
> chain, live provider proof, and unrelated long-tail volunteering scaffolds
> remain. This
> progress does not close the catch-all
> inventory, wider scheduled/provider backlog, or the backend 1000/1000 gate.

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

The 2026-07-12 security-confirmation slice adds the canonical React-used
`POST /api/webauthn/security-confirm` workflow and closes one expanded route
gap. Password, TOTP, backup-code, and recent UV-passkey proof issue a signed
five-minute token bound to user, tenant, method, type, and unique id; enrollment
challenge/verification plus remove/rename/remove-all require that proof. The
dedicated authenticated bucket is 10 attempts per 600 seconds. Focused
disposable-PostgreSQL workflows passed 2/2, signed-token binding/claim tests
passed 2/2, route/policy ownership passed 1/1, and the Release solution build
completed with zero errors and the same four pre-existing warnings.

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
- supported populated histories upgrade without row loss, while deliberately
  invalid tenant/financial histories fail preflight without partial schema or
  migration-history changes;
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
