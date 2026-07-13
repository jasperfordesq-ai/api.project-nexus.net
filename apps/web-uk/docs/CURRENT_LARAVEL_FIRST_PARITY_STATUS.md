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

The audit was refreshed through ASP.NET-repo commit `9ecb5cb2` and
Laravel-repo commit `c2cf4fa`. Refresh both
repositories before relying on these numbers after either source moves.

| Measure | Audited result | Meaning |
|---|---:|---|
| Laravel accessible HTML routes | 687 | Current source inventory |
| Web UK routes | 688 | Includes deliberate local compatibility routes |
| Matched Laravel routes | 681/687 (99.13%) | Declaration coverage only |
| Missing Laravel routes | 6 | All are Event workflows |
| Extra Web UK routes | 5 | Four 404 tombstones plus one binary proxy |
| Ignored infrastructure routes | 3 | Health/root infrastructure |
| Jest | 47/47 suites, 1,568/1,568 tests | Fresh green code gate |
| Locale catalog shape | 11 locales, 35 namespaces, 8,663 keys | Structural parity plus static-key resolution gate |
| Blade marker check | 19/19 | Text-marker spotcheck, not visual certification |
| Automated accessibility | Latest recorded 87/87 | Manual AT review remains open |

The generated route matrix was refreshed against the same route inventories
and reports the counts above. It remains declaration evidence, not runtime or
workflow certification.

## Localization P0 Closed In Current Slice

The previously identified raw-key risk is fixed and guarded. The generator now
imports every Laravel `event_*.php` catalog alongside `govuk_alpha*.php`, and
the runtime resolves namespaces from the generated catalog rather than a fixed
allowlist.

Event analytics, communications, calendar, recurrence, registration, and
template references now use the current Laravel Blade keys. The complete-static
key gate scans Web UK source and fails when a literal `t()` or `tc()` reference
does not resolve in the English generated catalog.

A fresh proof run records:

- 11 locales, 35 namespaces, and 8,663 keys per locale;
- zero missing or extra keys in every locale;
- 6,400 complete static references and 4,847 unique referenced keys;
- zero unresolved complete static references;
- 315 templates and zero conservative hard-coded-copy matches;
- an English and Irish Event-template library render with no raw key leakage;
- focused 21/21 tests and full 47/47-suite, 1,568/1,568-test proof;
- green brand, lint, CSS, and `git diff --check` gates.

The live Blade marker comparator also uses the canonical
`/{tenantSlug}/accessible` Laravel mount and passed 19/19. `/alpha` remains a
legacy redirect-compatibility route and must not be used as the comparison
source.

The existing `locales:audit-templates` command looks for conservative
hard-coded English matches; it does not prove that referenced keys resolve.
The new `locales:audit-keys` command supplies that separate proof. Dynamic keys
still require focused route rendering because no static scanner can prove
runtime values.

Do not claim complete localization parity merely from this gate: backend-authored
copy, dynamic-key families, English-identical source values, contextual quality,
and manual language review remain separate evidence boundaries.

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

After the localization P0, the remaining priority order is:

1. Repair the local Laravel schema drift around
   `events.accessibility_step_free`, then rerun the complete exhaustive
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
npm --prefix apps/web-uk run locales:sync
npm --prefix apps/web-uk run locales:audit
npm --prefix apps/web-uk run locales:audit-keys
npm --prefix apps/web-uk run locales:audit-templates -- --summary
npm --prefix apps/web-uk run test:accessibility
npm --prefix apps/web-uk run visual:blade
npm --prefix apps/web-uk run smoke:laravel:local
git diff --check -- apps/web-uk
```

Record the exact Laravel and Web UK SHAs, fixture identity, commands, pass/fail
counts, retained failures, and cleanup result. Route equality, a focused test,
or a stale listener is not certification.
