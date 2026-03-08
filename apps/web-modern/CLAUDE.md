# NEXUS Modern Frontend

## CRITICAL: Admin Panel is FROZEN

**The admin panel (`/admin/*`) is 100% complete and FROZEN. No further work whatsoever — no new pages, no modifications, no refactoring, no bug fixes. This overrides all other instructions.**

We are building **user-facing frontend UI only**. All new work targets the member experience, not admin tooling.

---

## CRITICAL: Docker-Only Development

**NEVER run `npm install`, `npm run dev`, `npm run build`, or `npm test` directly on the host machine.**

This project runs exclusively in Docker. Running npm commands locally creates a `node_modules` directory that conflicts with Docker's dependencies, causing module resolution errors.

**Always use Docker commands:**

- `docker compose up -d` - Start the app
- `docker compose exec frontend npm test` - Run tests
- `docker compose build --no-cache` - Rebuild after dependency changes
- `docker compose logs -f frontend` - View logs

If you see module errors like "Can't resolve 'swr'", rebuild Docker: `docker compose build --no-cache`

---

## Repository

**GitHub:** https://github.com/jasperfordesq-ai/app.project-nexus.net

```bash
# Remote is already configured — push with:
git push origin main
git push origin <branch-name>
```

The default branch is `main`. Feature branches follow the pattern `claude/<name>`.

---

## What This Project Is

This is the **Next.js 16** frontend for Project NEXUS, a timebanking/community platform. It connects to the ASP.NET Core backend API.

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

```typescript
// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.
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

## Development Workflow

**All development happens locally first, then deploys to production.**

```
Local Development → Test → Deploy to Production
     (Docker)                  (Docker)
```

### Workflow Steps

1. **Develop locally** - Make changes, test with `docker compose up`
2. **Test thoroughly** - Verify features work at http://localhost:5170
3. **Deploy to production** - Upload files and rebuild on server

## Local Development (Docker Only)

**IMPORTANT: This frontend runs in Docker. Do NOT use `npm run dev` directly.**

### Start the Stack

```bash
# From this directory (dev mode with hot reload)
docker compose up -d

# Or rebuild after code changes
docker compose build --no-cache && docker compose up -d
```

### Access Points

| Service | URL | Description |
|---------|-----|-------------|
| Frontend | http://localhost:5170 | This Next.js app (dev mode) |
| Backend API | http://localhost:5080 | ASP.NET Core API |
| Swagger | http://localhost:5080/swagger | API documentation |

### Test Credentials (Local Only)

- `admin@acme.test` / `Test123!` / tenant_slug: `acme`
- `member@acme.test` / `Test123!` / tenant_slug: `acme`

**Note:** Production uses different, secure passwords. See production-server.md.

## Production Deployment

Production runs at https://app.project-nexus.net

### Deploy Steps

```bash
# 1. Upload changed files to server
scp -i "C:\ssh-keys\project-nexus.pem" -r src/ azureuser@20.224.171.253:/opt/nexus-modern-frontend/

# 2. SSH to server
ssh -i "C:\ssh-keys\project-nexus.pem" azureuser@20.224.171.253

# 3. Rebuild and restart (production mode)
cd /opt/nexus-modern-frontend
sudo docker compose --profile production down
sudo docker compose --profile production build --no-cache frontend-prod
sudo docker compose --profile production up -d frontend-prod
```

### Key Differences: Local vs Production

| Aspect | Local | Production |
|--------|-------|------------|
| Mode | Development (hot reload) | Production (optimized) |
| Command | `docker compose up` | `docker compose --profile production up` |
| Container | `nexus-frontend` | `nexus-frontend-prod` |
| Port | 5170 | 3002 (behind nginx) |
| URL | http://localhost:5170 | https://app.project-nexus.net |
| Volume mounts | Yes (for hot reload) | No (immutable) |
| API URL | http://localhost:5080 | https://api.project-nexus.net |

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **UI Library:** HeroUI (NextUI fork)
- **Styling:** Tailwind CSS
- **Animations:** Framer Motion
- **Icons:** Lucide React

## Project Structure

```
src/
  app/                    # Next.js App Router pages
    assistant/            # AI chat assistant
    connections/          # Friend connections
    dashboard/            # Main dashboard
    events/               # Events list & detail
    feed/                 # Social feed
    groups/               # Groups list & detail
    listings/             # Listings CRUD
    login/                # Authentication
    members/              # Member directory
    messages/             # Messaging
    notifications/        # Notifications
    profile/              # User profile
    search/               # Search
    settings/             # User settings
    wallet/               # Wallet & transfers
  components/             # Reusable UI components
    glass-*.tsx           # Glass-morphism components
    navbar.tsx            # Main navigation
    protected-route.tsx   # Auth guard
  contexts/               # React contexts
    auth-context.tsx      # Authentication state
  hooks/                  # Custom hooks
  lib/                    # Utilities
    api.ts                # API client (all endpoints)
  providers/              # Provider wrappers
```

## API Client

All API calls go through `src/lib/api.ts`. The API client:

- Handles JWT token storage/retrieval
- Auto-redirects to login on 401
- Supports all backend endpoints

### Adding New API Methods

```typescript
// In src/lib/api.ts
async newEndpoint(data: SomeType): Promise<ResponseType> {
  return this.request<ResponseType>("/api/endpoint", {
    method: "POST",
    body: JSON.stringify(data),
  });
}
```

## Environment Variables

Create `.env.local` for local development:

```
NEXT_PUBLIC_API_URL=http://localhost:5080
```

For Docker, this is configured in `compose.yml`.

## Commands

**All commands run through Docker. Do NOT run npm commands directly on the host.**

```bash
# Start in Docker
docker compose up -d

# View logs
docker compose logs -f frontend

# Run tests
docker compose exec frontend npm test

# Run tests with coverage
docker compose exec frontend npm test -- --coverage

# Rebuild after dependency changes
docker compose build --no-cache && docker compose up -d

# Stop
docker compose down
```

### Why Docker-Only?

Running `npm install` or `npm run dev` directly creates a local `node_modules` that conflicts with Docker's cached dependencies, causing module resolution errors and confusion. Always use Docker commands.

## Related Documentation

- [FRONTEND_INTEGRATION.md](./FRONTEND_INTEGRATION.md) - API integration guide
- [DOCKER_CONTRACT.md](./DOCKER_CONTRACT.md) - Docker setup details
- Backend: `c:\xampp\htdocs\asp.net-backend\CLAUDE.md`
