# Admin Operations Dashboard — Architecture

**Status:** Define-phase draft
**Owner:** system-architect
**Date:** 2026-05-16
**Driving directive:** CEO 2026-05-16 — *"We need to create a dashboard to understand user volume, recording volume, memory usage. All the traditional stuff a saas would need and use."*

Internal, read-only admin dashboard surfacing user / recording / system-health signals from the existing Prisma data model. Server-side aggregation; admin allowlist gate; tolerant to empty DB; cross-database (Postgres prod / SQLite dev) compatible with graceful degradation.

---

## §1 System diagram

```
                         ┌──────────────────────────────┐
                         │  Browser (admin user only)   │
                         │                              │
                         │  /admin/operations           │
                         │  React + TanStack Query +    │
                         │  Recharts                    │
                         └──────────────┬───────────────┘
                                        │ HTTP (cookies)
                                        ▼
            ┌───────────────────────────────────────────────────┐
            │  Next.js App Router (apps/web-app)                │
            │  ────────────────────────────────────────────     │
            │  middleware: auth() session + admin gate          │
            │                                                   │
            │  /api/admin/operations/summary                    │
            │  /api/admin/operations/users          (timeseries)│
            │  /api/admin/operations/recordings     (timeseries)│
            │  /api/admin/operations/top-users      (leaderboard)│
            │  /api/admin/operations/system-health  (mem + DB)  │
            └─────────────┬──────────────────────┬──────────────┘
                          │                      │
                          ▼                      ▼
         ┌────────────────────────┐   ┌──────────────────────────┐
         │  Prisma → Postgres /   │   │  Node process            │
         │  SQLite                │   │  process.memoryUsage()   │
         │  ─────────────────     │   │  pg_total_relation_size  │
         │  users, workflows,     │   │  (Postgres only)         │
         │  uploads, analytics_   │   │  Redis INFO (if avail)   │
         │  events, ...           │   └──────────────────────────┘
         └────────────────────────┘
```

Dashboard is **fully internal** — no public surface, no PostHog dependency, no external traffic.

---

## §2 Service boundaries

**Server-side (Next.js route handlers):**
- All Prisma aggregation queries (count / groupBy / `$queryRaw`)
- `process.memoryUsage()` and any Node-runtime introspection
- Admin authorization gate (cannot live in the client)
- Postgres-only raw SQL (`pg_total_relation_size`) with SQLite fallback

**Client-side (React):**
- Rendering, chart drawing (Recharts)
- TanStack Query orchestration + stale-while-revalidate
- Time-range selectors, drill-down toggles
- No business calculations — client renders whatever the API returns

**Authentication gate (mandatory):**
- `auth()` provides session → require `session.user.email` → `isAdminUnlimited(email)` from `@/lib/admin-allowlist`
- Gate enforced **at every API route** independently (defense in depth) and at the page-level server component
- `User.isAdmin` boolean exists but the allowlist is the canonical authority for ops-dashboard access — it cannot be elevated via Stripe / DB tamper

---

## §3 Data sources + Prisma query designs

All queries target ≤200ms in production, ≤500ms locally. Every metric traces back to one or more enumerated queries below.

### Top-level counters (one query each)

| Metric | Query | Index |
|---|---|---|
| Total users | `db.user.count()` | PK |
| New users 7d / 30d | `db.user.count({ where: { createdAt: { gte: cutoff } } })` | add `@@index([createdAt])` on User (currently absent) |
| Plan distribution | `db.user.groupBy({ by: ['plan'], _count: { _all: true } })` | full scan ok at current scale; add `@@index([plan])` if users > 50k |
| Subscription-status distribution | `db.user.groupBy({ by: ['subscriptionStatus'], _count: { _all: true } })` | full scan ok |
| Total recordings (uploads) | `db.upload.count()` | PK |
| Recordings 7d / 30d | `db.upload.count({ where: { uploadedAt: { gte: cutoff } } })` | add `@@index([uploadedAt])` on Upload |
| Total workflows | `db.workflow.count({ where: { status: { not: 'deleted' } } })` | existing `@@index([status])` |
| Active workflows by recency | `db.workflow.count({ where: { lastViewedAt: { gte: cutoff } } })` | add `@@index([lastViewedAt])` |
| Total teams | `db.team.count()` | PK |

### Active-user proxy

Schema has no `lastSeenAt` field on User. **Recommendation:** derive "active user" from `AnalyticsEvent.createdAt` aggregation (`groupBy userId where createdAt >= cutoff`) — this is the only event-stream signal we have today.

```ts
const dau = await db.analyticsEvent.findMany({
  where: { createdAt: { gte: cutoff }, userId: { not: null } },
  select: { userId: true },
  distinct: ['userId'],
});
// dau.length = distinct active users in window
```

For MAU at scale, switch to `$queryRaw` with `SELECT COUNT(DISTINCT user_id)` once row counts exceed ~100k. Document the proxy nature in UI tooltip.

### Time-series (binned by day)

For user-volume and recording-volume charts, return one row per day in the requested range. Cross-DB safe approach: pull raw timestamps, bin in Node.

```ts
const rows = await db.user.findMany({
  where: { createdAt: { gte: cutoff } },
  select: { createdAt: true },
});
// then groupBy day in TS — avoids Postgres-only date_trunc
```

For ≤90d windows this is bounded by daily signup counts; full scan acceptable. At >10k rows/day, migrate to `$queryRaw` `date_trunc('day', ...)`.

### Leaderboard (top users by recording count)

```ts
db.upload.groupBy({
  by: ['userId'],
  _count: { _all: true },
  orderBy: { _count: { userId: 'desc' } },
  take: 10,
});
// then hydrate with db.user.findMany({ where: { id: { in: ids } } })
```

Two queries (groupBy + hydrate) — single round-trip is not worth the complexity for top-10.

### System sizes (Postgres-only)

```ts
const rows = await db.$queryRaw<Array<{ table_name: string; size_bytes: bigint }>>`
  SELECT relname AS table_name,
         pg_total_relation_size(relid) AS size_bytes
  FROM pg_catalog.pg_statio_user_tables
  ORDER BY size_bytes DESC
  LIMIT 20
`;
```

**SQLite fallback:** detect `process.env.DATABASE_URL?.startsWith('file:')` or wrap in `try/catch`; return `{ available: false, reason: 'sqlite-dev-mode' }`. UI degrades the card to a placeholder.

---

## §4 API surface design

All routes: `Response: { data: T, error: null, meta: { generatedAt: string } }` (matches existing API envelope). Errors: `{ data: null, error: { code, message }, meta }`. All require admin gate.

```ts
// GET /api/admin/operations/summary
interface SummaryResponse {
  users: { total: number; new7d: number; new30d: number; activeProxy30d: number };
  recordings: { total: number; new7d: number; new30d: number };
  workflows: { total: number; activeViewed30d: number };
  teams: { total: number };
  plans: Array<{ plan: string; count: number }>;
  subscriptionStatuses: Array<{ status: string; count: number }>;
}

// GET /api/admin/operations/users?range=7d|30d|90d
interface UserVolumeResponse {
  range: '7d' | '30d' | '90d';
  series: Array<{ date: string /* YYYY-MM-DD */; signups: number; cumulativeTotal: number }>;
}

// GET /api/admin/operations/recordings?range=7d|30d|90d
interface RecordingVolumeResponse {
  range: '7d' | '30d' | '90d';
  series: Array<{ date: string; uploads: number; uniqueUsers: number }>;
}

// GET /api/admin/operations/top-users?metric=recordings|workflows&limit=10
interface TopUsersResponse {
  metric: 'recordings' | 'workflows';
  rows: Array<{
    userId: string;
    email: string;
    plan: string;
    count: number;
    lastActivityAt: string | null;
  }>;
}

// GET /api/admin/operations/system-health
interface SystemHealthResponse {
  memory: {
    rssBytes: number;
    heapTotalBytes: number;
    heapUsedBytes: number;
    externalBytes: number;
    arrayBuffersBytes: number;
    capturedAt: string;
  };
  database: {
    provider: 'postgres' | 'sqlite';
    tables: Array<{ name: string; sizeBytes: number }> | { available: false; reason: string };
  };
  redis: { available: boolean; usedMemoryBytes?: number; reason?: string };
  errors24h: { count: number; bySource: Record<string, number> } | { available: false };
}
```

Range validation server-side with Zod. Unknown ranges → 400.

---

## §5 Auth / authorization pattern

**Recommendation: 404 on non-admin (hide existence).** Two layers:

1. **Route handlers (every one):**
   ```ts
   const session = await auth();
   const email = session?.user?.email;
   if (!email || !isAdminUnlimited(email)) {
     return NextResponse.json({ data: null, error: { code: 'NOT_FOUND' }, meta: {...} }, { status: 404 });
   }
   ```
2. **Page server component** (`app/(app)/admin/operations/page.tsx`): same check → `notFound()` from `next/navigation`.

Rationale: 404 vs 403 — internal-only dashboard should not advertise existence to attackers who guess routes. Existing `/api/admin/alerts` returns 403; we deliberately diverge for the ops dashboard because allowlist membership (vs `isAdmin` flag) is a stricter gate and the surface is broader. **Existing 403 routes preserved verbatim**; only new ops routes use 404.

Security-relevant event logging: every successful admin API request emits `track({ event: 'admin_ops_query', userId, route, durationMs })` server-side via `trackServer`.

---

## §6 Caching strategy

- **Server-side:** none. Admin user count is small (today: 1; foreseeable: <10), query cost is bounded, and stale data on an ops dashboard is worse than a 200ms refetch.
- **Client-side (TanStack Query):** `staleTime: 30_000`, `refetchInterval: 60_000`, `refetchOnWindowFocus: true`. Summary card refreshes every minute; charts on demand.
- **Memory snapshot:** captured at request time (`process.memoryUsage()` is essentially free); no caching needed.
- **DB size raw query:** cache server-side for 60s via a small `Map<string, { value, expiresAt }>` to avoid re-running `pg_total_relation_size` on every poll. This is the only server-cached query.

---

## §7 Chart / UI library decision

**Recommendation: Recharts.**

| Library | Pro | Con | Verdict |
|---|---|---|---|
| Recharts | Composable, small bundle, dark-mode-friendly via Tailwind, idiomatic React | Limited customization for advanced viz | **Choose** |
| Chart.js | Mature, broad chart types | Heavier, imperative API, requires React wrapper | Reject |
| nivo | Beautiful defaults | Heavy bundle, SVG perf at scale | Reject |
| uPlot | Fastest time-series renderer | Imperative, custom integration cost | Reject — overkill for admin |

Recharts handles all four chart shapes we need: line (signups over time), bar (plan distribution), area (memory trend if extended), horizontal bar (leaderboard).

---

## §8 Determinism + traceability

Every panel renders from exactly one API endpoint's response. Every API endpoint's response is computed from one or more enumerated Prisma queries in §3. Every metric carries a `generatedAt` timestamp in `meta`. Same DB state + same wall-clock window → same response payload. No client-side math beyond aggregation already done server-side.

Traceability contract written verbatim into each route's JSDoc header (e.g. `/** Sources: db.user.count + db.user.count(where: createdAt >= cutoff) */`).

---

## §9 Memory metrics deep-dive

**Node process metrics (always available):**
- `process.memoryUsage()` → `rss`, `heapTotal`, `heapUsed`, `external`, `arrayBuffers` (bytes)
- Sampled at request time per `/system-health` call

**Postgres table sizes (Postgres only):**
- `pg_total_relation_size(relid)` over `pg_statio_user_tables`, top 20 tables by size
- Returns `null` / `{ available: false, reason: 'sqlite-dev-mode' }` on SQLite
- 60s server-cache (§6)

**Redis (optional):**
- If `REDIS_URL` env present, connect lazily and run `INFO memory` → parse `used_memory`
- On absence or connection failure → `{ available: false, reason: 'redis-not-configured' }`
- Never block the response on Redis — wrap in `Promise.race` with a 200ms budget

**Disk / S3:**
- **Deferred.** Repo today uses local FS for `WorkflowArtifact.contentPath`; bucket-size queries require object-store SDK setup not present in current stack. Add in iter 074 if applicable.

**Error counts:**
- `db.analyticsEvent.count({ where: { eventName: 'error', createdAt: { gte: 24h-ago } } })` if such events are emitted; otherwise return `{ available: false }`.

---

## §10 Open questions

1. **Add `lastSeenAt` to User?** Today active-user is an `AnalyticsEvent` proxy. Adding `User.lastSeenAt` (updated on session.update callback) would give true MAU/DAU. **Recommendation:** yes — small additive migration in iter 071.
2. **Workflow-run-grain metrics?** `WorkflowRun` model is referenced in CLAUDE.md but not in current schema.prisma. Recordings == Uploads for this MVP; revisit if `WorkflowRun` lands later.
3. **Error-log preview panel?** Out of MVP scope unless `analyticsEvent` carries error rows today. **Defer to iter 074.**
4. **Per-team aggregations?** Not in CEO directive verbatim. **Defer.**
5. **Export-to-CSV?** Defer to iter 074 if asked.

---

## §11 Implementation sequencing

**Iter 071 — Backend (`backend-engineer` primary):**
- Add admin gate helper `requireAdminFromSession()` in `lib/admin-gate.ts`
- Implement 5 API routes per §4 with Zod-validated query params
- Add Prisma indexes per §3 (`createdAt` on User; `uploadedAt` on Upload; `lastViewedAt` on Workflow)
- Optionally add `User.lastSeenAt` migration if §10-Q1 approved
- Unit tests per route (≥12 substantive `it()` blocks total): admin gate / empty-DB / range validation / SQLite-fallback / response-envelope shape

**Iter 072 — Frontend (`frontend-engineer` primary):**
- `/admin/operations/page.tsx` server component with admin gate
- Components: `SummaryCards`, `UserVolumeChart`, `RecordingVolumeChart`, `TopUsersTable`, `SystemHealthPanel`, `PlanDistributionChart`
- TanStack Query setup per §6
- Recharts integration with existing Tailwind dark theme tokens
- Loading / empty / error states for every panel

**Iter 073 — Tests + polish (`qa-engineer` primary):**
- Playwright E2E: admin sees dashboard; non-admin sees 404; empty-DB renders without crash; range selector works; system-health degrades gracefully on SQLite
- Performance budget assertions (≤500ms local per route)
- axe-core a11y scan on the new page
- Edge cases: clock-skew between server and client; one-user-zero-recordings state

**Iter 074 — Observability extension (`devops-engineer` primary; optional):**
- Prometheus-style `/api/admin/metrics` exporter (text-format)
- Optional health endpoint `/api/health` (non-admin) returning uptime + DB ping + Redis ping
- Disk / S3 size if storage strategy is finalized by then

---

## Risks + mitigations

- **R-1 Schema drift:** Active-user proxy via AnalyticsEvent decays if event taxonomy changes. **Mitigation:** §10-Q1 lastSeenAt migration.
- **R-2 Postgres-vs-SQLite divergence:** `$queryRaw` paths must gracefully degrade. **Mitigation:** explicit provider check + `{ available: false }` shape contract in §4.
- **R-3 Admin allowlist single point of trust:** allowlist file is the gate. **Mitigation:** existing `isAdminUnlimited` is already CEO-controlled; document add-flow in route JSDoc.
- **R-4 Future scale:** queries at >100k users will slow. **Mitigation:** index audit at iter 071; `$queryRaw` migration path documented per §3.
