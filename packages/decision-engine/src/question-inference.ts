/**
 * Question inference: 5 patterns -> the P01 `DecisionType` closed union.
 *
 * Precedence (first match wins):
 *  1. approval pair (APPROVAL_RE/REJECTION_RE)   -> approval_decision
 *  2. validation: retry-edge pass/fail pair, or a validation-word outcome
 *     alongside a different outcome                -> validation_result
 *  3. error modal in some outcomes only            -> exception_handling
 *  4. create vs find      -> data_condition
 *  5. role-based          -> business_rule   (a role_permission condition exists)
 *  6. generic: user_choice (options observed) | system_state (ui_state
 *     condition) | user_choice (outcomes land on different routes; inferred)
 *     | unknown_inferred
 */

import { isApprovalLabel, isRejectionLabel, type SignalResult } from './signals.js';
import type { DecisionType, InferredCondition } from './types.js';

export interface QuestionInferenceInput {
  readonly nodeLabel: string;
  readonly outcomeLabels: readonly string[];
  readonly conditions: readonly InferredCondition[];
  /** Signals 4/6/7 flags (signals.ts); absent => label-only inference. */
  readonly signals?: Pick<SignalResult, 'validationPair' | 'exception' | 'navigation'>;
}

export interface QuestionInference {
  readonly decisionType: DecisionType;
  readonly question: string;
}

const VALIDATION: ReadonlySet<string> = new Set([
  'error', 'invalid', 'fix', 'correct', 'retry', 'resubmit', 'validate', 'failed', 'fail',
]);
const CREATE: ReadonlySet<string> = new Set(['create', 'new', 'add']);
const FIND: ReadonlySet<string> = new Set(['find', 'search', 'select', 'open', 'existing', 'lookup', 'choose']);

const tokens = (label: string): string[] =>
  label.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t !== '');
const matches = (label: string, set: ReadonlySet<string>): boolean =>
  tokens(label).some((t) => set.has(t));

/** True when two DIFFERENT outcomes match set A and set B respectively. */
function pairIn(labels: readonly string[], a: ReadonlySet<string>, b: ReadonlySet<string>): boolean {
  for (let i = 0; i < labels.length; i++) {
    for (let j = 0; j < labels.length; j++) {
      if (i !== j && matches(labels[i]!, a) && matches(labels[j]!, b)) return true;
    }
  }
  return false;
}

export function inferQuestion(input: QuestionInferenceInput): QuestionInference {
  const { nodeLabel: n, outcomeLabels: labels, conditions } = input;
  const has = (t: string): boolean => conditions.some((c) => c.conditionType === t);

  if (labels.some(isApprovalLabel) && labels.some(isRejectionLabel)) {
    return { decisionType: 'approval_decision', question: `Is the request approved or rejected at "${n}"?` };
  }
  const failLabelPair =
    labels.some((l) => matches(l, VALIDATION)) && labels.some((l) => !matches(l, VALIDATION));
  if (input.signals?.validationPair || failLabelPair) {
    return { decisionType: 'validation_result', question: `Does validation pass at "${n}"?` };
  }
  if (input.signals?.exception) {
    return { decisionType: 'exception_handling', question: `Does an error dialog interrupt the flow at "${n}"?` };
  }
  if (pairIn(labels, CREATE, FIND)) {
    return {
      decisionType: 'data_condition',
      question: `Does the user create a new record or find an existing one at "${n}"?`,
    };
  }
  if (has('role_permission')) {
    return { decisionType: 'business_rule', question: `Which path does the actor's role take at "${n}"?` };
  }
  if (has('user_input')) {
    return { decisionType: 'user_choice', question: `Which option does the user choose at "${n}"?` };
  }
  if (has('ui_state')) {
    return { decisionType: 'system_state', question: `Which UI state determines the path at "${n}"?` };
  }
  if (input.signals?.navigation) {
    return { decisionType: 'user_choice', question: `Which page does the user go to after "${n}"?` };
  }
  return { decisionType: 'unknown_inferred', question: `Which path is taken at "${n}"?` };
}
