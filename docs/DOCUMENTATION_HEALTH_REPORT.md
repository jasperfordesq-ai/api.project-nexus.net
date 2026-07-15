# Documentation Health Report

Last verified: 2026-07-15 18:00 +01:00

Status: **Generated snapshot - system-wide documentation quality only, not product readiness**

<!-- doc-consistency: DOCUMENTATION_HEALTH_BASELINE=D2 -->
<!-- doc-consistency: DOCUMENTATION_HEALTH_SCORE=100/100 -->

## Audit Correction

The earlier Baseline D1 report said 100/100 at product commit `1ded18bd`, but
its rubric mostly measured internal parity-document consistency. It omitted
substantive member, tenant-administrator, API-consumer, configuration, security,
incident-response, and operational-command accuracy. That 100/100 was therefore
not a valid system-wide documentation-health claim and is superseded.

Independent pre-remediation audits produced two named diagnostic baselines:

| Pre-remediation audit | Score | Principal deductions |
| --- | ---: | --- |
| User/admin Baseline U1 | 32/100 | No user/admin/API hubs; stale Web UK route table and empty credentials section; public accessibility assurances exceeded manual evidence; weak support/security discoverability. |
| System/operator Baseline S1 | 44/100 | Wrong seed password/React port; impossible container EF workflow; stale configuration keys and production Compose; automatic deployment on `main`; unsafe/missing incident, backup, restore, and restart guidance. |

These two diagnostics use different rubrics and must not be averaged. Baseline
D2 below is the fixed system-wide health rubric going forward.

## Baseline D2 - 100/100

Documentation Health Baseline D2 scores the remediated repository **100/100**
against Laravel source `903d03d3db78bbf87129ad35728be3b72819acaf`, remote ASP.NET
product `9ad163c969a935407297eb459a9840798a1a9e78`, local unpushed schema
merge `df8c8b96c80804785e9c84f9f7c75337088d6024`, Web UK banked product
`2e92f89e`/scoring record `b5b2c0a7`, latest remote Web UK product
`6864f7be`, and the unpushed audit reconciliation containing this report.

This score means the maintained documentation accurately describes both
completed and unfinished work. It does not mean the product, ASP.NET backend,
Web UK, locally merged schema work, provider integrations, CI, or production operations
are complete or certified.

| D2 category | Score | Evidence |
| --- | ---: | --- |
| Member/end-user coverage and accessibility honesty | 15/15 | User hub covers onboarding, community features, accounts/privacy, language, accessibility, evidence limits, and support. Unsupported public keyboard/screen-reader assurances are withheld pending manual evidence, and the resulting deliberate Laravel-copy parity decision is explicit rather than hidden. |
| Administrator, support, and vulnerability guidance | 10/10 | Tenant-admin duties are separated from platform operations; support and private vulnerability reporting are discoverable and prohibit secrets/personal data. |
| API consumer and integration guidance | 10/10 | Consumer hub documents versioning, auth, tenancy, endpoint-specific envelopes, errors, pagination, uploads, idempotency, side effects, and correlation evidence without inventing one universal contract. |
| System development, configuration, testing, and security | 15/15 | System hub records correct local ports/seed credentials/startup effects, canonical connection/JWT keys, the open issuer/audience guard gap, the RabbitMQ TLS limitation, disposable-test boundaries, evidence levels, tenancy/security architecture, and known limitations. |
| Operator, production, data, and incident safety | 15/15 | Production needs explicit authority. The local deploy workflow is manual-only, validates an exact SHA without shell interpolation, and hard-disables the unapproved legacy deploy job; the still-automatic remote workflow and unprotected GitHub environment are explicitly recorded. Obsolete Compose files expose no services, health alert permissions/coverage are corrected locally, and restart/auto-migration, backup/restore, and read-only incident boundaries are explicit. |
| Current status, scoring, and provenance | 15/15 | Backend remains 712/1000; Web UK W1 remains 663/1000 while W2 has no percentage and three explicit finish-line gates (manual evidence/fixes, an upstream accessibility-copy parity decision, then scoring/certification); 11 remote backend commits, 38 later Web UK commits, local test commit `56dc3b3a`, and locally merged schema commit `df8c8b96` remain unscored. |
| Navigation, ownership, and historical integrity | 10/10 | Root/docs/Web UK entry points route each audience to one authority; historical handoffs and tool-owned snapshots cannot supply current scores or queues. |
| Automated consistency, links, and executable-example hygiene | 10/10 | The consistency guard checks audience hubs, credentials/ports, deployment safety, configuration keys, score markers, and stale Web UK prose in addition to link and diff gates. |
| **Total** | **100/100** | **Documentation health only.** |

The D2 denominator is fixed. A newly discovered defect reduces its category
until corrected; it must not be hidden by changing the denominator. A future
rubric change requires a new named baseline and a before/after mapping.

## Current Product Boundaries Preserved

- [ASP.NET Fixed Rubric Baseline 1](CURRENT_ASPNET_CONTRACT_STATUS.md) remains
  **712/1000**. Eleven later backend commits are remote/published. The test
  correction `56dc3b3a` and schema merge `df8c8b96` are locally committed but
  unpushed and unscored.
- [Web UK Baseline W1](../apps/web-uk/docs/CURRENT_LARAVEL_FIRST_PARITY_STATUS.md)
  remains **663/1000**. Goal W2 has **no percentage** and three remaining
  finish-line gates: one safe-fixture manual-accessibility evidence/fix package,
  one upstream accessibility-copy parity decision, then one fixed-rubric
  scoring/certification transaction. Thirty-eight later commits remain
  published but unscored.
- Local `main` schema inventory is now 458 Laravel / 440 ASP.NET / 242 exact /
  216 missing / 198 ASP.NET-only after user-authorized merge `df8c8b96`.
  `origin/main` remains at the older 425/227/231/198 snapshot. The local merge
  contributes zero until pushed, rerun as a complete exact-SHA package, and
  accepted in a scoring transaction.
- The ordinary Laravel database remains a confidential production-derived
  snapshot and is never a test fixture.

## Required Verification

Run from the repository root:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/check-documentation-consistency.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/check-markdown-links.ps1
npm --prefix apps/web-uk test -- --runInBand tests/shared-accessible-shell.test.js -t "legal and accessibility|localizes the legal hub"
npm --prefix apps/web-uk test -- --runInBand tests/api-consumer-ledger.test.js tests/api-consumer-method-spoof.test.js tests/route-matrix-generator.test.js
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/test-compare-laravel-schema-parity.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/compare-laravel-schema-parity.ps1
docker compose -f compose.production.yml config
docker compose -f compose.production.yml config --services
docker compose -f compose.fullstack.yml config --services
git diff --check
```

The public accessibility checks above verify that translated limitation and
feedback copy remains while unsupported feature, testing, commitment, and Home
keyboard/screen-reader assurances are absent. Both obsolete Compose files must
resolve to zero services even when inspected directly. Workflow triggers,
input handling, health-alert permissions, configuration keys, and the D2
category sum are also enforced by the consistency guard.

## Verification Results At D2

- documentation consistency: passed after the local schema-merge boundary was
  reconciled;
- relative Markdown links: 212 links across 91 Markdown files, zero missing;
- workflow syntax: all 8 GitHub workflow YAML files parsed;
- deployment/health guard assertions: the local deploy trigger is manual-only,
  its legacy job is hard-disabled, the exact SHA is validated before checkout
  and reverified after checkout, and all three health probes feed an issue path
  with explicit `issues: write` permission and no label dependency;
- Compose syntax: root, quarantined production, quarantined full-stack, Web UK,
  and standalone-admin files passed `config --quiet` with documentation-only
  placeholder secrets where interpolation required them;
- public accessibility correction: 2 focused cases passed (817 unrelated cases
  skipped by the name filter), including Arabic/RTL limitation copy and absence
  of the unsupported keyboard/screen-reader assurances;
- Web UK generator/document contracts: 3 suites and 10 tests passed;
- schema comparator fixture: passed, including malformed-render rejection;
- read-only schema comparator on the merged local tree: 384 Laravel migration
  files, 164 ASP.NET migration source files, 458 Laravel source tables, 440
  ASP.NET tables, 242 exact matches, 216 Laravel-only names, and 198 ASP.NET-
  only names;
- host EF path: repository-local EF 8.0.11 restored; the API project completed
  with 0 errors/3 warnings and `has-pending-model-changes` reported no model
  change. Because local `main` advanced during the build, this verifies the
  documented command path, not a complete exact-merge product certification;
  and
- `git diff --check`: passed for the final reconciliation diff.

No production system, Laravel database, production-derived data, or remote
deployment was used by these documentation checks.

Read-only GitHub metadata at the audit boundary confirmed that `origin/main`
still carries the old automatic trigger, the named `production` environment has
no protection rules and permits administrator bypass, and repository workflow
permissions default to read-only. These are recorded operational hazards, not
evidence that the local safety transaction has been published.

Do not retain 100/100 if any required gate fails or an independent audit finds
an unresolved contradiction. Correct the defect or lower the affected D2 row
and document the exact remaining deduction.
