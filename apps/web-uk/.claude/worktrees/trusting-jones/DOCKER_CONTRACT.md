# Docker Contract - NEXUS UK Frontend

## Source of Truth

**Docker is the ONLY supported development environment.**

The `compose.yml` file defines how to run the UK frontend in development and production modes. Do not use native Node.js, XAMPP, or any other local setup.

### Why Docker Only?

- **Consistency** - Same environment for all developers and production
- **No dependency conflicts** - Node.js, Sass, etc. are containerized
- **Simple onboarding** - Just `docker compose up`
- **Matches production** - Production also uses Docker

## Quick Reference

| Item | Value |
|------|-------|
| Container name | `nexus-uk-frontend-dev` |
| Host port | `5180` |
| Container port | `3001` |
| URL | http://localhost:5180 |
| Backend API | http://host.docker.internal:5080 |
| Health check | http://localhost:5180/health |

## Commands

### Start (Development)
```bash
docker compose up
```
Or detached:
```bash
docker compose up -d
```

### Stop
```bash
docker compose down
```

### Rebuild (after Dockerfile changes)
```bash
docker compose up --build
```

### View logs
```bash
docker compose logs -f
```

### Start (Production mode)
```bash
docker compose --profile prod up
```

## Port Mapping

| Service | Host Port | Container Port | Notes |
|---------|-----------|----------------|-------|
| UK Frontend | 5180 | 3001 | Avoids conflict with modern frontend (5170) |

## API URL Rules

| Environment | API_BASE_URL |
|-------------|--------------|
| Docker (default) | `http://host.docker.internal:5080` |
| Non-Docker local | `http://localhost:5000` (or as configured in `.env`) |

The Docker environment uses `host.docker.internal` to reach services running on the host machine. This is configured in `.env.docker` and **should not be changed** unless you're connecting to a different backend.

## File Structure

```
compose.yml       # Source of truth for Docker setup
Dockerfile        # Multi-stage build (dev + prod targets)
.env.docker       # Docker-only environment variables
.env              # Non-Docker environment variables (fallback)
.dockerignore     # Files excluded from Docker context
```

## Development Workflow

### Hot Reload

In development mode, the following directories are mounted as volumes:
- `./src` → `/app/src`
- `./public` → `/app/public`

Changes to these directories trigger automatic reload via nodemon and sass watch.

### CSS Changes

CSS changes are automatically recompiled when you modify files in `src/assets/scss/`.

### Adding Dependencies

After modifying `package.json`:
```bash
docker compose up --build
```

## Instructions for AI Tools

When working on this project:

1. **Assume Docker is running** unless explicitly told otherwise
2. **Use port 5180** for testing the UK frontend
3. **Backend is at** `http://host.docker.internal:5080` from container perspective
4. **Use `docker compose` commands** (not `docker-compose`)
5. **Check container health** with `docker compose ps` or `curl http://localhost:5180/health`

### Verifying Setup

```bash
# Check container is running
docker ps --filter "name=nexus-uk-frontend"

# Check frontend responds
curl http://localhost:5180/health

# Check backend reachable from container
docker exec nexus-uk-frontend-dev wget -qO- http://host.docker.internal:5080/health
```

## Troubleshooting

### Port 5180 already in use
```bash
# Find what's using the port
netstat -ano | findstr :5180  # Windows
lsof -i :5180                 # macOS/Linux

# Or change the port in compose.yml
```

### Backend not reachable
1. Verify backend is running on port 5080
2. Check `host.docker.internal` resolves: `docker exec nexus-uk-frontend-dev ping host.docker.internal`
3. On Linux, ensure `extra_hosts` is set in compose.yml (already configured)

### Container won't start
```bash
# Check logs
docker compose logs nexus-uk-frontend

# Rebuild from scratch
docker compose down
docker compose up --build
```

### CSS not updating
```bash
# Check sass watch is running
docker compose logs -f | grep sass

# Force rebuild
docker compose up --build
```
