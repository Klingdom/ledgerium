/**
 * variantFlowModel — unit tests
 *
 * Driven by the sample-variants fixture (6-variant "Approve Expense Report"
 * scenario: STANDARD ×5, INSERTION_A ×3, INSERTION_B ×2, SHORTCUT ×2,
 * REWORK ×2, EXCEPTION ×2 = 16 total recordings).
 *
 * Assertions cover:
 *  - decision nodes inserted at real divergence points
 *  - backbone uses real step labels (not just category fallbacks)
 *  - edges carry frequency and ALL flow forward (no backward arrows)
 *  - deterministic: build twice → deep-equal nodes + positions
 *  - honesty: no decisionLabel contains a fabricated business condition
 *  - branches rejoin the spine
 *  - guard: returns null for < 2 variants
 */

import { describe, it, expect } from 'vitest';
import { buildVariantFlowModel, type VariantInput } from './variantFlowModel';

// ─── Fixtures matching sample-variants.ts step definitions ────────────────────

const STANDARD_CATS = [
  'click_then_navigate',
  'data_entry',
  'fill_and_submit',
  'send_action',
  'single_action',
];
const STANDARD_TITLES = [
  'Open expense report',
  'Review line items',
  'Approve report',
  'Notify employee',
  'Archive to records',
];
const STANDARD_DUR = [1500, 8000, 4000, 2000, 1000];

const INSERTION_A_CATS = [
  'click_then_navigate',
  'data_entry',
  'single_action',    // extra step: clarification
  'fill_and_submit',
  'send_action',
  'single_action',
];
const INSERTION_A_TITLES = [
  'Open expense report',
  'Review line items',
  'Request clarification',
  'Approve report',
  'Notify employee',
  'Archive to records',
];
const INSERTION_A_DUR = [1500, 8000, 5000, 4000, 2000, 1000];

const INSERTION_B_CATS = [
  'click_then_navigate',
  'data_entry',
  'fill_and_submit',
  'single_action',    // extra step: manager review
  'send_action',
  'single_action',
];

const SHORTCUT_CATS = [
  'click_then_navigate',
  'data_entry',
  'fill_and_submit',
  'single_action',    // skips notify
];

const REWORK_CATS = [
  'click_then_navigate',
  'data_entry',
  'fill_and_submit',
  'data_entry',       // rework
  'fill_and_submit',
  'send_action',
  'single_action',
];

const EXCEPTION_CATS = [
  'click_then_navigate',
  'data_entry',
  'fill_and_submit',
  'error_handling',   // notification failed
  'error_handling',   // escalate
  'send_action',
  'single_action',
];

function makeVariant(
  id: string,
  isStandard: boolean,
  runCount: number,
  frequency: number,
  cats: string[],
  titles?: string[],
  durs?: number[],
  evidenceRunIds?: string[],
): VariantInput {
  const v: VariantInput = {
    id,
    isStandard,
    runCount,
    frequency,
    stepCategories: cats,
    evidenceRunIds: evidenceRunIds ?? [],
  };
  if (titles !== undefined) v.stepTitles = titles;
  if (durs !== undefined) v.stepDurationsMs = durs;
  return v;
}

const TOTAL_RUNS = 16;

const ALL_VARIANTS: VariantInput[] = [
  makeVariant('std',      true,  5, 5/16, STANDARD_CATS,    STANDARD_TITLES,    STANDARD_DUR,    ['r1','r2','r3','r4','r5']),
  makeVariant('ins_a',    false, 3, 3/16, INSERTION_A_CATS, INSERTION_A_TITLES, INSERTION_A_DUR, ['r6','r7','r8']),
  makeVariant('ins_b',    false, 2, 2/16, INSERTION_B_CATS, undefined, undefined, ['r9','r10']),
  makeVariant('shortcut', false, 2, 2/16, SHORTCUT_CATS,    undefined, undefined, ['r11','r12']),
  makeVariant('rework',   false, 2, 2/16, REWORK_CATS,      undefined, undefined, ['r13','r14']),
  makeVariant('except',   false, 2, 2/16, EXCEPTION_CATS,   undefined, undefined, ['r15','r16']),
];

// ─── Guards ───────────────────────────────────────────────────────────────────

describe('buildVariantFlowModel — guards', () => {
  it('returns null for a single variant', () => {
    expect(buildVariantFlowModel({ variants: [ALL_VARIANTS[0]!], totalRuns: 5 })).toBeNull();
  });

  it('returns null when all variants have no steps', () => {
    expect(buildVariantFlowModel({
      variants: [
        { id: 'a', isStandard: true,  runCount: 2, frequency: 0.5, stepCategories: [] },
        { id: 'b', isStandard: false, runCount: 2, frequency: 0.5, stepCategories: [] },
      ],
      totalRuns: 4,
    })).toBeNull();
  });

  it('returns null when only one variant has steps', () => {
    expect(buildVariantFlowModel({
      variants: [
        { id: 'a', isStandard: true,  runCount: 2, frequency: 0.5, stepCategories: ['click_then_navigate'] },
        { id: 'b', isStandard: false, runCount: 2, frequency: 0.5, stepCategories: [] },
      ],
      totalRuns: 4,
    })).toBeNull();
  });
});

// ─── Main fixture: 6-variant scenario ────────────────────────────────────────

describe('buildVariantFlowModel — sample fixture (6 variants, 16 runs)', () => {
  const model = buildVariantFlowModel({ variants: ALL_VARIANTS, totalRuns: TOTAL_RUNS })!;

  it('returns a model (not null)', () => {
    expect(model).not.toBeNull();
  });

  it('has start and end terminal nodes', () => {
    const starts = model.nodes.filter((n) => n.nodeType === 'start');
    const ends   = model.nodes.filter((n) => n.nodeType === 'end');
    expect(starts).toHaveLength(1);
    expect(ends).toHaveLength(1);
  });

  it('backbone has exactly 5 nodes matching the STANDARD path', () => {
    // The 5 STANDARD steps become backbone nodes (task or decision)
    const backbone = model.nodes.filter(
      (n) => n.id.startsWith('vfm-bb-') &&
             (n.nodeType === 'task' || n.nodeType === 'decision'),
    );
    expect(backbone).toHaveLength(5);
  });

  it('uses real step labels on backbone (not just category labels)', () => {
    const backbone = model.nodes.filter((n) => n.id.startsWith('vfm-bb-'));
    // At least two backbone nodes should carry the exact real title
    const realTitles = ['Open expense report', 'Review line items', 'Approve report'];
    for (const expected of realTitles) {
      expect(backbone.some((n) => n.label === expected)).toBe(true);
    }
  });

  it('inserts decision nodes at real divergence points', () => {
    const decisions = model.nodes.filter((n) => n.isDecisionPoint);
    // The INSERTION_A diverges after data_entry (index 1); 'Review line items'
    // INSERTION_B diverges after fill_and_submit (index 2); 'Approve report'
    expect(decisions.length).toBeGreaterThanOrEqual(1);
    expect(decisions.every((n) => n.nodeType === 'decision')).toBe(true);
  });

  it('has branch nodes for INSERTION_A (Request clarification)', () => {
    const branch = model.nodes.filter((n) => n.id.startsWith('vfm-br-'));
    expect(branch.length).toBeGreaterThan(0);
  });

  it('branch nodes use real step titles when available', () => {
    // INSERTION_A has stepTitles; 'Request clarification' should appear on its branch node
    const branch = model.nodes.filter((n) => n.id.startsWith('vfm-br-'));
    expect(branch.some((n) => n.label === 'Request clarification')).toBe(true);
  });

  it('all edges flow forward — no backward arrows', () => {
    const posById = new Map(model.nodes.map((n) => [n.id, n.position]));
    for (const edge of model.edges) {
      const sx = posById.get(edge.sourceId)?.x ?? 0;
      const tx = posById.get(edge.targetId)?.x ?? 0;
      expect(tx).toBeGreaterThanOrEqual(sx);
    }
  });

  it('edges carry honest frequency labels (N runs · X%)', () => {
    const labeled = model.edges.filter((e) => e.label && e.label.includes('run'));
    expect(labeled.length).toBeGreaterThan(0);
    for (const e of labeled) {
      // Must contain "run" (N runs) and "%" (percentage) — observed-count language
      expect(e.label).toMatch(/\d+\s+run/);
      expect(e.label).toMatch(/\d+%/);
      // Must NOT contain forward-only conditions ("if", "else", "when", "when", etc.)
      expect(e.label.toLowerCase()).not.toMatch(/\bif\b|\belse\b|\bwhen\b|\bcondition\b/);
    }
  });

  it('decision labels use observed-count language (never fabricated conditions)', () => {
    const decisions = model.nodes.filter((n) => n.isDecisionPoint);
    for (const d of decisions) {
      // Must contain observed-count language
      expect(d.decisionLabel).toMatch(/\d+ of \d+ run/);
      // Must NOT contain business-condition fabrications
      const lower = d.decisionLabel.toLowerCase();
      expect(lower).not.toMatch(/\bif\b|\belse\b|\bwhen\b|\bthen\b|\bcondition\b|\bgate\b/);
    }
  });

  it('has both sequence and decision edges', () => {
    const seqEdges = model.edges.filter((e) => e.type === 'sequence');
    const decEdges = model.edges.filter((e) => e.type === 'decision');
    expect(seqEdges.length).toBeGreaterThan(0);
    expect(decEdges.length).toBeGreaterThan(0);
  });

  it('hasDecisions flag is true', () => {
    expect(model.hasDecisions).toBe(true);
  });

  it('variants array is populated', () => {
    expect(model.variants.length).toBe(6);
    expect(model.variants.some((v) => v.isStandard)).toBe(true);
  });

  it('all node IDs are unique', () => {
    const ids = model.nodes.map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all edge IDs are unique', () => {
    const ids = model.edges.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all edge source and target IDs reference existing nodes', () => {
    const nodeIdSet = new Set(model.nodes.map((n) => n.id));
    for (const e of model.edges) {
      expect(nodeIdSet.has(e.sourceId)).toBe(true);
      expect(nodeIdSet.has(e.targetId)).toBe(true);
    }
  });
});

// ─── Determinism ─────────────────────────────────────────────────────────────

describe('buildVariantFlowModel — determinism', () => {
  it('produces byte-identical nodes and positions on repeated calls', () => {
    const a = buildVariantFlowModel({ variants: ALL_VARIANTS, totalRuns: TOTAL_RUNS });
    const b = buildVariantFlowModel({ variants: ALL_VARIANTS, totalRuns: TOTAL_RUNS });
    expect(a).toEqual(b);
    // Compare positions specifically
    const coordsA = a!.nodes.map((n) => [n.id, n.position.x, n.position.y]);
    const coordsB = b!.nodes.map((n) => [n.id, n.position.x, n.position.y]);
    expect(coordsA).toEqual(coordsB);
  });

  it('is permutation-invariant (same result regardless of variant order)', () => {
    const reversed = [...ALL_VARIANTS].reverse();
    const a = buildVariantFlowModel({ variants: ALL_VARIANTS, totalRuns: TOTAL_RUNS });
    const b = buildVariantFlowModel({ variants: reversed, totalRuns: TOTAL_RUNS });
    // Node and edge IDs should be equal, just input order differs
    expect(a!.nodes.map((n) => n.id)).toEqual(b!.nodes.map((n) => n.id));
    expect(a!.edges.map((e) => e.id)).toEqual(b!.edges.map((e) => e.id));
  });
});

// ─── Two-variant minimal case ─────────────────────────────────────────────────

describe('buildVariantFlowModel — minimal 2-variant case', () => {
  const STD = makeVariant('v1', true,  7, 0.7,
    ['click', 'fill', 'submit'], ['Click it', 'Fill form', 'Submit'], [100, 200, 150]);
  const VAR = makeVariant('v2', false, 3, 0.3,
    ['click', 'fill', 'validate', 'submit'], ['Click it', 'Fill form', 'Validate', 'Submit'],
    [100, 200, 300, 150]);

  const model = buildVariantFlowModel({ variants: [STD, VAR], totalRuns: 10 })!;

  it('builds a model', () => expect(model).not.toBeNull());

  it('spine has 3 nodes matching STD', () => {
    const spine = model.nodes.filter((n) => n.id.startsWith('vfm-bb-'));
    expect(spine).toHaveLength(3);
  });

  it('all edges flow forward', () => {
    const posById = new Map(model.nodes.map((n) => [n.id, n.position]));
    for (const e of model.edges) {
      const sx = posById.get(e.sourceId)?.x ?? 0;
      const tx = posById.get(e.targetId)?.x ?? 0;
      expect(tx).toBeGreaterThanOrEqual(sx);
    }
  });

  it('branch rejoins the spine', () => {
    // There should be at least one decision edge targeting a backbone node
    const rejoins = model.edges.filter(
      (e) => e.type === 'decision' && e.targetId.startsWith('vfm-bb-'),
    );
    expect(rejoins.length).toBeGreaterThan(0);
  });

  it('decision label is observed-count language', () => {
    const d = model.nodes.find((n) => n.isDecisionPoint);
    expect(d).toBeDefined();
    expect(d!.decisionLabel).toMatch(/\d+ of \d+ run/);
  });
});
