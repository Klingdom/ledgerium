/**
 * demoVariantsFixture — sample data for the public, live multi-tab
 * WorkflowVariantsMap demo (Map / Frequency / DNA / List).
 *
 * This mirrors the REAL default "Approve Expense Report (Sample)" recording set
 * in `src/lib/sample-variants.ts` (6 variants across 16 recorded runs). It is
 * illustrative SAMPLE data — not a real customer recording — but it is fed
 * through the SAME pure, client-safe builders the product uses
 * (`portfolioIntelligenceToVariantInput` → `buildVariantFlowModel`), so the
 * embedded `WorkflowVariantsMap` renders exactly as it does in-app: real
 * divergence detection, real path classification, real frequency/performance
 * encoding. No DB, no auth, no API, no engine pipeline, no Date.now/Math.random.
 *
 * MAINTAIN: keep the 6 variants in sync with `sample-variants.ts` (STANDARD,
 * INSERTION_A, INSERTION_B, SHORTCUT, REWORK, EXCEPTION). TypeScript guards the
 * shape; `demoVariantsFixture.test.ts` guards the built graph.
 */

import {
  buildVariantFlowModel,
  portfolioIntelligenceToVariantInput,
} from '@/lib/variantFlowModel';
import type { NormalizedViewModel } from '@/components/workflow-view/adapters/viewModel';

/** Minimal PortfolioIntelligence-shaped object consumed by the variant builders. */
interface DemoVariantIntelligence {
  variants: {
    runCount: number;
    variants: Array<{
      variantId: string;
      isStandardPath: boolean;
      frequency: number;
      runCount: number;
      pathSignature: { stepCategories: string[] };
      evidenceRunIds: string[];
    }>;
  };
  /** Side-channel real step titles (keyed by variantId) — same mechanism the server uses. */
  variantStepTitles: Record<string, string[]>;
  /** Side-channel per-step durations in ms (keyed by variantId). */
  variantStepDurations: Record<string, number[]>;
}

interface VariantSpec {
  id: string;
  isStandard: boolean;
  runCount: number;
  titles: string[];
  categories: string[];
  durationsMs: number[];
  evidenceRunIds: string[];
}

// Transcribed verbatim from sample-variants.ts (Approve Expense Report, 16 runs).
const VARIANT_SPECS: VariantSpec[] = [
  {
    id: 'standard',
    isStandard: true,
    runCount: 5,
    titles: ['Open expense report', 'Review line items', 'Approve report', 'Notify employee', 'Archive to records'],
    categories: ['click_then_navigate', 'data_entry', 'fill_and_submit', 'send_action', 'single_action'],
    durationsMs: [1500, 8000, 4000, 2000, 1000],
    evidenceRunIds: ['EXP-2001', 'EXP-2002', 'EXP-2003', 'EXP-2004', 'EXP-2005'],
  },
  {
    id: 'insertion_a',
    isStandard: false,
    runCount: 3,
    titles: ['Open expense report', 'Review line items', 'Request clarification', 'Approve report', 'Notify employee', 'Archive to records'],
    categories: ['click_then_navigate', 'data_entry', 'single_action', 'fill_and_submit', 'send_action', 'single_action'],
    durationsMs: [1500, 8000, 5000, 4000, 2000, 1000],
    evidenceRunIds: ['EXP-2011', 'EXP-2012', 'EXP-2013'],
  },
  {
    id: 'insertion_b',
    isStandard: false,
    runCount: 2,
    titles: ['Open expense report', 'Review line items', 'Approve report', 'Escalate to manager for sign-off', 'Notify employee', 'Archive to records'],
    categories: ['click_then_navigate', 'data_entry', 'fill_and_submit', 'single_action', 'send_action', 'single_action'],
    durationsMs: [1500, 9000, 4000, 7000, 2000, 1000],
    evidenceRunIds: ['EXP-2021', 'EXP-2022'],
  },
  {
    id: 'shortcut',
    isStandard: false,
    runCount: 2,
    titles: ['Open expense report', 'Review line items', 'Approve report', 'Archive to records'],
    categories: ['click_then_navigate', 'data_entry', 'fill_and_submit', 'single_action'],
    durationsMs: [1400, 7000, 3500, 900],
    evidenceRunIds: ['EXP-2031', 'EXP-2032'],
  },
  {
    id: 'rework',
    isStandard: false,
    runCount: 2,
    titles: ['Open expense report', 'Review line items', 'Flag for rework', 'Employee updates report', 'Approve revised report', 'Notify employee', 'Archive to records'],
    categories: ['click_then_navigate', 'data_entry', 'fill_and_submit', 'data_entry', 'fill_and_submit', 'send_action', 'single_action'],
    durationsMs: [1500, 8500, 2000, 10000, 4000, 2000, 1000],
    evidenceRunIds: ['EXP-2041', 'EXP-2042'],
  },
  {
    id: 'exception',
    isStandard: false,
    runCount: 2,
    titles: ['Open expense report', 'Review line items', 'Approve report', 'Notification failed — retry', 'Escalate to manager', 'Notify employee', 'Archive to records'],
    categories: ['click_then_navigate', 'data_entry', 'fill_and_submit', 'error_handling', 'error_handling', 'send_action', 'single_action'],
    durationsMs: [1500, 8500, 4000, 4500, 4500, 2000, 1000],
    evidenceRunIds: ['EXP-2051', 'EXP-2052'],
  },
];

const TOTAL_RUNS = VARIANT_SPECS.reduce((s, v) => s + v.runCount, 0); // 16

/** The illustrative PortfolioIntelligence-shaped sample for the live demo. */
export const DEMO_VARIANT_INTELLIGENCE: DemoVariantIntelligence = {
  variants: {
    runCount: TOTAL_RUNS,
    variants: VARIANT_SPECS.map((v) => ({
      variantId: v.id,
      isStandardPath: v.isStandard,
      frequency: v.runCount / TOTAL_RUNS,
      runCount: v.runCount,
      pathSignature: { stepCategories: v.categories },
      evidenceRunIds: v.evidenceRunIds,
    })),
  },
  variantStepTitles: Object.fromEntries(VARIANT_SPECS.map((v) => [v.id, v.titles])),
  variantStepDurations: Object.fromEntries(VARIANT_SPECS.map((v) => [v.id, v.durationsMs])),
};

/** Build the normalized view-model once, deterministically, at module load. */
function buildDemoVariantGraph(): NormalizedViewModel | null {
  const titleMap = new Map<string, string[]>(Object.entries(DEMO_VARIANT_INTELLIGENCE.variantStepTitles));
  const durMap = new Map<string, number[]>(Object.entries(DEMO_VARIANT_INTELLIGENCE.variantStepDurations));
  const input = portfolioIntelligenceToVariantInput(DEMO_VARIANT_INTELLIGENCE, titleMap, durMap);
  return buildVariantFlowModel(input);
}

/** Exposed for tests so they can rebuild and assert determinism. */
export { buildDemoVariantGraph };

/** The graph prop for WorkflowVariantsMap. Null only if the builder contract breaks (guarded by tests). */
export const DEMO_VARIANT_GRAPH: NormalizedViewModel | null = buildDemoVariantGraph();

/** Total runs in the sample, for display. */
export const DEMO_VARIANT_TOTAL_RUNS = TOTAL_RUNS;

/** Variant count, for display. */
export const DEMO_VARIANT_COUNT = VARIANT_SPECS.length;
