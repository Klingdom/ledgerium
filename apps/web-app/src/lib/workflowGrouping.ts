/**
 * Pure workflow grouping for auto-clustering recordings into ProcessDefinitions
 * (Process Variation Phase 1, C+2 — wire the clustering engine behind a flag).
 *
 * Two modes, selected by a flag that DEFAULTS OFF so production grouping stays
 * byte-identical to the historical behavior until explicitly enabled:
 *
 *  - exact (default): group only byte-identical path signatures (legacy behavior).
 *  - similarity:      additionally MERGE distinct-but-similar signatures via the
 *                     deterministic clustering engine.
 *
 * No DB access — pure + deterministic + unit-testable. All Prisma orchestration
 * stays in intelligence.ts. Because identical signatures score 1.0 in the engine,
 * the exact grouping is a strict SUBSET of the similarity output: enabling the flag
 * can never group LESS than today.
 */
import {
  computePathSignature,
  clusterSignatures,
  type ClusterMemberInput,
  type ProcessRunBundle,
} from '@ledgerium/intelligence-engine';

/** Minimal structural shape the grouping needs (richer DB rows are assignable). */
export interface GroupableWorkflow {
  id: string;
  title: string;
  processOutput: ProcessRunBundle | null;
}

/** Env flag — default OFF so production grouping is byte-identical until enabled. */
export function isSimilarityClusteringEnabled(): boolean {
  const v = process.env.LEDGERIUM_SIMILARITY_CLUSTERING;
  return v === '1' || v === 'true';
}

/** Byte-identical path-signature grouping (legacy behavior, extracted verbatim). */
export function buildSignatureGroups<T extends GroupableWorkflow>(workflows: T[]): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const w of workflows) {
    if (!w.processOutput) continue;
    const sig = computePathSignature(w.processOutput).signature;
    const existing = groups.get(sig);
    if (existing) existing.push(w);
    else groups.set(sig, [w]);
  }
  return groups;
}

export interface GroupingOptions {
  /** When true, merge distinct-but-similar signatures. Defaults to the env flag. */
  similarityClustering?: boolean;
  /** Override the clustering merge threshold (defaults to the engine default). */
  threshold?: number;
}

/**
 * Group workflows for ProcessDefinition assignment. Returns a map keyed by a
 * deterministic representative signature — the lexicographically smallest member
 * signature for a merged cluster — so the downstream `pathSignature` upsert key is
 * stable across re-runs.
 */
export function groupWorkflowsForClustering<T extends GroupableWorkflow>(
  workflows: T[],
  options: GroupingOptions = {},
): Map<string, T[]> {
  const exactGroups = buildSignatureGroups(workflows);

  const useSimilarity = options.similarityClustering ?? isSimilarityClusteringEnabled();
  if (!useSimilarity) return exactGroups;

  const distinctSignatures = [...exactGroups.keys()];
  // Nothing to merge with fewer than two distinct signatures → identical to exact.
  if (distinctSignatures.length < 2) return exactGroups;

  // Cluster the DISTINCT signatures (one representative path signature each).
  const members: ClusterMemberInput[] = [];
  for (const sig of distinctSignatures) {
    const rep = exactGroups.get(sig)![0]!;
    members.push({ id: sig, signature: computePathSignature(rep.processOutput!) });
  }

  const { clusters } = clusterSignatures(
    members,
    options.threshold !== undefined ? { threshold: options.threshold } : {},
  );

  // Merge exact groups that fell into the same cluster; key = deterministic clusterId.
  const merged = new Map<string, T[]>();
  for (const cluster of clusters) {
    const arr: T[] = [];
    for (const sig of cluster.memberIds) {
      const g = exactGroups.get(sig);
      if (g) arr.push(...g);
    }
    merged.set(cluster.clusterId, arr);
  }
  return merged;
}
