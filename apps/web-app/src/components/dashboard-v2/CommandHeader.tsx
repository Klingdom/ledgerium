'use client';

/**
 * CommandHeader — Section 1 of the Dashboard V2 shell.
 *
 * Renders:
 *  - Page title ("Workflows")
 *  - Persistent honest purpose subtitle (atglance-review item #1)
 *  - Inline time-range <select> (7d / 30d / 90d / All, default 30d — D7: UI-only)
 *  - Portfolio health VERDICT WORD + 3-band rail + period-over-period delta.
 *    The health SCORE NUMBER is intentionally NOT rendered here — it appears
 *    exactly once on the page, in the HealthGauge (atglance-review item #2,
 *    "kill the triple-88"). The header shows a non-numeric verdict word
 *    (Good / Fair / Needs attention) so the orientation signal survives without
 *    duplicating the number.
 *  - Top insight sentence (from highest-severity chip, or blank)
 *
 * Design tokens (PRD §5.4):
 *  - Typography: 28px for score, 20px for title, 14px body, 12px labels
 *  - Weights: 600 for score, 500 for title/labels, 400 for body
 *  - Color thresholds (iter-024 PRD §2.4): red <60, amber 60–79, green ≥80
 *  - Spacing: 32px outer gutter, 24px section gap, 16px column gap
 *
 * iter-024 changes:
 *  - Health band thresholds updated to 60/80 (was 40/70) per PRD_DASHBOARD_V2_EXECUTIVE_REFINEMENT §2.4
 *  - portfolioHealthScoreDelta prop added for period-over-period delta display (§4.1 item a)
 */

import { ArrowDown, ArrowUp, Minus } from 'lucide-react';
import type { InsightChip } from '@/lib/workflow-metrics.js';

export type TimeRange = '7d' | '30d' | '90d' | 'all';

interface CommandHeaderProps {
  portfolioHealthScore: number | null;
  /** Period-over-period delta (current − prior 30d). Null if prior period has insufficient data. */
  portfolioHealthScoreDelta: number | null;
  /**
   * @deprecated atglance-review bottleneck de-dup — no longer rendered here.
   * The highest-severity insight now appears once below the charts as the
   * dismissible InsightsStrip chip. Prop retained (accepted-but-unused) to keep
   * the shell call site stable; safe to remove in a follow-up cleanup.
   */
  topInsight: InsightChip | null;
  timeRange: TimeRange;
  onTimeRangeChange: (range: TimeRange) => void;
  /**
   * Total workflow count (from allWorkflows before filters).
   * When 0, replaces the portfolio health score widget with a first-workflow
   * activation prompt per WDC2-P05 (iter-080) / row #76 WDC-P03.
   */
  workflowCount?: number;
}

/**
 * 3-state health band.
 * Thresholds: <60 → poor/red, 60–79 → fair/amber, ≥80 → good/green
 * iter-024: tightened from 40/70 to 60/80 per PRD_DASHBOARD_V2_EXECUTIVE_REFINEMENT §2.4.
 */
function healthBand(score: number): { label: 'poor' | 'fair' | 'good'; colorClass: string; railClass: string } {
  if (score < 60) {
    return { label: 'poor', colorClass: 'text-red-600', railClass: 'bg-red-500' };
  }
  if (score < 80) {
    return { label: 'fair', colorClass: 'text-amber-600', railClass: 'bg-amber-500' };
  }
  return { label: 'good', colorClass: 'text-green-600', railClass: 'bg-green-500' };
}

/**
 * Human-readable, non-numeric verdict word for a health band. Used in the header
 * so the orientation signal survives WITHOUT duplicating the health score number
 * (atglance-review item #2). The number itself lives only in the HealthGauge.
 */
export function healthVerdictWord(label: 'poor' | 'fair' | 'good'): string {
  if (label === 'poor') return 'Needs attention';
  if (label === 'fair') return 'Fair';
  return 'Good';
}

const TIME_RANGE_OPTIONS: { value: TimeRange; label: string }[] = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: 'all', label: 'All time' },
];

export default function CommandHeader({
  portfolioHealthScore,
  portfolioHealthScoreDelta,
  topInsight,
  timeRange,
  onTimeRangeChange,
  workflowCount,
}: CommandHeaderProps) {
  const isLoading = portfolioHealthScore === null;
  const score = portfolioHealthScore ?? 0;
  const band = isLoading ? null : healthBand(score);

  // When no workflows exist, suppress the health score widget entirely (WDC2-P05 iter-080 / row #76)
  const showActivationPrompt = workflowCount === 0;

  // Build delta label text and aria description
  const deltaLabel: string = (() => {
    if (portfolioHealthScoreDelta === null) return '— vs last 30d';
    if (portfolioHealthScoreDelta === 0) return '= 0 vs last 30d';
    const sign = portfolioHealthScoreDelta > 0 ? '+' : '';
    return `${sign}${portfolioHealthScoreDelta} vs last 30d`;
  })();

  const deltaAriaFragment: string = (() => {
    if (portfolioHealthScoreDelta === null) return ', no prior-period data';
    if (portfolioHealthScoreDelta === 0) return ', unchanged versus last 30 days';
    if (portfolioHealthScoreDelta > 0) return `, up ${portfolioHealthScoreDelta} versus last 30 days`;
    return `, down ${Math.abs(portfolioHealthScoreDelta)} versus last 30 days`;
  })();

  const deltaColorClass: string = (() => {
    // Use --content-secondary (not tertiary) so the delta label meets WCAG AA contrast
    // on dark backgrounds. Positive/negative arrows use lighter tone variants for the
    // same reason: green-400 (#34d399) ≈ 7:1 / red-400 (#f87171) ≈ 6:1 on #0D1117.
    if (portfolioHealthScoreDelta === null || portfolioHealthScoreDelta === 0)
      return 'text-[var(--content-secondary)]';
    return portfolioHealthScoreDelta > 0 ? 'text-green-400' : 'text-red-400';
  })();

  const DeltaIcon = portfolioHealthScoreDelta === null || portfolioHealthScoreDelta === 0
    ? Minus
    : portfolioHealthScoreDelta > 0
    ? ArrowUp
    : ArrowDown;

  return (
    <header
      className="flex items-start justify-between gap-ds-4 px-ds-8 py-ds-6"
      aria-label="Dashboard command header"
    >
      {/* Left: title + persistent purpose line + (optional) top insight */}
      <div className="flex flex-col gap-ds-1 min-w-0">
        <h1 className="text-[20px] font-medium leading-[1.2] text-[var(--content-primary)] tracking-tight">
          Workflows
        </h1>
        {/* Item #1 (atglance-review) — orient before alert. A persistent, honest
            one-line purpose statement that does NOT depend on insight data, so a
            newcomer learns what the page is before reading any alert. Claims only
            what the engine computes (cycle time, variation, automation tag). */}
        <p className="text-[13px] font-normal leading-[1.4] text-[var(--content-secondary)] mt-ds-1 max-w-xl">
          Your recorded workflows, measured from real runs — cycle time,
          variation, and where AI could help.
        </p>
        {/* atglance-review bottleneck de-dup: the top-insight line is NO LONGER
            rendered here. The same highest-severity chip (e.g. "Bottleneck: Step
            2 …") already appears once below the charts as the dismissible amber
            InsightsStrip chip — rendering it here too produced a faint duplicate
            in the same viewport. Orientation (purpose subtitle) now leads; the
            single alert lives in the dismissible chip. `topInsight` is retained
            as an accepted-but-unused prop to keep the call site stable. */}
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

        {/* Portfolio health score + delta — suppressed when no workflows exist (WDC2-P05 iter-080) */}
        {showActivationPrompt ? (
          <p
            className="text-[14px] font-normal text-[var(--content-secondary)] text-right max-w-xs"
            role="status"
            aria-label="Record your first workflow to see your Process Health Score"
          >
            Record your first workflow to see your Process Health Score
          </p>
        ) : (
          <div
            className="flex flex-col items-end gap-ds-1"
            role="status"
            aria-label={
              isLoading
                ? 'Portfolio health: loading'
                : `Portfolio health: ${healthVerdictWord(band!.label)}${deltaAriaFragment}. See the gauge below for the exact score.`
            }
          >
            <span className="text-[12px] font-medium text-[var(--content-secondary)] uppercase tracking-wide">
              Portfolio Health
            </span>
            <div className="flex items-center gap-ds-2">
              {/* 3-band rail (non-numeric visual; width encodes the score
                  without rendering the integer). */}
              <div className="w-16 h-1.5 rounded-full bg-[var(--border-subtle)] overflow-hidden">
                {!isLoading && (
                  <div
                    className={`h-full rounded-full transition-all duration-150 ${band!.railClass}`}
                    style={{ width: `${score}%` }}
                    aria-hidden="true"
                  />
                )}
              </div>
              {/* Item #2 — verdict WORD, not the score number. The score number
                  appears exactly once on the page, in the HealthGauge. */}
              <span
                className={`text-[16px] font-semibold leading-[1.2] ${
                  isLoading ? 'text-[var(--content-tertiary)]' : band!.colorClass
                }`}
                aria-hidden="true"
              >
                {isLoading ? '—' : healthVerdictWord(band!.label)}
              </span>
            </div>

            {/* Period-over-period delta (iter-024 §4.1 item a) */}
            {!isLoading && (
              <div
                className={`flex items-center gap-0.5 text-[12px] font-medium ${deltaColorClass}`}
                aria-hidden="true"
              >
                <DeltaIcon size={10} aria-hidden="true" />
                <span>{deltaLabel}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
