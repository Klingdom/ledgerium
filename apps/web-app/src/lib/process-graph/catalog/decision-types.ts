/**
 * Path E — DecisionType Catalog (iter 076 / PATHE-P01)
 *
 * Frozen mirror array of the `DecisionType` closed union (9 members) with
 * compile-time exhaustiveness lock.
 *
 * @see ../types/closed-unions.ts — DecisionType union
 */

import type { DecisionType } from '../types/closed-unions.js';

export const DECISION_TYPES: ReadonlyArray<DecisionType> = Object.freeze([
  'user_choice',
  'business_rule',
  'system_state',
  'data_condition',
  'approval_decision',
  'validation_result',
  'exception_handling',
  'human_judgment',
  'unknown_inferred',
] as const);

/** Compile-time exhaustiveness lock. */
type _DecisionTypeExhaustive = Exclude<DecisionType, (typeof DECISION_TYPES)[number]> extends never
  ? true
  : never;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _decisionTypeExhaustivenessLock: _DecisionTypeExhaustive = true;
void _decisionTypeExhaustivenessLock;
