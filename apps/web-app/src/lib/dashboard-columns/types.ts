/**
 * Workflow Dashboard Column Registry — Path D D+1 (iter-056)
 *
 * Pure type definitions for the workflow-dashboard column-customization system
 * per WORKFLOW_DASHBOARD_CUSTOMIZATION_REVIEW_001 §11 (WDC-P02 closure).
 *
 * Each `WorkflowDashboardColumn` describes one column that can be rendered in
 * the workflow library table. The registry enumerates every Tier A metric from
 * `docs/features/dashboard-v3-metrics-engine/ARCHITECTURE_METRICS_ENGINE.md §2`
 * (32 metrics) plus the 6 currently-rendered display fields, so downstream
 * iterations (D+2..D+6) can build the column picker, filter chips, persistence,
 * and default-pack on a stable contract surface.
 *
 * Audit-honesty principle (per MDR-P01/P02 + Ledgerium determinism invariant):
 * a column entry whose data is not yet computable today MUST set
 * `availability !== 'available'` AND `accessor: null`. Future iterations that
 * land Path C R+1 (metric_fact persistence) or R+3 (process_run_snapshot) will
 * flip those entries by adding the accessor, NOT by mutating availability
 * silently.
 *
 * Constraints honored:
 *  - Pure module: no I/O, no React, no Prisma imports
 *  - Closed string-literal unions for ColumnKey (compile-time exhaustiveness)
 *  - Module-singleton frozen catalog (see registry.ts) for determinism
 *  - One primary export per file (CLAUDE.md coding standards)
 *
 * @see docs/meta/WORKFLOW_DASHBOARD_CUSTOMIZATION_REVIEW_001.md (WDC-P02)
 * @see docs/features/dashboard-v3-metrics-engine/ARCHITECTURE_METRICS_ENGINE.md §2
 * @see docs/features/dashboard-v3-metrics-engine/SNAPSHOT_TABLE_DECISION.md (iter-055)
 */

import type { WorkflowMetricsOutput } from '../workflow-metrics.js';

// ── TimeRange (active time-window filter) ─────────────────────────────────────

/**
 * Active time-window filter for accessor evaluation (iter-065 / WDC2-P01).
 *
 * Mirrors `TimeRange` declared in `components/dashboard-v2/CommandHeader.tsx` —
 * re-declared here so the pure `dashboard-columns/` module remains free of
 * React/component imports. The two literal unions MUST stay in sync; the
 * registry.test.ts Group G compile-time assertion catches drift.
 *
 *  - `'7d'` / `'30d'` / `'90d'` — rolling window ending at `referenceNowMs`
 *  - `'all'` — lifetime; no time-window filter applied
 *
 * Accessor contract (audit-honesty):
 *  - Time-windowed accessors (Wave A — row #101 WDC2-P02) MUST consume this
 *    field and derive the window bounds from it; they MUST NOT call `Date.now()`
 *    internally (use `referenceNowMs` instead).
 *  - Existing accessors (iter-056 / D+1) ignore this field by design — they
 *    return lifetime values and their labels do not promise time-windowed
 *    semantics.
 */
export type TimeRange = '7d' | '30d' | '90d' | 'all';

// ── ColumnKey (closed union) ──────────────────────────────────────────────────

/**
 * Every column key registered by the catalog.
 *
 * Sources, in order:
 *  1. **Currently-rendered display fields** (6) — derive from `WorkflowRowData`
 *     today. These have `availability: 'available'`.
 *  2. **Tier A metrics** from ARCHITECTURE_METRICS_ENGINE.md §2 (32 keys, named
 *     verbatim from the architecture doc to preserve traceability — these are
 *     canonical metric_keys that will land in `metric_fact` rows). Most are
 *     `availability: 'pending-path-c-r1'` (engine + persistence not yet built);
 *     a small subset are also covered by today's `WorkflowMetricsOutput` and
 *     resolve to `'available'`.
 *
 * Closed-union form chosen over branded type so consumers get exhaustiveness
 * checks at compile time when switching on `ColumnKey`.
 */
export type ColumnKey =
  // ── Currently-rendered display fields (Path D today) ────────────────────────
  | 'workflow_title'
  | 'systems'
  | 'opportunity_tag'
  | 'health_score'
  | 'last_run_at'
  | 'run_count'
  | 'date_recorded'
  // ── Layer 1: Operational flow (12 metrics + 8 aggregations = 9 Tier A) ─────
  | 'cycle_time_ms'
  | 'throughput_time_ms'
  | 'completion_rate_pct'
  | 'case_volume'
  | 'arrival_rate_per_day'
  | 'completion_rate_per_day'
  | 'cycle_time_mean_ms'
  | 'cycle_time_median_ms'
  | 'cycle_time_p95_ms'
  // ── Layer 2: Step performance (6 Tier A) ────────────────────────────────────
  | 'avg_step_duration_ms'
  | 'median_step_duration_ms'
  | 'step_frequency'
  | 'step_error_rate_pct'
  | 'is_bottleneck_step'
  | 'is_high_variance_step'
  // ── Layer 3: Variation and conformance (5 Tier A) ───────────────────────────
  | 'variant_count'
  | 'top_variant_share_pct'
  | 'path_length_avg'
  | 'path_length_stddev'
  | 'path_similarity_avg'
  // ── Layer 4: Quality and outcome (4 Tier A) ─────────────────────────────────
  | 'error_rate_pct'
  | 'exception_rate_pct'
  | 'failure_rate_pct'
  | 'abandonment_rate_pct'
  // ── Layer 5: Human/task mining (7 Tier A) ───────────────────────────────────
  | 'clicks_per_run'
  | 'actions_per_run'
  | 'avg_action_duration_ms'
  | 'system_count_per_run'
  | 'application_switch_rate'
  | 'data_entry_time_ms'
  | 'navigation_overhead_pct'
  // ── Layer 6: Bottleneck and constraint (1 Tier A) ───────────────────────────
  | 'max_wait_step_id'
  // ── AI / opportunity signal (WDC2-P02 / row #101, Wave A) ───────────────────
  | 'ai_opportunity_score';

// ── ColumnGroup (UX taxonomy for picker grouping) ─────────────────────────────

/**
 * Picker-time grouping label. Each column belongs to exactly one group; the
 * picker UI (D+4) renders columns under their group header.
 *
 * `display` is the synthetic group for currently-rendered fields that are not
 * pure architecture metrics (e.g. `workflow_title`); architecture-metric groups
 * mirror ARCHITECTURE_METRICS_ENGINE.md Layer naming so consumers can navigate
 * doc → registry → UI deterministically.
 */
export type ColumnGroup =
  | 'display'
  | 'flow'           // Layer 1
  | 'step'           // Layer 2
  | 'variation'      // Layer 3
  | 'quality'        // Layer 4
  | 'behavior'       // Layer 5
  | 'bottleneck';    // Layer 6

// ── ColumnDataType (rendering / filter primitive) ─────────────────────────────

/**
 * The semantic shape of the column's value. Picker (D+4) and filter chips (D+2)
 * use this to choose the right input control (numeric range, enum dropdown,
 * date picker, etc.) without hard-coding per-column logic.
 *
 * - `duration` — milliseconds, formatted "32m 14s" / "2.4 h" by consumers
 * - `percentage` — 0–100 (NOT 0–1; engine output already in display units)
 * - `enum` — closed-union string; consumers may inspect individual values via
 *   the column's discriminated knowledge (e.g. OpportunityTag literals)
 * - `boolean` — true/false flags (Layer 2 step-flag rollups; future)
 */
export type ColumnDataType =
  | 'number'
  | 'string'
  | 'date'
  | 'enum'
  | 'percentage'
  | 'duration'
  | 'boolean';

// ── ColumnAvailability (audit honesty) ────────────────────────────────────────

/**
 * Whether a column's data is actually computable today.
 *
 * - `available` — `accessor` is non-null and returns a real value derived from
 *   the workflow row + WorkflowMetricsOutput shipped in `/api/workflows`.
 * - `pending-path-c-r1` — requires `metric_fact` persistence (aggregate metrics
 *   keyed by `metric_key + entity + window + filter_hash` per
 *   SNAPSHOT_TABLE_DECISION.md §2.1). Picker MAY surface but MUST disable.
 * - `pending-path-c-r3` — requires `process_run_snapshot` persistence (per-run
 *   grain, e.g. variant_hash, opportunity_tag snapshot at run terminal state
 *   per SNAPSHOT_TABLE_DECISION.md §2.2). Picker MAY surface but MUST disable.
 *
 * The picker MUST NOT flip `pending-*` to `available` at runtime. Path C R+1
 * and R+3 iterations will land the accessor implementations and update the
 * registry literal in this same file.
 */
export type ColumnAvailability =
  | 'available'
  | 'pending-path-c-r1'
  | 'pending-path-c-r3';

// ── PlanTierGate (gating signal for picker UI) ────────────────────────────────

/**
 * Plan tier required to render the column's value (or breakdown). The picker
 * (D+4) reads this to render lock affordances; gating ENFORCEMENT happens at
 * the API layer (D+3 persistence or earlier — out of scope this iteration).
 *
 * - `null` (unset) — column visible to all plans
 * - `'starter'` — visible at starter tier and above
 * - `'team'` — visible at team tier and above
 *
 * Single source of truth lives in this registry per WDC-P02 audit; iter-049
 * intelligenceJson contract-prep wired Layer 3 metrics through the adapter
 * without surfacing them — gating decisions land here at D+1.
 */
export type PlanTierGate = 'starter' | 'team';

// ── ColumnAccessor (derive value from row) ────────────────────────────────────

/**
 * The minimal shape needed to derive a column's value. We accept both a
 * `WorkflowMetricsOutput` (derived metric subtree) AND a small subset of
 * top-level row fields (title, lastViewedAt, toolsUsed) so accessors don't have
 * to import `WorkflowRowData` from the React component layer.
 *
 * NOTE: NOT exported as a primary symbol — it's a type alias supporting
 * `ColumnAccessor`. Per CLAUDE.md "one primary export per file" the primary
 * export of this file is the bundle of `WorkflowDashboardColumn` types.
 */
export interface ColumnAccessorContext {
  /** Workflow display title (top-level row field). */
  title: string;
  /** Distinct systems/tools observed in the workflow runs. */
  toolsUsed: string[];
  /** ISO timestamp of last view, or null if never viewed. */
  lastViewedAt: string | null;
  /** ISO timestamp of workflow creation. */
  createdAt: string;
  /**
   * ISO timestamp from `ProcessDefinition.updatedAt` — when the process
   * definition last gained or changed a run.  Used as the honest "Last Run"
   * proxy (Batch A / dashboard-redesign P0 item 2).  Null when no
   * ProcessDefinition exists for this workflow yet.
   *
   * Accessor contract: `accessLastRunAt` reads this field (not `lastViewedAt`)
   * so the "Last Run" column label is semantically honest.
   */
  processDefinitionUpdatedAt: string | null;
  /** Engine-computed metrics subtree (post-iter-039 single-source-of-truth). */
  metricsV2: WorkflowMetricsOutput;
  /**
   * Single upstream clock boundary (iter-065 / WDC2-P01).
   *
   * Wall-clock milliseconds (`Date.now()`-shaped). The caller MUST snapshot this
   * value once at a stable upper render/request boundary (e.g. WorkflowList
   * construction; `route.ts:485-487` `const referenceNowMs = Date.now()` per
   * iter-037 / MDR-P03 precedent) and pass the same value into every accessor
   * call within the same logical evaluation.
   *
   * Determinism contract (Ledgerium invariant):
   *  - Accessors MUST NOT call `Date.now()` / `new Date()` / `performance.now()`
   *    internally. All time-of-evaluation semantics flow through this field.
   *  - Same `referenceNowMs` + same other context → byte-identical output.
   *
   * Audit-honesty contract:
   *  - Time-windowed accessors (Wave A — row #101) compute their window bounds
   *    from `referenceNowMs` and `activeTimeRange`. Their labels promise
   *    time-windowed semantics and the registry's `availability` field reflects
   *    this commitment.
   *  - Existing accessors (iter-056 / D+1) ignore this field — they return
   *    lifetime values and their labels do not promise time-windowed semantics.
   *    Group G of `registry.test.ts` asserts this preservation.
   */
  referenceNowMs: number;
  /**
   * Active time-window filter (iter-065 / WDC2-P01).
   *
   * The currently-selected `TimeRange` from the dashboard header. See `TimeRange`
   * JSDoc for the contract distinction between time-windowed accessors (consume
   * this field) and lifetime accessors (ignore this field).
   */
  activeTimeRange: TimeRange;
}

/**
 * Pure function that derives the column's value from a row's accessor context.
 *
 * Returning `null` is meaningful: the value is genuinely unavailable for this
 * specific workflow (e.g. `runs === null` for an unprocessed workflow). The
 * picker / row renderer should display "—" in that case. Returning `undefined`
 * is a programmer error (consumers should treat as "—" defensively).
 *
 * Determinism contract: same context → byte-identical return value. No
 * `Date.now()`, no random, no I/O.
 */
export type ColumnAccessor<T = unknown> = (ctx: ColumnAccessorContext) => T | null;

// ── WorkflowDashboardColumn (primary export) ──────────────────────────────────

/**
 * One row in the column registry. Every column the picker, filter system,
 * persistence layer, or row renderer might surface MUST appear here.
 *
 * Field guarantees:
 *  - `key` is unique across the registry (registry.test.ts asserts).
 *  - `label` ≤ 24 chars (UI compactness; verified by test).
 *  - `description` ≤ 80 chars (picker tooltip; verified by test).
 *  - `accessor` is non-null IFF `availability === 'available'` (the registry
 *    test asserts this invariant — audit-honesty principle).
 *  - When `dataType === 'enum'`, downstream consumers may rely on the column's
 *    closed value space (e.g. `OpportunityTag`); this is documented per-column
 *    in the registry.
 */
export interface WorkflowDashboardColumn {
  /** Stable identifier; canonical metric_key for Tier A metrics. */
  readonly key: ColumnKey;
  /** Short human-readable column header (≤ 24 chars). */
  readonly label: string;
  /** Picker tooltip / help text (≤ 80 chars). */
  readonly description: string;
  /** Semantic value shape; drives picker input control + cell formatter. */
  readonly dataType: ColumnDataType;
  /** Whether the column may be used as a sort key. */
  readonly sortable: boolean;
  /** Whether the column may be used as a filter. */
  readonly filterable: boolean;
  /** Whether the column appears in the default 7-column pack (WDC §8). */
  readonly defaultVisible: boolean;
  /** UX taxonomy bucket the picker renders this column under. */
  readonly defaultGroup: ColumnGroup;
  /** Plan tier required to render value/breakdown; null = all plans. */
  readonly planTierGate: PlanTierGate | null;
  /** Whether the column's data is computable today; see ColumnAvailability. */
  readonly availability: ColumnAvailability;
  /** Pure derivation from row context; null IFF availability !== 'available'. */
  readonly accessor: ColumnAccessor | null;
  /**
   * Minimum number of recorded runs required before this column's value is
   * meaningful.  When `metricsV2.runs` is below this threshold the accessor
   * returns null so the cell renders "—" rather than a statistically-unreliable
   * value.  Undefined (or 0) means no minimum (column is meaningful from run 1).
   *
   * Conventions (WDC2-P02 / row #101):
   *   N ≥ 2  — median / mean (need at least two data points)
   *   N ≥ 5  — std-dev / similarity / variant-frequency (need stable population)
   */
  readonly minRunsRequired?: number;
}
