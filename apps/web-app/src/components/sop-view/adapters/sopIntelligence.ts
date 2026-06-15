/**
 * SOP Intelligence — pure, deterministic derivations for the SOP "living document"
 * surface (alignment / drift freshness pill + per-step evidence snippet).
 *
 * RENDER-ONLY: every function here is a pure transform over already-computed
 * engine output (`sopAlignment` + `documentationDrift` from the persisted
 * `ProcessDefinition.intelligenceJson`) or over already-captured SOP fields.
 * No new computation, no `Date.now()`, no I/O — safe to run in render.
 *
 * HONESTY CONTRACT (board consensus, SOP_WORLDCLASS_BENCHMARK §"Honesty fixes"):
 *  - Alignment / drift signals are ONLY meaningful at totalRunCount >= 2. The
 *    engine returns score 0 / level 'critical' for N=0/1 — that is a
 *    data-insufficiency signal, NOT a quality condemnation. `deriveAlignmentPill`
 *    GATES on N>=2 and emits a neutral disclosure for N<2.
 *  - The evidence snippet is built ONLY from real captured signals
 *    (applicationLabel / pageTitle / target label). Anything absent is omitted —
 *    never fabricated.
 */

// ─── Engine-shape mirrors (structural — avoids importing the engine into UI) ──
// We intentionally accept loosely-typed engine output so a missing/legacy
// intelligenceJson degrades gracefully rather than throwing in render.

export interface SopAlignmentLike {
  alignmentScore: number;
  alignmentLevel: 'high' | 'moderate' | 'low' | 'critical';
  alignedRunCount: number;
  totalRunCount: number;
  driftIndicators?: Array<{ severity?: string; description?: string }>;
  computedAt?: string;
}

export interface DocumentationDriftLike {
  score: number;
  level: 'aligned' | 'minor_drift' | 'significant_drift' | 'outdated';
  findings?: string[];
  computedAt?: string;
}

/** Raw additive payload surfaced by the workflow API (read-only). */
export interface SopIntelligenceInput {
  sopAlignment: SopAlignmentLike | null;
  documentationDrift: DocumentationDriftLike | null;
  /** Number of runs the cohort intelligence was computed over. */
  runCount: number;
}

// ─── Alignment pill view model ────────────────────────────────────────────────

export type AlignmentPillKind =
  /** N >= 2, SOP matches execution well — the "maintains itself" proof. */
  | 'aligned'
  /** N >= 2, drift detected — the SOP no longer matches how work is done. */
  | 'drifting'
  /** N < 2 — single recording; data-insufficiency disclosure, NOT a verdict. */
  | 'insufficient';

export interface AlignmentPill {
  kind: AlignmentPillKind;
  /**
   * Headline label — leads with the REAL conformance, e.g.
   * "5 of 16 runs follow this SOP" (aligned/drifting) or
   * "Based on 1 recording" (insufficient).
   */
  label: string;
  /**
   * Honest CONFORMANCE percentage 0-100 = fraction of ALL recorded runs that
   * follow the documented SOP path (`alignedRunCount / totalRunCount`). This is
   * the process-mining fitness / Lean adherence rate — NOT the structural
   * self-similarity `alignmentScore`. Null when kind === 'insufficient'.
   */
  conformancePct: number | null;
  /** Runs that follow the documented SOP path (the numerator). */
  alignedRunCount: number;
  /** Total recorded runs in the cohort (the honest denominator). */
  runCount: number;
  /**
   * Reserve the reassuring green check ONLY for genuinely high adherence on a
   * meaningful sample (adherence >= 0.9 AND N >= 10). Never a green 100% on a
   * tautological self-similarity number or a thin cohort.
   */
  showCheck: boolean;
  /**
   * Minimal deviation note, e.g. "11 deviate" or the top drift finding. Null
   * when nothing meaningful to surface.
   */
  detail: string | null;
  /** Whether alignment/drift data is actually available + gated-in (N>=2). */
  hasSignal: boolean;
}

/** Green check is reserved for high adherence on a meaningful sample. */
const HIGH_ADHERENCE = 0.9;
const MEANINGFUL_N = 10;

/**
 * Build the SOP header CONFORMANCE pill from cohort intelligence.
 *
 * HONESTY (SOP_EXPERT_P0_REVIEW Fix 1): the headline is REAL conformance —
 * `alignedRunCount / totalRunCount`, the fraction of ALL recorded runs that
 * follow the documented SOP path (process-mining fitness / Lean adherence).
 * We do NOT surface `alignmentScore` (structural self-similarity of the SOP
 * vs the runs it was distilled from) as conformance — that number is ~100% by
 * construction and tautological. The honest denominator is the full cohort,
 * fixed upstream in `clusterWorkflows` (Fix 0).
 *
 * GATING: a meaningful signal requires N >= 2 runs AND a present `sopAlignment`.
 * Below that we return an 'insufficient' disclosure ("Based on 1 recording —
 * review before distributing"). The engine's score 0 / 'critical' on N=0/1 is
 * NEVER surfaced as a quality condemnation.
 *
 * The green check is reserved for adherence >= 0.9 AND N >= 10. A green 100% on
 * a thin or tautological sample is the exact over-reassurance the review banned.
 *
 * Pure + deterministic: derived only from the passed values.
 */
export function deriveAlignmentPill(input: SopIntelligenceInput | null | undefined): AlignmentPill {
  const runCount = Math.max(0, Math.trunc(input?.runCount ?? 0));
  const alignment = input?.sopAlignment ?? null;
  const drift = input?.documentationDrift ?? null;

  // Honesty gate: N < 2 OR no alignment data → disclosure, not a verdict.
  // We read the engine's own totalRunCount when present (authoritative), else
  // fall back to the cohort runCount.
  const totalRuns = alignment ? Math.max(runCount, Math.max(0, Math.trunc(alignment.totalRunCount))) : runCount;

  if (!alignment || totalRuns < 2) {
    return {
      kind: 'insufficient',
      label: totalRuns <= 1
        ? `Based on ${totalRuns === 0 ? 'no' : '1'} recording`
        : 'Conformance not yet available',
      conformancePct: null,
      alignedRunCount: 0,
      runCount: totalRuns,
      showCheck: false,
      detail: totalRuns <= 1 ? 'Review before distributing' : null,
      hasSignal: false,
    };
  }

  // Honest conformance: fraction of ALL runs that follow the documented SOP.
  // Clamp the numerator into [0, totalRuns] so a malformed payload can't produce
  // a >100% or negative rate.
  const alignedRunCount = Math.min(totalRuns, Math.max(0, Math.trunc(alignment.alignedRunCount)));
  const adherence = alignedRunCount / totalRuns;
  const conformancePct = Math.round(adherence * 100);
  const deviateCount = totalRuns - alignedRunCount;

  // Drift "wins" the pill only when it is real: a significant/outdated drift
  // level OR at least one high-severity drift indicator OR a clearly low
  // adherence (most runs do NOT follow the SOP — the deviation IS the signal).
  const highDrift = (alignment.driftIndicators ?? []).filter(
    (d) => (d?.severity ?? '') === 'high',
  );
  const driftLevel = drift?.level ?? 'aligned';
  const isDrifting =
    driftLevel === 'significant_drift' ||
    driftLevel === 'outdated' ||
    highDrift.length > 0 ||
    adherence < 0.5;

  // Headline leads with the run count + the real number, never "Aligned 100%".
  const label = `${alignedRunCount} of ${totalRuns} runs follow this SOP`;

  // Minimal deviation note: prefer a concrete drift finding, else the count.
  const driftFinding = highDrift[0]?.description ?? drift?.findings?.[0] ?? null;
  const detail = isDrifting
    ? (driftFinding ?? (deviateCount > 0 ? `${deviateCount} deviate` : null))
    : (deviateCount > 0 ? `${deviateCount} deviate` : null);

  // Green check ONLY for genuinely high adherence on a meaningful sample, and
  // never while drifting.
  const showCheck = !isDrifting && adherence >= HIGH_ADHERENCE && totalRuns >= MEANINGFUL_N;

  return {
    kind: isDrifting ? 'drifting' : 'aligned',
    label,
    conformancePct,
    alignedRunCount,
    runCount: totalRuns,
    showCheck,
    detail,
    hasSignal: true,
  };
}

// ─── Per-step evidence snippet ────────────────────────────────────────────────

/** Captured signals for one SOP step — all optional, all from real evidence. */
export interface StepEvidenceSignals {
  /** Application/system label (SOPStep.system or instruction.system). */
  applicationLabel?: string | null | undefined;
  /** Page title where the step occurred (from process_map node metadata). */
  pageTitle?: string | null | undefined;
  /** Action / target label (first instruction's targetLabel). */
  actionLabel?: string | null | undefined;
}

export interface StepEvidence {
  /** Ordered, present-only parts: [app, page, action]. */
  parts: string[];
  /** Pre-joined "App · Page · Action" string ('' if no signals). */
  text: string;
  /** Whether any real evidence signal is present. */
  hasEvidence: boolean;
}

/**
 * Derive the per-step evidence snippet from real captured signals only.
 *
 * Honesty: a part is included ONLY when its source value is a non-empty string.
 * Nothing is invented; if no signals exist, `hasEvidence` is false and callers
 * MUST omit the snippet entirely.
 *
 * Example: { applicationLabel: 'Salesforce', pageTitle: 'Opportunities',
 *            actionLabel: "Save Opportunity" }
 *   → "Salesforce · Opportunities · Save Opportunity"
 */
export function deriveStepEvidence(signals: StepEvidenceSignals): StepEvidence {
  const parts: string[] = [];
  const app = cleanSignal(signals.applicationLabel);
  // PII guard (QA_SOP_P0_REVIEW P2-B): captured page titles can carry CRM names,
  // invoice refs, customer names ("John Smith — Invoice #1234"). They are
  // observed-only (never fabricated), but we cap them to keep the snippet from
  // surfacing a full PII-bearing title. Truncate to ~40 chars + ellipsis.
  const page = truncatePageTitle(cleanSignal(signals.pageTitle));
  const action = cleanSignal(signals.actionLabel);

  if (app) parts.push(app);
  // Only show pageTitle when it adds information beyond the app label.
  if (page && page.toLowerCase() !== (app ?? '').toLowerCase()) parts.push(page);
  if (action) parts.push(action);

  return {
    parts,
    text: parts.join(' · '),
    hasEvidence: parts.length > 0,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

/**
 * Cap a captured page title for display so PII-bearing titles aren't surfaced in
 * full. Observed-only — we never fabricate; we only truncate. Deterministic.
 */
function truncatePageTitle(value: string | null): string | null {
  if (value === null) return null;
  const MAX = 40;
  if (value.length <= MAX) return value;
  // Trim trailing whitespace before the ellipsis for a clean cut.
  return value.slice(0, MAX).replace(/\s+$/, '') + '…';
}

function cleanSignal(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  return s.length > 0 ? s : null;
}
