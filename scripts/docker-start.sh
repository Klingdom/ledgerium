#!/bin/sh
set -e

# Ensure data directories exist
mkdir -p /app/data/uploads

# Push database schema (non-destructive — only adds new tables/columns)
cd /app/apps/web-app
npx prisma db push --skip-generate 2>&1 || echo "Warning: prisma db push failed"

# Start Next.js production server
exec node_modules/.bin/next start --hostname 0.0.0.0 --port ${PORT:-3000}
