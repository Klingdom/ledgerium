import React, { useCallback, useEffect, useMemo } from 'react'
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  type NodeTypes,
  type Node,
  type OnSelectionChangeParams,
  Handle,
  Position,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import type { ProcessMap, ProcessMapNode as EngineNode } from '@ledgerium/process-engine'

// ─── Sidebar step node (compact) ─────────────────────────────────────────────

interface SidebarNodeData extends Record<string, unknown> {
  engineNode: EngineNode
}

type SidebarFlowNode = Node<SidebarNodeData, 'sidebarStep'>

function SidebarStepNodeInner({ data, selected }: { data: SidebarNodeData; selected?: boolean }) {
  const { engineNode } = data
  return (
    <div
      style={{
        width: 248,
        background: selected
          ? engineNode.categoryBg.replace('0.07', '0.14')
          : engineNode.categoryBg,
        border: `1px solid ${selected ? engineNode.categoryColor : '#e5e7eb'}`,
        borderRadius: 8,
        padding: '7px 10px',
        cursor: 'pointer',
        boxShadow: selected ? `0 0 0 2px ${engineNode.categoryColor}22` : '0 1px 3px rgba(0,0,0,0.08)',
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: '#ffffff', border: `1px solid ${selected ? engineNode.categoryColor : '#d1d5db'}`, width: 6, height: 6 }}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
        <span style={{ fontSize: 9, fontWeight: 700, color: '#9ca3af', minWidth: 12 }}>
          {engineNode.ordinal}
        </span>
        <span style={{
          fontSize: 8,
          fontWeight: 700,
          color: engineNode.categoryColor,
          background: `${engineNode.categoryColor}18`,
          borderRadius: 3,
          padding: '1px 5px',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}>
          {engineNode.categoryLabel}
        </span>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 9, color: '#9ca3af' }}>{engineNode.metadata.durationLabel}</span>
      </div>
      <p style={{
        margin: 0,
        fontSize: 11,
        fontWeight: 500,
        color: selected ? '#111827' : '#374151',
        lineHeight: 1.35,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {engineNode.title}
      </p>
      {engineNode.metadata.systems.length > 0 && (
        <p style={{
          margin: '2px 0 0',
          fontSize: 9,
          color: '#9ca3af',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {engineNode.metadata.systems.join(' · ')}
        </p>
      )}
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: '#ffffff', border: `1px solid ${selected ? engineNode.categoryColor : '#d1d5db'}`, width: 6, height: 6 }}
      />
    </div>
  )
}

function SidebarStepNode(props: { data: SidebarNodeData; selected?: boolean }) {
  return <SidebarStepNodeInner {...props} />
}

const nodeTypes: NodeTypes = {
  sidebarStep: SidebarStepNode as NodeTypes[string],
}

// ─── Adapter ──────────────────────────────────────────────────────────────────

const NODE_GAP = 16
const NODE_HEIGHT = 70

function buildFlowNodes(processMap: ProcessMap): SidebarFlowNode[] {
  // Filter out synthetic start/end nodes — they add visual noise in the sidebar.
  // Layout task nodes sequentially from top to bottom.
  const taskNodes = processMap.nodes.filter(
    n => n.nodeType !== 'start' && n.nodeType !== 'end',
  )
  return taskNodes.map((engineNode, index) => ({
    id: engineNode.id,
    type: 'sidebarStep',
    position: { x: 0, y: index * (NODE_HEIGHT + NODE_GAP) },
    data: { engineNode },
  }))
}

// ─── Component ────────────────────────────────────────────────────────────────

interface SidebarProcessMapProps {
  processMap: ProcessMap
  selectedStepId: string | null
  onSelectStep: (stepId: string | null) => void
}

export function SidebarProcessMap({ processMap, selectedStepId, onSelectStep }: SidebarProcessMapProps) {
  const initialNodes = useMemo(() => buildFlowNodes(processMap), [processMap])

  const taskNodeIds = useMemo(() => {
    const ids = new Set(initialNodes.map(n => n.id))
    return ids
  }, [initialNodes])

  const flowEdges = useMemo(() =>
    processMap.edges
      .filter(e => taskNodeIds.has(e.source) && taskNodeIds.has(e.target))
      .map(e => ({
        id: e.id,
        source: e.source,
        target: e.target,
        type: 'smoothstep',
        style: { stroke: '#d1d5db', strokeWidth: 1.5 },
      })),
    [processMap, taskNodeIds]
  )

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, , onEdgesChange] = useEdgesState(flowEdges)

  useEffect(() => {
    setNodes(ns => ns.map(n => ({ ...n, selected: n.id === selectedStepId })))
  }, [selectedStepId, setNodes])

  const handleSelectionChange = useCallback(
    ({ nodes: sel }: OnSelectionChangeParams) => {
      onSelectStep(sel[0]?.id ?? null)
    },
    [onSelectStep],
  )

  const handlePaneClick = useCallback(() => onSelectStep(null), [onSelectStep])

  if (processMap.nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-xs text-gray-400">No steps</p>
      </div>
    )
  }

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
      fitViewOptions={{ padding: 0.15, maxZoom: 1.1, minZoom: 0.4 }}
      minZoom={0.2}
      maxZoom={2}
      panOnScroll
      selectionOnDrag={false}
      style={{ background: '#ffffff' }}
      proOptions={{ hideAttribution: true }}
    >
      <Background variant={BackgroundVariant.Dots} color="#e5e7eb" gap={24} size={1} />
    </ReactFlow>
  )
}
