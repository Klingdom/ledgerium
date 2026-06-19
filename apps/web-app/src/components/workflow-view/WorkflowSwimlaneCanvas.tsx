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
  type Edge,
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
        // V-P1-3: alternating lane tint — barely-visible per Visio cross-functional convention
        background: lane.laneIndex % 2 === 0 ? 'transparent' : `${lane.color}05`,
        // V-P1-2: solid separator — always visible (was barely-visible color-tinted line)
        borderBottom: '1px solid #d1d5db',
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

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(swimlaneData.nodes as Node[]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(swimlaneData.edges as Edge[]);

  // Sync selection from parent
  useEffect(() => {
    setNodes(ns =>
      ns.map(n => ({
        ...n,
        selected: n.id === selectedNodeId,
      })),
    );
  }, [selectedNodeId, setNodes]);

  // Rebuild nodes/edges when graph changes.
  // QW3 stale-edges fix: previously only setNodes ran here, leaving edges stale
  // after navigation/filter changed the graph. setEdges now syncs both.
  useEffect(() => {
    const newData = buildSwimlaneData(graph);
    setNodes(newData.nodes as Node[]);
    setEdges(newData.edges as Edge[]);
  }, [graph, setNodes, setEdges]);

  // Expose controls to parent shell
  useEffect(() => {
    if (!onCanvasReady) return;
    onCanvasReady({
      zoomIn: () => reactFlowInstance.zoomIn({ duration: 200 }),
      zoomOut: () => reactFlowInstance.zoomOut({ duration: 200 }),
      fitView: () => reactFlowInstance.fitView({ padding: 0.15, duration: 300 }),
      resetView: () => {
        reactFlowInstance.setViewport({ x: 0, y: 0, zoom: 1 }, { duration: 300 });
        // QW3: sequence the fit on the next animation frame instead of an
        // arbitrary wall-clock setTimeout(50) — frame-synced, not timer-raced.
        requestAnimationFrame(() => reactFlowInstance.fitView({ padding: 0.15, duration: 300 }));
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
      {/*
        V-P0-4: SVG arrowhead marker definitions (same IDs as WorkflowCanvas.tsx —
        they are in separate DOM trees so no ID collision). Copy-paste is intentional.
      */}
      <svg style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}>
        <defs>
          {/* Sequence flow — slate closed triangle */}
          <marker id="arrow-seq" markerWidth="9" markerHeight="9"
                  refX="7" refY="3.5" orient="auto" markerUnits="strokeWidth">
            <path d="M0,0 L0,7 L9,3.5 z" fill="#9ca3af" />
          </marker>
          {/* Exception/error — red closed triangle */}
          <marker id="arrow-exc" markerWidth="9" markerHeight="9"
                  refX="7" refY="3.5" orient="auto" markerUnits="strokeWidth">
            <path d="M0,0 L0,7 L9,3.5 z" fill="#fca5a5" />
          </marker>
          {/* Decision branch — amber closed triangle */}
          <marker id="arrow-dec" markerWidth="9" markerHeight="9"
                  refX="7" refY="3.5" orient="auto" markerUnits="strokeWidth">
            <path d="M0,0 L0,7 L9,3.5 z" fill="#d97706" />
          </marker>
          {/* Selected — indigo closed triangle */}
          <marker id="arrow-sel" markerWidth="9" markerHeight="9"
                  refX="7" refY="3.5" orient="auto" markerUnits="strokeWidth">
            <path d="M0,0 L0,7 L9,3.5 z" fill="#6366f1" />
          </marker>
          {/* Cross-lane handoff — violet closed triangle */}
          <marker id="arrow-handoff" markerWidth="9" markerHeight="9"
                  refX="7" refY="3.5" orient="auto" markerUnits="strokeWidth">
            <path d="M0,0 L0,7 L9,3.5 z" fill="#8b5cf6" />
          </marker>
        </defs>
      </svg>

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
        fitViewOptions={{ padding: 0.30, maxZoom: 1.2 }}
        minZoom={0.1}
        maxZoom={2.5}
        panOnScroll
        selectionOnDrag={false}
        nodesConnectable={false}
        nodesDraggable={false}
        proOptions={{ hideAttribution: true }}
        className="workflow-swimlane-canvas"
      >
        {/* V-P0-8: Line grid — reinforces orthogonal connector routing (swimlane) */}
        <Background
          variant={BackgroundVariant.Lines}
          color="#f3f4f6"
          gap={20}
          className="!bg-white"
        />

        {toolbar.showMinimap && (
          <MiniMap
            nodeColor={(node: Node) => {
              if (node.type === 'laneHeader') return 'transparent';
              const vn = (node.data as { viewNode?: { accentColor?: string } })?.viewNode;
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
