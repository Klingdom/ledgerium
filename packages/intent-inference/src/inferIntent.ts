/**
 * PATHE-P02 intent-inference engine — main entry point.
 *
 * `inferIntent(input)` is the single public orchestrator function.
 * It is a pure, deterministic transformation:
 *   Same `IntentInferenceInput` → byte-identical `IntentInferenceOutput`.
 *
 * Pipeline (§A1–§A5):
 *   1. Extract all evidence signals (§A1, 14-signal pipeline)
 *   2. Resolve winning verb  (§A2, highest-weight signal with non-null verb;
 *      fall back through grouping-reason → event-type default)
 *   3. Resolve winning object (§A3, highest-weight signal with non-null object)
 *   4. Synthesize normalized label (§A4, fallback chain ≤ 60 chars)
 *   5. Score confidence (§A5, §A6 audit-honesty IFF invariant)
 *
 * Determinism constraints (§A6):
 *   - No `Date.now()` / `Math.random()` / I/O
 *   - No mutable module-level state
 *   - Regex patterns are literal (no `lastIndex` state — flags lack `g`/`y`)
 *
 * @see types.ts      — IntentInferenceInput, IntentInferenceOutput
 * @see evidence-extractor.ts — signal pipeline
 * @see verb-classifier.ts   — verb resolution
 * @see object-extractor.ts  — object resolution
 * @see label-synthesizer.ts — label synthesis
 * @see confidence-scorer.ts — confidence + lowDataFlag
 */

import type { IntentInferenceInput, IntentInferenceOutput } from './types.js';
import { extractEvidenceSignals, verbFromGroupingReason } from './evidence-extractor.js';
import { resolveVerb } from './verb-classifier.js';
import { resolveObject } from './object-extractor.js';
import { synthesizeLabel } from './label-synthesizer.js';
import { scoreConfidence } from './confidence-scorer.js';

/** Semantic version of this inference engine. Pinned by Group A invariant test. */
export const INTENT_INFERENCE_VERSION = '1.0.0';

/**
 * Infer a human-readable intent label from a structured evidence input.
 *
 * @param input - Evidence captured from a single interaction step.
 * @returns IntentInferenceOutput with normalizedLabel, confidence, and
 *   a full evidence audit trail.
 *
 * Determinism guarantee: calling this function twice with the same `input`
 * (structurally equal) returns byte-identical results.
 */
export function inferIntent(input: IntentInferenceInput): IntentInferenceOutput {
  // ── Step 1: Extract evidence signals ──────────────────────────────────────
  const evidenceSignals = extractEvidenceSignals(input);

  // ── Step 2: Resolve winning verb ──────────────────────────────────────────
  // Primary: highest-weight signal that produced a non-null verb
  let verb = resolveVerb(evidenceSignals);

  // Fallback: grouping_reason heuristic → canonical event type default (§A2 R3/R4)
  if (verb === null) {
    // Extract the groupingReason's event-type hint from the event type implied
    // by the groupingReason field itself.
    verb = verbFromGroupingReason(input.groupingReason, null);
  }

  // ── Step 3: Resolve winning object ────────────────────────────────────────
  const object = resolveObject(evidenceSignals);

  // ── Step 4: Synthesize label ───────────────────────────────────────────────
  const normalizedLabel = synthesizeLabel(verb, object);

  // ── Step 5: Score confidence ──────────────────────────────────────────────
  const { confidence, lowDataFlag } = scoreConfidence(
    evidenceSignals,
    verb,
    object,
    input.isSensitive,
  );

  return {
    normalizedLabel,
    normalizedLabelConfidence: confidence,
    lowDataFlag,
    verb,
    object,
    evidenceSignals,
    inferenceVersion: INTENT_INFERENCE_VERSION,
  };
}
