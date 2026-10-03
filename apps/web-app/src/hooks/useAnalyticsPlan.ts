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
 * `/api/account` is authoritative. `DashboardV2Shell` may fill the slot from
 * `/api/workflows` stats only while it is still empty (row #351), so the first
 * dashboard_v2_viewed does not race `/api/account`. Both routes derive the
 * plan with `analyticsPlanFor` (admin-unlimited reads 'enterprise'), so the
 * two sources carry the same value and cannot flip it mid-session.
 *
 * ## Lifetime
 *
 * Not cleared on unmount: it must survive an (app) -> (public) client
 * navigation. It is cleared when a different user is detected and on sign-out.
 *
 * ## Staleness
 *
 * The shell does not remount on client navigation, so the plan is fixed for the
 * life of the shell. Stripe checkout returns via a full-page redirect, which
 * remounts the shell and refetches — but if the webhook has not yet landed the
 * plan may still be the old one until the next full load.
 */
/**
 * Which user the published plan belongs to. Kept in memory only, never sent
 * anywhere and never put on the side-channel; resets with the page on a full
 * navigation, exactly like `window.__ledgerium_userPlan`.
 */
let publishedForUserId: string | null = null;

/** Test-only: forget the owner so cases do not leak into each other. */
export function __resetAnalyticsPlanOwnerForTests(): void {
  publishedForUserId = null;
}

export function useAnalyticsPlan(): void {
  const { account } = useAccount();
  const plan = account?.user?.plan;
  const userId = account?.user?.id;

  useEffect(() => {
    if (typeof plan !== 'string' || plan === '') return;
    // The session user changed (not just the plan): drop the previous user's
    // value before publishing, so it can never be attributed to the new one.
    if (publishedForUserId !== null && userId !== undefined && publishedForUserId !== userId) {
      setUserPlanForAnalytics(undefined);
    }
    setUserPlanForAnalytics(plan);
    if (userId !== undefined) publishedForUserId = userId;
    // Deliberately NO cleanup on unmount (row #351). A client navigation from an
    // (app) page to a (public) one, e.g. upload -> /pricing, unmounts AppShell;
    // clearing then made upgrade_clicked / checkout_started on /pricing carry
    // 'unknown'. Sign-out clears explicitly (AppShell) and is a full navigation.
  }, [plan, userId]);
}
