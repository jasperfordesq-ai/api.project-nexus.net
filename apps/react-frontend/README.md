# Legacy React Frontend

Last reviewed: 2026-07-05

This React frontend is a legacy/outdated fork and is frozen.

Do not modify files in this folder unless the user explicitly approves that
specific frontend change.

The canonical production React frontend lives in the Laravel repo:

```text
C:\platforms\htdocs\staging\react-frontend
```

ASP.NET backend work must make the backend contract-compatible with that
Laravel React frontend. Add ASP.NET backend routes, `/api/v2` aliases, response
shapes, validation/error envelopes, auth/tenant behavior, upload behavior,
realtime config, and status codes to match what the Laravel React frontend
expects.

Do not copy this legacy frontend over the Laravel frontend. Do not use this
folder as the forward development target.
