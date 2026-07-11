# Schema Parity Map

Last reviewed: 2026-07-11

Laravel source of truth: `C:\platforms\htdocs\staging\database\migrations` and
`C:\platforms\htdocs\staging\app\Models`.

## Current Source Counts

Static schema-table counts were generated with
`scripts/compare-laravel-schema-parity.ps1` on 2026-07-11. The EF migration
inventory was refreshed and runtime-verified on the same date.

| Source | Count | Notes |
| --- | ---: | --- |
| Laravel migrations | 330 | PHP migration files under `database/migrations`. |
| ASP.NET migration source files | 112 | Main migration `.cs` files excluding designers and the model snapshot. |
| ASP.NET runtime migrations | 110 | EF-discovered/applicable IDs through `20260711143546_VolunteerQrAttendanceParity`; all replay on blank PostgreSQL. |
| Laravel created tables | 215 | Unique `Schema::create(...)` table names. |
| Laravel touched tables | 104 | Unique `Schema::table(...)` table names. |
| Laravel explicit model tables | 195 | Unique `protected/public $table = ...` model declarations. |
| Laravel source tables | 362 | Union of migration-created, migration-touched, and explicit model tables. |
| ASP.NET tables | 330 | Union of EF `ToTable(...)`, `[Table(...)]`, migration `CreateTable(...)`, and explicit SQL table names. |
| Exact matched tables | 135 | Static name matches only; canonical `vol_organizations`, `org_members`, and `vol_org_transactions` are now represented. |
| Missing Laravel tables | 227 | Laravel source tables with no exact .NET table name. |
| Extra ASP.NET tables | 195 | .NET table names with no exact Laravel table name. |

These counts are not a parity score. Static table-name matching will overstate
some gaps where .NET intentionally renamed tables, for example Laravel `vol_*`
tables versus .NET `volunteer_*` tables. Those aliases still need explicit
triage and compatibility decisions before any table can be marked equivalent.

## 2026-07-11 Runtime Migration And Attendance Evidence Status

`20260711143546_VolunteerQrAttendanceParity` is the current latest migration.
It makes `volunteer_check_ins.CheckedInAt` nullable, adds nullable global
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
backfilled. Nullable `vol_org_transactions.vol_log_id` remains a scalar because
the discovered runtime chain does not create Laravel's `vol_logs` table. The
ledger still has Laravel's unique `(tenant_id, vol_log_id, type)` payment guard,
and its nullable user relationship is tenant-composite. API aggregate reads
degrade to honest zero-hour results on a discovered-chain-only database.
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

The verified runtime inventory is 110 EF-discovered/applicable migrations. EF
reports no pending model changes. A clean recreated database applied all 110
after restoring `AddAiMessageTenantId` discovery metadata. Migration history
contains 110 rows through the latest ID; `ai_messages.TenantId` is non-nullable
and its tenant index and foreign key are present. One populated 109-to-110
upgrade is green; duplicate-attendance and cross-tenant fixtures each prove the
expected atomic preflight abort at 109 before DDL.
The chain runs through
`20260711143546_VolunteerQrAttendanceParity`. The preceding discovery repair
restored explicit discovery metadata to 27 essential designer-less migrations,
including `20260303120000_AddAiMessageTenantId`. The overlapping
`20260307181700_FederationCoreExpansion` class remains intentionally outside
the runtime chain because the later `Phase38to40_JobsKBLegal` migration is its
full schema superset. `20260305120000_AddTenantUpdatedAt` also remains outside:
`InitialCreate` already creates `tenants.UpdatedAt`, so discovering it would
duplicate the column.

The current test-project build has zero errors and four pre-existing
`xUnit1031` warnings. Migration discovery, the 32/32 QR attendance suite, 1/1
persistence-failure regression, 12/12 shift-swap suite, 5/5 route/auth subset,
90/90 affected-module gate, and the ambient-transaction regression are green. These
focused results validate the current schema consumers but do not replace the
full-suite and frontend-runtime gates. Descendant CI run `29154079189` was later
cancelled after its completed Integration Tests job reported 51 failures out of
2,888 tests. Its only direct regression from the preceding
`bfeafb2e` backend slice was nested transaction handling, now fixed and green
locally; the other CI failures remain open for independent triage.

A blank database and a populated database stopped at the preceding migration
both upgraded from 109 to 110. The populated proof retained checked-out and
checked-in history with the deterministic status/`UpdatedAt = CreatedAt`
backfill, null historical QR/coordinator columns, and untouched
`HoursLogged`/`TransactionId` evidence. Separate duplicate-attendance and
cross-tenant fixtures both aborted in preflight, stayed at 109 migrations, and
installed none of the new DDL. The uniquely named disposable PostgreSQL
container was removed. No production database or container was inspected or
changed.

Do not auto-link null legacy loyalty/estate evidence or rewrite ambiguous
self-transfers, admin grants, starting-balance grants, or hour transfers. The
copy-ready `BEGIN TRANSACTION READ ONLY` candidate report in
`docs/database-migrations.md` exposes current and expected balance effects for
manual disposition without making changes.

Schema presence is not workflow parity. Legacy one-to-one exchange,
sub-account pooling, volunteer hours/rewards, community-fund writes, and
federation settlement remain explicit HTTP 503 or equivalent fail-closed
workflows until their missing approval/evidence/saga models are implemented.

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
| `vol_*` | 19 | The .NET model contains `VolunteerLog` consumers, but the 110-migration runtime chain does not create Laravel's `vol_logs` table; the legacy hours write alias therefore returns HTTP 503 `VOLUNTEER_HOURS_UNAVAILABLE`, hour aggregates degrade honestly, and hour verification/rewards remain open. QR attendance now has migration-backed token/status/coordinator evidence, tenant-composite assignment and attendance relationships, and one attendance row per tenant/shift/user without minting hours or credits. The renamed volunteering schema also has shared capacity indexes, canonical notification links, scoped hashed guardian consent, race-safe recurrence, canonical creator ownership, and dedicated volunteer-organisation/member/wallet storage. Exact Laravel `vol_*` aliases, legacy NULL organisation mapping, hour/payment evidence, and the remaining volunteering schema families still require reconciliation. |
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
