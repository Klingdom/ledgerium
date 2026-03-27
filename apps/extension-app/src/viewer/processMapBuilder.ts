/**
 * React Flow adapter for the viewer.
 *
 * Converts pure ProcessMap nodes/edges from @ledgerium/process-engine into
 * the React Flow node/edge types required for rendering.
 *
 * No business logic lives here — all derivation happens in the engine.
 */

import type { Node, Edge } from '@xyflow/react'
import type { ProcessMap, ProcessMapNode as EngineNode } from '@ledgerium/process-engine'

// ─── React Flow node type ─────────────────────────────────────────────────────

export interface StepNodeData extends Record<string, unknown> {
  engineNode: EngineNode
}

export type StepFlowNode = Node<StepNodeData, 'stepNode'>
export type StepFlowEdge = Edge

// ─── Adapter ──────────────────────────────────────────────────────────────────

export function buildFlowGraph(processMap: ProcessMap): {
  nodes: StepFlowNode[]
  edges: StepFlowEdge[]
} {
  const nodes: StepFlowNode[] = processMap.nodes.map(engineNode => ({
    id: engineNode.id,
    type: 'stepNode',
    position: engineNode.position,
    data: { engineNode },
  }))

  const edges: StepFlowEdge[] = processMap.edges.map(e => ({
    id: e.id,
    source: e.source,
    target: e.target,
    type: 'smoothstep',
    animated: false,
    style: { stroke: '#283041', strokeWidth: 2 },
  }))

  return { nodes, edges }
}
