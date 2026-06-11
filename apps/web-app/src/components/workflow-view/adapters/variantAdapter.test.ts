import { describe, it, expect } from 'vitest';
import { buildVariantData } from './variantAdapter';
import type { NormalizedViewModel } from './viewModel';

// Minimal model — buildVariantData only reads model.variants/nodes/edges here.
const EMPTY_MODEL = { variants: [], nodes: [], edges: [] } as unknown as NormalizedViewModel;

function intel(variants: any[]) {
  return { variants: { variants } };
}

const STD = { variantId: 'v1', isStandardPath: true, frequency: 0.7, runCount: 7, evidenceRunIds: ['r1', 'r2'], pathSignature: { stepCategories: ['click', 'fill', 'submit'] } };
const ALT = { variantId: 'v2', isStandardPath: false, frequency: 0.3, runCount: 3, evidenceRunIds: ['r3'], pathSignature: { stepCategories: ['click', 'fill', 'validate', 'submit'] } };

describe('buildVariantData — multi-run intelligence', () => {
  it('produces variant paths with run-count and evidence run ids', () => {
    const out = buildVariantData(EMPTY_MODEL, intel([STD, ALT]));
    expect(out.hasVariantData).toBe(true);
    expect(out.paths).toHaveLength(2);
    const v1 = out.paths.find((p) => p.id === 'v1')!;
    const v2 = out.paths.find((p) => p.id === 'v2')!;
    expect(v1.evidenceRunIds).toEqual(['r1', 'r2']);
    expect(v2.evidenceRunIds).toEqual(['r3']);
    expect(v2.runCount).toBe(3);
  });

  it('computes divergence points by LCS alignment, not positional index', () => {
    const out = buildVariantData(EMPTY_MODEL, intel([STD, ALT]));
    const v2 = out.paths.find((p) => p.id === 'v2')!;
    // 'validate' inserted at index 2 → only index 2 diverges, NOT index 3 (submit).
    expect(v2.divergencePoints).toEqual([2]);
    const v1 = out.paths.find((p) => p.id === 'v1')!;
    expect(v1.divergencePoints).toEqual([]); // standard never diverges from itself
  });

  it('treats a single variant as no-variant-data (honest single run)', () => {
    const out = buildVariantData(EMPTY_MODEL, intel([STD]));
    expect(out.hasVariantData).toBe(false);
  });

  it('handles missing intelligence safely', () => {
    expect(buildVariantData(EMPTY_MODEL, undefined).hasVariantData).toBe(false);
    expect(buildVariantData(EMPTY_MODEL, {}).paths).toEqual([]);
  });
});
