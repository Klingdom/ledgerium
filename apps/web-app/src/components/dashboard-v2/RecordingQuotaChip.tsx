'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { quotaMeterState, type RecordingMax } from '@/lib/quota-meter';
import { track } from '@/lib/analytics.js';

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
  const [used, setUsed] = useState<number | null>(null);
  const [max, setMax] = useState<RecordingMax | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/account')
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        const rec = json?.data?.limits?.recordings;
        if (cancelled || !rec) return;
        setUsed(rec.used ?? null);
        setMax(rec.max ?? null);
      })
      .catch(() => {
        // Intentionally silent — see doc comment.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const state = quotaMeterState(used, max);
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
          onClick={() => track({ event: 'upgrade_clicked', location: 'dashboard_v2_quota_chip' })}
          className={`text-[11px] font-medium underline underline-offset-2 whitespace-nowrap ${countClass}`}
        >
          {state.cta}
        </Link>
      )}
    </div>
  );
}
