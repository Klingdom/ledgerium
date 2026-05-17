# PRD — Admin Operations Dashboard

**Feature:** Admin Operations Dashboard
**Route:** `/admin/operations`
**Status:** Proposed — MVP
**Author:** Product Manager agent
**Date:** 2026-05-16
**CEO directive:** "We need to create a dashboard to understand user volume, recording volume, memory usage. All the traditional stuff a SaaS would need and use."

---

## §1 Problem Statement

The CEO currently has no single internal view of Ledgerium AI's operating state. Answering basic operational questions — how many users signed up this week, how many recordings were processed, whether the system is healthy — requires opening Postgres directly, running ad-hoc queries, or cross-referencing PostHog. None of these are sustainable as user volume grows.

**The job to be done:** give the CEO (and future ops team members) a single read-only page that answers the ten most common "how is the product doing?" questions without querying the database or messaging anyone.

**Decisions this dashboard must support:**

- Is user growth accelerating, flat, or declining?
- Are users actually recording workflows after sign-up (activation signal)?
- Which plan tier is the majority of users on?
- Is the recording pipeline processing uploads successfully?
- Is the database approaching capacity or showing errors?
- How much server memory is the Node process consuming?

This is an internal admin-only tool. It is not a user-facing analytics product. It does not replace the per-user workflow dashboard.

---

## §2 MVP Scope (In-Scope)

The dashboard has five sections. Each section is a card group. No section requires new database tables; all queries target existing Prisma models.

### Section 1 — User Volume

| Widget | Source | Query |
|---|---|---|
| Total registered users | `users` table | `COUNT(*)` |
| New signups (last 7 days) | `users.created_at` | `COUNT WHERE created_at >= now() - 7d` |
| New signups (last 30 days) | `users.created_at` | `COUNT WHERE created_at >= now() - 30d` |
| Plan distribution (free / starter / team / growth / enterprise) | `users.plan` | `GROUP BY plan` — displayed as a labeled bar |
| Users with at least one workflow (activation rate) | `workflows` join `users` | `COUNT DISTINCT user_id` / total users |

### Section 2 — Recording Volume

| Widget | Source | Query |
|---|---|---|
| Total uploads all-time | `uploads` table | `COUNT(*)` |
| Uploads (last 7 days) | `uploads.uploaded_at` | rolling window count |
| Uploads (last 30 days) | `uploads.uploaded_at` | rolling window count |
| Validation status breakdown (pending / valid / invalid) | `uploads.validation_status` | `GROUP BY validation_status` |
| Top 5 users by upload count | `uploads` join `users` | `GROUP BY user_id ORDER BY count DESC LIMIT 5` — email + count |

### Section 3 — Workflow Volume

| Widget | Source | Query |
|---|---|---|
| Total workflows (active) | `workflows` table | `COUNT WHERE status = 'active'` |
| Workflows created (last 7 days) | `workflows.created_at` | rolling window count |
| Workflows created (last 30 days) | `workflows.created_at` | rolling window count |
| Workflows with a ProcessDefinition attached (processed rate) | `workflows.process_definition_id IS NOT NULL` | `COUNT / total active` as percentage |
| Workflows without a title or step count (data quality signal) | `workflows` | `COUNT WHERE step_count IS NULL` |

### Section 4 — System Health

| Widget | Source | Notes |
|---|---|---|
| Total analytics events (last 24 h) | `analytics_events.created_at` | Server-side event throughput signal |
| Error events (last 24 h) | `analytics_events` where `event_name LIKE '%error%' OR event_name LIKE '%failed%'` | Broad error signal — not a substitute for a log aggregator |
| Database table row counts (top 6 tables) | `pragma_table_info` / Prisma `$queryRaw` | users / uploads / workflows / analytics_events / process_definitions / workflow_artifacts |
| Upload invalid rate (last 30 days) | `uploads.validation_status = 'invalid'` / total last 30d | Flags pipeline regressions |

### Section 5 — Memory and Process Metrics

| Widget | Source | Notes |
|---|---|---|
| Node process RSS (MB) | `process.memoryUsage().rss` | Sampled at request time — not a real-time stream |
| Node heap used / heap total (MB) | `process.memoryUsage()` | Two numbers side by side |
| Approximate DB file size (SQLite) | `PRAGMA page_count * page_size` via `$queryRaw` | SQLite only; replace with `pg_database_size` when migrating to Postgres |
| Timestamp of metric snapshot | `Date.now()` server-side | Labelled "as of [time]" to signal it is point-in-time not live |

No Redis metrics are in scope: Redis is not confirmed as a runtime dependency in the current Phase 1 stack.

---

## §3 Out of Scope (Phase 2+)

The following are explicitly deferred and MUST NOT be included in the MVP build:

- **Revenue / MRR / ARR** — deferred until Stripe webhooks are operational and `stripeSubscriptionId` is populated for real users.
- **AI feature usage** (recommendations accepted, executions run, provider token costs) — deferred until AI Vision Build (AI+1 through AI+10 sequence).
- **Per-team metrics** — teams exist in the schema but team-scoped usage analytics are not yet meaningful.
- **Cohort retention curves** — requires a BI tool or a materialized cohort table; not available from raw Prisma queries.
- **Churn analysis** — requires subscription event history from Stripe.
- **Support ticket volume** — no ticketing integration exists.
- **PostHog funnel queries proxied through the admin page** — PostHog has rate limits; any PostHog data is consumed via the PostHog UI directly, not proxied through this dashboard.
- **Real-time streaming metrics** — all widgets are point-in-time snapshots refreshed on page load or on a manual refresh button click.

---

## §4 User Stories

**US-1 — Signup pulse**
As the CEO, I want to see how many users signed up in the last 7 and 30 days so I can tell at a glance whether growth is accelerating without opening a database client.

**US-2 — Activation signal**
As the CEO, I want to see what percentage of registered users have created at least one workflow so I can judge whether new signups are activating or churning silently.

**US-3 — Recording pipeline health**
As the CEO, I want to see the upload count and validation breakdown (valid / invalid / pending) for the last 30 days so I can detect pipeline regressions without reading server logs.

**US-4 — Memory and process state**
As the CEO, I want to see Node process RSS and heap usage at the moment I load the page so I can judge whether the server is under memory pressure before a support escalation reaches me.

**US-5 — Plan distribution**
As the CEO, I want to see how many users are on each plan tier (free / starter / team / etc.) so I can assess upgrade adoption without a custom query.

---

## §5 Acceptance Criteria

**AC-1 (US-1):** The dashboard displays three signup count values — all-time total, last-7-day count, last-30-day count — each with a visible label. Values are sourced from `users.created_at`. If there are zero users the values display as "0" with no error state.

**AC-2 (US-2):** The activation rate widget displays a percentage computed as `(distinct user_ids in workflows table) / (total users) * 100`, rounded to one decimal place. If there are no workflows the value displays as "0.0%" with no error state.

**AC-3 (US-3):** The recording pipeline section displays: total uploads all-time, uploads in last 7 days, uploads in last 30 days, and a three-segment breakdown (pending / valid / invalid count) for uploads in the last 30 days. If there are no uploads all counts display as "0".

**AC-4 (US-4):** The memory section displays Node RSS in MB, heap used in MB, and heap total in MB. Values are captured server-side at request time. The snapshot timestamp is displayed adjacent to the values. The section renders even if `process.memoryUsage()` returns unexpected values (defensive fallback to "N/A").

**AC-5 (US-5):** The plan distribution widget displays one row per known plan tier (free, starter, team, growth, enterprise) with a count and a percentage of total users. Tiers with zero users display as "0 (0%)". Unrecognised plan strings are bucketed into "other".

**AC-6 (Authorization):** Users not on the admin allowlist (`isAdminUnlimited` returning false) who request `/admin/operations` receive a 404 response. The route does not disclose that an admin section exists.

**AC-7 (Performance):** The API endpoint backing the dashboard responds within 2 000 ms under a database of up to 10 000 users and 100 000 uploads. Queries that cannot meet this threshold must be identified during implementation and replaced with approximate counts or pagination.

**AC-8 (Empty state):** Every widget renders without error when the backing table is empty. No widget shows an unhandled exception or a JavaScript console error in an empty-data environment.

---

## §6 Success Metrics

The dashboard is useful if:

- The CEO opens `/admin/operations` at least 3 times per week without being prompted.
- The number of "what's our user count?" or "how many recordings today?" Slack messages drops to zero within two weeks of launch.
- The dashboard page load time (P95) stays below 2 000 ms as measured by the Next.js server timing header.
- Zero 500 errors are logged for the admin API route in the first 30 days of use.

These are qualitative and operational metrics, not instrumented A/B metrics. No PostHog events are required for this internal tool.

---

## §7 Constraints and Assumptions

**Access:** Admin-only. The admin allowlist is defined in `apps/web-app/src/lib/admin-allowlist.ts`. The check uses `isAdminUnlimited(email)`. No new permission model is introduced.

**Read-only:** The dashboard performs no mutations. All Prisma calls use `findMany`, `count`, `groupBy`, or `$queryRaw` (SELECT only). No `create`, `update`, or `delete` calls are permitted in the admin API route.

**Performance contract:** Queries must complete within 2 000 ms. For SQLite in Phase 1 this is achievable for tables under 100 000 rows. If row counts grow, aggregate queries should add a `LIMIT` or date-window clause to bound scan time.

**Empty data tolerance:** Every widget must handle zero rows gracefully. The page must render when no users, uploads, or workflows exist.

**No new infrastructure:** This feature consumes existing Prisma models only. No new database tables, no new queues, no new background jobs.

**DB provider:** Schema currently targets SQLite. The `PRAGMA page_count * page_size` DB-size query is SQLite-specific and must be replaced with `pg_database_size(current_database())` when migrating to Postgres. This replacement is noted as a known future task, not a blocker.

**Memory metrics scope:** Server-side Node process metrics only (`process.memoryUsage()`). Client-side browser memory is not in scope. Redis memory is not in scope (Redis not confirmed as a Phase 1 runtime dependency).

**No PostHog proxy:** PostHog data is not fetched through this dashboard. The PostHog UI is the access point for funnel and session analytics.

---

## §8 Dependencies

**Consumed (available now):**

- `users` table — plan, subscriptionStatus, createdAt
- `uploads` table — uploadedAt, validationStatus, userId
- `workflows` table — createdAt, status, processDefinitionId, stepCount
- `process_definitions` table — runCount, confidenceScore
- `analytics_events` table — eventName, createdAt, source
- `isAdminUnlimited()` from `apps/web-app/src/lib/admin-allowlist.ts`
- Next.js App Router API route pattern (matches existing `/api/workflows/route.ts` pattern)
- Node.js `process.memoryUsage()` (built-in, no dependency)
- SQLite `PRAGMA page_count` and `PRAGMA page_size` via `db.$queryRaw`

**Not yet available (deferred):**

- Stripe MRR / subscription event history — `stripeSubscriptionId` exists in schema but webhooks are not operational
- AI execution and recommendation tables — not yet built (AI Vision Build sequence)
- Redis memory stats — Redis not confirmed as a Phase 1 runtime service

---

## §9 Risks

**R-1 — Query performance on large tables**
Risk: `analytics_events` may grow large quickly; a full-table COUNT or GROUP BY without an index on `created_at` could exceed the 2 000 ms budget.
Mitigation: All time-windowed queries must use the existing `@@index([createdAt])` on `analytics_events`. If query time exceeds 500 ms in testing, narrow the window or add an approximate count using a cached value.

**R-2 — Admin authorization bypass**
Risk: A bug in the route handler could expose admin data to non-admin users.
Mitigation: Authorization check runs as the first statement in the route handler before any DB query. Test coverage must include a case where a non-admin authenticated session receives 404 (AC-6). QA engineer must write an explicit auth-bypass test.

**R-3 — SQLite PRAGMA compatibility**
Risk: The DB-size query using `PRAGMA page_count` is SQLite-specific and will break silently on Postgres migration.
Mitigation: Wrap the query in a try/catch; return `null` (displayed as "N/A") on failure. Document the Postgres replacement query in a code comment adjacent to the query.

**R-4 — Point-in-time memory metric misleads**
Risk: Node RSS captured at page-load time may not represent typical or peak memory usage, leading to false confidence.
Mitigation: Label the widget explicitly as "snapshot at page load" and include the timestamp. Do not present it as a live gauge. Acknowledge in the UI that a sustained high RSS requires server logs or an APM tool to diagnose.

**R-5 — Empty error-surface labelling**
Risk: The broad `event_name LIKE '%error%'` query for the error-events widget may miss real errors (naming convention drift) or over-count benign events with "error" in their name.
Mitigation: Document the query pattern in a code comment. Treat the widget as a trend signal, not a precise error count. A follow-up iteration can introduce an explicit error event taxonomy once naming conventions stabilise.

---

## §10 Suggested Route and Access Pattern

**Route:** `/admin/operations`

**Access control:** The Next.js page and its backing API route (`/api/admin/operations`) both check `isAdminUnlimited(session.user.email)`. If the check fails, the route returns HTTP 404 (not 403) to avoid disclosing that an admin section exists.

**Session requirement:** The user must be authenticated (existing session cookie). Unauthenticated requests redirect to `/login` via the existing auth middleware before reaching the admin check.

**API shape:** A single GET endpoint `/api/admin/operations` returns all five section payloads in one response body conforming to the existing `{ data, error, meta }` envelope pattern:

```
GET /api/admin/operations
Authorization: session cookie (existing auth middleware)

Response 200:
{
  data: {
    users: { total, last7d, last30d, byPlan, activationRatePct },
    uploads: { total, last7d, last30d, byValidationStatus, top5Users },
    workflows: { totalActive, last7d, last30d, processedRatePct, missingStepCount },
    systemHealth: { analyticsEventsLast24h, errorEventsLast24h, tableCounts, uploadInvalidRateLast30d },
    memory: { rssBytes, heapUsedBytes, heapTotalBytes, snapshotAt }
  },
  error: null,
  meta: { queriedAt: "<ISO8601>" }
}

Response 404: { data: null, error: "Not found", meta: {} }
```

**Frontend:** A single React Server Component page at `apps/web-app/src/app/(app)/admin/operations/page.tsx`. Data fetched server-side via the API route. No client-side state management required. Manual refresh via a "Refresh" button that re-fetches the route — no polling.

**Build estimate:** 3 implementation iterations: (1) backend-engineer — API route + Prisma queries + auth gate + tests; (2) frontend-engineer — page layout, card components, plan distribution bar, empty states; (3) qa-engineer — auth-bypass test, empty-data rendering test, AC-7 performance assertion.

---

*PRD word count: ~1 480 words (body text, excluding table content and code blocks).*
