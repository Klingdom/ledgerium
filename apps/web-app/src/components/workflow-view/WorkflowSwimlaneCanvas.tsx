'use client';

/**
 * WorkflowSwimlaneCanvas — React Flow wrapper for the Swimlane view.
 *
 * Renders process nodes arranged in horizontal swimlane bands, one per
 * system. Cross-lane edges are rendered as HandoffEdge components with
 * a violet "Handoff" badge. Lane header nodes are rendered inline so
 * they pan and zoom with the diagram.
 *
 * Falls back to a message when the workflow runs in a single system,
 * since swimlanes only add value for cross-system workflows.
 */

import { useCallback, useMemo, useEffect, memo } from 'react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
  type Node,
  type NodeProps,
  type NodeTypes,
  type EdgeTypes,
  type OnSelectionChangeParams,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { WorkflowTaskNode } from './nodes/WorkflowTaskNode';
import { WorkflowDecisionNode } from './nodes/WorkflowDecisionNode';
import { WorkflowTerminalNode } from './nodes/WorkflowTerminalNode';
import { WorkflowEdgeComponent } from './edges/WorkflowEdge';
import { HandoffEdgeComponent } from './edges/HandoffEdge';
import { SwimlaneLaneHeader } from './SwimlaneLaneHeader';
import { buildSwimlaneData } from './adapters/swimlaneAdapter';
import type { SwimlaneLane } from './adapters/swimlaneAdapter';
import type { NormalizedViewModel } from './adapters/viewModel';
import type { ToolbarState } from './types';
import type { CanvasControls } from './WorkflowCanvas';

// ─── Lane header node ────────────────────────────────────────────────────────
// Rendered as a React Flow node so it pans/zooms with the diagram naturally.

const LaneHeaderNode = memo(function LaneHeaderNode({
  data,
}: NodeProps<Node<{ lane: SwimlaneLane }, 'laneHeader'>>) {
  if (!data.lane) return null;
  return <SwimlaneLaneHeader lane={data.lane} />;
});

// ─── Lane band background overlay ────────────────────────────────────────────

function SwimlaneLaneBand({ lane }: { lane: SwimlaneLane }) {
  return (
    <div
      className="react-flow__panel pointer-events-none"
      style={{
        position: 'absolute',
        left: 0,
        top: lane.bounds.y,
        width: Math.max(lane.bounds.width, 5000),
        height: lane.bounds.height,
        background: `${lane.color}06`,
        borderBottom: `1px solid ${lane.color}15`,
        zIndex: -1,
      }}
    />
  );
}

// ─── Node and edge type registrations ────────────────────────────────────────

const nodeTypes: NodeTypes = {
  taskNode: WorkflowTaskNode as any,
  decisionNode: WorkflowDecisionNode as any,
  terminalNode: WorkflowTerminalNode as any,
  laneHeader: LaneHeaderNode as any,
};

const edgeTypes: EdgeTypes = {
  workflowEdge: WorkflowEdgeComponent as any,
  handoffEdge: HandoffEdgeComponent as any,
};

// ─── Props ───────────────────────────────────────────────────────────────────

interface Props {
  graph: NormalizedViewModel;
  toolbar: ToolbarState;
  selectedNodeId: string | null;
  onSelectNode: (id: string | null) => void;
  onCanvasReady?: (controls: CanvasControls) => void;
}

// ─── Single-system message ────────────────────────────────────────────────────

function SingleSystemMessage() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="max-w-sm text-center px-6">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3"
          style={{ background: '#f5f3ff' }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#8b5cf6"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="3" width="8" height="18" rx="2" />
            <rect x="13" y="3" width="8" height="18" rx="2" />
          </svg>
        </div>
        <p
          className="text-sm font-medium mb-1"
          style={{ color: 'var(--content-primary)' }}
        >
          Single-system workflow
        </p>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--content-secondary)' }}>
          This workflow runs within a single system. Swimlane view is most
          useful for cross-system workflows. Switch to{' '}
          <span className="font-medium" style={{ color: 'var(--content-primary)' }}>
            Flow Intelligence
          </span>{' '}
          for the full step-by-step view.
        </p>
      </div>
    </div>
  );
}

// ─── Inner canvas (must be inside ReactFlowProvider) ─────────────────────────

function SwimlaneCanvas({ graph, toolbar, selectedNodeId, onSelectNode, onCanvasReady }: Props) {
  const reactFlowInstance = useReactFlow();
  const swimlaneData = useMemo(() => buildSwimlaneData(graph), [graph]);

  const [nodes, setNodes, onNodesChange] = useNodesState(swimlaneData.nodes as any[]);
  const [edges, , onEdgesChange] = useEdgesState(swimlaneData.edges as any[]);

  // Sync selection from parent
  useEffect(() => {
    setNodes(ns =>
      ns.map(n => ({
        ...n,
        selected: n.id === selectedNodeId,
      })),
    );
  }, [selectedNodeId, setNodes]);

  // Rebuild nodes/edges when graph changes
  useEffect(() => {
    const newData = buildSwimlaneData(graph);
    setNodes(newData.nodes as any[]);
  }, [graph, setNodes]);

  // Expose controls to parent shell
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

  const handleSelectionChange = useCallback(
    ({ nodes: selectedNodes }: OnSelectionChangeParams) => {
      // Filter out non-selectable lane header nodes
      const selectableNodes = selectedNodes.filter(n => n.type !== 'laneHeader');
      onSelectNode(selectableNodes[0]?.id ?? null);
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
        fitViewOptions={{ padding: 0.15, maxZoom: 1.2 }}
        minZoom={0.1}
        maxZoom={2.5}
        panOnScroll
        selectionOnDrag={false}
        nodesConnectable={false}
        nodesDraggable={false}
        proOptions={{ hideAttribution: true }}
        className="workflow-swimlane-canvas"
      >
        <Background
          variant={BackgroundVariant.Dots}
          color="var(--border-subtle)"
          gap={24}
          size={1}
          className="!bg-[var(--surface-secondary)]"
        />

        {toolbar.showMinimap && (
          <MiniMap
            nodeColor={(node: Node) => {
              if (node.type === 'laneHeader') return 'transparent';
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

        {/* Lane band backgrounds — positioned behind everything */}
        {swimlaneData.lanes.map(lane => (
          <SwimlaneLaneBand key={lane.id} lane={lane} />
        ))}
      </ReactFlow>
    </div>
  );
}

// ─── Main export — single system guard + ReactFlowProvider wrapper ────────────

export function WorkflowSwimlaneCanvas(props: Props) {
  const isSingleSystem = props.graph.totalSystems <= 1;

  if (isSingleSystem) {
    return (
      <div className="absolute inset-0 relative">
        <SingleSystemMessage />
      </div>
    );
  }

  return (
    <ReactFlowProvider>
      <SwimlaneCanvas {...props} />
    </ReactFlowProvider>
  );
}
