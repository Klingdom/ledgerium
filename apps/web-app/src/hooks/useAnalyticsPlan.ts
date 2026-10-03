'use client';

import { useEffect } from 'react';

import { useAccount } from './useAccount';
import { setUserPlanForAnalytics } from '@/lib/analytics';

/**
 * Publish the signed-in user's plan to the analytics side-channel, app-wide
 * (row #94, second half).
 *
 * Mounted once in `AppShell`, so every authenticated page — not only the
 * dashboard — gets `userPlan` on its events.
 *
 * ## No new request
 *
 * This reads `useAccount()`, whose shared cache already collapses
 * `TrialStatusChip` (also in the shell) and `RecordingQuotaChip` into a single
 * `GET /api/account` (row #189). A third consumer joins that in-flight request.
 *
 * ## What it deliberately does not do
 *
 * - It never blocks rendering and never delays `track()`. Until the account
 *   resolves, events carry `userPlan: 'unknown'` (loop 60); nothing is queued.
 * - On failure `account` stays null, nothing is set, and events stay
 *   'unknown'. There is no retry here — a failed fetch is not retried by
 *   `useAccount` either, so no retry storm is possible.
 * - Only the plan string is published. No email, id or name.
 *
 * ## Source of truth
 *
 * `/api/account` is the only writer. `DashboardV2Shell` used to also set the
 * plan from `/api/workflows` stats; the two are the same effective plan except
 * for admin-unlimited accounts (`/api/account` reports 'enterprise'), so
 * leaving both let the later response win and events flip plan mid-session.
 *
 * ## Staleness
 *
 * The shell does not remount on client navigation, so the plan is fixed for the
 * life of the shell. Stripe checkout returns via a full-page redirect, which
 * remounts the shell and refetches — but if the webhook has not yet landed the
 * plan may still be the old one until the next full load.
 */
export function useAnalyticsPlan(): void {
  const { account } = useAccount();
  const plan = account?.user?.plan;

  useEffect(() => {
    if (typeof plan !== 'string' || plan === '') return;
    setUserPlanForAnalytics(plan);
    // Do not leave one user's plan behind when the authenticated shell goes away.
    return () => setUserPlanForAnalytics(undefined);
  }, [plan]);
}
