/**
 * Path signature computation and similarity scoring.
 *
 * A path signature is a deterministic, privacy-safe representation of the
 * step sequence in a ProcessRunBundle. It uses step categories (GroupingReason
 * values) rather than user-facing step titles or any sensitive content.
 *
 * Similarity scoring uses bigram Jaccard similarity (order-sensitive) combined
 * with a step-count ratio, per intelligence spec §10.3 (canonical identity signals).
 */

import type { ProcessRunBundle, PathSignature } from './types.js';

/**
 * Compute a deterministic path signature for a run.
 *
 * Uses the ordered array of step categories from the ProcessDefinition.
 * Categories are stable, vocabulary-controlled, and privacy-safe.
 */
export function computePathSignature(bundle: ProcessRunBundle): PathSignature {
  const stepCategories = [...bundle.processDefinition.stepDefinitions]
    .sort((a, b) => a.ordinal - b.ordinal)
    .map(s => s.category as string);

  return {
    signature: stepCategories.join(':'),
    stepCategories,
    stepCount: stepCategories.length,
  };
}

/**
 * Compute a similarity score (0–1) between two path signatures.
 *
 * Combines:
 * - 70% bigram Jaccard similarity (captures order sensitivity)
 * - 30% step count ratio (captures length similarity)
 *
 * Score 1.0 = identical signatures.
 * Score 0.0 = completely dissimilar.
 */
export function computeSignatureSimilarity(a: PathSignature, b: PathSignature): number {
  if (a.signature === b.signature) return 1.0;

  const bigramScore = bigramJaccardSimilarity(a.stepCategories, b.stepCategories);

  const maxCount = Math.max(a.stepCount, b.stepCount);
  const minCount = Math.min(a.stepCount, b.stepCount);
  const stepCountRatio = maxCount === 0 ? 1.0 : minCount / maxCount;

  return 0.7 * bigramScore + 0.3 * stepCountRatio;
}

/**
 * Bigram Jaccard similarity between two ordered sequences.
 *
 * Bigrams capture order information: [A, B, C] → ["A:B", "B:C"].
 * Single-element arrays use a start-anchored representation: ["__S__:A"].
 * This is order-sensitive, unlike plain set Jaccard.
 */
export function bigramJaccardSimilarity(a: string[], b: string[]): number {
  if (a.length === 0 && b.length === 0) return 1.0;
  if (a.length === 0 || b.length === 0) return 0.0;

  const bgsA = bigrams(a);
  const bgsB = bigrams(b);

  // Multiset intersection / union (not plain set)
  const countA = new Map<string, number>();
  for (const bg of bgsA) countA.set(bg, (countA.get(bg) ?? 0) + 1);

  const countB = new Map<string, number>();
  for (const bg of bgsB) countB.set(bg, (countB.get(bg) ?? 0) + 1);

  let intersection = 0;
  for (const [key, ca] of countA) {
    intersection += Math.min(ca, countB.get(key) ?? 0);
  }

  const union = bgsA.length + bgsB.length - intersection;
  return union === 0 ? 1.0 : intersection / union;
}

function bigrams(arr: string[]): string[] {
  if (arr.length < 2) return arr.map(s => `__S__:${s}`);
  const result: string[] = [];
  for (let i = 0; i < arr.length - 1; i++) {
    result.push(`${arr[i]}:${arr[i + 1]}`);
  }
  return result;
}
