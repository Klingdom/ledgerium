/**
 * Object extraction (PATHE-P02 §A3).
 *
 * Extracts a canonical object noun from raw text using OBJECT_EXTRACTION_RULES.
 * Falls back to 'item' when no object is identified.  Returns null when the
 * caller explicitly wants to distinguish "no match" from the 'item' fallback.
 *
 * Determinism contract: same text → same CanonicalObject | null.
 * No Date.now() / Math.random() / I/O.
 *
 * @see objects.ts — OBJECT_EXTRACTION_RULES, OBJECT_SET
 */

import { OBJECT_EXTRACTION_RULES, OBJECT_SET, type CanonicalObject } from './objects.js';

/**
 * Extract a canonical object from raw text (§A3).
 *
 * Applied to: elementText, pageTitle, routeTemplate, applicationLabel,
 *   modalTitle, breadcrumbs — any signal where an entity noun may appear.
 *
 * Returns null when no rule matches (not 'item'; callers apply 'item' fallback
 * at the label-synthesis layer per §A4).
 */
export function extractObject(text: string): CanonicalObject | null {
  const trimmed = text.trim();
  if (trimmed.length === 0) return null;

  for (const rule of OBJECT_EXTRACTION_RULES) {
    if (rule.pattern.test(trimmed)) {
      return rule.object;
    }
  }
  return null;
}

/**
 * Check whether a string is already a canonical object (runtime membership).
 */
export function isCanonicalObject(candidate: string): candidate is CanonicalObject {
  return OBJECT_SET.has(candidate);
}

/**
 * Resolve the winning object from a set of evidence signals.
 *
 * Strategy: select the inferredObject from the signal with the highest weight
 * that produced a non-null, non-'item' object.  Falls back to 'item' if any
 * signal produced 'item' and no higher-quality signal produced a canonical
 * object.
 *
 * Returns null when no signal yields any object evidence.
 */
export function resolveObject(
  signals: readonly { readonly inferredObject: CanonicalObject | 'item' | null; readonly weight: number }[],
): CanonicalObject | 'item' | null {
  let best: CanonicalObject | 'item' | null = null;
  let bestWeight = -1;

  for (const signal of signals) {
    if (signal.inferredObject !== null && signal.weight > bestWeight) {
      best = signal.inferredObject;
      bestWeight = signal.weight;
    }
  }
  return best;
}
