'use client';

/**
 * DfgFrequencyMap — Celonis-style frequency-weighted process map.
 *
 * Consumes a `DirectlyFollowsGraph` (already built by dfgModel.ts) and renders
 * it as a React-Flow canvas where edge thickness + opacity encode visit frequency.
 *
 * Visual encoding (UX_SPEC.md §2):
 *  - Edge strokeWidth = EDGE_MIN_PX + weight * (EDGE_MAX_PX - EDGE_MIN_PX)  →  [1.5, 10]
 *  - Edge opacity     = 0.20 + weight * 0.80                                 →  [0.20, 1.00]
 *
 * Layout positions (ARCHITECTURE_DFG.md §6, deterministic, via dfgToReactFlow):
 *  - strokeWidth (for adapter contract tests) = 1 + weight * 4               →  [1.0, 5.0]
 *
 * The visual render overrides the adapter formula with UX_SPEC values.
 * The adapter (dfgToReactFlow.ts) returns weights; the custom components apply
 * UX_SPEC visual values at render time.
 */

import { memo, useCallback, useRef, useMemo, useState, useEffect } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  type Node,
  type Edge,
  type NodeProps,
  type EdgeProps,
  type NodeTypes,
  type EdgeTypes,
  BaseEdge,
  getSmoothStepPath,
  Handle,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import {
  dfgToReactFlow,
  type DfgFlowNode,
  type DfgFlowEdge,
  type DfgFlowNodeData,
  type DfgFlowEdgeData,
} from './adapters/dfgToReactFlow';
import { filterDfgByCoverage, type DirectlyFollowsGraph } from '@/lib/dfgModel';
import { track } from '@/lib/analytics';
import { formatDuration } from '@/lib/format';

// ─── UX_SPEC visual constants ─────────────────────────────────────────────────

const EDGE_MIN_PX  = 1.5;
const EDGE_MAX_PX  = 10;
const EDGE_COLOR   = '#6366f1'; // violet-500
const HAPPY_COLOR  = '#4f46e5'; // indigo-700 — dominant path emphasis

/** UX_SPEC.md §2.1 — strokeWidth formula for render */
function uiStrokeWidth(weight: number): number {
  const raw = EDGE_MIN_PX + weight * (EDGE_MAX_PX - EDGE_MIN_PX);
  // Snap to nearest 0.5px (UX_SPEC §2.1)
  return Math.max(EDGE_MIN_PX, Math.round(raw * 2) / 2);
}

/** UX_SPEC.md §2.2 — opacity formula for render */
function uiOpacity(weight: number): number {
  return 0.20 + weight * 0.80;
}

// ─── Performance overlay (QW2b) — 3-stop duration scale ───────────────────────
//
// Performance mode encodes node background + edge colour by duration on a scale
// DERIVED from the visible data range (min / median / max) — never hardcoded
// thresholds. Edge thickness is held fixed in performance mode to avoid
// double-encoding. Items with < PERF_MIN_SAMPLES duration samples render neutral.

const PERF_FAST_COLOR    = '#10b981'; // emerald-500 — fastest
const PERF_MEDIUM_COLOR  = '#f59e0b'; // amber-500   — median
const PERF_SLOW_COLOR    = '#ef4444'; // red-500     — slowest
const PERF_NEUTRAL_COLOR = '#9ca3af'; // gray-400    — insufficient data
const PERF_EDGE_PX       = 2.5;       // fixed stroke width in performance mode
/** Minimum duration samples for a node/edge to be coloured by performance. */
const PERF_MIN_SAMPLES   = 2;

export type DfgMapMode = 'frequency' | 'performance';

/** Deterministic 3-stop scale derived from the visible duration data range. */
export interface PerfScale {
  min: number;
  median: number;
  max: number;
}

function clamp01(t: number): number {
  return t < 0 ? 0 : t > 1 ? 1 : t;
}

/** Lower-median of a pre-sorted ascending array (deterministic single pick). */
function lowerMedianSorted(sorted: number[]): number {
  return sorted[Math.floor((sorted.length - 1) / 2)]!;
}

/**
 * Build the 3-stop performance scale (min / median / max) from the visible
 * duration samples. Returns null when there are no samples (no timing data).
 * Pure + deterministic: sorts a numeric copy; no Date.now()/Math.random().
 */
export function buildPerformanceScale(samples: number[]): PerfScale | null {
  if (samples.length === 0) return null;
  const sorted = [...samples].sort((a, b) => a - b);
  return {
    min: sorted[0]!,
    median: lowerMedianSorted(sorted),
    max: sorted[sorted.length - 1]!,
  };
}

/** Interpolate two #rrggbb colours by t∈[0,1]. Deterministic. */
function lerpHexColor(a: string, b: string, t: number): string {
  const ar = parseInt(a.slice(1, 3), 16);
  const ag = parseInt(a.slice(3, 5), 16);
  const ab = parseInt(a.slice(5, 7), 16);
  const br = parseInt(b.slice(1, 3), 16);
  const bg = parseInt(b.slice(3, 5), 16);
  const bb = parseInt(b.slice(5, 7), 16);
  const ch = (x: number, y: number) => Math.round(x + (y - x) * t).toString(16).padStart(2, '0');
  return `#${ch(ar, br)}${ch(ag, bg)}${ch(ab, bb)}`;
}

/**
 * Map a duration value (ms) to a colour on the 3-stop scale.
 *  value ≤ median → fast→medium gradient; value > median → medium→slow gradient.
 * Endpoints collapse gracefully when the data range is degenerate.
 */
export function performanceColor(value: number, scale: PerfScale): string {
  const { min, median, max } = scale;
  if (value <= median) {
    const span = median - min;
    const t = span <= 0 ? 0 : (value - min) / span;
    return lerpHexColor(PERF_FAST_COLOR, PERF_MEDIUM_COLOR, clamp01(t));
  }
  const span = max - median;
  const t = span <= 0 ? 1 : (value - median) / span;
  return lerpHexColor(PERF_MEDIUM_COLOR, PERF_SLOW_COLOR, clamp01(t));
}

// ─── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  dfg: DirectlyFollowsGraph;
  /** Currently highlighted path's run-ids (from PathCard rail selection). */
  selectedRunIds?: readonly string[] | null;
  /** Opaque workflow UUID — used only in analytics payloads. */
  workflowId?: string;
  /** Total variants fed to the DFG (for analytics payload). */
  variantCount?: number;
  /** Standard-path frequency, 2 dp (for analytics). */
  standardFrequency?: number;
  /** Decision point count (for analytics). */
  decisionPointCount?: number;
  /** Milliseconds since `variant_map_viewed` fired — passed from parent. */
  variantViewStartRef: React.RefObject<number>;
}

// ─── Custom dfgNode ───────────────────────────────────────────────────────────

const DfgNodeComponent = memo(function DfgNodeComponent({
  data,
  selected,
}: NodeProps<DfgFlowNode>) {
  const nodeData = data as DfgFlowNodeData & {
    perfMode?: DfgMapMode;
    perfColor?: string;
    lowData?: boolean;
  };
  const { label, caseCount, kind, weight, meanDurationMs } = nodeData;

  const isTerminal = kind === 'start' || kind === 'end';
  // Terminals are structural (Start/End) — keep their colours in performance mode.
  const perfActive = nodeData.perfMode === 'performance' && !isTerminal;
  const perfColor  = nodeData.perfColor ?? PERF_NEUTRAL_COLOR;
  const lowData    = nodeData.lowData ?? false;

  // Extracted into useMemo so React.memo can bail on unchanged props instead of
  // re-creating the style object every render (memo-break fix, QW2b item 6).
  const baseStyle = useMemo<React.CSSProperties>(() => {
    if (isTerminal) {
      return {
        background: kind === 'start' ? '#22c55e' : '#ef4444',
        border: '2px solid',
        borderColor: kind === 'start' ? '#16a34a' : '#dc2626',
        borderRadius: '50%',
        width: 40,
        height: 40,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 9,
        fontWeight: 700,
        color: '#fff',
      };
    }
    if (perfActive) {
      return {
        background: perfColor,
        border: selected ? '2px solid #4f46e5' : '1px solid rgba(0,0,0,0.08)',
        borderRadius: 6,
        padding: '6px 10px',
        minWidth: 120,
        maxWidth: 200,
        fontSize: 11,
        fontWeight: 500,
        color: lowData ? '#374151' : '#ffffff',
        boxShadow: selected ? '0 0 0 2px rgba(79,70,229,0.35)' : '0 1px 3px rgba(0,0,0,0.10)',
        position: 'relative' as const,
      };
    }
    return {
      background: 'var(--surface-primary, #fff)',
      border: selected ? '2px solid #6366f1' : '1px solid var(--border-subtle, #e5e7eb)',
      borderRadius: 6,
      padding: '6px 10px',
      minWidth: 120,
      maxWidth: 200,
      fontSize: 11,
      fontWeight: 500,
      color: 'var(--content-primary, #111827)',
      boxShadow: selected ? '0 0 0 2px rgba(99,102,241,0.3)' : '0 1px 3px rgba(0,0,0,0.06)',
      opacity: 1 - (1 - weight) * 0.3, // subtle dimming for low-frequency nodes
      position: 'relative' as const,
    };
  }, [isTerminal, kind, selected, weight, perfActive, perfColor, lowData]);

  const perfTitle = perfActive
    ? lowData
      ? 'Insufficient data for performance view'
      : `Mean ${formatDuration(meanDurationMs)}`
    : undefined;

  return (
    <div style={baseStyle} {...(perfTitle ? { title: perfTitle } : {})}>
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />

      {isTerminal ? (
        <span>{kind === 'start' ? '▶' : '■'}</span>
      ) : (
        <>
          <div style={{ fontSize: 11, fontWeight: 500, lineHeight: 1.3 }}>{label}</div>

          {/* Visit-count badge (UX_SPEC.md §2.3) — omit for terminals */}
          <div
            style={{
              position: 'absolute',
              top: -6,
              right: -6,
              height: 16,
              minWidth: 20,
              padding: '0 4px',
              borderRadius: 8,
              background: '#f5f3ff', // violet-50
              border: '1px solid #ddd6fe', // violet-200
              fontSize: 9,
              fontWeight: 600,
              color: '#4c1d95', // violet-900
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            aria-label={`${caseCount} visits`}
          >
            {caseCount}
          </div>
        </>
      )}

      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
    </div>
  );
});

// ─── Custom dfgEdge ───────────────────────────────────────────────────────────

const DfgEdgeComponent = memo(function DfgEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
}: EdgeProps<DfgFlowEdge>) {
  const edgeData = data as
    | (DfgFlowEdgeData & { perfMode?: DfgMapMode; perfColor?: string; lowData?: boolean })
    | undefined;
  const weight = edgeData?.weight ?? 0;

  const [edgePath] = getSmoothStepPath({
    sourceX, sourceY, targetX, targetY,
    sourcePosition, targetPosition,
    borderRadius: 12,
  });

  // Frequency mode (default) — byte-identical to prior behaviour.
  if (edgeData?.perfMode !== 'performance') {
    const strokeWidth = uiStrokeWidth(weight);
    const opacity     = uiOpacity(weight);
    return (
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: EDGE_COLOR,
          strokeWidth,
          opacity,
          transition: 'stroke 0.15s ease, stroke-width 0.15s ease, opacity 0.15s ease',
        }}
        markerEnd="url(#dfg-arrow)"
      />
    );
  }

  // Performance mode — colour by duration; thickness held FIXED (no double-encoding).
  const lowData = edgeData.lowData ?? true;
  const stroke  = edgeData.perfColor ?? PERF_NEUTRAL_COLOR;
  const tooltip = lowData
    ? 'Insufficient data for performance view'
    : `Mean ${formatDuration(edgeData.meanDurationMs ?? 0)}`;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke,
          strokeWidth: PERF_EDGE_PX,
          opacity: lowData ? 0.45 : 0.9,
          transition: 'stroke 0.15s ease, opacity 0.15s ease',
        }}
        markerEnd="url(#dfg-arrow)"
      />
      {/* Invisible wide hit-area carrying the native duration tooltip. */}
      <path d={edgePath} fill="none" stroke="transparent" strokeWidth={14}>
        <title>{tooltip}</title>
      </path>
    </>
  );
});

// ─── Node / edge type registries ─────────────────────────────────────────────

const NODE_TYPES: NodeTypes = {
  dfgNode: DfgNodeComponent as unknown as NodeTypes['dfgNode'],
};

const EDGE_TYPES: EdgeTypes = {
  dfgEdge: DfgEdgeComponent as unknown as EdgeTypes['dfgEdge'],
};

// ─── Legend bar ───────────────────────────────────────────────────────────────

function DfgLegendBar() {
  return (
    <div
      style={{
        padding: '5px 16px',
        background: 'rgba(255,255,255,0.97)',
        backdropFilter: 'blur(8px)',
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        flexShrink: 0,
        flexWrap: 'wrap',
      }}
    >
      {/* Thickness swatches */}
      <div className="flex items-center gap-2">
        {([1.5, 5, 10] as const).map((sw, i) => (
          <span key={sw} className="flex items-center gap-1">
            <svg width="24" height="10" aria-hidden="true">
              <line x1="0" y1="5" x2="24" y2="5" stroke={EDGE_COLOR} strokeWidth={sw} />
            </svg>
            <span style={{ fontSize: 9, color: 'var(--content-secondary, #6b7280)' }}>
              {['Rare', 'Common', 'Dominant'][i]}
            </span>
          </span>
        ))}
      </div>

      {/* Node badge sample */}
      <span className="flex items-center gap-1">
        <span
          style={{
            height: 16,
            minWidth: 20,
            padding: '0 4px',
            borderRadius: 8,
            background: '#f5f3ff',
            border: '1px solid #ddd6fe',
            fontSize: 9,
            fontWeight: 600,
            color: '#4c1d95',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          47
        </span>
        <span style={{ fontSize: 9, color: 'var(--content-secondary, #6b7280)' }}>= visit count</span>
      </span>

      {/* Honesty note (UX_SPEC.md §5) */}
      <span
        style={{
          fontSize: 9,
          color: 'var(--content-tertiary, #9ca3af)',
          fontStyle: 'italic',
          marginLeft: 'auto',
        }}
      >
        Frequency reflects observed transitions only — no inferred conditions or decision logic
      </span>
    </div>
  );
}

// ─── Frequency / Performance mode toggle (QW2b) ───────────────────────────────

interface ModeToggleBarProps {
  mode: DfgMapMode;
  onChange: (mode: DfgMapMode) => void;
}

function ModeToggleBar({ mode, onChange }: ModeToggleBarProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 16px',
        borderBottom: '1px solid #e5e7eb',
        flexShrink: 0,
      }}
    >
      <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--content-secondary, #6b7280)' }}>
        View
      </span>
      <div
        role="group"
        aria-label="Map encoding mode"
        style={{ display: 'inline-flex', borderRadius: 6, overflow: 'hidden', border: '1px solid #e5e7eb' }}
      >
        {(['frequency', 'performance'] as const).map((m) => {
          const active = m === mode;
          return (
            <button
              key={m}
              type="button"
              onClick={() => onChange(m)}
              aria-pressed={active}
              style={{
                fontSize: 10,
                fontWeight: 600,
                padding: '4px 12px',
                cursor: 'pointer',
                border: 'none',
                background: active ? '#6366f1' : '#fff',
                color: active ? '#fff' : 'var(--content-secondary, #6b7280)',
              }}
            >
              {m === 'frequency' ? 'Frequency' : 'Performance'}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Performance legend bar (QW2b) ────────────────────────────────────────────

function PerfSwatch({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span
        style={{
          width: 14,
          height: 10,
          borderRadius: 2,
          background: color,
          display: 'inline-block',
        }}
        aria-hidden="true"
      />
      <span style={{ fontSize: 9, color: 'var(--content-secondary, #6b7280)' }}>{label}</span>
    </span>
  );
}

function DfgPerformanceLegendBar({ scale }: { scale: PerfScale | null }) {
  return (
    <div
      style={{
        padding: '5px 16px',
        background: 'rgba(255,255,255,0.97)',
        backdropFilter: 'blur(8px)',
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        flexShrink: 0,
        flexWrap: 'wrap',
      }}
    >
      {scale ? (
        <div className="flex items-center gap-3">
          <PerfSwatch color={PERF_FAST_COLOR} label={`Fast · ${formatDuration(scale.min)}`} />
          <PerfSwatch color={PERF_MEDIUM_COLOR} label={`Median · ${formatDuration(scale.median)}`} />
          <PerfSwatch color={PERF_SLOW_COLOR} label={`Slow · ${formatDuration(scale.max)}`} />
          <PerfSwatch color={PERF_NEUTRAL_COLOR} label="No timing data" />
        </div>
      ) : (
        <span style={{ fontSize: 9, color: 'var(--content-secondary, #6b7280)' }}>
          No timing data available for performance view
        </span>
      )}

      {/* Honesty note (UX_SPEC.md §5) */}
      <span
        style={{
          fontSize: 9,
          color: 'var(--content-tertiary, #9ca3af)',
          fontStyle: 'italic',
          marginLeft: 'auto',
        }}
      >
        Durations reflect observed step timings only — node = step time, edge = transition (target-step) time
      </span>
    </div>
  );
}

// ─── Coverage slider ──────────────────────────────────────────────────────────

interface SliderBarProps {
  value: number;
  onChange: (pct: number) => void;
  pathCount: number;
  totalPaths: number;
  totalRuns: number;
}

function CoverageSliderBar({ value, onChange, pathCount, totalPaths, totalRuns }: SliderBarProps) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const pct = Number(e.target.value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => onChange(pct), 80);
    },
    [onChange],
  );

  const feedbackText =
    value === 100
      ? `Showing all runs (${totalRuns} total) · ${pathCount} path${pathCount !== 1 ? 's' : ''}`
      : `Showing ${value}% of runs across ${pathCount} path${pathCount !== 1 ? 's' : ''}`;

  return (
    <div className="flex items-center gap-3 px-4 py-2 border-t border-[var(--border-subtle)]">
      <span style={{ fontSize: 10, fontWeight: 500, color: 'var(--content-secondary)', flexShrink: 0 }}>
        Coverage
      </span>
      <input
        type="range"
        min={0}
        max={100}
        step={5}
        defaultValue={value}
        aria-label="Path coverage — percentage of runs to include"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
        aria-valuetext={`${value}% of runs · ${totalPaths} paths`}
        onInput={handleInput}
        className="flex-1 h-1.5 rounded-full accent-violet-600"
        style={{ cursor: 'pointer' }}
      />
      <span
        role="status"
        aria-live="polite"
        style={{ fontSize: 10, color: 'var(--content-tertiary)', flexShrink: 0 }}
      >
        {feedbackText}
      </span>
    </div>
  );
}

// ─── SVG arrowhead marker (injected into React-Flow's SVG defs) ─────────────

function DfgArrowMarker() {
  return (
    <svg style={{ position: 'absolute', width: 0, height: 0 }}>
      <defs>
        <marker
          id="dfg-arrow"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill={EDGE_COLOR} />
        </marker>
      </defs>
    </svg>
  );
}

// ─── Inner canvas (must be inside ReactFlowProvider) ────────────────────────

interface CanvasProps {
  nodes: Node[];
  edges: Edge[];
}

function DfgCanvas({ nodes, edges }: CanvasProps) {
  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={NODE_TYPES}
      edgeTypes={EDGE_TYPES}
      fitView
      fitViewOptions={{ padding: 0.3, maxZoom: 1.2 }}
      minZoom={0.1}
      maxZoom={2.5}
      panOnScroll
      nodesConnectable={false}
      nodesDraggable={false}
      elementsSelectable={false}
      proOptions={{ hideAttribution: true }}
    >
      <Background color="var(--border-subtle, #f3f4f6)" gap={24} size={1} />
    </ReactFlow>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function DfgFrequencyMap({
  dfg,
  selectedRunIds,
  workflowId,
  variantCount,
  standardFrequency,
  decisionPointCount,
  variantViewStartRef,
}: Props) {
  const [coveragePct, setCoveragePct] = useState(80);
  // Default 'frequency' so existing behaviour is byte-identical until toggled.
  const [mapMode, setMapMode] = useState<DfgMapMode>('frequency');

  // Fire analytics on mount
  useEffect(() => {
    if (!workflowId) return;
    const elapsed = Date.now() - (variantViewStartRef.current ?? Date.now());
    track({
      event: 'variant_map_viewed',
      workflowId,
      totalRuns: dfg.totalRuns,
      variantCount: variantCount ?? 0,
      standardFrequency: standardFrequency ?? 0,
      decisionPointCount: decisionPointCount ?? 0,
      initialView: 'frequency_map',
    });
    void elapsed; // consumed via variantViewStartRef if parent already fired
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workflowId]);

  // Filter DFG by coverage
  const filteredDfg = useMemo(
    () => filterDfgByCoverage(dfg, coveragePct / 100, coveragePct / 100),
    [dfg, coveragePct],
  );

  // Convert to React-Flow nodes/edges
  const { nodes: rfNodes, edges: rfEdges } = useMemo(
    () => dfgToReactFlow(filteredDfg),
    [filteredDfg],
  );

  // Apply variant-highlight overlay when a path is selected (UX_SPEC.md §4)
  const decorated = useMemo(() => {
    if (!selectedRunIds || selectedRunIds.length === 0) {
      return { nodes: rfNodes, edges: rfEdges };
    }

    const selectedSet = new Set(selectedRunIds);

    const highlightedEdges = rfEdges.map((edge) => {
      const eData = (edge.data as DfgFlowEdgeData | undefined);
      const onPath = eData?.evidenceRunIds.some((id) => selectedSet.has(id)) ?? false;
      const w = eData?.weight ?? 0;
      if (onPath) {
        return {
          ...edge,
          style: {
            stroke: HAPPY_COLOR,
            strokeWidth: uiStrokeWidth(w) + 2,
            opacity: 1,
            transition: 'stroke 0.2s ease, stroke-width 0.15s ease, opacity 0.2s ease',
          },
        };
      }
      return {
        ...edge,
        style: {
          stroke: '#9ca3af',
          strokeWidth: uiStrokeWidth(w),
          opacity: 0.08,
          transition: 'stroke 0.2s ease, stroke-width 0.15s ease, opacity 0.2s ease',
        },
      };
    });

    const highlightedNodes = rfNodes.map((node) => {
      const nData = (node.data as DfgFlowNodeData | undefined);
      const onPath = nData?.evidenceRunIds.some((id) => selectedSet.has(id)) ?? false;
      if (onPath) {
        return { ...node };
      }
      return {
        ...node,
        style: { ...(node.style ?? {}), opacity: 0.4 },
      };
    });

    return { nodes: highlightedNodes, edges: highlightedEdges };
  }, [rfNodes, rfEdges, selectedRunIds]);

  // Performance scale derived from the VISIBLE (post-coverage) duration data range.
  // Samples = mean duration of every activity node + edge with ≥ PERF_MIN_SAMPLES.
  const perfScale = useMemo(() => {
    const samples: number[] = [];
    for (const n of rfNodes) {
      const d = n.data as DfgFlowNodeData;
      if (d.kind === 'activity' && d.durationSampleCount >= PERF_MIN_SAMPLES) {
        samples.push(d.meanDurationMs);
      }
    }
    for (const e of rfEdges) {
      const d = e.data as DfgFlowEdgeData | undefined;
      if (d && d.durationSampleCount >= PERF_MIN_SAMPLES) {
        samples.push(d.meanDurationMs);
      }
    }
    return buildPerformanceScale(samples);
  }, [rfNodes, rfEdges]);

  // Final nodes/edges. In 'frequency' mode this is the highlight overlay verbatim
  // (byte-identical to prior behaviour). In 'performance' mode we inject the
  // per-item duration colour onto `data` for the custom node/edge components.
  const { nodes, edges } = useMemo(() => {
    if (mapMode === 'frequency') return decorated;

    const perfNodes = decorated.nodes.map((node) => {
      const d = node.data as DfgFlowNodeData;
      if (d.kind !== 'activity') return node; // terminals stay structural
      const lowData = d.durationSampleCount < PERF_MIN_SAMPLES;
      const perfColor =
        lowData || !perfScale ? PERF_NEUTRAL_COLOR : performanceColor(d.meanDurationMs, perfScale);
      return { ...node, data: { ...node.data, perfMode: 'performance', perfColor, lowData } };
    });

    const perfEdges = decorated.edges.map((edge) => {
      const d = edge.data as DfgFlowEdgeData | undefined;
      const lowData = !d || d.durationSampleCount < PERF_MIN_SAMPLES;
      const perfColor =
        lowData || !perfScale || !d
          ? PERF_NEUTRAL_COLOR
          : performanceColor(d.meanDurationMs, perfScale);
      return { ...edge, data: { ...(edge.data ?? {}), perfMode: 'performance', perfColor, lowData } };
    });

    return { nodes: perfNodes, edges: perfEdges };
  }, [decorated, mapMode, perfScale]);

  // Mode-toggle analytics callback. Does NOT reset coverage or path highlights.
  const handleModeToggle = useCallback(
    (mode: DfgMapMode) => {
      if (mode === mapMode) return;
      setMapMode(mode);
      if (!workflowId) return;
      const elapsed = Date.now() - (variantViewStartRef.current ?? Date.now());
      track({
        event: 'dfg_performance_mode_toggled',
        workflowId,
        mode,
        elapsedMsSinceVariantView: elapsed,
      });
    },
    [mapMode, workflowId, variantViewStartRef],
  );

  // Coverage slider analytics callback
  const handleCoverageChange = useCallback(
    (pct: number) => {
      setCoveragePct(pct);
      if (!workflowId) return;
      const elapsed = Date.now() - (variantViewStartRef.current ?? Date.now());
      track({
        event: 'variant_coverage_slider_changed',
        workflowId,
        coveragePct: pct,
        visibleVariantCount: filteredDfg.nodes.filter((n) => n.kind === 'activity').length,
        totalVariantCount: dfg.nodes.filter((n) => n.kind === 'activity').length,
        elapsedMsSinceVariantView: elapsed,
      });
    },
    [workflowId, dfg, filteredDfg, variantViewStartRef],
  );

  // "All paths filtered out" state
  const noVisiblePaths = filteredDfg.edges.length === 0 && dfg.edges.length > 0;

  return (
    <div className="absolute inset-0 flex flex-col">
      {/* Frequency / Performance mode toggle */}
      <ModeToggleBar mode={mapMode} onChange={handleModeToggle} />

      {/* Coverage slider */}
      <CoverageSliderBar
        value={coveragePct}
        onChange={handleCoverageChange}
        pathCount={filteredDfg.nodes.filter((n) => n.kind === 'activity').length}
        totalPaths={dfg.nodes.filter((n) => n.kind === 'activity').length}
        totalRuns={dfg.totalRuns}
      />

      {/* Legend — frequency vs performance */}
      {mapMode === 'frequency' ? (
        <DfgLegendBar />
      ) : (
        <DfgPerformanceLegendBar scale={perfScale} />
      )}

      {/* Canvas */}
      <div className="relative flex-1 overflow-hidden">
        {noVisiblePaths ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <p
              style={{
                fontSize: 11,
                color: 'var(--content-tertiary, #9ca3af)',
                textAlign: 'center',
                maxWidth: 300,
              }}
            >
              No paths match this coverage filter — drag the slider right to include more runs
            </p>
          </div>
        ) : (
          <>
            <DfgArrowMarker />
            <ReactFlowProvider>
              <DfgCanvas nodes={nodes} edges={edges} />
            </ReactFlowProvider>
          </>
        )}
      </div>
    </div>
  );
}
