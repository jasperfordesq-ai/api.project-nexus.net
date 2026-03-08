# Multi-stage Dockerfile for NEXUS Admin Panel
# Supports both development (hot reload) and production modes

# =============================================================================
# Base stage
# =============================================================================
FROM node:20-alpine AS base
WORKDIR /app

# =============================================================================
# Dependencies stage
# =============================================================================
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm install

# =============================================================================
# Development stage - hot reload enabled
# =============================================================================
FROM base AS dev
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
EXPOSE 5173
ENV NODE_ENV=development
CMD ["npm", "run", "dev", "--", "--host"]

# =============================================================================
# Build stage
# =============================================================================
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build

# =============================================================================
# Production stage - serve with nginx
# =============================================================================
FROM nginx:1.27-alpine AS production
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1/health || exit 1
CMD ["nginx", "-g", "daemon off;"]
