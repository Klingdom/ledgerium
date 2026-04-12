'use client';

import { AlertTriangle, Info, Zap } from 'lucide-react';
import type { WorkflowInsight } from './types';

interface Props {
  insights: WorkflowInsight[];
  visible: boolean;
}

const SEVERITY_STYLES = {
  critical: { icon: AlertTriangle, bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500' },
  warning:  { icon: AlertTriangle, bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
  info:     { icon: Info,          bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' },
};

export function WorkflowInsightsStrip({ insights, visible }: Props) {
  if (!visible || insights.length === 0) return null;

  // Show top 3 insights by severity priority
  const sorted = [...insights].sort((a, b) => {
    const order = { critical: 0, warning: 1, info: 2 };
    return (order[a.severity] ?? 2) - (order[b.severity] ?? 2);
  });
  const top = sorted.slice(0, 3);

  return (
    <div className="flex items-center gap-2 px-ds-5 py-1.5 border-t border-gray-100 bg-gray-50/50 overflow-x-auto">
      <Zap className="h-3 w-3 text-gray-400 flex-shrink-0" />
      {top.map(insight => {
        const style = SEVERITY_STYLES[insight.severity] ?? SEVERITY_STYLES.info;
        return (
          <span
            key={insight.id}
            className={`flex items-center gap-1.5 text-[10px] font-medium px-2 py-0.5 rounded-full border ${style.bg} ${style.text} ${style.border} flex-shrink-0`}
            title={insight.detail}
          >
            <span className={`w-1 h-1 rounded-full ${style.dot}`} />
            {insight.label}
          </span>
        );
      })}
      {insights.length > 3 && (
        <span className="text-[10px] text-gray-400 flex-shrink-0">
          +{insights.length - 3} more
        </span>
      )}
    </div>
  );
}
