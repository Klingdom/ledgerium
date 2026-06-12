/**
 * shapeResolver — unit tests (P0-2)
 *
 * Covers:
 *  - Totality: every ViewNodeType × decisionProvenance combination produces
 *    exactly one deterministic ShapeSpec.
 *  - Load-bearing: 'inferred' and null decisions NEVER yield 'decision' or
 *    'decision-validation' shapes — this is the honesty chokepoint.
 *  - observed-divergence → solid 'decision'
 *  - observed-validation → dashed 'decision-validation'
 *  - start/end → 'terminal' regardless of provenance
 *  - task/exception → 'process' regardless of provenance
 *  - Determinism: calling twice with identical input yields identical output.
 */

import { describe, it, expect } from 'vitest';
import { resolveShape, type VisioShape, type RFNodeType } from './shapeResolver';
import type { ViewNode } from './viewModel';

// ─── Helpers ──────────────────────────────────────────────────────────────────

type Provenance = ViewNode['decisionProvenance'];

function makeNode(
  nodeType: ViewNode['nodeType'],
  decisionProvenance: Provenance,
): ViewNode {
  return {
    id: 'test-node',
    stepId: '',
    ordinal: 1,
    label: 'Test',
    shortLabel: 'Test',
    nodeType,
    category: 'single_action',
    categoryLabel: 'Single Action',
    position: { x: 0, y: 0 },
    phaseId: null,
    system: '',
    systems: [],
    pageTitle: '',
    routeTemplate: '',
    dominantAction: '',
    durationMs: 0,
    durationLabel: '',
    eventCount: 0,
    humanEventCount: 0,
    confidence: 0.9,
    isDecisionPoint: nodeType === 'decision',
    decisionLabel: '',
    isExceptionPath: nodeType === 'exception',
    hasSensitiveData: false,
    isLowConfidence: false,
    frictionIndicators: [],
    hasHighFriction: false,
    accentColor: '#000',
    bgColor: '#fff',
    bgHoverColor: '#f0f0f0',
    textColor: '#000',
    operationalDefinition: '',
    procedure: '',
    expectedOutcome: '',
    warnings: [],
    automationScore: null,
    frequency: null,
    decisionProvenance,
  };
}

// All provenance values (including null)
const ALL_PROVENANCES: Provenance[] = [
  'observed-divergence',
  'observed-validation',
  'inferred',
  null,
];

// ─── Terminal nodes ───────────────────────────────────────────────────────────

describe('resolveShape — terminal nodes (start/end)', () => {
  for (const prov of ALL_PROVENANCES) {
    it(`start + provenance=${String(prov)} → terminal / terminalNode`, () => {
      const spec = resolveShape(makeNode('start', prov));
      expect(spec.shape).toBe<VisioShape>('terminal');
      expect(spec.rfType).toBe<RFNodeType>('terminalNode');
    });

    it(`end + provenance=${String(prov)} → terminal / terminalNode`, () => {
      const spec = resolveShape(makeNode('end', prov));
      expect(spec.shape).toBe<VisioShape>('terminal');
      expect(spec.rfType).toBe<RFNodeType>('terminalNode');
    });
  }
});

// ─── Task nodes ───────────────────────────────────────────────────────────────

describe('resolveShape — task nodes', () => {
  for (const prov of ALL_PROVENANCES) {
    it(`task + provenance=${String(prov)} → process / taskNode`, () => {
      const spec = resolveShape(makeNode('task', prov));
      expect(spec.shape).toBe<VisioShape>('process');
      expect(spec.rfType).toBe<RFNodeType>('taskNode');
    });
  }
});

// ─── Exception nodes ─────────────────────────────────────────────────────────

describe('resolveShape — exception nodes', () => {
  for (const prov of ALL_PROVENANCES) {
    it(`exception + provenance=${String(prov)} → process / taskNode`, () => {
      const spec = resolveShape(makeNode('exception', prov));
      expect(spec.shape).toBe<VisioShape>('process');
      expect(spec.rfType).toBe<RFNodeType>('taskNode');
    });
  }
});

// ─── Decision nodes — the load-bearing chokepoint ────────────────────────────

describe('resolveShape — decision nodes (honesty chokepoint)', () => {
  it('decision + observed-divergence → solid decision diamond (decisionNode)', () => {
    const spec = resolveShape(makeNode('decision', 'observed-divergence'));
    expect(spec.shape).toBe<VisioShape>('decision');
    expect(spec.rfType).toBe<RFNodeType>('decisionNode');
  });

  it('decision + observed-validation → dashed decision-validation diamond (decisionNode)', () => {
    const spec = resolveShape(makeNode('decision', 'observed-validation'));
    expect(spec.shape).toBe<VisioShape>('decision-validation');
    expect(spec.rfType).toBe<RFNodeType>('decisionNode');
  });

  // LOAD-BEARING: inferred must NEVER produce a diamond
  it('decision + inferred → process box (taskNode) — NEVER a diamond', () => {
    const spec = resolveShape(makeNode('decision', 'inferred'));
    expect(spec.shape).toBe<VisioShape>('process');
    expect(spec.rfType).toBe<RFNodeType>('taskNode');
    // Explicit non-diamond assertion — the chokepoint guarantee
    expect(spec.shape).not.toBe('decision');
    expect(spec.shape).not.toBe('decision-validation');
  });

  // LOAD-BEARING: null provenance must NEVER produce a diamond
  it('decision + null → process box (taskNode) — NEVER a diamond', () => {
    const spec = resolveShape(makeNode('decision', null));
    expect(spec.shape).toBe<VisioShape>('process');
    expect(spec.rfType).toBe<RFNodeType>('taskNode');
    // Explicit non-diamond assertion — the chokepoint guarantee
    expect(spec.shape).not.toBe('decision');
    expect(spec.shape).not.toBe('decision-validation');
  });
});

// ─── Totality — every combination covered ────────────────────────────────────

describe('resolveShape — totality over all ViewNodeType × decisionProvenance', () => {
  const ALL_NODE_TYPES: ViewNode['nodeType'][] = ['start', 'end', 'task', 'decision', 'exception'];

  it('returns a well-formed ShapeSpec for every combination', () => {
    const validShapes: VisioShape[] = ['terminal', 'process', 'decision', 'decision-validation'];
    const validRFTypes: RFNodeType[] = ['taskNode', 'decisionNode', 'terminalNode'];

    for (const nodeType of ALL_NODE_TYPES) {
      for (const prov of ALL_PROVENANCES) {
        const spec = resolveShape(makeNode(nodeType, prov));
        expect(validShapes).toContain(spec.shape);
        expect(validRFTypes).toContain(spec.rfType);
      }
    }
  });

  it('shape and rfType are always consistent (decisionNode ↔ decision/decision-validation)', () => {
    for (const nodeType of ALL_NODE_TYPES) {
      for (const prov of ALL_PROVENANCES) {
        const spec = resolveShape(makeNode(nodeType, prov));
        if (spec.rfType === 'decisionNode') {
          expect(['decision', 'decision-validation']).toContain(spec.shape);
        }
        if (spec.shape === 'decision' || spec.shape === 'decision-validation') {
          expect(spec.rfType).toBe('decisionNode');
        }
        if (spec.rfType === 'terminalNode') {
          expect(spec.shape).toBe('terminal');
        }
        if (spec.rfType === 'taskNode') {
          expect(spec.shape).toBe('process');
        }
      }
    }
  });
});

// ─── Determinism ─────────────────────────────────────────────────────────────

describe('resolveShape — determinism', () => {
  it('returns identical result on repeated calls with the same input', () => {
    const node = makeNode('decision', 'observed-divergence');
    const a = resolveShape(node);
    const b = resolveShape(node);
    expect(a).toEqual(b);
  });

  it('returns identical result for inferred on repeated calls', () => {
    const node = makeNode('decision', 'inferred');
    const a = resolveShape(node);
    const b = resolveShape(node);
    expect(a).toEqual(b);
    // And still a process box, not a diamond
    expect(a.shape).toBe('process');
  });
});
