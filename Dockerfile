# ─── Ledgerium AI — Production Dockerfile ─────────────────────────────────────
#
# Multi-stage build for the web app.
# Browser extension is NOT included — it's a separate build artifact.
#
# Build:  docker build -t ledgerium-ai .
# Run:    docker compose up -d
# ──────────────────────────────────────────────────────────────────────────────

# ─── Stage 1: Install dependencies ──────────────────────────────────────────

FROM node:20-alpine AS deps

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace config + lockfile first (layer cache)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy package.json files for all workspace packages needed at build time
COPY apps/web-app/package.json apps/web-app/
COPY packages/process-engine/package.json packages/process-engine/
COPY packages/intelligence-engine/package.json packages/intelligence-engine/

# Install all dependencies (including dev for build step)
RUN pnpm install --frozen-lockfile

# ─── Stage 2: Build the application ─────────────────────────────────────────

FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy all node_modules from deps stage
COPY --from=deps /app/ ./

# Copy workspace source + root tsconfig (extended by web-app)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/web-app/ apps/web-app/
COPY packages/process-engine/ packages/process-engine/
COPY packages/intelligence-engine/ packages/intelligence-engine/

# Generate Prisma client
WORKDIR /app/apps/web-app
RUN npx prisma generate

# Build Next.js for production
# NEXTAUTH_SECRET is required at build time for NextAuth config validation.
# This is a dummy value — the real secret is set at runtime via env var.
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV NEXTAUTH_SECRET=build-time-placeholder
ENV NEXTAUTH_URL=http://localhost:3000
RUN npx next build

# ─── Stage 3: Production runtime ────────────────────────────────────────────

FROM node:20-alpine AS runner

WORKDIR /app

# Copy built app + production dependencies
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/web-app/.next ./apps/web-app/.next
COPY --from=builder /app/apps/web-app/public ./apps/web-app/public
COPY --from=builder /app/apps/web-app/package.json ./apps/web-app/package.json
COPY --from=builder /app/apps/web-app/next.config.js ./apps/web-app/next.config.js
COPY --from=builder /app/apps/web-app/prisma ./apps/web-app/prisma
COPY --from=builder /app/apps/web-app/node_modules ./apps/web-app/node_modules

# Copy workspace package sources needed at runtime
COPY --from=builder /app/packages/process-engine ./packages/process-engine
COPY --from=builder /app/packages/intelligence-engine ./packages/intelligence-engine
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-workspace.yaml ./pnpm-workspace.yaml

# Copy startup script
COPY scripts/docker-start.sh /app/start.sh
RUN chmod +x /app/start.sh

# Create persistent data directory and set ownership
RUN mkdir -p /app/data/uploads && \
    addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs && \
    chown -R nextjs:nodejs /app/data

# Environment defaults
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV AUTH_TRUST_HOST=true
ENV PORT=3000
ENV DATA_DIR=/app/data
ENV DATABASE_URL=file:/app/data/ledgerium.db
ENV UPLOAD_DIR=/app/data/uploads

EXPOSE 3000

# Run as non-root user for security
USER nextjs

WORKDIR /app/apps/web-app

# Health check for container orchestration
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

CMD ["/app/start.sh"]
