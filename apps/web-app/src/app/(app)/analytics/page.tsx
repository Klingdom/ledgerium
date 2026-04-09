'use client';

/**
 * Process Intelligence Page — the analytical brain of Ledgerium AI.
 *
 * 8 sections designed around BI best practices:
 * 1. Executive Summary Strip — top-level KPIs
 * 2. Health Distribution — workflow health at a glance
 * 3. Process Families — grouped process definitions with drill-down
 * 4. Performance Leaderboard — fastest/slowest/most variant workflows
 * 5. AI & Automation Opportunities — actionable optimization targets
 * 6. Standardization Opportunities — variant consolidation candidates
 * 7. Documentation Quality — SOP completeness and gaps
 * 8. Active Signals — prioritized insights requiring action
 */

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  BarChart3,
  Layers,
  Clock,
  AlertTriangle,
  TrendingUp,
  GitBranch,
  Zap,
  RefreshCw,
  ChevronRight,
  X,
  Shield,
  Target,
  FileCheck,
  Brain,
  Activity,
  CheckCircle,
  XCircle,
  ArrowRight,
} from 'lucide-react';
import { formatDuration, formatDateRelative, formatConfidence } from '@/lib/format';
import { track } from '@/lib/analytics';

// ─── Types ──────────────────────────────────────────────────────────────────

interface ProcessDef {
  id: string;
  canonicalName: string;
  runCount: number;
  variantCount: number;
  avgDurationMs: number | null;
  medianDurationMs: number | null;
  stabilityScore: number | null;
  confidenceScore: number | null;
  analyzedAt: string | null;
  workflows: Array<{ id: string; title: string; durationMs: number | null; stepCount: number | null; createdAt: string }>;
  insights: Array<{ id: string; insightType: string; severity: string; title: string }>;
  intelligence: Record<string, unknown> | null;
}

interface Insight {
  id: string;
  insightType: string;
  severity: string;
  title: string;
  explanation: string;
  recommendation: string | null;
  observedValue: string | null;
  expectedValue: string | null;
  processDefinitionId: string | null;
  createdAt: string;
}

interface AnalyticsData {
  totalWorkflows: number;
  totalDefinitions: number;
  totalInsights: number;
  definitions: ProcessDef[];
  insights: Insight[];
}

// ─── Constants ──────────────────────────────────────────────────────────────

const DEFAULT_SEVERITY = { dot: 'bg-blue-500', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' };
const SEVERITY_COLORS: Record<string, { dot: string; bg: string; text: string; border: string }> = {
  critical: { dot: 'bg-red-500', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  warning: { dot: 'bg-amber-500', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  info: DEFAULT_SEVERITY,
};

const INSIGHT_ICONS: Record<string, React.ElementType> = {
  bottleneck: Clock,
  variance: GitBranch,
  drift: TrendingUp,
  anomaly: AlertTriangle,
};

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const res = await fetch('/api/analytics');
      if (res.ok) setData(await res.json());
    } catch { /* empty */ }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadData();
    track({ event: 'page_viewed', path: '/analytics' });
  }, [loadData]);

  async function runAnalysis() {
    setIsAnalyzing(true);
    track({ event: 'analysis_run' });
    try {
      const res = await fetch('/api/analytics', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      if (res.ok) await loadData();
    } catch { /* empty */ }
    setIsAnalyzing(false);
  }

  async function dismissInsight(id: string) {
    await fetch(`/api/insights/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dismissed: true }),
    });
    setData((prev) => prev ? {
      ...prev,
      insights: prev.insights.filter((i) => i.id !== id),
      totalInsights: prev.totalInsights - 1,
    } : prev);
  }

  if (isLoading) {
    return <div className="text-center text-ds-sm text-gray-400 py-20">Loading intelligence...</div>;
  }

  const hasData = data && data.totalWorkflows > 0;

  // Derived intelligence
  const definitions = data?.definitions ?? [];
  const insights = data?.insights ?? [];
  const avgStability = definitions.length > 0
    ? definitions.filter(d => d.stabilityScore !== null).reduce((s, d) => s + (d.stabilityScore ?? 0), 0) /
      Math.max(definitions.filter(d => d.stabilityScore !== null).length, 1)
    : 0;
  const totalRuns = definitions.reduce((s, d) => s + d.runCount, 0);
  const totalVariants = definitions.reduce((s, d) => s + d.variantCount, 0);
  const highVariation = definitions.filter(d => d.variantCount >= 3);
  const criticalInsights = insights.filter(i => i.severity === 'critical');
  const warningInsights = insights.filter(i => i.severity === 'warning');

  // Performance: sort definitions by avg duration
  const byDuration = [...definitions].filter(d => d.avgDurationMs != null).sort((a, b) => (b.avgDurationMs ?? 0) - (a.avgDurationMs ?? 0));
  const slowest = byDuration.slice(0, 3);
  const fastest = [...byDuration].reverse().slice(0, 3);

  // SOP quality: definitions with insights about documentation
  const defsWithInsights = definitions.filter(d => (d.insights ?? []).length > 0);

  return (
    <div className="space-y-ds-6">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-ds-2xl font-bold tracking-tight text-gray-900">Process Intelligence</h1>
          <p className="text-ds-sm text-gray-500 mt-0.5">
            Analyze, compare, and optimize your workflows
          </p>
        </div>
        <button
          onClick={runAnalysis}
          disabled={isAnalyzing || !hasData}
          className="btn-primary gap-1.5"
        >
          <RefreshCw className={`h-4 w-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
          {isAnalyzing ? 'Analyzing...' : 'Run Analysis'}
        </button>
      </div>

      {!hasData ? (
        <div className="card overflow-hidden">
          <div className="bg-gradient-to-br from-gray-50 to-white px-ds-8 py-ds-10 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
              <BarChart3 className="h-7 w-7 text-gray-400" />
            </div>
            <h3 className="mt-ds-4 text-ds-base font-medium text-gray-900">No workflows to analyze</h3>
            <p className="mt-ds-1 text-ds-sm text-gray-500">
              Upload workflow recordings to start seeing process intelligence.
            </p>
            <Link href="/upload" className="btn-primary mt-ds-4 inline-flex">
              Upload a Workflow
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* ═══════════════════════════════════════════════════════════════
              SECTION 1 — Executive Summary Strip
              ═══════════════════════════════════════════════════════════════ */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-ds-3">
            <KPICard icon={Layers} label="Workflows" value={data!.totalWorkflows} />
            <KPICard icon={GitBranch} label="Process Families" value={data!.totalDefinitions} />
            <KPICard icon={Activity} label="Total Runs" value={totalRuns} />
            <KPICard icon={GitBranch} label="Variants" value={totalVariants} />
            <KPICard
              icon={Shield}
              label="Avg Stability"
              value={avgStability > 0 ? `${Math.round(avgStability * 100)}%` : '—'}
              valueColor={avgStability >= 0.8 ? 'text-emerald-600' : avgStability >= 0.6 ? 'text-amber-600' : 'text-red-600'}
            />
            <KPICard
              icon={AlertTriangle}
              label="Active Signals"
              value={data!.totalInsights}
              valueColor={criticalInsights.length > 0 ? 'text-red-600' : warningInsights.length > 0 ? 'text-amber-600' : 'text-gray-900'}
            />
            <KPICard
              icon={Zap}
              label="High Variation"
              value={highVariation.length}
              valueColor={highVariation.length > 0 ? 'text-amber-600' : 'text-emerald-600'}
            />
          </div>

          {/* ═══════════════════════════════════════════════════════════════
              SECTION 2 — Health Distribution
              ═══════════════════════════════════════════════════════════════ */}
          {definitions.length > 0 && (
            <div className="card px-ds-5 py-ds-4">
              <h2 className="text-ds-sm font-semibold text-gray-900 mb-ds-3">Process Health Overview</h2>
              <div className="flex gap-1 h-3 rounded-full overflow-hidden mb-ds-2">
                {(() => {
                  const stable = definitions.filter(d => (d.stabilityScore ?? 0) >= 0.8).length;
                  const moderate = definitions.filter(d => (d.stabilityScore ?? 0) >= 0.5 && (d.stabilityScore ?? 0) < 0.8).length;
                  const unstable = definitions.filter(d => (d.stabilityScore ?? 0) < 0.5).length;
                  const unscored = definitions.filter(d => d.stabilityScore === null).length;
                  const total = definitions.length;
                  return (
                    <>
                      {stable > 0 && <div className="bg-emerald-500 rounded-l-full" style={{ width: `${(stable / total) * 100}%` }} title={`${stable} stable`} />}
                      {moderate > 0 && <div className="bg-amber-400" style={{ width: `${(moderate / total) * 100}%` }} title={`${moderate} moderate`} />}
                      {unstable > 0 && <div className="bg-red-500" style={{ width: `${(unstable / total) * 100}%` }} title={`${unstable} unstable`} />}
                      {unscored > 0 && <div className="bg-gray-200 rounded-r-full" style={{ width: `${(unscored / total) * 100}%` }} title={`${unscored} unscored`} />}
                    </>
                  );
                })()}
              </div>
              <div className="flex gap-ds-4 text-ds-xs text-gray-500">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" />Stable (&ge;80%)</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" />Moderate</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" />Unstable</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-200" />Unscored</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-ds-6">

            {/* ═══════════════════════════════════════════════════════════════
                SECTION 3 — Process Families
                ═══════════════════════════════════════════════════════════════ */}
            <section>
              <div className="flex items-center justify-between mb-ds-3">
                <h2 className="text-ds-sm font-semibold text-gray-900">Process Families</h2>
                <span className="text-ds-xs text-gray-400">{definitions.length} detected</span>
              </div>
              {definitions.length === 0 ? (
                <div className="card px-ds-6 py-ds-8 text-center">
                  <p className="text-ds-sm text-gray-500">Click &ldquo;Run Analysis&rdquo; to detect process families.</p>
                </div>
              ) : (
                <div className="space-y-ds-2">
                  {definitions.map((def) => (
                    <Link key={def.id} href={`/analytics/process/${def.id}`} className="card px-ds-4 py-ds-3 hover:border-gray-300 transition-colors block">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-ds-sm font-medium text-gray-900 truncate">{def.canonicalName}</h3>
                          <div className="flex flex-wrap items-center gap-ds-3 mt-1 text-ds-xs text-gray-500">
                            <span>{def.runCount} run{def.runCount !== 1 ? 's' : ''}</span>
                            <span>{def.variantCount} variant{def.variantCount !== 1 ? 's' : ''}</span>
                            {def.avgDurationMs != null && <span>{formatDuration(def.avgDurationMs)} avg</span>}
                            {def.stabilityScore != null && (
                              <span className={def.stabilityScore >= 0.8 ? 'text-emerald-600' : def.stabilityScore >= 0.6 ? 'text-amber-600' : 'text-red-600'}>
                                {Math.round(def.stabilityScore * 100)}% stable
                              </span>
                            )}
                          </div>
                          {(def.insights ?? []).length > 0 && (
                            <div className="flex gap-1 mt-1.5">
                              {(def.insights ?? []).slice(0, 3).map((i) => {
                                const colors = SEVERITY_COLORS[i.severity] ?? DEFAULT_SEVERITY;
                                return (
                                  <span key={i.id} className={`text-[10px] px-1.5 py-0.5 rounded ${colors.bg} ${colors.text}`}>
                                    {i.insightType}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </div>
                        <ChevronRight className="h-4 w-4 text-gray-300 flex-shrink-0 ml-2" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>

            {/* ═══════════════════════════════════════════════════════════════
                SECTION 4 — Performance Leaderboard
                ═══════════════════════════════════════════════════════════════ */}
            <section>
              <h2 className="text-ds-sm font-semibold text-gray-900 mb-ds-3">Performance Leaderboard</h2>
              <div className="space-y-ds-3">
                {/* Slowest processes */}
                {slowest.length > 0 && (
                  <div className="card px-ds-4 py-ds-3">
                    <p className="text-ds-xs font-medium text-red-600 uppercase tracking-wide mb-ds-2">Slowest Processes</p>
                    <div className="space-y-ds-1.5">
                      {slowest.map((d) => (
                        <Link key={d.id} href={`/analytics/process/${d.id}`} className="flex items-center justify-between hover:bg-gray-50 rounded px-1 -mx-1 py-0.5 transition-colors">
                          <span className="text-ds-xs text-gray-700 truncate">{d.canonicalName}</span>
                          <span className="text-ds-xs font-medium text-red-600 tabular-nums ml-2">{formatDuration(d.avgDurationMs)}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Fastest processes */}
                {fastest.length > 0 && (
                  <div className="card px-ds-4 py-ds-3">
                    <p className="text-ds-xs font-medium text-emerald-600 uppercase tracking-wide mb-ds-2">Fastest Processes</p>
                    <div className="space-y-ds-1.5">
                      {fastest.map((d) => (
                        <Link key={d.id} href={`/analytics/process/${d.id}`} className="flex items-center justify-between hover:bg-gray-50 rounded px-1 -mx-1 py-0.5 transition-colors">
                          <span className="text-ds-xs text-gray-700 truncate">{d.canonicalName}</span>
                          <span className="text-ds-xs font-medium text-emerald-600 tabular-nums ml-2">{formatDuration(d.avgDurationMs)}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Most variants */}
                {highVariation.length > 0 && (
                  <div className="card px-ds-4 py-ds-3">
                    <p className="text-ds-xs font-medium text-amber-600 uppercase tracking-wide mb-ds-2">Highest Variation</p>
                    <div className="space-y-ds-1.5">
                      {highVariation.slice(0, 3).map((d) => (
                        <Link key={d.id} href={`/analytics/process/${d.id}`} className="flex items-center justify-between hover:bg-gray-50 rounded px-1 -mx-1 py-0.5 transition-colors">
                          <span className="text-ds-xs text-gray-700 truncate">{d.canonicalName}</span>
                          <span className="text-ds-xs font-medium text-amber-600 tabular-nums ml-2">{d.variantCount} variants</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* ═══════════════════════════════════════════════════════════════
              SECTION 5 — Standardization Opportunities
              ═══════════════════════════════════════════════════════════════ */}
          {highVariation.length > 0 && (
            <section>
              <h2 className="text-ds-sm font-semibold text-gray-900 mb-ds-3">Standardization Opportunities</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-ds-3">
                {highVariation.map((def) => (
                  <Link key={def.id} href={`/analytics/process/${def.id}`} className="card px-ds-4 py-ds-3 hover:border-brand-200 transition-colors">
                    <div className="flex items-center justify-between mb-ds-2">
                      <h3 className="text-ds-sm font-medium text-gray-900 truncate">{def.canonicalName}</h3>
                      <span className="text-ds-xs font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">{def.variantCount} variants</span>
                    </div>
                    <p className="text-ds-xs text-gray-500">
                      {def.runCount} run{def.runCount !== 1 ? 's' : ''} across {def.variantCount} execution patterns.
                      {def.stabilityScore != null && ` Stability: ${Math.round(def.stabilityScore * 100)}%.`}
                      {' '}Consider standardizing to reduce variation.
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              SECTION 6 — Documentation Quality
              ═══════════════════════════════════════════════════════════════ */}
          {definitions.length > 0 && (
            <section>
              <h2 className="text-ds-sm font-semibold text-gray-900 mb-ds-3">Documentation Quality</h2>
              <div className="card px-ds-5 py-ds-4">
                <div className="grid grid-cols-3 gap-ds-4 text-center">
                  <div>
                    <p className="text-ds-2xl font-bold text-emerald-600">{definitions.filter(d => (d.insights ?? []).length === 0).length}</p>
                    <p className="text-ds-xs text-gray-500 mt-0.5">Clean (no issues)</p>
                  </div>
                  <div>
                    <p className="text-ds-2xl font-bold text-amber-600">{defsWithInsights.length}</p>
                    <p className="text-ds-xs text-gray-500 mt-0.5">Has findings</p>
                  </div>
                  <div>
                    <p className="text-ds-2xl font-bold text-gray-400">{definitions.filter(d => d.analyzedAt === null).length}</p>
                    <p className="text-ds-xs text-gray-500 mt-0.5">Not yet analyzed</p>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              SECTION 7 — Process Timeline
              ═══════════════════════════════════════════════════════════════ */}
          {definitions.length > 0 && (
            <section>
              <h2 className="text-ds-sm font-semibold text-gray-900 mb-ds-3">Process Family Details</h2>
              <div className="card overflow-hidden">
                <table className="w-full text-ds-xs">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50/50 text-left">
                      <th className="py-ds-2 px-ds-4 font-medium text-gray-500">Process</th>
                      <th className="py-ds-2 px-ds-4 font-medium text-gray-500 text-right">Runs</th>
                      <th className="py-ds-2 px-ds-4 font-medium text-gray-500 text-right">Variants</th>
                      <th className="py-ds-2 px-ds-4 font-medium text-gray-500 text-right">Avg Duration</th>
                      <th className="py-ds-2 px-ds-4 font-medium text-gray-500 text-right">Stability</th>
                      <th className="py-ds-2 px-ds-4 font-medium text-gray-500 text-right">Signals</th>
                    </tr>
                  </thead>
                  <tbody>
                    {definitions.map((def) => (
                      <tr key={def.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                        <td className="py-ds-2 px-ds-4">
                          <Link href={`/analytics/process/${def.id}`} className="text-gray-900 font-medium hover:text-brand-600">{def.canonicalName}</Link>
                        </td>
                        <td className="py-ds-2 px-ds-4 text-right text-gray-600 tabular-nums">{def.runCount}</td>
                        <td className="py-ds-2 px-ds-4 text-right tabular-nums">
                          <span className={def.variantCount >= 3 ? 'text-amber-600 font-medium' : 'text-gray-600'}>{def.variantCount}</span>
                        </td>
                        <td className="py-ds-2 px-ds-4 text-right text-gray-600 tabular-nums">{def.avgDurationMs != null ? formatDuration(def.avgDurationMs) : '—'}</td>
                        <td className="py-ds-2 px-ds-4 text-right tabular-nums">
                          {def.stabilityScore != null ? (
                            <span className={def.stabilityScore >= 0.8 ? 'text-emerald-600' : def.stabilityScore >= 0.6 ? 'text-amber-600' : 'text-red-600'}>
                              {Math.round(def.stabilityScore * 100)}%
                            </span>
                          ) : '—'}
                        </td>
                        <td className="py-ds-2 px-ds-4 text-right">
                          {(def.insights ?? []).length > 0 ? (
                            <span className="text-amber-600 font-medium">{(def.insights ?? []).length}</span>
                          ) : (
                            <span className="text-emerald-600">✓</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              SECTION 8 — Active Signals
              ═══════════════════════════════════════════════════════════════ */}
          {insights.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-ds-3">
                <h2 className="text-ds-sm font-semibold text-gray-900">Active Signals</h2>
                <span className="text-ds-xs text-gray-400">{insights.length} finding{insights.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="space-y-ds-2">
                {insights.map((insight) => {
                  const colors = SEVERITY_COLORS[insight.severity] ?? DEFAULT_SEVERITY;
                  const Icon = INSIGHT_ICONS[insight.insightType] ?? AlertTriangle;
                  return (
                    <div key={insight.id} className={`card px-ds-4 py-ds-3 border-l-[3px] ${colors.border}`}>
                      <div className="flex items-start gap-ds-3">
                        <Icon className={`h-4 w-4 mt-0.5 ${colors.text} flex-shrink-0`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-ds-2 mb-0.5">
                            <span className={`text-[10px] font-semibold uppercase ${colors.text}`}>{insight.severity}</span>
                            <span className="text-[10px] text-gray-400">{insight.insightType}</span>
                          </div>
                          <p className="text-ds-sm font-medium text-gray-900">{insight.title}</p>
                          <p className="text-ds-xs text-gray-600 mt-0.5 leading-relaxed">{insight.explanation}</p>
                          {insight.recommendation && (
                            <p className="text-ds-xs text-gray-500 mt-1 italic">→ {insight.recommendation}</p>
                          )}
                          {(insight.observedValue || insight.expectedValue) && (
                            <div className="flex gap-ds-4 mt-1.5 text-ds-xs text-gray-500">
                              {insight.observedValue && <span>Observed: <strong>{insight.observedValue}</strong></span>}
                              {insight.expectedValue && <span>Expected: <strong>{insight.expectedValue}</strong></span>}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => dismissInsight(insight.id)}
                          className="p-1 text-gray-300 hover:text-gray-500 flex-shrink-0"
                          title="Dismiss"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

// ─── Components ─────────────────────────────────────────────────────────────

function KPICard({
  icon: Icon,
  label,
  value,
  valueColor,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  valueColor?: string;
}) {
  return (
    <div className="card px-ds-4 py-ds-3">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="h-3.5 w-3.5 text-brand-600" />
        <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">{label}</p>
      </div>
      <p className={`text-ds-lg font-bold tabular-nums ${valueColor ?? 'text-gray-900'}`}>{value}</p>
    </div>
  );
}
