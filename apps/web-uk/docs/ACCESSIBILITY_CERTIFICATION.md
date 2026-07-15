# Web UK accessibility verification

Status: **Maintained reference — current verification method, not a conformance certificate**

This repository has an automated browser accessibility gate for representative
public and authenticated Laravel-first Web UK pages. It is a release signal,
not a certificate of complete WCAG conformance.

> **Data-safety boundary:** the complete gate performs a real login. Failed
> logins write Laravel limiter/audit state, and successful authenticated cases
> may exercise additional stateful endpoints. Run the complete gate only
> against a separately provisioned, verified disposable Laravel environment.
> Never point it at the ordinary local Laravel database, which is a confidential
> production-derived read-only snapshot.

## Run the gate

From `apps/web-uk`, after verifying `LARAVEL_BASE_URL` identifies the disposable
environment:

```powershell
npm install
npx playwright install chromium
npm run test:accessibility
```

The runner builds the current Sass, loads `src/server.js` from the current checkout, and binds it to an operating-system-assigned loopback port. It does not trust or reuse a process on port 5180.

Set the disposable Laravel API explicitly; do not rely on the default:

```powershell
$env:LARAVEL_BASE_URL = 'http://127.0.0.1:<disposable-port>'
$env:ACCESSIBILITY_TENANT_SLUG = 'alpha'
npm run test:accessibility
```

For public-page and client-side interaction checks that do not require real
Laravel state, use the isolated read-only runner with a focused Playwright
grep. It starts a loopback-only mock backend with bounded tenant,
registration-policy, and platform-stat fixtures. The mock rejects all backend
methods except `GET` and `HEAD`, and the runner exits unsuccessfully if a test
attempts a backend mutation:

```powershell
npm run test:accessibility:isolated -- --grep=representative.public-page
npm run test:accessibility:isolated -- --grep=forced-colour
npm run test:accessibility:isolated -- --grep=default-English
```

Do not treat the isolated runner as Laravel runtime certification. It exists to
exercise current-checkout rendering, browser structure, keyboard/focus,
client-side validation, reflow, forced colours, and axe without any route to
the ordinary Laravel database.

The latest fully successful historical verification on 2026-07-12 exercised the complete 87-case Chromium scope
against a fresh current-checkout listener and Laravel at
`http://127.0.0.1:8088`. After a missing bearer token on member-only Knowledge
Base calls was corrected and focused proof passed, the uninterrupted aggregate
passed `87/87` in `1,344.8` seconds with no skipped or failed cases. This is an
implementation-history result only: because it used the ordinary Laravel
environment, it is invalid as current runtime or release certification. It is
also not manual keyboard or assistive-technology certification. Generated
evidence remains below the ignored
`artifacts/accessibility/` directory.

On 2026-07-14 an attempted current aggregate against ordinary local Laravel was
stopped after 28 passes when its invalid login wrote failed-login limiter state;
one case failed and 58 did not run. The database was subsequently restored
wholesale from the verified production safety dump. That attempt is neither a
green accessibility result nor an authorized ordinary-environment workflow.

On 2026-07-15 the isolated current-checkout runner passed `14/14`
representative public-page structure/axe cases and `4/4` keyboard, focus,
client-validation, 320px reflow, forced-colour, and axe cases on
`/hour-timebank/accessible`. A further default-English subset passed `6/6`:
Home, registration, Legal, and Listings at a 320 CSS-pixel viewport with
serious/critical axe checks, plus server-rendered login, registration, and
Contact forms with JavaScript disabled. Invalid no-JavaScript registration also
preserves entered values and returns linked inline errors in a programmatically
focusable summary without calling the registration mutation. Only loopback read
fixtures were available; no Laravel runtime or database was contacted. This is
partial automated browser evidence, not actual browser-zoom, full
accessibility, assistive-technology, or runtime certification.

## Current automated scope

Chromium checks representative public and signed-in pages under the shared
`/{tenantSlug}/accessible` mount, plus focused keyboard/error recovery,
forced-colour, narrow-reflow, and representative RTL journeys. Every
structure/axe case must:

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

Directed browser and assistive-technology observations are recorded in
[`MANUAL_ACCESSIBILITY_EVIDENCE.md`](./MANUAL_ACCESSIBILITY_EVIDENCE.md). The
register states the exact input method and limitations for each check so that
browser-assisted inspection is not mistaken for keyboard-only or screen-reader
certification.

## What a passing gate does not prove

Axe and structural assertions find only a subset of accessibility problems. This gate does not by itself prove WCAG 2.2 AA conformance, validate every route or authenticated state, or replace manual testing. Release assessment still needs keyboard-only use, zoom and reflow, high-contrast and forced-colour checks, screen-reader journeys, error recovery, and testing with representative disabled users. Those manual results should be recorded separately with the browser, assistive technology, page, date, and observed outcome.

Expand the route set and browser/state coverage as high-risk journeys become stable. Do not weaken or exclude a rule merely to make the gate green; document and remediate the underlying issue.
