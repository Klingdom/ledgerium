/**
 * time-sink-view — pure view-derivation helpers for the Portfolio Time-Sink
 * Ranking page (T1 / Cross-Workflow Intelligence program).
 *
 * The API (`GET /api/analytics/time-sinks`) already returns a fully-computed,
 * pre-sorted `PortfolioTimeSinkReport`. This module contains ZERO business
 * logic of its own — it only derives presentation-ready strings/numbers
 * (labels, bar widths, honesty states) from that report, the same
 * separation used by `dashboard-band-stats.ts` for `PortfolioTimestudyBand`.
 *
 * Kept pure and framework-free so it is directly unit-testable in this
 * repo's node-environment vitest config (no jsdom/testing-library
 * dependency), matching the `UsageQuotaMeter` / `deriveQuotaState`
 * state-derivation pattern.
 *
 * Determinism: no `Date.now()` / `Math.random()` / IO. Same report in →
 * same display object out.
 */

import { formatDuration } from './format.js';
import type {
  PortfolioTimeSinkEntry,
  PortfolioTimeSinkReport,
} from '@ledgerium/intelligence-engine';

// ─── Fetch/view status ────────────────────────────────────────────────────────

/**
 * The full set of visible states the page can be in. Every branch is
 * rendered explicitly by the component — never a silent blank screen.
 *
 *  - 'loading'              — request in flight
 *  - 'unauthorized'         — 401 (no session)
 *  - 'forbidden'            — 403 (plan does not include intelligenceLayer)
 *  - 'error'                — network failure, non-2xx other than 401/403, or malformed body
 *  - 'empty-no-workflows'   — 200, zero workflows in scope
 *  - 'empty-no-coverage'    — 200, workflows exist but none have timing data yet
 *  - 'ready'                — 200, at least one covered workflow
 */
export type TimeSinkViewState =
  | 'loading'
  | 'unauthorized'
  | 'forbidden'
  | 'error'
  | 'empty-no-workflows'
  | 'empty-no-coverage'
  | 'ready';

export interface DeriveViewStateParams {
  isLoading: boolean;
  /** HTTP status of the most recent response, or null before the first response/on network failure. */
  httpStatus: number | null;
  /** Whether the fetch itself threw (network error / JSON parse failure). */
  hasNetworkError: boolean;
  report: PortfolioTimeSinkReport | null;
}

export function deriveTimeSinkViewState(params: DeriveViewStateParams): TimeSinkViewState {
  const { isLoading, httpStatus, hasNetworkError, report } = params;

  if (isLoading) return 'loading';
  if (hasNetworkError) return 'error';
  if (httpStatus === 401) return 'unauthorized';
  if (httpStatus === 403) return 'forbidden';
  if (httpStatus !== 200) return 'error';
  if (!report) return 'error';
  if (report.totals.workflowCount === 0) return 'empty-no-workflows';
  if (report.totals.coveredWorkflowCount === 0) return 'empty-no-coverage';
  return 'ready';
}

// ─── Portfolio totals display ────────────────────────────────────────────────

export interface PortfolioTotalsDisplay {
  totalTimeLabel: string;
  /** e.g. "8 of 12 workflows have timing data" */
  coverageLabel: string;
  workflowCount: number;
  coveredWorkflowCount: number;
  /** True when every workflow in scope has contributed real timing data. */
  isFullyCovered: boolean;
}

export function deriveTotalsDisplay(report: PortfolioTimeSinkReport): PortfolioTotalsDisplay {
  const { totalTimeMs, workflowCount, coveredWorkflowCount } = report.totals;
  return {
    totalTimeLabel: totalTimeMs > 0 ? formatDuration(totalTimeMs) : '—',
    coverageLabel: `${coveredWorkflowCount} of ${workflowCount} workflow${workflowCount === 1 ? '' : 's'} ${workflowCount === 1 ? 'has' : 'have'} timing data`,
    workflowCount,
    coveredWorkflowCount,
    isFullyCovered: workflowCount > 0 && coveredWorkflowCount === workflowCount,
  };
}

// ─── Per-entry display ────────────────────────────────────────────────────────

export interface TimeSinkEntryDisplay {
  workflowId: string;
  title: string;
  /** 1-based rank in the (already-sorted) ranked list. */
  rank: number;
  runCount: number;
  hasTimingData: boolean;
  aggregateTimeLabel: string;
  pctOfPortfolioTime: number;
  /** Formatted percent, e.g. "23.4%". */
  pctLabel: string;
  /** Bar fill width in [0,100]. A tiny nonzero share is floored to 1 so a real
   *  (if small) contributor never renders as an invisible sliver. */
  barWidthPct: number;
  bottleneckLabel: string | null;
  bottleneckSeverity: 'high' | 'moderate' | null;
  rangeLabel: string | null;
  /** "computed from N runs" or "no timing yet" — the evidence-linkage cue. */
  evidenceLabel: string;
  evidenceRunCount: number;
  /** True when the row should render in a de-emphasized/muted treatment. */
  deemphasized: boolean;
}

function formatRangePart(ms: number | null): string {
  return ms == null ? '—' : formatDuration(ms);
}

function deriveRangeLabel(entry: PortfolioTimeSinkEntry): string | null {
  const range = entry.stepDurationRange;
  if (!range) return null;
  return `min ${formatRangePart(range.minMs)} · median ${formatRangePart(range.medianMs)} · p90 ${formatRangePart(range.p90Ms)} · max ${formatRangePart(range.maxMs)}`;
}

function deriveBottleneckLabel(entry: PortfolioTimeSinkEntry): string | null {
  const b = entry.topBottleneck;
  if (!b) return null;
  return `${b.category} · ${b.durationRatio.toFixed(1)}× avg step · +${formatDuration(b.delayMs)} slower than average`;
}

/**
 * Derive one row's full display state from its API entry.
 * Pure; a given entry always produces the same display object.
 */
export function deriveEntryDisplay(entry: PortfolioTimeSinkEntry, rank: number): TimeSinkEntryDisplay {
  const { hasTimingData } = entry;
  const rawPct = Math.max(0, Math.min(100, entry.pctOfPortfolioTime));
  const barWidthPct = hasTimingData && rawPct > 0 ? Math.max(rawPct, 1) : 0;
  const evidenceRunCount = entry.evidenceRunIds.length;

  return {
    workflowId: entry.workflowId,
    title: entry.title,
    rank,
    runCount: entry.runCount,
    hasTimingData,
    aggregateTimeLabel: hasTimingData ? formatDuration(entry.aggregateTimeMs) : '—',
    pctOfPortfolioTime: rawPct,
    pctLabel: hasTimingData ? `${rawPct.toFixed(1)}%` : '—',
    barWidthPct,
    bottleneckLabel: deriveBottleneckLabel(entry),
    bottleneckSeverity: entry.topBottleneck?.severity ?? null,
    rangeLabel: deriveRangeLabel(entry),
    evidenceLabel:
      evidenceRunCount > 0
        ? `computed from ${evidenceRunCount} run${evidenceRunCount === 1 ? '' : 's'}`
        : 'no timing yet',
    evidenceRunCount,
    deemphasized: !hasTimingData,
  };
}

/**
 * Derive the full ranked display list, preserving the API's sort order
 * (aggregateTimeMs desc, tie-break workflowId asc — see `aggregateTimeSinks`)
 * and attaching a 1-based rank per row.
 */
export function deriveRankedEntryDisplays(
  ranked: PortfolioTimeSinkEntry[],
): TimeSinkEntryDisplay[] {
  return ranked.map((entry, i) => deriveEntryDisplay(entry, i + 1));
}

// ─── Misc formatting ──────────────────────────────────────────────────────────

/** Title-case a plan slug for display, e.g. "team" -> "Team". */
export function formatPlanName(plan: string | undefined): string {
  if (!plan) return 'a higher plan';
  return plan.charAt(0).toUpperCase() + plan.slice(1);
}
