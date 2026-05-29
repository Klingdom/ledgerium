/**
 * ImpactBadge — semantic chip for high/medium/low impact indicators on
 * recommendation cards across SOP-view surfaces.
 *
 * Same severity→token mapping as SeverityPill but with a lighter visual
 * weight (no border, smaller padding) suited to dense recommendation rows.
 * See EXPORT_TEMPLATE_REVIEW_001 §3.
 */

import React from 'react';

export type Impact = 'high' | 'medium' | 'low';

interface ImpactBadgeProps {
  impact: Impact;
  label?: string;
  className?: string;
}

// Exported for direct unit testing (see ImpactBadge.test.tsx).
export const IMPACT_CLASSES: Record<Impact, string> = {
  high:   'bg-surface-danger  text-content-on-danger',
  medium: 'bg-surface-warning text-content-on-warning',
  low:    'bg-surface-info    text-content-on-info',
};

export function ImpactBadge({ impact, label, className = '' }: ImpactBadgeProps) {
  return (
    <span
      className={`inline-flex items-center text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded ${IMPACT_CLASSES[impact]} ${className}`}
    >
      {label ?? impact}
    </span>
  );
}
