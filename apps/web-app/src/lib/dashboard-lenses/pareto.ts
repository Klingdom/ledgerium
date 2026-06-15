/**
 * Pareto derivation — the LSS lens headline visual (v1).
 *
 * The Pareto ranks the user's workflows by **total observed time** = mean cycle
 * time (`metricsV2.avgTimeMs`) × run count (`metricsV2.runs`) — both available
 * today (PM I-04 / UX §3.1 / LSS_EXPERT_REVIEW §5 move 3). It produces a bar
 * series (descending) plus a cumulative-% line, and flags the "vital few" that
 * account for ~80% of total time (the classic 80/20 Analyze-phase view).
 *
 * HONESTY (DASHBOARD_PERSONAS_REVIEW honesty boundaries):
 *  - "Total observed time" is labeled exactly that — it is mean × N, an observed
 *    quantity, not a fabricated capability metric. N is attached to every datum
 *    so the UI can render "· N runs".
 *  - Workflows with no measurable cycle time (`avgTimeMs == null`) OR zero runs
 *    are EXCLUDED from the Pareto and counted separately (`excludedCount`) so the
 *    bars never imply data that does not exist. A single-run workflow still has
 *    an avgTimeMs and an observed total time (mean × 1) — it is included; the
 *    *variation* strip (separate) is what gates at N ≥ 2.
 *
 * DETERMINISM (Ledgerium invariant + hydration safety):
 *  - Pure functions: no `Date.now()`, no `Math.random()`, no I/O.
 *  - Sort is total-time descending, ties broken by workflow `id` ascending, so
 *    rendering order is byte-stable for identical input.
 *  - Cumulative % is computed as a running sum over the sorted bars divided by
 *    the grand total of included totals, expressed 0–100.
 *
 * @see docs/features/dashboard-personas/PM_PERSONA_DASHBOARD.md I-04
 * @see docs/features/dashboard-personas/UX_PERSONA_DASHBOARD.md §3.1
 * @see docs/features/dashboard-personas/LSS_EXPERT_REVIEW.md §5 (move 3 — Pareto)
 */

// ── Minimal input shape (decoupled from WorkflowRowData / React) ──────────────

/**
 * The minimal per-workflow fields the Pareto needs. Decoupled from
 * `WorkflowRowData` so this module stays pure and independently testable; the
 * shell maps its rows into this shape.
 */
export interface ParetoWorkflowInput {
  readonly id: string;
  readonly title: string;
  /** Mean cycle time in ms (`metricsV2.avgTimeMs`); null = not measurable. */
  readonly avgTimeMs: number | null;
  /** Run count (`metricsV2.runs`); null/0 = no observed runs. */
  readonly runs: number | null;
  /**
   * Distinct execution variants (`metricsV2.variantCount`); null/undefined when
   * not computed. Used ONLY by the variation strip (gated at runs ≥ 2), never by
   * the bars. Optional + nullable — honest absence renders "—".
   */
  readonly variantCount?: number | null;
}

// ── Pareto datum (one bar) ────────────────────────────────────────────────────

export interface ParetoDatum {
  readonly id: string;
  readonly title: string;
  /** Observed runs behind this workflow (for "· N runs" attribution). */
  readonly runs: number;
  /** Mean cycle time in ms (the per-run observed mean). */
  readonly avgTimeMs: number;
  /** Total observed time = avgTimeMs × runs (ms). The bar height metric. */
  readonly totalObservedMs: number;
  /** Share of grand total this workflow accounts for, 0–100. */
  readonly sharePct: number;
  /** Running cumulative share through this bar (sorted desc), 0–100. */
  readonly cumulativePct: number;
  /** True for the leading bars that together first reach the vital-few cutoff. */
  readonly isVitalFew: boolean;
}

// ── Pareto result ─────────────────────────────────────────────────────────────

export interface ParetoResult {
  /** Bars, total-time descending (ties by id asc). */
  readonly bars: readonly ParetoDatum[];
  /** Sum of every included workflow's total observed time (ms). */
  readonly grandTotalMs: number;
  /**
   * Count of vital-few workflows — the smallest leading set whose cumulative
   * share first reaches `vitalFewThresholdPct`. 0 when there are no bars.
   */
  readonly vitalFewCount: number;
  /** The cumulative threshold used to mark the vital few (default 80). */
  readonly vitalFewThresholdPct: number;
  /**
   * Total number of INCLUDED workflows (those with measurable time) — the honest
   * denominator for "vitalFewCount of includedCount". May exceed `bars.length`
   * when the rendered bars are truncated to `maxBars`.
   */
  readonly includedCount: number;
  /** Workflows excluded for lacking measurable cycle time or runs. */
  readonly excludedCount: number;
}

// ── Defaults ──────────────────────────────────────────────────────────────────

/** Classic Pareto cutoff — the "vital few" account for ~80% of total time. */
export const DEFAULT_VITAL_FEW_PCT = 80;

/**
 * Max bars to render. The tail beyond this is folded into the excluded/"others"
 * messaging by the caller; the math here still computes cumulative % over ALL
 * included workflows so the curve is honest, then truncates the returned bars.
 */
export const DEFAULT_MAX_BARS = 10;

// ── Core derivation ───────────────────────────────────────────────────────────

/**
 * Derive the Pareto from a set of workflows. Deterministic + pure.
 *
 * @param workflows  the candidate set (shell maps WorkflowRowData → this shape)
 * @param options    optional vital-few threshold (default 80) + max bars (10)
 */
export function derivePareto(
  workflows: readonly ParetoWorkflowInput[],
  options?: { vitalFewThresholdPct?: number; maxBars?: number },
): ParetoResult {
  const threshold = options?.vitalFewThresholdPct ?? DEFAULT_VITAL_FEW_PCT;
  const maxBars = options?.maxBars ?? DEFAULT_MAX_BARS;

  // 1. Compute total observed time; partition into included vs excluded.
  const included: Array<{
    id: string;
    title: string;
    runs: number;
    avgTimeMs: number;
    totalObservedMs: number;
  }> = [];
  let excludedCount = 0;

  for (const w of workflows) {
    const runs = w.runs ?? 0;
    const avg = w.avgTimeMs;
    // Excluded: no measurable mean OR no observed runs OR a non-positive total
    // (a zero-time / zero-run workflow contributes nothing and would be a 0-height
    // bar that misleads).
    if (avg == null || avg <= 0 || runs <= 0) {
      excludedCount += 1;
      continue;
    }
    const total = avg * runs;
    if (total <= 0) {
      excludedCount += 1;
      continue;
    }
    included.push({
      id: w.id,
      title: w.title,
      runs,
      avgTimeMs: avg,
      totalObservedMs: total,
    });
  }

  // 2. Sort by total observed time desc, ties broken by id asc (stable + deterministic).
  included.sort((a, b) => {
    if (b.totalObservedMs !== a.totalObservedMs) {
      return b.totalObservedMs - a.totalObservedMs;
    }
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });

  const grandTotalMs = included.reduce((sum, w) => sum + w.totalObservedMs, 0);

  // 3. Running cumulative %, vital-few marking. Compute over the FULL included
  //    set so the cumulative curve is honest even when bars are truncated.
  let runningMs = 0;
  let vitalFewCount = 0;
  let reachedThreshold = false;
  const fullBars: ParetoDatum[] = included.map((w) => {
    runningMs += w.totalObservedMs;
    const sharePct = grandTotalMs > 0 ? (w.totalObservedMs / grandTotalMs) * 100 : 0;
    const cumulativePct = grandTotalMs > 0 ? (runningMs / grandTotalMs) * 100 : 0;
    // The vital few = the leading run of workflows up to and including the first
    // bar that brings cumulative share to >= threshold.
    let isVitalFew = false;
    if (!reachedThreshold) {
      isVitalFew = true;
      vitalFewCount += 1;
      if (cumulativePct >= threshold) reachedThreshold = true;
    }
    return {
      id: w.id,
      title: w.title,
      runs: w.runs,
      avgTimeMs: w.avgTimeMs,
      totalObservedMs: w.totalObservedMs,
      sharePct,
      cumulativePct,
      isVitalFew,
    };
  });

  // 4. Truncate the rendered bars (cumulative %/vital-few already computed over all).
  const bars = fullBars.slice(0, maxBars);

  return {
    bars,
    grandTotalMs,
    vitalFewCount,
    vitalFewThresholdPct: threshold,
    includedCount: included.length,
    excludedCount,
  };
}

// ── Variation / consistency strip (honest, real-signal only) ──────────────────

export interface VariationStripResult {
  /**
   * Distinct variant counts across multi-run workflows (runs ≥ 2), keyed by
   * workflow. A workflow with runs < 2 yields `variantCount: null` (honest "—"):
   * variation is not measurable from a single run.
   */
  readonly items: readonly {
    readonly id: string;
    readonly title: string;
    readonly runs: number;
    /** Distinct execution variants; null when runs < 2 OR not computed. */
    readonly variantCount: number | null;
  }[];
  /** Count of workflows with ≥ 2 runs (the measurable population). */
  readonly multiRunCount: number;
  /** Min / max distinct-variant spread across measurable workflows; null if none. */
  readonly variantSpread: { readonly min: number; readonly max: number } | null;
  /**
   * Cycle-time spread (ms) across measurable workflows that have a mean cycle
   * time — min/max of `avgTimeMs`. An honest "how consistent is the portfolio's
   * cycle time" signal (NOT a CV — we do not have per-run distributions). Null
   * when fewer than 2 measurable means exist.
   */
  readonly cycleSpreadMs: { readonly min: number; readonly max: number } | null;
}

/**
 * Derive the compact variation/consistency strip shown beneath the Pareto.
 *
 * HONESTY: this reads ONLY real signals — distinct variant count (gated at
 * runs ≥ 2, since variation is undefined for a single run) and the observed
 * cycle-time spread (min/max of mean cycle time across workflows). It does NOT
 * compute a coefficient of variation, sigma, or any statistic the engine does
 * not surface at the workflow grain today. Per the board's honesty boundary,
 * "if you compute a consistency indicator, base it ONLY on real signals (variant
 * count / cycle spread) and label it as such; do not invent a CV you don't have."
 *
 * Pure + deterministic; items returned sorted by id asc for stable rendering.
 */
export function deriveVariationStrip(
  workflows: readonly ParetoWorkflowInput[],
): VariationStripResult {
  const items = workflows
    .map((w) => {
      const runs = w.runs ?? 0;
      // Variation is only meaningful across ≥ 2 runs (board honesty gate).
      const variantCount =
        runs >= 2 && w.variantCount != null && w.variantCount >= 0
          ? w.variantCount
          : null;
      return { id: w.id, title: w.title, runs, variantCount };
    })
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  const multiRunCount = items.filter((i) => i.runs >= 2).length;

  // Variant spread across workflows that actually have a measurable variant count.
  const variantValues = items
    .map((i) => i.variantCount)
    .filter((v): v is number => v != null);
  const variantSpread =
    variantValues.length >= 1
      ? { min: Math.min(...variantValues), max: Math.max(...variantValues) }
      : null;

  // Cycle-time spread across workflows with a measurable mean cycle time.
  const cycleValues = workflows
    .map((w) => w.avgTimeMs)
    .filter((v): v is number => v != null && v > 0);
  const cycleSpreadMs =
    cycleValues.length >= 2
      ? { min: Math.min(...cycleValues), max: Math.max(...cycleValues) }
      : null;

  return { items, multiRunCount, variantSpread, cycleSpreadMs };
}
