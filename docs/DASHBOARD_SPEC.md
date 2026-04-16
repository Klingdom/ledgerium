# Ledgerium AI — DASHBOARD_SPEC.md

**Status:** ACTIVE
**Version:** 1.0
**Date:** 2026-04-16
**Upstream artifacts:** METRICS.md, EVENT_TRACKING_PLAN.md
**Analytics tool:** PostHog (primary), internal `/api/analytics/events` endpoint (fallback and internal admin view)

---

## Architecture Notes

All dashboards described here are admin-only. The existing `/api/analytics/events` GET endpoint already enforces `isAdmin` check.

PostHog is the recommended implementation for Dashboards 1 and 2. It handles funnel computation, cohort analysis, and retention curves without custom query work.

Dashboard 3 (Revenue) primarily reads from Stripe and from the `subscription_created` / `subscription_canceled` events in PostHog, supplemented by direct Stripe API queries for MRR.

For the internal admin dashboard (`/admin` route, to be built), wire the existing `/api/analytics/events` GET endpoint to a simple React dashboard that renders the charts described below. This is the fallback if PostHog is not yet connected.

---

## Dashboard 1: Executive Overview

**Audience:** Founder (daily) and any future investors or advisors (weekly)
**Refresh:** Daily
**Time controls:** Default 7 days, toggleable to 30 days and 90 days
**PostHog reference:** Create as a PostHog dashboard named "Executive Overview"

### Widget 1.1 — Core KPI Scorecard (top row, 6 tiles)

Each tile: metric name, current period value, prior period value, % change (green/red), trend sparkline (7 days).

| Tile | Metric | Data source |
|------|--------|-------------|
| Signups | Count of `signup_completed` | PostHog event count |
| Activation rate | % of signups who fire `sop_section_viewed` within 72h | PostHog funnel |
| Time to first value | Median minutes: signup_completed → sop_section_viewed | PostHog funnel time |
| Active users (7-day) | Unique users who fired any event in window | PostHog MAU/WAU |
| Upload success rate | workflow_uploaded / (workflow_uploaded + upload_failed) | PostHog formula |
| New subscriptions | Count of `subscription_created` | PostHog event count |

### Widget 1.2 — Activation Funnel (full-width)

Type: Vertical step funnel with conversion % at each step and absolute drop-off counts.

Steps (exact event sequence):
1. `signup_completed`
2. `extension_api_key_created`
3. `recording.started`
4. `workflow_uploaded`
5. `sop_section_viewed`

Configuration:
- Conversion window: 72 hours from step 1
- Breakdown: none at executive level (segment view is in Dashboard 2)
- Show both absolute counts and step-to-step conversion rates
- Show overall funnel conversion rate prominently

### Widget 1.3 — Daily Signups + Activations (time series, 30 days)

Type: Dual-line chart
- Line 1: Daily `signup_completed` count (blue)
- Line 2: Daily `sop_section_viewed` unique users (green)
- The gap between the lines is the activation shortfall — visible at a glance

### Widget 1.4 — 7-Day Retention Cohort

Type: Single-number metric with weekly trend

Definition: % of users who uploaded their first workflow in a given week and also uploaded a second workflow within 7 days.

Query: Count users where `workflow_uploaded` event count >= 2 AND (second_upload_timestamp - first_upload_timestamp) <= 7 days.

Report as: "Week of [date]: X% of N users returned within 7 days"

Show 4 weeks of cohort history as a small table below the main metric.

### Widget 1.5 — Revenue Summary (bottom row)

Three tiles, Stripe-sourced:
- MRR (current): sum of active subscriptions × monthly rate
- New MRR this week: from `subscription_created` events × plan price
- Churned MRR this week: from `subscription_canceled` events × plan price

Note: Until Stripe MRR API is integrated, proxy from event counts × known plan prices (Starter $29, Team $79, Growth $149 monthly).

---

## Dashboard 2: Product Engagement

**Audience:** Founder (weekly review), future product team
**Refresh:** Daily
**Time controls:** Default 14 days, toggleable to 30 days
**PostHog reference:** Create as a PostHog dashboard named "Product Engagement"

### Widget 2.1 — Feature Adoption Rates (horizontal bar chart)

Definition: For each feature, % of users with at least one workflow who have used it at least once.

Features to show (descending by adoption %):
- SOP viewed (`sop_section_viewed`)
- Workflow exported (`workflow_exported`)
- Share link created (`share_link_created`)
- Intelligence analysis run (`analysis_run`)
- Agent intelligence viewed (`agent_intelligence_viewed`)
- Portfolio created (`portfolio_created`)
- Team created (`team_created`)
- Tag assigned (`tag_assigned`)

This chart answers: which features have users discovered and which are invisible?

### Widget 2.2 — Export Format Distribution (pie or donut)

Data source: `workflow_exported` events, grouped by `format` property.
Formats: json_report / json_sop / json_full / bpmn / markdown / pdf

Why: Reveals which output format users find most valuable, informs which formats to prioritize for quality.

### Widget 2.3 — Conversion Funnel: Upgrade Path (vertical funnel)

Steps:
1. `plan_limit_hit` — unique users who hit a limit
2. `upgrade_prompt_viewed` — unique users who saw an upgrade prompt
3. `upgrade_clicked` — unique users who clicked upgrade
4. `checkout_started` — unique users who entered Stripe
5. `subscription_created` — unique users who subscribed

Configuration:
- Conversion window: 7 days from step 1
- Breakdown by `plan_selected` property on step 4

### Widget 2.4 — SOP Usefulness Responses (stacked bar, rolling weekly)

Data source: `sop_usefulness_response` events grouped by `response` property.
- Segments: yes_as_is (dark green) / minor_edits (light green) / major_rework (amber) / not_useful (red)
- Show weekly bars so trend is visible
- KPI-005 target line: 50% yes+minor_edits shown as horizontal reference

### Widget 2.5 — Upgrade Prompt Performance (table)

Columns: prompt_location | impressions | clicks | click_rate | conversions | CVR
- One row per `prompt_location` value
- Sorted by conversion count descending
- Identifies which upgrade prompts actually drive revenue vs. which are noise

### Widget 2.6 — Recording Behavior Distribution (histogram)

Data source: `recording.stopped` events, `duration_ms` property.
Buckets: 0-1 min / 1-3 min / 3-5 min / 5-10 min / 10+ min

Why: Understanding recording duration distribution shapes product decisions about timeout defaults, pipeline performance expectations, and UX copy.

### Widget 2.7 — Top Pages (table)

Data source: `page_viewed` events grouped by `path` property.
Columns: path | total views | unique users
Rows: top 10 paths

Filters: exclude `/api/*`, include only authenticated user paths.

### Widget 2.8 — Workflow Output Section Engagement (bar chart)

Data source: Any section-view events if implemented (SOP, Process Map, Insights, Agent Intelligence).
Columns: section_name | unique_views | views_per_workflow_opened
Shows which sections of the workflow report are actually being read.

---

## Dashboard 3: Revenue and Monetization

**Audience:** Founder (weekly)
**Refresh:** Daily
**Time controls:** Default 30 days, toggleable to 90 days and all-time

### Widget 3.1 — MRR Trend (line chart, 90 days)

Data: Compute daily MRR from Stripe subscription records.
- Include: active subscriptions only
- Stripe API: `stripe.subscriptions.list({ status: 'active' })`
- Supplement with internal `subscription_created` events for daily new MRR overlay

Lines:
- Total MRR (primary, solid)
- New MRR added (bars, secondary axis)
- Churned MRR lost (bars, red, secondary axis)

### Widget 3.2 — Plan Distribution (donut)

Data source: DB query on `user.plan` field counts.
Segments: free / starter / team / growth / enterprise
Shows current distribution of user base across plans.

### Widget 3.3 — Cohort Conversion Rate (table)

Definition: Of users who signed up in week W, what % converted to paid by W+4, W+8, W+12?

Columns: signup_week | cohort_size | converted_by_W4 | converted_by_W8 | converted_by_W12

Data: Join `signup_completed` events with `subscription_created` events on user_id, compute week offsets.

### Widget 3.4 — Time to Convert Distribution (histogram)

Data source: `subscription_created` events with `days_since_signup` property.
Buckets: same day / 1-3 days / 4-7 days / 8-14 days / 15-30 days / 30+ days

Shows the typical conversion journey length. If most conversions are same-day, the trial is too short. If most are 30+, the trial is too long.

### Widget 3.5 — Workflow Count at Conversion (histogram)

Data source: `subscription_created` events with `workflow_count_at_conversion` property.
Buckets: 1 / 2-3 / 4-5 / 6-10 / 10+

Shows how many recordings users need before they convert. This is the product-led growth trigger signal: if most users convert after 3 recordings, that's where the free tier limit should sit.

### Widget 3.6 — Upgrade Prompt → Conversion Attribution (table)

Data source: `upgrade_clicked` events with `click_location` property, joined to `subscription_created` events within 7 days.

Columns: prompt_location | users_who_clicked | converted_within_7d | attribution_rate

Answers: which upgrade prompt location is actually driving revenue?

### Widget 3.7 — Failed Payment and Churn (table, last 30 days)

Rows: one per `payment_failed` or `subscription_canceled` event
Columns: date | plan | interval | days_as_subscriber | workflow_count

Note: Do not show user email in this dashboard. Use anonymized user_id. Full churn investigation requires going to Stripe directly.

---

## Alerting Rules

These alerts should be configured in PostHog (threshold alerts) or as a simple cron job that queries `/api/analytics/events` and sends an email.

| Alert | Condition | Severity | Action |
|-------|-----------|----------|--------|
| Upload success rate low | workflow_uploaded / (workflow_uploaded + upload_failed) < 95% for 2 consecutive hours | P1 | Investigate `/api/sync` immediately |
| Zero uploads in 24h | No `workflow_uploaded` events in a 24-hour window (during active beta) | P1 | Check sync endpoint and extension |
| Processing failure spike | `processing_failed` events > 3 in 1 hour | P1 | Check pipeline logs |
| Activation rate drop | 7-day rolling activation rate drops below 20% (from baseline) | P2 | Review onboarding and extension setup flow |
| No signups in 48h (beta) | Zero `signup_completed` events in 48 hours during active recruitment | P2 | Check auth routes and signup page |
| Payment failure rate | `payment_failed` count > 2 in 24 hours | P2 | Check Stripe configuration |
| API error spike | `api_error` events > 10 in 1 hour for any single endpoint | P2 | Check server logs for that route |
| SOP usefulness drops | Rolling 7-day `sop_usefulness_response` "yes/minor" rate < 40% | P3 | Review recent pipeline changes |

---

## Implementation Priority

Phase 1 — Before first beta user (P0):
1. Connect PostHog: set `NEXT_PUBLIC_POSTHOG_KEY` and `NEXT_PUBLIC_POSTHOG_HOST`
2. Verify `signup_completed` fires server-side in `/api/auth/signup`
3. Verify `workflow_uploaded` fires server-side in `/api/sync`
4. Add `sop_section_viewed` client-side on the workflow report page
5. Add `extension_api_key_created` server-side in `/api/keys`
6. Call `identifyAnalyticsUser()` after login and signup with user properties
7. Build activation funnel in PostHog (Funnel 1: 5 steps)

Phase 2 — First week of beta (P1):
8. Add `recording.started`, `recording.stopped`, `recording.upload_failed`, `recording.discarded` to extension
9. Implement `_telemetry` passthrough in `/api/sync`
10. Add `workflow_exported` to all export API routes
11. Add `share_link_created` and `shared_workflow_viewed`
12. Build Executive Overview dashboard in PostHog

Phase 3 — After first 5 beta users (P2):
13. Implement `sop_usefulness_response` prompt in workflow report UI
14. Add `plan_limit_hit` and `upgrade_prompt_viewed` instrumentation
15. Build Product Engagement dashboard
16. Build Revenue dashboard
17. Set up alerting
