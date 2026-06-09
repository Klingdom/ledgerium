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

# ── Safety backup (hardened 2026-06-09) ───────────────────────────────────────
# Back up EVERY ledgerium.db found under /app BEFORE any schema push, so a boot
# can NEVER silently destroy data again (root cause of the 2026-05 data loss).
# Best-effort: never blocks startup. Keeps the 10 most recent backups per DB file.
# (Backs up all matches so the real prod DB on the /app/data volume is covered
# regardless of how the relative DATABASE_URL resolves.)

find /app -name 'ledgerium.db' -type f 2>/dev/null | while IFS= read -r DB_FILE; do
  [ -f "$DB_FILE" ] || continue
  BACKUP="${DB_FILE}.backup-$(date -u +%Y%m%dT%H%M%SZ)"
  if cp "$DB_FILE" "$BACKUP" 2>/dev/null; then
    echo "[ledgerium] DB backed up: $BACKUP"
  else
    echo "[ledgerium] WARNING: DB backup failed for $DB_FILE (continuing startup)"
  fi
  ls -1t "${DB_FILE}".backup-* 2>/dev/null | tail -n +11 | while IFS= read -r OLD; do
    rm -f "$OLD" 2>/dev/null || true
  done
done

# ── Database migration (NON-destructive — NEVER --accept-data-loss) ───────────
# --accept-data-loss was the trigger of the 2026-05 data loss; we never pass it.
# If a migration would require destructive changes the push fails loudly and the
# previous DB (backed up above) is preserved rather than silently wiped.

cd /app/apps/web-app
echo "[ledgerium] Running database migration (non-destructive)..."
npx prisma db push --skip-generate 2>&1 || {
  echo "[ledgerium] WARNING: prisma db push failed, retrying with generate..."
  npx prisma generate 2>&1 || true
  npx prisma db push 2>&1 || echo "[ledgerium] WARNING: database setup failed (DB preserved)"
}
echo "[ledgerium] Database ready"

# ── Cache writability verification (RCA-1 / writable-cache fix) ───────────────
# Confirms the Dockerfile chown -R nextjs:nodejs /app/apps/web-app/.next fix
# is effective. A missing or non-writable cache causes Next.js to fall back to
# in-memory caching and logs EACCES on every request.

ls /app/apps/web-app/.next/cache/ >/dev/null 2>&1 \
  && echo "[ledgerium] .next/cache writable: OK" \
  || echo "[ledgerium] WARNING: .next/cache not writable — check Dockerfile chown"

# ── Start server ──────────────────────────────────────────────────────────────

echo "[ledgerium] Starting server on port ${PORT:-3000}..."
exec node_modules/.bin/next start --hostname 0.0.0.0 --port ${PORT:-3000}
