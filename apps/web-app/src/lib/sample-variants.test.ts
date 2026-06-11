import { describe, it, expect } from 'vitest';
import { analyzePortfolio } from '@ledgerium/intelligence-engine';
import { runProcessEngine } from '@/lib/ingestion';
import { buildVariantStoryMap, type StoryVariantInput } from '@/lib/variantStoryMap';
import { buildSampleVariantBundles } from './sample-variants';

/**
 * The sample-variant set is the live demo of the Variants tab — it must actually
 * produce multiple variants, a dominant standard path, and a branchy story map.
 * If this breaks, the demo silently shows "consistent / single recording".
 */
describe('sample-variants demo data', () => {
  const bundles = buildSampleVariantBundles();
  const runs = bundles.map((b) => {
    const out = runProcessEngine(b);
    return { processRun: out.processRun, processDefinition: out.processDefinition };
  });

  it('runs cleanly through the process engine for all 8 recordings', () => {
    expect(runs).toHaveLength(8);
    for (const r of runs) {
      expect(r.processDefinition.stepDefinitions.length).toBeGreaterThanOrEqual(4);
    }
  });

  it('yields multiple distinct variants with a dominant standard path', () => {
    const intel = analyzePortfolio({ runs });
    // standard + insertion + shortcut + exception = 4 distinct paths.
    expect(intel.variants.variantCount).toBeGreaterThanOrEqual(3);
    const standard = intel.variants.standardPath;
    expect(standard).not.toBeNull();
    // The standard path is the most frequent (4 of 8 runs).
    expect(standard!.runCount).toBe(4);
    expect(intel.metrics.runCount).toBe(8);
  });

  it('produces a branchy story map (spine + ≥2 branches that rejoin)', () => {
    const intel = analyzePortfolio({ runs });
    const variants: StoryVariantInput[] = intel.variants.variants.map((v) => ({
      id: v.variantId,
      isStandard: v.isStandardPath,
      runCount: v.runCount,
      stepCategories: v.pathSignature.stepCategories,
      evidenceRunIds: v.evidenceRunIds,
    }));
    const map = buildVariantStoryMap(variants);
    expect(map).not.toBeNull();
    expect(map!.branchCount).toBeGreaterThanOrEqual(2);
    // backbone is the standard 5-step path
    expect(map!.backbone.length).toBe(5);
    // at least one branch carries real evidence run ids (drill-down works)
    const branchEdge = map!.edges.find((e) => (e.kind === 'branch' || e.kind === 'shortcut') && e.evidenceRunIds.length > 0);
    expect(branchEdge).toBeTruthy();
  });
});
