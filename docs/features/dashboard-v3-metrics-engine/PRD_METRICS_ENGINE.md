# PRD — Process Intelligence Metrics Engine (v3)

**Status:** Draft — Define phase (Path C)
**Author:** product-manager
**Date:** 2026-04-21
**Parent PRDs:** `docs/prd/PRD_DASHBOARD_V2.md` (2026-04-20) · `docs/prd/PRD_DASHBOARD_V2_EXECUTIVE_REFINEMENT.md` (2026-04-21)
**Input spec:** `docs/features/dashboard-v3-metrics-engine/INPUT_SPEC.md` (CEO directive, 2026-04-21)
**Mode:** Mode 3-adjacent Define artifact (non-counting toward improvement-loop cadence)
**Governed by:** CLAUDE.md MR-005 D-4 specialist-invocation gate · D-5 audit-intake pattern · coding standards

---

## Decisions Locked (D1–DN)

Decisions in this PRD are proposed. CEO lock required before any Phase 1 build iteration begins.

| # | Decision | Status |
|---|---|---|
| D1 | v1 metric pack bounded to INPUT_SPEC § 19 default set (8 primary + 7 secondary); Tier C and D excluded | Proposed |
| D2 | Metric warehouse tables additive — no destructive migration to existing Prisma schema | Proposed |
| D3 | `computeHealthScoreV2` in `workflow-metrics.ts` is the v2 engine; v3 will introduce a new `computeHealthScoreV3` when the data model can support Layer 1–3 metrics from stored `workflow_run` / `workflow_step` tables; v2 function is NOT deleted until v3 data pipeline is live | Proposed |
| D4 | Variant hashing uses a deterministic ordered step-type sequence (canonical action taxonomy from `packages/process-engine/` policy engine); hashing algorithm must be pinned at a semantic version before Phase 1 ships | Proposed — CEO must confirm no relaxation |
| D5 | No multi-user / team metrics in v1; single-user captures only; user/team grain metrics deferred to Phase 2 | Proposed |
| D6 | No cost / financial layer (Layer 8) in v1; `cost_per_run` and `savings_opportunity_usd` are visible as Secondary KPIs but rendered as `—` until cost model is defined (Phase 2) | Proposed |
| D7 | Executive portfolio view is a NEW surface (not currently shipped); build as a separate route `/dashboard/portfolio`; do not expand the v3 workflow library page scope | Proposed |
| D8 | Column picker / configurable views are an analyst-facing feature; not executive-facing; executive view is fixed columns per §3 persona definition | Proposed |
| D9 | `metric_fact` table is the canonical persistence target; no in-memory rollup caching in v1 API layer | Proposed |
| D10 | No alerting / notification system in v1; insight rules from INPUT_SPEC § 15 surface as dashboard chips only (existing InsightChip pattern from v2) | Proposed |

---

## 1. Product Vision and Intent

The Process Intelligence Metrics Engine extends Ledgerium's existing workflow intelligence surface from a qualitative verdict dashboard (v2: health score, opportunity tag, insight chips) into a quantitative process-mining platform grounded in traceable, deterministic metric facts. Per INPUT_SPEC § Product Intent, the engine must do five things well: measure performance across workflow runs, steps, and time; detect variation across similar workflows and process definitions; surface bottlenecks, rework, and conformance issues; quantify automation and AI opportunity; and produce simple top-line scores with full metric traceability underneath. The resulting product serves three distinct roles — the Analyst configuring workflow library views and drilling into per-run evidence, the Executive consuming portfolio KPI summaries, and the Admin pinning org-wide defaults and managing benchmark targets — while remaining anchored to Ledgerium's core architectural constraints: single-tenant browser-extension capture, immutable raw events, and deterministic computation pipelines. v3 is not a replacement for v2; it is a backward-compatible deepening of the computation layer, with v2's `computeHealthScoreV2` and its associated dashboard surface remaining live until the v3 data pipeline can recompute health scores from stored `workflow_run` and `workflow_step` table data. At v3 MVP, the UI difference is visible primarily in an expanded column library, a drill-through detail view with step-level timing, and a new executive portfolio view. The metric warehouse is the architectural foundation for all three.

---

## 2. Scope Boundaries for v1 Launch

### 2.1 In scope (v1 / Phase 1)

Per INPUT_SPEC § 19 Default Metric Pack:

**8 Primary KPIs** (visible in workflow library and detail view by default):
1. `process_health_score` — composite 0–100 (Layer 9)
2. `median_cycle_time_ms` — median run duration (Layer 1)
3. `flow_efficiency_pct` — processing time / cycle time (Layer 1)
4. `case_volume` — total run count in window (Layer 1)
5. `standardization_score_0_100` — composite (Layer 3 + Layer 9)
6. `rework_rate_pct` — runs with repeated canonical steps (Layer 3)
7. `bottleneck_impact_score` — normalized wait × frequency × volume (Layer 6)
8. `automation_readiness_score_0_100` — composite (Layer 7 + Layer 9)

**7 Secondary KPIs** (available in drill-down and column picker, not visible by default in workflow library):
1. `top_variant_share_pct` — share of runs in the most common variant (Layer 3)
2. `error_rate_pct` — runs with error events / total runs (Layer 4)
3. `abandonment_rate_pct` — abandoned runs / total runs (Layer 4)
4. `manual_effort_pct` — manual duration / active duration (Layer 5)
5. `application_switch_rate` — application switches per run (Layer 5)
6. `cost_per_run` — rendered as `—` until cost model is defined (Layer 8, Tier C placeholder)
7. `savings_opportunity_usd` — rendered as `—` until cost model is defined (Layer 8, Tier C placeholder)

### 2.2 Explicitly excluded from v1

**Tier C — Cost and financial metrics (Layer 8):**
`labor_cost_per_run`, `labor_cost_per_step`, `cost_of_rework`, `cost_of_delay`, `annualized_value_leakage_usd`, `automation_roi_pct`. Reason: no cost model exists; no labor-rate configuration surface exists; any value would be fabricated. `cost_per_run` and `savings_opportunity_usd` are visible as placeholder columns to establish the surface but render `—` until Phase 2 cost model is defined.

**Tier D — ML-based scoring and prediction (Layer 7 advanced + Phase 3):**
`ai_suitability_score_0_100` (ML-derived), `decision_complexity_score_0_100` (ML-derived), `rule_basedness_score_0_100` (ML-derived), simulation, prediction, cross-process impact graph, prescriptive recommendations. Reason: requires labeled training data and a model layer not in the current stack.

**Additional v1 exclusions (see §13 Non-Goals for full list):**
Multi-user/team metrics (no team model), benchmarking framework (no peer or target data), alerting/notification layer, workspace override UI for scoring weights, department-level rollups (no department metadata in current schema).

---

## 3. User Stories and Personas

### 3.1 Analyst — configures workflow library views, drills into evidence

**Context:** Process analyst or operations lead with 5–100 recorded workflows. Checks the dashboard several times per week. Wants to diagnose specific problem workflows and gather evidence to present to stakeholders.

**User stories:**

**A-01. Default column view.**
As an Analyst, when I open the workflow library I want to see the 8 primary KPIs displayed as columns by default so that I can immediately assess which workflows are most problematic without configuration.

_Acceptance criteria:_
- The workflow library renders a table with exactly the 9 columns defined in §5 as the default view (including Workflow Name).
- Default sort is `process_health_score` ascending (worst first), matching v2 behavior.
- No column configuration is required to see the 8 primary KPIs.
- All primary KPIs render a computed value or a clearly marked `—` (never a fabricated number).

**A-02. Drill into a workflow's metric detail.**
As an Analyst, when I click a workflow row I want to see a detail view showing the full KPI strip, step timing distribution, top variants, and the specific bottleneck and rework evidence so that I can understand why the health score is what it is.

_Acceptance criteria:_
- Clicking a workflow row navigates to a workflow detail page that includes: KPI strip (all 8 primary KPIs), top 3 variants by share, step duration distribution chart (or equivalent tabular representation), bottleneck evidence (per INPUT_SPEC § 14.2), and a rework/loop summary.
- Each KPI on the detail page is drillable to its source runs (lineage to `workflow_run` records).
- KPIs that have insufficient data (fewer than 3 runs) display a low-confidence indicator and a count label `n=N`.
- The page renders with real data within 3 seconds per INPUT_SPEC § 18 performance targets.

**A-03. Add or remove columns in the workflow library.**
As an Analyst, when I click a column picker control I want to toggle any metric from the full v1 metric roster (see §9) on or off so that I can focus on the dimensions relevant to my current analysis.

_Acceptance criteria:_
- A column picker control (icon + label, keyboard accessible) is present in the workflow library filter bar.
- Opening the picker shows all metrics in the v1 metric roster (§9) grouped by Layer, with each row showing metric name, description, and unit.
- Toggling a metric adds it as a column to the right of the default columns (or removes it if already visible).
- The Workflow Name column is always visible and cannot be removed.
- Column selection is persisted in localStorage per user; reloading the page restores the prior selection.
- Column state is NOT synced to a backend preferences table in v1 (deferred to Phase 2).

**A-04. Sort the workflow library by any visible column.**
As an Analyst, I want to sort the workflow library by any visible column (ascending or descending) so that I can rank workflows by the metric most relevant to my current task.

_Acceptance criteria:_
- Clicking a column header cycles through: unsorted → ascending → descending.
- Sort is applied server-side when the column maps to a stored `metric_fact` value; applied client-side for computed columns where server-side sort is not feasible.
- The active sort column and direction are indicated via `aria-sort` on the `<th>` element.
- Default sort (process_health_score ascending) is restored when all sorts are cleared.

**A-05. Filter the workflow library by metric threshold.**
As an Analyst, I want to apply threshold filters on any primary KPI column (e.g., "rework rate > 20%") so that I can isolate workflows that breach a specific metric criterion.

_Acceptance criteria:_
- The filter bar supports threshold-based filters for numeric columns (greater than, less than).
- Active filters are displayed as dismissible chips in the filter bar.
- The "Needs attention" filter (health < 60 OR variation High+ OR delta ≤ −10, per PRD_DASHBOARD_V2_EXECUTIVE_REFINEMENT §3.D-E5) is a pre-built filter chip, not a manual threshold.
- Multiple filters are AND-combined.
- Clearing all filters restores the default view.

---

### 3.2 Executive — consumes portfolio KPI summaries

**Context:** Business owner, VP Operations, or C-level stakeholder. Looks at the dashboard weekly or before a process review. Wants to answer "is the portfolio getting better or worse, and where are the biggest risks?" within 10 seconds. Will not configure columns or drill into individual step data.

**User stories:**

**E-01. Portfolio health at a glance.**
As an Executive, when I open the dashboard I want to see a single portfolio health score with a period-over-period delta so that I can tell immediately whether the organization's process performance is improving or declining.

_Acceptance criteria:_
- The Command Header renders `Portfolio Health [score] ▲/▼ [delta] vs last 30d` (per PRD_DASHBOARD_V2_EXECUTIVE_REFINEMENT §2.1).
- Delta is computed from the existing `computePortfolioHealthScorePrior` function (already shipped in `workflow-metrics.ts`).
- When prior-period data is insufficient (fewer than `PORTFOLIO_PRIOR_MIN_WORKFLOWS` workflows updated in the prior window), the delta renders as `— vs last 30d`.
- Color pip follows the RAG convention: green ≥ 80, amber 60–79, red < 60 (per PRD_DASHBOARD_V2_EXECUTIVE_REFINEMENT §2.4). Color is always paired with the integer value.

**E-02. Executive portfolio view.**
As an Executive, when I navigate to the portfolio view I want to see: the top 10 workflows by value leakage risk, the top 5 workflows by automation readiness, and a standardization comparison across workflow groups so that I can direct effort to the highest-priority areas without reading row-level data.

_Acceptance criteria:_
- A `/dashboard/portfolio` route renders an executive portfolio view (new surface, per §8).
- The portfolio view includes: number of active workflow groups, top-10 value leakage ranking (sorted by `bottleneck_impact_score` descending), top-5 automation readiness ranking (sorted by `automation_readiness_score` descending), and a standardization summary table showing `standardization_score` per workflow group.
- SLA breach risk section (per INPUT_SPEC § 14.3) renders `—` for all fields in v1 because `sla_breach_rate_pct` requires SLA targets to be configured (not available in v1).
- All data on the portfolio view is sourced from `metric_fact` rows; no client-side aggregation of raw workflow records.
- Page load time ≤ 2 seconds cached, ≤ 10 seconds uncached (per INPUT_SPEC § 18 portfolio rollup target).

**E-03. Actionable insight chips.**
As an Executive, I want the insight chips to tell me what to do, not just what is happening, so that I can forward the dashboard view to a process owner with a clear directive.

_Acceptance criteria:_
- All insight chip templates follow the `{signal} → {next action}` pattern (per PRD_DASHBOARD_V2_EXECUTIVE_REFINEMENT §2.2 and DV2-R11).
- No chip renders for a condition with zero qualifying workflows.
- The "Needs attention" pre-built filter is accessible from the Insights Strip as a chip (clicking applies the filter to the workflow list).
- Chips are verified at the engine layer, not just at the display layer (DV2-R11 gap must be closed before v3 ships: `computeInsightChips` must guarantee `→`-formatted strings are present in the output).

---

### 3.3 Admin — pins org-wide defaults and manages benchmarks

**Context:** Workspace administrator responsible for configuring what the team sees by default. Sets the default column view for all analysts. Manages SLA targets and benchmark thresholds.

Note: in v1, Ledgerium is single-tenant and there is no org-level user model. "Admin" is the same user as Analyst in most cases. These stories define the capability shape for when multi-tenant support is added. They are included for scope clarity — they are Phase 2 implementation targets.

**User stories (Phase 2 — included for completeness, not v1 scope):**

**Adm-01.** As an Admin, I want to pin a default column configuration for all workspace users so that analysts start from a consistent view.

**Adm-02.** As an Admin, I want to set SLA target thresholds per workflow group so that `sla_breach_rate_pct` computes against real business targets rather than generic defaults.

**Adm-03.** As an Admin, I want to configure composite score weights per workspace (e.g., weight efficiency higher than standardization for high-volume workflows) so that scores reflect this organization's values.

_These stories are listed to close the scope question, not to scope-expand v1. They are deferred per D5, D6, and the non-goals in §13._

---

## 4. Success Metrics

All metrics below require backlog item #51 (v2 analytics instrumentation) as a prerequisite for event collection. They also require DV2-R01 (server-side v1-vs-v2 health-score distribution comparison) as a baseline artifact. Neither is in scope for this PRD; both are listed as dependencies in §10.

| Metric | Baseline | Target | How Measured | Prerequisite |
|---|---|---|---|---|
| % of users who configure a custom column view within 7 days of v3 launch | 0% (no column picker in v2) | ≥ 30% of analyst-tier accounts (5+ workflows) | Umami event: `column_picker_open`, `column_toggle` with `workflow_count >= 5` filter | #51 |
| Top-10 most-added columns (column picker adoption ranking) | N/A | Establish ranked list within 30 days of v3 launch | Umami event: `column_toggle` with `column_key` property; ranked by count | #51 |
| Drill-through rate per metric (% of sessions where user clicks a KPI to see source evidence) | 0% (no drill-through in v2) | ≥ 25% of sessions on accounts with 10+ runs | Umami event: `metric_drill_click` with `metric_key` property | #51 |
| Time-to-first-insight (time from page load to first meaningful interaction — sort, filter, row click, or chip click) | Unknown — establish at v3 launch; v2 baseline from DV2-R01 artifact | Median ≤ 10s | Umami: delta between `dashboard_view` and first qualifying interaction event | #51, DV2-R01 |
| NPS lift vs v2 (self-reported; pilot cohort of 5–10 accounts) | v2 NPS baseline established at v3 launch gate | Net +15 points vs v2 baseline within 60 days | In-app survey triggered 7 days after first v3 feature use | #51 |
| Portfolio view engagement rate (% of active sessions that visit `/dashboard/portfolio`) | N/A (new surface) | ≥ 20% of weekly-active accounts within 60 days | Umami event: `portfolio_view_open` | #51 |

**Incompleteness flag.** "Time-to-first-insight" is a proxy. The ideal metric — "user correctly identified the highest-priority workflow within 30 seconds" — requires a moderated usability study (recommended at v3 GA for 5 executive-persona participants).

**Caution on NPS.** NPS lift in a small cohort is weakly statistical. Include a task-completion rate from the moderated study as the primary qualitative signal.

---

## 5. Default Workflow Library Column Specification

The following 9 columns constitute the default v3 workflow library view, building on the v2 4-column grid by expanding the data depth available. Column order is as specified. Columns 2–9 can be replaced or augmented by the column picker (§6); Workflow Name (column 1) is always visible.

This specification maps the CEO's 9-column directive to the INPUT_SPEC § 5 metric taxonomy.

| # | Column Name | Metric Key | Input Spec Layer | Computation Tier | Notes |
|---|---|---|---|---|---|
| 1 | Workflow Name | n/a | n/a | Display | Primary link; subtext: `systems · last-run · N runs` (per v2 PRD §5.3). Variation badge (High+) inlined per PRD_DASHBOARD_V2_EXECUTIVE_REFINEMENT D-E4. |
| 2 | Systems | `system_count_per_run` | Layer 5 (human/task mining) | Tier A (direct from `workflow_run.system_count`) | Icon pills; ≤ 3 visible + overflow. v2 behavior preserved. |
| 3 | Flow Efficiency | `flow_efficiency_pct` | Layer 1 (operational flow) | Tier A (formula: `processing_time_ms / cycle_time_ms`) | Rendered as percentage with 1 decimal. Requires `workflow_step` table data in v3. In v1 MVP, falls back to `—` if `workflow_step` data not yet migrated. |
| 4 | Variants Count + Rate | `variant_count` + `top_variant_share_pct` | Layer 3 (variation and conformance) | Tier A (variant count from `workflow_run.variant_hash` distinct count; share from top variant / total) | Two values in one cell: `N variants · [X]% on top`. Requires variant hashing (D4). |
| 5 | Longest Step + Tool | `max_wait_step_id` + system name | Layer 6 (bottleneck) | Tier B (requires step-level `step_wait_before_ms` > p90 rule from INPUT_SPEC § 10) | Renders step label + system name of the highest-wait step. Falls back to `—` if no `workflow_step` data. |
| 6 | Clicks/Actions | `clicks_per_run` + `actions_per_run` | Layer 5 (human/task mining) | Tier A (direct from `workflow_run.step_count` and action-typed steps) | Rendered as `N clicks / M actions`. |
| 7 | App Switching | `application_switch_rate` | Layer 5 (human/task mining) | Tier A (direct from `workflow_run.application_switch_count`) | Rendered as switches per run (integer). |
| 8 | Health Score | `process_health_score_0_100` | Layer 9 (composite scores) | Tier B (composite formula; v1 uses `computeHealthScoreV2` until v3 data model is live) | 0–100 integer with 3-band color pip (green ≥ 80, amber 60–79, red < 60). Run-count qualifier `n=N` when N < 10. Plan-gated breakdown tooltip (Starter+). |
| 9 | Bottleneck Severity | `bottleneck_impact_score` | Layer 6 (bottleneck and constraint) | Tier B (formula: `normalized(wait_time_ms) × normalized(step_frequency) × normalized(case_volume)`) | Rendered as severity band: None / Low / Medium / High. Requires `workflow_step` data. Falls back to `—` without it. |

**Tier A vs Tier B distinction:**
- Tier A metrics can be computed directly from fields already present in `workflow_run` (run-level aggregates, counts, direct ratios). They can be computed at ingestion time with a single-pass SQL aggregation.
- Tier B metrics require step-level data from `workflow_step`, multi-run variant grouping, or composite formula weights. They require the full metric computation pipeline (INPUT_SPEC § 12 Stages 3–5).

**Honest-labels review (§ Honest Labels principle, per PRD_DASHBOARD_V2 §7):**

The following INPUT_SPEC metric names require review for honest-labels compliance. These are flagged for the growth-strategist copy pass:

- `automation_readiness_score_0_100` — the word "readiness" implies an assessment of external feasibility. The v1 formula (repetitiveness + rule-basedness + volume + low exception rate + structured input) measures internal process signal only, not actual automation feasibility (tooling availability, API access, IT constraints). Recommend: `automation_signal_score_0_100` or `automation_candidate_score_0_100` until a validated feasibility framework is integrated.
- `process_health_score_0_100` — "health" is a composite abstraction. v1 uses the existing `computeHealthScoreV2` formula (speed + consistency + dataQuality + standardization), which does NOT yet incorporate Layer 1 cycle time or Layer 3 conformance inputs. Rendering it as a v3 metric without labeling its v2 lineage is misleading. Recommend: keep the label but add a `v2 formula` badge in the tooltip until v3 data pipeline replaces the computation.
- `savings_opportunity_usd` — any USD value without a cost model is a fabrication. This field MUST render `—` in v1 with a tooltip: "Requires cost model configuration." Growth-strategist should confirm this label is not misread as a computed estimate.
- `flow_efficiency_pct` — industry-standard term; no rename needed. Already in v2 codebase definition context.
- `bottleneck_impact_score` — "impact" implies financial or time magnitude. The INPUT_SPEC formula is a normalized dimensionless score (not USD or minutes). Recommend: `bottleneck_severity_score` to match the column header intent in §5.

---

## 6. Column Picker / Configurable Views UX Requirements

This section defines behavioral requirements for the column picker. Visual design and interaction patterns are delegated to the ux-designer.

### 6.1 What the column picker must allow

- Show all metrics in the v1 metric roster (§9) as toggleable options.
- Group metrics by INPUT_SPEC § 5 Layer (Layer 1 through Layer 9) with a clear group heading.
- Display for each metric: metric name, unit, one-sentence description, and computation tier (Tier A / Tier B).
- Allow the user to toggle any metric as a visible column (except Workflow Name, which is always locked).
- Enforce a maximum of 12 visible columns at once (including the locked Workflow Name column) to prevent the "spreadsheet" register that the v2 redesign explicitly moved away from (per PRD_DASHBOARD_V2 D10 rationale).
- Allow the user to reorder visible columns by drag-and-drop or keyboard (arrow keys with modifier).
- Provide a "Reset to defaults" control that restores the §5 9-column default.

### 6.2 What the column picker must NOT do

- Must not require a backend roundtrip to apply a column change; apply immediately from localStorage state.
- Must not surface metrics that have zero data (all `—`) for the current user without a data-availability indicator; if a metric has no computable values for any workflow in the current user's set, the toggle is greyed out with a tooltip: "No data available for this metric yet."
- Must not surface Tier C financial metrics (other than the v1 placeholder columns `cost_per_run` and `savings_opportunity_usd`) without a cost-model configuration step.
- Must not surface Phase 2 / Phase 3 metrics (simulation, ML-based scores) in the v1 column picker.

### 6.3 Persistence requirements

- Column state persists in localStorage per browser per user (key: `ledgerium_column_config_v3`).
- Column state is NOT persisted to a backend preferences table in v1 (Phase 2 feature per D8).
- The Admin pin story (§3.3 Adm-01) is a Phase 2 override layer on top of the localStorage default.

### 6.4 Accessibility

- The column picker trigger is a `<button>` with `aria-expanded` and `aria-controls`.
- The picker panel is a `role="dialog"` or `role="listbox"` with keyboard navigation (Tab, Space to toggle, Escape to close).
- All column toggles are checkboxes with visible labels.
- Drag-and-drop reorder must have a keyboard alternative (documented in WCAG 2.1 SC 2.1.1 compliance path).

---

## 7. Workflow Detail View Requirements

Per INPUT_SPEC § 14.2. This section defines content requirements for the workflow detail page (navigated to by clicking a workflow row). Layout and visual hierarchy are delegated to the ux-designer.

### 7.1 Required sections

**KPI strip.** All 8 primary KPIs displayed as a horizontal strip at the top of the detail page. Each KPI shows: current value, unit, trend direction (up/down/stable vs prior 30d), and a confidence indicator when run count < 10.

**Process path and top variants.** Display the top 3 variants by `top_variant_share_pct`. Each variant shows: step sequence (canonical step labels), run count, share percentage, and deviation from the canonical path (if canonical path is defined). If fewer than 3 distinct variants exist, show only the actual number.

**Step duration distribution.** A visual or tabular representation of step-level `avg_step_duration_ms` and `step_wait_before_ms` for each step in the canonical path. The longest step is highlighted as the bottleneck candidate. Data sourced from `workflow_step` table aggregations.

**Bottleneck radar.** The top 3 steps ranked by `bottleneck_impact_score`. Each step shows: step label, system name, wait time (p90), frequency (% of runs containing this step), and bottleneck severity band.

**Rework and loop insights.** `rework_rate_pct` for the workflow, with a list of the top 3 rework steps (steps repeated in > 10% of runs). `loop_rate_pct` if any loop edges exist in `step_edge`. Rendered as `—` if no step-level data is available.

**User/team variance.** Deferred to Phase 2 (D5 — no team model in v1). Section placeholder must be visible with a "Team metrics available with team accounts" message.

**AI/automation opportunities.** `automation_readiness_score` with component breakdown: repetitiveness, rule-basedness, volume score, exception rate, structured input. Each component shown as a score contribution. `automation_candidate_count` (steps classified as automation candidates per INPUT_SPEC § 10). Opportunity class label (UI automation, assisted data entry, etc.) if `automation_readiness_score ≥ 60`.

**Trend view over time.** `process_health_score` and `median_cycle_time_ms` plotted over the available time window (daily or weekly depending on run density). Requires `metric_rollup_daily` or `metric_rollup_weekly` materialized views (Phase 1 deliverable).

### 7.2 Lineage requirements

Every metric on the detail page must support drill-to-source (per INPUT_SPEC § 8 lineage principle):
- Clicking a metric value opens a panel showing the source runs that contributed to it (run IDs, dates, durations).
- The panel must include: `metric_version`, `computation_timestamp`, `evidence_count`, and `data_coverage_pct` from the `metric_fact` row.
- This is the trust mechanism — hiding the computation is forbidden.

### 7.3 Minimum run threshold

A workflow detail page with fewer than 3 runs must display a persistent banner: "Metrics improve as more runs are recorded. Some values may not be representative (n=[count])." This is the sparse-data state from v2 (§9 of PRD_DASHBOARD_V2) applied to the detail view.

---

## 8. Executive Portfolio View Requirements

Per INPUT_SPEC § 14.3. This is a NEW surface not currently shipped in v2. It lives at `/dashboard/portfolio`.

### 8.1 Required sections

**Header.** Portfolio-level KPI summary: `case_volume` (total runs across all workflows in the window), `process_health_score` (portfolio mean), period-over-period delta, and count of workflow definitions active in the window.

**Top-10 value leakage processes.** A ranked table of the 10 workflows with the highest `bottleneck_impact_score`. Columns: Workflow Name, Health Score, Bottleneck Impact, Rework Rate, Run Volume. Clicking a row navigates to the workflow detail page. "Value leakage" in this context means time lost to bottlenecks and rework — the label must be validated by the growth-strategist copy pass (honest-labels risk: implies financial loss when the metric is time-based).

**Top-5 automation readiness.** A ranked list of the 5 workflows with the highest `automation_readiness_score_0_100`. Columns: Workflow Name, Automation Readiness Score, Manual Effort %, Application Switch Rate, Opportunity Class.

**SLA risk section.** Renders `—` for all fields in v1 with a message: "SLA risk analysis requires SLA targets to be configured. Available in a future version." Do not fabricate SLA data.

**Standardization summary.** A table of all workflow groups (or individual workflows if no groups are defined) with their `standardization_score_0_100`. Rows sorted by standardization score ascending (lowest first). This is the standardization heatmap from INPUT_SPEC § 14.3 in tabular form (visual heatmap rendering deferred to the ux-designer; tabular representation is the v1 requirement).

**Department comparison.** Renders `—` with "Department comparison requires department metadata." Department metadata is not available in v1 Prisma schema.

### 8.2 Data freshness

Portfolio view data is sourced from pre-materialized `metric_fact` and `metric_rollup_daily` rows. It is not computed on-demand. Staleness indicator: show "Last updated: [relative time]" in the page header. If data is more than 24 hours old, show a warning badge.

### 8.3 Access

Portfolio view is accessible to all plans in v1 (no gating decision proposed). CEO must confirm whether a plan gate is required.

---

## 9. Metric Library MVP Roster (v1)

All metrics in this roster are either shippable in Phase 1 (v3 MVP) or are in-schema placeholders (rendered as `—`). Metrics in Phase 2+ are excluded from this roster.

Per INPUT_SPEC § 5. Tier A = direct computation from `workflow_run` fields; Tier B = requires `workflow_step`, step-edge, or multi-run aggregation.

### Layer 1 — Operational Flow Metrics

| Metric Key | Formula | Tier | v1 Status |
|---|---|---|---|
| `cycle_time_ms` | `run.ended_at − run.started_at` | Tier A | Computable from `workflow_run` |
| `processing_time_ms` | `SUM(step.duration_ms WHERE is_wait_state = false)` | Tier B | Requires `workflow_step` |
| `wait_time_ms` | `cycle_time_ms − processing_time_ms` | Tier B | Derived from above |
| `flow_efficiency_pct` | `processing_time_ms / cycle_time_ms × 100` | Tier B | Requires `workflow_step` |
| `completion_rate_pct` | `completed_runs / total_runs × 100` | Tier A | Computable from `workflow_run.status` |
| `case_volume` | `COUNT(run_id)` in window | Tier A | Computable from `workflow_run` |
| `median_cycle_time_ms` | `PERCENTILE_CONT(0.5)` over `cycle_time_ms` | Tier A | Computable from `workflow_run` |

Aggregations: for `cycle_time_ms`, compute mean, median, p75, p90, p95, min, max, stddev per INPUT_SPEC § 5.1. All stored as separate `metric_fact` rows with distinct `metric_key` suffixes (`cycle_time_ms_p75`, etc.).

### Layer 2 — Step Performance Metrics

| Metric Key | Tier | v1 Status |
|---|---|---|
| `avg_step_duration_ms` | Tier B | Requires `workflow_step` |
| `median_step_duration_ms` | Tier B | Requires `workflow_step` |
| `step_wait_before_ms` | Tier B | Requires `workflow_step` |
| `step_frequency` | Tier B | Requires `workflow_step` |
| `step_presence_rate_pct` | Tier B | Requires `workflow_step` |
| `step_error_rate_pct` | Tier B | Requires `workflow_step` with `is_error_event` flag |
| `step_rework_rate_pct` | Tier B | Requires `step_edge` with `is_rework_edge` flag |
| `is_bottleneck_step` | Tier B | Derived flag; requires p90 comparison across peer steps |
| `is_automation_candidate_step` | Tier B | Derived flag; requires repetitiveness + rule-basedness inputs |

### Layer 3 — Variation and Conformance Metrics

| Metric Key | Formula | Tier | v1 Status |
|---|---|---|---|
| `variant_count` | `COUNT(DISTINCT variant_hash)` | Tier A | Requires variant hashing (D4) on `workflow_run` |
| `top_variant_share_pct` | `runs_in_top_variant / total_runs × 100` | Tier A | Requires `variant_hash` on `workflow_run` |
| `happy_path_share_pct` | `runs_on_canonical_path / total_runs × 100` | Tier B | Requires canonical path definition |
| `rework_rate_pct` | `runs_with_repeated_canonical_steps / total_runs × 100` | Tier B | Requires `step_edge.is_rework_edge` |
| `loop_rate_pct` | `runs_with_loop_edges / total_runs × 100` | Tier B | Requires `step_edge.is_loop_edge` |
| `deviation_rate_pct` | `runs_deviating_from_canonical / total_runs × 100` | Tier B | Requires canonical path definition |
| `standardization_score_0_100` | `0.45 × top_variant_share + 0.35 × happy_path_share + 0.20 × (1 − normalized_variant_entropy)` per INPUT_SPEC § 6 | Tier B | `happy_path_share` is Tier B; `top_variant_share` is Tier A; composite is Tier B |

Note: `standardization_score_0_100` in v1 may need a fallback formula when `happy_path_share_pct` is unavailable (no canonical path defined). Fallback: `0.65 × top_variant_share + 0.35 × (1 − normalized_variant_entropy)`. This is a data gap; the system-architect must decide whether the fallback formula is acceptable or whether the metric renders `—` without a defined canonical path.

### Layer 6 — Bottleneck and Constraint Metrics

| Metric Key | Formula | Tier | v1 Status |
|---|---|---|---|
| `bottleneck_impact_score` | `normalized(wait_time_ms) × normalized(step_frequency) × normalized(case_volume)` per INPUT_SPEC § 5.6 | Tier B | Requires `workflow_step` |
| `delay_frequency_pct` | `steps_with_wait_above_p90 / total_steps × 100` | Tier B | Requires `workflow_step` |
| `max_wait_step_id` | step with maximum `step_wait_before_ms` | Tier B | Requires `workflow_step` |

### Layer 7 — Automation and AI Opportunity Metrics (v1 subset, Tier A-only)

| Metric Key | Tier | v1 Status |
|---|---|---|
| `automation_rate_pct` | Tier A | Computable from `workflow_run` if `is_automated` flag available |
| `manual_step_share_pct` | Tier A | Computable from `workflow_run.step_count` vs automated step count |
| `automation_readiness_score_0_100` | Tier B | Composite; formula per INPUT_SPEC § 6; some components require `workflow_step` |
| `repetitiveness_score_0_100` | Tier B | Derived from variant count + step repeat pattern |

Metrics requiring ML-based scoring (`ai_suitability_score`, `decision_complexity_score`, `rule_basedness_score`) are excluded from v1 (Tier D exclusion per §2.2).

### Layer 9 — Composite Scores (v1 subset)

| Score Key | Formula | v1 Status |
|---|---|---|
| `process_health_score_0_100` | `0.30 × efficiency_score + 0.25 × quality_score + 0.20 × standardization_score + 0.15 × sla_score + 0.10 × confidence_score` per INPUT_SPEC § 6 | Phase 1: uses `computeHealthScoreV2` fallback. Phase 2: full formula when Layer 1–4 data is available. |
| `efficiency_score_0_100` | Normalized `flow_efficiency_pct` | Tier B |
| `standardization_score_0_100` | See Layer 3 above | Tier B |
| `automation_readiness_score_0_100` | See Layer 7 above | Tier B |

Scores NOT in v1 scope: `quality_score_0_100`, `sop_readiness_score_0_100`, `maturity_score_0_100`, `risk_score_0_100` — insufficient data inputs in current schema to compute honestly.

---

## 10. Dependencies (Enumerated — Reader-Verifiable)

All upstream items must be resolved or confirmed before the dependent Phase 1 iteration begins. Per MR-005 D-5 clause 5, each dependency cites its source location.

| # | Dependency | Blocks | Source / Location | Notes |
|---|---|---|---|---|
| DEP-01 | **#51 v2 analytics instrumentation** | PRD §4 success-metric measurement; all leading-indicator tracking | `IMPROVEMENT_BACKLOG.md` item #51; scored 13; planned iter 030 | No v3 success metrics are measurable without the 6-event spec from the analytics agent. v3 PRD §4 measurement plan is contingent on #51 shipping. |
| DEP-02 | **DV2-R01 v1-vs-v2 distribution comparison artifact** | `docs/analysis/HEALTH_SCORE_DISTRIBUTION_COMPARISON.md` baseline; #42 v1 retirement; v3 measurement baseline | `IMPROVEMENT_BACKLOG.md` DV2-R01 (P0, live pool); planned iter 029 | v3 `process_health_score_0_100` cannot be claimed as an improvement over v1 without this distribution artifact. Must ship before v3 health score is promoted as the primary metric. |
| DEP-03 | **DV2-R06 v1 shadow-function audit in `route.ts`** | Clean v3 metric pipeline; prevents v3 from inheriting duplicate computation paths | `DASHBOARD_V2_REVIEW_001.md` DV2-R06 (P1 cold pool); `route.ts:154,568,107` | Shadow functions (`computeAiOpportunityScore` v1, variation scoring v1, `computeIsStale`) must be eliminated before v3 computation layer is wired to the route. v3 must not inherit these divergent implementations. |
| DEP-04 | **Prisma schema additive migration** for `workflow_run`, `workflow_step`, `step_edge`, `workflow_definition`, `process_group`, `metric_fact` tables | Tier B metric computation; all Layer 1–7 metrics requiring step-level data | INPUT_SPEC § 4 canonical data model; current Prisma schema at `apps/web-app/prisma/schema.prisma` | This is the primary schema expansion required for v3. All columns in INPUT_SPEC § 4 must be added via additive migration only (no destructive changes per D2). system-architect must design the migration plan. |
| DEP-05 | **`packages/process-engine/` canonical action taxonomy** | Variant hashing (D4); step type classification; `is_bottleneck_step` / `is_automation_candidate_step` flags | `packages/process-engine/` (segmentation, normalization, policy engines); `processSessionFull` export (iter 026) | The canonical action taxonomy from the policy engine is the input to Stage 2 Normalize (INPUT_SPEC § 12). Any change to the taxonomy invalidates existing variant hashes. Hash algorithm must be versioned. |
| DEP-06 | **#60 snapshot table architecture decision** | Per-workflow delta for portfolio health and trend views | `IMPROVEMENT_BACKLOG.md` item #60; DASHBOARD_V2_REVIEW_001 Arch lens (Option C recommendation) | Option C (nightly `workflow_health_snapshot` table) is now superseded by INPUT_SPEC § 11 `metric_fact` + `metric_rollup_daily` design. The system-architect must confirm whether the `metric_fact` design fully replaces the #60 snapshot-table requirement or whether a separate `workflow_health_snapshot` table is still needed. This is an open question for §14. |
| DEP-07 | **DV2-R02 + DV2-R03 WorkflowRow interaction hardening** | v3 workflow library must not ship with `window.prompt` / `window.confirm` dialogs or WCAG 2.1 SC 1.4.13 tooltip violations | `IMPROVEMENT_BACKLOG.md` DV2-R02 (P0); `IMPROVEMENT_BACKLOG.md` DV2-R03 (P0); planned iter 031 | v3 adds new interactive surfaces (column picker, drill-through panel, portfolio view). Shipping v3 on top of existing WCAG violations compounds the accessibility debt. DV2-R02+R03 must close before v3 Phase 1 ships. |
| DEP-08 | **Variant hashing algorithm version pin** | Stable `variant_count` and `top_variant_share_pct`; prevents hash collision on policy-engine taxonomy changes | INPUT_SPEC § 4 `workflow_run.canonical_path_hash`; `packages/process-engine/` | Risk: if the canonical action taxonomy changes after variant hashes are stored, historical variant counts become incomparable. The system-architect must define a hash versioning scheme before Phase 1 ships (see Risk R-1 in §15). |

---

## 11. Phased Rollout

Mirrors PRD_DASHBOARD_V2 §14 (D1–D10 iteration table) adapted to INPUT_SPEC § 21 Engineering Roadmap phases.

### Phase 1 — v3 MVP default (target: iter 033–037 pending pool burn-down)

| Iter (estimate) | Deliverable | Artifact Gate | INPUT_SPEC Phase |
|---|---|---|---|
| Pre-Phase-1 prereqs | DV2-R01 (iter 029), #51 (iter 030), DV2-R02+R03 (iter 031), DV2-R05 seed (iter 032) | All listed deps closed | — |
| 033 | Prisma schema additive migration (DEP-04): `workflow_run`, `workflow_step`, `step_edge`, `metric_fact` tables. Backfill script for existing session data. system-architect primary. | `pnpm typecheck` clean. Migration is additive — zero destructive operations. Backfill script is idempotent and resumable. | Phase 1 — canonical data model |
| 034 | Metric computation pipeline: Stage 1–3 (ingest, normalize, enrich) per INPUT_SPEC § 12. Pure TypeScript module in `packages/process-engine/` or `apps/web-app/src/lib/`. Tier A metrics computed for all existing `workflow_run` records. | `pnpm test` passes (metric engine unit tests including all Tier A formulas). `pnpm typecheck` clean. | Phase 1 — run/step normalization + core metrics |
| 035 | Variant hashing + Tier B Layer 3 metrics: `variant_count`, `top_variant_share_pct`, `rework_rate_pct`. Requires `workflow_step` + `step_edge` data from iter 033 schema. Variant hash algorithm version-pinned. | Variant hash is deterministic: same step sequence always produces same hash. Regression tests cover hash stability under reorder. | Phase 1 — variant hashing + top-variant share |
| 036 | v3 workflow library UI: 9-column default view (§5), column picker (§6), updated `WorkflowRow` with new column data. Health Score column uses `computeHealthScoreV2` fallback pending v3 score computation. | `pnpm typecheck` clean. All 9 default columns render correct values or honest `—`. Column picker opens, toggles, and persists. Accessibility: column picker is keyboard navigable. | Phase 1 — workflow library KPI API + UI |
| 037 | Workflow detail view (§7): KPI strip, top-3 variants, step duration distribution, bottleneck radar, AI/automation opportunity section. Portfolio view (§8): top-10 value leakage, top-5 automation readiness, standardization summary. | All required sections from §7 render. Portfolio view accessible at `/dashboard/portfolio`. Data sourced from `metric_fact` rows. Lineage drill-to-source functional for at least 3 metrics. Lighthouse CI baseline recorded. | Phase 1 — complete |

### v2 retirement gate (between Phase 1 and Phase 2)

`computeHealthScoreV2` is retired as the primary health score formula when:
1. `process_health_score_0_100` computed from v3 `metric_fact` data is live for all workflows.
2. DV2-R01 distribution comparison artifact has been produced and confirms score distribution continuity (no cliff change in rankings).
3. DEP-03 (DV2-R06) shadow-function audit is complete and v1 shadow functions are removed from `route.ts`.

This is a post-Phase-1 step, not a Phase 1 deliverable.

### Phase 2 — v3.1 variance + bottleneck + automation (target: iter 038–042)

- Step variance engine: `step_error_rate_pct`, `step_rework_rate_pct`, `is_high_variance_step`, `is_bottleneck_step`.
- Bottleneck engine: full `bottleneck_impact_score` formula from `workflow_step` data (currently uses ProcessInsight fallback).
- Automation readiness full computation: `repetitiveness_score`, `rule_basedness_score` (heuristic, not ML).
- User/team metrics (Layer 5): `user_variance_score`, `team_variance_score` — requires multi-user model (Phase 2 infra dep).
- Trend and benchmark layer: `metric_rollup_weekly`, target-based benchmarks (self-historical only).
- v2 flag full retirement (#57): dependent on all v3 Phase 1 + DV2-R02/R03/R04 + DV2-R05 closing.

### Phase 3 — v3.2 simulation + prediction (target: post-iter 045)

- Simulation (UiPath-pattern throughput-time + automation-rate simulation).
- Prediction: cycle time regression forecasting.
- Cross-process impact graph.
- Prescriptive recommendations.
- Deferred: requires training data, model layer, and validated Tier D computation primitives.

---

## 12. Measurement Plan for the Metrics Engine Itself

The metrics product must be measured to determine whether it drives decisions. Per Ledgerium's measurement principle (CLAUDE.md § Measurement Principles): every feature must define baseline, expected improvement, and measurable outcome.

| Hypothesis | Metric | How Measured | Target | Time Horizon |
|---|---|---|---|---|
| Users who see metric detail take more focused remediation actions | Drill-through rate on workflows where `process_health_score < 60` | Umami: `metric_drill_click` on low-health workflow rows | ≥ 35% of sessions touching a low-health workflow include a drill-through event | 30 days post-Phase-1 ship |
| Column picker discovery drives analyst retention | Column picker open rate among analyst-tier accounts (5+ workflows) | Umami: `column_picker_open` per unique account per week | ≥ 40% of analyst-tier accounts open the column picker at least once per 14-day window | 30 days post-Phase-1 ship |
| Portfolio view drives executive engagement | Session frequency delta for users who visit `/dashboard/portfolio` vs those who do not | Umami: sessions per unique user per week, segmented by `portfolio_view_open` | Portfolio-viewing users have ≥ 30% higher weekly session frequency | 60 days post-Phase-1 ship |
| Metric lineage (drill-to-source) increases trust in the health score | Support contact rate about "incorrect" health scores | Support ticket volume tagged `health_score_confusion` | < 1 support contact per 100 active accounts per month after v3 ships (vs baseline from v2 period) | 60 days post-Phase-1 ship |
| v3 metrics engine produces more stable health-score rankings than v2 | Rank-order correlation between v2 and v3 scores on the same workflow set | DV2-R01 distribution comparison extended to v3 scores; Spearman correlation | ρ ≥ 0.80 (rankings are substantially preserved; v3 is a refinement, not a reversal) | At Phase 2 v3-score-goes-live checkpoint |

**Recursive measurement gate.** Before Phase 2 begins, the following must be true:
1. At least 3 of the 5 hypothesis metrics above have been measured for at least 30 days.
2. Column picker adoption ≥ 30% (target) confirms the feature is in use before we invest in backend persistence.
3. Drill-through rate ≥ 35% confirms analysts are using metric evidence — prerequisite for building deeper variant explorer and simulation tools in Phase 3.

---

## 13. MVP Boundary and Non-Goals

The following are explicitly out of scope for v1 (Phase 1) and must not be introduced without a separate PRD and CEO approval.

**Multi-actor and team metrics:**
`user_variance_score`, `team_variance_score`, `top_performer_delta_pct`, `novice_vs_expert_delta_pct` — the current data model is single-tenant; there is no user model supporting comparison across actors within a workspace. Team metrics are a Phase 2 item contingent on multi-user account model.

**Cost and financial layer (Tier C):**
All Layer 8 metrics except the `—` placeholder columns for `cost_per_run` and `savings_opportunity_usd`. No labor rate configuration. No financial calculation. The current product has no cost model; any USD value would be fabricated.

**Simulation:**
No "what if" or throughput simulation (Phase 3). This requires a validated data model, a simulation engine, and UI surfaces well beyond the current stack.

**Predictive / ML scoring (Tier D):**
`ai_suitability_score_0_100`, `decision_complexity_score_0_100`, `rule_basedness_score_0_100` (ML-derived). Requires labeled training data and a model serving layer not in the current stack.

**Alerting and notification layer:**
INPUT_SPEC § 15 (Alerting and Insight Rules) insight types are surfaced as dashboard InsightChips only. No push notification, email, or webhook-based alerting in v1. Alerting is a Phase 2 item and requires a notification infrastructure decision.

**Benchmark framework:**
No peer-workflow benchmarks, department benchmarks, or target benchmarks in v1. The only benchmark available in v1 is self-historical (prior-period delta). `percentile_rank` and `target` fields in `metric_fact` will be present in schema but populated as null until Phase 2 benchmark layer is built.

**Workspace override UI:**
No UI for configuring SLA thresholds, cost assumptions, scoring weights, business calendar, working hours, or currency in v1. The `metric_fact` schema supports these fields; the configuration surface is Phase 2.

**Backend preferences persistence for column config:**
Column picker state persists in localStorage only (v1). Backend sync is Phase 2.

**Chatbot or conversational interface:**
Out of scope per PRD_DASHBOARD_V2 §2 non-goals. Reaffirmed here.

---

## 14. Open Questions / CEO Decisions Needed

The following require CEO input before Phase 1 build iterations begin. This PRD is not buildable until these are resolved.

| ID | Question | PM Recommendation | Risk if Deferred |
|---|---|---|---|
| OQ-01 | **Does `metric_fact` design (INPUT_SPEC § 11) fully supersede the #60 snapshot-table architecture?** The system-architect must confirm whether `metric_rollup_daily` replaces `workflow_health_snapshot` for the per-workflow delta computation currently implemented in `computePortfolioHealthScorePrior`. | Likely yes, but requires system-architect confirmation before iter 033 schema migration. | If #60 and INPUT_SPEC § 11 are redundant, the schema has two competing delta mechanisms. |
| OQ-02 | **Is the `standardization_score_0_100` fallback formula acceptable when no canonical path is defined?** v1 workflows in the current schema have no explicit canonical path. The Layer 3 `happy_path_share_pct` component is unavailable. | Accept a 2-component fallback (`top_variant_share` + `1 − variant_entropy`) and render a `*` annotation indicating partial formula. | If "not acceptable," `standardization_score` renders `—` for all workflows until canonical paths are defined (a separate Phase 2 feature). This materially reduces v1 metric coverage. |
| OQ-03 | **What is the v1 plan gating for the portfolio view?** The portfolio view is a new surface that was not present in v2. Should it be Starter+ gated, or available to all plans? | Available to all plans (no gating) — the portfolio view surfaces the same data as the workflow library in aggregated form; gating it creates a misleading free-tier experience. | Gating decision affects the upgrade CTA story (DV2-R08) and the growth strategy for v3. |
| OQ-04 | **Is the 9-column default view the right starting point, or should v3 maintain the v2 4-column default for new users?** The 9-column view is richer but risks the "spreadsheet register" (PRD_DASHBOARD_V2 D10 rationale). | New users (< 5 workflows) see the 4-column v2 default. Users with ≥ 5 workflows see the 9-column v3 default. This is a progressive disclosure approach. | If rejected: either all users get 9 columns (risks confusion for new users) or all users get 4 columns (does not surface the new v3 depth). |
| OQ-05 | **What is the minimum run count threshold for a workflow to appear in the portfolio view top-10 lists?** A single-run workflow could rank first in bottleneck impact if its one run had high wait time. | Minimum 5 runs to appear in portfolio ranking lists. Fewer than 5 renders the workflow in a "Needs more data" section instead. | Without a minimum, portfolio rankings are dominated by sparse workflows and mislead executives. |
| OQ-06 | **Honest-labels flag on `automation_readiness_score_0_100`:** does "readiness" language require explicit sign-off from growth-strategist before v3 ships?** The current formula does not assess external feasibility. | Yes — growth-strategist copy pass required before this label appears in any customer-facing surface. Recommend `automation_signal_score` as the working name for development; growth-strategist confirms the final label. | If shipped with "readiness" language without validation, the product over-claims, violating Ledgerium's honest-labels principle. |
| OQ-07 | **Backfill strategy for pre-engine workflow data.** The current schema has workflow records from before the `workflow_step` table exists. These records cannot be backfilled with step-level data retroactively. Are these workflows allowed to show `—` for all Tier B metrics permanently, or is a best-effort inference approach acceptable? | Show `—` for Tier B metrics on pre-migration workflows. Do not infer or fabricate step data. Provide a "Record a new run to see full metrics" CTA on affected workflows. | If "inference acceptable," the product silently computes uncertain metrics, violating the evidence-before-interpretation principle. |

---

## 15. Risks

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R-1 | **Variant hashing instability.** If the canonical action taxonomy in `packages/process-engine/` changes (policy engine update, new action types, normalization improvements), all existing `variant_hash` values become stale. Historical variant counts become incomparable to current counts. | Medium — policy engine is actively developed | High — variant trend analysis is meaningless if hashes are not stable across versions | Pin the hash algorithm at a semantic version (e.g., `variant_hash_v1`) before Phase 1 ships. Store `hash_version` in `workflow_run`. When the taxonomy changes, compute a new hash version in parallel for a migration window. Never delete old hash values. This is a DEP-08 blocker. |
| R-2 | **Confidence threshold calibration.** The v2 health score uses `confidence` as a 0–1 proxy for `dataQuality`. The actual distribution of confidence values in production data is unknown until DV2-R01 runs. If most workflows have confidence clustered in a narrow band (e.g., 0.7–0.9), the dataQuality dimension contributes very little differentiation to the health score, and the composite score is effectively a 3-component formula. | Medium — distribution is not observed yet | Medium — v3 health score may be misleading for planning purposes if confidence is poorly calibrated | DV2-R01 must include confidence distribution data alongside health score distributions. If confidence is poorly distributed, recalibrate the `dataQuality` component using a different signal before v3 health score replaces v2. |
| R-3 | **`workflow_step` data availability gap.** All Tier B metrics (flow efficiency, bottleneck analysis, step timing, rework detection) require `workflow_step` table data. The current schema does not have this table. Backfilling existing sessions is possible for recent sessions where the raw recording JSON is preserved, but not for sessions where only normalized metadata was stored. | High — most existing workflows have no step-level data | High — v3 dashboard shows `—` for most Tier B metrics on launch, making it look incomplete | Set clear user expectations at launch ("Full metrics available for runs recorded after [v3 launch date]"). Instrument a metric tracking the % of workflows with ≥ 3 Tier-B-computable runs. Communicate Phase 1 scope as "Tier A metrics are live; Tier B metrics populate over the next 30 days as new runs are recorded." |
| R-4 | **DV2-R06 shadow-function divergence.** The route.ts v1 shadow functions (`computeAiOpportunityScore` v1 at line 154, variation scoring v1 at line 568, `computeIsStale` at line 107) are diverged from the `workflow-metrics.ts` v2 implementations. If v3 builds on the `workflow-metrics.ts` module without first closing DV2-R06, the route will compute metrics from both implementations simultaneously, producing inconsistent API responses. | High — shadow functions confirmed present by DASHBOARD_V2_REVIEW_001 | High — metric inconsistency across API and dashboard surfaces; breaks the determinism principle | DV2-R06 is a listed dependency (DEP-03). Phase 1 iter 033 (schema migration) must NOT begin until DEP-03 is closed. Coordinator must enforce this gate. |
| R-5 | **Portfolio view over-claiming on `savings_opportunity_usd`.** If `cost_per_run` or `savings_opportunity_usd` renders any non-`—` value in Phase 1 (e.g., a heuristic estimate), the executive portfolio view will display financial figures without a cost model. This is a direct violation of the "no fake insight text" principle and exposes Ledgerium to credibility risk. | Low if DEP implemented correctly; Medium if implementation pressure drives estimation | Critical — misinformation to executives is irreversible credibility damage | Enforce at the API layer: `cost_per_run` and `savings_opportunity_usd` return `null` if no cost model is configured. The frontend renders `—` for null. Add a CI test asserting that these fields are null in the absence of cost model configuration. |

---

## 16. Acceptance Criteria Summary

Per user story, testable by QA:

| Story | Criteria (summary) | Test method |
|---|---|---|
| A-01 | 9 default columns render; values or `—`; sort defaults to health ASC | Playwright: page load → assert 9 column headers; assert row order |
| A-02 | Detail view renders all 7 required sections; KPI values link to source runs; low-confidence badge when n < 10 | Playwright: click row → assert KPI strip section; click metric → assert lineage panel opens |
| A-03 | Column picker opens; toggles persist on reload; max 12 columns enforced; Name column always visible | Playwright: open picker → toggle off a column → reload → assert removed; toggle 11 columns on → assert 12th is disabled |
| A-04 | Clicking column header cycles sort; `aria-sort` updates; default sort restores | Playwright: click header → assert sort direction; check `aria-sort` attribute |
| A-05 | Threshold filters apply correctly; "Needs attention" pre-built filter exists; multi-filter AND logic | Playwright: apply rework_rate > 20% filter → assert only qualifying rows visible |
| E-01 | Portfolio health shows delta; color pip correct; `—` when insufficient prior data | Unit test: `computePortfolioHealthScorePrior` with < 3 prior workflows returns null; Playwright: assert delta renders |
| E-02 | Portfolio view renders at `/dashboard/portfolio`; top-10 list sorted correctly; SLA section shows `—`; page load ≤ 10s uncached | Playwright: navigate to `/dashboard/portfolio` → assert all required sections; assert SLA fields are `—` |
| E-03 | All chip labels contain `→`; no chip renders for zero-count conditions | Unit test: `computeInsightChips` with zero qualifying workflows → assert no chips; assert all rendered labels contain `→` |

---

## 17. Rollout Integrity and Governance Notes

**MR-005 D-4 specialist-invocation gate assessment for this PRD:**
- This PRD introduces new data model contracts (`workflow_run`, `workflow_step`, `step_edge`, `metric_fact`) and a new computation pipeline exceeding 200 LOC. Per MR-005 Change D-4, `system-architect` MUST be invoked as primary or adjacent before Phase 1 build iterations begin. The DEP-04 schema migration and DEP-08 variant hash versioning are both contract-level decisions requiring architect review.
- This PRD introduces ≥ 3 user-visible copy strings (new column names, portfolio view labels, insight chip templates). Per MR-005 Change D-4, `growth-strategist` MUST be invoked for a copy pass before Phase 1 UI build begins. See honest-labels flags in §5 and OQ-06.

**Follow-up pool impact:**
This PRD does not generate follow-up backlog items at this time. Follow-up items will be generated as Phase 1 iterations close. The coordinator must track follow-up density per CLAUDE.md § Follow-Up Debt Policy.

**Phase 1 iteration count:**
Phase 1 as defined in §11 covers 5 build iterations (iter 033–037). Per CLAUDE.md § Operating Modes Mode 5 guardrail D-7, a sequence of N ≥ 6 items requires a meta-coordinator pre-check. N = 5 is within the soft cap. If the sequence grows to 6 during execution, the pre-check must be triggered before proceeding.

**Cold-pool pre-loaded items:**
DV2-R06 (shadow-function audit, P1 cold pool in DASHBOARD_V2_REVIEW_001) is an enumerated dependency (DEP-03) for this PRD. Per MR-005 D-5 clause 5 (PRD-trigger promotion), DV2-R06 is hereby promoted from cold pool to live backlog. `Birth iter: PRD-promoted; promoting-PRD: docs/features/dashboard-v3-metrics-engine/PRD_METRICS_ENGINE.md §10 DEP-03`.

---

**End of PRD — Process Intelligence Metrics Engine (v3)**
