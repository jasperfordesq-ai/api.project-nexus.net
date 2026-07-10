# Database Migration Workflow

Last reviewed: 2026-07-10

## Overview

All database schema changes go through a single canonical workflow. This prevents schema drift between local development and production environments.

**Golden Rule: Never modify the production database directly. All changes flow through migrations committed to git.**

## Current Discovery Quarantine

The repository currently contains 107 main `Migration` classes. EF Release
discovery verifies 78 while the known legacy quarantine remains 29 classes.
Two designer-less migrations are
valid because they carry inline `[Migration]` and `[DbContext]` metadata; a
`.Designer.cs` file is not itself the contract.

Most quarantined classes contain non-idempotent DDL. Adding missing attributes
or designers without reconciling every supported database's migration history
could replay tables or columns that already exist. Do not restore discovery
metadata blindly. First inventory the source class, intended migration id,
schema effects, and each supported environment's history/schema state. No
production inspection or change is implied by the source audit.

`20260710211122_RecurringShiftGenerationParity` is the current latest
migration. It replaces the recurring-pattern tenant index with a
tenant/active/end-date sweep index and adds a filtered unique generated-shift
key on tenant, pattern, and exact start time. The migration fails before index
creation if duplicate historical occurrences exist; it never chooses a shift
to delete because linked operational history may already depend on either row.

The preceding `20260710192521_GuardianConsentLifecycle` migration adds guardian
phone, consent IP, a unique nullable SHA-256 token hash, required
relationship storage, canonical lifecycle-status cleanup, safe read indexes,
and a cascade minor-user relationship. It expires unverifiable legacy pending/
active rows and removes orphan minor rows before enforcing the new constraint.
The preceding `20260710171315_AdminVolunteerApprovalWorkflow` migration added
application `ShiftId`/`OrgNote`, notification `Link`, opportunity-scoped expiry,
and the indexes and `SET NULL` foreign keys used by transactional volunteering
capacity checks. The API and test projects build cleanly; the prior focused
transactional suite passes 61/61, guardian lifecycle 7/7, and recurring-shift
generation 13/13. Final discovery reports
`source=107, discovered=78, quarantined=29`, EF reports no pending model
changes, and all 78 discovered migrations apply to a blank disposable
PostgreSQL database through the latest migration id.

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

`MigrationDiscoveryParityTests` fails closed if any `Migration` subclass is
neither discovered by EF nor listed in the explicit 29-entry legacy quarantine,
if a quarantined class becomes discoverable without review, or if an intended
migration id no longer matches its type. Commit `bcc317e3` introduced the gate
and corrected the EF drift step so its zero exit code is treated as a clean
model. The verified inventory is `source=107, discovered=78, quarantined=29`.

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

The reflection/quarantine gate is expected to cover all 107 compiled migration
subclasses, including the 29 classes that EF cannot currently discover. It
prevents a new class from becoming silently invisible, but it does not prove
that the quarantined DDL is safe to replay. A successful `database update`
certifies only the discovered runtime chain that was actually applied, not the
quarantined source classes.

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

`20260710211122_RecurringShiftGenerationParity` has a data-preserving `Down()`:
it removes the filtered occurrence and active-pattern indexes and restores the
former simple recurring-pattern tenant index.

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
