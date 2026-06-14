'use client';

import { formatDuration } from '@/lib/format';

export interface BottleneckRowProps {
  position: number;
  title: string;
  system?: string | undefined;
  durationMs: number;
  averageDurationMs: number;
  category?: string | undefined;
  /** Runs that contributed to this step's mean (run-count context). */
  runCount?: number | undefined;
  /** Total runs in the cohort, for "appears in X of N runs". */
  totalRunCount?: number | undefined;
  /** Which engine criterion fired — surfaces "Slow" / "Variable" / "Both". */
  isHighDuration?: boolean | undefined;
  isHighVariance?: boolean | undefined;
}

/**
 * BottleneckRow — single row in the bottleneck list.
 *
 * Shows ordinal badge, step title, system name, mini duration bar (100px),
 * duration label, and a delta ratio compared to average. When provided, also
 * shows run-count context and the criterion flag (Slow / Variable / Both) so a
 * consistently-slow step reads differently from an unpredictable one.
 */
export function BottleneckRow({
  position,
  title,
  system,
  durationMs,
  averageDurationMs,
  category,
  runCount,
  totalRunCount,
  isHighDuration,
  isHighVariance,
}: BottleneckRowProps) {
  const ratio = averageDurationMs > 0 ? durationMs / averageDurationMs : 1;
  // Bar fill width: cap at 100% visually but use ratio to scale
  const barFill = Math.min((durationMs / Math.max(durationMs, averageDurationMs * 3)) * 100, 100);
  const avgBarFill = Math.min(
    (averageDurationMs / Math.max(durationMs, averageDurationMs * 3)) * 100,
    100,
  );

  // Criterion flag (ANALYTICS P0-2): a slow-but-consistent step is a different
  // problem from an unpredictable one. Show which engine criterion fired.
  const flagLabel =
    isHighDuration && isHighVariance
      ? 'Both'
      : isHighDuration
      ? 'Slow'
      : isHighVariance
      ? 'Variable'
      : null;
  const flagClass =
    flagLabel === 'Both'
      ? 'bg-red-50 text-red-700'
      : flagLabel === 'Slow'
      ? 'bg-amber-50 text-amber-700'
      : 'bg-blue-50 text-blue-700';

  return (
    <div className="flex items-center gap-4 px-4 py-3 hover:bg-[var(--surface-secondary)] transition-colors">
      {/* Ordinal badge */}
      <div className="flex-shrink-0 flex items-center justify-center h-7 w-7 rounded-full bg-red-50 border border-red-200 text-[11px] font-bold text-red-700 tabular-nums">
        {position}
      </div>

      {/* Title + system */}
      <div className="flex-1 min-w-0">
        <p className="text-ds-sm font-medium text-[var(--content-primary)] truncate">{title}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {system && (
            <span className="text-[10px] text-[var(--content-tertiary)]">{system}</span>
          )}
          {category && (
            <span className="ds-tag ds-tag-neutral text-[10px]">
              {category.replace(/_/g, ' ')}
            </span>
          )}
          {flagLabel && (
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${flagClass}`}>
              {flagLabel}
            </span>
          )}
          {runCount != null && (
            <span className="text-[10px] text-[var(--content-tertiary)]">
              {totalRunCount != null
                ? `appears in ${runCount} of ${totalRunCount} runs`
                : `${runCount} run${runCount !== 1 ? 's' : ''}`}
            </span>
          )}
        </div>
      </div>

      {/* Mini bar chart — 100px fixed */}
      <div className="flex-shrink-0 w-24 space-y-1" aria-hidden>
        {/* This step */}
        <div className="h-2 w-full rounded-full bg-[var(--surface-secondary)] overflow-hidden">
          <div
            className="h-full rounded-full bg-red-400"
            style={{ width: `${barFill}%` }}
          />
        </div>
        {/* Average reference */}
        <div className="h-1.5 w-full rounded-full bg-[var(--surface-secondary)] overflow-hidden">
          <div
            className="h-full rounded-full bg-[var(--content-tertiary)]"
            style={{ width: `${avgBarFill}%` }}
          />
        </div>
      </div>

      {/* Duration + delta */}
      <div className="flex-shrink-0 text-right min-w-[80px]">
        <p className="text-ds-sm font-semibold text-red-700 tabular-nums">
          {formatDuration(durationMs)}
        </p>
        <p className="text-[10px] text-[var(--content-tertiary)] tabular-nums">
          {ratio.toFixed(1)}x avg
        </p>
      </div>
    </div>
  );
}
