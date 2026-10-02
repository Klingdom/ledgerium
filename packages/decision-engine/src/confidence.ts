/**
 * Decision confidence (PATHE-P05 backlog row #121):
 *
 *   0.30 + 0.10*min(runs,5) + 0.15*consistency + 0.10*evidenceQuality
 *        + 0.10*labelClarity - 0.10*conflictingEvidence      clamped to [0,1]
 *
 * Term definitions are this module's (the row names the terms but not their
 * computation); each is a pure function of named inputs, tested separately.
 */

import type { ConfidenceTerms, EvidenceRef } from './types.js';

const GENERIC_LABELS: ReadonlySet<string> = new Set([
  '', 'unknown', 'unlabeled', 'step', 'action', 'click', 'unknown step', 'unknown action',
]);

const clamp01 = (n: number): number => (n < 0 ? 0 : n > 1 ? 1 : n);
const round6 = (n: number): number => Math.round(n * 1e6) / 1e6;

export function computeConfidence(t: ConfidenceTerms): number {
  const raw =
    0.3 +
    0.1 * Math.min(Math.max(t.runs, 0), 5) +
    0.15 * clamp01(t.consistency) +
    0.1 * clamp01(t.evidenceQuality) +
    0.1 * clamp01(t.labelClarity) -
    0.1 * clamp01(t.conflictingEvidence);
  return round6(clamp01(raw));
}

/** Share of evidence refs that carry at least one source event id. */
export function evidenceQualityTerm(refs: readonly EvidenceRef[]): number {
  if (refs.length === 0) return 0;
  return refs.filter((r) => r.eventIds.length > 0).length / refs.length;
}

/** Share of outcome labels that are non-empty and not generic placeholders. */
export function labelClarityTerm(labels: readonly string[]): number {
  if (labels.length === 0) return 0;
  const clear = labels.filter((l) => !GENERIC_LABELS.has(l.trim().toLowerCase())).length;
  return clear / labels.length;
}

/** Ratio helper: part/whole clamped to [0,1], 0 when whole is 0. */
export function shareTerm(part: number, whole: number): number {
  return whole <= 0 ? 0 : clamp01(part / whole);
}
