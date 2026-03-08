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
# Production stage - serve with lightweight server
# =============================================================================
FROM nginx:alpine AS production
COPY --from=builder /app/dist /usr/share/nginx/html
# SPA routing: fallback to index.html
RUN echo 'server { listen 80; location / { root /usr/share/nginx/html; try_files $uri $uri/ /index.html; } }' > /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
