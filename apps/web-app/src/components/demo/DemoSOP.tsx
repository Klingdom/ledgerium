'use client';

/**
 * DemoSOP — client lazy-wrapper for the REAL SOPPageShell on the public demo.
 *
 * Owns the `next/dynamic({ ssr: false })` boundary + loading skeleton +
 * error boundary. SOPPageShell imports several client-only hooks; this wrapper
 * keeps them out of the SSR pass.
 *
 * Analytics is suppressed by DemoSOPInner (workflowId intentionally omitted).
 */

import { Component, type ReactNode } from 'react';
import dynamic from 'next/dynamic';

function SOPSkeleton() {
  return (
    <div className="animate-pulse p-6 space-y-4">
      <div className="h-5 w-1/3 rounded bg-[var(--surface-secondary)]" />
      <div className="h-3 w-full rounded bg-[var(--surface-secondary)]" />
      <div className="h-3 w-5/6 rounded bg-[var(--surface-secondary)]" />
      <div className="h-3 w-4/6 rounded bg-[var(--surface-secondary)]" />
      <div className="mt-6 space-y-3">
        {[1, 2, 3, 4, 5].map((n) => (
          <div key={n} className="flex gap-3 items-start">
            <div className="w-6 h-6 rounded-full shrink-0 bg-[var(--surface-secondary)]" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-3/4 rounded bg-[var(--surface-secondary)]" />
              <div className="h-2 w-full rounded bg-[var(--surface-secondary)]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SOPFallback() {
  return (
    <div className="p-8 text-center text-[var(--content-secondary)] text-sm">
      Unable to load SOP preview — please refresh.
    </div>
  );
}

class DemoSOPErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }
  override render(): ReactNode {
    return this.state.hasError ? <SOPFallback /> : this.props.children;
  }
}

const DemoSOPInner = dynamic(() => import('./DemoSOPInner'), {
  ssr: false,
  loading: () => <SOPSkeleton />,
});

export default function DemoSOP() {
  return (
    <DemoSOPErrorBoundary>
      <DemoSOPInner />
    </DemoSOPErrorBoundary>
  );
}
