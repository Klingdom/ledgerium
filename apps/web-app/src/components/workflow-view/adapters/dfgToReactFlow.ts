/**
 * dfgToReactFlow — pure adapter: DirectlyFollowsGraph → React-Flow nodes/edges.
 *
 * Contract (ARCHITECTURE_DFG.md §6):
 *  - weight = caseCount / (maxFrequency || 1)  ∈ [0, 1]
 *  - strokeWidth = 1 + weight * 4              ∈ [1.0, 5.0]
 *  - opacity    = 0.25 + weight * 0.75         ∈ [0.25, 1.00]
 *
 * Determinism guarantee: same graph input → byte-identical output.
 * No Date.now(), Math.random(), or I/O.
 *
 * Layout: deterministic topological layering.
 *  - Source / sink terminals fixed at first / last column.
 *  - Interior nodes arranged left-to-right in topological order.
 *  - Multiple nodes in the same layer distributed vertically.
 *
 * Schema v2 additions (QW2):
 *  - DfgFlowNodeData and DfgFlowEdgeData now carry duration aggregate fields
 *    (meanDurationMs, medianDurationMs, p95DurationMs, durationSampleCount).
 *  - Fields pass through from DfgNode / DfgEdge verbatim (no recomputation here).
 */

import type { Node, Edge } from '@xyflow/react';
import type { DirectlyFollowsGraph, DfgNode, DfgEdge } from '@/lib/dfgModel';

// ─── Output types ─────────────────────────────────────────────────────────────

export interface DfgFlowNodeData extends Record<string, unknown> {
  label: string;
  caseCount: number;
  kind: DfgNode['kind'];
  /** weight = caseCount / (maxNodeFrequency || 1), clamped to [0, 1] */
  weight: number;
  evidenceRunIds: readonly string[];
  // ── Duration aggregates (schema v2, QW2) ──────────────────────────────────
  durationSampleCount: number;
  meanDurationMs: number;
  medianDurationMs: number;
  p95DurationMs: number;
}

export interface DfgFlowEdgeData extends Record<string, unknown> {
  caseCount: number;
  /** weight = caseCount / (maxEdgeFrequency || 1), clamped to [0, 1] */
  weight: number;
  /** `"${caseCount} run${caseCount !== 1 ? 's' : ''}"` */
  label: string;
  evidenceRunIds: readonly string[];
  // ── Duration aggregates (schema v2, QW2) ──────────────────────────────────
  durationSampleCount: number;
  meanDurationMs: number;
  medianDurationMs: number;
  p95DurationMs: number;
}

export type DfgFlowNode = Node<DfgFlowNodeData, 'dfgNode'>;
export type DfgFlowEdge = Edge<DfgFlowEdgeData, 'dfgEdge'>;

export interface DfgFlowGraph {
  nodes: DfgFlowNode[];
  edges: DfgFlowEdge[];
}

// ─── Layout constants (deterministic grid) ───────────────────────────────────

const LAYER_W = 240; // horizontal spacing between layers (px)
const LANE_H  = 120; // vertical spacing between nodes in the same layer (px)
const NODE_W  = 180; // node width (used for position offset)
const NODE_H  = 64;  // node height

// ─── Weight formula (ARCHITECTURE_DFG.md §6) ─────────────────────────────────

function edgeWeight(caseCount: number, maxFrequency: number): number {
  const max = maxFrequency || 1;
  return Math.min(1, Math.max(0, caseCount / max));
}

function nodeWeight(caseCount: number, maxNodeFrequency: number): number {
  const max = maxNodeFrequency || 1;
  return Math.min(1, Math.max(0, caseCount / max));
}

// ─── Stroke / opacity derivation (ARCHITECTURE_DFG.md §6) ────────────────────

/** strokeWidth = 1 + weight * 4 → range [1.0, 5.0] */
export function strokeWidthFromWeight(weight: number): number {
  return 1 + weight * 4;
}

/** opacity = 0.25 + weight * 0.75 → range [0.25, 1.00] */
export function opacityFromWeight(weight: number): number {
  return 0.25 + weight * 0.75;
}

// ─── Topological layering ─────────────────────────────────────────────────────

/**
 * Assign each node a layer index via BFS from source nodes.
 * Deterministic: iterates edges in the order they appear in dfg.edges.
 */
function computeLayers(dfg: DirectlyFollowsGraph): Map<string, number> {
  const layers = new Map<string, number>();
  const inDegree = new Map<string, number>();

  for (const node of dfg.nodes) {
    inDegree.set(node.id, 0);
  }
  for (const edge of dfg.edges) {
    inDegree.set(edge.targetId, (inDegree.get(edge.targetId) ?? 0) + 1);
  }

  // Build adjacency list (deterministic insertion order)
  const adj = new Map<string, string[]>();
  for (const node of dfg.nodes) {
    adj.set(node.id, []);
  }
  for (const edge of dfg.edges) {
    const list = adj.get(edge.sourceId);
    if (list) list.push(edge.targetId);
  }

  // BFS from zero-in-degree nodes
  const queue: string[] = [];
  for (const node of dfg.nodes) {
    if ((inDegree.get(node.id) ?? 0) === 0) {
      queue.push(node.id);
      layers.set(node.id, 0);
    }
  }

  let qi = 0;
  while (qi < queue.length) {
    const nodeId = queue[qi++]!;
    const layer  = layers.get(nodeId) ?? 0;
    for (const nextId of (adj.get(nodeId) ?? [])) {
      const nextLayer = Math.max(layers.get(nextId) ?? 0, layer + 1);
      layers.set(nextId, nextLayer);
      const deg = (inDegree.get(nextId) ?? 1) - 1;
      inDegree.set(nextId, deg);
      if (deg === 0) queue.push(nextId);
    }
  }

  // Any node not visited (cycle remnant) gets placed at a new layer
  let maxLayer = 0;
  for (const l of layers.values()) {
    if (l > maxLayer) maxLayer = l;
  }
  for (const node of dfg.nodes) {
    if (!layers.has(node.id)) {
      maxLayer += 1;
      layers.set(node.id, maxLayer);
    }
  }

  return layers;
}

/**
 * Given a layer assignment, compute (x, y) positions deterministically.
 * Nodes in the same layer are stacked vertically, centred vertically.
 */
function computePositions(
  dfg: DirectlyFollowsGraph,
  layers: Map<string, number>,
): Map<string, { x: number; y: number }> {
  // Group nodes by layer (preserving dfg.nodes insertion order within each layer)
  const byLayer = new Map<number, string[]>();
  for (const node of dfg.nodes) {
    const layer = layers.get(node.id) ?? 0;
    if (!byLayer.has(layer)) byLayer.set(layer, []);
    byLayer.get(layer)!.push(node.id);
  }

  const positions = new Map<string, { x: number; y: number }>();

  for (const [layer, nodeIds] of byLayer) {
    const x = layer * LAYER_W;
    const totalH = nodeIds.length * NODE_H + (nodeIds.length - 1) * (LANE_H - NODE_H);
    const startY = -(totalH / 2);

    nodeIds.forEach((nodeId, i) => {
      const y = startY + i * LANE_H;
      positions.set(nodeId, { x, y });
    });
  }

  // Offset x so the leftmost layer aligns near origin
  let minX = Infinity;
  for (const pos of positions.values()) {
    if (pos.x < minX) minX = pos.x;
  }
  if (minX !== 0) {
    for (const [id, pos] of positions) {
      positions.set(id, { x: pos.x - minX + NODE_W / 2, y: pos.y });
    }
  }

  return positions;
}

// ─── Main adapter ─────────────────────────────────────────────────────────────

/**
 * Convert a `DirectlyFollowsGraph` to React-Flow nodes and edges.
 *
 * - Node positions are deterministically derived from topological ordering.
 * - Weight, strokeWidth, and opacity are computed per ARCHITECTURE_DFG.md §6.
 * - Node type: `'dfgNode'`; edge type: `'dfgEdge'`.
 * - Duration aggregates are passed through verbatim from the DFG model (schema v2).
 */
export function dfgToReactFlow(dfg: DirectlyFollowsGraph): DfgFlowGraph {
  const layers    = computeLayers(dfg);
  const positions = computePositions(dfg, layers);

  const nodes: DfgFlowNode[] = dfg.nodes.map((node: DfgNode) => {
    const pos    = positions.get(node.id) ?? { x: 0, y: 0 };
    // Terminals (start/end) have no meaningful caseCount for weight; use 1.
    const wt =
      node.kind === 'start' || node.kind === 'end'
        ? 1
        : nodeWeight(node.caseCount, dfg.maxNodeFrequency);

    return {
      id:       node.id,
      type:     'dfgNode' as const,
      position: pos,
      data: {
        label:               node.label,
        caseCount:           node.caseCount,
        kind:                node.kind,
        weight:              wt,
        evidenceRunIds:      node.evidenceRunIds,
        durationSampleCount: node.durationSampleCount ?? 0,
        meanDurationMs:      node.meanDurationMs ?? 0,
        medianDurationMs:    node.medianDurationMs ?? 0,
        p95DurationMs:       node.p95DurationMs ?? 0,
      },
    };
  });

  const edges: DfgFlowEdge[] = dfg.edges.map((edge: DfgEdge) => {
    const wt    = edgeWeight(edge.caseCount, dfg.maxEdgeFrequency);
    const s     = edge.caseCount !== 1 ? 's' : '';
    const label = `${edge.caseCount} run${s}`;

    return {
      id:     edge.id,
      source: edge.sourceId,
      target: edge.targetId,
      type:   'dfgEdge' as const,
      data: {
        caseCount:           edge.caseCount,
        weight:              wt,
        label,
        evidenceRunIds:      edge.evidenceRunIds,
        durationSampleCount: edge.durationSampleCount ?? 0,
        meanDurationMs:      edge.meanDurationMs ?? 0,
        medianDurationMs:    edge.medianDurationMs ?? 0,
        p95DurationMs:       edge.p95DurationMs ?? 0,
      },
    };
  });

  return { nodes, edges };
}
