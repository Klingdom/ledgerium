'use client';

/**
 * RealProductDemo — public-page demo that renders REAL product components
 * driven by the canonical 5-workflow fixture.
 *
 * Rendered on:
 *   src/app/(public)/page.tsx      (home page)
 *   src/app/(public)/product/page.tsx
 *
 * Design constraints:
 *  - No server imports. All fixture data is plain JSON-compatible.
 *  - Additive / reversible — DemoDashboard.tsx is kept as-is.
 *  - Fixed-height framed container (~560px) with browser-chrome decoration
 *    and a "Sample data" honesty strip.
 *  - Row click intercepts Next.js router.push by stopping the DOM event in
 *    capture phase before WorkflowRow's onClick bubble handler fires.
 *  - Drill-down (SOP / Process map) is shown for the HERO workflow only;
 *    clicking any non-HERO row opens the HERO drill-down to keep the demo
 *    focused without fabricating per-workflow content.
 */

import { useState, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import WorkflowList from '@/components/dashboard-v2/WorkflowList';
import { DEMO_WORKFLOW_ROWS, DEMO_NOW_MS, DEMO_HERO_WORKFLOW } from './demoWorkflowFixture';
import type { FilterState } from '@/components/dashboard-v2/WorkflowListFilterBar';

// ── Lazy-load the drill-down panels (client-only) ────────────────────────────

const DemoSOP = dynamic(() => import('./DemoSOP'), {
  ssr: false,
  loading: () => <DrilldownSkeleton />,
});

const DemoVariantsMap = dynamic(() => import('./DemoVariantsMap'), {
  ssr: false,
  loading: () => <DrilldownSkeleton />,
});

// ── Static props ─────────────────────────────────────────────────────────────

/** All unique tool names across the 5 demo workflows. */
const DEMO_AVAILABLE_SYSTEMS: string[] = [
  'Concur', 'Slack', 'SAP', 'Outlook',
  'Salesforce', 'Stripe', 'Zendesk',
  'Coupa', 'DocuSign', 'Workday', 'Excel', 'ADP',
];

const EMPTY_FILTERS: FilterState = {
  systems: [],
  opportunity: null,
  healthStatus: null,
  needsAttention: false,
};

// No-op callbacks — demo is non-interactive for mutations.
const noop = () => {};

// ── Sub-components ────────────────────────────────────────────────────────────

function BrowserChrome({ url }: { url: string }) {
  return (
    <div className="bg-[var(--surface-secondary)] border-b border-[var(--border-default)] px-4 py-2.5 flex items-center gap-3 shrink-0">
      {/* Traffic lights */}
      <div className="flex items-center gap-1.5">
        <span className="w-3 h-3 rounded-full bg-[#FF5F57]" />
        <span className="w-3 h-3 rounded-full bg-[#FEBC2E]" />
        <span className="w-3 h-3 rounded-full bg-[#28C840]" />
      </div>
      {/* URL bar */}
      <div className="flex-1 mx-2 px-3 py-1 rounded-md bg-[var(--surface-primary)] border border-[var(--border-default)] text-[11px] font-mono text-[var(--content-secondary)] truncate select-none">
        {url}
      </div>
      {/* Sample data badge */}
      <span className="shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400 border border-brand-200 dark:border-brand-800">
        Sample data
      </span>
    </div>
  );
}

function DrilldownSkeleton() {
  return (
    <div className="animate-pulse p-6 space-y-4">
      <div className="h-4 w-1/3 rounded bg-[var(--surface-secondary)]" />
      <div className="h-3 w-full rounded bg-[var(--surface-secondary)]" />
      <div className="h-3 w-5/6 rounded bg-[var(--surface-secondary)]" />
      <div className="h-3 w-4/6 rounded bg-[var(--surface-secondary)]" />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

type DrillTab = 'sop' | 'map';

export default function RealProductDemo() {
  const [isDrilledDown, setIsDrilledDown] = useState(false);
  const [activeTab, setActiveTab] = useState<DrillTab>('sop');

  // Ref to know whether a click originated from the WorkflowList area
  const listRef = useRef<HTMLDivElement>(null);

  /**
   * Capture-phase click handler on the WorkflowList wrapper.
   *
   * WorkflowRow renders a `<tr onClick={handleRowClick}>` which calls
   * `router.push(...)`. By intercepting in capture phase at the wrapper div,
   * we call e.stopPropagation() BEFORE the event reaches the <tr>, so
   * router.push never fires. We then open the drill-down ourselves.
   *
   * We still let clicks on buttons (health-score, kebab, inline-edit) through
   * — those are inside the <tr> but since we always intercept first this makes
   * everything a no-op in the demo, which is fine for a public preview.
   */
  const handleListClickCapture = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // Find the nearest tr with a wf-row-* id
    let target = e.target as HTMLElement | null;
    while (target && target !== listRef.current) {
      if (target.tagName === 'TR' && target.id?.startsWith('wf-row-')) {
        // We've identified a workflow row click — stop it from reaching the
        // row's onClick handler which would call router.push.
        e.stopPropagation();
        setIsDrilledDown(true);
        setActiveTab('sop');
        return;
      }
      target = target.parentElement;
    }
    // Not a row click — let it propagate normally (e.g. column sort headers)
  }, []);

  const handleBack = useCallback(() => {
    setIsDrilledDown(false);
  }, []);

  const hero = DEMO_HERO_WORKFLOW;
  const url = isDrilledDown
    ? 'ledgerium.ai/workflows/approve-expense-report'
    : 'ledgerium.ai/dashboard';

  return (
    <div className="rounded-xl border border-[var(--border-default)] overflow-hidden shadow-lg shadow-[var(--border-default)]/50 bg-[var(--surface-elevated)] w-full">
      <BrowserChrome url={url} />

      {/* Content area — fixed height with scroll */}
      <div className="h-[540px] overflow-y-auto overflow-x-hidden">
        {isDrilledDown ? (
          /* ── Drill-down view ── */
          <div className="flex flex-col h-full">
            {/* Drill-down header */}
            <div className="shrink-0 px-4 pt-4 pb-3 border-b border-[var(--border-default)] bg-[var(--surface-secondary)]">
              <button
                type="button"
                onClick={handleBack}
                className="inline-flex items-center gap-1.5 text-[11px] font-medium text-brand-500 hover:text-brand-600 mb-2 transition-colors"
              >
                {/* Left arrow */}
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="shrink-0" aria-hidden="true">
                  <path d="M7.5 9L4.5 6L7.5 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Back to dashboard
              </button>

              {/* Workflow title row */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-[var(--content-primary)] leading-snug">
                    {hero.title}
                  </h2>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    {hero.toolsUsed.map((tool) => (
                      <span
                        key={tool}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--surface-secondary)] text-[var(--content-secondary)] font-medium"
                      >
                        {tool}
                      </span>
                    ))}
                  </div>
                </div>
                {/* Quick metrics */}
                <div className="shrink-0 grid grid-cols-3 gap-3 text-right">
                  <div>
                    <div className="text-[10px] text-[var(--content-tertiary)]">Avg time</div>
                    <div className="text-xs font-semibold text-[var(--content-primary)]">2m 0s</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-[var(--content-tertiary)]">Runs</div>
                    <div className="text-xs font-semibold text-[var(--content-primary)]">16</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-[var(--content-tertiary)]">Health</div>
                    <div className="text-xs font-semibold text-emerald-500">82</div>
                  </div>
                </div>
              </div>

              {/* Tab strip */}
              <div className="flex items-center gap-1 mt-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('sop')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium transition-colors ${
                    activeTab === 'sop'
                      ? 'bg-brand-600 text-white'
                      : 'text-[var(--content-secondary)] hover:text-[var(--content-primary)] hover:bg-[var(--surface-secondary)]'
                  }`}
                >
                  {/* FileText icon */}
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
                  </svg>
                  Standard Operating Procedure
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('map')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium transition-colors ${
                    activeTab === 'map'
                      ? 'bg-brand-600 text-white'
                      : 'text-[var(--content-secondary)] hover:text-[var(--content-primary)] hover:bg-[var(--surface-secondary)]'
                  }`}
                >
                  {/* GitBranch icon */}
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/>
                  </svg>
                  Process map
                </button>
              </div>
            </div>

            {/* Tab panel */}
            <div className="flex-1 overflow-y-auto min-h-0">
              {activeTab === 'sop' ? <DemoSOP /> : <DemoVariantsMap />}
            </div>
          </div>
        ) : (
          /* ── Dashboard list view ── */
          <div
            ref={listRef}
            onClickCapture={handleListClickCapture}
            className="h-full"
          >
            <WorkflowList
              state="ready"
              workflows={DEMO_WORKFLOW_ROWS}
              filters={EMPTY_FILTERS}
              insightFilterKey={null}
              availableSystems={DEMO_AVAILABLE_SYSTEMS}
              timeRange="all"
              onFiltersChange={noop}
              onClearInsightFilter={noop}
              onRetry={noop}
              hideFilterBar
              nowMs={DEMO_NOW_MS}
            />
          </div>
        )}
      </div>
    </div>
  );
}
