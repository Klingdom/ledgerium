'use client';

// ─── Types ─────────────────────────────────────────────────────────────────

export interface RecordingLimitBadgeProps {
  used: number;
  max: number | 'unlimited';
}

// ─── Helpers ───────────────────────────────────────────────────────────────

/**
 * Compute usage ratio as a value 0–1.
 * Returns 0 for unlimited plans so the bar renders as empty (full access).
 */
function usageRatio(used: number, max: number | 'unlimited'): number {
  if (max === 'unlimited') return 0;
  if (max === 0) return 1;
  return Math.min(used / max, 1);
}

interface ColorTokens {
  text: string;
  bar: string;
  track: string;
}

function resolveColors(ratio: number): ColorTokens {
  if (ratio >= 1) {
    return { text: 'text-red-600', bar: 'bg-red-500', track: 'bg-red-100' };
  }
  if (ratio >= 0.8) {
    return { text: 'text-amber-600', bar: 'bg-amber-500', track: 'bg-amber-100' };
  }
  return { text: 'text-[var(--content-primary)]', bar: 'bg-brand-500', track: 'bg-[var(--surface-secondary)]' };
}

// ─── Component ─────────────────────────────────────────────────────────────

/**
 * RecordingLimitBadge — shows recording usage with a compact progress bar.
 *
 * Color thresholds:
 *   < 80%  → default gray/brand
 *   ≥ 80%  → amber warning
 *   ≥ 100% → red at-limit
 *
 * Unlimited plans show "Unlimited" with no bar.
 */
export function RecordingLimitBadge({ used, max }: RecordingLimitBadgeProps): JSX.Element {
  const isUnlimited = max === 'unlimited';
  const ratio = usageRatio(used, max);
  const { text, bar, track } = resolveColors(ratio);
  const pct = Math.round(ratio * 100);

  if (isUnlimited) {
    return (
      <div className="flex items-center gap-1.5" aria-label="Unlimited recordings">
        <span className="text-ds-xs font-medium text-[var(--content-secondary)]">Recordings</span>
        <span className="text-ds-xs font-semibold text-emerald-600">Unlimited</span>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col gap-1"
      role="meter"
      aria-valuenow={used}
      aria-valuemin={0}
      aria-valuemax={max as number}
      aria-label={`${used} of ${max} recordings used`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-ds-xs font-medium text-[var(--content-secondary)]">Recordings</span>
        <span className={`text-ds-xs font-semibold tabular-nums ${text}`}>
          {used} / {max}
        </span>
      </div>

      {/* Progress bar */}
      <div className={`h-1.5 w-full rounded-full ${track} overflow-hidden`}>
        <div
          className={`h-full rounded-full transition-all duration-300 ease-out ${bar}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
