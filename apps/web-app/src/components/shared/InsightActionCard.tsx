'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

export interface InsightActionCardInsight {
  id: string;
  title: string;
  description: string;
  category: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  confidence: number;
  evidence?: string | undefined;
  impact?: string | undefined;
  suggestion?: string | undefined;
  stepOrdinals?: number[] | undefined;
}

export interface InsightActionCardProps {
  insight: InsightActionCardInsight;
  /** For dashboard use — hides evidence/suggestion sections */
  compact?: boolean;
  defaultExpanded?: boolean;
  onStepClick?: (ordinal: number) => void;
}

const SEVERITY_BORDER: Record<string, string> = {
  critical: 'border-l-red-500',
  high: 'border-l-red-400',
  medium: 'border-l-amber-400',
  low: 'border-l-[var(--border-default)]',
  info: 'border-l-blue-300',
};

const SEVERITY_BADGE: Record<string, string> = {
  critical: 'bg-red-50 text-red-700 border border-red-200',
  high: 'bg-red-50 text-red-600 border border-red-100',
  medium: 'bg-amber-50 text-amber-700 border border-amber-200',
  low: 'bg-[var(--surface-secondary)] text-[var(--content-secondary)] border border-[var(--border-default)]',
  info: 'bg-blue-50 text-blue-700 border border-blue-200',
};

const CATEGORY_LABEL: Record<string, string> = {
  time_analysis: 'Time Analysis',
  rework: 'Rework',
  system_efficiency: 'System Efficiency',
  automation: 'Automation',
  process_health: 'Process Health',
};

/**
 * InsightActionCard — expandable insight card used in Insights Feed section.
 *
 * Collapsed: severity badge, category badge, title, 2-line description, affected steps.
 * Expanded:  adds Evidence, Impact, Suggestion detail sections.
 * Uses max-height CSS transition for smooth expand/collapse.
 */
export function InsightActionCard({
  insight,
  compact = false,
  defaultExpanded = false,
  onStepClick,
}: InsightActionCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const border = SEVERITY_BORDER[insight.severity] ?? 'border-l-[var(--border-default)]';
  const badge = SEVERITY_BADGE[insight.severity] ?? 'bg-[var(--surface-secondary)] text-[var(--content-secondary)] border border-[var(--border-default)]';
  const categoryLabel = CATEGORY_LABEL[insight.category] ?? insight.category.replace(/_/g, ' ');
  const confidencePct = Math.round((insight.confidence ?? 0) * 100);

  const hasDetails = !compact && (insight.evidence || insight.impact || insight.suggestion);

  return (
    <div
      className={`border-l-[3px] ${border} bg-[var(--surface-elevated)] border border-[var(--border-subtle)] rounded-ds-md overflow-hidden`}
    >
      {/* Header row — always visible */}
      <button
        type="button"
        onClick={() => hasDetails && setExpanded((v) => !v)}
        className={`w-full text-left px-4 py-3 flex items-start gap-3 ${hasDetails ? 'cursor-pointer hover:bg-[var(--surface-secondary)] transition-colors' : 'cursor-default'}`}
        aria-expanded={expanded}
      >
        {/* Badges */}
        <div className="flex-shrink-0 flex flex-col gap-1 mt-0.5">
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge}`}>
            {insight.severity}
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="ds-tag ds-tag-neutral text-[10px]">{categoryLabel}</span>
            {confidencePct > 0 && (
              <span className="text-[10px] text-[var(--content-tertiary)]">{confidencePct}% confidence</span>
            )}
          </div>
          <p className="text-ds-sm font-medium text-[var(--content-primary)] leading-snug">{insight.title}</p>
          <p className="text-ds-xs text-[var(--content-secondary)] mt-0.5 line-clamp-2">{insight.description}</p>
          {insight.stepOrdinals && insight.stepOrdinals.length > 0 && (
            <div className="mt-1.5 flex items-center gap-1 flex-wrap">
              <span className="text-[10px] text-[var(--content-tertiary)]">Steps:</span>
              {insight.stepOrdinals.map((ordinal) => (
                <button
                  key={ordinal}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onStepClick?.(ordinal);
                  }}
                  className={`inline-flex items-center justify-center h-5 w-5 rounded-full text-[10px] font-semibold bg-[var(--surface-secondary)] text-[var(--content-secondary)] ${onStepClick ? 'hover:bg-brand-100 hover:text-brand-700 cursor-pointer' : 'cursor-default'}`}
                >
                  {ordinal}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Expand indicator */}
        {hasDetails && (
          <div className="flex-shrink-0 mt-1">
            {expanded ? (
              <ChevronDown className="h-4 w-4 text-[var(--content-tertiary)]" />
            ) : (
              <ChevronRight className="h-4 w-4 text-[var(--content-tertiary)]" />
            )}
          </div>
        )}
      </button>

      {/* Expandable detail body */}
      {hasDetails && (
        <div
          className={`overflow-hidden transition-all duration-200 ${expanded ? 'max-h-96' : 'max-h-0'}`}
        >
          <div className="px-4 pb-4 space-y-3 border-t border-[var(--border-subtle)] pt-3">
            {insight.evidence && (
              <div>
                <p className="text-[10px] font-semibold text-[var(--content-tertiary)] uppercase tracking-wide mb-1">
                  Evidence
                </p>
                <p className="text-ds-xs text-[var(--content-primary)]">{insight.evidence}</p>
              </div>
            )}
            {insight.impact && (
              <div>
                <p className="text-[10px] font-semibold text-[var(--content-tertiary)] uppercase tracking-wide mb-1">
                  Impact
                </p>
                <p className="text-ds-xs text-[var(--content-primary)]">{insight.impact}</p>
              </div>
            )}
            {insight.suggestion && (
              <div className="bg-blue-50 rounded-ds-md px-3 py-2.5">
                <p className="text-[10px] font-semibold text-brand-700 uppercase tracking-wide mb-1">
                  Suggestion
                </p>
                <p className="text-ds-xs text-[var(--content-primary)]">{insight.suggestion}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
