# Schema Parity Map

Last reviewed: 2026-07-03

Laravel source of truth: `C:\platforms\htdocs\staging\database\migrations` and
`C:\platforms\htdocs\staging\app\Models`.

## Current Source Counts

Generated with `scripts/compare-laravel-schema-parity.ps1` on 2026-07-04.

| Source | Count | Notes |
| --- | ---: | --- |
| Laravel migrations | 318 | PHP migration files under `database/migrations`. |
| ASP.NET EF migrations | 85 | Committed EF migration classes, excluding `.Designer.cs` and model snapshot files. |
| Laravel created tables | 215 | Unique `Schema::create(...)` table names. |
| Laravel touched tables | 102 | Unique `Schema::table(...)` table names. |
| Laravel explicit model tables | 195 | Unique `protected/public $table = ...` model declarations. |
| Laravel source tables | 361 | Union of migration-created, migration-touched, and explicit model tables. |
| ASP.NET tables | 309 | Union of EF `ToTable(...)`, `[Table(...)]`, and migration `CreateTable(...)` names. |
| Exact matched tables | 119 | Static name matches only. |
| Missing Laravel tables | 242 | Laravel source tables with no exact .NET table name. |
| Extra ASP.NET tables | 190 | .NET table names with no exact Laravel table name. |

These counts are not a parity score. Static table-name matching will overstate
some gaps where .NET intentionally renamed tables, for example Laravel `vol_*`
tables versus .NET `volunteer_*` tables. Those aliases still need explicit
triage and compatibility decisions before any table can be marked equivalent.

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
| `caring_*` | 1 | Caring Community and KISS schema remains a backend gap; `caring_emergency_alerts`, `caring_federation_peers`, `caring_sub_regions`, `caring_care_providers`, `caring_caregiver_links`, `caring_cover_requests`, `caring_support_relationships`, `caring_tandem_suggestion_log`, `caring_help_requests`, `caring_project_announcements`, `caring_project_updates`, `caring_project_subscriptions`, `caring_smart_nudges`, `caring_paper_onboarding_intakes`, `caring_favours`, `caring_municipality_feedback`, `caring_trust_tier_config`, `municipality_surveys`, `municipality_survey_questions`, `municipality_survey_responses`, `caring_hour_estates`, `caring_hour_transfers`, `caring_hour_gifts`, `caring_kiss_treffen`, `caring_invite_codes`, `caring_kpi_baselines`, `caring_loyalty_redemptions`, `caring_regional_point_accounts`, `caring_regional_point_transactions`, `caring_research_partners`, `caring_research_consents`, and `caring_research_dataset_exports` are now represented in .NET. Remaining exact-name caring gap is `caring_support_categories`. Laravel's shared `categories.substitution_coefficient`, `users.trust_tier`, `safeguarding_reports`, and `safeguarding_report_actions` are also represented. Success stories intentionally use tenant-config key `caring.success_stories` to mirror Laravel's tenant-setting storage. |
| `vol_*` | 19 | `vol_logs` is now represented for Caring recipient-circle and KPI inputs; the rest of volunteering may include renamed .NET equivalents and still requires alias mapping. |
| `federation_*` | 17 | Federation and partner/network schema needs detailed reconciliation. |
| `course_*` | 15 | Course module has no clear .NET implementation surface. |
| `job_*` | 13 | Job schema is partially present but not exact-name complete. |
| `marketplace_*` | 6 | Marketplace implementation is materially incomplete; `marketplace_seller_loyalty_settings` and `marketplace_seller_regional_point_settings` are now represented for the Caring loyalty and regional-points bridges. |
| `podcast*` | 7 | Podcast module remains a full schema/module gap. |
| `verein_*` | 5 | `verein_federation_consents` is now represented for municipality events-calendar sharing; the remaining Verein/Clubs schema still needs real domain schema and workflow parity. |
| `regional_*` | 4 | Regional analytics remains a schema and service gap. |

## Acceptance Criteria For Schema Parity

- Every Laravel table is matched exactly, mapped to a documented .NET alias, or
  replaced by a documented equivalent .NET workflow.
- Every alias has migration evidence and tests covering the external workflow
  that depends on it.
- Formerly excluded module tables are treated as gaps until implemented or
  explicitly superseded by a product decision.
- EF migrations, entity configurations, and tenant isolation tests are updated
  together for each schema batch.
