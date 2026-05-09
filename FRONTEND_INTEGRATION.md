# Frontend Integration

This backend supports three frontend apps in this repository:

| App | Local URL | Production URL | Location |
|---|---|---|---|
| React frontend | http://localhost:5173 | https://platform.project-nexus.net | `apps/react-frontend/` |
| UK frontend | http://localhost:5180 | https://uk.project-nexus.net | `apps/web-uk/` |
| Admin panel | http://localhost:5190 | https://admin.project-nexus.net | `apps/admin/` |

The canonical V1 parity target is `apps/react-frontend/`. The embedded admin mounted under `/admin/*` in that app is the production parity admin UI. The standalone `apps/admin/` app is retained for separate admin-service work.

## API Base URLs

Local browser clients should call the backend at:

```text
http://localhost:5080
```

Containers should call the API over the Docker network at:

```text
http://api:8080
```

Production clients should call:

```text
https://api.project-nexus.net
```

## CORS

CORS origins are configured through environment variables, not `appsettings.json`.

Local development:

```bash
Cors__AllowedOrigins__0=http://localhost:5080
Cors__AllowedOrigins__1=http://localhost:5173
Cors__AllowedOrigins__2=http://localhost:5180
Cors__AllowedOrigins__3=http://localhost:5190
```

Production:

```bash
Cors__AllowedOrigins__0=https://platform.project-nexus.net
Cors__AllowedOrigins__1=https://uk.project-nexus.net
Cors__AllowedOrigins__2=https://admin.project-nexus.net
Cors__AllowedOrigins__3=https://api.project-nexus.net
```

## Authentication

All authenticated frontend requests use JWT bearer auth. Tokens are issued by `/api/auth/login`, refreshed through `/api/auth/refresh`, and validated with `/api/auth/validate`.

Passkey/WebAuthn origins must match the same supported browser origins as CORS.
