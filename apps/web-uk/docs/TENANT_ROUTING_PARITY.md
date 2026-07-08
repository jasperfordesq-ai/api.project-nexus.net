# Web UK Tenant Routing Parity

Last reviewed: 2026-07-08

This note records the Laravel tenant-routing contract that `apps/web-uk` must
clone before it can be called tenant-domain parity complete.

## Laravel Source Of Truth

Read these Laravel files before changing Web UK tenant routing:

- `C:\platforms\htdocs\staging\routes\govuk-alpha.php`
- `C:\platforms\htdocs\staging\app\Core\TenantContext.php`
- `C:\platforms\htdocs\staging\app\Http\Middleware\EnsureAccessibleCustomDomain.php`
- `C:\platforms\htdocs\staging\app\Http\Middleware\InjectHostTenantSlug.php`
- `C:\platforms\htdocs\staging\app\Http\Middleware\StripTenantSlugOnAccessibleDomain.php`
- `C:\platforms\htdocs\staging\app\Http\Controllers\GovukAlpha\AlphaController.php`
- `C:\platforms\htdocs\staging\app\Http\Controllers\Api\TenantBootstrapController.php`

Laravel registers the same accessible route set twice:

1. Shared platform hosts use `/{tenantSlug}/alpha/...`; the path identifies the
   tenant.
2. Dedicated accessible custom domains use slugless paths; the host identifies
   the tenant through `tenants.accessible_domain`, Laravel injects the route
   tenant slug for controller compatibility, and response rewriting strips
   `/{tenantSlug}/alpha` from generated HTML links and redirects.

Laravel root behavior is also tenant-aware:

- Shared root `/` renders the tenant chooser.
- A dedicated accessible custom-domain root `/` renders that tenant's accessible
  home.
- The master tenant is seeded as ID `1`, has a null slug/domain, and is excluded
  from the chooser.
- Parent custom-domain routing can resolve direct child tenants from the first
  non-reserved path segment, for example `parent-domain.test/child-slug`.
- `/api/v2/tenant/bootstrap?slug={slug}` is the public Laravel data source for
  tenant metadata. Its payload includes `domain`, `accessible_domain`, and
  `parent_domain` when those are configured.

## Web UK Canonical Public Slug

The user does not want new public Web UK routes to expose `alpha`. Web UK should
therefore use `/accessible` as the cleaner shared-host mount while preserving
Laravel route parity internally.

Current implemented slice:

- `GET /{tenantSlug}/accessible` and nested paths are stripped to the existing
  flat Express route set for local route matching.
- `GET /{tenantSlug}/alpha...` redirects permanently to the same
  `/{tenantSlug}/accessible...` path.
- The shared shell locals now expose `urlFor()` and prefix header, service-nav,
  footer, cookie, report-problem, and home-page CTA links under the active
  shared mount.
- Shared-mount local redirects are rewritten back under
  `/{tenantSlug}/accessible`, so auth redirects such as `/dashboard` to
  `/login` stay inside the tenant-visible accessible path.
- Rendered HTML responses under the shared mount rewrite local root-relative
  `href` and `action` attributes to the active `/{tenantSlug}/accessible`
  prefix while leaving assets, API paths, health checks, service-worker paths,
  uploads, and other infrastructure URLs unprefixed.
- Shared root `/` renders the Laravel-style tenant chooser backed by
  `/api/v2/tenants` without `include_master`, excludes the master tenant, and
  links communities to the cleaner `/{tenantSlug}/accessible` mount.
- Tenant-mounted roots render the Laravel Blade-style tenant home instead of
  the old generic Web UK home. Shared mount `/{tenantSlug}/accessible` loads
  tenant bootstrap and public platform stats, renders the `Accessible` page,
  and rewrites links under the active shared mount.
- Non-local Host values are resolved through Laravel
  `/api/v2/tenant/bootstrap`; when Laravel returns a tenant whose
  `accessible_domain` matches the request host, Web UK treats the request as a
  slugless custom accessible-domain route.
- Dedicated accessible-domain root `/` renders the resolved tenant home and
  keeps generated local links flat, matching Laravel's custom-domain behavior
  without exposing either `/alpha` or `/{tenantSlug}/accessible`.
- Parent-domain child tenant paths now resolve the first non-reserved path
  segment through Laravel `/api/v2/tenant/bootstrap?slug={slug}`. When Laravel
  returns `parent_domain` matching the request host, Web UK serves the flat
  accessible app below `/{childSlug}` and rewrites local links and redirects to
  remain under that child path. This mirrors Laravel's parent custom-domain
  child resolution without exposing either `/alpha` or `/accessible`.

Current gaps:

- Most individual templates still contain direct root-relative paths. Shared
  tenant-mount rendering now protects those links at response time, but the
  templates still need gradual conversion to `urlFor()` or equivalent helpers
  so custom-domain and flat-host modes remain easier to audit.
- Custom accessible-domain routing is covered by Jest for a host-resolved
  root request, but it is not yet certified by live Laravel runtime smoke.
- Parent-domain child-tenant paths are covered by Jest for a parent-host child
  login page and by live Laravel runtime smoke against the local
  `hour-timebank` fixture, whose public bootstrap payload includes
  `parent_domain: timebank.global`.
- Shared tenant-root home rendering is covered by Jest and a scoped live
  Laravel smoke against `/hour-timebank/accessible`, checking `Accessible`,
  `Connecting Communities`, and `What you can do` in the rendered page body.

## First Verified Slice

The first shared-mount runtime test is in:

```text
apps/web-uk/tests/routes.test.js
```

It verifies that `/acme/accessible` renders the existing home page with prefixed
shell links and that `/acme/alpha/login?status=auth-required` redirects to
`/acme/accessible/login?status=auth-required`.

The second shared-mount runtime slice verifies that protected-route redirects
and rendered login-page form/link targets remain under
`/acme/accessible/...` instead of escaping to flat root paths.

The third shared-root slice verifies that `/` renders Laravel's tenant chooser,
excludes the master tenant, and links active communities to
`/{tenantSlug}/accessible` instead of Laravel's legacy alpha mount.

The fourth tenant-domain slice verifies that a non-local Host resolved by
Laravel tenant bootstrap as `accessible_domain` renders the tenant home at
slugless `/`, does not render the tenant chooser, and does not leak
`/{tenantSlug}/accessible` or `/{tenantSlug}/alpha` into root-page links.

The fifth parent-domain child slice verifies that
`parent-domain.test/{childSlug}/login` resolves `{childSlug}` through Laravel
tenant bootstrap, renders the child tenant's login page, keeps form and
registration links under `/{childSlug}`, and does not leak either `/alpha` or
`/accessible`.

The sixth runtime-smoke slice adds `SMOKE_TENANT_DOMAIN_PAGE_PATHS` to
`scripts/laravel-runtime-smoke.js`. Each entry uses
`host|/path=>Expected text`, sends the request to `WEB_UK_BASE_URL` with a real
HTTP `Host` header, asserts the expected body text, and rejects generated
`/alpha` or `/accessible` links. On 2026-07-08, a live run against Laravel
`http://127.0.0.1:8088` and a temporary Web UK process at
`http://127.0.0.1:6320` passed with
`SMOKE_TENANT_DOMAIN_PAGE_PATHS=timebank.global|/hour-timebank/login=>Sign in`.
The emitted check was
`tenant-domain-page-timebank-global-hour-timebank-login-renders`.

The seventh tenant-home slice verifies that `/{tenantSlug}/accessible` renders
Laravel's Blade-style tenant home, including tenant name, tagline, module
availability, sign-in status, and platform stats. A scoped live smoke on
2026-07-08 against Laravel `http://127.0.0.1:8088` and temporary Web UK
`http://127.0.0.1:6330` passed body-text checks for
`/hour-timebank/accessible=>Accessible`,
`/hour-timebank/accessible=>Connecting Communities`, and
`/hour-timebank/accessible=>What you can do`.

Verification command:

```powershell
npm --prefix apps/web-uk test -- tests/routes.test.js --runInBand --runTestsByPath
npm --prefix apps/web-uk test -- laravel-runtime-smoke.test.js --runInBand
$env:SMOKE_TENANT_DOMAIN_PAGE_PATHS = 'timebank.global|/hour-timebank/login=>Sign in'
npm --prefix apps/web-uk run smoke:laravel
$env:SMOKE_BODY_TEXT_PAGE_PATHS = '/hour-timebank/accessible=>Accessible;/hour-timebank/accessible=>Connecting Communities;/hour-timebank/accessible=>What you can do'
npm --prefix apps/web-uk run smoke:laravel
```
