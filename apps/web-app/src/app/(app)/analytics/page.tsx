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

const SEVERITY_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  critical: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  warning: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  info: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
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

  useEffect(() => { loadData(); }, [loadData]);

  async function runAnalysis() {
    setIsAnalyzing(true);
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
    return <div className="text-center text-sm text-gray-400 py-20">Loading intelligence...</div>;
  }

  const hasData = data && data.totalWorkflows > 0;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Process Intelligence</h1>
          <p className="text-sm text-gray-500">
            {data ? `${data.totalWorkflows} workflows · ${data.totalDefinitions} process definitions · ${data.totalInsights} insights` : 'No data yet'}
          </p>
        </div>
        <button
          onClick={runAnalysis}
          disabled={isAnalyzing || !hasData}
          className="btn-primary gap-1.5 text-sm"
        >
          <RefreshCw className={`h-4 w-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
          {isAnalyzing ? 'Analyzing...' : 'Run Analysis'}
        </button>
      </div>

      {!hasData ? (
        <div className="card p-12 text-center">
          <BarChart3 className="mx-auto h-10 w-10 text-gray-300" />
          <h3 className="mt-3 text-sm font-medium text-gray-900">No workflows to analyze</h3>
          <p className="mt-1 text-sm text-gray-500">
            Upload workflow recordings to start seeing process intelligence.
          </p>
          <Link href="/upload" className="btn-primary mt-4 inline-flex">
            Upload a Workflow
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <MetricCard icon={Layers} label="Workflows" value={data!.totalWorkflows} />
            <MetricCard icon={GitBranch} label="Process Definitions" value={data!.totalDefinitions} />
            <MetricCard icon={AlertTriangle} label="Active Insights" value={data!.totalInsights} />
            <MetricCard
              icon={Shield}
              label="Avg Stability"
              value={
                data!.definitions.length > 0
                  ? `${Math.round(
                      (data!.definitions.reduce((s, d) => s + (d.stabilityScore ?? 0), 0) /
                        data!.definitions.filter((d) => d.stabilityScore !== null).length) * 100,
                    )}%`
                  : '—'
              }
            />
          </div>

          {/* Insights */}
          {data!.insights.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-900 mb-3">Insights</h2>
              <div className="space-y-2">
                {data!.insights.map((insight) => {
                  const style = SEVERITY_STYLES[insight.severity] ?? SEVERITY_STYLES.info!;
                  const Icon = INSIGHT_TYPE_ICONS[insight.insightType] ?? Eye;
                  return (
                    <div key={insight.id} className={`card p-4 ${style.bg} border-0`}>
                      <div className="flex items-start gap-3">
                        <Icon className={`h-4 w-4 mt-0.5 ${style.text} flex-shrink-0`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-semibold ${style.text}`}>
                              {insight.severity.toUpperCase()}
                            </span>
                            <span className="text-xs text-gray-400">{insight.insightType}</span>
                          </div>
                          <p className="text-sm font-medium text-gray-900 mt-0.5">{insight.title}</p>
                          <p className="text-xs text-gray-600 mt-1 leading-relaxed">{insight.explanation}</p>
                          {insight.recommendation && (
                            <p className="text-xs text-gray-500 mt-1 italic">{insight.recommendation}</p>
                          )}
                          {(insight.observedValue || insight.expectedValue) && (
                            <div className="flex gap-4 mt-2 text-[10px] text-gray-500">
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
            </div>
          )}

          {/* Process Definitions */}
          <div>
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Process Definitions</h2>
            {data!.definitions.length === 0 ? (
              <div className="card p-8 text-center">
                <p className="text-sm text-gray-500">
                  Click &quot;Run Analysis&quot; to auto-detect process definitions from your workflows.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {data!.definitions.map((def) => (
                  <div key={def.id} className="card p-4 hover:border-gray-300 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-gray-900 truncate">{def.canonicalName}</h3>
                        <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-gray-500">
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

                        {/* Insight badges */}
                        {def.insights.length > 0 && (
                          <div className="flex gap-1 mt-2">
                            {def.insights.slice(0, 3).map((i) => {
                              const s = SEVERITY_STYLES[i.severity] ?? SEVERITY_STYLES.info!;
                              return (
                                <span key={i.id} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${s.bg} ${s.text}`}>
                                  <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
                                  {i.title}
                                </span>
                              );
                            })}
                            {def.insights.length > 3 && (
                              <span className="text-[10px] text-gray-400">+{def.insights.length - 3}</span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Run list preview */}
                      <div className="hidden sm:flex items-center gap-2 ml-4">
                        <div className="text-right">
                          {def.workflows.slice(0, 2).map((w) => (
                            <Link
                              key={w.id}
                              href={`/workflows/${w.id}`}
                              className="block text-[10px] text-gray-400 hover:text-brand-600 truncate max-w-[120px]"
                            >
                              {w.title}
                            </Link>
                          ))}
                          {def.workflows.length > 2 && (
                            <span className="text-[10px] text-gray-300">+{def.workflows.length - 2} more</span>
                          )}
                        </div>
                        <ChevronRight className="h-4 w-4 text-gray-300" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | number }) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="h-4 w-4 text-brand-600" />
        <p className="text-xs text-gray-500">{label}</p>
      </div>
      <p className="text-xl font-semibold text-gray-900">{value}</p>
    </div>
  );
}
