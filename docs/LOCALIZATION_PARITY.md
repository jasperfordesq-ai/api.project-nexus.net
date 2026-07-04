# Localization Parity Map

Last reviewed: 2026-07-03

Laravel source of truth: `C:\platforms\htdocs\staging\lang`.

.NET target: `apps/react-frontend/public/locales`.

## Current Source Counts

Generated with `scripts/compare-laravel-localization-parity.ps1` on
2026-07-04. The default key-level pass scans English (`en`) only so the report
stays fast enough to run locally; locale and namespace presence are scanned for
all languages.

| Surface | Laravel | .NET | Matched | Missing from .NET | Extra in .NET |
| --- | ---: | ---: | ---: | ---: | ---: |
| Locales | 11 | 7 | 7 | 4 | 0 |
| Locale namespaces | 605 | 280 | 49 | 556 | 231 |
| English keys in matched namespaces | 17,280 | 5,575 | 157 | 4,942 | 436 |

Missing locale directories: `ar`, `ja`, `nl`, `pl`.

These counts are not a localization parity score. Laravel includes backend,
admin, email, API, and accessible GOV.UK namespaces. The .NET target currently
tracks React i18next JSON namespaces, so namespace aliases and backend/email
translation targets still need explicit product and architecture decisions.

## Generated Artifacts

The repeatable static comparison script writes these ignored artifacts by
default:

```text
artifacts/parity/localization/localization-parity.json
artifacts/parity/localization/localization-parity.md
artifacts/parity/localization/localization-locales.csv
artifacts/parity/localization/localization-namespaces.csv
artifacts/parity/localization/localization-keys.csv
```

Run the fixture test before relying on a regenerated report:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\test-compare-laravel-localization-parity.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\compare-laravel-localization-parity.ps1
```

To scan additional key locales, pass `-KeyLocales en,de,fr` or another explicit
set. The all-locale key matrix is intentionally not the default because the
Laravel language catalog is large.

## High-Risk Missing Namespace Families

The following Laravel namespaces are absent for all 11 source locales in the
current static comparison:

| Namespace family | Missing locale namespaces | Parity implication |
| --- | ---: | --- |
| `govuk_alpha_*` accessible namespaces | many full-locale gaps | `apps/web-uk` lacks the Laravel accessible frontend translation catalog. |
| `super_admin` | 11 | Platform-level administration lacks translated copy coverage. |
| `safeguarding` | 11 | Safeguarding workflows need backend/frontend translation targets. |
| `verein_dues` | 11 | Verein/Clubs membership and dues remain localization gaps. |
| `verein_federation` | 11 | Verein federation workflows remain localization gaps. |
| `svc_notifications*` | 22 combined | Service notification copy needs a .NET target. |
| `caring_community` | broad gap outside React namespace aliases | Caring Community copy is not represented by an equivalent .NET namespace. |

## High-Risk English Key Gaps

Within matched English namespaces, the largest missing key families are:

| Namespace | Missing English keys | Notes |
| --- | ---: | --- |
| `admin` | 3,955 | Admin copy in Laravel greatly exceeds current .NET React admin namespace coverage. |
| `emails` | 515 | Email translation strategy needs a .NET target beyond React public locales. |
| `notifications` | 322 | Notification copy parity is incomplete. |
| `admin_nav` | 115 | Admin navigation labels remain incomplete. |
| `errors` | 17 | User/API error copy should be reconciled carefully. |
| `admin_dashboard` | 15 | Dashboard copy has smaller but concrete gaps. |
| `federation` | 3 | Small matched-namespace key gap; still needs closure. |

## Acceptance Criteria For Localization Parity

- Every Laravel locale is represented in the .NET target or explicitly approved
  as unsupported for product reasons.
- Every Laravel namespace has a .NET target namespace, documented alias, or
  documented non-React destination such as backend email/API resources.
- Matched namespaces have no missing keys for every supported locale.
- Accessible frontend translations are mapped separately from React SPA/admin
  translations.
- Translation checks are rerun after each module batch and before any claim of
  complete parity.
