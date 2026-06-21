'use client';

/**
 * DemoVariantsMap — client lazy-wrapper for the live multi-tab variants demo on
 * the public product page.
 *
 * Owns the `next/dynamic({ ssr: false })` boundary (App-Router rule: only legal
 * in a Client Component) + a loading skeleton + an error boundary that degrades
 * to the static screenshot. React Flow (inside WorkflowVariantsMap) is
 * client-only, so the inner component must never be server-rendered.
 */

import { Component, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';

function MapSkeleton() {
  return (
    <div className="relative h-[560px] w-full animate-pulse bg-[var(--surface-secondary)]">
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-ds-sm text-[var(--content-tertiary)]">Loading interactive process map…</span>
      </div>
    </div>
  );
}

function StaticFallback() {
  return (
    <div className="relative h-[560px] w-full">
      <Image
        src="/img/demo/workflow-view.png"
        alt="Ledgerium process variants map (sample)"
        fill
        className="object-cover object-top"
      />
    </div>
  );
}

/** Degrades to the static screenshot if the live canvas throws at runtime. */
class DemoErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }
  override render(): ReactNode {
    return this.state.hasError ? <StaticFallback /> : this.props.children;
  }
}

const DemoVariantsMapInner = dynamic(() => import('./DemoVariantsMapInner'), {
  ssr: false,
  loading: () => <MapSkeleton />,
});

export default function DemoVariantsMap() {
  return (
    <div className="rounded-xl border border-[var(--border-default)] overflow-hidden shadow-lg shadow-[var(--border-default)]/50 bg-[var(--surface-elevated)]">
      {/* Browser-chrome bar to match the rest of the demo framing */}
      <div className="bg-[var(--surface-secondary)] border-b border-[var(--border-default)] px-4 py-2 flex items-center gap-2">
        <div className="flex gap-1.5">
          <span className="w-3 h-3 rounded-full bg-[#ff5f57]" />
          <span className="w-3 h-3 rounded-full bg-[#febc2e]" />
          <span className="w-3 h-3 rounded-full bg-[#28c840]" />
        </div>
        <span className="text-[10px] text-[var(--content-tertiary)] ml-2 font-mono">
          ledgerium.ai/workflows/approve-expense-report · variants
        </span>
      </div>
      {/* Sample-data honesty strip */}
      <div className="bg-[var(--surface-secondary)] border-b border-[var(--border-subtle)] px-4 py-1.5 text-[10px] text-[var(--content-tertiary)] flex items-center gap-1.5">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-brand-500" />
        Sample data — “Approve Expense Report”, 6 variants across 16 recorded runs
      </div>
      <DemoErrorBoundary>
        <DemoVariantsMapInner />
      </DemoErrorBoundary>
    </div>
  );
}
