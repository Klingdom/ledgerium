/**
 * WarningBlock — semantic warning callout for friction, advisories, and
 * decision-point notes in SOP-view surfaces.
 *
 * Replaces the recurring `bg-amber-50 border border-amber-200 rounded-lg
 * px-3 py-2` block with a theme-aware version. See EXPORT_TEMPLATE_REVIEW_001 §3.
 */

import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface WarningBlockProps {
  children: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

export function WarningBlock({ children, icon, className = '' }: WarningBlockProps) {
  return (
    <div
      className={`flex items-start gap-2 bg-surface-warning border border-border-warning rounded-lg px-3 py-2 text-[11px] text-content-on-warning ${className}`}
    >
      <span className="flex-shrink-0 mt-0.5">
        {icon ?? <AlertTriangle className="w-3.5 h-3.5" />}
      </span>
      <div className="flex-1">{children}</div>
    </div>
  );
}
