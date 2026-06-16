'use client';

/**
 * KpiTileStrip — 4 KPI tiles for the top-of-page band.
 *
 * Tiles (DASHBOARD_REDESIGN_REVIEW item 7 / DD-3; atglance-review #2 + #6 + #9;
 * SIGNALS batch #4):
 *   1. Total Workflows (hero, largest) — secondary: "+N recorded this month"
 *   2. Median Cycle Time (across workflows) — secondary: honest "across N workflows"
 *   3. Automation Candidates (aiOpportunityCount) — secondary: "of M workflows"
 *   4. High-Variance Workflows (NEW, SIGNALS #4) — secondary: honest denominator
 *      "of K multi-run workflows"; K==0 → "needs ≥2 runs" (no fabricated 0).
 *
 * SIGNALS #4 — strip-redundancy resolution: **Distinct Systems was DEMOTED out
 * of this primary strip** into the Tier-2 SignalFactsRow (#7) so the same stat
 * is never shown twice. Primary strip is now Total Workflows · Median Cycle Time
 * · Automation Candidates · High-Variance (+ the HealthGauge hero, rendered by
 * TopBand).
 *
 * Item #9 (atglance-review) — "make clickable things navigate":
 *   ONLY the Automation Candidates tile maps to a real, honest list filter
 *   (opportunityTag === 'automate'). That tile is an interactive <button> that
 *   applies the filter and reflects active state. The other three tiles
 *   (Total Workflows / Median Cycle Time / High-Variance) have NO honest
 *   single-OPPORTUNITY-filter target, so they render as NON-interactive <div>s —
 *   not dead buttons. (High-variation IS a healthStatus filter, surfaced via the
 *   clickable Narrator clause, not this opportunity-typed tile handler — we do
 *   not fabricate an opportunity action for it.) Every tile still carries an
 *   analytics click event + provenance tooltip.
 *
 * HONESTY (ANALYTICS_DASHBOARD_REVIEW §6 + item #6):
 *   No tile shows a fabricated delta or percentage. Median cycle time states its
 *   honest denominator ("across N timed workflows"). The High-Variance tile
 *   gates its denominator to multi-run workflows (variation is undefined for a
 *   single run) and reports an honest "needs ≥2 runs" state when none exist.
 *   Variation is a PROXY, labeled as such. Missing values render "—". Every tile
 *   carries a provenance/units tooltip (item #6).
 *
 * @batch B (2026-06-12) · SIGNALS (2026-06-16)
 */

import { track } from '@/lib/analytics.js';
import { formatDuration } from '@/lib/format.js';
import type { OpportunityTag } from '@/lib/workflow-metrics.js';
import type { HighVarianceTileState } from '@/lib/dashboard-band-stats.js';

export interface KpiTileData {
  totalWorkflows: number;
  recordedThisMonth: number;
  /** Median cycle time across workflow means (ms), or null when no data. */
  medianCycleTimeMs: number | null;
  /** Count of workflows whose median cycle time is non-null (the denominator). */
  cycleTimeSampleCount: number;
  automationCandidates: number;
  /**
   * SIGNALS #4: the honest High-Variance tile state — count of high-variation
   * workflows with the multi-run (runs ≥ 2) honest denominator. `available`
   * false ⇒ render the "needs ≥2 runs" state, never a fabricated 0.
   */
  highVariance: HighVarianceTileState;
}

type KpiTileId =
  | 'total_workflows'
  | 'cycle_time'
  | 'automation_candidates'
  | 'high_variance';

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
    highVariance,
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

      {/* Tile 4 — High-Variance Workflows (SIGNALS #4) — non-interactive.
          Variation is a PROXY (run-to-run observed variation), labeled as such.
          The denominator is gated to MULTI-RUN workflows (runs ≥ 2) because
          variation is undefined for a single run. When there are no multi-run
          workflows the tile shows an honest "—" + "needs ≥2 runs" rather than a
          fabricated 0. No DPMO/sigma/CV. */}
      <TileShell
        tileId="high_variance"
        label="High-Variance Workflows"
        value={highVariance.available ? String(highVariance.count) : '—'}
        trackValue={highVariance.available ? highVariance.count : null}
        provenance="Workflows with high run-to-run variation — a consistency proxy, not a defect rate. Counted only across multi-run workflows (variation needs ≥2 runs). The standardize signal."
      >
        {highVariance.available
          ? `of ${highVariance.multiRunCount} multi-run workflow${highVariance.multiRunCount === 1 ? '' : 's'}`
          : 'needs ≥2 runs to measure'}
      </TileShell>
    </div>
  );
}
