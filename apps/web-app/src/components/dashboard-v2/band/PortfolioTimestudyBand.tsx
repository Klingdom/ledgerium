'use client';

/**
 * PortfolioTimestudyBand — an observed-only "baseline timestudy" summary over the
 * currently-shown workflow library, rendered BOTH above and below the list so the
 * library reads like a report (header summary + footer total).
 *
 * Five tiles (WORKFLOW_LIBRARY_SUMMARY_REVIEW_001 §5): Avg Cycle Time (hero) ·
 * Total Cases · Avg Runs/Workflow · Avg Systems/Workflow · Avg Health Score.
 *
 * HONESTY (enforced by the values from `computePortfolioSummary`, surfaced here):
 *  - Every average shows its honest denominator; missing → "—" (no fabricated 0).
 *  - Cycle time is a PROXY on per-workflow durations (no per-run array yet) — the
 *    case-weighted mean is labeled "case-weighted · proxy".
 *  - Systems is per-WORKFLOW, not per-run — labeled "observed".
 *  - Health score is plan-gated: fully-gated → upsell state, never a number.
 *  - Scope is explicit: "across N of M workflows" so a filtered baseline is honest.
 *
 * Pure presentation: no Date.now()/Math.random(); all arithmetic lives in
 * `computePortfolioSummary`.
 */

import { formatDuration } from '@/lib/format.js';
import type { PortfolioSummary } from '@/lib/dashboard-band-stats.js';

interface PortfolioTimestudyBandProps {
  summary: PortfolioSummary;
  /** Total workflows in the library — the M in "across N of M workflows". */
  totalWorkflowCount: number;
  /** 'top' renders a header rule; 'bottom' renders a footer rule. */
  position: 'top' | 'bottom';
}

interface SummaryTileProps {
  label: string;
  value: string;
  subtext: string;
  provenance: string;
  hero?: boolean;
  muted?: boolean;
}

function SummaryTile({ label, value, subtext, provenance, hero, muted }: SummaryTileProps) {
  return (
    <div
      title={provenance}
      role="group"
      aria-label={`${label}: ${value}. ${subtext}. ${provenance}`}
      className="flex flex-col items-start gap-ds-1 rounded-ds-md border border-[var(--border-subtle)] bg-[var(--surface-primary)] px-ds-4 py-ds-3 text-left"
    >
      <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--content-secondary)]">
        {label}
      </span>
      <span
        className={`font-semibold leading-none tabular-nums ${
          hero ? 'text-[30px]' : 'text-[24px]'
        } ${muted ? 'text-[var(--content-tertiary)]' : 'text-[var(--content-primary)]'}`}
      >
        {value}
      </span>
      <span className="min-h-[16px] text-[12px] text-[var(--content-secondary)]">{subtext}</span>
    </div>
  );
}

export default function PortfolioTimestudyBand({
  summary,
  totalWorkflowCount,
  position,
}: PortfolioTimestudyBandProps) {
  const {
    workflowCount,
    totalRuns,
    avgRuns,
    runBearingCount,
    caseWeightedCycleTimeMs,
    cycleTimeSampleCount,
    cycleTimeRunCount,
    avgSystemsPerWorkflow,
    systemsSampleCount,
    avgHealthScore,
    healthSampleCount,
    healthFullyGated,
  } = summary;

  const isFiltered = workflowCount < totalWorkflowCount;
  const scopeLabel = isFiltered
    ? `across ${workflowCount} of ${totalWorkflowCount} workflows`
    : `across all ${totalWorkflowCount} workflow${totalWorkflowCount === 1 ? '' : 's'}`;

  const edgeClass =
    position === 'top'
      ? 'border-b border-[var(--border-subtle)] pb-ds-4'
      : 'border-t border-[var(--border-subtle)] pt-ds-4';

  // No workflows in scope (e.g. a filter matched nothing): show only the honest
  // scope line — never zero-filled tiles that look like real measurements.
  if (workflowCount === 0) {
    return (
      <section aria-label="Portfolio timestudy summary" className={`${edgeClass} my-ds-3`}>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--content-tertiary)]">
          Portfolio Timestudy
        </p>
        <p className="mt-1 text-ds-sm text-[var(--content-secondary)]">
          No workflows match the current filters.
        </p>
      </section>
    );
  }

  return (
    <section aria-label="Portfolio timestudy summary" className={`${edgeClass} my-ds-3`}>
      <p className="mb-ds-2 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-[var(--content-tertiary)]">
          Portfolio Timestudy
        </span>
        <span className="text-[11px] text-[var(--content-tertiary)]">· {scopeLabel}</span>
        <span className="text-[10px] italic text-[var(--content-tertiary)]">
          · observed only — every figure traces to recorded runs
        </span>
      </p>

      <div className="grid grid-cols-2 gap-ds-3 sm:grid-cols-3 lg:grid-cols-5" role="group" aria-label="Timestudy metrics">
        {/* 1 — Avg Cycle Time (hero) — case-weighted mean (proxy). */}
        <SummaryTile
          hero
          label="Avg Cycle Time"
          value={caseWeightedCycleTimeMs != null ? formatDuration(caseWeightedCycleTimeMs) : '—'}
          subtext={
            caseWeightedCycleTimeMs != null
              ? `case-weighted · ${cycleTimeSampleCount} timed · ${cycleTimeRunCount} runs`
              : 'no timed workflows with runs'
          }
          provenance="Case-weighted mean of each workflow's mean run duration (Σ duration×runs ÷ Σ runs). A proxy on per-workflow durations — not a true per-run mean — until per-run timing lands. Shown as time, not a target."
        />

        {/* 2 — Total Cases (Σ runs). */}
        <SummaryTile
          label="Total Cases"
          value={String(totalRuns)}
          subtext={`observed runs · across ${runBearingCount} workflow${runBearingCount === 1 ? '' : 's'}`}
          provenance="Sum of confirmed observed runs across workflows with a process definition. The total observation volume behind every metric here."
        />

        {/* 3 — Avg Runs / Workflow. */}
        <SummaryTile
          label="Avg Runs / Workflow"
          value={avgRuns != null ? String(avgRuns) : '—'}
          subtext={
            avgRuns != null
              ? `across ${runBearingCount} workflow${runBearingCount === 1 ? '' : 's'} with runs`
              : 'no workflows with runs yet'
          }
          provenance="Average confirmed runs per workflow, across only workflows that have at least one recorded run. A measure of how deeply each process is characterized."
        />

        {/* 4 — Avg Systems / Workflow (observed; per workflow, not per run). */}
        <SummaryTile
          label="Avg Systems / Workflow"
          value={avgSystemsPerWorkflow != null ? String(avgSystemsPerWorkflow) : '—'}
          subtext={
            avgSystemsPerWorkflow != null
              ? `observed · across ${systemsSampleCount} workflow${systemsSampleCount === 1 ? '' : 's'}`
              : 'no systems observed yet'
          }
          provenance="Average distinct systems observed per workflow (the tools captured during recording). This is per workflow, not per run — there is no per-run system attribution yet."
        />

        {/* 5 — Avg Health Score (plan-gated). */}
        <SummaryTile
          label="Avg Health Score"
          muted={healthFullyGated}
          value={healthFullyGated ? '—' : avgHealthScore != null ? String(avgHealthScore) : '—'}
          subtext={
            healthFullyGated
              ? 'Upgrade to see health scores'
              : avgHealthScore != null
              ? `across ${healthSampleCount} scored workflow${healthSampleCount === 1 ? '' : 's'}`
              : 'no scored workflows'
          }
          provenance={
            healthFullyGated
              ? 'Portfolio health score requires a plan with health-score access. No number is shown rather than a fabricated average.'
              : 'Average of each workflow\'s overall health score (0–100), across only workflows whose score is visible on your plan.'
          }
        />
      </div>
    </section>
  );
}
