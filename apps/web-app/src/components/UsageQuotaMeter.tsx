'use client';

import Link from 'next/link';

interface UsageQuotaMeterProps {
  used: number;
  limit: number; // Number.MAX_SAFE_INTEGER means unlimited
  plan: string;
}

export default function UsageQuotaMeter({ used, limit, plan }: UsageQuotaMeterProps) {
  const isUnlimited = limit >= Number.MAX_SAFE_INTEGER;

  if (isUnlimited) {
    return (
      <div className="flex flex-col gap-0.5">
        <p className="text-ds-xs text-[var(--content-secondary)]">Unlimited recordings</p>
        <span className="inline-flex items-center rounded-full bg-[var(--surface-secondary)] px-2 py-0.5 text-[10px] font-medium text-[var(--content-tertiary)] capitalize w-fit">
          {plan}
        </span>
      </div>
    );
  }

  const pct = Math.min((used / limit) * 100, 100);
  const isAtLimit = pct >= 100;
  const isWarning = pct >= 80 && !isAtLimit;

  const countColorClass = isAtLimit
    ? 'text-red-500'
    : isWarning
      ? 'text-amber-500'
      : 'text-[var(--content-primary)]';

  const barColorClass = isAtLimit
    ? 'bg-red-500'
    : isWarning
      ? 'bg-amber-500'
      : 'bg-brand-500';

  return (
    <div className="flex flex-col gap-1 min-w-[140px]">
      <div className="flex items-center justify-between gap-2">
        <span className={`text-ds-xs font-medium tabular-nums ${countColorClass}`}>
          {used} / {limit} recordings this month
        </span>
        {isWarning && (
          <Link
            href="/pricing"
            aria-label="Upgrade plan to increase recording limit"
            className="text-[10px] font-medium text-amber-500 hover:text-amber-600 underline underline-offset-2 whitespace-nowrap"
          >
            Upgrade to Team for unlimited
          </Link>
        )}
        {isAtLimit && (
          <Link
            href="/pricing"
            aria-label="Upgrade plan to increase recording limit"
            className="text-[10px] font-medium text-red-500 hover:text-red-600 underline underline-offset-2 whitespace-nowrap"
          >
            Upgrade for more
          </Link>
        )}
      </div>
      <div className="h-1.5 w-full rounded-full bg-[var(--surface-secondary)] overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${barColorClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="inline-flex items-center rounded-full bg-[var(--surface-secondary)] px-2 py-0.5 text-[10px] font-medium text-[var(--content-tertiary)] capitalize w-fit">
        {plan}
      </span>
    </div>
  );
}
