import { describe, it, expect } from 'vitest';
import {
  DEMO_VARIANT_GRAPH,
  DEMO_VARIANT_INTELLIGENCE,
  DEMO_VARIANT_TOTAL_RUNS,
  DEMO_VARIANT_COUNT,
  buildDemoVariantGraph,
} from './demoVariantsFixture';

describe('demoVariantsFixture — live WorkflowVariantsMap sample', () => {
  it('mirrors the Approve Expense Report recording (6 variants / 16 runs)', () => {
    expect(DEMO_VARIANT_COUNT).toBe(6);
    expect(DEMO_VARIANT_TOTAL_RUNS).toBe(16);
    expect(DEMO_VARIANT_INTELLIGENCE.variants.variants).toHaveLength(6);
    expect(DEMO_VARIANT_INTELLIGENCE.variants.runCount).toBe(16);
    // frequencies sum to 1
    const sum = DEMO_VARIANT_INTELLIGENCE.variants.variants.reduce((s, v) => s + v.frequency, 0);
    expect(sum).toBeCloseTo(1, 6);
    // exactly one standard path, and it is the most frequent
    const standard = DEMO_VARIANT_INTELLIGENCE.variants.variants.filter((v) => v.isStandardPath);
    expect(standard).toHaveLength(1);
    const maxFreq = Math.max(...DEMO_VARIANT_INTELLIGENCE.variants.variants.map((v) => v.frequency));
    expect(standard[0]!.frequency).toBe(maxFreq);
  });

  it('builds a valid multi-run normalized view-model the component can render', () => {
    expect(DEMO_VARIANT_GRAPH).not.toBeNull();
    const g = DEMO_VARIANT_GRAPH!;
    expect(g.isMultiRun).toBe(true);
    expect(g.runCount).toBe(16);
    expect(g.variants.length).toBe(6);
    expect(g.nodes.length).toBeGreaterThan(0);
    expect(g.edges.length).toBeGreaterThan(0);
  });

  it('is deterministic — rebuilding yields an identical graph', () => {
    const a = buildDemoVariantGraph();
    const b = buildDemoVariantGraph();
    expect(a).toEqual(b);
  });

  it('carries real step titles + durations (side-channel) for every variant', () => {
    for (const v of DEMO_VARIANT_INTELLIGENCE.variants.variants) {
      const titles = DEMO_VARIANT_INTELLIGENCE.variantStepTitles[v.variantId];
      const durs = DEMO_VARIANT_INTELLIGENCE.variantStepDurations[v.variantId];
      expect(titles).toBeDefined();
      expect(durs).toBeDefined();
      expect(titles!.length).toBe(v.pathSignature.stepCategories.length);
      expect(durs!.length).toBe(v.pathSignature.stepCategories.length);
    }
  });
});
