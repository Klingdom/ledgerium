'use client';

import { Workflow, AlertTriangle, Loader2 } from 'lucide-react';

export function WorkflowEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center px-8" role="status">
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 flex items-center justify-center mb-4">
        <Workflow className="h-6 w-6 text-gray-300" />
      </div>
      <h3 className="text-ds-sm font-semibold text-gray-800 mb-1.5">No workflow data available</h3>
      <p className="text-ds-xs text-gray-500 max-w-sm leading-relaxed">
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
      <h3 className="text-ds-sm font-semibold text-gray-800 mb-1.5">Failed to load workflow</h3>
      <p className="text-ds-xs text-gray-500 max-w-sm leading-relaxed line-clamp-3">
        {message ?? 'An error occurred while processing the workflow data. Please try refreshing the page.'}
      </p>
    </div>
  );
}

export function WorkflowSkeleton() {
  return (
    <div className="flex flex-col h-full min-h-[400px]" role="status" aria-label="Loading workflow visualization">
      {/* Header skeleton */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-100 animate-pulse">
        <div className="h-4 w-16 bg-gray-200/70 rounded" />
        <div className="h-4 w-20 bg-gray-100 rounded" />
        <div className="h-4 w-14 bg-gray-100 rounded" />
        <div className="h-4 w-24 bg-gray-100 rounded" />
        <div className="flex-1" />
        <div className="h-5 w-20 bg-gray-200/50 rounded-full" />
      </div>

      {/* Toolbar skeleton */}
      <div className="flex items-center gap-2 px-5 py-2 border-b border-gray-50 animate-pulse">
        <div className="flex gap-1">
          <div className="h-7 w-28 bg-gray-100 rounded-lg" />
          <div className="h-7 w-28 bg-gray-50 rounded-lg" />
          <div className="h-7 w-28 bg-gray-50 rounded-lg" />
        </div>
        <div className="flex-1" />
        <div className="flex gap-1">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-7 w-7 bg-gray-50 rounded-md" />
          ))}
        </div>
      </div>

      {/* Canvas skeleton — shows faint node/edge shapes */}
      <div className="flex-1 relative bg-gray-50/30 overflow-hidden">
        {/* Faint placeholder nodes */}
        <div className="absolute inset-0 flex flex-col items-center pt-16 gap-6 animate-pulse">
          <div className="w-36 h-10 bg-emerald-50/60 rounded-full border border-emerald-100" />
          <div className="w-px h-8 bg-gray-200" />
          <div className="w-64 h-16 bg-white rounded-xl border border-gray-200 shadow-sm" />
          <div className="w-px h-8 bg-gray-200" />
          <div className="w-64 h-16 bg-white rounded-xl border border-gray-100" />
          <div className="w-px h-8 bg-gray-200" />
          <div className="w-64 h-16 bg-white rounded-xl border border-gray-100" />
        </div>

        {/* Loading indicator */}
        <div className="absolute inset-0 flex items-end justify-center pb-8">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white/90 backdrop-blur-sm rounded-full border border-gray-200 shadow-sm">
            <Loader2 className="h-3.5 w-3.5 text-gray-400 animate-spin" />
            <span className="text-[11px] text-gray-500 font-medium">Loading visualization...</span>
          </div>
        </div>
      </div>
    </div>
  );
}
