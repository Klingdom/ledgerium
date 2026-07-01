# Database Health & Scaling Review 001

**Type:** Mode 3-adjacent multi-agent strategic review (NON-counting; read-only, zero code changed)
**Date:** 2026-06-28
**Directive (CEO):** "Engage subagents to review the primary database systems and functions and assess health and capability for a scaling SaaS product."
**Agents (5, parallel):** system-architect · backend-engineer · devops-engineer · qa-engineer · general-purpose (data-security scope).

---

## 1. Executive verdict — AMBER

The primary database is a **single SQLite file (`/app/data/ledgerium.db`) on one Hostinger VPS**, with the schema applied via **`prisma db push` on every container boot**. That is a reasonable MVP choice, and the relational model is genuinely well-built. But it carries **P0 reliability risks that should be fixed before scaling**, and a **hard architectural ceiling** that a Postgres migration must eventually break.

Encouraging: the schema is sound, **app-layer tenant isolation is correct (no IDOR found across ~20 routes)**, credentials are properly hashed, and **Postgres already runs in-stack** (Umami's `umami-db`), so the path forward is clear and low-risk.

**Health: healthy data model · risky operational posture · capped capability.**

---

## 2. Verified grounding
- Prisma ORM. Datasource `provider = "sqlite"`, `DATABASE_URL=file:/app/data/ledgerium.db` on Docker named volume `ledgerium-data`, single VPS. (Docs claim PostgreSQL — **stale**.)
- `apps/web-app/prisma/schema.prisma`: 30 models, 801 lines, **63 `@@index`**, 19 unique constraints, **16 `Json` fields stored as TEXT** (intelligenceJson, metricsJson, variants, process graph, AnalyticsEvent.properties…).
- `apps/web-app/prisma/migrations/`: 7 migrations, **bypassed in prod** — boot runs `npx prisma db push --skip-generate` (`scripts/docker-start.sh`).
- A **2026-05 data-loss incident** is the documented reason boot-time backups exist.
- Umami runs its own Postgres container (`compose.hostinger.yaml`) → Postgres available in-stack.

---

## 3. What's healthy (preserve)
- Competent relational model; raw recordings already tiered to filesystem (`rawJsonPath`), not bloating the DB.
- **Tenant isolation correctly enforced in app code** — every owned-object route scopes by `userId`/team and 404s on miss; security agent found **no broken-object-level-authorization**.
- **Credentials never stored raw** — bcrypt (cost 12) passwords; SHA-256 API keys + reset/invite tokens; key shown once.
- Admin gate sound (404-not-403, single source of truth, hardened bootstrap).
- Prisma client correctly singleton-guarded; admin queries parallelized; team member list paginated; backup-before-push added post-incident.

---

## 4. Critical risks (consolidated, ranked)

| Risk | Sev | Detail |
|---|---|---|
| `db push` at boot (not `migrate deploy`) | **P0** | Infers/applies schema diffs non-deterministically; bypasses 7 migrations; no history/rollback. Root-cause class of the 2026-05 data loss. |
| SQLite FK enforcement OFF | **P0** | No `PRAGMA foreign_keys=ON` → all 12+ `onDelete: Cascade/SetNull` rules are decorative; orphans accumulate silently. |
| Backups co-located, best-effort, untested | **P0** | All 10 backups on the same volume; no off-site copy, no schedule, no tested restore; RPO/RTO undefined. |
| No encryption at rest | **P0** | SQLite file + raw recordings + plaintext backups hold emails, names, Stripe IDs, full recordings in clear (credentials hashed). Volume snapshot = full disclosure. |
| Unbounded dashboard query | **P0** | `/api/workflows` `findMany` with no `take`, `include: processDefinition` (4 large JSON-TEXT blobs/row) into Node heap before filtering. |
| No WAL / `busy_timeout`; analytics in primary DB | **P1** | Concurrent writes throw `SQLITE_BUSY`; AnalyticsEvent firehose competes for the single write lock. |
| Missing composite indexes; full-scan activation metric | **P1** | No `@@index([userId,status])` / `([teamId,status])`; admin activation does full-table scan into JS instead of `COUNT(DISTINCT)`. |
| No right-to-erasure path | **P1** | No `user.delete`; `AnalyticsEvent` has no FK to User; `Team.createdBy` has no `onDelete` (blocks deleting a creator). GDPR erasure neither implemented nor mechanically achievable. |
| No DB observability | **P1** | No signal for file size, write latency, lock contention, or disk pressure. |
| Zero tests hit a real DB | **P1** | All data-layer tests mock `@/db`; cascades, FK behavior, tenant isolation untested against the engine — despite the loss history. |

---

## 5. Capability ceiling (quantified)
- **Single-writer lock = hard wall.** Practical break point: a second concurrent writer / ~50–100 concurrently-active write users, or any background worker writing alongside web traffic.
- **Operational envelope breaks ~1–2 GB** (full-file `cp` backup per boot becomes slow + 10× disk), driven by JSON-as-TEXT blobs.
- **Single VPS/file/container** = no HA, no failover, no point-in-time recovery.
- **JSON-as-TEXT** → richest data (intelligence/metrics/variants) is not queryable or indexable at the DB layer.

---

## 6. Roadmap

### Quick wins — this week (high-leverage; can stay on SQLite)
1. **Off-site, encrypted, scheduled backups + tested restore** (SQLite online `.backup` → R2/S3 + pre-deploy step + hourly cron). RPO 1h / RTO 30m.
2. **`db push` → `migrate deploy`** — *with care*: reconcile a baseline migration against the live schema + add `prisma migrate diff --exit-code` CI gate first (prod schema may have drifted).
3. **`PRAGMA foreign_keys=ON` + `journal_mode=WAL` + `busy_timeout`** — *with* a one-time orphan check first (enabling FK after running without it can surface orphans / block deletes; WAL changes the backup to a 3-file/checkpoint operation).
4. **Cap the dashboard query** (`take` + narrow `select`), add composite indexes, swap activation scan for `COUNT(DISTINCT)`.
5. **DB observability** in `/api/health` (file size, write latency, disk %).
6. **Real-DB tests**: cascade integrity, tenant isolation, schema-drift gate.

### Strategic — within ~1 month (trigger: first `SQLITE_BUSY`, DB > 1GB, or first multi-seat paying team)
- **Migrate to Postgres** (managed, or self-hosted alongside `umami-db`). Prisma: provider swap + one-time ETL; convert 16 TEXT-JSON columns to `jsonb`; adopt `migrate deploy` properly. Highest-value move; overdue.
- Add **right-to-erasure** (FK on AnalyticsEvent, fix `Team.createdBy` onDelete, `DELETE /api/account`).
- **Encryption at rest** (LUKS/dm-crypt on the volume or SQLCipher; lock file perms).

### Scale — when one Postgres is outgrown
Isolate analytics off the primary → PgBouncer/Accelerate pooling → read replica for dashboards → time-partition events/analytics tables.

---

## 7. Per-agent source notes
- **system-architect** — tenant isolation is `userId`-only at the schema level; team data is a billing+sharing overlay (polymorphic, FK-less); SQLite ceiling quantified; Postgres migration sequenced.
- **backend-engineer** — concrete fixes: `migrate deploy`, `PRAGMA foreign_keys=ON`, WAL+busy_timeout, `take`+`select` on `/api/workflows`, composite indexes, `COUNT(DISTINCT)` activation, remove `(db as any).$transaction` casts.
- **devops-engineer** — backups co-located/untested = P0; `db push` blast radius; RPO 1h/RTO 30m; minimum-viable backup + migration pipeline spec.
- **qa-engineer** — zero real-DB tests; schema-drift gate + cascade-integrity + tenant-isolation + JSON-corruption test plan (named, blocking vs warning).
- **security (general-purpose)** — no IDOR, credentials hashed, admin gate sound; P0 = no encryption at rest; P1 = no erasure path + unbounded AnalyticsEvent PII; P2 = `analytics/events` GET uses `isAdmin` vs canonical `canAccessAdmin`.

**Mode 3-adjacent: NON-counting. Read-only review; zero source files modified. One artifact created.**
