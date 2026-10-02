/**
 * Question inference: 5 patterns -> the P01 `DecisionType` closed union.
 *
 * Precedence (first match wins):
 *  1. approval pair       -> approval_decision
 *  2. validation outcome  -> validation_result
 *  3. create vs find      -> data_condition
 *  4. role-based          -> business_rule   (a role_permission condition exists)
 *  5. generic user choice -> user_choice (options observed) | system_state
 *                            (a ui_state condition exists) | unknown_inferred
 */

import type { DecisionType, InferredCondition } from './types.js';

export interface QuestionInferenceInput {
  readonly nodeLabel: string;
  readonly outcomeLabels: readonly string[];
  readonly conditions: readonly InferredCondition[];
}

export interface QuestionInference {
  readonly decisionType: DecisionType;
  readonly question: string;
}

const APPROVE: ReadonlySet<string> = new Set(['approve', 'approved', 'accept', 'authorize', 'authorise', 'confirm']);
const REJECT: ReadonlySet<string> = new Set(['reject', 'rejected', 'deny', 'denied', 'decline', 'refuse', 'return']);
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

  if (pairIn(labels, APPROVE, REJECT)) {
    return { decisionType: 'approval_decision', question: `Is the request approved or rejected at "${n}"?` };
  }
  if (labels.some((l) => matches(l, VALIDATION))) {
    return { decisionType: 'validation_result', question: `Does validation pass at "${n}"?` };
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
  return { decisionType: 'unknown_inferred', question: `Which path is taken at "${n}"?` };
}
