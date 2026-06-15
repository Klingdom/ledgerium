'use client';

/**
 * lens — active dashboard-lens preference (persona-driven LENS switcher, v1).
 *
 * The active lens is client-only UI state (switching never refetches). It is
 * persisted in localStorage using the EXACT SSR-safe pattern proven by
 * `density.ts`: the localStorage read is deferred to a post-mount effect, so
 * `useLens()` returns the stable `DEFAULT_LENS` ('library') on the server and on
 * the very first client paint, then reconciles to the stored value after mount.
 * This guarantees the server-rendered HTML and the first client render are
 * byte-identical — NO hydration mismatch / flash. There is NO Date.now()/
 * Math.random() anywhere in this module.
 *
 * v1 deliberately does NOT persist the lens to the DB (no Prisma migration this
 * pass; deferred to v2 per the persona review's persistence section).
 *
 * @see ./density.ts — the SSR-safe localStorage hook this mirrors
 * @see ../../lib/dashboard-lenses/lenses.ts — Lens type, DEFAULT_LENS, parseLens
 * @see docs/features/dashboard-personas/DASHBOARD_PERSONAS_REVIEW_001.md
 */

import { useCallback, useEffect, useState } from 'react';
import { DEFAULT_LENS, parseLens, type Lens } from '@/lib/dashboard-lenses/lenses.js';

/** localStorage key for the persisted active-lens preference. */
export const LENS_STORAGE_KEY = 'ledgerium.dashboard.activeLens';

/**
 * SSR-safe active-lens state hook.
 *
 * - First render (server + initial client paint): returns `DEFAULT_LENS`.
 * - After mount: reads localStorage once and reconciles to the stored value if
 *   present and valid (via `parseLens`).
 * - `setLens` updates state and writes through to localStorage (guarded for
 *   environments without `window`). Switching is purely client-side — no fetch.
 */
export function useLens(): [Lens, (next: Lens) => void] {
  const [lens, setLensState] = useState<Lens>(DEFAULT_LENS);

  // Post-mount read — never runs on the server, so the first paint is stable.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = parseLens(window.localStorage.getItem(LENS_STORAGE_KEY));
      if (stored !== null) setLensState(stored);
    } catch {
      // localStorage may be unavailable (privacy mode / quota) — keep default.
    }
  }, []);

  const setLens = useCallback((next: Lens) => {
    setLensState(next);
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(LENS_STORAGE_KEY, next);
    } catch {
      // Non-fatal: the lens still applies for this session via React state.
    }
  }, []);

  return [lens, setLens];
}
