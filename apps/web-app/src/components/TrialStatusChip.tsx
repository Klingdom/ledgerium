'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { trialChipState, type TrialState } from '@/lib/trial-chip';

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
  const [trial, setTrial] = useState<TrialState | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/account')
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (cancelled || !json?.data) return;
        setTrial(json.data.reverseTrial ?? null);
        setSubscriptionStatus(json.data.user?.subscriptionStatus ?? null);
      })
      .catch(() => {
        // Intentionally silent — see doc comment.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const state = trialChipState(trial, subscriptionStatus);
  if (!state.show) return null;

  const tone =
    state.tone === 'attention'
      ? 'border-amber-500/40 bg-amber-500/10 text-amber-500 hover:bg-amber-500/15'
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
