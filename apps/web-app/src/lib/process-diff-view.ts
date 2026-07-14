/**
 * process-diff-view — pure view-derivation helpers for the N-Way Process
 * Diff page (T2 / Cross-Workflow Intelligence program; design source
 * `docs/meta/TIMESTUDY_INTELLIGENCE_REVIEW_001/ux_analysis.md` §2 "N-Way
 * Process Diff").
 *
 * The API (`POST /api/analytics/process-diff`) already returns a fully
 * computed, deterministic `ProcessDiffReport` (aligned rows + per-workflow
 * summaries). This module contains ZERO business logic of its own — it only
 * derives presentation-ready strings/numbers/classes (column ordering,
 * per-cell status styling, signed duration deltas, proportional bar widths,
 * evidence cues, and the empty/loading/error/gated/insufficient states) from
 * that report, the same separation `time-sink-view.ts` uses for the T1
 * Portfolio Time-Sink Ranking page.
 *
 * Kept pure and framework-free so it is directly unit-testable in this
 * repo's node-environment vitest config (no jsdom/testing-library
 * dependency) — matching the `time-sink-view.ts` / `UsageQuotaMeter`
 * state-derivation pattern this file mirrors.
 *
 * Determinism: no `Date.now()` / `Math.random()` / IO. Same report + same
 * title lookup in -> same display objects out.
 */

import { formatDuration } from './format.js';
import type {
  ProcessDiffReport,
  ProcessDiffRow,
  ProcessDiffCell,
  ProcessDiffCellStatus,
  ProcessDiffWorkflowSummary,
} from '@ledgerium/intelligence-engine';

// ─── Selection state (client-side, before any fetch) ──────────────────────────

/**
 * Governs the workflow-picker affordances. Computed purely from the count of
 * workflows available to pick from and the count currently selected — no
 * network state involved. The API contract caps the request at 2..6
 * workflow IDs (`processDiffSchema`), mirrored here so the UI can explain a
 * disabled "Compare" action before ever making a request.
 */
export type ProcessDiffSelectionState =
  | 'no-workflows-available'
  | 'need-more-selection'
  | 'too-many-selected'
  | 'ready-to-compare';

export const MIN_COMPARE_WORKFLOWS = 2;
export const MAX_COMPARE_WORKFLOWS = 6;

export function deriveSelectionState(
  selectedCount: number,
  workflowsAvailableTotal: number,
): ProcessDiffSelectionState {
  if (workflowsAvailableTotal < MIN_COMPARE_WORKFLOWS) return 'no-workflows-available';
  if (selectedCount < MIN_COMPARE_WORKFLOWS) return 'need-more-selection';
  if (selectedCount > MAX_COMPARE_WORKFLOWS) return 'too-many-selected';
  return 'ready-to-compare';
}

// ─── Fetch/view state (governs the diff-report request cycle) ────────────────

/**
 * The full set of visible states the diff results area can be in. Every
 * branch is rendered explicitly by the component — never a silent blank
 * screen.
 *
 *  - 'idle'                   — no request made yet (selection not ready, or
 *                                the user hasn't triggered a compare)
 *  - 'loading'                — request in flight
 *  - 'unauthorized'           — 401 (no session)
 *  - 'gated'                  — 403 (plan does not include intelligenceLayer)
 *  - 'insufficient-workflows' — 422 INSUFFICIENT_WORKFLOWS or
 *                                BASELINE_UNAVAILABLE — fewer than 2 of the
 *                                selected workflows have usable recorded
 *                                process output (an expected, recoverable
 *                                condition, not a system error)
 *  - 'error'                  — network failure, malformed envelope, or any
 *                                other non-2xx status
 *  - 'ready'                  — 200, a usable `ProcessDiffReport`
 */
export type ProcessDiffFetchState =
  | 'idle'
  | 'loading'
  | 'unauthorized'
  | 'gated'
  | 'insufficient-workflows'
  | 'error'
  | 'ready';

export interface DeriveProcessDiffFetchStateParams {
  isLoading: boolean;
  /** HTTP status of the most recent response, or null before any request/on network failure. */
  httpStatus: number | null;
  /** Whether the fetch itself threw (network error / JSON parse failure). */
  hasNetworkError: boolean;
  /** `error.code` from the response envelope, or null when there is no error. */
  errorCode: string | null;
  report: ProcessDiffReport | null;
}

const INSUFFICIENT_ERROR_CODES = new Set(['INSUFFICIENT_WORKFLOWS', 'BASELINE_UNAVAILABLE']);

export function deriveProcessDiffFetchState(params: DeriveProcessDiffFetchStateParams): ProcessDiffFetchState {
  const { isLoading, httpStatus, hasNetworkError, errorCode, report } = params;

  if (isLoading) return 'loading';
  if (hasNetworkError) return 'error';
  if (httpStatus === null) return 'idle';
  if (httpStatus === 401) return 'unauthorized';
  if (httpStatus === 403) return 'gated';
  if (httpStatus === 422 && errorCode !== null && INSUFFICIENT_ERROR_CODES.has(errorCode)) {
    return 'insufficient-workflows';
  }
  if (httpStatus !== 200) return 'error';
  if (!report) return 'error';
  return 'ready';
}

// ─── Delta formatting ──────────────────────────────────────────────────────────

/**
 * Signed, human-readable duration delta, e.g. "+12s", "-3s", "±0". Returns
 * null when the delta is unavailable (never fabricated) so callers can
 * render an honest "—" instead.
 */
export function formatSignedDurationDelta(deltaMs: number | null): string | null {
  if (deltaMs === null) return null;
  if (deltaMs === 0) return '±0';
  const sign = deltaMs > 0 ? '+' : '-';
  return `${sign}${formatDuration(Math.abs(deltaMs))}`;
}

/**
 * Direction class for a duration delta vs. baseline. More time than baseline
 * (positive delta) reads as slower/worse (red); less time (negative delta)
 * reads as faster/better (emerald) — mirrors the `DIR_CLASS` convention in
 * `/compare`'s baseline/after comparison.
 */
export function deriveDeltaDirectionClass(deltaMs: number | null, isBaseline: boolean): string {
  if (isBaseline || deltaMs === null || deltaMs === 0) return 'text-[var(--content-tertiary)]';
  return deltaMs > 0 ? 'text-red-600' : 'text-emerald-600';
}

// ─── Evidence cue ──────────────────────────────────────────────────────────────

export function formatEvidenceLabel(evidenceRunCount: number): string {
  if (evidenceRunCount <= 0) return 'no evidence runs available';
  return `computed from ${evidenceRunCount} run${evidenceRunCount === 1 ? '' : 's'}`;
}

// ─── Per-cell status styling ───────────────────────────────────────────────────

export const PROCESS_DIFF_STATUS_LABEL: Record<ProcessDiffCellStatus, string> = {
  matched: 'Matched',
  added: 'Added',
  removed: 'Removed',
  reordered: 'Reordered',
  absent: 'Not present',
};

export interface ProcessDiffStatusStyle {
  bgClass: string;
  textClass: string;
  borderClass: string;
  strikethrough: boolean;
}

export const PROCESS_DIFF_STATUS_STYLE: Record<ProcessDiffCellStatus, ProcessDiffStatusStyle> = {
  matched: {
    bgClass: 'bg-[var(--surface-primary)]',
    textClass: 'text-[var(--content-primary)]',
    borderClass: 'border-[var(--border-subtle)]',
    strikethrough: false,
  },
  added: {
    bgClass: 'bg-emerald-50',
    textClass: 'text-emerald-700',
    borderClass: 'border-emerald-200',
    strikethrough: false,
  },
  removed: {
    bgClass: 'bg-red-50',
    textClass: 'text-red-700',
    borderClass: 'border-red-200',
    strikethrough: true,
  },
  reordered: {
    bgClass: 'bg-amber-50',
    textClass: 'text-amber-700',
    borderClass: 'border-amber-200',
    strikethrough: false,
  },
  absent: {
    bgClass: 'bg-[var(--surface-secondary)]',
    textClass: 'text-[var(--content-tertiary)]',
    borderClass: 'border-[var(--border-subtle)]',
    strikethrough: false,
  },
};

/** A tiny nonzero share is floored so a real (if small) step never renders an invisible sliver. */
const MIN_VISIBLE_BAR_PCT = 4;

// ─── Column (workflow) display, baseline-first ────────────────────────────────

export interface ProcessDiffColumnDisplay {
  workflowId: string;
  title: string;
  isBaseline: boolean;
  matched: number;
  added: number;
  removed: number;
  reordered: number;
  totalDurationLabel: string;
  /** Signed delta vs. the baseline's total duration; null for the baseline column itself or when unavailable. */
  deltaLabel: string | null;
  deltaDirectionClass: string;
}

function deriveColumn(
  summary: ProcessDiffWorkflowSummary,
  isBaseline: boolean,
  titlesById: Record<string, string>,
): ProcessDiffColumnDisplay {
  return {
    workflowId: summary.workflowId,
    title: titlesById[summary.workflowId] ?? 'Untitled workflow',
    isBaseline,
    matched: summary.matched,
    added: summary.added,
    removed: summary.removed,
    reordered: summary.reordered,
    totalDurationLabel: summary.totalDurationMs !== null ? formatDuration(summary.totalDurationMs) : '—',
    deltaLabel: isBaseline ? null : formatSignedDurationDelta(summary.deltaVsBaselineMs),
    deltaDirectionClass: deriveDeltaDirectionClass(summary.deltaVsBaselineMs, isBaseline),
  };
}

/**
 * Order columns baseline-first, then the remaining workflows in whatever
 * order `report.summaries` provides them (the engine sorts non-baseline
 * workflows by `workflowId` ascending — see `compareWorkflows.ts` — so this
 * ordering is itself deterministic, not merely "whatever order arrived").
 */
export function deriveProcessDiffColumns(
  report: ProcessDiffReport,
  titlesById: Record<string, string>,
): ProcessDiffColumnDisplay[] {
  const baseline = report.summaries.find((s) => s.workflowId === report.baselineId);
  const others = report.summaries.filter((s) => s.workflowId !== report.baselineId);
  const ordered: Array<[ProcessDiffWorkflowSummary, boolean]> = [];
  if (baseline) ordered.push([baseline, true]);
  for (const s of others) ordered.push([s, false]);
  return ordered.map(([s, isBaseline]) => deriveColumn(s, isBaseline, titlesById));
}

// ─── Structural (aligned-steps) grid ───────────────────────────────────────────

export interface ProcessDiffCellDisplay {
  workflowId: string;
  status: ProcessDiffCellStatus;
  statusLabel: string;
  stepLabel: string | null;
  durationLabel: string;
  /** Signed delta vs. the baseline's step at this row; null for the baseline column or when unavailable. */
  deltaLabel: string | null;
  /** Bar-fill width in [0,100], proportional to `durationMs` among this row's present cells. 0 when no duration is known. */
  barWidthPct: number;
  bgClass: string;
  textClass: string;
  borderClass: string;
  strikethrough: boolean;
  ariaLabel: string;
}

export interface ProcessDiffGridRow {
  rowIndex: number;
  /** True for a pure-insertion row (no corresponding baseline step at all). */
  isInsertionRow: boolean;
  rowLabel: string;
  cells: ProcessDiffCellDisplay[];
}

export interface ProcessDiffGrid {
  columns: ProcessDiffColumnDisplay[];
  rows: ProcessDiffGridRow[];
  evidenceLabel: string;
  evidenceRunCount: number;
}

function deriveCell(
  cell: ProcessDiffCell | undefined,
  workflowId: string,
  columnTitle: string,
  isBaselineColumn: boolean,
  maxDurationMs: number | null,
): ProcessDiffCellDisplay {
  const status: ProcessDiffCellStatus = cell?.status ?? 'absent';
  const style = PROCESS_DIFF_STATUS_STYLE[status];
  const durationMs = cell?.durationMs ?? null;
  const stepLabel = cell?.label ?? null;

  const rawPct =
    durationMs !== null && maxDurationMs !== null && maxDurationMs > 0
      ? Math.max(0, Math.min(100, (durationMs / maxDurationMs) * 100))
      : 0;
  const barWidthPct = rawPct > 0 ? Math.max(rawPct, MIN_VISIBLE_BAR_PCT) : 0;

  const durationLabel = durationMs !== null ? formatDuration(durationMs) : '—';
  const deltaLabel = isBaselineColumn ? null : formatSignedDurationDelta(cell?.deltaVsBaselineMs ?? null);

  const ariaParts = [`${columnTitle}: ${PROCESS_DIFF_STATUS_LABEL[status]}`];
  if (stepLabel) ariaParts.push(stepLabel);
  if (durationMs !== null) ariaParts.push(durationLabel);
  if (deltaLabel) ariaParts.push(`${deltaLabel} vs baseline`);

  return {
    workflowId,
    status,
    statusLabel: PROCESS_DIFF_STATUS_LABEL[status],
    stepLabel,
    durationLabel,
    deltaLabel,
    barWidthPct,
    bgClass: style.bgClass,
    textClass: style.textClass,
    borderClass: style.borderClass,
    strikethrough: style.strikethrough,
    ariaLabel: ariaParts.join(', '),
  };
}

function deriveGridRow(
  row: ProcessDiffRow,
  rowIndex: number,
  columnOrder: ProcessDiffColumnDisplay[],
): ProcessDiffGridRow {
  const durations = columnOrder
    .map((col) => row.cells[col.workflowId]?.durationMs ?? null)
    .filter((d): d is number => d !== null);
  const maxDurationMs = durations.length > 0 ? Math.max(...durations) : null;

  const isInsertionRow = row.baselineKey === null;

  return {
    rowIndex,
    isInsertionRow,
    rowLabel: isInsertionRow ? 'New step (not in baseline)' : row.baselineLabel ?? row.baselineKey ?? '',
    cells: columnOrder.map((col) =>
      deriveCell(row.cells[col.workflowId], col.workflowId, col.title, col.isBaseline, maxDurationMs),
    ),
  };
}

/**
 * Derive the full structural (aligned-steps) grid: baseline-first columns +
 * one row per aligned step slot, each cell styled by its diff status with a
 * duration bar proportional to the row's present durations — a matched-but-
 * wider block reads instantly as "same step, much slower here."
 */
export function deriveProcessDiffGrid(
  report: ProcessDiffReport,
  titlesById: Record<string, string>,
): ProcessDiffGrid {
  const columns = deriveProcessDiffColumns(report, titlesById);
  const rows = report.rows.map((row, i) => deriveGridRow(row, i, columns));
  const evidenceRunCount = report.evidenceRunIds.length;
  return {
    columns,
    rows,
    evidenceLabel: formatEvidenceLabel(evidenceRunCount),
    evidenceRunCount,
  };
}

// ─── Temporal ("same-scale timeline") lens ─────────────────────────────────────

/**
 * A step segment within one workflow's own proportional timeline bar. Built
 * directly from that workflow's non-`absent`/non-`removed` cells (i.e. steps
 * it actually has), in the row-aligned order the API already returns.
 *
 * Known simplification (flagged, not fabricated): for a `reordered` step,
 * this reflects its position aligned to the baseline's anchor row, not
 * necessarily that workflow's own original chronological position — the API
 * does not separately expose each non-baseline workflow's raw step order, so
 * an exact per-workflow chronological timeline is not derivable from the
 * currently-shipped contract. Segments with an unknown duration are excluded
 * from the proportional bar (never rendered with a fabricated width) and
 * counted in `unknownDurationStepCount` instead.
 */
export interface ProcessDiffTemporalSegment {
  key: string;
  stepLabel: string | null;
  status: ProcessDiffCellStatus;
  durationMs: number;
  /** Width in [0,100], proportional to the shared max total duration across all compared workflows. */
  widthPct: number;
  bgClass: string;
  textClass: string;
}

export interface ProcessDiffTemporalColumn {
  workflowId: string;
  title: string;
  isBaseline: boolean;
  totalDurationLabel: string;
  segments: ProcessDiffTemporalSegment[];
  unknownDurationStepCount: number;
}

export function deriveProcessDiffTemporalColumns(
  report: ProcessDiffReport,
  titlesById: Record<string, string>,
): ProcessDiffTemporalColumn[] {
  const columns = deriveProcessDiffColumns(report, titlesById);

  const totals = report.summaries
    .map((s) => s.totalDurationMs)
    .filter((d): d is number => d !== null && d > 0);
  const sharedMaxTotalMs = totals.length > 0 ? Math.max(...totals) : null;

  return columns.map((col) => {
    const segments: ProcessDiffTemporalSegment[] = [];
    let unknownDurationStepCount = 0;

    for (const row of report.rows) {
      const cell = row.cells[col.workflowId];
      if (!cell || cell.status === 'absent' || cell.status === 'removed') continue;

      if (cell.durationMs === null) {
        unknownDurationStepCount++;
        continue;
      }

      const widthPct =
        sharedMaxTotalMs !== null && sharedMaxTotalMs > 0
          ? Math.max(0, Math.min(100, (cell.durationMs / sharedMaxTotalMs) * 100))
          : 0;
      const style = PROCESS_DIFF_STATUS_STYLE[cell.status];

      segments.push({
        key: row.baselineKey ?? `insertion-${segments.length}`,
        stepLabel: cell.label,
        status: cell.status,
        durationMs: cell.durationMs,
        widthPct,
        bgClass: style.bgClass,
        textClass: style.textClass,
      });
    }

    return {
      workflowId: col.workflowId,
      title: col.title,
      isBaseline: col.isBaseline,
      totalDurationLabel: col.totalDurationLabel,
      segments,
      unknownDurationStepCount,
    };
  });
}

// ─── Lens toggle ────────────────────────────────────────────────────────────────

export type ProcessDiffLens = 'structural' | 'temporal';
