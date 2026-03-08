# =============================================================================
# Nexus Community — GOV.IE Frontend Dockerfile
# Multi-stage: pnpm build → nginx serve
# =============================================================================

# ─── Stage 1: Build ───────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy manifests first for layer caching
COPY package.json pnpm-lock.yaml* ./

# Install dependencies (frozen lockfile in CI, regular in dev)
RUN pnpm install --frozen-lockfile 2>/dev/null || pnpm install

# Copy source
COPY . .

# Build for production
ARG VITE_API_BASE_URL=http://localhost:5080
ARG VITE_APP_NAME="Nexus Community"
ARG VITE_APP_VERSION=0.1.0
ARG VITE_TENANT_SLUG=acme

ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_APP_NAME=$VITE_APP_NAME
ENV VITE_APP_VERSION=$VITE_APP_VERSION
ENV VITE_TENANT_SLUG=$VITE_TENANT_SLUG

RUN pnpm build

# ─── Stage 2: Serve ───────────────────────────────────────────────────────────
FROM nginx:1.27-alpine AS runtime

# Remove default nginx content
RUN rm -rf /usr/share/nginx/html/*

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
