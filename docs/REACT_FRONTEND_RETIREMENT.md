# React Frontend Retirement Policy

Last reviewed: 2026-07-05

## Decision

The separate React frontend in this ASP.NET repository is retired from active
development. It is a legacy/outdated fork and must be treated as historical
reference only.

Legacy copy:

```text
C:\platforms\htdocs\asp.net-backend\apps\react-frontend
```

Canonical production frontend:

```text
C:\platforms\htdocs\staging\react-frontend
```

The Laravel backend and Laravel React frontend are production systems. The
ASP.NET backend is development-only. ASP.NET must become compatible with the
Laravel React frontend contract; the production Laravel React frontend must not
be weakened to accommodate ASP.NET gaps.

## Working Rule

Do not modify frontend files in this repository unless the user explicitly
approves that specific frontend change. This includes:

- `apps/react-frontend/`
- `apps/admin/`
- `apps/web-uk/`

Backend parity work should happen in ASP.NET backend code, contracts, tests, and
documentation. If a frontend file is touched during backend parity work, the
change must explain why backend conformance was not enough.

## Contract Target

For every API call made by the Laravel React frontend, ASP.NET must expose a
compatible endpoint.

Compatibility means:

- same HTTP method;
- same path, including `/api/v2/...` aliases where Laravel React expects them;
- compatible query parameters and request bodies;
- compatible multipart/upload field names and URL response fields;
- compatible response envelopes and pagination metadata;
- compatible validation error, auth error, tenant error, not-found, and feature
  disabled response shapes;
- compatible status codes;
- compatible auth refresh and tenant bootstrap behavior;
- compatible feature/module flag behavior;
- compatible realtime configuration behavior, even if the ASP.NET transport is
  SignalR rather than Laravel/Pusher.

If ASP.NET currently exposes a similar route under a different path, add a
compatibility alias rather than changing the Laravel React frontend.

## Proving Compatibility

Do not claim that an ASP.NET module is compatible with the Laravel React
frontend until the proof exists.

Required proof:

1. Route/API matrix:
   - Laravel React API call site.
   - Laravel route or OpenAPI operation.
   - ASP.NET route or OpenAPI operation.
   - Method/path match status.
   - Request shape match status.
   - Response/error/status-code match status.
2. Focused ASP.NET regression tests for the matched contract.
3. Runtime smoke tests using the Laravel React frontend against the ASP.NET API
   for the implemented workflow.

Failures must be classified as:

- missing endpoint;
- wrong method or path;
- missing `/api/v2` alias;
- request-shape mismatch;
- response-shape mismatch;
- auth/tenant mismatch;
- upload/realtime/config mismatch;
- unimplemented backend workflow.

## What Not To Do

- Do not continue feature development in `apps/react-frontend/`.
- Do not copy the ASP.NET React fork over the Laravel React frontend.
- Do not make ASP.NET the default frontend target.
- Do not fix backend gaps by loosening production frontend validation.
- Do not hide contract mismatches with broad fallback logic.
- Do not claim frontend parity from static route counts alone.

## Future Repository Shape

The intended direction is one shared React frontend that can target either
backend once ASP.NET passes the Laravel React contract. That frontend should live
outside this ASP.NET backend repo in the future.

Until that migration happens, the Laravel repo copy remains canonical, and this
repo focuses on making ASP.NET match the Laravel React API contract.
