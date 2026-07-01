# Database Health & Performance Re-Validation 002

**Type:** Mode 3-adjacent multi-agent review (NON-counting; read-only, zero code changed)
**Date:** 2026-07-01
**Directive (CEO):** "Have subagents validate current site and database for health and performance."
**Scope:** Re-validation of `DATABASE_HEALTH_REVIEW_001.md` (2026-06-28, verdict AMBER) against the uncommitted work-in-progress on branch `feat/seo-aeo-page-engine`.
**Agents (3, parallel):** system-architect (data model + scaling) · backend-engineer (query performance) · devops-engineer (operational posture).
**Companion artifact:** `SITE_PERFORMANCE_REVIEW_001.md` (site track).

---

## 1. Executive verdict — AMBER (unchanged)

The uncommitted WIP is **net-positive but not P0-closing**. It closes one P1 (DB observability), half-closes another (two composite indexes), and partially addresses one P0 (backup scripts exist but are not operationally wired). **Four of the five baseline P0 reliability risks remain open**, and one of them is *worsened*: the newly added migration file is **inert in production** because prod applies schema via `prisma db push` at boot, which never reads the `migrations/` directory.

The data model itself remains genuinely well-built, tenant isolation is correct, and Postgres is already in-stack — the path forward is unchanged and low-risk. The risk profile is marginally better than the 001 baseline but no reliability P0 has been fully resolved.

**Health: healthy data model · marginally-improved but still-risky operational posture · unchanged capability ceiling.**

---

## 2. Verified grounding (branch `feat/seo-aeo-page-engine`)
- Prisma ORM. Datasource `provider = "sqlite"`, `DATABASE_URL=file:/app/data/ledgerium.db` on Docker named volume `ledgerium-data`, single VPS.
- `apps/web-app/prisma/schema.prisma`: 30 models; **two new composite indexes** added — `Workflow @@index([userId, status])` (line 134) and `TeamMember @@index([teamId, status])` (line 514).
- New migration `apps/web-app/prisma/migrations/20260628000000_add_workflow_team_composite_indexes/migration.sql` — additive `CREATE INDEX IF NOT EXISTS`, non-destructive.
- New `apps/web-app/src/app/api/health/route.ts` — DB observability (read-latency, size, disk pressure), non-fatal.
- New `scripts/db-backup.sh`, `scripts/db-restore.sh`, `docs/runbooks/DATABASE_BACKUP_RESTORE.md`.
- Prod boot: `scripts/docker-start.sh:58` runs `npx prisma db push --skip-generate` (migrations bypassed).
- `apps/web-app/src/db/index.ts:5` is a bare `new PrismaClient()` — no connection PRAGMA. Grep confirms zero `PRAGMA foreign_keys` / `journal_mode` / `busy_timeout` in any `.ts/.js`.
- Postgres already runs in-stack (`compose.hostinger.yaml:83-96`, Umami's `umami-db`).

---

## 3. Per-baseline-P0 status (001 → 002)

| # | Baseline P0 (from 001) | Status after WIP | Evidence |
|---|---|---|---|
| 1 | `db push` at boot (not `migrate deploy`) | **OPEN — worsened** | `docker-start.sh:58` unchanged; new migration file never executes under `db push`; 8th bypassed migration |
| 2 | SQLite FK enforcement OFF | **OPEN** | `db/index.ts:5` bare client; no PRAGMA anywhere; 20+ cascade rules decorative |
| 3 | Unbounded dashboard query | **OPEN** | `api/workflows/route.ts:385-393` no `take`, `include: processDefinition: true` |
| 4 | No encryption at rest | **OPEN** | live DB + raw recordings + plaintext backups cleartext; `AGE_RECIPIENT` unset in all deploy configs |
| 5 | Backups co-located / untested | **PARTIALLY ADDRESSED** | good scripts exist; not scheduled, env unwired, binaries likely absent, restore untested |

Baseline P1 movement: DB observability **CLOSED**; composite indexes **half-closed** (indexes yes; activation-metric `COUNT(DISTINCT)` no); WAL/`busy_timeout`, right-to-erasure, real-DB tests all **OPEN**.

---

## 4. Findings (consolidated, ranked)

### P0 — still open

**P0-1 · `db push` at boot; new migration is inert.** `scripts/docker-start.sh:58` runs `prisma db push --skip-generate`, which infers schema state from `schema.prisma` and ignores `migrations/`. The new migration therefore never executes in prod; the indexes reach prod only because they are also in `schema.prisma`. Non-deterministic apply + no rollback remains the root-cause class of the 2026-05 data-loss incident, now with *more* divergent migration history. *(architect, devops)*

**P0-2 · SQLite FK enforcement OFF.** `apps/web-app/src/db/index.ts:5` — no `$on('connect')` / PRAGMA hook. All `onDelete: Cascade/SetNull` rules (`schema.prisma:65-66, 121, 509-510`) are decorative; orphans accumulate silently. *(architect, devops)*

**P0-3 · Unbounded `/api/workflows` `findMany` + blob inclusion.** `apps/web-app/src/app/api/workflows/route.ts:385-393` — no `take`; `include: processDefinition: true` pulls all columns including large JSON-TEXT blobs (`intelligenceJson`, `explanationJson`, `metricsJson`/`extended_metrics_json`, `systems`). **Only `intelligenceJson` is consumed** (`toMetricsInput()`, line 469); the rest are fetched, deserialized, and discarded. ≈22 MB DB→Node transfer at 500 workflows, on **every** dashboard load. The new `(userId,status)` index speeds the WHERE filter but does nothing for the heap blowup. *(architect, backend)*

**P0-4 · Admin activation metric = cross-tenant full-table scan.** `apps/web-app/src/lib/admin-operations/queries.ts:180-188` — `findMany({ where: { status: { not: 'deleted' } }, select: { userId: true } })` into a JS `Set`. **Backend escalated this from baseline P1 → P0** because it is a cross-tenant full-table read (not user-scoped), unbounded, ~2.5 MB heap at 50k workflows / ~25 MB at 500k, per admin dashboard load. Should be DB `groupBy(['userId'])` / `COUNT(DISTINCT)`. *(backend)*

**P0-5 · No encryption at rest.** Live SQLite file, raw recordings, and plaintext `cp` backups are cleartext on the `ledgerium-data` volume (`compose.hostinger.yaml:20-21`). `age` support exists in `db-backup.sh:44-47` but `AGE_RECIPIENT` is unset in every deploy config. Volume snapshot = full PII disclosure (credentials remain hashed). *(architect, devops)*

### P0 — partially addressed

**P0-6 · Backups: capability added, not operationalized.** `scripts/db-backup.sh` correctly uses `sqlite3 .backup` (WAL-safe online copy) + `PRAGMA integrity_check` (`:35-38`) + optional `age` encryption + optional S3 upload; `scripts/db-restore.sh` verifies integrity before overwrite (`:45-48`) with a pre-restore safety copy (`:51-55`). **But it is not wired in:** `BACKUP_S3_URI` / `AGE_RECIPIENT` / AWS creds appear in **zero** deploy configs (`deploy.yml`, `compose.hostinger.yaml`, `compose.yaml`); the cron line is a comment (no crontab, no Compose healthcheck, no scheduled trigger, no sidecar); `sqlite3`/`aws`/`age` binaries are almost certainly absent from the Node prod image (`db-backup.sh:29` `FATAL: sqlite3 not installed`); missing S3 URI logs a warning but exits 0 (`db-backup.sh:57`) so monitoring reports "success" while backups stay local-only in an ephemeral container. Live mechanism remains the co-located boot-time `cp` (`docker-start.sh:38-49`). **Effective RPO/RTO: undefined.** *(devops, architect)*

### P1

- **P1-1 · No WAL / `busy_timeout`; analytics in primary DB.** No PRAGMA; `AnalyticsEvent` (`schema.prisma:427-440`) competes for the single write lock. Concurrent writes can throw `SQLITE_BUSY`. *(architect, devops)*
- **P1-2 · Composite indexes half-done.** Both indexes are correct and correctly targeted (verified against real WHERE clauses — see §5), but the activation-metric full-scan (P0-4) is the other half of this baseline P1 and is untouched. *(architect, backend)*
- **P1-3 · `/api/health` unauthenticated.** Returns `sizeBytes`, `diskFreeMb`, `diskUsedPct` with no auth check — public disclosure of DB size + disk pressure. IP-restrict at proxy or strip the `db` block for external callers. `sizeWarning`/`diskWarning` are body fields only — no alerting hook / status-code change. *(devops)*
- **P1-4 · No right-to-erasure.** No `user.delete`; `AnalyticsEvent.userId` has no FK (`schema.prisma:429,436`); `Team.createdBy` has no `onDelete` (`:471`) — blocks deleting a creator once FKs are enforced. *(architect)*
- **P1-5 · Zero real-DB tests.** Data-layer tests mock `@/db`; cascades/FK behavior/tenant isolation untested against the engine despite the loss history. *(architect)*
- **P1-6 · Other unbounded reads.** `/api/analytics` GET (`route.ts:113-128`, no `take`, blobs not `select`-excluded); `/api/teams` nested `members` include (`route.ts:28-40`, no `take`); third `processInsight` `findMany` on dashboard GET (no `take`); 15+ stats computed in JS over the full unbounded fetch (`workflows/route.ts:589-684`). *(backend)*

### P2

- Redundant index: `Workflow @@index([userId])` (`:132`) is a prefix of `([userId,status])` (`:134`) — removable at Postgres migration. *(architect)*
- Hand-authored `CREATE INDEX IF NOT EXISTS` won't register in `_prisma_migrations` if `migrate deploy` is later adopted without a baseline step. *(architect)*
- `db-backup.sh:57` exits 0 on upload failure — monitoring blind spot. *(devops)*
- `getRecordingVolume` counts uploads twice (`queries.ts:217-251`); extra serial `user.findUnique` before parallel fan-out (`workflows/route.ts:305-308`, `analytics/route.ts:29`). *(backend)*
- `db-restore.sh:53` safety copy uses raw `cp` — becomes WAL-inconsistent if WAL is enabled. *(devops)*

---

## 5. New composite indexes — targeting verdict (VERIFIED)

- **`Workflow @@index([userId, status])` — CORRECT.** `workflows/route.ts:332-335` builds `where: { userId, status }` — leading-column exact match on both; also serves `userId`-only when status absent. *(backend)*
- **`TeamMember @@index([teamId, status])` — CORRECT.** `teams/[id]/members/route.ts:57` filters `where: { teamId, status: 'active' }` — perfect composite hit; parallel `count()` benefits identically. Auth check `findFirst({ teamId, userId, status })` is served by existing `@@unique([teamId,userId])`, so no index waste. *(backend)*

Both are correct — but per P0-3, they only pay off once the row set and payload are bounded.

---

## 6. Capability ceiling (unchanged by WIP)
- **Single-writer lock = hard wall** (~50–100 concurrent write users / first background worker → `SQLITE_BUSY`; still no `busy_timeout`).
- **Operational envelope ~1–2 GB** (now *observable* via the health route but not mitigated).
- **16 JSON-as-TEXT columns** remain unqueryable/unindexable at the DB layer.
- **Single VPS/file/container** — no HA, no failover, no PITR.
- Postgres already in-stack → migration path remains low-risk and overdue.

---

## 7. Top recommended next actions (DB track)

1. **Bound `/api/workflows` (P0-3) — highest ROI, lowest risk.** Add `take` (paginate) + a narrow `select` (drop unused blobs; keep `intelligenceJson`); stop `include: processDefinition: true` on the list path (fetch blobs on detail only). ≈22 MB → ≈3 MB; makes the new index pay off.
2. **Operationalize backups + enable pragmas together (P0-6 + P0-2 + P1-1).** Schedule `db-backup.sh` via host cron (not the ephemeral container) with `BACKUP_S3_URI`+`AGE_RECIPIENT` set and `sqlite3`/`age`/`aws` present; prove one restore. In the same pass add `PRAGMA foreign_keys=ON; journal_mode=WAL; busy_timeout=5000` in `db/index.ts` — **run a one-time orphan scan first**; update `db-restore.sh:53` to `sqlite3 .backup` once WAL is on.
3. **Fix the activation metric (P0-4).** Replace the full `findMany`+`Set` with `db.workflow.groupBy({ by: ['userId'], where: { status: { not: 'deleted' } } })`.
4. **Resolve the apply-mechanism P0 (P0-1).** Either commit to `db push` and stop adding migration files, or (durable) `prisma migrate diff` drift check → baseline migration → CI drift gate → switch `docker-start.sh:58` to `prisma migrate deploy`.
5. **Encryption at rest (P0-5)** — volume/file-level encryption for the remaining PII exposure.

---

## 8. Evidence files
`apps/web-app/prisma/schema.prisma` · `scripts/docker-start.sh` · `apps/web-app/src/db/index.ts` · `apps/web-app/src/app/api/workflows/route.ts` · `apps/web-app/src/lib/admin-operations/queries.ts` · `apps/web-app/src/app/api/analytics/route.ts` · `apps/web-app/src/app/api/teams/route.ts` · `apps/web-app/src/app/api/teams/[id]/members/route.ts` · `apps/web-app/src/app/api/health/route.ts` · `scripts/db-backup.sh` · `scripts/db-restore.sh` · `apps/web-app/prisma/migrations/20260628000000_add_workflow_team_composite_indexes/migration.sql` · `compose.hostinger.yaml`
