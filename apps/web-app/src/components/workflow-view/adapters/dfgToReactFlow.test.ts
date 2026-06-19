/**
 * dfgToReactFlow.test.ts — unit tests for the pure DFG → React-Flow adapter.
 *
 * Tests use the ARCHITECTURE_DFG.md §6 weight-formula values:
 *   strokeWidth = 1 + weight * 4  →  [1.0, 5.0]
 *   opacity     = 0.25 + weight * 0.75  →  [0.25, 1.00]
 */
import { describe, it, expect } from 'vitest';
import {
  dfgToReactFlow,
  strokeWidthFromWeight,
  opacityFromWeight,
  type DfgFlowNode,
  type DfgFlowEdge,
} from './dfgToReactFlow';
import type { DirectlyFollowsGraph } from '@/lib/dfgModel';

// ─── Minimal fixture builder ───────────────────────────────────────────────────

/**
 * Build a tiny DFG: [START] --10--> [A] --8--> [END]
 * maxEdgeFrequency = 10, maxNodeFrequency = 8 (activity A)
 */
function minimalDfg(): DirectlyFollowsGraph {
  return {
    version: 2,
    nodes: [
      { id: '__start__', kind: 'start',    category: 'terminal', label: 'Start', caseCount: 10, evidenceRunIds: [], durationSampleCount: 0, meanDurationMs: 0, medianDurationMs: 0, p95DurationMs: 0 },
      { id: 'A',         kind: 'activity', category: 'nav',      label: 'Step A', caseCount: 8,  evidenceRunIds: ['r1', 'r2'], durationSampleCount: 0, meanDurationMs: 0, medianDurationMs: 0, p95DurationMs: 0 },
      { id: '__end__',   kind: 'end',      category: 'terminal', label: 'End',   caseCount: 10, evidenceRunIds: [], durationSampleCount: 0, meanDurationMs: 0, medianDurationMs: 0, p95DurationMs: 0 },
    ],
    edges: [
      { id: 'e1', sourceId: '__start__', targetId: 'A',       caseCount: 10, evidenceRunIds: [], durationSampleCount: 0, meanDurationMs: 0, medianDurationMs: 0, p95DurationMs: 0 },
      { id: 'e2', sourceId: 'A',         targetId: '__end__', caseCount: 8,  evidenceRunIds: ['r1'], durationSampleCount: 0, meanDurationMs: 0, medianDurationMs: 0, p95DurationMs: 0 },
    ],
    totalRuns: 10,
    maxEdgeFrequency: 10,
    maxNodeFrequency: 8,
  };
}

/**
 * A DFG with two parallel paths:
 *   [START] -> [A] -> [END]
 *           -> [B] -> [END]
 * maxEdgeFrequency = 6, maxNodeFrequency = 6
 */
function parallelDfg(): DirectlyFollowsGraph {
  return {
    version: 2,
    nodes: [
      { id: '__start__', kind: 'start',    category: 'terminal', label: 'Start', caseCount: 10, evidenceRunIds: [], durationSampleCount: 0, meanDurationMs: 0, medianDurationMs: 0, p95DurationMs: 0 },
      { id: 'A',         kind: 'activity', category: 'nav',      label: 'A',     caseCount: 6,  evidenceRunIds: ['r1'], durationSampleCount: 0, meanDurationMs: 0, medianDurationMs: 0, p95DurationMs: 0 },
      { id: 'B',         kind: 'activity', category: 'nav',      label: 'B',     caseCount: 4,  evidenceRunIds: ['r2'], durationSampleCount: 0, meanDurationMs: 0, medianDurationMs: 0, p95DurationMs: 0 },
      { id: '__end__',   kind: 'end',      category: 'terminal', label: 'End',   caseCount: 10, evidenceRunIds: [], durationSampleCount: 0, meanDurationMs: 0, medianDurationMs: 0, p95DurationMs: 0 },
    ],
    edges: [
      { id: 'e1', sourceId: '__start__', targetId: 'A',       caseCount: 6, evidenceRunIds: [], durationSampleCount: 0, meanDurationMs: 0, medianDurationMs: 0, p95DurationMs: 0 },
      { id: 'e2', sourceId: '__start__', targetId: 'B',       caseCount: 4, evidenceRunIds: [], durationSampleCount: 0, meanDurationMs: 0, medianDurationMs: 0, p95DurationMs: 0 },
      { id: 'e3', sourceId: 'A',         targetId: '__end__', caseCount: 6, evidenceRunIds: [], durationSampleCount: 0, meanDurationMs: 0, medianDurationMs: 0, p95DurationMs: 0 },
      { id: 'e4', sourceId: 'B',         targetId: '__end__', caseCount: 4, evidenceRunIds: [], durationSampleCount: 0, meanDurationMs: 0, medianDurationMs: 0, p95DurationMs: 0 },
    ],
    totalRuns: 10,
    maxEdgeFrequency: 6,
    maxNodeFrequency: 6,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('dfgToReactFlow — node count and ids', () => {
  it('produces one React-Flow node per DFG node', () => {
    const { nodes } = dfgToReactFlow(minimalDfg());
    expect(nodes).toHaveLength(3);
  });

  it('preserves node ids from the DFG', () => {
    const { nodes } = dfgToReactFlow(minimalDfg());
    const ids = nodes.map((n) => n.id).sort();
    expect(ids).toEqual(['A', '__end__', '__start__'].sort());
  });

  it('assigns type "dfgNode" to all nodes', () => {
    const { nodes } = dfgToReactFlow(minimalDfg());
    expect(nodes.every((n) => n.type === 'dfgNode')).toBe(true);
  });
});

describe('dfgToReactFlow — edge count and ids', () => {
  it('produces one React-Flow edge per DFG edge', () => {
    const { edges } = dfgToReactFlow(minimalDfg());
    expect(edges).toHaveLength(2);
  });

  it('preserves edge ids and source/target references', () => {
    const { edges } = dfgToReactFlow(minimalDfg());
    const e1 = edges.find((e) => e.id === 'e1')!;
    expect(e1).toBeDefined();
    expect(e1.source).toBe('__start__');
    expect(e1.target).toBe('A');
  });

  it('assigns type "dfgEdge" to all edges', () => {
    const { edges } = dfgToReactFlow(minimalDfg());
    expect(edges.every((e) => e.type === 'dfgEdge')).toBe(true);
  });
});

describe('dfgToReactFlow — weight computation', () => {
  it('computes edge weight = caseCount / maxEdgeFrequency', () => {
    const { edges } = dfgToReactFlow(minimalDfg());
    const e1 = edges.find((e) => e.id === 'e1')!;
    // e1.caseCount=10, maxEdgeFrequency=10 → weight=1.0
    expect(e1.data!.weight).toBeCloseTo(1.0, 10);
    const e2 = edges.find((e) => e.id === 'e2')!;
    // e2.caseCount=8, maxEdgeFrequency=10 → weight=0.8
    expect(e2.data!.weight).toBeCloseTo(0.8, 10);
  });

  it('computes node weight = caseCount / maxNodeFrequency for activity nodes', () => {
    const { nodes } = dfgToReactFlow(minimalDfg());
    const a = nodes.find((n) => n.id === 'A')!;
    // A.caseCount=8, maxNodeFrequency=8 → weight=1.0
    expect(a.data.weight).toBeCloseTo(1.0, 10);
  });

  it('assigns weight=1 to start/end terminal nodes regardless of caseCount', () => {
    const { nodes } = dfgToReactFlow(minimalDfg());
    const start = nodes.find((n) => n.id === '__start__')!;
    const end   = nodes.find((n) => n.id === '__end__')!;
    expect(start.data.weight).toBe(1);
    expect(end.data.weight).toBe(1);
  });

  it('clamps weight to [0, 1] even if caseCount exceeds maxFrequency', () => {
    const dfg: DirectlyFollowsGraph = {
      ...minimalDfg(),
      maxEdgeFrequency: 5,  // one edge has caseCount=10, which would exceed 1 unclamped
    };
    const { edges } = dfgToReactFlow(dfg);
    for (const e of edges) {
      expect(e.data!.weight).toBeGreaterThanOrEqual(0);
      expect(e.data!.weight).toBeLessThanOrEqual(1);
    }
  });
});

describe('dfgToReactFlow — edge label', () => {
  it('labels singular run correctly (no trailing "s")', () => {
    const dfg: DirectlyFollowsGraph = {
      ...minimalDfg(),
      edges: [
        { id: 'e1', sourceId: '__start__', targetId: '__end__', caseCount: 1, evidenceRunIds: [], durationSampleCount: 0, meanDurationMs: 0, medianDurationMs: 0, p95DurationMs: 0 },
      ],
      maxEdgeFrequency: 1,
    };
    const { edges } = dfgToReactFlow(dfg);
    expect(edges[0]!.data!.label).toBe('1 run');
  });

  it('labels plural runs correctly', () => {
    const { edges } = dfgToReactFlow(minimalDfg());
    const e1 = edges.find((e) => e.id === 'e1')!;
    expect(e1.data!.label).toBe('10 runs');
    const e2 = edges.find((e) => e.id === 'e2')!;
    expect(e2.data!.label).toBe('8 runs');
  });
});

describe('dfgToReactFlow — determinism', () => {
  it('produces byte-identical output on repeated calls with the same graph', () => {
    const dfg = parallelDfg();
    const out1 = dfgToReactFlow(dfg);
    const out2 = dfgToReactFlow(dfg);
    expect(JSON.stringify(out1)).toBe(JSON.stringify(out2));
  });

  it('produces identical positions for the same graph regardless of invocation order', () => {
    const dfg = minimalDfg();
    const a = dfgToReactFlow(dfg);
    const b = dfgToReactFlow(dfg);
    const posA = a.nodes.map((n) => ({ id: n.id, pos: n.position }));
    const posB = b.nodes.map((n) => ({ id: n.id, pos: n.position }));
    expect(posA).toEqual(posB);
  });
});

describe('dfgToReactFlow — layout positions', () => {
  it('assigns distinct positions to nodes in the same layer (no overlap)', () => {
    // parallelDfg has A and B in layer 1
    const { nodes } = dfgToReactFlow(parallelDfg());
    const a = nodes.find((n) => n.id === 'A')!;
    const b = nodes.find((n) => n.id === 'B')!;
    // Must share the same x (same layer) but have different y
    expect(a.position.x).toBeCloseTo(b.position.x, 1);
    expect(a.position.y).not.toBeCloseTo(b.position.y, 1);
  });

  it('places start node to the left of activity nodes (earlier layer)', () => {
    const { nodes } = dfgToReactFlow(minimalDfg());
    const start = nodes.find((n) => n.id === '__start__')!;
    const a     = nodes.find((n) => n.id === 'A')!;
    expect(start.position.x).toBeLessThan(a.position.x);
  });

  it('places end node to the right of activity nodes', () => {
    const { nodes } = dfgToReactFlow(minimalDfg());
    const a   = nodes.find((n) => n.id === 'A')!;
    const end = nodes.find((n) => n.id === '__end__')!;
    expect(end.position.x).toBeGreaterThan(a.position.x);
  });
});

describe('strokeWidthFromWeight', () => {
  it('returns 1.0 at weight=0 (ARCHITECTURE_DFG.md §6 lower bound)', () => {
    expect(strokeWidthFromWeight(0)).toBeCloseTo(1.0, 10);
  });

  it('returns 5.0 at weight=1 (ARCHITECTURE_DFG.md §6 upper bound)', () => {
    expect(strokeWidthFromWeight(1)).toBeCloseTo(5.0, 10);
  });

  it('returns midpoint 3.0 at weight=0.5', () => {
    expect(strokeWidthFromWeight(0.5)).toBeCloseTo(3.0, 10);
  });
});

describe('opacityFromWeight', () => {
  it('returns 0.25 at weight=0 (ARCHITECTURE_DFG.md §6 lower bound)', () => {
    expect(opacityFromWeight(0)).toBeCloseTo(0.25, 10);
  });

  it('returns 1.0 at weight=1 (ARCHITECTURE_DFG.md §6 upper bound)', () => {
    expect(opacityFromWeight(1)).toBeCloseTo(1.0, 10);
  });

  it('returns midpoint 0.625 at weight=0.5', () => {
    expect(opacityFromWeight(0.5)).toBeCloseTo(0.625, 10);
  });
});

describe('dfgToReactFlow — data passthrough', () => {
  it('passes caseCount through to node data', () => {
    const { nodes } = dfgToReactFlow(minimalDfg());
    const a = nodes.find((n) => n.id === 'A')!;
    expect(a.data.caseCount).toBe(8);
  });

  it('passes evidenceRunIds through to edge data', () => {
    const { edges } = dfgToReactFlow(minimalDfg());
    const e2 = edges.find((e) => e.id === 'e2')!;
    expect(e2.data!.evidenceRunIds).toEqual(['r1']);
  });

  it('passes evidenceRunIds through to node data', () => {
    const { nodes } = dfgToReactFlow(minimalDfg());
    const a = nodes.find((n) => n.id === 'A')!;
    expect(a.data.evidenceRunIds).toEqual(['r1', 'r2']);
  });

  it('passes kind to node data', () => {
    const { nodes } = dfgToReactFlow(minimalDfg());
    const start = nodes.find((n) => n.id === '__start__')!;
    const a     = nodes.find((n) => n.id === 'A')!;
    const end   = nodes.find((n) => n.id === '__end__')!;
    expect(start.data.kind).toBe('start');
    expect(a.data.kind).toBe('activity');
    expect(end.data.kind).toBe('end');
  });
});

describe('dfgToReactFlow — empty graph', () => {
  it('handles an empty DFG (no nodes, no edges) without throwing', () => {
    const dfg: DirectlyFollowsGraph = {
      version: 2,
      nodes: [],
      edges: [],
      totalRuns: 0,
      maxEdgeFrequency: 0,
      maxNodeFrequency: 0,
    };
    const { nodes, edges } = dfgToReactFlow(dfg);
    expect(nodes).toHaveLength(0);
    expect(edges).toHaveLength(0);
  });
});
