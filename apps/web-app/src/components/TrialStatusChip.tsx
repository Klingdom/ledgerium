'use client';

import Link from 'next/link';
import { trialChipState, type TrialState } from '@/lib/trial-chip';
import { useAccount } from '@/hooks/useAccount';

/**
 * Trial status in the app chrome.
 *
 * Lives in `AppShell` rather than the dashboard header because trial decisions
 * are made on /account and /pricing at least as often as on /dashboard, and a
 * signal only present on one page is one a user can miss entirely for the whole
 * window.
 *
 * All display logic lives in `lib/trial-chip.ts` and is unit-tested there —
 * this component only maps the returned state onto markup. `apps/web-app` has
 * no jsdom, so keeping the judgement out of the component is what makes the
 * judgement testable at all.
 *
 * Fetches independently rather than taking props so it can be dropped into the
 * shell without threading account state through every page. Failure is silent:
 * a chrome ornament must never surface an error banner or block the app, so a
 * failed fetch simply renders nothing.
 */
export function TrialStatusChip() {
  // Row #189: was a self-issued fetch('/api/account'), shared now with
  // RecordingQuotaChip. Failure stays silent — `account` is null on error and
  // trialChipState renders nothing, which is what a chrome ornament should do.
  const { account } = useAccount();
  const trial: TrialState | null = account?.reverseTrial ?? null;
  const subscriptionStatus: string | null = account?.user?.subscriptionStatus ?? null;

  const state = trialChipState(trial, subscriptionStatus);
  if (!state.show) return null;

  const tone =
    state.tone === 'attention'
      ? 'border-amber-500/40 bg-[var(--status-warning-tint)] text-[var(--status-warning-on-tint)] hover:bg-[var(--status-warning-tint)]'
      : 'border-[var(--border-default)] bg-[var(--surface-secondary)] text-[var(--content-secondary)] hover:bg-[var(--surface-elevated)]';

  return (
    <Link
      href={state.href}
      title={state.detail}
      aria-label={`${state.label}. ${state.detail}`}
      className={`hidden sm:inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium whitespace-nowrap transition-colors ${tone}`}
    >
      {state.label}
    </Link>
  );
}
