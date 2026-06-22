/**
 * reportScorecard — pure derivation for the 5-tile KPI scorecard and the
 * variant-frequency Pareto (R-B). No rendering, no Date/random, observed-only.
 *
 * Determinism + honesty rules:
 *   - Same input → byte-identical output.
 *   - Absent values are returned as `null` so the UI can show "—". Multi-run-only
 *     figures (CV, consistency, variant count) are gated behind runCount >= 2.
 *   - The engine threshold HIGH_VARIANCE_CV_THRESHOLD = 0.5 is surfaced via the
 *     CONSISTENCY band so tile color + disclosure match the engine, not a guess.
 *   - Pareto labels are human-readable (step-count / sequence summary), NEVER the
 *     raw pathSignature hash. The hash may travel as a tooltip/title only.
 */

import { cvBand, type CvBand } from './reportVerdict.js';

export { cvBand };
export type { CvBand };

/** CONSISTENCY tile color band, color-coded by CV per the spec:
 *  green < 0.25 · amber 0.25–0.5 · red > 0.5. The 0.5 boundary is the engine's
 *  HIGH_VARIANCE_CV_THRESHOLD. */
export type ConsistencyColor = 'green' | 'amber' | 'red';

export const HIGH_VARIANCE_CV_THRESHOLD = 0.5 as const;

export function consistencyColor(cv: number): ConsistencyColor {
  if (cv < 0.25) return 'green';
  if (cv <= HIGH_VARIANCE_CV_THRESHOLD) return 'amber';
  return 'red';
}

// ── Scorecard tiles ────────────────────────────────────────────────────────────

export interface ScorecardTile {
  id:
    | 'cycle_time'
    | 'consistency'
    | 'variant_count'
    | 'bottleneck_step'
    | 'automation_score';
  label: string;
  /** Display value, already formatted; '—' when absent. */
  value: string;
  /** One-line plain-English interpretation under the value. */
  interpretation: string;
}

export interface ConsistencyTile extends ScorecardTile {
  id: 'consistency';
  /** Color band; null when no CV is available (single-run or missing). */
  color: ConsistencyColor | null;
  /** CV band word; null when unavailable. */
  band: CvBand | null;
}

export interface ScorecardInput {
  runCount: number;
  /** metrics.medianDurationMs (ms) or null. */
  medianDurationMs?: number | null | undefined;
  /** variance.durationVariance.coefficientOfVariation or null. */
  coefficientOfVariation?: number | null | undefined;
  /** variants.variantCount or null. */
  variantCount?: number | null | undefined;
  /** Top bottleneck step title + its share of cycle time (0–100), or null. */
  topBottleneck?: { title: string; percentOfCycleTime: number } | null | undefined;
  /** Deterministic automation score 0–100 or null. */
  automationScore?: number | null | undefined;
  /** Pre-formatted median duration label (caller owns formatDuration). */
  medianDurationLabel?: string | null | undefined;
}

function isFiniteNum(v: number | null | undefined): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

const DASH = '—';

/**
 * Build the 5 scorecard tiles. Multi-run-only metrics (consistency, variant
 * count) are gated behind runCount >= 2 and render as '—' / "1 run" otherwise.
 * The CONSISTENCY tile carries its color band + threshold disclosure.
 */
export function buildScorecard(input: ScorecardInput): {
  cycleTime: ScorecardTile;
  consistency: ConsistencyTile;
  variantCount: ScorecardTile;
  bottleneckStep: ScorecardTile;
  automationScore: ScorecardTile;
} {
  const runCount = isFiniteNum(input.runCount) ? input.runCount : 0;
  const isMultiRun = runCount >= 2;

  // ── Cycle Time (median). For a single run it is one observation, not a median;
  //    label it honestly. ────────────────────────────────────────────────────
  const cycleValue =
    input.medianDurationLabel != null && input.medianDurationLabel !== ''
      ? input.medianDurationLabel
      : DASH;
  const cycleTime: ScorecardTile = {
    id: 'cycle_time',
    label: 'Cycle Time',
    value: cycleValue,
    interpretation:
      cycleValue === DASH
        ? 'No timing recorded'
        : isMultiRun
        ? `Median across ${runCount} runs`
        : 'Single recorded run',
  };

  // ── Consistency (CV) — multi-run only; color-coded with band + threshold. ────
  const cv = input.coefficientOfVariation;
  let consistency: ConsistencyTile;
  if (isMultiRun && isFiniteNum(cv)) {
    const band = cvBand(cv);
    consistency = {
      id: 'consistency',
      label: 'Consistency',
      value: cv.toFixed(2),
      color: consistencyColor(cv),
      band,
      interpretation: `${band} · CV ≥ ${HIGH_VARIANCE_CV_THRESHOLD.toFixed(
        2,
      )} = high variance`,
    };
  } else {
    consistency = {
      id: 'consistency',
      label: 'Consistency',
      value: DASH,
      color: null,
      band: null,
      interpretation: isMultiRun
        ? 'Variance data not available'
        : 'Record 2+ runs to unlock',
    };
  }

  // ── Variant Count — multi-run only. ──────────────────────────────────────────
  const vc = input.variantCount;
  const variantCount: ScorecardTile = {
    id: 'variant_count',
    label: 'Variant Count',
    value: isMultiRun && isFiniteNum(vc) ? String(vc) : DASH,
    interpretation: !isMultiRun
      ? 'Record 2+ runs to unlock'
      : !isFiniteNum(vc)
      ? 'Variant data not available'
      : vc === 1
      ? 'All runs follow one path'
      : `${vc} distinct paths`,
  };

  // ── Bottleneck Step — present whenever a bottleneck was detected. ─────────────
  const bn = input.topBottleneck;
  const hasBn =
    bn != null && bn.title.trim().length > 0 && isFiniteNum(bn.percentOfCycleTime);
  const bottleneckStep: ScorecardTile = {
    id: 'bottleneck_step',
    label: 'Bottleneck Step',
    value: hasBn ? bn.title.trim() : DASH,
    interpretation: hasBn
      ? `${Math.round(bn.percentOfCycleTime)}% of cycle time`
      : 'None detected',
  };

  // ── Automation Score — deterministic 0–100. ──────────────────────────────────
  const as = input.automationScore;
  const automationScore: ScorecardTile = {
    id: 'automation_score',
    label: 'Automation Score',
    value: isFiniteNum(as) ? String(Math.round(as)) : DASH,
    interpretation: !isFiniteNum(as)
      ? 'Not scored'
      : as >= 70
      ? 'Strong automation candidate'
      : as >= 40
      ? 'Partial automation candidate'
      : 'Low automation potential',
  };

  return { cycleTime, consistency, variantCount, bottleneckStep, automationScore };
}

// ── Variant Pareto ──────────────────────────────────────────────────────────────

export interface ParetoVariantInput {
  variantId: string;
  isStandardPath?: boolean | undefined;
  frequency?: number | null | undefined;
  runCount?: number | null | undefined;
  /** Raw engine path signature hash — kept ONLY for tooltip/title, never headline. */
  signature?: string | null | undefined;
  /** Optional real recorded step titles (variantStepTitles) for a richer label. */
  stepTitles?: string[] | null | undefined;
  /** Step count from the path signature (sequence length). */
  stepCount?: number | null | undefined;
}

export interface ParetoRow {
  key: string;
  /** Human-readable label — step-count / sequence summary, NEVER the raw hash. */
  label: string;
  isStandardPath: boolean;
  /** True when this row aggregates the 1–2-run outliers. */
  isGrouped: boolean;
  runCount: number;
  /** Share of total runs, 0–100, rounded for display. */
  percent: number;
  /** Raw signature for an optional tooltip; null for grouped/standard rows. */
  signatureTooltip: string | null;
}

/** Derive a human-readable label for a variant, suppressing the hash. */
function variantLabel(v: ParetoVariantInput): string {
  if (v.isStandardPath) return 'Reference path';
  // Prefer a concise sequence summary from real recorded titles when available.
  const titles = (v.stepTitles ?? []).map((t) => t.trim()).filter((t) => t.length > 0);
  if (titles.length > 0) {
    const head = titles.slice(0, 3).join(' → ');
    return titles.length > 3 ? `${head} → … (${titles.length} steps)` : head;
  }
  // Use only the real engine step count. The path signature is an opaque hash —
  // splitting it on ':' and counting segments is NOT a step count (honesty).
  const count = isFiniteNum(v.stepCount) ? v.stepCount : null;
  if (isFiniteNum(count)) {
    return `${count}-step path`;
  }
  return 'Alternate path';
}

/**
 * Build the variant-frequency Pareto rows, ranked by runCount desc.
 *
 *   - The standard path is badged "Reference path".
 *   - Variants with 1–2 runs are aggregated into a single "Unique executions
 *     (N runs)" row (the long tail), keeping the chart legible.
 *   - Percent uses the supplied totalRunCount denominator so shares are honest
 *     even when the tail is grouped.
 *   - Labels are human-readable; the raw signature is exposed only as a tooltip.
 */
export function buildParetoRows(
  variants: readonly ParetoVariantInput[],
  totalRunCount: number,
): ParetoRow[] {
  const total = isFiniteNum(totalRunCount) && totalRunCount > 0 ? totalRunCount : 0;
  const runs = (v: ParetoVariantInput): number =>
    isFiniteNum(v.runCount) ? v.runCount : 0;

  // Deterministic order: runCount desc, then frequency desc, then id asc.
  const sorted = [...variants].sort(
    (a, b) =>
      runs(b) - runs(a) ||
      (b.frequency ?? 0) - (a.frequency ?? 0) ||
      (a.variantId < b.variantId ? -1 : a.variantId > b.variantId ? 1 : 0),
  );

  const headline: ParetoVariantInput[] = [];
  const tail: ParetoVariantInput[] = [];
  for (const v of sorted) {
    // Never group the standard/reference path into the tail.
    if (!v.isStandardPath && runs(v) <= 2) tail.push(v);
    else headline.push(v);
  }

  const pctOf = (n: number): number => (total > 0 ? Math.round((n / total) * 100) : 0);

  const rows: ParetoRow[] = headline.map((v) => ({
    key: v.variantId,
    label: variantLabel(v),
    isStandardPath: v.isStandardPath === true,
    isGrouped: false,
    runCount: runs(v),
    percent: pctOf(runs(v)),
    signatureTooltip: v.isStandardPath ? null : v.signature?.trim() || null,
  }));

  if (tail.length > 0) {
    const tailRuns = tail.reduce((sum, v) => sum + runs(v), 0);
    rows.push({
      key: '__unique_executions__',
      label: `Unique executions (${tailRuns} run${tailRuns === 1 ? '' : 's'})`,
      isStandardPath: false,
      isGrouped: true,
      runCount: tailRuns,
      percent: pctOf(tailRuns),
      signatureTooltip: null,
    });
  }

  return rows;
}
