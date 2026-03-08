# NEXUS Admin Panel

Standalone admin panel for Project NEXUS, built with React + TypeScript + Refine + Ant Design.

## Quick Start

```bash
# Install dependencies
npm install

# Start dev server (port 5190)
npm run dev
```

**Prerequisite:** The ASP.NET backend must be running on port 5080 (see `asp.net-backend/compose.yml`).

### Docker

```bash
# Development (port 5190)
docker compose up

# Production (port 5191)
docker compose --profile production up
```

## Test Credentials

| Email | Password | Tenant | Role |
|-------|----------|--------|------|
| admin@acme.test | Test123! | acme | admin |
| admin@globex.test | Test123! | globex | admin |

## Stack

| Layer | Technology |
|-------|-----------|
| Bundler | Vite 6 |
| Framework | React 18 + TypeScript |
| Admin framework | Refine v4 |
| UI | Ant Design 5 |
| HTTP | Axios (JWT interceptor + token refresh) |
| Routing | React Router v6 |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `http://localhost:5080` | ASP.NET backend URL |

## Architecture

```
nexus-admin/
├── src/
│   ├── config/         # Resources, constants
│   ├── providers/      # Auth, data, access control providers
│   ├── utils/          # Axios instance, token helpers
│   ├── components/     # Layout, common components
│   └── pages/          # All admin pages
├── Dockerfile          # Multi-stage (dev + prod)
├── compose.yml         # Docker Compose
└── .env.development    # Dev environment
```

### Backend Integration

- Auth: JWT login via `POST /api/auth/login` with `tenant_slug`
- Admin check: JWT `role` claim must be `"admin"`
- Tenant: resolved from JWT automatically
- 144+ admin API endpoints consumed across 20 controllers

### Port Allocation

| Service | Port |
|---------|------|
| Backend API | 5080 |
| Modern Frontend | 5170 |
| UK Frontend | 5180 |
| **Admin Panel (dev)** | **5190** |
| Admin Panel (prod) | 5191 |

## Implemented Pages

### Real pages (13)
- Dashboard (stats cards from `/api/admin/dashboard`)
- Users (list, show, edit + suspend/activate)
- Content Moderation (pending queue + approve/reject)
- Categories (CRUD)
- Roles & Permissions (CRUD)
- Registration Policy (settings form)
- Registration Pending (approval queue)
- System Settings (key-value editor)
- Announcements (CRUD)
- Emergency Lockdown (toggle)
- System Health (display)
- Audit Logs (query with filters)
- Analytics (overview, exchange health, top users)
- Tenant Config (key-value editor)

### Stub pages (15)
CRM, Blog, Broker, Email Templates, Events, Gamification, Groups,
Matching, Jobs, Notifications, Organisations, Pages CMS, Search Admin,
Translations, Vetting

Each stub lists the backend endpoints ready for integration.

## License

AGPL-3.0-or-later. See LICENSE and NOTICE files.
