# Frontend Route Parity Map

Last reviewed: 2026-07-05

Laravel source of truth:

- `C:\platforms\htdocs\staging\react-frontend`
- `C:\platforms\htdocs\staging\accessible-frontend`
- `C:\platforms\htdocs\staging\routes\govuk-alpha.php`
- `C:\platforms\htdocs\staging\routes\govuk-alpha-parity`

.NET targets:

- `apps/react-frontend` is now legacy/frozen and kept as historical reference.
- `apps/web-uk` is the future shared accessible frontend candidate.
- `apps/admin` remains secondary unless a task explicitly targets it.

Canonical React frontend target:

- `C:\platforms\htdocs\staging\react-frontend`

The forward path is not to continue developing the ASP.NET React copy. The
forward path is to make the ASP.NET backend contract-compatible with the
production Laravel React frontend. Do not modify frontend files unless the user
explicitly approves that specific frontend change.

## Current Route Counts

Generated with `scripts/compare-laravel-frontend-parity.ps1` on 2026-07-04.
These historical accessible counts are superseded for current Web UK work by
`apps/web-uk/docs/generated/accessible-route-matrix.*`.

| Surface | Laravel source routes | .NET target routes | Matched | Missing from .NET | Extra in .NET |
| --- | ---: | ---: | ---: | ---: | ---: |
| React SPA/admin | 589 | 462 | 393 | 196 | 69 |
| Accessible HTML | 607 | 136 | 53 | 554 | 83 |

These counts are not a frontend parity score. The comparison is a static route
inventory using React Router `<Route path="...">`, Laravel GOV.UK route files,
and Express `app/router` declarations. It does not prove rendered UI parity,
feature-gate parity, API wiring, localization, accessibility quality, or workflow
completion.

The historical script compares Laravel React routes against the legacy
`apps/react-frontend` copy and accessible routes against `apps/web-uk`. Those
React counts are now historical inventory only. They do not define the forward
development target and must not be used to justify new work in the legacy React
copy.

Future compatibility reports should instead inventory API calls made by
`C:\platforms\htdocs\staging\react-frontend`, then verify that ASP.NET exposes
compatible routes, request shapes, response shapes, auth/tenant behavior,
uploads, realtime config, and status codes.

Current Web UK accessible route evidence after merge commit `f7c80d32` on
2026-07-08 lives in `apps/web-uk/docs/generated/accessible-route-matrix.*`.
That matrix reports 608 Laravel accessible declarations, 612 local Web UK route
declarations, 608 exact matches, 0 missing Laravel routes, 2 extra local
exchange workflow routes, and 3 ignored infrastructure/helper routes. It still
does not prove rendered UI, workflow, tenant/auth, localization, API side
effects, or live Laravel runtime behavior.

## Accessible Frontend Direction

The Laravel Blade accessible frontend is the current visual/workflow source of
truth:

```text
C:\platforms\htdocs\staging\accessible-frontend
C:\platforms\htdocs\staging\routes\govuk-alpha.php
C:\platforms\htdocs\staging\routes\govuk-alpha-parity
```

`apps/web-uk` keeps the preferred Express/Nunjucks/GOV.UK Frontend stack and is
being prepared as the future shared accessible frontend. Shell and Explore
skeleton work does not change the route counts above and does not prove
production readiness. The React utility-bar accessible link must continue
pointing at the production Laravel accessible frontend until `apps/web-uk` has
passed route, workflow, tenant-domain, auth, localization, accessibility, and
runtime smoke certification.

## Generated Artifacts

The repeatable static comparison script writes these ignored artifacts by
default:

```text
artifacts/parity/frontend/frontend-parity.json
artifacts/parity/frontend/frontend-parity.csv
artifacts/parity/frontend/frontend-parity.md
```

Run the fixture test before relying on a regenerated report:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\test-compare-laravel-frontend-parity.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\compare-laravel-frontend-parity.ps1
```

## High-Risk Missing React Families

This section is historical. It shows what the old ASP.NET React fork was missing
at the time of the route scan. Do not implement these gaps in
`apps/react-frontend/` unless explicitly approved. Prefer implementing the
ASP.NET backend endpoints required by the canonical Laravel React frontend.

| Route family | Missing routes | Parity implication |
| --- | ---: | --- |
| `admin/*` | 63 | Admin modules still have major route gaps, especially caring, marketplace, national KISS, and operations. |
| `super-admin/*` | 25 | Platform-level administration remains incomplete. |
| `caring-community/*` | 24 | Member-facing Caring Community route set is mostly absent in .NET React. |
| `broker/*` | 9 | Broker/admin route ownership needs reconciliation. |
| `courses/*` | 9 | Course frontend remains a module gap. |
| `podcasts/*` | 4 | Podcast frontend remains a module gap. |

## High-Risk Missing Accessible Families

| Route family | Missing routes | Parity implication |
| --- | ---: | --- |
| `volunteering/*` | 52 | `apps/web-uk` lacks most Laravel accessible volunteering workflows. |
| `marketplace/*` | 48 | Accessible marketplace workflow coverage is mostly missing. |
| `jobs/*` | 38 | Accessible jobs workflow coverage is incomplete. |
| `ideation/*` | 34 | Accessible ideation workflow coverage is incomplete. |
| `federation/*` | 28 | Federation accessible/admin-adjacent routes need mapping. |
| `goals/*` | 27 | Goals accessible workflow coverage is incomplete. |
| `groups/*` | 27 | Group accessible workflow coverage is incomplete. |
| `courses/*` | 26 | Accessible course workflows are absent from .NET. |
| `feed/*` | 21 | Accessible feed workflows are substantially incomplete. |
| `profile/*` | 20 | Profile/account accessible routes need parity work. |

## Acceptance Criteria For Frontend Parity

- The production Laravel React frontend at
  `C:\platforms\htdocs\staging\react-frontend` can run against ASP.NET for the
  certified module without request/response contract failures.
- Every Laravel React API call used by the certified module has a matching
  ASP.NET method/path, including `/api/v2` aliases where expected.
- Request bodies, query parameters, response envelopes, pagination, validation
  errors, auth/tenant errors, upload behavior, realtime config, and status codes
  are compatible with Laravel.
- Every Laravel accessible route under `govuk-alpha*` has an equivalent
  `apps/web-uk` route, view, form method, validation behavior, and API support.
- Admin, super-admin, partner, broker, and accessible surfaces are tracked
  independently.
- Compatibility is proven with a route/API matrix, ASP.NET regression tests, and
  runtime smoke tests using the Laravel React frontend against the ASP.NET API.
