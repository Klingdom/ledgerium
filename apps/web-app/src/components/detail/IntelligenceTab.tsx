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
      <div className="text-center py-12">
        <BarChart3 className="mx-auto h-10 w-10 text-gray-300 mb-3" />
        <h3 className="text-sm font-medium text-gray-900 mb-1">Run process intelligence</h3>
        <p className="text-sm text-gray-500 mb-4">
          Analyze this workflow for metrics, bottlenecks, and patterns.
        </p>
        {error && <p className="text-xs text-red-500 mb-3">{error}</p>}
        <button onClick={analyze} className="btn-primary gap-1.5">
          <Zap className="h-4 w-4" />
          Analyze Workflow
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <RefreshCw className="mx-auto h-8 w-8 text-brand-500 animate-spin mb-3" />
        <p className="text-sm text-gray-500">Running intelligence analysis...</p>
      </div>
    );
  }

  const { metrics, timestudy, variance, variants, bottlenecks, standardPath } = intelligence;

  return (
    <div className="space-y-6">
      {/* Key metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MiniMetric label="Duration" value={metrics?.medianDurationMs ? formatDuration(metrics.medianDurationMs) : '—'} sub="median" />
        <MiniMetric label="Steps" value={metrics?.medianStepCount ?? metrics?.meanStepCount ?? '—'} sub="median" />
        <MiniMetric label="Events" value={metrics?.runCount ?? 1} sub="run(s)" />
        <MiniMetric label="Completion" value={metrics ? `${Math.round(metrics.completionRate * 100)}%` : '—'} sub="rate" />
      </div>

      {/* Bottlenecks */}
      {bottlenecks?.bottlenecks?.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
            Bottlenecks
          </h3>
          <div className="space-y-2">
            {bottlenecks.bottlenecks.map((b: any) => (
              <div key={b.position} className="card p-3 bg-amber-50/50 border-amber-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      Step {b.position} <span className="text-xs text-gray-500">({b.category})</span>
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {b.durationRatio.toFixed(1)}x slower than average step
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-amber-700">
                      {formatDuration(b.meanDurationMs)}
                    </p>
                    <p className="text-[10px] text-gray-400">
                      vs {formatDuration(b.overallMeanStepDurationMs)} avg
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Timestudy — per-step durations */}
      {timestudy?.stepPositionTimestudies?.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            Step Duration Analysis
          </h3>
          <div className="card overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">Step</th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">Category</th>
                  <th className="text-right py-2 px-3 text-gray-500 font-medium">Mean</th>
                  <th className="text-right py-2 px-3 text-gray-500 font-medium">Median</th>
                  <th className="text-right py-2 px-3 text-gray-500 font-medium">P90</th>
                </tr>
              </thead>
              <tbody>
                {timestudy.stepPositionTimestudies.map((s: any) => (
                  <tr key={s.position} className="border-b border-gray-50">
                    <td className="py-2 px-3 font-medium text-gray-900">{s.position}</td>
                    <td className="py-2 px-3 text-gray-500">{s.category}</td>
                    <td className="py-2 px-3 text-right text-gray-700">{s.meanDurationMs ? formatDuration(s.meanDurationMs) : '—'}</td>
                    <td className="py-2 px-3 text-right text-gray-700">{s.medianDurationMs ? formatDuration(s.medianDurationMs) : '—'}</td>
                    <td className="py-2 px-3 text-right text-gray-700">{s.p90DurationMs ? formatDuration(s.p90DurationMs) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Variance */}
      {variance && (
        <section>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <GitBranch className="h-3.5 w-3.5" />
            Variance
          </h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="card p-3">
              <p className="text-[10px] text-gray-400 uppercase">Sequence Stability</p>
              <p className="text-lg font-semibold text-gray-900">
                {Math.round(variance.sequenceStability * 100)}%
              </p>
            </div>
            <div className="card p-3">
              <p className="text-[10px] text-gray-400 uppercase">Duration CV</p>
              <p className="text-lg font-semibold text-gray-900">
                {variance.durationVariance.coefficientOfVariation?.toFixed(2) ?? '—'}
              </p>
            </div>
            <div className="card p-3">
              <p className="text-[10px] text-gray-400 uppercase">High-Var Steps</p>
              <p className="text-lg font-semibold text-gray-900">
                {variance.highVarianceSteps?.length ?? 0}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Variants */}
      {variants?.variants?.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5" />
            Variants ({variants.variantCount})
          </h3>
          <div className="space-y-2">
            {variants.variants.map((v: any) => (
              <div key={v.variantId} className={`card p-3 ${v.isStandardPath ? 'border-brand-200 bg-brand-50/30' : ''}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900 flex items-center gap-1.5">
                      {v.variantId}
                      {v.isStandardPath && (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-brand-100 px-2 py-0.5 text-[9px] font-bold text-brand-700 uppercase">
                          <CheckCircle className="h-3 w-3" />
                          Standard
                        </span>
                      )}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5 font-mono truncate max-w-sm">
                      {v.pathSignature.signature}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">{Math.round(v.frequency * 100)}%</p>
                    <p className="text-[10px] text-gray-400">{v.runCount} run{v.runCount !== 1 ? 's' : ''}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Re-analyze button */}
      <div className="pt-2">
        <button onClick={analyze} disabled={isLoading} className="btn-secondary gap-1.5 text-xs">
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Re-analyze
        </button>
      </div>
    </div>
  );
}

function MiniMetric({ label, value, sub }: { label: string; value: string | number; sub: string }) {
  return (
    <div className="card p-3">
      <p className="text-[10px] text-gray-400 uppercase tracking-wide">{label}</p>
      <p className="text-lg font-semibold text-gray-900">{value}</p>
      <p className="text-[10px] text-gray-400">{sub}</p>
    </div>
  );
}
