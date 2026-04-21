'use client';

/**
 * CommandHeader — Section 1 of the Dashboard V2 shell.
 *
 * Renders:
 *  - Page title ("Workflows")
 *  - Inline time-range <select> (7d / 30d / 90d / All, default 30d — D7: UI-only)
 *  - Portfolio health score (integer + 3-band rail + aria label)
 *  - Top insight sentence (from highest-severity chip, or blank)
 *
 * Design tokens (PRD §5.4):
 *  - Typography: 28px for score, 20px for title, 14px body, 12px labels
 *  - Weights: 600 for score, 500 for title/labels, 400 for body
 *  - Color: red <40, amber 40–69, green 70+ — always paired with text
 *  - Spacing: 32px outer gutter, 24px section gap, 16px column gap
 */

import type { InsightChip } from '@/lib/workflow-metrics.js';

export type TimeRange = '7d' | '30d' | '90d' | 'all';

interface CommandHeaderProps {
  portfolioHealthScore: number | null;
  topInsight: InsightChip | null;
  timeRange: TimeRange;
  onTimeRangeChange: (range: TimeRange) => void;
}

function healthBand(score: number): { label: 'poor' | 'fair' | 'good'; colorClass: string; railClass: string } {
  if (score < 40) {
    return { label: 'poor', colorClass: 'text-red-600', railClass: 'bg-red-500' };
  }
  if (score < 70) {
    return { label: 'fair', colorClass: 'text-amber-600', railClass: 'bg-amber-500' };
  }
  return { label: 'good', colorClass: 'text-green-600', railClass: 'bg-green-500' };
}

const TIME_RANGE_OPTIONS: { value: TimeRange; label: string }[] = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: 'all', label: 'All time' },
];

export default function CommandHeader({
  portfolioHealthScore,
  topInsight,
  timeRange,
  onTimeRangeChange,
}: CommandHeaderProps) {
  const isLoading = portfolioHealthScore === null;
  const score = portfolioHealthScore ?? 0;
  const band = isLoading ? null : healthBand(score);

  return (
    <header
      className="flex items-start justify-between gap-ds-4 px-ds-8 py-ds-6"
      aria-label="Dashboard command header"
    >
      {/* Left: title + top insight */}
      <div className="flex flex-col gap-ds-1 min-w-0">
        <h1 className="text-[20px] font-medium leading-[1.2] text-[var(--content-primary)] tracking-tight">
          Workflows
        </h1>
        {topInsight && (
          <p className="text-[14px] font-normal leading-[1.4] text-[var(--content-secondary)] mt-ds-1 truncate max-w-xl">
            {topInsight.label}
          </p>
        )}
      </div>

      {/* Right: time range selector + portfolio score */}
      <div className="flex items-center gap-ds-4 flex-shrink-0">
        {/* Time range: native <select> for accessibility */}
        <label className="flex items-center gap-ds-2">
          <span className="text-[12px] font-medium text-[var(--content-secondary)] sr-only">
            Time range
          </span>
          <select
            value={timeRange}
            onChange={(e) => onTimeRangeChange(e.target.value as TimeRange)}
            className="text-[12px] font-medium text-[var(--content-secondary)] bg-transparent border border-[var(--border-default)] rounded-ds-sm px-ds-2 py-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 cursor-pointer"
            aria-label="Time range"
          >
            {TIME_RANGE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        {/* Portfolio health score */}
        <div
          className="flex flex-col items-end gap-ds-1"
          role="status"
          aria-label={
            isLoading
              ? 'Portfolio health: loading'
              : `Portfolio health: ${score}, ${band!.label}`
          }
        >
          <span className="text-[12px] font-medium text-[var(--content-secondary)] uppercase tracking-wide">
            Portfolio Health
          </span>
          <div className="flex items-center gap-ds-2">
            {/* 3-band rail */}
            <div className="w-16 h-1.5 rounded-full bg-[var(--border-subtle)] overflow-hidden">
              {!isLoading && (
                <div
                  className={`h-full rounded-full transition-all duration-150 ${band!.railClass}`}
                  style={{ width: `${score}%` }}
                  aria-hidden="true"
                />
              )}
            </div>
            <span
              className={`text-[28px] font-semibold leading-[1.2] tabular-nums ${
                isLoading ? 'text-[var(--content-tertiary)]' : band!.colorClass
              }`}
            >
              {isLoading ? '—' : score}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
