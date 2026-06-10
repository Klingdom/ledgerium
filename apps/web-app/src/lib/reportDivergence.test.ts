import { describe, it, expect } from 'vitest';
import { deriveDivergence, type DivergenceVariantInput } from './reportDivergence';

function variant(
  variantId: string,
  signature: string,
  runCount: number,
  isStandardPath = false,
): DivergenceVariantInput {
  return { variantId, pathSignature: { signature }, runCount, isStandardPath };
}

describe('deriveDivergence — guards', () => {
  it('returns null without a standard path', () => {
    const out = deriveDivergence(
      [variant('v1', 'click:fill:submit', 3), variant('v2', 'click:fill:validate:submit', 2)],
      5,
    );
    expect(out).toBeNull();
  });

  it('returns null with fewer than two signed variants', () => {
    expect(deriveDivergence([variant('v1', 'click:fill:submit', 3, true)], 3)).toBeNull();
  });

  it('returns null when every variant conforms (no branches)', () => {
    const out = deriveDivergence(
      [variant('v1', 'click:fill:submit', 3, true), variant('v2', 'click:fill:submit', 2)],
      5,
    );
    expect(out).toBeNull();
  });
});

describe('deriveDivergence — branch + run weighting', () => {
  it('derives a run-weighted insertion branch off the standard path', () => {
    const out = deriveDivergence(
      [
        variant('std', 'click:fill:submit', 7, true),
        variant('alt', 'click:fill:validate:submit', 3),
      ],
      10,
    );
    expect(out).not.toBeNull();
    expect(out!.backbone).toEqual(['click', 'fill', 'submit']);
    // 7 of 10 runs conform to the backbone.
    expect(out!.conformingPct).toBeCloseTo(0.7, 5);
    expect(out!.branches).toHaveLength(1);
    const b = out!.branches[0]!;
    expect(b.afterLabel).toBe('fill');
    expect(b.rejoinLabel).toBe('submit');
    expect(b.altSteps).toEqual(['validate']);
    // run-weighted by the alt variant's runCount (3 of 10).
    expect(b.runCount).toBe(3);
    expect(b.runShare).toBeCloseTo(0.3, 5);
    expect(b.dfgConfirmed).toBe(true);
  });

  it('represents a shortcut branch (skipped backbone step)', () => {
    const out = deriveDivergence(
      [variant('std', 'click:fill:submit', 8, true), variant('short', 'click:submit', 2)],
      10,
    );
    expect(out).not.toBeNull();
    const b = out!.branches[0]!;
    expect(b.altSteps).toEqual([]);
    expect(b.skippedBackbone).toEqual(['fill']);
    expect(b.afterLabel).toBe('click');
    expect(b.rejoinLabel).toBe('submit');
    expect(b.runCount).toBe(2);
  });

  it('falls back to summed runCounts when totalRuns is 0', () => {
    const out = deriveDivergence(
      [variant('std', 'click:fill:submit', 4, true), variant('alt', 'click:fill:validate:submit', 1)],
      0,
    );
    expect(out).not.toBeNull();
    // denom = 4 + 1 = 5 → conforming 4/5
    expect(out!.conformingPct).toBeCloseTo(0.8, 5);
    expect(out!.branches[0]!.runShare).toBeCloseTo(0.2, 5);
  });

  it('is deterministic across input order', () => {
    const vs = [
      variant('std', 'click:fill:submit', 5, true),
      variant('alt', 'click:fill:validate:submit', 3),
      variant('short', 'click:submit', 2),
    ];
    const a = deriveDivergence(vs, 10);
    const b = deriveDivergence([...vs].reverse(), 10);
    expect(b).toEqual(a);
  });
});
