# TEST PLAN — Process Intelligence Metrics Engine (v3)

**Artifact type:** QA Test Plan  
**Status:** Draft — Define Phase  
**Date:** 2026-04-21  
**Author:** qa-engineer  
**Input spec:** `docs/features/dashboard-v3-metrics-engine/INPUT_SPEC.md`  
**Scope:** Ledgerium AI Process Intelligence Metrics Engine — v1 Production Baseline  
**Governance:** Validates INPUT_SPEC §§ 1–21 against Ledgerium's current codebase anchors (workflow-metrics.ts, process-engine, /api/workflows route, Prisma schema)

---

## 1. Testing Philosophy

### 1.1 Determinism-First Mandate

Ledgerium's core operating principle is: *same inputs always produce byte-identical outputs*. Every metric in the v3 engine is subject to this mandate before it ships. This is not optional; it is the minimum correctness bar.

Implications for testing:
- Every formula function must be a pure function: no `Date.now()`, no `Math.random()`, no ambient state reads.
- Every unit test must call its subject function with the same fixture and assert the result is `===`/`toEqual` equal on successive invocations.
- Tests that cannot achieve determinism due to missing fake-clock or seeded-random infrastructure are **blocked** until that infrastructure exists. They do not ship as skipped tests with a comment; they are logged as test-infra blockers in section 10.

### 1.2 Minimum Coverage Per Metric

No metric ships without all three of the following:

1. **Canonical test** — well-formed input with known expected output; asserts the exact numeric result or enum value.
2. **Null-input test** — one or more required inputs are null/undefined; asserts the function returns null, 0, or a defined sentinel, never throws, and never propagates NaN silently.
3. **Edge-case test** — boundary condition (zero denominator, single-run population, maximum realistic value, negative durations from clock skew).

### 1.3 Lineage Requirement

INPUT_SPEC § 9 states every metric_fact must support drill-through to source runs, steps, events, and screens. No metric ships without a test that:
- Asserts the returned object contains a non-null `lineage_ref`.
- Asserts `lineage_ref` resolves to at least one source `run_id` and at least one `step_id`.

This is enforced at the unit level (does the compute function populate lineage?) and at the integration level (does the API return resolvable refs?).

### 1.4 Test Stack

| Concern | Tool | Pattern file |
|---|---|---|
| Pure function unit tests | Vitest | `workflow-metrics.test.ts` |
| API integration tests | Vitest + vi.mock | `route.test.ts` |
| Pipeline integration tests | Vitest | `processSessionFull.test.ts` |
| E2E browser tests | Playwright | `e2e/app/dashboard/v2-*.spec.ts` |
| Accessibility gates | @axe-core/playwright | `v2-a11y.spec.ts` |
| Performance benchmarks | Vitest bench | new: `workflow-metrics.bench.ts` |

### 1.5 Existing v2 Test Coverage — Baseline

The current `workflow-metrics.test.ts` (167 test cases) and `route.test.ts` provide a working model. v3 tests extend this model; they do not replace it. The v2 suite must remain green at every iteration boundary per Ledgerium's regression policy.

---

## 2. Fixture Strategy

### 2.1 Fixture Bank Design Principles

Fixtures are the single source of truth for expected metric values. Every fixture must:
- Be fully typed against the v3 data model (INPUT_SPEC § 4).
- Have a named constant that describes what it exercises (e.g., `FIXTURE_BOTTLENECK_DOMINANT`).
- Include a brief JSDoc comment stating which metrics it is designed to exercise and which edge conditions it covers.
- Be deterministic: no `Date.now()`, no `new Date()` without a frozen reference, no random values.

All fixtures are in `apps/web-app/src/lib/__tests__/workflow-metrics-v3.fixtures.ts` (new file, per Ledgerium's co-locate-tests-with-source convention).

### 2.2 Golden Workflow Fixtures — One Per Layer

Each fixture exercises all metrics defined in its layer (INPUT_SPEC § 5). These are the primary regression guards.

**FIXTURE_L1_OPERATIONAL** — Layer 1 (Operational Flow)
- A workflow with 10 completed runs, 3 abandoned runs, known `started_at`/`ended_at` on every run, step-level `is_wait_state` flags set on 2 of 8 steps.
- Designed to produce non-trivial values for: `cycle_time_ms`, `processing_time_ms`, `wait_time_ms`, `flow_efficiency_pct`, `completion_rate_pct`, `case_volume`, `wip_count`, `arrival_rate_per_day`, `completion_rate_per_day`.
- Aggregation coverage: mean, median, p75, p90, p95, min, max, stddev all computable from 10 run durations.

**FIXTURE_L2_STEP_PERFORMANCE** — Layer 2 (Step Performance)
- A workflow with 5 runs, each containing 12 steps. Step 4 is repeated in 3 of 5 runs (rework signal). Step 7 is skipped in 2 of 5 runs. Step 9 has an `is_error_event = true` flag.
- Designed to produce non-trivial values for all 10 required metrics and 4 derived flags.

**FIXTURE_L3_VARIATION** — Layer 3 (Variation and Conformance)
- A workflow with 20 runs, 4 distinct variant hashes. Variant A appears 12 times (happy path). One run contains a loop (revisits step 3 from step 6). Three runs inject extra steps not in canonical path.
- Exercises: `variant_count=4`, `top_variant_share_pct=60`, `happy_path_share_pct=60`, `deviation_rate_pct`, `loop_rate_pct`, `rework_rate_pct`, `step_injection_rate_pct`, `conformance_score_0_100`, `variant_entropy`, `standardization_score_0_100`.

**FIXTURE_L4_QUALITY** — Layer 4 (Quality and Outcome)
- A workflow with 15 runs: 2 failed, 1 abandoned, 1 SLA breach (cycle_time > 5 min SLA), 1 with rework, 10 first-pass clean completions. SLA threshold = 300,000 ms.
- Exercises: all 8 required quality metrics. `first_pass_yield_pct = 10/12 * 100 = 83.3`.

**FIXTURE_L5_HUMAN_BEHAVIOR** — Layer 5 (Human/Task Mining)
- A workflow with 8 runs. Steps include: 3 data-entry steps, 2 lookup steps, 4 navigation steps, 2 copy-paste events. Application switches between Salesforce, Outlook, and Excel tracked via `system_name` changes at step boundaries.
- Exercises: `clicks_per_run`, `actions_per_run`, `avg_action_duration_ms`, `system_count_per_run`, `application_switch_rate`, `copy_paste_rate`, `data_entry_time_ms`, `lookup_time_ms`, `navigation_overhead_pct`, `manual_effort_pct`, `idle_bursts_count`.
- Note: `user_variance_score`, `top_performer_delta_pct`, `novice_vs_expert_delta_pct`, `team_variance_score` require multi-user data — see Known Risk R-4.

**FIXTURE_L6_BOTTLENECK** — Layer 6 (Bottleneck and Constraint)
- A workflow with 10 runs. Step 5 has `step_wait_before_ms` at p92 relative to peer steps (above p90 threshold). Step 5 appears in 9 of 10 runs. `delay_frequency_pct` for step 5 = 80%.
- INPUT_SPEC § 6 `bottleneck_impact_score` formula: normalized(wait) * normalized(frequency) * normalized(volume). All three normalization inputs computable.
- Exercises: `bottleneck_impact_score`, `delay_frequency_pct`, `queue_time_ms`, `max_wait_step_id`, `critical_path_duration_ms`, `critical_path_share_pct`, `throughput_loss_estimate_ms`.

**FIXTURE_L7_AUTOMATION** — Layer 7 (Automation and AI Opportunity)
- A workflow with 12 runs. All steps are `is_manual=true`, no branching (`is_decision=false`), low exception rate (1 error in 120 total steps), high repetitiveness (same step sequence in 11 of 12 runs).
- `automation_candidate_count` = 8 (all steps except 2 decision steps qualify under INPUT_SPEC § 10 rule).
- Exercises: all 10 required automation metrics. `automation_rate_pct = 0` (baseline with no automated steps).

**FIXTURE_L8_FINANCIAL** — Layer 8 (Financial)
- Requires a cost model fixture. `labor_cost_per_run` computable when cost_per_hour is provided. All Layer 8 metrics that depend on the cost model are tested against a mock cost model, not a real one (see Known Risk R-1).
- `cost_of_rework = rework_cases * avg_cycle_time_ms * cost_per_ms`. All values seeded deterministically.

**FIXTURE_L9_COMPOSITE_SCORES** — Layer 9 (Composite Scores)
- A workflow satisfying all 5 sub-score inputs for `process_health_score_0_100` (INPUT_SPEC § 6). Seeded so each component produces a known normalized value:
  - `efficiency_score = 72`, `quality_score = 80`, `standardization_score = 65`, `sla_score = 90`, `confidence_score = 75`.
  - Expected `process_health_score = 0.30*72 + 0.25*80 + 0.20*65 + 0.15*90 + 0.10*75 = 74.1` (rounded to 74).
- All 8 composite scores testable from deterministic sub-score inputs.

### 2.3 Edge-Case Workflow Fixtures

**FIXTURE_ZERO_RUN** — workflow_definition with `run_count = 0`
- All metrics that compute from runs must return null or 0, not NaN or undefined.
- `variant_count = 0`, `flow_efficiency_pct = null`, `completion_rate_pct = null`.
- Lineage ref: empty array is acceptable; null is not (must be an empty collection, not missing field).

**FIXTURE_SINGLE_STEP** — one workflow run with exactly 1 step
- `path_length_avg = 1`, `path_length_stddev = 0`, `variant_count = 1`, `top_variant_share_pct = 100`.
- `application_switch_rate = 0` (cannot switch with one step).
- Bottleneck metrics: step is both the only step and the most frequent — normalization denominator risk.

**FIXTURE_ALL_WAIT** — workflow run where every step has `is_wait_state = true`
- `processing_time_ms = 0`, `flow_efficiency_pct = 0`.
- `flow_efficiency_pct` formula (INPUT_SPEC § 6): `0 / cycle_time_ms * 100 = 0`. Must not divide by zero if `cycle_time_ms = 0`.
- SQL example from INPUT_SPEC § 20 uses `NULLIF` to guard denominator — test must verify this guard is present.

**FIXTURE_INFINITE_LOOP_SIMULATION** — run with step sequence A→B→C→B→C→B→C (step B visited 3 times)
- `loop_rate_pct > 0`, `rework_rate_pct > 0`.
- `loop_count` for step B = 2 additional visits beyond first.
- `is_loop_edge = true` on B→C edge on 2nd and 3rd traversal.
- `step_edge` table must contain `is_loop_edge = true` records.

**FIXTURE_HIGH_VARIANCE** — 20 runs of a workflow with cycle times: 10 runs at ~1 min, 10 runs at ~20 min
- `stddev(cycle_time_ms)` large, `p90 / median > 5`.
- `is_high_variance_step = true` for the step responsible for the variance split.
- Exercises alert threshold: median cycle time worsens > 20% week-over-week (INPUT_SPEC § 15).

**FIXTURE_MISSING_TIMESTAMP** — run where 3 steps have `started_at` but null `ended_at`; run itself has `ended_at`
- Duration inference logic: run-level `cycle_time_ms` computable from run timestamps; step-level duration for affected steps may be null or estimated.
- `confidence_score_0_100` must drop below threshold due to timestamp gaps (INPUT_SPEC § 9).
- `missingness_flags` must be non-empty on the metric_fact.

**FIXTURE_ABANDONED_RUN** — run with `status = 'abandoned'`, no `ended_at`
- `cycle_time_ms = null` (no end time), `completion_rate_pct` denominator includes this run, numerator excludes it.
- `abandonment_rate_pct` must reflect this run.

**FIXTURE_PARTIAL_RUN** — run with `status = 'partial'`, completed 4 of 8 expected steps
- `first_pass_yield_pct` excludes partial runs from numerator.
- `case_volume` counts partial runs in denominator.
- `step_presence_rate_pct` for steps 5–8 drops below 100% due to partial completions.

### 2.4 Determinism Fixtures

Pattern derived from `processSessionFull.test.ts` determinism block.

**FIXTURE_DETERMINISM_BASE** — a fully-specified workflow with 5 runs, all fields populated, no nulls.

The determinism fixture is not used to test output values — it is used to test that output values are stable. The test pattern is:

1. Call the metric compute function once with FIXTURE_DETERMINISM_BASE. Store as `resultA`.
2. Call the same function again, identically. Store as `resultB`.
3. Assert `resultA` deep-equals `resultB` (byte-identical for numeric fields, string-identical for labels).
4. Repeat assertion for all 9 layer metric-compute functions.

This test must use `vi.useFakeTimers()` with a frozen timestamp at `2026-01-01T00:00:00.000Z` to prevent any time-dependent output from causing flakiness.

---

## 3. Per-Metric Test Matrix

Organized by INPUT_SPEC § 5 layer. Each row specifies: the metric, required unit test cases, integration test requirement, lineage test requirement, rollup test requirement (INPUT_SPEC § 7.3), and normalization test requirement (INPUT_SPEC § 8).

For brevity, "canonical + null + edge" means three test cases per metric. Where formula is explicitly specified in INPUT_SPEC § 6, the canonical test asserts the exact computed value against the SQL or formula definition.

### 3.1 Layer 1 — Operational Flow Metrics

| Metric | Unit test cases (min) | Integration | Lineage | Rollup | Normalization |
|---|---|---|---|---|---|
| `cycle_time_ms` | canonical (ended_at - started_at); null (no ended_at → null); edge (ended_at < started_at → negative guard) | API returns value in workflow detail envelope | lineage_ref includes run_id | rollup: median not avg per §7.3 | target-based inverse per §8 |
| `throughput_time_ms` | canonical; null (abandoned run); edge (single-step run) | — | lineage_ref includes run_id | same as cycle_time | same as cycle_time |
| `processing_time_ms` | canonical (sum non-wait steps); zero (all-wait fixture → 0); null (no steps) | — | lineage_ref includes step_ids of non-wait steps | rollup: sum numerator across runs, recompute ratio per §7.3 | — |
| `wait_time_ms` | canonical (cycle - processing); edge (processing > cycle due to data issue → guard); null | — | lineage_ref includes step_ids of wait steps | — | inverse target |
| `idle_time_ms` | canonical; zero (no idle states); null | — | — | — | — |
| `touch_time_ms` | canonical; null; edge | — | — | — | — |
| `flow_efficiency_pct` | canonical (FIXTURE_L1_OPERATIONAL: known processing / cycle); divide-by-zero (all-wait fixture: cycle=0 uses NULLIF guard per §20 SQL); null inputs | API response includes field | lineage_ref includes run_id and contributing step_ids | rollup: recompute from sum(processing) / sum(cycle) per §7.3, NOT avg of per-run values | clamp(0, 100) |
| `completion_rate_pct` | canonical (10 completed / 13 total = 76.9); zero runs (→ null); all-abandoned (→ 0) | — | lineage_ref includes run_ids in numerator and denominator | rollup: recompute from numerators/denominators | — |
| `case_volume` | canonical (count of runs in window); zero; filter changes count | API: value changes with time_window filter | lineage_ref is array of run_ids | sum rollup | — |
| `wip_count` | canonical (runs started but not ended in window); zero; overlapping windows | — | lineage_ref includes run_ids | — | — |
| `arrival_rate_per_day` | canonical; zero (no runs); single day | — | — | time-period rollup | — |
| `completion_rate_per_day` | canonical; zero; single-run window | — | — | time-period rollup | — |

Aggregation suite for duration metrics (INPUT_SPEC § 5, Layer 1 note): For `cycle_time_ms`, `processing_time_ms`, `wait_time_ms`, `touch_time_ms`, `idle_time_ms`, `throughput_time_ms` — one test suite covering: mean, median, p75, p90, p95, min, max, stddev. Use FIXTURE_L1_OPERATIONAL (10 known values). Assert each percentile result against hand-calculated expected values. This suite is a single describe block: `describe('Layer 1 duration aggregation suite')`.

### 3.2 Layer 2 — Step Performance Metrics

| Metric | Unit test cases (min) | Integration | Lineage | Rollup | Normalization |
|---|---|---|---|---|---|
| `avg_step_duration_ms` | canonical (FIXTURE_L2: known avg); null steps (→ null); single step | — | step_ids | rollup: recompute mean from raw, not avg-of-avgs | — |
| `median_step_duration_ms` | canonical; odd vs even step count (two cases) | — | step_ids | same | — |
| `step_wait_before_ms` | canonical; first step (no predecessor → 0 or null); null timestamps | — | edge_id | per-step rollup | inverse target |
| `step_wait_after_ms` | canonical; last step (no successor); null | — | edge_id | per-step rollup | inverse target |
| `step_frequency` | canonical (step appears in N/total runs); zero frequency; all runs | — | run_ids containing step | workflow_definition rollup | — |
| `step_presence_rate_pct` | canonical; step never appears (→ 0); always appears (→ 100) | — | run_ids | workflow_definition rollup | — |
| `step_error_rate_pct` | canonical (FIXTURE_L2: step 9 error in 2/5 runs → 40%); zero; all errors | — | step_ids where is_error_event=true | rollup | inverse |
| `step_rework_rate_pct` | canonical (FIXTURE_L2: step 4 repeated in 3/5 runs → 60%); zero; single run | — | run_ids with rework | rollup | inverse |
| `step_skip_rate_pct` | canonical (FIXTURE_L2: step 7 skipped 2/5 → 40%); zero; all skipped | — | run_ids where step absent | rollup | — |
| `step_repeat_count_avg` | canonical; zero repeats; maximum loop depth | — | step_ids per loop | rollup | inverse |
| `is_bottleneck_step` | true when step_wait_before_ms > p90 AND frequency high; false when below threshold; edge at exact p90 boundary | — | — | — | — |
| `is_high_variance_step` | true for FIXTURE_HIGH_VARIANCE step; false for uniform fixture | — | — | — | — |
| `is_high_rework_step` | true when rework_rate >= threshold; false below; boundary | — | — | — | — |
| `is_automation_candidate_step` | true when all 5 INPUT_SPEC §10 conditions met; false when any condition missing; boundary on confidence threshold | — | — | — | — |

### 3.3 Layer 3 — Variation and Conformance Metrics

| Metric | Unit test cases (min) | Integration | Lineage | Rollup | Normalization |
|---|---|---|---|---|---|
| `variant_count` | canonical (FIXTURE_L3: 4 distinct hashes); zero runs (→ 0); single variant (→ 1) | API returns in workflow definition response | lineage_ref: array of variant_hash values and run_ids per variant | rollup: count(distinct) is additive if non-overlapping windows, else recompute | — |
| `top_variant_share_pct` | canonical (FIXTURE_L3: 12/20 = 60%); single variant (→ 100); zero runs | API response | lineage_ref: run_ids in top variant | rollup: recompute from counts per §7.3 and §20 SQL example | — |
| `happy_path_share_pct` | canonical; no designated happy path (→ null or top variant used as fallback per spec); all deviations | — | lineage_ref: run_ids matching happy path | rollup | — |
| `deviation_rate_pct` | canonical; zero deviations; all deviations | — | run_ids deviating | rollup | — |
| `loop_rate_pct` | canonical (FIXTURE_INFINITE_LOOP_SIMULATION); zero; single run with loop | — | edge_ids where is_loop_edge=true | rollup | inverse |
| `rework_rate_pct` | canonical (INPUT_SPEC § 6: runs_with_repeated_canonical_steps / total_runs); zero; all rework | API response | run_ids with repeated steps | rollup: recompute from numerator/denominator | inverse |
| `path_length_avg` | canonical; single-step fixture (→ 1); FIXTURE_ZERO_RUN (→ null) | — | run_ids | rollup | — |
| `path_length_stddev` | canonical; single run (→ 0); single-step (→ 0) | — | — | — | — |
| `step_injection_rate_pct` | canonical; zero injections; all injected | — | step_ids not in canonical path | rollup | inverse |
| `conformance_score_0_100` | canonical (derivable from L3 fixture); zero conformance; perfect conformance (→ 100); null when no canonical path defined | — | run_ids and step_ids forming conformance evidence | rollup | bounded 0–100 |
| `variant_entropy` | canonical; single variant (→ 0); uniform distribution (maximum entropy); two-variant 50/50 | — | variant_hash counts | rollup | inverse for normalization |
| `standardization_score_0_100` | canonical: verify formula (INPUT_SPEC § 6): 100 * (0.45 * top_variant_share + 0.35 * happy_path_share + 0.20 * (1 - normalized_variant_entropy)); zero standardization; perfect | — | component metric lineage | rollup: recompute from components | clamped 0–100 |
| `path_efficiency_pct` | canonical; single-step (→ 100); infinite loop (→ < 100) | — | — | rollup | — |
| `path_similarity_avg` | canonical; single variant (→ 1.0); all unique paths (→ near 0) | — | — | rollup | — |

### 3.4 Layer 4 — Quality and Outcome Metrics

| Metric | Unit test cases (min) | Integration | Lineage | Rollup | Normalization |
|---|---|---|---|---|---|
| `error_rate_pct` | canonical (FIXTURE_L4: 2 failed / 15 = 13.3%); zero errors; all errors | API response | run_ids where status=failed or has error steps | rollup | inverse |
| `exception_rate_pct` | canonical; zero; all | — | step_ids with exceptions | rollup | inverse |
| `failure_rate_pct` | canonical; zero; all | — | run_ids with status=failed | rollup | inverse |
| `abandonment_rate_pct` | canonical (FIXTURE_ABANDONED_RUN: 1/15 = 6.7%); zero; all abandoned | API response | run_ids with status=abandoned | rollup | inverse |
| `sla_breach_rate_pct` | canonical (FIXTURE_L4: 1 breach / 15 = 6.7%); zero breaches; null SLA threshold (→ metric undefined, not 0) | API response | run_ids exceeding SLA threshold | rollup | inverse |
| `first_pass_yield_pct` | canonical (INPUT_SPEC § 6: runs_with_no_error_and_no_rework / completed_runs): 10/12 = 83.3%; zero yield; FIXTURE_PARTIAL_RUN excluded from numerator | — | run_ids in numerator | rollup: recompute from raw counts | — |
| `rework_case_rate_pct` | canonical; zero rework; all cases have rework | — | run_ids with rework | rollup | inverse |
| `on_time_completion_pct` | canonical (requires SLA threshold); null SLA (→ null, not 0); all on-time | — | run_ids with timestamps vs threshold | rollup | — |

### 3.5 Layer 5 — Human/Task Mining Behavior Metrics

| Metric | Unit test cases (min) | Integration | Lineage | Rollup | Normalization |
|---|---|---|---|---|---|
| `clicks_per_run` | canonical (FIXTURE_L5: known click count across 8 runs); zero clicks; single click | — | step_ids of click-type events | rollup | — |
| `actions_per_run` | canonical; zero; single | — | step_ids | rollup | — |
| `avg_action_duration_ms` | canonical; zero-duration actions (guard: not NaN); single action | — | step_ids | rollup | target-based |
| `system_count_per_run` | canonical (FIXTURE_L5: 3 distinct systems); single system (→ 1); zero systems | — | distinct system_names | rollup | — |
| `application_switch_rate` | canonical (FIXTURE_L5: 4 switches / 8 steps * known runs); FIXTURE_SINGLE_STEP (→ 0); zero runs | — | edge_ids where system_name changes | rollup | inverse |
| `copy_paste_rate` | canonical; zero; all steps are copy-paste | — | step_ids of copy-paste events | rollup | — |
| `data_entry_time_ms` | canonical (sum of is_data_entry=true step durations); zero data entry; null duration on data entry steps | — | step_ids where is_data_entry=true | rollup | inverse |
| `lookup_time_ms` | canonical; zero; null timestamps | — | step_ids where is_lookup=true | rollup | — |
| `navigation_overhead_pct` | canonical (INPUT_SPEC § 6: navigation_duration_ms / total_active_duration_ms * 100); zero navigation; 100% navigation | — | step_ids where is_navigation=true | rollup | inverse |
| `manual_effort_pct` | canonical (INPUT_SPEC § 6: manual_duration_ms / total_active_duration_ms * 100); zero manual; 100% manual | — | step_ids where is_manual=true | rollup | — |
| `idle_bursts_count` | canonical; zero bursts; single long burst | — | step_ids where is_wait_state=true and duration > threshold | rollup | inverse |
| `user_variance_score` | blocked — see Known Risk R-4; test case specified but marked skip with blocker annotation | — | — | — | — |
| `top_performer_delta_pct` | blocked — same reason as user_variance_score | — | — | — | — |
| `novice_vs_expert_delta_pct` | blocked | — | — | — | — |
| `team_variance_score` | blocked | — | — | — | — |

### 3.6 Layer 6 — Bottleneck and Constraint Metrics

| Metric | Unit test cases (min) | Integration | Lineage | Rollup | Normalization |
|---|---|---|---|---|---|
| `bottleneck_impact_score` | canonical (FIXTURE_L6: known normalized(wait) * normalized(freq) * normalized(vol)); zero when any factor is zero; single step (all factors equal) | API returns in opportunity response | lineage_ref: step_id of bottleneck + run_ids contributing | rollup | min-max per factor |
| `delay_frequency_pct` | canonical; zero delays; all steps delayed | — | step_ids with delay | rollup | inverse |
| `queue_time_ms` | canonical; zero queue; null (no wait steps) | — | step_ids of wait states | rollup | inverse |
| `max_wait_step_id` | canonical (FIXTURE_L6: returns step_id=5); tie-breaking when two steps equal wait (deterministic tie-break rule must be tested); no steps | — | step_id returned | — | — |
| `critical_path_duration_ms` | canonical; single-step (→ that step's duration); zero-duration steps | — | step_ids on critical path | rollup | target-based inverse |
| `critical_path_share_pct` | canonical; zero (critical path = 0 of total); 100% | — | same as critical_path_duration | — | — |
| `throughput_loss_estimate_ms` | canonical; zero (no bottleneck); null (volume unknown) | API response | bottleneck step_id + run_ids | rollup | inverse |
| `throughput_loss_estimate_usd` | blocked — cost model not ready; see Known Risk R-1 | — | — | — | — |

### 3.7 Layer 7 — Automation and AI Opportunity Metrics

| Metric | Unit test cases (min) | Integration | Lineage | Rollup | Normalization |
|---|---|---|---|---|---|
| `automation_rate_pct` | canonical (INPUT_SPEC § 6: automated_steps / total_steps * 100); zero automation (FIXTURE_L7: all manual); all automated | API opportunity response | step_ids where is_automated=true | rollup: recompute from counts | — |
| `manual_step_share_pct` | canonical; zero; 100% | — | step_ids where is_manual=true | rollup | inverse |
| `automation_candidate_count` | canonical (FIXTURE_L7: 8 candidates per §10 rule); zero; single candidate | API response | step_ids meeting all 5 §10 conditions | rollup | — |
| `automation_feasibility_score_0_100` | canonical; zero feasibility; maximum (all conditions met perfectly) | — | component metric lineage | rollup | 0–100 clamp |
| `automation_savings_time_ms` | canonical; zero (no candidates); null (volume unknown) | API response | step_ids of automation candidates + frequency | rollup | — |
| `automation_savings_usd` | blocked — cost model; see Known Risk R-1 | — | — | — | — |
| `ai_suitability_score_0_100` | canonical; zero; maximum | — | component metrics | rollup | 0–100 |
| `decision_complexity_score_0_100` | canonical; zero (no decisions); maximum (all steps are decisions) | — | step_ids where is_decision=true | rollup | — |
| `repetitiveness_score_0_100` | canonical (FIXTURE_L7: same sequence 11/12 runs → high repetitiveness); zero; 100 | — | variant hashes | rollup | — |
| `rule_basedness_score_0_100` | canonical; zero; 100 | — | — | rollup | — |

### 3.8 Layer 8 — Financial Metrics

All Layer 8 metrics require a cost model input that is not yet available (INPUT_SPEC non-spec appendix, CLAUDE.md Known Issues). Tests use a mock cost model fixture (`FIXTURE_COST_MODEL_MOCK`) with deterministic values.

| Metric | Unit test cases (min) | Integration | Lineage | Rollup | Normalization |
|---|---|---|---|---|---|
| `cost_per_run` | canonical (mock cost model × avg_cycle_time_ms); zero cost (zero duration); null (missing cost model → null, not 0) | — | run_ids + cost_model version | rollup | — |
| `labor_cost_per_run` | canonical; null; zero labor (automated runs) | — | same as cost_per_run | rollup | — |
| `labor_cost_per_step` | canonical; null; zero steps | — | step_ids | rollup | — |
| `cost_of_rework` | canonical; zero rework (→ 0); null cost model | — | run_ids with rework + cost_model | rollup | — |
| `cost_of_delay` | canonical; zero delay; null | — | bottleneck step + cost model | rollup | — |
| `savings_opportunity_usd` | blocked — depends on both automation candidates AND cost model; see Known Risk R-1 | — | — | — | — |
| `annualized_value_leakage_usd` | blocked — see R-1 | — | — | — | — |
| `automation_roi_pct` | blocked — see R-1 | — | — | — | — |

### 3.9 Layer 9 — Composite Scores

| Score | Unit test cases (min) | Integration | Lineage | Rollup | Weight governance |
|---|---|---|---|---|---|
| `process_health_score_0_100` | canonical (INPUT_SPEC § 6 formula: known sub-scores produce 74.1 → 74); null component (score gracefully degrades using available sub-scores); all components at max (→ 100); all at zero (→ 0) | API score endpoint returns score + components + weights | lineage_ref includes all 5 component metric_fact_ids | rollup: recompute from normalized sub-scores, not avg-of-sub-scores per §7.3 | weight sum = 1.0; weight mutation test: change one weight → score changes deterministically |
| `efficiency_score_0_100` | canonical; zero; max; null inputs | — | component metric_fact_ids | rollup | weight sum |
| `quality_score_0_100` | canonical; zero; max | — | same | rollup | weight sum |
| `standardization_score_0_100` | canonical (also in Layer 3); zero; max; formula verified vs Layer 3 test (values must match) | — | same | rollup | weight sum |
| `automation_readiness_score_0_100` | canonical (INPUT_SPEC § 6: 0.30*rep + 0.25*rule + 0.20*vol + 0.15*low_exc + 0.10*struct = known value); zero; max | API score endpoint | component metric_fact_ids | rollup | weight sum = 1.0 |
| `sop_readiness_score_0_100` | canonical; zero; max | — | lineage | rollup | weight sum |
| `maturity_score_0_100` | canonical; zero; max | — | lineage | rollup | weight sum |
| `risk_score_0_100` | canonical; zero; max | — | lineage | rollup | weight sum |

Score governance test (INPUT_SPEC § 16): For each composite score, one test asserts that `sum(component_weights) == 1.0` (floating-point: `Math.abs(sum - 1.0) < 0.0001`). This test runs as a static assertion against the score definition object, not against runtime output.

---

## 4. API Contract Tests

Based on INPUT_SPEC § 13 (four endpoints). Pattern follows `route.test.ts` (vi.mock strategy).

### 4.1 GET /metrics/catalog

**Happy path:** Returns array of metric definitions. Each element contains: `metric_key`, `label`, `description`, `formula`, `unit`, `grains_supported`, `filters_supported`, `version`, `category`, `default_visualization`. Assert all ~90 v1 metrics are present by key. Assert no duplicate `metric_key` values.

**Envelope shape:** Response body matches `{ data: MetricCatalogEntry[], error: null, meta: { count: number } }`.

**Authorization:** Unauthenticated request → 401. Free-tier user → returns catalog (catalog is not gated, only metric values may be gated). Asserted via mocked auth.

**Zod validation:** No query parameters accepted on GET catalog; any body payload returns 400.

**Performance benchmark:** Assert response time < 500 ms cached (INPUT_SPEC § 18). In CI, this is a static assertion against mock response time; in load testing it runs against real server (section 5).

### 4.2 POST /metrics/query

**Happy path (canonical):** Post the INPUT_SPEC § 13 example body `{ metrics: ['cycle_time_ms', 'flow_efficiency_pct', 'variant_count'], grain: 'workflow_definition', entity_ids: ['wf_123', 'wf_456'], time_window: {...}, filters: {...}, group_by: ['workflow_definition', 'month'], include_lineage: false }`. Assert response contains results for both entity_ids, each result has the three requested metrics, values are numeric (non-NaN), `lineage_ref` is absent when `include_lineage=false`.

**Lineage on:** Same request with `include_lineage: true`. Assert each metric result contains `lineage_ref` with at least one `run_id`.

**Invalid metric key:** `{ metrics: ['nonexistent_metric_xyz'] }` → 400, `error.code = 'UNKNOWN_METRIC'`.

**Invalid grain:** `{ grain: 'galaxy' }` → 400 Zod error.

**Unknown entity_id:** `{ entity_ids: ['wf_nonexistent'] }` → 200 with empty results array (not 404; the query is valid, no matches is a valid result). Assert empty data array, not null.

**Empty metrics array:** `{ metrics: [] }` → 400 Zod error (at least one metric required).

**Authorization:** Unauthenticated → 401. Free-tier user requesting gated metric → 200 with `isGated: true` flag on metric result, value is null.

**Envelope shape:** `{ data: MetricQueryResult[], error: null, meta: { grain: string, time_window: {...}, filter_hash: string, computation_timestamp: string } }`.

**Performance benchmark:** Uncached query for 100 entity_ids → assert < 2 sec (INPUT_SPEC § 18). In CI, mocked. In load test, real.

**Filter isolation:** Two queries with different `filters` values but same `entity_ids` produce different `filter_hash` values and may produce different results. Assert `filter_hash` is not the same string for different filter payloads.

### 4.3 POST /scores/query

**Happy path:** Returns score name, value (0–100), component_metrics array, normalized_component_values, trend (up/down/flat/null), confidence (0–100). Assert for `process_health_score_0_100` that `sum(component_weights) ≈ 1.0`.

**Null component:** One sub-score is null (insufficient data). Assert overall score is null or gracefully degraded, not NaN.

**Invalid score name:** → 400.

**Authorization:** Same as /metrics/query.

**Envelope shape:** `{ data: ScoreResult[], error: null, meta: {...} }`.

**Performance benchmark:** < 500 ms cached / < 2 sec uncached per INPUT_SPEC § 18.

### 4.4 POST /opportunities/query

**Happy path:** Returns opportunity_type (from INPUT_SPEC § 7 opportunity classes), affected_entity, estimated_savings (null if cost model absent), reasoning (string), supporting_metrics (array of metric_keys), confidence (0–100).

**No candidates found:** Returns empty array, not 404 or error.

**Automation candidate rule test:** Assert that when FIXTURE_L7_AUTOMATION is the entity, the opportunity response includes at least one entry with `opportunity_type = 'UI automation'` or `'agentic task execution'`.

**Bottleneck candidate rule test:** Assert that when FIXTURE_L6_BOTTLENECK is the entity, response includes `opportunity_type` related to bottleneck.

**Authorization:** Unauthenticated → 401.

**Envelope shape:** `{ data: OpportunityResult[], error: null, meta: { entity_id: string, analysis_timestamp: string } }`.

**Performance benchmark:** Assert < 5 sec per INPUT_SPEC § 18 (integration test with mock data; load test with real data).

---

## 5. Performance Test Design

### 5.1 Synthetic Data Generator

A dedicated utility `apps/web-app/src/lib/__tests__/perf/generate-workflow-corpus.ts` produces synthetic corpora at three scales:
- **S (1k runs):** 100 workflow_definitions × 10 runs each. Used in CI gate.
- **M (10k runs):** 1,000 workflow_definitions × 10 runs each. Used in pre-release gate.
- **L (100k runs):** 10,000 workflow_definitions × 10 runs each. Used in capacity planning; not CI.

Generator requirements:
- Must be deterministic: seeded with a fixed seed value (e.g., `seed=42`). Same seed → same corpus byte-for-byte.
- Uses `faker.js` with a fixed seed or a deterministic LCG, not `Math.random()`.
- Produces a mix of workflow types: 30% bottleneck-dominant, 20% high-variance, 20% automation-candidate, 15% conformance-issue, 15% healthy.

### 5.2 Performance Targets (INPUT_SPEC § 18)

| Target | Threshold | Scale for CI gate |
|---|---|---|
| Dashboard KPI (cached) | < 500 ms | S (1k) |
| Dashboard KPI (uncached) | < 2 sec | S (1k) |
| Workflow detail analytics | < 3 sec | S (1k) |
| Opportunity analysis | < 5 sec | S (1k) |
| Portfolio rollup | < 10 sec | M (10k) |
| Run-level metric compute at ingest | < 10 sec per run | single run |
| Daily rollup completion | before business-day open (< 4h window) | M (10k) |

### 5.3 CI Performance Gate

Implemented as a Vitest bench suite `apps/web-app/src/lib/__tests__/perf/metrics-engine.bench.ts`.

Gate logic:
1. Bench function runs 5 iterations, takes median.
2. If median > threshold: test fails with `PERF_REGRESSION` message and displays percentage over budget.
3. A baseline file `perf/baselines.json` stores the last green median per target.
4. If current median > 120% of baseline (20% regression): test fails even if under absolute threshold.

The 20% regression gate is the operative daily CI guard. The absolute threshold is the pre-release gate. Both must pass for a v3 iteration to be marked green.

### 5.4 Benchmark Storage Pattern

Baselines stored in `apps/web-app/src/lib/__tests__/perf/baselines.json` as:
```
{ "target_name": { "p50_ms": number, "p90_ms": number, "last_updated": "ISO date", "git_sha": "short sha" } }
```
Baselines are committed to the repo. CI updates baselines only when explicitly invoked with `UPDATE_PERF_BASELINES=true`. Normal CI reads and compares; never auto-commits updated baselines.

---

## 6. Regression Strategy — v1 → v2 → v3 Migration

### 6.1 Three-Way Coexistence Requirement

Per INPUT_SPEC non-spec appendix and DASHBOARD_V2_REVIEW_001 context, three health score functions must coexist during Phase 1 soak:
1. `computeHealthScore` (v1 — `apps/web-app/src/lib/health-scores.ts`)
2. `computeHealthScoreV2` (v2 — `apps/web-app/src/lib/workflow-metrics.ts`)
3. `process_health_score_0_100` (v3 — new metrics engine)

The route (`/api/workflows`) currently enriches with v2. During Phase 1 soak, v3 is computed alongside v2 but not displayed as the primary score. All three values are logged per-workflow.

### 6.2 Three-Way Distribution Comparison

A comparison script `docs/analysis/HEALTH_SCORE_DISTRIBUTION_COMPARISON_V3.md` is produced by `scripts/compare-health-scores-v3.ts` (extends DV2-R01 pattern from DASHBOARD_V2_REVIEW_001 recommended iter sequencing).

The script:
1. Reads a real or synthetic corpus of workflows.
2. Computes v1, v2, and v3 scores for each workflow.
3. Produces: per-workflow 3-way comparison table, distribution histograms (text-based for artifact storage), summary statistics (mean, stddev, p50, p90 per version), correlation coefficients (v1 vs v2, v2 vs v3, v1 vs v3).
4. Flags any workflow where `|v3 - v2|` > 10 points (the divergence threshold) as a high-attention item.

This script is run as a non-CI artifact job — it produces a document, not a pass/fail test. The document is reviewed by the coordinator before v3 is promoted to primary.

### 6.3 Retirement Gate Criteria

v2 can be retired when all of the following are true:
1. v3 has been the shadow-computed score for at least 14 calendar days (soak window).
2. The three-way distribution comparison shows `p90(|v3 - v2|) < 10 points` across the live corpus.
3. All v3 unit tests pass (green CI).
4. All v3 E2E tests pass (green CI).
5. v3 axe-core gate passes (zero critical/serious violations).
6. v3 performance gate passes (all thresholds green).
7. Explicit coordinator sign-off with reference to the distribution comparison artifact.

These criteria align with the existing #57 flag retirement requirements documented in CLAUDE.md.

### 6.4 Rollback Plan

If v3 `process_health_score_0_100` diverges > 10 points from v2 on > 5% of live workflows after promotion:
1. The route reverts to returning v2 `metricsV2.healthScore.overall` as the primary score.
2. v3 computation continues in shadow mode.
3. A root-cause-analyst iteration is triggered to identify the source of divergence.
4. The retirement gate resets: 14-day soak restarts from rollback date.

Rollback is a route-level feature flag change, not a code revert. The v3 compute function is not removed; only the serving layer changes.

---

## 7. E2E Test Coverage

All Playwright specs extend existing v2 conventions from `apps/web-app/e2e/app/dashboard/`. Auth is the authenticated project (storageState: `.auth/user.json`). Route intercepts are used to control fixture data per the v2 pattern established in `v2-a11y.spec.ts` and `v2-happy-path.spec.ts`.

**Prerequisite:** All E2E specs that exercise real data (not mocked via route intercept) require `seedDashboardV3Dev()` to be implemented first. Tests depending on seed data must be decorated with `test.skip` and a `BLOCKED: DV2-R05` annotation until the seed function lands. This mirrors the existing skip pattern in `v2-happy-path.spec.ts` for row-level tests.

### 7.1 v3-a11y.spec.ts

Extends the DV2-R04 axe-core ratchet pattern from `v2-a11y.spec.ts`. New surfaces added for v3 (INPUT_SPEC § 14):

- **Workflow library with v3 KPI columns:** axe scan of full table including new metric columns (process_health_score, flow_efficiency, median_cycle_time, standardization_score, automation_readiness). Assert zero critical/serious violations.
- **Workflow detail view:** axe scan of KPI strip, process path, bottleneck radar, rework section, opportunity cards. Assert zero critical/serious violations.
- **Executive portfolio view:** axe scan of process groups panel, top-10 value leakage table, standardization heatmap. Assert zero critical/serious violations.
- **Low-confidence state:** workflow row with `confidence_score < 0.5` must render a non-color semantic indicator (aria-label or aria-description conveying low confidence). Assert `aria-label` or `title` attribute is present on the confidence indicator and contains a text description.
- **Pre-threshold state (< 3 runs):** workflow row with insufficient runs must render a "not enough data" state. Assert this state element has role and label accessible to screen readers.

DV2-R04 ratchet extension: The existing axe ratchet baseline file (established for v2 surfaces) must be extended to include v3 surfaces. Zero-new-violations policy applies: any v3 surface that introduces a new critical or serious violation blocks the iteration.

### 7.2 v3-column-picker.spec.ts

INPUT_SPEC § 14 (workflow library) implies column configurability. Test cases:

- **Add column:** Open column picker, add `flow_efficiency_pct` column. Assert column header appears in table.
- **Remove column:** Remove `automation_readiness_score` column. Assert column header is absent from table.
- **Reorder column:** Drag `standardization_score` before `median_cycle_time`. Assert column order in rendered thead matches new order.
- **Save configuration:** Reload page after save. Assert saved column configuration persists (stored in localStorage or API preference).
- **Default configuration:** Reset to default. Assert original column set reappears.
- **Keyboard accessibility:** Column picker trigger button is focusable via Tab. Column checkboxes are navigable via arrow keys. All controls pass axe within the picker panel.

Note: These tests require the column picker UI to be implemented. They are authored as blocked (`test.skip`) until the implementation lands, following existing convention.

### 7.3 v3-drill-through.spec.ts

Exercises the lineage drill-through path (INPUT_SPEC § 9):

- **Metric cell → workflow detail:** Click on `cycle_time_ms` cell in workflow library row. Assert navigation to `/workflows/[id]` with cycle_time detail panel open.
- **Workflow detail → step-level lineage:** In the workflow detail view, click on a metric value (e.g., bottleneck step duration). Assert a lineage panel opens showing source run_ids and step_ids.
- **Lineage panel content:** Assert lineage panel contains at least one `run_id` and at least one `step_id` displayed as navigable references.
- **Variant drill-down:** Click top variant in the variant distribution panel. Assert filtered view shows only runs matching that variant_hash.
- **Keyboard drill-through:** All drill-through interactions are achievable via keyboard (Enter on focused cell). Assert no mouse-only interactions.

All drill-through tests depend on `seedDashboardV3Dev()`. Marked skip with `BLOCKED: DV2-R05` annotation until seed lands.

### 7.4 v3-empty-states.spec.ts

Verifies the three data-scarcity states defined in INPUT_SPEC § 9:

- **Pre-threshold state (< 3 runs):** Route intercept returns workflow with `run_count = 2`, all metrics null or null-equivalents. Assert the workflow row renders a "not enough data" label or metric cells display `—`. Assert no metric value of NaN or `undefined` is rendered as text.
- **Low-confidence state (confidence < 0.5):** Route intercept returns workflow with `confidence_score_0_100 = 35`. Assert a confidence indicator is visible and conveys low-confidence semantically (not only via color).
- **Missing-data state (missingness_flags non-empty):** Route intercept returns metric_fact with `missingness_flags = ['missing_step_timestamps']`. Assert a data-quality warning indicator is visible on the affected metric cell.
- **Zero-run portfolio:** Route intercept returns empty workflows array. Assert the executive portfolio view renders a defined empty state, not a blank page or JavaScript error.

These tests use route intercepts only — no seed required. They run without the `BLOCKED` annotation.

### 7.5 v3-performance.spec.ts

Render budget tests per INPUT_SPEC § 18:

- **Workflow library initial render:** Measure time from page.goto() to first `tbody tr` visible. Assert < 3 sec for 50-workflow payload (route intercept with 50 workflow objects).
- **Workflow detail load:** Measure time from navigation to detail page until KPI strip is visible. Assert < 3 sec.
- **Executive portfolio render:** Measure time until portfolio overview panel is visible. Assert < 10 sec for 100-workflow-definition payload.
- **Metric query response time:** Intercept is replaced with a delayed route (500ms artificial delay) for the uncached case. Assert the loading state is visible during the delay and the result renders within 3 sec of response arrival.

Note: These are UI render budget tests, not server-side compute tests. Server-side perf is in section 5.

---

## 8. Determinism and Lineage Test Requirements

These requirements apply to every metric test in section 3.

### 8.1 Determinism Test Block

Every metric compute function file must include a `describe('determinism')` block containing:

1. **Ten-run identity test:** Call the compute function 10 times with the same fixture. Collect all 10 results. Assert `results.every(r => JSON.stringify(r) === JSON.stringify(results[0]))`.
2. **Fake timer requirement:** The test suite uses `vi.useFakeTimers({ now: new Date('2026-01-01T00:00:00.000Z').getTime() })` for any function that internally reads the current date/time. This extends the DV2-R10 / iter-024 route hygiene rule (which forbids `Date.now()` in tests) to the metrics engine.
3. **No `Math.random()` in formula functions:** A static code check (ESLint rule `no-restricted-syntax` targeting `Math.random` calls) must be in place before the metrics engine ships. This is an implementation requirement surfaced here as a test-infrastructure requirement.

### 8.2 Lineage Test Block

Every metric compute function must include a `describe('lineage')` block containing:

1. **Non-null lineage_ref:** Assert the returned metric object has a `lineage_ref` field that is not null and not an empty string.
2. **Run resolution:** Assert `lineage_ref.run_ids` is an array with at least one element when the metric was computed from at least one run.
3. **Step resolution (where applicable):** For step-level metrics, assert `lineage_ref.step_ids` is a non-empty array.
4. **Version field:** Assert `lineage_ref.metric_version` is a semantic version string matching `/^\d+\.\d+\.\d+$/`.
5. **Version lock test:** When the formula for a metric changes (simulated by changing a constant in the formula), assert that `metric_version` is bumped (a new test locks the old behavior under the old version, and the new version produces the new behavior under the new version). This cannot be fully automated — it is a checklist gate at code review: "if formula constants or logic changed, metric_version must increment."

---

## 9. Fixture Seeding Strategy

### 9.1 seedDashboardV3Dev() Function

This function does not currently exist (tracked as DV2-R05 in DASHBOARD_V2_REVIEW_001 cold pool). The v3 metrics engine introduces a hard dependency on it for E2E tests that require real data. The seed function must be implemented before v3 E2E tests can be un-skipped.

Location: `apps/web-app/prisma/seed-v3-dev.ts` (parallel to any existing seed files).

### 9.2 Required Seed Portfolios

The function must seed the following portfolio composition:

| Persona | Workflow count | Key characteristics |
|---|---|---|
| Multi-tier portfolio | 20 workflows | 5 healthy, 5 bottleneck, 5 high-variance, 3 automation-candidate, 2 SOP-ready |
| Low-confidence set | 5 workflows | confidence_score < 0.5 on all metric_facts; missingness_flags non-empty |
| High-variance set | 4 workflows | stddev(cycle_time_ms) > 3x median; is_high_variance_step on at least 1 step per workflow |
| Automation-candidate set | 4 workflows | automation_candidate_count >= 5; automation_feasibility_score >= 70 |
| Bottleneck set | 3 workflows | max_wait_step_id defined; bottleneck_impact_score > 0.7 |
| Fresh/sparse set | 5 workflows | run_count = 1 or 2 (below confidence threshold); pre-threshold state |

Total: ~41 workflows (acceptable for a development seed; production data is not seeded).

### 9.3 Idempotency Requirement

`seedDashboardV3Dev()` must be idempotent: calling it twice produces the same database state as calling it once. Implementation pattern: check for existence of seed marker record before inserting. If marker exists, skip seed and return without error.

### 9.4 Relationship to DV2-R05

DV2-R05 (from DASHBOARD_V2_REVIEW_001 cold pool) covers `seedDashboardV2Dev()`. The v3 seed extends this. The coordinator must ensure DV2-R05 is promoted from cold pool before the first E2E iteration for v3 (currently planned as iter 031 per CLAUDE.md). If DV2-R05 remains in cold pool at that point, the seed function must be included in scope of the v3 E2E iteration.

---

## 10. Known Risks and Coverage Gaps

### R-1: Cost Model Not Ready (Tier-C Inputs)

**Affected metrics:** `savings_opportunity_usd`, `annualized_value_leakage_usd`, `automation_roi_pct`, `labor_cost_per_run`, `labor_cost_per_step`, `cost_of_rework`, `cost_of_delay`, `cost_per_run`, `throughput_loss_estimate_usd`, `automation_savings_usd`.

**Risk:** All Layer 8 financial metrics and related Layer 6/7 USD estimates require a cost model (labor rate × hours, or cost-per-step configured by workspace). No cost model fixture exists. Tests for USD-denominated metrics must either (a) mock the cost model with a deterministic fixture and accept that the formula is tested but the inputs are synthetic, or (b) be marked as blocked with a reference to the cost model implementation ticket.

**Current mitigation:** Section 3 marks 3 financial metrics as blocked and tests the remaining 5 with `FIXTURE_COST_MODEL_MOCK`. The mock provides deterministic values to verify formula correctness independent of the cost model's own accuracy.

**Release impact:** No financial metric should appear in the v3 UI until the cost model is functional and tested end-to-end. The opportunity endpoint returns `estimated_savings: null` when cost model is absent — this must be tested explicitly (section 4.4).

### R-2: Variant Hashing Stability

**Affected metrics:** `variant_count`, `top_variant_share_pct`, `happy_path_share_pct`, `standardization_score_0_100`, `variant_entropy`, `repetitiveness_score_0_100`.

**Risk:** A small change to how `canonical_path_hash` is computed (e.g., step label normalization change, sorting order change) can cause all variant metrics to shift simultaneously. A workflow that had 3 variants under hash-v1 may have 5 variants under hash-v2 with no actual process change.

**Required test:** One test explicitly freezes the hashing algorithm: given the same sequence of step labels, the variant hash must be byte-identical across code versions. If the hash function is modified, this test must fail loudly, triggering a backfill policy review per INPUT_SPEC § 16.

**Release gate:** Before v3 ships, the hashing algorithm must be documented in a `metric_fact.computation_version` field and the backfill policy must be written. No deployment without this documentation.

### R-3: Confidence Threshold Calibration

**Affected metrics:** All composite scores (Layer 9), all metrics with confidence-based degradation (INPUT_SPEC § 9).

**Risk:** Confidence thresholds (e.g., minimum runs for a confidence score, minimum coverage for a valid metric_fact) are constants. If they are wrong, all confidence-gated metrics will either over-report confidence (missing bad data) or under-report it (suppressing valid data). Tests can only lock the current threshold values — they cannot validate that the thresholds are calibrated correctly for the real user population.

**Required test:** For each confidence threshold constant, one test asserts the exact value (e.g., `expect(MIN_RUNS_FOR_CONFIDENCE).toBe(3)`). This locks the value. A change to the constant breaks the test, forcing explicit review.

**What tests cannot cover:** Whether `MIN_RUNS_FOR_CONFIDENCE = 3` is the right value for user trust. This requires empirical calibration from real usage data (DV2-R01 pattern: health score distribution comparison).

### R-4: Multi-Actor Metrics (User/Team Variance)

**Affected metrics:** `user_variance_score`, `top_performer_delta_pct`, `novice_vs_expert_delta_pct`, `team_variance_score` (Layer 5).

**Risk:** Ledgerium's current data model is single-tenant with no multi-user recording model. The `user_id` and `team_id` fields exist in the INPUT_SPEC § 4 data model but are not populated by the current browser extension capture path.

**Current state:** Zero test coverage for these 4 metrics. All tests are marked skip with `BLOCKED: single-user-model`.

**Release gate:** These metrics must not appear in the v3 UI until the user model is extended to support multi-user data AND at least 3 unit tests per metric exist. The coordinator must not mark these metrics as shipped until both conditions are met.

### R-5: Benchmark Framework (Percentile Rank Meaninglessness)

**Affected metrics:** All metrics that output a `percentile_rank` field (INPUT_SPEC § 17 required benchmark output).

**Risk:** Percentile rank requires a reference population to be meaningful. In v1, no benchmark population is seeded. A workflow that takes 5 minutes will have `percentile_rank = null` (or rank 50 by default) because there are no peers to compare against. Tests that assert `percentile_rank > 0` on a fresh installation would be asserting a meaningless placeholder.

**Required test:** One test asserts that `percentile_rank` returns `null` (not `50` or `0`) when the reference population size is below a minimum threshold (e.g., fewer than 5 peer workflows). This prevents the engine from reporting false precision.

**Release gate:** The UI must not display percentile rank badges when `percentile_rank = null`. An E2E test in `v3-empty-states.spec.ts` covers this.

---

## 11. Release Gate Criteria — Phase 1 v3 MVP

Per INPUT_SPEC § 21 (Phase 1 Engineering Roadmap), the v3 MVP includes:
- Canonical data model (implemented)
- Run/step normalization (implemented, extends process-engine)
- cycle_time, processing_time, wait_time (Layer 1 core set)
- Variant hashing (Layer 3 subset)
- top_variant_share (Layer 3 subset)
- Rework detection (Layer 3/4 subset)
- process_health_score v1 (Layer 9 subset)
- Workflow library KPI API (§ 13 query endpoint)

**Phase 1 release gate (all must be green):**

1. **Test coverage:** 100% of Phase 1 metrics have canonical + null + edge unit tests. No Phase 1 metric ships with only a canonical test.
2. **Determinism gate:** All Phase 1 metric functions pass the 10-run identity test.
3. **Lineage gate:** All Phase 1 metric_facts return a non-null `lineage_ref` with at least one `run_id`.
4. **E2E gate:** `v3-empty-states.spec.ts` (no seed required) is fully green. `v3-a11y.spec.ts` v3 surfaces pass (zero critical/serious violations). `v3-drill-through.spec.ts` and `v3-column-picker.spec.ts` may remain skipped with `BLOCKED: DV2-R05` annotation if seed is not yet available.
5. **Performance gate:** CI bench suite green for S-scale (1k runs) at all thresholds (section 5.2).
6. **v2 regression gate:** Existing `workflow-metrics.test.ts` (all 167 tests) remain green. `route.test.ts` remains green. No v2 behavior is broken.
7. **v2-vs-v3 distribution gate:** Three-way comparison script (section 6.2) shows `p90(|v3 - v2|) < 10 points` across the synthetic S-scale corpus. Artifact is reviewed and signed off by coordinator before merge.
8. **Axe ratchet:** Zero new critical or serious violations introduced on any v3 surface relative to v2 ratchet baseline.
9. **No `Math.random()` in formula functions:** ESLint check clean. No `Date.now()` calls in metric compute functions (extends DV2-R10 pattern).
10. **Score governance:** `sum(component_weights) ≈ 1.0` test passes for all 8 composite scores.

---

## 12. Test-Plan Sequencing

Sequencing follows the INPUT_SPEC § 21 phase roadmap and aligns with the iteration programming in CLAUDE.md.

| Iteration | Test artifacts that land | Gate |
|---|---|---|
| v3 Phase 1, iter A (data model + normalization) | `workflow-metrics-v3.fixtures.ts` (base fixtures); Layer 1 unit tests (cycle_time, processing_time, wait_time, flow_efficiency); determinism block for Layer 1; route contract tests for /metrics/catalog | Iter green: Layer 1 unit pass + determinism pass + catalog contract pass |
| v3 Phase 1, iter B (variant hashing + rework) | Layer 3 unit tests (variant_count, top_variant_share, rework_rate, conformance_score); Layer 3 determinism block; hash stability test | Iter green: Layer 3 unit pass + hash stability test pass |
| v3 Phase 1, iter C (process_health_score v1) | Layer 9 unit tests (process_health_score); weight governance tests; v2-vs-v3 comparison script (section 6.2); /scores/query contract tests | Iter green: Layer 9 unit pass + weight governance pass + distribution comparison artifact reviewed |
| v3 Phase 1, iter D (workflow library KPI API) | /metrics/query contract tests; performance bench suite (S-scale); v3-empty-states.spec.ts E2E (no seed) | Iter green: API contract tests pass + perf gate green + empty-states E2E green |
| v3 Phase 1, iter E (axe + accessibility hardening) | v3-a11y.spec.ts (v3 surfaces); axe ratchet extension; keyboard navigation tests in v3-column-picker.spec.ts | Iter green: zero new axe critical/serious; column picker keyboard tests pass |
| Post-Phase-1 (Phase 2 prep) | Layer 2, 5, 6, 7 unit tests; v3-drill-through.spec.ts (unblocked by DV2-R05); v3-performance.spec.ts render budget | Phase 2 gate: all Phase 2 metrics tested; DV2-R05 closed; seed in place |
| Financial metrics (Phase 2+) | Layer 8 unit tests; cost model fixture; R-1 blocked tests unblocked | Cost model implementation complete and tested |

No iteration ships without its full test obligation. If an iteration's test artifacts cannot be written (e.g., R-4 multi-actor metrics), the affected metrics are excluded from that iteration's scope per Mode 5 guardrail 7(b) one-logical-outcome rule.

---

## 13. Flaky-Test Prevention

All provisions in this section are mandatory for the v3 test suite. Violations are implementation defects, not test defects.

### 13.1 Frozen Clocks

Any test that exercises a function which reads the current time must use `vi.useFakeTimers()` with a fixed reference:
```
vi.useFakeTimers({ now: new Date('2026-01-01T00:00:00.000Z').getTime() })
```
This extends iter-024 route hygiene (DV2-R10) to the metrics engine. The rule applies to: time-window calculations, arrival_rate_per_day (uses current date as reference), trend computations, and any function that compares `metric_fact.computation_timestamp` to the current time.

### 13.2 No Date.now() in Formula Functions

Formula functions (Layer 1–9 compute functions) must not call `Date.now()` or `new Date()` without a passed-in reference parameter. If a function needs the current timestamp for computation, it must accept it as a parameter (e.g., `computeArrivalRate(runs, referenceDate: Date)`). This makes the function pure and testable.

An ESLint rule (`no-restricted-syntax` or equivalent) must flag `Date.now()` in the metrics engine source files. This rule must be enforced before the first v3 iteration merges.

### 13.3 Seeded Randomness

No formula function may use `Math.random()`. All stochastic inputs (e.g., synthetic data generation, jitter in test fixtures) must use a seeded deterministic generator. The production code path has no stochastic elements; this rule exists to protect future contributors from accidentally introducing non-determinism.

### 13.4 Stable Fixtures

Fixtures must not use `Date.now()`, `new Date()` without a literal argument, or dynamically generated IDs. All `run_id`, `step_id`, `workflow_definition_id` values in fixtures are string literals (e.g., `'run-001'`), not `crypto.randomUUID()`.

### 13.5 Network Isolation in Unit Tests

Unit tests (Vitest) must use `vi.mock()` for all I/O. No unit test makes a real database call or HTTP request. Route tests use the existing `vi.mock('@/db')` pattern from `route.test.ts`. Any v3 route test that fails due to a real network call is a test defect.

### 13.6 Playwright Stability

E2E tests avoid `page.waitForTimeout()` for correctness checks — `waitForTimeout` is used only for known render budget assertions (section 7.5). For data-dependent assertions, use `waitFor({ state: 'visible' })` with a reasonable timeout (default 10s, extended to 30s only for portfolio-level views). This prevents flaky timeouts caused by variable CI server performance while preserving the render budget gate.

---

*End of TEST_PLAN_METRICS_ENGINE.md*
