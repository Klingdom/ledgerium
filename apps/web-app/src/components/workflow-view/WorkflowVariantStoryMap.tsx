'use client';

/**
 * Variant Story Map — the diverge→reconverge process map.
 *
 * Renders the standard path as a green spine and each variant as a branch that
 * peels off and rejoins downstream, on the React Flow canvas. Node positions come
 * from the pure, deterministic `buildVariantStoryMap` builder (no layout library,
 * no Date/random) so the diagram is reproducible and hydration-safe. Client-only.
 */

import { useMemo } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  Handle,
  Position,
  type NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { GitBranch } from 'lucide-react';
import type { ViewVariantPath } from './adapters/viewModel';
import { buildVariantStoryMap, type StoryEdge } from '@/lib/variantStoryMap';
import { CATEGORY_STYLES } from './constants';

// ─── Custom node ───────────────────────────────────────────────────────────────

function StoryNodeComponent({ data }: { data: any }) {
  const style = CATEGORY_STYLES[data.category as keyof typeof CATEGORY_STYLES] ?? CATEGORY_STYLES.single_action;
  const isBackbone = data.kind === 'backbone';
  const accent = isBackbone ? '#059669' : '#d97706';

  return (
    <div
      className="flex flex-col items-center"
      style={{ minWidth: 96, maxWidth: 140 }}
    >
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      <div
        className="rounded-lg border px-2.5 py-1.5 text-center shadow-sm"
        style={{
          background: isBackbone ? '#ecfdf5' : '#fffbeb',
          borderColor: data.isDecision ? accent : `${accent}55`,
          borderWidth: data.isDecision ? 2 : 1,
        }}
      >
        <span
          className="block text-[8px] font-bold uppercase tracking-wider"
          style={{ color: style.color }}
        >
          {style.label}
        </span>
        {data.isDecision && (
          <span className="mt-0.5 block text-[8px] font-semibold text-emerald-700">decision</span>
        )}
      </div>
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
    </div>
  );
}

const nodeTypes: NodeTypes = { storyNode: StoryNodeComponent as any };

// ─── Edge styling ────────────────────────────────────────────────────────────

function edgeStyle(e: StoryEdge): React.CSSProperties {
  if (e.kind === 'spine') return { stroke: '#059669', strokeWidth: 2 + e.runShare * 4 };
  if (e.kind === 'shortcut') return { stroke: '#9ca3af', strokeWidth: 1.5, strokeDasharray: '2 3' };
  return { stroke: '#d97706', strokeWidth: 1.5 + e.runShare * 3, strokeDasharray: '5 4' }; // branch / rejoin
}

function edgeLabel(e: StoryEdge): string | undefined {
  // Label only the entry edge of each branch / the shortcut, to avoid clutter.
  if (e.kind === 'shortcut' || (e.kind === 'branch' && e.id.endsWith('-in'))) {
    return `${e.runCount} run${e.runCount !== 1 ? 's' : ''} · ${Math.round(e.runShare * 100)}%`;
  }
  return undefined;
}

// ─── Inner (inside provider) ───────────────────────────────────────────────────

interface Props {
  variants: ViewVariantPath[];
  onSelectNode: (id: string | null) => void;
}

function StoryMapInner({ variants, onSelectNode }: Props) {
  const map = useMemo(
    () =>
      buildVariantStoryMap(
        variants.map((v) => ({
          id: v.id,
          isStandard: v.isStandard,
          runCount: v.runCount,
          stepCategories: v.stepCategories,
        })),
      ),
    [variants],
  );

  const { rfNodes, rfEdges } = useMemo(() => {
    if (!map) return { rfNodes: [] as any[], rfEdges: [] as any[] };
    const rfNodes = map.nodes.map((n) => ({
      id: n.id,
      type: 'storyNode',
      position: { x: n.x, y: n.y },
      data: n,
      draggable: false,
    }));
    const rfEdges = map.edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      type: 'smoothstep',
      animated: false,
      style: edgeStyle(e),
      label: edgeLabel(e),
      labelStyle: { fontSize: 9, fontWeight: 600, fill: '#92400e' },
      labelBgStyle: { fill: '#fffbeb', fillOpacity: 0.9 },
      labelBgPadding: [4, 2] as [number, number],
      labelBgBorderRadius: 4,
    }));
    return { rfNodes, rfEdges };
  }, [map]);

  if (!map) {
    return (
      <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
        <p className="text-ds-sm text-[var(--content-secondary)]">
          Not enough variation to map yet. Switch to List, or record this process again.
        </p>
      </div>
    );
  }

  const conformPct = map.totalRuns > 0 ? Math.round((map.conformingRunCount / map.totalRuns) * 100) : 0;

  return (
    <div className="absolute inset-0">
      {/* Headline */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center gap-2 px-4 py-2 bg-[var(--surface-elevated)]/90 backdrop-blur-sm border-b border-[var(--border-subtle)]">
        <GitBranch className="h-3.5 w-3.5 text-emerald-600" />
        <span className="text-[11px] text-[var(--content-secondary)]">
          <span className="font-semibold text-[var(--content-primary)]">{conformPct}%</span> of {map.totalRuns} runs
          follow the standard path. {map.branchCount} branch{map.branchCount !== 1 ? 'es' : ''} off and rejoin.
        </span>
      </div>

      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        proOptions={{ hideAttribution: true }}
        onPaneClick={() => onSelectNode(null)}
        minZoom={0.2}
        maxZoom={1.5}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="var(--border-subtle)" />
      </ReactFlow>
    </div>
  );
}

export function WorkflowVariantStoryMap(props: Props) {
  return (
    <ReactFlowProvider>
      <StoryMapInner {...props} />
    </ReactFlowProvider>
  );
}
