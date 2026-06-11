import { describe, it, expect } from 'vitest';
import { buildVariantStoryMap, type StoryVariantInput } from './variantStoryMap';

function v(id: string, cats: string[], runCount: number, isStandard = false): StoryVariantInput {
  return { id, stepCategories: cats, runCount, isStandard };
}

const STD = v('v1', ['click', 'fill', 'submit'], 7, true);
const INSERT = v('v2', ['click', 'fill', 'validate', 'submit'], 3);
const SHORTCUT = v('v3', ['click', 'submit'], 2);

describe('buildVariantStoryMap — guards', () => {
  it('returns null for a single variant', () => {
    expect(buildVariantStoryMap([STD])).toBeNull();
  });
  it('returns null when no variant has steps', () => {
    expect(buildVariantStoryMap([{ id: 'a', stepCategories: [] }, { id: 'b', stepCategories: [] }])).toBeNull();
  });
});

describe('buildVariantStoryMap — spine + branch', () => {
  it('lays the standard path as a straight horizontal spine', () => {
    const map = buildVariantStoryMap([STD, INSERT])!;
    const spine = map.nodes.filter((n) => n.kind === 'backbone');
    expect(spine.map((n) => n.id)).toEqual(['bb-0', 'bb-1', 'bb-2']);
    expect(spine.every((n) => n.y === 0)).toBe(true);
    expect(spine.map((n) => n.x)).toEqual([0, 170, 340]);
    expect(map.edges.filter((e) => e.kind === 'spine')).toHaveLength(2);
  });

  it('renders an inserted-step variant as a branch off the spine that rejoins', () => {
    const map = buildVariantStoryMap([STD, INSERT])!;
    const branchNodes = map.nodes.filter((n) => n.kind === 'branch');
    expect(branchNodes).toHaveLength(1);
    expect(branchNodes[0]!.category).toBe('validate');
    expect(branchNodes[0]!.y).toBeGreaterThan(0); // below the spine

    // diverge point marked on the backbone node after 'fill'
    expect(map.nodes.find((n) => n.id === 'bb-1')!.isDecision).toBe(true);

    // branch-in from bb-1, rejoin into bb-2
    const branchIn = map.edges.find((e) => e.kind === 'branch')!;
    const rejoin = map.edges.find((e) => e.kind === 'rejoin')!;
    expect(branchIn.source).toBe('bb-1');
    expect(rejoin.target).toBe('bb-2');
    // run-weighted: the alt variant has 3 of 10 runs
    expect(branchIn.runCount).toBe(3);
    expect(branchIn.runShare).toBeCloseTo(0.3, 5);
  });

  it('represents a shortcut variant as a dashed bypass with no branch nodes', () => {
    const map = buildVariantStoryMap([STD, SHORTCUT])!;
    expect(map.nodes.filter((n) => n.kind === 'branch')).toHaveLength(0);
    const shortcut = map.edges.find((e) => e.kind === 'shortcut')!;
    expect(shortcut.source).toBe('bb-0'); // after 'click'
    expect(shortcut.target).toBe('bb-2'); // rejoins at 'submit'
    expect(shortcut.runCount).toBe(2);
  });

  it('reports run-weighted conforming count and totals', () => {
    const map = buildVariantStoryMap([STD, INSERT, SHORTCUT])!;
    expect(map.totalRuns).toBe(12); // 7 + 3 + 2
    expect(map.conformingRunCount).toBe(7); // only the standard runs follow the spine
    expect(map.branchCount).toBe(2);
  });
});

describe('buildVariantStoryMap — determinism', () => {
  it('is permutation-invariant and idempotent', () => {
    const a = buildVariantStoryMap([STD, INSERT, SHORTCUT]);
    const b = buildVariantStoryMap([SHORTCUT, STD, INSERT]);
    expect(b).toEqual(a);
    expect(buildVariantStoryMap([STD, INSERT])).toEqual(buildVariantStoryMap([STD, INSERT]));
  });

  it('carries a pinned version hash', () => {
    expect(buildVariantStoryMap([STD, INSERT])!.version).toMatch(/^variant-story\/1\.0\.0#/);
  });
});
