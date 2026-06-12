'use client';

/**
 * KpiTileStrip — 4 KPI tiles for the top-of-page band.
 *
 * Tiles (DASHBOARD_REDESIGN_REVIEW item 7 / DD-3):
 *   1. Total Workflows (hero, largest) — secondary: "+N recorded this month"
 *   2. Median Cycle Time (across workflows) — secondary: honest "across N workflows"
 *   3. Automation Candidates (aiOpportunityCount) — secondary: "of M workflows"
 *   4. Avg Health Score — DELTA shown (portfolioHealthScore + delta; the ONLY
 *      tile with a true prior-period value).
 *
 * HONESTY (ANALYTICS_DASHBOARD_REVIEW §6):
 *   Only Avg Health has a real prior-period value, so it is the ONLY tile that
 *   shows a "vs last 30d" delta. The other three show an honest secondary stat,
 *   never a fabricated percentage. Missing values render "—".
 *
 * @batch B (2026-06-12)
 */

import { ArrowDown, ArrowUp, Minus } from 'lucide-react';
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
  /** Avg portfolio health 0–100, or null while loading / no data. */
  avgHealthScore: number | null;
  /** Period-over-period health delta; null when prior period has < 3 workflows. */
  avgHealthScoreDelta: number | null;
}

type KpiTileId =
  | 'total_workflows'
  | 'cycle_time'
  | 'automation_candidates'
  | 'avg_health';

interface KpiTileStripProps {
  data: KpiTileData;
}

function HealthDelta({ delta }: { delta: number | null }) {
  if (delta === null) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[12px] font-medium text-[var(--content-tertiary)]">
        <Minus size={10} aria-hidden="true" />
        <span>— vs last 30d</span>
      </span>
    );
  }
  if (delta === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[12px] font-medium text-[var(--content-tertiary)]">
        <Minus size={10} aria-hidden="true" />
        <span>= 0 vs last 30d</span>
      </span>
    );
  }
  const up = delta > 0;
  const Icon = up ? ArrowUp : ArrowDown;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[12px] font-medium ${
        up ? 'text-green-600' : 'text-red-600'
      }`}
    >
      <Icon size={10} aria-hidden="true" />
      <span>{`${up ? '+' : ''}${delta} vs last 30d`}</span>
    </span>
  );
}

interface TileShellProps {
  tileId: KpiTileId;
  label: string;
  value: string;
  hero?: boolean;
  trackValue: number | null;
  children: React.ReactNode;
}

function TileShell({ tileId, label, value, hero, trackValue, children }: TileShellProps) {
  return (
    <button
      type="button"
      onClick={() =>
        track({ event: 'dashboard_kpi_tile_clicked', tileId, value: trackValue })
      }
      className="
        flex flex-col items-start gap-ds-1 rounded-ds-md border border-[var(--border-subtle)]
        bg-[var(--surface-primary)] px-ds-4 py-ds-3 text-left
        transition-colors duration-150 hover:bg-[var(--surface-secondary)]
        focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500
      "
      aria-label={`${label}: ${value}`}
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
      <div className="min-h-[16px] text-[12px] text-[var(--content-tertiary)]">
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
    avgHealthScore,
    avgHealthScoreDelta,
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
      >
        {cycleTimeSampleCount > 0
          ? `across ${cycleTimeSampleCount} workflow${cycleTimeSampleCount === 1 ? '' : 's'}`
          : 'no timed workflows yet'}
      </TileShell>

      {/* Tile 3 — Automation Candidates */}
      <TileShell
        tileId="automation_candidates"
        label="Automation Candidates"
        value={String(automationCandidates)}
        trackValue={automationCandidates}
      >
        {`of ${totalWorkflows} workflow${totalWorkflows === 1 ? '' : 's'}`}
      </TileShell>

      {/* Tile 4 — Avg Health Score (the only tile with a true delta) */}
      <TileShell
        tileId="avg_health"
        label="Avg Health Score"
        value={avgHealthScore !== null ? String(Math.round(avgHealthScore)) : '—'}
        trackValue={avgHealthScore}
      >
        <HealthDelta delta={avgHealthScoreDelta} />
      </TileShell>
    </div>
  );
}
