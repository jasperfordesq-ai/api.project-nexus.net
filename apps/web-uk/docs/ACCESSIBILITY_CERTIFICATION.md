# Web UK accessibility verification

This repository has an automated browser accessibility gate for a representative set of public Laravel-first Web UK pages. It is a release signal, not a certificate of complete WCAG conformance.

## Run the gate

From `apps/web-uk`:

```powershell
npm install
npx playwright install chromium
npm run test:accessibility
```

The runner builds the current Sass, loads `src/server.js` from the current checkout, and binds it to an operating-system-assigned loopback port. It does not trust or reuse a process on port 5180.

The Laravel API defaults to `http://127.0.0.1:8088`. Override it when required:

```powershell
$env:LARAVEL_BASE_URL = 'http://127.0.0.1:8088'
$env:ACCESSIBILITY_TENANT_SLUG = 'alpha'
npm run test:accessibility
```

Latest verified run on 2026-07-10: all 9 Chromium checks passed against a
fresh current-checkout listener at `http://127.0.0.1:56223` and Laravel at
`http://127.0.0.1:8088`. Generated JSON/HTML and per-test axe artifacts were
written below the ignored `artifacts/accessibility/` directory.

## Current automated scope

Chromium checks the tenant home, about, guide, FAQ, sign-in, registration, contact, legal hub, and accessibility-statement pages under the shared `/{tenantSlug}/accessible` mount. Every route must:

- return a successful document response;
- contain exactly one `main` landmark and one `#main-content` target;
- contain exactly one `h1`;
- contain no duplicate element IDs; and
- have no axe-core violations with `serious` or `critical` impact.

Playwright writes its JSON report, HTML report, per-test axe JSON attachments, failure screenshots, and retained failure traces to `apps/web-uk/artifacts/accessibility/`. The repository ignores that directory; generated evidence is not a committed fixture.

A separate Jest source regression inspects every Nunjucks template and requires
each `govuk-error-summary` opening tag to include `tabindex="-1"`. The
2026-07-10 audit covered 135 summaries; six missing focus targets were fixed
and the remaining violation count is zero.

## What a passing gate does not prove

Axe and structural assertions find only a subset of accessibility problems. This gate does not by itself prove WCAG 2.2 AA conformance, validate every route or authenticated state, or replace manual testing. Release assessment still needs keyboard-only use, zoom and reflow, high-contrast and forced-colour checks, screen-reader journeys, error recovery, and testing with representative disabled users. Those manual results should be recorded separately with the browser, assistive technology, page, date, and observed outcome.

Expand the route set and browser/state coverage as high-risk journeys become stable. Do not weaken or exclude a rule merely to make the gate green; document and remediate the underlying issue.
