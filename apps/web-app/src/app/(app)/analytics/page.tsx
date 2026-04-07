'use client';

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
  Eye,
} from 'lucide-react';
import { formatDuration, formatDateRelative, formatConfidence } from '@/lib/format';
import { track } from '@/lib/analytics';

interface ProcessDef {
  id: string;
  canonicalName: string;
  runCount: number;
  variantCount: number;
  avgDurationMs: number | null;
  medianDurationMs: number | null;
  stabilityScore: number | null;
  analyzedAt: string | null;
  workflows: Array<{ id: string; title: string; durationMs: number | null; stepCount: number | null; createdAt: string }>;
  insights: Array<{ id: string; insightType: string; severity: string; title: string }>;
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

const SEVERITY_STYLES: Record<string, string> = {
  critical: 'ds-callout ds-callout-danger',
  warning: 'ds-callout ds-callout-warning',
  info: 'ds-callout ds-callout-info',
};

const SEVERITY_TEXT: Record<string, string> = {
  critical: 'text-red-700',
  warning: 'text-amber-700',
  info: 'text-blue-700',
};

const INSIGHT_TYPE_ICONS: Record<string, React.ElementType> = {
  bottleneck: Clock,
  variance: GitBranch,
  drift: TrendingUp,
  anomaly: AlertTriangle,
};

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const loadData = useCallback(async () => {
    const res = await fetch('/api/analytics');
    if (res.ok) setData(await res.json());
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadData();
    track({ event: 'page_viewed', path: '/analytics' });
  }, [loadData]);

  async function runAnalysis() {
    setIsAnalyzing(true);
    track({ event: 'analysis_run' });
    const res = await fetch('/api/analytics', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    if (res.ok) {
      await loadData();
    }
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

  return (
    <div>
      {/* Product analytics link */}
      <Link
        href="/analytics/product"
        className="card flex items-center gap-ds-3 px-ds-5 py-ds-3 mb-ds-4 hover:border-brand-200 transition-colors"
      >
        <BarChart3 className="h-4 w-4 text-brand-600" />
        <span className="text-ds-sm text-gray-700">View Product Analytics Dashboard</span>
        <ChevronRight className="h-4 w-4 text-gray-300 ml-auto" />
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between mb-ds-6">
        <div>
          <h1 className="text-ds-2xl font-bold tracking-tight text-gray-900">Process Intelligence</h1>
          <p className="text-ds-sm text-gray-500">
            {data ? `${data.totalWorkflows} workflows · ${data.totalDefinitions} definitions · ${data.totalInsights} insights` : 'No data yet'}
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
        <div className="space-y-ds-8">
          {/* Summary metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-ds-4">
            <MetricCard icon={Layers} label="Workflows" value={data!.totalWorkflows} />
            <MetricCard icon={GitBranch} label="Definitions" value={data!.totalDefinitions} />
            <MetricCard icon={AlertTriangle} label="Insights" value={data!.totalInsights} />
            <MetricCard
              icon={Shield}
              label="Avg Stability"
              value={(() => {
                const scored = data!.definitions.filter((d) => d.stabilityScore !== null);
                if (scored.length === 0) return '—';
                const avg = scored.reduce((s, d) => s + (d.stabilityScore ?? 0), 0) / scored.length;
                return `${Math.round(avg * 100)}%`;
              })()}
            />
          </div>

          {/* Insights */}
          {data!.insights.length > 0 && (
            <section className="ds-section">
              <h2 className="ds-section-label">Active Insights</h2>
              <div className="space-y-ds-2">
                {data!.insights.map((insight) => {
                  const cls = SEVERITY_STYLES[insight.severity] ?? SEVERITY_STYLES.info;
                  const textCls = SEVERITY_TEXT[insight.severity] ?? SEVERITY_TEXT.info;
                  const Icon = INSIGHT_TYPE_ICONS[insight.insightType] ?? Eye;
                  return (
                    <div key={insight.id} className={cls}>
                      <div className="flex items-start gap-ds-3">
                        <Icon className={`h-4 w-4 mt-0.5 ${textCls} flex-shrink-0`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-ds-2">
                            <span className={`text-ds-xs font-semibold uppercase ${textCls}`}>
                              {insight.severity}
                            </span>
                            <span className="text-ds-xs text-gray-400">{insight.insightType}</span>
                          </div>
                          <p className="text-ds-sm font-medium text-gray-900 mt-0.5">{insight.title}</p>
                          <p className="text-ds-xs text-gray-600 mt-ds-1 leading-relaxed">{insight.explanation}</p>
                          {insight.recommendation && (
                            <p className="text-ds-xs text-gray-500 mt-ds-1 italic">{insight.recommendation}</p>
                          )}
                          {(insight.observedValue || insight.expectedValue) && (
                            <div className="flex gap-ds-4 mt-ds-2 text-ds-xs text-gray-500">
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

          {/* Process Definitions */}
          <section className="ds-section">
            <h2 className="ds-section-label">Process Definitions</h2>
            {data!.definitions.length === 0 ? (
              <div className="card px-ds-8 py-ds-8 text-center">
                <p className="text-ds-sm text-gray-500">
                  Click &quot;Run Analysis&quot; to auto-detect process definitions from your workflows.
                </p>
              </div>
            ) : (
              <div className="space-y-ds-2">
                {data!.definitions.map((def) => (
                  <div key={def.id} className="card px-ds-5 py-ds-4 hover:border-gray-300 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-ds-sm font-medium text-gray-900 truncate">{def.canonicalName}</h3>
                        <div className="flex flex-wrap items-center gap-ds-3 mt-ds-1 text-ds-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Layers className="h-3.5 w-3.5" />
                            {def.runCount} run{def.runCount !== 1 ? 's' : ''}
                          </span>
                          <span className="flex items-center gap-1">
                            <GitBranch className="h-3.5 w-3.5" />
                            {def.variantCount} variant{def.variantCount !== 1 ? 's' : ''}
                          </span>
                          {def.avgDurationMs !== null && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              {formatDuration(def.avgDurationMs)} avg
                            </span>
                          )}
                          {def.stabilityScore !== null && (
                            <span className="flex items-center gap-1">
                              <Zap className="h-3.5 w-3.5" />
                              {Math.round(def.stabilityScore * 100)}% stable
                            </span>
                          )}
                          {def.analyzedAt && (
                            <span className="text-gray-400">
                              Analyzed {formatDateRelative(def.analyzedAt)}
                            </span>
                          )}
                        </div>

                        {def.insights.length > 0 && (
                          <div className="flex gap-ds-1 mt-ds-2">
                            {def.insights.slice(0, 3).map((i) => {
                              const textCls = SEVERITY_TEXT[i.severity] ?? 'text-blue-700';
                              return (
                                <span key={i.id} className={`ds-tag text-[10px] ${textCls} bg-gray-50`}>
                                  {i.title}
                                </span>
                              );
                            })}
                            {def.insights.length > 3 && (
                              <span className="text-ds-xs text-gray-400">+{def.insights.length - 3}</span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="hidden sm:flex items-center gap-ds-2 ml-ds-4">
                        <div className="text-right">
                          {def.workflows.slice(0, 2).map((w) => (
                            <Link
                              key={w.id}
                              href={`/workflows/${w.id}`}
                              className="block text-ds-xs text-gray-400 hover:text-brand-600 truncate max-w-[120px]"
                            >
                              {w.title}
                            </Link>
                          ))}
                          {def.workflows.length > 2 && (
                            <span className="text-ds-xs text-gray-300">+{def.workflows.length - 2} more</span>
                          )}
                        </div>
                        <ChevronRight className="h-4 w-4 text-gray-300" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function MetricCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | number }) {
  return (
    <div className="card px-ds-5 py-ds-4">
      <div className="flex items-center gap-ds-2 mb-ds-1">
        <Icon className="h-4 w-4 text-brand-600" />
        <p className="ds-metric-label">{label}</p>
      </div>
      <p className="ds-metric-value">{value}</p>
    </div>
  );
}
