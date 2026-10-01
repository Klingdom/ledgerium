'use client';

import Link from 'next/link';
import { quotaMeterState, UNCAPPED_PLAN_ID, type RecordingMax } from '@/lib/quota-meter';
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

  /*
    Row #238: this surface recorded the click and never the view, so it fed
    the funnel's numerator and not its denominator.

    Row #244: the warning and at-limit prompts are reported as *different
    locations*, because they are different events. The chip shows a CTA from
    80% of quota, while `plan_limit_hit` only fires server-side when an action
    is actually blocked at 100% — so lumping them together makes stage 2
    legitimately exceed stage 1 and the funnel read over 100% for a reason
    that is not a defect.

    The at-limit case keeps the original location so historical click data
    stays comparable.

    The plan comes from the same constant as the CTA copy (row #242): loop 70
    wrote 'team' here while the CTA said "Solo".
  */
  const promptLocation =
    state.tone === 'limit' ? 'dashboard_v2_quota_chip' : 'dashboard_v2_quota_warning';

  useUpgradePromptViewed(
    state.cta ? { location: promptLocation, plan: UNCAPPED_PLAN_ID } : null,
  );

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
          // Same location as the view above (row #244). A view and a click
          // reported under different names is the defect this row fixes,
          // wearing different clothes.
          onClick={() => track({ event: 'upgrade_clicked', location: promptLocation })}
          className={`text-[11px] font-medium underline underline-offset-2 whitespace-nowrap ${countClass}`}
        >
          {state.cta}
        </Link>
      )}
    </div>
  );
}
