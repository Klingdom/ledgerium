/**
 * Label synthesis (PATHE-P02 §A4).
 *
 * Produces a human-readable `normalizedLabel` (≤ 60 chars) from the
 * winning verb and object via a four-tier fallback chain.
 *
 * Fallback chain (§A4):
 *   1. `${titleCase(verb)} ${object}` when verb + object both inferred
 *   2. `${titleCase(verb)} item`      when verb inferred but no object
 *   3. `Interact with ${object}`       when object inferred but no verb
 *   4. `Interact with element`         when no evidence yields verb or object
 *
 * Determinism contract: same verb + object → same label string.
 * No Date.now() / Math.random() / I/O.
 */

import type { CanonicalVerb } from './verbs.js';
import type { CanonicalObject } from './objects.js';

const MAX_LABEL_LENGTH = 60;

/**
 * Convert the first character of each word to uppercase.
 * Only the FIRST word is capitalised (verb prefix); object stays lowercase.
 * Example: 'submit' → 'Submit'
 */
export function titleCaseFirst(word: string): string {
  if (word.length === 0) return word;
  return word.charAt(0).toUpperCase() + word.slice(1);
}

/**
 * Synthesize a normalizedLabel from a winning verb and object.
 *
 * The label is always trimmed to ≤ 60 characters (truncated at word boundary
 * when possible, then hard-truncated with '…' suffix).
 */
export function synthesizeLabel(
  verb: CanonicalVerb | null,
  object: CanonicalObject | 'item' | null,
): string {
  let label: string;

  if (verb !== null && object !== null) {
    // Tier 1: verb + object
    label = `${titleCaseFirst(verb)} ${object}`;
  } else if (verb !== null) {
    // Tier 2: verb only → "Submit item"
    label = `${titleCaseFirst(verb)} item`;
  } else if (object !== null) {
    // Tier 3: object only → "Interact with invoice"
    label = `Interact with ${object}`;
  } else {
    // Tier 4: no evidence
    label = 'Interact with element';
  }

  return truncateLabel(label);
}

/**
 * Truncate a label to ≤ MAX_LABEL_LENGTH characters.
 * Prefers truncating at a word boundary; falls back to hard truncation.
 */
function truncateLabel(label: string): string {
  if (label.length <= MAX_LABEL_LENGTH) return label;

  // Try to cut at a word boundary within the limit
  const cut = label.lastIndexOf(' ', MAX_LABEL_LENGTH - 1);
  if (cut > 0) {
    return label.slice(0, cut) + '…';
  }
  // Hard truncate
  return label.slice(0, MAX_LABEL_LENGTH - 1) + '…';
}
