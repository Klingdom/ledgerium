'use client';

import { ListChecks, AlertTriangle, Loader2 } from 'lucide-react';

export function SOPEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center px-8" role="status">
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--surface-secondary)] to-[var(--surface-secondary)] border border-[var(--border-default)] flex items-center justify-center mb-4">
        <ListChecks className="h-6 w-6 text-[var(--content-tertiary)]" />
      </div>
      <h3 className="text-ds-sm font-semibold text-[var(--content-primary)] mb-1.5">No SOP available</h3>
      <p className="text-ds-xs text-[var(--content-secondary)] max-w-sm leading-relaxed">
        This workflow doesn&apos;t have an SOP yet. Upload a workflow recording to automatically generate a standard operating procedure.
      </p>
    </div>
  );
}

export function SOPErrorState({ message }: { message?: string | undefined }) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center px-8" role="alert">
      <div className="w-14 h-14 rounded-2xl bg-surface-danger border border-border-danger flex items-center justify-center mb-4">
        <AlertTriangle className="h-6 w-6 text-red-400" /> {/* lint-color-tokens: ok — icon brand */}
      </div>
      <h3 className="text-ds-sm font-semibold text-[var(--content-primary)] mb-1.5">Failed to load SOP</h3>
      <p className="text-ds-xs text-[var(--content-secondary)] max-w-sm leading-relaxed line-clamp-3">
        {message ?? 'An error occurred while processing the SOP data. Please try refreshing the page.'}
      </p>
    </div>
  );
}

export function SOPSkeleton() {
  return (
    <div className="flex flex-col h-full min-h-[400px]" role="status" aria-label="Loading SOP">
      {/* Header skeleton */}
      <div className="px-5 py-3 border-b border-[var(--border-subtle)] animate-pulse">
        <div className="flex items-center gap-2 mb-2">
          <div className="h-4 w-10 bg-brand-50 rounded" />
          <div className="h-3 w-12 bg-[var(--surface-secondary)] rounded" />
        </div>
        <div className="h-3 w-64 bg-[var(--surface-secondary)] rounded mb-2" />
        <div className="flex gap-3">
          <div className="h-4 w-16 bg-[var(--surface-secondary)] rounded" />
          <div className="h-4 w-20 bg-[var(--surface-secondary)] rounded" />
          <div className="h-4 w-14 bg-[var(--surface-secondary)] rounded" />
        </div>
      </div>

      {/* Mode switcher skeleton */}
      <div className="px-5 py-2 border-b border-[var(--border-subtle)] animate-pulse">
        <div className="flex gap-1">
          <div className="h-7 w-28 bg-[var(--surface-secondary)] rounded-lg" />
          <div className="h-7 w-28 bg-[var(--surface-secondary)] rounded-lg" />
          <div className="h-7 w-24 bg-[var(--surface-secondary)] rounded-lg" />
        </div>
      </div>

      {/* Content skeleton — step cards */}
      <div className="flex-1 p-5 space-y-3 animate-pulse overflow-hidden">
        {/* Quick start placeholder */}
        <div className="h-20 bg-surface-success rounded-xl border border-border-success" />

        {/* Step card placeholders */}
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="flex gap-3">
            <div className="w-7 h-7 rounded-lg bg-[var(--surface-secondary)] flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-4 bg-[var(--surface-secondary)] rounded w-3/4" />
              <div className="h-3 bg-[var(--surface-secondary)] rounded w-1/2" />
            </div>
            <div className="h-4 w-12 bg-[var(--surface-secondary)] rounded flex-shrink-0" />
          </div>
        ))}

        {/* Loading pill */}
        <div className="flex justify-center pt-4">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-[var(--surface-elevated)]/90 rounded-full border border-[var(--border-default)] shadow-sm">
            <Loader2 className="h-3.5 w-3.5 text-[var(--content-tertiary)] animate-spin" />
            <span className="text-[11px] text-[var(--content-secondary)] font-medium">Loading procedure...</span>
          </div>
        </div>
      </div>
    </div>
  );
}
