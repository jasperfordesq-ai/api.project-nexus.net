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
- Required CI completed terminal green at test/evidence SHA `dbafc5c3` in
  GitHub Actions run 29451087913: Build, frozen-React Frontend, four API-test
  shards, and Docker Build & Push succeeded. The allocator covered 3,361
  logical tests; TRX execution expanded shard-4 parameterized rows to 3,385
  total rows, all passed with 0 failed or skipped. This evidence remains
  unscored and did not deploy production or touch the Laravel database.

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
  dedicated migration-163 blank/populated-upgrade proof, remaining contract-
  storage classification, fixed-rubric acceptance, and production-upgrade
  certification remain open. The general complete-suite exact-SHA CI subgate
  is green at `dbafc5c3`; it is not upgrade certification.

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
