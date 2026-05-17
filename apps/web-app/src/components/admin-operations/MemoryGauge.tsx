'use client';

/**
 * MemoryGauge — Node.js heap usage bar for Admin Operations Dashboard.
 *
 * Displays a segmented progress bar representing heap used / heap total,
 * with color thresholds:
 *   ≤ 60%: accent green (--accent)
 *   61–80%: amber
 *   > 80%: red (danger)
 *
 * @iter 072
 */

import { formatBytes, formatPercent } from './format-utils.js';

interface MemoryGaugeProps {
  /** Heap used in bytes */
  heapUsedBytes: number;
  /** Heap total in bytes */
  heapTotalBytes: number;
  /** RSS in bytes (shown as secondary metric) */
  rssBytes: number;
  /** Pre-computed percentage 0–100 from the API */
  heapUsedPercent: number;
  'data-testid'?: string;
}

/** Return a Tailwind bg class based on percentage. */
function barColor(pct: number): string {
  if (pct > 80) return 'bg-red-500';
  if (pct > 60) return 'bg-amber-500';
  return 'bg-[var(--accent,#20f2a6)]';
}

export function MemoryGauge({
  heapUsedBytes,
  heapTotalBytes,
  rssBytes,
  heapUsedPercent,
  'data-testid': testId,
}: MemoryGaugeProps) {
  const clampedPct = Math.min(100, Math.max(0, heapUsedPercent));
  const colorClass = barColor(clampedPct);

  return (
    <div className="flex flex-col gap-3" data-testid={testId ?? 'memory-gauge'}>
      {/* Bar */}
      <div>
        <div className="mb-1 flex items-baseline justify-between text-[12px]">
          <span className="text-[var(--content-secondary)]">
            {formatBytes(heapUsedBytes)} used
          </span>
          <span className="tabular-nums text-[var(--content-primary)]">
            {formatPercent(clampedPct, { fractionDigits: 0 })}
          </span>
        </div>
        <div
          className="h-2.5 w-full overflow-hidden rounded-full bg-[var(--surface-elevated)]"
          role="progressbar"
          aria-valuenow={clampedPct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Heap used: ${formatPercent(clampedPct, { fractionDigits: 0 })}`}
        >
          <div
            className={`h-full rounded-full transition-all duration-300 ${colorClass}`}
            style={{ width: `${clampedPct}%` }}
          />
        </div>
        <p className="mt-1 text-[11px] text-[var(--content-tertiary)]">
          {formatBytes(heapTotalBytes)} total
        </p>
      </div>

      {/* Secondary metrics */}
      <dl className="grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-[var(--surface-primary)] px-3 py-2">
          <dt className="text-[11px] text-[var(--content-tertiary)]">RSS</dt>
          <dd className="mt-0.5 text-[13px] tabular-nums text-[var(--content-primary)]">
            {formatBytes(rssBytes)}
          </dd>
        </div>
        <div className="rounded-lg bg-[var(--surface-primary)] px-3 py-2">
          <dt className="text-[11px] text-[var(--content-tertiary)]">Heap Total</dt>
          <dd className="mt-0.5 text-[13px] tabular-nums text-[var(--content-primary)]">
            {formatBytes(heapTotalBytes)}
          </dd>
        </div>
      </dl>
    </div>
  );
}

/** Exported for tests — pure derivation of bar color from percent. */
export { barColor as deriveMemoryBarColor };
