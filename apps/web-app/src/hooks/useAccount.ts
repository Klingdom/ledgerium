'use client';

import { useState, useEffect, useCallback } from 'react';

import { SharedRequestCache } from './accountCache';

// ─── Types ─────────────────────────────────────────────────────────────────

export interface AccountUser {
  id: string;
  email: string;
  name: string | null;
  plan: string;
  subscriptionStatus: string;
  createdAt: string;
  hasStripeCustomer: boolean;
  /** Non-null IFF Stripe has an open invoice needing SCA. See api/account/route.ts. */
  pendingInvoiceUrl: string | null;
}

export interface AccountLimits {
  recordings: { used: number; max: number | 'unlimited' };
  seats: { max: number | 'unlimited' };
  recorders: { max: number | 'unlimited' };
}

/**
 * Reverse-trial slice (TRIAL_REVIEW_001).
 *
 * `daysRemaining` is `number`, not `number | null`: `reverseTrialDaysRemaining`
 * returns 0 for an inactive trial rather than null (`lib/reverse-trial.ts:120`).
 * It is computed server-side from the same clock as `isActive`, so a countdown
 * cannot contradict the access the user actually has.
 *
 * This is deliberately kept structurally compatible with `TrialState` in
 * `lib/trial-chip.ts`, which is the consumer. The two were free to disagree
 * while the chip parsed an untyped response; typing it surfaced that they did.
 */
export interface AccountReverseTrial {
  isActive: boolean;
  hasLapsed: boolean;
  daysRemaining: number;
  plan: string | null;
  endsAt: string | null;
}

export interface AccountData {
  user: AccountUser;
  features: Record<string, boolean>;
  limits: AccountLimits;
  reverseTrial: AccountReverseTrial;
}

export interface UseAccountReturn {
  account: AccountData | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

// ─── Shared cache ──────────────────────────────────────────────────────────

/**
 * One cache for the whole app. The behaviour — in-flight dedup, TTL, failure
 * handling — lives in `accountCache.ts` and is tested there directly, because
 * this package has no React renderer and a logic mirror in a test helper is
 * worse than no test at all.
 */
const accountCache = new SharedRequestCache<AccountData>();

/**
 * Drop the shared cache.
 *
 * Exported for tests: module-level state survives between cases in a file, so
 * without this the second test in a suite would assert against the first one's
 * cached response and pass for the wrong reason.
 */
export function __resetAccountCacheForTests(): void {
  accountCache.clear();
}

async function fetchAccount(): Promise<AccountData> {
  const res = await fetch('/api/account');
  if (!res.ok) {
    throw new Error(`Failed to load account (${res.status})`);
  }
  const json = await res.json();
  // API returns { data: { user, features, limits, reverseTrial } }
  const data = json?.data as AccountData | undefined;
  if (!data) {
    throw new Error('Unexpected response shape from /api/account');
  }
  return data;
}

// ─── Hook ──────────────────────────────────────────────────────────────────

/**
 * useAccount — the single client-side reader of `GET /api/account`.
 *
 * Concurrent mounts share one request, and the response is reused for a short
 * window afterwards; see `accountCache.ts` for what each of those is for and
 * what neither of them fixes.
 *
 * Call `refetch()` to bust the cache immediately — after a plan change, say,
 * where waiting out the TTL would show the user their old plan.
 */
export function useAccount(): UseAccountReturn {
  const cached = accountCache.peek();
  const [account, setAccount] = useState<AccountData | null>(cached);
  const [loading, setLoading] = useState<boolean>(cached === null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback((bust = false) => {
    if (bust) accountCache.clear();

    const fresh = accountCache.peek();
    if (fresh !== null) {
      setAccount(fresh);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    accountCache
      .get(fetchAccount)
      .then((data) => {
        setAccount(data);
        setLoading(false);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    load(false);
  }, [load]);

  const refetch = useCallback(() => {
    load(true);
  }, [load]);

  return { account, loading, error, refetch };
}
