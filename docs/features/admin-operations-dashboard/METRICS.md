# Admin Operations Dashboard — KPI Definitions

**Audience:** CEO + ops/support team (admin-only, read-only).
**Scope:** internal operational visibility. No product strategy; no growth KPIs.
**Data sources:** Prisma ORM (SQLite dev / Postgres prod), `process.memoryUsage()`, `pg_total_relation_size` (Postgres only), `analytics_events` table.

---

## §1 KPI Taxonomy

### A. User Volume

Active user counts and subscription breakdowns. Primary signal for growth rate and plan mix.

- Total registered users (all-time)
- Plan breakdown: free / starter / team / growth / enterprise counts
- Subscription status breakdown: none / trialing / active / past_due / canceled counts
- New signups: today (UTC) / last 7d / last 30d
- MAU: distinct users with `updatedAt >= now - 30d` (proxy; no `lastSeenAt` column)
- WAU: distinct users with `updatedAt >= now - 7d`
- DAU: distinct users with `updatedAt >= now - 24h`
- Active paid users: users where `subscriptionStatus IN ('trialing','active') AND plan != 'free'`

### B. Recording (Upload) Volume

Recordings are the primary activation event. Growth here signals product adoption.

- Total uploads (all-time)
- Uploads today / last 7d / last 30d
- Average uploads per active user (30d window)
- Uploads by validation status: pending / valid / invalid counts (last 30d)
- File size distribution: p50 / p95 `fileSizeBytes` across all uploads (Postgres only; `NULL` if SQLite)
- Top 10 users by upload count (30d), displayed as truncated ID + count

### C. Workflow Volume

Workflows are the downstream output of uploads. Divergence between upload count and workflow count signals processing failures.

- Total workflows (status = active, all-time)
- Workflows created today / last 7d / last 30d
- Archived workflows (status = archived, all-time)
- Average workflows per user (all users with at least 1 workflow)
- Workflow processing health: `workflows.confidence IS NOT NULL` count vs total (signals enrichment coverage)
- Total process definitions (all-time)
- Total process families (all-time)
- Top 5 most-viewed workflows (by `viewCount`, all-time), displayed as truncated workflow ID + count

### D. System Health

Failure signals and storage growth. Actionable within hours of appearing.

- DB total size in bytes (Postgres: `pg_total_relation_size('public')`; SQLite: `N/A`)
- Per-table sizes top 10 (Postgres: `pg_total_relation_size` per table; SQLite: `N/A`)
- Error event count last 24h: `analytics_events WHERE eventName IN ('upload_failed','api_error','client_error') AND createdAt >= now - 24h`
- `payment_failed` events last 24h (from `analytics_events`)
- `upload_failed` events last 24h
- Failed uploads by validation status: count where `validationStatus = 'invalid'` and `uploadedAt >= now - 24h`
- Teams count (all-time)
- Pending team invites (not yet accepted, not expired)

### E. Memory and Runtime

Snapshot of the Node process state. Useful for diagnosing memory leaks in long-running workers.

- Node RSS (bytes): `process.memoryUsage().rss`
- Node heapTotal (bytes): `process.memoryUsage().heapTotal`
- Node heapUsed (bytes): `process.memoryUsage().heapUsed`
- Node external (bytes): `process.memoryUsage().external`
- Server uptime (seconds): `process.uptime()`
- Postgres connection count: `SELECT count(*) FROM pg_stat_activity` (Postgres only; `N/A` in SQLite)
- Redis memory used (bytes): `INFO memory` → `used_memory` (only if Redis is wired; otherwise `N/A`)
- Storage bucket total size: deferred — requires S3/MinIO client not yet wired

### F. Trends (Time-Series)

Daily bucketed data for 30d and 90d windows. Rendered as line charts.

- Daily new signups: 30d / 90d buckets (source: `users.createdAt`)
- Daily uploads: 30d / 90d buckets (source: `uploads.uploadedAt`)
- Daily new workflows: 30d / 90d buckets (source: `workflows.createdAt`)
- Rolling MAU window: for each day in last 90d, count distinct users with activity in that day's 30d lookback (source: `users.updatedAt`; approximation only — full MAU requires explicit activity log)
- Daily error events: 30d buckets (source: `analytics_events.createdAt` filtered by error event names)

---

## §2 Per-KPI Specification

| Name | Display Label | Source | Computation | Unit | Refresh | Empty | Deterministic |
|---|---|---|---|---|---|---|---|
| `totalUsers` | Total Users | `users` | `COUNT(*)` | count | 30s | 0 | yes |
| `usersByPlan` | Users by Plan | `users` | `GROUP BY plan COUNT(*)` | count map | 30s | {} | yes |
| `usersBySubStatus` | Subscription Status Breakdown | `users` | `GROUP BY subscription_status COUNT(*)` | count map | 30s | {} | yes |
| `newUsersToday` | New Signups Today | `users` | `COUNT WHERE created_at >= UTC midnight` | count | 30s | 0 | yes |
| `newUsers7d` | New Signups 7d | `users` | `COUNT WHERE created_at >= now - 7d` | count | 30s | 0 | yes |
| `newUsers30d` | New Signups 30d | `users` | `COUNT WHERE created_at >= now - 30d` | count | 30s | 0 | yes |
| `mau` | MAU (30d) | `users` | `COUNT DISTINCT id WHERE updated_at >= now - 30d` | count | 5min | 0 | yes |
| `wau` | WAU (7d) | `users` | `COUNT DISTINCT id WHERE updated_at >= now - 7d` | count | 5min | 0 | yes |
| `dau` | DAU (24h) | `users` | `COUNT DISTINCT id WHERE updated_at >= now - 24h` | count | 30s | 0 | yes |
| `activePaidUsers` | Active Paid Users | `users` | `COUNT WHERE subscription_status IN ('trialing','active') AND plan != 'free'` | count | 30s | 0 | yes |
| `totalUploads` | Total Uploads | `uploads` | `COUNT(*)` | count | 30s | 0 | yes |
| `uploadsToday` | Uploads Today | `uploads` | `COUNT WHERE uploaded_at >= UTC midnight` | count | 30s | 0 | yes |
| `uploads7d` | Uploads 7d | `uploads` | `COUNT WHERE uploaded_at >= now - 7d` | count | 30s | 0 | yes |
| `uploads30d` | Uploads 30d | `uploads` | `COUNT WHERE uploaded_at >= now - 30d` | count | 30s | 0 | yes |
| `avgUploadsPerUser30d` | Avg Uploads / User (30d) | `uploads` + `users` | `uploads30d / NULLIF(mau, 0)` | ratio | 5min | 0 | yes |
| `uploadValidationBreakdown` | Upload Status (30d) | `uploads` | `GROUP BY validation_status COUNT WHERE uploaded_at >= now - 30d` | count map | 5min | {} | yes |
| `fileSizeP50` | Upload Size p50 | `uploads` (Postgres) | `PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY file_size_bytes)` | bytes | 5min | null | yes |
| `fileSizeP95` | Upload Size p95 | `uploads` (Postgres) | `PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY file_size_bytes)` | bytes | 5min | null | yes |
| `top10Uploaders30d` | Top Uploaders (30d) | `uploads` | `GROUP BY user_id COUNT WHERE uploaded_at >= now - 30d ORDER BY count DESC LIMIT 10` | list | 5min | [] | yes |
| `totalWorkflows` | Total Workflows | `workflows` | `COUNT WHERE status = 'active'` | count | 30s | 0 | yes |
| `workflowsToday` | Workflows Created Today | `workflows` | `COUNT WHERE created_at >= UTC midnight AND status = 'active'` | count | 30s | 0 | yes |
| `workflows7d` | Workflows 7d | `workflows` | `COUNT WHERE created_at >= now - 7d AND status != 'deleted'` | count | 30s | 0 | yes |
| `workflows30d` | Workflows 30d | `workflows` | `COUNT WHERE created_at >= now - 30d AND status != 'deleted'` | count | 30s | 0 | yes |
| `archivedWorkflows` | Archived Workflows | `workflows` | `COUNT WHERE status = 'archived'` | count | 5min | 0 | yes |
| `enrichedWorkflowRate` | Enrichment Coverage | `workflows` | `COUNT WHERE confidence IS NOT NULL / COUNT(*) * 100` | percentage | 5min | 0 | yes |
| `totalProcessDefinitions` | Process Groups | `process_definitions` | `COUNT(*)` | count | 5min | 0 | yes |
| `totalProcessFamilies` | Process Families | `process_families` | `COUNT(*)` | count | 5min | 0 | yes |
| `top5WorkflowsByView` | Most-Viewed Workflows | `workflows` | `ORDER BY view_count DESC LIMIT 5` (truncated ID + count) | list | 5min | [] | yes |
| `dbTotalBytes` | DB Size | `pg_total_relation_size` | Sum across all public tables | bytes | 5min | null (SQLite) | yes |
| `tableSizesTop10` | Table Sizes | `pg_total_relation_size` per table | Top 10 by size | list of (table, bytes) | 5min | null (SQLite) | yes |
| `errorEvents24h` | Error Events (24h) | `analytics_events` | `COUNT WHERE event_name IN ('upload_failed','api_error','client_error') AND created_at >= now - 24h` | count | 30s | 0 | yes |
| `paymentFailed24h` | Payment Failures (24h) | `analytics_events` | `COUNT WHERE event_name = 'payment_failed' AND created_at >= now - 24h` | count | 30s | 0 | yes |
| `uploadFailed24h` | Upload Failures (24h) | `analytics_events` | `COUNT WHERE event_name = 'upload_failed' AND created_at >= now - 24h` | count | 30s | 0 | yes |
| `totalTeams` | Total Teams | `teams` | `COUNT(*)` | count | 5min | 0 | yes |
| `pendingInvites` | Pending Invites | `team_invites` | `COUNT WHERE accepted_at IS NULL AND expires_at > now` | count | 5min | 0 | yes |
| `memoryRss` | Node RSS | `process.memoryUsage()` | `.rss` | bytes | 10s | 0 | no (live) |
| `memoryHeapTotal` | Heap Total | `process.memoryUsage()` | `.heapTotal` | bytes | 10s | 0 | no (live) |
| `memoryHeapUsed` | Heap Used | `process.memoryUsage()` | `.heapUsed` | bytes | 10s | 0 | no (live) |
| `memoryExternal` | External Memory | `process.memoryUsage()` | `.external` | bytes | 10s | 0 | no (live) |
| `serverUptimeSeconds` | Server Uptime | `process.uptime()` | seconds since start | seconds | 10s | 0 | no (live) |
| `pgConnectionCount` | Postgres Connections | `pg_stat_activity` | `COUNT(*)` | count | 30s | null (SQLite) | yes |
| `signupsTrend30d` | Signups (30d trend) | `users` | Daily bucket COUNT by `created_at` truncated to day | list of (date, count) | 5min | [] | yes |
| `uploadsTrend30d` | Uploads (30d trend) | `uploads` | Daily bucket COUNT by `uploaded_at` truncated to day | list of (date, count) | 5min | [] | yes |
| `workflowsTrend30d` | Workflows (30d trend) | `workflows` | Daily bucket COUNT by `created_at` truncated to day | list of (date, count) | 5min | [] | yes |
| `errorsTrend30d` | Errors (30d trend) | `analytics_events` | Daily bucket COUNT filtered by error event names | list of (date, count) | 5min | [] | yes |

**Determinism contract:** all Prisma queries against the same DB state at the same wall-clock instant return the same value. Memory metrics (`memRss`, `memHeapUsed`, etc.) are live process snapshots and are explicitly non-deterministic — this is expected and documented.

**SQLite degradation:** `dbTotalBytes`, `tableSizesTop10`, `fileSizeP50`, `fileSizeP95`, and `pgConnectionCount` return `null` with a `"N/A (SQLite)"` display label when the DB provider is not Postgres. The API response includes `"provider": "sqlite"` so the frontend can render the appropriate fallback.

---

## §3 Top-Line Dashboard Widgets

Six big-number tiles displayed at the top of the dashboard, above all charts:

1. **Total Users** (`totalUsers`) — snapshot of registered base
2. **MAU 30d** (`mau`) — active usage signal; the number that matters for retention
3. **Uploads 30d** (`uploads30d`) — primary activation volume metric
4. **DB Size** (`dbTotalBytes`) — storage growth watchdog; `N/A` on SQLite
5. **Node Heap Used** (`memoryHeapUsed`) — operational health at a glance
6. **Error Events 24h** (`errorEvents24h`) — immediate failure signal; red badge if > 0

All six refresh every 30 seconds via React Query with `staleTime: 30_000`.

---

## §4 Anti-Vanity Guardrails

The following metrics are deliberately excluded from MVP:

- **"Total signups ever" as the headline KPI.** Cumulative signups is a vanity number at early stage — it grows monotonically regardless of product quality. MAU and activation rate are more actionable. Total users is available as a secondary tile but not the hero number.
- **Total session time / time-in-app.** Not tracked; not actionable for ops. Signals engagement but tells ops nothing about failures.
- **Upload count per workflow** as a ratio displayed prominently. Misleading before representative N is reached.
- **"Most active user" leaderboard with email addresses.** PII risk; unnecessary for ops decisions.
- **Stripe MRR / ARR.** Revenue reporting belongs in Stripe dashboard, not this internal ops view. Subscription status breakdowns are sufficient for ops awareness.

---

## §5 Latency SLO

Every API query backing a dashboard metric MUST complete within:

- **< 200 ms** in production (Postgres with appropriate indexes)
- **< 500 ms** in dev (SQLite with foreign-key joins)

Queries violating the target at plan scale (> 10k users) must be cached or materialized. Trend queries (30d/90d daily buckets) are the most at-risk and should be the first candidates for a scheduled cache warm at 5-minute intervals via a background job.

All indexes required are already present on `users.created_at`, `uploads.uploaded_at`, `workflows.created_at`, `analytics_events.event_name`, and `analytics_events.created_at`.

---

## §6 Privacy and PII

- No raw email addresses appear in any dashboard widget, including leaderboards. User identifiers in top-uploader and most-viewed lists are displayed as truncated UUIDs: first 3 characters + `...` + last 3 characters (e.g., `abc...xyz`).
- Memory metrics, DB sizes, and table sizes are operational data — not PII.
- `analytics_events.properties` JSON may contain user-supplied content. The dashboard queries only event names and counts; the `properties` column is never surfaced.
- All dashboard API routes must enforce `isAdmin = true` at the session layer before any query executes. No metric is readable by non-admin users regardless of authentication state.

---

## §7 Refresh Strategy

| Widget type | React Query `staleTime` | Refetch interval |
|---|---|---|
| Big-number tiles (User, Upload, Error counts) | 30s | 30s |
| Memory / uptime snapshot | 10s | 10s |
| Table sizes, DB size | 5min | 5min |
| Trend charts (30d/90d) | 60s | 60s |
| Top-10 lists | 5min | 5min |

A **manual refresh button** appears at the top of the dashboard and calls `queryClient.invalidateQueries()` on all admin keys simultaneously. This allows the ops team to force-refresh after a deploy or incident.

Memory metrics poll independently from the main data queries via a dedicated `/api/admin/memory` endpoint. This prevents a slow DB query from blocking the live process-health view.

---

## §8 Open Questions for CEO

The following require explicit decision before implementation:

1. **DAU definition — extension-only users.** The current schema has no `lastSeenAt` column. DAU, WAU, and MAU are approximated via `users.updatedAt`, which captures web-app activity. Users who only use the Chrome extension without logging into the web app would not be counted. Should extension-session events be written to the DB to enable true activity-based MAU? This requires a small schema addition.

2. **Active paid users — include trialing?** The current definition includes `subscriptionStatus = 'trialing'`. If the intent is "users generating revenue today," trialing should be excluded. If the intent is "users actively engaging with a paid surface," trialing should be included. Recommend keeping trialing in and labeling the tile "Paid + Trialing."

3. **Memory poll cadence.** Node memory is set to 10-second refresh. This is aggressive and will produce many requests if multiple admin users have the dashboard open simultaneously. Recommend 30 seconds unless live memory leak diagnosis is a frequent use case.

4. **Trend window — 30d only or also 90d?** 90-day trend charts require bucketing 90 rows per query. On SQLite dev this is fast; on Postgres at scale it may need caching. Confirm whether 90d charts are MVP or Phase 2.

5. **Top-uploader leaderboard — include internal/admin accounts?** Admin users (`isAdmin = true`) will naturally dominate upload counts during testing. Recommend filtering them out of all leaderboard widgets.

---

*Document owner: analytics agent. Downstream recipients: backend-engineer (API route implementation), frontend-engineer (dashboard component), coordinator (sequencing).*
