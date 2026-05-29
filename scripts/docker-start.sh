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

# ── Safety backup (added 2026-05-29) ──────────────────────────────────────────
# Back up the SQLite DB before any schema push, so a boot can NEVER silently
# destroy data again (root cause of the 2026-05 data loss). Best-effort:
# never blocks startup. Keeps the 10 most recent backups.

DB_FILE="$(find /app -name 'ledgerium.db' -type f 2>/dev/null | head -1 || true)"
if [ -n "$DB_FILE" ] && [ -f "$DB_FILE" ]; then
  BACKUP="${DB_FILE}.backup-$(date -u +%Y%m%dT%H%M%SZ)"
  if cp "$DB_FILE" "$BACKUP" 2>/dev/null; then
    echo "[ledgerium] DB backed up to $BACKUP"
  else
    echo "[ledgerium] WARNING: DB backup failed (continuing startup)"
  fi
  # Bound disk usage: keep only the 10 newest backups.
  ls -1t "${DB_FILE}".backup-* 2>/dev/null | tail -n +11 | xargs -r rm -f 2>/dev/null || true
else
  echo "[ledgerium] No existing DB found to back up (fresh install?)"
fi

# ── Database migration (data-loss-safe) ───────────────────────────────────────
# IMPORTANT: --accept-data-loss is intentionally REMOVED. Without it, Prisma
# applies additive changes (new tables/columns) normally but ERRORS instead of
# destroying rows if a push would be destructive — turning silent data loss into
# a loud, recoverable failure. The server still starts on the existing schema.

cd /app/apps/web-app
echo "[ledgerium] Running database migration (non-destructive)..."
npx prisma db push --skip-generate 2>&1 || {
  echo "[ledgerium] WARNING: prisma db push failed (needs generate, or would cause data loss)."
  echo "[ledgerium] Retrying generate + non-destructive push. NOT using --accept-data-loss."
  npx prisma generate 2>&1 || true
  npx prisma db push --skip-generate 2>&1 || echo "[ledgerium] WARNING: db push skipped — starting on existing schema WITHOUT data loss."
}
echo "[ledgerium] Database ready"

# ── Start server ──────────────────────────────────────────────────────────────

echo "[ledgerium] Starting server on port ${PORT:-3000}..."
exec node_modules/.bin/next start --hostname 0.0.0.0 --port ${PORT:-3000}
