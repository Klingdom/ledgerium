# Runbook — Database Backup & Restore

Closes DB-health-review-001 **P0: backups co-located on the data volume, never restore-tested, no off-site copy.** Targets: **RPO 1 hour, RTO 30 minutes.**

Scripts: `scripts/db-backup.sh` (consistent online backup → off-host), `scripts/db-restore.sh` (verified restore with safety copy).

---

## Why the old posture was unsafe
`scripts/docker-start.sh` copies `ledgerium.db` to `.backup-*` on the **same volume**, only at boot, and never verifies a restore. One `docker volume rm ledgerium-data`, disk failure, or host compromise destroys the DB and every backup together. These scripts add an **off-host, integrity-checked, scheduled** copy that survives a volume-level event.

---

## One-time setup (you do this)

1. **Create an object-storage bucket** (Cloudflare R2, Backblaze B2, AWS S3, or any S3-compatible). Note the bucket URI and endpoint.
2. **Create an encryption key** (recommended — backups hold PII):
   ```bash
   age-keygen -o ledgerium-backup.key      # keep the private key OFF the VPS
   # public line "age1..." is the AGE_RECIPIENT; the file is the AGE_IDENTITY for restore
   ```
3. **Set env on the VPS** (e.g. in the container env or a cron env file):
   ```
   DATABASE_FILE=/app/data/ledgerium.db
   BACKUP_S3_URI=s3://ledgerium-backups/db
   BACKUP_S3_ENDPOINT=https://<accountid>.r2.cloudflarestorage.com   # R2/B2 only
   AGE_RECIPIENT=age1xxxxxxxx...
   AWS_ACCESS_KEY_ID=...        # bucket credentials
   AWS_SECRET_ACCESS_KEY=...
   ```
   `aws` CLI and `age` must be on the host (or add them to the image).

## Schedule it (hourly off-host backup → RPO 1h)
```cron
0 * * * * sh /app/scripts/db-backup.sh >> /var/log/ledgerium-backup.log 2>&1
```
Apply lifecycle/retention on the bucket (e.g. keep 72 hourly + 30 daily).

## Optional: pre-deploy backup gate in CI
Add a step in `.github/workflows/deploy.yml` **between `build-and-push` and `deploy`** that SSHes to the VPS and runs `sh /app/scripts/db-backup.sh`, so every release has a known-good checkpoint tagged near the deploy SHA. Keep it `continue-on-error: false` once secrets are configured (a deploy without a fresh backup should stop). Do NOT add it before the bucket + secrets exist — it would fail every deploy.

---

## Restore (RTO 30m)
```bash
# from an off-host backup (decrypts + integrity-checks + saves current DB first)
AGE_IDENTITY=/path/ledgerium-backup.key \
  sh scripts/db-restore.sh s3://ledgerium-backups/db/ledgerium-20260628T120000Z.db.age CONFIRM
# then restart the app container
docker compose -f compose.hostinger.yaml up -d
```
The restore makes a `*.pre-restore-*` safety copy before overwriting, so a bad restore is reversible.

## Test the restore quarterly (non-negotiable — an untested backup is not a backup)
Restore the latest off-host backup into a throwaway container/path, run `PRAGMA integrity_check`, and confirm row counts on `users`, `workflows`, `teams`. Record the date.

---

## Related follow-ups (DB-health-review-001)
- Switch boot `prisma db push` → `prisma migrate deploy` (separate iteration; needs a baseline-migration reconciliation + a `prisma migrate diff --exit-code` CI gate first).
- Enable `PRAGMA journal_mode=WAL` — note WAL adds `-wal`/`-shm` sidecar files; the `.backup` API used here already handles WAL correctly, but a raw `cp` does not.
- Migrate to Postgres (the strategic fix; Postgres already runs in-stack as `umami-db`).
