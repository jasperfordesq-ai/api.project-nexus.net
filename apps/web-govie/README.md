# Nexus Community — GOV.IE Design System Frontend

> **IMPORTANT:** This is not a government service. See [BRANDING.md](./BRANDING.md) for the
> full non-affiliation disclaimer.

A community time-exchange platform frontend built with the publicly available GOV.IE Design
System open-source packages as the UI foundation.

## Stack

| Technology | Version | Purpose |
|---|---|---|
| React | 18.x | UI framework |
| TypeScript | 5.x | Type safety |
| Vite | 5.x | Build tool and dev server |
| pnpm | 9.x | Package manager |
| `@govie-ds/react` | 1.9.x | GOV.IE Design System components |
| `@govie-ds/theme-govie` | 1.0.x | GOV.IE theme CSS |
| `@fontsource/lato` | 5.x | Lato font (self-hosted) |
| Axios | 1.7.x | HTTP client |
| React Router | 6.x | Client-side routing |

## Local Development (Docker)

This frontend is part of the main Nexus repository and runs inside Docker alongside the
ASP.NET backend. **Do not use `pnpm dev` directly if you want the full stack.**

### Start the full stack

```bash
# From the repo root (c:/platforms/htdocs/asp.net-backend)
docker compose up -d

# Or build just the frontend
docker compose up -d web-govie
```

Access at: **http://localhost:5200**

### Dev server (frontend only, without Docker)

If you only want to work on the frontend with hot-reload:

```bash
cd apps/web-govie
pnpm install
pnpm dev
```

The dev server proxies `/api/*` to `http://localhost:5080` (the backend must be running).

### Environment variables

```bash
cp .env.example .env.development
# Edit .env.development as needed
```

| Variable | Default | Description |
|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:5080` | Backend API base URL |
| `VITE_APP_NAME` | `Nexus Community` | Application display name |
| `VITE_TENANT_SLUG` | `acme` | Tenant identifier |
| `VITE_FEATURE_AI` | `true` | Enable AI features |
| `VITE_FEATURE_PASSKEYS` | `true` | Enable passkey auth |

## Pages

| Route | Page | Auth required? |
|---|---|---|
| `/` | Homepage with categories and featured listings | No |
| `/services` | Browse all services with search/filter | No |
| `/services/:id` | Service detail page | No (request requires auth) |
| `/services/submit` | Post a new service | Yes |
| `/login` | Sign in | No |
| `/register` | Create account | No |
| `/profile` | Member profile and wallet | Yes |
| `*` | 404 Not Found | No |

## API Integration

The frontend talks to the ASP.NET Core backend via:

- **`src/api/client.ts`** — Axios instance with JWT auth, 401 refresh handling
- **`src/api/auth.ts`** — Login, register, logout, refresh token
- **`src/api/listings.ts`** — CRUD for service listings
- **`src/context/AuthContext.tsx`** — Auth state, token storage

JWT tokens are stored in `localStorage` under `nexus:access_token` and `nexus:refresh_token`.
The client automatically refreshes expired tokens.

## Project Structure

```
apps/web-govie/
  src/
    api/           # API clients (axios + typed DTOs)
    components/    # Layout, Header, Footer, ProtectedRoute, ErrorBoundary
    context/       # AuthContext (login/logout/register state)
    pages/         # Route page components
    styles/        # main.css (Nexus brand overrides + layout utilities)
    App.tsx        # Router and provider tree
    main.tsx       # Entry point — imports theme CSS and fonts
  Dockerfile       # Multi-stage: pnpm build -> nginx serve
  nginx.conf       # nginx config with SPA fallback and cache headers
  BRANDING.md      # Non-affiliation disclaimer (MANDATORY)
```

## Branding Compliance

**Read [BRANDING.md](./BRANDING.md) before making UI changes.**

Summary of requirements:
- No Irish government logos, emblems, or trademarks
- Non-affiliation disclaimer must remain in the footer
- Phase banner ("not a government service") must remain in the header
- Nexus brand colours (teal/amber) must be maintained to distinguish from any government palette

## Production Build

```bash
# Build production image
docker build -t nexus-web-govie ./apps/web-govie

# Or via compose
docker compose build web-govie
docker compose up -d web-govie
```

The Dockerfile performs a multi-stage build:
1. `builder` stage: installs pnpm, runs `pnpm build`
2. `runtime` stage: copies `dist/` into nginx:alpine

## Licence

Copyright © 2024–2026 Jasper Ford  
SPDX-License-Identifier: AGPL-3.0-or-later

See the root `LICENSE` and `NOTICE` files for full attribution and licence terms.
