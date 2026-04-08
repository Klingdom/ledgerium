import React, { useCallback, useEffect, useMemo } from 'react'
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type NodeTypes,
  type Node,
  type OnSelectionChangeParams,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { StepNode } from './StepNode.js'
import { buildFlowGraph } from './processMapBuilder.js'
import type { ProcessMap } from '@ledgerium/process-engine'
import type { StepNodeData } from './processMapBuilder.js'

const nodeTypes: NodeTypes = {
  stepNode: StepNode as NodeTypes[string],
}

interface ProcessMapFlowProps {
  processMap: ProcessMap
  selectedStepId: string | null
  onSelectStep: (stepId: string | null) => void
}

export function ProcessMapFlow({ processMap, selectedStepId, onSelectStep }: ProcessMapFlowProps) {
  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => buildFlowGraph(processMap),
    [processMap]
  )

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, , onEdgesChange] = useEdgesState(initialEdges)

  useEffect(() => {
    setNodes(ns =>
      ns.map(n => ({
        ...n,
        selected: n.id === selectedStepId,
      }))
    )
  }, [selectedStepId, setNodes])

  const handleSelectionChange = useCallback(
    ({ nodes: selectedNodes }: OnSelectionChangeParams) => {
      const first = selectedNodes[0]
      onSelectStep(first?.id ?? null)
    },
    [onSelectStep]
  )

  const handlePaneClick = useCallback(() => {
    onSelectStep(null)
  }, [onSelectStep])

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onSelectionChange={handleSelectionChange}
      onPaneClick={handlePaneClick}
      nodeTypes={nodeTypes}
      fitView
      fitViewOptions={{ padding: 0.3, maxZoom: 1.2 }}
      minZoom={0.2}
      maxZoom={2}
      panOnScroll
      selectionOnDrag={false}
      style={{ background: '#0a0e14' }}
      proOptions={{ hideAttribution: true }}
    >
      <Background
        variant={BackgroundVariant.Dots}
        color="#141d2b"
        gap={28}
        size={1.2}
      />
      <Controls showInteractive={false} />
      <MiniMap
        nodeColor={(node: Node) => {
          const data = node.data as StepNodeData
          return data.engineNode?.categoryColor ?? '#374151'
        }}
        nodeStrokeWidth={0}
        maskColor="rgba(10,14,20,0.85)"
        style={{
          background: '#0d1117',
          border: '1px solid #1f2937',
          borderRadius: 8,
        }}
      />
    </ReactFlow>
  )
}
