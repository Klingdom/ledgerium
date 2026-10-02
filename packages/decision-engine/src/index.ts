/**
 * Public barrel for @ledgerium/decision-engine (PATHE-P05). Re-exports only.
 */
export { detectDecisions } from './detectDecisions.js';
export { computeConfidence } from './confidence.js';
export { inferQuestion } from './question-inference.js';
export { buildTrie, stepNodeKey } from './trie.js';
export {
  DECISION_ENGINE_VERSION,
  END_OUTCOME_KEY,
  ROOT_NODE_KEY,
  MIN_RUNS_FOR_BRANCH,
} from './types.js';
export type {
  DecisionType,
  ConditionType,
  StepInput,
  RunInput,
  DecisionDetectionInput,
  DecisionDetectionResult,
  DetectedDecision,
  DecisionOutcome,
  InferredCondition,
  ConditionInferenceMethod,
  EvidenceRef,
  ConfidenceTerms,
} from './types.js';
