'use client';

/**
 * density — row-density preference for the workflow list (Batch C item 16).
 *
 * Three densities control the vertical padding of table cells:
 *   compact  → py-ds-2 (8px)
 *   regular  → py-ds-3 (12px)  ← default (matches the pre-Batch-C row padding)
 *   relaxed  → py-ds-4 (16px)
 *
 * HYDRATION SAFETY (hard constraint): the localStorage read is deferred to a
 * post-mount effect. `useDensity()` returns the stable `'regular'` default on the
 * server and on the very first client paint, then reconciles to the stored value
 * after mount. This guarantees the server-rendered HTML and the first client
 * render are byte-identical — no hydration mismatch / flash. There is NO
 * Date.now()/Math.random() anywhere in this module.
 *
 * @batch C (2026-06-12)
 */

import { useCallback, useEffect, useState } from 'react';

export type RowDensity = 'compact' | 'regular' | 'relaxed';

/** Ordered list for the toolbar control. */
export const DENSITY_OPTIONS: readonly { value: RowDensity; label: string }[] = [
  { value: 'compact', label: 'Compact' },
  { value: 'regular', label: 'Regular' },
  { value: 'relaxed', label: 'Relaxed' },
];

/** Stable default — rendered on the server and the first client paint. */
export const DEFAULT_DENSITY: RowDensity = 'regular';

/** localStorage key for the persisted density preference. */
export const DENSITY_STORAGE_KEY = 'ledgerium.dashboard.rowDensity';

/**
 * Map a density to the vertical-padding Tailwind class applied to table cells.
 * Pure + deterministic; unknown values fall back to the regular padding.
 */
export function densityRowPaddingClass(density: RowDensity): string {
  switch (density) {
    case 'compact':
      return 'py-ds-2';
    case 'relaxed':
      return 'py-ds-4';
    case 'regular':
    default:
      return 'py-ds-3';
  }
}

/**
 * Validate an arbitrary stored string as a `RowDensity`. Returns `null` for any
 * value that is not one of the three known densities (defensive against a
 * corrupted / forward-incompatible localStorage entry).
 */
export function parseDensity(raw: string | null | undefined): RowDensity | null {
  if (raw === 'compact' || raw === 'regular' || raw === 'relaxed') return raw;
  return null;
}

/**
 * SSR-safe density state hook.
 *
 * - First render (server + initial client paint): returns `DEFAULT_DENSITY`.
 * - After mount: reads localStorage once and reconciles to the stored value if
 *   present and valid.
 * - `setDensity` updates state and writes through to localStorage (guarded for
 *   environments without `window`).
 */
export function useDensity(): [RowDensity, (next: RowDensity) => void] {
  const [density, setDensityState] = useState<RowDensity>(DEFAULT_DENSITY);

  // Post-mount read — never runs on the server, so the first paint is stable.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = parseDensity(window.localStorage.getItem(DENSITY_STORAGE_KEY));
      if (stored !== null) setDensityState(stored);
    } catch {
      // localStorage may be unavailable (privacy mode / quota) — keep default.
    }
  }, []);

  const setDensity = useCallback((next: RowDensity) => {
    setDensityState(next);
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(DENSITY_STORAGE_KEY, next);
    } catch {
      // Non-fatal: density still applies for this session via React state.
    }
  }, []);

  return [density, setDensity];
}
