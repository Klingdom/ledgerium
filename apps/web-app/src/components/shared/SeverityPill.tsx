/**
 * SeverityPill — semantic chip for high/medium/low severity indicators.
 *
 * Replaces the recurring inline ternary pattern across SOPExecutionMode,
 * SOPVisualMode, SOPIntelligenceMode, and SOPPageShell:
 *   `bg-red-50 border-red-200 text-red-700` / amber / blue three-way.
 *
 * Uses semantic theme tokens (`bg-surface-danger` / `text-content-on-danger` /
 * `border-border-danger`, etc.) so the pill adapts to dark + light theme and
 * preserves WCAG AA contrast on both. See EXPORT_TEMPLATE_REVIEW_001 §3.
 */

import React from 'react';

export type Severity = 'high' | 'medium' | 'low';

interface SeverityPillProps {
  severity: Severity;
  label: string;
  className?: string;
}

// Severity → semantic token mapping. high = danger, medium = warning, low = info.
// Exported for direct unit testing (see SeverityPill.test.tsx).
export const SEVERITY_CLASSES: Record<Severity, string> = {
  high:   'bg-surface-danger  text-content-on-danger  border-border-danger',
  medium: 'bg-surface-warning text-content-on-warning border-border-warning',
  low:    'bg-surface-info    text-content-on-info    border-border-info',
};

export function SeverityPill({ severity, label, className = '' }: SeverityPillProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${SEVERITY_CLASSES[severity]} ${className}`}
    >
      {label}
    </span>
  );
}
