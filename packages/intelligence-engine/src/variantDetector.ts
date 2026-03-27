/**
 * Variant detector.
 *
 * Identifies distinct execution path patterns across multiple runs using
 * deterministic path signatures and similarity-based clustering.
 *
 * Satisfies intelligence spec §12 (standard path, variants, exceptions) and
 * §10 (process identity) for the MVP "basic variant detection" requirement.
 *
 * Algorithm:
 * 1. Compute a path signature for each run (ordered step categories).
 * 2. Process runs in deterministic order (sorted by runId).
 * 3. For each run, find an existing variant group where the signature
 *    similarity meets the configured threshold.
 * 4. If found, add the run to that group (first match wins — greedy).
 * 5. If not found, create a new variant group.
 * 6. Sort variant groups by run count descending (most frequent first).
 * 7. Label the most frequent group as the standard path.
 *
 * Determinism: given identical inputs, outputs are identical because:
 * - Signatures are deterministic (pure function of step categories).
 * - Processing order is fixed (sorted by runId).
 * - Cluster assignment uses first-match greedy (no randomness).
 * - Output ordering is by frequency then variantId.
 */

import type {
  ProcessRunBundle,
  VariantSet,
  ProcessVariant,
  IntelligenceOptions,
} from './types.js';
import { computePathSignature, computeSignatureSimilarity } from './pathSignature.js';

export function detectVariants(
  bundles: ProcessRunBundle[],
  options: IntelligenceOptions,
): VariantSet {
  const now = new Date().toISOString();
  const allRunIds = bundles.map(b => b.processRun.runId);

  if (bundles.length === 0) {
    return {
      ruleVersion: options.ruleVersion,
      runCount: 0,
      computedAt: now,
      variantCount: 0,
      standardPath: null,
      variants: [],
      variantSimilarityThreshold: options.variantSimilarityThreshold,
      evidenceRunIds: [],
    };
  }

  // Compute signatures and sort runs by runId for deterministic processing order
  type SignedBundle = { runId: string; sig: ReturnType<typeof computePathSignature> };
  const signed: SignedBundle[] = bundles
    .map(b => ({ runId: b.processRun.runId, sig: computePathSignature(b) }))
    .sort((a, b) => a.runId.localeCompare(b.runId));

  // Cluster signatures using greedy first-match
  const clusters: Array<{ representative: SignedBundle['sig']; runIds: string[] }> = [];

  for (const { runId, sig } of signed) {
    let assigned = false;
    for (const cluster of clusters) {
      const similarity = computeSignatureSimilarity(sig, cluster.representative);
      if (similarity >= options.variantSimilarityThreshold) {
        cluster.runIds.push(runId);
        assigned = true;
        break;
      }
    }
    if (!assigned) {
      clusters.push({ representative: sig, runIds: [runId] });
    }
  }

  // Sort by run count descending, then by signature string for tie-breaking
  clusters.sort(
    (a, b) =>
      b.runIds.length - a.runIds.length ||
      a.representative.signature.localeCompare(b.representative.signature),
  );

  const standardRep = clusters[0]?.representative ?? null;

  const variants: ProcessVariant[] = clusters.map((cluster, i) => {
    const similarityToStandard =
      i === 0 || standardRep === null
        ? 1.0
        : computeSignatureSimilarity(cluster.representative, standardRep);

    return {
      variantId: `variant-${i + 1}`,
      pathSignature: cluster.representative,
      runCount: cluster.runIds.length,
      frequency: cluster.runIds.length / bundles.length,
      isStandardPath: i === 0,
      similarityToStandard,
      evidenceRunIds: [...cluster.runIds].sort(),
    };
  });

  return {
    ruleVersion: options.ruleVersion,
    runCount: bundles.length,
    computedAt: now,
    variantCount: variants.length,
    standardPath: variants[0] ?? null,
    variants,
    variantSimilarityThreshold: options.variantSimilarityThreshold,
    evidenceRunIds: allRunIds,
  };
}
