# Analytics Architecture — Ledgerium AI

**Version:** 1.0
**Date:** 2026-04-16
**Status:** Draft — requires Product and Engineering review before build
**Author:** System Architect Agent

---

## 1. Current State Assessment

The codebase already has a partial analytics foundation:

### What exists

| Component | Status | Location |
|-----------|--------|----------|
| Client-side event taxonomy | Done — 40+ typed events | `src/lib/analytics.ts` |
| PostHog client SDK integration | Done — initialized via provider, respects DNT | `src/lib/posthog.ts`, `src/components/PostHogProvider.tsx` |
| Server-side `trackServer()` function | Stub — logs to console only | `src/lib/analytics.ts:224` |
| `AnalyticsEvent` Prisma model | Done — stores to SQLite | `prisma/schema.prisma:399` |
| `/api/analytics/events` POST endpoint | Done — batch persists client events to DB | `src/app/api/analytics/events/route.ts` |
| `/api/analytics/events` GET endpoint | Done — admin-only, returns aggregated event data with funnels | Same file |
| Admin product analytics page | Done — funnel charts, event counts, daily activity | `src/app/(app)/analytics/product/page.tsx` |
| Admin `isAdmin` flag and bootstrap | Done — one-time bootstrap, checked in API and UI | User model + `/api/admin/bootstrap` |
| Client event buffering and flush | Done — batches to 10, 2s debounce, sendBeacon on unload | `src/lib/analytics.ts:183` |
| Extension telemetry | Not started — zero analytics in extension-app | - |

### What is missing

1. **Server-side event persistence** — `trackServer()` only logs to console; events from API routes (uploads, billing webhooks, sync) are not persisted to DB or PostHog.
2. **Extension telemetry** — No recording lifecycle events (start, pause, stop, export, sync success/failure) are captured.
3. **PostHog server SDK** — Not installed; server-side events do not reach PostHog.
4. **Aggregation at scale** — All analytics queries scan the raw `analytics_events` table. No materialized views or pre-aggregated tables.
5. **Retention policy** — No cleanup or archival of old events.
6. **Admin dashboard depth** — Current dashboard shows counts and funnels but no user-level drill-down, cohort analysis, or retention curves.
7. **Consent mechanism** — PostHog respects `Do Not Track`, but there is no in-app consent banner or per-user opt-in/out toggle.

---

## 2. Architecture Recommendation

### 2.1 Tool Choice: PostHog Cloud + PostgreSQL Event Log (Hybrid)

**Recommendation:** PostHog Cloud (free tier, then Growth) as the primary analytics platform, with the existing PostgreSQL `AnalyticsEvent` table retained as an immutable audit log and backup data source.

**Justification:**

| Criterion | PostHog Cloud | Self-hosted PostHog | Custom PostgreSQL only | Mixpanel/Amplitude |
|-----------|--------------|--------------------|-----------------------|-------------------|
| Privacy alignment | Good — EU hosting available, no data sold, session recording disabled | Best — full data control | Best — your DB entirely | Weak — third-party data processing |
| Setup cost | Zero infra | High — requires ClickHouse, Kafka, Redis, Postgres | Zero | Zero infra |
| Funnel/cohort analysis | Built-in | Built-in | Must build from scratch | Built-in |
| Feature flags | Included | Included | Must build | Separate tool |
| Cost at 1K users | Free (1M events/mo) | Server cost ~$50-100/mo | $0 marginal | Free tier likely sufficient |
| Cost at 100K users | ~$450/mo (Growth plan) | ~$300-500/mo server | $0 but query cost grows | ~$1000+/mo |
| Retention curves | Built-in | Built-in | Must build | Built-in |
| Reversibility | High — can switch or self-host later | Medium — migration effort | N/A | Low — vendor lock-in |
| Time to value | Days | Weeks | Weeks-months | Days |

**Why not self-hosted PostHog:** At early stage, the operational cost of running ClickHouse + Kafka is unjustified. PostHog Cloud's free tier covers 1M events/month. When the product reaches a scale where self-hosting saves money or privacy requirements tighten, PostHog supports data export and self-hosting migration.

**Why not custom PostgreSQL only:** The existing `AnalyticsEvent` table is useful as an audit log, but building funnel analysis, cohort retention, and user journey visualization from raw SQL is weeks of engineering that PostHog provides out of the box. The current admin dashboard already shows the limits of this approach — it scans every event on every page load.

**Why not Mixpanel/Amplitude:** Both are SaaS analytics tools with stronger vendor lock-in and weaker privacy positioning. PostHog's open-source DNA and self-hosting escape hatch align better with Ledgerium's trust-first positioning.

### 2.2 Dual-write Strategy

All analytics events are written to two destinations:

```
Event Source (client/server/extension)
    |
    +---> PostHog (primary analytics platform)
    |       - funnels, cohorts, retention, feature flags
    |       - queried via PostHog UI and API
    |
    +---> PostgreSQL analytics_events table (audit log)
            - immutable append-only log
            - backup if PostHog is unavailable
            - custom admin queries not in PostHog
            - retention: 90 days raw, aggregated beyond
```

This dual-write is already partially implemented. The gap is that `trackServer()` does not write to either destination.

---

## 3. Collection Layer Design

### 3.1 Client-side (Web App)

**No changes to the existing architecture.** The current system is well-designed:

- `track()` writes to PostHog via `posthog.capture()` and buffers for batch POST to `/api/analytics/events`.
- Events are typed via the `AnalyticsEvent` union type.
- `sendBeacon` on page unload ensures delivery.

**One fix required:** The `trackServer()` function must persist events to DB and forward to PostHog server SDK. Current implementation only logs to console.

### 3.2 Server-side (API Routes)

Server-side events are critical for data integrity. Client-side tracking can be blocked by ad blockers or fail silently. Server-side events are authoritative.

**Events that MUST be server-side (not client-only):**

| Event | API Route | Why server-side |
|-------|-----------|-----------------|
| `workflow_uploaded` | `/api/upload` | Source of truth for activation |
| `subscription_created` | `/api/billing/webhook` | Revenue event — must not rely on client |
| `subscription_canceled` | `/api/billing/webhook` | Revenue event |
| `payment_failed` | `/api/billing/webhook` | Revenue event |
| `api_key_created` | `/api/keys` | Activation milestone |
| `team_created` | `/api/teams` | Collaboration event |
| `team_invite_accepted` | `/api/teams/join` | Collaboration event |
| `workflow_shared` | `/api/workflows/[id]/share` | Collaboration event |
| `sync_upload_received` | `/api/sync` | Extension-to-web bridge event |

**Implementation pattern for `trackServer()`:**

```typescript
// Updated trackServer — persists to DB + PostHog server SDK
export async function trackServer(
  event: string,
  properties: Record<string, unknown> = {},
): Promise<void> {
  const enriched = {
    event,
    ...properties,
    timestamp: new Date().toISOString(),
    source: 'server' as const,
  };

  // 1. Persist to DB (non-blocking)
  persistToDb(enriched).catch((err) => {
    console.error('[analytics:persist]', err);
  });

  // 2. Forward to PostHog server SDK (non-blocking)
  if (posthogServerClient) {
    posthogServerClient.capture({
      distinctId: (properties.userId as string) ?? 'anonymous',
      event,
      properties,
    });
  }
}
```

**Dependency:** Install `posthog-node` (PostHog Node.js server SDK). This is a lightweight HTTP client with no infrastructure requirements.

### 3.3 Extension Telemetry

**Policy: Opt-in, minimal, no content data.**

The extension should capture lifecycle events only. No page content, no URLs visited, no form field values, no screenshot data.

**Events to capture in the extension:**

| Event | When | Properties |
|-------|------|-----------|
| `extension_installed` | First activation after install | `extensionVersion` |
| `extension_connected` | API key saved successfully | `extensionVersion` |
| `recording_started` | User clicks Start | `extensionVersion` |
| `recording_paused` | User clicks Pause | `durationMs` |
| `recording_resumed` | User clicks Resume | `pauseDurationMs` |
| `recording_stopped` | User clicks Stop | `durationMs`, `stepCount` |
| `recording_exported` | User exports JSON manually | `format`, `bundleSizeBytes` |
| `sync_attempted` | Auto-sync starts | `bundleSizeBytes` |
| `sync_succeeded` | Auto-sync completes | `durationMs` |
| `sync_failed` | Auto-sync fails | `errorType` (not full error message) |
| `extension_error` | Unrecoverable error | `errorType` (category only) |

**Delivery mechanism:** POST to `/api/analytics/events` using the stored API key for authentication. Events are buffered in `chrome.storage.local` and flushed when the side panel is open or on a 60-second interval while the service worker is alive.

**Consent:** Extension settings page includes a "Send anonymous usage data" toggle, defaulting to ON with a clear explanation of what is sent. The toggle state is stored in `chrome.storage.sync`. When OFF, no events are transmitted.

**What is NEVER captured from the extension:**
- URLs visited during recording (these are in the workflow data, not telemetry)
- Page content or DOM elements
- Form field values or text input
- Screenshot or visual data
- User's browsing history outside of recording sessions
- Any data that could reconstruct the user's browsing activity

---

## 4. Data Model

### 4.1 Existing `AnalyticsEvent` Table (Keep As-Is)

The current schema is adequate for the audit log role:

```prisma
model AnalyticsEvent {
  id          String   @id @default(uuid())
  userId      String?  @map("user_id")
  eventName   String   @map("event_name")
  properties  String?  // JSON metadata
  url         String?
  source      String   @default("client") // client, server, extension
  createdAt   DateTime @default(now()) @map("created_at")

  @@index([userId])
  @@index([eventName])
  @@index([createdAt])
  @@map("analytics_events")
}
```

**One addition:** Add `source: "extension"` as a valid value. No schema migration needed — the column is a free-form string.

### 4.2 Aggregation Strategy

**Phase 1 (now through 1K users): No aggregation needed.**

At 1K users generating ~50 events/day each, that is ~50K events/day, ~1.5M events/month. PostHog handles this natively. The PostgreSQL table will grow to ~5M rows in 90 days. With the existing indexes, queries against this table remain fast for admin dashboard use.

**Phase 2 (1K-10K users): Add a daily aggregation table.**

```prisma
model AnalyticsDailySummary {
  id         String   @id @default(uuid())
  date       DateTime // date truncated to midnight UTC
  eventName  String   @map("event_name")
  source     String   // client, server, extension
  eventCount Int      @map("event_count")
  uniqueUsers Int     @map("unique_users")
  properties String?  // JSON: aggregated metadata (e.g., top plan types)
  createdAt  DateTime @default(now()) @map("created_at")

  @@unique([date, eventName, source])
  @@index([date])
  @@index([eventName])
  @@map("analytics_daily_summary")
}
```

**Aggregation mechanism:** A scheduled task (cron job or a Next.js API route triggered by an external cron service) runs daily at 02:00 UTC. It:
1. Queries `analytics_events` for the previous day.
2. Inserts aggregated rows into `analytics_daily_summary`.
3. This is a batch operation, not real-time.

**Phase 3 (10K+ users): Migrate primary analytics to PostHog entirely.** The PostgreSQL audit log becomes a compliance artifact only. Admin dashboard queries shift to PostHog API.

### 4.3 Retention Policy

| Data | Retention | Mechanism |
|------|-----------|-----------|
| Raw `analytics_events` rows | 90 days | Scheduled DELETE where `created_at < NOW() - INTERVAL 90 days` |
| `analytics_daily_summary` rows | 2 years | No automated deletion |
| PostHog events | Per PostHog plan (1 year on free, configurable on Growth) | Managed by PostHog |

**Implementation:** A daily cleanup task (same cron as aggregation) deletes raw events older than 90 days. This keeps the table small and query-performant.

**Note on SQLite:** The current database is SQLite, which does not support `INTERVAL` syntax. The cleanup query uses: `WHERE created_at < datetime('now', '-90 days')`. When migrating to PostgreSQL (Phase 4 per PRD), the standard `INTERVAL` syntax applies.

---

## 5. Admin Dashboard Architecture

### 5.1 Recommendation: Custom Dashboard Pages + PostHog for Deep Analysis

**Do NOT embed PostHog's UI.** PostHog's embedded dashboards require iframes and expose PostHog's full interface, which is confusing for a non-technical admin. Instead:

- **Custom admin pages** (existing pattern) for operational metrics the admin needs daily: user counts, activation funnels, event volumes, error rates.
- **PostHog's own UI** (accessed via PostHog login) for deep analysis: cohort retention, user journeys, A/B test results, ad-hoc queries.

This keeps the admin experience clean and the engineering cost low.

### 5.2 Admin Dashboard Data Sources

| Dashboard Section | Data Source | Why |
|-------------------|-------------|-----|
| Summary metrics (users, events, workflows) | PostgreSQL direct queries | Fast, authoritative, no external dependency |
| Activation funnel | PostgreSQL `analytics_events` (Phase 1) or PostHog API (Phase 2+) | Funnel logic already implemented in `/api/analytics/events` GET |
| Conversion funnel | PostgreSQL (Phase 1), PostHog API (Phase 2+) | Same as above |
| Daily activity chart | PostgreSQL `analytics_events` (Phase 1), `analytics_daily_summary` (Phase 2+) | Already implemented |
| Top pages | PostgreSQL | Already implemented |
| Retention curves | PostHog UI only | Too complex to build custom; PostHog provides this natively |
| User-level drill-down | PostHog UI only | PostHog's user timeline is superior to anything built custom |
| Cohort analysis | PostHog UI only | Same |

### 5.3 Admin Dashboard Enhancements (Phased)

**Phase 1 additions to the existing admin page:**

1. **User-level metrics section** — Total users, users by plan, users by subscription status. Query the `users` table directly. No analytics events needed.
2. **Error rate panel** — Count of `upload_failed`, `api_error`, `client_error` events in the period. Already captured in the event taxonomy.
3. **Extension connectivity** — Count of `extension_connected` and `sync_succeeded` events to monitor extension-to-web bridge health.

**Phase 2 additions:**

4. **Revenue dashboard** — MRR, churn rate, conversion rates by cohort. Data from Stripe API or Stripe webhook events persisted to `analytics_events`.
5. **PostHog API integration** — Replace the manual funnel computation in `/api/analytics/events` GET with PostHog's Trends and Funnels API for more accurate results.

### 5.4 Auth and Access Control

The existing pattern is correct and sufficient:

- `isAdmin` boolean on the `User` model.
- API routes check `session.user.isAdmin` before returning admin data.
- Admin pages check session client-side and redirect non-admins to `/dashboard`.
- Bootstrap route creates the first admin; disabled after first use.

**No changes needed for Phase 1.** If the team grows to multiple admins with different roles (e.g., viewer vs. editor), add an `adminRole` field to the User model. This is a Phase 4 concern.

**Security note:** The `/api/analytics/events` POST endpoint accepts events from unauthenticated users (pre-login events). This is correct behavior but means the endpoint must validate and sanitize event payloads strictly. The current implementation limits batch size to 100 events and filters properties. This is adequate.

---

## 6. Privacy and Trust Architecture

### 6.1 Privacy Principles (Non-negotiable)

Ledgerium's core positioning is trust-first. Analytics must not undermine this. The following rules are absolute:

1. **User workflow content is NEVER analytics data.** The workflow steps, SOP text, process maps, agent compositions — these are the user's work product. They are stored in the application database and governed by the data model's access controls. They must never appear in analytics event properties.

2. **Analytics tracks product behavior, not user content.** Analytics answers "did the user upload a workflow?" (yes/no, step count, duration) — never "what was in the workflow?"

3. **No cross-user data in analytics.** An analytics event for user A must never contain information about user B's workflows, even in aggregate.

### 6.2 What Must NEVER Be Tracked

| Category | Examples | Why |
|----------|----------|-----|
| Workflow content | Step text, SOP prose, tool names from recordings | User's proprietary process data |
| Workflow titles | "Q4 Revenue Report Process" | May reveal business-sensitive information |
| URL paths from recordings | URLs captured during browser workflow recording | User's browsing activity during work |
| Form field values | Any text typed into extension or web app forms (except search/filter terms) | PII risk |
| File contents | Uploaded JSON content | User data |
| Team names or member emails | Team "Acme Corp Finance" | Organization-identifiable |
| IP addresses | Raw IPs in event properties | PII under GDPR |
| Error message contents | Full stack traces that may contain user data | May leak user content |

**Safe to track (with user consent):**

| Category | Examples | Why safe |
|----------|----------|---------|
| Feature usage | "user clicked Export button", "user opened Agent Intelligence tab" | Product behavior, not content |
| Counts | Step count, workflow count, duration in ms | Aggregate metrics, no content |
| Plan and billing status | "user is on free plan", "user hit upload limit" | Business metric |
| Error categories | "upload_failed: validation_error" (category, not message) | Operational health |
| UI navigation | Page path visited within the Ledgerium app | Product usage pattern |
| Extension lifecycle | Recording started/stopped, sync attempted | Product reliability |

### 6.3 Consent Mechanism

**Web App:**

- Add a cookie consent banner on first visit. Two options: "Accept analytics" and "Essential only."
- "Essential only" disables PostHog entirely and stops client-side event buffering. Server-side events for operational integrity (upload success, billing) still fire but are not tied to a PostHog distinct ID.
- Consent preference stored in `localStorage` key `ledgerium_analytics_consent` with values `accepted` | `declined` | `not_set`.
- The PostHog initialization in `PostHogProvider.tsx` checks this flag before calling `initPostHog()`.
- Users can change their preference in Account Settings.

**Extension:**

- Settings toggle: "Send anonymous usage data to improve Ledgerium."
- Default: ON (with clear disclosure on install/first-run).
- Toggle stored in `chrome.storage.sync`.
- When OFF, no telemetry events are sent. Recording and sync functionality are unaffected.

**Privacy Policy:**

- The existing `/privacy` page must be updated to describe what analytics data is collected, how it is used, and how to opt out.
- PostHog Cloud's data processing location (US or EU) must be documented.

### 6.4 Data Segregation

```
+---------------------------+     +---------------------------+
|   Application Database    |     |   Analytics Layer         |
|                           |     |                           |
|   users                   |     |   analytics_events (PG)   |
|   workflows               |     |   PostHog cloud           |
|   workflow_artifacts      |     |                           |
|   process_definitions     |     |   Contains:               |
|   teams                   |     |   - event names           |
|   ...                     |     |   - counts/durations      |
|                           |     |   - user IDs (pseudonymous|
|   Contains:               |     |     in PostHog)           |
|   - user content          |     |   - plan types            |
|   - workflow data          |     |   - page paths            |
|   - SOP text              |     |   - error categories      |
|   - process intelligence  |     |                           |
+---------------------------+     +---------------------------+
        |                                    |
        | NEVER flows to -->                 |
        +------------------------------------+
```

The application database and analytics layer are separate concerns. Analytics events may reference entity IDs (e.g., `workflowId`) for debugging, but the analytics layer cannot be used to reconstruct user content. If PostHog were breached, an attacker would see "user X uploaded a workflow with 15 steps" — never what those steps contain.

---

## 7. Implementation Sequence

### Phase 1: Fix the Gaps (Week 1-2)

**Goal:** Make the existing infrastructure reliable before adding features.

| Task | Effort | Dependency |
|------|--------|------------|
| 1a. Fix `trackServer()` to persist to DB | S | None |
| 1b. Install `posthog-node`, wire `trackServer()` to PostHog server SDK | S | 1a |
| 1c. Add server-side `trackServer()` calls to critical API routes: upload, billing webhook, team creation, sync | M | 1a |
| 1d. Add consent banner to web app, gate PostHog init on consent | S | None |
| 1e. Update privacy policy page | S | 1d |

**Deliverable:** All critical server-side events persist to both DB and PostHog. Consent mechanism is live.

### Phase 2: Extension Telemetry (Week 2-3)

**Goal:** Close the recording funnel visibility gap.

| Task | Effort | Dependency |
|------|--------|------------|
| 2a. Add telemetry module to extension-app with event buffer and flush | M | 1c (needs `/api/analytics/events` to accept API-key auth) |
| 2b. Add consent toggle to extension settings | S | None |
| 2c. Instrument recording lifecycle events in extension | S | 2a |
| 2d. Verify end-to-end: extension event -> DB + PostHog | S | 2a, 2c |

**Deliverable:** Recording funnel (start -> stop -> sync -> view SOP) is fully instrumented.

**API change required:** The `/api/analytics/events` POST endpoint currently uses session auth. Extension events arrive with API key auth. The endpoint must accept both authentication methods. This is a small change — check for `Authorization: Bearer <api_key>` header as a fallback when no session cookie is present.

### Phase 3: Admin Dashboard Enhancements (Week 3-4)

**Goal:** Make the admin dashboard actionable for early beta.

| Task | Effort | Dependency |
|------|--------|------------|
| 3a. Add user metrics section (users by plan, by status) | S | None |
| 3b. Add error rate panel | S | 1c |
| 3c. Add extension connectivity panel | S | 2c |
| 3d. Add event retention cleanup (90-day deletion cron) | S | None |

**Deliverable:** Admin can monitor activation, errors, and extension health from one page.

### Phase 4: Scale Preparation (When Approaching 10K Users)

| Task | Effort | Dependency |
|------|--------|------------|
| 4a. Create `analytics_daily_summary` table | S | None |
| 4b. Build daily aggregation cron job | M | 4a |
| 4c. Migrate admin dashboard queries to use summary table | M | 4b |
| 4d. Integrate PostHog API for funnel/retention data in admin dashboard | M | PostHog Growth plan |
| 4e. Evaluate self-hosted PostHog if privacy requirements tighten | L | - |

---

## 8. Cost Analysis

### PostHog Cloud

| Scale | Monthly Events (est.) | PostHog Plan | PostHog Cost | Notes |
|-------|-----------------------|-------------|-------------|-------|
| 100 users | ~150K | Free (1M/mo) | $0 | Well within free tier |
| 1K users | ~1.5M | Free or Growth | $0-50 | May exceed free tier; Growth starts at ~$0/mo + usage |
| 10K users | ~15M | Growth | ~$200-450/mo | Based on PostHog pricing at $0.00031/event beyond free allocation |
| 100K users | ~150M | Growth or Enterprise | ~$2000-4500/mo | At this scale, evaluate self-hosting (~$500-1000/mo infra) |

**Assumptions:** 50 events/user/day average (page views, feature usage, server events). Active users assumed at 30% of total.

### PostgreSQL (Audit Log)

| Scale | Rows/Month | Storage (est.) | Query Performance | Action Needed |
|-------|-----------|----------------|-------------------|---------------|
| 100 users | ~150K | ~50MB | Fast | None |
| 1K users | ~1.5M | ~500MB | Fast with indexes | None |
| 10K users | ~15M | ~5GB | Slow without aggregation | Add daily summary table, 90-day retention |
| 100K users | ~150M | ~50GB | Requires aggregation | Summary table only; raw events retained 30 days max |

**Note:** These are PostgreSQL estimates. The current database is SQLite, which will hit write contention limits well before 1K concurrent users. The SQLite-to-PostgreSQL migration (noted as a Phase 4 constraint in the PRD) should happen before analytics volume becomes a concern.

### Total Cost Projection

| Scale | PostHog | Infra (DB storage) | Engineering (initial) | Total Monthly |
|-------|---------|--------------------|-----------------------|---------------|
| 100 users | $0 | $0 | ~2 weeks one-time | $0 |
| 1K users | $0-50 | ~$5 | - | ~$5-55 |
| 10K users | $200-450 | ~$20 | ~1 week for aggregation | ~$220-470 |
| 100K users | $2000-4500 | ~$50 | Consider self-host | ~$2050-4550 |

---

## 9. Technical Contracts

### 9.1 Analytics Event Ingestion Endpoint

**POST `/api/analytics/events`**

Request:
```json
{
  "events": [
    {
      "event": "workflow_uploaded",
      "timestamp": "2026-04-16T14:30:00.000Z",
      "url": "/upload",
      "stepCount": 15,
      "source": "client"
    }
  ]
}
```

Authentication: Session cookie OR `Authorization: Bearer <api_key>` (for extension).

Response:
```json
{ "ok": true, "received": 1 }
```

Constraints:
- Maximum 100 events per batch.
- Events without a recognized `event` name are stored with `event_name = "unknown"`.
- The endpoint NEVER returns errors to the caller (analytics must not break the app). All failures are logged server-side.

### 9.2 Analytics Dashboard Endpoint

**GET `/api/analytics/events?days=30`**

Authentication: Session cookie with `isAdmin = true`.

Response: (existing contract, no changes)
```json
{
  "summary": { "totalEvents": 1234, "uniqueUsers": 56, "periodDays": 30, "since": "..." },
  "eventCounts": { "workflow_uploaded": 89, ... },
  "dailyCounts": { "2026-04-15": { "workflow_uploaded": 3, ... }, ... },
  "funnels": { "activation": [...], "conversion": [...] },
  "topPages": [{ "path": "/dashboard", "count": 200 }, ...]
}
```

### 9.3 PostHog Server SDK Contract

```typescript
// src/lib/posthog-server.ts
import { PostHog } from 'posthog-node';

const client = new PostHog(
  process.env.POSTHOG_API_KEY ?? '',
  { host: process.env.POSTHOG_HOST ?? 'https://us.i.posthog.com' }
);

export function captureServerEvent(
  userId: string,
  event: string,
  properties?: Record<string, unknown>
): void {
  if (!process.env.POSTHOG_API_KEY) return;
  client.capture({ distinctId: userId, event, properties });
}

// Call on server shutdown
export function shutdownPostHog(): Promise<void> {
  return client.shutdown();
}
```

**Environment variables required:**
- `POSTHOG_API_KEY` (server-side, NOT `NEXT_PUBLIC_` prefixed — this is a secret)
- `POSTHOG_HOST` (optional, defaults to US cloud)

---

## 10. Open Risks and Decisions Required

| # | Risk/Decision | Impact | Who Resolves |
|---|--------------|--------|--------------|
| 1 | SQLite write contention under analytics event volume | At >100 concurrent users, batch inserts to `analytics_events` may conflict with application writes. This is a known constraint from the PRD. | Engineering — mitigate by making DB writes async/non-blocking; resolve fully with PostgreSQL migration. |
| 2 | PostHog Cloud data residency | If Ledgerium targets EU customers, PostHog data must be in the EU region. PostHog Cloud supports EU hosting but it must be selected at project creation. | Product — decide US vs EU hosting before PostHog project is created. |
| 3 | Extension telemetry and Chrome Web Store review | Chrome Web Store reviews may scrutinize telemetry in MV3 extensions. The telemetry must be clearly disclosed in the extension's privacy policy and the store listing. | Product + Engineering — ensure store listing privacy disclosures match actual data collection. |
| 4 | Cookie consent legal requirements | GDPR and ePrivacy Directive require consent before non-essential cookies. PostHog uses cookies for user identification. The consent banner is required before EU launch. | Product — confirm target markets and consent requirements. |
| 5 | `trackServer()` async behavior in serverless | Next.js API routes may terminate before async analytics writes complete. Use `waitUntil()` (available in Vercel/edge runtime) or ensure writes are fire-and-forget with PostHog's built-in batching. | Engineering — test event delivery reliability in the deployment environment. |
| 6 | Admin dashboard does not yet show user-level detail | PostHog provides this, but the custom admin page does not. If the admin needs to debug a specific user's journey, they must log into PostHog directly. | Product — acceptable for Phase 1? |

---

## 11. Summary of Recommendations

1. **Use PostHog Cloud** as the primary analytics platform. Retain PostgreSQL `analytics_events` as an immutable audit log.
2. **Fix `trackServer()` immediately** — this is the highest-priority gap. Server-side events are more reliable than client-side and cover the critical activation and revenue funnels.
3. **Add extension telemetry** with an opt-in toggle and strict content boundaries. Instrument the recording lifecycle to close the funnel visibility gap.
4. **Do not build custom retention curves or cohort analysis.** Use PostHog for these. Build custom admin pages only for operational metrics that benefit from direct DB access.
5. **Implement consent before beta launch.** A simple banner with accept/decline is sufficient. Do not build a complex preference center for Phase 1.
6. **Plan for aggregation at 10K users** but do not build it now. The raw event table with existing indexes is sufficient through 1K users.
7. **Total Phase 1 engineering cost: approximately 2 weeks.** This covers fixing server-side tracking, adding extension telemetry, consent mechanism, and admin dashboard enhancements.
