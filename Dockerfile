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

# Copy workspace source
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web-app/ apps/web-app/
COPY packages/process-engine/ packages/process-engine/
COPY packages/intelligence-engine/ packages/intelligence-engine/

# Generate Prisma client
WORKDIR /app/apps/web-app
RUN npx prisma generate

# Build Next.js for production
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN npx next build

# ─── Stage 3: Production runtime ────────────────────────────────────────────

FROM node:20-alpine AS runner

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 ledgerium && \
    adduser --system --uid 1001 --ingroup ledgerium ledgerium

# Copy built app + production dependencies
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/web-app/.next ./apps/web-app/.next
COPY --from=builder /app/apps/web-app/public ./apps/web-app/public
COPY --from=builder /app/apps/web-app/package.json ./apps/web-app/package.json
COPY --from=builder /app/apps/web-app/next.config.js ./apps/web-app/next.config.js
COPY --from=builder /app/apps/web-app/prisma ./apps/web-app/prisma
COPY --from=builder /app/apps/web-app/node_modules ./apps/web-app/node_modules

# Copy workspace package sources needed at runtime (process-engine, intelligence-engine)
COPY --from=builder /app/packages/process-engine ./packages/process-engine
COPY --from=builder /app/packages/intelligence-engine ./packages/intelligence-engine
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-workspace.yaml ./pnpm-workspace.yaml

# Create persistent data directory (will be mounted as a volume)
RUN mkdir -p /app/data/uploads && \
    chown -R ledgerium:ledgerium /app/data

# Startup script: initialize DB + start server
COPY <<'EOF' /app/start.sh
#!/bin/sh
set -e

# Ensure data directories exist with correct permissions
mkdir -p /app/data/uploads

# Push database schema (non-destructive — only adds new tables/columns)
cd /app/apps/web-app
npx prisma db push --skip-generate 2>&1 || echo "Warning: prisma db push failed, DB may need manual attention"

# Start Next.js production server
exec node_modules/.bin/next start --hostname 0.0.0.0 --port ${PORT:-3000}
EOF
RUN chmod +x /app/start.sh

# Switch to non-root user
USER ledgerium

# Environment defaults
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV DATA_DIR=/app/data
ENV DATABASE_URL=file:/app/data/ledgerium.db
ENV UPLOAD_DIR=/app/data/uploads

EXPOSE 3000

WORKDIR /app/apps/web-app

CMD ["/app/start.sh"]
