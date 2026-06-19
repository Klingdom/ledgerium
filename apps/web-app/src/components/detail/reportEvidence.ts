/**
 * reportEvidence — pure, deterministic, observed-only derivations for the R-C
 * evidence/depth layer of the Report view (cycle-time distribution, consistency
 * score, bottleneck contribution ranking, drift formatting, insight cards).
 *
 * Determinism + hydration-safety contract (identical to reportVerdict /
 * reportScorecard):
 *   - NO Date.now(), NO Math.random(), NO now-relative `new Date()`, NO LLM,
 *     NO network, NO env reads.
 *   - Same input → byte-identical output (SSR === client).
 *
 * Honesty contract:
 *   - Every number traces to a real engine field. Absent data ⇒ `null` / empty
 *     so the UI can show an honest "—" or an empty state — NEVER a fabricated
 *     distribution, drift signal, or insight.
 *   - Multi-run-only signals (distribution spread, consistency, drift) are gated
 *     at runCount >= 2 by the caller; the derivations here additionally refuse to
 *     emit a distribution from fewer than the required summary points.
 *
 * The engine threshold HIGH_VARIANCE_CV_THRESHOLD = 0.5 (intelligence-engine
 * types.ts) is surfaced through the consistency band so the score's wording
 * matches the engine, not a guess.
 */

import { cvBand, type CvBand } from './reportVerdict.js';
// Single source of truth for the high-variance CV threshold (Wave 0 RPT-P1-9):
// previously duplicated here as a local const that could silently diverge from
// the canonical, unit-tested definition in reportScorecard.
import { HIGH_VARIANCE_CV_THRESHOLD } from './reportScorecard.js';

export { cvBand };
export type { CvBand };

function isFiniteNum(v: number | null | undefined): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

// ── 1. Cycle-time distribution (5-number summary, NOT a fabricated histogram) ──

export interface DistributionInput {
  runCount: number;
  /** metrics.minDurationMs (ms) or null. */
  minDurationMs?: number | null | undefined;
  /** metrics.medianDurationMs (ms) or null. */
  medianDurationMs?: number | null | undefined;
  /** metrics.meanDurationMs (ms) or null. */
  meanDurationMs?: number | null | undefined;
  /** metrics.p90DurationMs (ms) or null. */
  p90DurationMs?: number | null | undefined;
  /** metrics.maxDurationMs (ms) or null. */
  maxDurationMs?: number | null | undefined;
}

/** A single labelled marker on the distribution range, positioned 0–100 along
 *  the [min, max] envelope. */
export interface DistributionMarker {
  key: 'min' | 'median' | 'mean' | 'p90' | 'max';
  label: string;
  valueMs: number;
  /** Position along the [min,max] axis, 0–100. Reference markers (median) drive
   *  the report's reference line. */
  position: number;
  /** True for the median — the report draws it as the reference line. */
  isReference: boolean;
}

export interface CycleTimeDistribution {
  minMs: number;
  maxMs: number;
  /** Range of the envelope (max − min); 0 when all points coincide. */
  spanMs: number;
  markers: DistributionMarker[];
}

/**
 * Build a deterministic 5-number-summary distribution from the engine's metric
 * fields. This is a BOX/RANGE plot of the summary — it does NOT fabricate a
 * histogram (the engine does not expose per-run durations on this payload).
 *
 * Returns null when there is no usable envelope (no min/max, or a single run, or
 * a degenerate envelope where min == max with no spread to plot). Markers are
 * positioned along [min, max]; when min == max every present marker sits at 0.
 */
export function deriveDistribution(input: DistributionInput): CycleTimeDistribution | null {
  const runCount = isFiniteNum(input.runCount) ? input.runCount : 0;
  // Distribution spread is only meaningful across ≥2 runs.
  if (runCount < 2) return null;

  const min = isFiniteNum(input.minDurationMs) ? input.minDurationMs : null;
  const max = isFiniteNum(input.maxDurationMs) ? input.maxDurationMs : null;
  // Need a real envelope to plot a range. Without both ends there is nothing
  // honest to draw (we will not invent a span).
  if (min === null || max === null || max < min) return null;

  const spanMs = max - min;
  const positionOf = (v: number): number =>
    spanMs > 0 ? Math.max(0, Math.min(100, ((v - min) / spanMs) * 100)) : 0;

  const candidates: Array<{
    key: DistributionMarker['key'];
    label: string;
    valueMs: number | null;
    isReference: boolean;
  }> = [
    { key: 'min', label: 'Min', valueMs: min, isReference: false },
    { key: 'median', label: 'Median', valueMs: isFiniteNum(input.medianDurationMs) ? input.medianDurationMs : null, isReference: true },
    { key: 'mean', label: 'Mean', valueMs: isFiniteNum(input.meanDurationMs) ? input.meanDurationMs : null, isReference: false },
    { key: 'p90', label: 'P90', valueMs: isFiniteNum(input.p90DurationMs) ? input.p90DurationMs : null, isReference: false },
    { key: 'max', label: 'Max', valueMs: max, isReference: false },
  ];

  const markers: DistributionMarker[] = [];
  for (const c of candidates) {
    if (c.valueMs === null) continue;
    // Clamp out-of-envelope summary points (defensive: a malformed payload could
    // carry median > max). Honest because we never invent — we pin to the axis.
    const clamped = Math.max(min, Math.min(max, c.valueMs));
    markers.push({
      key: c.key,
      label: c.label,
      valueMs: c.valueMs,
      position: positionOf(clamped),
      isReference: c.isReference,
    });
  }

  // Need at least the two endpoints to have a range worth showing.
  if (markers.length < 2) return null;

  return { minMs: min, maxMs: max, spanMs, markers };
}

// ── 2. Consistency score (0–100) from sequenceStability and/or CV ─────────────

export type ConsistencyBand =
  | 'Highly consistent'
  | 'Mostly consistent'
  | 'Moderate variance'
  | 'High variance';

export interface ConsistencyScoreInput {
  runCount: number;
  /** variance.sequenceStability (0–1) or null. */
  sequenceStability?: number | null | undefined;
  /** variance.durationVariance.coefficientOfVariation or null. */
  coefficientOfVariation?: number | null | undefined;
}

export interface ConsistencyScore {
  /** 0–100 consistency score. Higher = more consistent. */
  score: number;
  band: ConsistencyBand;
  /** The CV band word (engine-aligned) when CV is available, else null. */
  cvBand: CvBand | null;
  /** Which inputs fed the score, for an honest disclosure line. */
  basis: {
    usedSequenceStability: boolean;
    usedCv: boolean;
  };
}

/** Map a 0–100 consistency score to its band label. */
export function consistencyBand(score: number): ConsistencyBand {
  if (score >= 85) return 'Highly consistent';
  if (score >= 65) return 'Mostly consistent';
  if (score >= 40) return 'Moderate variance';
  return 'High variance';
}

/**
 * Derive a 0–100 consistency score from observed behavior.
 *
 *   - sequenceStability (0–1, fraction of runs on the standard path) maps
 *     directly to 0–100.
 *   - CV is converted to a timing-consistency component: cvScore = clamp(
 *     (1 − CV / HIGH_VARIANCE_CV_THRESHOLD) , 0, 1) × 100, so CV 0 → 100 and
 *     CV ≥ 0.5 (the engine high-variance threshold) → 0.
 *   - When both are present the score is the average of the structural
 *     (stability) and timing (CV) components — observed behavior, not a target.
 *
 * Returns null when neither signal is available or runCount < 2 (a single run is
 * trivially "100% stable" and would communicate false certainty).
 */
export function deriveConsistencyScore(
  input: ConsistencyScoreInput,
): ConsistencyScore | null {
  const runCount = isFiniteNum(input.runCount) ? input.runCount : 0;
  if (runCount < 2) return null;

  const stability = isFiniteNum(input.sequenceStability)
    ? Math.max(0, Math.min(1, input.sequenceStability))
    : null;
  const cv = isFiniteNum(input.coefficientOfVariation)
    ? Math.max(0, input.coefficientOfVariation)
    : null;

  if (stability === null && cv === null) return null;

  const stabilityComponent = stability !== null ? stability * 100 : null;
  const cvComponent =
    cv !== null
      ? Math.max(0, Math.min(1, 1 - cv / HIGH_VARIANCE_CV_THRESHOLD)) * 100
      : null;

  let score: number;
  if (stabilityComponent !== null && cvComponent !== null) {
    score = Math.round((stabilityComponent + cvComponent) / 2);
  } else if (stabilityComponent !== null) {
    score = Math.round(stabilityComponent);
  } else {
    score = Math.round(cvComponent!);
  }
  score = Math.max(0, Math.min(100, score));

  return {
    score,
    band: consistencyBand(score),
    cvBand: cv !== null ? cvBand(cv) : null,
    basis: {
      usedSequenceStability: stability !== null,
      usedCv: cv !== null,
    },
  };
}

// ── 3. Bottleneck contribution ranking (% of total cycle time) ────────────────

export interface BottleneckContributionInput {
  position: number;
  title: string;
  system?: string | null | undefined;
  category?: string | null | undefined;
  /** bottleneck.meanDurationMs — mean across runs at this position. */
  meanDurationMs: number;
  /** bottleneck.runCount — runs that contributed to this step's mean. */
  runCount?: number | null | undefined;
  isHighDuration?: boolean | undefined;
  isHighVariance?: boolean | undefined;
}

export interface BottleneckContributionRow {
  position: number;
  title: string;
  system: string | null;
  category: string | null;
  meanDurationMs: number;
  /** Share of summed bottleneck mean durations, 0–100 (rounded for display). */
  percentOfTotal: number;
  /** Bar width 0–100 = this row's mean as a fraction of the largest mean (so the
   *  top bar fills the track and the rest scale relative to it). */
  barWidth: number;
  runCount: number | null;
  isHighDuration: boolean;
  isHighVariance: boolean;
  /** 'Slow' | 'Variable' | 'Both' | null, mirroring BottleneckRow. */
  flag: 'Slow' | 'Variable' | 'Both' | null;
  /** True for the rank-1 row — labelled "Primary bottleneck". */
  isPrimary: boolean;
}

/**
 * Rank bottleneck steps by their share of total bottleneck cycle time. The
 * denominator is the sum of the bottlenecks' mean durations (an honest,
 * observed share among the slow/variable steps — NOT a fabricated whole-process
 * total). Deterministic order: meanDurationMs desc, then position asc.
 *
 * Returns [] when there are no bottlenecks or the total is zero.
 */
export function rankBottleneckContributions(
  input: readonly BottleneckContributionInput[],
): BottleneckContributionRow[] {
  const valid = input.filter((b) => isFiniteNum(b.meanDurationMs) && b.meanDurationMs > 0);
  if (valid.length === 0) return [];

  const total = valid.reduce((sum, b) => sum + b.meanDurationMs, 0);
  if (total <= 0) return [];

  const sorted = [...valid].sort(
    (a, b) => b.meanDurationMs - a.meanDurationMs || a.position - b.position,
  );
  const maxMean = sorted[0]!.meanDurationMs;

  return sorted.map((b, idx) => {
    const flag: BottleneckContributionRow['flag'] =
      b.isHighDuration && b.isHighVariance
        ? 'Both'
        : b.isHighDuration
        ? 'Slow'
        : b.isHighVariance
        ? 'Variable'
        : null;
    return {
      position: b.position,
      title: b.title,
      system: b.system?.trim() ? b.system.trim() : null,
      category: b.category?.trim() ? b.category.trim() : null,
      meanDurationMs: b.meanDurationMs,
      percentOfTotal: Math.round((b.meanDurationMs / total) * 100),
      barWidth: maxMean > 0 ? Math.round((b.meanDurationMs / maxMean) * 100) : 0,
      runCount: isFiniteNum(b.runCount) ? b.runCount : null,
      isHighDuration: b.isHighDuration === true,
      isHighVariance: b.isHighVariance === true,
      flag,
      isPrimary: idx === 0,
    };
  });
}

// ── 4. Drift signal formatting ────────────────────────────────────────────────

export type DriftType = 'structural' | 'timing' | 'exception_rate' | 'step_count';
export type DriftSeverity = 'low' | 'medium' | 'high';

export interface DriftSignalInput {
  driftType: DriftType | string;
  severity: DriftSeverity | string;
  description: string;
  baselineValue: number | string;
  currentValue: number | string;
}

export interface FormattedDriftSignal {
  key: string;
  driftType: DriftType | string;
  /** Human-readable drift type label. */
  typeLabel: string;
  severity: DriftSeverity;
  description: string;
  /** Pre-stringified baseline/current for the "baseline → current" display. */
  baselineLabel: string;
  currentLabel: string;
}

const DRIFT_TYPE_LABELS: Record<string, string> = {
  structural: 'Structural drift',
  timing: 'Timing drift',
  exception_rate: 'Exception-rate drift',
  step_count: 'Step-count drift',
};

function normalizeSeverity(s: string): DriftSeverity {
  return s === 'high' || s === 'medium' || s === 'low' ? s : 'low';
}

/** Stringify a drift baseline/current value. Numbers that look like ms durations
 *  are passed through verbatim — the engine already embeds human-readable values
 *  in `description`; the chip shows the raw figure for traceability. */
function valueLabel(v: number | string): string {
  if (typeof v === 'number') {
    return Number.isFinite(v) ? String(v) : '—';
  }
  const trimmed = v.trim();
  return trimmed.length > 0 ? trimmed : '—';
}

/**
 * Format engine drift signals for display. Pure pass-through of real engine
 * fields — never fabricates a signal. Returns [] when there are none (the caller
 * renders the honest "no drift detected" empty state).
 */
export function formatDriftSignals(
  signals: readonly DriftSignalInput[] | null | undefined,
): FormattedDriftSignal[] {
  if (!Array.isArray(signals)) return [];
  return signals
    .filter((s) => s != null && typeof s.description === 'string')
    .map((s, idx) => ({
      key: `${s.driftType}-${idx}`,
      driftType: s.driftType,
      typeLabel: DRIFT_TYPE_LABELS[s.driftType] ?? String(s.driftType).replace(/_/g, ' '),
      severity: normalizeSeverity(String(s.severity)),
      description: s.description,
      baselineLabel: valueLabel(s.baselineValue),
      currentLabel: valueLabel(s.currentValue),
    }));
}

// ── 5. Insight cards (Standardize / Automate / Investigate) ───────────────────

export type InsightCardType = 'standardize' | 'automate' | 'investigate';

export interface InsightCardInput {
  runCount: number;
  /** variants.variantCount or null. */
  variantCount?: number | null | undefined;
  /** Dominant-path share of runs, 0–1 (standardPath.frequency), or null. */
  dominantPathFrequency?: number | null | undefined;
  /** Dominant-path run count, or null. */
  dominantPathRunCount?: number | null | undefined;
  /** Deterministic automation score 0–100 or null. */
  automationScore?: number | null | undefined;
  /** opportunityTag from workflow-metrics, or null. */
  opportunityTag?: string | null | undefined;
  /** Top automation opportunity title, or null. */
  topAutomationTitle?: string | null | undefined;
  /** Number of high-variance steps (variance.highVarianceSteps.length). */
  highVarianceStepCount?: number | null | undefined;
  /** Top bottleneck step title + its share of cycle time, or null. */
  topBottleneck?: { title: string; percentOfCycleTime: number } | null | undefined;
  /** Evidence run ids backing the findings (variants/bottleneck evidenceRunIds). */
  evidenceRunIds?: readonly string[] | null | undefined;
}

export interface InsightCard {
  key: string;
  type: InsightCardType;
  /** Card title, e.g. "Standardize the process". */
  title: string;
  /** One-line observed finding. */
  finding: string;
  /** One-line recommendation. */
  recommendation: string;
  /** Evidence anchor: the N runs / run-ids the finding is based on. */
  evidence: {
    /** Number of runs the finding draws on. */
    runCount: number;
    /** Up to a few real evidence run ids, for the anchor (may be empty). */
    runIds: string[];
    /** Pre-built human label, e.g. "Based on 12 of 16 runs". */
    label: string;
  };
}

const MAX_EVIDENCE_RUN_IDS = 5;

function evidenceAnchor(
  basisRunCount: number,
  totalRunCount: number,
  runIds: readonly string[] | null | undefined,
): InsightCard['evidence'] {
  const ids = Array.isArray(runIds)
    ? runIds.filter((id): id is string => typeof id === 'string' && id.trim().length > 0).slice(0, MAX_EVIDENCE_RUN_IDS)
    : [];
  const basis = isFiniteNum(basisRunCount) && basisRunCount > 0 ? basisRunCount : totalRunCount;
  const label =
    basis < totalRunCount
      ? `Based on ${basis} of ${totalRunCount} runs`
      : `Based on ${totalRunCount} run${totalRunCount === 1 ? '' : 's'}`;
  return { runCount: basis, runIds: ids, label };
}

/**
 * Derive 0–3 honest insight cards from REAL signals only. Each card states one
 * observed finding + one recommendation + an evidence anchor (run count + real
 * run ids). Deterministic priority order: Standardize, Automate, Investigate —
 * but each only appears when its backing signal is present and material.
 *
 * Returns [] for single-run or when no signal qualifies.
 */
export function deriveInsightCards(input: InsightCardInput): InsightCard[] {
  const runCount = isFiniteNum(input.runCount) ? input.runCount : 0;
  if (runCount < 2) return [];

  const cards: InsightCard[] = [];

  // ── Standardize — many variants AND low dominant-path coverage. ──────────────
  const variantCount = isFiniteNum(input.variantCount) ? input.variantCount : null;
  const domFreq = isFiniteNum(input.dominantPathFrequency)
    ? Math.max(0, Math.min(1, input.dominantPathFrequency))
    : null;
  if (variantCount != null && variantCount >= 2 && domFreq != null && domFreq < 0.8) {
    const domPct = Math.round(domFreq * 100);
    cards.push({
      key: 'standardize',
      type: 'standardize',
      title: 'Standardize the process',
      finding: `${variantCount} distinct paths observed; only ${domPct}% of runs follow the dominant path.`,
      recommendation:
        'Define the dominant path as the standard and align off-path runs to reduce execution variance.',
      evidence: evidenceAnchor(
        isFiniteNum(input.dominantPathRunCount) ? input.dominantPathRunCount : runCount,
        runCount,
        input.evidenceRunIds,
      ),
    });
  }

  // ── Automate — strong deterministic automation score OR an automate tag. ─────
  const autoScore = isFiniteNum(input.automationScore) ? input.automationScore : null;
  const isAutomateTag = input.opportunityTag === 'automate';
  if ((autoScore != null && autoScore >= 70) || isAutomateTag) {
    const scorePhrase =
      autoScore != null ? `Automation score is ${Math.round(autoScore)}/100` : 'Tagged as an automation candidate';
    const target = input.topAutomationTitle?.trim();
    cards.push({
      key: 'automate',
      type: 'automate',
      finding: `${scorePhrase} — a strong automation candidate.`,
      title: 'Automate this workflow',
      recommendation: target
        ? `Start with "${target}" — the highest-value automation opportunity.`
        : 'Prioritize the highest-duration steps for automation first.',
      evidence: evidenceAnchor(runCount, runCount, input.evidenceRunIds),
    });
  }

  // ── Investigate — high-variance steps OR a dominant bottleneck. ──────────────
  const hvCount = isFiniteNum(input.highVarianceStepCount) ? input.highVarianceStepCount : 0;
  const bn = input.topBottleneck;
  const hasBn =
    bn != null && bn.title.trim().length > 0 && isFiniteNum(bn.percentOfCycleTime) && bn.percentOfCycleTime > 0;
  if (hvCount > 0 || hasBn) {
    let finding: string;
    let recommendation: string;
    if (hasBn && hvCount > 0) {
      finding = `"${bn!.title.trim()}" takes ${Math.round(bn!.percentOfCycleTime)}% of cycle time, and ${hvCount} step${hvCount === 1 ? '' : 's'} run inconsistently across runs.`;
      recommendation = 'Investigate the slow and unpredictable steps before automating — they signal an unstable process.';
    } else if (hasBn) {
      finding = `"${bn!.title.trim()}" takes ${Math.round(bn!.percentOfCycleTime)}% of cycle time — the dominant bottleneck.`;
      recommendation = 'Investigate why this step dominates the cycle time before optimizing elsewhere.';
    } else {
      finding = `${hvCount} step${hvCount === 1 ? '' : 's'} run inconsistently across runs (high duration variance).`;
      recommendation = 'Investigate the unpredictable steps — variable timing usually points to a hidden decision or wait.';
    }
    cards.push({
      key: 'investigate',
      type: 'investigate',
      title: 'Investigate before automating',
      finding,
      recommendation,
      evidence: evidenceAnchor(runCount, runCount, input.evidenceRunIds),
    });
  }

  return cards;
}
