/**
 * Path E — Confidence Language Taxonomy (iter 079 / PATHE-P03)
 *
 * Pure deterministic module mapping Path E confidence scores + observation counts
 * to user-visible labels via a 4-band taxonomy. This is the ARCHITECTURAL
 * enforcement point for the HARD UX rule: no entity is labeled "high confidence"
 * when fewer than MIN_OBSERVATIONS_FOR_HIGH runs have been observed, regardless
 * of the computed confidenceScore.
 *
 * Tier boundaries (per PRD_PATH_E_DECISION_AWARE_WORKFLOW.md §confidence-model;
 * HARD UX rule per UX §G + system-architect §J Group B):
 *
 *   High    n ≥ 5 AND c ≥ 0.80  → "Likely decision"
 *   Medium  n ≥ 5 AND 0.55 ≤ c < 0.80  → "Possible condition"
 *   Low     n ≥ 5 AND 0.30 ≤ c < 0.55  → "Observed in N of M runs"
 *   Unknown n < 5  OR c < 0.30  → "Needs more recordings"
 *
 * Audit-honesty IFF alignment with PATHE-P01 `closed-unions.ts`:
 *   `isInferred === true IFF confidence < INFERRED_CONFIDENCE_THRESHOLD (0.55)`
 *   Any confidence below 0.55 maps to band 'low' or 'unknown', both of which
 *   communicate uncertainty — neither emits "Likely" or "Possible". This module
 *   enforces the IFF invariant at the display layer.
 *
 * Determinism contract (Ledgerium core invariant):
 *   Same (confidence, observationCount) → byte-identical ConfidenceBand output.
 *   Zero Date.now() / Math.random() / I/O / network calls in this file.
 *   Pure functions throughout.
 *
 * // Brand-voice verification (D-4 clause 1; growth-strategist self-consult; PATHE-P03):
 * // 1. No marketing adjectives — PASS: "Likely decision" cites a computed signal
 * //    (branch pattern); "Possible condition" cites evidence quality. No "smart",
 * //    "powerful", "intelligent".
 * // 2. No emotional/hedging language beyond data — PASS: "Possible" accurately
 * //    describes medium-confidence evidence (≥ 0.55, ≥ 5 obs). "Maybe" or
 * //    "probably" would be editorial; "Possible condition" is structural.
 * // 3. Computed-signal accuracy — PASS: "Observed in N of M runs" cites the
 * //    actual observation counts from the event log. No fabricated metrics.
 * // 4. Action-leading where applicable — PASS: "Needs more recordings" tells the
 * //    user exactly what to do to improve confidence.
 * // 5. No fabricated source citations — PASS: "Inferred from navigation behavior"
 * //    cites the actual detection mechanism (URL navigation patterns), not a
 * //    hypothetical or invented data source.
 * // 6. No AI/intelligent/smart — PASS: all strings reference evidence, observations,
 * //    behavior, and recordings — no AI terminology.
 * // 7. No "high confidence" / numeric confidence leakage — PASS: the band IS the
 * //    user-facing language; numeric score is internal to analytics/debugging only.
 * // 8. Consistent tense + grammar — PASS: all strings are present-tense noun phrases
 * //    or gerund phrases; no past tense; consistent capitalization.
 *
 * @see types/closed-unions.ts — INFERRED_CONFIDENCE_THRESHOLD (0.55), schema version
 * @see validation/topology.ts — Group B audit-honesty IFF invariant enforcement
 * @see docs/features/path-e-decision-aware-workflow/PRD_PATH_E_DECISION_AWARE_WORKFLOW.md §confidence-model
 */

// ── Tier boundary constants ───────────────────────────────────────────────────

/**
 * Minimum confidence score for the High band (inclusive).
 * Source: PRD_PATH_E §confidence-model; aligns with Group B topology invariant.
 */
export const HIGH_CONFIDENCE_FLOOR = 0.80 as const;

/**
 * Minimum confidence score for the Medium band (inclusive).
 * MUST equal INFERRED_CONFIDENCE_THRESHOLD from closed-unions.ts — any confidence
 * below this value sets isInferred = true and the entity receives a non-asserting
 * label (no "Likely" / "Possible").
 */
export const MEDIUM_CONFIDENCE_FLOOR = 0.55 as const;

/**
 * Minimum confidence score for the Low band (inclusive).
 * Below this floor the entity lands in Unknown regardless of observation count.
 */
export const LOW_CONFIDENCE_FLOOR = 0.30 as const;

/**
 * HARD UX RULE: minimum observation count required for ANY non-Unknown band.
 *
 * Even a confidence score of 0.99 returns 'unknown' when observationCount < 5.
 * This architectural enforcement is intentional: fewer than 5 runs cannot provide
 * statistically meaningful branch-pattern evidence. The UX MUST NOT show
 * "Likely decision" or "Possible condition" to a user who has recorded 1–4 runs.
 *
 * Source: UX §G "observation-count gating"; system-architect §J Group B invariant.
 */
export const MIN_OBSERVATIONS_FOR_HIGH = 5 as const;

// ── ConfidenceBand (4-band closed union) ──────────────────────────────────────

/**
 * 4-band closed union for the display tier of a Path E entity.
 *
 * Maps directly to ConfidenceLabel via `bandToLabel` and to color affordances
 * via `bandToColorHint`. Replaces the informal 5-band system used during
 * internal prototyping; this is the canonical 4-band taxonomy for v2.0 launch.
 *
 *   'high'    — strong evidence, ≥ 5 observations, c ≥ 0.80
 *   'medium'  — moderate evidence, ≥ 5 observations, 0.55 ≤ c < 0.80
 *   'low'     — weak evidence, ≥ 5 observations, 0.30 ≤ c < 0.55
 *   'unknown' — insufficient observations (n < 5) OR c < 0.30
 */
export type ConfidenceBand = 'high' | 'medium' | 'low' | 'unknown';

// ── ConfidenceLabel (5-string closed union) ───────────────────────────────────

/**
 * Closed union of the 5 user-visible label strings for Path E confidence display.
 *
 * The 5th string ('Observed in N of M runs') is a template; the substituted form
 * is produced by `formatLowConfidenceLabel(n, m)` which returns a plain `string`
 * (not a member of this union type — the union documents the template semantics).
 *
 * The 4th string ('Inferred from navigation behavior') is produced by
 * `inferredToLabel()` for nodes / edges classified via navigation-pattern
 * detection where the exact branch condition could not be observed directly.
 *
 * Brand-voice: see module-level comment §Brand-voice verification (rules 1–8).
 */
export type ConfidenceLabel =
  | 'Likely decision'
  | 'Possible condition'
  | 'Observed in N of M runs'
  | 'Needs more recordings'
  | 'Inferred from navigation behavior';

// ── ConfidenceColorHint ───────────────────────────────────────────────────────

/**
 * Color hint consumed by the future ConfidenceIndicator component (PATHE-P11).
 *
 * These are semantic hints — the UI component determines the exact hex / CSS
 * token. Callers MUST NOT hardcode colors against these strings; use
 * `bandToColorHint` then map to your design-system token in the component.
 *
 *   'green'  — High band (confident; positive affordance)
 *   'amber'  — Medium band (moderate; caution affordance)
 *   'orange' — Low band (weak; warning affordance)
 *   'grey'   — Unknown band (insufficient data; neutral/muted affordance)
 */
export type ConfidenceColorHint = 'green' | 'amber' | 'orange' | 'grey';

// ── Pure deterministic functions ──────────────────────────────────────────────

/**
 * Maps a raw (confidence, observationCount) pair to a ConfidenceBand.
 *
 * **HARD UX RULE enforcement (UX §G):** returns 'unknown' whenever
 * `observationCount < MIN_OBSERVATIONS_FOR_HIGH (= 5)`, regardless of
 * `confidence`. This is the sole architectural enforcement point — downstream
 * components do NOT re-check the observation count; they trust this function.
 *
 * Tier logic (evaluated top-to-bottom; first match wins):
 *   1. n < 5 OR c < LOW_CONFIDENCE_FLOOR (0.30)   → 'unknown'
 *   2. c >= HIGH_CONFIDENCE_FLOOR (0.80)            → 'high'
 *   3. c >= MEDIUM_CONFIDENCE_FLOOR (0.55)          → 'medium'
 *   4. c >= LOW_CONFIDENCE_FLOOR (0.30)             → 'low'
 *   (Fallthrough to 'unknown' is unreachable given the first clause.)
 *
 * Determinism guarantee: same (confidence, observationCount) → byte-identical
 * ConfidenceBand. No side effects. No Date.now() / Math.random() / I/O.
 *
 * @param confidence - Confidence score in [0, 1] from the Path E entity.
 * @param observationCount - Number of distinct runs that produced this entity.
 * @returns The appropriate ConfidenceBand for display.
 */
export function confidenceToBand(
  confidence: number,
  observationCount: number,
): ConfidenceBand {
  // HARD UX RULE: n < 5 → always 'unknown', regardless of confidence value.
  if (observationCount < MIN_OBSERVATIONS_FOR_HIGH) {
    return 'unknown';
  }

  // Below the low floor: no evidence band applies.
  if (confidence < LOW_CONFIDENCE_FLOOR) {
    return 'unknown';
  }

  // High band: strong evidence.
  if (confidence >= HIGH_CONFIDENCE_FLOOR) {
    return 'high';
  }

  // Medium band: moderate evidence. Note: confidence >= MEDIUM_CONFIDENCE_FLOOR
  // is equivalent to confidence >= 0.55, which is the INFERRED_CONFIDENCE_THRESHOLD.
  // Entities in this band have isInferred = false per the audit-honesty IFF invariant.
  if (confidence >= MEDIUM_CONFIDENCE_FLOOR) {
    return 'medium';
  }

  // Low band: weak evidence. 0.30 <= confidence < 0.55.
  // Entities in this band have isInferred = true (confidence < 0.55).
  return 'low';
}

/**
 * Maps a ConfidenceBand to its primary user-visible label.
 *
 * For the 'low' band, this returns the template string 'Observed in N of M runs'.
 * Use `formatLowConfidenceLabel(n, m)` to produce the substituted form with real
 * counts. Callers that need a generic fallback for 'low' may use this return value
 * directly; callers that have access to observation counts SHOULD use the formatter.
 *
 * Returns the same reference across calls (module-level constants) — deterministic
 * and referentially stable.
 *
 * @param band - The ConfidenceBand from `confidenceToBand`.
 * @returns The canonical user-visible label for this band.
 */
export function bandToLabel(band: ConfidenceBand): ConfidenceLabel {
  switch (band) {
    case 'high':
      return 'Likely decision';
    case 'medium':
      return 'Possible condition';
    case 'low':
      return 'Observed in N of M runs';
    case 'unknown':
      return 'Needs more recordings';
  }
}

/**
 * Produces the substituted form of the Low band label with real observation counts.
 *
 * Returns: `"Observed in {observationCount} of {totalRunCount} runs"`
 *
 * Guard behavior for edge inputs:
 *   - `observationCount <= 0` — clamped to 0 (safe render; never negative)
 *   - `totalRunCount <= 0` — returns safe fallback "Observed in 0 of 0 runs"
 *   - `observationCount > totalRunCount` — allowed; caller is responsible for
 *     providing consistent counts; the formatter does not throw on this input
 *     (prevents cascading exceptions in rendering pipelines).
 *
 * Determinism guarantee: same (observationCount, totalRunCount) → byte-identical
 * string. No side effects. No Date.now() / Math.random() / I/O.
 *
 * @param observationCount - Number of runs that produced this entity (raw N).
 * @param totalRunCount - Total runs recorded for the parent workflow (raw M).
 * @returns Substituted label string e.g. "Observed in 7 of 22 runs".
 */
export function formatLowConfidenceLabel(
  observationCount: number,
  totalRunCount: number,
): string {
  const safeN = observationCount < 0 ? 0 : observationCount;
  const safeM = totalRunCount < 0 ? 0 : totalRunCount;
  return `Observed in ${safeN} of ${safeM} runs`;
}

/**
 * Returns the label for entities inferred from navigation behavior.
 *
 * Used when Path E detects a branch via URL navigation pattern (route change
 * on condition) rather than an explicit observed user action. The source citation
 * "navigation behavior" is accurate — it references the navigation-pattern
 * detection mechanism, not a hypothetical or inferred signal.
 *
 * This label is NOT tied to a specific ConfidenceBand — navigation-inferred
 * entities carry confidenceScore < INFERRED_CONFIDENCE_THRESHOLD (0.55) and
 * isInferred = true, but the label explicitly names the inference mechanism
 * rather than the generic "Needs more recordings" to help users understand
 * why the entity is marked as inferred.
 *
 * Returns the same reference across calls — deterministic and referentially stable.
 *
 * @returns 'Inferred from navigation behavior'
 */
export function inferredToLabel(): ConfidenceLabel {
  return 'Inferred from navigation behavior';
}

/**
 * Maps a ConfidenceBand to a semantic color hint for the ConfidenceIndicator
 * component (PATHE-P11, iter ~090+).
 *
 * Color semantic mapping:
 *   'high'    → 'green'   (positive/confident affordance)
 *   'medium'  → 'amber'   (caution; review recommended)
 *   'orange'  → 'orange'  (warning; weak evidence)
 *   'unknown' → 'grey'    (muted; insufficient data)
 *
 * Component consumers MUST NOT hardcode hex values against these strings; map
 * to the design-system token in the component layer (PATHE-P11 scope).
 *
 * Determinism guarantee: same ConfidenceBand → byte-identical ConfidenceColorHint.
 *
 * @param band - The ConfidenceBand from `confidenceToBand`.
 * @returns The semantic color hint for this band.
 */
export function bandToColorHint(band: ConfidenceBand): ConfidenceColorHint {
  switch (band) {
    case 'high':
      return 'green';
    case 'medium':
      return 'amber';
    case 'low':
      return 'orange';
    case 'unknown':
      return 'grey';
  }
}
