/**
 * Path E — VariantLabel Catalog (iter 076 / PATHE-P01)
 *
 * Frozen mirror array of the `VariantLabel` closed union (9 members) with
 * compile-time exhaustiveness lock.
 *
 * Order matches behavioral-semantic ranking (NOT raw frequency); see closed-
 * unions.ts JSDoc for category meanings.
 *
 * @see ../types/closed-unions.ts — VariantLabel union
 */

import type { VariantLabel } from '../types/closed-unions.js';

export const VARIANT_LABELS: ReadonlyArray<VariantLabel> = Object.freeze([
  'dominant_path',
  'standard_path',
  'alternate_path',
  'exception_path',
  'failure_path',
  'escalation_path',
  'rework_path',
  'high_performance_path',
  'low_performance_path',
] as const);

/** Compile-time exhaustiveness lock. */
type _VariantLabelExhaustive = Exclude<VariantLabel, (typeof VARIANT_LABELS)[number]> extends never
  ? true
  : never;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _variantLabelExhaustivenessLock: _VariantLabelExhaustive = true;
void _variantLabelExhaustivenessLock;

/**
 * The single canonical label that exactly one variant per ProcessGraph must
 * carry (Group C topology invariant).
 */
export const DOMINANT_VARIANT_LABEL: VariantLabel = 'dominant_path';
