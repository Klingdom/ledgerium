'use client';

import { useState, useCallback } from 'react';
import {
  BarChart3,
  Clock,
  Layers,
  GitBranch,
  AlertTriangle,
  TrendingUp,
  RefreshCw,
  Zap,
  CheckCircle,
} from 'lucide-react';
import { formatDuration } from '@/lib/format';

interface Props {
  workflowId: string;
}

export function IntelligenceTab({ workflowId }: Props) {
  const [intelligence, setIntelligence] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyze = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/workflows/${workflowId}/analyze`, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Analysis failed');
        return;
      }
      const data = await res.json();
      setIntelligence(data.intelligence);
    } catch {
      setError('Failed to run analysis');
    } finally {
      setIsLoading(false);
    }
  }, [workflowId]);

  if (!intelligence && !isLoading) {
    return (
      <div className="text-center py-ds-12">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
          <BarChart3 className="h-7 w-7 text-gray-400" />
        </div>
        <h3 className="mt-ds-4 text-ds-base font-medium text-gray-900">Run process intelligence</h3>
        <p className="mt-ds-1 text-ds-sm text-gray-500">
          Analyze this workflow for metrics, bottlenecks, and patterns.
        </p>
        {error && <p className="text-ds-xs text-red-500 mt-ds-2">{error}</p>}
        <button onClick={analyze} className="btn-primary gap-1.5 mt-ds-4">
          <Zap className="h-4 w-4" />
          Analyze Workflow
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="text-center py-ds-12">
        <RefreshCw className="mx-auto h-8 w-8 text-brand-500 animate-spin" />
        <p className="mt-ds-3 text-ds-sm text-gray-500">Running intelligence analysis...</p>
      </div>
    );
  }

  const { metrics, timestudy, variance, variants, bottlenecks } = intelligence;

  return (
    <div className="ds-document">
      {/* Key metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-ds-4">
        <div className="card px-ds-4 py-ds-3">
          <p className="ds-metric-label">Duration</p>
          <p className="ds-metric-value">{metrics?.medianDurationMs ? formatDuration(metrics.medianDurationMs) : '—'}</p>
          <p className="text-ds-xs text-gray-400">median</p>
        </div>
        <div className="card px-ds-4 py-ds-3">
          <p className="ds-metric-label">Steps</p>
          <p className="ds-metric-value">{metrics?.medianStepCount ?? metrics?.meanStepCount ?? '—'}</p>
          <p className="text-ds-xs text-gray-400">median</p>
        </div>
        <div className="card px-ds-4 py-ds-3">
          <p className="ds-metric-label">Runs</p>
          <p className="ds-metric-value">{metrics?.runCount ?? 1}</p>
          <p className="text-ds-xs text-gray-400">analyzed</p>
        </div>
        <div className="card px-ds-4 py-ds-3">
          <p className="ds-metric-label">Completion</p>
          <p className="ds-metric-value">{metrics ? `${Math.round(metrics.completionRate * 100)}%` : '—'}</p>
          <p className="text-ds-xs text-gray-400">rate</p>
        </div>
      </div>

      {/* Bottlenecks */}
      {bottlenecks?.bottlenecks?.length > 0 && (
        <section className="ds-section">
          <h3 className="ds-section-label flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
            Bottlenecks
          </h3>
          <div className="space-y-ds-2">
            {bottlenecks.bottlenecks.map((b: any) => (
              <div key={b.position} className="ds-callout ds-callout-warning">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-ds-sm font-medium text-gray-900">
                      Step {b.position} <span className="text-ds-xs text-gray-500">({b.category})</span>
                    </p>
                    <p className="text-ds-xs text-gray-500 mt-0.5">
                      {b.durationRatio.toFixed(1)}x slower than average step
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-ds-sm font-semibold text-amber-700">{formatDuration(b.meanDurationMs)}</p>
                    <p className="text-ds-xs text-gray-400">vs {formatDuration(b.overallMeanStepDurationMs)} avg</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Timestudy */}
      {timestudy?.stepPositionTimestudies?.length > 0 && (
        <section className="ds-section">
          <h3 className="ds-section-label flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            Step Duration Analysis
          </h3>
          <div className="card overflow-hidden">
            <table className="w-full text-ds-xs">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/50">
                  <th className="text-left py-ds-2 px-ds-4 text-gray-500 font-medium">Step</th>
                  <th className="text-left py-ds-2 px-ds-4 text-gray-500 font-medium">Category</th>
                  <th className="text-right py-ds-2 px-ds-4 text-gray-500 font-medium">Mean</th>
                  <th className="text-right py-ds-2 px-ds-4 text-gray-500 font-medium">Median</th>
                  <th className="text-right py-ds-2 px-ds-4 text-gray-500 font-medium">P90</th>
                </tr>
              </thead>
              <tbody>
                {timestudy.stepPositionTimestudies.map((s: any) => (
                  <tr key={s.position} className="border-b border-gray-100 hover:bg-gray-50/50">
                    <td className="py-ds-2 px-ds-4 font-medium text-gray-900 tabular-nums">{s.position}</td>
                    <td className="py-ds-2 px-ds-4 text-gray-500">{s.category}</td>
                    <td className="py-ds-2 px-ds-4 text-right text-gray-700 tabular-nums">{s.meanDurationMs ? formatDuration(s.meanDurationMs) : '—'}</td>
                    <td className="py-ds-2 px-ds-4 text-right text-gray-700 tabular-nums">{s.medianDurationMs ? formatDuration(s.medianDurationMs) : '—'}</td>
                    <td className="py-ds-2 px-ds-4 text-right text-gray-700 tabular-nums">{s.p90DurationMs ? formatDuration(s.p90DurationMs) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Variance */}
      {variance && (
        <section className="ds-section">
          <h3 className="ds-section-label flex items-center gap-1.5">
            <GitBranch className="h-3.5 w-3.5" />
            Variance
          </h3>
          <div className="grid grid-cols-3 gap-ds-4">
            <div className="card px-ds-4 py-ds-3">
              <p className="ds-metric-label">Sequence Stability</p>
              <p className="ds-metric-value">{Math.round(variance.sequenceStability * 100)}%</p>
            </div>
            <div className="card px-ds-4 py-ds-3">
              <p className="ds-metric-label">Duration CV</p>
              <p className="ds-metric-value">{variance.durationVariance.coefficientOfVariation?.toFixed(2) ?? '—'}</p>
            </div>
            <div className="card px-ds-4 py-ds-3">
              <p className="ds-metric-label">High-Var Steps</p>
              <p className="ds-metric-value">{variance.highVarianceSteps?.length ?? 0}</p>
            </div>
          </div>
        </section>
      )}

      {/* Variants */}
      {variants?.variants?.length > 0 && (
        <section className="ds-section">
          <h3 className="ds-section-label flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5" />
            Variants ({variants.variantCount})
          </h3>
          <div className="space-y-ds-2">
            {variants.variants.map((v: any) => (
              <div key={v.variantId} className={`card px-ds-5 py-ds-3 ${v.isStandardPath ? 'border-brand-200 bg-brand-50/30' : ''}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-ds-sm font-medium text-gray-900 flex items-center gap-ds-2">
                      {v.variantId}
                      {v.isStandardPath && (
                        <span className="ds-tag ds-tag-brand text-[10px] flex items-center gap-0.5">
                          <CheckCircle className="h-3 w-3" />
                          Standard
                        </span>
                      )}
                    </p>
                    <p className="text-ds-xs text-gray-400 mt-0.5 font-mono truncate max-w-sm">
                      {v.pathSignature.signature}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-ds-sm font-semibold text-gray-900">{Math.round(v.frequency * 100)}%</p>
                    <p className="text-ds-xs text-gray-400">{v.runCount} run{v.runCount !== 1 ? 's' : ''}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Re-analyze */}
      <div className="pt-ds-2">
        <button onClick={analyze} disabled={isLoading} className="btn-secondary gap-1.5 text-xs">
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Re-analyze
        </button>
      </div>
    </div>
  );
}
