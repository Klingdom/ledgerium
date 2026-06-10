import { describe, it, expect } from 'vitest';
import type { PathSignature } from '../types.js';
import { editDistance, lcsSimilarity, traceSimilarity } from './traceSimilarity.js';
import { clusterSignatures, type ClusterMemberInput } from './clusterSignatures.js';

function sig(cats: string[]): PathSignature {
  return { signature: cats.join(':'), stepCategories: cats, stepCount: cats.length };
}

// Canonical fixtures used across clustering tests.
const A = sig(['click', 'fill', 'submit']);
const B = sig(['click', 'fill', 'validate', 'submit']); // A + one inserted step
const C = sig(['navigate', 'search', 'navigate', 'export']); // unrelated process

describe('editDistance', () => {
  it('is 0 for identical sequences', () => {
    expect(editDistance(['a', 'b', 'c'], ['a', 'b', 'c'])).toBe(0);
  });
  it('counts a single substitution', () => {
    expect(editDistance(['a', 'b'], ['a', 'x'])).toBe(1);
  });
  it('counts a single insertion/deletion', () => {
    expect(editDistance(['a', 'b', 'c'], ['a', 'c'])).toBe(1);
    expect(editDistance([], ['a', 'b'])).toBe(2);
  });
});

describe('lcsSimilarity', () => {
  it('is 1 for identical (incl. both empty)', () => {
    expect(lcsSimilarity(['a', 'b'], ['a', 'b'])).toBe(1);
    expect(lcsSimilarity([], [])).toBe(1);
  });
  it('normalizes by the longer sequence', () => {
    expect(lcsSimilarity(['a', 'b', 'c'], ['a', 'c'])).toBeCloseTo(1 - 1 / 3, 5);
  });
  it('is 0 for fully disjoint same-length sequences', () => {
    expect(lcsSimilarity(['a', 'b'], ['x', 'y'])).toBe(0);
  });
});

describe('traceSimilarity', () => {
  it('short-circuits to exactly 1.0 for identical signatures', () => {
    expect(traceSimilarity(A, sig(['click', 'fill', 'submit']))).toBe(1);
  });
  it('rates a single-insertion variant as similar (worked example)', () => {
    // lcs=0.75, cat=0.4 → 0.6*0.75 + 0.4*0.4 = 0.61
    expect(traceSimilarity(A, B)).toBeCloseTo(0.61, 3);
  });
  it('applies the LCS hard floor so category overlap cannot force a merge', () => {
    // structurally disjoint → simLcs 0 → guarded to 0 regardless of category overlap
    expect(traceSimilarity(A, C)).toBe(0);
  });
  it('is symmetric', () => {
    expect(traceSimilarity(A, B)).toBe(traceSimilarity(B, A));
  });
});

describe('clusterSignatures — behavior', () => {
  const members: ClusterMemberInput[] = [
    { id: 'a', signature: A },
    { id: 'b', signature: B },
    { id: 'c', signature: C },
  ];

  it('groups the similar variant and keeps the unrelated run singleton', () => {
    const res = clusterSignatures(members, { threshold: 0.6 });
    expect(res.clusters).toHaveLength(2);
    expect(res.clusters[0]).toEqual({ clusterId: 'a', memberIds: ['a', 'b'], size: 2 });
    expect(res.clusters[1]).toEqual({ clusterId: 'c', memberIds: ['c'], size: 1 });
  });

  it('a higher threshold produces more singletons', () => {
    const res = clusterSignatures(members, { threshold: 0.7 }); // 0.61 < 0.7
    expect(res.clusters).toHaveLength(3);
    expect(res.clusters.every((c) => c.size === 1)).toBe(true);
  });
});

describe('clusterSignatures — invariants', () => {
  it('is permutation-invariant (any input order → identical result)', () => {
    const m: ClusterMemberInput[] = [
      { id: 'a', signature: A },
      { id: 'b', signature: B },
      { id: 'c', signature: C },
    ];
    const forward = clusterSignatures(m, { threshold: 0.6 });
    const shuffled = clusterSignatures([m[2]!, m[0]!, m[1]!], { threshold: 0.6 });
    expect(shuffled).toEqual(forward);
  });

  it('is idempotent / deterministic across repeated runs', () => {
    const m: ClusterMemberInput[] = [
      { id: 'x1', signature: A },
      { id: 'x2', signature: B },
      { id: 'x3', signature: C },
    ];
    expect(clusterSignatures(m)).toEqual(clusterSignatures(m));
  });

  it('EXACT-SIGNATURE SUPERSET: identical signatures always co-cluster, even at threshold 1.0', () => {
    const m: ClusterMemberInput[] = [
      { id: 'r1', signature: A },
      { id: 'r2', signature: sig(['click', 'fill', 'submit']) }, // identical to A
      { id: 'r3', signature: C },
    ];
    const res = clusterSignatures(m, { threshold: 1.0 });
    const withR1 = res.clusters.find((c) => c.memberIds.includes('r1'));
    expect(withR1?.memberIds).toEqual(['r1', 'r2']); // identical signatures grouped
    // r3 (different) stays separate at threshold 1.0
    expect(res.clusters.find((c) => c.memberIds.includes('r3'))?.size).toBe(1);
  });

  it('handles empty + single-member inputs', () => {
    expect(clusterSignatures([]).clusters).toEqual([]);
    const one = clusterSignatures([{ id: 'solo', signature: A }]);
    expect(one.clusters).toEqual([{ clusterId: 'solo', memberIds: ['solo'], size: 1 }]);
  });

  it('clusters are ordered by size desc then clusterId asc', () => {
    // two big clusters of identical sigs + one singleton
    const m: ClusterMemberInput[] = [
      { id: 'z', signature: A },
      { id: 'y', signature: A },
      { id: 'b', signature: C },
      { id: 'a', signature: C },
      { id: 'solo', signature: sig(['only', 'one']) },
    ];
    const res = clusterSignatures(m, { threshold: 0.95 });
    expect(res.clusters.map((c) => c.clusterId)).toEqual(['a', 'y', 'solo']);
    expect(res.clusters.map((c) => c.size)).toEqual([2, 2, 1]);
  });
});

describe('clusterSignatures — version hash', () => {
  it('is stable for a fixed config and changes when config changes', () => {
    const m: ClusterMemberInput[] = [{ id: 'a', signature: A }];
    const v1 = clusterSignatures(m, { threshold: 0.6 }).version;
    const v2 = clusterSignatures(m, { threshold: 0.6 }).version;
    const v3 = clusterSignatures(m, { threshold: 0.7 }).version;
    expect(v1).toBe(v2);
    expect(v1).not.toBe(v3);
    expect(v1).toMatch(/^single-link\/1\.0\.0#[0-9a-f]{8}$/);
  });
});
