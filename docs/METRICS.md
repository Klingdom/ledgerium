# Ledgerium AI — METRICS.md

**Status:** ACTIVE — governs all analytics implementation
**Version:** 1.0
**Date:** 2026-04-16
**Phase:** Beta instrumentation — instrument before first beta user arrives

---

## Metric Hierarchy

### North Star Metric

**Activated users who complete a second recording within 7 days**

Definition: A user who signs up, completes their first recording (workflow reaches web app), views the SOP output, and records a second workflow within 7 calendar days of their first upload.

Why this: It is the single signal that the product creates enough value on first use to generate habitual behavior. A user who records twice has (a) cleared the extension setup friction, (b) received output they considered worth repeating, and (c) made a voluntary choice to return. It is the earliest durable retention proxy available. Target at beta launch: 25% of activated users.

---

### Activation Metric

**Signup-to-first-SOP-view rate**

Definition: % of users who complete signup and then view the SOP tab on at least one real (non-sample) workflow within 72 hours.

Target at beta launch: 30%

This is the activation gate. Everything upstream (install, record, sync, process) must function for this to be possible. A user who reaches this state has received the product's core value proposition.

---

### Guardrail Metrics

These must not degrade. An alert fires if they drop below threshold for 48 hours.

| Metric | Definition | Minimum threshold |
|--------|-----------|-------------------|
| Upload success rate | workflow_uploaded / (workflow_uploaded + upload_failed) per 24h | 95% |
| Processing success rate | Workflows that complete pipeline / total uploads | 90% |
| Time to first SOP | Minutes from upload event to SOP artifact available | < 3 min (p90) |
| Signup completion rate | Users who complete signup / users who start it | 80% |

---

### Operational Metrics (monitor, not optimize)

- API error rate per endpoint
- Extension sync latency (p50, p90)
- Stripe webhook delivery success rate
- Session count per day (growth indicator)

---

## KPI Definitions

### KPI-001: Activation Rate
- **Formula:** users_with_first_sop_view / total_signups (rolling 7-day cohorts)
- **Source events:** `signup_completed`, `first_sop_viewed`
- **Segment by:** signup channel (organic / referral / direct), plan at signup
- **Reported:** daily

### KPI-002: Time to First Value (T2FV)
- **Formula:** median(timestamp(first_sop_viewed) - timestamp(signup_completed))
- **Source events:** `signup_completed`, `first_sop_viewed`
- **Reported:** weekly, as p50 and p90
- **Target:** p50 < 15 minutes

### KPI-003: Recording Completion Rate
- **Formula:** workflow_uploaded / recording_started (per user, per session in extension)
- **Source events:** `recording.started` (extension), `workflow_uploaded` (web)
- **Note:** Requires cross-surface join on user_id. Extension fires the start; web app fires the completion.
- **Reported:** daily

### KPI-004: 7-Day Return Rate
- **Formula:** users_with_second_upload_within_7_days / users_with_first_upload
- **Source events:** `workflow_uploaded` (count >= 2 per user within 7 days of first)
- **Reported:** weekly (cohort-based: measure D0 cohort at D7)

### KPI-005: SOP Usefulness Score
- **Formula:** % of `sop_usefulness_response` events where response = "yes" or "minor_edits"
- **Source event:** `sop_usefulness_response` (requires prompt implementation — see EVENT_TRACKING_PLAN.md)
- **Reported:** weekly rolling

### KPI-006: Free-to-Paid Conversion Rate
- **Formula:** subscription_created / signup_completed (30-day cohort)
- **Source events:** `signup_completed`, `subscription_created`
- **Segment by:** plan tier (starter / team / growth)
- **Reported:** monthly

### KPI-007: Upload Success Rate
- **Formula:** workflow_uploaded / (workflow_uploaded + upload_failed)
- **Source events:** `workflow_uploaded`, `upload_failed`
- **Reported:** daily — guardrail alert if < 95%

### KPI-008: Feature Reach (Export, Share, Intelligence)
- **Formula per feature:** unique_users_who_used_feature / unique_users_with_at_least_one_workflow
- **Source events:** `workflow_exported`, `share_link_created`, `analysis_run`
- **Reported:** weekly

---

## Funnel Definitions

See EVENT_TRACKING_PLAN.md for event specifications. See DASHBOARD_SPEC.md for visualization.

### Funnel 1: Core Activation
signup_completed → extension_api_key_created → recording.started → workflow_uploaded → first_sop_viewed

### Funnel 2: Value Deepening
first_sop_viewed → workflow_exported OR share_link_created OR analysis_run

### Funnel 3: Conversion
plan_limit_hit OR upgrade_prompt_viewed → upgrade_clicked → checkout_started → subscription_created

### Funnel 4: Team Adoption
team_created → team_invite_sent → team_invite_accepted → workflow_shared_with_team

### Funnel 5: Retention Loop
first_sop_viewed → [D+7] workflow_uploaded (second recording)
