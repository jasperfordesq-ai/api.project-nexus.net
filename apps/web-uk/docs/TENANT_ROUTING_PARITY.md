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

Current gaps:

- Custom accessible-domain host resolution is not implemented in Web UK yet.
- Web UK does not yet call Laravel tenant bootstrap during request routing to
  resolve `accessible_domain` or `parent_domain`.
- Most individual templates still contain direct root-relative paths. Shared
  tenant-mount rendering now protects those links at response time, but the
  templates still need gradual conversion to `urlFor()` or equivalent helpers
  so custom-domain and flat-host modes remain easier to audit.
- Shared root `/` still renders the local home page, not Laravel's tenant
  chooser.
- Dedicated accessible-domain root `/` is not yet certified to render the
  resolved tenant's home.
- Parent-domain child-tenant paths are audited from Laravel but not implemented
  in Web UK.

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

Verification command:

```powershell
npm --prefix apps/web-uk test -- tests/routes.test.js --runInBand --runTestsByPath
```
