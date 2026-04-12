# API Specification -- Ledgerium AI

**Status:** Active
**Phase:** 1
**Last updated:** 2026-04-12

---

## 1. Overview

All API endpoints are Next.js App Router routes under `/api/`. The web app runs
as a single Next.js 14 application with no separate API gateway.

**Design principles:**

- REST endpoints with JSON request/response bodies
- All inputs validated (Zod where implemented)
- Parameterized database queries only (Prisma ORM)
- Soft deletes preferred (status field, not row removal)
- User-scoped data: all queries filter by authenticated userId

**Base URL:** `https://<host>/api`

**Standard response shapes:**

Success responses vary per endpoint (documented below). Error responses use:

```json
{ "error": "Human-readable message" }
```

Some endpoints include additional fields: `detail`, `details` (array),
`code` (machine-readable error code).

---

## 2. Authentication

Two authentication mechanisms are supported:

### 2.1 Session Auth (Web App)

NextAuth v5 with credentials provider (email + bcrypt password). Session
tokens are managed as HTTP-only cookies by NextAuth. Used by all browser-based
endpoints.

Endpoints using session auth call `auth()` from `@/lib/auth` and check
`session.user.id`. Returns `401` if no valid session.

### 2.2 API Key Auth (Extension)

Used exclusively by `POST /api/sync`. Keys are prefixed with `ldg_` and
transmitted via `Authorization: Bearer ldg_...` header. The server stores
only the SHA-256 hash of the key.

### Auth Matrix

| Endpoint | Auth |
|----------|------|
| `POST /api/auth/signup` | None |
| `GET /api/health` | None |
| `GET /api/share/[token]` | None |
| `POST /api/billing/webhook` | Stripe signature |
| `POST /api/analytics/events` | Optional session |
| `POST /api/sync` | API key (Bearer) |
| All other endpoints | Session (NextAuth) |

---

## 3. Endpoints

### 3.1 Auth

#### POST /api/auth/signup

Create a new user account.

**Request body:**
```json
{
  "email": "string (valid email, required)",
  "password": "string (min 8 chars, required)",
  "name": "string (min 1 char, optional)"
}
```

**Response 201:**
```json
{ "id": "uuid", "email": "string" }
```

**Errors:** `400` validation, `409` email already exists, `500` internal.

#### /api/auth/[...nextauth]

NextAuth v5 handler. Supports `GET` and `POST` for sign-in, sign-out, session,
and CSRF flows. Not documented here -- see NextAuth v5 docs.

---

### 3.2 Ingestion

#### POST /api/upload

Upload a session bundle JSON file from the browser (form data). Requires
session auth. Runs validation, process engine, report generation, template
rendering, and workflow insights synchronously. Auto-clusters workflows
into process definitions (fire-and-forget).

**Request:** `multipart/form-data` with field `file` (JSON, max 10 MB).

**Response 201:**
```json
{
  "uploadId": "uuid",
  "workflowId": "uuid",
  "title": "string",
  "stepCount": 0,
  "phaseCount": 0,
  "toolsUsed": ["string"]
}
```

**Errors:** `400` no file or invalid JSON, `401` unauthorized, `403` free plan
limit reached (code `UPGRADE_REQUIRED`), `404` user not found, `413` file too
large, `422` validation failed or processing failed, `500` internal.

#### POST /api/sync

Extension sync endpoint. Accepts a SessionBundle as JSON body with API key auth.
Same processing pipeline as `/api/upload` but accepts `application/json` instead
of form data.

**Headers:** `Authorization: Bearer ldg_...`, `Content-Type: application/json`

**Request body:** SessionBundle JSON object (max 10 MB).

**Response 201:** Same shape as `/api/upload`.

**Errors:** `400` invalid JSON, `401` missing/invalid API key, `403` plan limit,
`413` payload too large, `422` validation/processing failed.

---

### 3.3 Workflows

#### GET /api/workflows

List workflows for the authenticated user with enriched intelligence fields.

**Query params:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `search` | string | `""` | Filter by title (contains) |
| `sort` | string | `created_at` | Sort field: `created_at`, `title`, `step_count`, `last_viewed`, `views`, `confidence`, `duration`, `optimization`, `variation` |
| `dir` | string | `desc` | Sort direction: `asc` or `desc` |
| `tool` | string | `""` | Filter by tool name (contains in toolsUsed) |
| `status` | string | `active` | Workflow status filter |
| `tag` | string | `""` | Filter by tag ID |
| `health` | string | `""` | Filter by health status |
| `sopReadiness` | string | `""` | Filter by SOP readiness |
| `stale` | string | `""` | `"true"` to show only stale workflows |
| `minConfidence` | float | -- | Minimum confidence |
| `maxConfidence` | float | -- | Maximum confidence |
| `minSteps` | int | -- | Minimum step count |
| `maxSteps` | int | -- | Maximum step count |

**Response 200:**
```json
{
  "workflows": [
    {
      "id": "uuid",
      "title": "string",
      "description": "string | null",
      "toolsUsed": ["string"],
      "durationMs": 0,
      "stepCount": 0,
      "phaseCount": 0,
      "confidence": 0.0,
      "status": "active",
      "isFavorite": false,
      "viewCount": 0,
      "createdAt": "ISO 8601",
      "updatedAt": "ISO 8601",
      "tags": [{ "id": "uuid", "name": "string", "color": "#hex" }],
      "variationScore": 0.0,
      "sopReadiness": "ready | partial | not_ready",
      "optimizationPotential": "high | medium | low",
      "documentationCompleteness": 0,
      "isStale": false,
      "bottleneckRisk": "high | medium | low | none",
      "healthStatus": "healthy | needs_review | high_variation | stale | new",
      "processType": "string",
      "complexityScore": 0,
      "aiOpportunityScore": 0,
      "cognitiveBurdenScore": 0,
      "processMaturityScore": 0,
      "processDefinition": {
        "id": "uuid",
        "canonicalName": "string",
        "variantCount": 0,
        "runCount": 0,
        "stabilityScore": 0.0,
        "confidenceScore": 0.0
      }
    }
  ],
  "stats": {
    "totalWorkflows": 0,
    "recordedThisWeek": 0,
    "needsReview": 0,
    "sopReady": 0,
    "avgConfidence": 0.0,
    "avgDuration": 0,
    "avgStepCount": 0.0,
    "optimizationOpportunities": 0,
    "insightCount": 0,
    "favoriteCount": 0,
    "staleCount": 0,
    "aiOpportunityCount": 0,
    "avgCognitiveBurden": 0,
    "avgMaturity": 0,
    "highCognitiveBurdenCount": 0,
    "systemCoverage": [{ "system": "string", "workflowCount": 0 }],
    "topInsights": [{ "id": "uuid", "title": "string", "severity": "string", "insightType": "string" }],
    "recentlyViewedIds": ["uuid"]
  }
}
```

#### GET /api/workflows/[id]

Get a single workflow with all artifacts. Increments view count. Performs
lazy template backfill for older workflows missing template artifacts.

**Response 200:**
```json
{
  "workflow": { "...workflow fields", "toolsUsed": ["string"] },
  "artifacts": [
    {
      "id": "uuid",
      "artifactType": "process_output | workflow_report | source_bundle | sop | process_map | workflow_insights | workflow_interpretation | template_*",
      "schemaVersion": "string | null",
      "contentJson": "object | null",
      "createdAt": "ISO 8601"
    }
  ]
}
```

**Errors:** `401`, `404` workflow not found.

#### PATCH /api/workflows/[id]

Update workflow metadata, tags, or sharing status.

**Request body (all fields optional):**
```json
{
  "title": "string (1-256 chars)",
  "description": "string (max 2000 chars)",
  "status": "active | archived | deleted",
  "isFavorite": true,
  "enableSharing": true,
  "tagIds": ["uuid"],
  "addTagId": "uuid",
  "removeTagId": "uuid"
}
```

**Response 200:**
```json
{ "ok": true, "shareToken": "string | null" }
```

**Errors:** `400` invalid body, `401`, `404`.

#### DELETE /api/workflows/[id]

Soft-delete a workflow (sets status to `deleted`).

**Response 200:** `{ "ok": true }`

**Errors:** `401`, `404`.

#### POST /api/workflows/[id]/analyze

Run intelligence analysis on a single workflow.

**Response 200:**
```json
{ "intelligence": "object (PortfolioIntelligence)" }
```

**Errors:** `401`, `404`, `422` no process output available, `500`.

#### GET /api/workflows/[id]/share

List who a workflow is shared with.

**Response 200:**
```json
{
  "shares": [
    {
      "id": "uuid",
      "sharedWith": "uuid",
      "sharedWithName": "string",
      "shareType": "user | team",
      "permission": "viewer | editor",
      "createdAt": "ISO 8601"
    }
  ],
  "isPublic": false
}
```

#### POST /api/workflows/[id]/share

Share a workflow with a user (by email) or team (by teamId).

**Request body:**
```json
{
  "email": "string (optional, share with user)",
  "teamId": "uuid (optional, share with team)",
  "permission": "viewer | editor (default: viewer)"
}
```

**Response 200:** `{ "ok": true, "sharedWith": "string" }`

**Errors:** `400` neither email nor teamId, `401`, `403` not team member,
`404` workflow or user not found.

#### DELETE /api/workflows/[id]/share

Revoke a share.

**Request body:** `{ "shareId": "uuid" }`

**Response 200:** `{ "ok": true }`

#### GET /api/workflows/[id]/export-markdown

Export a template artifact as a Markdown file download.

**Query params:** `artifactType` (required, must start with `template_`).

**Response 200:** `text/markdown` file download.

**Errors:** `400` missing or invalid artifactType, `401`, `404`.

---

### 3.4 Process Intelligence

#### GET /api/process-definitions

List all process definitions (exact process groups) for the user.

**Response 200:**
```json
{
  "definitions": [
    {
      "id": "uuid",
      "canonicalName": "string",
      "description": "string | null",
      "pathSignature": "string",
      "runCount": 0,
      "variantCount": 0,
      "avgDurationMs": 0,
      "medianDurationMs": 0,
      "stabilityScore": 0.0,
      "confidenceScore": 0.0,
      "analyzedAt": "ISO 8601 | null",
      "workflows": [{ "id": "uuid", "title": "string", "durationMs": 0, "stepCount": 0, "createdAt": "ISO 8601" }],
      "insights": [{ "id": "uuid", "insightType": "string", "severity": "string", "title": "string" }],
      "intelligence": "object | null",
      "familyId": "uuid | null",
      "normalizedName": "string | null",
      "groupType": "exact_group | standalone",
      "startAnchor": "string | null",
      "endAnchor": "string | null",
      "confidenceBand": "string | null",
      "systems": "string | null",
      "nameSignature": "string | null",
      "stepSignatureHash": "string | null",
      "metricsJson": "string | null"
    }
  ]
}
```

#### PATCH /api/insights/[id]

Dismiss or restore an insight.

**Request body:** `{ "dismissed": true }`

**Response 200:** `{ "ok": true }`

**Errors:** `401`, `404`.

---

### 3.5 Analytics

#### GET /api/analytics

Get cached intelligence summary (process definitions, insights, totals).
Does not re-run analysis.

**Response 200:**
```json
{
  "totalWorkflows": 0,
  "totalDefinitions": 0,
  "totalInsights": 0,
  "definitions": ["...ProcessDefinition objects with workflows and insights"],
  "insights": ["...ProcessInsight objects with parsed evidenceJson"]
}
```

#### POST /api/analytics

Run portfolio-level intelligence analysis. Triggers clustering and full
analysis pipeline.

**Request body (optional):**
```json
{ "workflowIds": ["uuid"] }
```

**Response 200:**
```json
{
  "intelligence": "object (PortfolioIntelligence)",
  "definitions": ["...ProcessDefinition summaries"],
  "insights": ["...ProcessInsight objects"]
}
```

**Errors:** `401`, `404` no analyzable workflows, `500`.

#### POST /api/analytics/events

Persist batched product analytics events. Auth is optional (supports
pre-login tracking). Events are capped at 100 per request.

**Request body:**
```json
{
  "events": [
    {
      "event": "string (event name)",
      "url": "string (optional)",
      "source": "client | server (optional)",
      "...": "additional properties stored as JSON"
    }
  ]
}
```

**Response 200:** `{ "ok": true, "received": 0 }`

#### GET /api/analytics/events

Admin-only. Aggregated product analytics dashboard data.

**Query params:** `days` (int, default 30).

**Response 200:**
```json
{
  "summary": { "totalEvents": 0, "uniqueUsers": 0, "periodDays": 30, "since": "ISO 8601" },
  "eventCounts": { "event_name": 0 },
  "dailyCounts": { "2026-04-12": { "event_name": 0 } },
  "funnels": {
    "activation": [{ "step": "string", "count": 0, "dropoff": 0, "rate": 0 }],
    "conversion": [{ "step": "string", "count": 0, "dropoff": 0, "rate": 0 }]
  },
  "topPages": [{ "path": "string", "count": 0 }]
}
```

**Errors:** `401`, `403` not admin.

---

### 3.6 API Keys

#### GET /api/keys

List the user's API keys (no hashes exposed).

**Response 200:**
```json
{
  "keys": [
    { "id": "uuid", "prefix": "ldg_a1b2", "label": "string", "lastUsedAt": "ISO 8601 | null", "createdAt": "ISO 8601" }
  ]
}
```

#### POST /api/keys

Create a new API key. The raw key is returned once and never stored.

**Request body (optional):** `{ "label": "string" }`

**Response 201:**
```json
{ "key": "ldg_...", "prefix": "ldg_a1b2", "message": "Save this key -- it will not be shown again." }
```

#### DELETE /api/keys

Delete an API key.

**Request body:** `{ "id": "uuid" }`

**Response 200:** `{ "ok": true }`

**Errors:** `401`, `404` key not found.

---

### 3.7 Tags

#### GET /api/tags

List all tags for the user with workflow counts.

**Response 200:**
```json
{
  "tags": [
    { "id": "uuid", "name": "string", "color": "#hex", "workflowCount": 0, "createdAt": "ISO 8601" }
  ]
}
```

#### POST /api/tags

Create a tag. Max 50 tags per user. Name max 32 chars, must be unique per user.

**Request body:**
```json
{ "name": "string", "color": "#hex (optional)" }
```

**Response 201:** `{ "tag": { "id": "uuid", "name": "string", "color": "#hex" } }`

**Errors:** `400` invalid, `409` duplicate name, `422` tag limit reached.

#### PATCH /api/tags/[id]

Update a tag's name or color.

**Request body:** `{ "name": "string (optional)", "color": "#hex (optional)" }`

**Response 200:** `{ "tag": { "...updated tag" } }`

#### DELETE /api/tags/[id]

Delete a tag and remove all workflow associations.

**Response 200:** `{ "ok": true }`

---

### 3.8 Sharing

#### GET /api/share/[token]

Public endpoint (no auth). Returns a read-only view of a shared workflow.
Only exposes SOP and report artifacts, not raw evidence or source bundles.
Increments view count.

**Response 200:**
```json
{
  "workflow": {
    "title": "string",
    "stepCount": 0,
    "durationMs": 0,
    "phaseCount": 0,
    "confidence": 0.0,
    "toolsUsed": ["string"],
    "createdAt": "ISO 8601"
  },
  "sop": "object | null",
  "report": "object | null"
}
```

**Errors:** `404` not found or sharing disabled.

---

### 3.9 Teams

#### GET /api/teams

List teams the user belongs to, with members.

**Response 200:**
```json
{
  "teams": [
    {
      "id": "uuid",
      "name": "string",
      "slug": "string",
      "role": "owner | admin | member | viewer",
      "memberCount": 0,
      "members": [{ "id": "uuid", "email": "string", "name": "string | null", "role": "string" }],
      "createdAt": "ISO 8601"
    }
  ]
}
```

#### POST /api/teams

Create a new team. Caller becomes owner.

**Request body:** `{ "name": "string (min 2 chars)" }`

**Response 200:** `{ "id": "uuid", "name": "string", "slug": "string" }`

#### GET /api/teams/[id]/members

List team members. Caller must be a team member.

**Response 200:**
```json
{
  "members": [
    { "id": "uuid", "email": "string", "name": "string | null", "role": "string", "joinedAt": "ISO 8601" }
  ]
}
```

**Errors:** `403` not a member.

#### DELETE /api/teams/[id]/members

Remove a team member. Caller must be owner or admin. Cannot remove the owner.

**Request body:** `{ "userId": "uuid" }`

**Response 200:** `{ "ok": true }`

**Errors:** `400` cannot remove owner, `403` not owner/admin.

#### POST /api/teams/[id]/invite

Create an invite link. Caller must be owner or admin. Invite expires in 7 days.

**Request body:** `{ "email": "string", "role": "member | viewer (default: member)" }`

**Response 200:**
```json
{ "inviteId": "uuid", "inviteUrl": "string", "email": "string", "expiresAt": "ISO 8601" }
```

**Errors:** `400` invalid email or already a member, `403` not owner/admin.

#### GET /api/teams/[id]/invite

List pending (unexpired, unaccepted) invites. Caller must be a team member.

**Response 200:**
```json
{
  "invites": [
    { "id": "uuid", "email": "string", "role": "string", "expiresAt": "ISO 8601", "createdAt": "ISO 8601" }
  ]
}
```

#### POST /api/teams/join

Accept a team invite.

**Request body:** `{ "token": "string" }`

**Response 200:**
```json
{ "teamId": "uuid", "teamName": "string", "role": "string" }
```

**Errors:** `400` already used or expired, `401`, `404` invalid token.

---

### 3.10 Billing

#### POST /api/billing/checkout

Create a Stripe Checkout Session for Pro subscription.

**Response 200:** `{ "url": "string (Stripe checkout URL)" }`

**Errors:** `400` already subscribed, `401`, `404`, `503` billing not configured.

#### POST /api/billing/portal

Create a Stripe Billing Portal session for subscription management.

**Response 200:** `{ "url": "string (Stripe portal URL)" }`

**Errors:** `400` no billing account, `401`, `404`.

#### POST /api/billing/webhook

Stripe webhook handler. Authenticated via `stripe-signature` header.

**Events handled:** `checkout.session.completed`,
`customer.subscription.updated`, `customer.subscription.deleted`,
`invoice.payment_failed`.

**Response 200:** `{ "received": true }`

**Errors:** `400` missing/invalid signature.

---

### 3.11 Account

#### GET /api/account

Get current user profile and subscription info.

**Response 200:**
```json
{
  "email": "string",
  "name": "string | null",
  "plan": "free | pro | team",
  "subscriptionStatus": "trialing | active | past_due | canceled | none",
  "uploadCount": 0,
  "createdAt": "ISO 8601"
}
```

---

### 3.12 Engagement

#### GET /api/streaks

Get user recording streaks and milestones.

**Response 200:**
```json
{
  "data": {
    "currentStreak": 0,
    "longestStreak": 0,
    "monthlyCount": 0,
    "totalCount": 0,
    "lastRecordedDate": "YYYY-MM-DD | null",
    "milestones": [
      { "label": "string", "threshold": 0, "isReached": false }
    ]
  }
}
```

---

### 3.13 Utility

#### GET /api/health

Container health check. No auth required.

**Response 200:** `{ "status": "ok", "timestamp": "ISO 8601" }`

**Response 503:** `{ "status": "error", "error": "Database connection failed", "timestamp": "ISO 8601" }`

#### POST /api/sample-workflow

Generate a sample "Create Purchase Order" workflow for new users. Idempotent
per user (returns existing if already created).

**Response 200:** `{ "id": "uuid", "alreadyExists": true }` (if exists)

**Response 200:** `{ "id": "uuid" }` (if created)

**Errors:** `401`, `500`.

#### POST /api/admin/bootstrap

Promote current user to admin. Only works when zero admins exist in the
system. Permanently disabled once an admin exists.

**Response 200:**
```json
{ "ok": true, "message": "You are now an admin. Log out and log back in for changes to take effect." }
```

**Errors:** `401`, `403` admin already exists.

---

## 4. Plan Limits

| Plan | Upload Limit |
|------|-------------|
| `free` | 5 workflows |
| `pro` | Unlimited |

Enforced on both `POST /api/upload` and `POST /api/sync`. Returns `403`
with `code: "UPGRADE_REQUIRED"` when exceeded.

---

## 5. Error Reference

All error responses include at minimum:

```json
{ "error": "Human-readable message" }
```

Common HTTP status codes used:

| Code | Meaning |
|------|---------|
| `400` | Bad request / validation failure |
| `401` | Not authenticated |
| `403` | Forbidden (plan limit, permission) |
| `404` | Resource not found |
| `409` | Conflict (duplicate) |
| `413` | Payload too large (10 MB limit) |
| `422` | Unprocessable (validation/processing failure) |
| `500` | Internal server error |
| `503` | Service unavailable (billing not configured) |

---

## 6. Implementation Notes

- **No pagination:** `GET /api/workflows` returns all matching workflows.
  Pagination is not implemented. This is acceptable for current user volumes.
- **No rate limiting:** No rate limiting is implemented at the application
  layer. Relies on infrastructure-level controls if needed.
- **Synchronous processing:** All ingestion processing (normalization,
  segmentation, process engine, templates, insights) runs synchronously in
  the request handler. No job queue exists.
- **Fire-and-forget operations:** Auto-clustering after upload, view count
  increments, and API key last-used timestamps run asynchronously without
  awaiting completion.
- **Analytics events batch size:** `POST /api/analytics/events` silently
  caps at 100 events per request.
