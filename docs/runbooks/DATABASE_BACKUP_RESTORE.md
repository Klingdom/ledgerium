# Runbook — Database & Evidence Backup and Restore

Closes DB-health-review-001 **P0: backups co-located on the data volume, never restore-tested, no off-site copy** AND SOP_BUILDER_REVIEW-001 **B-4: the evidence backing the product's core claim was not backed up at all.** Targets: **RPO 1 hour, RTO 30 minutes** for both artifacts.

> **Status note.** From the point these scripts were written until the change that added this note, **the P0 above was still open in production**, despite the scripts existing in the repo and this runbook describing them as the fix. `Dockerfile` never copied `db-backup.sh` / `db-restore.sh` / `evidence-backup.sh` / `evidence-restore.sh` into the image, never installed `sqlite3`/`aws`/`age`/`tar`, and no compose file or host cron ever invoked them. `docker-start.sh`'s boot-time `.backup-*` copy (same volume, no off-site copy, never restore-tested) was the *only* backup mechanism actually running. **This is now fixed**: the scripts are baked into the production image and run on a schedule via a dedicated `backup` compose service — see "How it actually runs" below. Do not assume backups exist for any point before this service's first successful cycle; verify per "Verifying it's actually running."

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

## How it actually runs — the `backup` sidecar service

`compose.hostinger.yaml` and `compose.hostinger-deploy.yaml` both define a `backup` service, built from **the same image as `web`** (no separate Dockerfile/build/CI job). Its command is `scripts/backup-cron-entrypoint.sh`, which snapshots the container's env, writes an hourly + monthly crontab, and hands off to `busybox crond` in the foreground. See that script's own header comment for the full mechanics (env-snapshotting to defeat cron's minimal-environment default; log redirection to `/proc/1/fd/{1,2}` so `docker logs` captures everything; why `BACKUP_TMP_DIR` is pointed at the persistent volume instead of `/tmp`).

This exists as a **compose service**, not a runbook instruction for a human to cron on the host, deliberately: a required step that depends on an operator remembering to configure something outside version control is the exact failure mode that left this P0 open — see the status note at the top of this document. The schedule now ships with the image and is defined in `compose.hostinger*.yaml`, which is itself version-controlled and survives a VPS rebuild.

**AWS/AGE credentials are set only on the `backup` service, never on `web`.** `web` has no code path that needs off-host storage access or backup decryption, so it never receives those env vars — see `compose.hostinger.yaml`'s `web.environment` block, which does not include them.

## One-time setup (you do this)

1. **Create an object-storage bucket** (Cloudflare R2, Backblaze B2, AWS S3, or any S3-compatible). Note the bucket URI and endpoint. You can use one bucket with two prefixes (`/db`, `/uploads`) or two buckets — either works.
2. **Create an encryption key** (recommended — both artifacts hold PII):
   ```bash
   age-keygen -o ledgerium-backup.key      # keep the private key OFF the VPS
   # public line "age1..." is the AGE_RECIPIENT; the file is the AGE_IDENTITY for restore
   ```
3. **Set the following as GitHub Actions repo/environment secrets and variables** (`Settings → Secrets and variables → Actions`). `.github/workflows/deploy.yml` passes them through to the `backup` compose service on every deploy — see its "Off-host backup sidecar" block. `DATABASE_FILE`, `UPLOAD_DIR`, and `BACKUP_TMP_DIR` are already hard-coded correctly in the compose files; you do not need to set them.

   | Name | Kind | Example | Notes |
   |---|---|---|---|
   | `BACKUP_S3_URI` | var | `s3://ledgerium-backups/db` | required for off-host DB upload |
   | `UPLOADS_BACKUP_S3_URI` | var | `s3://ledgerium-backups/uploads` | required for off-host evidence upload |
   | `BACKUP_S3_ENDPOINT` | var | `https://<accountid>.r2.cloudflarestorage.com` | R2/B2 only; omit for real AWS S3 |
   | `AGE_RECIPIENT` | var | `age1xxxxxxxx...` | the public key; safe as a `var`, not a secret |
   | `AWS_ACCESS_KEY_ID` | secret | — | bucket credentials |
   | `AWS_SECRET_ACCESS_KEY` | secret | — | bucket credentials |
   | `BACKUP_RETAIN_LOCAL` | var (optional) | `3` | local scratch-copy retention; defaults to 3 |

   Until these are set, the `backup` service **still runs on schedule** — it does not crash-loop or fail silently — but `db-backup.sh`/`evidence-backup.sh` will log `WARNING: ... not configured — backup is LOCAL ONLY (not durable)` every cycle, and those local-only copies live in the ephemeral scratch dir, not durably. Treat that warning as "the P0 is still open" until it stops appearing.

   `sqlite3`, `aws`, `age`, and `tar` are installed **in the image** (see `Dockerfile`) — nothing to install on the host.

## Schedule (already active — nothing to cron on the host)

The `backup` service runs, on the schedule written by `backup-cron-entrypoint.sh`:

```cron
0 * * * *     sh /app/scripts/db-backup.sh        # hourly — also runs evidence-backup.sh first
0 3 1 * *     UPLOADS_BACKUP_FORCE_FULL=1 sh /app/scripts/evidence-backup.sh   # monthly re-baseline, 1st @ 03:00 UTC
```

This gives **RPO 1h for both artifacts**, matching the target at the top of this document, without any operator action beyond the one-time setup above. `db-backup.sh` runs `evidence-backup.sh` internally first — do not also invoke `evidence-backup.sh` on a separate schedule; it would break the ordering guarantee described in "How the two backups stay consistent" above. Apply lifecycle/retention on the bucket per the volume note above (keep `-full` archives; expire old `-incr` archives freely once superseded by a newer `-full`).

## Optional: pre-deploy backup gate in CI
This is now lower-priority than it was before the `backup` sidecar existed — continuous hourly coverage already exists independent of deploys. It is still worth doing as belt-and-braces: add a step in `.github/workflows/deploy.yml` **between `build-and-push` and `deploy`** that SSHes to the VPS and runs `docker exec ledgerium-backup sh /app/scripts/db-backup.sh`, so every release also has a known-good checkpoint tagged near the deploy SHA. Keep it `continue-on-error: false` once secrets are configured. Do NOT add it before the bucket + secrets exist — it would fail every deploy.

---

## Restore (RTO 30m)

Restore runs **inside the `backup` sidecar container** via `docker exec` — the scripts, `sqlite3`, `aws`, `age`, and `tar` all already live there (see "How it actually runs" above); you do not need any of these tools on your own machine or a separate host checkout, only SSH access to the VPS.

**Restore evidence first, then the DB, in that order** — mirrors the backup ordering and keeps the pairing safe. Use an evidence cutoff timestamp ≥ the DB snapshot's timestamp so every `source_bundle` row in the restored DB has a backing file:

```bash
# 1) Evidence — CONFIRM (or VERIFY first, non-destructively, see below)
docker exec -e AGE_IDENTITY=/path/ledgerium-backup.key ledgerium-backup \
  sh /app/scripts/evidence-restore.sh s3://ledgerium-backups/uploads CONFIRM 20260628T120000Z

# 2) Database
docker exec -e AGE_IDENTITY=/path/ledgerium-backup.key ledgerium-backup \
  sh /app/scripts/db-restore.sh s3://ledgerium-backups/db/ledgerium-20260628T120000Z.db.age CONFIRM

# then restart the app container (NOT the backup sidecar)
docker compose -f compose.hostinger.yaml restart web
```

`AGE_IDENTITY` is the private key file — it is intentionally **not** baked into the image or set as a standing env var on the `backup` service (only `AGE_RECIPIENT`, the public key, is); pass it per-invocation via `docker exec -e`, after copying the key file onto the VPS (or into the container, e.g. `docker cp ledgerium-backup.key ledgerium-backup:/tmp/`) for the duration of the restore. Do not leave the private key sitting in the image or in compose env — it never needs to be there for backups to work, only for a restore.

Both scripts make a safety copy of the live artifact before overwriting anything (`*.pre-restore-<ts>` for the DB file; `<UPLOAD_DIR>.pre-restore-<ts>` for the evidence directory), so a bad restore is reversible. Evidence restore **merges** into `UPLOAD_DIR` rather than wiping it first — bundles are content-addressed by `{userId}/{uploadId}.json` and immutable, so an existing file with the same name is byte-identical and safe to leave or overwrite; this also means a restore never deletes evidence that exists locally but wasn't yet in this particular backup set (e.g. because of a recent upload-failure retry window).

**`db-restore.sh` restores the database only.** It prints a loud reminder of this at the end of every restore. If you skip step 1 above, every restored `source_bundle` row may point at a missing file — this is the exact B-4 failure mode, not a hypothetical.

## Verify a backup is restorable, without restoring it

Both restore scripts accept `VERIFY` in place of `CONFIRM`: they download/decrypt/integrity-check (and, for evidence, extract to a throwaway staging directory) but **never touch the live `DATABASE_FILE` or `UPLOAD_DIR`**.

```bash
docker exec -e AGE_IDENTITY=/path/ledgerium-backup.key ledgerium-backup \
  sh /app/scripts/db-restore.sh s3://ledgerium-backups/db/ledgerium-20260628T120000Z.db.age VERIFY

docker exec -e AGE_IDENTITY=/path/ledgerium-backup.key ledgerium-backup \
  sh /app/scripts/evidence-restore.sh s3://ledgerium-backups/uploads VERIFY 20260628T120000Z
```

The DB check runs `PRAGMA integrity_check`. The evidence check runs `tar -tf` (list-only) on every archive in the chain and cross-checks the listed entry count against the file count that was originally archived — the tar analogue of `PRAGMA integrity_check`; a truncated or corrupted archive fails to list cleanly.

## Verifying it's actually running

Do this once right after the `backup` service first deploys, and periodically afterward — an unverified schedule is the same failure mode as an unverified backup.

1. **Sidecar is up and healthy:**
   ```bash
   docker compose -f compose.hostinger.yaml ps backup
   ```
   Should show `Up`. (Its `HEALTHCHECK` is intentionally disabled in compose — see the comment there — so it will never show `(healthy)`/`(unhealthy)`, only `Up`/`Exited`.)

2. **Crond actually dispatched a job.** Tail the sidecar's logs; `docker logs` captures both crond's own dispatch lines and the backup scripts' own `[db-backup]`/`[evidence-backup]` output (see `backup-cron-entrypoint.sh`'s header for why):
   ```bash
   docker compose -f compose.hostinger.yaml logs -f backup
   ```
   Within the first hour after deploy you should see a `crond` dispatch line followed by `[evidence-backup] ...` then `[db-backup] ... integrity_check ok ... uploaded to ...` (or `... backup is LOCAL ONLY (not durable)` if the S3 vars aren't set yet — see "One-time setup"). If you don't want to wait for the top of the hour, trigger a cycle immediately:
   ```bash
   docker exec ledgerium-backup sh -c '. /app/scripts/backup.env && sh /app/scripts/db-backup.sh'
   ```

3. **Objects are actually landing in the bucket.** From the sidecar itself (it already has the `aws` CLI + credentials — no need to install anything locally):
   ```bash
   docker exec ledgerium-backup sh -c '. /app/scripts/backup.env && aws s3 ${BACKUP_S3_ENDPOINT:+--endpoint-url $BACKUP_S3_ENDPOINT} ls "$BACKUP_S3_URI/"'
   docker exec ledgerium-backup sh -c '. /app/scripts/backup.env && aws s3 ${BACKUP_S3_ENDPOINT:+--endpoint-url $BACKUP_S3_ENDPOINT} ls "$UPLOADS_BACKUP_S3_URI/"'
   ```
   You should see recent `ledgerium-<ts>.db[.age]` and `ledgerium-uploads-<ts>-{full,incr}.tar[.age]` objects with timestamps matching the schedule.

4. **A restore actually works.** Run the two `VERIFY` commands in the previous section against the most recent objects from step 3. This is the non-destructive version of the quarterly test below — run it now, don't wait for the calendar.

## Test the restore quarterly (non-negotiable — an untested backup is not a backup)
Run both `VERIFY` commands above against the latest off-host backups. Then, on a throwaway host/path (or throwaway `DATABASE_FILE`/`UPLOAD_DIR` overrides passed to `docker exec ... -e`), run both `CONFIRM` restores and confirm: `PRAGMA integrity_check` passes, row counts on `users`/`workflows`/`teams` look right, and every `source_bundle.contentPath` for a sampled set of workflows resolves to a file that exists under the restored `UPLOAD_DIR`. Record the date. This is still a manual step — it is not (yet) automated in CI.

---

## Related follow-ups (DB-health-review-001 / SOP_BUILDER_REVIEW-001)
- Switch boot `prisma db push` → `prisma migrate deploy` (separate iteration; needs a baseline-migration reconciliation + a `prisma migrate diff --exit-code` CI gate first).
- Enable `PRAGMA journal_mode=WAL` — note WAL adds `-wal`/`-shm` sidecar files; the `.backup` API used here already handles WAL correctly, but a raw `cp` does not.
- Migrate to Postgres (the strategic fix; Postgres already runs in-stack as `umami-db`).
- Consider a separate `AGE_RECIPIENT`/`AGE_IDENTITY` key pair for evidence vs. DB if narrower key custody becomes a requirement — not implemented; both currently share one key.
- ~~`evidence-backup.sh`/`evidence-restore.sh` are new scripts that are not yet wired into the Docker image~~ — **resolved**: all four scripts + `sqlite3`/`aws`/`age`/`tar` are now baked into the production image and run via the `backup` compose service on an hourly (+ monthly re-baseline) schedule. See "How it actually runs" above.
- **`backup` runs as root**, not the image's default non-root `nextjs` user (see the rationale comment in `compose.hostinger.yaml`). This was a deliberate trade-off for an unambiguous crond/restore-write-access story on a container that is not network-exposed. Revisit if a non-root busybox-crond pattern is validated end-to-end (this was not verified in a running container as part of this change — see the PR/iteration notes).
- **Image size**: installing `aws-cli` on Alpine pulls in Python 3 + botocore, which is the dominant cost of this change (see the PR/iteration notes for the estimate) and applies to `web` too, since both services share one image. If this becomes a real deploy-time or storage cost, consider a lighter S3 client (e.g. a static-binary tool) as a follow-up — not done here to avoid rewriting the already-existing backup/restore scripts' `aws s3 cp` calls as part of a deployment-wiring change.
- No automated alerting exists yet if the `backup` service stops running or a cycle fails — verification today is manual (see "Verifying it's actually running"). A follow-up could ship a healthcheck-adjacent signal (e.g. a "last successful backup" timestamp file checked by an external monitor) instead of relying on an operator remembering to look at logs.
