'use client';

/**
 * OpportunityBar — horizontal stacked CSS bar of the opportunity-tag mix.
 *
 * Pure CSS (no chart library — lowest render risk). Each segment width is a
 * percentage of the total tagged workflows. Clicking a segment applies (or
 * toggles off) the matching opportunity filter on the list via the
 * `onSegmentClick` callback, reusing the shell's existing filter mechanism.
 *
 * Honesty: when the total is 0 the bar renders an empty track with a "—"
 * message; no fabricated proportions.
 *
 * @batch B (2026-06-12)
 */

import { track } from '@/lib/analytics.js';
import type { OpportunityTag } from '@/lib/workflow-metrics.js';
import type { OpportunityCounts } from '@/lib/dashboard-band-stats.js';
import { OPPORTUNITY_ORDER, OPPORTUNITY_COLOR, OPPORTUNITY_LABEL } from './band-colors.js';

export interface OpportunitySegment {
  tag: OpportunityTag;
  count: number;
  /** Percentage 0–100 of the total tagged workflows. */
  pct: number;
}

/**
 * Pure derivation: convert counts into ordered non-zero segments with
 * percentages. Deterministic; zero-count tags are omitted from the rendered bar
 * (but still counted in `total`). Percentages are rounded to one decimal.
 */
export function deriveSegments(counts: OpportunityCounts): {
  segments: OpportunitySegment[];
  total: number;
} {
  const total = OPPORTUNITY_ORDER.reduce((sum, tag) => sum + counts[tag], 0);
  if (total === 0) return { segments: [], total: 0 };
  const segments: OpportunitySegment[] = [];
  for (const tag of OPPORTUNITY_ORDER) {
    const count = counts[tag];
    if (count <= 0) continue;
    segments.push({
      tag,
      count,
      pct: Math.round((count / total) * 1000) / 10,
    });
  }
  return { segments, total };
}

interface OpportunityBarProps {
  counts: OpportunityCounts;
  /** The currently-active opportunity filter (for active-state styling). */
  activeOpportunity: OpportunityTag | null;
  /** Toggle the opportunity filter for the clicked segment. */
  onSegmentClick: (tag: OpportunityTag) => void;
}

export default function OpportunityBar({
  counts,
  activeOpportunity,
  onSegmentClick,
}: OpportunityBarProps) {
  const { segments, total } = deriveSegments(counts);

  return (
    <div className="flex flex-col gap-ds-2">
      <div className="flex items-baseline justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--content-secondary)]">
          Opportunity mix
        </span>
        {total > 0 && (
          <span className="text-[11px] tabular-nums text-[var(--content-tertiary)]">
            {total} tagged
          </span>
        )}
      </div>

      {total === 0 ? (
        <div className="flex h-3 items-center rounded-full bg-[var(--surface-secondary)] px-ds-2">
          <span className="text-[11px] text-[var(--content-tertiary)]">—</span>
        </div>
      ) : (
        <>
          <div
            className="flex h-3 w-full overflow-hidden rounded-full bg-[var(--surface-secondary)]"
            role="group"
            aria-label="Opportunity distribution — click a segment to filter"
          >
            {segments.map((seg) => {
              const isActive = activeOpportunity === seg.tag;
              return (
                <button
                  key={seg.tag}
                  type="button"
                  onClick={() => {
                    track({
                      event: 'dashboard_opportunity_segment_clicked',
                      segment: seg.tag,
                      count: seg.count,
                    });
                    onSegmentClick(seg.tag);
                  }}
                  className="h-full cursor-pointer transition-opacity duration-150 hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
                  style={{
                    width: `${seg.pct}%`,
                    backgroundColor: OPPORTUNITY_COLOR[seg.tag],
                    opacity: activeOpportunity !== null && !isActive ? 0.45 : 1,
                  }}
                  aria-label={`${OPPORTUNITY_LABEL[seg.tag]}: ${seg.count} workflows (${seg.pct}%). Click to filter.`}
                  aria-pressed={isActive}
                />
              );
            })}
          </div>

          {/* Legend — text + color swatch, never color-only */}
          <ul className="flex flex-wrap gap-x-ds-3 gap-y-ds-1">
            {segments.map((seg) => (
              <li
                key={seg.tag}
                className="inline-flex items-center gap-ds-1 text-[11px] text-[var(--content-secondary)]"
              >
                <span
                  className="h-2 w-2 rounded-sm"
                  style={{ backgroundColor: OPPORTUNITY_COLOR[seg.tag] }}
                  aria-hidden="true"
                />
                <span className="tabular-nums">
                  {OPPORTUNITY_LABEL[seg.tag]} {seg.count}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
