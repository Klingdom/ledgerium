'use client';

/**
 * KpiTileStrip — 4 KPI tiles for the top-of-page band.
 *
 * Tiles (DASHBOARD_REDESIGN_REVIEW item 7 / DD-3; atglance-review #2 + #6):
 *   1. Total Workflows (hero, largest) — secondary: "+N recorded this month"
 *   2. Median Cycle Time (across workflows) — secondary: honest "across N workflows"
 *   3. Automation Candidates (aiOpportunityCount) — secondary: "of M workflows"
 *   4. Distinct Systems — secondary: "observed across your workflows"
 *
 * Item #2 (atglance-review) — "kill the triple-88": the Avg Health Score tile was
 * REMOVED so the portfolio health NUMBER renders exactly once on the page (in the
 * HealthGauge). The gap is filled by Distinct Systems, an already-computed honest
 * stat (the shell's `availableSystems.length`) — NOT a new computation and NOT a
 * fabricated metric.
 *
 * HONESTY (ANALYTICS_DASHBOARD_REVIEW §6 + item #6):
 *   No tile shows a fabricated delta or percentage. Median cycle time states its
 *   honest denominator ("across N timed workflows"). Missing values render "—".
 *   Every tile carries a provenance/units tooltip (item #6).
 *
 * @batch B (2026-06-12)
 */

import { track } from '@/lib/analytics.js';
import { formatDuration } from '@/lib/format.js';

export interface KpiTileData {
  totalWorkflows: number;
  recordedThisMonth: number;
  /** Median cycle time across workflow means (ms), or null when no data. */
  medianCycleTimeMs: number | null;
  /** Count of workflows whose median cycle time is non-null (the denominator). */
  cycleTimeSampleCount: number;
  automationCandidates: number;
  /**
   * Item #2 fill: distinct systems observed across the workflow set. Reuses the
   * shell's already-computed `availableSystems.length` — no new computation.
   */
  distinctSystemCount: number;
}

type KpiTileId =
  | 'total_workflows'
  | 'cycle_time'
  | 'automation_candidates'
  | 'distinct_systems';

interface KpiTileStripProps {
  data: KpiTileData;
}

interface TileShellProps {
  tileId: KpiTileId;
  label: string;
  value: string;
  hero?: boolean;
  trackValue: number | null;
  /** Item #6: provenance + units tooltip (definitions only — increases honesty). */
  provenance: string;
  children: React.ReactNode;
}

function TileShell({ tileId, label, value, hero, trackValue, provenance, children }: TileShellProps) {
  return (
    <button
      type="button"
      title={provenance}
      onClick={() =>
        track({ event: 'dashboard_kpi_tile_clicked', tileId, value: trackValue })
      }
      className="
        flex flex-col items-start gap-ds-1 rounded-ds-md border border-[var(--border-subtle)]
        bg-[var(--surface-primary)] px-ds-4 py-ds-3 text-left
        transition-colors duration-150 hover:bg-[var(--surface-secondary)]
        focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500
      "
      aria-label={`${label}: ${value}. ${provenance}`}
    >
      <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--content-secondary)]">
        {label}
      </span>
      <span
        className={`font-semibold leading-none tabular-nums text-[var(--content-primary)] ${
          hero ? 'text-[34px]' : 'text-[26px]'
        }`}
      >
        {value}
      </span>
      <div className="min-h-[16px] text-[12px] text-[var(--content-secondary)]">
        {children}
      </div>
    </button>
  );
}

export default function KpiTileStrip({ data }: KpiTileStripProps) {
  const {
    totalWorkflows,
    recordedThisMonth,
    medianCycleTimeMs,
    cycleTimeSampleCount,
    automationCandidates,
    distinctSystemCount,
  } = data;

  return (
    <div
      className="grid grid-cols-2 gap-ds-3 lg:grid-cols-4"
      role="group"
      aria-label="Key portfolio metrics"
    >
      {/* Tile 1 — Total Workflows (hero) */}
      <TileShell
        tileId="total_workflows"
        label="Total Workflows"
        value={String(totalWorkflows)}
        hero
        trackValue={totalWorkflows}
        provenance="Every digital process you have recorded. Counts all workflows, regardless of the time-range filter."
      >
        {recordedThisMonth > 0
          ? `+${recordedThisMonth} recorded this month`
          : 'None recorded this month'}
      </TileShell>

      {/* Tile 2 — Median Cycle Time (across workflows) */}
      <TileShell
        tileId="cycle_time"
        label="Median Cycle Time"
        value={medianCycleTimeMs !== null ? formatDuration(medianCycleTimeMs) : '—'}
        trackValue={medianCycleTimeMs}
        provenance="Median of each workflow's mean run duration, across only the timed workflows (not all workflows). Shown as time, not a target."
      >
        {cycleTimeSampleCount > 0
          ? `across ${cycleTimeSampleCount} timed workflow${cycleTimeSampleCount === 1 ? '' : 's'}`
          : 'no timed workflows yet'}
      </TileShell>

      {/* Tile 3 — Automation Candidates */}
      <TileShell
        tileId="automation_candidates"
        label="Automation Candidates"
        value={String(automationCandidates)}
        trackValue={automationCandidates}
        provenance="Workflows tagged 'automate' by the opportunity engine — a candidacy signal from runs and variation, not an ROI or savings estimate."
      >
        {`of ${totalWorkflows} workflow${totalWorkflows === 1 ? '' : 's'}`}
      </TileShell>

      {/* Tile 4 — Distinct Systems (item #2 fill: already-computed honest stat) */}
      <TileShell
        tileId="distinct_systems"
        label="Distinct Systems"
        value={String(distinctSystemCount)}
        trackValue={distinctSystemCount}
        provenance="Count of unique systems observed across all recorded workflows. Derived from observed runs."
      >
        {distinctSystemCount === 1 ? 'observed in your workflows' : 'observed across your workflows'}
      </TileShell>
    </div>
  );
}
