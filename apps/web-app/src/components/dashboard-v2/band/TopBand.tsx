'use client';

/**
 * TopBand — Batch B top-of-page graphics band.
 *
 * Mounts between CommandHeader and the WorkflowList. Composes:
 *   - KpiTileStrip (4 tiles)
 *   - HealthGauge (beside the KPI strip)
 *   - OpportunityBar (click a segment → opportunity filter)
 *   - RecordedTrendChart (one primary weekly bar chart)
 *   - NarratorSummary (one-line summary above the list)
 *
 * All data is computed server-side (deterministic, referenceNowMs-anchored) and
 * passed in as props. This component is presentational orchestration only — no
 * Date.now()/Math.random(); charts are client-only with animation off.
 *
 * Empty/loading: when `isLoading` the band renders nothing (CommandHeader and
 * the list skeleton already cover the loading state). When there are zero
 * workflows the band is also suppressed — the CommandHeader activation prompt
 * + the list empty-state carry that case.
 *
 * @batch B (2026-06-12)
 */

import { ArrowDown, ArrowUp, Minus } from 'lucide-react';
import type { OpportunityTag } from '@/lib/workflow-metrics.js';
import type {
  OpportunityCounts,
  ActivityWeekBucket,
} from '@/lib/dashboard-band-stats.js';
import KpiTileStrip, { type KpiTileData } from './KpiTileStrip.js';
import HealthGauge from './HealthGauge.js';
import OpportunityBar from './OpportunityBar.js';
import RecordedTrendChart from './RecordedTrendChart.js';
import NarratorSummary, { type NarratorInput } from './NarratorSummary.js';

/**
 * The portfolio health period-over-period delta — the ONLY tile/widget with a
 * real prior-period value (ANALYTICS_DASHBOARD_REVIEW §6). Surfaced beneath the
 * HealthGauge after the Avg Health KPI tile was removed (item #2). Honest: a
 * null delta renders "— vs last 30d" (no fabricated change).
 */
function HealthDelta({ delta }: { delta: number | null }) {
  if (delta === null || delta === 0) {
    const label = delta === 0 ? '= 0 vs last 30d' : '— vs last 30d';
    return (
      <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-[var(--content-secondary)]">
        <Minus size={10} aria-hidden="true" />
        <span>{label}</span>
      </span>
    );
  }
  const up = delta > 0;
  const Icon = up ? ArrowUp : ArrowDown;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[11px] font-medium ${
        up ? 'text-green-600' : 'text-red-600'
      }`}
    >
      <Icon size={10} aria-hidden="true" />
      <span>{`${up ? '+' : ''}${delta} vs last 30d`}</span>
    </span>
  );
}

export interface TopBandData {
  isLoading: boolean;
  totalWorkflows: number;
  recordedThisMonth: number;
  medianCycleTimeMs: number | null;
  cycleTimeSampleCount: number;
  automationCandidates: number;
  /**
   * Item #2 fill: distinct systems observed (shell's `availableSystems.length`).
   * Replaces the removed Avg Health KPI tile — an already-computed honest stat.
   */
  distinctSystemCount: number;
  /**
   * Portfolio health score 0–100, or null. Rendered ONLY by the HealthGauge —
   * the single on-page representation of the health number (item #2).
   */
  avgHealthScore: number | null;
  /** Period-over-period health delta; surfaced near the gauge as the one true delta. */
  avgHealthScoreDelta: number | null;
  highVariationCount: number;
  opportunityCounts: OpportunityCounts;
  activityByWeek: ActivityWeekBucket[];
}

interface TopBandProps {
  data: TopBandData;
  /** Active opportunity filter, for segment active-state styling. */
  activeOpportunity: OpportunityTag | null;
  /** Toggle the opportunity filter when a bar segment is clicked. */
  onOpportunitySegmentClick: (tag: OpportunityTag) => void;
}

export default function TopBand({
  data,
  activeOpportunity,
  onOpportunitySegmentClick,
}: TopBandProps) {
  // Suppress the entire band while loading or when there are no workflows —
  // the header + list states already cover those cases honestly.
  if (data.isLoading || data.totalWorkflows === 0) {
    return null;
  }

  const kpiData: KpiTileData = {
    totalWorkflows: data.totalWorkflows,
    recordedThisMonth: data.recordedThisMonth,
    medianCycleTimeMs: data.medianCycleTimeMs,
    cycleTimeSampleCount: data.cycleTimeSampleCount,
    automationCandidates: data.automationCandidates,
    distinctSystemCount: data.distinctSystemCount,
  };

  const narratorInput: NarratorInput = {
    totalWorkflows: data.totalWorkflows,
    avgHealthScore: data.avgHealthScore,
    highVariationCount: data.highVariationCount,
    opportunityCounts: data.opportunityCounts,
  };

  return (
    <section
      aria-label="Portfolio overview"
      className="flex flex-col gap-ds-4 px-ds-8 py-ds-4 border-b border-[var(--border-subtle)]"
    >
      {/* Row 0: NARRATOR — promoted to the TOP of the band (atglance-review #1,
          "orient before alert"). A newcomer reads what + how-many + what's-wrong
          first, before the KPI tiles and charts. Honest logic unchanged. */}
      <NarratorSummary input={narratorInput} />

      {/* Row 1: KPI tiles (4) + health gauge */}
      <div className="flex flex-col gap-ds-4 lg:flex-row lg:items-stretch">
        <div className="flex-1 min-w-0">
          <KpiTileStrip data={kpiData} />
        </div>
        {/* HealthGauge is the SINGLE on-page representation of the portfolio
            health NUMBER (item #2). The one true period-over-period delta is
            surfaced directly beneath it. The container tooltip glosses the
            composite (item #9 / #6) — documented composition + band thresholds
            only, no invented benchmark. */}
        <div
          className="flex flex-col items-center justify-center gap-ds-1 rounded-ds-md border border-[var(--border-subtle)] bg-[var(--surface-primary)] px-ds-6 py-ds-3 lg:w-[150px] lg:flex-shrink-0"
          title="A 0–100 composite of confidence, SOP readiness, maturity, and review status across your workflows. 80+ is good, 60–79 fair, under 60 needs attention."
        >
          <HealthGauge score={data.avgHealthScore} />
          <HealthDelta delta={data.avgHealthScoreDelta} />
        </div>
      </div>

      {/* Row 2: opportunity bar + trend chart */}
      <div className="flex flex-col gap-ds-4 lg:flex-row lg:items-stretch">
        <div className="flex flex-col justify-center rounded-ds-md border border-[var(--border-subtle)] bg-[var(--surface-primary)] px-ds-4 py-ds-3 lg:w-2/5 lg:flex-shrink-0">
          <OpportunityBar
            counts={data.opportunityCounts}
            activeOpportunity={activeOpportunity}
            onSegmentClick={onOpportunitySegmentClick}
          />
        </div>
        <div className="flex-1 min-w-0 rounded-ds-md border border-[var(--border-subtle)] bg-[var(--surface-primary)] px-ds-4 py-ds-3">
          <RecordedTrendChart data={data.activityByWeek} />
        </div>
      </div>
    </section>
  );
}
