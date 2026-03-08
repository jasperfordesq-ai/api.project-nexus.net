# CLAUDE.md - Project NEXUS UK Frontend

## Project Purpose

This is the UK frontend for **Project NEXUS Community** - a community service that consumes an ASP.NET Core backend API.

## License and Attribution (MANDATORY)

This software is licensed under the **GNU Affero General Public License v3** (AGPL-3.0-or-later).

### Creator

- **Jasper Ford** - Creator and primary author

### Founders of the Originating Time Bank

- **Jasper Ford**
- **Mary Casey**

### Research Foundation

This software is informed by and builds upon a social impact study commissioned by the **West Cork Development Partnership**.

### Acknowledgements

- **West Cork Development Partnership**
- **Fergal Conlon**, SICAP Manager

### Source File Headers

All new source files MUST include this header:

```javascript
// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.
```

For Nunjucks templates:

```nunjucks
{# Copyright © 2024–2026 Jasper Ford #}
{# SPDX-License-Identifier: AGPL-3.0-or-later #}
{# Author: Jasper Ford #}
{# See NOTICE file for attribution and acknowledgements. #}
```

### Key Files

- `LICENSE` - Full AGPL v3 license text
- `NOTICE` - Attribution and credits (must be preserved in all distributions)
- `README.md` - Credits and Origins section
- `/about` - About page with license info (AGPL Section 13 compliance)

### AGPL Compliance Requirements

1. Source code must be made available to network users
2. NOTICE file attributions must be preserved in all copies
3. About page must display license info and source code link

## Development Environment

**Docker is the ONLY supported development environment.**

Do not use XAMPP, native Node.js, or any other local setup. The project directory may be located under `xampp/htdocs` for historical reasons - ignore this; XAMPP is not used.

```
Local Development (Docker) → Test → Deploy to Production (Docker)
```

### Why Docker Only?

1. **Consistency** - Same environment for all developers and production
2. **No dependency conflicts** - Node.js, Sass, etc. are containerized
3. **Simple onboarding** - Just `docker compose up`
4. **Matches production** - Production also uses Docker

### Development Commands

```bash
# Start development environment
docker compose up -d

# View logs (live)
docker compose logs -f nexus-uk-frontend

# Restart after code changes (hot reload usually handles this)
docker compose restart nexus-uk-frontend

# Full rebuild (after package.json or Dockerfile changes)
docker compose down && docker compose up --build -d

# Stop
docker compose down
```

The app runs at **http://localhost:5180** (container port 3001 mapped to host 5180).

### Production Deployment

```bash
# 1. Upload changed files to server
scp -i "C:\ssh-keys\project-nexus.pem" -r src/ azureuser@20.224.171.253:/opt/nexus-uk-frontend/

# 2. SSH to server
ssh -i "C:\ssh-keys\project-nexus.pem" azureuser@20.224.171.253

# 3. Rebuild and restart
cd /opt/nexus-uk-frontend
sudo docker compose down
sudo docker compose build --no-cache
sudo docker compose up -d
```

Production URL: <https://uk.project-nexus.net>

## CRITICAL: NOT A GOVERNMENT SERVICE (NON-NEGOTIABLE)

**This project is NOT a UK government service and is NOT endorsed by the UK Government.**

We use the GOV.UK Design System (govuk-frontend) for its accessibility and usability patterns only. We are an independent community project.

### Branding Rules (LEGALLY REQUIRED - DO NOT VIOLATE)

1. **NO crown logo** - Never use the GOV.UK crown, crest, Royal Arms, or any government marks
2. **NO GOV.UK header** - Never use `govukHeader` macro; always use custom header in `base.njk`
3. **NO government branding** - No "GOV.UK" text in headers, footers, or anywhere implying government affiliation
4. **MANDATORY disclaimer** - Header MUST include: "Not affiliated with GOV.UK"
5. **Custom header/footer only** - See `src/views/layouts/base.njk` and `src/views/partials/footer.njk`

### What We CAN Use

- GOV.UK Design System typography, colours, spacing
- GOV.UK component patterns (buttons, inputs, tables, error summaries, etc.)
- GOV.UK layout grid system
- Accessibility patterns from the Design System

## Stack (DO NOT DEVIATE)

| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 18+ | Runtime |
| Express | 4.x | Web framework |
| Nunjucks | 3.x | Templating |
| govuk-frontend | 5.x | Design system (styles + components) |
| Dart Sass | 1.x | CSS compilation |
| Helmet | 7.x | Security headers |
| csrf-csrf | 3.x | CSRF protection |
| express-rate-limit | 7.x | Rate limiting |
| express-session | 1.x | Session management |
| express-flash | 0.x | Flash messages |
| Morgan | 1.x | Request logging |

**No React. No Next.js. No alternative CSS frameworks. SSR HTML only.**

## Backend API

- Base URL: `http://localhost:5000` (configurable via `API_BASE_URL` env var)
- See `FRONTEND_INTEGRATION.md` for full API documentation

### Key Endpoints Used

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/login` | POST | Login (returns access_token + refresh_token) |
| `/api/auth/register` | POST | Register new user |
| `/api/auth/refresh` | POST | Exchange refresh token for new access token |
| `/api/auth/logout` | POST | Revoke tokens server-side |
| `/api/auth/forgot-password` | POST | Request password reset email |
| `/api/auth/reset-password` | POST | Reset password with token |
| `/api/auth/validate` | GET | Validate token |
| `/api/users/me` | GET | Get current user profile |
| `/api/users/me` | PATCH | Update profile (first_name, last_name) |
| `/api/listings` | GET | List listings (supports filtering) |
| `/api/listings` | POST | Create listing |
| `/api/listings/{id}` | GET | Get listing |
| `/api/listings/{id}` | PUT | Update listing |
| `/api/listings/{id}` | DELETE | Delete listing |
| `/api/wallet/balance` | GET | Get user balance |
| `/api/wallet/transactions` | GET | List transactions |
| `/api/messages` | GET | List conversations |
| `/api/messages/{id}` | POST | Send message in conversation |
| `/api/messages/{id}/read` | PUT | Mark conversation as read |
| `/api/connections` | GET | List connections (?status=accepted\|pending) |
| `/api/connections/pending` | GET | Pending requests (incoming/outgoing) |
| `/api/connections` | POST | Send connection request |
| `/api/connections/{id}/accept` | PUT | Accept connection request |
| `/api/connections/{id}/decline` | PUT | Decline connection request |
| `/api/connections/{id}` | DELETE | Remove/cancel connection |
| `/api/users` | GET | List users in tenant |
| `/api/users/{id}` | GET | Get user by ID |
| `/api/notifications` | GET | List notifications (?page, ?limit, ?unread_only) |
| `/api/notifications/unread-count` | GET | Get unread count (for badge) |
| `/api/notifications/{id}` | GET | Get single notification |
| `/api/notifications/{id}/read` | PUT | Mark notification as read |
| `/api/notifications/read-all` | PUT | Mark all as read |
| `/api/notifications/{id}` | DELETE | Delete notification |

### Authentication Flow

1. User submits login form → POST to `/api/auth/login`
2. API returns `access_token` (1 hour) + `refresh_token` (7 days)
3. Tokens stored in HTTP-only signed cookies (`token`, `refresh_token`)
4. All authenticated requests include `Authorization: Bearer {token}` header
5. On 401 response, attempt token refresh via `/api/auth/refresh`
6. If refresh succeeds, retry the original request with new token
7. If refresh fails, clear cookies and redirect to `/login`
8. On logout, call `/api/auth/logout` to revoke tokens server-side

### Password Reset Flow

1. User requests reset → POST `/api/auth/forgot-password` with email + tenant_slug
2. API sends email with reset link containing token
3. User clicks link → GET `/reset-password?token=xxx`
4. User submits new password → POST `/api/auth/reset-password` with token + new_password
5. On success, redirect to login with success message

## Key Files

| File | Purpose |
|------|---------|
| `src/server.js` | Express application with all middleware |
| `src/lib/api.js` | API client for backend calls |
| `src/middleware/auth.js` | Authentication middleware |
| `src/routes/auth.js` | Auth routes (login, register, logout, forgot/reset password) |
| `src/routes/listings.js` | Listings CRUD routes |
| `src/routes/connections.js` | Connections routes |
| `src/routes/members.js` | Members directory routes |
| `src/routes/notifications.js` | Notifications routes |
| `src/routes/profile.js` | Profile routes |
| `src/views/layouts/base.njk` | Base template with custom header (NO crown) |
| `src/views/partials/footer.njk` | Custom footer (NO crown) |
| `src/assets/scss/main.scss` | Sass entry point |
| `public/css/main.css` | Compiled CSS output (generated, do not edit) |

## Security Features

| Feature | Implementation |
|---------|----------------|
| CSRF Protection | Double-submit cookie via `csrf-csrf` |
| Security Headers | Helmet.js with CSP |
| Rate Limiting | 100 req/15min (general), 10 req/15min (auth) |
| Cookie Security | HTTP-only, signed, SameSite=Lax |
| Session Timeout | 30 minutes |
| Input Validation | Server-side with GOV.UK error patterns |

## Docker Commands Reference

```bash
# Start development environment
docker compose up -d

# View logs
docker compose logs -f nexus-uk-frontend

# Restart container
docker compose restart nexus-uk-frontend

# Full rebuild (after package.json or Dockerfile changes)
docker compose down && docker compose up --build -d

# Stop
docker compose down

# Check container health
docker compose ps
```

See [DOCKER_CONTRACT.md](DOCKER_CONTRACT.md) for full Docker documentation.

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | 3001 | Server port |
| `API_BASE_URL` | No | http://localhost:5000 | Backend API URL |
| `COOKIE_SECRET` | **Yes** | - | Secret for signed cookies |
| `SESSION_SECRET` | No | COOKIE_SECRET | Secret for sessions |
| `NODE_ENV` | No | development | Environment |

## Nunjucks Configuration

Per official GOV.UK Frontend docs, Nunjucks paths include:
1. `src/views` - Our templates
2. `node_modules/govuk-frontend/dist` - GOV.UK Frontend templates/macros

## Sass Configuration

Uses Dart Sass with `--load-path=node_modules/govuk-frontend/dist` and `--quiet-deps`.

Import in `main.scss`:
```scss
@use "govuk/index" as *;  // Modern Sass syntax (not deprecated @import)
```

## JavaScript Initialization

Per official GOV.UK Frontend docs, JS uses ES modules:
```html
<script type="module" src="/js/govuk-frontend.min.js"></script>
<script type="module">
  import { initAll } from '/js/govuk-frontend.min.js'
  initAll()
</script>
```

## Common Patterns

### Adding CSRF to Forms
```njk
<form method="post">
  <input type="hidden" name="_csrf" value="{{ csrfToken }}">
  <!-- form fields -->
</form>
```

### Error Handling in Routes
```javascript
if (error instanceof ApiError && error.status === 401) {
  res.clearCookie('token');
  return res.redirect('/login');
}
```

### Flash Messages
```javascript
// In route
req.flash('success', 'Listing created successfully');
res.redirect('/listings');

// In template
{% if successMessage %}
  {{ govukNotificationBanner({ type: "success", html: successMessage }) }}
{% endif %}
```

### GOV.UK Error Summary
```njk
{% if errors and errors.length %}
  {{ govukErrorSummary({
    titleText: "There is a problem",
    errorList: errors
  }) }}
{% endif %}
```

## Test Credentials (Local Development Only)

| Email | Password | Tenant |
|-------|----------|--------|
| admin@acme.test | Test123! | acme |
| member@acme.test | Test123! | acme |

**Note:** Production uses different secure passwords. See `asp.net-backend/.claude/production-server.md`.
