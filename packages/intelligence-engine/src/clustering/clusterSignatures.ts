/**
 * Deterministic similarity clustering of process recordings (Phase 1, C+1).
 *
 * Single-link / connected-components over pairs whose `traceSimilarity` ≥ threshold.
 * Pure + DETERMINISTIC: inputs sorted by id, union toward the lexicographically
 * smaller root, stable cluster ordering, no Date/random. Because identical
 * signatures score exactly 1.0, the exact-signature grouping is a strict SUBSET of
 * the output — this can never group LESS than the current engine.
 *
 * O(n²) pairwise for now; MinHash/LSH candidate generation is a later iteration
 * (C+5) and only changes performance, not the clustering result.
 *
 * NOTE: this module is pure and UNWIRED. It does not touch the database, the live
 * `clusterWorkflows()` path, or any UI. Wiring it behind a flag (with exact-signature
 * fallback) is the next iteration.
 */
import type { PathSignature } from '../types.js';
import {
  traceSimilarity,
  DEFAULT_SIMILARITY_WEIGHTS,
  type SimilarityWeights,
} from './traceSimilarity.js';

/**
 * CONSERVATIVE default. The production value is calibrated via the labeled hold-out
 * in MEASUREMENT_PLAN_PROCESS_VARIATION before clustering is wired into live grouping.
 */
export const DEFAULT_CLUSTER_THRESHOLD = 0.6;

export const CLUSTERING_ALGORITHM = 'single-link/1.0.0';

export interface ClusterMemberInput {
  /** Stable identifier for the recording/run (e.g. workflow id). */
  id: string;
  signature: PathSignature;
}

export interface ClusterOptions {
  threshold?: number;
  weights?: SimilarityWeights;
}

export interface Cluster {
  /** Deterministic id = lexicographically smallest member id. */
  clusterId: string;
  /** Member ids, ascending. */
  memberIds: string[];
  size: number;
}

export interface ClusterResult {
  /** Clusters ordered by size desc, then clusterId asc. */
  clusters: Cluster[];
  threshold: number;
  /** Version hash over algorithm + weights + threshold; re-runs are byte-identical for a fixed version. */
  version: string;
}

/** Deterministic FNV-1a config hash so tuning changes are visible + reproducible. */
function configHash(threshold: number, weights: SimilarityWeights): string {
  const s = `lcs=${weights.lcs};cat=${weights.cat};t=${threshold}`;
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

function asc(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * Cluster recordings by blended trace similarity. Deterministic and idempotent:
 * the same set of members (in any input order) yields a byte-identical result.
 */
export function clusterSignatures(
  members: readonly ClusterMemberInput[],
  options: ClusterOptions = {},
): ClusterResult {
  const threshold = options.threshold ?? DEFAULT_CLUSTER_THRESHOLD;
  const weights = options.weights ?? DEFAULT_SIMILARITY_WEIGHTS;
  const version = `${CLUSTERING_ALGORITHM}#${configHash(threshold, weights)}`;

  // Deterministic processing order.
  const sorted = [...members].sort((a, b) => asc(a.id, b.id));
  const n = sorted.length;

  // Union-find with lexical-root union (smaller id wins) for determinism.
  const parent = new Map<string, string>();
  for (const m of sorted) parent.set(m.id, m.id);

  const find = (x: string): string => {
    let r = x;
    while (parent.get(r) !== r) r = parent.get(r) as string;
    // path compression
    let c = x;
    while (c !== r) {
      const next = parent.get(c) as string;
      parent.set(c, r);
      c = next;
    }
    return r;
  };

  const union = (a: string, b: string): void => {
    const ra = find(a);
    const rb = find(b);
    if (ra === rb) return;
    if (ra < rb) parent.set(rb, ra);
    else parent.set(ra, rb);
  };

  // O(n²) pairwise; union pairs at/above threshold.
  for (let i = 0; i < n; i++) {
    const mi = sorted[i] as ClusterMemberInput;
    for (let j = i + 1; j < n; j++) {
      const mj = sorted[j] as ClusterMemberInput;
      if (traceSimilarity(mi.signature, mj.signature, weights) >= threshold) {
        union(mi.id, mj.id);
      }
    }
  }

  // Group members by root.
  const byRoot = new Map<string, string[]>();
  for (const m of sorted) {
    const r = find(m.id);
    const arr = byRoot.get(r) ?? [];
    arr.push(m.id);
    byRoot.set(r, arr);
  }

  const clusters: Cluster[] = [];
  for (const memberIds of byRoot.values()) {
    const ids = [...memberIds].sort(asc);
    clusters.push({ clusterId: ids[0] as string, memberIds: ids, size: ids.length });
  }
  clusters.sort((a, b) => b.size - a.size || asc(a.clusterId, b.clusterId));

  return { clusters, threshold, version };
}
