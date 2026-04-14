'use client';

import { useState, useEffect, useCallback } from 'react';

// ─── Types ─────────────────────────────────────────────────────────────────

export interface AccountUser {
  id: string;
  email: string;
  name: string | null;
  plan: string;
  subscriptionStatus: string;
}

export interface AccountLimits {
  recordings: { used: number; max: number | 'unlimited' };
  seats: { max: number | 'unlimited' };
  recorders: { max: number | 'unlimited' };
}

export interface AccountData {
  user: AccountUser;
  features: Record<string, boolean>;
  limits: AccountLimits;
}

export interface UseAccountReturn {
  account: AccountData | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

// ─── Module-level cache ────────────────────────────────────────────────────
// All hook instances share the same request and cached result so that
// mounting multiple gated components on one page issues only one fetch.

let cache: AccountData | null = null;
let fetchPromise: Promise<AccountData> | null = null;

async function fetchAccount(): Promise<AccountData> {
  const res = await fetch('/api/account');
  if (!res.ok) {
    throw new Error(`Failed to load account (${res.status})`);
  }
  const json = await res.json();
  // API returns { data: { user, features, limits } }
  const data = json?.data as AccountData | undefined;
  if (!data) {
    throw new Error('Unexpected response shape from /api/account');
  }
  return data;
}

// ─── Hook ──────────────────────────────────────────────────────────────────

/**
 * useAccount — fetches and caches the authenticated user's account data.
 *
 * Module-level cache ensures a single in-flight request regardless of how
 * many components call this hook on the same page render.
 *
 * Call `refetch()` to bust the cache and re-fetch (e.g. after a plan change).
 */
export function useAccount(): UseAccountReturn {
  const [account, setAccount] = useState<AccountData | null>(cache);
  const [loading, setLoading] = useState<boolean>(cache === null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback((bust = false) => {
    if (bust) {
      cache = null;
      fetchPromise = null;
    }

    // If we already have a cached value, use it immediately.
    if (cache !== null) {
      setAccount(cache);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    // Deduplicate concurrent fetches.
    if (!fetchPromise) {
      fetchPromise = fetchAccount().then((data) => {
        cache = data;
        return data;
      });
    }

    fetchPromise
      .then((data) => {
        setAccount(data);
        setLoading(false);
      })
      .catch((err: unknown) => {
        fetchPromise = null; // allow retry on next mount
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
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
