# NEXUS Modern Frontend

A Next.js 16 frontend for Project NEXUS, a timebanking/community platform.

**This project runs in Docker. See below for instructions.**

## Credits and Origins

### Creator

This software was created by **Jasper Ford**.

### Founders

The originating time bank initiative was co-founded by:

- **Jasper Ford**
- **Mary Casey**

### Contributors

- **Steven J. Kelly** - Community insight, product thinking

### Research Foundation

This software is informed by and builds upon a social impact study commissioned by the **West Cork Development Partnership**.

### Acknowledgements

- **West Cork Development Partnership**
- **Fergal Conlon**, SICAP Manager

## License

This software is licensed under the **GNU Affero General Public License version 3** (AGPL-3.0-or-later).

See the [LICENSE](LICENSE) file for the full license text.
See the [NOTICE](NOTICE) file for attribution requirements.

## Prerequisites

- Docker and Docker Compose
- ASP.NET Core backend running (see backend docs)

## Quick Start (Docker)

```bash
# Start the frontend
docker compose up -d

# View logs
docker compose logs -f frontend

# Rebuild after code changes (if hot reload doesn't pick them up)
docker compose restart frontend

# Full rebuild (after package.json or Dockerfile changes)
docker compose up --build -d

# Stop
docker compose down
```

## Access Points

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5170 |
| Backend API | http://localhost:5080 |
| Swagger | http://localhost:5080/swagger |

## Test Credentials

| Email | Password | Tenant |
|-------|----------|--------|
| admin@acme.test | Test123! | acme |
| member@acme.test | Test123! | acme |

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **UI Library:** HeroUI (NextUI fork)
- **Styling:** Tailwind CSS
- **Animations:** Framer Motion
- **Icons:** Lucide React

## Documentation

- [CLAUDE.md](./CLAUDE.md) - AI assistant instructions
- [DOCKER_CONTRACT.md](./DOCKER_CONTRACT.md) - Docker setup details
- [FRONTEND_INTEGRATION.md](./FRONTEND_INTEGRATION.md) - API integration guide

## Running Tests

```bash
# Run tests inside Docker container
docker compose exec frontend npm test

# Run tests with coverage
docker compose exec frontend npm test -- --coverage
```

## Important: Docker-Only Development

**Do NOT run `npm install` or `npm run dev` directly on your host machine.**

This project is designed to run exclusively in Docker. Running npm commands locally creates a separate `node_modules` that conflicts with the Docker environment and causes confusion.

All commands should be run through Docker:

- `docker compose up -d` - Start the app
- `docker compose exec frontend npm test` - Run tests
- `docker compose build --no-cache` - Rebuild after dependency changes
- `docker compose logs -f frontend` - View logs
