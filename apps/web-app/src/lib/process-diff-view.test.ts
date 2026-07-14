/**
 * process-diff-view — state-derivation unit tests.
 *
 * Environment: Vitest (node) — no jsdom, no React rendering. Mirrors the
 * `time-sink-view.test.ts` / `UsageQuotaMeter.test.tsx` pure-helper test
 * convention used across `apps/web-app`.
 */

import { describe, expect, it } from 'vitest';
import {
  MIN_COMPARE_WORKFLOWS,
  MAX_COMPARE_WORKFLOWS,
  deriveSelectionState,
  deriveProcessDiffFetchState,
  formatSignedDurationDelta,
  deriveDeltaDirectionClass,
  formatEvidenceLabel,
  PROCESS_DIFF_STATUS_LABEL,
  PROCESS_DIFF_STATUS_STYLE,
  deriveProcessDiffColumns,
  deriveProcessDiffGrid,
  deriveProcessDiffTemporalColumns,
} from './process-diff-view';
import type {
  ProcessDiffReport,
  ProcessDiffRow,
  ProcessDiffCell,
  ProcessDiffWorkflowSummary,
} from '@ledgerium/intelligence-engine';

// ── Fixtures ──────────────────────────────────────────────────────────────────

function cell(overrides: Partial<ProcessDiffCell> = {}): ProcessDiffCell {
  return { status: 'matched', label: 'Fill form', durationMs: 1000, deltaVsBaselineMs: 0, ...overrides };
}

function absentCell(): ProcessDiffCell {
  return { status: 'absent', label: null, durationMs: null, deltaVsBaselineMs: null };
}

function makeSummary(overrides: Partial<ProcessDiffWorkflowSummary> = {}): ProcessDiffWorkflowSummary {
  return {
    workflowId: 'wf-a',
    matched: 3,
    added: 0,
    removed: 0,
    reordered: 0,
    totalDurationMs: 3000,
    deltaVsBaselineMs: 0,
    ...overrides,
  };
}

function makeRow(overrides: Partial<ProcessDiffRow> = {}): ProcessDiffRow {
  return {
    baselineKey: 'form_fill',
    baselineLabel: 'Fill form',
    cells: {
      'wf-a': cell(),
      'wf-b': cell({ durationMs: 2000, deltaVsBaselineMs: 1000 }),
    },
    ...overrides,
  };
}

function makeReport(overrides: Partial<ProcessDiffReport> = {}): ProcessDiffReport {
  return {
    baselineId: 'wf-a',
    version: 'compare-workflows/1.0.0',
    rowCount: 1,
    rows: [makeRow()],
    summaries: [
      makeSummary({ workflowId: 'wf-a' }),
      makeSummary({ workflowId: 'wf-b', totalDurationMs: 4000, deltaVsBaselineMs: 1000 }),
    ],
    evidenceRunIds: ['wf-a', 'wf-b'],
    ...overrides,
  };
}

const TITLES = { 'wf-a': 'Onboard vendor', 'wf-b': 'Onboard vendor (EU)' };

// ── deriveSelectionState ──────────────────────────────────────────────────────

describe('deriveSelectionState', () => {
  it('reports MIN/MAX constants matching the API contract (2..6)', () => {
    expect(MIN_COMPARE_WORKFLOWS).toBe(2);
    expect(MAX_COMPARE_WORKFLOWS).toBe(6);
  });

  it('returns "no-workflows-available" when fewer than 2 workflows exist to pick from', () => {
    expect(deriveSelectionState(0, 0)).toBe('no-workflows-available');
    expect(deriveSelectionState(0, 1)).toBe('no-workflows-available');
  });

  it('returns "need-more-selection" when 0 or 1 workflows are selected', () => {
    expect(deriveSelectionState(0, 5)).toBe('need-more-selection');
    expect(deriveSelectionState(1, 5)).toBe('need-more-selection');
  });

  it('returns "too-many-selected" above 6', () => {
    expect(deriveSelectionState(7, 10)).toBe('too-many-selected');
  });

  it('returns "ready-to-compare" for 2..6 selected inclusive', () => {
    expect(deriveSelectionState(2, 10)).toBe('ready-to-compare');
    expect(deriveSelectionState(6, 10)).toBe('ready-to-compare');
  });
});

// ── deriveProcessDiffFetchState ───────────────────────────────────────────────

describe('deriveProcessDiffFetchState', () => {
  const base = { isLoading: false, httpStatus: null, hasNetworkError: false, errorCode: null, report: null };

  it('returns "loading" while the request is in flight', () => {
    expect(deriveProcessDiffFetchState({ ...base, isLoading: true })).toBe('loading');
  });

  it('returns "idle" before any request has been made', () => {
    expect(deriveProcessDiffFetchState({ ...base })).toBe('idle');
  });

  it('returns "error" on a network/parse failure', () => {
    expect(deriveProcessDiffFetchState({ ...base, hasNetworkError: true })).toBe('error');
  });

  it('returns "unauthorized" on HTTP 401', () => {
    expect(deriveProcessDiffFetchState({ ...base, httpStatus: 401 })).toBe('unauthorized');
  });

  it('returns "gated" on HTTP 403 (plan-gated)', () => {
    expect(deriveProcessDiffFetchState({ ...base, httpStatus: 403 })).toBe('gated');
  });

  it('returns "insufficient-workflows" on 422 INSUFFICIENT_WORKFLOWS', () => {
    expect(
      deriveProcessDiffFetchState({ ...base, httpStatus: 422, errorCode: 'INSUFFICIENT_WORKFLOWS' }),
    ).toBe('insufficient-workflows');
  });

  it('returns "insufficient-workflows" on 422 BASELINE_UNAVAILABLE', () => {
    expect(
      deriveProcessDiffFetchState({ ...base, httpStatus: 422, errorCode: 'BASELINE_UNAVAILABLE' }),
    ).toBe('insufficient-workflows');
  });

  it('returns "error" on any other non-200 status (e.g. 404, 500, validation 400)', () => {
    expect(deriveProcessDiffFetchState({ ...base, httpStatus: 500 })).toBe('error');
    expect(deriveProcessDiffFetchState({ ...base, httpStatus: 404 })).toBe('error');
    expect(deriveProcessDiffFetchState({ ...base, httpStatus: 400, errorCode: 'VALIDATION_ERROR' })).toBe('error');
  });

  it('returns "error" on a 422 with an unrecognized error code (defensive)', () => {
    expect(deriveProcessDiffFetchState({ ...base, httpStatus: 422, errorCode: 'SOMETHING_ELSE' })).toBe('error');
  });

  it('returns "error" on a 200 with a missing report body (malformed envelope)', () => {
    expect(deriveProcessDiffFetchState({ ...base, httpStatus: 200, report: null })).toBe('error');
  });

  it('returns "ready" on a 200 with a usable report', () => {
    expect(deriveProcessDiffFetchState({ ...base, httpStatus: 200, report: makeReport() })).toBe('ready');
  });
});

// ── formatSignedDurationDelta ─────────────────────────────────────────────────

describe('formatSignedDurationDelta', () => {
  it('returns null when the delta is unavailable (no fabrication)', () => {
    expect(formatSignedDurationDelta(null)).toBeNull();
  });

  it('formats zero as "±0"', () => {
    expect(formatSignedDurationDelta(0)).toBe('±0');
  });

  it('formats a positive delta with a leading "+"', () => {
    expect(formatSignedDurationDelta(12000)).toBe('+12s');
  });

  it('formats a negative delta with a leading "-" and the absolute magnitude', () => {
    expect(formatSignedDurationDelta(-3000)).toBe('-3s');
  });
});

// ── deriveDeltaDirectionClass ─────────────────────────────────────────────────

describe('deriveDeltaDirectionClass', () => {
  it('is neutral for the baseline column regardless of delta value', () => {
    expect(deriveDeltaDirectionClass(5000, true)).toBe('text-[var(--content-tertiary)]');
  });

  it('is neutral when delta is null or zero', () => {
    expect(deriveDeltaDirectionClass(null, false)).toBe('text-[var(--content-tertiary)]');
    expect(deriveDeltaDirectionClass(0, false)).toBe('text-[var(--content-tertiary)]');
  });

  it('is red (worse/slower) for a positive delta on a non-baseline column', () => {
    expect(deriveDeltaDirectionClass(2000, false)).toBe('text-red-600');
  });

  it('is emerald (better/faster) for a negative delta on a non-baseline column', () => {
    expect(deriveDeltaDirectionClass(-2000, false)).toBe('text-emerald-600');
  });
});

// ── formatEvidenceLabel ───────────────────────────────────────────────────────

describe('formatEvidenceLabel', () => {
  it('pluralizes correctly at 1 vs N', () => {
    expect(formatEvidenceLabel(1)).toBe('computed from 1 run');
    expect(formatEvidenceLabel(4)).toBe('computed from 4 runs');
  });

  it('is honest about zero evidence (no fabricated claim)', () => {
    expect(formatEvidenceLabel(0)).toBe('no evidence runs available');
  });
});

// ── PROCESS_DIFF_STATUS_STYLE / LABEL ─────────────────────────────────────────

describe('PROCESS_DIFF_STATUS_STYLE / PROCESS_DIFF_STATUS_LABEL', () => {
  it('covers all 5 cell statuses', () => {
    const statuses = ['matched', 'added', 'removed', 'reordered', 'absent'] as const;
    for (const s of statuses) {
      expect(PROCESS_DIFF_STATUS_LABEL[s]).toBeTruthy();
      expect(PROCESS_DIFF_STATUS_STYLE[s]).toBeTruthy();
    }
  });

  it('only "removed" carries a strikethrough treatment', () => {
    expect(PROCESS_DIFF_STATUS_STYLE.removed.strikethrough).toBe(true);
    expect(PROCESS_DIFF_STATUS_STYLE.matched.strikethrough).toBe(false);
    expect(PROCESS_DIFF_STATUS_STYLE.added.strikethrough).toBe(false);
    expect(PROCESS_DIFF_STATUS_STYLE.reordered.strikethrough).toBe(false);
    expect(PROCESS_DIFF_STATUS_STYLE.absent.strikethrough).toBe(false);
  });

  it('uses distinct color classes across all 5 statuses', () => {
    const bgClasses = new Set(Object.values(PROCESS_DIFF_STATUS_STYLE).map((s) => s.bgClass));
    expect(bgClasses.size).toBe(5);
  });
});

// ── deriveProcessDiffColumns ───────────────────────────────────────────────────

describe('deriveProcessDiffColumns', () => {
  it('orders the baseline column first regardless of summaries array order', () => {
    const report = makeReport({
      baselineId: 'wf-b',
      summaries: [makeSummary({ workflowId: 'wf-a' }), makeSummary({ workflowId: 'wf-b' })],
    });
    const columns = deriveProcessDiffColumns(report, TITLES);
    expect(columns.map((c) => c.workflowId)).toEqual(['wf-b', 'wf-a']);
    expect(columns[0]!.isBaseline).toBe(true);
    expect(columns[1]!.isBaseline).toBe(false);
  });

  it('resolves titles from the provided lookup map', () => {
    const columns = deriveProcessDiffColumns(makeReport(), TITLES);
    expect(columns.map((c) => c.title)).toEqual(['Onboard vendor', 'Onboard vendor (EU)']);
  });

  it('falls back to an honest generic title when the lookup is missing an id', () => {
    const columns = deriveProcessDiffColumns(makeReport(), {});
    expect(columns[0]!.title).toBe('Untitled workflow');
  });

  it('carries matched/added/removed/reordered counts through from the summary', () => {
    const report = makeReport({
      summaries: [
        makeSummary({ workflowId: 'wf-a', matched: 5, added: 0, removed: 0, reordered: 0 }),
        makeSummary({ workflowId: 'wf-b', matched: 3, added: 2, removed: 1, reordered: 1 }),
      ],
    });
    const columns = deriveProcessDiffColumns(report, TITLES);
    expect(columns[1]).toMatchObject({ matched: 3, added: 2, removed: 1, reordered: 1 });
  });

  it('never shows a delta for the baseline column, even if deltaVsBaselineMs happened to be nonzero', () => {
    const report = makeReport({
      summaries: [makeSummary({ workflowId: 'wf-a', deltaVsBaselineMs: 500 }), makeSummary({ workflowId: 'wf-b' })],
    });
    const columns = deriveProcessDiffColumns(report, TITLES);
    expect(columns[0]!.deltaLabel).toBeNull();
  });

  it('formats a null total duration honestly as "—"', () => {
    const report = makeReport({
      summaries: [makeSummary({ workflowId: 'wf-a', totalDurationMs: null }), makeSummary({ workflowId: 'wf-b' })],
    });
    const columns = deriveProcessDiffColumns(report, TITLES);
    expect(columns[0]!.totalDurationLabel).toBe('—');
  });
});

// ── deriveProcessDiffGrid ──────────────────────────────────────────────────────

describe('deriveProcessDiffGrid', () => {
  it('produces one row per report row, with columns baseline-first', () => {
    const grid = deriveProcessDiffGrid(makeReport(), TITLES);
    expect(grid.columns.map((c) => c.workflowId)).toEqual(['wf-a', 'wf-b']);
    expect(grid.rows).toHaveLength(1);
  });

  it('labels a real (non-insertion) row from baselineLabel', () => {
    const grid = deriveProcessDiffGrid(makeReport(), TITLES);
    expect(grid.rows[0]!.isInsertionRow).toBe(false);
    expect(grid.rows[0]!.rowLabel).toBe('Fill form');
  });

  it('labels a pure-insertion row (no baseline step) honestly', () => {
    const report = makeReport({
      rows: [
        {
          baselineKey: null,
          baselineLabel: null,
          cells: { 'wf-a': absentCell(), 'wf-b': cell({ status: 'added', deltaVsBaselineMs: null }) },
        },
      ],
    });
    const grid = deriveProcessDiffGrid(report, TITLES);
    expect(grid.rows[0]!.isInsertionRow).toBe(true);
    expect(grid.rows[0]!.rowLabel).toBe('New step (not in baseline)');
  });

  it('maps each cell status to its display label and style classes', () => {
    const report = makeReport({
      rows: [
        makeRow({
          cells: {
            'wf-a': cell({ status: 'matched' }),
            'wf-b': cell({ status: 'reordered', deltaVsBaselineMs: 500 }),
          },
        }),
      ],
    });
    const grid = deriveProcessDiffGrid(report, TITLES);
    const [baselineCell, otherCell] = grid.rows[0]!.cells;
    expect(baselineCell!.statusLabel).toBe('Matched');
    expect(otherCell!.statusLabel).toBe('Reordered');
    expect(otherCell!.bgClass).toBe(PROCESS_DIFF_STATUS_STYLE.reordered.bgClass);
  });

  it('renders a "removed" cell with strikethrough and no duration/delta', () => {
    const report = makeReport({
      rows: [
        makeRow({
          cells: {
            'wf-a': cell({ status: 'matched' }),
            'wf-b': { status: 'removed', label: null, durationMs: null, deltaVsBaselineMs: null },
          },
        }),
      ],
    });
    const grid = deriveProcessDiffGrid(report, TITLES);
    const removedCell = grid.rows[0]!.cells[1]!;
    expect(removedCell.strikethrough).toBe(true);
    expect(removedCell.durationLabel).toBe('—');
    expect(removedCell.deltaLabel).toBeNull();
    expect(removedCell.barWidthPct).toBe(0);
  });

  it('renders an "absent" cell (pure-insertion row, non-contributing workflow) with zero bar and no label', () => {
    const report = makeReport({
      rows: [
        {
          baselineKey: null,
          baselineLabel: null,
          cells: { 'wf-a': absentCell(), 'wf-b': cell({ status: 'added', deltaVsBaselineMs: null }) },
        },
      ],
    });
    const grid = deriveProcessDiffGrid(report, TITLES);
    const baselineCellInInsertionRow = grid.rows[0]!.cells[0]!;
    expect(baselineCellInInsertionRow.status).toBe('absent');
    expect(baselineCellInInsertionRow.stepLabel).toBeNull();
    expect(baselineCellInInsertionRow.barWidthPct).toBe(0);
  });

  it('computes bar width proportional to duration among the row\'s present cells, floored to a visible minimum', () => {
    const report = makeReport({
      rows: [
        makeRow({
          cells: {
            'wf-a': cell({ durationMs: 1000 }),
            'wf-b': cell({ durationMs: 4000, deltaVsBaselineMs: 3000 }),
          },
        }),
      ],
    });
    const grid = deriveProcessDiffGrid(report, TITLES);
    const [baselineCell, otherCell] = grid.rows[0]!.cells;
    // baseline: 1000/4000 = 25%; other: 4000/4000 = 100% (the row max).
    expect(baselineCell!.barWidthPct).toBe(25);
    expect(otherCell!.barWidthPct).toBe(100);
  });

  it('floors a tiny nonzero share to a minimum visible bar width', () => {
    const report = makeReport({
      rows: [
        makeRow({
          cells: {
            'wf-a': cell({ durationMs: 10 }),
            'wf-b': cell({ durationMs: 100000, deltaVsBaselineMs: 99990 }),
          },
        }),
      ],
    });
    const grid = deriveProcessDiffGrid(report, TITLES);
    expect(grid.rows[0]!.cells[0]!.barWidthPct).toBe(4);
  });

  it('renders a null-duration cell with a zero bar width and "—" label, never a fabricated bar', () => {
    const report = makeReport({
      rows: [
        makeRow({
          cells: {
            'wf-a': cell({ durationMs: null, deltaVsBaselineMs: null }),
            'wf-b': cell({ durationMs: 2000, deltaVsBaselineMs: null }),
          },
        }),
      ],
    });
    const grid = deriveProcessDiffGrid(report, TITLES);
    const baselineCell = grid.rows[0]!.cells[0]!;
    expect(baselineCell.durationLabel).toBe('—');
    expect(baselineCell.barWidthPct).toBe(0);
  });

  it('never shows a delta for the baseline column\'s own cell, even at matched status', () => {
    const grid = deriveProcessDiffGrid(makeReport(), TITLES);
    expect(grid.rows[0]!.cells[0]!.deltaLabel).toBeNull();
  });

  it('shows a signed delta for a non-baseline column\'s matched cell', () => {
    const grid = deriveProcessDiffGrid(makeReport(), TITLES);
    expect(grid.rows[0]!.cells[1]!.deltaLabel).toBe('+1s');
  });

  it('builds a descriptive aria label including workflow title, status, step label, duration, and delta', () => {
    const grid = deriveProcessDiffGrid(makeReport(), TITLES);
    const otherCell = grid.rows[0]!.cells[1]!;
    expect(otherCell.ariaLabel).toContain('Onboard vendor (EU)');
    expect(otherCell.ariaLabel).toContain('Matched');
    expect(otherCell.ariaLabel).toContain('Fill form');
    expect(otherCell.ariaLabel).toContain('2s');
    expect(otherCell.ariaLabel).toContain('+1s vs baseline');
  });

  it('surfaces the evidence-linkage cue from evidenceRunIds', () => {
    const grid = deriveProcessDiffGrid(makeReport(), TITLES);
    expect(grid.evidenceRunCount).toBe(2);
    expect(grid.evidenceLabel).toBe('computed from 2 runs');
  });

  it('is a pure function of its inputs — repeat calls produce deep-equal output', () => {
    const report = makeReport();
    const first = deriveProcessDiffGrid(report, TITLES);
    const second = deriveProcessDiffGrid(report, TITLES);
    expect(first).toEqual(second);
  });
});

// ── deriveProcessDiffTemporalColumns ──────────────────────────────────────────

describe('deriveProcessDiffTemporalColumns', () => {
  it('produces one temporal column per summary, baseline-first', () => {
    const columns = deriveProcessDiffTemporalColumns(makeReport(), TITLES);
    expect(columns.map((c) => c.workflowId)).toEqual(['wf-a', 'wf-b']);
    expect(columns[0]!.isBaseline).toBe(true);
  });

  it('excludes "absent" and "removed" cells from a column\'s own segments', () => {
    const report = makeReport({
      rows: [
        makeRow({
          cells: {
            'wf-a': cell({ status: 'matched' }),
            'wf-b': { status: 'removed', label: null, durationMs: null, deltaVsBaselineMs: null },
          },
        }),
      ],
    });
    const columns = deriveProcessDiffTemporalColumns(report, TITLES);
    const other = columns.find((c) => c.workflowId === 'wf-b')!;
    expect(other.segments).toHaveLength(0);
    expect(other.unknownDurationStepCount).toBe(0);
  });

  it('counts unknown-duration steps without fabricating a segment width for them', () => {
    const report = makeReport({
      rows: [
        makeRow({
          cells: {
            'wf-a': cell({ durationMs: null, deltaVsBaselineMs: null }),
            'wf-b': cell({ durationMs: 2000, deltaVsBaselineMs: null }),
          },
        }),
      ],
    });
    const columns = deriveProcessDiffTemporalColumns(report, TITLES);
    const baseline = columns.find((c) => c.workflowId === 'wf-a')!;
    expect(baseline.segments).toHaveLength(0);
    expect(baseline.unknownDurationStepCount).toBe(1);
  });

  it('scales segment width against the shared max total duration across all compared workflows', () => {
    // wf-b has the largest total (4000ms per makeReport's summaries); wf-a's
    // single 1000ms step should be 25% of that shared scale, not 100% of its
    // own (smaller) total.
    const columns = deriveProcessDiffTemporalColumns(makeReport(), TITLES);
    const baseline = columns.find((c) => c.workflowId === 'wf-a')!;
    expect(baseline.segments[0]!.widthPct).toBe(25);
  });

  it('is a pure function of its inputs — repeat calls produce deep-equal output', () => {
    const report = makeReport();
    const first = deriveProcessDiffTemporalColumns(report, TITLES);
    const second = deriveProcessDiffTemporalColumns(report, TITLES);
    expect(first).toEqual(second);
  });
});
