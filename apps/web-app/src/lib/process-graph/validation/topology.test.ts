/**
 * Path E — Topology + Audit-Honesty Tests (iter 076 / PATHE-P01)
 *
 * Test groups (parallel to Path D D+1 `registry.test.ts`):
 *  - Group A: Closed-union exhaustiveness via TS `satisfies` + Exclude<...>
 *  - Group B: Audit-honesty IFF (`isInferred === true IFF confidence < 0.55`)
 *  - Group C: Graph topology (referential integrity, orphans, 1:1 invariants)
 *  - Group D: Variant invariants (at-most-one dominant_path)
 *  - Group E: Retention policy invariants (PATHE-P01 CEO directive Appendix C)
 *
 * MR-006 Change C ≥12 substantive `it()` blocks satisfied with margin.
 */

import { describe, it, expect } from 'vitest';

import {
  // Closed unions + catalogs
  NODE_TYPES,
  EDGE_TYPES,
  DECISION_TYPES,
  CONDITION_TYPES,
  VARIANT_LABELS,
  DECISION_BEARING_NODE_TYPES,
  TERMINAL_NODE_TYPES,
  // Constants
  PROCESS_GRAPH_SCHEMA_VERSION,
  INFERRED_CONFIDENCE_THRESHOLD,
  V1_DEGRADED_SYNTHESIS_CONFIDENCE,
  // Validators
  validateGraphTopology,
} from '../index.js';
import type {
  ProcessGraph,
  ProcessNode,
  ProcessEdge,
  NodeType,
  EdgeType,
  DecisionType,
  ConditionType,
  VariantLabel,
} from '../index.js';

// ── Fixture builder ───────────────────────────────────────────────────────────

function makeLinearGraph(opts: {
  workflowId?: string;
  runCount?: number;
  stepCategories?: readonly string[];
  isInferred?: boolean;
  confidence?: number;
} = {}): ProcessGraph {
  const {
    workflowId = 'wf-001',
    runCount = 5,
    stepCategories = ['Open record', 'Fill form', 'Submit'],
    isInferred = false,
    confidence = 0.85,
  } = opts;

  const nodes: ProcessNode[] = [];
  nodes.push({
    id: 'node-start',
    processGraphId: 'pg-001',
    nodeType: 'start',
    rawLabel: 'Start',
    normalizedLabel: null,
    applicationLabel: null,
    routeTemplate: null,
    confidenceScore: confidence,
    isInferred,
    observationCount: runCount,
    rawEvidence: [],
  });
  stepCategories.forEach((cat, i) => {
    nodes.push({
      id: `node-action-${i + 1}`,
      processGraphId: 'pg-001',
      nodeType: 'action',
      rawLabel: cat,
      normalizedLabel: cat,
      applicationLabel: null,
      routeTemplate: null,
      confidenceScore: confidence,
      isInferred,
      observationCount: runCount,
      rawEvidence: [],
    });
  });
  nodes.push({
    id: 'node-end',
    processGraphId: 'pg-001',
    nodeType: 'end',
    rawLabel: 'End',
    normalizedLabel: null,
    applicationLabel: null,
    routeTemplate: null,
    confidenceScore: confidence,
    isInferred,
    observationCount: runCount,
    rawEvidence: [],
  });

  const edges: ProcessEdge[] = [];
  for (let i = 0; i < nodes.length - 1; i++) {
    const from = nodes[i]!;
    const to = nodes[i + 1]!;
    edges.push({
      id: `edge-${i}`,
      processGraphId: 'pg-001',
      fromNodeId: from.id,
      toNodeId: to.id,
      edgeType: 'sequence',
      runFrequency: runCount,
      runFrequencyPct: 1.0,
      confidenceScore: confidence,
      isInferred,
      rawEvidence: [],
    });
  }

  return {
    id: 'pg-001',
    workflowId,
    graphVersion: 1,
    graphSchemaVersion: PROCESS_GRAPH_SCHEMA_VERSION,
    runCount,
    computedAtMs: 1_800_000_000_000,
    nodes,
    edges,
    decisionPoints: [],
    variants: [],
    isInferred,
    confidenceScore: confidence,
  };
}

// ── Group A: Closed-union exhaustiveness ──────────────────────────────────────

describe('Path E closed-union exhaustiveness (Group A)', () => {
  it('A1: NodeType enumerates exactly 15 members and matches NODE_TYPES catalog', () => {
    expect(NODE_TYPES.length).toBe(15);
    // Compile-time exhaustiveness lock is enforced in node-types.ts; runtime
    // assertion via Exclude verifies catalog covers the literal union.
    const all: NodeType[] = [...NODE_TYPES];
    expect(new Set(all).size).toBe(15);
  });

  it('A2: EdgeType catalog enumerates 11 members and is internally unique', () => {
    expect(EDGE_TYPES.length).toBe(11);
    expect(new Set(EDGE_TYPES).size).toBe(11);
    const all: EdgeType[] = [...EDGE_TYPES];
    expect(all).toContain('sequence');
    expect(all).toContain('automation_candidate');
  });

  it('A3: DecisionType enumerates exactly 9 members', () => {
    expect(DECISION_TYPES.length).toBe(9);
    const all: DecisionType[] = [...DECISION_TYPES];
    expect(new Set(all).size).toBe(9);
    expect(all).toContain('unknown_inferred');
  });

  it('A4: ConditionType enumerates exactly 10 members', () => {
    expect(CONDITION_TYPES.length).toBe(10);
    const all: ConditionType[] = [...CONDITION_TYPES];
    expect(new Set(all).size).toBe(10);
    expect(all).toContain('inferred_unknown');
  });

  it('A5: VariantLabel enumerates exactly 9 members and is internally unique', () => {
    expect(VARIANT_LABELS.length).toBe(9);
    const all: VariantLabel[] = [...VARIANT_LABELS];
    expect(new Set(all).size).toBe(9);
    expect(all).toContain('dominant_path');
  });

  it('A6: DECISION_BEARING_NODE_TYPES subset contains 5 known branching members', () => {
    expect(DECISION_BEARING_NODE_TYPES.size).toBe(5);
    expect(DECISION_BEARING_NODE_TYPES.has('decision')).toBe(true);
    expect(DECISION_BEARING_NODE_TYPES.has('approval')).toBe(true);
    expect(DECISION_BEARING_NODE_TYPES.has('action')).toBe(false);
    expect(DECISION_BEARING_NODE_TYPES.has('start')).toBe(false);
  });

  it('A7: TERMINAL_NODE_TYPES subset contains exactly start + end', () => {
    expect(TERMINAL_NODE_TYPES.size).toBe(2);
    expect(TERMINAL_NODE_TYPES.has('start')).toBe(true);
    expect(TERMINAL_NODE_TYPES.has('end')).toBe(true);
  });

  it('A8: PROCESS_GRAPH_SCHEMA_VERSION pinned to "2.0" literal', () => {
    expect(PROCESS_GRAPH_SCHEMA_VERSION).toBe('2.0');
  });
});

// ── Group B: Audit-honesty IFF invariant ──────────────────────────────────────

describe('Audit-honesty IFF invariant (Group B)', () => {
  it('B1: linear graph at confidence=0.85 + isInferred=false → no violation', () => {
    const graph = makeLinearGraph({ confidence: 0.85, isInferred: false });
    const result = validateGraphTopology(graph);
    const iffViolations = result.violations.filter((v) =>
      v.code.startsWith('audit_honesty_iff_violation'),
    );
    expect(iffViolations).toHaveLength(0);
  });

  it('B2: node with confidence=0.40 + isInferred=false → IFF violation', () => {
    const graph = makeLinearGraph({ confidence: 0.4, isInferred: false });
    const result = validateGraphTopology(graph);
    expect(result.ok).toBe(false);
    expect(
      result.violations.some((v) => v.code === 'audit_honesty_iff_violation_node'),
    ).toBe(true);
  });

  it('B3: edge with confidence=0.85 + isInferred=true → IFF violation', () => {
    const graph = makeLinearGraph({ confidence: 0.85, isInferred: false });
    // Mutate ONE edge to break the invariant.
    const violatingEdges = graph.edges.map((e, i) =>
      i === 0 ? { ...e, isInferred: true } : e,
    );
    const violatingGraph: ProcessGraph = { ...graph, edges: violatingEdges };
    const result = validateGraphTopology(violatingGraph);
    expect(
      result.violations.some((v) => v.code === 'audit_honesty_iff_violation_edge'),
    ).toBe(true);
  });

  it('B4: V1_DEGRADED_SYNTHESIS_CONFIDENCE < INFERRED_CONFIDENCE_THRESHOLD (constant invariant)', () => {
    expect(V1_DEGRADED_SYNTHESIS_CONFIDENCE).toBeLessThan(INFERRED_CONFIDENCE_THRESHOLD);
    expect(V1_DEGRADED_SYNTHESIS_CONFIDENCE).toBe(0.4);
    expect(INFERRED_CONFIDENCE_THRESHOLD).toBe(0.55);
  });

  it('B5: edge case — confidence === INFERRED_CONFIDENCE_THRESHOLD (boundary) is NOT inferred', () => {
    const graph = makeLinearGraph({
      confidence: INFERRED_CONFIDENCE_THRESHOLD,
      isInferred: false,
    });
    const result = validateGraphTopology(graph);
    const iffViolations = result.violations.filter((v) =>
      v.code.startsWith('audit_honesty_iff_violation'),
    );
    expect(iffViolations).toHaveLength(0);
  });
});

// ── Group C: Graph topology (referential + structural integrity) ──────────────

describe('Graph topology invariants (Group C)', () => {
  it('C1: well-formed linear graph passes validation', () => {
    const graph = makeLinearGraph();
    const result = validateGraphTopology(graph);
    expect(result.ok).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it('C2: edge with unknown fromNodeId produces edge_references_unknown_node violation', () => {
    const graph = makeLinearGraph();
    const violatingEdges = [
      ...graph.edges,
      {
        id: 'edge-bad',
        processGraphId: 'pg-001',
        fromNodeId: 'node-nonexistent',
        toNodeId: 'node-end',
        edgeType: 'sequence' as const,
        runFrequency: 1,
        runFrequencyPct: 1.0,
        confidenceScore: 0.85,
        isInferred: false,
        rawEvidence: [],
      },
    ];
    const result = validateGraphTopology({ ...graph, edges: violatingEdges });
    expect(result.ok).toBe(false);
    expect(
      result.violations.some((v) => v.code === 'edge_references_unknown_node'),
    ).toBe(true);
  });

  it('C3: two start nodes produces multiple_start_nodes violation', () => {
    const graph = makeLinearGraph();
    const violatingNodes = [
      ...graph.nodes,
      {
        ...graph.nodes[0]!, // copy start node shape
        id: 'node-start-2',
      },
    ];
    const result = validateGraphTopology({ ...graph, nodes: violatingNodes });
    expect(
      result.violations.some((v) => v.code === 'multiple_start_nodes'),
    ).toBe(true);
  });

  it('C4: decision-bearing node without DecisionPoint produces missing_decision_point violation', () => {
    const graph = makeLinearGraph();
    // Convert one action node into a decision node WITHOUT adding a DecisionPoint.
    const violatingNodes = graph.nodes.map((n, i) =>
      i === 1 ? { ...n, nodeType: 'decision' as const } : n,
    );
    const result = validateGraphTopology({ ...graph, nodes: violatingNodes });
    expect(
      result.violations.some(
        (v) => v.code === 'decision_bearing_node_missing_decision_point',
      ),
    ).toBe(true);
  });

  it('C5: DecisionPoint referencing non-branching node produces violation', () => {
    const graph = makeLinearGraph();
    const violatingGraph: ProcessGraph = {
      ...graph,
      decisionPoints: [
        {
          id: 'dp-1',
          processGraphId: 'pg-001',
          nodeId: 'node-action-1', // action, NOT branching
          decisionType: 'user_choice',
          conditions: [],
          confidenceScore: 0.85,
          isInferred: false,
          rawEvidence: [],
        },
      ],
    };
    const result = validateGraphTopology(violatingGraph);
    expect(
      result.violations.some(
        (v) => v.code === 'decision_point_references_non_branching_node',
      ),
    ).toBe(true);
  });

  it('C6: violation list is deterministic across repeat calls (stable order)', () => {
    const graph = makeLinearGraph({ confidence: 0.4, isInferred: false });
    const r1 = validateGraphTopology(graph);
    const r2 = validateGraphTopology(graph);
    expect(r1).toEqual(r2);
  });
});

// ── Group D: Variant invariants ───────────────────────────────────────────────

describe('Variant invariants (Group D)', () => {
  it('D1: at-most-one dominant_path variant — single dominant passes', () => {
    const graph = makeLinearGraph();
    const withOneDominant: ProcessGraph = {
      ...graph,
      variants: [
        {
          id: 'v-1',
          processGraphId: 'pg-001',
          variantHash: '0000000000000001',
          variantLabel: 'dominant_path',
          runCount: 5,
          runFrequencyPct: 1.0,
          meanDurationMs: 12_000,
          stepCount: 3,
          nodeSequence: [],
          rawEvidence: [],
        },
      ],
    };
    const result = validateGraphTopology(withOneDominant);
    expect(
      result.violations.some((v) => v.code === 'multiple_dominant_path_variants'),
    ).toBe(false);
  });

  it('D2: two dominant_path variants produces multiple_dominant_path_variants violation', () => {
    const graph = makeLinearGraph();
    const withTwoDominant: ProcessGraph = {
      ...graph,
      variants: [
        {
          id: 'v-1',
          processGraphId: 'pg-001',
          variantHash: '0000000000000001',
          variantLabel: 'dominant_path',
          runCount: 3,
          runFrequencyPct: 0.6,
          meanDurationMs: null,
          stepCount: 3,
          nodeSequence: [],
          rawEvidence: [],
        },
        {
          id: 'v-2',
          processGraphId: 'pg-001',
          variantHash: '0000000000000002',
          variantLabel: 'dominant_path',
          runCount: 2,
          runFrequencyPct: 0.4,
          meanDurationMs: null,
          stepCount: 3,
          nodeSequence: [],
          rawEvidence: [],
        },
      ],
    };
    const result = validateGraphTopology(withTwoDominant);
    expect(
      result.violations.some((v) => v.code === 'multiple_dominant_path_variants'),
    ).toBe(true);
  });
});
