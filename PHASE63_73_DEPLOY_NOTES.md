# Phase 63-73 Deploy Notes (Historical)

Last reviewed: 2026-07-14

Status: **Historical checkpoint — quarantined; do not execute**

This filename is retained so old links do not break. Its former contents were a
2026-05 deployment checklist for phases 63-73. They are available in Git
history for forensic review, but they are not a current runbook, migration
procedure, rollback plan, configuration reference, or authorization to touch
production.

Do not copy commands, database names, environment variables, provider settings,
smoke tests, or rollback claims from an older revision of this file. The retired
note used a blanket Docker Compose model that does not match the current
component-specific production topology; it also made unverified assumptions
about automatic migrations, reversibility, backup/restore safety, migration
counts, unsigned provider payloads, and no-data-loss rollback.

Before any production-container or production-data action:

1. obtain explicit authorization for the named component, exact source/image
   SHA, target, and operation;
2. read [`.claude/production-containers.md`](.claude/production-containers.md)
   immediately before the action;
3. follow only the component-specific procedure and current live inventory in
   that document;
4. verify backups, write fencing, abort criteria, health checks, and rollback or
   forward-remediation evidence independently.

For current product readiness and contract status, use:

- [`docs/CURRENT_ASPNET_CONTRACT_STATUS.md`](docs/CURRENT_ASPNET_CONTRACT_STATUS.md)
  for the ASP.NET banked score, dirty boundary, and backend queue;
- [`apps/web-uk/docs/CURRENT_LARAVEL_FIRST_PARITY_STATUS.md`](apps/web-uk/docs/CURRENT_LARAVEL_FIRST_PARITY_STATUS.md)
  for the accessible frontend banked score, certification gaps, and queue;
- [`docs/FULL_PARITY_REMEDIATION_RUNBOOK.md`](docs/FULL_PARITY_REMEDIATION_RUNBOOK.md)
  for the fixed rubric, shared evidence gates, and execution loop.

Historical scope only: the retired document described scheduled jobs, email,
identity, AI, federation, donations, push, templates, volunteering, bookmarks,
endorsements, presence, SEO, and observability work from phases 63-73. None of
those descriptions certifies the current implementation or deployment.
