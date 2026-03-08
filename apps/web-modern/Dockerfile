# Multi-stage Dockerfile for Next.js frontend
# Supports both development (hot reload) and production modes

# =============================================================================
# Base stage - shared dependencies
# =============================================================================
FROM node:20-alpine AS base
WORKDIR /app

# =============================================================================
# Dependencies stage - install node_modules
# =============================================================================
FROM base AS deps
# Copy package files
COPY package.json package-lock.json* ./
# Install dependencies
RUN npm install

# =============================================================================
# Development stage - hot reload enabled
# =============================================================================
FROM base AS dev
WORKDIR /app
# Copy node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules
# Copy source code (will be overridden by volume mount in dev)
COPY . .
# Expose dev server port
EXPOSE 3002
# Set environment
ENV NODE_ENV=development
ENV NEXT_TELEMETRY_DISABLED=1
# Start dev server with hot reload
CMD ["npm", "run", "dev"]

# =============================================================================
# Builder stage - build production assets
# =============================================================================
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Build arguments for environment variables needed at build time
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_TELEMETRY_DISABLED=1
# Build the application
RUN npm run build

# =============================================================================
# Production stage - minimal runtime image
# =============================================================================
FROM base AS production
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs
# Copy built assets from builder
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Switch to non-root user
USER nextjs
EXPOSE 3002
ENV PORT=3002
ENV HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]
