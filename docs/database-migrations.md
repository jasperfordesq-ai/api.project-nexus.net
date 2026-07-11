# Database Migration Workflow

Last reviewed: 2026-07-11

## Overview

All database schema changes go through a single canonical workflow. This prevents schema drift between local development and production environments.

**Golden Rule: Never modify the production database directly. All changes flow through migrations committed to git.**

## Current Runtime Chain And Replay Evidence

EF currently discovers 110 migration IDs. The latest is
`20260711143546_VolunteerQrAttendanceParity`. The runtime inventory was
repaired by restoring explicit `[Migration]` and `[DbContext]` metadata to 27
essential designer-less migrations, including
`20260303120000_AddAiMessageTenantId`. A `.Designer.cs` file is not itself the
discovery contract. Do not add metadata to another legacy class merely to make
a count move: first prove that its DDL is not duplicated elsewhere and that
every supported database history can accept it. In particular,
`20260307181700_FederationCoreExpansion` remains outside the runtime chain
because `20260307195033_Phase38to40_JobsKBLegal` is its full schema superset;
discovering both would attempt duplicate table creation.
`20260305120000_AddTenantUpdatedAt` also remains outside the runtime chain
because `InitialCreate` already creates `tenants.UpdatedAt`; discovering it
would attempt to add the same column again.

Current non-production evidence is:

- `dotnet ef migrations has-pending-model-changes --no-build` reports no model
  changes since the latest migration;
- a clean recreated database applies all 110 discovered IDs from
  `20260202085043_InitialCreate` through
  `20260711143546_VolunteerQrAttendanceParity`. Migration history has 110
  rows; `ai_messages.TenantId` is non-nullable and its tenant index and foreign
  key each exist;
- a populated database stopped at the preceding 109-ID migration upgrades to
  110 successfully. Historical checked-out and checked-in rows receive the
  deterministic status/`UpdatedAt = CreatedAt` backfill; historical QR tokens
  and coordinator IDs remain null; `HoursLogged` and `TransactionId` evidence
  remains untouched;
- separate clones containing duplicate tenant/shift/user attendance or
  cross-tenant relationship evidence fail the latest migration preflight. Each
  history remains at 109 and none of the latest DDL is installed. The migration
  does not merge evidence, partially apply, or guess a repair;
- all disposable databases and the uniquely named PostgreSQL container used for
  this proof were removed. No production database or container was touched.

`20260711143546_VolunteerQrAttendanceParity` adds nullable 64-character QR
tokens and coordinator identities, required attendance status/updated evidence,
a global filtered unique QR-token index, and a unique tenant/shift/user
attendance index. It backfills `checked_out`, then `checked_in`, then `pending`
from existing timestamps and copies `CreatedAt` to `UpdatedAt`, while preserving
null historical tokens/coordinators and legacy `HoursLogged`/`TransactionId`.
Tenant-composite attendance relationships and the application
tenant/opportunity/shift foreign key reject cross-tenant or cross-opportunity
assignments. The volunteer-organisation membership role constraint now accepts
`owner`, `admin`, `manager`, `coordinator`, or `member`. Duplicate attendance
and orphan/cross-tenant relationship preflights abort before DDL because legacy
hours/transaction evidence cannot be merged safely.

The preceding `20260711100817_LoyaltyEstateOrganisationEvidence` adds authoritative,
tenant-composite ledger links for Caring loyalty redemption/reversal and hour
estate settlement evidence. It also replaces generic organisation, membership,
wallet, and wallet-transaction relationships with tenant-composite keys,
enforces one membership per tenant/organisation/user, and restricts membership
roles to `owner`, `admin`, `member`, or `volunteer`. Its preflight aborts on
cross-tenant owners, members, wallets, wallet transactions, transaction users,
or unknown roles. It only normalizes casing/whitespace for known role values.
The migration is intentionally irreversible because silently removing financial
evidence or tenant constraints would be unsafe.

The preceding `20260711083852_WalletLedgerFederationPartnerParity` makes both
relationships in the main .NET `transactions` ledger nullable so canonical
one-sided debits and credits do not require fabricated users. It adds explicit
transaction types and participant-specific history-hide flags, hardens
federation transaction provenance, stores durable partner access-token state,
and adds reservation/settlement evidence for Caring hour gifts. Its data
conversion fails closed on ambiguous federation links or invalid pending gift
provenance.

The preceding `20260711010201_VolunteerOrganisationRelationshipsParity` creates
the canonical `vol_organizations`, `org_members`,
and `vol_org_transactions` tables, adds a nullable
`volunteer_opportunities.organization_id`, and enforces tenant-composite owner,
membership, and opportunity relationships. It performs no organisation
backfill. The opportunity foreign key uses non-destructive `RESTRICT`; the
nullable transaction `vol_log_id` remains a scalar because the discovered
runtime chain does not create the referenced Laravel `vol_logs` table. A
filtered unique `(tenant_id, vol_log_id, type)` index still prevents duplicate
payments, and the nullable transaction user relationship is tenant-composite.
Discovered-chain-only installs expose zero-hour aggregates until the legacy
`vol_logs` history is reconciled. Existing NULL-linked opportunities require an
explicit operator mapping; never backfill from the user-valued `OrganizerId`.

The preceding `20260710221715_RecurringShiftPatternCrudParity` migration makes
the canonical recurring-pattern creator and unsigned capacity fields explicit.
`20260710211122_RecurringShiftGenerationParity` replaces the recurring-pattern
tenant index with a tenant/active/end-date sweep index and adds a filtered
unique generated-shift key on tenant, pattern, and exact start time. The latter
fails before index creation if duplicate historical occurrences exist; it never
chooses a shift to delete because linked operational history may already depend
on either row.

The preceding `20260710192521_GuardianConsentLifecycle` migration adds guardian
phone, consent IP, a unique nullable SHA-256 token hash, required
relationship storage, canonical lifecycle-status cleanup, safe read indexes,
and a cascade minor-user relationship. It expires unverifiable legacy pending/
active rows and removes orphan minor rows before enforcing the new constraint.
The preceding `20260710171315_AdminVolunteerApprovalWorkflow` migration added
application `ShiftId`/`OrgNote`, notification `Link`, opportunity-scoped expiry,
and the indexes and `SET NULL` foreign keys used by transactional volunteering
capacity checks. The latest test-project build has zero errors and four
pre-existing `xUnit1031` warnings. Migration discovery, the 32/32 QR attendance
suite, 1/1 persistence-failure regression, 12/12 shift-swap suite, 5/5
route/auth subset, 90/90 affected-module gate, and the ambient-transaction
regression are green. These focused sets do not replace a clean full-suite run.
Descendant CI run `29154079189` was later cancelled after its completed
Integration Tests job reported 51 failures out of 2,888 tests; only its nested-transaction
failure was a direct regression from the preceding `bfeafb2e` slice, and that
case is fixed and green locally. Do not report CI green from this evidence.

Before applying `RecurringShiftGenerationParity`, inventory duplicate rows by
`("TenantId", "RecurringPatternId", "StartsAt")` where the pattern id is not
null. Reconcile any duplicates and their linked check-ins, applications,
reservations, waitlist entries, and other history explicitly before retrying.

Before applying `GuardianConsentLifecycle` to production, take the normal
pre-migration backup and review affected-row counts. The migration deliberately
expires legacy pending/active rows that cannot prove guardian possession of a
credential and removes consent rows whose minor user no longer exists.

`AdminVolunteerApprovalWorkflow` deliberately changes the tenant/opportunity/
user application index from unique to non-unique. Declined or withdrawn history
can therefore be retained when a volunteer reapplies. Its `Down()` method
intentionally throws before any destructive operation because recreating the
former unique index could fail after valid use or require data loss.

The historical `20260706120000_AddTenantInviteCodes` migration now uses the
quoted PostgreSQL principal column `Id`, not lowercase `id`, for its tenant and
user foreign keys. This repairs future fresh installs; databases that already
recorded the migration are not changed or replayed.

Migration discovery must continue to fail closed if a new source migration is
invisible to EF, a deliberately excluded overlapping migration becomes
discoverable, or an intended migration ID no longer matches its type. A green
blank replay certifies all 110 IDs that EF discovers. Discovery does not
authorize replaying either intentionally excluded duplicate.

## Read-Only Legacy Financial Audit

The following PostgreSQL report is deliberately read-only and is intended for
an operator working on a database already upgraded through
`20260711143546_VolunteerQrAttendanceParity`. It identifies candidates;
it does not decide their meaning. Do not auto-fix, relink, delete, cancel, or
recreate any returned row. Each row needs a documented manual disposition that
states the intended business event, the existing sender/receiver balance
impact, the proposed balance impact (if any), and the evidence used to justify
that decision. Take the normal backup before any later approved remediation.

```sql
BEGIN TRANSACTION READ ONLY;

-- 1. Legacy self-transfers, admin grants, and starting-balance grants.
--    The delta columns show how the present ledger affects balances.
SELECT
    t."TenantId" AS tenant_id,
    t."Id" AS transaction_id,
    CASE
        WHEN t."SenderId" IS NOT NULL AND t."SenderId" = t."ReceiverId" THEN 'self_transfer'
        WHEN t."TransactionType" = 'starting_balance'
          OR t."Description" IN ('Starting balance', 'Starting balance credit')
          OR t."Description" LIKE '[Welcome Bonus]%' THEN 'starting_balance'
        ELSE 'possible_admin_grant'
    END AS candidate_kind,
    t."SenderId" AS sender_id,
    t."ReceiverId" AS receiver_id,
    t."Amount" AS amount,
    CASE WHEN t."Status" = 'Completed' AND t."SenderId" IS NOT NULL THEN -t."Amount" ELSE 0 END AS current_sender_delta,
    CASE WHEN t."Status" = 'Completed' AND t."ReceiverId" IS NOT NULL THEN t."Amount" ELSE 0 END AS current_receiver_delta,
    t."TransactionType" AS transaction_type,
    t."Status" AS status,
    t."Description" AS description,
    t."CreatedAt" AS created_at,
    'MANUAL_DISPOSITION_REQUIRED_NO_AUTO_FIX' AS disposition
FROM transactions AS t
WHERE t."SenderId" = t."ReceiverId"
   OR t."TransactionType" IN ('admin_grant', 'starting_balance')
   OR t."Description" IN ('Admin grant', 'Starting balance', 'Starting balance credit')
   OR t."Description" ILIKE '%admin%grant%'
   OR t."Description" LIKE '[Welcome Bonus]%'
ORDER BY t."TenantId", t."CreatedAt", t."Id";

-- 1b. Organisation-wallet admin grants. Review the initiating actor and the
--     recorded running balance; do not assume Category alone proves authority.
SELECT
    tx."TenantId" AS tenant_id,
    wallet."OrganisationId" AS organisation_id,
    tx."Id" AS org_wallet_transaction_id,
    tx."InitiatedById" AS initiated_by_user_id,
    tx."Amount" AS amount,
    tx."BalanceAfter" AS recorded_balance_after,
    wallet."Balance" AS current_wallet_balance,
    tx."Amount" AS expected_org_wallet_delta,
    tx."Description" AS description,
    tx."CreatedAt" AS created_at,
    'MANUAL_DISPOSITION_REQUIRED_NO_AUTO_FIX' AS disposition
FROM org_wallet_transactions AS tx
JOIN org_wallets AS wallet
  ON wallet."TenantId" = tx."TenantId"
 AND wallet."Id" = tx."OrgWalletId"
WHERE tx."Category" = 'admin_grant'
ORDER BY tx."TenantId", wallet."OrganisationId", tx."CreatedAt", tx."Id";

-- 2. Starting-balance configuration precedence. The API uses
--    wallet.starting_balance first, then general.welcome_credits, then 5.
WITH settings AS (
    SELECT
        tenant."Id" AS tenant_id,
        MAX(config."Value") FILTER (WHERE config."Key" = 'wallet.starting_balance') AS primary_value,
        MAX(config."Value") FILTER (WHERE config."Key" = 'general.welcome_credits') AS legacy_value
    FROM tenants AS tenant
    LEFT JOIN tenant_configs AS config
      ON config."TenantId" = tenant."Id"
     AND config."Key" IN ('wallet.starting_balance', 'general.welcome_credits')
    GROUP BY tenant."Id"
)
SELECT
    tenant_id,
    primary_value,
    legacy_value,
    COALESCE(primary_value, legacy_value, '5') AS selected_raw_value,
    CASE
        WHEN primary_value IS NOT NULL AND legacy_value IS NOT NULL
             AND primary_value IS DISTINCT FROM legacy_value THEN 'conflicting_values'
        WHEN COALESCE(primary_value, legacy_value) IS NULL THEN 'default_5_applies'
        WHEN COALESCE(primary_value, legacy_value) ~ '^\s*-' THEN 'negative_value_clamps_to_0'
        WHEN COALESCE(primary_value, legacy_value) !~ '^\s*[+]?[0-9]+([.][0-9]+)?\s*$' THEN 'noncanonical_value_requires_runtime_parse_review'
        ELSE 'review_current_value'
    END AS candidate_reason,
    'CONFIG_ONLY_NO_BALANCE_CHANGE_UNTIL_A_GRANT_IS_WRITTEN' AS balance_impact,
    'MANUAL_DISPOSITION_REQUIRED_NO_AUTO_FIX' AS disposition
FROM settings
ORDER BY tenant_id;

-- 3. Loyalty rows without valid authoritative debit/refund links.
SELECT
    r."TenantId" AS tenant_id,
    r."Id" AS redemption_id,
    r."Status" AS redemption_status,
    r."MemberUserId" AS member_user_id,
    r."CreditsUsed" AS credits_used,
    r."RedemptionTransactionId" AS debit_transaction_id,
    debit."Id" AS valid_debit_id,
    r."ReversalTransactionId" AS refund_transaction_id,
    refund."Id" AS valid_refund_id,
    -r."CreditsUsed" AS expected_applied_member_delta,
    CASE WHEN r."Status" = 'reversed' THEN 0 ELSE -r."CreditsUsed" END AS expected_net_member_delta,
    'MANUAL_DISPOSITION_REQUIRED_NO_AUTO_LINK_OR_BALANCE_CHANGE' AS disposition
FROM caring_loyalty_redemptions AS r
LEFT JOIN transactions AS debit
  ON debit."TenantId" = r."TenantId"
 AND debit."Id" = r."RedemptionTransactionId"
 AND debit."SenderId" = r."MemberUserId"
 AND debit."ReceiverId" IS NULL
 AND debit."Amount" = r."CreditsUsed"
 AND debit."TransactionType" = 'caring_loyalty_adapter'
 AND debit."Status" = 'Completed'
LEFT JOIN transactions AS refund
  ON refund."TenantId" = r."TenantId"
 AND refund."Id" = r."ReversalTransactionId"
 AND refund."SenderId" IS NULL
 AND refund."ReceiverId" = r."MemberUserId"
 AND refund."Amount" = r."CreditsUsed"
 AND refund."TransactionType" = 'caring_loyalty_adapter'
 AND refund."Status" = 'Completed'
WHERE r."RedemptionTransactionId" IS NULL
   OR debit."Id" IS NULL
   OR (r."Status" = 'reversed' AND (r."ReversalTransactionId" IS NULL OR refund."Id" IS NULL))
ORDER BY r."TenantId", r."Id";

-- 4. Settled hour estates that lack valid settlement evidence.
SELECT
    e.tenant_id,
    e.id AS estate_id,
    e.member_user_id,
    e.beneficiary_user_id,
    e.policy_action,
    e.settled_hours,
    e.settlement_transaction_id,
    ledger."Id" AS valid_settlement_transaction_id,
    -e.settled_hours AS expected_member_delta,
    CASE WHEN e.policy_action = 'transfer_to_beneficiary' THEN e.settled_hours ELSE 0 END AS expected_beneficiary_delta,
    'MANUAL_DISPOSITION_REQUIRED_NO_AUTO_LINK_OR_BALANCE_CHANGE' AS disposition
FROM caring_hour_estates AS e
LEFT JOIN transactions AS ledger
  ON ledger."TenantId" = e.tenant_id
 AND ledger."Id" = e.settlement_transaction_id
 AND ledger."SenderId" = e.member_user_id
 AND ledger."ReceiverId" IS NOT DISTINCT FROM
     (CASE WHEN e.policy_action = 'transfer_to_beneficiary' THEN e.beneficiary_user_id ELSE NULL END)
 AND ledger."Amount" = e.settled_hours
 AND ledger."TransactionType" = 'caring_hour_estate_adapter'
 AND ledger."Status" = 'Completed'
WHERE e.status = 'settled'
  AND COALESCE(e.settled_hours, 0) > 0
  AND (e.settlement_transaction_id IS NULL OR ledger."Id" IS NULL)
ORDER BY e.tenant_id, e.id;

-- 5. Same-platform Caring hour transfers have reciprocal tracking rows but no
--    authoritative transaction-id columns. Never choose a match solely by
--    amount or timestamp proximity.
SELECT
    source.tenant_id AS source_tenant_id,
    source.id AS source_transfer_id,
    source.member_user_id AS source_member_id,
    source.hours_transferred,
    destination.tenant_id AS destination_tenant_id,
    destination.id AS destination_transfer_id,
    destination.member_user_id AS destination_member_id,
    source_matches.match_count AS source_ledger_candidate_count,
    source_matches.transaction_ids AS source_ledger_candidate_ids,
    destination_matches.match_count AS destination_ledger_candidate_count,
    destination_matches.transaction_ids AS destination_ledger_candidate_ids,
    -source.hours_transferred AS expected_source_member_delta,
    source.hours_transferred AS expected_destination_member_delta,
    'MANUAL_DISPOSITION_REQUIRED_NO_AUTO_LINK_OR_BALANCE_CHANGE' AS disposition
FROM caring_hour_transfers AS source
LEFT JOIN caring_hour_transfers AS destination
  ON destination.id = source.linked_transfer_id
 AND destination.linked_transfer_id = source.id
 AND destination.role = 'destination'
LEFT JOIN LATERAL (
    SELECT COUNT(*)::integer AS match_count,
           ARRAY_AGG(t."Id" ORDER BY t."CreatedAt", t."Id") AS transaction_ids
    FROM transactions AS t
    WHERE t."TenantId" = source.tenant_id
      AND t."SenderId" = source.member_user_id
      AND t."ReceiverId" IS NULL
      AND t."Amount" = source.hours_transferred
      AND t."Status" = 'Completed'
      AND t."Description" LIKE '[hour_transfer_out]%'
) AS source_matches ON TRUE
LEFT JOIN LATERAL (
    SELECT COUNT(*)::integer AS match_count,
           ARRAY_AGG(t."Id" ORDER BY t."CreatedAt", t."Id") AS transaction_ids
    FROM transactions AS t
    WHERE destination.id IS NOT NULL
      AND t."TenantId" = destination.tenant_id
      AND t."SenderId" IS NULL
      AND t."ReceiverId" = destination.member_user_id
      AND t."Amount" = destination.hours_transferred
      AND t."Status" = 'Completed'
      AND t."Description" LIKE '[hour_transfer_in]%'
) AS destination_matches ON TRUE
WHERE source.role = 'source'
  AND source.status = 'completed'
ORDER BY source.tenant_id, source.id;

-- 6. Federated hour transfers whose recorded link is absent or no longer has
--    the exact tenant/user/amount/direction shape required by the migration.
SELECT
    f."TenantId" AS tenant_id,
    f."Id" AS federated_transfer_id,
    f."Direction" AS direction,
    f."LocalUserId" AS local_user_id,
    f."Amount" AS amount,
    f."LocalTransactionId" AS recorded_transaction_id,
    ledger."Id" AS valid_transaction_id,
    CASE WHEN f."Direction" = 'Outbound' THEN -f."Amount" ELSE f."Amount" END AS expected_local_user_delta,
    'MANUAL_DISPOSITION_REQUIRED_NO_AUTO_LINK_OR_BALANCE_CHANGE' AS disposition
FROM federated_hour_transfers AS f
LEFT JOIN transactions AS ledger
  ON ledger."TenantId" = f."TenantId"
 AND ledger."Id" = f."LocalTransactionId"
 AND ledger."Amount" = f."Amount"
 AND ledger."Status" = 'Completed'
 AND ((f."Direction" = 'Outbound' AND ledger."SenderId" = f."LocalUserId" AND ledger."ReceiverId" IS NULL)
   OR (f."Direction" = 'Inbound' AND ledger."ReceiverId" = f."LocalUserId" AND ledger."SenderId" IS NULL))
WHERE f."Status" = 'Reconciled'
  AND (f."LocalTransactionId" IS NULL OR ledger."Id" IS NULL)
ORDER BY f."TenantId", f."Id";

ROLLBACK;
```

```
Edit Entity/DbContext → make migrate → Test → PR → CI Gate → Merge → Deploy → make migrate-prod
```

## Prerequisites

- Docker Compose running locally (`docker compose up -d`)
- `make` available (Git Bash on Windows, native on macOS/Linux)
- For production commands: `NEXUS_DEPLOY_HOST` environment variable set
- EF Core CLI tools installed in the API Docker container (already included)

## Quick Reference

| Command | What it does |
|---------|-------------|
| `make migrate NAME=AddFeature` | Create + apply a migration locally |
| `make migrate-apply` | Apply pending migrations locally |
| `make migrate-status` | Show local migration status |
| `make migrate-prod` | Apply pending migrations on production (with backup) |
| `make backup-prod-db` | Backup production database |
| `make drift-check` | Compare local vs production migration state |

## Step-by-Step Workflow

### 1. Make Your Schema Changes

Edit entity files in `src/Nexus.Api/Entities/` or the `NexusDbContext.cs`.

### 2. Create a Migration

```bash
make migrate NAME=AddUserPreferences
```

This will:
1. Run `dotnet ef migrations add` inside the API container
2. Generate migration files in `src/Nexus.Api/Migrations/`
3. Apply the migration to your local database

**Migration naming convention:** Use PascalCase descriptive names that explain the change:
- `AddUserPreferences` - adding new tables/columns
- `AddIndexOnEmail` - performance changes
- `RemoveDeprecatedFields` - removal of old schema
- `RenameStatusToState` - renaming operations

### 3. Review the Generated Migration

Always review the generated files before committing:

```bash
# Check what SQL will be generated
make migrate-script
```

Look for:
- Unintended table/column drops
- Missing index additions
- Correct nullable/default values

### 4. Test Locally

```bash
# Rebuild and restart API
make rebuild

# Run integration tests
make test
```

### 5. Commit and Push

```bash
git add src/Nexus.Api/Migrations/
git commit -m "migration: add user preferences table"
git push
```

### 6. CI Validates Your PR

The PR Quality Gate workflow automatically:
- **Builds** the project
- **Runs tests** against a fresh PostgreSQL database
- **Verifies migration discovery** - fails on an unclassified or accidentally restored migration class
- **Checks for pending model changes** - fails if you changed entities without a migration
- **Applies all migrations** to verify they execute cleanly
- **Warns** if entity files changed but no migration was added

The discovery gate must cover every compiled migration subclass and keep any
reviewed overlapping source explicitly outside the runtime chain. It prevents a
new class from becoming silently invisible, but it does not make duplicate DDL
safe. The successful blank `database update` certifies all 110 discovered IDs,
not every migration-shaped source file or either intentionally excluded
duplicate.

### 7. Deploy to Production

After merge to `main`:

```bash
# Option A: Automated (GitHub Actions deploy workflow handles it)
# Migrations apply automatically during deployment

# Option B: Manual migration (if needed)
export NEXUS_DEPLOY_HOST=azureuser@your-server
make migrate-prod
```

`make migrate-prod` will:
1. Ask for confirmation (type `YES`)
2. Create a pre-migration backup
3. Apply pending migrations
4. Run a health check

## Drift Detection

### What is Schema Drift?

Schema drift occurs when the database schema doesn't match what the codebase expects. Common causes:
- Applying migrations directly on production without committing them
- Forgetting to create a migration after editing entities
- Different migration histories between environments

### Running the Drift Check

```bash
# Local only (checks model vs last migration)
make drift-check

# Full comparison with production
export NEXUS_DEPLOY_HOST=azureuser@your-server
make drift-check
```

The drift check verifies:
1. **Model consistency** - DbContext matches the last migration snapshot
2. **Local migration list** - all migrations present in codebase
3. **Production comparison** - identifies pending or extra migrations on production

### CI Drift Prevention

The PR workflow prevents drift from entering `main`:

| Check | Severity | What it catches |
|-------|----------|----------------|
| Migration discovery quarantine | **Error** (blocks merge) | New invisible migrations, abstract migration classes, stale quarantine entries, and migration-id mismatches |
| Pending model changes | **Error** (blocks merge) | Entity changes without migration |
| Migrations apply cleanly | **Error** (blocks merge) | Broken/conflicting migrations |
| Entity changes without migration files | **Warning** | Possible missing migration |

## Production Safety

### Automatic Backups

- **Pre-deployment backup**: Created before every deployment (GitHub Actions)
- **Pre-migration backup**: Created by `make migrate-prod` before applying
- **Daily scheduled backup**: Runs at 03:00 UTC via GitHub Actions
- **Manual backup**: `make backup-prod-db`

### Rollback

If a migration causes issues in production:

1. **Restore from backup:**
   ```bash
   # SSH to production
   ssh -i ~/.ssh/project-nexus.pem azureuser@your-server
   cd /opt/nexus-backend

   # List available backups
   ls -la backups/

   # Restore (replace filename with actual backup)
   gunzip -c backups/pre_migrate_20260222_120000.sql.gz | \
     sudo docker compose exec -T db psql -U postgres -d nexus_prod
   ```

2. **Revert the migration code** and redeploy (preferred over manual DB changes).

`20260710171315_AdminVolunteerApprovalWorkflow` cannot be rolled back with an
automatic down-migration: its `Down()` throws before changing schema because
restoring the former unique volunteer-application index is not data-safe after
legitimate reapplications. Use a tested forward remediation or restore the
pre-migration backup instead.

`20260710192521_GuardianConsentLifecycle` is also intentionally irreversible:
its `Down()` throws before changing schema because rollback would discard
hashed guardian credentials and restore unsafe legacy status and verification
semantics. Use a tested forward remediation or restore the pre-migration backup.

`20260711143546_VolunteerQrAttendanceParity` is intentionally forward-only.
Its `Down()` throws before changing schema because a downgrade would discard QR
token, attendance-status, and coordinator evidence and would make pending
attendance timestamps non-nullable. Restore a tested pre-migration backup or
apply a reviewed forward remediation; do not force the `Down()` path or
manually drop its evidence-preserving columns and constraints.

`20260710211122_RecurringShiftGenerationParity` has a data-preserving `Down()`:
it removes the filtered occurrence and active-pattern indexes and restores the
former simple recurring-pattern tenant index.

`20260711083852_WalletLedgerFederationPartnerParity` and
`20260711100817_LoyaltyEstateOrganisationEvidence` are also intentionally
irreversible. Their one-sided ledger semantics, financial evidence links,
partner-token storage, and tenant-composite organisation constraints cannot be
removed without changing balances, dropping provenance, or weakening tenant
isolation. Use a reviewed forward remediation or restore the pre-migration
backup; do not improvise a down migration.

### Connection Strings

Connection strings are **never** stored in the repository. They are provided via:

| Environment | How connection string is set |
|-------------|----------------------------|
| Local dev | `compose.yml` environment variables |
| CI/CD | GitHub Actions workflow environment |
| Production | `.env` file or `compose.override.yml` on the server |
| Tests | Testcontainers (auto-configured) |

## Troubleshooting

### "DbContext has changes not captured in a migration"

Your entity files have been modified but no migration exists for the changes.

```bash
make migrate NAME=DescriptiveName
```

### "Migration failed to apply"

The migration SQL has an error. Check the generated migration code:

```bash
# View the migration
cat src/Nexus.Api/Migrations/<timestamp>_<Name>.cs

# If the migration hasn't been applied anywhere yet, remove it
make migrate-rollback

# Fix the entity/DbContext issue, then recreate
make migrate NAME=FixedName
```

### "Production has migrations not in local codebase"

Someone applied a migration directly to production. This is dangerous.

1. Get the migration files from production
2. Add them to the local codebase
3. Commit and push
4. Ensure all environments are in sync

### "Entity changes detected but no migration in PR" (CI warning)

Not all entity file changes require migrations (e.g., adding a `[NotMapped]` property). If the change doesn't affect the database schema, the warning can be safely ignored. If it does, create a migration.

## Architecture Notes

- **Development**: Migrations auto-apply on startup (`Program.cs` calls `MigrateAsync()`)
- **Production**: Migrations must be applied explicitly via `make migrate-prod` or deployment
- **Testing**: Uses Testcontainers with a fresh database per test run
- **EF Core tools** run inside the Docker container to match the exact runtime environment
- **PostgreSQL 16.4** is used in all environments (local, CI, production)
