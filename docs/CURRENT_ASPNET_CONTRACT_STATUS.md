# Current ASP.NET Contract Status

Last verified: 2026-07-15 06:18 +01:00

Status: **canonical current ASP.NET score and certification source**

<!-- doc-consistency: ASPNET_CURRENT_BANKED_SCORE=712/1000 -->

Use this document for the current ASP.NET completion score. Use
[`FULL_PARITY_REMEDIATION_RUNBOOK.md`](FULL_PARITY_REMEDIATION_RUNBOOK.md) for
the fixed rubric, shared evidence gates, and execution loop. The finite ordered
backend queue lives in this document. Historical
scores elsewhere are checkpoints only and do not override this page.

The matching accessible-frontend source is
[`CURRENT_LARAVEL_FIRST_PARITY_STATUS.md`](../apps/web-uk/docs/CURRENT_LARAVEL_FIRST_PARITY_STATUS.md).
Do not combine its score with the ASP.NET score: the two workstreams have
different evidence gates.

## Required End State

The product goal is a **two-frontends-by-two-backends** compatibility model in
which neither frontend changes behavior when its backend changes:

| Unchanged client | Laravel backend | ASP.NET backend |
| --- | --- | --- |
| Canonical React at `C:\platforms\htdocs\staging\react-frontend` | Production source-of-truth behavior | Same methods, paths, payloads, responses, statuses, auth, tenancy, uploads, side effects, and workflows |
| Accessible Web UK at `apps/web-uk` | Laravel-first certification target | The same Web UK code and page flows, switched by configuration only |

Route presence alone is not contract correctness. ASP.NET must reproduce the
Laravel contracts consumed by both unchanged clients, including validation and
error envelopes, redirects, authorization boundaries, tenant behavior,
provider effects, persistence, and upgrade behavior. Frontend adapters or
ASP.NET-specific page branches do not satisfy the goal.

## Current Scored Position

The **current banked score is 712/1000 (71.2%)** under Fixed Rubric Baseline 1.
The denominator is fixed; newly discovered work is recorded as a deduction or
a separately named Laravel-drift baseline, never as a silent denominator
change.

The complete 2026-07-15 restart re-audit keeps this score unchanged. No commit
after the last banked backend implementation closes a remaining scored backend
gate: the migrated-schema fixture is evidence-only and every later committed
product change through repository `HEAD` is Web UK work.

| Category | Banked | Maximum | Open |
| --- | ---: | ---: | ---: |
| Active Laravel API route representation | 100 | 100 | 0 |
| Semantic workflow and canonical-consumer contract parity | 307 | 350 | 43 |
| Schema, migrations, data integrity, and upgrade safety | 129 | 150 | 21 |
| Auth, tenant isolation, security, and localization | 97 | 100 | 3 |
| Full build/test/CI evidence | 45 | 100 | 55 |
| Unchanged canonical React plus unchanged Web UK dual-backend runtime proof | 10 | 125 | 115 |
| Providers, jobs, integrations, operational proof, and reproducible docs | 24 | 75 | 51 |
| **Total** | **712** | **1000** | **288** |

Active route representation is **2,601/2,601 matched with 0 missing**. Seven
retired OpenAPI-only operations are reported separately and return to the
active gate automatically if a live Laravel route reintroduces them. This
closes the representation inventory only; it is not runtime, semantic, or
production certification. The separately generated canonical React matrix has
2,328 static call-site rows and 2,016 unique method/path entries, with 0 ASP.NET
static gaps and 171 method-unresolved entries. The reconciled inventory does not
prove payload, status, auth, tenant, side-effect, or runtime correctness; those
rows remain semantic and unchanged-client work rather than route-score evidence.

## Baseline And Banked Evidence

Fixed Rubric Baseline 1 froze:

- Laravel `903d03d3db78bbf87129ad35728be3b72819acaf`;
- ASP.NET `b751d22f38baf0ac8bdf90fe669550b568fcb489`;
- the evidence snapshot at 2026-07-14 10:51:18 +01;
- an initial banked score of **620/1000**.

Subsequent points were banked only after their implementation and evidence were
published:

| Published checkpoint | Evidence | Banked movement |
| --- | --- | ---: |
| Marketplace payment settlement | Implementation `768801f129747ebcb8ae2f52dd9d34f851f20df9` | +8 semantic, +4 schema = **632/1000** |
| Marketplace Connect onboarding | Implementation `25110d7fb98dfed4e2eabbea016924cee93f9b9d`; scoring record `bda4cb949d322b77197ec51c7c4152b272a42a4d` | +4 semantic, +1 schema, +1 providers/operations = **638/1000** |
| Marketplace paid notifications and durable order identity | Implementation `f562c49796b81ac2ea47a4699dc22f9f0e57f9c0` | +4 semantic, +2 schema, +1 providers/operations = **645/1000** |
| Marketplace escrow settlement and delayed Connect payout | Implementation `93417bd17e886e8d05e054ec2f679a4851c6ae26` | +8 semantic, +4 schema, +2 providers/operations = **659/1000** |
| Marketplace provider refunds and dispute settlement | Implementation `4f7b9f202322d792574f2003274fadfda9e7037d` | +5 semantic, +3 schema, +1 providers/operations = **668/1000** |
| Signed external marketplace refund reconciliation | Implementation `ef8a0cf8d9458abda8350f8bf2a5adca44f12724` | +3 semantic, +1 providers/operations = **672/1000** |
| Signed held-escrow charge-dispute reconciliation | Implementation `027f35e6189eee13eb05396050a2995706597cad` | +3 semantic, +1 providers/operations = **676/1000** |
| Paid-transfer charge-dispute recovery | Implementation `9875fb5dd33e3ab5c33ea77a83fcfb0b8c6c0b00` | +3 semantic, +1 providers/operations = **680/1000** |
| Marketplace refund notification evidence | Implementation `b37a3cc5ed903394b67813a3e34304213b9e150d` | +3 semantic, +1 providers/operations = **684/1000** |
| Secure SSO/OIDC authentication flow | Implementation `c20d064e6adb99d3a585efd299650d5e913180ff` | +8 semantic, +3 schema, +3 security = **698/1000** |
| Tenant-bootstrap precedence and fail-closed runtime proof | Implementation `5fbcf36dedf320c0ca81ac77f8b4771d891f7331`; stable disposable-PostgreSQL verification at ASP.NET `ccd109fc4dc67b0b117780b2130d519e6bb38eea` | +2 semantic, +1 security = **701/1000** |
| Social comment mentions, usernames, and recipient side effects | Implementation `1ff6447012c89744e94d6693463a8032361c5946` | +4 semantic, +2 schema, +1 security/localization = **708/1000** |
| Laravel-compatible social-comment HTML sanitization | Implementation `293796e0f17b91e446f49a28babd960de7681e27` | +1 semantic, +1 security/localization = **710/1000** |
| V2 generic-comment safe-format and sanitizer parity | Implementation `5fa15e0e79993464622b1c3ef053fcdd01679991` | +1 semantic, +1 security/localization = **712/1000** |
| Migrated-schema integration certification harness | Implementation/evidence `fefbb5ce03b83c95cd78fb338b7a5c41da9b6745` | **+0**; corrects the evidence boundary but does not substitute for a complete green suite or CI |

These named values form an audit trail. They are not competing current scores.

## Repository State At This Verification

The latest banked backend implementation inspected for this page is
`5fa15e0e79993464622b1c3ef053fcdd01679991`, with
Laravel frozen at `903d03d3db78bbf87129ad35728be3b72819acaf`. At the re-audit
boundary, repository `HEAD` and `origin/main` are both
`1ded18bd5e49e09c06d697ac0699a9cc31181d25`. The backend evidence commit
`7ef75d1c4434bf8ba5855602154b5f3370a96b6e` and all subsequent committed
changes are evidence-only or Web UK-only, so they do not add ASP.NET points.

### Published But Not Rescored

Published commit `fefbb5ce03b83c95cd78fb338b7a5c41da9b6745`
changes the shared integration fixture from `EnsureCreated` to the complete EF
migration chain, so PostgreSQL functions, triggers, preflights, and other raw
migration SQL are present in test databases. It also corrects stale ordinary-
admin expectations for the database-backed platform-super-admin bulk policy and
updates the obsolete volunteer-hours alias case to assert the current Laravel-
shaped validation order. At the frozen Laravel SHA and ASP.NET implementation
SHA, the Release test assembly built with 0 warnings and 0 errors, the focused
fresh-migrated PostgreSQL set passed 14/14, and the five affected classes passed
57/57 in 303.8 seconds. This adds **zero banked points** because the complete
3,331-test suite and exact-SHA CI remain open.

Published commit `923db629dea331ee093018887c4533d2c4e7133e` added the
exact-SHA canonical React call-site generator. Published correction
`bab02a77c3075e182f039785ef097ac88a62f4b9` reconciles constant-root ASP.NET
routes, multiple verb attributes, parameterized route templates, and typed
dynamic frontend actions in the maintained matrix at
[`generated/canonical-react-contracts/README.md`](generated/canonical-react-contracts/README.md).
It records 2,328 call-site rows, 2,016 unique method/path entries, 1,845 with
method evidence, 171 with unresolved methods, and 0 ASP.NET static gaps against
Laravel `903d03d3db78bbf87129ad35728be3b72819acaf` and ASP.NET
`0c8885355154e5d188244e4820977c7f3a6f5e65`. It adds **zero banked points**:
inventory generation does not prove payload, envelope, auth, tenant, side-effect,
or runtime correctness.

### Dirty And In Flight

The refund-notification marketplace, secure SSO/OIDC, tenant-bootstrap,
social-comment mention, legacy social-comment sanitizer, and V2 generic-comment
sanitizer slices are committed and banked. The corrected tenant-bootstrap set passes 4/4
and its containing public-compatibility class passes 11/11 against a separately
named disposable PostgreSQL database through `NEXUS_TEST_POSTGRES`; the related
SSO public-controller integration check also passes 1/1 on that database. The
worktree reports `20260713015034_EventSafetyWorkflowParity.cs` as modified, but
its content hash is identical to `HEAD`; it is a stat-only worktree difference,
not a substantive backend change. `scripts/test-backend-shard.ps1` is untracked;
the restart interrupted its first attempted shard before a terminal aggregate,
so it contributes zero build/test/CI points.

The isolated `codex/schema-parity-20260714` worktree is aligned to repository
`1ded18bd` and preserves an uncommitted five-table Verein slice. Its older-base
clean build, 3/3 focused tests, blank migration replay, populated upgrade, valid
inserts/defaults, and cross-tenant rejection are useful evidence. Its current-
lineage migration designer is stale and must be regenerated and fully rerun
before commit. The slice therefore contributes zero banked schema points. There
are no dirty Web UK product files at this snapshot. Dirty or projected work
never increases the banked score.

### 2026-07-15 Windows Update Interruption

Windows Update initiated the first planned restart at **02:44:42 Irish time**;
two planned servicing restarts followed, and the final operating-system start
was 02:49:14. Codex task execution did not resume until about 05:20. The exact
event-log sequence, installed updates, and pre-restart boundaries are recorded
in [`RESTART_INCIDENT_2026-07-15.md`](RESTART_INCIDENT_2026-07-15.md). No
interrupted or recovered work was converted into score movement.

Re-run `git status --short`, compare the published checkpoint with `HEAD`, and
refresh this section before every status report. Do not infer points from file
count, elapsed effort, or an agent's estimate.

## Open Certification Gates

The remaining 288 points are not a single implementation queue. They include
independent proof gates that must remain visible in status reports:

- semantic completion for remaining marketplace, federation, jobs, providers,
  side effects, feature/module gates, and consumer-visible error behavior;
- schema, migration, upgrade, and data-integrity evidence for remaining
  workflows;
- residual security, tenant-isolation, authorization, and localization depth;
- complete build, full-suite, and exact-SHA CI evidence rather than focused
  tests alone;
- unchanged canonical React browser/runtime proof against ASP.NET;
- unchanged, Laravel-certified Web UK switched to ASP.NET by configuration only
  and rerun through the same workflow/accessibility suite;
- live-provider and operational proof, including Stripe/Connect plus unresolved
  refund, dispute, provider-event reconciliation, job, and integration behavior.

Stateful Web UK certification against Laravel must use a separately
provisioned disposable Laravel environment. The ordinary local Laravel database
is a confidential production-derived snapshot and is never a test fixture.

The 2026-07-15 suite investigation discovered 3,331 tests across 2,776 methods
and 391 classes. A
single full Release run reached the 30-minute process limit without an
aggregate. Four isolated alphabetic shards also reached their 15-minute limits;
the B-F shard exposed four named failures. The published migrated-schema harness
and stale-expectation corrections resolve those four cases, and the affected
57-test run is green. This is useful evidence, but it is not a complete-suite
pass: smaller deterministic shards and an exact-SHA CI aggregate are still
required before any of the remaining 55 build/test/CI points can move.

## Finite Ordered Backend Queue

Complete these eight bounded packages in order unless an external dependency is
recorded against a package. Do not turn a package into estimated score movement;
points bank only through the evidence transaction above.

1. **Certify marketplace financial lifecycle with live providers.** The localized
   paid, payout, refund, escrow, reversal, and dispute workflows are implemented;
   obtain live Stripe/Connect proof without weakening their banked durable ledgers.
2. **Complete canonical React semantic contract evidence.** Resolve the 171
   method-unresolved entries, classify the 18 Laravel-missing/mismatched entries,
   and add payload, response, status, auth, tenant, upload, side-effect, and
   runtime evidence to the affected rows. The reconciled static matrix has no
   ASP.NET route/method gaps, so no route-count work may substitute for these
   semantic gates.
3. **Generate the unchanged Web UK-to-ASP.NET contract matrix.** Consume the
   current Web UK frontend ledger without frontend forks, classify every call
   against ASP.NET, and close configuration/auth/tenant/shape/status gaps before
   runtime switching.
4. **Close high-risk semantic workflows and providers.** Finish remaining
   federation, jobs,
   provider, side-effect, and feature-gate gaps with focused contract evidence.
5. **Close schema and upgrade deductions.** Reconcile remaining Laravel
   tables/constraints, prove both blank and upgrade migration paths, run model-
   drift gates, and record data-integrity/rollback or forward-remediation proof.
6. **Close security and localization deductions.** Finish tenant/authorization
   depth and the request/error/recipient-locale gaps listed in
   [`BACKEND_LOCALIZATION_CONTRACT.md`](BACKEND_LOCALIZATION_CONTRACT.md).
7. **Bank complete build/test/CI evidence.** Run the complete relevant suites,
   Release builds, migration gates, and exact-SHA CI; record failures rather
   than substituting focused green tests.
8. **Certify both unchanged clients.** Run the canonical React workflows and,
   after Web UK's Laravel-first certification, the same unchanged Web UK code
   against ASP.NET by configuration only, including accessibility and provider
   evidence required by the rubric.

## Required Status-Report Format

Every ASP.NET status report must present these five blocks in this order:

1. **Named baseline and SHA** - rubric version, Laravel SHA, last banked ASP.NET
   implementation SHA, scoring-record SHA, and currently inspected HEAD.
2. **Banked score** - one fixed-denominator total plus the seven category rows.
3. **Published but unscored** - exact commits and why points are not banked yet;
   write `none` when there are none.
4. **Dirty/in-flight work** - scoped files or workstream, verification achieved,
   and explicit confirmation that it contributes zero banked points.
5. **Certification gaps** - exact remaining deductions and the evidence needed
   to bank them.

Never report a blended ASP.NET/Web UK percentage, silently rescore history,
convert route counts into a completion percentage, or describe uncommitted work
as complete. Follow
[`DOCUMENTATION_GOVERNANCE.md`](DOCUMENTATION_GOVERNANCE.md) when updating this
status.
