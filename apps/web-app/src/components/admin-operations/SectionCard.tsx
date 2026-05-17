'use client';

/**
 * SectionCard — collapsible section wrapper for Admin Operations Dashboard.
 *
 * Each of the 5 dashboard sections (User Volume, Recording Volume,
 * Workflow Processing, System Health, Memory) renders inside a SectionCard.
 * The card handles its own loading / error / empty delegates.
 *
 * @iter 072
 */

import { LoadingSkeleton } from './LoadingSkeleton.js';
import { EmptyState } from './EmptyState.js';

interface SectionCardProps {
  /** Section heading, e.g. "User Volume" */
  title: string;
  /** Section body content */
  children: React.ReactNode;
  /** Show skeleton overlay instead of children */
  isLoading?: boolean;
  /** Variant passed to LoadingSkeleton when isLoading is true */
  loadingVariant?: 'tile' | 'chart' | 'list' | 'gauge';
  /** Number of skeleton rows when loadingVariant is 'list' */
  loadingRows?: number;
  /** Show empty-state placeholder instead of children */
  isEmpty?: boolean;
  /** Empty-state label */
  emptyLabel?: string;
  /** Empty-state hint */
  emptyHint?: string;
  /** Error message — renders a muted error notice instead of children */
  error?: string | null;
  /** Optional test id */
  'data-testid'?: string;
}

export function SectionCard({
  title,
  children,
  isLoading = false,
  loadingVariant = 'list',
  loadingRows = 5,
  isEmpty = false,
  emptyLabel = 'No data available.',
  emptyHint,
  error = null,
  'data-testid': testId,
}: SectionCardProps) {
  return (
    <section
      className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-secondary)] p-5"
      data-testid={testId ?? 'section-card'}
      aria-label={title}
    >
      <h2 className="mb-4 text-[13px] font-semibold uppercase tracking-wide text-[var(--content-tertiary)]">
        {title}
      </h2>

      {isLoading ? (
        <LoadingSkeleton variant={loadingVariant} rows={loadingRows} />
      ) : error ? (
        <p
          className="py-4 text-center text-[13px] text-[var(--content-tertiary)]"
          role="alert"
        >
          {error}
        </p>
      ) : isEmpty ? (
        <EmptyState label={emptyLabel} {...(emptyHint !== undefined ? { hint: emptyHint } : {})} />
      ) : (
        children
      )}
    </section>
  );
}
