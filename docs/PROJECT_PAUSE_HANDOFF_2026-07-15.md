# Project Pause And Cold-Start Handoff — 2026-07-15

Last verified: 2026-07-15 22:51 +01:00

Status: **Canonical current — development-pause and cold-start source**

<!-- doc-consistency: PROJECT_PAUSE_DATE=2026-07-15 -->
<!-- doc-consistency: PROJECT_PAUSE_STATE=PAUSED -->
<!-- doc-consistency: PROJECT_PAUSE_FINAL_TAG=pause/2026-07-15-final -->

This is the first project-status document to read after the repository has been
left alone. It records what was true when development paused on 15 July 2026,
what is and is not proved, and how a future agent may safely re-establish a
current boundary. It does not authorize implementation or production work.

## One-Minute Handoff

- General product development remains **paused**. Opening or cloning the
  repository does not resume any autonomous loop. The separately authorized
  bounded CI remediation recorded near the end of this document is complete;
  the clean pause was re-established at `pause/2026-07-15-final`.
- Do not implement, migrate, deploy, start production containers, or mutate the
  Laravel repository or its ordinary local database without a new, explicit
  user instruction.
- The corrected product objective is **external contract identity**, not broad
  similarity or route-count parity. The binding decision is
  [`ADR-0001`](decisions/ADR-0001-contract-identical-backends.md).
- The end state is two unchanged frontends by two backends. Canonical React and
  shared accessible Web UK must each switch between Laravel and ASP.NET by
  configuration only. Backend-specific frontend branches are forbidden.
- Laravel remains the behavior and contract source of truth. The ASP.NET
  backend is experimental, incomplete, and not production-certified.
- The ASP.NET bank is **712/1000**. The schema category remains **129/150**.
  Later implementation and schema work is published but unscored.
- Web UK Baseline W1 is **663/1000**. Corrected Goal W2 deliberately has no
  percentage; its finish line is three finite gates listed below.
- The schema is **working and partly proved, not complete or release-certified**.
  The current source contains 163 runtime migration IDs. The frozen pause
  boundary's exact-SHA CI timed out; the separately authorized post-pause CI
  completion at `dbafc5c3` is recorded below and does not certify the remaining
  migration-specific or release gates.
- Historical `CURRENT_*_HANDOFF.md` files are evidence archives, not restart
  instructions. The current documents below override their scores and queues.

## Mandatory Read Order

A new agent must read these files in order before proposing work:

1. [`AGENTS.md`](../AGENTS.md) — urgent scope, frontend, database, and production
   guardrails.
2. [`CLAUDE.md`](../CLAUDE.md) — authoritative project instructions and supported
   development methods.
3. this pause handoff — pause boundary, workstream map, and restart protocol.
4. [`ADR-0001`](decisions/ADR-0001-contract-identical-backends.md) — binding
   contract-identity decision.
5. [`CURRENT_ASPNET_CONTRACT_STATUS.md`](CURRENT_ASPNET_CONTRACT_STATUS.md) —
   sole ASP.NET score, evidence boundary, and eight-package queue.
6. [`CURRENT_SCHEMA_READINESS.md`](CURRENT_SCHEMA_READINESS.md) — schema verdict,
   163-migration boundary, missing proof, and safe recommission sequence.
7. [`CURRENT_LARAVEL_FIRST_PARITY_STATUS.md`](../apps/web-uk/docs/CURRENT_LARAVEL_FIRST_PARITY_STATUS.md)
   — sole Web UK score, evidence boundary, and three-gate finish line.
8. [`FULL_PARITY_REMEDIATION_RUNBOOK.md`](FULL_PARITY_REMEDIATION_RUNBOOK.md) —
   fixed rubric and evidence method, but only after the user explicitly resumes
   a workstream.

For documentation authority, audience guides, and history labels, use
[`DOCUMENTATION_GOVERNANCE.md`](DOCUMENTATION_GOVERNANCE.md). If two maintained
documents disagree, its authority table decides which source wins.

## Binding Product Correction

The previous instruction to seek “parity” was too weak. It could be read as
roughly equivalent functionality, similar routes, or frontend adapters. That is
not the target.

ASP.NET must be externally contract-identical to Laravel at every boundary
consumed by either unchanged frontend:

| Observable boundary | Required identity |
| --- | --- |
| HTTP | Method, path, query, headers, multipart fields, redirects, status codes |
| Payloads | Request shapes, response envelopes, pagination, validation and error bodies |
| Identity and tenancy | Login, refresh, roles, permissions, tenant resolution, module gates |
| State and files | Persistence, concurrency, uploads, downloads, side effects, failure behavior |
| Workflows | Page-to-API sequence, provider effects, jobs, notifications, audit behavior |
| Operations seen by clients | Configuration bootstrap, realtime/provider settings, upgrade-visible behavior |

Internal languages, table names, and implementation patterns do not need to be
identical. Any internal difference must nevertheless preserve constraints,
tenant isolation, durable state, upgrade safety, and every consumer-visible
outcome. Static route matches alone are not contract identity.

## Paused Workstream Map

| Workstream | Canonical status | Honest pause verdict | First future package |
| --- | --- | --- | --- |
| ASP.NET contract identity | [`CURRENT_ASPNET_CONTRACT_STATUS.md`](CURRENT_ASPNET_CONTRACT_STATUS.md) | 712/1000 banked; 288 points remain; later commits are published but unscored | Re-establish exact SHAs and choose one of the eight ordered packages; do not estimate score movement |
| ASP.NET schema | [`CURRENT_SCHEMA_READINESS.md`](CURRENT_SCHEMA_READINESS.md) | 129/150 banked; working/partly proved; 163 runtime IDs; the pause-boundary full exact-SHA result was absent, while the post-pause required CI gate is now green | Certify migration 163 on blank and populated disposable PostgreSQL; do not treat the green general suite as upgrade certification |
| Web UK Laravel-first frontend | [`CURRENT_LARAVEL_FIRST_PARITY_STATUS.md`](../apps/web-uk/docs/CURRENT_LARAVEL_FIRST_PARITY_STATUS.md) | W1 663/1000; W2 unscored; source-owned work is near its finite finish line but not certified | Isolated manual accessibility evidence/fixes, then copy decision, then W2 audit |
| Dual-backend client switching | ASP.NET status plus [`BACKEND_SWITCHING_CONTRACT.md`](../apps/web-uk/docs/BACKEND_SWITCHING_CONTRACT.md) | Not certified for either unchanged client | Build exact consumer matrices and run unchanged-client workflows against ASP.NET |
| Production | [production container guide](../.claude/production-containers.md) | No deployment was authorized by this pause audit | Remains a separate explicit-authority operation |

Never combine the ASP.NET and Web UK scores. Documentation health also has a
separate denominator and does not imply product readiness.

## Exact Product And Evidence Boundary

The product state frozen by this handoff is:

| Boundary | Value | Interpretation |
| --- | --- | --- |
| Laravel source | `903d03d3db78bbf87129ad35728be3b72819acaf` | Read-only contract/schema comparison source used by current evidence |
| ASP.NET product/schema implementation | `c767050a3eabd064bdf647695b9699b98186342b` | Latest product boundary before pause documentation; published but not rescored |
| Green CI/test evidence | `dbafc5c329c55a15b4329ff90804d725dbf8b089` | Required exact-SHA CI run 29451087913 succeeded; test/workflow evidence only, not a product or score boundary |
| Last banked ASP.NET implementation | `5fa15e0e79993464622b1c3ef053fcdd01679991` | Supports the 712/1000 bank |
| Schema merge | `df8c8b96c80804785e9c84f9f7c75337088d6024` | Nine schema slices merged; later migration 163 repairs a fresh-chain hole |
| Web UK banked product | `2e92f89ee03177af02f0f16b669591604d3e6403` | Product boundary for W1; scoring record `b5b2c0a7` |
| Latest named pre-audit Web UK product | `6864f7be` | Later published work remains unscored as a block |

Future documentation-only and repository-freeze commits do not earn product
points. A future agent must compare these values with then-current `origin/main`
and the Laravel source before treating any count or queue as current.

Generated Web UK route and API ledgers at `a3f18f06` record a dirty-provenance
caveat. They are useful structural planning evidence, not freeze certification.
Regenerate them at clean, named source SHAs before relying on them for a new
audit. The ordinary Laravel checkout also had a pre-existing lockfile change and
untracked `.codex/` state; never erase or claim ownership of those paths.

## Schema Blueprint

This section preserves what was known and missing at the frozen pause boundary.
The later bounded CI completion is recorded in the resumption section below; it
does not rewrite the pause tag or the remaining migration-specific gates.

The short answer is not “the schema is broken.” The contract-correction work
exposed a missing runtime migration for a table already present in the EF model
and snapshot. Commit `c767050a` adds
`20260715184200_AddCompatibilityAuditEntriesTable` and advances the applicable
chain to 163 IDs.

Evidence retained from the nine merged schema slices includes a 162-ID blank
PostgreSQL 16.4 replay, nine sequential populated upgrades, 27/27 focused tests,
model-drift checks, and constraint/isolation checks. Current static diagnostics
are 458 Laravel table names, 440 ASP.NET-represented names, 242 exact matches,
216 Laravel-only names, and 198 ASP.NET-only names. Those counts diagnose work;
they are not a completion percentage.

What remains before schema certification:

1. focused migration-163 source/runtime assertions;
2. exact-candidate migration discovery and model-drift proof;
3. fresh zero-to-163 disposable PostgreSQL replay and final-object assertions;
4. populated 162-to-163 upgrade with row, default, index, FK, and rejection
   assertions;
5. classification of all 216 Laravel-only names by workflow significance;
6. a separate fixed-rubric scoring transaction if the evidence closes points.

The former general same-SHA suite/CI item was satisfied after the first pause:
GitHub Actions run 29451087913 is terminal green at `dbafc5c3`. It must be rerun
after any future schema or product change and does not satisfy items 1-5.

Historical GitHub Actions run 29441392036 passed Build and frozen-React checks, but the
migrated Test job was cancelled at its 75-minute limit without a terminal
summary; coverage then failed and Docker was skipped. Record it as timed out,
not green or red. No production schema was inspected or modified.

## Web UK Blueprint

Web UK is Laravel-first and backend-neutral. Laravel Blade defines its browser
experience; Laravel API behavior defines its backend contract. ASP.NET must
later satisfy that established contract without Web UK forks.

Goal W2 has exactly three remaining gates:

1. isolated-fixture manual visual, keyboard, focus, no-JS, zoom/reflow,
   forced-colour, and screen-reader evidence plus fixes;
2. resolution of the accessibility-copy difference after evidence exists; and
3. a clean-checkout fixed-rubric W2 audit and certification transaction.

Optional live-Laravel mutation certification and future ASP.NET switching are
separate workstreams. Never run login, mutation, upload, download, destructive,
or cleanup tests against the ordinary production-derived Laravel database.

## Resume Protocol

When the user starts a new phase, do this before changing files:

1. obtain an explicit instruction naming the workstream;
2. fetch and inspect current refs without discarding local work;
3. run the read-only boundary commands below;
4. compare current product SHAs and generated evidence with this handoff;
5. update the canonical status document if drift invalidates this boundary;
6. claim an exclusive file/worktree scope for shared hotspots; and
7. implement one bounded slice, verify it, document it, commit it, and push it
   before selecting another slice.

```powershell
git status --short --branch
git rev-parse HEAD
git rev-parse origin/main
git log --oneline --decorate -n 20
git worktree list --porcelain
git branch --all --verbose --no-abbrev
git stash list
git -C C:\platforms\htdocs\staging status --short --branch
git -C C:\platforms\htdocs\staging rev-parse HEAD
```

Do not assume that a clean checkout, an old green focused test, or the presence
of a route proves current behavior. Do not resume by running migrations or
stateful browser tests.

## Copy-Ready Handoff Prompts

### Read-Only Reorientation

> Read `AGENTS.md`, `CLAUDE.md`,
> `docs/PROJECT_PAUSE_HANDOFF_2026-07-15.md`, ADR-0001, and the three canonical
> status documents in their prescribed order. Perform a read-only refresh of
> both repository SHAs, worktrees, branches, stashes, generated evidence, and
> current CI. Do not edit, migrate, deploy, start production containers, or
> touch the Laravel database. Report drift from the pause boundary separately
> from the historical banked scores, and recommend one bounded next package.

### ASP.NET Contract-Identity Phase

> Resume only the ASP.NET contract-identity workstream. Treat Laravel at the
> refreshed named SHA as read-only behavior authority and ADR-0001 as binding.
> Preserve both unchanged frontends; do not create frontend adapters. Select
> one package from the canonical eight-package backend queue, trace the exact
> Laravel and consumer contract, implement the smallest coherent backend slice,
> run focused then broader proof, update exact-SHA status, commit the verified
> slice, and push. Keep banked, published-unscored, and dirty work separate.

### Schema Recommission Phase

> Resume only the schema workstream after reading
> `docs/CURRENT_SCHEMA_READINESS.md`. Use an isolated worktree and exclusively
> owned disposable PostgreSQL 16.4 databases. First certify migration 163 on
> blank zero-to-current and populated 162-to-163 paths, including model drift,
> constraints, row survival, and cleanup. Never point commands at production,
> shared, Laravel, or production-derived data. Commit and push each verified
> schema/evidence slice; do not bank points without the complete scoring
> transaction.

### Web UK Completion Phase

> Resume only `apps/web-uk/**`. Read its AGENTS/CLAUDE/current-status files and
> keep Laravel source/database read-only. Complete the three W2 gates in order:
> isolated manual accessibility evidence/fixes, accessibility-copy decision,
> then a complete clean-checkout W2 audit. Use Web UK-owned fixtures and mocks;
> do not inspect ASP.NET to invent frontend behavior and do not add
> backend-specific branches. Commit and push each coherent verified package.

## What A Future Agent Must Not Infer

- “712/1000” does not mean the schema or either client switch is 71.2% ready.
- “129/150 schema” does not certify migration 163, production upgrades, or all
  Laravel workflow storage.
- “0 static route gaps” does not prove payload, auth, side effects, or runtime.
- “Web UK 663/1000” is W1, not a percentage for corrected Goal W2.
- A historical handoff’s newer-looking section heading does not override a
  canonical current page.
- A deployed legacy React container does not make the frozen React copy the
  product source of truth.
- A generated artifact with dirty provenance is not exact-SHA certification.

## Repository Freeze Record

The first clean boundary is preserved by annotated tag `pause/2026-07-15` at
`84d7eefc7a79202aae55d4a47b899023d1747d2c`. After the explicitly authorized
CI loop, the current clean boundary is the commit identified by annotated tag
`pause/2026-07-15-final`. At the current boundary the automated pause-readiness
guard proves:

| State | Before freeze | Final pause state |
| --- | ---: | ---: |
| Registered worktrees | 5 | 1, at the repository root |
| Local branches | 9 | 1, `main` only |
| Stashes | 8 | 0 |
| Stale remote branches removed | 0 | 7 |
| Intentional open-PR remote heads | 4 candidates inspected | 3 retained |
| Pushed archive tags | 0 | 18 under `archive/pre-pause/*` |
| Known accidental ignored paths | 4 | 0 |

The archive tags preserve two re-audit snapshots, three unique Web UK
prototype tips, the merged schema and Web UK workstream tips, the legacy
`master` tip, eight former stash commits, the unfinished coverage-collecting CI
experiment, and its refined no-coverage CI candidate. They are historical
recovery refs, not active branches or restart queues.

The unfinished four-shard/coverage experiment parsed but its local isolated run
ended after about 15 minutes without TRX or coverage output. Its exact patch is
preserved at `archive/pre-pause/unfinished-ci-sharding`. A refined candidate at
`archive/pre-pause/ci-sharding-candidate` removed coverage and completed static
discovery, but no GitHub workflow run existed. A racing cherry-pick briefly
placed that candidate on `main`; the final pause history immediately reverts it,
so neither candidate changes the tagged tree. Both require a future explicitly
authorized retry with terminal evidence.

Removed remote heads were the two re-audit branches, schema workstream branch,
Web UK workstream branch, unproved CI-candidate branch, legacy `master`, and
superseded NuGet Dependabot branch (PR 69 closed). Buildx PR 11, frozen-React
`qs` PR 71, and standalone-admin `qs` PR 72 remain open and were retained
deliberately.

The removed ignored debris was two zero-byte `_nul` files, an accidental empty
`cmd.exe` directory, and a malformed empty `robocopy` directory tree. No
tracked, maintained, or external user file was removed.

Run the closing proof from a fetched checkout:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/check-pause-readiness.ps1
```

It must pass at `pause/2026-07-15-final`; otherwise the repository is not in the
current documented clean-pause state. The script also proves that historical
tag `pause/2026-07-15` has not moved from `84d7eefc`.

## Authorized CI Resumption Record — 2026-07-15

The user subsequently gave an explicit instruction to commit and push all
active work, monitor CI, and keep fixing and republishing until the required CI
run is green. That instruction authorizes only this bounded publication and CI
remediation loop. It does not authorize production deployment, production
containers, Laravel writes, or general product implementation.

The no-coverage four-shard candidate was therefore reintroduced after the
historical pause transaction had reverted it. Its evidence boundary is:

- deterministic discovery allocates all 3,361 API tests exactly once across
  four whole-class shards: 841, 840, 840, and 840 tests;
- a focused disposable PostgreSQL integration shard completed locally in
  3m02s and finalized a passing TRX;
- the equivalent one-method coverage probe produced no TRX or coverage output
  within 15 minutes, matching GitHub evidence that coverage instrumentation was
  the throughput blocker, so coverage is not part of the required push gate;
- GitHub run `29448759052` was cancelled after 1m18s only because the final
  pause-documentation push superseded it; it is not pass/fail test evidence;
- at the time this record was first written, terminal exact-SHA CI evidence
  remained required before the resumed loop could be called green; the
  completion record follows.

The annotated `pause/2026-07-15` tag remains the immutable historical first
clean-pause boundary. The current final pause closure is separately tagged
`pause/2026-07-15-final`; the readiness script verifies both facts. Baseline D3
remains the original score and D3-R1 is its same-rubric revalidation after the
bounded CI work, without changing any product score.

### CI Remediation Completion Record - 2026-07-15

The bounded CI remediation completed without changing the frozen product score
or authorizing general development:

- `c767050a3eabd064bdf647695b9699b98186342b` remains the latest backend
  product/API/schema implementation boundary;
- `b3f946b3fd3de51fa444008a7daee80d3de1bcd2` is the four-shard required-CI
  workflow boundary;
- `dbafc5c329c55a15b4329ff90804d725dbf8b089` is the test/evidence SHA that
  gives every concurrent wallet transfer its own explicit idempotency key;
- GitHub Actions run
  [`29451087913`](https://github.com/jasperfordesq-ai/api.project-nexus.net/actions/runs/29451087913)
  finished terminal **success** for `dbafc5c3`: Build, frozen-React Frontend,
  Test shards 1-4, and Docker Build & Push all succeeded;
- deterministic allocation covered 3,361 logical tests exactly once as
  841 + 840 + 840 + 840. The downloaded TRX files contained 3,385 executed
  rows as 841 + 840 + 840 + 864 because shard 4 expanded parameterized runtime
  rows; all 3,385 passed, with 0 failed, skipped, error, timeout, or aborted;
- coverage remains intentionally outside the required push gate because the
  earlier instrumentation path prevented VSTest from completing and flushing
  terminal artifacts; and
- Docker image publication is not a production deployment. No production
  container was touched, and no Laravel repository or database action occurred.

This closes the required complete-suite exact-SHA CI push gate for the named
candidate only. It does not rescore the ASP.NET bank of **712/1000**, the
build/test/CI category of **45/100**, the schema bank of **129/150**, or
Documentation Health Baseline D3 of **1000/1000**. Dedicated migration-163
blank/populated-upgrade proof, storage classification, providers, both
unchanged-client runtime switches, release certification, and production proof
remain open.

### Hosted GitHub Snapshot - 2026-07-15

The hosted state was refreshed during final pause closure:

- open dependency PRs are [#11](https://github.com/jasperfordesq-ai/api.project-nexus.net/pull/11),
  [#71](https://github.com/jasperfordesq-ai/api.project-nexus.net/pull/71), and
  [#72](https://github.com/jasperfordesq-ai/api.project-nexus.net/pull/72); their
  three remote heads are intentional and are not stale workstream branches;
- GitHub Dependabot reported **35 open alerts**: 2 critical, 9 high, 16 medium,
  and 8 low; and
- those counts are a dated hosted snapshot, not a source audit or risk
  acceptance. A future agent must refresh Security/Dependabot before dependency,
  release, or production work and must not infer that the green CI run resolved
  the alerts.

No alert was dismissed and no live PR branch was deleted by the freeze audit.

## Pause Integrity Rule

This handoff becomes stale if `origin/main` moves beyond
`pause/2026-07-15-final`, the Laravel source SHA, worktree or
branch state, schema migration count, generated evidence, canonical scores, or
open certification gates change. A future agent must append a new dated pause
or resumption record rather than silently rewriting the 15 July boundary.
