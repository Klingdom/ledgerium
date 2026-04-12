/**
 * System Interaction Map Adapter
 *
 * Converts NormalizedViewModel into a system-centric graph where
 * systems/apps are primary nodes and cross-system transitions are edges.
 * Steps are clustered within their system groups.
 */

import type { NormalizedViewModel, ViewSystem, ViewSystemEdge } from './viewModel';

// ─── Output types ────────────────────────────────────────────────────────────

export interface SystemNode {
  id: string;
  type: 'systemNode';
  position: { x: number; y: number };
  data: {
    system: ViewSystem;
    /** Steps within this system, for expandable detail. */
    stepLabels: string[];
  };
}

export interface SystemTransitionEdge {
  id: string;
  source: string;
  target: string;
  type: 'systemEdge';
  data: {
    systemEdge: ViewSystemEdge;
  };
}

export interface SystemAdapterOutput {
  nodes: SystemNode[];
  edges: SystemTransitionEdge[];
  totalHandoffs: number;
  contextSwitchCount: number;
}

// ─── Adapter ─────────────────────────────────────────────────────────────────

const SYSTEM_NODE_SPACING = 300;

export function buildSystemData(model: NormalizedViewModel): SystemAdapterOutput {
  const nodeMap = new Map(model.nodes.map(n => [n.id, n]));

  // Lay systems out horizontally
  const nodes: SystemNode[] = model.systems.map((sys, i) => {
    const stepLabels = sys.nodeIds
      .map(id => nodeMap.get(id)?.shortLabel ?? '')
      .filter(Boolean);

    return {
      id: sys.id,
      type: 'systemNode' as const,
      position: { x: i * SYSTEM_NODE_SPACING, y: 100 },
      data: { system: sys, stepLabels },
    };
  });

  const edges: SystemTransitionEdge[] = model.systemEdges.map(se => ({
    id: se.id,
    source: se.sourceSystemId,
    target: se.targetSystemId,
    type: 'systemEdge' as const,
    data: { systemEdge: se },
  }));

  // Count context switches (sequential system changes in execution order)
  const orderedNodes = [...model.nodes]
    .filter(n => n.nodeType !== 'start' && n.nodeType !== 'end')
    .sort((a, b) => a.ordinal - b.ordinal);

  let contextSwitches = 0;
  for (let i = 1; i < orderedNodes.length; i++) {
    if (orderedNodes[i]!.system !== orderedNodes[i - 1]!.system && orderedNodes[i]!.system) {
      contextSwitches++;
    }
  }

  return {
    nodes,
    edges,
    totalHandoffs: model.totalHandoffs,
    contextSwitchCount: contextSwitches,
  };
}
