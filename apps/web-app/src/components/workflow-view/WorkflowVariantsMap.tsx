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

import { useState, useMemo } from 'react';
import {
  GitBranch, TrendingUp, Clock, Zap, AlertTriangle, CheckCircle2,
  ChevronRight, ArrowRight, BarChart3, Target, Layers, Info,
} from 'lucide-react';
import type { NormalizedViewModel, ViewNode } from './adapters/viewModel';
import { buildVariantData } from './adapters/variantAdapter';
import type { ViewVariantPath } from './adapters/viewModel';
import { CATEGORY_STYLES } from './constants';
import { formatDuration } from '@/lib/format';

// ─── Props ───────────────────────────────────────────────────────────────────

interface Props {
  graph: NormalizedViewModel;
  intelligence?: any;
  onSelectNode: (id: string | null) => void;
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

  // Find fastest/longest by duration if available
  const withDuration = paths.filter(p => p.avgDurationMs !== null);
  const fastestId = withDuration.length > 1
    ? withDuration.reduce((min, p) => (p.avgDurationMs ?? Infinity) < (min.avgDurationMs ?? Infinity) ? p : min).id
    : null;
  const longestId = withDuration.length > 1
    ? withDuration.reduce((max, p) => (p.avgDurationMs ?? 0) > (max.avgDurationMs ?? 0) ? p : max).id
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
    // Standard first, then by frequency descending
    if (a.isStandard) return -1;
    if (b.isStandard) return 1;
    return b.frequency - a.frequency;
  });
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function WorkflowVariantsMap({ graph, intelligence, onSelectNode }: Props) {
  const variantData = useMemo(() => buildVariantData(graph, intelligence), [graph, intelligence]);
  const paths = useMemo(() => classifyPaths(variantData.paths, graph), [variantData.paths, graph]);

  const [selectedPathId, setSelectedPathId] = useState<string | null>(
    paths.find(p => p.isStandard)?.id ?? paths[0]?.id ?? null,
  );
  const [comparePathId, setComparePathId] = useState<string | null>(null);

  const selectedPath = paths.find(p => p.id === selectedPathId) ?? null;
  const comparePath = comparePathId ? paths.find(p => p.id === comparePathId) ?? null : null;

  const standardPath = paths.find(p => p.isStandard) ?? paths[0] ?? null;

  // No variant data state
  if (!variantData.hasVariantData) {
    return <SinglePathView graph={graph} path={paths[0] ?? null} onSelectNode={onSelectNode} />;
  }

  return (
    <div className="absolute inset-0 flex overflow-hidden">
      {/* ── Left: Path cards rail ──────────────────────────────────────── */}
      <div className="w-80 flex-shrink-0 border-r border-gray-100 bg-white overflow-y-auto">
        {/* Overview header */}
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-2 mb-2">
            <GitBranch className="h-4 w-4 text-violet-600" />
            <h3 className="text-ds-sm font-semibold text-gray-900">Process Variants</h3>
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
          <div className="px-4 py-3 border-t border-gray-100">
            <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Quick Compare</p>
            <div className="space-y-1">
              {paths.filter(p => !p.isStandard).slice(0, 3).map(p => (
                <button
                  key={p.id}
                  onClick={() => { setSelectedPathId(standardPath?.id ?? null); setComparePathId(p.id); }}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[10px] text-gray-600 hover:bg-gray-50 transition-colors text-left"
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#059669' }} />
                  <span className="text-gray-400">vs</span>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: p.roleColor }} />
                  <span className="truncate">Standard vs {p.roleLabel}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Right: Path detail + step comparison ──────────────────────── */}
      <div className="flex-1 overflow-y-auto bg-gray-50/30 p-5">
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
          ? 'border-gray-300 bg-white shadow-sm ring-1 ring-gray-200'
          : isComparing
            ? 'border-indigo-200 bg-indigo-50/30'
            : 'border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm'
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
          <span className="text-[10px] font-semibold text-gray-700">
            {Math.round(path.frequency * 100)}%
          </span>
        </div>

        {/* Title */}
        <p className="text-[11px] font-medium text-gray-800 mb-1.5">{path.label}</p>

        {/* Metrics row */}
        <div className="flex items-center gap-3 text-[10px] text-gray-500">
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
        <div className="mt-2 h-1 bg-gray-100 rounded-full overflow-hidden">
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
                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
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
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4">
        <div className="flex items-center gap-3 mb-3">
          <span
            className="text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded"
            style={{ color: path.roleColor, background: path.roleBg, border: `1px solid ${path.roleBorder}` }}
          >
            {path.roleLabel}
          </span>
          <h3 className="text-ds-sm font-semibold text-gray-900">{path.label}</h3>
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
    <div className="bg-gray-50 rounded-lg px-3 py-2">
      <p className="text-[9px] text-gray-400 uppercase tracking-wider">{label}</p>
      <p className="text-ds-sm font-semibold text-gray-800 mt-0.5">{value}</p>
      {sublabel && <p className="text-[9px] text-gray-400 mt-0.5">{sublabel}</p>}
    </div>
  );
}

// ─── Comparison Card ─────────────────────────────────────────────────────────

function ComparisonCard({ primary, secondary }: { primary: ClassifiedPath; secondary: ClassifiedPath }) {
  const stepDiff = secondary.stepCategories.length - primary.stepCategories.length;
  const freqDiff = Math.round((secondary.frequency - primary.frequency) * 100);

  return (
    <div className="bg-white rounded-xl border border-indigo-200 shadow-sm overflow-hidden">
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
            <p className="text-ds-xs font-medium text-gray-700 mt-1">{primary.stepCategories.length} steps</p>
            <p className="text-[10px] text-gray-500">{primary.durationLabel}</p>
            <p className="text-[10px] text-gray-500">{Math.round(primary.frequency * 100)}% of runs</p>
          </div>

          {/* vs divider */}
          <div className="flex flex-col items-center gap-1 px-3">
            <span className="text-[10px] font-bold text-gray-300">VS</span>
            <div className="w-px h-8 bg-gray-200" />
            <div className="space-y-0.5 text-center">
              {stepDiff !== 0 && (
                <p className={`text-[9px] font-medium ${stepDiff > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {stepDiff > 0 ? '+' : ''}{stepDiff} step{Math.abs(stepDiff) !== 1 ? 's' : ''}
                </p>
              )}
              {freqDiff !== 0 && (
                <p className={`text-[9px] font-medium ${freqDiff < 0 ? 'text-amber-600' : 'text-gray-500'}`}>
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
            <p className="text-ds-xs font-medium text-gray-700 mt-1">{secondary.stepCategories.length} steps</p>
            <p className="text-[10px] text-gray-500">{secondary.durationLabel}</p>
            <p className="text-[10px] text-gray-500">{Math.round(secondary.frequency * 100)}% of runs</p>
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
  const standardCategories = standardPath?.stepCategories ?? [];

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
        <div className="flex items-center gap-2">
          <Layers className="h-3.5 w-3.5 text-gray-500" />
          <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Step Sequence</span>
          <span className="flex-1" />
          <span className="text-[10px] text-gray-400">{path.stepCategories.length} steps</span>
        </div>
      </div>

      <div className="divide-y divide-gray-50">
        {path.stepCategories.map((cat, i) => {
          const style = CATEGORY_STYLES[cat as keyof typeof CATEGORY_STYLES] ?? CATEGORY_STYLES.single_action;
          const matchesStandard = i < standardCategories.length && standardCategories[i] === cat;
          const isDivergence = !matchesStandard && standardCategories.length > 0 && !path.isStandard;

          // Try to find the corresponding node in the graph
          const taskNodes = graph.nodes.filter(n => n.nodeType === 'task' || n.nodeType === 'exception' || n.nodeType === 'decision');
          const matchNode = taskNodes[i];

          return (
            <button
              key={`${path.id}-step-${i}`}
              onClick={() => matchNode && onSelectNode(matchNode.id)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                isDivergence ? 'bg-amber-50/30' : 'hover:bg-gray-50'
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
                    <span className="text-[10px] text-gray-700 truncate">{matchNode.shortLabel}</span>
                  )}
                </div>
                {matchNode && matchNode.system && (
                  <span className="text-[9px] text-gray-400">{matchNode.system}</span>
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
                <span className="text-[10px] text-gray-400 flex-shrink-0">{matchNode.durationLabel}</span>
              )}

              <ChevronRight className="h-3 w-3 text-gray-300 flex-shrink-0" />
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
      <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider px-1">Path Insights</p>
      {insights.map((insight, i) => {
        const Icon = insight.icon;
        return (
          <div key={i} className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: `${insight.color}10` }}>
              <Icon className="h-3.5 w-3.5" style={{ color: insight.color }} />
            </div>
            <div>
              <p className="text-ds-xs font-medium text-gray-800">{insight.label}</p>
              <p className="text-[10px] text-gray-500 mt-0.5 leading-relaxed">{insight.detail}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Single Path View (no variant data) ──────────────────────────────────────

function SinglePathView({
  graph,
  path,
  onSelectNode,
}: {
  graph: NormalizedViewModel;
  path: ClassifiedPath | null;
  onSelectNode: (id: string | null) => void;
}) {
  const taskNodes = graph.nodes.filter(n => n.nodeType === 'task' || n.nodeType === 'exception' || n.nodeType === 'decision');

  return (
    <div className="absolute inset-0 overflow-y-auto p-5">
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Info banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-start gap-3">
          <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-ds-xs font-medium text-blue-800">Single recording — no variants to compare yet</p>
            <p className="text-[10px] text-blue-600 mt-0.5">
              Record this workflow multiple times to discover how the process varies across runs. Variant analysis requires at least 2 recordings of the same process.
            </p>
          </div>
        </div>

        {/* Current path summary */}
        {path && <PathSummaryCard path={path} totalRuns={1} />}

        {/* Step sequence */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
            <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Observed Step Sequence</span>
          </div>
          <div className="divide-y divide-gray-50">
            {taskNodes.map((node, i) => {
              const style = CATEGORY_STYLES[node.category as keyof typeof CATEGORY_STYLES] ?? CATEGORY_STYLES.single_action;
              return (
                <button
                  key={node.id}
                  onClick={() => onSelectNode(node.id)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 transition-colors"
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
                      <span className="text-[10px] text-gray-700 truncate">{node.shortLabel}</span>
                    </div>
                  </div>
                  {node.durationMs > 0 && (
                    <span className="text-[10px] text-gray-400 flex-shrink-0">{node.durationLabel}</span>
                  )}
                  <ChevronRight className="h-3 w-3 text-gray-300 flex-shrink-0" />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Shared ──────────────────────────────────────────────────────────────────

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white rounded-lg px-2 py-1.5 border border-gray-100">
      <p className="text-[9px] text-gray-400 uppercase tracking-wider">{label}</p>
      <p className="text-ds-sm font-semibold text-gray-800">{value}</p>
    </div>
  );
}
