/**
 * Types for the Ledgerium decision-detection engine (PATHE-P05, signals 1-3).
 *
 * Determinism contract: same `DecisionDetectionInput` (in any run order) ->
 * byte-identical `DecisionDetectionResult`. No clock, RNG, I/O or LLM.
 *
 * `DecisionType` and `ConditionType` are REUSED from the PATHE-P01 closed
 * unions (type-only import; erased at runtime, so the package has zero runtime
 * dependency on web-app). The unions live in @ledgerium/process-graph (#330).
 *
 * Input notes: `StepInput` must be PII-sanitized upstream (labels, uiState,
 * offeredOptions are echoed into descriptions). `offeredOptions` has no
 * producer yet, so signal 3 is dormant in production.
 */

import type {
  DecisionType,
  ConditionType,
} from '@ledgerium/process-graph';

export type { DecisionType, ConditionType };

export const DECISION_ENGINE_VERSION = '1.0.0';

/** Sentinel outcome key for runs that terminate at the branch node. */
export const END_OUTCOME_KEY = '__end__';
/** Sentinel node key for the virtual root (divergence at the first step). */
export const ROOT_NODE_KEY = '__root__';
/** Minimum runs reaching a node before it may be promoted to a branch point. */
export const MIN_RUNS_FOR_BRANCH = 2;

/** One normalized step of one recorded run (output of intent inference + route templating). */
export interface StepInput {
  readonly stepId: string;
  readonly normalizedLabel: string;
  readonly routeTemplate: string;
  /** Source event ids that produced this step (traceability). */
  readonly eventIds: readonly string[];
  /** Signal 2: observed UI state at this step (e.g. modal title). */
  readonly uiState?: string | null;
  /** Signal 3: option labels offered to the user at this step. */
  readonly offeredOptions?: readonly string[];
  /**
   * Signal 7: canonical event types (schema-events eventType, e.g.
   * 'system.modal_opened') of the events behind this step. Upstream producer:
   * the step builder should copy eventType of each source event; until wired,
   * signal 7 is dormant in production. Never echoed into output.
   */
  readonly eventTypes?: readonly string[];
  /**
   * Signal 7: kind of modal opened at this step, when the upstream knows it
   * ('error' establishes an error dialog). Absent/other => generic dialog.
   * Never echoed into output.
   */
  readonly modalKind?: string;
  /** Observed actor role at this step (feeds the role-based pattern). */
  readonly actorRole?: string | null;
}

export interface RunInput {
  readonly runId: string;
  readonly steps: readonly StepInput[];
}

export interface DecisionDetectionInput {
  readonly runs: readonly RunInput[];
}

export interface EvidenceRef {
  readonly runId: string;
  readonly stepId: string;
  readonly eventIds: readonly string[];
}

export type ConditionInferenceMethod = 'observed' | 'inferred';

export interface InferredCondition {
  readonly conditionType: ConditionType;
  /** Plain-English form. */
  readonly description: string;
  readonly inferenceMethod: ConditionInferenceMethod;
  readonly evidence: readonly EvidenceRef[];
}

export interface DecisionOutcome {
  /** Trie child key, or END_OUTCOME_KEY. */
  readonly outcomeKey: string;
  readonly label: string;
  /** Number of runs taking this outcome. */
  readonly frequency: number;
  /** frequency / runsAtNode, in [0,1]. */
  readonly frequencyPct: number;
  readonly runIds: readonly string[];
  readonly conditions: readonly InferredCondition[];
  /** Evidence for the first step of this outcome, one ref per run. */
  readonly evidence: readonly EvidenceRef[];
}

/** The five named terms feeding the confidence formula (each in [0,1] except runs). */
export interface ConfidenceTerms {
  readonly runs: number;
  readonly consistency: number;
  readonly evidenceQuality: number;
  readonly labelClarity: number;
  readonly conflictingEvidence: number;
}

export interface DetectedDecision {
  readonly decisionId: string;
  /** Trie path (node keys) leading to the branch node; [] = divergence at first step. */
  readonly prefixKeys: readonly string[];
  readonly nodeLabel: string;
  readonly question: string;
  readonly decisionType: DecisionType;
  readonly runsAtNode: number;
  readonly outcomes: readonly DecisionOutcome[];
  /** Reported confidence; capped below 0.55 when every condition is inferred. */
  readonly confidenceScore: number;
  /** Uncapped formula score (transparency). */
  readonly rawConfidence: number;
  readonly confidenceTerms: ConfidenceTerms;
  /** P01 IFF: true exactly when confidenceScore < 0.55. */
  readonly isInferred: boolean;
}

export interface DecisionDetectionResult {
  readonly engineVersion: string;
  readonly totalRuns: number;
  readonly decisions: readonly DetectedDecision[];
}
