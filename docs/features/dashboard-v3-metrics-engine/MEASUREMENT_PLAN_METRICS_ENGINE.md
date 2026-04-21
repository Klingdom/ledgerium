# MEASUREMENT_PLAN — Process Intelligence Metrics Engine (v3)

**Artifact type:** Analytics deliverable — pre-build Define phase
**Status:** Draft — pending iter 030 (#51) completion before v3 build begins
**Date:** 2026-04-21
**Author:** analytics agent
**Input:** INPUT_SPEC.md (Process Intelligence Metrics Engine, 2026-04-21), PRD_DASHBOARD_V2.md §4, DASHBOARD_V2_REVIEW_001.md findings
**Consumers:** product-manager, backend-engineer, frontend-engineer, coordinator, growth-strategist

---

## 1. Measurement Intent

Ledgerium AI is a Process Intelligence platform. Its value proposition is that it converts recorded user behavior into actionable insights about process health, efficiency, and automation opportunity. The v3 metrics engine — which produces ~90 metrics across 9 layers (INPUT_SPEC §5–§9) — is only valuable if users actually encounter those metrics, understand them, and make decisions with them. A metrics engine that is never opened, never configured, and never acted upon is infrastructure, not product. This plan therefore treats the v3 surface itself as the subject of measurement: every event defined below exists because it answers a specific question about whether users are getting intelligence from the engine, or whether the engine is generating data nobody reads. The recursive discipline is intentional. We measure workflows to improve processes; we measure our metrics engine to improve it. Per INPUT_SPEC §5 design principles, every metric must be deterministic, explainable, and drillable to source evidence — and those same standards apply to the metrics that evaluate the metrics engine. Each event in the taxonomy below is paired with a decision it informs. Events without a decision owner are not included.

---

## 2. Baseline Dependency

### 2.1 The Current State

DASHBOARD_V2_REVIEW_001 finding (Analytics lens) states explicitly: zero PRD §4 success-metric events are instrumented on v2. The 14-day soak window opened at iter 022 is generating zero analytics signal. This is a product-measurement failure that v3 must not inherit.

The consequences are direct:

- Configuration-rate for v3 cannot be benchmarked against v2 (v2 has no configuration events to compare against)
- Time-to-first-insight cannot be compared across versions
- Upgrade-CTA conversion target of 10% (PRD_DASHBOARD_V2 §4) has no denominator to calculate against
- PRD §4 committed to establishing baselines on launch; that commitment was not met

### 2.2 Required Pre-v3 Deliverables

**Dependency 1 — #51 v2 analytics instrumentation (iter 030, programmed)**

The six v2 events scoped in DASHBOARD_V2_REVIEW_001 Analytics lens recommendation must ship before any v3 surface renders in production. These events are:

- `dashboard_view` — page load, workflow count, portfolio health score at view time
- `workflow_row_click` — row identity, entry point
- `insight_chip_click` — chip severity and filter key applied
- `dashboard_sort` — column and direction
- `dashboard_filter` — filter type and value
- `upgrade_cta_click` with `source: 'health_gate'`

Without these six events in production for a minimum of 14 days before v3 build completes, we have no v2 usage baseline to compare against. The v3 superiority claim cannot be evidence-based.

**Dependency 2 — DV2-R01 distribution comparison (iter 029, programmed)**

The server-side `HEALTH_SCORE_DISTRIBUTION_COMPARISON.md` artifact (DV2-R01) establishes whether the v2 health score distribution is well-formed before we build v3 scores on top of it. If v2 score distributions are degenerate (e.g., 80% of workflows clustered at 0–10), the v3 composite scores inherit that flaw from day one. DV2-R01 is the correctness baseline; #51 is the usage baseline. Both are gating dependencies for v3 build start.

### 2.3 Sequencing Gate

v3 build MUST NOT begin until:

1. #51 (iter 030) is merged and events are confirmed firing in the analytics sink
2. DV2-R01 artifact exists and does not reveal a degenerate v2 score distribution
3. At least 7 days of v2 event data have accumulated post-#51 ship

If the v2 soak generates < 100 `dashboard_view` events in 7 days, the v3 launch readiness is still feasible but the v2 baseline will be thin — note this explicitly in the v3 launch readiness artifact.

---

## 3. v3 Event Taxonomy

### Naming conventions

- All v3 events are prefixed `v3_` to distinguish from v2 events in the shared `analytics.ts` AnalyticsEvent union
- Existing v2 events (`dashboard_view`, `workflow_row_click`, `upgrade_cta_click`, etc.) are NOT renamed or duplicated — v3 extends the namespace
- Property types follow the existing analytics.ts patterns: snake_case keys, no PII, structured values preferred over free-form strings
- Required properties must always be present; optional properties are included when the data is available

### Event Definitions

---

#### `v3_dashboard_view`

**Trigger:** Workflow library surface (v3) finishes rendering with data (not during loading state). Fires once per full page navigation or hard refresh. Does not re-fire on filter changes.

**Decision:** Is v3 being opened? At what scale of workflow portfolio? Are users starting with filters active (bookmark-driven entry)?

| Property | Type | Required | Notes |
|---|---|---|---|
| `view_name` | `string` | required | Name of the active saved view, or `'default'` if no custom view is active |
| `column_count` | `number` | required | Number of visible columns in the active view |
| `column_set_hash` | `string` | required | SHA-1 of sorted column key array — identifies column configuration without enumerating every column per event. Enables cohort analysis of "users who consistently use X config" |
| `workflow_count` | `number` | required | Number of workflow rows rendered (post-filter) |
| `workflow_count_total` | `number` | required | Total workflows for the user (pre-filter) — reveals filter depth |
| `has_filter` | `boolean` | required | True if any filter is active at view time |
| `time_range` | `string` | required | Active time range selection, e.g. `'30d'`, `'90d'`, `'all'` |
| `plan_tier` | `string` | required | `'free'` / `'starter'` / `'growth'` / `'team'` — needed for cohort analysis |
| `is_default_view` | `boolean` | required | True if the rendered view is the system default rather than a user-saved view |
| `entry_point` | `string` | optional | `'direct'` / `'insight_chip'` / `'notification'` / `'bookmark'` — if determinable from the referrer |

---

#### `v3_column_added`

**Trigger:** User adds a column to the active view via the column picker. Fires once per column addition.

**Decision:** Which metrics do users seek? What is the top-10 most-added column distribution? Informs INPUT_SPEC §21 Phase 2 priorities.

| Property | Type | Required | Notes |
|---|---|---|---|
| `metric_key` | `string` | required | Canonical metric key from INPUT_SPEC §5 taxonomy, e.g. `'flow_efficiency_pct'`, `'rework_rate_pct'` |
| `view_name` | `string` | required | View the column was added to |
| `from_category` | `string` | required | INPUT_SPEC layer the metric belongs to: `'operational_flow'` / `'step_performance'` / `'variation_conformance'` / `'quality_outcome'` / `'human_behavior'` / `'bottleneck'` / `'automation_opportunity'` / `'financial'` / `'composite_score'` |
| `column_position` | `number` | optional | Index at which the column was inserted — reveals whether users front-load important metrics |
| `is_gated` | `boolean` | required | True if this metric is plan-gated; false if the user successfully added it |

---

#### `v3_column_removed`

**Trigger:** User removes a column from the active view.

**Decision:** Which metrics are tried but discarded? High add + high remove = confusing label or low signal. Informs metric retirement candidates for INPUT_SPEC §21.

| Property | Type | Required | Notes |
|---|---|---|---|
| `metric_key` | `string` | required | Canonical metric key removed |
| `view_name` | `string` | required | |
| `dwell_before_remove_sessions` | `number` | optional | Number of sessions the column was present before being removed. Proxy for "tried it and found it useless" vs. "immediate remove" |

---

#### `v3_column_reordered`

**Trigger:** User drags or otherwise reorders columns in the active view.

**Decision:** Are users reorganizing around specific metrics? Which metrics get promoted to left-most positions?

| Property | Type | Required | Notes |
|---|---|---|---|
| `metric_key` | `string` | required | The metric key that was moved |
| `view_name` | `string` | required | |
| `from_position` | `number` | required | 0-indexed column position before reorder |
| `to_position` | `number` | required | 0-indexed column position after reorder |

---

#### `v3_view_created`

**Trigger:** User creates a new named view (does not require saving).

**Decision:** Are users actively managing their analytical context, or treating v3 as a single fixed-column list?

| Property | Type | Required | Notes |
|---|---|---|---|
| `view_name` | `string` | required | |
| `column_count` | `number` | required | Columns at creation time |
| `column_set_hash` | `string` | required | |
| `source` | `string` | required | `'new_empty'` / `'duplicate_existing'` / `'from_template'` — how the view was initiated |

---

#### `v3_view_saved`

**Trigger:** User explicitly saves a view, or the view is auto-saved after a configurable debounce.

**Decision:** What fraction of view creations result in a saved (durable) configuration?

| Property | Type | Required | Notes |
|---|---|---|---|
| `view_name` | `string` | required | |
| `save_type` | `'explicit'` \| `'auto'` | required | Distinguishes intentional save from auto-save — informs whether auto-save reduces or creates friction |
| `column_count` | `number` | required | |
| `column_set_hash` | `string` | required | |

---

#### `v3_view_shared`

**Trigger:** User copies a shareable link to a saved view.

**Decision:** Is v3 being used for inter-team communication? Collaboration signal.

| Property | Type | Required | Notes |
|---|---|---|---|
| `view_name` | `string` | required | |
| `column_count` | `number` | required | |
| `has_filter` | `boolean` | required | |

---

#### `v3_view_default_set`

**Trigger:** User sets a saved view as their personal default.

**Decision:** Configuration stickiness — users who set a default have a higher signal of habitual use.

| Property | Type | Required | Notes |
|---|---|---|---|
| `view_name` | `string` | required | |
| `column_set_hash` | `string` | required | |

---

#### `v3_metric_drill_through`

**Trigger:** User clicks on a metric value cell to open the lineage / evidence drill-through view. Per INPUT_SPEC §9, every metric must support drill-through to source runs, steps, and events.

**Decision:** Which metrics are users investigating? High click rate = metric is perceived as meaningful. Low click rate = metric is decorative or the value is self-evident (both are fine, but they're different).

| Property | Type | Required | Notes |
|---|---|---|---|
| `metric_key` | `string` | required | |
| `entity_type` | `'workflow_definition'` \| `'process_group'` \| `'step'` \| `'run'` \| `'user'` \| `'portfolio'` | required | The grain at which the user drilled through |
| `entity_id` | `string` | required | Hashed or opaque ID — no PII |
| `entry_surface` | `string` | required | `'workflow_library'` / `'workflow_detail'` / `'portfolio_view'` |
| `metric_value` | `number` \| `null` | optional | The rendered value at drill-through time — enables "users drill through when value is X" analysis |
| `confidence_at_drill` | `number` \| `null` | optional | Confidence score at drill-through — users who drill through on low-confidence metrics are friction events |

---

#### `v3_metric_tooltip_viewed`

**Trigger:** User hovers over a metric cell and the tooltip is displayed for > 500ms (not a flash). The 500ms threshold prevents tooltip-viewed spam from rapid cursor movement.

**Decision:** Which metric labels are unclear? High tooltip rate + low drill-through rate = confusing label. High tooltip + high drill-through = interesting metric.

| Property | Type | Required | Notes |
|---|---|---|---|
| `metric_key` | `string` | required | |
| `dwell_bucket` | `'500ms_2s'` \| `'2s_5s'` \| `'5s_plus'` | required | Bucketed dwell time avoids high-cardinality numeric property |
| `entry_surface` | `string` | required | |

---

#### `v3_filter_applied`

**Trigger:** User applies or changes a filter on the workflow library view.

**Decision:** Which filter dimensions do users care about? Are users filtering by process group, system, opportunity type, time range, or department?

| Property | Type | Required | Notes |
|---|---|---|---|
| `filter_type` | `string` | required | `'system'` / `'opportunity_tag'` / `'process_group'` / `'department'` / `'health_status'` / `'time_range'` / `'tag'` |
| `filter_value` | `string` | required | Normalized value — for multi-select, the specific value added. Separate event per value. |
| `filter_count_after` | `number` | required | Total number of active filters after this application — context for filter stacking behavior |
| `view_name` | `string` | required | |

---

#### `v3_sort_applied`

**Trigger:** User clicks a column header to sort the workflow library.

**Decision:** Which metrics are users using to triage their workflows? Sort column = the metric they trust most for prioritization.

| Property | Type | Required | Notes |
|---|---|---|---|
| `metric_key` | `string` | required | Column sorted on — use canonical metric key, not display label |
| `direction` | `'asc'` \| `'desc'` | required | |
| `view_name` | `string` | required | |

---

#### `v3_workflow_detail_view`

**Trigger:** User navigates to the workflow detail view. Per INPUT_SPEC §14.2, the detail view includes KPI strip, process path, variant analysis, bottleneck radar, and automation opportunities.

**Decision:** How are users arriving at the detail view? The `entry_point` property is critical — it disambiguates organic interest (row-click) from guided discovery (from_insight_chip) from direct access (bookmark or linked URL).

| Property | Type | Required | Notes |
|---|---|---|---|
| `workflow_id` | `string` | required | Hashed or opaque |
| `entry_point` | `'from_library_row'` \| `'from_insight_chip'` \| `'direct_link'` \| `'from_portfolio'` | required | |
| `health_score_at_entry` | `number` \| `null` | optional | The health score visible on the library row at time of click — reveals whether users investigate poor-health or healthy workflows preferentially |
| `opportunity_tag_at_entry` | `string` \| `null` | optional | The opportunity tag visible on the row at click time |

---

#### `v3_portfolio_view`

**Trigger:** User opens the portfolio (executive) view. Per INPUT_SPEC §14.3, this includes process group count, value leakage rankings, automation readiness, SLA risk, and department comparison.

**Note:** This view is not shipped in v3 MVP (INPUT_SPEC §21 Phase 2). Fire this event to measure readiness and demand even before the surface is built — e.g., as a "coming soon" click if applicable. If the view is not surfaced at all, exclude this event from MVP instrumentation.

| Property | Type | Required | Notes |
|---|---|---|---|
| `process_group_count` | `number` | required | Number of process groups in view |
| `entry_point` | `string` | required | `'nav_link'` / `'sidebar'` / `'direct_link'` |
| `plan_tier` | `string` | required | |

---

#### `v3_upgrade_cta_click`

**Trigger:** User clicks an upgrade CTA anywhere in the v3 surface. This consolidates upgrade signal from multiple placement points.

**Decision:** Which upgrade touchpoint converts best? DV2-R08 (DASHBOARD_V2_REVIEW_001 P1) found the v2 upgrade path is "conversion-void" with a single gated-tooltip touchpoint. v3 must instrument every placement to find the high-converting surface.

| Property | Type | Required | Notes |
|---|---|---|---|
| `cta_variant` | `string` | required | `'locked_metric_tooltip'` / `'empty_category_state'` / `'portfolio_locked_section'` / `'column_picker_locked_item'` / `'workflow_detail_gated_section'` / `'banner'` |
| `source_surface` | `string` | required | `'workflow_library'` / `'workflow_detail'` / `'portfolio_view'` / `'column_picker'` |
| `metric_key` | `string` | optional | When the CTA is triggered by a specific gated metric, include the key — identifies which gated metrics most drive upgrade intent |
| `plan_tier` | `string` | required | Current plan of user clicking (should be `'free'` almost always, but confirms attribution) |

---

#### `v3_score_drill_through`

**Trigger:** User expands a composite score breakdown (process health, standardization, automation readiness). Per INPUT_SPEC §9, scores must expose component weights, normalization method, and benchmark source.

**Decision:** Are users treating composite scores as opaque ratings or as navigable explanations? High drill-through = trust investment; low drill-through = either total trust or total distrust.

| Property | Type | Required | Notes |
|---|---|---|---|
| `score_key` | `string` | required | `'process_health_score'` / `'standardization_score'` / `'automation_readiness_score'` / `'efficiency_score'` / `'quality_score'` — from INPUT_SPEC §9 |
| `entity_type` | `string` | required | |
| `score_value` | `number` | optional | |
| `entry_surface` | `string` | required | |

---

### 3.1 Events Not Included (and Why)

The following were considered and excluded:

- **`v3_column_rendered`** — a page-load side effect, not a user action. Per Ledgerium's principle of tracking only what informs action, impressions are inferred from `v3_dashboard_view.column_set_hash` rather than emitted per-column. An exception is made for launch readiness gating (§12), where a lightweight server-side render log is used instead.
- **`v3_metric_value_copied`** — clipboard events are unreliable cross-browser; the signal (user wants to use the value elsewhere) is better served by the v3 share/export affordance events.
- **`v3_session_time`** — session duration is a vanity metric; prefer drill-through rate and return visit rate as engagement proxies.

---

## 4. North-Star Metrics for v3 MVP

Maximum 5. Each has a decision it informs, a baseline, and a target.

---

### NS-1: Configuration Rate

**Definition:** Percentage of Weekly Active Users (WAU) who create or modify at least one custom view configuration within 7 days of their first v3 session.

**Why it matters:** The differentiating capability of v3 over v2 is configurability. If users are not configuring, v3 is being used as a styled v2. A user who configures a view has expressed a preference signal about which metrics matter to them.

**Decision it informs:** If configuration rate at W4 is below 20%, the column picker UX needs redesign before W8. If it is above 40% at W8, v3 is working as a process intelligence tool.

**Baseline:** 0% (v2 has no column configuration; configuration rate concept does not exist in v2)

**Target:** 40% of WAU configure a custom view within 7d of first v3 session, measured at W8 post-launch

**Events:** `v3_view_created` or `v3_column_added` within 7d window of first `v3_dashboard_view`

---

### NS-2: Top-10 Most-Added Columns Distribution

**Definition:** Ordered frequency distribution of `v3_column_added.metric_key` values, rolling 30d.

**Why it matters:** The INPUT_SPEC §19 default pack ships 8 primary + 7 secondary metrics. Real user column-addition behavior reveals whether the default pack matches user intent. If the top-added column is not in the default pack, the default pack is wrong.

**Decision it informs:** Monthly review of this distribution informs INPUT_SPEC §21 Phase 2 priorities. Metrics consistently in positions 1–5 are candidates for promotion to the default pack. Metrics never added across 30d are candidates for retirement from the catalog.

**Baseline:** Not applicable (no prior column addition behavior in v2)

**Target:** Distribution is non-uniform by W4 (at least 3 metrics with >15% of total additions). Uniform distribution (all metrics added at equal frequency) would indicate users are experimenting randomly rather than purposefully.

**Events:** `v3_column_added`

---

### NS-3: Drill-Through Rate per Metric

**Definition:** For each metric key: `count(v3_metric_drill_through where metric_key = K) / count(v3_dashboard_view where column_set_hash contains K)`. Expressed as a rate per 100 impressions.

**Why it matters:** INPUT_SPEC §9 requires full lineage drill-through for every metric. Drill-through rate tells us which metrics users find informative enough to investigate vs. which are decorative column fills. Metrics below 0.5 clicks per 100 impressions across 30d are decorative; metrics above 5 are engagement anchors.

**Decision it informs:** Metrics with drill-through rate below threshold for 90d are candidates for removal from the default column set or catalog deprecation. This closes the feedback loop between the metrics engine's output and the metrics it surfaces.

**Baseline:** No drill-through behavior in v2 (no drill-through affordance exists)

**Target:** At least 3 of the 8 default metrics exceed 2.0 drill-throughs per 100 impressions by W8

**Events:** `v3_metric_drill_through`, `v3_dashboard_view`

---

### NS-4: Time-to-First-Insight

**Definition:** Elapsed time (seconds) from `v3_dashboard_view` to first `v3_metric_drill_through` OR first `v3_workflow_detail_view` within the same session. Expressed as p50 and p90.

**Why it matters:** PRD_DASHBOARD_V2 §1 commits to "understood in 5 seconds." The v2 proxy (time-to-first-row-click) was never instrumented (#51 gap). v3 must instrument a direct insight signal: drill-through or detail-view navigation represents evidence that a user found a metric meaningful enough to act on.

**Decision it informs:** If p50 > 90s at W4, either the default column set is confusing (wrong metrics first), the confidence layer is suppressing too many metrics as low-data, or the layout hierarchy is not directing attention. Under 90s is the target because that is the constraint of the "5 seconds to understand" goal applied to the more complex v3 surface.

**Baseline:** Not established in v2 (events never fired). The #51 delivery in iter 030 will establish the v2 `dashboard_view → workflow_row_click` p50 as a comparable baseline.

**Target:** p50 < 90s, p90 < 180s, measured at W4 and W8 post-launch

**Events:** `v3_dashboard_view`, `v3_metric_drill_through`, `v3_workflow_detail_view`

---

### NS-5: Upgrade-CTA Conversion Rate

**Definition:** Among users exposed to at least one gated-metric touchpoint in a session, the percentage who click an `v3_upgrade_cta_click` event. Tracked as a 7-day rolling rate segmented by `cta_variant` and `source_surface`.

**Why it matters:** PRD_DASHBOARD_V2 §4 committed to a 10% lift in upgrade CTA conversion. DASHBOARD_V2_REVIEW_001 finding DV2-R08 confirmed the v2 upgrade path is "conversion-void" — single buried touchpoint, feature-named copy, no secondary placement. v3 ships multiple gated-metric touchpoints (column picker locked items, workflow detail gated sections, portfolio locked view). The conversion rate by placement type determines which surfaces drive revenue.

**Decision it informs:** If locked-metric-tooltip CTA converts at < 1% but column-picker-locked-item converts at > 5%, shift copy and prominence investment to the column picker. If all placements convert below 1%, the plan-gating tier boundary may be misplaced (too little value visible on free tier).

**Baseline:** 0% (v2 upgrade CTA events were never instrumented — confirmed by #51 gap in DASHBOARD_V2_REVIEW_001)

**Target:** 2% aggregate conversion rate (gated-metric exposure → CTA click → checkout_started) by W8. This is deliberately conservative given the 0% baseline and DV2-R08 structural weakness.

**Events:** `v3_upgrade_cta_click`, `checkout_started` (existing event in analytics.ts)

---

## 5. Funnel Design

### 5.1 Funnel: Workflow Library

**Steps:**

1. **Impression** — `v3_dashboard_view` fires (page rendered with data)
2. **Interaction** — any of `v3_filter_applied`, `v3_sort_applied`, `v3_column_added`, `v3_metric_tooltip_viewed` within the same session
3. **Drill-through** — `v3_metric_drill_through` OR `v3_workflow_detail_view` within the session
4. **Return visit** — `v3_dashboard_view` fires again within 7 calendar days of the session in step 1

**Cohort rules:**
- Attribution window: 7 days for return visit measurement; within-session for steps 1–3
- Unit of analysis: `user_id` (not session) — a user who triggers steps 1–3 in a single session counts once
- Time window: rolling 28-day cohort, refreshed weekly

**Exclusions:**
- Bot traffic: exclude sessions where `user_id` matches internal test accounts (admin role or `@ledgerium.test` email domain)
- Admin role: exclude users with `role = 'admin'` — their usage pattern reflects product maintenance, not product value
- Incomplete sessions: exclude sessions under 10 seconds total duration

### 5.2 Funnel: Workflow Detail View

**Steps:**

1. **Library entry** — `v3_dashboard_view` fires
2. **Detail navigation** — `v3_workflow_detail_view` fires with `entry_point = 'from_library_row'`
3. **Deep engagement** — `v3_metric_drill_through` OR `v3_score_drill_through` fires within the detail session
4. **Return to library** — `v3_dashboard_view` fires within the same session (user applied insight and returned to triage)

**Cohort rules:**
- Attribution window: single session for steps 1–4
- Users who arrive at detail via `direct_link` are excluded from this funnel (they bypass the library)

### 5.3 Funnel: Portfolio View (Phase 2)

The portfolio view per INPUT_SPEC §14.3 is not in v3 MVP. When shipped, the funnel is:

1. `v3_portfolio_view` fires
2. Any metric drill-through within portfolio context
3. Navigation to specific workflow from portfolio recommendation
4. Return visit to portfolio within 7d

Define full cohort rules at the time the portfolio view PRD is approved.

### 5.4 Conversion Funnel: Upgrade Path

1. `v3_dashboard_view` with `plan_tier = 'free'`
2. Any gated-metric exposure (column added with `is_gated = true`, or gated cell rendered in default column set)
3. `v3_upgrade_cta_click`
4. `checkout_started` (existing event)
5. `subscription_created` (existing event)

**Attribution:** first-touch `cta_variant` within the session where `upgrade_cta_click` fires. Do not last-touch — the gated metric exposure step is the value trigger.

---

## 6. Measurement of the Metrics Themselves (Meta-Measurement)

Per the measurement intent in §1, each metric in the catalog must be evaluated on four adoption dimensions. This data is derived from the event stream above — no additional instrumentation required.

### 6.1 Per-Metric Adoption Scorecard

For each `metric_key` in the INPUT_SPEC §5 catalog:

| Dimension | Signal | Source Events | Frequency |
|---|---|---|---|
| **Exposed** | Rendered in any user's active view at least once in rolling 30d | `v3_dashboard_view.column_set_hash` decoded against column registry | Weekly |
| **Added** | At least 1 user issued `v3_column_added` for this key in rolling 30d | `v3_column_added` | Weekly |
| **Retained** | Column remained in user's view at 7d and 30d after first `v3_column_added` | `v3_dashboard_view.column_set_hash` at T+7d and T+30d relative to `v3_column_added` timestamp | Monthly |
| **Drill-through rate** | `v3_metric_drill_through` / estimated impressions (from column set hash × view count) | `v3_metric_drill_through`, `v3_dashboard_view` | Monthly |

### 6.2 Adoption Tier Classification

Based on rolling 30d data, each metric is classified:

- **Anchor** — retained 30d rate > 60% AND drill-through rate > 2.0/100 impressions
- **Exploratory** — added by > 10% of WAU but retained 30d rate < 40%
- **Invisible** — added by < 5% of WAU; never in any default view
- **Deprecated candidate** — Invisible for 90+ consecutive days with no upward trend

This classification directly feeds INPUT_SPEC §21 Phase 2 priority decisions. Anchor metrics are promoted to the default column set or made permanent. Deprecated candidates are removed from the catalog or merged.

### 6.3 Decision Gate

At the 90-day mark post-v3 launch, produce a "Metrics Adoption Report" that lists:
- All Anchor metrics (protect)
- All Deprecated candidates (propose for removal or restructuring)
- Any metric with high add rate + high remove rate (confusing — label or formula needs revision)

This report is the input to the first v3 metrics engine retrospective.

---

## 7. Correctness-of-Output Measurement

Per INPUT_SPEC §9, every metric_fact must carry `confidence_score_0_100`, `data_coverage_pct`, and `evidence_count`. These server-side fields must be surfaced in product analytics as correctness signals.

### 7.1 Low-Confidence Metric Exposure Rate

**Definition:** Percentage of `v3_dashboard_view` sessions where at least one rendered metric has `confidence_score < 40` (threshold aligned with INPUT_SPEC §9 low-confidence threshold). Derived from server-side metric_fact records correlated with session IDs.

**Decision:** If > 30% of sessions include a low-confidence metric in the default column set, the data pipeline is not producing enough evidence to justify the default column set. Either the default set must shift to metrics with higher confidence coverage, or the evidence base must improve.

### 7.2 No-Data / Low-Evidence Rate

**Definition:** Percentage of metric_fact rows where `evidence_count < minimum_evidence_threshold` (per INPUT_SPEC §9) at time of dashboard render. Logged server-side.

**Decision:** If this rate is > 20% at 30d post-launch, Phase 1 data coverage (INPUT_SPEC §21 Phase 1) is insufficient for the promised metric set. Adjust launch-readiness expectations accordingly.

### 7.3 User-Reported Incorrect Signal

If v3 ships a "metric feedback" affordance (e.g., a thumbs-down or flag icon on a metric cell), define:

- `v3_metric_feedback_submitted` event with properties `metric_key`, `feedback_type: 'incorrect' | 'confusing' | 'missing_context'`, `entity_id`

This event is OPTIONAL for MVP. Instrumentation cost is low; data quality signal is high if it fires. Recommend including in the workflow detail view where users are most likely to notice errors.

---

## 8. A/B Test Design

Each test below specifies: hypothesis, primary success metric, minimum detectable effect, and estimated sample size (assumes 80% power, 95% confidence, 5% baseline rate where applicable).

---

### Test A-1: Default Column Set

**Hypothesis:** The INPUT_SPEC §19 8-column primary set (process health, median cycle time, flow efficiency, run volume, standardization score, rework rate, bottleneck impact, automation readiness) produces higher drill-through rate than the CEO's 9-column set (§19 + savings opportunity).

**Why test this:** One more column increases cognitive load. If the 9th column (savings opportunity) doesn't add drill-through, it adds friction.

**Control:** 9-column set (CEO's directive as per INPUT_SPEC §21)
**Variant:** 8-column set (INPUT_SPEC §19 primary KPIs)
**Primary metric:** Drill-through rate per 100 impressions within first 7-day session window
**Secondary metric:** Time-to-first-insight (NS-4)
**MDE:** 1.0 drill-through per 100 impressions difference
**Estimated sample size:** 200 users per arm (based on estimated WAU at v3 launch and 14-day run time)
**Exclusion:** Users who manually reconfigure columns within 24h of first session are excluded (they override the test assignment)

---

### Test A-2: Column Picker Affordance

**Hypothesis:** An inline toolbar affordance (always-visible "+" button at the end of the column row) drives higher configuration rate than a drawer (accessed via a settings icon).

**Control:** Column picker as drawer (typical spreadsheet/BI pattern)
**Variant:** Inline toolbar with "+" icon at the column header row end
**Primary metric:** Configuration rate (NS-1) — % of WAU who add a column within 7d
**MDE:** 10 percentage points (from 20% baseline to 30%)
**Estimated sample size:** 150 users per arm

---

### Test A-3: Upgrade CTA Placement

**Hypothesis:** A CTA embedded in the column picker ("locked item" state when free user encounters a gated metric) converts at a higher rate than the existing gated-tooltip placement.

**Control:** Gated-metric tooltip (current v2 pattern, extended to v3)
**Variant A:** Column picker locked-item state — gated metric shown in picker with lock icon and upgrade callout
**Variant B:** Empty-category state — when a plan-gated category (e.g., financial metrics) is browsed, a section CTA appears
**Primary metric:** Upgrade CTA conversion rate (NS-5)
**Secondary metric:** Time from `v3_dashboard_view` to `checkout_started`
**MDE:** 1.5 percentage points from 0.5% baseline
**Estimated sample size:** 300 free-tier users per arm (smaller conversion population requires larger N)

---

### Test A-4: Workflow Detail Entry Point

**Hypothesis:** Displaying a dedicated "View details" button on each row (always visible) drives more workflow detail navigations than the current v2 row-click-only model.

**Control:** Row click navigates to detail (v2 behavior)
**Variant:** Dedicated "View details" button visible on row hover (or always visible on mobile)
**Primary metric:** `v3_workflow_detail_view` count per `v3_dashboard_view` session
**Secondary metric:** `v3_workflow_detail_view.entry_point` distribution (row_click vs. button)
**MDE:** 0.2 detail views per session increase
**Estimated sample size:** 200 users per arm

---

### Test A-5: Default View Per Plan Tier

**Hypothesis:** Surfacing tier-appropriate column counts as defaults (free: 5 columns focused on the most explainable metrics; growth: 9; team: 15) reduces the cognitive gap between plans and increases upgrade motivation among free-tier users who see a "more columns available" indicator.

**Control:** Same 8-column default for all tiers (free users see 3 gated columns with lock icons)
**Variant:** Tier-adaptive defaults (free: 5 unlocked columns; growth: 9; team: 15)
**Primary metric:** Upgrade CTA click rate (free tier only) — variant hypothesis is that seeing a clean 5-column view plus a "5 more available with Growth" prompt converts better than seeing 3 locked cells in a shared grid
**Secondary metric:** Configuration rate among free users (does a clean default encourage customization?)
**MDE:** 2 percentage points on upgrade CTA click rate
**Estimated sample size:** 250 free-tier users per arm

---

## 9. Integration with #51 v2 Instrumentation

v2 events (#51, to ship in iter 030) and v3 events use the same `analytics.ts` AnalyticsEvent union type. The following rules govern namespace consistency.

### 9.1 Events That v3 Replaces (do not duplicate)

| v2 Event | v3 Replacement | Notes |
|---|---|---|
| `dashboard_view` (to be added by #51) | `v3_dashboard_view` | v3 fires in place of `dashboard_view` when user is on the v3 surface. Both coexist during any transition period. |
| `workflow_row_click` (to be added by #51) | `v3_workflow_detail_view` with `entry_point: 'from_library_row'` | v3 event carries more context; v2 event is the baseline before v3 launches |
| `upgrade_cta_click` (existing) | `v3_upgrade_cta_click` | v3 extends with `cta_variant` and `source_surface` properties not in the v2 event |

### 9.2 Events That Carry Forward Unchanged

The following events in `analytics.ts` are surface-agnostic and fire regardless of v2 vs v3:

- `checkout_started`, `subscription_created` — billing events, no v3 version needed
- `signup_completed`, `login_completed` — auth events
- `workflow_uploaded`, `workflow_deleted` — lifecycle events
- `insight_chip_click` (added by #51) — if v3 uses the same InsightChip pattern, reuse this event

### 9.3 Schema Extension Rule

All v3 events must be added to the `AnalyticsEvent` type union in `apps/web-app/src/lib/analytics.ts` before any component fires them. The type union is the contract; emitting events not in the union breaks TypeScript strict mode enforcement.

---

## 10. Internal Analytics Dashboard

### 10.1 Dashboard for CEO Weekly Review

| Metric | Source Events | Chart Type | Cadence |
|---|---|---|---|
| WAU with at least one v3 session | `v3_dashboard_view` | Line chart, 7-day rolling | Weekly |
| Configuration rate (NS-1) | `v3_view_created`, `v3_column_added` | Cohort bar — % of WAU who configured within 7d | Weekly |
| Top-10 most-added columns | `v3_column_added` | Horizontal bar by `metric_key` | Weekly |
| Upgrade CTA conversions | `v3_upgrade_cta_click` → `checkout_started` | Funnel (segmented by `cta_variant`) | Weekly |
| Time-to-first-insight p50/p90 | `v3_dashboard_view` → `v3_metric_drill_through` | Time distribution histogram | Weekly |

### 10.2 Dashboard for Monthly Product Review

| Metric | Source Events | Chart Type | Cadence |
|---|---|---|---|
| Per-metric adoption scorecard (§6.1) | All v3 events | Table with Anchor/Exploratory/Invisible/Deprecated classification | Monthly |
| Drill-through rate per metric | `v3_metric_drill_through`, `v3_dashboard_view` | Scatter: metrics by drill-through rate | Monthly |
| 30-day retention of configured views | `v3_dashboard_view.column_set_hash` cohort | Cohort retention table | Monthly |
| Funnel drop-off (library → detail → return) | §5.1 funnel | Sankey or step funnel | Monthly |
| A/B test results (any active tests) | All events above | Significance table per test | Monthly |

### 10.3 PostHog / Amplitude Configuration Notes

All events route through the existing `track()` function in `analytics.ts`, which forwards to PostHog when `NEXT_PUBLIC_POSTHOG_KEY` is configured. For PostHog dashboards:

- Use `column_set_hash` as a property for cohort analysis of "users with custom views"
- Set `plan_tier` as a user property (not just an event property) so it persists across sessions without requiring re-enrichment on every event
- Create a PostHog Action for "v3 Power User" = any user who has fired `v3_view_saved` and `v3_metric_drill_through` in the same 7-day window

---

## 11. Guardrail Metrics

Guardrails monitor for regressions. If a guardrail breaches its threshold, v3 launch is paused regardless of north-star metric performance.

| Guardrail | Measurement | Threshold | Source |
|---|---|---|---|
| Workflow library page render time (p95) | Lighthouse CI on main branch | <= 2.5s desktop, <= 4.0s mobile | Lighthouse CI; per PRD_DASHBOARD_V2 §4 |
| Workflow detail page render time (p95) | Lighthouse CI | <= 3.0s desktop | INPUT_SPEC §18 (< 3s workflow detail analytics) |
| API p95 latency — `/metrics/query` | Server-side timing | < 2s uncached per INPUT_SPEC §18 |
| API p95 latency — portfolio rollup | Server-side timing | < 10s per INPUT_SPEC §18 |
| Client error rate (`client_error` event) | `analytics.ts client_error` event | <= 0.5% of sessions | Existing event |
| API error rate (`api_error` event) | `analytics.ts api_error` event | <= 1% of sessions | Existing event |
| axe-core violations (workflow library) | axe-core automated scan in CI | 0 critical; moderate count <= N (ratchet from DV2-R04 baseline) | DV2-R04 cold pool — must be promoted before v3 launch |
| Confidence score aggregate | Server-side: mean of `confidence_score_0_100` across all `metric_fact` rows materialized in last 24h | >= 60 (drop below 60 means upstream data pipeline degraded) | INPUT_SPEC §9 |

---

## 12. Launch Readiness Gates

The workflow library (INPUT_SPEC §14.1 equivalent in v3) launches as default only when ALL of the following are green:

1. **Event coverage:** All 14 events defined in §3 are firing in production for at least 48 hours. Confirmed via PostHog event list or analytics buffer.
2. **Default column instrumentation:** The 8 primary default columns (INPUT_SPEC §19) appear in at least 80% of `v3_dashboard_view.column_set_hash` values in the first 48h (ensures the default view is rendering correctly for the majority of users).
3. **Drill-through coverage:** `v3_metric_drill_through` fires for at least 3 distinct `metric_key` values in the first 48h.
4. **Upgrade CTA coverage:** `v3_upgrade_cta_click` fires from at least 2 distinct `cta_variant` values in the first 48h (confirms multiple placement points are wired).
5. **Guardrails green:** All guardrail thresholds in §11 are within bounds for 48 consecutive hours.
6. **v2 baseline available:** #51 v2 events have at least 7 days of data in the analytics sink (per §2.3 sequencing gate).
7. **DV2-R01 artifact exists:** The health-score distribution comparison is complete and does not reveal a degenerate score distribution (per §2.2).

If any gate is red, the v3 launch is blocked. The coordinator must log which gate failed and the remediation action.

---

## 13. Post-Launch Measurement Cadence

### Day 1 (24h post-launch)

**Reviewed by:** engineering lead + PM
**Focus:** instrumentation health

- Confirm all 14 event types have fired at least once
- Confirm no `client_error` spike
- Confirm API latency guardrails are green
- Confirm axe-core violations are within ratchet bounds
- Action threshold: if any event has zero fires, roll back or hot-fix before proceeding

### Day 7

**Reviewed by:** PM + analytics
**Focus:** early adoption signal

- Configuration rate: how many WAU have created or modified a view?
- Top-5 most-added columns: is the distribution consistent with the default pack design intent?
- Time-to-first-insight p50: are users finding drill-through within the 90s target?
- Upgrade CTA impressions vs. clicks: is conversion plausible or is the CTA invisible?
- A/B test arm sizes: are arms balanced? Any instrumentation anomalies?
- Action threshold: if configuration rate < 5% after 7 days, escalate to a synchronous product review

### Day 30

**Reviewed by:** PM + CEO
**Focus:** first full cohort

- NS-1 configuration rate at W4 cohort: on track for 40% W8 target?
- NS-3 drill-through rates by metric: which metrics are Anchors vs. Invisible?
- NS-5 upgrade CTA conversion: 2% target — which `cta_variant` is leading?
- A/B test results: can any tests be called at 30d? (Minimum 200 users per arm; see §8)
- Guardrails: 30-day rolling error rates and latency trends
- Action threshold: any metric falling > 50% below target triggers a product review within 5 business days

### Day 90

**Reviewed by:** PM + CEO + growth-strategist
**Focus:** retention and roadmap input

- NS-1 at W8 cohort: did we hit 40%?
- Metrics adoption scorecard (§6.2): full Anchor/Exploratory/Invisible/Deprecated classification
- Produce "Metrics Adoption Report" (§6.3) — input to first v3 retrospective
- Per-metric retention at 30d: which configured columns survived?
- Funnel conversion across all three surfaces (library, detail, portfolio if shipped)
- INPUT_SPEC §21 Phase 2 priority recommendations based on adoption data
- A/B test finals: close any tests still running; apply winners to defaults

---

## 14. Competitive Benchmarking

Per INPUT_SPEC §17, the benchmarking framework includes self-historical, peer, team, department, target, and best-observed benchmark types.

### 14.1 v1: Internal Benchmark Only

At v3 launch, Ledgerium is a single-tenant product (INPUT_SPEC Ledgerium-specific context: "single-tenant browser-extension-captured events; no multi-user/team model yet"). Peer benchmarks require multi-user data that does not yet exist.

The only valid benchmark type at v3 launch is:

- **Self-historical benchmark:** v3 metric values vs. prior 30d for the same workflow. This is the `prior_window_delta` pattern already implemented in v2 (portfolioHealthScorePrior / portfolioHealthScoreDelta fields).

Extend this to per-metric deltas via the `metric_rollup_daily` and `metric_rollup_weekly` tables per INPUT_SPEC §11.

### 14.2 When Peer Benchmarks Become Viable

Peer/team/department benchmarks require:
1. Multi-user team accounts (currently not in data model per INPUT_SPEC Ledgerium context)
2. N >= 10 teams with >= 5 recorded workflows each — below this N, percentile ranks are statistically meaningless
3. Explicit opt-in from users — benchmark sharing is privacy-sensitive

**Measurement gate:** When these conditions are met, add a `benchmark_percentile_rank` property to `v3_score_drill_through` so users can see where their process health score sits relative to the anonymized peer pool.

### 14.3 How We Measure Our Benchmark Adoption

If and when peer benchmarks ship, add:
- `v3_benchmark_viewed` — user viewed a benchmark comparison panel
- `v3_benchmark_target_set` — user set a custom target benchmark value

Both are deferred to Phase 2.

---

## 15. PRD §4 Retro from v2 — What Must Not Repeat

PRD_DASHBOARD_V2 §4 defined six success metrics with baselines, targets, and "how measured" specifications:

1. Time to first workflow row click — target p50 < 8s — *never instrumented*
2. Bounce rate from dashboard — target -20% — *never instrumented*
3. Health Score column engagement — target > 50% sessions — *never instrumented*
4. p95 time-to-interactive — target <= 2.5s — *Lighthouse CI never added (PRD §14 iter 021 gate, never delivered)*
5. Insight chip click-through rate — target > 15% — *never instrumented*
6. Upgrade CTA conversion — target 10% lift — *never instrumented; CTA path found "conversion-void" by DASHBOARD_V2_REVIEW_001 DV2-R08*

All six metrics failed to materialize. The 14-day soak window is generating zero signal. This is a complete measurement failure for v2.

### Root Cause

The measurement plan was part of the PRD but was not gated as a build deliverable. There was no "measurement instrumentation" task in the iter sequence. Iter 021 (E2E + release gate) shipped without analytics event verification because the E2E test suite does not assert analytics event firing.

### Prevention Rules for v3

1. **Analytics events are a build deliverable, not a post-launch follow-up.** The events defined in §3 must be implemented and verified before any v3 surface goes to GA. They are gated in §12 launch readiness checks.
2. **E2E tests must assert analytics events fire.** At minimum, `v3_dashboard_view`, `v3_metric_drill_through`, and `v3_upgrade_cta_click` must have corresponding Playwright assertions that verify the PostHog/analytics buffer receives the event.
3. **"How measured" in the PRD must reference specific event names.** Vague "Umami event" references (as in PRD_DASHBOARD_V2 §4) are insufficient. The event name, required properties, and triggering condition must be identical to the definition in this document or the event is not credited as instrumented.
4. **Measurement readiness is a launch gate.** §12 guardrail #1 (all 14 events firing for 48h before default-on) is a hard launch gate — not a recommendation.
5. **#51 ships in iter 030, before v3 build.** This is non-negotiable per §2.3. Any shortcut that ships v3 without v2 baselines in place repeats the same failure mode: we will have a new dashboard surface with zero analytics signal, no baseline, and no ability to prove it improved on v2.

---

**End of MEASUREMENT_PLAN_METRICS_ENGINE.md**
