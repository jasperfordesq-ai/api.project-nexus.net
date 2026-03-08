# Docker Contract - Nexus Modern Frontend

## Source of Truth

**Docker Compose is the source of truth for running this frontend locally.**

All development and local testing should be done via Docker unless explicitly opting for the non-Docker fallback workflow.

---

## Quick Start

```bash
# Start development environment (default)
docker compose up

# Start with rebuild
docker compose up --build

# Start in background
docker compose up -d

# View logs
docker compose logs -f

# Stop
docker compose down
```

---

## Port Mapping

| Service | Container Port | Host Port | URL |
|---------|---------------|-----------|-----|
| frontend (dev) | 3002 | **5170** | http://localhost:5170 |
| frontend-prod | 3002 | 5171 | http://localhost:5171 |

Port 5170 was chosen to avoid conflicts with common development ports.

---

## API Base URL Rules

| Environment | API URL | How It's Set |
|-------------|---------|--------------|
| Docker (default) | `http://host.docker.internal:5080` | `.env.docker` |
| Non-Docker fallback | `http://localhost:5000` | `.env.local` |

The frontend uses the `NEXT_PUBLIC_API_URL` environment variable.

- **Docker runs** load `.env.docker` (points to `host.docker.internal:5080`)
- **Non-Docker runs** load `.env.local` (points to `localhost:5000`)

> **Important:** Never hardcode API URLs in source code. Always use the environment variable.

---

## Container Details

- **Container name:** `nexus-frontend`
- **Image base:** `node:20-alpine`
- **Working directory:** `/app`
- **Hot reload:** Enabled via volume mounts and WATCHPACK_POLLING

---

## Production Mode

For production builds (multi-stage, optimized):

```bash
docker compose --profile production up --build
```

This runs on port **5171** to allow side-by-side testing with dev.

---

## Non-Docker Fallback

If Docker is unavailable, use the native Node.js workflow:

```bash
npm install
npm run dev    # Development: http://localhost:3002
npm run build  # Production build
npm run start  # Production server: http://localhost:3002
```

When running without Docker, ensure `.env.local` has the correct API URL for your setup.

---

## Instructions for AI Tools

When working with this project:

1. **Assume Docker is the default.** Run commands via `docker compose`.
2. **API URL:** Always use `http://host.docker.internal:5080` for the backend API when running in Docker.
3. **Do NOT suggest `localhost` API URLs** unless the user explicitly requests non-Docker workflow.
4. **Port:** The frontend is available at `http://localhost:5170` (not 3000 or 3002 on host).
5. **Environment variables:** Docker uses `.env.docker`, not `.env.local`.

### Common Mistakes to Avoid

- Don't suggest `npm run dev` as the default - use `docker compose up`
- Don't use `http://localhost:5080` for API calls from the container - use `host.docker.internal`
- Don't assume the frontend runs on port 3000 or 3002 on the host - it's mapped to 5170

---

## File Structure

```
├── Dockerfile           # Multi-stage: dev and production targets
├── compose.yml          # Docker Compose configuration (source of truth)
├── .env.docker          # Docker-specific environment (API URL for containers)
├── .env.local           # Non-Docker fallback environment
├── .dockerignore        # Files excluded from Docker build context
└── DOCKER_CONTRACT.md   # This file
```

---

## Most Common Commands

```bash
# 1. Start development environment
docker compose up

# 2. Rebuild and start (after Dockerfile or package changes)
docker compose up --build

# 3. View logs
docker compose logs -f frontend

# 4. Stop all containers
docker compose down

# 5. Shell into container (debugging)
docker exec -it nexus-frontend sh
```
