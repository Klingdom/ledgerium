'use client';

/**
 * DemoAnnotatedDashboardHeader — Container 1
 *
 * Renders the real CommandHeader + PortfolioTimestudyBand surfaces fed from
 * DEMO_WORKFLOW_ROWS via computePortfolioSummary, wrapped in:
 *  - A browser-chrome frame (traffic lights + URL bar + "Sample data" badge)
 *  - An interactive time-range <select> (UI state only — no fetch)
 *  - A bottom gradient mask to create a cropped-screenshot effect
 *  - DemoAnnotations overlay with 9 numbered callout popups
 *
 * Hard constraints:
 *  - 'use client' — no server imports
 *  - No Date.now() / Math.random()
 *  - All data is frozen-clock sample data from demoWorkflowFixture
 *  - Additive only — RealProductDemo.tsx is untouched
 */

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import DemoAnnotations, { type DemoAnnotation } from './DemoAnnotations';
import { DEMO_WORKFLOW_ROWS } from './demoWorkflowFixture';
import {
  computePortfolioSummary,
  type PortfolioSummaryInput,
} from '@/lib/dashboard-band-stats';
import type { TimeRange } from '@/components/dashboard-v2/CommandHeader';

// Load the real UI surfaces client-only (they import lucide-react / charting libs)
const CommandHeader = dynamic(
  () => import('@/components/dashboard-v2/CommandHeader'),
  { ssr: false },
);
const PortfolioTimestudyBand = dynamic(
  () => import('@/components/dashboard-v2/band/PortfolioTimestudyBand'),
  { ssr: false },
);

// ── Build the PortfolioSummary from the demo fixture ──────────────────────────
const DEMO_PORTFOLIO_INPUTS: PortfolioSummaryInput[] = DEMO_WORKFLOW_ROWS.map(
  (row) => ({
    runs: row.metricsV2?.runs ?? null,
    avgTimeMs: row.metricsV2?.avgTimeMs ?? null,
    systemCount: row.toolsUsed.length,
    healthOverall: row.metricsV2?.healthScore.overall ?? 0,
    healthGated: row.metricsV2?.healthScore.isGated ?? false,
  }),
);

const DEMO_PORTFOLIO_SUMMARY = computePortfolioSummary(DEMO_PORTFOLIO_INPUTS);

// ── Derived portfolio health score (mean of ungated overalls) ─────────────────
// Use the pre-computed avgHealthScore from computePortfolioSummary.
const DEMO_PORTFOLIO_HEALTH = DEMO_PORTFOLIO_SUMMARY.avgHealthScore ?? 73;

// ── 9 numbered annotations ────────────────────────────────────────────────────
const ANNOTATIONS: DemoAnnotation[] = [
  {
    id: '1',
    number: 1,
    top: '56px',
    left: '9%',
    popoverSide: 'bottom',
    title: 'Portfolio health verdict',
    body: 'The header shows a non-numeric verdict word ("Good", "Fair", or "Needs attention") so you orient instantly without hunting for a buried score.',
  },
  {
    id: '2',
    number: 2,
    top: '56px',
    left: '27%',
    popoverSide: 'bottom',
    title: 'Period-over-period delta',
    body: 'Compares current portfolio health to the prior 30-day window. Green = improving, red = declining — before you even look at individual workflows.',
  },
  {
    id: '3',
    number: 3,
    top: '56px',
    left: '56%',
    popoverSide: 'bottom',
    title: 'Time-range selector',
    body: 'Filter the entire dashboard to a specific window — 7d, 30d, 90d, or All time. All statistics and charts update together.',
  },
  {
    id: '4',
    number: 4,
    top: '56px',
    left: '80%',
    popoverSide: 'bottom',
    title: 'Top insight sentence',
    body: 'The highest-severity signal from the workflow library surfaces here — so a critical finding is never buried below the fold.',
  },
  {
    id: '5',
    number: 5,
    top: '130px',
    left: '10%',
    popoverSide: 'right',
    title: 'Avg cycle time',
    body: 'Case-weighted mean across recorded runs — honest proxy until per-run timestamps are available. Labeled "proxy" so you always know the evidence quality.',
  },
  {
    id: '6',
    number: 6,
    top: '130px',
    left: '30%',
    popoverSide: 'right',
    title: 'Total cases',
    body: 'Σ observed runs across all workflows — the raw evidence denominator that every aggregate is built on.',
  },
  {
    id: '7',
    number: 7,
    top: '130px',
    left: '50%',
    popoverSide: 'left',
    title: 'Avg runs per workflow',
    body: 'Shows how broadly each workflow is used. Low averages can indicate under-recorded processes or infrequent tasks.',
  },
  {
    id: '8',
    number: 8,
    top: '130px',
    left: '70%',
    popoverSide: 'left',
    title: 'Avg systems per workflow',
    body: 'How many distinct tools each workflow touches on average. High counts signal integration complexity — a key automation opportunity signal.',
  },
  {
    id: '9',
    number: 9,
    top: '130px',
    left: '91%',
    popoverSide: 'left',
    title: 'Avg health score',
    body: 'Mean of Speed + Consistency + Data Quality + Standardization subscores across your library. Drill into any workflow to see the breakdown.',
  },
];

export default function DemoAnnotatedDashboardHeader() {
  const [timeRange, setTimeRange] = useState<TimeRange>('all');

  return (
    <section aria-label="Dashboard header demo" className="w-full">
      {/* Section label */}
      <div className="mb-3 flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-600/10 px-3 py-1 text-[12px] font-medium text-brand-400">
          <span aria-hidden>■</span> Container 1 — Dashboard Header
        </span>
        <span className="text-[12px] text-[var(--content-secondary)]">
          Real CommandHeader + Portfolio Band · 9 annotations · interactive time-range
        </span>
      </div>

      {/* Browser chrome frame */}
      <div className="overflow-hidden rounded-xl border border-[var(--border-default)] shadow-2xl shadow-black/30">
        {/* Chrome bar */}
        <div className="flex items-center gap-3 bg-[var(--surface-elevated)] px-4 py-2.5 border-b border-[var(--border-subtle)]">
          {/* Traffic lights */}
          <div className="flex items-center gap-1.5" aria-hidden>
            <span className="block h-3 w-3 rounded-full bg-red-400" />
            <span className="block h-3 w-3 rounded-full bg-amber-400" />
            <span className="block h-3 w-3 rounded-full bg-green-400" />
          </div>
          {/* URL bar */}
          <div className="flex flex-1 items-center justify-center">
            <div className="flex items-center gap-1.5 rounded-md bg-[var(--surface-primary)] border border-[var(--border-subtle)] px-3 py-1 text-[12px] text-[var(--content-secondary)] max-w-xs w-full">
              <svg aria-hidden className="h-3 w-3 shrink-0 opacity-50" viewBox="0 0 16 16" fill="currentColor">
                <path fillRule="evenodd" d="M8 0a8 8 0 100 16A8 8 0 008 0zm0 1.5a6.5 6.5 0 110 13 6.5 6.5 0 010-13z" clipRule="evenodd" />
                <path d="M8 3.5c-.83 0-1.5.67-1.5 1.5v5.5c0 .28.22.5.5.5h2a.5.5 0 00.5-.5V5c0-.83-.67-1.5-1.5-1.5z" />
              </svg>
              app.ledgerium.ai/dashboard
            </div>
          </div>
          {/* Sample data badge */}
          <span className="shrink-0 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-medium text-amber-400 border border-amber-500/25">
            Sample data
          </span>
        </div>

        {/* Real surfaces wrapped in annotation overlay */}
        <div className="relative bg-[var(--surface-primary)]">
          <DemoAnnotations annotations={ANNOTATIONS}>
            {/* CommandHeader */}
            <CommandHeader
              portfolioHealthScore={DEMO_PORTFOLIO_HEALTH}
              portfolioHealthScoreDelta={4}
              topInsight={null}
              timeRange={timeRange}
              onTimeRangeChange={setTimeRange}
              workflowCount={DEMO_WORKFLOW_ROWS.length}
            />

            {/* PortfolioTimestudyBand */}
            <PortfolioTimestudyBand
              summary={DEMO_PORTFOLIO_SUMMARY}
              totalWorkflowCount={DEMO_WORKFLOW_ROWS.length}
              position="top"
            />
          </DemoAnnotations>

          {/* Bottom gradient mask — creates a cropped-screenshot look */}
          <div
            aria-hidden
            className="pointer-events-none absolute bottom-0 left-0 right-0 h-12"
            style={{
              background:
                'linear-gradient(to bottom, transparent, var(--surface-primary, #0d1117))',
            }}
          />
        </div>
      </div>

      {/* Caption */}
      <p className="mt-2 text-center text-[11px] text-[var(--content-tertiary)]">
        Click any numbered marker to learn what each surface measures.
      </p>
    </section>
  );
}
