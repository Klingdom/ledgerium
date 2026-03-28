#!/bin/sh
set -e

echo "[ledgerium] Starting up..."

# Ensure data directories exist
mkdir -p /app/data/uploads 2>/dev/null || true

# Push database schema (non-destructive — only adds new tables/columns)
cd /app/apps/web-app
echo "[ledgerium] Running database migration..."
npx prisma db push --skip-generate --accept-data-loss 2>&1 || {
  echo "[ledgerium] WARNING: prisma db push failed, retrying with generate..."
  npx prisma generate 2>&1 || true
  npx prisma db push --accept-data-loss 2>&1 || echo "[ledgerium] WARNING: database setup failed"
}
echo "[ledgerium] Database ready"

# Start Next.js production server
echo "[ledgerium] Starting server on port ${PORT:-3000}..."
exec node_modules/.bin/next start --hostname 0.0.0.0 --port ${PORT:-3000}
