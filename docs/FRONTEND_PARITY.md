# Frontend Route Parity Map

Last reviewed: 2026-07-03

Laravel source of truth:

- `C:\platforms\htdocs\staging\react-frontend`
- `C:\platforms\htdocs\staging\accessible-frontend`
- `C:\platforms\htdocs\staging\routes\govuk-alpha.php`
- `C:\platforms\htdocs\staging\routes\govuk-alpha-parity`

.NET targets:

- `apps/react-frontend`
- `apps/web-uk`
- `apps/admin` remains secondary unless a task explicitly targets it.

## Current Route Counts

Generated with `scripts/compare-laravel-frontend-parity.ps1` on 2026-07-04.

| Surface | Laravel source routes | .NET target routes | Matched | Missing from .NET | Extra in .NET |
| --- | ---: | ---: | ---: | ---: | ---: |
| React SPA/admin | 589 | 462 | 393 | 196 | 69 |
| Accessible HTML | 607 | 136 | 53 | 554 | 83 |

These counts are not a frontend parity score. The comparison is a static route
inventory using React Router `<Route path="...">`, Laravel GOV.UK route files,
and Express `app/router` declarations. It does not prove rendered UI parity,
feature-gate parity, API wiring, localization, accessibility quality, or workflow
completion.

The script intentionally compares React routes only against `apps/react-frontend`
and accessible routes only against `apps/web-uk`, so one frontend cannot hide a
missing route in the other.

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

- Every Laravel React route is implemented in `apps/react-frontend`, intentionally
  redirected with equivalent behavior, or documented as replaced by a .NET
  equivalent workflow.
- Every Laravel accessible route under `govuk-alpha*` has an equivalent
  `apps/web-uk` route, view, form method, validation behavior, and API support.
- Admin, super-admin, partner, broker, and accessible surfaces are tracked
  independently.
- Route parity is followed by rendered UI checks, API-contract checks, feature
  gate checks, localization checks, and accessibility checks.
