# Documentation Health Report

Last verified: 2026-07-15 06:24 +01:00

Status: **Generated snapshot — documentation quality only, not product readiness**

<!-- doc-consistency: DOCUMENTATION_HEALTH_SCORE=100/100 -->

## Baseline D1

Documentation Health Baseline D1 scores the re-audited documentation snapshot
**100/100**. It was verified against Web UK/repository product baseline
`1ded18bd5e49e09c06d697ac0699a9cc31181d25` and Laravel source commit
`903d03d3db78bbf87129ad35728be3b72819acaf`. The documentation transaction may
sit above that product baseline without changing its product evidence. Re-run
every gate below and update the repository-state note before reporting this
score after either product source moves.

This is not a parity or readiness score. Read the live product totals only from
[`CURRENT_ASPNET_CONTRACT_STATUS.md`](CURRENT_ASPNET_CONTRACT_STATUS.md) and
[`CURRENT_LARAVEL_FIRST_PARITY_STATUS.md`](../apps/web-uk/docs/CURRENT_LARAVEL_FIRST_PARITY_STATUS.md);
this report deliberately does not mirror either number.

Documentation can earn full health points while accurately describing
unfinished, uncertified, published-but-unscored, or dirty product work.

## Fixed 100-Point Rubric

| Category | Score | Evidence |
| --- | ---: | --- |
| Canonical authority and navigation | 15/15 | Root and Web UK first-read entry points link both canonical status sources; historical handoffs are not resume targets. |
| Two-frontends-by-two-backends intent | 15/15 | Architecture, runbook, retirement policy, and switching contract consistently require unchanged canonical React and Web UK clients against Laravel and ASP.NET, with Laravel defining the contract. |
| Stable scoring and repository-state reporting | 20/20 | One banked score exists per workstream; reports separate banked, published-but-unscored, and dirty work; implementation/certification evidence is not converted into competing percentages. |
| Data and production safety | 20/20 | The ordinary production-derived Laravel database is read-only; stateful certification requires a verified disposable environment; production actions require explicit authorization and the component-specific production map; legacy blanket deployment notes are quarantined. |
| Provenance and historical integrity | 15/15 | Long-lived status-like documents carry state labels; old plans/checkpoints are fenced; generated route/API artifacts record generation time, exact SHAs, dirty state, input hashes where applicable, and a provenance caveat. |
| Product-document coverage and accuracy | 10/10 | Current docs cover the 2x2 target, backend queue, Web UK queue, localization contract, module map, schema inventory, migrations, deployment boundaries, known certification gaps, and the exact restart incident without presenting presence/counts as correctness. |
| Automated consistency and link hygiene | 5/5 | Consistency, generated-artifact, relative-link, schema/Web UK generator-test, and whitespace/diff gates pass. |
| **Total** | **100/100** | **Documentation health only.** |

The denominator and category weights are fixed for Baseline D1. A future defect
reduces the relevant category; newly discovered documentation scope does not
silently change the denominator. Restore points only with evidence and name a
new baseline if the rubric itself must change.

## Verification Evidence

Run from the repository root:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/check-documentation-consistency.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/check-markdown-links.ps1
npm --prefix apps/web-uk test -- --runInBand tests/api-consumer-ledger.test.js tests/api-consumer-method-spoof.test.js tests/route-matrix-generator.test.js
npm --prefix apps/web-uk test -- --runInBand tests/shared-accessible-shell.test.js -t "documents route matrix and backend-switching preparation without readiness claims"
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/test-compare-laravel-schema-parity.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/compare-laravel-schema-parity.ps1
git diff --check
```

Latest results:

- documentation consistency: passed at the current score and generated-count
  boundaries;
- relative Markdown links: 139 checked across 75 files, zero missing;
- Web UK generator/document contract tests: 3 suites, 10 tests passed;
- focused shared-shell documentation assertion: 1 passed and 815 skipped by
  name filter;
- complete Web UK clean-snapshot gate: 52/52 suites and 1,706/1,706 tests;
- route inventory: 689 Laravel routes, 688 matched, 1 missing;
- API consumer ledger: 668 contracts, 451 OpenAPI matches, 217 unmatched,
  0 dynamic; all unmatched rows resolve to direct Laravel route declarations;
- schema comparator fixture: passed, including exact rendered Markdown-row and
  malformed-placeholder rejection;
- full read-only schema comparator: 458 Laravel tables, 425 ASP.NET tables, 227
  exact names, 231 apparent gaps, 198 ASP.NET-only names, with a valid Markdown
  artifact and no literal object-expression placeholders;
- restart evidence is preserved in
  [`RESTART_INCIDENT_2026-07-15.md`](RESTART_INCIDENT_2026-07-15.md), including
  exact Irish times, Windows Update cause, update identifiers, and the banked-
  versus-interrupted work boundary;
- `git diff --check`: passed for the complete re-audit transaction;
- independent adversarial re-audit: passed after all reported contradictions
  and evidence mismatches were corrected.

Do not retain 100/100 if the independent audit finds an unresolved contradiction
or if any required command fails. Update this report and the consistency guard
in the same remediation.
