'use client';

import Link from 'next/link';
import { quotaMeterState } from '@/lib/quota-meter';

interface UsageQuotaMeterProps {
  used: number;
  limit: number; // Number.MAX_SAFE_INTEGER means unlimited
  plan: string;
}

/**
 * Full-size recording meter (legacy v1 dashboard). Thresholds and copy come
 * from lib/quota-meter.ts — the same source the live dashboard chip uses — so
 * the two surfaces cannot drift apart. Previously this component carried its
 * own copy ("Upgrade to Team for unlimited"), which named a plan that cannot
 * be bought self-serve.
 */
export default function UsageQuotaMeter({ used, limit, plan }: UsageQuotaMeterProps) {
  const state = quotaMeterState(used, limit);

  if (!state.show) {
    return (
      <div className="flex flex-col gap-0.5">
        <p className="text-ds-xs text-[var(--content-secondary)]">Unlimited recordings</p>
        <span className="inline-flex items-center rounded-full bg-[var(--surface-secondary)] px-2 py-0.5 text-[10px] font-medium text-[var(--content-tertiary)] capitalize w-fit">
          {plan}
        </span>
      </div>
    );
  }

  const countColorClass =
    state.tone === 'limit'
      ? 'text-red-500'
      : state.tone === 'attention'
        ? 'text-amber-500'
        : 'text-[var(--content-primary)]';

  const barColorClass =
    state.tone === 'limit' ? 'bg-red-500' : state.tone === 'attention' ? 'bg-amber-500' : 'bg-brand-500';

  return (
    <div className="flex flex-col gap-1 min-w-[140px]" title={state.detail}>
      <div className="flex items-center justify-between gap-2">
        <span className={`text-ds-xs font-medium tabular-nums ${countColorClass}`}>
          {state.label} this month
        </span>
        {state.cta && (
          <Link
            href={state.href}
            aria-label="Upgrade plan to increase recording limit"
            className={`text-[10px] font-medium underline underline-offset-2 whitespace-nowrap ${countColorClass}`}
          >
            {state.cta}
          </Link>
        )}
      </div>
      <div className="h-1.5 w-full rounded-full bg-[var(--surface-secondary)] overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${barColorClass}`}
          style={{ width: `${state.pct}%` }}
        />
      </div>
      <span className="inline-flex items-center rounded-full bg-[var(--surface-secondary)] px-2 py-0.5 text-[10px] font-medium text-[var(--content-tertiary)] capitalize w-fit">
        {plan}
      </span>
    </div>
  );
}
