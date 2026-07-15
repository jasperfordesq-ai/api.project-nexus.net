# Changelog

Last reviewed: 2026-07-15

Status: **Maintained reference — curated project-history index**

This repository is experimental and has no stable product release. This file
records material project-direction and handoff changes; it is not a substitute
for Git history, a release-certification record, or a current score source.

## Unreleased — Development Paused 2026-07-15

### Authorized CI Resumption

- After the clean pause tag, the user explicitly resumed a bounded
  commit/push/fix-until-green CI phase. The required API suite now uses four
  isolated, deterministic whole-class shards with per-shard TRX artifacts;
  general product development and production operations remain paused.
- Coverage collection was removed from the required push gate after both local
  and GitHub evidence showed it prevented VSTest from completing and flushing
  test artifacts. All 3,361 API tests remain in the required gate.

### Direction

- Corrected the ASP.NET goal from loosely described Laravel “parity” to
  externally contract-identical behavior. Canonical React and shared Web UK
  must both switch between Laravel and ASP.NET by configuration only, without
  backend-specific frontend behavior. See
  [`ADR-0001`](docs/decisions/ADR-0001-contract-identical-backends.md).
- Froze `apps/react-frontend` as a legacy copy. The canonical React client
  remains in the Laravel repository; `apps/web-uk` remains the shared
  accessible frontend implementation target.

### Pause Boundary

- Added the canonical
  [pause and cold-start handoff](docs/PROJECT_PAUSE_HANDOFF_2026-07-15.md),
  including read order, exact evidence boundaries, restart prompts, and the
  repository-freeze record.
- Preserved separate current sources for the
  [ASP.NET contract bank](docs/CURRENT_ASPNET_CONTRACT_STATUS.md),
  [schema verdict](docs/CURRENT_SCHEMA_READINESS.md), and
  [Web UK workstream](apps/web-uk/docs/CURRENT_LARAVEL_FIRST_PARITY_STATUS.md).
  Their scores and certification gates must not be blended.
- Added documentation governance, audience hubs, operational safety guidance,
  exact-SHA evidence rules, and automated consistency/link/freeze checks.

### Schema And Verification

- Merged nine schema slices with blank replay, sequential populated-upgrade,
  constraint, isolation, and focused test evidence.
- Added the missing runtime migration for `compatibility_audit_entries`,
  advancing the current applicable chain to 163 IDs.
- Retained the honest boundary: the schema is working and partly proved, but
  current-lineage complete-suite, exact-SHA CI, remaining contract-storage,
  and production-upgrade certification are open.

### Repository Hygiene

- Archived unique prototype, snapshot, legacy-branch, and stash histories under
  `archive/pre-pause/*` tags before deleting stale worktrees, branches, and
  stashes.
- Retained only dependency branches that still back open pull requests; a
  superseded NuGet branch and the legacy `master` branch were removed.
- Removed accidental ignored scratch paths and added an executable pause-
  readiness check.

## Detailed History

Use Git history for individual changes. Older narrative implementation logs are
retained as historical checkpoints:

- [`docs/CURRENT_LARAVEL_PARITY_HANDOFF.md`](docs/CURRENT_LARAVEL_PARITY_HANDOFF.md)
- [`apps/web-uk/docs/CURRENT_WEB_UK_HANDOFF.md`](apps/web-uk/docs/CURRENT_WEB_UK_HANDOFF.md)
- [`docs/RESTART_INCIDENT_2026-07-15.md`](docs/RESTART_INCIDENT_2026-07-15.md)

Never use those historical files as a current score or resume queue.
