# Ledgerium AI — Deployment Guide

## Docker Deployment (Recommended)

### Prerequisites

- Docker and Docker Compose installed
- Git access to the repository

### Quick Start

```bash
# Clone and enter repo
git clone https://github.com/Klingdom/ledgerium.git
cd ledgerium

# Create environment file
cp .env.docker.example .env

# Edit .env — set NEXTAUTH_SECRET (required)
# Generate a secret: openssl rand -base64 32

# Build and start
docker compose up -d

# View logs
docker compose logs -f

# Open https://ledgerium.ai
```

### Updating

```bash
git pull
docker compose up -d --build
```

The database and uploads persist across rebuilds via the `ledgerium-data` Docker volume.

### Data Persistence

All business data lives in a single Docker volume: `ledgerium-data`

| Path in container | Contents | Persistent? |
|-------------------|----------|-------------|
| `/app/data/ledgerium.db` | SQLite database (users, workflows, artifacts, intelligence) | Yes — volume mounted |
| `/app/data/uploads/` | Raw uploaded JSON files organized by user ID | Yes — volume mounted |
| `/app/apps/web-app/.next/` | Next.js build cache | No — rebuilt on deploy |

### Backups

The simplest backup strategy for SQLite:

```bash
# Copy the database file from the volume
docker cp ledgerium-ai:/app/data/ledgerium.db ./backup-$(date +%Y%m%d).db

# Or backup the entire data directory
docker cp ledgerium-ai:/app/data ./backup-data-$(date +%Y%m%d)
```

For production, consider scheduled backups via cron:

```bash
# Add to crontab: daily backup at 2am
0 2 * * * docker cp ledgerium-ai:/app/data/ledgerium.db /backups/ledgerium-$(date +\%Y\%m\%d).db
```

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXTAUTH_SECRET` | Yes | — | Auth session encryption key |
| `NEXTAUTH_URL` | No | `https://ledgerium.ai` | Public URL for auth callbacks |
| `PORT` | No | `3000` | Port to expose |
| `DATABASE_URL` | No | `file:/app/data/ledgerium.db` | SQLite database path |
| `DATA_DIR` | No | `/app/data` | Base directory for persistent data |
| `UPLOAD_DIR` | No | `/app/data/uploads` | Upload storage directory |
| `STRIPE_SECRET_KEY` | No | — | Stripe API key (when billing is wired) |

### Custom Domain / HTTPS

For production with a custom domain, use a reverse proxy (nginx, Caddy, Traefik):

```yaml
# Example: add to compose.yaml
services:
  caddy:
    image: caddy:2-alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy-data:/data
    depends_on:
      - web
```

```
# Caddyfile
yourdomain.com {
    reverse_proxy web:3000
}
```

### Troubleshooting

**Container won't start:**
```bash
docker compose logs web
```

**Database issues:**
```bash
# Enter the container
docker exec -it ledgerium-ai sh

# Check database
ls -la /app/data/ledgerium.db

# Re-push schema (non-destructive)
cd /app/apps/web-app && npx prisma db push --skip-generate
```

**Reset everything (destroys data):**
```bash
docker compose down -v  # -v removes the data volume
docker compose up -d --build
```

---

## Local Development

```bash
cd apps/web-app
cp .env.example .env
npx prisma db push
npx next dev --port 3000
```

## Browser Extension

The browser extension is a separate build artifact — it is NOT part of the Docker deployment.

```bash
pnpm --filter @ledgerium/extension-app build
# Output: apps/extension-app/dist/
# Load as unpacked extension in Chrome
```
