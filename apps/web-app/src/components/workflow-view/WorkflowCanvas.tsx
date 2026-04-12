'use client';

/**
 * WorkflowCanvas — React Flow wrapper for the Flow Intelligence Map.
 *
 * Renders the interactive diagram with custom nodes, edges, and phase
 * group backgrounds. Manages React Flow's internal state and exposes
 * zoom/pan/selection controls to the parent shell.
 */

import { useCallback, useMemo, useRef, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
  type Node,
  type NodeTypes,
  type EdgeTypes,
  type OnSelectionChangeParams,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { WorkflowTaskNode } from './nodes/WorkflowTaskNode';
import { WorkflowDecisionNode } from './nodes/WorkflowDecisionNode';
import { WorkflowTerminalNode } from './nodes/WorkflowTerminalNode';
import { WorkflowEdgeComponent } from './edges/WorkflowEdge';
import { buildFlowData } from './adapters/flowAdapter';
import type { FlowPhaseGroup } from './adapters/flowAdapter';
import type { NormalizedViewModel } from './adapters/viewModel';
import type { ToolbarState } from './types';

// ─── Node and edge type registrations ────────────────────────────────────────

const nodeTypes: NodeTypes = {
  taskNode: WorkflowTaskNode as any,
  decisionNode: WorkflowDecisionNode as any,
  terminalNode: WorkflowTerminalNode as any,
};

const edgeTypes: EdgeTypes = {
  workflowEdge: WorkflowEdgeComponent as any,
};

// ─── Props ───────────────────────────────────────────────────────────────────

interface Props {
  graph: NormalizedViewModel;
  toolbar: ToolbarState;
  selectedNodeId: string | null;
  onSelectNode: (id: string | null) => void;
  /** Ref callback to expose zoom controls to the toolbar. */
  onCanvasReady?: (controls: CanvasControls) => void;
}

export interface CanvasControls {
  zoomIn: () => void;
  zoomOut: () => void;
  fitView: () => void;
  resetView: () => void;
}

// ─── Inner component (must be inside ReactFlowProvider) ──────────────────────

function FlowCanvas({ graph, toolbar, selectedNodeId, onSelectNode, onCanvasReady }: Props) {
  const reactFlowInstance = useReactFlow();
  const flowData = useMemo(() => buildFlowData(graph), [graph]);

  const [nodes, setNodes, onNodesChange] = useNodesState(flowData.nodes as any[]);
  const [edges, , onEdgesChange] = useEdgesState(flowData.edges as any[]);

  // Sync selection state from parent
  useEffect(() => {
    setNodes(ns =>
      ns.map(n => ({
        ...n,
        selected: n.id === selectedNodeId,
      })),
    );
  }, [selectedNodeId, setNodes]);

  // Update nodes/edges when graph data changes
  useEffect(() => {
    const newFlow = buildFlowData(graph);
    setNodes(newFlow.nodes as any[]);
  }, [graph, setNodes]);

  // Expose controls to parent
  useEffect(() => {
    if (!onCanvasReady) return;
    onCanvasReady({
      zoomIn: () => reactFlowInstance.zoomIn({ duration: 200 }),
      zoomOut: () => reactFlowInstance.zoomOut({ duration: 200 }),
      fitView: () => reactFlowInstance.fitView({ padding: 0.15, duration: 300 }),
      resetView: () => {
        reactFlowInstance.setViewport({ x: 0, y: 0, zoom: 1 }, { duration: 300 });
        setTimeout(() => reactFlowInstance.fitView({ padding: 0.15, duration: 300 }), 50);
      },
    });
  }, [reactFlowInstance, onCanvasReady]);

  // Selection handler
  const handleSelectionChange = useCallback(
    ({ nodes: selectedNodes }: OnSelectionChangeParams) => {
      const first = selectedNodes[0];
      onSelectNode(first?.id ?? null);
    },
    [onSelectNode],
  );

  const handlePaneClick = useCallback(() => {
    onSelectNode(null);
  }, [onSelectNode]);

  return (
    <div className="absolute inset-0">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onSelectionChange={handleSelectionChange}
        onPaneClick={handlePaneClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.15, maxZoom: 1.5 }}
        minZoom={0.1}
        maxZoom={2.5}
        panOnScroll
        selectionOnDrag={false}
        nodesConnectable={false}
        nodesDraggable={false}
        proOptions={{ hideAttribution: true }}
        className="workflow-flow-canvas"
      >
        <Background
          variant={BackgroundVariant.Dots}
          color="#e2e8f0"
          gap={24}
          size={1}
          className="!bg-gray-50/50"
        />

        {toolbar.showMinimap && (
          <MiniMap
            nodeColor={(node: Node) => {
              const vn = (node.data as any)?.viewNode;
              return vn?.accentColor ?? '#94a3b8';
            }}
            nodeStrokeWidth={0}
            maskColor="rgba(248,250,252,0.8)"
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
            }}
            pannable
            zoomable
          />
        )}

        {/* Phase group backgrounds */}
        {flowData.phaseGroups.map(group => (
          <PhaseGroupOverlay key={group.id} group={group} />
        ))}
      </ReactFlow>
    </div>
  );
}

// ─── Phase group background overlay ──────────────────────────────────────────

function PhaseGroupOverlay({ group }: { group: FlowPhaseGroup }) {
  if (group.stepCount === 0) return null;

  return (
    <div
      className="react-flow__panel pointer-events-none"
      style={{
        position: 'absolute',
        left: group.bounds.x - 10,
        top: group.bounds.y - 24,
        zIndex: -1,
      }}
    >
      <div
        style={{
          width: group.bounds.width + 20,
          height: group.bounds.height + 32,
          background: `${group.color}06`,
          border: `1px solid ${group.color}15`,
          borderRadius: 16,
        }}
      >
        <div
          className="flex items-center gap-1.5 px-3 py-1"
          style={{ borderBottom: `1px solid ${group.color}10` }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: group.color }} />
          <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: `${group.color}cc` }}>
            {group.label}
          </span>
          <span className="text-[9px]" style={{ color: `${group.color}80` }}>
            {group.stepCount} step{group.stepCount !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Exported wrapper with ReactFlowProvider ─────────────────────────────────

export function WorkflowFlowCanvas(props: Props) {
  return (
    <ReactFlowProvider>
      <FlowCanvas {...props} />
    </ReactFlowProvider>
  );
}
