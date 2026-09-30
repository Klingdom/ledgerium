'use client';

import Link from 'next/link';
import { quotaMeterState, type RecordingMax } from '@/lib/quota-meter';
import { track } from '@/lib/analytics.js';
import { useAccount } from '@/hooks/useAccount';
import { useUpgradePromptViewed } from '@/hooks/useUpgradePromptViewed';

/**
 * Monthly recording usage in the live dashboard header.
 *
 * Renders nothing on unlimited plans — which includes every user inside an
 * active reverse trial, since /api/account resolves the effective plan. It
 * appears once a user is on a capped plan, which is exactly the roll-down
 * moment that previously had no signal anywhere.
 *
 * All judgement (thresholds, copy, honesty constraints) lives in
 * lib/quota-meter.ts and is tested there; this only maps state onto markup.
 * Fetch failure is silent: header chrome must never break the dashboard.
 */
export function RecordingQuotaChip() {
  // Row #189: was a self-issued fetch('/api/account'). It now shares the
  // request with TrialStatusChip in AppShell, which mounts in the same tick on
  // the dashboard — two identical requests for one page load. Failure stays
  // silent: `account` is null on error, quotaMeterState renders nothing, and
  // header chrome must never break the dashboard.
  const { account } = useAccount();
  const rec = account?.limits?.recordings;
  const used: number | null = rec?.used ?? null;
  const max: RecordingMax | null = rec?.max ?? null;

  const state = quotaMeterState(used, max);

  // Row #238. This surface has always recorded the click and never the view,
  // so it contributed to the funnel's numerator and not its denominator.
  // `state.cta` is the CTA actually being rendered below, so it is the honest
  // condition for "a prompt was shown". Team is the plan that lifts the
  // recording cap (plans.ts: free 5, starter 15, team unlimited).
  useUpgradePromptViewed(state.cta ? { location: 'dashboard_v2_quota_chip', plan: 'team' } : null);

  if (!state.show) return null;

  const countClass =
    state.tone === 'limit'
      ? 'text-red-500'
      : state.tone === 'attention'
        ? 'text-amber-500'
        : 'text-[var(--content-secondary)]';

  return (
    <div className="flex flex-col items-end gap-0.5" title={state.detail}>
      <span
        className={`text-[12px] font-medium tabular-nums ${countClass}`}
        aria-label={`${state.label} this month. ${state.detail}`}
      >
        {state.label}
      </span>
      {state.cta && (
        <Link
          href={state.href}
          onClick={() => track({ event: 'upgrade_clicked', location: 'dashboard_v2_quota_chip' })}
          className={`text-[11px] font-medium underline underline-offset-2 whitespace-nowrap ${countClass}`}
        >
          {state.cta}
        </Link>
      )}
    </div>
  );
}
