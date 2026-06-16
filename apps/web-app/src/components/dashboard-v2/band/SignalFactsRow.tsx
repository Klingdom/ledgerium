'use client';

/**
 * SignalFactsRow — Tier-2 "library facts" row (CONSOLIDATED_20 #7).
 *
 * A compact secondary row (smaller than the KPI tiles) of observed library
 * facts: Total runs · Distinct systems · Needs review · Recorded this week —
 * each a small `label · value`. This is where **Distinct Systems** now lives
 * (demoted out of the primary KPI strip by #4 so the same stat is never shown
 * twice). A tiny honest sparkline + period-over-period delta sits alongside,
 * rendered ONLY where a real prior period exists (else "—").
 *
 * HONESTY (CONSOLIDATED_20 §49):
 *  - every value is an OBSERVED count from already-computed engine output;
 *  - "Recorded this week" derives from the pre-computed `recentCount` of the
 *    activityByWeek buckets (the route's single referenceNowMs boundary), NOT a
 *    render-time clock;
 *  - the delta is shown only when `sparkline.delta !== null` (real prior period);
 *  - "Needs review" is the observed count of needs_review-status workflows.
 *
 * DETERMINISM + HYDRATION SAFETY: no Date.now()/Math.random() in render; the
 * sparkline is pure SVG (MiniSparkline). Design tokens only.
 *
 * @batch SIGNALS (2026-06-16)
 */

import { ArrowDown, ArrowUp } from 'lucide-react';
import type { SparklineState } from '@/lib/dashboard-band-stats.js';
import MiniSparkline from './MiniSparkline.js';

export interface SignalFactsData {
  /** Sum of observed runs across the library (computeTotalRuns). */
  totalRuns: number;
  /** Distinct systems observed — demoted here from the KPI strip (#4). */
  distinctSystemCount: number;
  /** Observed count of needs_review-status workflows (stats.needsReview). */
  needsReviewCount: number;
  /** Pre-computed sparkline points + honest delta + recent-week pulse. */
  sparkline: SparklineState;
}

interface SignalFactsRowProps {
  data: SignalFactsData;
}

interface FactProps {
  label: string;
  value: string;
  /** Provenance/units tooltip (definitions only — no fabricated targets). */
  provenance: string;
}

function Fact({ label, value, provenance }: FactProps) {
  return (
    <div
      className="flex items-baseline gap-ds-1"
      role="group"
      aria-label={`${label}: ${value}. ${provenance}`}
      title={provenance}
    >
      <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--content-tertiary)]">
        {label}
      </span>
      <span className="text-[13px] font-semibold tabular-nums text-[var(--content-primary)]">
        {value}
      </span>
    </div>
  );
}

/** The "recorded this week" delta chip — shown only when an honest delta exists. */
function RecordedThisWeek({ sparkline }: { sparkline: SparklineState }) {
  const { recentCount, delta, points } = sparkline;
  const valueLabel = `${recentCount} this week`;

  // Honest delta: only when buildSparklineState found a real prior period.
  let deltaNode: React.ReactNode;
  if (delta === null) {
    deltaNode = (
      <span
        className="text-[11px] text-[var(--content-tertiary)]"
        title="No prior period to compare against yet — a trend needs recordings in an earlier period."
      >
        —
      </span>
    );
  } else if (delta === 0) {
    deltaNode = (
      <span className="text-[11px] text-[var(--content-tertiary)]" aria-label="No change versus the prior period">
        no change
      </span>
    );
  } else {
    const up = delta > 0;
    const Icon = up ? ArrowUp : ArrowDown;
    deltaNode = (
      <span
        className={`inline-flex items-center gap-0.5 text-[11px] font-medium ${
          up ? 'text-green-600' : 'text-red-600'
        }`}
        aria-label={`${up ? 'Up' : 'Down'} ${Math.abs(delta)} versus the prior period`}
      >
        <Icon size={10} aria-hidden="true" />
        {`${up ? '+' : '−'}${Math.abs(delta)} vs prior`}
      </span>
    );
  }

  return (
    <div
      className="flex items-center gap-ds-2"
      role="group"
      aria-label={`Recorded this week: ${recentCount}. Observed workflow recordings; the trend compares the recent half of the window with the prior half, shown only when a prior period exists.`}
      title="Workflows recorded this week (observed). The sparkline and delta compare the recent half of the trailing window with the prior half — shown only when a real prior period exists."
    >
      <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--content-tertiary)]">
        Recorded this week
      </span>
      <span className="text-[13px] font-semibold tabular-nums text-[var(--content-primary)]">
        {valueLabel}
      </span>
      <MiniSparkline
        points={points}
        ariaLabel="Workflows recorded per week, observed (sparkline)"
      />
      {deltaNode}
    </div>
  );
}

export default function SignalFactsRow({ data }: SignalFactsRowProps) {
  const { totalRuns, distinctSystemCount, needsReviewCount, sparkline } = data;

  return (
    <div
      className="flex flex-row flex-wrap items-center gap-x-ds-6 gap-y-ds-2"
      role="group"
      aria-label="Library facts"
    >
      <Fact
        label="Total runs"
        value={String(totalRuns)}
        provenance="Sum of observed runs across every workflow — the evidence behind the metrics. A count of runs, not workflows."
      />
      <Fact
        label="Distinct systems"
        value={String(distinctSystemCount)}
        provenance="Count of unique systems observed across all recorded workflows. Derived from observed runs."
      />
      <Fact
        label="Needs review"
        value={String(needsReviewCount)}
        provenance="Workflows the engine flagged as needs-review or high-variation (observed status). A count to triage, not a defect rate."
      />
      <RecordedThisWeek sparkline={sparkline} />
    </div>
  );
}
