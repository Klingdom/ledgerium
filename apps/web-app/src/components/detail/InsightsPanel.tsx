'use client';

import {
  Clock,
  AlertTriangle,
  Zap,
  RefreshCw,
  Monitor,
  BarChart3,
  Target,
  Shield,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { useState } from 'react';

/**
 * InsightsPanel — displays automatically generated workflow intelligence.
 *
 * Uses the ds-* design system. Each insight is an expandable card
 * with title, description, evidence, impact, and suggestion.
 */

interface Props {
  insights: any;
}

const CATEGORY_CONFIG: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  time_analysis:      { icon: Clock,          label: 'Time Analysis',      color: 'text-blue-600' },
  rework:             { icon: RefreshCw,      label: 'Rework',             color: 'text-amber-600' },
  system_efficiency:  { icon: Monitor,        label: 'System Efficiency',  color: 'text-violet-600' },
  automation:         { icon: Zap,            label: 'Automation',         color: 'text-emerald-600' },
  process_health:     { icon: Shield,         label: 'Process Health',     color: 'text-gray-600' },
};

const SEVERITY_STYLES: Record<string, string> = {
  high:   'border-l-red-500',
  medium: 'border-l-amber-500',
  low:    'border-l-gray-300',
};

export function InsightsPanel({ insights }: Props) {
  if (!insights || !insights.hasInsights) {
    return (
      <div className="ds-document">
        <div className="card px-ds-6 py-ds-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-green-50">
            <Target className="h-6 w-6 text-green-500" />
          </div>
          <h3 className="mt-ds-3 text-ds-base font-medium text-gray-900">No inefficiencies detected</h3>
          <p className="mt-ds-1 text-ds-sm text-gray-500">
            {insights?.noInsightsMessage || 'This workflow appears well-structured.'}
          </p>
        </div>
      </div>
    );
  }

  const { summary, timeBreakdown } = insights;

  return (
    <div className="ds-document">
      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-ds-4">
        <div className="card px-ds-4 py-ds-3">
          <p className="ds-metric-label">Insights</p>
          <p className="ds-metric-value">{summary.totalInsights}</p>
        </div>
        <div className="card px-ds-4 py-ds-3">
          <p className="ds-metric-label">High Severity</p>
          <p className={`ds-metric-value ${summary.highSeverity > 0 ? 'text-red-600' : ''}`}>
            {summary.highSeverity}
          </p>
        </div>
        {timeBreakdown && (
          <>
            <div className="card px-ds-4 py-ds-3">
              <p className="ds-metric-label">Total Duration</p>
              <p className="ds-metric-value">{timeBreakdown.totalDurationLabel}</p>
            </div>
            <div className="card px-ds-4 py-ds-3">
              <p className="ds-metric-label">Longest Step</p>
              <p className="ds-metric-value">{timeBreakdown.longestStepDurationLabel}</p>
              <p className="text-ds-xs text-gray-400">
                Step {timeBreakdown.longestStepOrdinal} ({timeBreakdown.longestStepPercentage}%)
              </p>
            </div>
          </>
        )}
      </div>

      {/* Insights by category */}
      {summary.categories.map((category: string) => {
        const config = CATEGORY_CONFIG[category] ?? { icon: BarChart3, label: category, color: 'text-gray-600' };
        const Icon = config.icon;
        const categoryInsights = insights.insights.filter((i: any) => i.category === category);
        if (categoryInsights.length === 0) return null;

        return (
          <section key={category} className="ds-section">
            <h2 className="ds-section-label flex items-center gap-ds-2">
              <Icon className={`h-3.5 w-3.5 ${config.color}`} />
              {config.label} ({categoryInsights.length})
            </h2>
            <div className="space-y-ds-2">
              {categoryInsights.map((insight: any) => (
                <InsightCard key={insight.id} insight={insight} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function InsightCard({ insight }: { insight: any }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const border = SEVERITY_STYLES[insight.severity] ?? 'border-l-gray-300';

  return (
    <div className={`ds-step border-l-[3px] ${border}`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full ds-step-header text-left"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-ds-2">
            <h3 className="ds-step-title">{insight.title}</h3>
            <span className={`ds-tag text-[10px] ${
              insight.severity === 'high' ? 'bg-red-50 text-red-700 border border-red-200' :
              insight.severity === 'medium' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
              'ds-tag-neutral'
            }`}>
              {insight.severity}
            </span>
            <span className="ds-tag ds-tag-neutral text-[10px]">
              {insight.confidence} confidence
            </span>
          </div>
          <p className="mt-ds-1 text-ds-sm text-gray-600">{insight.description}</p>
        </div>
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
        )}
      </button>

      {isExpanded && (
        <div className="ds-step-body space-y-ds-3">
          <div className="rounded-ds-md bg-gray-50 px-ds-4 py-ds-3 space-y-ds-3">
            <div>
              <p className="text-ds-xs font-semibold text-gray-500 uppercase tracking-wide mb-ds-1">Evidence</p>
              <p className="text-ds-sm text-gray-700">{insight.evidence}</p>
            </div>
            <div>
              <p className="text-ds-xs font-semibold text-gray-500 uppercase tracking-wide mb-ds-1">Impact</p>
              <p className="text-ds-sm text-gray-700">{insight.impact}</p>
            </div>
            <div className="ds-callout ds-callout-info">
              <p className="text-ds-xs font-semibold text-brand-700 uppercase tracking-wide mb-ds-1">Suggestion</p>
              <p className="text-ds-sm text-gray-700">{insight.suggestion}</p>
            </div>
          </div>
          {insight.stepOrdinals?.length > 0 && (
            <p className="text-ds-xs text-gray-400">
              Affected steps: {insight.stepOrdinals.join(', ')}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
