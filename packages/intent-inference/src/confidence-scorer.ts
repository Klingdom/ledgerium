/**
 * Confidence scoring (PATHE-P02 §A5).
 *
 * Formula:
 *   confidence = clamp(
 *     0.3
 *     + 0.10 × min(distinctSources, 4)
 *     + 0.20 × consistencyScore
 *     + 0.10 × verbObjectStrength
 *     − 0.20 × sensitivityPenalty,
 *     0.0, 1.0
 *   )
 *
 * Where:
 *   distinctSources   — number of evidence signals with weight > 0
 *   consistencyScore  — fraction of non-zero-weight signals that agree
 *                       on the same verb (and separately the same object)
 *   verbObjectStrength — 1.0 if both verb AND object resolved;
 *                        0.5 if only one resolved; 0.0 if neither
 *   sensitivityPenalty — 1.0 when isSensitive === true; else 0.0
 *
 * Audit-honesty IFF invariant (Group B):
 *   `lowDataFlag === true`  IFF  `confidence < 0.55`
 *
 * Determinism contract: same inputs → same output.
 * No Date.now() / Math.random() / I/O.
 */

import type { CanonicalVerb } from './verbs.js';
import type { CanonicalObject } from './objects.js';
import type { EvidenceSignal } from './types.js';

// ── Scoring components ─────────────────────────────────────────────────────

/**
 * Count evidence signals with weight > 0 (zero-weight signals are v1 deferred).
 */
function countActiveSignals(signals: readonly EvidenceSignal[]): number {
  return signals.filter(s => s.weight > 0).length;
}

/**
 * Compute a consistency score in [0, 1].
 *
 * A signal "agrees" on the winner when:
 *   - It produced a non-null verb that matches the winning verb, OR
 *   - It produced a non-null object that matches the winning object.
 *
 * Consistency = (agreeing signals) / max(1, active signals).
 * Clamped to [0, 1].
 */
function computeConsistency(
  signals: readonly EvidenceSignal[],
  winningVerb: CanonicalVerb | null,
  winningObject: CanonicalObject | 'item' | null,
): number {
  const active = signals.filter(s => s.weight > 0);
  if (active.length === 0) return 0;

  let agreeing = 0;
  for (const s of active) {
    const verbMatch  = winningVerb !== null   && s.inferredVerb   === winningVerb;
    const objMatch   = winningObject !== null && s.inferredObject === winningObject;
    if (verbMatch || objMatch) agreeing++;
  }
  return agreeing / active.length;
}

/**
 * Verb-object strength:
 *   1.0 — both verb AND object resolved
 *   0.5 — exactly one resolved
 *   0.0 — neither resolved
 */
function computeVerbObjectStrength(
  verb: CanonicalVerb | null,
  object: CanonicalObject | 'item' | null,
): number {
  const hasVerb   = verb !== null;
  const hasObject = object !== null;
  if (hasVerb && hasObject)  return 1.0;
  if (hasVerb || hasObject)  return 0.5;
  return 0.0;
}

// ── Main scorer ─────────────────────────────────────────────────────────────

export interface ConfidenceResult {
  /** Confidence in [0, 1]. */
  readonly confidence: number;
  /** True when confidence < 0.55 — audit-honesty IFF invariant. */
  readonly lowDataFlag: boolean;
}

/**
 * Compute a normalizedLabelConfidence score from evidence signals and
 * the resolved verb/object.
 *
 * §A5 formula: clamp(0.3 + 0.10×min(signals,4) + 0.20×consistency
 *                    + 0.10×strength − 0.20×sensitivity, 0.0, 1.0)
 */
export function scoreConfidence(
  signals: readonly EvidenceSignal[],
  winningVerb: CanonicalVerb | null,
  winningObject: CanonicalObject | 'item' | null,
  isSensitive: boolean,
): ConfidenceResult {
  const activeCount      = countActiveSignals(signals);
  const consistency      = computeConsistency(signals, winningVerb, winningObject);
  const strength         = computeVerbObjectStrength(winningVerb, winningObject);
  const sensitivityPenalty = isSensitive ? 1.0 : 0.0;

  const raw =
    0.30
    + 0.10 * Math.min(activeCount, 4)
    + 0.20 * consistency
    + 0.10 * strength
    - 0.20 * sensitivityPenalty;

  const confidence = Math.min(1.0, Math.max(0.0, raw));

  return {
    confidence,
    // Audit-honesty IFF: lowDataFlag === true IFF confidence < 0.55
    lowDataFlag: confidence < 0.55,
  };
}
