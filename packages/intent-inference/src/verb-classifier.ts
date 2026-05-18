/**
 * Deterministic verb classification (PATHE-P02 §A2).
 *
 * Four-rule priority chain evaluated in order:
 *   Rule 1: ACTION_VERB_RULES text match (highest priority)
 *   Rule 2: URL_PATH_VERB_MAP terminal-segment lookup
 *   Rule 3: Element role + type heuristic
 *   Rule 4: CANONICAL_EVENT_TYPE_VERB_MAP default
 *
 * Determinism contract: same text → same CanonicalVerb | null.
 * No Date.now() / Math.random() / I/O.
 *
 * @see verbs.ts — ACTION_VERB_RULES, URL_PATH_VERB_MAP
 */

import { ACTION_VERB_RULES, VERB_SET, type CanonicalVerb } from './verbs.js';

/**
 * Classify a verb from raw text using ACTION_VERB_RULES (§A2 Rule 1).
 * Returns the first matching canonical verb, or null if none match.
 *
 * Applied to: elementText, buttonText, ariaLabel, modalTitle, pageTitle,
 *   placeholder, contextWindow — any textual signal source.
 */
export function classifyVerb(text: string): CanonicalVerb | null {
  const trimmed = text.trim();
  if (trimmed.length === 0) return null;

  for (const rule of ACTION_VERB_RULES) {
    if (rule.pattern.test(trimmed)) {
      return rule.verb;
    }
  }
  return null;
}

/**
 * Check whether a string is already a canonical verb (runtime membership).
 * Used to validate candidate verbs from URL segments or other sources.
 */
export function isCanonicalVerb(candidate: string): candidate is CanonicalVerb {
  return VERB_SET.has(candidate);
}

/**
 * Resolve the winning verb from a set of evidence signals.
 *
 * Strategy: select the inferredVerb from the signal with the highest weight
 * that produced a non-null verb.  In the case of a weight tie, prefer the
 * signal that appears earlier (earlier = higher priority in the ordered signal
 * array returned by evidence-extractor).
 *
 * Returns null when no signal yields a verb.
 */
export function resolveVerb(
  signals: readonly { readonly inferredVerb: CanonicalVerb | null; readonly weight: number }[],
): CanonicalVerb | null {
  let best: CanonicalVerb | null = null;
  let bestWeight = -1;

  for (const signal of signals) {
    if (signal.inferredVerb !== null && signal.weight > bestWeight) {
      best = signal.inferredVerb;
      bestWeight = signal.weight;
    }
  }
  return best;
}
