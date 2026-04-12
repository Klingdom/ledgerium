# Ledgerium AI — METRICS.md

**Version:** 1.0
**Phase:** Phase 1 MVP (Beta)
**Date:** 2026-04-12
**Owner:** Analytics
**Status:** Active — governs all Phase 1 measurement

---

## 1. Measurement Philosophy

Every feature must define:
1. Baseline — what is true before the change
2. Expected improvement — what should change and by how much
3. Measurable outcome — how we verify it changed

Phase 1 has no prior beta data. All targets below are first-cohort judgment estimates.
Baselines will be established from the first 2-week beta cohort (5-15 users) and carried
forward. No target is locked until baseline data exists.

Rule: if a metric cannot be acted on, do not track it.

---

## 2. North Star Metric

**Activated users within 7 days of signup**

Definition: A user who has completed signup, uploaded or synced at least one workflow,
and viewed the SOP tab for that workflow — all within 7 days of account creation.

This is the one number that tells us whether the product delivers its core value promise
(record a workflow, get a usable SOP) to a real user. If this number is healthy, every
other metric follows. If it is not, nothing else matters yet.

---

## 3. KPI Framework

### 3.1 Acquisition

| Metric | Definition | Measurement Method | Beta Target |
|--------|------------|--------------------|-------------|
| Signups | Unique accounts created | `signup_completed` event count | 5–15 (invite-gated) |
| Extension installs | Unique users who reach the API key page post-signup | Onboarding step event `onboarding_step_completed: api_key_generated` | >= 70% of signups |
| Time to first upload | Minutes from `signup_completed` to `workflow_uploaded` | PostHog funnel time-between-steps | Target < 10 min |

### 3.2 Activation

Activation = signup → first upload → first SOP view. This is the core loop.

| Metric | Definition | Measurement Method | Beta Target |
|--------|------------|--------------------|-------------|
| Activation rate | Users who reach `first_sop_viewed` / total signups | PostHog funnel: `signup_completed` → `first_workflow_uploaded` → `first_sop_viewed` | >= 30% |
| Absolute activations | Count of users who complete activation | Same funnel, user count | >= 5 of 15 invited |
| Upload success rate | `workflow_uploaded` / (`workflow_uploaded` + `upload_failed`) | Event ratio in PostHog or DB | >= 90% |
| Zero-step sessions | Workflows uploaded where derived step count = 0 | `workflow_uploaded` events where `stepCount = 0` | 0 (failure signal) |

### 3.3 Engagement

| Metric | Definition | Measurement Method | Beta Target |
|--------|------------|--------------------|-------------|
| Workflows per activated user | Total uploads / activated users in period | DB: workflow count grouped by userId | >= 2 in first 7 days |
| SOP tab view rate | Users who view SOP tab / users who upload a workflow | `workflow_viewed` where `tab = sop` / `workflow_uploaded` | >= 80% |
| Process map view rate | Users who view map tab / users who upload a workflow | `workflow_viewed` where `tab = workflow` / `workflow_uploaded` | >= 50% |
| Export rate | Users who export / users who view SOP | `workflow_exported` / `first_sop_viewed` | >= 30% |
| Share created | Distinct users who create a share link | `share_link_created` unique user count | >= 2 users |

### 3.4 Retention

| Metric | Definition | Measurement Method | Beta Target |
|--------|------------|--------------------|-------------|
| Day-7 return | Users who upload a second workflow within 7 days of first | PostHog retention: `workflow_uploaded` repeat event | >= 25% of activated users |
| Share token use | Workflows where a share link was actually accessed | `shared_workflow_viewed` distinct token count | >= 2 |

### 3.5 Quality (Output Trustworthiness)

These are not vanity metrics — they tell us if the pipeline is producing usable output.

| Metric | Definition | Measurement Method | Beta Target |
|--------|------------|--------------------|-------------|
| SOP usability (survey) | % respondents rating SOP "usable as-is or minor edits" | Post-session survey, question 1 | >= 50% |
| Avg steps per workflow | Mean `stepCount` from `workflow_uploaded` events | PostHog property average | Track only — no beta target |
| Confidence score distribution | Distribution of step confidence values | DB: `derived_steps.json` artifacts, confidence field | Track only |
| Redaction rate | % of sessions with at least one policy redaction | `policy_log.json` non-empty / total uploads | Track only |

---

## 4. Event Taxonomy

### 4.1 Implemented Events (confirmed in code as of 2026-04-12)

Source: `apps/web-app/src/lib/analytics.ts` + grep of call sites.

**Authentication**
- `signup_completed` — fired at `/signup` on successful account creation
- `login_completed` — fired at `/login` on success
- `login_failed` — fired at `/login` with `reason: string`
- `logout` — defined in taxonomy; call site not confirmed in grep

**Activation milestones** (deduplicated via localStorage)
- `first_workflow_uploaded` — props: `stepCount`, `systemCount`; fired from `trackActivation('first_workflow')`
- `first_sop_viewed` — props: `workflowId`; fired from `trackActivation('first_sop')`
- `first_process_map_viewed` — props: `workflowId`; fired from `trackActivation('first_map')`
- `first_export` — props: `format`; fired from `trackActivation('first_export')`

**Workflow lifecycle**
- `workflow_uploaded` — props: `stepCount`, `systemCount`, `durationMs`; fired at `/upload` on success
- `upload_failed` — props: `error`; fired at `/upload` on failure
- `workflow_viewed` — props: `workflowId`, `tab`; fired on workflow detail page load
- `tab_switched` — props: `tab`, `workflowId`; fired on tab change in workflow detail and process group explorer
- `workflow_exported` — props: `workflowId`, `format`; fired on export click
- `workflow_deleted` — props: `workflowId`; fired from dashboard
- `workflow_favorited` / `workflow_unfavorited` — props: `workflowId`; fired from dashboard
- `sample_workflow_loaded` — fired when sample workflow is generated

**Sharing**
- `share_link_created` — props: `workflowId`
- `share_link_copied` — props: `workflowId`
- `share_link_disabled` — props: `workflowId`
- `shared_workflow_viewed` — props: `token`; fired on public share page load

**Billing** (server-side via `trackServer`)
- `checkout_started` — fired at `/api/billing/checkout`
- `subscription_created` — props: `userId`, `plan`; fired at `/api/billing/webhook`
- `upgrade_prompt_viewed` — props: `location`, `plan`; defined, call sites not confirmed
- `upgrade_clicked` — props: `location`; defined, call sites not confirmed

**Navigation**
- `page_viewed` — props: `path`; confirmed call sites: `/dashboard`, `/upload`, `/teams`, `/recommendations`, `/analytics`, `/analytics/process/[id]`

**Server-side**
- `workflow_created` — fired at `/api/upload` via `trackServer`; goes to console log only (not PostHog)

**Process analysis**
- `process_analysis_triggered` — fired from dashboard
- `analysis_run` — fired from analytics page
- `insights_viewed` — props: `workflowId`, `insightCount`; defined, call sites not confirmed

### 4.2 Instrumentation Gaps

Events defined in taxonomy but with no confirmed call sites:
- `onboarding_started`, `onboarding_step_completed`, `onboarding_completed`, `onboarding_dismissed`
- `logout`
- `upgrade_prompt_viewed`, `upgrade_clicked`, `subscription_canceled`, `payment_failed`, `plan_limit_hit`
- `insights_viewed`
- `workflow_shared_with_user`, `workflow_shared_with_team`
- `team_created`, `team_invite_sent`, `team_invite_accepted`, `team_member_removed`
- `tag_created`, `tag_deleted`, `tag_assigned`, `tag_removed` (tag_filter_applied IS confirmed)
- `api_error`, `client_error`

Critical gaps for beta measurement:
1. **Onboarding funnel** — `onboarding_step_completed` is undefined at call sites; cannot measure where users drop in the post-signup flow
2. **Logout** — not firing; PostHog identity will not be reset, polluting user sessions
3. **Extension-side events** — no events are emitted from the Chrome extension itself; recording start/stop, capture failures, and upload-from-extension are invisible in analytics

### 4.3 Events Not Yet Defined (Recommended Additions)

These are missing from the taxonomy entirely:

| Event | Trigger | Required Properties | Priority |
|-------|---------|---------------------|----------|
| `extension_recording_started` | Extension: user clicks Start | `session_id`, `activity_name` | High |
| `extension_recording_stopped` | Extension: user clicks Stop | `session_id`, `event_count`, `step_count`, `duration_ms` | High |
| `extension_upload_attempted` | Extension: auto-sync triggered | `session_id` | High |
| `extension_upload_succeeded` | Extension: upload returns 200 | `session_id`, `workflow_id` | High |
| `extension_upload_failed` | Extension: upload returns error | `session_id`, `error` | High |
| `session_worker_terminated` | Extension: service worker killed mid-session | `session_id`, `event_count_lost` | Medium |
| `onboarding_step_completed` | Web: user completes a post-signup onboarding step | `step` (e.g., `api_key_generated`, `extension_installed`) | High |

---

## 5. Funnel Definitions

### Funnel 1: Activation (Primary)

Goal: Measure conversion from signup to first SOP viewed.

| Step | Event | Drop-off Interpretation |
|------|-------|------------------------|
| 1. Signed up | `signup_completed` | Top of funnel |
| 2. Reached upload page | `page_viewed` where `path = /upload` | Failed onboarding navigation |
| 3. Uploaded first workflow | `first_workflow_uploaded` | Upload errors or extension install failure |
| 4. Viewed workflow detail | `workflow_viewed` | Navigational friction after upload |
| 5. Viewed SOP tab | `first_sop_viewed` | SOP output was missing or confusing |

Target: >= 30% from step 1 to step 5.

Gap: Steps 1-2 cannot be measured accurately until `onboarding_step_completed` is wired.

### Funnel 2: Extension-to-SOP (Full Loop)

Goal: Measure the complete product loop including capture.

| Step | Event | Source |
|------|-------|--------|
| 1. Extension recording started | `extension_recording_started` | Extension (NOT YET INSTRUMENTED) |
| 2. Recording stopped | `extension_recording_stopped` | Extension (NOT YET INSTRUMENTED) |
| 3. Upload succeeded | `extension_upload_succeeded` | Extension (NOT YET INSTRUMENTED) |
| 4. SOP viewed | `first_sop_viewed` | Web app |

This funnel cannot be built until extension-side events are added.

### Funnel 3: Share (Distribution Signal)

| Step | Event |
|------|-------|
| 1. Workflow uploaded | `workflow_uploaded` |
| 2. SOP viewed | `workflow_viewed` where `tab = sop` |
| 3. Share link created | `share_link_created` |
| 4. Share link accessed | `shared_workflow_viewed` |

---

## 6. Dashboard Specifications

### Dashboard 1: Beta Health (Daily)

Purpose: Morning check during beta. Answers "is the beta working?"

Panels:
- Activation funnel (steps 1-5 from Funnel 1) — conversion % at each step
- Daily signups and activations — time series, 7-day window
- Upload success rate — `workflow_uploaded` / (`workflow_uploaded` + `upload_failed`)
- Zero-step uploads — count of `workflow_uploaded` where `stepCount = 0`
- Share link accesses — `shared_workflow_viewed` count

Source: PostHog (requires `NEXT_PUBLIC_POSTHOG_KEY` connected — currently not configured per BETA_LAUNCH_PLAN.md)

### Dashboard 2: User Journey (Per-User Audit)

Purpose: Diagnose individual beta user blockers.

Panels:
- User event timeline — all events for a given `userId` in chronological order
- Activation status per user — which funnel steps each invited user has completed
- Time gaps between funnel steps — where each user paused or dropped

Source: PostHog person profiles + internal `analytics_events` table

### Dashboard 3: Output Quality

Purpose: Verify the pipeline is producing usable output.

Panels:
- Mean and median `stepCount` across all uploaded workflows
- `systemCount` distribution
- Upload-to-SOP-view time distribution
- Export format breakdown from `workflow_exported`

Source: PostHog event properties + DB queries on `workflows` table

---

## 7. Experiment Framework

No A/B tests are planned for Phase 1 beta. The beta is a validity test, not an
optimization test. The experiment framework below applies when open beta begins.

For any experiment:
1. Define the hypothesis: "Changing X will increase [metric] by Y%"
2. Define the primary metric and guardrail metrics before launch
3. Use PostHog feature flags to gate variants
4. Minimum beta size before statistical significance: not applicable at 5-15 users —
   Phase 1 decisions are qualitative + funnel-based, not significance-tested
5. Decision rule: document in advance; do not move the goalposts after results are in

---

## 8. Instrumentation Audit

### What is built and connected

| Capability | Status | Notes |
|-----------|--------|-------|
| `analytics.ts` event taxonomy | Built | 50+ events defined with TypeScript types |
| `posthog.ts` client wrapper | Built | Wraps posthog-js; no-op if key not set |
| `track()` client calls | Partially wired | Auth, upload, workflow detail, dashboard, share page confirmed |
| `trackServer()` server calls | Partially wired | upload route and billing webhook only; logs to console, no PostHog server SDK |
| `trackActivation()` deduplication | Built | Uses localStorage; confirmed at upload page and workflow detail |
| PostHog key configured | NOT DONE | `NEXT_PUBLIC_POSTHOG_KEY` not set per BETA_LAUNCH_PLAN.md — events are discarded silently |
| Extension-side tracking | NOT DONE | No events emitted from extension background or content scripts |
| Onboarding funnel events | NOT DONE | `onboarding_step_completed` call sites do not exist |
| Internal DB analytics table | Built | `analytics_events` table in schema; `/api/analytics/events` route exists |

### Critical blockers before beta analytics are usable

1. Set `NEXT_PUBLIC_POSTHOG_KEY` in the deployment environment. Without this, all
   `track()` calls forward to nothing and the activation funnel cannot be observed.
2. Wire `onboarding_step_completed` at the post-signup page for at minimum:
   `api_key_copied`, `extension_install_link_clicked`
3. Add `logout` event call at the sign-out handler
4. Add extension-side events for `recording_started`, `recording_stopped`,
   `upload_attempted`, `upload_succeeded`, `upload_failed`

---

## 9. Beta Launch Targets

From PRD.md Section 8 and BETA_LAUNCH_PLAN.md. All targets require PostHog to be connected.

| Metric | Target | Measurement Method | Gate |
|--------|--------|--------------------|------|
| Absolute activations | >= 5 of 15 users complete full activation | PostHog activation funnel | Must-hit |
| Activation rate | >= 30% (signup → SOP viewed) | PostHog funnel conversion | Must-hit |
| SOP usability | >= 50% rate SOP usable as-is or minor edits | Post-session survey (manual) | Must-hit |
| Day-7 second recording | >= 25% of activated users | PostHog retention: `workflow_uploaded` repeat | Must-hit |
| Shares created | >= 2 distinct users create + share a workflow | `share_link_created` + `shared_workflow_viewed` | Must-hit |
| Time to first SOP | < 10 minutes median | PostHog funnel time-between-steps | Leading indicator |
| Upload success rate | >= 90% | Event ratio | Leading indicator |
| Zero-step uploads | 0 | `workflow_uploaded` where `stepCount = 0` | Leading indicator |

**Beta gate rule (from PRD):**
- 5/5 targets met: proceed to open beta
- 3-4/5 met: iterate on the failing metric
- Fewer than 3/5: stop and diagnose root cause before any further outreach

**Decision mapping:**
- Activation < 30% → onboarding friction; audit the post-signup flow
- SOP quality < 50% → output generation problem; review segmentation and process-engine
- Return < 25% → second-session value unclear; check if users understand what else to record
- Zero shares → output is not share-worthy; the biggest product signal possible
