# ARCHITECTURE — Process Intelligence Metrics Engine (v3)

**Status:** Define-phase architecture artifact (ungrounded → grounded)
**Owner:** `system-architect`
**Date:** 2026-04-21
**Mode:** Mode 3-adjacent Define-phase artifact (non-counting)
**Invocation gate:** MR-005 D-4 new-contract ≥200 LOC fired (projected 2k–5k LOC; PRE-iteration review)
**Input spec:** `docs/features/dashboard-v3-metrics-engine/INPUT_SPEC.md`
**Supersedes (in part):** `IMPROVEMENT_BACKLOG.md` #60 snapshot-table Option C (this spec's §11 warehouse model is the correct home)
**Fixes on landing:** DV2-R10 `{data,error,meta}` envelope drift (v3 endpoints are the correct place to adopt canonical envelope)

---

## 1. Executive Summary

The current Ledgerium stack owns the **left half** of the Process Intelligence Metrics Engine (INPUT_SPEC §12 pipeline) and the **bottom half** of the metric taxonomy (INPUT_SPEC §5 Layers 1–3, partially 7). We have:

- A deterministic event → step pipeline in `packages/process-engine/` (`processSession`, `processSessionFull`) that already emits `ProcessRun`, `ProcessDefinition`, `ProcessMap`, and `SOP` with full event-level traceability.
- An **already-existing, already-deterministic** `@ledgerium/intelligence-engine` package (`packages/intelligence-engine/`) shipping `buildMetrics`, `analyzeTimestudy`, `analyzeVariance`, `detectVariants`, `detectBottlenecks`, `detectDrift`, `computeStandardizationScore`, `scoreAutomationOpportunity`, `computePathSignature`, `normalizeTitle`, `fingerprintStep`. This is the **single most under-leveraged surface** in our stack and collapses the v3 build effort dramatically.
- A v2 per-workflow/portfolio score surface in `apps/web-app/src/lib/workflow-metrics.ts` (305 LOC, well-scoped, pure) exposed via `/api/workflows` (815 LOC, mixed purity).

What is **missing** and what v3 must build:

1. A **canonical relational model** for `workflow_run`, `workflow_step`, `step_edge`, `workflow_definition`, `process_group` (INPUT_SPEC §4). Today these exist as **in-memory derived objects per request** (processed from `Workflow.toolsUsed`, `Workflow.confidence`, `ProcessDefinition` Prisma rows) — never persisted at run/step grain.
2. A **metric warehouse** (`metric_fact`, `metric_rollup_*`, `score_fact`, `opportunity_fact`) — INPUT_SPEC §11.
3. A **metric catalog + normalization framework** — INPUT_SPEC §5 + §8.
4. A **metric/score/opportunity API layer** (`/api/metrics/catalog`, `/api/metrics/query`, `/api/scores/query`, `/api/opportunities/query`) — INPUT_SPEC §13.
5. A **materialization pipeline** (BullMQ worker + Redis cache) — INPUT_SPEC §11.2.

**Target state (Phase 1 MVP):** canonical run/step persistence + variant hashing + 15 default metrics (INPUT_SPEC § "Default Metric Pack for v1 Launch") + `process_health_score` v3 + workflow library KPI API. Everything wired through a new `packages/metrics-engine/` workspace package (Ledgerium package-boundary precedent: intelligence-engine already follows this pattern).

**LOC-scale estimate (engine + persistence + API, new code only):**

| Layer | New LOC (Phase 1) | Notes |
|---|---|---|
| Prisma additive migrations (schema + indexes) | ~300 | 5 new models, 4 index decl blocks |
| `packages/metrics-engine/` (catalog + normalization + formula registry + rollup builders) | ~1,800 | Pure module; majority of engine |
| `apps/web-app/src/lib/metrics-persistence.ts` (Prisma adapter for metric_fact writes + reads) | ~400 | Thin DAL over Prisma |
| `apps/web-app/src/app/api/metrics/*/route.ts` + Zod schemas + envelope | ~600 | 4 routes × ~150 LOC avg |
| BullMQ worker `apps/worker/src/jobs/metrics-materialize.ts` | ~350 | Nightly rollup + on-ingest compute |
| Migration glue (v2 → v3 parallel run) | ~250 | Adapter `toMetricsInputV3` + fallback chain |
| Tests (co-located, all layers) | ~2,000 | Engine test:code ratio ~1.1× |
| **Total Phase 1 engine+persist+API+worker** | **~3,700 LOC + 2,000 test LOC** | |

Phase 2 (bottleneck engine, user/team, opportunity engine, benchmarks, trends): projected **+2,500 LOC + 1,200 test LOC**.
Phase 3 (simulation, prediction, impact graph): projected **+2,000 LOC + 800 test LOC**.

---

## 2. Computability Matrix — INPUT_SPEC §5 Metric Taxonomy

**Legend:**

- **Tier A — Computable today** from existing events/steps/definitions without new inputs or formulas. Engine hookup work only.
- **Tier B — Computable with a defined formula** (formula stated in spec) using existing signals. Requires adding the formula + normalization, not new inputs.
- **Tier C — Requires new inputs** (e.g., SLA configuration, business calendar, working hours, task-level labels, owner/department, cost rates). Requires a user-supplied config surface or new capture.
- **Tier D — Requires a cost model, ML model, or external benchmark** that Ledgerium does not own today (e.g., `automation_feasibility_score` ML, `customer_impact_score`, USD cost estimates without labor-rate input).

"Engine LOC" = additional pure-module lines to produce the metric from the stage it is blocked at, including its normalization path. Assumes canonical `workflow_run`/`workflow_step` persistence layer exists (§3).

### Layer 1 — Operational flow metrics (12 metrics + 8 aggregations)

| Metric | Tier | New primitives required | Engine LOC |
|---|---|---|---|
| `cycle_time_ms` | **A** | None — `run.endedAt − run.startedAt`; `processRun.durationMs` exists | 10 |
| `throughput_time_ms` | **A** (same as cycle in our model; formula clarify) | Doc note distinguishing throughput from cycle if they diverge; today identical | 10 |
| `processing_time_ms` | **B** | Sum `step.duration_ms where is_wait_state=false`; needs `is_wait_state` flag on step (see §3) | 40 |
| `wait_time_ms` | **B** | `cycle - processing` | 10 |
| `idle_time_ms` | **B** | Gap analysis between `step.ended_at` and next `step.started_at`; already segmented in the engine as `idle_gap` boundary reason | 60 |
| `touch_time_ms` | **B** | Sum `step.duration_ms where is_manual=true`; needs `is_manual` enrichment | 30 |
| `flow_efficiency_pct` | **B** | `processing / cycle`, null-safe | 15 |
| `completion_rate_pct` | **A** | `processRun.completionStatus='complete'` count / total; already computed by `buildMetrics` | 10 |
| `case_volume` | **A** | `count(runs)` grouped by entity | 10 |
| `wip_count` | **C** | Needs `status='in_progress'` snapshot at query time; today runs are terminal-only (complete/partial) — add `started_at/ended_at` snapshot logic + cutoff timestamp semantics | 80 |
| `arrival_rate_per_day` | **A** | `count(runs) where started_at ∈ day` | 20 |
| `completion_rate_per_day` | **A** | `count(runs) where completed_at ∈ day AND status='complete'` | 20 |
| Aggregations: `mean`, `median`, `p75`, `p90`, `p95`, `min`, `max`, `stddev` | **A** | All 8 already exist in `intelligence-engine/src/stats.ts` (`mean`, `median`, `percentile`) — add `p75`, `p95`, `stddev` (trivial) | 60 |

**Layer 1 verdict:** 9A / 3B / 1C / 0D · **~375 engine LOC**

### Layer 2 — Step performance metrics (10 metrics + 4 flags)

| Metric | Tier | New primitives required | Engine LOC |
|---|---|---|---|
| `avg_step_duration_ms` | **A** | Already in `StepPositionTimestudy.meanDurationMs` | 10 |
| `median_step_duration_ms` | **A** | Already in `StepPositionTimestudy.medianDurationMs` | 10 |
| `step_wait_before_ms` | **B** | Edge-level metric on `step_edge.transition_duration_ms`; edge currently implicit (sequence-only) — add edge persistence | 80 |
| `step_wait_after_ms` | **B** | Symmetric to above | 20 |
| `step_frequency` | **A** | `count(steps where canonical_step_id = X)` / `count(runs)` | 30 |
| `step_presence_rate_pct` | **B** | `runs_containing_step / total_runs` — needs `canonical_step_id` (see §3) | 40 |
| `step_error_rate_pct` | **A** | `step.grouping_reason='error_handling'` (exists) | 30 |
| `step_rework_rate_pct` | **B** | Needs `step_edge.is_rework_edge` — derive from loop detection over variant paths | 80 |
| `step_skip_rate_pct` | **B** | Compared to canonical path; needs canonical path resolution per definition | 60 |
| `step_repeat_count_avg` | **B** | Count of same-canonical-step occurrences per run | 30 |
| `is_bottleneck_step` | **A** | `intelligence-engine/detectBottlenecks` already ships this | 20 |
| `is_high_variance_step` | **A** | `intelligence-engine/analyzeVariance.highVarianceSteps` already ships this | 10 |
| `is_high_rework_step` | **B** | Threshold over `step_rework_rate_pct` | 20 |
| `is_automation_candidate_step` | **B** (D if we insist on feasibility ML) | Threshold logic over repetitiveness + rule-basedness + frequency (see Layer 7) | 50 |

**Layer 2 verdict:** 6A / 8B / 0C / 0D · **~490 engine LOC** (largest unit: edge persistence + rework detection)

### Layer 3 — Variation and conformance metrics (13 metrics)

| Metric | Tier | New primitives required | Engine LOC |
|---|---|---|---|
| `variant_count` | **A** | `intelligence-engine/detectVariants.variantCount` ships | 10 |
| `top_variant_share_pct` | **A** | `variants[0].frequency` | 10 |
| `happy_path_share_pct` | **C** | "Happy path" = designated canonical or approved; today we default `isStandardPath=true` to most-frequent. True happy path requires user designation. Fallback to "most frequent" is acceptable in v3 Phase 1. | 30 (with config later) |
| `deviation_rate_pct` | **B** | `1 - (standard_path_runs / total)`; trivial post-variant | 15 |
| `loop_rate_pct` | **B** | `runs_with_loop / total`; needs loop detection (repeat visits of same canonical step) | 60 |
| `rework_rate_pct` | **B** | `runs_with_rework / total` — reuse loop detection signal | 20 |
| `path_length_avg` | **A** | `mean(run.stepCount)` | 10 |
| `path_length_stddev` | **A** | `stdDev(run.stepCount)` — `analyzeVariance.stepCountVariance.stdDev` ships | 10 |
| `step_injection_rate_pct` | **B** | Steps in run not in canonical path / total steps; needs canonical path | 50 |
| `step_skip_rate_pct` | **B** | (same as Layer 2 duplicate) | 0 (shared) |
| `conformance_score_0_100` | **B** | Composite: (1 − deviation_rate) × weight + structural match; spec provides no exact formula → recommend `100 * (top_variant_share * 0.6 + (1 − variant_entropy) * 0.4)` | 80 |
| `variant_entropy` | **B** | Shannon entropy over variant frequencies: `−Σ p_i * log2(p_i)` | 30 |
| `standardization_score_0_100` | **B** | Spec baseline formula given; `intelligence-engine/computeStandardizationScore` ALREADY SHIPS this. Verify weight alignment with spec. | 20 |
| `path_efficiency_pct` | **B** | `canonical_path_length / actual_path_length` averaged | 40 |
| `path_similarity_avg` | **A** | `mean(variant.similarityToStandard)` — ships in `ProcessVariant` | 20 |

**Layer 3 verdict:** 5A / 9B / 1C / 0D · **~395 engine LOC** (most heavy lifting already in intelligence-engine)

### Layer 4 — Quality and outcome metrics (11 metrics)

| Metric | Tier | New primitives required | Engine LOC |
|---|---|---|---|
| `error_rate_pct` | **A** | `runs_with_error_step / total` — error step already classified | 20 |
| `exception_rate_pct` | **A** | `errorStepCount > 0 OR frictionIndicators.length > 0` per run | 20 |
| `failure_rate_pct` | **A** | `runs where status='failed' / total` — status field exists on workflow_run model (§3) | 15 |
| `abandonment_rate_pct` | **A** | `runs where completionStatus='partial' / total` — ships | 15 |
| `sla_breach_rate_pct` | **C** | Requires `sla_ms` config per workflow_definition OR global default; no capture today | 40 (+ config UI surface later) |
| `first_pass_yield_pct` | **B** | `runs with no_error AND no_rework / completed_runs`; composes error + rework signals | 30 |
| `rework_case_rate_pct` | **B** | Run-grain rework — composes Layer 2 step rework detection | 20 |
| `on_time_completion_pct` | **C** | Same SLA dependency as `sla_breach_rate_pct` | 0 (shared) |
| `customer_impact_score` | **D** | No customer outcome capture in our data model; would need CRM/ticket linkage or user-provided weighting | N/A v1 |
| `risk_event_rate` | **C** | Requires "risk event" taxonomy — user-defined labels OR insight-driven classifier | 50 (+ user labels) |
| `escalation_rate_pct` | **D** | Requires escalation event capture (out-of-band). Could proxy via `processInsight.severity='critical'` | 30 (proxy) |

**Layer 4 verdict:** 4A / 3B / 3C / 1D (+ 2 proxies) · **~240 engine LOC** (gated on SLA config)

### Layer 5 — Human/task mining behavior metrics (13 metrics + 3 comparative)

| Metric | Tier | New primitives required | Engine LOC |
|---|---|---|---|
| `clicks_per_run` | **A** | `count(normalizedEvents where event_type='interaction.click')` — ships | 15 |
| `actions_per_run` | **A** | `humanEventCount` (exists on ProcessRun) | 10 |
| `avg_action_duration_ms` | **A** | `totalHumanEventDuration / humanEventCount`; derive via timestamps | 20 |
| `system_count_per_run` | **A** | `processRun.systemsUsed.length` ships | 10 |
| `application_switch_rate` | **A** | Count distinct adjacent system boundaries in step sequence — `boundary_reason='app_context_changed'` | 30 |
| `copy_paste_rate` | **B** | Count events with action=copy/paste; requires canonical action taxonomy (currently partial) | 40 |
| `data_entry_time_ms` | **A** | Sum `step.duration_ms where grouping_reason='data_entry'` — ships | 15 |
| `lookup_time_ms` | **B** | Requires classifying "lookup" — can proxy via `grouping_reason='single_action'` on read-only pages | 40 |
| `navigation_overhead_pct` | **A** | `navigation_step_duration_sum / total_duration` — `navigationStepCount` exists, durations available | 25 |
| `manual_effort_pct` | **B** | Needs `is_manual` flag on step; default all human-actor steps manual in Phase 1 → 100% manual proxy | 30 |
| `idle_bursts_count` | **A** | Count `boundary_reason='idle_gap'` transitions — ships | 20 |
| `user_variance_score` | **C** | Needs multi-user data; Ledgerium today is single-user-per-upload. Team model exists (§Prisma) but runs are not team-attributed | 60 (+ schema link) |
| Comparative metrics (3) | **C** | All require multi-user cohort; blocked on user_id/team_id on workflow_run | 80 (incl. benchmark plumbing) |

**Layer 5 verdict:** 7A / 3B / 3C / 0D · **~365 engine LOC** (comparative metrics gated on team attribution)

### Layer 6 — Bottleneck and constraint metrics (8 metrics)

| Metric | Tier | New primitives required | Engine LOC |
|---|---|---|---|
| `bottleneck_impact_score` | **B** | Formula given in spec; composes `wait_time` at step × `step_frequency` × `case_volume` with min-max normalization | 80 |
| `delay_frequency_pct` | **B** | Runs with wait > threshold at step / total | 30 |
| `queue_time_ms` | **B** | = `step_wait_before_ms` aggregated | 10 |
| `max_wait_step_id` | **A** | `argmax(wait_time_ms)` across steps | 15 |
| `critical_path_duration_ms` | **B** | Longest step-duration chain; in sequential workflows = sum of all — for parallel workflows requires DAG analysis (not our case today) | 40 |
| `critical_path_share_pct` | **B** | `critical_path_duration / cycle_time` | 15 |
| `throughput_loss_estimate_ms` | **B** | `sum(actual_wait - target_wait)` — needs target | 40 (+ target config) |
| `throughput_loss_estimate_usd` | **D** | Needs labor cost rate config + conversion | 20 (post Layer 8) |

**Layer 6 verdict:** 1A / 6B / 0C / 1D · **~250 engine LOC**

### Layer 7 — Automation and AI opportunity metrics (10 metrics)

| Metric | Tier | New primitives required | Engine LOC |
|---|---|---|---|
| `automation_rate_pct` | **B** | `automated_steps / total_steps` — needs `is_automated` flag; proxy today via actor_type='system' (undercounts true automation) | 40 |
| `manual_step_share_pct` | **B** | Inverse of above | 10 |
| `automation_candidate_count` | **B** | Threshold rule over step-grain scores | 30 |
| `automation_feasibility_score_0_100` | **D** (heuristic **B**) | Spec says "feasibility" — true feasibility needs ML/knowledge base. Heuristic: `intelligence-engine/scoreAutomationOpportunity` already ships a factor-based score. Use that as the v1 surface. | 20 (wire-up) |
| `automation_savings_time_ms` | **C** | Requires `target_automation_rate` + cycle time | 30 |
| `automation_savings_usd` | **D** | Requires labor rate + savings time | 10 (post Layer 8) |
| `ai_suitability_score_0_100` | **B** (heuristic) | Composes repetitiveness + rule-basedness + low-decision-density | 60 |
| `decision_complexity_score_0_100` | **B** (heuristic) | Count of `isDecisionPoint` steps × branching factor | 40 |
| `repetitiveness_score_0_100` | **B** | Ratio of distinct canonical steps to total; high duplication = high repetitiveness | 30 |
| `rule_basedness_score_0_100` | **B** (heuristic) | Low variance + low friction + high completion → rule-based | 40 |

**Layer 7 verdict:** 0A / 7B / 1C / 2D (with B-tier heuristics available) · **~310 engine LOC**

### Layer 8 — Financial metrics (8 metrics)

**All financial metrics are Tier C or D.** None can be computed without workspace configuration (labor rate, currency, working hours) OR external data sources (cost of delay for specific process, downstream revenue impact).

| Metric | Tier | New primitives required | Engine LOC |
|---|---|---|---|
| `cost_per_run` | **C** | `labor_rate_usd_per_hour * run_duration_hours` | 20 |
| `labor_cost_per_run` | **C** | Same | 0 (alias) |
| `labor_cost_per_step` | **C** | Per-step derivation | 15 |
| `cost_of_rework` | **C** | Rework time × labor rate | 20 |
| `cost_of_delay` | **D** | Cost of delay is domain-specific (SaaS revenue lost per day, etc.); no generic formula | N/A v1 |
| `savings_opportunity_usd` | **C** | Automation savings × confidence | 25 |
| `annualized_value_leakage_usd` | **C** | Rollup to annual | 15 |
| `automation_roi_pct` | **C** | Savings / implementation cost; implementation cost user-provided | 30 |

**Layer 8 verdict:** 0A / 0B / 6C / 2D · **~125 engine LOC** (all gated on workspace-level cost config; recommend deferring to Phase 2 after `workspace_config` table ships)

### Layer 9 — Composite scores (8 scores)

| Score | Tier | New primitives required | Engine LOC |
|---|---|---|---|
| `process_health_score_0_100` | **B** | Spec formula given (efficiency + quality + standardization + sla + confidence); `computeHealthScoreV2` already ships a 4-component version (30/30/20/20); rebuild to spec weights (30/25/20/15/10) | 80 |
| `efficiency_score_0_100` | **B** | Normalize flow_efficiency_pct + throughput_time delta from target | 40 |
| `quality_score_0_100` | **B** | Composes error_rate + rework_rate + first_pass_yield, inverted | 40 |
| `standardization_score_0_100` | **B** | Spec formula given; intelligence-engine ships base version | 20 (wire-up + align) |
| `automation_readiness_score_0_100` | **B** | Spec formula given (repetitiveness 30 + rule_basedness 25 + volume 20 + low_exception 15 + structured_input 10) | 80 |
| `sop_readiness_score_0_100` | **B** | `computeSopReadinessProxy` v2 → port + elevate | 30 |
| `maturity_score_0_100` | **B** | Current `computeProcessMaturityScore` in route.ts shadow (v1) — formalize | 40 |
| `risk_score_0_100` | **B** | Composes error + abandonment + sla_breach + confidence_inverse | 50 |

**Layer 9 verdict:** 0A / 8B / 0C / 0D · **~380 engine LOC** (all computable with spec formulas over underlying metrics)

### Computability Matrix — Summary

**Total v3 metric taxonomy:** ~93 items (88 metrics + 5 composite score tracks, excluding flags counted within Layer 2)

| Tier | Count | Share | Interpretation |
|---|---|---|---|
| **A — Computable today** | **32** | **34%** | Immediate wins once canonical model ships |
| **B — Formula-only (new formulas, existing inputs)** | **44** | **47%** | Phase 1 + Phase 2 engine build |
| **C — New inputs required** | **13** | **14%** | SLA config, team attribution, cost config, canonical path designation |
| **D — Cost/ML model required** | **4** | **5%** | Defer or proxy; no v1 blockers |

**Primary conclusion:** **81% of v3 metrics are Tier A or B** — meaning once the canonical data model + normalization framework ship, the engine becomes formula-plumbing, not research. Tier C is gated on **three** specific config surfaces (SLA, team attribution, cost) that cleanly map to a workspace-config table. Tier D is 4 metrics that can be deferred without harming the v1 north-star metric set.

**Phase 1 v1 launch set (INPUT_SPEC "Default Metric Pack for v1 Launch", 15 metrics):**

| Metric | Tier | Ready for iter-029 window? |
|---|---|---|
| process_health_score | B | Yes (spec formula) |
| median_cycle_time | A | Yes |
| flow_efficiency | B | Yes (needs `is_wait_state`) |
| run_volume | A | Yes |
| standardization_score | B | Yes (ships in intelligence-engine) |
| rework_rate | B | Yes (needs loop detection) |
| bottleneck_impact_score | B | Yes (spec formula) |
| automation_readiness_score | B | Yes (spec formula) |
| top_variant_share | A | Yes (ships) |
| error_rate | A | Yes |
| abandonment_rate | A | Yes |
| manual_effort_pct | B | Partial (proxy OK for v1) |
| application_switch_rate | A | Yes |
| cost_per_run | C | **Defer to Phase 2** (cost config needed) |
| savings_opportunity | C | **Defer to Phase 2** (cost config needed) |

**Recommendation:** Ship Phase 1 with 13 of the 15 default metrics (drop cost_per_run + savings_opportunity until workspace cost config lands). This is the correct "broad engine, selective UI" posture per INPUT_SPEC final recommendation.

---

## 3. Canonical Data Model Mapping

### Current Prisma schema (`apps/web-app/prisma/schema.prisma`)

| INPUT_SPEC §4 entity | Prisma status today | Gap | Migration plan |
|---|---|---|---|
| **A. workflow_run** | **Absent at run grain.** `Workflow` table holds workflow-as-upload, not per-execution run data. `ProcessRun` exists as an **in-memory output** of `processSession` — never persisted. | All run-level fields (`total_duration_ms`, `active_duration_ms`, `idle_duration_ms`, `step_count`, `status`, `source_type`, `timezone`, `system_count`, `application_switch_count`) are not durable. | **New table `workflow_runs`** (additive). PK `id`, FK `workflow_id` → `workflows.id`, FK `user_id`, FK `process_definition_id` nullable, FK `process_group_id` nullable. Columns mirror INPUT_SPEC §4.A 1:1. Persisted at end of `processSession` via new adapter `persistProcessRun()`. |
| **B. workflow_step** | **Absent at persisted grain.** `ProcessRun.stepCount` is an int; `StepDefinition[]` exists in memory inside `ProcessDefinition`. | All step fields (`sequence_index`, `canonical_step_id`, `duration_ms`, `is_*` flags, `confidence_score`) not durable. | **New table `workflow_steps`** (additive). PK `id`, FK `run_id` → `workflow_runs.id`, FK `canonical_step_id` nullable. Key fields: `sequence_index`, `raw_action_type`, `human_action_label`, `system_name`, `screen_name`, `started_at`, `ended_at`, `duration_ms`, seven `is_*` boolean flags, `confidence_score`. Persisted alongside runs. |
| **C. workflow_definition** | **Partial match via `ProcessDefinition`** (Prisma model, currently aliased to "exact group"). Has `canonicalName`, `pathSignature`, `runCount`, `variantCount`, `avgDurationMs`, `stabilityScore`. | Missing: `owner_id` (partial — `userId` exists), `department`, dedicated `description`, `canonical_path_hash` field (currently `pathSignature` serves). `version` is stored only as a string on `ProcessVariantRecord`. | **Extend `process_definitions` table additively** with nullable `department` string, `canonical_path_hash` string (copy of `pathSignature` for stability). NO rename; preserve Phase 3 compatibility. |
| **D. process_group** | **Partial match via `ProcessFamily`.** Current model is `ProcessFamily` (higher-level cluster); `ProcessDefinition` with `familyId` resolves it. | Name mismatch only (spec: `process_group`, ours: `process_family`). All required fields exist. | **No migration needed.** Map spec `process_group_id` to `ProcessDefinition.familyId`. Document the alias in a `DATA_MODEL.md` annex. |
| **E. step_edge** | **Absent.** Edges are derivable from step sequence (implicit N→N+1) but never stored. | `transition_duration_ms`, `is_rework_edge`, `is_loop_edge` — none exist. | **New table `step_edges`** (additive). PK `id`, FK `run_id`, FK `from_step_id`, FK `to_step_id`. Populated alongside `workflow_steps` during persistence. Critical for Layer 2 rework/loop detection. |
| **F. metric_fact** | **Absent.** No metric persistence at all — each request recomputes via `computeWorkflowMetrics`. | Everything. | **New table `metric_facts`** (additive). PK `id` (uuid), `metric_key`, `metric_version`, `entity_type`, `entity_id`, `window_start`, `window_end`, `filter_hash` (sha256 of sorted filter JSON), `value_numeric`, `value_text`, `denominator_numeric`, `unit`, `computed_at`, `lineage_ref` (JSON blob — see §9). Indexes: `(entity_type, entity_id, metric_key, window_start, window_end)` for point query; `(metric_key, window_start)` for time-series; `(filter_hash)` for filter-cache hit. |

### Additional Phase 1 tables (INPUT_SPEC §11)

| Table | Purpose | Schema sketch |
|---|---|---|
| `metric_rollup_daily` | Pre-aggregated daily metric rollups for dashboard speed | (metric_key, entity_type, entity_id, day_ts, value_numeric, denominator_numeric, run_count) + same indexes |
| `metric_rollup_weekly` | Weekly rollup (materialized from daily) | same shape, week_start_ts |
| `score_fact` | Composite score storage with component breakdown | (score_key, entity_type, entity_id, window_start, window_end, value, components_json, normalization_method, version, computed_at) |
| `opportunity_fact` | Opportunity engine output | (opportunity_type, entity_type, entity_id, estimated_savings_ms, estimated_savings_usd, reasoning_json, supporting_metrics_json, confidence, detected_at) |
| `metric_catalog` | Runtime catalog (also packaged as typed constants in the engine) | (metric_key PK, label, description, formula_text, unit, grains_supported_csv, category, version, default_visualization) |
| `workspace_metric_config` | Per-workspace overrides for weights, SLA, cost rates | (user_id FK, config_json, version, updated_at) — JSON blob for MVP; promote to columns if access patterns warrant |

### SQLite-dev / Postgres-prod constraints

The current `datasource db.provider = "sqlite"` is a dev-only choice. Production is Postgres (per CLAUDE.md tech stack). Constraints that cross this boundary:

1. **JSON columns:** SQLite has no native JSON type but stores TEXT. Postgres has JSONB. Use TEXT in Prisma schema with `String` type; application code parses JSON. The existing schema follows this pattern (`intelligenceJson`, `metricsJson`, `explanationJson`). **Keep this pattern — do not introduce `Json` type dependency.**
2. **Timestamp columns:** SQLite stores as TEXT or numeric; Postgres DATETIME. Prisma abstracts this. No architecture decision needed.
3. **Indexes on JSON fields:** Postgres supports GIN on JSONB; SQLite does not. Avoid schema-level indexes over JSON; extract hot query fields to dedicated columns (e.g., `filter_hash` is a column, not a JSON path).
4. **BIGINT / numeric durations:** `total_duration_ms` may exceed 32-bit for multi-hour runs. Use Prisma `BigInt` → Postgres `bigint` / SQLite `INTEGER` (SQLite integers are 64-bit native).

**Additive-migration discipline:** All six new tables are additive (no rename, no column drop). Extensions to `process_definitions` are additive nullable columns. Zero backward-compat breakage. Drop targets: NONE in Phase 1.

### Entity-to-Prisma model cross-reference (summary)

| Spec name | Prisma model (existing or new) | Status |
|---|---|---|
| workflow_run | `WorkflowRun` (NEW) | Create |
| workflow_step | `WorkflowStep` (NEW) | Create |
| step_edge | `StepEdge` (NEW) | Create |
| workflow_definition | `ProcessDefinition` (extend) | Additive columns |
| process_group | `ProcessFamily` (alias) | Document mapping |
| metric_fact | `MetricFact` (NEW) | Create |
| metric_rollup_daily | `MetricRollupDaily` (NEW) | Create |
| score_fact | `ScoreFact` (NEW) | Create |
| opportunity_fact | `OpportunityFact` (NEW) | Create |
| workspace_metric_config | `WorkspaceMetricConfig` (NEW) | Create |

**Full Prisma DDL is out of scope for this architecture doc and belongs in `DATA_MODEL.md` when backend-engineer owns the migration iteration.**

---

## 4. Pipeline Architecture — INPUT_SPEC §12 mapped to current flow

INPUT_SPEC §12 pipeline:
`Ingest → Normalize → Enrich → Group → Metric Compute → Publish`

### Stage-by-stage mapping

| Stage | Current home | Status | Gap / restructuring |
|---|---|---|---|
| **1. Ingest** | Chrome extension → `/api/sessions` → session JSON on disk → `/api/uploads` → `Upload` Prisma row | **Exists** | No change. Add ingestion-timestamp field to `workflow_runs` (already in spec §4.A). |
| **2. Normalize** | `packages/normalization-engine/src/normalizer.ts` + `packages/schema-events/` | **Exists** — canonical event shape already deterministic | Add **`is_wait_state` inference** (idle_gap → wait), **canonical action taxonomy mapping** (current: `grouping_reason`; target: `canonical_action_type` on step). |
| **3. Enrich** | `packages/process-engine/src/contentEnricher.ts`, `stepAnalyzer.ts` | **Exists** — friction, decision-point, roles, business-objective inference | Add **variant_hash computation** (currently computed inside `intelligence-engine/pathSignature` but not persisted on workflow_run), **is_manual/is_automated** flags (today: actor_type proxy), **is_data_entry/is_lookup/is_navigation** flags (today: derived from `grouping_reason`, promote to explicit boolean columns). |
| **4. Group** | `packages/intelligence-engine/` family + exact-group clustering; writes to `ProcessDefinition` + `ProcessFamily` | **Exists** — shipped in Phase 3 | No change for Phase 1. Phase 2 may add cross-process clustering. |
| **5. Metric compute** | `apps/web-app/src/lib/workflow-metrics.ts` (v2) + `apps/web-app/src/app/api/workflows/route.ts` (v1 shadow functions, DV2-R06) + `packages/intelligence-engine/buildMetrics/analyzeTimestudy/etc.` | **Partial, fragmented** | **Primary v3 build target.** Consolidate into new `packages/metrics-engine/`. Replace v1 shadow functions in route.ts. Compute at ingest time into `metric_facts`. |
| **6. Publish** | None (metrics recomputed per request) | **Absent** | **Primary v3 build target.** BullMQ job `metrics-materialize` writes metric_facts + rollups. Redis cache invalidation on ingest. Dashboard refresh via API query. |

### Proposed v3 pipeline integration

Current `processSessionFull(input) → { output, artifacts, sopValidation }` extended with a new composition:

```
processSessionFull(input)
  → output (ProcessRun, ProcessDefinition, ProcessMap, SOP)
  → [NEW] persistProcessRun(output, userId, uploadId, prisma)
     → writes workflow_run + workflow_steps + step_edges rows
  → [NEW] enqueue metrics-materialize job (BullMQ)
     → job reads persisted rows
     → computes metric_facts for new run's entity_id
     → updates rollups
     → invalidates Redis cache keys matching this workflow_definition_id
```

Request-time metric read path:

```
GET /api/metrics/query
  → Zod-validate body
  → compute filter_hash(sorted(filters))
  → Redis GET cache_key(metric_key, entity_id, window, filter_hash)
     → hit: return
     → miss:
        → Prisma query metric_facts with (metric_key, entity, window, filter_hash)
           → hit: write to Redis with 5-min TTL, return
           → miss (filter combination never materialized):
              → delegate to OnDemandComputer
              → writes metric_fact back with computation_timestamp
              → cache, return
```

This design satisfies INPUT_SPEC §11.2 materialization-strategy four-tier cascade (raw on ingest → daily nightly → on-demand → cache popular).

---

## 5. Storage Architecture

### INPUT_SPEC §11 three-store model

| Store | Ledgerium Phase 1 recommendation | Rationale |
|---|---|---|
| **Raw store** (raw_recordings, raw_events, raw_screens, raw_entities) | **Keep current pattern**: raw JSON on disk (`Upload.rawJsonPath`) + S3/MinIO in prod; DB-indexed metadata only | Immutability-first (CLAUDE.md core principle); append-only file-system pattern is already in place; no SQL storage cost. |
| **Normalized relational** (workflow_run, workflow_step, step_edge, workflow_definition, process_group) | **Postgres primary tables** (all six, see §3) | Deterministic pipeline writes; query isolation per user; transactional consistency with Prisma. |
| **OLAP / metric warehouse** (metric_fact, metric_rollup_*, score_fact, opportunity_fact) | **Postgres same-instance tables, NOT a separate warehouse for Phase 1** | See analysis below. |

### Same-DB warehouse vs separate warehouse — Phase 1 decision

**Recommendation: Postgres same-instance tables with BRIN/composite indexes. NO separate warehouse (ClickHouse/Snowflake/DuckDB/etc.) for Phase 1.**

**Reasoning:**

1. **Phase 1 traffic is single-tenant browser-captured** (per CLAUDE.md § "Current data model: single-tenant browser-extension-captured events; no multi-user/team model yet"). Expected scale for v1 soak: < 10k runs per workspace, < 100k steps, < 1M events. These fit trivially inside Postgres with correct indexes.
2. **Performance targets are achievable in Postgres.** Dashboard KPI latency target is 500ms cached / 2s uncached (§11). With:
   - pre-materialized `metric_facts` keyed by `(entity_type, entity_id, metric_key, window_start)`,
   - Redis for <500ms cached responses,
   - `filter_hash` for exact-filter cache hit,
   - BRIN index on `computation_timestamp` for time-range scans,
   the 2s uncached ceiling has significant headroom.
3. **Additional warehouse tier multiplies operational surface area.** Phase 1 Ledgerium is building engine correctness; introducing a separate OLAP tier now creates a second sync boundary, a second deployment target, and a second failure mode — all before the determinism + traceability story is paid for.
4. **Scaling path to Phase 2+ is clean.** When row counts exceed ~10M facts or query latencies regress, migrate `metric_fact` + rollups to a columnar store (DuckDB embedded for self-host, or Snowflake/BigQuery for cloud). The metric-query API layer (§7) is the stable abstraction that remains unchanged. Materialization jobs (§6) are re-pointed at the new store. Normalized relational + raw layers stay put.

**Trigger conditions for warehouse migration (Phase 2+):**

- Aggregate `metric_fact` row count > 10M
- p95 query latency on `/api/metrics/query` > 2s uncached after indexing optimization
- Multi-tenant launch (workspace sharding requires read replica)
- Cross-workspace benchmarking (INPUT_SPEC §17 peer benchmark) — this probably crosses the threshold

### JSONB in Postgres — where we use it, where we don't

**Use JSONB (stored as TEXT in Prisma; Postgres-native JSONB in prod via native types):**
- `metric_fact.lineage_ref` — variable shape per metric_key
- `score_fact.components_json` — score breakdown varies by score type
- `opportunity_fact.reasoning_json` — opportunity rules vary
- `workspace_metric_config.config_json` — MVP speed; promote to columns later if query patterns require

**Do NOT use JSONB for:**
- Any column used in `WHERE` / `ORDER BY` / `GROUP BY` in a hot path. Extract to real columns.
- `filter_hash` — **dedicated `CHAR(64)` column (sha256 hex)** to support the cache-key index.
- `metric_key`, `entity_type`, `entity_id` — always real columns.

---

## 6. Materialization + Caching Strategy

### Four-tier cascade (INPUT_SPEC §11.2)

| Tier | Trigger | Mechanism | Storage | Freshness |
|---|---|---|---|---|
| 1. Raw-on-ingest | `processSessionFull` completes + persist | BullMQ job `metrics-materialize` enqueued with priority HIGH; computes full metric set for the new run's entity_id | `metric_facts` table + `metric_rollup_daily` for current day bucket | ≤10s post-ingest (per INPUT_SPEC §18 compute target) |
| 2. Daily nightly rollup | Cron: 02:00 workspace-local (MVP: 02:00 UTC) | BullMQ job `metrics-daily-rollup` runs once per workspace; materializes previous-day `metric_rollup_daily` rows from facts; builds current week/month rollups; precomputes popular filter combinations | `metric_rollup_daily`, `metric_rollup_weekly` | T+1 business day (per §18: "before business-day dashboard open") |
| 3. On-demand filtered | API request for a `(metric_key, entity, window, filter_hash)` tuple never materialized | Synchronous `MetricEngine.computeOnDemand()` call inside `/api/metrics/query` route (bounded by 2s budget via AbortController + Redis deadline) | Writes result back to `metric_facts` with `computation_timestamp=now` | Real-time (first request pays compute cost; subsequent hits cache) |
| 4. Cache popular | Every read populates Redis | Redis `SET cache_key EX 300` (5-min TTL; configurable) with stampede protection via short-lived lock key | Redis | 5 minutes |

### BullMQ job topology

```
queue: metrics
  jobs:
    - metrics-materialize (priority: 10, on each new run)
        concurrency: 4 per worker, 2 workers
        idempotent by runId
    - metrics-daily-rollup (priority: 5, cron)
        concurrency: 1 (serial per workspace)
    - metrics-backfill (priority: 1, manual trigger)
        resumable, checkpointed by batch_id
    - metrics-rollup-invalidate (priority: 8, on metric-key version bump)
        fan-out re-materialization
```

### Redis cache-key scheme

Canonical key pattern (deterministic from query):

```
m:{workspace_id}:{metric_key}:{entity_type}:{entity_id}:{window_start}:{window_end}:{filter_hash}
```

TTLs:
- Single-metric point query: 300s
- Catalog response: 3600s
- Opportunity query: 600s
- Score query: 300s

Invalidation triggers:
- New `metric_fact` row for matching `(entity_type, entity_id)` → invalidate keys matching prefix `m:{workspace_id}:*:{entity_type}:{entity_id}:*`
- Metric-version bump → flush entire namespace `m:{workspace_id}:{metric_key}:*`
- Workspace config change → flush `m:{workspace_id}:*`

### Prisma query shapes

Typical point-query (KPI strip):
```ts
await prisma.metricFact.findFirst({
  where: {
    metricKey: 'process_health_score',
    entityType: 'workflow_definition',
    entityId: wfDefId,
    windowStart: { lte: window.start },
    windowEnd: { gte: window.end },
    filterHash: filterHash,
  },
  orderBy: { computedAt: 'desc' },
  select: { valueNumeric: true, denominatorNumeric: true, computedAt: true, lineageRef: true },
});
```

Typical time-series (trend view):
```ts
await prisma.metricRollupDaily.findMany({
  where: {
    metricKey: 'cycle_time_ms',
    entityType: 'workflow_definition',
    entityId: wfDefId,
    dayTs: { gte: windowStart, lte: windowEnd },
  },
  orderBy: { dayTs: 'asc' },
  select: { dayTs: true, valueNumeric: true, runCount: true },
});
```

Supporting indexes on `metric_facts`:
1. `(metricKey, entityType, entityId, windowStart, windowEnd)` — point query
2. `(filterHash)` — cache-miss lookup
3. `(entityType, entityId, computedAt)` — lineage reverse-lookup / debugging

---

## 7. API Contract

### Next.js App Router routes (all `POST` except catalog)

**All responses MUST conform to `{ data, error, meta }` envelope** per CLAUDE.md API Design contract. Fixes DV2-R10 drift.

#### 7.1 `GET /api/metrics/catalog`

Returns the full metric catalog + versions. Cached 1h.

Zod response:
```ts
MetricCatalogEntry = z.object({
  metric_key: z.string(),
  label: z.string(),
  description: z.string(),
  formula_text: z.string(),
  unit: z.enum(['ms', 'count', 'pct', 'score_0_100', 'usd', 'ratio']),
  grains_supported: z.array(z.enum(['step', 'run', 'workflow_definition', 'process_group', 'user', 'team', 'system', 'department', 'time_period', 'portfolio'])),
  filters_supported: z.array(z.string()),
  version: z.string(), // semver
  category: z.enum(['flow', 'step_performance', 'variation', 'quality', 'human', 'bottleneck', 'automation', 'financial', 'composite']),
  default_visualization: z.enum(['kpi_number', 'trend_line', 'distribution', 'heatmap', 'bar_chart']),
});
ResponseEnvelope<MetricCatalogEntry[]>
```

#### 7.2 `POST /api/metrics/query`

The primary metric retrieval endpoint. Handles single-metric + multi-metric + time-series shapes.

Zod request:
```ts
MetricQuery = z.object({
  metrics: z.array(z.string()).min(1).max(20),       // metric_keys
  grain: z.enum(['step','run','workflow_definition','process_group','user','team','system','portfolio','time_period']),
  entity_ids: z.array(z.string()).min(1).max(500),
  time_window: z.object({
    start: z.string().datetime(),
    end: z.string().datetime(),
  }),
  filters: z.record(z.array(z.string())).optional(), // {team_id: [...], system_name: [...]}
  group_by: z.array(z.string()).optional(),
  include_lineage: z.boolean().default(false),
});
```

Zod response:
```ts
MetricQueryResult = z.object({
  data: z.array(z.object({
    metric_key: z.string(),
    entity_type: z.string(),
    entity_id: z.string(),
    window_start: z.string(),
    window_end: z.string(),
    value_numeric: z.number().nullable(),
    value_text: z.string().nullable(),
    denominator_numeric: z.number().nullable(),
    unit: z.string(),
    confidence_score: z.number(), // 0–100
    lineage_ref: z.unknown().optional(),
    group_by_key: z.string().optional(),
  })),
  error: z.null(),
  meta: z.object({
    total: z.number(),
    cached: z.boolean(),
    cache_hit_ratio: z.number(),
    computation_timestamp: z.string(),
    metric_versions: z.record(z.string()), // {metric_key: version}
    filter_hash: z.string(),
  }),
});
```

#### 7.3 `POST /api/scores/query`

Composite scores with component breakdown.

Zod response shape:
```ts
ScoreQueryResult = z.object({
  data: z.array(z.object({
    score_key: z.string(),
    entity_type: z.string(),
    entity_id: z.string(),
    value: z.number(), // 0–100
    component_metrics: z.array(z.object({
      metric_key: z.string(),
      raw_value: z.number(),
      normalized_value: z.number(), // 0–100
      weight: z.number(),
      contribution: z.number(),
    })),
    normalization_method: z.enum(['min_max','percentile','target_based','inverse_target','z_score']),
    trend_direction: z.enum(['up','down','flat']).nullable(),
    trend_change_pct: z.number().nullable(),
    confidence: z.number(),
    version: z.string(),
  })),
  error: z.null(),
  meta: z.object({ cached: z.boolean() }),
});
```

#### 7.4 `POST /api/opportunities/query`

Opportunity engine output.

Zod response shape:
```ts
OpportunityQueryResult = z.object({
  data: z.array(z.object({
    opportunity_type: z.enum(['automation_candidate','bottleneck','standardization_issue','sop_improvement']),
    affected_entity_type: z.string(),
    affected_entity_id: z.string(),
    estimated_savings_time_ms: z.number().nullable(),
    estimated_savings_usd: z.number().nullable(),
    reasoning: z.string(),
    supporting_metrics: z.array(z.object({
      metric_key: z.string(),
      value: z.number(),
    })),
    confidence: z.number(),
    detected_at: z.string(),
  })),
  error: z.null(),
  meta: z.object({ cached: z.boolean() }),
});
```

### Error envelope

Standard error shape (all 4xx/5xx):
```ts
{ data: null, error: { code: 'VALIDATION_ERROR' | 'UNAUTHORIZED' | 'RATE_LIMIT' | 'INTERNAL' | 'METRIC_NOT_FOUND' | 'ENTITY_NOT_FOUND', message: string, details?: unknown }, meta: { request_id: string } }
```

### Auth

All endpoints require `auth()` session (per `apps/web-app/src/lib/auth.ts`). Workspace scoping is enforced at the Prisma `where: { userId: session.user.id }` layer — same pattern as existing `/api/workflows/route.ts`.

### Backward-compatibility — `/api/workflows`

The existing `/api/workflows` route **stays in place unchanged** for Phase 1. v3 endpoints run in parallel. See §12 migration plan.

---

## 8. Normalization Framework

### INPUT_SPEC §8 five methods

| Method | Formula | Use for |
|---|---|---|
| min-max | `100 * (x − min) / (max − min)` | Unbounded distributions with known cohort |
| percentile | `rank(x) / n * 100` | Rank-based comparative scores |
| target-based | `100 * min(x / target, 1)` | Throughput, completion metrics |
| inverse target | `clamp(100 * target / max(x, ε), 0, 100)` | Duration, errors, rework |
| z-score bounded | `clamp(50 + 15*(x − μ)/σ, 0, 100)` | Variance-centered metrics |

### Recommended implementation pattern

**Single centralized normalization module inside the new `packages/metrics-engine/` package**, not extended inside `workflow-metrics.ts`.

Rationale:
1. Normalization is **metric-engine concern, not per-workflow concern**. Current `workflow-metrics.ts` is a per-workflow score compositor — a different layer.
2. Normalization must be **deterministic and explainable** (INPUT_SPEC §9). Centralized registry allows the lineage to include the exact normalization method applied.
3. Future workspace overrides (SLA, targets) need a single injection point.

Proposed module layout (see §15 for package boundary decision):
```
packages/metrics-engine/src/
  normalization/
    index.ts            // { normalize(method, value, context) }
    minMax.ts
    percentile.ts
    targetBased.ts
    inverseTarget.ts
    zScoreBounded.ts
    types.ts            // NormalizationMethod, NormalizationContext, NormalizedValue
    normalization.test.ts
```

Exported contract:
```ts
export interface NormalizationContext {
  method: NormalizationMethod;
  target?: number;
  min?: number;
  max?: number;
  cohort?: number[];
  epsilon?: number;
}

export interface NormalizedValue {
  raw: number;
  normalized: number;          // 0–100
  method: NormalizationMethod;
  contextSnapshot: Readonly<NormalizationContext>; // frozen for lineage
}

export function normalize(value: number, ctx: NormalizationContext): NormalizedValue;
```

Each composite-score formula then consumes `normalize()` results, and `score_fact.components_json` persists the `contextSnapshot` — full lineage + reproducibility.

---

## 9. Determinism + Explainability + Lineage

### Ledgerium principles applied

INPUT_SPEC §9 maps cleanly to Ledgerium core principles:

| INPUT_SPEC §9 | Ledgerium principle |
|---|---|
| Every metric must be deterministic | "Determinism before abstraction" |
| Drill-through to source evidence | "Traceability over convenience" |
| Calculation version stored per fact | "Every output traceable to source events" |
| Confidence inputs (coverage, missingness, anomaly) | "Evidence before interpretation" |

### `metric_fact.lineage_ref` schema

Stored as JSON, shape depends on metric. Common envelope:

```ts
type LineageRef = {
  schema_version: '1.0.0';                      // lineage schema version, separate from metric version
  metric_version: string;                        // e.g. 'process_health_score@1.2.0'
  computation_method: 'raw' | 'rollup' | 'on_demand';
  inputs: {
    run_ids: string[];                           // source evidence (capped at 100; reference-only above)
    run_ids_truncated: boolean;                  // true if >100
    step_ids?: string[];                         // for step-grain metrics
    normalization?: NormalizationContext;        // if normalized
    component_metrics?: Array<{                  // for composite scores
      metric_key: string;
      metric_version: string;
      raw_value: number;
      normalized_value: number;
      weight: number;
    }>;
  };
  confidence: {
    data_coverage_pct: number;                   // % of expected inputs present
    evidence_count: number;                      // raw count
    confidence_score_0_100: number;
    missingness_flags: string[];                 // e.g. ['missing_end_state', 'low_run_count']
    anomaly_flags: string[];                     // e.g. ['extreme_outlier_p99']
  };
  filter_hash: string;
  computed_at: string;
};
```

### Drill-through query pattern

Request: "Why is `process_health_score` for workflow_definition `wf_123` worth 42?"

```
GET /api/metrics/query?metric=process_health_score&entity=workflow_definition:wf_123&include_lineage=true
→ returns lineage_ref with component_metrics
   → each component_metric resolvable via
     GET /api/metrics/query?metric=<component>&entity=... &include_lineage=true
       → each component's lineage_ref.inputs.run_ids resolves to source workflow_runs
         → each run's evidence resolvable via existing /api/workflows/:id
           → back to raw session JSON at Upload.rawJsonPath
```

**Four-level drill-through: score → component metric → source runs → raw evidence.** All four levels expose their own `metric_version` so divergences across versions can be traced.

### `calculation_version` propagation

- Every `metric_fact.metric_version` is semver (`major.minor.patch`). Example: `process_health_score@1.2.0`.
- Version bump rules:
  - **patch** — bug fix, output identical to previous version on at least 99% of inputs; backfill optional
  - **minor** — new input added, output monotonically improves; backfill recommended, not required
  - **major** — formula change, output may diverge materially; backfill MANDATORY with parallel-run against prior version until `docs/analysis/METRIC_DISTRIBUTION_COMPARISON_v{old}_{new}.md` artifact ships (mirrors DV2-R01 pattern for health score)
- Catalog endpoint returns current version per metric_key. Queried results always include the version used.
- Rolling changes: multiple versions can coexist in `metric_facts`; readers prefer latest by `ORDER BY computed_at DESC`. Backfill job purges old versions after deprecation window.

---

## 10. Versioning + Governance

### Metric key semver pattern

Format: `<metric_key>@<major>.<minor>.<patch>` (human-readable) OR `{metric_key, metric_version}` two-column DB storage.

### Formula change log location

**Canonical location:** `packages/metrics-engine/src/catalog/CHANGELOG.md` + per-metric `formula_history` embedded in the catalog entry:
```ts
{
  metric_key: 'process_health_score',
  version: '1.2.0',
  formula_history: [
    { version: '1.0.0', changed_at: '2026-04-21', change: 'Initial Phase-1 version, 5-component weighted sum (30/25/20/15/10)', approved_by: 'system-architect' },
    { version: '1.1.0', changed_at: '<future>', change: 'Added confidence_score as 5th component', approved_by: 'system-architect' },
    ...
  ],
}
```

Rationale: engine-adjacent storage keeps the formula + changelog reader-verifiable at the same PR as the formula change. CLAUDE.md "traceability over convenience".

### Deprecation policy

1. New metric version ships behind `metric_versions_beta` config key (workspace-level override) before becoming default
2. Deprecated version remains computed for 2 soak cycles (30 days each = 60 days minimum)
3. Deprecation warning emitted in API `meta.warnings[]` with `deprecated_metric_keys: [{key, replaced_by, sunset_at}]`
4. Sunset event purges facts with `metric_version = <old>` from `metric_facts` + rollups. Raw + normalized tables untouched (reconstruction possible).

### Backfill policy

For MAJOR version bumps (mandatory):
1. New version deploys to engine only
2. Backfill job `metrics-backfill` invoked with `(metric_key, from_version, to_version, entity_scope)`
3. Job iterates in batches of 100 runs, idempotent, resumable
4. Upon completion: distribution comparison artifact generated (required) — `docs/analysis/METRIC_DISTRIBUTION_COMPARISON_{metric}_{old}_{new}.md`
5. Go/no-go gate on distribution shift — if mean delta > 5% or p95 delta > 15%, CEO-level approval required before cutover

This mirrors **DV2-R01** pattern (v1-vs-v2 health-score distribution comparison) — the same pattern is the correct template for every future major metric version bump.

### Workspace overrides (INPUT_SPEC §16.3)

`workspace_metric_config.config_json` supports:
- `sla_ms` per workflow_definition
- `cost_per_hour_usd` per user/team/workspace
- `score_component_weights` per composite score
- `business_calendar_id` (working hours, holidays)
- `currency` (USD default)

Overrides participate in `filter_hash` computation so cache semantics are correct.

---

## 11. Performance Engineering

### INPUT_SPEC §18 targets

| Target | Value | Phase 1 path |
|---|---|---|
| Dashboard KPIs cached | <500ms | Redis hit |
| Dashboard KPIs uncached | <2s | `metric_facts` point query on (metric_key, entity_id, window, filter_hash) indexed; Postgres ~50–200ms expected |
| Workflow detail analytics | <3s | Multi-metric query; 5–8 metric_facts in one Prisma query + 1 score_fact |
| Opportunity analysis | <5s | Opportunity_fact table read; all pre-computed at ingest |
| Large portfolio rollups | <10s | `metric_rollup_weekly` range scan (BRIN index on dayTs) |
| Run-level compute after ingest | <10s | `metrics-materialize` BullMQ job; average run ~200 events → ~2s observed in intelligence-engine today |
| Daily rollup completion | Before business open | Nightly cron 02:00 UTC; expected <15 min for v1-scale workspaces |
| Backfill idempotent + resumable | Yes | Checkpointed via `batch_id` + `last_processed_run_id` in BullMQ job data |

### Indexing strategy summary

```sql
-- metric_facts (primary metric warehouse table)
CREATE INDEX idx_metric_facts_point ON metric_facts (metric_key, entity_type, entity_id, window_start, window_end);
CREATE INDEX idx_metric_facts_filter ON metric_facts (filter_hash);
CREATE INDEX idx_metric_facts_time ON metric_facts USING BRIN (computed_at);       -- Postgres only; ignored in SQLite

-- metric_rollup_daily
CREATE INDEX idx_rollup_daily_series ON metric_rollup_daily (metric_key, entity_type, entity_id, day_ts);
CREATE INDEX idx_rollup_daily_day ON metric_rollup_daily USING BRIN (day_ts);

-- score_fact
CREATE INDEX idx_score_fact_point ON score_fact (score_key, entity_type, entity_id, window_start, window_end);

-- workflow_runs (new table)
CREATE INDEX idx_runs_definition ON workflow_runs (process_definition_id, started_at);
CREATE INDEX idx_runs_user ON workflow_runs (user_id, started_at);
CREATE INDEX idx_runs_status ON workflow_runs (status, started_at);

-- workflow_steps (new table)
CREATE INDEX idx_steps_run ON workflow_steps (run_id, sequence_index);
CREATE INDEX idx_steps_canonical ON workflow_steps (canonical_step_id) WHERE canonical_step_id IS NOT NULL;
```

### Query-shape constraints

- **No N+1 queries in metric endpoints.** All reads are batched via Prisma `in:` filters on entity_ids.
- **Result-set size caps.** `/api/metrics/query` enforces `entity_ids.length ≤ 500` and `metrics.length ≤ 20` via Zod. Hard cap.
- **Pagination on time-series.** Rollup queries with >1000 row result use cursor pagination (day_ts).
- **Server-side filter pushdown.** All `filters` translated to Prisma `WHERE` clauses; no post-query JS filtering (fix for DV2-R18/DV2-R19 pattern seen in v2).

---

## 12. Migration Strategy — v2 `metricsV2` → v3 canonical

### Parallel-run pattern (iter-020 D2 precedent)

Iter-020 shipped `metricsV2` alongside v1 `healthScore` in the same response envelope, enabling 14-day soak + distribution comparison. Same pattern applies here:

**Phase 1A (iter ~029–035, v3 engine + persistence ships):**
- New endpoints `/api/metrics/*` live; no consumers yet
- `workflow_runs`/`workflow_steps` persistence live via new `persistProcessRun()`; old `/api/workflows` route unchanged
- `metric_facts` materialized on ingest for all new runs
- Backfill job executes against all existing `Workflow` rows to synthesize `workflow_runs` (1 workflow = 1 run per current model; later workflows may gain multiple runs)
- `/api/workflows` route unchanged; v2 `metricsV2` still emitted — **parallel run active**

**Phase 1B (iter ~036–040, dashboard consumes v3):**
- Dashboard v3 components migrate one KPI at a time from `workflow.metricsV2` → `/api/metrics/query`
- Feature flag `?v3=1` mirrors the `?v2=1` pattern used in iter-022
- Soak window 14 days per KPI

**Phase 1C (iter ~041+, v2 retirement):**
- After all consumers migrated + per-metric DV2-R01-equivalent distribution artifacts ship
- v2 shadow functions in `/api/workflows/route.ts` removed (closes DV2-R06)
- v2 `metricsV2` field removed from response (breaking change; major-version bump of `/api/workflows`)
- Feature flag retired

### Preservation of v1 + v2 while v3 incubates

- v1 `computeHealthScore` (health-scores.ts) stays — already on deprecation path via #42
- v2 `workflow-metrics.ts` stays untouched during v3 incubation
- v3 `packages/metrics-engine/` is new code; zero-risk additive
- Tests for all three coexist; CI validates no regression in v1/v2 surfaces

### v2 retirement gate (closes DV2-R01, DV2-R06, #42, #57)

The v2 → v3 cutover requires:
1. All 15 v1 "default metric pack" metrics have v3 `metric_facts` at parity
2. Distribution comparison artifact per metric (mirror DV2-R01 pattern)
3. v3 API p95 latency meets §11 targets
4. 14-day soak window per KPI complete
5. `#57` flag retirement already shipped (prerequisite; decouples legacy v1/v2 concern from v3 migration)

---

## 13. Phased Build Plan

### INPUT_SPEC §21 Phase 1 → Ledgerium iteration sequencing

**Phase 1 deliverables (per INPUT_SPEC):**
- canonical data model
- run/step normalization
- cycle time, processing time, wait time
- variant hashing
- top variant share
- rework detection
- process health score v1
- workflow library KPI API

**Recommended iteration sequencing** (assumes iter 027/028/029/030/031 programmed per CLAUDE.md — this is post-slot):

| Iter # (target) | Scope | Primary agent | Surface | Estimated LOC |
|---|---|---|---|---|
| 032 | v3 iter 1: Prisma migration + new tables (workflow_runs, workflow_steps, step_edges, metric_facts, metric_rollup_daily, score_fact, opportunity_fact, workspace_metric_config) — additive, no consumers | backend-engineer (primary), system-architect (review) | web-app/prisma + web-app persistence | ~500 |
| 033 | v3 iter 2: `packages/metrics-engine/` scaffold + metric catalog module + normalization module + Layer 1 flow metrics + tests | **system-architect (primary, pure-module)** | new workspace package | ~700 |
| 034 | v3 iter 3: Variant hashing persistence + path_signature → `workflow_runs.variant_hash` + Layer 3 Tier A metrics (variant_count, top_variant_share, path_length stats) + tests | system-architect (primary) | packages/metrics-engine + persistence | ~400 |
| 035 | v3 iter 4: Rework detection (step_edges.is_rework_edge) + Layer 2 Tier B step metrics + tests | system-architect (primary) | packages/metrics-engine | ~500 |
| 036 | v3 iter 5: `process_health_score` v3 formula + score_fact writer + Layer 9 Tier B scores (spec formulas) + tests | system-architect (primary) | packages/metrics-engine | ~600 |
| 037 | v3 iter 6: BullMQ `metrics-materialize` worker + `persistProcessRun` adapter + on-ingest metric compute | backend-engineer (primary), system-architect (adjacent) | apps/worker + web-app adapter | ~500 |
| 038 | v3 iter 7: `/api/metrics/catalog` + `/api/metrics/query` routes + Zod + envelope + Redis cache + integration tests | backend-engineer (primary) | apps/web-app/src/app/api/metrics | ~500 |
| 039 | v3 iter 8: `/api/scores/query` + `/api/opportunities/query` routes + opportunity engine v1 (automation candidate rule + bottleneck rule, INPUT_SPEC §10) | backend-engineer (primary), system-architect (adjacent for opportunity rules) | apps/web-app/src/app/api | ~500 |
| 040 | v3 iter 9: Dashboard v3 KPI strip component migration to `/api/metrics/query` (first 4 KPIs) — parallel-run with v2 metricsV2 | frontend-engineer (primary) | apps/web-app/src/components/dashboard-v3 | ~400 |
| 041 | v3 iter 10: Remaining 11 default-pack metrics migrated; v3 soak window opens | frontend-engineer (primary) | dashboard-v3 | ~400 |
| 042 | v3 iter 11: Distribution comparison artifacts per metric + v2 retirement go/no-go gate | analytics + system-architect | docs/analysis + migration closure | ~200 + docs |

**Phase 1 iteration count: ~11 iterations** (iter 032–042). Interleaved with standard burn-down rotation per CLAUDE.md follow-up debt policy. Realistic calendar: ~6–8 weeks from iter 032 kickoff assuming 2 iterations/week cadence.

### Pure-module vs route/UI split

- **Pure-module iterations (system-architect primary):** 033, 034, 035, 036 (4 iterations). MR-005 D-4 gate triggers on each — all >200 LOC pure-module work.
- **Route/UI iterations (backend-engineer / frontend-engineer primary):** 032 (migration), 037 (worker), 038, 039 (routes), 040, 041 (UI).
- **Cross-functional iterations:** 042 (analytics + arch).

### Agent-diversity implications

Phase 1 sequence distributes agents as follows:
- `system-architect` primary: 033, 034, 035, 036 (4 × pure-module)
- `backend-engineer` primary: 032, 037, 038, 039 (4 × infra + API)
- `frontend-engineer` primary: 040, 041 (2 × UI)
- `analytics` primary: 042 (1 × distribution analysis)

Longest consecutive-agent run is **4** (system-architect iter 033–036). **This hits the "same implementing agent 4+ consecutive loops" meta-review trigger (CLAUDE.md §Meta-Review Cadence).** Mitigation options:
1. Insert one burn-down iteration between iter 034 and iter 035 (targets a non-metrics-engine follow-up, primary agent rotates to `backend-engineer` or `qa-engineer`); breaks the streak at 2.
2. Split iter 034 rework detection into arch-design (system-architect) + implementation (backend-engineer); reduces streak to 3.

**Recommendation: option 1** — a scheduled burn-down between iter 034 and 035 is consistent with CLAUDE.md follow-up debt policy (pool will still be high) and breaks the streak cleanly.

### Phase 2 and Phase 3

Phase 2 (bottleneck engine, user/team, opportunity engine, benchmarks, trends) — deferred. Gated on Phase 1 soak completion + team model extension to `workflow_runs`. Projected 8–10 iterations.

Phase 3 (simulation, prediction, impact graph, prescriptive recommendations) — deferred. ML-adjacent work; may require dedicated ML infrastructure decision.

---

## 14. Risks + Unknowns

### Top 5 risks

#### Risk 1 — Variant hashing stability across engine versions

**Blast radius:** Every variant-based metric (variant_count, top_variant_share, deviation_rate, loop_rate, standardization_score, conformance_score — roughly 1/3 of Phase 1 metrics). If path_signature algorithm changes, variant hashes change, historical data becomes inaccessible.

**Evidence:** `packages/intelligence-engine/src/pathSignature.ts` currently computes from `stepCategories` (GroupingReason enum). Any addition/rename to GroupingReason enum alters signatures.

**Mitigation:**
- Freeze `GroupingReason` enum at Phase 1 start; new values require MAJOR version bump on all variant-dependent metrics
- Store `variant_hash_version` column on `workflow_runs`; backfill job re-computes on version bump
- `metric_fact.metric_version` embeds variant_hash_version for dependent metrics

**Escalation path:** `system-architect` → CEO for any `GroupingReason` enum change.

#### Risk 2 — Single-user data model blocks Layer 5 comparative metrics + Tier C metrics

**Blast radius:** All user_variance_score / top_performer_delta_pct / team_variance_score metrics unreachable. Also blocks multi-tenant launch story.

**Evidence:** Prisma schema has `Team`/`TeamMember` models but `Workflow.userId` is 1:1 — runs are not team-attributed. `workflow_runs.user_id` and `workflow_runs.team_id` shapes exist in spec but our schema maps uploads to a single owner.

**Mitigation:**
- Phase 1: accept the gap; Layer 5 comparative metrics remain Tier C and are out-of-scope for v1 launch
- Phase 2 entry: requires a scoped iteration to extend `Workflow` + new `workflow_runs` with optional `team_id` FK. 1-iteration additive migration.

**Escalation path:** Product-manager decision at Phase 2 entry whether team-scoped metrics are required for target customer.

#### Risk 3 — `metric_facts` row count explosion

**Blast radius:** Phase 1 performance targets (INPUT_SPEC §18) missed; scaling triggers pulled forward.

**Arithmetic:** 93 metrics × 10 grains × 8 time windows × 100 entities × N filter combinations. With aggressive filter-hash caching (only materialized filters stored, on-demand for others), realistic Phase 1 row count per workspace: ~50k facts. 100 workspaces → 5M facts. Within Postgres comfort zone. If filter_hash explodes (e.g., users query with many combinations), the number can balloon.

**Mitigation:**
- Cap `filter_hash` materialization — only filter combos requested > 3 times get written back; one-off queries stay uncached
- Monitor: add `metric_facts_row_count` gauge to operational dashboard; alert at 5M per workspace
- Pre-emptive: archival job moves facts older than 90 days to cold-storage rollup table (lossy but cheap)

**Escalation path:** `devops-engineer` owns storage capacity planning. Trigger: 5M row threshold → review.

#### Risk 4 — BullMQ worker failure mode for on-ingest materialization

**Blast radius:** New runs persist (workflow_runs written) but metric_facts absent; dashboard shows stale/missing data for that run until worker recovers.

**Evidence:** BullMQ is not yet in production (per CLAUDE.md tech stack, listed but Phase 1 Redis not active). This would be the first critical-path job.

**Mitigation:**
- **Synchronous fallback for Phase 1:** if BullMQ unavailable, compute metrics inline at end of `processSessionFull` with a 5-second budget and `AbortController`; on timeout, mark `metric_facts.is_pending=true` and enqueue for async later.
- Job idempotency by `(run_id, metric_version)` — safe to retry
- Dead-letter queue monitored; any DLQ entry pages on-call

**Escalation path:** `devops-engineer` owns queue operability. Trigger: DLQ size > 10 → page.

#### Risk 5 — Normalization-method bias in composite scores invalidates executive reads

**Blast radius:** `process_health_score` / `automation_readiness_score` / `risk_score` all depend on normalization of underlying metrics. If normalization choice is wrong for a given metric's distribution, scores will bias systematically.

**Evidence:** v2 `computeHealthScoreV2` uses simple range mapping (30s–30min ideal band) — works for a narrow assumption about workflow duration. v3 spec requires target-based inverse normalization — also makes an assumption.

**Mitigation:**
- **Every score ships with its normalization method exposed** in `score_fact.components_json` (lineage); drill-through shows exactly how the number was built
- Distribution comparison artifact required at major-version cutover (§10 backfill policy) — catches systematic bias
- Workspace-level normalization override available via `workspace_metric_config` for customers with atypical distributions

**Escalation path:** `analytics` + `system-architect` co-review on any v3 score version bump. CEO sign-off on MAJOR version cutover.

### Other unknowns (tracked, non-top-5)

- Opportunity engine rule thresholds (repetitiveness ≥ X, exception_rate ≤ Y) — values are spec-TBD; recommend starting at `intelligence-engine` defaults (already calibrated against fixture data)
- Cost model tier (Layer 8) — entirely deferred; requires product decision on labor-rate default + workspace override UX
- Cross-workspace benchmarks (INPUT_SPEC §17 peer) — explicit Phase 2+
- `happy_path` designation UX — spec says "designated canonical or most efficient approved path"; MVP defaults to most-frequent; real designation needs a review UI

---

## 15. Package Boundary

### Option A: Extend `apps/web-app/src/lib/workflow-metrics.ts`

- **Pros:** zero migration cost; existing test/typecheck pipeline; single artifact for all metric code
- **Cons:**
  - workflow-metrics.ts at 305 LOC grows to 3,700+ LOC in-app; violates "one primary export per file" + module-size hygiene
  - Web-app bundle grows with metrics engine; server-only code pulled into client unnecessarily unless carefully guarded
  - No clear reuse path if future CLI/worker/agent tools need the engine (they can't import from `apps/web-app`)
  - Couples metric engine lifecycle to web-app lifecycle

### Option B: New workspace package `packages/metrics-engine/`

- **Pros:**
  - **Direct alignment with existing pattern** — `packages/process-engine/`, `packages/intelligence-engine/`, `packages/normalization-engine/`, `packages/segmentation-engine/`, `packages/policy-engine/` all follow this convention
  - Pure module boundary enforced by TypeScript project references — no accidental Prisma/Next.js imports
  - Reusable by future BullMQ worker (`apps/worker/`), future CLI tools, future agent-intelligence
  - Independent versioning (`@ledgerium/metrics-engine@0.0.1`)
  - Smaller web-app bundle (only client-relevant code imported into web-app; metric computation is server-only)
  - Co-located tests; independent CI surface; can be extracted externally later without refactor
- **Cons:**
  - Small migration cost: ~1 day to set up package scaffolding + Prisma-free type boundaries
  - Prisma types cannot leak into the pure module — requires an adapter layer (but this is a **feature**, not a cost; it's exactly the separation that keeps the engine deterministic)

### Recommendation: **Option B — new `packages/metrics-engine/` workspace package**

**Ledgerium precedent strongly supports this.** Every deterministic pure engine in the repo lives in `packages/`. The only reason `workflow-metrics.ts` lives in `apps/web-app/src/lib/` today is that it was built quickly during Path B (iter 020) and was plausibly sized at 305 LOC. At 3,700+ LOC Phase 1 projection, the boundary is non-negotiable.

**Directory layout:**

```
packages/metrics-engine/
├── package.json                    # @ledgerium/metrics-engine
├── tsconfig.json                   # extends root tsconfig
├── src/
│   ├── index.ts                    # single export surface
│   ├── catalog/
│   │   ├── catalog.ts              # full metric catalog (typed constants)
│   │   ├── CHANGELOG.md            # metric versioning history
│   │   └── catalog.test.ts
│   ├── normalization/              # §8
│   │   ├── index.ts
│   │   ├── minMax.ts, percentile.ts, targetBased.ts, inverseTarget.ts, zScoreBounded.ts
│   │   └── normalization.test.ts
│   ├── metrics/                    # per-layer metric computers
│   │   ├── flow/                   # Layer 1
│   │   ├── stepPerformance/        # Layer 2
│   │   ├── variation/              # Layer 3
│   │   ├── quality/                # Layer 4
│   │   ├── human/                  # Layer 5
│   │   ├── bottleneck/             # Layer 6
│   │   ├── automation/             # Layer 7
│   │   ├── financial/              # Layer 8 (stubbed in Phase 1)
│   │   └── composite/              # Layer 9 (scores)
│   ├── lineage/
│   │   ├── lineageBuilder.ts       # constructs LineageRef
│   │   └── types.ts
│   ├── rollup/
│   │   ├── dailyRollup.ts          # rollup algebra (ratios recompute, not average)
│   │   └── rollup.test.ts
│   ├── query/
│   │   ├── filterHash.ts           # deterministic filter_hash
│   │   ├── cacheKey.ts             # Redis key builder
│   │   └── query.test.ts
│   ├── opportunities/
│   │   ├── opportunityEngine.ts    # INPUT_SPEC §10 rules
│   │   └── opportunityEngine.test.ts
│   └── types.ts                    # all public types
└── src/index.ts                    # public export surface
```

**Adapter boundary:**

- `apps/web-app/src/lib/metrics-persistence.ts` — Prisma adapter; reads/writes `metric_facts`/`score_fact`/`opportunity_fact`; translates Prisma rows to engine types
- `apps/web-app/src/app/api/metrics/*/route.ts` — request envelope; calls metrics-engine pure functions; persists via metrics-persistence

**Dependency graph:**
```
apps/web-app
  ├── depends on: @ledgerium/metrics-engine (new)
  ├── depends on: @ledgerium/process-engine (existing)
  └── depends on: @ledgerium/intelligence-engine (existing)

@ledgerium/metrics-engine
  └── depends on: @ledgerium/intelligence-engine (reuses stats, pathSignature, variance, timestudy, bottleneck, variant, standardization primitives)

@ledgerium/intelligence-engine
  └── depends on: @ledgerium/process-engine

apps/worker (future)
  └── depends on: @ledgerium/metrics-engine (for materialization job)
```

This layering is clean, reversible, and matches the existing monorepo design.

---

## 16. Handoff Summary for Downstream Agents

### For `product-manager` (iteration sizing)

- v1 launch metric set: **13 of 15** default-pack metrics ship in Phase 1 (defer cost_per_run + savings_opportunity pending cost config surface)
- Phase 1 iteration count: **11 iterations** (iter ~032–042), projected 6–8 weeks
- Supersedes #60 (snapshot-table Option C) — can close after §11 warehouse ships
- Fixes DV2-R10 on landing — v3 endpoints adopt `{data, error, meta}` envelope

### For `backend-engineer`

- Primary iterations: 032 (migration), 037 (worker), 038 (routes), 039 (routes)
- Uses `packages/metrics-engine/` public API; never imports from its internals
- Owns the Prisma adapter at `apps/web-app/src/lib/metrics-persistence.ts`

### For `frontend-engineer`

- Primary iterations: 040 (KPI strip), 041 (remaining metrics)
- Parallel-run pattern: `?v3=1` flag mirrors `?v2=1` iter-022 pattern
- Dashboard v3 components should consume `/api/metrics/query` exclusively; no v2 `metricsV2` passthroughs

### For `qa-engineer`

- Engine test:code ratio target: 1.1×
- Determinism tests: same input → byte-identical output for every metric function
- Distribution comparison artifact required per metric at any major version bump (mirror DV2-R01 pattern)
- Opportunity engine rule thresholds require fixture-based regression tests

### For `devops-engineer`

- New operational surfaces: BullMQ queue `metrics`, Redis namespace `m:*`
- Monitoring: `metric_facts_row_count` gauge, BullMQ DLQ size, job latency histogram
- Backfill jobs must be resumable (checkpoint on `batch_id` + `last_processed_run_id`)

### For `analytics`

- Distribution comparison artifacts at every major metric version bump
- Phase 1C retirement gate depends on ≥1 artifact per v2→v3 migrated metric
- Cold pool cleanup: `HEALTH_SCORE_DISTRIBUTION_COMPARISON.md` (DV2-R01) establishes template

---

## 17. Open Issues Flagged to CEO

1. **Phase 2 cost-model tier (Layer 8) requires workspace cost-config UX decision** — defer or prioritize? Affects 8 metrics including `savings_opportunity_usd`, the north-star financial metric.
2. **Team-attribution extension of `workflow_runs`** required before Layer 5 comparative metrics ship; blocks Phase 2 entry. Product-manager decision.
3. **`happy_path` designation UX** — MVP defaults to most-frequent variant; true user-designated happy path needs a review interface.
4. **Normalization defaults** — v3 inherits v2's hard-coded speed-band assumption (30s–30min ideal). Distribution comparison at cutover will reveal if this is biased; may require workspace override surface earlier than Phase 2.
5. **Pool-size ceiling interaction:** Phase 1 v3 iterations (11 iters) substantially deplete burn-down obligation. Coordinator must confirm v3 build is compatible with CLAUDE.md `?15-by-iter-038` target — current trajectory implies iter 032+ are v3 work and NOT burn-down. This is a governance decision, not an architecture one, but the sequencing affects both.

---

**End of ARCHITECTURE_METRICS_ENGINE.md**
