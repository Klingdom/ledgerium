# INPUT_SPEC — Process Intelligence Metrics Engine

**Status:** Canonical input for Path C Define phase
**Source:** CEO directive, 2026-04-21
**Mode:** Mode 3-adjacent Define-phase artifact (non-counting toward improvement-loop cadence)
**Scope:** v1 production baseline for Ledgerium AI's Process Intelligence Metrics Engine
**Consumers:** Define-phase specialist agents (product-manager, system-architect, ux-designer, qa-engineer, growth-strategist, analytics, competitive-researcher)
**Governance:** This spec is the input to Define-phase artifact generation. Specialist agents MUST translate + ground this spec against Ledgerium's current codebase (`apps/web-app/src/lib/workflow-metrics.ts`, `packages/process-engine/`, Prisma schema, `/api/workflows` route) — do NOT rewrite; ground + identify gaps, risks, sequencing.

---

## Product Intent

The engine must do five things well:

- Measure performance across workflow runs, steps, users, teams, systems, and time.
- Detect variation across similar workflows and process definitions.
- Surface bottlenecks, rework, and conformance issues.
- Quantify automation and AI opportunity.
- Produce simple top-level scores with full metric traceability underneath.

This structure aligns with how leading tools expose process KPIs, process variants, lead/throughput times, conformance analysis, and simulation-ready optimization levers (Celonis, SAP Signavio, IBM Process Mining, UiPath Process Mining).

---

## Design Principles

### Metric principles

Every metric in the engine must be:

- Deterministic
- Explainable
- Time-bounded
- Filter-safe
- Drillable to source evidence
- Composable into scores

### Computation principles

The engine should support:

- On-demand recomputation under filters, similar to modern KPI systems in process mining products.
- Pre-aggregated rollups for dashboard speed.
- Raw evidence lineage from every metric back to workflow runs, steps, and timestamps.
- Case-level and event-level metrics, reflecting how major platforms separate cases, events, dimensions, and measures.

---

## Scope

### Input sources

The engine will ingest:

- Recorded workflow JSONs
- Normalized task/event logs
- User/session metadata
- System/app metadata
- Process-definition clustering output
- SOP/process-map interpretation output
- Optional business metadata like owner, department, priority, value, SLA, cost

### Output layers

The engine must produce:

- Step-level metrics
- Run-level metrics
- Workflow-definition metrics
- Process-group metrics
- Cross-process portfolio metrics
- User/team metrics
- Opportunity metrics
- Composite scores

---

## Canonical Data Model

### Core entities

#### A. workflow_run — single recorded execution instance

Fields:

- `run_id`
- `workflow_definition_id` (nullable)
- `process_group_id` (nullable)
- `user_id`
- `team_id`
- `started_at`
- `ended_at`
- `timezone`
- `status` (completed, abandoned, partial, failed)
- `source_type` (browser_recorder, desktop_recorder, imported_event_log, manual)
- `total_duration_ms`
- `active_duration_ms`
- `idle_duration_ms`
- `step_count`
- `system_count`
- `application_switch_count`

#### B. workflow_step — normalized atomic step inside a run

Fields:

- `step_id`
- `run_id`
- `sequence_index`
- `canonical_step_id` (nullable)
- `raw_action_type`
- `human_action_label`
- `system_name`
- `screen_name`
- `element_label`
- `started_at`
- `ended_at`
- `duration_ms`
- `is_manual`
- `is_automated`
- `is_decision`
- `is_navigation`
- `is_data_entry`
- `is_lookup`
- `is_wait_state`
- `is_rework_candidate`
- `is_error_event`
- `confidence_score`

#### C. workflow_definition — canonical grouped workflow

Fields:

- `workflow_definition_id`
- `name`
- `description`
- `owner_id`
- `department`
- `version`
- `created_at`
- `run_count`
- `canonical_path_hash`

#### D. process_group — higher-order grouping of similar workflow definitions

Fields:

- `process_group_id`
- `name`
- `description`
- `run_count`
- `definition_count`

#### E. step_edge — transition between steps

Fields:

- `edge_id`
- `run_id`
- `from_step_id`
- `to_step_id`
- `transition_duration_ms`
- `is_rework_edge`
- `is_loop_edge`

#### F. metric_fact — stores computed metric values at a given grain

Fields:

- `metric_fact_id`
- `metric_key`
- `metric_version`
- `entity_type` (step, run, definition, group, user, team, system, portfolio)
- `entity_id`
- `window_start`
- `window_end`
- `filter_hash`
- `value_numeric`
- `value_text` (nullable)
- `denominator_numeric` (nullable)
- `unit`
- `computation_timestamp`
- `lineage_ref`

---

## Metric Taxonomy

### Layer 1: Operational flow metrics

Foundational — leading platforms center throughput/lead time, case KPI summaries, activity-sequence timing.

Required metrics:

- `cycle_time_ms`
- `throughput_time_ms`
- `processing_time_ms`
- `wait_time_ms`
- `idle_time_ms`
- `touch_time_ms`
- `flow_efficiency_pct = processing_time_ms / cycle_time_ms`
- `completion_rate_pct`
- `case_volume`
- `wip_count`
- `arrival_rate_per_day`
- `completion_rate_per_day`

Aggregations — for all duration metrics, compute: `mean`, `median`, `p75`, `p90`, `p95`, `min`, `max`, `stddev`. Do not rely on averages alone.

### Layer 2: Step performance metrics

Required metrics:

- `avg_step_duration_ms`
- `median_step_duration_ms`
- `step_wait_before_ms`
- `step_wait_after_ms`
- `step_frequency`
- `step_presence_rate_pct`
- `step_error_rate_pct`
- `step_rework_rate_pct`
- `step_skip_rate_pct`
- `step_repeat_count_avg`

Derived flags:

- `is_bottleneck_step`
- `is_high_variance_step`
- `is_high_rework_step`
- `is_automation_candidate_step`

### Layer 3: Variation and conformance metrics

Variants and conformance are core in Celonis, IBM, and SAP Signavio process discovery views.

Required metrics:

- `variant_count`
- `top_variant_share_pct`
- `happy_path_share_pct`
- `deviation_rate_pct`
- `loop_rate_pct`
- `rework_rate_pct`
- `path_length_avg`
- `path_length_stddev`
- `step_injection_rate_pct`
- `step_skip_rate_pct`
- `conformance_score_0_100`

Advanced metrics:

- `variant_entropy`
- `standardization_score_0_100`
- `path_efficiency_pct`
- `path_similarity_avg`

Definitions:

- **Variant:** distinct ordered step sequence for a run.
- **Happy path:** designated canonical or most efficient approved path.
- **Deviation:** any run diverging from canonical policy/path rules.
- **Loop:** repeated revisit to prior step or prior step class.

### Layer 4: Quality and outcome metrics

Required metrics:

- `error_rate_pct`
- `exception_rate_pct`
- `failure_rate_pct`
- `abandonment_rate_pct`
- `sla_breach_rate_pct`
- `first_pass_yield_pct`
- `rework_case_rate_pct`
- `on_time_completion_pct`

Optional business metrics:

- `customer_impact_score`
- `risk_event_rate`
- `escalation_rate_pct`

### Layer 5: Human/task mining behavior metrics

Task mining products emphasize user-level behavior, application usage, switching, and action timing.

Required metrics:

- `clicks_per_run`
- `actions_per_run`
- `avg_action_duration_ms`
- `system_count_per_run`
- `application_switch_rate`
- `copy_paste_rate`
- `data_entry_time_ms`
- `lookup_time_ms`
- `navigation_overhead_pct`
- `manual_effort_pct`
- `idle_bursts_count`
- `user_variance_score`

Comparative metrics:

- `top_performer_delta_pct`
- `novice_vs_expert_delta_pct`
- `team_variance_score`

### Layer 6: Bottleneck and constraint metrics

Required metrics:

- `bottleneck_impact_score`
- `delay_frequency_pct`
- `queue_time_ms`
- `max_wait_step_id`
- `critical_path_duration_ms`
- `critical_path_share_pct`
- `throughput_loss_estimate_ms`
- `throughput_loss_estimate_usd` (optional)

Primary formula:

```
bottleneck_impact_score = normalized(wait_time_ms at bottleneck step)
                       * normalized(step_frequency)
                       * normalized(case_volume)
```

### Layer 7: Automation and AI opportunity metrics

UiPath's simulation supports changing activity throughput time and automation rate, reinforcing making automation a first-class measurable lever.

Required metrics:

- `automation_rate_pct`
- `manual_step_share_pct`
- `automation_candidate_count`
- `automation_feasibility_score_0_100`
- `automation_savings_time_ms`
- `automation_savings_usd`
- `ai_suitability_score_0_100`
- `decision_complexity_score_0_100`
- `repetitiveness_score_0_100`
- `rule_basedness_score_0_100`

Opportunity classes:

- UI automation
- agentic task execution
- assisted data entry
- document extraction
- decision support
- knowledge retrieval
- email/message drafting
- exception handling
- system integration
- approval routing

### Layer 8: Financial metrics

Required metrics:

- `cost_per_run`
- `labor_cost_per_run`
- `labor_cost_per_step`
- `cost_of_rework`
- `cost_of_delay`
- `savings_opportunity_usd`
- `annualized_value_leakage_usd`
- `automation_roi_pct`

### Layer 9: Composite scores

Top products reduce complexity into KPI summaries and executive views rather than raw metric overload.

Required scores:

- `process_health_score_0_100`
- `efficiency_score_0_100`
- `quality_score_0_100`
- `standardization_score_0_100`
- `automation_readiness_score_0_100`
- `sop_readiness_score_0_100`
- `maturity_score_0_100`
- `risk_score_0_100`

---

## Metric Definitions and Formulas

### Core formulas

**Cycle time:**
```
cycle_time_ms = run.ended_at - run.started_at
```

**Processing time:**
```
processing_time_ms = sum(step.duration_ms where is_wait_state = false)
```

**Wait time:**
```
wait_time_ms = cycle_time_ms - processing_time_ms
```

**Flow efficiency:**
```
flow_efficiency_pct = processing_time_ms / cycle_time_ms * 100
```

**Completion rate:**
```
completion_rate_pct = completed_runs / total_runs * 100
```

**Rework rate:**
```
rework_rate_pct = runs_with_repeated_canonical_steps / total_runs * 100
```

**Variant count:**
```
variant_count = count(distinct variant_hash)
```

**Top variant share:**
```
top_variant_share_pct = runs_in_most_common_variant / total_runs * 100
```

**SLA breach rate:**
```
sla_breach_rate_pct = runs_exceeding_sla / total_runs * 100
```

**First pass yield:**
```
first_pass_yield_pct = runs_with_no_error_and_no_rework / completed_runs * 100
```

**Automation rate:**
```
automation_rate_pct = automated_steps / total_steps * 100
```

**Manual effort:**
```
manual_effort_pct = manual_duration_ms / total_active_duration_ms * 100
```

**Navigation overhead:**
```
navigation_overhead_pct = navigation_duration_ms / total_active_duration_ms * 100
```

**Standardization score (recommended baseline):**
```
standardization_score_0_100 = 100 * (
  0.45 * top_variant_share
  + 0.35 * happy_path_share
  + 0.20 * (1 - normalized_variant_entropy)
)
```

**Automation readiness score (recommended baseline):**
```
automation_readiness_score_0_100 =
    0.30 * repetitiveness
  + 0.25 * rule_basedness
  + 0.20 * volume_score
  + 0.15 * low_exception_score
  + 0.10 * structured_input_score
```

**Process health score (recommended baseline):**
```
process_health_score_0_100 =
    0.30 * efficiency_score
  + 0.25 * quality_score
  + 0.20 * standardization_score
  + 0.15 * sla_score
  + 0.10 * confidence_score
```

All composite weights should be configurable by workspace, while defaulting to product-approved presets.

---

## Metric Grain and Rollups

### Mandatory grains

Every metric must declare supported grains:

- `step`
- `run`
- `workflow_definition`
- `process_group`
- `user`
- `team`
- `system`
- `department`
- `time_period`
- `portfolio`

### Time windows

Supported windows:

- daily
- weekly
- monthly
- quarterly
- rolling 7d
- rolling 30d
- rolling 90d
- all-time

### Rollup rules

- Ratios must be recomputed from numerator and denominator, not averaged from child ratios.
- Duration rollups must preserve percentile availability.
- Composite scores must be recomputed from normalized underlying metrics, not averaged blindly.

---

## Normalization Framework

Many executive scores require normalization to a common 0–100 scale.

### Normalization methods

Supported:

- min-max normalization
- percentile normalization
- target-based normalization
- inverse target normalization
- z-score to bounded score

### Recommended defaults

- For durations: target-based inverse normalization
- For error/rework: inverse normalization
- For throughput/completion: positive target normalization
- For entropy/variation: inverse normalization

Example:
```
normalized_cycle_time_score = clamp(100 * target_cycle_time / actual_cycle_time, 0, 100)
```

---

## Quality, Confidence, and Lineage

### Data confidence

Each `metric_fact` must have:

- `data_coverage_pct`
- `evidence_count`
- `confidence_score_0_100`
- `missingness_flags`
- `anomaly_flags`

### Confidence inputs

Confidence should drop when:

- too few runs
- timestamp gaps
- ambiguous step labeling
- clustering uncertainty
- missing end states
- incomplete sessions

### Lineage

Every metric must support drill-through to:

- source runs
- source steps
- source events
- source screens/elements where available
- calculation version

This is essential for trust and debugging.

---

## Opportunity Engine Rules

### Automation candidate rule

A step becomes an automation candidate when:

- `repetitiveness_score >= threshold`
- `rule_basedness_score >= threshold`
- `step_frequency >= threshold`
- `exception_rate <= threshold`
- `confidence_score >= threshold`

### Bottleneck candidate rule

A step becomes a bottleneck when:

- `step_wait_before_ms` is above p90 for peer steps
- and `step_frequency` is materially high
- and `delay_frequency_pct` exceeds threshold

### Standardization issue rule

A workflow is flagged when:

- `variant_count` high relative to volume
- `top_variant_share_pct` low
- `step_injection_rate_pct` high
- `loop_rate_pct` high

### SOP improvement rule

A workflow is SOP-ready but weakly standardized when:

- high completion
- low error
- medium variation
- high confidence
- recurring manual navigation and labeling ambiguity

---

## Storage Architecture

### Recommended stores — hybrid architecture

**Raw store** — append-only event and recording evidence:

- `raw_recordings`
- `raw_events`
- `raw_screens`
- `raw_entities`

**Normalized relational store** — canonical process objects:

- `workflow_run`
- `workflow_step`
- `step_edge`
- `workflow_definition`
- `process_group`

**Metrics warehouse / OLAP layer** — dashboard and slice/dice speed:

- `metric_fact`
- `metric_rollup_daily`
- `metric_rollup_weekly`
- `score_fact`
- `opportunity_fact`

### Materialization strategy

- Raw metrics computed at ingestion completion
- Daily rollups materialized nightly
- On-demand recomputation for filtered analytical views
- Cache popular dashboard queries

Mirrors modern KPI systems that combine up-to-date analytical calculations with reusable dashboard metrics.

---

## Computation Pipeline

### Pipeline stages

**Stage 1: Ingest**
- Parse workflow JSON
- Validate schema
- Stamp ingestion metadata

**Stage 2: Normalize**
- Create run/step/edge objects
- Standardize timestamps
- Infer missing durations where possible
- Map raw actions to canonical action taxonomy

**Stage 3: Enrich**
- Detect step types
- Detect app/system names
- Infer manual vs automated
- Identify candidate waits, loops, and errors
- Compute variant hash

**Stage 4: Group**
- Cluster runs into workflow definitions
- Cluster definitions into process groups

**Stage 5: Metric compute**
- Compute run-level metrics
- Aggregate step metrics
- Compute variation metrics
- Compute opportunity metrics
- Compute composite scores

**Stage 6: Publish**
- Persist metric facts
- Update rollups
- Trigger dashboard refresh
- Trigger insights/opportunity generation

---

## API Contract

### Metric catalog endpoint

`GET /metrics/catalog`

Returns:

- `metric_key`
- `label`
- `description`
- `formula`
- `unit`
- `grains_supported`
- `filters_supported`
- `version`
- `category`
- `default_visualization`

### Metric query endpoint

`POST /metrics/query`

Input:

```json
{
  "metrics": ["cycle_time_ms", "flow_efficiency_pct", "variant_count"],
  "grain": "workflow_definition",
  "entity_ids": ["wf_123", "wf_456"],
  "time_window": {
    "start": "2026-01-01",
    "end": "2026-03-31"
  },
  "filters": {
    "team_id": ["team_finance"],
    "system_name": ["Salesforce", "Outlook"]
  },
  "group_by": ["workflow_definition", "month"],
  "include_lineage": false
}
```

### Score endpoint

`POST /scores/query`

Returns:

- score name
- value
- component metrics
- normalized component values
- trend
- confidence

### Opportunity endpoint

`POST /opportunities/query`

Returns:

- opportunity type
- affected entity
- estimated savings
- reasoning
- supporting metrics
- confidence

---

## Dashboard Output Requirements

### Workflow library cards/list

Each workflow row should expose, at minimum:

- process health score
- flow efficiency
- median cycle time
- run volume
- standardization score
- automation readiness
- top bottleneck step
- last recorded date
- confidence

### Workflow detail view

Must include:

- KPI strip
- process path and top variants
- step duration distribution
- bottleneck radar
- rework and loop insights
- user/team variance
- AI/automation opportunities
- trend view over time

### Executive portfolio view

Must include:

- number of process groups
- top 10 value leakage processes
- highest automation readiness processes
- worst SLA risk
- standardization heatmap
- department comparison

These views map to KPI summaries, process discovery, case variant, lead-time, and simulation concepts present across top products.

---

## Alerting and Insight Rules

### Required insight types

- cycle time regression
- rework spike
- variant explosion
- SLA breach risk
- bottleneck emergence
- automation candidate identified
- standardization drift
- team/user performance gap

### Example rules

- Alert when median cycle time worsens by >20% week-over-week and run volume > threshold
- Alert when top variant share drops below 40%
- Alert when rework rate increases above baseline + 2 stddev
- Alert when automation savings estimate exceeds configured value floor

---

## Versioning and Governance

### Metric versioning

Every metric must have:

- semantic version
- formula change log
- backfill policy
- deprecation policy

### Score governance

Scores are high-risk abstractions. Each score must store:

- component weights
- normalization method
- benchmark source
- version

### Workspace overrides

Allow customer overrides for:

- SLA thresholds
- cost assumptions
- scoring weights
- business calendar
- working hours
- currency

---

## Benchmarking Framework

SAP Signavio supports comparing key process metrics by process variant and benchmarking dimensions in process analysis contexts — benchmarks should be first-class.

### Benchmark types

- self historical benchmark
- peer workflow benchmark
- team benchmark
- department benchmark
- target benchmark
- best observed benchmark

### Required benchmark outputs

For any metric:

- actual
- target
- delta absolute
- delta percent
- percentile rank
- trend direction

---

## Performance Requirements

### Query latency targets

- top-level dashboard KPIs: < 500 ms cached, < 2 sec uncached
- workflow detail analytics: < 3 sec
- opportunity analysis: < 5 sec
- large portfolio rollups: < 10 sec

### Compute targets

- run-level metric compute after ingest: < 10 sec per typical recording
- daily rollup completion: before business-day dashboard open
- backfill jobs: resumable and idempotent

---

## Default Metric Pack for v1 Launch

**Do not launch with 80 metrics visible. Launch with this set:**

### Primary KPIs (8)

- process health score
- median cycle time
- flow efficiency
- run volume
- standardization score
- rework rate
- bottleneck impact score
- automation readiness score

### Secondary drill-down (7)

- top variant share
- error rate
- abandonment rate
- manual effort percent
- application switch rate
- cost per run
- savings opportunity

Keeps the product legible while matching the KPI summary and drill-down philosophy used by major platforms.

---

## Recommended SQL-Like Examples

### Example: run-level flow efficiency

```sql
SELECT
  run_id,
  SUM(CASE WHEN is_wait_state = false THEN duration_ms ELSE 0 END) AS processing_time_ms,
  MAX(ended_at) - MIN(started_at) AS cycle_time_ms,
  100.0 * SUM(CASE WHEN is_wait_state = false THEN duration_ms ELSE 0 END)
    / NULLIF(MAX(ended_at) - MIN(started_at), 0) AS flow_efficiency_pct
FROM workflow_step
GROUP BY run_id;
```

### Example: variant count by workflow definition

```sql
SELECT
  workflow_definition_id,
  COUNT(DISTINCT variant_hash) AS variant_count
FROM workflow_run
GROUP BY workflow_definition_id;
```

### Example: top variant share

```sql
WITH variant_counts AS (
  SELECT workflow_definition_id, variant_hash, COUNT(*) AS c
  FROM workflow_run
  GROUP BY workflow_definition_id, variant_hash
),
ranked AS (
  SELECT *,
         ROW_NUMBER() OVER (PARTITION BY workflow_definition_id ORDER BY c DESC) AS rn,
         SUM(c) OVER (PARTITION BY workflow_definition_id) AS total_c
  FROM variant_counts
)
SELECT
  workflow_definition_id,
  100.0 * c / NULLIF(total_c, 0) AS top_variant_share_pct
FROM ranked
WHERE rn = 1;
```

---

## Engineering Roadmap

### Phase 1

- canonical data model
- run/step normalization
- cycle time, processing time, wait time
- variant hashing
- top variant share
- rework detection
- process health score v1
- workflow library KPI API

### Phase 2

- step variance and bottleneck engine
- user/team metrics
- automation readiness
- opportunity engine
- trend and benchmark layer

### Phase 3

- simulation
- prediction
- cross-process impact graph
- prescriptive recommendations

Roadmap justified by the current market pattern: top platforms start with timing, variants, KPI summaries, and conformance, then extend into simulation, optimization, and prescriptive actions.

---

## Final Recommendation

**For Ledgerium, the winning architecture is:**

simple top-line metrics + deep drill-down + explainable opportunity scoring

- Do not make the dashboard a wall of KPIs.
- Make the engine broad, but make the UI selective.

**v1 north-star metrics:**

- Process Health
- Flow Efficiency
- Median Cycle Time
- Standardization
- Rework
- Bottleneck Impact
- Automation Readiness
- Savings Opportunity

Produces a product that feels modern, executive-readable, and operationally useful, while staying aligned with how current process mining leaders structure KPI, variant, timing, and optimization capabilities.

---

## Non-spec appendix — Ledgerium-specific context for Define-phase agents

Specialist agents MUST ground this spec against the following current-state anchors:

- **Current metrics engine (v2):** `apps/web-app/src/lib/workflow-metrics.ts` (305 LOC, 8 exported functions, 21 threshold constants; `computeHealthScoreV2`, `computeOpportunityTag`, `computeInsightChips` already shipped)
- **Current API:** `/api/workflows` route enriches each workflow with `metricsV2` (per-workflow) and stats with `portfolioHealthScore` + `portfolioHealthScorePrior` + `portfolioHealthScoreDelta` + `insightChips`
- **Current dashboard surface:** v2 live as default at `/dashboard` since iter 022; 4-column verdict grid per PRD_DASHBOARD_V2 §5.3; 6 components in `apps/web-app/src/components/dashboard-v2/`
- **Current extension pipeline:** `packages/process-engine/` (segmentation, normalization, policy engines, SOP templates); now exports `processSessionFull` (iter 026, Option A composed pipeline)
- **Current data model:** Prisma schema (`apps/web-app/prisma/schema.prisma`); single-tenant browser-extension-captured events; no multi-user/team model yet
- **Known gaps from DASHBOARD_V2_REVIEW_001 (2026-04-21):** zero PRD §4 measurement instrumented (#51 queued); v1 shadow functions in route.ts (DV2-R06 cold pool); snapshot-table architecture for #60 (Option C recommendation, now superseded by this spec's §11 metric warehouse); conversion-void upgrade CTA (DV2-R08)

Specialist agents should reference these anchors when assessing computability, migration, sequencing, and MVP boundary decisions.

---

**End of INPUT_SPEC**
