# Schema Parity Map

Last reviewed: 2026-07-12

Laravel source of truth: `C:\platforms\htdocs\staging\database\migrations` and
`C:\platforms\htdocs\staging\app\Models`.

## Current Source Counts

The static schema-table counts were regenerated with
`scripts/compare-laravel-schema-parity.ps1` on 2026-07-12 after the event
broadcast workflow slice. Runtime migration counts come from a separate
blank PostgreSQL replay.

| Source | Count | Notes |
| --- | ---: | --- |
| Laravel migrations | 377 | PHP migration files under `database/migrations`. |
| ASP.NET migration source files | 125 | Main migration `.cs` files excluding designers and the model snapshot. |
| ASP.NET runtime migrations | 123 | Blank replay applied every recorded EF migration through `20260712214912_EventRegistrationWaitlistLifecycleParity`; `has-pending-model-changes` is green. |
| Laravel created tables | 298 | Unique `Schema::create(...)` table names. |
| Laravel touched tables | 128 | Unique `Schema::table(...)` table names. |
| Laravel explicit model tables | 267 | Unique `protected/public $table = ...` model declarations. |
| Laravel source tables | 455 | Union of migration-created, migration-touched, and explicit model tables. |
| ASP.NET tables | 355 | Static table union after adding canonical registration/waitlist histories. |
| Exact matched tables | 164 | Current exact table-name matches. |
| Missing Laravel tables | 291 | Laravel source names not represented exactly in ASP.NET. |
| Extra ASP.NET tables | 191 | .NET table names with no exact Laravel table name. |

These counts are not a parity score. Static table-name matching will overstate
some gaps where .NET intentionally renamed tables, for example Laravel `vol_*`
tables versus .NET `volunteer_*` tables. Those aliases still need explicit
triage and compatibility decisions before any table can be marked equivalent.

## 2026-07-12 Runtime Migration, Direct-Message, And Safeguarding Evidence Status

`20260712214912_EventRegistrationWaitlistLifecycleParity` is the current latest
migration and runtime ID 123. It deterministically upgrades existing canonical
audience rows with `event` capacity-pool keys, version 1, state timestamps, and
collision-free queue sequences before adding uniqueness constraints. It adds
the exact Laravel tables `event_registration_history` and
`event_waitlist_entry_history`; PostgreSQL triggers make both append-only and
the downgrade refuses to discard evidence. All 123 migrations applied to blank
disposable PostgreSQL 16, EF reports no pending model changes, and focused
registration/waitlist proof passed 4/4. No production resource was touched.

`20260712204651_EventBroadcastWorkflowParity` is the preceding migration and
runtime ID 122. It adds canonical `event_registrations`,
`event_waitlist_entries`, and `event_attendance` audience ledgers plus exact
Laravel tables `event_broadcasts`, `event_broadcast_history`,
`event_broadcast_deliveries`, and `event_broadcast_delivery_attempts`.
PostgreSQL checks and triggers enforce lifecycle transitions, version
progression, identity and content freezing, terminal state, delivery state, and
append-only history/attempt evidence. All 122 migrations applied to blank
disposable PostgreSQL 16, EF reports no pending model changes, and focused
broadcast proof passed 4/4. No production resource was touched.

`20260712191551_EventTemplateWorkflowParity` is the preceding migration and
runtime ID 121. It adds the exact Laravel tables `event_templates`,
`event_template_versions`, `event_template_materializations`, and
`event_template_audit`, plus the safe event fields required for capture and
materialization. PostgreSQL constraints and triggers reject mutation of
version, materialization, and audit evidence and direct template deletion. All
121 migrations applied to a blank disposable PostgreSQL 16 database, EF
reports no pending model changes, focused template proof passed 4/4, and the
combined event lifecycle/template gate passed 8/8. No production resource was
touched.

`20260712175611_EventLifecycleParity` is the preceding migration and runtime ID
120. It safely projects existing `IsCancelled` rows into Laravel's
publication/operational axes, adds lifecycle moderation/cancellation metadata,
adds close state to reminders, and creates the exact Laravel table names
`event_status_history` and `event_domain_outbox`. PostgreSQL triggers reject
history updates and deletes. All 120 migrations applied to a blank disposable
PostgreSQL 16 database, EF reports no pending model changes, focused lifecycle
proof passed 4/4, and the combined admin-event gate passed 10/10. No production
resource was touched.

`20260712163203_GroupInviteAndExportLifecycleParity` is the preceding migration
and remains runtime ID 119. It adds durable invite type, acceptance identity
and timestamps, active membership status, cached group member counts, and the
Laravel-named `group_data_exports` queue with requester and expiry indexes.
Existing memberships are preserved as active, invite type is derived from the
existing email value, update time is initialized from creation time, and cached
counts are rebuilt from active memberships. All 119 migrations applied to a
blank disposable PostgreSQL 16 database and EF reports no pending model
changes. Focused invite/export HTTP and generation proof passed 3/3; the
combined affected group gate passed 6/6. No production resource was touched.

The preceding `20260712152645_GroupFormLifecycleParity`,
`20260712145614_GroupQaLifecycleParity`, and
`20260712104503_DurableMessageReactions` migrations are runtime IDs 118, 117,
and 116 respectively.

`20260712060051_DirectMessageStateParity` was the latest migration at the
direct-message checkpoint and remains runtime ID 115. It adds durable edit,
participant-scoped deletion, per-user
archive, and nullable deletion-audit state to messages. New boolean state
defaults to `false`; optional timestamps and audit identity default to null.
The audit user relationship uses `ON DELETE SET NULL`. Blank 115 and populated
114-to-115 PostgreSQL replays are green, existing content and read timestamps
were preserved, and `has-pending-model-changes` is green. The migration is
forward-only because downgrade would discard message visibility and audit
history.

The preceding safeguarding checkpoint ended at
`20260712023810_SafeguardingPreferenceDependencyParity`, runtime ID 114. Its
preceding two IDs are
`20260712020049_SafeguardingVettingAttestationParity` and
`20260712022243_MessagingDisabledRestrictionParity`. Together they add the five
exact Laravel tables `tenant_safeguarding_settings`,
`member_vetting_attestations`, `member_vetting_attestation_events`,
`safeguarding_vetting_review_requests`, and
`safeguarding_policy_rotation_events`; the
`user_monitoring_restrictions.messaging_disabled` storage adapter; preference
policy-review metadata; and the final consent-value/dependency constraints.

The safeguarding tables are metadata-only. They persist catalog codes,
decisions, policy versions, review lifecycle, and append-only events without
certificate files, reference numbers, free-text notes, expiry dates, or other
sensitive evidence. Legacy `vetting_records` are marked for controlled
redaction but never authorize the new contact policy. Direct attestation deletion
is rejected outside an explicit user/tenant cascade.

Final non-production certification applied all 115 migrations to a blank
PostgreSQL database and asserted the five tables, messaging flag, catalog
containment, unique tenant/user/option preference, required consent time, and
tenant/option cascade relationships plus the new message defaults/audit FK. A
valid populated 114-to-115 upgrade preserved message content and read
timestamps and initialized the new fields to false/null. Retained valid
populated 113-to-114 evidence
preserved rows, widened `SelectedValue`, and filled null `ConsentGivenAt` from
the row's `CreatedAt`. A duplicate tenant/user/option fixture raised PostgreSQL
`P0001` before DDL or data change: history remained at 113 and no migration-114
schema was left behind. The final deterministic direct-message state gate
passed 39/39 with zero failed or skipped, covering migration/model contracts,
behavior, concurrency, and route ownership. The broader exact regression completed
57/58; its sole existing first-writer race subsequently passed in isolation. A
separate class aggregate completed 12/13 before disposable PostgreSQL was OOM-
killed with `exit 137`; the race was green in isolation. Neither interrupted
aggregate is fully green. No production database or container was touched.

The physical monitoring table is intentionally documented as an adapter for
Laravel's `user_messaging_restrictions`; matching the workflow and constraints
does not imply identical table naming.

## 2026-07-12 Volunteer Hours Evidence Status (Preceding)

`20260711192124_VolunteerHoursLedgerParity` is runtime ID 111. It hardens
canonical `vol_logs` hours, status, organisation,
opportunity, reviewer, recipient, and Caring relationship provenance; installs
tenant-composite relationships and active natural-key uniqueness; adds the
personal `transactions.VolunteerLogId` link; and enforces unique, semantically
linked organisation-payment and volunteer-hour XP evidence. The same migration
source adds the Laravel-aligned tenant-scoped `feed_activity` projection with its
unique source tuple/hot-path indexes and the nullable `users.show_on_leaderboard`
privacy preference. `FeedActivityService` publishes approved hours idempotently
as `volunteer_hours` without copying the volunteer description; other producers,
admin moderation integration, cleanup, and backfill remain gaps. Its preflight
rejects invalid hours/status, orphan or cross-tenant relationships, inconsistent
organisation/opportunity/Caring provenance, ambiguous or contradictory payout/
XP evidence, and duplicate active log keys before any DDL. It never inserts
legacy transaction, payment, or XP rows. Uniquely provable existing evidence may
be linked; evidence-free approved whole-hour organisation rows are downgraded to
`pending`, while approved Caring sub-hour rows remain valid without fabricated
evidence. Source-level migration contract tests cover the no-mint and conditional
hours rules. At that checkpoint, non-production certification applied all 111
migrations to a blank PostgreSQL database; direct assertions verified the exact
13-column/eight-index `feed_activity` schema, nullable-boolean
`users.show_on_leaderboard` with default `true`, all 11 column-specific
`ON DELETE SET NULL` relationships, and the volunteer-user `CASCADE`
relationship. A valid populated 110-to-111 upgrade preserved and linked existing
evidence without minting transaction, payment, or XP value. A deliberately
invalid fixture raised PostgreSQL `P0001` atomically: history remained at 110 and
no migration-111 DDL was left behind. `has-pending-model-changes` is green.
Disposable Docker container, network, and anonymous-volume cleanup left zero
matching resources. No production database or container was touched.

The preceding `20260711143546_VolunteerQrAttendanceParity` migration makes
`volunteer_check_ins.CheckedInAt` nullable, adds nullable global
`QrToken`, nullable `CheckedInById`/`CheckedOutById`, required lifecycle
`Status`, and required `UpdatedAt`, and installs a global filtered unique token
index plus one attendance row per `(TenantId, ShiftId, UserId)`. Status is
restricted to `pending`, `checked_in`, `checked_out`, or `no_show`. Historical
rows are deterministically backfilled to `checked_out` when `CheckedOutAt` is
present, otherwise `checked_in` when `CheckedInAt` is present, otherwise
`pending`; `UpdatedAt` is copied from `CreatedAt`. Historical QR tokens and
coordinator IDs remain null, and compatibility `HoursLogged`, `Notes`, and
`TransactionId` evidence is preserved.

The migration adds tenant-composite attendance user/shift/coordinator/
transaction relationships and a composite application
tenant/opportunity/shift relationship, so an assigned shift must belong to the
same opportunity and tenant. It also expands the volunteer-organisation member
role constraint to `owner`, `admin`, `manager`, `coordinator`, or `member`.
Preflight aborts before any DDL for duplicate tenant/shift/user attendance rows,
orphaned relationships, or cross-tenant opportunity, shift, application,
reviewer, volunteer, attendance, or transaction evidence. Duplicate rows are
not merged because their legacy hours/transaction evidence cannot be reconciled
safely.

The preceding `20260711100817_LoyaltyEstateOrganisationEvidence` adds
tenant-composite, unique transaction evidence for Caring
loyalty debits/refunds and positive hour-estate settlements. Applied legacy
loyalty and settled estate rows are retained with null evidence links for
manual reconciliation; the migration does not guess a transaction from amount
or timestamp proximity. The services now refuse a loyalty reversal when its
authoritative debit link is absent or invalid.

That preceding migration also hardens the generic organisation domain. Organisation
owners, memberships, wallets, and wallet transactions now use tenant-composite
foreign keys; membership is unique by tenant/organisation/user; and the only
accepted roles are `owner`, `admin`, `member`, and `volunteer`. Upgrade preflight
aborts before schema changes on cross-tenant relationships or unknown roles.
Known role values are lowercased and trimmed. The migration is intentionally
irreversible because removing ledger evidence or tenant constraints cannot be
done without weakening financial and isolation guarantees.

The preceding `20260711083852_WalletLedgerFederationPartnerParity` makes the
main .NET `transactions` sender and receiver relationships nullable so
one-sided debits and credits do not require a fabricated user. It adds explicit
transaction types and participant-specific history-hide flags, hardens
federated transaction provenance, persists partner access tokens, and adds
reservation/settlement evidence links for Caring hour gifts. This is an
explicit ledger adapter for Laravel's direct `users.balance` storage, not a
claim of identical internal persistence.

The preceding `20260711010201_VolunteerOrganisationRelationshipsParity` creates
canonical `vol_organizations`, `org_members`, and `vol_org_transactions` storage
and adds nullable
`volunteer_opportunities.organization_id`. Owner, membership, and opportunity
foreign keys use tenant-composite principals; the opportunity link uses
non-destructive `RESTRICT`. No organisations or opportunity links are
backfilled. Its original nullable `vol_org_transactions.vol_log_id` scalar is
now a tenant-composite foreign key to `vol_logs`, with Laravel's unique
`(tenant_id, vol_log_id, type)` payment guard retained. The canonical hours
migration also links the matching personal transaction and XP evidence rather
than degrading to zero-hour aggregates.
Historical NULL-linked opportunities require explicit tenant/operator mapping;
`OrganizerId` is a user key and must never be treated as an organisation id.

The preceding `20260710221715_RecurringShiftPatternCrudParity` corrects the
recurring creator/capacity model. `20260710211122_RecurringShiftGenerationParity`
replaces the simple recurring-pattern tenant index with an active/end-date
sweep index and adds a filtered unique `(TenantId, RecurringPatternId,
StartsAt)` key to generated shifts. The upgrade explicitly fails if historical
duplicates exist; it does not guess which shift to delete because any duplicate
may already own check-ins, applications, reservations, or waitlist history.

The migration builds on `20260710192521_GuardianConsentLifecycle` and
`20260710171315_AdminVolunteerApprovalWorkflow`, which added nullable
`ShiftId` and `OrgNote` application fields, canonical notification `Link`
values, a non-unique tenant/opportunity/user lookup that permits legitimate
reapplication history, shift/capacity indexes, nullable guardian opportunity/
expiry scope, and `SET NULL` shift/opportunity relationships.

The lifecycle migration adds nullable `GuardianPhone`, `ConsentIp`, and unique
filtered `ConsentTokenHash` fields; expands guardian name storage; requires and
backfills `GuardianRelationship`; and adds `(TenantId, MinorUserId, Id)` and
`(TenantId, Status, Id)` read indexes. It normalizes `Granted` to `Active` and
`Revoked`/`Rejected` to `Withdrawn`, expires all legacy pending or active rows
that lack a guardian-held credential, removes orphan minor rows, and replaces
the historical minor-user relationship with a cascade foreign key. A null
opportunity still represents tenant-wide consent; a populated value scopes it
to one opportunity.

Storing only a SHA-256 credential hash is an intentional security divergence
from Laravel's raw `consent_token` column while preserving the external
single-use verification contract. The API and test projects build cleanly, the
prior transactional core passes 61/61 focused tests, and the guardian lifecycle
passes a clean 7/7 PostgreSQL-backed regression. Recurring-shift math,
idempotence, concurrency, tenant sweep, and scheduled-run persistence pass a
clean 13/13 PostgreSQL-backed regression.

The recorded runtime inventory is 115 EF-discovered/applicable migrations
through `20260712060051_DirectMessageStateParity`. Blank 115, populated
114-to-115, and model-drift gates are green as described above; migration 114's
invalid atomic-abort and catalog-containment evidence remains retained. The
preceding discovery repair
restored explicit discovery metadata to 27 essential designer-less migrations,
including `20260303120000_AddAiMessageTenantId`. The overlapping
`20260307181700_FederationCoreExpansion` class remains intentionally outside
the runtime chain because the later `Phase38to40_JobsKBLegal` migration is its
full schema superset. `20260305120000_AddTenantUpdatedAt` also remains outside:
`InitialCreate` already creates `tenants.UpdatedAt`, so discovering it would
duplicate the column.

The Debug API/test builds and required solution-wide Release build complete with
zero errors; the only warnings are the same four pre-existing `xUnit1031`
warnings in the test project. The Release build took 4m36s. One disposable Linux run
discovered 3,007 tests and passed 53/53: all 51
`VolunteerHoursParityTests` plus both `V15FeedActivityCompatibilityTests`.
Windows Smart App Control prevents loading the freshly rebuilt unsigned API
assembly locally; host policy was not weakened. The clean affected rerun
discovered 3,007 tests, selected 243, and passed 243/243 with zero failed and zero
skipped in 418.639s. The
preceding 32/32 QR attendance, 1/1 persistence-failure, 12/12 shift-swap, 5/5
route/auth, 90/90 affected-module, and ambient-transaction results remain useful
historical evidence but do not certify the new hours slice or replace full-suite
and frontend-runtime gates. Descendant CI run `29154079189` was later
cancelled after its completed Integration Tests job reported 51 failures out of
2,888 tests. Its only direct regression from the preceding
`bfeafb2e` backend slice was nested transaction handling, now fixed and green
locally; the other CI failures remain open for independent triage.

Migration 115's blank/populated replay and model-drift gates are green as
described above; migration 114's safeguarding replay and migration 111's no-mint
replay remain retained evidence. The
preceding QR migration has a populated 109-to-110 backfill and
duplicate/cross-tenant atomic-abort proof. No production database or container
was inspected or changed.

Do not auto-link null legacy loyalty/estate evidence or rewrite ambiguous
self-transfers, admin grants, starting-balance grants, or hour transfers. The
copy-ready `BEGIN TRANSACTION READ ONLY` candidate report in
`docs/database-migrations.md` exposes current and expected balance effects for
manual disposition without making changes.

Schema presence is not workflow parity. Legacy one-to-one exchange, sub-account
pooling, community-fund writes, and federation settlement remain explicit HTTP
503 or equivalent fail-closed workflows until their missing approval/evidence/
saga models are implemented. Volunteer-hours schema and workflow now exist, but
the full 3,007-test suite, CI, and unchanged-frontend runtime certification
remain open.

`AdminVolunteerApprovalWorkflow.Down()` is intentionally irreversible. Restoring
the former unique application index after valid reapplication history could
fail or require silent data loss, so `Down()` throws before dropping any of the
new constraints or columns. `GuardianConsentLifecycle.Down()` is also
intentionally irreversible because rollback would discard hashed credentials
and restore unsafe legacy status/verification semantics.
`VolunteerQrAttendanceParity.Down()` likewise throws before changing schema: a
downgrade would discard QR token, attendance-status, and coordinator evidence
and make pending attendance timestamps non-nullable. Recovery requires a tested
pre-migration backup or a reviewed forward remediation, never a forced down
migration.
`VolunteerHoursLedgerParity.Down()` also throws before changing schema because
rollback would remove immutable feedback and personal/organisation/XP ledger
provenance. Restore a verified pre-migration backup or use a reviewed forward
remediation.
The three subsequent safeguarding/messaging migrations also throw before any
downgrade mutation: removing append-only attestation/policy evidence,
`messaging_disabled`, or canonical consent dependencies would lose evidence or
weaken safety. Recover from a verified backup or apply a reviewed forward
remediation.
`DirectMessageStateParity.Down()` also throws before changing schema because a
downgrade would discard durable edit, visibility, archive, and deletion-audit
history. Restore a verified backup or use a reviewed forward remediation.
`RecurringShiftGenerationParity.Down()` removes the two new indexes and
restores the former simple tenant index; no application data is deleted.

## Generated Artifacts

The repeatable static comparison script writes these ignored artifacts by
default:

```text
artifacts/parity/schema/schema-parity.json
artifacts/parity/schema/schema-parity.csv
artifacts/parity/schema/schema-parity.md
```

Run the fixture test before relying on a regenerated report:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\test-compare-laravel-schema-parity.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\compare-laravel-schema-parity.ps1
```

## High-Risk Missing Table Families

The current missing-table prefix scan is strongest as a planning aid, not proof
of semantic absence. It highlights the domains that need table-by-table review:

| Prefix/family | Missing source tables | Parity implication |
| --- | ---: | --- |
| `caring_*` | 0 | Caring Community and KISS exact-name `caring_*` schema gaps are currently cleared in the static schema comparator; `caring_emergency_alerts`, `caring_federation_peers`, `caring_sub_regions`, `caring_care_providers`, `caring_caregiver_links`, `caring_cover_requests`, `caring_support_categories`, `caring_support_relationships`, `caring_tandem_suggestion_log`, `caring_help_requests`, `caring_project_announcements`, `caring_project_updates`, `caring_project_subscriptions`, `caring_smart_nudges`, `caring_paper_onboarding_intakes`, `caring_favours`, `caring_municipality_feedback`, `caring_trust_tier_config`, `municipality_surveys`, `municipality_survey_questions`, `municipality_survey_responses`, `caring_hour_estates`, `caring_hour_transfers`, `caring_hour_gifts`, `caring_kiss_treffen`, `caring_invite_codes`, `caring_kpi_baselines`, `caring_loyalty_redemptions`, `caring_regional_point_accounts`, `caring_regional_point_transactions`, `caring_research_partners`, `caring_research_consents`, and `caring_research_dataset_exports` are now represented in .NET. Laravel's `municipal_report_templates`, `municipal_verifications`, shared `categories.substitution_coefficient`, `users.trust_tier`, `safeguarding_reports`, `safeguarding_report_actions`, and member-facing `user_safeguarding_preferences` are also represented. Success stories intentionally use tenant-config key `caring.success_stories` to mirror Laravel's tenant-setting storage. |
| `vol_*` | 17 | The 115-ID runtime inventory retains canonical `vol_logs` with tenant-composite user/organisation/opportunity/reviewer/Caring provenance, hours/status checks, active natural-key uniqueness, personal transaction links, organisation-payment links, and volunteer-hour XP evidence. Migration 111 never inserts legacy value: evidence-free approved whole-hour organisation rows become `pending`, while approved Caring sub-hour rows remain valid. The eight member/organisation/admin hour routes and Caring relationship logging share the same locked workflow; direct Caring input retains raw fractional semantics for whole-hour flooring/regional points before rounded storage. QR attendance separately has migration-backed token/status/coordinator evidence and remains deliberately free of credit/XP side effects. The current live count reports 17 exact-name gaps because other Laravel `vol_*` tables/aliases remain; broader workflow semantics, the full 3,007-test suite, CI, and unchanged-frontend certification still require reconciliation. |
| `federation_*` | 17 | Receiver-scoped partnership decisions now persist native status/audit state, but exact federation-level permission columns, rejection actor/time/reason metadata, initial-sync/outbox state, and broader partner/network schema still need reconciliation. |
| `course_*` | 15 | Course module has no clear .NET implementation surface. |
| `job_*` | 13 | Job schema is partially present but not exact-name complete. |
| `marketplace_*` | 6 | Marketplace implementation is materially incomplete; `marketplace_seller_loyalty_settings` and `marketplace_seller_regional_point_settings` are now represented for the Caring loyalty and regional-points bridges. |
| `podcast*` | 7 | Podcast API route compatibility now exists via tenant-config state; dedicated podcast tables/media-processing schema remain open gaps. |
| `verein_*` | 5 | `verein_federation_consents` is now represented for municipality events-calendar sharing; the remaining Verein/Clubs schema still needs real domain schema and workflow parity. |
| `regional_*` | 0 | Regional Analytics subscription, report, access-log, and cache schema tables are now represented; API/service/report workflow parity remains open. |

## Acceptance Criteria For Schema Parity

- Every Laravel table is matched exactly, mapped to a documented .NET alias, or
  replaced by a documented equivalent .NET workflow.
- Every alias has migration evidence and tests covering the external workflow
  that depends on it.
- Formerly excluded module tables are treated as gaps until implemented or
  explicitly superseded by a product decision.
- EF migrations, entity configurations, and tenant isolation tests are updated
  together for each schema batch.
