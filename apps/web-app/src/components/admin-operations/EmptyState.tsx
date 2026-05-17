'use client';

/**
 * EmptyState — zero-data placeholder for admin operations sections.
 *
 * Renders a matter-of-fact message when a section has no data to show.
 * Per UX §11 copy rules: no marketing language, no exclamation points.
 *
 * @iter 072
 */

interface EmptyStateProps {
  /** Primary label, e.g. "No recordings yet." */
  label: string;
  /** Optional hint text displayed below the label */
  hint?: string;
  /** Optional test id for targeting in tests */
  'data-testid'?: string;
}

export function EmptyState({ label, hint, 'data-testid': testId }: EmptyStateProps) {
  return (
    <div
      className="flex flex-col items-center justify-center py-8 text-center"
      data-testid={testId ?? 'empty-state'}
      role="status"
      aria-label={label}
    >
      <p className="text-[13px] text-[var(--content-secondary)]">{label}</p>
      {hint && (
        <p className="mt-1 text-[12px] text-[var(--content-tertiary)]">{hint}</p>
      )}
    </div>
  );
}
