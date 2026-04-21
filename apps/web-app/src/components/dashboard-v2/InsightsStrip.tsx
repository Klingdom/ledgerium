'use client';

/**
 * InsightsStrip — Section 2 of the Dashboard V2 shell.
 *
 * Renders a horizontal row of up to 5 insight chips (computed by the API
 * from computeInsightChips()). Chips are dismissible per session (client
 * state only — not persisted to DB per D9/PRD §5.2).
 *
 * Chip anatomy (PRD §5.2):
 *  - severity dot (red/amber/blue/green) + icon shape + label + count badge
 *  - icon shapes: octagon=critical, triangle=warning, circle=info, leaf=positive
 *  - Color always paired with icon shape + text — never color-only
 *  - Clicking a chip applies the chip's filterKey to the WorkflowList
 *
 * Design tokens (PRD §5.4):
 *  - 12px/500 chip labels, 6px radius, 8px padding
 *  - ≤150ms hover/focus transitions
 */

import { useState } from 'react';
import { AlertOctagon, AlertTriangle, Info, Leaf, X, type LucideIcon } from 'lucide-react';
import type { InsightChip } from '@/lib/workflow-metrics.js';

interface InsightsStripProps {
  chips: InsightChip[];
  activeFilterKey: string | null;
  onChipClick: (filterKey: string) => void;
}

const CHIP_STYLE: Record<
  InsightChip['severity'],
  {
    container: string;
    dot: string;
    text: string;
    ariaPrefix: string;
    Icon: LucideIcon;
    iconLabel: string;
  }
> = {
  critical: {
    container: 'bg-red-50 border-red-200 hover:bg-red-100',
    dot: 'bg-red-500',
    text: 'text-red-700',
    ariaPrefix: 'Critical:',
    Icon: AlertOctagon,
    iconLabel: 'critical severity',
  },
  warning: {
    container: 'bg-amber-50 border-amber-200 hover:bg-amber-100',
    dot: 'bg-amber-500',
    text: 'text-amber-700',
    ariaPrefix: 'Warning:',
    Icon: AlertTriangle,
    iconLabel: 'warning severity',
  },
  info: {
    container: 'bg-blue-50 border-blue-200 hover:bg-blue-100',
    dot: 'bg-blue-500',
    text: 'text-blue-700',
    ariaPrefix: 'Info:',
    Icon: Info,
    iconLabel: 'informational',
  },
  positive: {
    container: 'bg-green-50 border-green-200 hover:bg-green-100',
    dot: 'bg-green-500',
    text: 'text-green-700',
    ariaPrefix: 'Good news:',
    Icon: Leaf,
    iconLabel: 'positive signal',
  },
};

export default function InsightsStrip({
  chips,
  activeFilterKey,
  onChipClick,
}: InsightsStripProps) {
  // Track which chip IDs have been dismissed this session
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const visibleChips = chips.filter((c) => !dismissedIds.has(c.id));

  if (visibleChips.length === 0) {
    return null;
  }

  function handleDismiss(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    setDismissedIds((prev) => new Set([...prev, id]));
  }

  return (
    <section
      aria-label="Process insights"
      className="px-ds-8 py-ds-3 flex flex-wrap gap-ds-2"
    >
      {visibleChips.map((chip) => {
        const style = CHIP_STYLE[chip.severity];
        const isActive = activeFilterKey === chip.filterKey;

        return (
          <div
            key={chip.id}
            className={`
              inline-flex items-center gap-ds-2 px-ds-2 py-1
              rounded-ds-sm border text-[12px] font-medium
              transition-colors duration-150 cursor-pointer
              ${style.container} ${style.text}
              ${isActive ? 'ring-2 ring-offset-1 ring-current' : ''}
            `}
            role="button"
            tabIndex={0}
            aria-pressed={isActive}
            aria-label={`${style.ariaPrefix} ${chip.label}. Click to filter workflows.`}
            onClick={() => onChipClick(chip.filterKey)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onChipClick(chip.filterKey);
              }
            }}
          >
            {/* Severity icon shape — color + shape, never color-only */}
            <style.Icon
              size={12}
              className={style.text}
              aria-label={style.iconLabel}
            />

            {/* Severity dot — supplementary, aria-hidden */}
            <span
              className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${style.dot}`}
              aria-hidden="true"
            />

            {/* Label */}
            <span>{chip.label}</span>

            {/* Count badge */}
            {chip.count > 1 && (
              <span
                className="ml-ds-1 rounded-full bg-white/60 px-1.5 py-px text-[12px] font-medium tabular-nums"
                aria-hidden="true"
              >
                {chip.count}
              </span>
            )}

            {/* Dismiss button */}
            <button
              type="button"
              onClick={(e) => handleDismiss(e, chip.id)}
              className="ml-ds-1 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-current p-0.5 hover:bg-white/40 transition-colors duration-150"
              aria-label={`Dismiss ${chip.label} insight`}
            >
              <X size={10} aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </section>
  );
}
