# Runbook — Database & Evidence Backup and Restore

Closes DB-health-review-001 **P0: backups co-located on the data volume, never restore-tested, no off-site copy** AND SOP_BUILDER_REVIEW-001 **B-4: the evidence backing the product's core claim was not backed up at all.** Targets: **RPO 1 hour, RTO 30 minutes** for both artifacts.

Scripts:
- `scripts/db-backup.sh` — consistent online backup of the SQLite DB → off-host. **Now also runs `evidence-backup.sh` first, every time** (see below).
- `scripts/evidence-backup.sh` — incremental backup of `UPLOAD_DIR` (the uploaded session bundles) → off-host.
- `scripts/db-restore.sh` — verified restore of the DB, with a safety copy. Supports a non-destructive `VERIFY` mode.
- `scripts/evidence-restore.sh` — verified restore of the evidence set (one or more chained archives), with a safety copy. Supports a non-destructive `VERIFY` mode.

---

## Why the old posture was unsafe

`scripts/docker-start.sh` copies `ledgerium.db` to `.backup-*` on the **same volume**, only at boot, and never verifies a restore. One `docker volume rm ledgerium-data`, disk failure, or host compromise destroys the DB and every backup together.

**The DB-only fix (this runbook's original scope) was itself incomplete.** Every `WorkflowArtifact` row of type `source_bundle` stores a `contentPath` pointing at a file under `UPLOAD_DIR` (`/app/data/uploads/{userId}/{uploadId}.json`) — the raw uploaded session bundle. Per `docs/features/sop-authoring/OVERLAY_ARCHITECTURE_DECISION.md` §2.1, the extension **discards raw events at export** and only ever uploads normalized events — the bundle on disk is the **single upstream copy**, not a redundant one. `scripts/db-backup.sh` backed up only `DATABASE_FILE`. After the exact disaster this runbook exists to survive, a DB-only restore returns every workflow row and every `source_bundle` artifact pointing at a file that no longer exists — regeneration is impossible and the evidence-linkage claim is void for every restored workflow.

Both artifacts now get an off-host, integrity-checked, scheduled copy that survives a volume-level event, and they are kept ordered so a restored DB and a restored evidence set are consistent with each other (see below).

---

## How the two backups stay consistent

The app always **writes the bundle file to disk before it inserts the `source_bundle` row** referencing it (true in both `apps/web-app/src/app/api/upload/route.ts` and `.../api/sync/route.ts`). `db-backup.sh` exploits that ordering: it runs `evidence-backup.sh` **first**, every cycle, before it snapshots the DB. That guarantees every `source_bundle` row present in a given DB snapshot references a file that evidence-backup.sh has already captured (this cycle or an earlier one).

**Residual skew window:** a bundle whose file write *and* row insert both happen after evidence-backup's file scan but before the DB snapshot moment — in practice a few seconds — will have its DB row backed up this cycle but its file deferred to the next cycle. Worst case that is bounded by the backup interval (default hourly, matching the DB's own RPO). Closing this fully would require a DB transaction correlated with a filesystem snapshot; that is more machinery than current single-tenant/beta volume justifies. Run both backups on the same (hourly) cadence to keep the bound at ≤1h.

**If evidence-backup.sh fails**, `db-backup.sh` does **not** abort — the DB is the smaller, more time-sensitive artifact and its RPO should not depend on evidence succeeding — but it logs a loud `WARNING`. Treat a DB backup produced during a cycle with a failed evidence step as **not evidence-complete**; prefer the most recent DB backup whose cycle also reported a successful evidence backup.

---

## Volume assumption (uploads/evidence)

Bundle files under `UPLOAD_DIR` are **write-once**: verified that nothing in the codebase modifies or deletes them after upload. `evidence-backup.sh` exploits that immutability with an **incremental** strategy — each run archives only files newer than a local marker (a plain file whose mtime tracks the last successful off-host upload), instead of re-tarring and re-uploading the entire directory every cycle.

**Assumption, stated explicitly: current bundle volume is small** (single-tenant / early-stage). This has not been load-tested at high upload volume or high file counts. If bundle count grows into the tens of thousands per cycle, revisit (batching, parallel upload, or a real incremental-backup tool). Do not read the incremental design as premature optimization — it exists because a naive full-copy-every-hour approach re-uploads the same immutable files forever and does not scale even at moderate volume; it is not solving a problem that doesn't exist yet.

**Because it's incremental, a full evidence restore may need more than one archive** — one `-full` baseline plus zero or more `-incr` archives, applied oldest-first. `evidence-restore.sh` handles this automatically given a directory or S3 prefix.

**Operational consequence — re-baseline periodically.** Unlike the DB backup (which is a complete, self-sufficient snapshot every run), an evidence restore is only as good as its chain back to the last `-full` baseline. Do **not** apply a bucket lifecycle/expiry rule that can delete a `-full` archive while `-incr` archives that depend on it still exist. Recommended: run `UPLOADS_BACKUP_FORCE_FULL=1 sh scripts/evidence-backup.sh` monthly (separate cron line) to cap how far back a restore ever has to reach, and only apply lifecycle expiry to `-incr` archives older than the newest `-full`.

---

## Encryption

Bundles contain captured workplace process data — at least as sensitive as the DB (which the original runbook already flagged as holding PII). `evidence-backup.sh` uses the **same `AGE_RECIPIENT`/`AGE_IDENTITY` gate** as `db-backup.sh`, so evidence is never weaker-protected than the DB by default. If your threat model wants narrower key custody for evidence specifically, the scripts don't currently support a separate key pair — that would be a small, deliberate follow-up, not a workaround.

---

## One-time setup (you do this)

1. **Create an object-storage bucket** (Cloudflare R2, Backblaze B2, AWS S3, or any S3-compatible). Note the bucket URI and endpoint. You can use one bucket with two prefixes (`/db`, `/uploads`) or two buckets — either works.
2. **Create an encryption key** (recommended — both artifacts hold PII):
   ```bash
   age-keygen -o ledgerium-backup.key      # keep the private key OFF the VPS
   # public line "age1..." is the AGE_RECIPIENT; the file is the AGE_IDENTITY for restore
   ```
3. **Set env on the VPS** (e.g. in the container env or a cron env file):
   ```
   DATABASE_FILE=/app/data/ledgerium.db
   UPLOAD_DIR=/app/data/uploads
   BACKUP_S3_URI=s3://ledgerium-backups/db
   UPLOADS_BACKUP_S3_URI=s3://ledgerium-backups/uploads
   BACKUP_S3_ENDPOINT=https://<accountid>.r2.cloudflarestorage.com   # R2/B2 only
   AGE_RECIPIENT=age1xxxxxxxx...
   AWS_ACCESS_KEY_ID=...        # bucket credentials
   AWS_SECRET_ACCESS_KEY=...
   ```
   `aws` CLI, `age`, and `tar` must be on the host (or in the image) — **`tar` is a new prerequisite introduced by evidence-backup.sh / evidence-restore.sh**; `sqlite3`/`aws`/`age` were already assumed by the DB scripts.

## Schedule it (hourly off-host backup → RPO 1h for both artifacts)
```cron
0 * * * * sh /app/scripts/db-backup.sh >> /var/log/ledgerium-backup.log 2>&1
```
`db-backup.sh` runs `evidence-backup.sh` internally first — **do not** also cron `evidence-backup.sh` standalone unless you have a specific reason to and accept that it breaks the ordering guarantee above. Apply lifecycle/retention on the bucket per the volume note above (keep `-full` archives; expire old `-incr` archives freely once superseded by a newer `-full`).

Add a monthly re-baseline:
```cron
0 3 1 * * UPLOADS_BACKUP_FORCE_FULL=1 sh /app/scripts/evidence-backup.sh >> /var/log/ledgerium-backup.log 2>&1
```

## Optional: pre-deploy backup gate in CI
Add a step in `.github/workflows/deploy.yml` **between `build-and-push` and `deploy`** that SSHes to the VPS and runs `sh /app/scripts/db-backup.sh`, so every release has a known-good checkpoint (DB + evidence) tagged near the deploy SHA. Keep it `continue-on-error: false` once secrets are configured (a deploy without a fresh backup should stop). Do NOT add it before the bucket + secrets exist — it would fail every deploy.

---

## Restore (RTO 30m)

**Restore evidence first, then the DB, in that order** — mirrors the backup ordering and keeps the pairing safe. Use an evidence cutoff timestamp ≥ the DB snapshot's timestamp so every `source_bundle` row in the restored DB has a backing file:

```bash
# 1) Evidence — CONFIRM (or VERIFY first, non-destructively, see below)
AGE_IDENTITY=/path/ledgerium-backup.key \
  sh scripts/evidence-restore.sh s3://ledgerium-backups/uploads CONFIRM 20260628T120000Z

# 2) Database
AGE_IDENTITY=/path/ledgerium-backup.key \
  sh scripts/db-restore.sh s3://ledgerium-backups/db/ledgerium-20260628T120000Z.db.age CONFIRM

# then restart the app container
docker compose -f compose.hostinger.yaml up -d
```

Both scripts make a safety copy of the live artifact before overwriting anything (`*.pre-restore-<ts>` for the DB file; `<UPLOAD_DIR>.pre-restore-<ts>` for the evidence directory), so a bad restore is reversible. Evidence restore **merges** into `UPLOAD_DIR` rather than wiping it first — bundles are content-addressed by `{userId}/{uploadId}.json` and immutable, so an existing file with the same name is byte-identical and safe to leave or overwrite; this also means a restore never deletes evidence that exists locally but wasn't yet in this particular backup set (e.g. because of a recent upload-failure retry window).

**`db-restore.sh` restores the database only.** It prints a loud reminder of this at the end of every restore. If you skip step 1 above, every restored `source_bundle` row may point at a missing file — this is the exact B-4 failure mode, not a hypothetical.

## Verify a backup is restorable, without restoring it

Both restore scripts accept `VERIFY` in place of `CONFIRM`: they download/decrypt/integrity-check (and, for evidence, extract to a throwaway staging directory) but **never touch the live `DATABASE_FILE` or `UPLOAD_DIR`**.

```bash
sh scripts/db-restore.sh s3://ledgerium-backups/db/ledgerium-20260628T120000Z.db.age VERIFY
sh scripts/evidence-restore.sh s3://ledgerium-backups/uploads VERIFY 20260628T120000Z
```

The DB check runs `PRAGMA integrity_check`. The evidence check runs `tar -tf` (list-only) on every archive in the chain and cross-checks the listed entry count against the file count that was originally archived — the tar analogue of `PRAGMA integrity_check`; a truncated or corrupted archive fails to list cleanly.

## Test the restore quarterly (non-negotiable — an untested backup is not a backup)
Run both `VERIFY` commands above against the latest off-host backups. Then, on a throwaway host/path, run both `CONFIRM` restores into throwaway `DATABASE_FILE`/`UPLOAD_DIR` locations and confirm: `PRAGMA integrity_check` passes, row counts on `users`/`workflows`/`teams` look right, and every `source_bundle.contentPath` for a sampled set of workflows resolves to a file that exists under the restored `UPLOAD_DIR`. Record the date.

---

## Related follow-ups (DB-health-review-001 / SOP_BUILDER_REVIEW-001)
- Switch boot `prisma db push` → `prisma migrate deploy` (separate iteration; needs a baseline-migration reconciliation + a `prisma migrate diff --exit-code` CI gate first).
- Enable `PRAGMA journal_mode=WAL` — note WAL adds `-wal`/`-shm` sidecar files; the `.backup` API used here already handles WAL correctly, but a raw `cp` does not.
- Migrate to Postgres (the strategic fix; Postgres already runs in-stack as `umami-db`).
- Consider a separate `AGE_RECIPIENT`/`AGE_IDENTITY` key pair for evidence vs. DB if narrower key custody becomes a requirement — not implemented; both currently share one key.
- `evidence-backup.sh`/`evidence-restore.sh` are new scripts that are not yet wired into the Docker image (`Dockerfile` only copies `scripts/docker-start.sh`; the pre-existing `db-backup.sh`/`db-restore.sh` have the same gap). Confirm the actual execution environment for these scripts (host cron with a bind-mounted volume path, vs. `docker exec` into the running container) before relying on the cron line above, and copy `scripts/*.sh` into the image or the host as appropriate.
