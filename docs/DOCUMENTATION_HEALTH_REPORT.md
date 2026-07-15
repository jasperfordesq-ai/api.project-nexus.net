# Documentation Health Report

Last verified: 2026-07-15 17:13 +01:00

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
against Laravel source `903d03d3db78bbf87129ad35728be3b72819acaf`, pre-
documentation ASP.NET product `9ad163c969a935407297eb459a9840798a1a9e78`,
Web UK banked product `2e92f89e`/scoring record `b5b2c0a7`, latest pre-audit
Web UK product `6864f7be`, and isolated unbanked schema candidate `97b8a4a0`.

This score means the maintained documentation accurately describes both
completed and unfinished work. It does not mean the product, ASP.NET backend,
Web UK, schema candidate, provider integrations, CI, or production operations
are complete or certified.

| D2 category | Score | Evidence |
| --- | ---: | --- |
| Member/end-user coverage and accessibility honesty | 15/15 | User hub covers onboarding, community features, accounts/privacy, language, accessibility, evidence limits, and support. Unsupported public keyboard/screen-reader assurances are withheld pending manual evidence. |
| Administrator, support, and vulnerability guidance | 10/10 | Tenant-admin duties are separated from platform operations; support and private vulnerability reporting are discoverable and prohibit secrets/personal data. |
| API consumer and integration guidance | 10/10 | Consumer hub documents versioning, auth, tenancy, endpoint-specific envelopes, errors, pagination, uploads, idempotency, side effects, and correlation evidence without inventing one universal contract. |
| System development, configuration, testing, and security | 15/15 | System hub records correct local ports/seed credentials/startup effects, current option keys, disposable-test boundaries, evidence levels, tenancy/security architecture, and known limitations. |
| Operator, production, data, and incident safety | 15/15 | Production needs explicit authority; automatic deployment is removed; exact-SHA confirmation is required; stale Compose is quarantined; restart/auto-migration, backup/restore, and read-only incident boundaries are explicit. |
| Current status, scoring, and provenance | 15/15 | Backend remains 712/1000; Web UK W1 remains 663/1000 while W2 uses one remaining package and no percentage; 11 backend commits, 38 Web UK commits, dirty tests, and nine local schema commits remain unscored. |
| Navigation, ownership, and historical integrity | 10/10 | Root/docs/Web UK entry points route each audience to one authority; historical handoffs and tool-owned snapshots cannot supply current scores or queues. |
| Automated consistency, links, and executable-example hygiene | 10/10 | The consistency guard checks audience hubs, credentials/ports, deployment safety, configuration keys, score markers, and stale Web UK prose in addition to link and diff gates. |
| **Total** | **100/100** | **Documentation health only.** |

The D2 denominator is fixed. A newly discovered defect reduces its category
until corrected; it must not be hidden by changing the denominator. A future
rubric change requires a new named baseline and a before/after mapping.

## Current Product Boundaries Preserved

- [ASP.NET Fixed Rubric Baseline 1](CURRENT_ASPNET_CONTRACT_STATUS.md) remains
  **712/1000**. Eleven later backend
  commits and two dirty test corrections are published/in-flight but unscored.
- [Web UK Baseline W1](../apps/web-uk/docs/CURRENT_LARAVEL_FIRST_PARITY_STATUS.md)
  remains **663/1000**. Goal W2 has **no percentage** and one
  safe-fixture manual-accessibility package remaining; 38 later commits remain
  published but unscored.
- Mainline schema inventory remains 458 Laravel / 425 ASP.NET / 227 exact / 231
  missing / 198 ASP.NET-only. The clean local schema branch projects 440/242/
  216/198 but contributes zero until reconciled, published, rerun, and scored.
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
git diff --check
```

The public accessibility checks above verify that translated limitation and
feedback copy remains while unsupported feature/testing assurances are absent.
Compose validation must produce no active service without the deliberately
named quarantine profile. Workflow YAML and configuration-key assertions are
also enforced by the consistency guard.

Do not retain 100/100 if any required gate fails or an independent audit finds
an unresolved contradiction. Correct the defect or lower the affected D2 row
and document the exact remaining deduction.
