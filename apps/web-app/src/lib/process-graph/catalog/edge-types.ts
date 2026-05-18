/**
 * Path E — EdgeType Catalog (iter 076 / PATHE-P01)
 *
 * Frozen mirror array of the `EdgeType` closed union with compile-time
 * exhaustiveness lock.
 *
 * **Note**: 11 entries — the row description in IMPROVEMENT_BACKLOG.md row #117
 * uses the figure "EdgeType 10" mirroring the system-architect synthesis count
 * "10" while the canonical EdgeType union enumerates 11 categories (sequence +
 * branch + merge + exception + retry + loop + fallback + escalation + approval +
 * rejection + automation_candidate). The 11-member set is the spec ground
 * truth; the "10" in the row blurb is the synthesis-level count that excludes
 * `automation_candidate` as a separate UI category. We keep the full 11 to
 * preserve auditable structure for PATHE-P11 edge renderers (each EdgeType maps
 * 1:1 to a renderer).
 *
 * @see ../types/closed-unions.ts — EdgeType union
 */

import type { EdgeType } from '../types/closed-unions.js';

export const EDGE_TYPES: ReadonlyArray<EdgeType> = Object.freeze([
  'sequence',
  'branch',
  'merge',
  'exception',
  'retry',
  'loop',
  'fallback',
  'escalation',
  'approval',
  'rejection',
  'automation_candidate',
] as const);

/** Compile-time exhaustiveness lock. */
type _EdgeTypeExhaustive = Exclude<EdgeType, (typeof EDGE_TYPES)[number]> extends never
  ? true
  : never;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _edgeTypeExhaustivenessLock: _EdgeTypeExhaustive = true;
void _edgeTypeExhaustivenessLock;

/**
 * Edge types that loop back to a previously-visited node (Group C topology
 * invariant — non-retry/loop edges MUST NOT form cycles in the canonical path).
 */
export const CYCLE_EDGE_TYPES: ReadonlySet<EdgeType> = new Set([
  'retry',
  'loop',
] as const);
