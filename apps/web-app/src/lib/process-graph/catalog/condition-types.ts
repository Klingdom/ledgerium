/**
 * Path E — ConditionType Catalog (iter 076 / PATHE-P01)
 *
 * Frozen mirror array of the `ConditionType` closed union (10 members) with
 * compile-time exhaustiveness lock.
 *
 * @see ../types/closed-unions.ts — ConditionType union
 */

import type { ConditionType } from '../types/closed-unions.js';

export const CONDITION_TYPES: ReadonlyArray<ConditionType> = Object.freeze([
  'ui_state',
  'user_input',
  'field_value',
  'system_response',
  'data_threshold',
  'role_permission',
  'approval_status',
  'validation_status',
  'timing_based',
  'inferred_unknown',
] as const);

/** Compile-time exhaustiveness lock. */
type _ConditionTypeExhaustive = Exclude<ConditionType, (typeof CONDITION_TYPES)[number]> extends never
  ? true
  : never;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _conditionTypeExhaustivenessLock: _ConditionTypeExhaustive = true;
void _conditionTypeExhaustivenessLock;
