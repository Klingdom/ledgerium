'use client';

/**
 * KpiTileStrip — 4 KPI tiles for the top-of-page band.
 *
 * Tiles (DASHBOARD_REDESIGN_REVIEW item 7 / DD-3; atglance-review #2 + #6 + #9):
 *   1. Total Workflows (hero, largest) — secondary: "+N recorded this month"
 *   2. Median Cycle Time (across workflows) — secondary: honest "across N workflows"
 *   3. Automation Candidates (aiOpportunityCount) — secondary: "of M workflows"
 *   4. Distinct Systems — secondary: "observed across your workflows"
 *
 * Item #9 (atglance-review) — "make clickable things navigate":
 *   ONLY the Automation Candidates tile maps to a real, honest list filter
 *   (opportunityTag === 'automate'). That tile is an interactive <button> that
 *   applies the filter and reflects active state. The other three tiles
 *   (Total Workflows / Median Cycle Time / Distinct Systems) have NO honest
 *   single-filter target, so they render as NON-interactive <div>s — not dead
 *   buttons. We do NOT fabricate an action for a tile that cannot honestly
 *   navigate. Every tile still carries an analytics click event + provenance
 *   tooltip (the non-interactive ones via an explicit info affordance).
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
import type { OpportunityTag } from '@/lib/workflow-metrics.js';

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
  /** Active opportunity filter — drives the Automation Candidates tile active state. */
  activeOpportunity: OpportunityTag | null;
  /**
   * atglance-review #9: apply the matching opportunity filter when an
   * interactive tile is clicked. Only the Automation Candidates tile calls this.
   */
  onFilter: (tag: OpportunityTag) => void;
}

interface TileShellProps {
  tileId: KpiTileId;
  label: string;
  value: string;
  hero?: boolean;
  trackValue: number | null;
  /** Item #6: provenance + units tooltip (definitions only — increases honesty). */
  provenance: string;
  /**
   * atglance-review #9: when set, the tile is an interactive filter button —
   * clicking it calls `onActivate` (which applies the matching list filter) and
   * the tile reflects `isActive`. When omitted, the tile is a NON-interactive
   * <div> (an honest static stat — not a dead button).
   */
  onActivate?: () => void;
  isActive?: boolean;
  children: React.ReactNode;
}

function TileShell({
  tileId,
  label,
  value,
  hero,
  trackValue,
  provenance,
  onActivate,
  isActive,
  children,
}: TileShellProps) {
  const baseClass =
    'flex flex-col items-start gap-ds-1 rounded-ds-md border px-ds-4 py-ds-3 text-left';

  const body = (
    <>
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
    </>
  );

  // Interactive (filterable) tile → real <button> that navigates.
  if (onActivate) {
    return (
      <button
        type="button"
        title={`${provenance} Click to filter the list to these workflows.`}
        onClick={() => {
          track({ event: 'dashboard_kpi_tile_clicked', tileId, value: trackValue });
          onActivate();
        }}
        aria-pressed={isActive ?? false}
        className={`${baseClass} bg-[var(--surface-primary)] transition-colors duration-150 hover:bg-[var(--surface-secondary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 ${
          isActive
            ? 'border-green-600 ring-1 ring-green-600'
            : 'border-[var(--border-subtle)]'
        }`}
        aria-label={`${label}: ${value}. ${provenance} Click to filter.`}
      >
        {body}
      </button>
    );
  }

  // Non-interactive tile → honest static stat (NOT a dead button).
  return (
    <div
      title={provenance}
      className={`${baseClass} border-[var(--border-subtle)] bg-[var(--surface-primary)]`}
      role="group"
      aria-label={`${label}: ${value}. ${provenance}`}
    >
      {body}
    </div>
  );
}

export default function KpiTileStrip({ data, activeOpportunity, onFilter }: KpiTileStripProps) {
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
      {/* Tile 1 — Total Workflows (hero) — non-interactive (no honest filter). */}
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

      {/* Tile 2 — Median Cycle Time — non-interactive (no honest filter). */}
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

      {/* Tile 3 — Automation Candidates — INTERACTIVE: filters to opportunityTag
          'automate' (the real, honest target behind this count). */}
      <TileShell
        tileId="automation_candidates"
        label="Automation Candidates"
        value={String(automationCandidates)}
        trackValue={automationCandidates}
        provenance="Workflows tagged 'automate' by the opportunity engine — a candidacy signal from runs and variation, not an ROI or savings estimate."
        onActivate={() => onFilter('automate')}
        isActive={activeOpportunity === 'automate'}
      >
        {`of ${totalWorkflows} workflow${totalWorkflows === 1 ? '' : 's'}`}
      </TileShell>

      {/* Tile 4 — Distinct Systems — non-interactive (no honest filter). */}
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
