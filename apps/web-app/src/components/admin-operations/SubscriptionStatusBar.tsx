'use client';

/**
 * SubscriptionStatusBar — horizontal segmented bar showing subscription-status
 * distribution across users.
 *
 * Statuses: none, trialing, active, past_due, canceled.
 * past_due and canceled are rendered in amber with a warning icon (not color-only,
 * per a11y spec §4) so they are distinguishable without relying on colour alone.
 *
 * Each segment is aria-labelled. A zero-total state renders a flat placeholder.
 *
 * @iter B — Growth Intelligence Extension
 */

import type { NormalizedSubscriptionStatus } from '@/lib/admin-operations/types.js';
import { formatNumber, formatPercent } from './format-utils.js';

// Status display order.
const STATUS_ORDER: NormalizedSubscriptionStatus[] = [
  'active',
  'trialing',
  'past_due',
  'canceled',
  'none',
];

/** Display label for each subscription status. */
const STATUS_LABELS: Record<NormalizedSubscriptionStatus, string> = {
  none: 'No subscription',
  trialing: 'Trialing',
  active: 'Active',
  past_due: 'Past due',
  canceled: 'Canceled',
};

/** Whether a status needs amber warning treatment (not color-only). */
const IS_WARNING_STATUS: Record<NormalizedSubscriptionStatus, boolean> = {
  none: false,
  trialing: false,
  active: false,
  past_due: true,
  canceled: true,
};

/** Segment fill colour for each status. */
const STATUS_COLORS: Record<NormalizedSubscriptionStatus, string> = {
  active: 'var(--accent, #20f2a6)',
  trialing: '#3b82f6',          // blue-500
  past_due: '#f59e0b',          // amber-500 (warning)
  canceled: '#d97706',          // amber-600 (warning, darker for differentiation)
  none: 'var(--content-tertiary, #6b7280)',
};

interface SubscriptionStatusBarProps {
  /** Zero-filled status distribution record from SubscriptionBreakdownSection.byStatus. */
  byStatus: Record<NormalizedSubscriptionStatus, number>;
}

/** Inline warning icon SVG (triangle with !). Visible as text alongside amber colour. */
function WarningIcon() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden="true"
      className="inline-block flex-shrink-0 text-amber-500"
    >
      <path d="M8 1L1 14h14L8 1zm0 2.5l5.5 9.5H2.5L8 3.5zM7 7h2v3H7V7zm0 4h2v2H7v-2z" />
    </svg>
  );
}

export function SubscriptionStatusBar({ byStatus }: SubscriptionStatusBarProps) {
  const total = STATUS_ORDER.reduce((sum, s) => sum + (byStatus[s] ?? 0), 0);

  if (total === 0) {
    return (
      <div className="flex flex-col gap-2">
        <div
          className="h-5 w-full overflow-hidden rounded-full bg-[var(--surface-secondary)]"
          role="img"
          aria-label="Subscription status distribution — no users yet"
        />
        <p className="text-[12px] text-[var(--content-tertiary)]">No users yet.</p>
      </div>
    );
  }

  const segments = STATUS_ORDER.map((status) => {
    const count = byStatus[status] ?? 0;
    const pct = count / total * 100;
    return { status, count, pct };
  }).filter((s) => s.count > 0);

  return (
    <div className="flex flex-col gap-3" data-testid="subscription-status-bar">
      {/* Segmented bar */}
      <div
        className="flex h-5 w-full overflow-hidden rounded-full"
        role="img"
        aria-label="Subscription status distribution bar"
      >
        {segments.map(({ status, count, pct }) => (
          <div
            key={status}
            style={{
              width: `${pct}%`,
              backgroundColor: STATUS_COLORS[status],
              minWidth: pct > 0 ? '2px' : '0',
            }}
            role="presentation"
            aria-label={`${STATUS_LABELS[status]}: ${formatNumber(count)} users, ${formatPercent(pct, { fractionDigits: 0 })}`}
            title={`${STATUS_LABELS[status]}: ${formatNumber(count)} (${formatPercent(pct, { fractionDigits: 1 })})`}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {segments.map(({ status, count, pct }) => {
          const isWarning = IS_WARNING_STATUS[status];
          return (
            <div key={status} className="flex items-center gap-1.5">
              {isWarning ? (
                <WarningIcon />
              ) : (
                <span
                  className="inline-block h-2.5 w-2.5 flex-shrink-0 rounded-sm"
                  style={{ backgroundColor: STATUS_COLORS[status] }}
                  aria-hidden="true"
                />
              )}
              <span
                className={`text-[12px] ${isWarning ? 'text-amber-500' : 'text-[var(--content-secondary)]'}`}
              >
                {STATUS_LABELS[status]}
              </span>
              <span
                className={`text-[12px] tabular-nums ${isWarning ? 'font-semibold text-amber-500' : 'text-[var(--content-primary)]'}`}
              >
                {formatNumber(count)}
              </span>
              <span className="text-[11px] text-[var(--content-tertiary)]">
                ({formatPercent(pct, { fractionDigits: 0 })})
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
