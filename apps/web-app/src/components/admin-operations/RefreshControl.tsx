'use client';

/**
 * RefreshControl — manual refresh button + auto-refresh selector + last-updated timestamp.
 *
 * Auto-refresh intervals: Off | 30s | 60s
 * Persisted in localStorage as `ledgerium_admin_ops_autorefresh`.
 *
 * The entire region uses aria-live="polite" so screen readers announce
 * timestamp changes without interrupting the user.
 *
 * @iter 072
 */

import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { formatRelativeTime } from './format-utils.js';

export type AutoRefreshInterval = 'off' | '30s' | '60s';

const LS_KEY = 'ledgerium_admin_ops_autorefresh';

const INTERVAL_LABELS: Record<AutoRefreshInterval, string> = {
  off: 'Off',
  '30s': '30s',
  '60s': '60s',
};

const INTERVAL_MS: Record<AutoRefreshInterval, number | null> = {
  off: null,
  '30s': 30_000,
  '60s': 60_000,
};

interface RefreshControlProps {
  /** Called when a refresh should be triggered (manual or auto) */
  onRefresh: () => void;
  /** Timestamp of the last successful data fetch */
  lastUpdatedAt: Date | null;
  /** Whether a fetch is currently in flight */
  isRefreshing?: boolean;
  'data-testid'?: string;
}

export function RefreshControl({
  onRefresh,
  lastUpdatedAt,
  isRefreshing = false,
  'data-testid': testId,
}: RefreshControlProps) {
  const [interval, setIntervalValue] = useState<AutoRefreshInterval>('off');

  // Hydrate from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(LS_KEY) as AutoRefreshInterval | null;
    if (stored && stored in INTERVAL_MS) {
      setIntervalValue(stored);
    }
  }, []);

  // Persist interval changes
  function handleIntervalChange(next: AutoRefreshInterval) {
    setIntervalValue(next);
    localStorage.setItem(LS_KEY, next);
  }

  // Auto-refresh timer
  useEffect(() => {
    const ms = INTERVAL_MS[interval];
    if (!ms) return;
    const id = setInterval(() => {
      onRefresh();
    }, ms);
    return () => clearInterval(id);
  }, [interval, onRefresh]);

  return (
    <div
      className="flex flex-wrap items-center gap-3"
      aria-live="polite"
      aria-label="Refresh controls"
      data-testid={testId ?? 'refresh-control'}
    >
      {/* Manual refresh button */}
      <button
        type="button"
        onClick={onRefresh}
        disabled={isRefreshing}
        className="flex items-center gap-1.5 rounded-md bg-[var(--surface-elevated)] px-3 py-1.5 text-[12px] font-medium text-[var(--content-secondary)] transition-colors hover:bg-[var(--surface-secondary)] hover:text-[var(--content-primary)] disabled:cursor-not-allowed disabled:opacity-50"
        aria-label="Refresh dashboard"
      >
        <RefreshCw
          className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`}
          aria-hidden="true"
        />
        Refresh
      </button>

      {/* Auto-refresh selector */}
      <div className="flex items-center gap-1">
        <span className="text-[11px] text-[var(--content-tertiary)]">Auto:</span>
        <div
          className="flex overflow-hidden rounded-md border border-[var(--border-default)]"
          role="group"
          aria-label="Auto-refresh interval"
        >
          {(Object.keys(INTERVAL_LABELS) as AutoRefreshInterval[]).map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => handleIntervalChange(opt)}
              className={`px-2.5 py-1 text-[11px] transition-colors ${
                interval === opt
                  ? 'bg-[var(--accent,#20f2a6)] font-semibold text-black'
                  : 'bg-[var(--surface-elevated)] text-[var(--content-secondary)] hover:bg-[var(--surface-secondary)]'
              }`}
              aria-pressed={interval === opt}
            >
              {INTERVAL_LABELS[opt]}
            </button>
          ))}
        </div>
      </div>

      {/* Last updated timestamp */}
      {lastUpdatedAt && (
        <span className="text-[11px] text-[var(--content-tertiary)]">
          Updated {formatRelativeTime(lastUpdatedAt)}
        </span>
      )}
    </div>
  );
}

/**
 * Exported pure helpers for tests (node environment — no React).
 */

/** Parse a stored auto-refresh value — returns 'off' if invalid. */
export function parseStoredInterval(raw: string | null): AutoRefreshInterval {
  if (raw === '30s' || raw === '60s' || raw === 'off') return raw;
  return 'off';
}

/** Return the millisecond value for an interval, or null for 'off'. */
export function intervalToMs(i: AutoRefreshInterval): number | null {
  return INTERVAL_MS[i];
}
