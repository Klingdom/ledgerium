'use client';

/**
 * System Interaction Map — Digital twin of cross-system workflow.
 *
 * Visualizes how work moves across applications, highlighting handoffs,
 * context switching, and integration opportunities. Uses a network
 * topology layout with system nodes connected by transition edges.
 */

import { useState, useMemo } from 'react';
import {
  Monitor, ArrowRightLeft, Clock, Zap, AlertTriangle, Layers,
  ChevronRight, ExternalLink, Repeat, ArrowRight, RefreshCw,
  Activity, Target, TrendingUp, Unplug,
} from 'lucide-react';
import type { NormalizedViewModel, ViewNode } from './adapters/viewModel';
import { buildSystemData } from './adapters/systemAdapter';
import type { ViewSystem, ViewSystemEdge } from './adapters/viewModel';
import { CATEGORY_STYLES } from './constants';
import { formatDuration } from '@/lib/format';

// ─── Props ───────────────────────────────────────────────────────────────────

interface Props {
  graph: NormalizedViewModel;
  onSelectNode: (id: string | null) => void;
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function WorkflowSystemsMap({ graph, onSelectNode }: Props) {
  const systemData = useMemo(() => buildSystemData(graph), [graph]);
  const [selectedSystemId, setSelectedSystemId] = useState<string | null>(null);

  const selectedSystem = systemData.nodes.find(n => n.id === selectedSystemId)?.data.system ?? null;
  const totalDuration = graph.totalDurationMs;

  // Single system — show a simpler view
  if (systemData.nodes.length <= 1) {
    return <SingleSystemView graph={graph} system={systemData.nodes[0]?.data.system ?? null} onSelectNode={onSelectNode} />;
  }

  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden">
      {/* ── Overview header ─────────────────────────────────────────── */}
      <div className="flex-shrink-0 px-5 py-3 border-b border-gray-100 bg-white">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Monitor className="h-4 w-4 text-cyan-600" />
            <span className="text-ds-sm font-semibold text-gray-900">System Topology</span>
          </div>
          <div className="flex items-center gap-3">
            <OverviewStat icon={Monitor} value={systemData.nodes.length} label="systems" color="#0891b2" />
            <OverviewStat icon={ArrowRightLeft} value={systemData.totalHandoffs} label="handoffs" color="#7c3aed" />
            <OverviewStat icon={RefreshCw} value={systemData.contextSwitchCount} label="context switches" color="#d97706" />
            <OverviewStat icon={Clock} value={formatDuration(totalDuration) || '—'} label="total" color="#64748b" />
          </div>
        </div>
      </div>

      {/* ── Network visualization + detail ──────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Network topology */}
        <div className="flex-1 overflow-y-auto p-5">
          <div className="max-w-4xl mx-auto space-y-5">
            {/* System network diagram */}
            <SystemNetworkDiagram
              systems={systemData.nodes.map(n => n.data.system)}
              edges={systemData.edges.map(e => e.data.systemEdge)}
              totalDuration={totalDuration}
              selectedId={selectedSystemId}
              onSelect={setSelectedSystemId}
            />

            {/* Handoff timeline */}
            <HandoffTimeline graph={graph} edges={systemData.edges.map(e => e.data.systemEdge)} onSelectNode={onSelectNode} />

            {/* Friction analysis */}
            <FrictionAnalysis
              systems={systemData.nodes.map(n => n.data.system)}
              edges={systemData.edges.map(e => e.data.systemEdge)}
              contextSwitchCount={systemData.contextSwitchCount}
            />
          </div>
        </div>

        {/* System detail panel */}
        {selectedSystem && (
          <div className="w-80 flex-shrink-0 border-l border-gray-200 bg-white overflow-y-auto">
            <SystemDetailPanel
              system={selectedSystem}
              graph={graph}
              edges={systemData.edges.map(e => e.data.systemEdge)}
              totalDuration={totalDuration}
              onSelectNode={onSelectNode}
              onClose={() => setSelectedSystemId(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── System Network Diagram ──────────────────────────────────────────────────

function SystemNetworkDiagram({
  systems,
  edges,
  totalDuration,
  selectedId,
  onSelect,
}: {
  systems: ViewSystem[];
  edges: ViewSystemEdge[];
  totalDuration: number;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  // Arrange systems in a horizontal row with proportional sizing
  const maxSteps = Math.max(...systems.map(s => s.stepCount), 1);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-transparent">
        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">System Network</span>
      </div>

      <div className="p-6">
        {/* System nodes — constrained grid for clean layout */}
        <div className="flex items-start justify-center gap-4 flex-wrap" style={{ maxWidth: Math.min(systems.length * 220, 880) + 'px', margin: '0 auto' }}>
          {systems.map(sys => {
            const share = totalDuration > 0 ? (sys.totalDurationMs / totalDuration) : (1 / systems.length);
            const isSelected = selectedId === sys.id;

            return (
              <button
                key={sys.id}
                onClick={() => onSelect(isSelected ? null : sys.id)}
                className={`relative group transition-all duration-200 ${isSelected ? 'scale-105' : 'hover:scale-102'}`}
              >
                <div
                  className="rounded-2xl border-2 px-5 py-4 text-center transition-all"
                  style={{
                    minWidth: 140,
                    maxWidth: 200,
                    borderColor: isSelected ? '#0891b2' : '#e2e8f0',
                    background: isSelected ? '#ecfeff' : '#ffffff',
                    boxShadow: isSelected
                      ? '0 0 0 3px rgba(8,145,178,0.12), 0 4px 16px rgba(0,0,0,0.06)'
                      : '0 1px 4px rgba(0,0,0,0.04)',
                  }}
                >
                  {/* System icon area */}
                  <div
                    className="w-10 h-10 rounded-xl mx-auto mb-2 flex items-center justify-center"
                    style={{
                      background: isSelected ? 'rgba(8,145,178,0.1)' : '#f1f5f9',
                      border: `1px solid ${isSelected ? 'rgba(8,145,178,0.2)' : '#e2e8f0'}`,
                    }}
                  >
                    <Monitor className="h-5 w-5" style={{ color: isSelected ? '#0891b2' : '#64748b' }} />
                  </div>

                  {/* System name */}
                  <p className="text-[12px] font-semibold text-gray-900 mb-1 truncate">{sys.label}</p>

                  {/* Metrics */}
                  <div className="space-y-0.5">
                    <p className="text-[10px] text-gray-500">{sys.stepCount} step{sys.stepCount !== 1 ? 's' : ''}</p>
                    <p className="text-[10px] text-gray-500">{formatDuration(sys.totalDurationMs) || '< 1s'}</p>
                  </div>

                  {/* Usage share bar */}
                  <div className="mt-2 h-1 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.max(5, share * 100)}%`,
                        background: isSelected ? '#0891b2' : '#94a3b8',
                      }}
                    />
                  </div>
                  <p className="text-[9px] text-gray-400 mt-0.5">{Math.round(share * 100)}% of time</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Transition edges */}
        {edges.length > 0 && (
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {edges.map(edge => (
              <div
                key={edge.id}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-50 border border-gray-200"
              >
                <span className="text-[10px] font-medium text-gray-700">{edge.label}</span>
                {edge.count > 1 && (
                  <span className="text-[9px] font-bold text-violet-600 bg-violet-50 rounded-full px-1.5 py-0.5">
                    {edge.count}×
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Handoff Timeline ────────────────────────────────────────────────────────

function HandoffTimeline({
  graph,
  edges,
  onSelectNode,
}: {
  graph: NormalizedViewModel;
  edges: ViewSystemEdge[];
  onSelectNode: (id: string | null) => void;
}) {
  // Build ordered timeline of system transitions
  const taskNodes = graph.nodes
    .filter(n => n.nodeType === 'task' || n.nodeType === 'exception' || n.nodeType === 'decision')
    .sort((a, b) => a.ordinal - b.ordinal);

  const transitions: Array<{ from: ViewNode; to: ViewNode; handoffIndex: number }> = [];
  let handoffIdx = 0;
  for (let i = 1; i < taskNodes.length; i++) {
    const prev = taskNodes[i - 1]!;
    const curr = taskNodes[i]!;
    if (prev.system && curr.system && prev.system !== curr.system) {
      handoffIdx++;
      transitions.push({ from: prev, to: curr, handoffIndex: handoffIdx });
    }
  }

  if (transitions.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <ArrowRightLeft className="h-3.5 w-3.5 text-violet-600" />
          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Handoff Timeline</span>
          <span className="text-[10px] text-gray-400">{transitions.length} transition{transitions.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      <div className="divide-y divide-gray-50">
        {transitions.map((t, i) => (
          <div key={i} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50/50 transition-colors">
            {/* Handoff number */}
            <span className="text-[10px] font-bold text-violet-600 bg-violet-50 rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0">
              {t.handoffIndex}
            </span>

            {/* From system */}
            <button
              onClick={() => onSelectNode(t.from.id)}
              className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-gray-50 border border-gray-200 hover:border-gray-300 transition-colors"
            >
              <Monitor className="h-3 w-3 text-gray-400" />
              <span className="text-[10px] font-medium text-gray-700">{t.from.system}</span>
            </button>

            {/* Arrow */}
            <div className="flex items-center gap-1">
              <div className="w-6 h-px bg-violet-300" />
              <ArrowRight className="h-3 w-3 text-violet-400" />
            </div>

            {/* To system */}
            <button
              onClick={() => onSelectNode(t.to.id)}
              className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-gray-50 border border-gray-200 hover:border-gray-300 transition-colors"
            >
              <Monitor className="h-3 w-3 text-gray-400" />
              <span className="text-[10px] font-medium text-gray-700">{t.to.system}</span>
            </button>

            {/* Context */}
            <span className="flex-1 text-[10px] text-gray-400 truncate">
              {t.from.shortLabel} → {t.to.shortLabel}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Friction Analysis ───────────────────────────────────────────────────────

function FrictionAnalysis({
  systems,
  edges,
  contextSwitchCount,
}: {
  systems: ViewSystem[];
  edges: ViewSystemEdge[];
  contextSwitchCount: number;
}) {
  const signals: Array<{
    icon: React.ElementType;
    label: string;
    detail: string;
    severity: 'high' | 'medium' | 'low';
    color: string;
    bg: string;
  }> = [];

  // Context switching friction
  if (contextSwitchCount >= 4) {
    signals.push({
      icon: RefreshCw,
      label: 'High Context Switching',
      detail: `${contextSwitchCount} system switches detected. Users must mentally reset between ${systems.length} different applications.`,
      severity: 'high',
      color: '#dc2626',
      bg: '#fef2f2',
    });
  } else if (contextSwitchCount >= 2) {
    signals.push({
      icon: RefreshCw,
      label: 'Moderate Context Switching',
      detail: `${contextSwitchCount} system switches between ${systems.length} applications. Consider whether some handoffs can be eliminated.`,
      severity: 'medium',
      color: '#d97706',
      bg: '#fffbeb',
    });
  }

  // Repeated handoffs (same transition happens multiple times)
  const repeatedEdges = edges.filter(e => e.count > 1);
  if (repeatedEdges.length > 0) {
    signals.push({
      icon: Repeat,
      label: 'Repeated System Handoffs',
      detail: `${repeatedEdges.length} transition${repeatedEdges.length !== 1 ? 's' : ''} occur more than once, suggesting back-and-forth between systems.`,
      severity: 'medium',
      color: '#7c3aed',
      bg: '#f5f3ff',
    });
  }

  // Many systems for few steps
  const totalSteps = systems.reduce((s, sys) => s + sys.stepCount, 0);
  if (systems.length >= 3 && totalSteps <= 8) {
    signals.push({
      icon: Unplug,
      label: 'Fragmented Workflow',
      detail: `${totalSteps} steps spread across ${systems.length} systems. This workflow may benefit from consolidation or integration.`,
      severity: 'medium',
      color: '#0891b2',
      bg: '#ecfeff',
    });
  }

  // Integration opportunity
  if (edges.length >= 2) {
    signals.push({
      icon: Zap,
      label: 'Integration Opportunity',
      detail: `${edges.length} cross-system transitions could potentially be automated with API integrations or workflow automation tools.`,
      severity: 'low',
      color: '#059669',
      bg: '#ecfdf5',
    });
  }

  if (signals.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider px-1">Friction & Opportunities</p>
      {signals.map((signal, i) => {
        const Icon = signal.icon;
        return (
          <div key={i} className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-start gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: signal.bg }}
            >
              <Icon className="h-4 w-4" style={{ color: signal.color }} />
            </div>
            <div>
              <p className="text-ds-xs font-medium text-gray-800">{signal.label}</p>
              <p className="text-[10px] text-gray-500 mt-0.5 leading-relaxed">{signal.detail}</p>
            </div>
            <span
              className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5"
              style={{ color: signal.color, background: signal.bg }}
            >
              {signal.severity}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── System Detail Panel ─────────────────────────────────────────────────────

function SystemDetailPanel({
  system,
  graph,
  edges,
  totalDuration,
  onSelectNode,
  onClose,
}: {
  system: ViewSystem;
  graph: NormalizedViewModel;
  edges: ViewSystemEdge[];
  totalDuration: number;
  onSelectNode: (id: string | null) => void;
  onClose: () => void;
}) {
  const share = totalDuration > 0 ? system.totalDurationMs / totalDuration : 0;
  const systemNodes = graph.nodes.filter(n => system.nodeIds.includes(n.id));
  const inbound = edges.filter(e => e.targetSystemId === system.id);
  const outbound = edges.filter(e => e.sourceSystemId === system.id);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50 flex items-start justify-between">
        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">System Detail</p>
          <h3 className="text-ds-sm font-semibold text-gray-900 mt-0.5">{system.label}</h3>
        </div>
        <button onClick={onClose} className="p-1 rounded-md hover:bg-gray-200 text-gray-400">
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Metrics */}
        <div className="grid grid-cols-2 gap-2">
          <DetailMetric label="Steps" value={`${system.stepCount}`} />
          <DetailMetric label="Duration" value={formatDuration(system.totalDurationMs) || '< 1s'} />
          <DetailMetric label="Time Share" value={`${Math.round(share * 100)}%`} />
          <DetailMetric label="Events" value={`${system.humanEventCount}`} />
        </div>

        {/* Usage bar */}
        <div>
          <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Time Distribution</p>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-cyan-500 transition-all"
              style={{ width: `${Math.max(3, share * 100)}%` }}
            />
          </div>
          <p className="text-[9px] text-gray-400 mt-0.5">
            {Math.round(share * 100)}% of total workflow duration
          </p>
        </div>

        {/* Transitions */}
        {(inbound.length > 0 || outbound.length > 0) && (
          <div>
            <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Transitions</p>
            <div className="space-y-1">
              {inbound.map(e => (
                <div key={`in-${e.id}`} className="flex items-center gap-2 text-[10px] px-2 py-1 rounded bg-gray-50">
                  <ArrowRight className="h-2.5 w-2.5 text-emerald-500 rotate-180" />
                  <span className="text-gray-500">from</span>
                  <span className="font-medium text-gray-700">{e.label.split(' → ')[0]}</span>
                  {e.count > 1 && <span className="text-violet-600 font-bold">{e.count}×</span>}
                </div>
              ))}
              {outbound.map(e => (
                <div key={`out-${e.id}`} className="flex items-center gap-2 text-[10px] px-2 py-1 rounded bg-gray-50">
                  <ArrowRight className="h-2.5 w-2.5 text-blue-500" />
                  <span className="text-gray-500">to</span>
                  <span className="font-medium text-gray-700">{e.label.split(' → ')[1]}</span>
                  {e.count > 1 && <span className="text-violet-600 font-bold">{e.count}×</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Steps in this system */}
        <div>
          <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
            Steps ({systemNodes.length})
          </p>
          <div className="space-y-0.5">
            {systemNodes.sort((a, b) => a.ordinal - b.ordinal).map(node => {
              const style = CATEGORY_STYLES[node.category as keyof typeof CATEGORY_STYLES] ?? CATEGORY_STYLES.single_action;
              return (
                <button
                  key={node.id}
                  onClick={() => onSelectNode(node.id)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 transition-colors text-left"
                >
                  <span
                    className="text-[9px] font-bold w-4 h-4 rounded flex items-center justify-center flex-shrink-0"
                    style={{ color: style.color, background: `${style.color}12` }}
                  >
                    {node.ordinal}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-gray-700 truncate">{node.shortLabel}</p>
                    <p className="text-[9px] text-gray-400">{node.durationLabel}</p>
                  </div>
                  <ChevronRight className="h-2.5 w-2.5 text-gray-300 flex-shrink-0" />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Single System View ──────────────────────────────────────────────────────

function SingleSystemView({
  graph,
  system,
  onSelectNode,
}: {
  graph: NormalizedViewModel;
  system: ViewSystem | null;
  onSelectNode: (id: string | null) => void;
}) {
  return (
    <div className="absolute inset-0 overflow-y-auto p-5">
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-start gap-3">
          <Monitor className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-ds-xs font-medium text-blue-800">Single-system workflow</p>
            <p className="text-[10px] text-blue-600 mt-0.5">
              This workflow operates within {system?.label ?? 'one application'}. The System Interaction Map is most useful for workflows that cross multiple tools.
            </p>
          </div>
        </div>

        {system && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 text-center">
            <div className="w-14 h-14 rounded-2xl bg-cyan-50 border border-cyan-200 flex items-center justify-center mx-auto mb-3">
              <Monitor className="h-7 w-7 text-cyan-600" />
            </div>
            <p className="text-ds-sm font-semibold text-gray-900">{system.label}</p>
            <p className="text-[10px] text-gray-500 mt-1">
              {system.stepCount} steps · {formatDuration(system.totalDurationMs) || '< 1s'} · {system.humanEventCount} events
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Shared ──────────────────────────────────────────────────────────────────

function OverviewStat({
  icon: Icon,
  value,
  label,
  color,
}: {
  icon: React.ElementType;
  value: number | string;
  label: string;
  color: string;
}) {
  return (
    <span className="flex items-center gap-1.5 text-[11px]">
      <Icon className="h-3 w-3" style={{ color }} />
      <span className="font-semibold text-gray-800">{value}</span>
      <span className="text-gray-400">{label}</span>
    </span>
  );
}

function DetailMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
      <p className="text-[9px] text-gray-400 uppercase tracking-wider">{label}</p>
      <p className="text-ds-xs font-semibold text-gray-800 mt-0.5">{value}</p>
    </div>
  );
}
