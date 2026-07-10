# Schema Parity Map

Last reviewed: 2026-07-10

Laravel source of truth: `C:\platforms\htdocs\staging\database\migrations` and
`C:\platforms\htdocs\staging\app\Models`.

## Current Source Counts

Static schema-table counts were generated with
`scripts/compare-laravel-schema-parity.ps1` on 2026-07-09. The EF migration
inventory was refreshed and runtime-verified on 2026-07-10.

| Source | Count | Notes |
| --- | ---: | --- |
| Laravel migrations | 323 | PHP migration files under `database/migrations`. |
| ASP.NET EF migrations | 106 | Release discovery verifies 77 runtime migrations and 29 explicitly quarantined classes. |
| Laravel created tables | 215 | Unique `Schema::create(...)` table names. |
| Laravel touched tables | 103 | Unique `Schema::table(...)` table names. |
| Laravel explicit model tables | 195 | Unique `protected/public $table = ...` model declarations. |
| Laravel source tables | 361 | Union of migration-created, migration-touched, and explicit model tables. |
| ASP.NET tables | 324 | Union of EF `ToTable(...)`, `[Table(...)]`, migration `CreateTable(...)`, and explicit SQL table names. |
| Exact matched tables | 131 | Static name matches only; `user_blocks` and `user_safeguarding_preferences` are now represented for Laravel React settings parity. |
| Missing Laravel tables | 230 | Laravel source tables with no exact .NET table name. |
| Extra ASP.NET tables | 193 | .NET table names with no exact Laravel table name. |

These counts are not a parity score. Static table-name matching will overstate
some gaps where .NET intentionally renamed tables, for example Laravel `vol_*`
tables versus .NET `volunteer_*` tables. Those aliases still need explicit
triage and compatibility decisions before any table can be marked equivalent.

## 2026-07-10 Volunteering Migration And Discovery Status

`20260710192521_GuardianConsentLifecycle` is the current latest migration. It
builds on `20260710171315_AdminVolunteerApprovalWorkflow`, which added nullable
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
passes a clean 7/7 PostgreSQL-backed regression.

The verified inventory is 106 main migration classes: 77 discoverable by EF and
29 explicitly quarantined legacy classes. The Release discovery gate passes,
EF reports no pending model changes, and all 77 discovered migrations apply to
a blank disposable PostgreSQL database through
`20260710192521_GuardianConsentLifecycle`.

Most quarantined classes contain non-idempotent DDL, so adding metadata blindly
could replay tables or columns against existing databases. Treat those 29
classes as quarantined until migration history and schema state are reconciled
across supported environments. Commit `bcc317e3` keeps the
`MigrationDiscoveryParityTests` gate fail-closed for unclassified classes,
abstract migrations, stale quarantine entries, and migration-id mismatches.

The historical `20260706120000_AddTenantInviteCodes` migration now references
the quoted PostgreSQL principal column `Id` for tenant and user foreign keys
instead of lowercase `id`. This repairs future fresh-chain execution only; it
does not reapply or mutate databases that already recorded that migration. No
production database was inspected or modified for this audit.

`AdminVolunteerApprovalWorkflow.Down()` is intentionally irreversible. Restoring
the former unique application index after valid reapplication history could
fail or require silent data loss, so `Down()` throws before dropping any of the
new constraints or columns. `GuardianConsentLifecycle.Down()` is also
intentionally irreversible because rollback would discard hashed credentials
and restore unsafe legacy status/verification semantics.

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
| `vol_*` | 19 | `vol_logs` is represented for Caring recipient-circle and KPI inputs. The renamed .NET volunteering schema now has migration-backed `ShiftId`/`OrgNote` application state, shared application/group-reservation capacity indexes, canonical notification links, and opportunity-scoped or tenant-wide guardian consent with hashed credentials, canonical lifecycle statuses, safe read indexes, expiry, and cascade cleanup. The prior transactional application/signup/waitlist/group-reservation core passes 61/61 focused tests and the guardian lifecycle passes 7/7. Exact Laravel `vol_*` name aliases and the remaining volunteering schema families still require table-by-table reconciliation. |
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
