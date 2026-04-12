/**
 * Flow Intelligence Map Adapter
 *
 * Converts NormalizedViewModel into React Flow nodes and edges for the
 * primary flow visualization mode. Nodes are positioned vertically by
 * ordinal, with phase group backgrounds behind system-grouped regions.
 */

import type { NormalizedViewModel, ViewNode, ViewEdge, ViewPhase } from './viewModel';

// ─── React Flow compatible output ────────────────────────────────────────────

export interface FlowNode {
  id: string;
  type: 'taskNode' | 'decisionNode' | 'terminalNode';
  position: { x: number; y: number };
  data: { viewNode: ViewNode };
  parentId?: string;
  selected?: boolean;
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  type: 'workflowEdge';
  data: { viewEdge: ViewEdge };
}

export interface FlowPhaseGroup {
  id: string;
  label: string;
  system: string;
  color: string;
  /** Bounding rect computed from child node positions. */
  bounds: { x: number; y: number; width: number; height: number };
  stepCount: number;
}

export interface FlowAdapterOutput {
  nodes: FlowNode[];
  edges: FlowEdge[];
  phaseGroups: FlowPhaseGroup[];
}

// ─── Adapter ─────────────────────────────────────────────────────────────────

const NODE_WIDTH = 280;
const NODE_HEIGHT = 72;
const PHASE_PADDING = 20;

export function buildFlowData(model: NormalizedViewModel): FlowAdapterOutput {
  // ── Map nodes to React Flow format ───────────────────────────────────────

  const nodes: FlowNode[] = model.nodes.map(viewNode => ({
    id: viewNode.id,
    type: viewNode.nodeType === 'decision' ? 'decisionNode'
        : (viewNode.nodeType === 'start' || viewNode.nodeType === 'end') ? 'terminalNode'
        : 'taskNode',
    position: viewNode.position,
    data: { viewNode },
  }));

  // ── Map edges to React Flow format ───────────────────────────────────────

  const edges: FlowEdge[] = model.edges.map(viewEdge => ({
    id: viewEdge.id,
    source: viewEdge.sourceId,
    target: viewEdge.targetId,
    type: 'workflowEdge',
    data: { viewEdge },
  }));

  // ── Compute phase group bounds ───────────────────────────────────────────

  const nodeMap = new Map(model.nodes.map(n => [n.id, n]));
  const phaseGroups: FlowPhaseGroup[] = model.phases.map(phase => {
    const phaseNodes = phase.nodeIds.map(id => nodeMap.get(id)).filter(Boolean) as ViewNode[];
    if (phaseNodes.length === 0) {
      return {
        id: phase.id,
        label: phase.label,
        system: phase.system,
        color: phase.color,
        bounds: { x: 0, y: 0, width: NODE_WIDTH + PHASE_PADDING * 2, height: NODE_HEIGHT + PHASE_PADDING * 2 },
        stepCount: 0,
      };
    }

    const xs = phaseNodes.map(n => n.position.x);
    const ys = phaseNodes.map(n => n.position.y);
    const minX = Math.min(...xs) - PHASE_PADDING;
    const minY = Math.min(...ys) - PHASE_PADDING;
    const maxX = Math.max(...xs) + NODE_WIDTH + PHASE_PADDING;
    const maxY = Math.max(...ys) + NODE_HEIGHT + PHASE_PADDING;

    return {
      id: phase.id,
      label: phase.label,
      system: phase.system,
      color: phase.color,
      bounds: { x: minX, y: minY, width: maxX - minX, height: maxY - minY },
      stepCount: phaseNodes.length,
    };
  });

  return { nodes, edges, phaseGroups };
}
