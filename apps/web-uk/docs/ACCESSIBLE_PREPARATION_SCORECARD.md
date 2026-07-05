# Accessible Preparation Scorecard

Last reviewed: 2026-07-05

## Score

Preparation guardrail/tooling score: **1000 / 1000**.

This score means the ASP.NET accessible frontend folder now has the preparation
artefacts needed for future agents to work safely. It does not mean the
accessible frontend is production-ready. It also does not mean the accessible
frontend is route-complete, workflow-complete, Laravel-backend compatible, or
ASP.NET-backend compatible.

## What 1000 / 1000 Covers

| Preparation area | Status | Evidence |
| --- | --- | --- |
| Laravel Blade source declared | Complete | `AGENTS.md`, `CLAUDE.md`, `ACCESSIBLE_SHARED_FRONTEND.md` |
| Header/footer Blade shell contract | Complete for preparation | `src/lib/accessible-shell.js`, `layouts/base.njk`, `partials/footer.njk` |
| Top-level skeleton destinations | Complete for preparation | `src/routes/static-pages.js` |
| Full Laravel accessible route inventory | Complete | `LARAVEL_ACCESSIBLE_ROUTE_INVENTORY.md` |
| Laravel-to-ASP.NET shell route matrix | Complete for preparation | `LARAVEL_ACCESSIBLE_ROUTE_MATRIX.md` |
| Full Blade view inventory | Complete | `BLADE_VIEW_INVENTORY.md` |
| Blade component port audit | Complete | `BLADE_COMPONENT_PORT_AUDIT.md` |
| Backend switching contract | Complete for preparation | `BACKEND_SWITCHING_CONTRACT.md` |
| Backend contract family matrix | Complete for preparation | `ACCESSIBLE_BACKEND_CONTRACT_MATRIX.md` |
| Regeneration tooling | Complete | `scripts/generate-accessible-prep-audit.js`, `npm run audit:accessible-prep` |
| Smoke tests | Complete for preparation | `tests/shared-accessible-shell.test.js` |
| GOV.UK identity guardrails | Complete for preparation | `scripts/brand-check.js`, docs, tests |

## What Remains Outside Preparation

These are implementation and certification tasks, not preparation tasks:

- Port every Blade page to Nunjucks.
- Implement tenant slug and custom accessible domain routing.
- Implement every GET/POST workflow.
- Wire live data for every module.
- Prove auth, CSRF, validation, redirect, upload, feature-gate, localization,
  and error behavior against ASP.NET.
- Prove Laravel-compatible and ASP.NET-compatible backend modes.
- Change the production React utility-bar accessible link.

## Current Generated Inventory Snapshot

Generated on 2026-07-05 with `npm run audit:accessible-prep`:

| Metric | Count |
| --- | ---: |
| Laravel accessible route declarations | 608 |
| Laravel Blade accessible views | 289 |
| ASP.NET static skeleton paths | 31 |

The large number of missing routes/views is expected. The purpose of this pass
is to make those gaps visible and safe to work through later.
