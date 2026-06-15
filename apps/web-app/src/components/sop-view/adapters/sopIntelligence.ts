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
  /** Short label, e.g. "Aligned" / "Drifting" / "Based on 1 recording". */
  label: string;
  /** Percentage 0-100 (only present when kind !== 'insufficient'). */
  alignmentPct: number | null;
  /** Run count the signal is based on. */
  runCount: number;
  /** Optional drift detail, e.g. the top high-severity drift description. */
  detail: string | null;
  /** Whether alignment/drift data is actually available + gated-in (N>=2). */
  hasSignal: boolean;
}

/**
 * Build the SOP header freshness/conformance pill from cohort intelligence.
 *
 * GATING (honesty): a meaningful alignment signal requires N >= 2 runs AND a
 * present `sopAlignment`. Below that we return an 'insufficient' disclosure
 * ("Based on 1 recording — review before distributing"). The engine's score
 * 0 / 'critical' on N=0/1 is NEVER surfaced as a quality condemnation.
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
  const effectiveRunCount = alignment ? Math.max(runCount, alignment.totalRunCount) : runCount;

  if (!alignment || effectiveRunCount < 2) {
    return {
      kind: 'insufficient',
      label: effectiveRunCount <= 1
        ? `Based on ${effectiveRunCount === 0 ? 'no' : '1'} recording`
        : 'Alignment not yet available',
      alignmentPct: null,
      runCount: effectiveRunCount,
      detail: effectiveRunCount <= 1 ? 'Review before distributing' : null,
      hasSignal: false,
    };
  }

  const alignmentPct = Math.round(clamp01(alignment.alignmentScore) * 100);

  // Drift "wins" the pill only when it is real: a significant/outdated drift
  // level OR at least one high-severity drift indicator.
  const highDrift = (alignment.driftIndicators ?? []).filter(
    (d) => (d?.severity ?? '') === 'high',
  );
  const driftLevel = drift?.level ?? 'aligned';
  const isDrifting =
    driftLevel === 'significant_drift' ||
    driftLevel === 'outdated' ||
    highDrift.length > 0;

  if (isDrifting) {
    const topDrift = highDrift[0]?.description ?? drift?.findings?.[0] ?? null;
    return {
      kind: 'drifting',
      label: 'Drifting',
      alignmentPct,
      runCount: effectiveRunCount,
      detail: topDrift,
      hasSignal: true,
    };
  }

  return {
    kind: 'aligned',
    label: 'Aligned',
    alignmentPct,
    runCount: effectiveRunCount,
    detail: null,
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
  const page = cleanSignal(signals.pageTitle);
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

function cleanSignal(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  return s.length > 0 ? s : null;
}
