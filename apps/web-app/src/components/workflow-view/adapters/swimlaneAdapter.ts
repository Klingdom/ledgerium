/**
 * Swimlane Layout Adapter
 *
 * Converts a NormalizedViewModel into React Flow nodes and edges arranged in
 * horizontal swimlane bands, one band per system. Edges that cross lane
 * boundaries are tagged as handoffs.
 *
 * Layout is computed deterministically — no async ELK calls. Nodes flow
 * left-to-right within each lane, ordered by ordinal.
 */

import type { NormalizedViewModel, ViewNode, ViewEdge } from './viewModel';
import { CATEGORY_STYLES } from '../constants';

// ─── Layout constants ────────────────────────────────────────────────────────

const LANE_HEADER_WIDTH = 200;
const NODE_WIDTH = 280;
const NODE_HEIGHT = 88;
const NODE_GAP_X = 60;
const NODE_GAP_Y = 20;
const LANE_PADDING = 24;
const LANE_MIN_HEIGHT = 140;
const LANE_GAP = 2;

// Colors assigned to lanes in order when a node has no category color
const LANE_FALLBACK_COLORS = [
  '#0d9488', // teal
  '#2563eb', // blue
  '#7c3aed', // violet
  '#ea580c', // orange
  '#059669', // green
  '#d97706', // amber
  '#dc2626', // red
  '#9333ea', // purple
];

// ─── Output types ────────────────────────────────────────────────────────────

export interface SwimlaneLane {
  id: string;
  system: string;
  label: string;
  laneIndex: number;
  bounds: { x: number; y: number; width: number; height: number };
  stepCount: number;
  totalDurationMs: number;
  durationLabel: string;
  color: string;
}

export interface SwimlaneFlowNode {
  id: string;
  type: 'taskNode' | 'decisionNode' | 'terminalNode' | 'laneHeader';
  position: { x: number; y: number };
  data: { viewNode?: ViewNode; lane?: SwimlaneLane };
  // Prevent React Flow from making lane header nodes selectable/draggable
  selectable?: boolean;
  draggable?: boolean;
}

export interface SwimlaneFlowEdge {
  id: string;
  source: string;
  target: string;
  type: 'workflowEdge' | 'handoffEdge';
  data: { viewEdge: ViewEdge; isHandoff: boolean };
}

export interface SwimlaneAdapterOutput {
  nodes: SwimlaneFlowNode[];
  edges: SwimlaneFlowEdge[];
  lanes: SwimlaneLane[];
  canvasWidth: number;
  canvasHeight: number;
}

// ─── Duration formatting ─────────────────────────────────────────────────────

function formatDuration(ms: number): string {
  if (ms < 1000) return '< 1s';
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  const mins = Math.floor(ms / 60_000);
  const secs = Math.round((ms % 60_000) / 1000);
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

// ─── Lane color resolution ────────────────────────────────────────────────────

function laneColorForSystem(nodes: ViewNode[], fallbackIndex: number): string {
  // Try to find the most common category in this system's nodes
  const counts = new Map<string, number>();
  for (const n of nodes) {
    if (n.category) counts.set(n.category, (counts.get(n.category) ?? 0) + 1);
  }
  let topCat = '';
  let topCount = 0;
  for (const [cat, count] of counts) {
    if (count > topCount) { topCat = cat; topCount = count; }
  }
  const style = topCat ? CATEGORY_STYLES[topCat as keyof typeof CATEGORY_STYLES] : null;
  return style?.color ?? LANE_FALLBACK_COLORS[fallbackIndex % LANE_FALLBACK_COLORS.length]!;
}

// ─── Adapter ─────────────────────────────────────────────────────────────────

export function buildSwimlaneData(model: NormalizedViewModel): SwimlaneAdapterOutput {
  // ── 1. Collect unique systems in order of first appearance ──────────────

  const taskNodes = model.nodes.filter(
    n => n.nodeType !== 'start' && n.nodeType !== 'end',
  );
  const startNode = model.nodes.find(n => n.nodeType === 'start') ?? null;
  const endNode = model.nodes.find(n => n.nodeType === 'end') ?? null;

  // Preserve insertion-order of systems
  const systemOrder: string[] = [];
  const seenSystems = new Set<string>();
  for (const n of taskNodes.sort((a, b) => a.ordinal - b.ordinal)) {
    const sys = n.system || 'Unknown';
    if (!seenSystems.has(sys)) {
      systemOrder.push(sys);
      seenSystems.add(sys);
    }
  }

  // If there are no task nodes, still produce a minimal layout
  if (systemOrder.length === 0) {
    return {
      nodes: [],
      edges: [],
      lanes: [],
      canvasWidth: LANE_HEADER_WIDTH + NODE_WIDTH + LANE_PADDING * 2,
      canvasHeight: LANE_MIN_HEIGHT,
    };
  }

  // ── 2. Build lane metadata ───────────────────────────────────────────────

  let currentY = 0;
  const lanes: SwimlaneLane[] = [];
  const laneBySystem = new Map<string, SwimlaneLane>();

  for (let i = 0; i < systemOrder.length; i++) {
    const sys = systemOrder[i]!;
    const laneNodes = taskNodes.filter(n => (n.system || 'Unknown') === sys);
    const nodesInLane = laneNodes.length;
    const laneHeight = Math.max(LANE_MIN_HEIGHT, NODE_HEIGHT + LANE_PADDING * 2);
    const totalDur = laneNodes.reduce((s, n) => s + n.durationMs, 0);
    const color = laneColorForSystem(laneNodes, i);

    const lane: SwimlaneLane = {
      id: `lane-${i}`,
      system: sys,
      label: sys,
      laneIndex: i,
      bounds: {
        x: 0,
        y: currentY,
        // width filled in after max column count is known
        width: 0,
        height: laneHeight,
      },
      stepCount: nodesInLane,
      totalDurationMs: totalDur,
      durationLabel: formatDuration(totalDur),
      color,
    };

    lanes.push(lane);
    laneBySystem.set(sys, lane);
    currentY += laneHeight + LANE_GAP;
  }

  // ── 3. Position nodes within their lanes ────────────────────────────────

  const positionedNodes: SwimlaneFlowNode[] = [];
  const nodePositionMap = new Map<string, { x: number; y: number }>();
  // Track per-system node ID → system for handoff detection
  const nodeSystemMap = new Map<string, string>();

  let maxColumnCount = 0;

  for (const lane of lanes) {
    const laneNodes = taskNodes
      .filter(n => (n.system || 'Unknown') === lane.system)
      .sort((a, b) => a.ordinal - b.ordinal);

    maxColumnCount = Math.max(maxColumnCount, laneNodes.length);

    laneNodes.forEach((node, colIndex) => {
      const x = LANE_HEADER_WIDTH + colIndex * (NODE_WIDTH + NODE_GAP_X);
      const y = lane.bounds.y + LANE_PADDING;

      const pos = { x, y };
      nodePositionMap.set(node.id, pos);
      nodeSystemMap.set(node.id, lane.system);

      positionedNodes.push({
        id: node.id,
        type: node.nodeType === 'decision' ? 'decisionNode' : 'taskNode',
        position: pos,
        data: { viewNode: node },
      });
    });
  }

  // ── 4. Compute canvas dimensions and update lane widths ──────────────────

  const canvasWidth = Math.max(
    LANE_HEADER_WIDTH + maxColumnCount * (NODE_WIDTH + NODE_GAP_X) + LANE_PADDING,
    LANE_HEADER_WIDTH + NODE_WIDTH + LANE_PADDING * 2,
  );

  for (const lane of lanes) {
    lane.bounds.width = canvasWidth;
  }

  // ── 5. Place terminal nodes ──────────────────────────────────────────────

  const totalLanesHeight = currentY - LANE_GAP; // remove trailing gap

  if (startNode) {
    const startX = LANE_HEADER_WIDTH;
    const startY = -(NODE_HEIGHT + 40);
    nodePositionMap.set(startNode.id, { x: startX, y: startY });
    nodeSystemMap.set(startNode.id, '__terminal__');
    positionedNodes.unshift({
      id: startNode.id,
      type: 'terminalNode',
      position: { x: startX, y: startY },
      data: { viewNode: startNode },
    });
  }

  if (endNode) {
    const endX = LANE_HEADER_WIDTH;
    const endY = totalLanesHeight + 40;
    nodePositionMap.set(endNode.id, { x: endX, y: endY });
    nodeSystemMap.set(endNode.id, '__terminal__');
    positionedNodes.push({
      id: endNode.id,
      type: 'terminalNode',
      position: { x: endX, y: endY },
      data: { viewNode: endNode },
    });
  }

  // ── 6. Add lane header nodes ─────────────────────────────────────────────

  const laneHeaderNodes: SwimlaneFlowNode[] = lanes.map(lane => ({
    id: `lane-header-${lane.id}`,
    type: 'laneHeader' as const,
    position: { x: 0, y: lane.bounds.y },
    data: { lane },
    selectable: false,
    draggable: false,
  }));

  const allNodes = [...positionedNodes, ...laneHeaderNodes];

  // ── 7. Build edges with handoff detection ────────────────────────────────

  const edges: SwimlaneFlowEdge[] = model.edges.map(viewEdge => {
    const srcSys = nodeSystemMap.get(viewEdge.sourceId) ?? '__terminal__';
    const tgtSys = nodeSystemMap.get(viewEdge.targetId) ?? '__terminal__';
    const isHandoff =
      srcSys !== tgtSys &&
      srcSys !== '__terminal__' &&
      tgtSys !== '__terminal__';

    return {
      id: viewEdge.id,
      source: viewEdge.sourceId,
      target: viewEdge.targetId,
      type: isHandoff ? 'handoffEdge' : 'workflowEdge',
      data: { viewEdge, isHandoff },
    };
  });

  const canvasHeight = totalLanesHeight + (startNode ? NODE_HEIGHT + 80 : 0) + (endNode ? NODE_HEIGHT + 80 : 0);

  return {
    nodes: allNodes,
    edges,
    lanes,
    canvasWidth,
    canvasHeight,
  };
}
