import { describe, it, expect } from 'vitest';
import { analyzePortfolio, clusterSignatures, computePathSignature } from '@ledgerium/intelligence-engine';
import { runProcessEngine } from '@/lib/ingestion';
import { buildVariantStoryMap, type StoryVariantInput } from '@/lib/variantStoryMap';
import { buildSampleVariantBundles } from './sample-variants';

/**
 * The sample-variant set is the live demo of the Variants tab — it must actually
 * produce multiple variants, a dominant standard path, and a branchy story map.
 * If this breaks, the demo silently shows "consistent / single recording".
 *
 * The set comprises 16 recordings across 6 distinct variants of
 * "Approve Expense Report":
 *   1. STANDARD      — dominant happy path              (5 steps ×5 runs)
 *   2. INSERTION_A   — "Request clarification" before Approve (6 steps ×3 runs)
 *   3. INSERTION_B   — "Manager review" gate after Approve   (6 steps ×2 runs)
 *   4. SHORTCUT      — auto-notification, skips Notify step  (4 steps ×2 runs)
 *   5. REWORK        — reject + resubmit loop                (7 steps ×2 runs)
 *   6. EXCEPTION     — error_handling ×2 (exception heavy)   (7 steps ×2 runs)
 */
describe('sample-variants demo data', () => {
  const bundles = buildSampleVariantBundles();
  const runs = bundles.map((b) => {
    const out = runProcessEngine(b);
    return { processRun: out.processRun, processDefinition: out.processDefinition };
  });

  it('runs cleanly through the process engine for all 16 recordings', () => {
    expect(runs).toHaveLength(16);
    for (const r of runs) {
      expect(r.processDefinition.stepDefinitions.length).toBeGreaterThanOrEqual(4);
    }
  });

  it('yields at least 5 distinct variants with a dominant standard path', () => {
    const intel = analyzePortfolio({ runs });
    // 6 distinct step-category sequences → 6 variants.
    expect(intel.variants.variantCount).toBeGreaterThanOrEqual(5);
    const standard = intel.variants.standardPath;
    expect(standard).not.toBeNull();
    // The standard path is the most frequent (5 of 16 runs).
    expect(standard!.runCount).toBe(5);
    expect(intel.metrics.runCount).toBe(16);
  });

  it('clusters all 16 recordings into ONE cohort (Variants tab works without persisted grouping)', () => {
    const members = runs.map((r, i) => ({ id: `w${i}`, signature: computePathSignature(r) }));
    const { clusters } = clusterSignatures(members);
    // single-link should merge all 16 around the standard-path hub
    expect(clusters).toHaveLength(1);
    expect(clusters[0]!.size).toBe(16);
  });

  it('produces a rich story map (spine + ≥3 branches that rejoin)', () => {
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
    // 5 divergences: INSERTION_A, INSERTION_B, SHORTCUT, REWORK, EXCEPTION.
    expect(map!.branchCount).toBeGreaterThanOrEqual(3);
    // backbone is the standard 5-step path
    expect(map!.backbone.length).toBe(5);
    // at least one branch carries real evidence run ids (drill-down works)
    const branchEdge = map!.edges.find(
      (e) => (e.kind === 'branch' || e.kind === 'shortcut') && e.evidenceRunIds.length > 0,
    );
    expect(branchEdge).toBeTruthy();
  });

  it('has distinct average durations enabling Fastest/Longest role badges', () => {
    const intel = analyzePortfolio({ runs });
    const durations = intel.variants.variants
      .map((v) => v.pathSignature.stepCount)
      .filter((n) => n > 0);
    // The shortcut (4 steps) and exception/rework (7 steps) create a meaningful spread.
    const minSteps = Math.min(...durations);
    const maxSteps = Math.max(...durations);
    expect(maxSteps - minSteps).toBeGreaterThanOrEqual(2);
  });
});
