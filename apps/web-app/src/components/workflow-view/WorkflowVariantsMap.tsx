'use client';

/**
 * Process Variants Map — Analytical variant comparison visualization.
 *
 * Shows how the process actually varies across runs: dominant path,
 * fastest/longest/exception paths, divergence points, and step-by-step
 * comparison. Uses a split layout with path cards on the left and a
 * step sequence visualization on the right.
 *
 * When variant data is unavailable (single run), shows a graceful
 * single-path view with guidance on how to generate variant data.
 */

import { useState, useMemo, useRef, useEffect } from 'react';
import {
  GitBranch, TrendingUp, Clock, Zap, AlertTriangle, CheckCircle2,
  ChevronRight, ArrowRight, BarChart3, Target, Layers, Info,
} from 'lucide-react';
import type { NormalizedViewModel, ViewNode } from './adapters/viewModel';
import { buildVariantData } from './adapters/variantAdapter';
import type { ViewVariantPath } from './adapters/viewModel';
import { CATEGORY_STYLES } from './constants';
import { WorkflowVariantStoryMap } from './WorkflowVariantStoryMap';
import { VariantDnaStrip } from './VariantDnaStrip';
import { WorkflowFlowCanvas } from './WorkflowCanvas';
import type { CanvasControls } from './WorkflowCanvas';
import {
  buildVariantFlowModel,
  portfolioIntelligenceToVariantInput,
} from '@/lib/variantFlowModel';
import { formatDuration } from '@/lib/format';
import { buildDirectlyFollowsGraph } from '@/lib/dfgModel';
import { DfgFrequencyMap } from './DfgFrequencyMap';
import { track } from '@/lib/analytics';

// ─── Props ───────────────────────────────────────────────────────────────────

interface Props {
  graph: NormalizedViewModel;
  intelligence?: any;
  /** Opaque server workflow UUID — threaded to DfgFrequencyMap analytics. */
  workflowId?: string | undefined;
  /** Load status — drives loading/error/forbidden/unprocessed states. */
  status?: 'idle' | 'loading' | 'loaded' | 'unprocessed' | 'forbidden' | 'error' | undefined;
  /** Retry the variants load. */
  onRetry?: (() => void) | undefined;
  onSelectNode: (id: string | null) => void;
  /** Wires the shell toolbar zoom/fit controls to the variant flow canvas. */
  onCanvasReady?: ((controls: CanvasControls) => void) | undefined;
}

// ─── Path classification ─────────────────────────────────────────────────────

type PathRole = 'standard' | 'fastest' | 'longest' | 'exception' | 'variant';

interface ClassifiedPath extends ViewVariantPath {
  role: PathRole;
  roleLabel: string;
  roleColor: string;
  roleBg: string;
  roleBorder: string;
  durationLabel: string;
  deltaVsStandard: string;
  stepCountDelta: number;
}

function classifyPaths(paths: ViewVariantPath[], graph: NormalizedViewModel): ClassifiedPath[] {
  if (paths.length === 0) {
    // No variant data — create a single "observed" path from the graph
    return [{
      id: 'observed',
      label: 'Observed Path',
      isStandard: true,
      frequency: 1.0,
      runCount: 1,
      avgDurationMs: graph.totalDurationMs,
      stepCategories: graph.nodes.filter(n => n.nodeType === 'task').map(n => n.category),
      divergencePoints: [],
      evidenceRunIds: [],
      role: 'standard',
      roleLabel: 'Observed',
      roleColor: '#059669',
      roleBg: '#ecfdf5',
      roleBorder: '#6ee7b7',
      durationLabel: formatDuration(graph.totalDurationMs) || '—',
      deltaVsStandard: '—',
      stepCountDelta: 0,
    }];
  }

  const standard = paths.find(p => p.isStandard) ?? paths[0]!;
  const standardDur = standard.avgDurationMs ?? 0;
  const standardSteps = standard.stepCategories.length;

  // Find fastest/longest by duration if available. Deterministic tie-break by id
  // so equal-duration paths always resolve to the same winner regardless of order.
  const withDuration = paths.filter(p => p.avgDurationMs !== null);
  const fastestId = withDuration.length > 1
    ? withDuration.reduce((min, p) => {
        const dp = p.avgDurationMs ?? Infinity;
        const dm = min.avgDurationMs ?? Infinity;
        if (dp < dm) return p;
        if (dp === dm && p.id < min.id) return p;
        return min;
      }).id
    : null;
  const longestId = withDuration.length > 1
    ? withDuration.reduce((max, p) => {
        const dp = p.avgDurationMs ?? 0;
        const dm = max.avgDurationMs ?? 0;
        if (dp > dm) return p;
        if (dp === dm && p.id < max.id) return p;
        return max;
      }).id
    : null;

  return paths.map(p => {
    const dur = p.avgDurationMs ?? 0;
    const stepDelta = p.stepCategories.length - standardSteps;
    let durationDelta = '—';
    if (standardDur > 0 && dur > 0 && p.id !== standard.id) {
      const pct = Math.round(((dur - standardDur) / standardDur) * 100);
      durationDelta = pct > 0 ? `+${pct}%` : `${pct}%`;
    }

    let role: PathRole = 'variant';
    let roleLabel = `Variant`;
    let roleColor = '#6366f1';
    let roleBg = '#eef2ff';
    let roleBorder = '#a5b4fc';

    if (p.isStandard || p.id === standard.id) {
      role = 'standard';
      roleLabel = 'Standard Path';
      roleColor = '#059669';
      roleBg = '#ecfdf5';
      roleBorder = '#6ee7b7';
    } else if (p.id === fastestId && p.id !== standard.id) {
      role = 'fastest';
      roleLabel = 'Fastest';
      roleColor = '#2563eb';
      roleBg = '#eff6ff';
      roleBorder = '#93c5fd';
    } else if (p.id === longestId && p.id !== standard.id) {
      role = 'longest';
      roleLabel = 'Longest';
      roleColor = '#d97706';
      roleBg = '#fffbeb';
      roleBorder = '#fcd34d';
    }

    // Check for exception-heavy paths (high error step ratio)
    const errorCategories = p.stepCategories.filter(c => c === 'error_handling');
    if (errorCategories.length >= 2 && role === 'variant') {
      role = 'exception';
      roleLabel = 'Exception Heavy';
      roleColor = '#dc2626';
      roleBg = '#fef2f2';
      roleBorder = '#fca5a5';
    }

    return {
      ...p,
      role,
      roleLabel,
      roleColor,
      roleBg,
      roleBorder,
      durationLabel: dur > 0 ? (formatDuration(dur) || '—') : '—',
      deltaVsStandard: durationDelta,
      stepCountDelta: stepDelta,
    };
  }).sort((a, b) => {
    // Standard first, then by frequency descending, with a stable id tie-break.
    if (a.isStandard && !b.isStandard) return -1;
    if (b.isStandard && !a.isStandard) return 1;
    return (b.frequency - a.frequency) || a.id.localeCompare(b.id);
  });
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function WorkflowVariantsMap({ graph, intelligence, workflowId, status, onRetry, onSelectNode, onCanvasReady }: Props) {
  const variantData = useMemo(() => buildVariantData(graph, intelligence), [graph, intelligence]);
  const paths = useMemo(() => classifyPaths(variantData.paths, graph), [variantData.paths, graph]);

  const [selectedPathId, setSelectedPathId] = useState<string | null>(
    paths.find(p => p.isStandard)?.id ?? paths[0]?.id ?? null,
  );
  const [comparePathId, setComparePathId] = useState<string | null>(null);
  const [view, setView] = useState<'map' | 'frequency' | 'dna' | 'list'>('map');
  const variantViewStartRef = useRef<number>(0);

  // Record the exact moment this variant panel first becomes visible.
  // Set exactly once on mount — all elapsed-time analytics compute relative to this.
  useEffect(() => {
    variantViewStartRef.current = Date.now();
  }, []);

  // Re-sync the selected path when `paths` changes — e.g. `intelligence` loads
  // async after mount, so the initial useState selection (computed from the
  // fallback paths) becomes stale and no card would be highlighted.
  useEffect(() => {
    if (!paths.some((p) => p.id === selectedPathId)) {
      setSelectedPathId(paths.find((p) => p.isStandard)?.id ?? paths[0]?.id ?? null);
    }
  }, [paths, selectedPathId]);

  // Build the flow-canvas model for the "Map" view (variant flow with decision nodes).
  // Real recorded step labels + durations are threaded through from the server
  // (analyzeWorkflowVariants attaches variantStepTitles/variantStepDurations) so the
  // flow nodes show the actual step names, not bare category labels.
  const variantFlowModel = useMemo(() => {
    const extra = intelligence as unknown as
      | {
          variantStepTitles?: Record<string, string[]>;
          variantStepDurations?: Record<string, number[]>;
        }
      | null
      | undefined;
    const titleMap = new Map<string, string[]>(
      Object.entries(extra?.variantStepTitles ?? ({} as Record<string, string[]>)),
    );
    const durMap = new Map<string, number[]>(
      Object.entries(extra?.variantStepDurations ?? ({} as Record<string, number[]>)),
    );
    const input = portfolioIntelligenceToVariantInput(intelligence, titleMap, durMap);
    if (input.variants.length < 2) return null;
    return buildVariantFlowModel(input);
  }, [intelligence]);

  // Build the DFG for the "Frequency" view. Reuses the same variantInput computed
  // inside variantFlowModel but duplicated here to keep memos independent and avoid
  // ordering coupling. Cost is negligible — pure in-memory aggregation.
  const dfg = useMemo(() => {
    const extra = intelligence as unknown as
      | {
          variantStepTitles?: Record<string, string[]>;
          variantStepDurations?: Record<string, number[]>;
        }
      | null
      | undefined;
    const titleMap = new Map<string, string[]>(
      Object.entries(extra?.variantStepTitles ?? ({} as Record<string, string[]>)),
    );
    const durMap = new Map<string, number[]>(
      Object.entries(extra?.variantStepDurations ?? ({} as Record<string, number[]>)),
    );
    const input = portfolioIntelligenceToVariantInput(intelligence, titleMap, durMap);
    if (input.variants.length < 2) return null;
    return buildDirectlyFollowsGraph(input.variants);
  }, [intelligence]);

  const selectedPath = paths.find(p => p.id === selectedPathId) ?? null;
  const comparePath = comparePathId ? paths.find(p => p.id === comparePathId) ?? null : null;

  const standardPath = paths.find(p => p.isStandard) ?? paths[0] ?? null;

  // Surface the REAL load state instead of the misleading "single recording" view
  // when the variant intelligence failed/loading/gated.
  if (status === 'forbidden') return <VariantsStateView kind="forbidden" />;
  if (status === 'error') return <VariantsStateView kind="error" onRetry={onRetry} />;
  if (status === 'unprocessed') return <VariantsStateView kind="unprocessed" onRetry={onRetry} />;
  if (status === 'loading' || status === 'idle') return <VariantsStateView kind="loading" />;

  // No multi-variant data: either a true single recording, OR multiple runs that
  // all followed the SAME path (consistent — zero variation, NOT "single recording").
  if (!variantData.hasVariantData) {
    const totalRuns = variantData.paths.reduce((s, p) => s + (p.runCount ?? 0), 0);
    return <SinglePathView graph={graph} path={paths[0] ?? null} totalRuns={totalRuns} onSelectNode={onSelectNode} />;
  }

  return (
    <div className="absolute inset-0 flex flex-col">
      {/* View toggle: Map (story map) | List (path cards) */}
      <div className="flex items-center px-4 py-1.5 border-b border-[var(--border-subtle)] bg-[var(--surface-secondary)]">
        <span className="flex-1" />
        <div className="flex overflow-hidden rounded-lg border border-[var(--border-subtle)] text-[10px] font-medium">
          <button
            data-testid="variants-view-map"
            onClick={() => {
              if (view !== 'map') {
                const fromView = view === 'frequency' ? 'frequency_map' : view === 'dna' ? 'dna' : 'list';
                track({ event: 'variant_view_toggled', workflowId: workflowId ?? '', fromView, toView: 'map', elapsedMsSinceVariantView: Date.now() - (variantViewStartRef.current ?? 0) });
              }
              setView('map');
            }}
            className={`px-2.5 py-1 transition-colors ${view === 'map' ? 'bg-violet-600 text-white' : 'text-[var(--content-secondary)] hover:bg-[var(--surface-elevated)]'}`}
          >
            Map
          </button>
          <button
            data-testid="variants-view-frequency"
            onClick={() => {
              if (view !== 'frequency') {
                const fromView = view === 'map' ? 'map' : view === 'dna' ? 'dna' : 'list';
                track({ event: 'variant_view_toggled', workflowId: workflowId ?? '', fromView, toView: 'frequency_map', elapsedMsSinceVariantView: Date.now() - (variantViewStartRef.current ?? 0) });
              }
              setView('frequency');
            }}
            className={`px-2.5 py-1 transition-colors ${view === 'frequency' ? 'bg-violet-600 text-white' : 'text-[var(--content-secondary)] hover:bg-[var(--surface-elevated)]'}`}
          >
            Frequency
          </button>
          <button
            data-testid="variants-view-dna"
            onClick={() => {
              if (view !== 'dna') {
                const fromView = view === 'frequency' ? 'frequency_map' : view === 'map' ? 'map' : 'list';
                track({ event: 'variant_view_toggled', workflowId: workflowId ?? '', fromView, toView: 'dna', elapsedMsSinceVariantView: Date.now() - (variantViewStartRef.current ?? 0) });
              }
              setView('dna');
            }}
            className={`px-2.5 py-1 transition-colors ${view === 'dna' ? 'bg-violet-600 text-white' : 'text-[var(--content-secondary)] hover:bg-[var(--surface-elevated)]'}`}
          >
            DNA
          </button>
          <button
            data-testid="variants-view-list"
            onClick={() => {
              if (view !== 'list') {
                const fromView = view === 'frequency' ? 'frequency_map' : view === 'dna' ? 'dna' : 'map';
                track({ event: 'variant_view_toggled', workflowId: workflowId ?? '', fromView, toView: 'list', elapsedMsSinceVariantView: Date.now() - (variantViewStartRef.current ?? 0) });
              }
              setView('list');
            }}
            className={`px-2.5 py-1 transition-colors ${view === 'list' ? 'bg-violet-600 text-white' : 'text-[var(--content-secondary)] hover:bg-[var(--surface-elevated)]'}`}
          >
            List
          </button>
        </div>
      </div>

      <div className="relative flex-1 overflow-hidden">
        {view === 'map' ? (
          variantFlowModel ? (
            /* Flow Intelligence canvas enriched with decision diamonds + branch lanes */
            <VariantFlowCanvasWrapper
              model={variantFlowModel}
              onSelectNode={onSelectNode}
              onCanvasReady={onCanvasReady}
            />
          ) : (
            /* Fallback: original story map when flow model not available */
            <WorkflowVariantStoryMap variants={variantData.paths} onSelectNode={onSelectNode} />
          )
        ) : view === 'frequency' ? (
          dfg ? (
            <DfgFrequencyMap
              dfg={dfg}
              workflowId={workflowId ?? ''}
              variantCount={paths.length}
              standardFrequency={paths.find(p => p.isStandard)?.frequency ?? 0}
              decisionPointCount={variantFlowModel?.nodes.filter(n => n.isDecisionPoint).length ?? 0}
              variantViewStartRef={variantViewStartRef}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-[var(--content-secondary)] text-ds-sm">
              Not enough runs to build a frequency map.
            </div>
          )
        ) : view === 'dna' ? (
          <VariantDnaStrip variants={variantData.paths} />
        ) : (
          <div className="absolute inset-0 flex overflow-hidden">
      {/* ── Left: Path cards rail ──────────────────────────────────────── */}
      <div className="w-80 flex-shrink-0 border-r border-[var(--border-subtle)] bg-[var(--surface-elevated)] overflow-y-auto">
        {/* Overview header */}
        <div className="px-4 py-3 border-b border-[var(--border-subtle)] bg-[var(--surface-secondary)]">
          <div className="flex items-center gap-2 mb-2">
            <GitBranch className="h-4 w-4 text-violet-600" />
            <h3 className="text-ds-sm font-semibold text-[var(--content-primary)]">Process Variants</h3>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <MiniStat label="Paths" value={paths.length} />
            <MiniStat label="Total Runs" value={variantData.paths.reduce((s, p) => s + p.runCount, 0)} />
            <MiniStat label="Steps" value={graph.totalSteps} />
          </div>
        </div>

        {/* Path cards */}
        <div className="p-2 space-y-1.5">
          {paths.map(path => (
            <PathCard
              key={path.id}
              path={path}
              isSelected={selectedPathId === path.id}
              isComparing={comparePathId === path.id}
              onSelect={() => setSelectedPathId(path.id)}
              onCompare={() => setComparePathId(comparePathId === path.id ? null : path.id)}
            />
          ))}
        </div>

        {/* Comparison shortcuts */}
        {paths.length > 1 && (
          <div className="px-4 py-3 border-t border-[var(--border-subtle)]">
            <p className="text-[9px] font-semibold text-[var(--content-tertiary)] uppercase tracking-wider mb-2">Quick Compare</p>
            <div className="space-y-1">
              {paths.filter(p => !p.isStandard).slice(0, 3).map(p => (
                <button
                  key={p.id}
                  onClick={() => { setSelectedPathId(standardPath?.id ?? null); setComparePathId(p.id); }}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[10px] text-[var(--content-secondary)] hover:bg-[var(--surface-secondary)] transition-colors text-left"
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#059669' }} />
                  <span className="text-[var(--content-tertiary)]">vs</span>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: p.roleColor }} />
                  <span className="truncate">Standard vs {p.roleLabel}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Right: Path detail + step comparison ──────────────────────── */}
      <div className="flex-1 overflow-y-auto bg-[var(--surface-secondary)] p-5">
        {selectedPath && (
          <div className="space-y-4 max-w-3xl mx-auto">
            {/* Path summary header */}
            <PathSummaryCard path={selectedPath} totalRuns={variantData.paths.reduce((s, p) => s + p.runCount, 0)} />

            {/* Comparison view */}
            {comparePath && (
              <ComparisonCard primary={selectedPath} secondary={comparePath} />
            )}

            {/* Step sequence */}
            <StepSequenceView
              path={selectedPath}
              graph={graph}
              standardPath={standardPath}
              onSelectNode={onSelectNode}
            />

            {/* Insights cards */}
            <VariantInsightsCards path={selectedPath} graph={graph} standardPath={standardPath} />
          </div>
        )}
      </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Path Card ───────────────────────────────────────────────────────────────

function PathCard({
  path,
  isSelected,
  isComparing,
  onSelect,
  onCompare,
}: {
  path: ClassifiedPath;
  isSelected: boolean;
  isComparing: boolean;
  onSelect: () => void;
  onCompare: () => void;
}) {
  return (
    <div
      className={`rounded-xl border transition-all cursor-pointer ${
        isSelected
          ? 'border-[var(--border-default)] bg-[var(--surface-elevated)] shadow-sm ring-1 ring-[var(--border-default)]'
          : isComparing
            ? 'border-indigo-200 bg-indigo-50/30'
            : 'border-[var(--border-subtle)] bg-[var(--surface-elevated)] hover:border-[var(--border-default)] hover:shadow-sm'
      }`}
    >
      <button onClick={onSelect} className="w-full text-left px-3 py-2.5">
        {/* Header */}
        <div className="flex items-center gap-2 mb-1.5">
          <span
            className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
            style={{ color: path.roleColor, background: path.roleBg, border: `1px solid ${path.roleBorder}` }}
          >
            {path.roleLabel}
          </span>
          <span className="flex-1" />
          <span className="text-[10px] font-semibold text-[var(--content-primary)]">
            {Math.round(path.frequency * 100)}%
          </span>
        </div>

        {/* Title */}
        <p className="text-[11px] font-medium text-[var(--content-primary)] mb-1.5">{path.label}</p>

        {/* Metrics row */}
        <div className="flex items-center gap-3 text-[10px] text-[var(--content-secondary)]">
          <span className="flex items-center gap-0.5">
            <Layers className="w-2.5 h-2.5" />
            {path.stepCategories.length} steps
          </span>
          <span className="flex items-center gap-0.5">
            <Clock className="w-2.5 h-2.5" />
            {path.durationLabel}
          </span>
          <span className="flex items-center gap-0.5">
            <BarChart3 className="w-2.5 h-2.5" />
            {path.runCount} run{path.runCount !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Frequency bar */}
        <div className="mt-2 h-1 bg-[var(--surface-secondary)] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${Math.max(3, path.frequency * 100)}%`, background: path.roleColor }}
          />
        </div>
      </button>

      {/* Compare button */}
      {!path.isStandard && (
        <div className="px-3 pb-2">
          <button
            onClick={(e) => { e.stopPropagation(); onCompare(); }}
            className={`text-[9px] font-medium px-2 py-0.5 rounded transition-colors ${
              isComparing
                ? 'text-indigo-700 bg-indigo-100'
                : 'text-[var(--content-tertiary)] hover:text-[var(--content-secondary)] hover:bg-[var(--surface-secondary)]'
            }`}
          >
            {isComparing ? 'Comparing' : 'Compare vs Standard'}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Path Summary Card ───────────────────────────────────────────────────────

function PathSummaryCard({ path, totalRuns }: { path: ClassifiedPath; totalRuns: number }) {
  return (
    <div className="bg-[var(--surface-elevated)] rounded-xl border border-[var(--border-default)] shadow-sm overflow-hidden">
      <div className="px-5 py-4">
        <div className="flex items-center gap-3 mb-3">
          <span
            className="text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded"
            style={{ color: path.roleColor, background: path.roleBg, border: `1px solid ${path.roleBorder}` }}
          >
            {path.roleLabel}
          </span>
          <h3 className="text-ds-sm font-semibold text-[var(--content-primary)]">{path.label}</h3>
        </div>

        <div className="grid grid-cols-5 gap-3">
          <SummaryMetric label="Frequency" value={`${Math.round(path.frequency * 100)}%`} sublabel={`${path.runCount} of ${totalRuns} runs`} />
          <SummaryMetric label="Steps" value={`${path.stepCategories.length}`} sublabel={path.stepCountDelta !== 0 ? `${path.stepCountDelta > 0 ? '+' : ''}${path.stepCountDelta} vs std` : 'Same as std'} />
          <SummaryMetric label="Duration" value={path.durationLabel} sublabel={path.deltaVsStandard !== '—' ? `${path.deltaVsStandard} vs std` : undefined} />
          <SummaryMetric label="Divergences" value={`${path.divergencePoints.length}`} sublabel="deviation points" />
          <SummaryMetric label="Errors" value={`${path.stepCategories.filter(c => c === 'error_handling').length}`} sublabel="error steps" />
        </div>
      </div>
    </div>
  );
}

function SummaryMetric({ label, value, sublabel }: { label: string; value: string; sublabel?: string | undefined }) {
  return (
    <div className="bg-[var(--surface-secondary)] rounded-lg px-3 py-2">
      <p className="text-[9px] text-[var(--content-tertiary)] uppercase tracking-wider">{label}</p>
      <p className="text-ds-sm font-semibold text-[var(--content-primary)] mt-0.5">{value}</p>
      {sublabel && <p className="text-[9px] text-[var(--content-tertiary)] mt-0.5">{sublabel}</p>}
    </div>
  );
}

// ─── Comparison Card ─────────────────────────────────────────────────────────

function ComparisonCard({ primary, secondary }: { primary: ClassifiedPath; secondary: ClassifiedPath }) {
  const stepDiff = secondary.stepCategories.length - primary.stepCategories.length;
  const freqDiff = Math.round((secondary.frequency - primary.frequency) * 100);

  return (
    <div className="bg-[var(--surface-elevated)] rounded-xl border border-indigo-200 shadow-sm overflow-hidden">
      <div className="px-4 py-3 bg-indigo-50/50 border-b border-indigo-100">
        <div className="flex items-center gap-2">
          <Target className="h-3.5 w-3.5 text-indigo-600" />
          <span className="text-[10px] font-semibold text-indigo-700">Path Comparison</span>
        </div>
      </div>
      <div className="px-4 py-3">
        <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center">
          {/* Primary */}
          <div className="text-center">
            <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
              style={{ color: primary.roleColor, background: primary.roleBg }}>
              {primary.roleLabel}
            </span>
            <p className="text-ds-xs font-medium text-[var(--content-primary)] mt-1">{primary.stepCategories.length} steps</p>
            <p className="text-[10px] text-[var(--content-secondary)]">{primary.durationLabel}</p>
            <p className="text-[10px] text-[var(--content-secondary)]">{Math.round(primary.frequency * 100)}% of runs</p>
          </div>

          {/* vs divider */}
          <div className="flex flex-col items-center gap-1 px-3">
            <span className="text-[10px] font-bold text-[var(--content-tertiary)]">VS</span>
            <div className="w-px h-8 bg-[var(--surface-secondary)]" />
            <div className="space-y-0.5 text-center">
              {stepDiff !== 0 && (
                <p className={`text-[9px] font-medium ${stepDiff > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {stepDiff > 0 ? '+' : ''}{stepDiff} step{Math.abs(stepDiff) !== 1 ? 's' : ''}
                </p>
              )}
              {freqDiff !== 0 && (
                <p className={`text-[9px] font-medium ${freqDiff < 0 ? 'text-amber-600' : 'text-[var(--content-secondary)]'}`}>
                  {freqDiff > 0 ? '+' : ''}{freqDiff}% freq
                </p>
              )}
            </div>
          </div>

          {/* Secondary */}
          <div className="text-center">
            <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
              style={{ color: secondary.roleColor, background: secondary.roleBg }}>
              {secondary.roleLabel}
            </span>
            <p className="text-ds-xs font-medium text-[var(--content-primary)] mt-1">{secondary.stepCategories.length} steps</p>
            <p className="text-[10px] text-[var(--content-secondary)]">{secondary.durationLabel}</p>
            <p className="text-[10px] text-[var(--content-secondary)]">{Math.round(secondary.frequency * 100)}% of runs</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Step Sequence View ──────────────────────────────────────────────────────

function StepSequenceView({
  path,
  graph,
  standardPath,
  onSelectNode,
}: {
  path: ClassifiedPath;
  graph: NormalizedViewModel;
  standardPath: ClassifiedPath | null;
  onSelectNode: (id: string | null) => void;
}) {
  return (
    <div className="bg-[var(--surface-elevated)] rounded-xl border border-[var(--border-default)] shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-[var(--border-subtle)] bg-[var(--surface-secondary)]">
        <div className="flex items-center gap-2">
          <Layers className="h-3.5 w-3.5 text-[var(--content-secondary)]" />
          <span className="text-[10px] font-semibold text-[var(--content-secondary)] uppercase tracking-wider">Step Sequence</span>
          <span className="flex-1" />
          <span className="text-[10px] text-[var(--content-tertiary)]">{path.stepCategories.length} steps</span>
        </div>
      </div>

      <div className="divide-y divide-[var(--border-subtle)]">
        {path.stepCategories.map((cat, i) => {
          const style = CATEGORY_STYLES[cat as keyof typeof CATEGORY_STYLES] ?? CATEGORY_STYLES.single_action;
          // LCS-aligned divergence (not positional): only steps genuinely off the
          // standard backbone are flagged — an inserted step no longer cascades.
          const isDivergence = !path.isStandard && path.divergencePoints.includes(i);

          // Try to find the corresponding node in the graph
          const taskNodes = graph.nodes.filter(n => n.nodeType === 'task' || n.nodeType === 'exception' || n.nodeType === 'decision');
          const matchNode = taskNodes[i];

          return (
            <button
              key={`${path.id}-step-${i}`}
              onClick={() => matchNode && onSelectNode(matchNode.id)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                isDivergence ? 'bg-amber-50/30' : 'hover:bg-[var(--surface-secondary)]'
              }`}
            >
              {/* Ordinal + connector */}
              <div className="flex flex-col items-center w-6 flex-shrink-0">
                <span
                  className="text-[10px] font-bold w-5 h-5 rounded flex items-center justify-center"
                  style={{ color: style.color, background: `${style.color}12` }}
                >
                  {i + 1}
                </span>
                {i < path.stepCategories.length - 1 && (
                  <div className="w-px h-3 mt-0.5" style={{ background: `${style.color}30` }} />
                )}
              </div>

              {/* Step content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span
                    className="text-[8px] font-bold uppercase tracking-wider px-1 py-0.5 rounded"
                    style={{ color: style.color, background: `${style.color}10` }}
                  >
                    {style.label}
                  </span>
                  {matchNode && (
                    <span className="text-[10px] text-[var(--content-primary)] truncate">{matchNode.shortLabel}</span>
                  )}
                </div>
                {matchNode && matchNode.system && (
                  <span className="text-[9px] text-[var(--content-tertiary)]">{matchNode.system}</span>
                )}
              </div>

              {/* Divergence indicator */}
              {isDivergence && (
                <span className="text-[8px] font-bold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded flex-shrink-0">
                  DIVERGES
                </span>
              )}

              {/* Duration */}
              {matchNode && matchNode.durationMs > 0 && (
                <span className="text-[10px] text-[var(--content-tertiary)] flex-shrink-0">{matchNode.durationLabel}</span>
              )}

              <ChevronRight className="h-3 w-3 text-[var(--content-tertiary)] flex-shrink-0" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Variant Insights Cards ──────────────────────────────────────────────────

function VariantInsightsCards({
  path,
  graph,
  standardPath,
}: {
  path: ClassifiedPath;
  graph: NormalizedViewModel;
  standardPath: ClassifiedPath | null;
}) {
  const insights: Array<{ icon: React.ElementType; label: string; detail: string; color: string }> = [];

  if (path.isStandard && path.frequency < 0.5) {
    insights.push({
      icon: AlertTriangle,
      label: 'Low Adherence',
      detail: `Only ${Math.round(path.frequency * 100)}% of runs follow the standard path. Consider whether the standard is still accurate.`,
      color: '#d97706',
    });
  }

  if (path.role === 'fastest' && standardPath) {
    insights.push({
      icon: TrendingUp,
      label: 'Faster Alternative',
      detail: `This path completes ${path.deltaVsStandard} compared to the standard. Consider adopting it as the new baseline.`,
      color: '#2563eb',
    });
  }

  if (path.role === 'exception') {
    insights.push({
      icon: AlertTriangle,
      label: 'Exception-Heavy Path',
      detail: `This variant contains ${path.stepCategories.filter(c => c === 'error_handling').length} error handling steps. Investigate root causes.`,
      color: '#dc2626',
    });
  }

  if (path.stepCountDelta > 2 && !path.isStandard) {
    insights.push({
      icon: Layers,
      label: 'Extra Steps Detected',
      detail: `This variant has ${path.stepCountDelta} more steps than standard. These may be workarounds or unnecessary overhead.`,
      color: '#d97706',
    });
  }

  if (graph.hasFriction && path.isStandard) {
    insights.push({
      icon: Zap,
      label: 'Friction in Standard Path',
      detail: `${graph.totalFriction} friction point${graph.totalFriction !== 1 ? 's' : ''} detected in the standard path.`,
      color: '#ea580c',
    });
  }

  if (insights.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-[9px] font-semibold text-[var(--content-tertiary)] uppercase tracking-wider px-1">Path Insights</p>
      {insights.map((insight, i) => {
        const Icon = insight.icon;
        return (
          <div key={i} className="bg-[var(--surface-elevated)] rounded-xl border border-[var(--border-default)] px-4 py-3 flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: `${insight.color}10` }}>
              <Icon className="h-3.5 w-3.5" style={{ color: insight.color }} />
            </div>
            <div>
              <p className="text-ds-xs font-medium text-[var(--content-primary)]">{insight.label}</p>
              <p className="text-[10px] text-[var(--content-secondary)] mt-0.5 leading-relaxed">{insight.detail}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Load-state views (loading / error / forbidden / unprocessed) ─────────────

function VariantsStateView({
  kind,
  onRetry,
}: {
  kind: 'loading' | 'error' | 'forbidden' | 'unprocessed';
  onRetry?: (() => void) | undefined;
}) {
  return (
    <div className="absolute inset-0 flex items-center justify-center p-6">
      <div className="max-w-md text-center">
        {kind === 'loading' && (
          <>
            <div className="mx-auto mb-3 h-6 w-6 animate-spin rounded-full border-2 border-[var(--border-subtle)] border-t-violet-600" />
            <p className="text-ds-sm font-medium text-[var(--content-primary)]">Analyzing runs…</p>
            <p className="mt-1 text-[11px] text-[var(--content-tertiary)]">Gathering similar recordings and comparing how they differ.</p>
          </>
        )}
        {kind === 'forbidden' && (
          <>
            <div className="mx-auto mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-violet-50"><Zap className="h-4 w-4 text-violet-600" /></div>
            <p className="text-ds-sm font-medium text-[var(--content-primary)]">Variant analysis is a Team feature</p>
            <p className="mt-1 text-[11px] text-[var(--content-tertiary)]">Upgrade to compare how your process varies across runs.</p>
            <a href="/pricing" className="mt-3 inline-block rounded-lg bg-violet-600 px-3 py-1.5 text-[11px] font-medium text-white hover:bg-violet-700">See plans →</a>
          </>
        )}
        {kind === 'unprocessed' && (
          <>
            <div className="mx-auto mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-blue-50"><Info className="h-4 w-4 text-blue-500" /></div>
            <p className="text-ds-sm font-medium text-[var(--content-primary)]">This recording isn&apos;t analyzed yet</p>
            <p className="mt-1 text-[11px] text-[var(--content-tertiary)]">It needs to finish processing before variant analysis can run.</p>
            {onRetry && <button onClick={onRetry} className="mt-3 rounded-lg border border-[var(--border-default)] px-3 py-1.5 text-[11px] font-medium text-[var(--content-secondary)] hover:bg-[var(--surface-secondary)]">Retry</button>}
          </>
        )}
        {kind === 'error' && (
          <>
            <div className="mx-auto mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-red-50"><AlertTriangle className="h-4 w-4 text-red-500" /></div>
            <p className="text-ds-sm font-medium text-[var(--content-primary)]">Couldn&apos;t load variant analysis</p>
            <p className="mt-1 text-[11px] text-[var(--content-tertiary)]">Something went wrong gathering the runs. Try again.</p>
            {onRetry && <button onClick={onRetry} className="mt-3 rounded-lg border border-[var(--border-default)] px-3 py-1.5 text-[11px] font-medium text-[var(--content-secondary)] hover:bg-[var(--surface-secondary)]">Retry</button>}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Single Path View (no variant data) ──────────────────────────────────────

function SinglePathView({
  graph,
  path,
  totalRuns,
  onSelectNode,
}: {
  graph: NormalizedViewModel;
  path: ClassifiedPath | null;
  totalRuns: number;
  onSelectNode: (id: string | null) => void;
}) {
  const taskNodes = graph.nodes.filter(n => n.nodeType === 'task' || n.nodeType === 'exception' || n.nodeType === 'decision');
  const isConsistentMultiRun = totalRuns >= 2;

  return (
    <div className="absolute inset-0 overflow-y-auto p-5">
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Banner — consistent multi-run (zero variation) vs a true single recording */}
        {isConsistentMultiRun ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex items-start gap-3">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-ds-xs font-medium text-emerald-800">Consistent process — {totalRuns} runs, all the same path</p>
              <p className="text-[10px] text-emerald-700 mt-0.5">
                All {totalRuns} recordings followed the identical sequence, so there&apos;s no variation to compare yet. The standard path below is what every run did.
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-start gap-3">
            <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-ds-xs font-medium text-blue-800">Single recording — no variants to compare yet</p>
              <p className="text-[10px] text-blue-600 mt-0.5">
                Record this workflow multiple times to discover how the process varies across runs. Variant analysis requires at least 2 recordings of the same process.
              </p>
            </div>
          </div>
        )}

        {/* Current path summary */}
        {path && <PathSummaryCard path={path} totalRuns={Math.max(1, totalRuns)} />}

        {/* Step sequence */}
        <div className="bg-[var(--surface-elevated)] rounded-xl border border-[var(--border-default)] shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--border-subtle)] bg-[var(--surface-secondary)]">
            <span className="text-[10px] font-semibold text-[var(--content-secondary)] uppercase tracking-wider">Observed Step Sequence</span>
          </div>
          <div className="divide-y divide-[var(--border-subtle)]">
            {taskNodes.map((node, i) => {
              const style = CATEGORY_STYLES[node.category as keyof typeof CATEGORY_STYLES] ?? CATEGORY_STYLES.single_action;
              return (
                <button
                  key={node.id}
                  onClick={() => onSelectNode(node.id)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-[var(--surface-secondary)] transition-colors"
                >
                  <span
                    className="text-[10px] font-bold w-5 h-5 rounded flex items-center justify-center flex-shrink-0"
                    style={{ color: style.color, background: `${style.color}12` }}
                  >
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[8px] font-bold uppercase tracking-wider px-1 py-0.5 rounded"
                        style={{ color: style.color, background: `${style.color}10` }}>
                        {style.label}
                      </span>
                      <span className="text-[10px] text-[var(--content-primary)] truncate">{node.shortLabel}</span>
                    </div>
                  </div>
                  {node.durationMs > 0 && (
                    <span className="text-[10px] text-[var(--content-tertiary)] flex-shrink-0">{node.durationLabel}</span>
                  )}
                  <ChevronRight className="h-3 w-3 text-[var(--content-tertiary)] flex-shrink-0" />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Variant Flow Canvas Wrapper ─────────────────────────────────────────────
//
// Renders the flow intelligence canvas (same node/edge/minimap design the CEO
// likes) enriched with decision diamonds at divergence points and branch lanes.
// An always-visible legend explains the visual language.

import type { NormalizedViewModel as NVM } from './adapters/viewModel';

function VariantFlowCanvasWrapper({
  model,
  onSelectNode,
  onCanvasReady,
}: {
  model: NVM;
  onSelectNode: (id: string | null) => void;
  onCanvasReady?: ((controls: CanvasControls) => void) | undefined;
}) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const toolbar = {
    showLabels: true,
    showMetrics: true,
    showInsights: true,
    showMinimap: false,
    showLegend: false,
  };

  const handleSelect = (id: string | null) => {
    setSelectedNodeId(id);
    onSelectNode(id);
  };

  const decisionCount = model.nodes.filter((n) => n.isDecisionPoint).length;
  const branchCount   = model.nodes.filter((n) => !n.id.startsWith('vfm-bb-') && !n.id.startsWith('vfm-start') && !n.id.startsWith('vfm-end') && n.nodeType === 'task').length;

  return (
    <div className="absolute inset-0 flex flex-col" data-testid="variants-story-map">
      {/* Always-visible legend bar */}
      <div
        style={{
          padding: '6px 16px',
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <GitBranch style={{ width: 13, height: 13, color: '#059669' }} />
          <span style={{ fontSize: 11, color: '#374151' }}>
            <strong style={{ color: '#111827' }}>{decisionCount}</strong> decision point{decisionCount !== 1 ? 's' : ''} ·{' '}
            <strong style={{ color: '#111827' }}>{branchCount}</strong> branch step{branchCount !== 1 ? 's' : ''} ·{' '}
            <strong style={{ color: '#111827' }}>{model.variants.length}</strong> path{model.variants.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* Standard path legend */}
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: '#4b5563' }}>
            <svg width="22" height="8">
              <line x1="0" y1="4" x2="22" y2="4" stroke="#9ca3af" strokeWidth="2.5" />
            </svg>
            Standard path
          </span>
          {/* Branch path legend */}
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: '#4b5563' }}>
            <svg width="22" height="8">
              <line x1="0" y1="4" x2="22" y2="4" stroke="#d97706" strokeWidth="2" strokeDasharray="4 3" />
            </svg>
            Variant path
          </span>
          {/* Decision diamond legend */}
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: '#4b5563' }}>
            <span
              style={{
                display: 'inline-block',
                width: 10,
                height: 10,
                background: '#d97706',
                borderRadius: 2,
                transform: 'rotate(45deg)',
                flexShrink: 0,
              }}
            />
            Branch point
          </span>
          {/* Honesty note */}
          <span style={{ fontSize: 9, color: '#9ca3af', fontStyle: 'italic' }}>
            Branch points show observed splits only — no inferred conditions
          </span>
        </div>
      </div>

      {/* Flow canvas */}
      <div className="relative flex-1">
        <WorkflowFlowCanvas
          graph={model}
          toolbar={toolbar}
          selectedNodeId={selectedNodeId}
          onSelectNode={handleSelect}
          onCanvasReady={onCanvasReady}
        />
      </div>
    </div>
  );
}

// ─── Shared ──────────────────────────────────────────────────────────────────

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-[var(--surface-elevated)] rounded-lg px-2 py-1.5 border border-[var(--border-subtle)]">
      <p className="text-[9px] text-[var(--content-tertiary)] uppercase tracking-wider">{label}</p>
      <p className="text-ds-sm font-semibold text-[var(--content-primary)]">{value}</p>
    </div>
  );
}
