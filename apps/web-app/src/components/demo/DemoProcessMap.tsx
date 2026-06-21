'use client';

/**
 * DemoProcessMap — client lazy-wrapper for the live /demo process-map embed.
 *
 * `next/dynamic({ ssr: false })` is only permitted inside a Client Component in
 * the App Router, so this thin 'use client' wrapper owns the no-SSR boundary and
 * the loading skeleton. The /demo page (a Server Component) renders this directly.
 *
 * React Flow (used by DfgFrequencyMap) touches `window`/ResizeObserver on first
 * render, so the inner map must never be server-rendered.
 */

import dynamic from 'next/dynamic';

function MapSkeleton() {
  return (
    <div className="relative h-[520px] w-full animate-pulse rounded-xl border border-[var(--border-default)] bg-[var(--surface-secondary)]">
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-ds-sm text-[var(--content-tertiary)]">Loading interactive process map…</span>
      </div>
    </div>
  );
}

const DemoProcessMapInner = dynamic(() => import('./DemoProcessMapInner'), {
  ssr: false,
  loading: () => <MapSkeleton />,
});

export default function DemoProcessMap() {
  return (
    <div className="rounded-xl border border-[var(--border-default)] overflow-hidden shadow-lg shadow-[var(--border-default)]/50 bg-[var(--surface-elevated)]">
      {/* Browser-chrome bar to match the rest of the demo framing */}
      <div className="bg-[var(--surface-secondary)] border-b border-[var(--border-default)] px-4 py-2 flex items-center gap-2">
        <div className="flex gap-1.5">
          <span className="w-3 h-3 rounded-full bg-[#ff5f57]" />
          <span className="w-3 h-3 rounded-full bg-[#febc2e]" />
          <span className="w-3 h-3 rounded-full bg-[#28c840]" />
        </div>
        <span className="text-[10px] text-[var(--content-tertiary)] ml-2 font-mono">ledgerium.ai/workflows · process map</span>
      </div>
      <DemoProcessMapInner />
    </div>
  );
}
