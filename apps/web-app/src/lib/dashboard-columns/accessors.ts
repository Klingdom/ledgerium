/**
 * Column accessors — pure derivations from row context (iter-056 / Path D D+1).
 *
 * Only columns whose `availability === 'available'` have an accessor here. The
 * 6 currently-rendered fields (workflow_title, systems, opportunity_tag,
 * health_score, last_run_at, run_count) plus a small Tier A subset already
 * exposed by `WorkflowMetricsOutput` are wired today. Path C R+1 / R+3
 * iterations will land additional accessors as those data tiers materialize.
 *
 * All accessors are deterministic pure functions — no clocks, no randomness,
 * no I/O. Returning `null` is a meaningful "value not available for this
 * specific row" signal (e.g. unprocessed workflow → runs === null).
 *
 * ── ColumnAccessorContext extension (iter-065 / WDC2-P01) ─────────────────────
 *
 * `ColumnAccessorContext` carries two time-related fields — `referenceNowMs`
 * and `activeTimeRange` — added at iter-065 as the architectural prerequisite
 * for Wave A statistical surface (row #101 WDC2-P02). The accessors defined in
 * this file (iter-056) are LIFETIME accessors:
 *
 *  - They return identical values regardless of `referenceNowMs` or
 *    `activeTimeRange`. Their semantics do not depend on a time window.
 *  - The 6 display-group accessors (workflow_title, systems, opportunity_tag,
 *    health_score, last_run_at, run_count) read top-level row fields or
 *    `metricsV2` scalars; none of these are time-windowed in today's engine.
 *  - The 4 Tier A accessors (cycle_time_ms, cycle_time_mean_ms, case_volume,
 *    system_count_per_run) read `WorkflowMetricsOutput` scalars computed by
 *    the engine over the full case set; the engine does NOT yet expose a
 *    time-windowed variant.
 *
 * Future time-windowed accessors (Wave A — row #101) MUST:
 *  1. Consume `referenceNowMs` to derive their window-end timestamp. They MUST
 *     NOT call `Date.now()`, `new Date()`, or `performance.now()` directly.
 *  2. Consume `activeTimeRange` to derive their window-start timestamp from
 *     the `referenceNowMs - window_ms` boundary (or skip windowing when
 *     `activeTimeRange === 'all'`).
 *  3. Preserve the audit-honesty IFF invariant: `accessor !== null IFF
 *     availability === 'available'`. The registry test (Group C) asserts.
 *
 * Group G of `registry.test.ts` asserts the lifetime-preservation contract by
 * calling each existing accessor with two different `referenceNowMs` and two
 * different `activeTimeRange` values and asserting byte-identical results.
 *
 * @see types.ts — ColumnAccessor signature + audit-honesty invariant
 * @see registry.ts — wires accessors to ColumnKey entries
 * @see docs/meta/WORKFLOWS_DASHBOARD_REVIEW_002.md §5.3 + §12 — WDC2-P01 scope
 */

import type { ColumnAccessor, ColumnAccessorContext } from './types.js';

/**
 * `workflow_title` accessor — top-level row field; never null in practice
 * (Prisma schema requires it) but we return null defensively if blank.
 */
export const accessWorkflowTitle: ColumnAccessor<string> = (ctx) => {
  return ctx.title.length > 0 ? ctx.title : null;
};

/**
 * `systems` accessor — distinct systems/tools observed in runs. Returns the
 * pre-parsed `toolsUsed` array verbatim (no dedup; engine guarantees
 * distinctness upstream per `WorkflowRowData.toolsUsed` contract).
 */
export const accessSystems: ColumnAccessor<string[]> = (ctx) => {
  return ctx.toolsUsed;
};

/**
 * `opportunity_tag` accessor — closed enum from `OpportunityTag` literal union.
 * Engine output is non-nullable, so we always return a value.
 */
export const accessOpportunityTag: ColumnAccessor<string> = (ctx) => {
  return ctx.metricsV2.opportunityTag;
};

/**
 * `health_score` accessor — overall 0-100 integer; tooltip breakdown is
 * driven by the full `healthScore` subtree in the consumer (not via this
 * accessor — accessors return scalar/array values, not nested objects).
 */
export const accessHealthScore: ColumnAccessor<number> = (ctx) => {
  return ctx.metricsV2.healthScore.overall;
};

/**
 * `last_run_at` accessor — ISO timestamp from `ProcessDefinition.updatedAt`,
 * which records when the process definition last gained or changed a run.
 * Returns null when no ProcessDefinition exists for this workflow.
 *
 * Honesty note: this was rewired from `lastViewedAt` (a view-proxy) to
 * `processDefinitionUpdatedAt` (`ProcessDefinition.updatedAt`) in Batch A of
 * the dashboard redesign (2026-06-12).  A true per-run `lastRunAt` timestamp
 * lands at Path C R+1 (`process_run_snapshot`); at that point this accessor
 * will be tightened to the run-level field.
 */
export const accessLastRunAt: ColumnAccessor<string> = (ctx) => {
  return ctx.processDefinitionUpdatedAt;
};

/**
 * `run_count` accessor — `WorkflowMetricsOutput.runs`. Null if the workflow
 * has not been processed (no ProcessRun exists yet).
 */
export const accessRunCount: ColumnAccessor<number> = (ctx) => {
  return ctx.metricsV2.runs;
};

// ── Tier A metrics derivable from WorkflowMetricsOutput today ─────────────────
//
// `cycle_time_ms` ≡ `avgTimeMs` per ARCHITECTURE_METRICS_ENGINE.md §2 Layer 1
// (cycle = throughput in our model; "Doc note distinguishing throughput from
// cycle if they diverge; today identical"). The engine ships avgTimeMs as
// mean run-duration; we surface it under both canonical metric_keys to satisfy
// the architecture computability guarantee.

/**
 * `cycle_time_ms` accessor — alias of `avgTimeMs` (mean run duration).
 * Architecture: Layer 1 / Tier A / "run.endedAt − run.startedAt".
 */
export const accessCycleTimeMs: ColumnAccessor<number> = (ctx) => {
  return ctx.metricsV2.avgTimeMs;
};

/**
 * `cycle_time_mean_ms` accessor — same as `cycle_time_ms`; the architecture
 * doc enumerates both the base metric AND a `mean` aggregation. Today's engine
 * computes only the mean (no other aggregations), so the two columns share an
 * accessor. Path C R+1 will add median/p95/etc. as separate accessors backed
 * by `metric_fact` rows.
 */
export const accessCycleTimeMeanMs: ColumnAccessor<number> = (ctx) => {
  return ctx.metricsV2.avgTimeMs;
};

/**
 * `case_volume` accessor — count of runs observed for the workflow.
 * Architecture: Layer 1 / Tier A / "count(runs) grouped by entity". This is
 * the same value as `run_count` exposed in the display group; both columns
 * intentionally share the accessor to maintain canonical-metric-key fidelity
 * while preserving the display label.
 */
export const accessCaseVolume: ColumnAccessor<number> = (ctx) => {
  return ctx.metricsV2.runs;
};

/**
 * `system_count_per_run` accessor — distinct system count for the workflow's
 * row-grain rollup (architecture spec defines this as a per-run metric;
 * surfaced here as the workflow-level distinct count, since today's engine
 * reports `toolsUsed` at workflow grain. Per-run grain lands at Path C R+3
 * via `process_run_snapshot.metrics_json`, at which point a separate accessor
 * with run-grain aggregation semantics will replace this).
 */
export const accessSystemCountPerRun: ColumnAccessor<number> = (ctx) => {
  return ctx.toolsUsed.length;
};

/**
 * `date_recorded` accessor — ISO timestamp of workflow creation (`Workflow.createdAt`).
 * This is the earliest wall-clock moment the workflow existed in the system.
 *
 * Lifetime accessor: returns the same value regardless of `referenceNowMs` or
 * `activeTimeRange`. The field is set once at record creation and never changes.
 *
 * Rendering note: consumers MUST format this as an absolute date string
 * (e.g. "Jun 12, 2026") using a deterministic formatter — NOT as a relative
 * "N days ago" string derived from `Date.now()` at render time, which would
 * cause a Next.js hydration mismatch between server and client.
 *
 * Batch A / dashboard-redesign P0 item 1 (2026-06-12).
 */
export const accessDateRecorded: ColumnAccessor<string> = (ctx) => {
  return ctx.createdAt;
};

// ── Wave A statistical accessors (WDC2-P02 / row #101) ───────────────────────
//
// These 6 accessors flip columns from `pending-path-c-r1` to `available`.
// They read from `ctx.metricsV2.*` fields that were propagated from
// `WorkflowMetricsInput.intelligence` and `.processDefinition.medianDurationMs`
// by `computeWorkflowMetrics` (workflow-metrics.ts, iter-075).
//
// All Wave A accessors are LIFETIME accessors: they return byte-identical
// values regardless of `referenceNowMs` or `activeTimeRange` because the
// underlying intelligence data is computed over the full case set (not
// windowed).  Group G of registry.test.ts asserts this invariant.
//
// Minimum-sample-size enforcement: each accessor checks `ctx.metricsV2.runs`
// against the column's `minRunsRequired` threshold, hard-coded here to avoid
// coupling the accessor signature to the column definition object.  The column
// definition's `minRunsRequired` field mirrors the same constant for display
// in the picker tooltip; these must be kept in sync manually.
//
//   N ≥ 2  — median / mean (need at least two data points)
//   N ≥ 5  — std-dev / similarity / variant-frequency (stable population)

const MIN_RUNS_MEAN_MEDIAN = 2;   // cycle_time_median_ms
const MIN_RUNS_STAT = 5;           // variant_count, top_variant_share_pct,
                                   // path_length_stddev, path_similarity_avg

/**
 * `variant_count` accessor — distinct path variants in the process group.
 * Source: `metricsV2.variantCount` ← `intelligenceJson.variantCount`.
 * Returns null below N≥5 (statistically unreliable population).
 */
export const accessVariantCount: ColumnAccessor<number> = (ctx) => {
  const runs = ctx.metricsV2.runs;
  if (runs === null || runs < MIN_RUNS_STAT) return null;
  const val = ctx.metricsV2.variantCount;
  if (val == null) return null;
  return val;
};

/**
 * `top_variant_share_pct` accessor — share (%) of runs following the most-common path.
 * Source: `metricsV2.standardPathFrequency × 100` ← `intelligenceJson.standardPathFrequency`.
 * Returns null below N≥5.
 */
export const accessTopVariantSharePct: ColumnAccessor<number> = (ctx) => {
  const runs = ctx.metricsV2.runs;
  if (runs === null || runs < MIN_RUNS_STAT) return null;
  const freq = ctx.metricsV2.standardPathFrequency;
  if (freq == null) return null;
  return freq * 100;
};

/**
 * `path_length_stddev` accessor — std-dev of step counts across runs.
 * Source: `metricsV2.stepCountVarianceStdDev` ← `intelligenceJson.stepCountVarianceStdDev`.
 * Returns null below N≥5.
 */
export const accessPathLengthStddev: ColumnAccessor<number> = (ctx) => {
  const runs = ctx.metricsV2.runs;
  if (runs === null || runs < MIN_RUNS_STAT) return null;
  const val = ctx.metricsV2.stepCountVarianceStdDev;
  if (val == null) return null;
  return val;
};

/**
 * `path_similarity_avg` accessor — sequence stability score (0–1).
 * Source: `metricsV2.sequenceStability` ← `intelligenceJson.sequenceStability`.
 * Returns null below N≥5.
 */
export const accessPathSimilarityAvg: ColumnAccessor<number> = (ctx) => {
  const runs = ctx.metricsV2.runs;
  if (runs === null || runs < MIN_RUNS_STAT) return null;
  const val = ctx.metricsV2.sequenceStability;
  if (val == null) return null;
  return val;
};

/**
 * `cycle_time_median_ms` accessor — median run duration in milliseconds.
 * Source: `metricsV2.medianDurationMs` ← `ProcessDefinition.medianDurationMs`.
 * Returns null below N≥2 (a median needs at least two data points).
 */
export const accessCycleTimeMedianMs: ColumnAccessor<number> = (ctx) => {
  const runs = ctx.metricsV2.runs;
  if (runs === null || runs < MIN_RUNS_MEAN_MEDIAN) return null;
  const val = ctx.metricsV2.medianDurationMs;
  if (val == null) return null;
  return val;
};

/**
 * `ai_opportunity_score` accessor — 0–100 AI automation opportunity score.
 * Source: `metricsV2.aiOpportunityScore` (already computed by the engine;
 * this column makes the raw score visible alongside the opportunity_tag enum).
 *
 * No minimum-run guard: the score is computed from feature-weighted inputs
 * that are meaningful even from a single run (step count, tool count, etc.).
 */
export const accessAiOpportunityScore: ColumnAccessor<number> = (ctx) => {
  return ctx.metricsV2.aiOpportunityScore;
};

/**
 * Lookup table mapping every `ColumnKey` whose availability is `'available'`
 * to its accessor. Consumers (picker, row renderer, sort/filter helpers) call
 * the accessor via `getAccessor(key)` from index.ts to avoid switch-case
 * duplication.
 *
 * Keys NOT in this map are non-available (Path C R+1/R+3) and the registry
 * sets their `accessor` field to `null` directly (no entry needed here).
 */
export const AVAILABLE_ACCESSORS: Record<string, ColumnAccessor> = Object.freeze({
  workflow_title: accessWorkflowTitle as ColumnAccessor,
  systems: accessSystems as ColumnAccessor,
  opportunity_tag: accessOpportunityTag as ColumnAccessor,
  health_score: accessHealthScore as ColumnAccessor,
  last_run_at: accessLastRunAt as ColumnAccessor,
  run_count: accessRunCount as ColumnAccessor,
  cycle_time_ms: accessCycleTimeMs as ColumnAccessor,
  cycle_time_mean_ms: accessCycleTimeMeanMs as ColumnAccessor,
  case_volume: accessCaseVolume as ColumnAccessor,
  system_count_per_run: accessSystemCountPerRun as ColumnAccessor,
  date_recorded: accessDateRecorded as ColumnAccessor,
  // Wave A statistical accessors (WDC2-P02 / row #101):
  variant_count: accessVariantCount as ColumnAccessor,
  top_variant_share_pct: accessTopVariantSharePct as ColumnAccessor,
  path_length_stddev: accessPathLengthStddev as ColumnAccessor,
  path_similarity_avg: accessPathSimilarityAvg as ColumnAccessor,
  cycle_time_median_ms: accessCycleTimeMedianMs as ColumnAccessor,
  ai_opportunity_score: accessAiOpportunityScore as ColumnAccessor,
});

/**
 * Type re-export so consumers can import the context shape from this module
 * without a separate types.js import.
 */
export type { ColumnAccessorContext };
