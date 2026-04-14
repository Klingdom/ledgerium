'use client';

import { Workflow, AlertTriangle, Loader2 } from 'lucide-react';

export function WorkflowEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center px-8" role="status">
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--surface-secondary)] to-[var(--surface-secondary)] border border-[var(--border-default)] flex items-center justify-center mb-4">
        <Workflow className="h-6 w-6 text-[var(--content-tertiary)]" />
      </div>
      <h3 className="text-ds-sm font-semibold text-[var(--content-primary)] mb-1.5">No workflow data available</h3>
      <p className="text-ds-xs text-[var(--content-secondary)] max-w-sm leading-relaxed">
        This workflow doesn&apos;t have process map data yet. Try re-uploading the recording or running analysis.
      </p>
    </div>
  );
}

export function WorkflowErrorState({ message }: { message?: string | undefined }) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center px-8" role="alert">
      <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center mb-4">
        <AlertTriangle className="h-6 w-6 text-red-400" />
      </div>
      <h3 className="text-ds-sm font-semibold text-[var(--content-primary)] mb-1.5">Failed to load workflow</h3>
      <p className="text-ds-xs text-[var(--content-secondary)] max-w-sm leading-relaxed line-clamp-3">
        {message ?? 'An error occurred while processing the workflow data. Please try refreshing the page.'}
      </p>
    </div>
  );
}

export function WorkflowSkeleton() {
  return (
    <div className="flex flex-col h-full min-h-[400px]" role="status" aria-label="Loading workflow visualization">
      {/* Header skeleton */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-[var(--border-subtle)] animate-pulse">
        <div className="h-4 w-16 bg-[var(--surface-secondary)]/70 rounded" />
        <div className="h-4 w-20 bg-[var(--surface-secondary)] rounded" />
        <div className="h-4 w-14 bg-[var(--surface-secondary)] rounded" />
        <div className="h-4 w-24 bg-[var(--surface-secondary)] rounded" />
        <div className="flex-1" />
        <div className="h-5 w-20 bg-[var(--surface-secondary)]/50 rounded-full" />
      </div>

      {/* Toolbar skeleton */}
      <div className="flex items-center gap-2 px-5 py-2 border-b border-[var(--border-subtle)] animate-pulse">
        <div className="flex gap-1">
          <div className="h-7 w-28 bg-[var(--surface-secondary)] rounded-lg" />
          <div className="h-7 w-28 bg-[var(--surface-secondary)] rounded-lg" />
          <div className="h-7 w-28 bg-[var(--surface-secondary)] rounded-lg" />
        </div>
        <div className="flex-1" />
        <div className="flex gap-1">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-7 w-7 bg-[var(--surface-secondary)] rounded-md" />
          ))}
        </div>
      </div>

      {/* Canvas skeleton — shows faint node/edge shapes */}
      <div className="flex-1 relative bg-[var(--surface-secondary)] overflow-hidden">
        {/* Faint placeholder nodes */}
        <div className="absolute inset-0 flex flex-col items-center pt-16 gap-6 animate-pulse">
          <div className="w-36 h-10 bg-emerald-50/60 rounded-full border border-emerald-100" />
          <div className="w-px h-8 bg-[var(--surface-secondary)]" />
          <div className="w-64 h-16 bg-[var(--surface-elevated)] rounded-xl border border-[var(--border-default)] shadow-sm" />
          <div className="w-px h-8 bg-[var(--surface-secondary)]" />
          <div className="w-64 h-16 bg-[var(--surface-elevated)] rounded-xl border border-[var(--border-subtle)]" />
          <div className="w-px h-8 bg-[var(--surface-secondary)]" />
          <div className="w-64 h-16 bg-[var(--surface-elevated)] rounded-xl border border-[var(--border-subtle)]" />
        </div>

        {/* Loading indicator */}
        <div className="absolute inset-0 flex items-end justify-center pb-8">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-[var(--surface-elevated)]/90 backdrop-blur-sm rounded-full border border-[var(--border-default)] shadow-sm">
            <Loader2 className="h-3.5 w-3.5 text-[var(--content-tertiary)] animate-spin" />
            <span className="text-[11px] text-[var(--content-secondary)] font-medium">Loading visualization...</span>
          </div>
        </div>
      </div>
    </div>
  );
}
