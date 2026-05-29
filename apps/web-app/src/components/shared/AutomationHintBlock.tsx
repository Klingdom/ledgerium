/**
 * AutomationHintBlock — semantic "automation opportunity" callout used in
 * SOP-view surfaces (SOPExecutionMode + SOPIntelligenceMode).
 *
 * Replaces the recurring `bg-violet-50 border border-violet-200` block with
 * the theme-aware `surface-info` token (violet/info share semantic meaning in
 * the Ledgerium content model per the UX audit). See
 * EXPORT_TEMPLATE_REVIEW_001 §3.
 */

import React from 'react';
import { Zap } from 'lucide-react';

interface AutomationHintBlockProps {
  hint: string;
  className?: string;
}

export function AutomationHintBlock({ hint, className = '' }: AutomationHintBlockProps) {
  return (
    <div
      className={`flex items-start gap-2 text-[11px] bg-surface-info border border-border-info text-content-on-info rounded-lg px-3 py-2 ${className}`}
    >
      <Zap className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
      <span>{hint}</span>
    </div>
  );
}
