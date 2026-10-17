# syntax=docker/dockerfile:1
# Multi-stage Dockerfile for Decoration Web App & API
# Compatible with macOS (Apple Silicon / arm64), Linux (x86_64 / arm64), and Windows (WSL2 / Docker Desktop)

# ── Stage 1: Base & Dependencies ─────────────────────────────────────────────
FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat python3 make g++ curl

# Install Bun for fast package execution
RUN npm install -g bun@1.2.4

# Copy lockfiles and package definitions
COPY package.json bun.lock* bunfig.toml* ./

# Install project dependencies
RUN bun install --frozen-lockfile || npm install

# ── Stage 2: Development ─────────────────────────────────────────────────────
FROM base AS development
WORKDIR /app
COPY . .
ENV NODE_ENV=development
EXPOSE 5174 4000
CMD ["bun", "run", "dev", "--host", "0.0.0.0", "--port", "5174"]

# ── Stage 3: Builder ─────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app
COPY . .
ENV NODE_ENV=production
# Build Vite client and Nitro SSR server bundle
RUN bun run build || npm run build

# ── Stage 4: Production Runner ───────────────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache curl

# Copy build artifacts and dependencies
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.output ./.output
COPY --from=builder /app/server ./server
COPY --from=builder /app/public ./public

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:4000/api/health || exit 1

EXPOSE 5174 4000

# Start both API server and Nitro SSR bundle
CMD ["sh", "-c", "node server/index.mjs & node .output/server/index.mjs"]
