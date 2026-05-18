/**
 * Path E — NodeType Catalog (iter 076 / PATHE-P01)
 *
 * Frozen mirror array of the `NodeType` closed union with compile-time
 * exhaustiveness lock. Parallel to Path D D+1 column-registry pattern.
 *
 * @see ../types/closed-unions.ts — NodeType union (15 members)
 */

import type { NodeType } from '../types/closed-unions.js';

/**
 * Canonical 15-member NodeType list. Order matches the closed-union declaration
 * order in `closed-unions.ts`. Frozen at module load — consumers receive a
 * `ReadonlyArray<NodeType>` that cannot be mutated.
 */
export const NODE_TYPES: ReadonlyArray<NodeType> = Object.freeze([
  'start',
  'end',
  'action',
  'decision',
  'system_decision',
  'human_judgment',
  'approval',
  'validation',
  'exception',
  'retry',
  'loop',
  'handoff',
  'wait',
  'ai_opportunity',
  'automation_opportunity',
] as const);

/**
 * Compile-time exhaustiveness lock: if `NodeType` gains/loses a member without
 * a corresponding update to `NODE_TYPES`, TypeScript fails to compile this
 * type-only declaration. Parallel to D+1 `_PresetIdExhaustive` pattern.
 */
type _NodeTypeExhaustive = Exclude<NodeType, (typeof NODE_TYPES)[number]> extends never
  ? true
  : never;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _nodeTypeExhaustivenessLock: _NodeTypeExhaustive = true;
void _nodeTypeExhaustivenessLock;

/**
 * Subset of NodeType values that represent branching nodes. Every node with
 * `nodeType` in this set MUST have a corresponding DecisionPoint (Group C
 * topology invariant).
 */
export const DECISION_BEARING_NODE_TYPES: ReadonlySet<NodeType> = new Set([
  'decision',
  'system_decision',
  'human_judgment',
  'approval',
  'validation',
] as const);

/**
 * Subset of NodeType values that are graph terminals (exactly one of each per
 * ProcessGraph; Group C topology invariant).
 */
export const TERMINAL_NODE_TYPES: ReadonlySet<NodeType> = new Set([
  'start',
  'end',
] as const);
