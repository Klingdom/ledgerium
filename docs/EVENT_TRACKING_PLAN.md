# Ledgerium AI — EVENT_TRACKING_PLAN.md

**Status:** ACTIVE — implement before beta launch
**Version:** 1.0
**Date:** 2026-04-16
**Upstream artifacts:** METRICS.md, PRD_v2.md, UX_FLOWS.md, SUCCESS_METRICS.md

---

## Naming Convention

Format: `noun.verb` or `noun_verb` (snake_case, no hyphens)
- Noun = the entity being acted on (workflow, recording, sop, team, plan, etc.)
- Verb = past tense action (started, completed, viewed, exported, failed, etc.)
- Extension events use dot notation prefix: `recording.started`, `recording.stopped`
- Web app events use underscore: `workflow_uploaded`, `sop_viewed`
- Do not use present tense. Events describe something that already happened.
- Do not encode user identity in the event name. Identity is a property.

Properties follow these rules:
- All IDs are opaque strings (never expose DB primary keys to third-party analytics tools)
- No raw PII: no email addresses, no full names, no IP addresses in event properties
- Duration values in milliseconds (durationMs)
- Counts as integers
- Enum values in snake_case lowercase strings
- Boolean properties use `is_` or `has_` prefix

---

## User Properties (Identity Layer)

These properties are attached to the user identity record in PostHog at login and signup. They are NOT repeated in every event — PostHog merges them automatically.

| Property | Type | Source | Notes |
|----------|------|--------|-------|
| `user_id` | string | DB | Opaque ID — use PostHog distinct_id |
| `plan` | enum | DB user.plan | free / starter / team / growth / enterprise |
| `signup_date` | ISO date | DB user.createdAt | Date only, not time |
| `days_since_signup` | integer | computed | Computed at identify call |
| `workflow_count` | integer | DB | Total workflows uploaded |
| `is_admin` | boolean | DB user.isAdmin | Used to exclude admin users from product metrics |
| `has_team` | boolean | DB | Whether user belongs to any team |
| `team_size` | integer | DB | Member count of their team (0 if no team) |
| `has_exported` | boolean | DB | Whether user has exported any workflow |
| `has_shared` | boolean | DB | Whether user has shared any workflow |
| `extension_configured` | boolean | DB | Whether user has created an API key |

Call `identifyAnalyticsUser(userId, properties)` after every login and signup. Refresh after plan change.

---

## Event Taxonomy — 28 Critical Events

---

### Category 1: Authentication and Onboarding (4 events)

---

**`signup_completed`**
- When: User successfully creates an account and the signup API returns 200
- Trigger location: Server-side in `/api/auth/signup` POST handler
- Properties:
  - `method`: string — "email" (only option currently)
  - `referrer`: string — `document.referrer` trimmed to domain only, no path
- Why it matters: Top of every funnel. Without this event cohort analysis is impossible. Every rate is a % of this baseline.
- Implementation note: Fire server-side via `trackServer()`. Do NOT fire on OAuth redirects without confirming it is a new account.

---

**`login_completed`**
- When: User successfully authenticates (new session created)
- Trigger location: Client-side after NextAuth `signIn` success callback
- Properties:
  - `is_returning`: boolean — true if user has any prior `login_completed` event
- Why it matters: Daily active user signal. Distinguish new logins from repeat sessions.

---

**`onboarding_step_completed`**
- When: User completes a named step in the onboarding flow (if onboarding modal/wizard is shown)
- Trigger location: Client-side, on each onboarding step confirmation
- Properties:
  - `step`: string — "extension_install_prompt" / "api_key_created" / "sample_workflow_viewed" / "first_recording_prompted"
  - `step_index`: integer — 0-based position in flow
- Why it matters: Identifies where users drop out of onboarding before their first recording.

---

**`extension_api_key_created`**
- When: User creates their first API key (the key that connects extension to web app)
- Trigger location: Server-side in `/api/keys` POST handler, on first key creation only
- Properties:
  - `is_first_key`: boolean — always true for this event (fire this event name only once per user)
- Why it matters: This is the "extension configured" milestone in the activation funnel. Without this step, no sync is possible.

---

### Category 2: Recording Lifecycle (5 events — extension-side)

Extension events use dot notation. They must include `user_id` because the extension has no session cookie.

---

**`recording.started`**
- When: User clicks Record in the extension sidebar and recording begins
- Trigger location: Extension background script, on session start
- Properties:
  - `user_id`: string
  - `session_id`: string — local UUID for this recording session
  - `tab_url_domain`: string — registered domain only, no path, no query params (privacy)
  - `trigger`: string — "manual" (only mode currently)
- Why it matters: Denominator for recording completion rate (KPI-003). Without this event we cannot measure drop-off between intent and delivery.

---

**`recording.stopped`**
- When: User clicks Stop in the extension sidebar
- Trigger location: Extension background script
- Properties:
  - `user_id`: string
  - `session_id`: string
  - `duration_ms`: integer — recording wall-clock duration
  - `event_count`: integer — number of raw events captured
  - `stop_reason`: string — "manual" / "tab_closed" / "extension_suspended"
- Why it matters: Pair with `recording.started` to compute session duration distribution. Indicates how long workflows actually take to record.

---

**`recording.upload_attempted`**
- When: Extension begins the POST to `/api/sync`
- Trigger location: Extension background script, before fetch()
- Properties:
  - `user_id`: string
  - `session_id`: string
  - `payload_size_kb`: integer — approximate
- Why it matters: First signal of upload intent. If `workflow_uploaded` does not follow within 60 seconds, the upload is stuck or failed.

---

**`recording.upload_failed`**
- When: Extension POST to `/api/sync` returns non-200 or network error
- Trigger location: Extension background script, in fetch catch block
- Properties:
  - `user_id`: string
  - `session_id`: string
  - `http_status`: integer — 0 if network error
  - `error_code`: string — from response body `error` field if available
- Why it matters: Upload reliability guardrail (KPI-007). Distinguishes extension-side failures from server-side failures.

---

**`recording.discarded`**
- When: User discards a recording without uploading
- Trigger location: Extension UI, on discard confirmation
- Properties:
  - `user_id`: string
  - `session_id`: string
  - `duration_ms`: integer
  - `event_count`: integer
  - `reason`: string — "user_cancelled" / "too_short" / "empty"
- Why it matters: Reveals how often users start recordings they do not complete. High discard rate suggests confusion about when/how to record.

---

### Category 3: Workflow Lifecycle — Web App (5 events)

---

**`workflow_uploaded`**
- When: `/api/sync` successfully persists a workflow and triggers the pipeline
- Trigger location: Server-side in `/api/sync` POST handler, after DB write succeeds
- Properties:
  - `user_id`: string
  - `workflow_id`: string — opaque DB ID
  - `step_count`: integer
  - `system_count`: integer — length of toolsUsed array
  - `duration_ms`: integer — recording duration
  - `is_first_workflow`: boolean
  - `plan`: string — user's plan at upload time
- Why it matters: Numerator for recording completion rate. Denominator for all per-workflow analysis. Critical funnel step.

---

**`workflow_processing_completed`**
- When: The 9-stage process engine pipeline finishes for a workflow
- Trigger location: Server-side, after all artifact writes complete
- Properties:
  - `user_id`: string
  - `workflow_id`: string
  - `processing_duration_ms`: integer — time from upload to completion
  - `artifacts_generated`: array of strings — which artifact types were produced
  - `confidence_score`: float — 0-1
  - `sop_readiness`: string — "ready" / "partial" / "not_ready"
- Why it matters: Pipeline health monitoring. If processing_duration_ms p90 exceeds 3 minutes, the SOP delivery promise is broken.

---

**`workflow_viewed`**
- When: User opens a workflow detail page (`/workflows/[id]`)
- Trigger location: Client-side, on page mount
- Properties:
  - `workflow_id`: string
  - `is_shared_view`: boolean — true if accessed via share token
  - `source`: string — "dashboard" / "direct_link" / "shared_link" / "search"
  - `workflow_age_days`: integer — days since created
- Why it matters: View counts per workflow, shared view reach, time-to-first-view.

---

**`sop_section_viewed`**
- When: User scrolls to or clicks into the SOP section on the workflow report
- Trigger location: Client-side, Intersection Observer on SOP section (fire once per visit, not on every scroll re-entry)
- Properties:
  - `workflow_id`: string
  - `sop_readiness`: string — "ready" / "partial" / "not_ready"
  - `is_first_sop_view_ever`: boolean — checked via localStorage key
- Why it matters: Activation KPI (KPI-001) requires knowing when a user first sees SOP output. This is more precise than `workflow_viewed` because the report page has many sections — reaching the SOP section is the actual value moment.
- Note: For the `first_sop_viewed` event referenced in SUCCESS_METRICS.md, fire when `is_first_sop_view_ever = true`.

---

**`workflow_deleted`**
- When: User confirms workflow deletion
- Trigger location: Server-side in `DELETE /api/workflows/[id]`
- Properties:
  - `workflow_id`: string
  - `workflow_age_days`: integer
  - `had_exports`: boolean
  - `had_shares`: boolean
- Why it matters: Deletion patterns reveal which workflows users considered failures. High deletion rate for young workflows indicates output quality problems.

---

### Category 4: Feature Engagement (7 events)

---

**`workflow_exported`**
- When: User triggers a successful export download
- Trigger location: Server-side in export API routes (`/api/workflows/[id]/export-*`)
- Properties:
  - `workflow_id`: string
  - `format`: string — "json_report" / "json_sop" / "json_full" / "bpmn" / "markdown" / "pdf"
  - `is_first_export_ever`: boolean
- Why it matters: Export is the primary "take value outside Ledgerium" action. It measures whether the output is good enough to use in other tools. Also a leading indicator of upgrade intent.

---

**`share_link_created`**
- When: User enables sharing on a workflow (first time for that workflow)
- Trigger location: Server-side in `POST /api/workflows/[id]/share`
- Properties:
  - `workflow_id`: string
  - `workflow_age_days`: integer
- Why it matters: Sharing is a distribution event and a quality signal. A user who shares has judged the output good enough for an audience.

---

**`shared_workflow_viewed`**
- When: A share token is accessed at `/api/share/[token]`
- Trigger location: Server-side in `GET /api/share/[token]`
- Properties:
  - `token`: string — hashed, never raw
  - `owner_user_id`: string — the workflow owner
  - `is_logged_in_viewer`: boolean — whether the viewer has a session
- Why it matters: Measures actual reach of shared output. K-factor proxy: views per share.

---

**`analysis_run`**
- When: User triggers intelligence analysis (`POST /api/workflows/[id]/analyze`)
- Trigger location: Server-side
- Properties:
  - `workflow_id`: string
  - `plan`: string — user's plan (Team+ required for this feature)
  - `workflow_step_count`: integer
- Why it matters: Measures engagement with the intelligence layer. Users who run analysis are deeper in the product value stack. Also validates that the plan-gating is working.

---

**`agent_intelligence_viewed`**
- When: User views the agent intelligence section of a workflow report
- Trigger location: Client-side, on section scroll-into-view (once per page load)
- Properties:
  - `workflow_id`: string
  - `ai_opportunity_score`: integer — 0-100
  - `automation_candidate_count`: integer
- Why it matters: Measures reach of Phase 2 intelligence features. Informs whether agent composition output is being consumed or ignored.

---

**`sop_usefulness_response`**
- When: User responds to the "Is this SOP usable?" prompt (to be implemented)
- Trigger location: Client-side, on survey response submission
- Properties:
  - `workflow_id`: string
  - `response`: string — "yes_as_is" / "minor_edits" / "major_rework" / "not_useful"
  - `days_since_first_sop_view`: integer
- Why it matters: KPI-005. Direct signal of output quality. This is the most important qualitative metric for beta. The prompt should appear after a user has viewed the SOP section and waited at least 30 seconds.
- Implementation note: Prompt must be non-blocking and dismissible. Store response in DB, not just analytics, to enable per-user follow-up.

---

**`portfolio_workflow_added`**
- When: User adds a workflow to a portfolio
- Trigger location: Server-side in portfolio workflow endpoints
- Properties:
  - `workflow_id`: string
  - `portfolio_id`: string
  - `portfolio_workflow_count_after`: integer
- Why it matters: Portfolio usage signals users who are building a process library — a strong expansion and upgrade signal.

---

### Category 5: Conversion (5 events)

---

**`plan_limit_hit`**
- When: A request is rejected because the user has hit their plan's recording or feature limit
- Trigger location: Server-side in `checkRecordingLimit()` and `checkFeatureAccess()`, when they return denied
- Properties:
  - `limit_type`: string — "recording_count" / "feature_access" / "team_size"
  - `feature_name`: string — the specific feature/limit that was hit
  - `current_usage`: integer — user's current value for this limit
  - `plan_limit`: integer — their plan's ceiling
  - `plan`: string — current plan
- Why it matters: This is the demand signal for upgrades. The location and frequency of limit hits informs which limits are appropriately set and which create unnecessary friction.

---

**`upgrade_prompt_viewed`**
- When: An upgrade prompt, paywall, or upsell UI element is rendered to the user
- Trigger location: Client-side, on component mount (once per session per prompt location)
- Properties:
  - `prompt_location`: string — "workflow_limit_banner" / "feature_gate_modal" / "pricing_page" / "dashboard_cta"
  - `triggered_by`: string — "limit_hit" / "feature_click" / "organic"
  - `plan_shown`: string — which plan is being promoted
- Why it matters: Numerator for conversion funnel step 2. Without this we cannot measure prompt-to-click rate.

---

**`upgrade_clicked`**
- When: User clicks an upgrade/buy CTA
- Trigger location: Client-side, on CTA click
- Properties:
  - `click_location`: string — same values as `prompt_location`
  - `plan_selected`: string — which plan they clicked toward
  - `interval_selected`: string — "monthly" / "annual"
- Why it matters: Intent signal before checkout. Allows measurement of prompt-to-click conversion.

---

**`checkout_started`**
- When: Stripe Checkout Session is created for the user
- Trigger location: Server-side in `/api/billing/checkout` (already implemented)
- Properties: (already tracked via `trackServer` — enhance with these)
  - `user_id`: string
  - `plan`: string
  - `interval`: string — "monthly" / "annual"
  - `days_since_signup`: integer
  - `workflow_count_at_checkout`: integer
- Why it matters: Distinguishes users who entered Stripe from users who completed payment.

---

**`subscription_created`**
- When: Stripe webhook confirms a new subscription is active
- Trigger location: Server-side in `/api/billing/webhook`, on `customer.subscription.created`
- Properties:
  - `user_id`: string
  - `plan`: string
  - `interval`: string
  - `amount_cents`: integer
  - `days_since_signup`: integer
  - `workflow_count_at_conversion`: integer
- Why it matters: The revenue event. Every conversion analysis starts here.

---

### Category 6: Errors and Reliability (3 events)

---

**`upload_failed`**
- When: The `/api/sync` endpoint returns an error, or the process pipeline fails fatally after upload
- Trigger location: Server-side
- Properties:
  - `error_type`: string — "validation_failed" / "pipeline_error" / "storage_error" / "rate_limited"
  - `http_status`: integer
  - `plan`: string — user's plan
- Why it matters: Upload reliability guardrail. If rate > 5%, investigate immediately.

---

**`processing_failed`**
- When: The process engine pipeline throws an unhandled error for a workflow
- Trigger location: Server-side, in pipeline error handler
- Properties:
  - `workflow_id`: string
  - `stage`: string — which of the 9 pipeline stages failed
  - `error_type`: string
- Why it matters: Separates upload failures from processing failures. Pipeline errors prevent SOP delivery.

---

**`api_error`**
- When: Any API route returns 500
- Trigger location: Server-side, in global error handler
- Properties:
  - `endpoint`: string — route pattern, not full URL (e.g. "/api/workflows/[id]/analyze")
  - `http_status`: integer
  - `error_type`: string
- Why it matters: Operational health monitoring. Spike in api_error indicates a regression.

---

## Events NOT to Track

These are explicitly excluded to keep the taxonomy clean:

- Individual keystrokes or form field contents (PII)
- Full page URLs with query strings containing user data
- Mouse movements or scroll depth (not decision-relevant for this stage)
- Server-side rendering timings (operational, not product)
- Every API request (use server logs for that — not analytics)
- Raw workflow content or SOP text (trust-first: user content stays in the product DB, not analytics tools)

---

## Extension Event Delivery

Extension events (`recording.*`) cannot use the standard `track()` function because the extension has no web app session cookie. Delivery approach:

1. Buffer events in extension `chrome.storage.local`
2. On `recording.upload_attempted`, include the buffered recording events as a `_telemetry` field in the sync payload
3. The `/api/sync` route extracts `_telemetry` and calls `trackServer()` for each event, enriched with the resolved `user_id`
4. Discard telemetry payload if total size exceeds 10 KB — the recording data takes priority

This keeps extension telemetry out of the critical path and avoids a separate analytics endpoint in the extension manifest permissions.
