/**
 * Trace similarity for clustering same/similar process recordings (Phase 1, C+1).
 *
 * Pure + DETERMINISTIC (no Date/Math.random). Operates on PathSignatures — the
 * privacy-safe step-category sequence (never user content). This is the engine
 * that lets clustering group runs that are SIMILAR, not just byte-identical,
 * closing the gap where `clusterWorkflows()` only grouped on identical signatures.
 *
 *   blended = W_LCS·simLCS + W_CAT·simCat
 *
 * - simLCS = normalized Levenshtein similarity on the category sequence. It is
 *   tolerant of mid-sequence insertions/deletions — exactly the human-variation
 *   case the exact-signature grouping shatters into singletons.
 * - simCat = `computeSignatureSimilarity` (bigram-Jaccard + count ratio) — order +
 *   length sensitivity. Reused verbatim.
 * - LCS hard floor: when sequences are structurally very different (low simLCS),
 *   the blended score is capped so high category overlap cannot force a false
 *   merge (precision guard).
 *
 * Identical signatures short-circuit to 1.0, so the exact-signature grouping is a
 * strict SUBSET of this similarity grouping — the new engine can never group LESS.
 */
import { computeSignatureSimilarity } from '../pathSignature.js';
import type { PathSignature } from '../types.js';

export interface SimilarityWeights {
  /** Weight on normalized-LCS (insert/delete-tolerant order similarity). */
  lcs: number;
  /** Weight on category bigram+count similarity (computeSignatureSimilarity). */
  cat: number;
}

/** LCS-dominant blend — edit distance is the better primary signal for "same process". */
export const DEFAULT_SIMILARITY_WEIGHTS: SimilarityWeights = { lcs: 0.6, cat: 0.4 };

/**
 * Below this normalized-LCS value two sequences are too structurally different to
 * be the same process; the blended score is capped at simLCS so category overlap
 * alone cannot force a false merge.
 */
export const LCS_HARD_FLOOR = 0.3;

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/**
 * Levenshtein edit distance between two ordered category sequences
 * (Wagner–Fischer, rolling two-row). Deterministic; O(|a|·|b|).
 */
export function editDistance(a: readonly string[], b: readonly string[]): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  let prev = new Array<number>(n + 1);
  let curr = new Array<number>(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    const ai = a[i - 1];
    for (let j = 1; j <= n; j++) {
      const cost = ai === b[j - 1] ? 0 : 1;
      const del = (prev[j] ?? 0) + 1;
      const ins = (curr[j - 1] ?? 0) + 1;
      const sub = (prev[j - 1] ?? 0) + cost;
      curr[j] = Math.min(del, ins, sub);
    }
    const tmp = prev;
    prev = curr;
    curr = tmp;
  }
  return prev[n] ?? 0;
}

/** Normalized LCS-style similarity in [0,1]: 1 = identical sequence, 0 = fully different. */
export function lcsSimilarity(a: readonly string[], b: readonly string[]): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - editDistance(a, b) / maxLen;
}

/**
 * Blended trace similarity in [0,1] between two path signatures.
 * Identical signatures short-circuit to exactly 1.0.
 */
export function traceSimilarity(
  a: PathSignature,
  b: PathSignature,
  weights: SimilarityWeights = DEFAULT_SIMILARITY_WEIGHTS,
): number {
  if (a.signature === b.signature) return 1;

  const simLcs = lcsSimilarity(a.stepCategories, b.stepCategories);
  const simCat = computeSignatureSimilarity(a, b);
  const blended = weights.lcs * simLcs + weights.cat * simCat;

  // Precision guard: structurally-different sequences cannot merge on category overlap.
  const guarded = simLcs < LCS_HARD_FLOOR ? Math.min(blended, simLcs) : blended;
  return round3(Math.max(0, Math.min(1, guarded)));
}
