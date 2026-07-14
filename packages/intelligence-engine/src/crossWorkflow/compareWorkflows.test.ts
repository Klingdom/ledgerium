import { describe, it, expect } from 'vitest';
import {
  compareWorkflows,
  COMPARE_WORKFLOWS_ALGORITHM,
  type CompareStep,
  type WorkflowCompareInput,
  type ProcessDiffCell,
} from './compareWorkflows.js';

function step(key: string, label: string, durationMs: number | null = null): CompareStep {
  return { key, label, durationMs };
}

function wf(
  workflowId: string,
  steps: CompareStep[],
  evidenceRunIds: string[] = [workflowId],
  title = workflowId,
): WorkflowCompareInput {
  return { workflowId, title, steps, evidenceRunIds };
}

function cell(row: { cells: Record<string, ProcessDiffCell> }, workflowId: string): ProcessDiffCell {
  const c = row.cells[workflowId];
  if (!c) throw new Error(`no cell for ${workflowId}`);
  return c;
}

describe('compareWorkflows: version + guards', () => {
  it('reports the fixed algorithm version', () => {
    const report = compareWorkflows([wf('w1', [step('a', 'A')])]);
    expect(report.version).toBe(COMPARE_WORKFLOWS_ALGORITHM);
  });

  it('throws on empty input', () => {
    expect(() => compareWorkflows([])).toThrow();
  });

  it('single-workflow guard: every step matches itself, no added/removed/reordered', () => {
    const report = compareWorkflows([wf('w1', [step('a', 'A', 100), step('b', 'B', 200)])]);
    expect(report.baselineId).toBe('w1');
    expect(report.rowCount).toBe(2);
    expect(report.rows).toHaveLength(2);
    for (const row of report.rows) {
      expect(cell(row, 'w1').status).toBe('matched');
    }
    expect(report.summaries).toEqual([
      { workflowId: 'w1', matched: 2, added: 0, removed: 0, reordered: 0, totalDurationMs: 300, deltaVsBaselineMs: 0 },
    ]);
  });

  it('throws when opts.baselineId does not match any input', () => {
    expect(() => compareWorkflows([wf('w1', [step('a', 'A')])], { baselineId: 'nope' })).toThrow();
  });

  it('defaults the baseline to the first input when opts.baselineId is omitted', () => {
    const report = compareWorkflows([wf('w1', [step('a', 'A')]), wf('w2', [step('a', 'A')])]);
    expect(report.baselineId).toBe('w1');
  });

  it('honors an explicit opts.baselineId even when it is not the first input', () => {
    const report = compareWorkflows(
      [wf('w1', [step('a', 'A')]), wf('w2', [step('a', 'A'), step('b', 'B')])],
      { baselineId: 'w2' },
    );
    expect(report.baselineId).toBe('w2');
    expect(report.rowCount).toBe(2);
  });
});

describe('compareWorkflows: identical workflows', () => {
  it('all rows matched for both workflows; deltas reflect duration differences', () => {
    const baseline = wf('w1', [step('a', 'A', 100), step('b', 'B', 200), step('c', 'C', 300)]);
    const other = wf('w2', [step('a', 'A', 110), step('b', 'B', 210), step('c', 'C', 290)]);
    const report = compareWorkflows([baseline, other]);

    expect(report.rowCount).toBe(3);
    expect(report.rows.map((r) => r.baselineKey)).toEqual(['a', 'b', 'c']);

    for (const row of report.rows) {
      expect(cell(row, 'w1').status).toBe('matched');
      expect(cell(row, 'w2').status).toBe('matched');
    }

    expect(cell(report.rows[0]!, 'w2').deltaVsBaselineMs).toBe(10);
    expect(cell(report.rows[1]!, 'w2').deltaVsBaselineMs).toBe(10);
    expect(cell(report.rows[2]!, 'w2').deltaVsBaselineMs).toBe(-10);

    expect(report.summaries).toEqual([
      { workflowId: 'w1', matched: 3, added: 0, removed: 0, reordered: 0, totalDurationMs: 600, deltaVsBaselineMs: 0 },
      { workflowId: 'w2', matched: 3, added: 0, removed: 0, reordered: 0, totalDurationMs: 610, deltaVsBaselineMs: 10 },
    ]);
  });
});

describe('compareWorkflows: pure insertion', () => {
  it('an extra step not present in the baseline shows as added, inserted at the correct gap', () => {
    const baseline = wf('w1', [step('a', 'A'), step('b', 'B'), step('c', 'C')]);
    const other = wf('w2', [step('a', 'A'), step('x', 'X', 50), step('b', 'B'), step('c', 'C')]);
    const report = compareWorkflows([baseline, other]);

    expect(report.rowCount).toBe(4);
    expect(report.rows.map((r) => r.baselineKey)).toEqual(['a', null, 'b', 'c']);

    const insertionRow = report.rows[1]!;
    expect(insertionRow.baselineLabel).toBeNull();
    expect(cell(insertionRow, 'w1')).toEqual({ status: 'absent', label: null, durationMs: null, deltaVsBaselineMs: null });
    expect(cell(insertionRow, 'w2')).toEqual({ status: 'added', label: 'X', durationMs: 50, deltaVsBaselineMs: null });

    expect(cell(report.rows[0]!, 'w2').status).toBe('matched');
    expect(cell(report.rows[2]!, 'w2').status).toBe('matched');
    expect(cell(report.rows[3]!, 'w2').status).toBe('matched');

    const w2Summary = report.summaries.find((s) => s.workflowId === 'w2')!;
    expect(w2Summary).toMatchObject({ matched: 3, added: 1, removed: 0, reordered: 0 });
  });

  it('an insertion before the baseline\'s very first step lands at row 0', () => {
    const baseline = wf('w1', [step('a', 'A')]);
    const other = wf('w2', [step('pre', 'PRE'), step('a', 'A')]);
    const report = compareWorkflows([baseline, other]);

    expect(report.rowCount).toBe(2);
    expect(report.rows[0]!.baselineKey).toBeNull();
    expect(cell(report.rows[0]!, 'w2').status).toBe('added');
    expect(report.rows[1]!.baselineKey).toBe('a');
  });

  it('merges the same inserted key from multiple workflows at the same gap into one row', () => {
    const baseline = wf('w1', [step('a', 'A'), step('b', 'B')]);
    const w2 = wf('w2', [step('a', 'A'), step('x', 'X'), step('b', 'B')]);
    const w3 = wf('w3', [step('a', 'A'), step('x', 'X'), step('b', 'B')]);
    const report = compareWorkflows([baseline, w2, w3]);

    // Exactly 3 rows: a, x (shared insertion), b — not 4.
    expect(report.rowCount).toBe(3);
    expect(report.rows.map((r) => r.baselineKey)).toEqual(['a', null, 'b']);
    expect(cell(report.rows[1]!, 'w2').status).toBe('added');
    expect(cell(report.rows[1]!, 'w3').status).toBe('added');
    expect(cell(report.rows[1]!, 'w1').status).toBe('absent');
  });
});

describe('compareWorkflows: deletion', () => {
  it('a baseline step missing entirely from another workflow shows as removed', () => {
    const baseline = wf('w1', [step('a', 'A'), step('b', 'B'), step('c', 'C')]);
    const other = wf('w2', [step('a', 'A'), step('c', 'C')]);
    const report = compareWorkflows([baseline, other]);

    expect(report.rowCount).toBe(3);
    expect(cell(report.rows[1]!, 'w2')).toEqual({ status: 'removed', label: null, durationMs: null, deltaVsBaselineMs: null });

    const w2Summary = report.summaries.find((s) => s.workflowId === 'w2')!;
    expect(w2Summary).toMatchObject({ matched: 2, added: 0, removed: 1, reordered: 0 });
  });
});

describe('compareWorkflows: reordering', () => {
  it('a two-step swap shows one anchor as reordered and the other as matched', () => {
    const baseline = wf('w1', [step('a', 'A', 100), step('b', 'B', 200)]);
    const other = wf('w2', [step('b', 'B', 220), step('a', 'A', 90)]);
    const report = compareWorkflows([baseline, other]);

    expect(report.rowCount).toBe(2);
    // Row 'a': other's 'a' step exists but at a different position -> reordered.
    expect(cell(report.rows[0]!, 'w2').status).toBe('reordered');
    expect(cell(report.rows[0]!, 'w2').durationMs).toBe(90);
    expect(cell(report.rows[0]!, 'w2').deltaVsBaselineMs).toBe(-10);
    // Row 'b': LCS anchors on 'b' -> matched.
    expect(cell(report.rows[1]!, 'w2').status).toBe('matched');
    expect(cell(report.rows[1]!, 'w2').durationMs).toBe(220);

    const w2Summary = report.summaries.find((s) => s.workflowId === 'w2')!;
    expect(w2Summary).toMatchObject({ matched: 1, added: 0, removed: 0, reordered: 1 });
  });
});

describe('compareWorkflows: time deltas / null-duration honesty', () => {
  it('deltaVsBaselineMs is null when either side has no duration data', () => {
    const baseline = wf('w1', [step('a', 'A', null), step('b', 'B', 200)]);
    const other = wf('w2', [step('a', 'A', 100), step('b', 'B', null)]);
    const report = compareWorkflows([baseline, other]);

    // baseline duration null -> both baseline and other cells at row 'a' have null delta.
    expect(cell(report.rows[0]!, 'w1').deltaVsBaselineMs).toBeNull();
    expect(cell(report.rows[0]!, 'w2').deltaVsBaselineMs).toBeNull();
    // other duration null at row 'b' -> null delta even though baseline has data.
    expect(cell(report.rows[1]!, 'w2').deltaVsBaselineMs).toBeNull();
  });

  it('totalDurationMs is null (not a fabricated partial sum) when any of a workflow\'s own steps lacks duration', () => {
    const baseline = wf('w1', [step('a', 'A', 100), step('b', 'B', 200)]);
    const other = wf('w2', [step('a', 'A', 100), step('b', 'B', null)]);
    const report = compareWorkflows([baseline, other]);

    const w2Summary = report.summaries.find((s) => s.workflowId === 'w2')!;
    expect(w2Summary.totalDurationMs).toBeNull();
    expect(w2Summary.deltaVsBaselineMs).toBeNull();
  });
});

describe('compareWorkflows: N > 2 alignment', () => {
  it('aligns 3 workflows against one baseline independently', () => {
    const baseline = wf('w1', [step('a', 'A'), step('b', 'B'), step('c', 'C')]);
    const w2 = wf('w2', [step('a', 'A'), step('b', 'B'), step('c', 'C')]); // identical
    const w3 = wf('w3', [step('a', 'A'), step('x', 'X'), step('b', 'B'), step('c', 'C')]); // insertion

    const report = compareWorkflows([baseline, w2, w3]);

    expect(report.rowCount).toBe(4);
    expect(report.summaries).toHaveLength(3);

    const w2Summary = report.summaries.find((s) => s.workflowId === 'w2')!;
    expect(w2Summary).toMatchObject({ matched: 3, added: 0, removed: 0, reordered: 0 });

    const w3Summary = report.summaries.find((s) => s.workflowId === 'w3')!;
    expect(w3Summary).toMatchObject({ matched: 3, added: 1, removed: 0, reordered: 0 });

    // w2 is absent at the row w3 inserted.
    const insertionRow = report.rows.find((r) => r.baselineKey === null)!;
    expect(cell(insertionRow, 'w2').status).toBe('absent');
    expect(cell(insertionRow, 'w3').status).toBe('added');
  });
});

describe('compareWorkflows: evidenceRunIds', () => {
  it('unions and dedupes evidenceRunIds across all inputs, sorted', () => {
    const baseline = wf('w1', [step('a', 'A')], ['run-b', 'run-a']);
    const other = wf('w2', [step('a', 'A')], ['run-a', 'run-c']);
    const report = compareWorkflows([baseline, other]);
    expect(report.evidenceRunIds).toEqual(['run-a', 'run-b', 'run-c']);
  });
});

describe('compareWorkflows: determinism / permutation invariance', () => {
  const w1 = wf('w1', [step('a', 'A', 100), step('b', 'B', 200), step('c', 'C', 300)]);
  const w2 = wf('w2', [step('a', 'A', 90), step('x', 'X', 50), step('b', 'B', 210), step('c', 'C', 290)]);
  const w3 = wf('w3', [step('a', 'A', 95), step('c', 'C', 305)]);

  it('repeat calls with unchanged inputs produce byte-identical output', () => {
    const first = compareWorkflows([w1, w2, w3], { baselineId: 'w1' });
    const second = compareWorkflows([w1, w2, w3], { baselineId: 'w1' });
    expect(second).toEqual(first);
  });

  it('shuffling the inputs array order does not change the report (baselineId fixed)', () => {
    const orderA = compareWorkflows([w1, w2, w3], { baselineId: 'w1' });
    const orderB = compareWorkflows([w3, w1, w2], { baselineId: 'w1' });
    const orderC = compareWorkflows([w2, w3, w1], { baselineId: 'w1' });
    expect(orderB).toEqual(orderA);
    expect(orderC).toEqual(orderA);
  });

  it('deduplicates a repeated workflowId, keeping the first occurrence', () => {
    const dupFirst = wf('w2', [step('a', 'A', 90), step('x', 'X', 50), step('b', 'B', 210), step('c', 'C', 290)]);
    const dupSecond = wf('w2', [step('zzz', 'ZZZ', 1)]); // would change the alignment if it "won"
    const withDup = compareWorkflows([w1, dupFirst, dupSecond], { baselineId: 'w1' });
    const withoutDup = compareWorkflows([w1, dupFirst], { baselineId: 'w1' });
    expect(withDup).toEqual(withoutDup);
  });
});
