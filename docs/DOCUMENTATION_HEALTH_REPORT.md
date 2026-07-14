# Documentation Health Report

Last verified: 2026-07-14

Status: **Generated snapshot — documentation quality only, not product readiness**

<!-- doc-consistency: DOCUMENTATION_HEALTH_SCORE=100/100 -->

## Baseline D1

Documentation Health Baseline D1 scores the verified documentation snapshot
**100/100**. It was prepared against product-source baseline
`327984b02de82350b8f17b6cb885a3a27c7d95be` and Laravel source commit
`903d03d3db78bbf87129ad35728be3b72819acaf`. A documentation-only commit may sit
above that product baseline without changing its evidence. Re-run every gate
below and update the repository-state note before reporting this score after
either product source moves.

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
| Product-document coverage and accuracy | 10/10 | Current docs cover the 2x2 target, backend queue, Web UK queue, localization contract, module map, admin secondary surface, migrations, deployment boundaries, and known certification gaps without presenting presence/counts as correctness. |
| Automated consistency and link hygiene | 5/5 | Consistency, generated-artifact, relative-link, focused generator-test, and whitespace/diff gates pass. |
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
git diff --check
```

Latest results:

- documentation consistency: passed;
- relative Markdown links: 126 checked across 72 files, zero missing;
- generator/document contract tests: 3 suites, 8 tests passed;
- focused shared-shell documentation assertion: 1 passed and 783 skipped by
  name filter;
- route inventory: 689 Laravel routes, 688 matched, 1 missing;
- API consumer ledger: 663 contracts, 448 OpenAPI matches, 215 unmatched,
  0 dynamic; these dirty-tree generated counts are unscored product evidence;
- `git diff --check`: passed with line-ending conversion warnings only;
- independent adversarial re-audit: passed after all reported contradictions
  and evidence mismatches were corrected.

Do not retain 100/100 if the independent audit finds an unresolved contradiction
or if any required command fails. Update this report and the consistency guard
in the same remediation.
