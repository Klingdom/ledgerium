'use client';

import { ListChecks, AlertTriangle, Loader2 } from 'lucide-react';

export function SOPEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center px-8" role="status">
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 flex items-center justify-center mb-4">
        <ListChecks className="h-6 w-6 text-gray-300" />
      </div>
      <h3 className="text-ds-sm font-semibold text-gray-800 mb-1.5">No SOP available</h3>
      <p className="text-ds-xs text-gray-500 max-w-sm leading-relaxed">
        This workflow doesn&apos;t have an SOP yet. Upload a workflow recording to automatically generate a standard operating procedure.
      </p>
    </div>
  );
}

export function SOPErrorState({ message }: { message?: string | undefined }) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center px-8" role="alert">
      <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center mb-4">
        <AlertTriangle className="h-6 w-6 text-red-400" />
      </div>
      <h3 className="text-ds-sm font-semibold text-gray-800 mb-1.5">Failed to load SOP</h3>
      <p className="text-ds-xs text-gray-500 max-w-sm leading-relaxed line-clamp-3">
        {message ?? 'An error occurred while processing the SOP data. Please try refreshing the page.'}
      </p>
    </div>
  );
}

export function SOPSkeleton() {
  return (
    <div className="flex flex-col h-full min-h-[400px]" role="status" aria-label="Loading SOP">
      {/* Header skeleton */}
      <div className="px-5 py-3 border-b border-gray-100 animate-pulse">
        <div className="flex items-center gap-2 mb-2">
          <div className="h-4 w-10 bg-brand-50 rounded" />
          <div className="h-3 w-12 bg-gray-100 rounded" />
        </div>
        <div className="h-3 w-64 bg-gray-100 rounded mb-2" />
        <div className="flex gap-3">
          <div className="h-4 w-16 bg-gray-100 rounded" />
          <div className="h-4 w-20 bg-gray-100 rounded" />
          <div className="h-4 w-14 bg-gray-100 rounded" />
        </div>
      </div>

      {/* Mode switcher skeleton */}
      <div className="px-5 py-2 border-b border-gray-50 animate-pulse">
        <div className="flex gap-1">
          <div className="h-7 w-28 bg-gray-100 rounded-lg" />
          <div className="h-7 w-28 bg-gray-50 rounded-lg" />
          <div className="h-7 w-24 bg-gray-50 rounded-lg" />
        </div>
      </div>

      {/* Content skeleton — step cards */}
      <div className="flex-1 p-5 space-y-3 animate-pulse overflow-hidden">
        {/* Quick start placeholder */}
        <div className="h-20 bg-emerald-50/50 rounded-xl border border-emerald-100" />

        {/* Step card placeholders */}
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="flex gap-3">
            <div className="w-7 h-7 rounded-lg bg-gray-100 flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-4 bg-gray-100 rounded w-3/4" />
              <div className="h-3 bg-gray-50 rounded w-1/2" />
            </div>
            <div className="h-4 w-12 bg-gray-50 rounded flex-shrink-0" />
          </div>
        ))}

        {/* Loading pill */}
        <div className="flex justify-center pt-4">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white/90 rounded-full border border-gray-200 shadow-sm">
            <Loader2 className="h-3.5 w-3.5 text-gray-400 animate-spin" />
            <span className="text-[11px] text-gray-500 font-medium">Loading procedure...</span>
          </div>
        </div>
      </div>
    </div>
  );
}
