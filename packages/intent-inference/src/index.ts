/**
 * Public barrel for @ledgerium/intent-inference (PATHE-P02).
 *
 * Re-exports all public API surfaces.
 * No logic in this file per CLAUDE.md coding standards.
 *
 * @see inferIntent.ts — main orchestrator (primary consumer entry point)
 * @see types.ts       — IntentInferenceInput, IntentInferenceOutput, etc.
 */

// ── Main function ─────────────────────────────────────────────────────────
export { inferIntent, INTENT_INFERENCE_VERSION } from './inferIntent.js';

// ── Types ─────────────────────────────────────────────────────────────────
export type {
  EvidenceSignalSource,
  EvidenceSignal,
  NeighborContextEvidence,
  IntentInferenceInput,
  IntentInferenceOutput,
} from './types.js';
export { EVIDENCE_WEIGHTS } from './types.js';

// ── Verb catalog ──────────────────────────────────────────────────────────
export { CANONICAL_VERBS, VERB_SET } from './verbs.js';
export type { CanonicalVerb } from './verbs.js';

// ── Object catalog ────────────────────────────────────────────────────────
export { CANONICAL_OBJECTS, OBJECT_SET } from './objects.js';
export type { CanonicalObject } from './objects.js';
