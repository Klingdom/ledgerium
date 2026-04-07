#!/bin/sh
set -e

echo "[ledgerium] Starting up..."
echo "[ledgerium] Node $(node --version) | $(date -u)"

# ── Environment validation ────────────────────────────────────────────────────
# Fail fast if critical env vars are missing instead of silently breaking.

if [ -z "$NEXTAUTH_SECRET" ]; then
  echo "[ledgerium] FATAL: NEXTAUTH_SECRET is not set. Generate one with: openssl rand -base64 32"
  exit 1
fi

if [ -z "$DATABASE_URL" ]; then
  echo "[ledgerium] WARNING: DATABASE_URL not set, defaulting to file:./data/ledgerium.db"
  export DATABASE_URL="file:./data/ledgerium.db"
fi

if [ "$NEXTAUTH_SECRET" = "build-time-placeholder" ] || [ "$NEXTAUTH_SECRET" = "ledgerium-dev-secret-change-in-production" ]; then
  echo "[ledgerium] FATAL: NEXTAUTH_SECRET is still set to a placeholder value. Generate a real secret."
  exit 1
fi

echo "[ledgerium] Environment validated"

# ── Data directories ──────────────────────────────────────────────────────────

mkdir -p /app/data/uploads 2>/dev/null || true

# ── Database migration ────────────────────────────────────────────────────────

cd /app/apps/web-app
echo "[ledgerium] Running database migration..."
npx prisma db push --skip-generate --accept-data-loss 2>&1 || {
  echo "[ledgerium] WARNING: prisma db push failed, retrying with generate..."
  npx prisma generate 2>&1 || true
  npx prisma db push --accept-data-loss 2>&1 || echo "[ledgerium] WARNING: database setup failed"
}
echo "[ledgerium] Database ready"

# ── Start server ──────────────────────────────────────────────────────────────

echo "[ledgerium] Starting server on port ${PORT:-3000}..."
exec node_modules/.bin/next start --hostname 0.0.0.0 --port ${PORT:-3000}
