# Current ASP.NET Schema Readiness

Last verified: 2026-07-15 20:58 +01:00

Status: **Canonical current - schema pause and restart source; no standalone product score**

<!-- doc-consistency: SCHEMA_CURRENT_PRODUCT_SHA=c767050a3eabd064bdf647695b9699b98186342b -->
<!-- doc-consistency: SCHEMA_CURRENT_RUNTIME_MIGRATIONS=163 -->

Use this page for the one-page schema answer at the 2026-07-15 development
pause. Use [`SCHEMA_PARITY.md`](SCHEMA_PARITY.md) for detailed per-migration
evidence and
[`CURRENT_ASPNET_CONTRACT_STATUS.md`](CURRENT_ASPNET_CONTRACT_STATUS.md) for the
only banked backend score.

## Verdict At The Pause

**The ASP.NET schema is working and partly proved, but it is not complete or
release-certified.** It is inaccurate to say that all schema work was lost or
that the chain is known not to work. It is equally inaccurate to call it ready
for production or for a backend switch.

The contract-correction work exposed a real fresh-chain hole: the EF model and
snapshot already contained `compatibility_audit_entries`, but the runtime
migration chain did not create it. Published product/CI commit
`c767050a3eabd064bdf647695b9699b98186342b` adds runtime migration
`20260715184200_AddCompatibilityAuditEntriesTable`. That repair is present in
source. Its exact-SHA CI build passed, but the migrated Test job reached its
75-minute limit without a terminal test summary. The run concluded
**cancelled**, not green.

Therefore the honest state is:

- migration-chain repair: **implemented and published**;
- focused earlier schema slices: **strong disposable-database evidence**;
- current exact-SHA full suite and CI: **not certified**;
- contract-identical Laravel schema/workflow coverage: **incomplete**;
- production migration or deployed-history proof: **not performed and not
  authorized**.

## Exact Pause Boundary

| Evidence | Pause value | Meaning |
| --- | --- | --- |
| Laravel comparison source | `903d03d3db78bbf87129ad35728be3b72819acaf` | Frozen read-only contract/schema source used by the current inventory. |
| Latest schema expansion branch | `97b8a4a004362aef8356e8d76333f1efc9d44b36` | Nine schema commits later merged into `main` by `df8c8b96`; no longer a separate workstream. |
| Current backend product/schema/CI boundary | `c767050a3eabd064bdf647695b9699b98186342b` | Adds migration 163 and other contract/CI corrections; published but unscored. |
| EF migration classes | 165 | Source classes in the current tree. |
| Runtime-discovered migration IDs | 163 | Applicable chain from `InitialCreate` through `AddCompatibilityAuditEntriesTable`. |
| Intentionally quarantined classes | 2 | `FederationCoreExpansion` is superseded by later DDL; `AddTenantUpdatedAt` would duplicate the initial column. |
| Laravel source table names | 458 | Static source union, not a database dump or completion denominator. |
| ASP.NET represented table names | 440 | Static source union. |
| Exact names | 242/458 (52.8%) | Diagnostic exact-name coverage only. |
| Laravel-only exact names | 216 | 24 classified aliases, 20 compatibility-storage gaps, and 172 unclassified names. |
| ASP.NET-only exact names | 198 | Requires classification; not automatically wrong or useful. |
| Banked backend schema category | 129/150 | Fixed Rubric Baseline 1; later merged work and migration 163 remain unscored. |

Exact-name coverage does not equal contract identity. A differently named
internal table can be acceptable only when the unchanged clients observe the
same contract and the adapter's constraints, upgrades, tenancy, persistence,
side effects, and failure behavior are proved. An unproved alias or
tenant-config compatibility store remains a gap under
[`ADR-0001`](decisions/ADR-0001-contract-identical-backends.md).

## What Is Already Proved

The nine schema commits merged by `df8c8b96` added fifteen exact Laravel table
names. Their retained evidence includes:

- a final-branch blank PostgreSQL 16.4 replay through 162 runtime migrations;
- nine sequential populated upgrades from the 153-ID predecessor through each
  new migration to 162, with representative row-survival and constraint checks;
- 27/27 focused schema tests across the nine slices;
- per-slice Release builds, model-drift gates, tenant/isolation checks, and
  comparator regeneration; and
- disposable container cleanup with no production or Laravel database touched.

Those results remain valuable exact-branch evidence. They do not substitute for
a complete exact-`c767050a` aggregate because migration 163 and later test/CI
behavior are outside that earlier package.

For current `c767050a`, GitHub Actions run
[`29441392036`](https://github.com/jasperfordesq-ai/api.project-nexus.net/actions/runs/29441392036)
reported:

- `Build`: passed;
- frozen legacy React type-check/build: passed, but this is operational CI and
  does not reopen that frontend for development;
- `Test`: cancelled at the 75-minute job limit while the migrated PostgreSQL
  run was still executing; no terminal test summary was produced;
- coverage merge: failed after the cancelled test step; and
- Docker build/publish: skipped.

The test log exercised migration-installed constraints and triggers after
startup, which is evidence that the blank chain progressed beyond migration
application. Without a terminal summary it is not a full-suite pass.

## What Is Still Missing

Before the schema can be called current-lineage certified, the next schema
session must complete one exact-SHA package:

1. add focused source/runtime tests for
   `AddCompatibilityAuditEntriesTable` and its constraints/indexes;
2. rerun migration discovery and `has-pending-model-changes` on the exact
   candidate SHA;
3. migrate a fresh verified disposable PostgreSQL database from zero through
   all 163 IDs and assert the final model-critical objects;
4. migrate a second disposable populated database from migration 162 through
   163 and prove row survival, defaults, indexes, foreign keys, and rejection
   behavior;
5. rerun the static comparator at named Laravel and ASP.NET SHAs and classify
   the 216 missing exact names by contract/workflow significance;
6. run the complete relevant suite and exact-SHA CI to a terminal green result,
   without replacing a timeout with a partial-test claim; and
7. only then perform a fixed-rubric scoring transaction if evidence closes a
   deduction.

Production remains a separate authorization and evidence gate. No pause audit
inspected or changed production schema, and no generic production migration
command is published here.

## Safe Recommission Sequence

Do not start this sequence merely because the repository was opened. First get
explicit user authorization to resume development and read the project pause
handoff. Use an isolated worktree from then-current `origin/main` with exclusive
ownership of schema files.

Establish the exact boundary:

```powershell
git status --short --branch
git rev-parse HEAD
git rev-parse origin/main
git worktree list --porcelain
git -C C:\platforms\htdocs\staging rev-parse HEAD
```

Set `ConnectionStrings__DefaultConnection` only to a verified fresh,
run-owned PostgreSQL 16.4 database whose name begins `nexus_`. Then run:

```powershell
dotnet tool restore
dotnet build src/Nexus.Api/Nexus.Api.csproj --configuration Release
dotnet ef migrations list --project src/Nexus.Api --startup-project src/Nexus.Api --configuration Release --no-build
dotnet ef migrations has-pending-model-changes --project src/Nexus.Api --startup-project src/Nexus.Api --configuration Release --no-build
dotnet ef database update --project src/Nexus.Api --startup-project src/Nexus.Api --configuration Release --no-build
dotnet test tests/Nexus.Api.Tests/Nexus.Api.Tests.csproj --configuration Release --filter "FullyQualifiedName~MigrationDiscoveryParityTests|FullyQualifiedName~SchemaParityTests"
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/test-compare-laravel-schema-parity.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/compare-laravel-schema-parity.ps1
```

Use a second disposable database for the populated 162-to-163 upgrade. Review
and seed representative rows before applying only the final migration. Record
the exact commands, SHAs, row/constraint assertions, and cleanup result in the
same coherent implementation/evidence transaction.

Never point these commands at a production, shared, Laravel, or
production-derived database. A matching database-name prefix is not proof of
disposability.

## First Schema Tasks In The Next Phase

1. Close and certify the migration-163 evidence package above.
2. Refresh the 216-name classification and prioritize consumer-visible or
   integrity-critical gaps rather than chasing table-count movement.
3. Replace compatibility-storage rows with native durable aggregates where the
   Laravel workflow requires append-only history, relational constraints,
   concurrency, or audit evidence.
4. Pair every schema slice with its API/workflow contract and both unchanged
   frontend consumers; a table alone cannot close contract identity.
5. Keep the bank at 129/150 until the canonical backend status accepts a scored
   exact-SHA transaction.
