# Current Laravel-First Accessible Frontend Status

Last audited: 2026-07-13

This is the short, current coordination document for `apps/web-uk`. Read it
before starting or resuming accessible-frontend work. It overrides older route,
test, localization, and readiness counts in narrative handoffs, while
`BLADE_COMPONENT_PORT_AUDIT.md` remains the detailed evidence ledger.

## Goal And Source Of Truth

`apps/web-uk` must become an observable-behavior clone of the Laravel
accessible frontend while retaining the Express/Nunjucks/GOV.UK Frontend stack.

- Laravel logic/API source: `C:\platforms\htdocs\staging`
- Laravel layout, structure, copy, and workflow source:
  `C:\platforms\htdocs\staging\accessible-frontend`
- Target frontend: `C:\platforms\htdocs\asp.net-backend\apps\web-uk`
- Canonical public mount: `/{tenantSlug}/accessible`
- Legacy `/{tenantSlug}/alpha`: redirect compatibility only
- Primary backend now: Laravel
- Future backend: ASP.NET, not ready and not certified

Laravel is read-only from this repo. Do not solve a missing Laravel API by
inventing frontend-only behavior, querying Laravel's database directly, or
editing `C:\platforms\htdocs\staging` from this workstream.

## Concurrent-Session Ownership

The accessible-frontend session owns `apps/web-uk/**` only. The ASP.NET parity
session owns backend work, including `src/Nexus.Api/**`,
`tests/Nexus.Api.Tests/**`, and backend migrations. During concurrent work:

1. Run `git status --short` and `git log -1 --oneline` before every slice.
2. Preserve every unrelated dirty file. Never reset, restore, move, or stage it.
3. Stage explicit `apps/web-uk/...` paths; never use `git add -A` or
   `git commit -a`.
4. Keep one bounded frontend behavior and its evidence in each commit.
5. Recheck `HEAD` and the scoped diff immediately before staging because both
   sessions share this working directory.
6. If an unexpected `apps/web-uk` change appears, inspect ownership before
   editing the same file.
7. Do not modify the frozen `apps/react-frontend` copy or any production
   container.

Do not append another general progress narrative to
`CURRENT_WEB_UK_HANDOFF.md`. Update this file only when the source SHAs,
blocker set, route-gap set, or certification state materially changes. Put
detailed row evidence in `BLADE_COMPONENT_PORT_AUDIT.md` in the same scoped
commit as the implementation it describes.

## Audited Baseline

The audit was based on ASP.NET-repo commit `db492e01` and Laravel-repo commit
`c2cf4fa`. Refresh both SHAs before relying on the numbers below.

| Measure | Audited result | Meaning |
|---|---:|---|
| Laravel accessible HTML routes | 687 | Current source inventory |
| Web UK routes | 688 | Includes deliberate local compatibility routes |
| Matched Laravel routes | 681/687 (99.13%) | Declaration coverage only |
| Missing Laravel routes | 6 | All are Event workflows |
| Extra Web UK routes | 5 | Four 404 tombstones plus one binary proxy |
| Ignored infrastructure routes | 3 | Health/root infrastructure |
| Jest | 46/46 suites, 1,567/1,567 tests | Fresh green code gate |
| Locale catalog shape | 11 locales, 27 namespaces, 8,014 keys | Structural parity only |
| Blade marker check | 19/19 | Text-marker spotcheck, not visual certification |
| Automated accessibility | Latest recorded 87/87 | Manual AT review remains open |

The committed generated route matrix predates four explicit 404 tombstones and
still reports 684 Web UK routes and one extra. Regenerate and classify those
routes before treating the committed artifact as current.

## P0: Localization Is Not Green

The structural locale audits pass, but recently ported Event templates can
render raw translation keys.

The current generator imports `govuk_alpha*.php` plus only
`event_agenda.php`, `event_offline_checkin.php`, and `event_safety.php`. Laravel
also has accessible Event catalogs for accessibility, analytics, calendar,
lifecycle history, recurrence blueprints, registration, templates, and
tickets. The runtime resolver also hard-codes the smaller namespace set.

A read-only complete-literal scan found:

- 284 unresolved `t()`/`tc()` call sites;
- 267 unique unresolved keys;
- 19 affected templates;
- visible risk across registration, recurrence blueprints, communications,
  tickets, lifecycle history, calendar subscriptions, analytics, and templates.

`event_registration.title`, `event_tickets.title`,
`event_lifecycle_history.title`, and `event_templates.title` currently resolve
to their raw key text. Analytics and communications also use incorrect
`govuk_alpha_events...` prefixes where Laravel uses keys in the core
`govuk_alpha` namespace.

The existing `locales:audit-templates` command looks for conservative
hard-coded English matches; it does not prove that referenced keys resolve.

### Required first slice

1. Import every Laravel locale namespace referenced by accessible views.
2. Resolve namespaces from the generated catalog rather than a fixed regex.
3. Correct Event analytics and communications key prefixes against Blade.
4. Add a read-only unresolved-key audit for every complete static `t()`/`tc()`
   reference, with focused handling for dynamic keys.
5. Prove representative English and non-English Event pages render translated
   copy, not key names.
6. Run `locales:sync`, both locale audits, focused tests, the full Jest gate,
   lint, brand check, and `git diff --check -- apps/web-uk`.

Do not claim localization parity merely because all generated locale files have
the same key shape.

## Six Missing Route Contracts

Five missing routes are the Event moderation queue and approve/reject
confirmation/actions:

- `GET /events/moderation`
- `GET /events/moderation/{id}/approve`
- `GET /events/moderation/{id}/reject`
- `POST /events/moderation/{id}/approve`
- `POST /events/moderation/{id}/reject`

Laravel exposes related `/api/v2/admin/events` list/detail/approve/reject APIs,
but they are not yet contract-identical to Blade. The API list uses Event
publication state and Event creation order; Blade uses pending moderation-queue
rows and queue-submission order. API approval uses a general approval workflow;
Blade requires an atomic pending moderation decision. Do not mark these five
routes certified until Laravel exposes equivalent queue membership, ordering,
and race-safe decision semantics.

The sixth missing route is:

- `POST /events/{id}/check-in/code`

Blade's online signed-code flow resolves the attendee and current attendance
version server-side. The existing offline-scan API instead requires a device
secret, expected attendance version, and idempotency key. Exact parity needs a
safe Laravel online-scan contract or an intentional source-contract change.

Record these as upstream API-boundary gaps. Do not hide them with synthetic
success, unsafe orchestration, or a generic preparation page.

## Remaining Certification Work

After localization and the six route contracts:

1. Repair the local Laravel schema drift around
   `visible_events.publication_status`, then rerun the complete exhaustive
   Laravel smoke. "All quarters classified" is not the same as all checks
   passing.
2. Reconcile low-overlap Blade/Nunjucks families, especially feed, listings,
   search, messages, group create/detail, saved jobs, and recent Event flows.
3. Compare significant states per route: guest, member, owner, tenant admin,
   feature-disabled, empty, populated, validation failure, authorization
   failure, pagination, mutation, upload, and download.
4. Add representative screenshot/layout comparison. `visual:blade` is a
   normalized marker check only.
5. Complete manual keyboard, screen-reader, focus-order, error-summary, no-JS,
   zoom/reflow, forced-colour, and disabled-user evidence.
6. Add a generated frontend-consumer API ledger covering method/path, tenant
   authority, role, request shape, response/status/error envelope, redirects,
   side effects, cleanup, Laravel implementation, frontend consumer, and tests.
7. Harden production concerns separately: persistent sessions, production-only
   secrets/configuration, and request timeouts/abort handling.

ASP.NET proof is deliberately last. First certify the unchanged frontend
against Laravel. When ASP.NET is ready, change only backend configuration and
run the same evidence suite; do not introduce an ASP.NET-specific frontend
adapter.

## Current Verification Gate

From the repository root:

```powershell
npm --prefix apps/web-uk run brand:check
npm --prefix apps/web-uk run lint
npm --prefix apps/web-uk test -- --runInBand
npm --prefix apps/web-uk run build:css
npm --prefix apps/web-uk run route:matrix
npm --prefix apps/web-uk run locales:audit
npm --prefix apps/web-uk run locales:audit-templates -- --summary
npm --prefix apps/web-uk run test:accessibility
npm --prefix apps/web-uk run visual:blade
npm --prefix apps/web-uk run smoke:laravel:local
git diff --check -- apps/web-uk
```

Record the exact Laravel and Web UK SHAs, fixture identity, commands, pass/fail
counts, retained failures, and cleanup result. Route equality, a focused test,
or a stale listener is not certification.
