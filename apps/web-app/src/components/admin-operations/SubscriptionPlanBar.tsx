'use client';

/**
 * SubscriptionPlanBar — horizontal segmented bar showing plan-tier distribution.
 *
 * Renders a single full-width bar divided into coloured segments, one per plan
 * tier (free, starter, team, growth, enterprise), proportional to user count.
 * Labels show count + percentage beneath each segment.
 *
 * Each segment is accessible via aria-label ("free: N users, X%").
 *
 * A zero-total empty state is handled by the parent (SectionCard isEmpty prop).
 * If total is 0 here we render a flat grey placeholder bar instead of dividing
 * by zero.
 *
 * @iter B — Growth Intelligence Extension
 */

import type { NormalizedPlan } from '@/lib/admin-operations/types.js';
import { formatNumber, formatPercent } from './format-utils.js';

// Plan display order (left → right: free → enterprise).
const PLAN_ORDER: NormalizedPlan[] = ['free', 'starter', 'team', 'growth', 'enterprise'];

/** Display label for each plan tier. */
const PLAN_LABELS: Record<NormalizedPlan, string> = {
  free: 'Free',
  starter: 'Starter',
  team: 'Team',
  growth: 'Growth',
  enterprise: 'Enterprise',
};

/** Fill colour for each plan tier segment. */
const PLAN_COLORS: Record<NormalizedPlan, string> = {
  free: 'var(--content-tertiary, #6b7280)',
  starter: '#3b82f6',   // blue-500
  team: 'var(--accent, #20f2a6)',
  growth: '#8b5cf6',   // violet-500
  enterprise: '#f59e0b', // amber-500
};

interface SubscriptionPlanBarProps {
  /** Zero-filled plan distribution record from SubscriptionBreakdownSection.byPlan. */
  byPlan: Record<NormalizedPlan, number>;
}

export function SubscriptionPlanBar({ byPlan }: SubscriptionPlanBarProps) {
  const total = PLAN_ORDER.reduce((sum, p) => sum + (byPlan[p] ?? 0), 0);

  if (total === 0) {
    return (
      <div className="flex flex-col gap-2">
        <div
          className="h-5 w-full overflow-hidden rounded-full bg-[var(--surface-secondary)]"
          role="img"
          aria-label="Plan distribution — no users yet"
        />
        <p className="text-[12px] text-[var(--content-tertiary)]">No users yet.</p>
      </div>
    );
  }

  const segments = PLAN_ORDER.map((plan) => {
    const count = byPlan[plan] ?? 0;
    const pct = count / total * 100;
    return { plan, count, pct };
  }).filter((s) => s.count > 0);

  return (
    <div className="flex flex-col gap-3" data-testid="subscription-plan-bar">
      {/* Segmented bar */}
      <div
        className="flex h-5 w-full overflow-hidden rounded-full"
        role="img"
        aria-label="Plan distribution bar"
      >
        {segments.map(({ plan, count, pct }) => (
          <div
            key={plan}
            style={{
              width: `${pct}%`,
              backgroundColor: PLAN_COLORS[plan],
              minWidth: pct > 0 ? '2px' : '0',
            }}
            role="presentation"
            aria-label={`${PLAN_LABELS[plan]}: ${formatNumber(count)} users, ${formatPercent(pct, { fractionDigits: 0 })}`}
            title={`${PLAN_LABELS[plan]}: ${formatNumber(count)} (${formatPercent(pct, { fractionDigits: 1 })})`}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {segments.map(({ plan, count, pct }) => (
          <div key={plan} className="flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 flex-shrink-0 rounded-sm"
              style={{ backgroundColor: PLAN_COLORS[plan] }}
              aria-hidden="true"
            />
            <span className="text-[12px] text-[var(--content-secondary)]">
              {PLAN_LABELS[plan]}
            </span>
            <span className="text-[12px] tabular-nums text-[var(--content-primary)]">
              {formatNumber(count)}
            </span>
            <span className="text-[11px] text-[var(--content-tertiary)]">
              ({formatPercent(pct, { fractionDigits: 0 })})
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
