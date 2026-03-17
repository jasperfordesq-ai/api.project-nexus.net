# =============================================================================
# Project NEXUS - React Frontend Dockerfile
# =============================================================================
# Multi-stage: dev (Vite HMR) | production (npm build → nginx)
# =============================================================================

# ─── Stage 1: Base (shared deps) ─────────────────────────────────────────────
FROM node:20-alpine AS base
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ─── Stage 2: Development (Vite dev server with HMR) ─────────────────────────
FROM base AS dev
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# ─── Stage 3: Build (production bundle) ──────────────────────────────────────
FROM base AS builder

# Build-time env vars (baked into the JS bundle by Vite)
ARG VITE_API_BASE=/api
ARG VITE_API_URL=https://api.project-nexus.net
ARG VITE_DEFAULT_TENANT_ID=1
ARG BUILD_COMMIT=unknown

ENV VITE_API_BASE=$VITE_API_BASE
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_DEFAULT_TENANT_ID=$VITE_DEFAULT_TENANT_ID
ENV BUILD_COMMIT=$BUILD_COMMIT

COPY . .
RUN npm run build

# ─── Stage 4: Production (nginx serves static files + API proxy) ──────────────
FROM nginx:1.27-alpine AS production

# Default API upstream — override at runtime with -e API_UPSTREAM=host:port
ENV API_UPSTREAM=api:8080

# Remove default nginx content
RUN rm -rf /usr/share/nginx/html/*

# Copy built assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx config template (uses ${API_UPSTREAM} variable)
COPY nginx.conf /etc/nginx/nginx.conf.template

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://127.0.0.1/health || exit 1

# Resolve ONLY ${API_UPSTREAM} (not $host, $uri etc.) then start nginx
CMD ["/bin/sh", "-c", "envsubst '${API_UPSTREAM}' < /etc/nginx/nginx.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]
