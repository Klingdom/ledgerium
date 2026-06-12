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

export interface TopBandData {
  isLoading: boolean;
  totalWorkflows: number;
  recordedThisMonth: number;
  medianCycleTimeMs: number | null;
  cycleTimeSampleCount: number;
  automationCandidates: number;
  avgHealthScore: number | null;
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
    avgHealthScore: data.avgHealthScore,
    avgHealthScoreDelta: data.avgHealthScoreDelta,
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
      {/* Row 1: KPI tiles (4) + health gauge */}
      <div className="flex flex-col gap-ds-4 lg:flex-row lg:items-stretch">
        <div className="flex-1 min-w-0">
          <KpiTileStrip data={kpiData} />
        </div>
        <div className="flex items-center justify-center rounded-ds-md border border-[var(--border-subtle)] bg-[var(--surface-primary)] px-ds-6 py-ds-3 lg:w-[150px] lg:flex-shrink-0">
          <HealthGauge score={data.avgHealthScore} />
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

      {/* Row 3: narrator */}
      <NarratorSummary input={narratorInput} />
    </section>
  );
}
