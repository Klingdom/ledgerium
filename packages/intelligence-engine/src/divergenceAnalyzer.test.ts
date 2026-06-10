import { describe, it, expect } from 'vitest';
import { analyzeDivergence, type DivergenceRun } from './divergenceAnalyzer.js';

const BACKBONE = ['click', 'fill', 'submit'];

function run(id: string, steps: string[]): DivergenceRun {
  return { id, steps };
}

describe('analyzeDivergence — conformance', () => {
  it('treats an exact-backbone run as conforming with no branches', () => {
    const res = analyzeDivergence(BACKBONE, [run('a', ['click', 'fill', 'submit'])]);
    expect(res.totalRuns).toBe(1);
    expect(res.conformingRunCount).toBe(1);
    expect(res.conformingFrequency).toBe(1);
    expect(res.branches).toEqual([]);
  });

  it('handles empty runs', () => {
    const res = analyzeDivergence(BACKBONE, []);
    expect(res.totalRuns).toBe(0);
    expect(res.branches).toEqual([]);
    expect(res.conformingFrequency).toBe(0);
  });
});

describe('analyzeDivergence — divergence shapes', () => {
  it('detects an inserted-step branch (diverge then reconverge) with DFG confirmation', () => {
    const res = analyzeDivergence(BACKBONE, [
      run('conform', ['click', 'fill', 'submit']),
      run('insert', ['click', 'fill', 'validate', 'submit']),
    ]);
    expect(res.conformingRunCount).toBe(1);
    expect(res.branches).toHaveLength(1);
    const b = res.branches[0]!;
    expect(b.divergeAfterIndex).toBe(1); // after 'fill'
    expect(b.reconvergeAtIndex).toBe(2); // at 'submit'
    expect(b.altSteps).toEqual(['validate']);
    expect(b.skippedBackbone).toEqual([]);
    expect(b.runCount).toBe(1);
    expect(b.frequency).toBe(0.5);
    expect(b.evidenceRunIds).toEqual(['insert']);
    // DFG: 'fill' has successors {submit, validate} → split; 'submit' has predecessors {fill, validate} → join.
    expect(b.dfgConfirmedSplit).toBe(true);
    expect(b.dfgConfirmedJoin).toBe(true);
  });

  it('detects a shortcut branch (skipped backbone step, no alt steps)', () => {
    const res = analyzeDivergence(BACKBONE, [run('skip', ['click', 'submit'])]);
    expect(res.branches).toHaveLength(1);
    const b = res.branches[0]!;
    expect(b.divergeAfterIndex).toBe(0); // after 'click'
    expect(b.reconvergeAtIndex).toBe(2); // at 'submit'
    expect(b.altSteps).toEqual([]);
    expect(b.skippedBackbone).toEqual(['fill']);
  });

  it('detects a head divergence (extra steps before the backbone starts)', () => {
    const res = analyzeDivergence(BACKBONE, [run('head', ['login', 'click', 'fill', 'submit'])]);
    expect(res.branches).toHaveLength(1);
    const b = res.branches[0]!;
    expect(b.divergeAfterIndex).toBe(-1); // before the start
    expect(b.reconvergeAtIndex).toBe(0); // rejoins at 'click'
    expect(b.altSteps).toEqual(['login']);
  });

  it('detects a tail divergence (extra steps after the backbone ends)', () => {
    const res = analyzeDivergence(BACKBONE, [run('tail', ['click', 'fill', 'submit', 'logout'])]);
    expect(res.branches).toHaveLength(1);
    const b = res.branches[0]!;
    expect(b.divergeAfterIndex).toBe(2); // after 'submit'
    expect(b.reconvergeAtIndex).toBe(BACKBONE.length); // after the end
    expect(b.altSteps).toEqual(['logout']);
  });
});

describe('analyzeDivergence — aggregation + evidence', () => {
  it('aggregates identical branches across runs and collects evidence ids', () => {
    const res = analyzeDivergence(BACKBONE, [
      run('r2', ['click', 'fill', 'validate', 'submit']),
      run('r1', ['click', 'fill', 'validate', 'submit']),
      run('r3', ['click', 'fill', 'submit']),
    ]);
    expect(res.conformingRunCount).toBe(1);
    expect(res.branches).toHaveLength(1);
    const b = res.branches[0]!;
    expect(b.runCount).toBe(2);
    expect(b.evidenceRunIds).toEqual(['r1', 'r2']); // id-sorted, deterministic
    expect(b.frequency).toBe(round3(2 / 3));
  });

  it('orders branches by frequency desc', () => {
    const res = analyzeDivergence(BACKBONE, [
      run('a', ['click', 'fill', 'validate', 'submit']), // branch X
      run('b', ['click', 'fill', 'validate', 'submit']), // branch X
      run('c', ['click', 'submit']),                      // branch Y (shortcut)
    ]);
    expect(res.branches).toHaveLength(2);
    expect(res.branches[0]!.runCount).toBe(2); // X first (more frequent)
    expect(res.branches[1]!.runCount).toBe(1);
  });
});

describe('analyzeDivergence — determinism', () => {
  it('is permutation-invariant across run input order', () => {
    const runs = [
      run('a', ['click', 'fill', 'validate', 'submit']),
      run('b', ['click', 'submit']),
      run('c', ['click', 'fill', 'submit']),
    ];
    const forward = analyzeDivergence(BACKBONE, runs);
    const reversed = analyzeDivergence(BACKBONE, [...runs].reverse());
    expect(reversed).toEqual(forward);
  });

  it('is idempotent and carries a pinned version', () => {
    const runs = [run('a', ['click', 'fill', 'validate', 'submit'])];
    expect(analyzeDivergence(BACKBONE, runs)).toEqual(analyzeDivergence(BACKBONE, runs));
    expect(analyzeDivergence(BACKBONE, runs).version).toBe('lcs-backbone/1.0.0#min1');
  });
});

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}
