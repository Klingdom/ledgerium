/**
 * N-Way Process Diff — T2 (Cross-Workflow Intelligence program).
 *
 * "Compare these 2-6 workflows; why is one slower?" — a deterministic,
 * evidence-linked, step-level alignment of N workflows against one baseline,
 * shaped for a code-diff-style swimlane render: an ordered list of aligned
 * rows (matched / added / removed / reordered), plus a per-workflow summary
 * and per-position duration deltas.
 *
 * Reuse, not reinvention (per `docs/features/cross-workflow-intelligence/
 * BUILD_SPEC.md` §5 T2 + `docs/meta/TIMESTUDY_INTELLIGENCE_REVIEW_001/
 * analytics_analysis.md` §3): step-level alignment is LCS-backbone alignment,
 * the exact same primitive `divergenceAnalyzer.ts` already uses to align N
 * runs against a standard-path backbone (`lcsAlignment()`, exported from that
 * module specifically so this file can reuse it byte-for-byte). This module
 * adds no new alignment mathematics — it is an orchestration + row-assembly
 * layer over that primitive, generalized from "1 backbone vs N runs of the
 * SAME process" to "1 baseline workflow vs N-1 OTHER workflows that may be
 * entirely different processes."
 *
 * Algorithm (per pair: baseline vs one other workflow):
 *  1. LCS-align the other workflow's step-key sequence against the
 *     baseline's step-key sequence (`lcsAlignment`) — this yields the
 *     matched anchor pairs [otherIndex, baselineIndex], identical in spirit
 *     to how `divergenceAnalyzer` anchors runs against a backbone.
 *  2. Steps NOT selected by the LCS on EITHER side that nonetheless share the
 *     same key are the same step moved to a different position — LCS is
 *     optimal, so if it didn't match them it's because doing so would
 *     require crossing an existing anchor (a genuine reordering, not a
 *     coincidence). Greedy left-to-right key pairing (deterministic,
 *     stable for repeated categories) resolves these into `reordered` cells
 *     without introducing a second alignment algorithm.
 *  3. Whatever remains unmatched-and-unpaired on the baseline side is
 *     `removed` (baseline has it, this workflow doesn't); whatever remains
 *     unmatched-and-unpaired on the other side is `added` (this workflow has
 *     it, baseline doesn't), bucketed into the LCS-anchored gap it falls
 *     into — the exact segment-bracketing idea `divergenceAnalyzer.
 *     branchesForRun` already uses for divergence branches, re-derived here
 *     directly from the reused `lcsAlignment` pairs to build insertion rows.
 *
 * Row assembly merges insertions that share the same key at the same gap
 * across multiple non-baseline workflows into a single row (so two
 * workflows both adding "approval_wait" at the same point in the sequence
 * render as one swimlane row, not two) — this keeps the matrix compact for a
 * genuine N-way visual compare rather than degenerating into N independent
 * pairwise diffs stacked on top of each other.
 *
 * Determinism / evidence:
 *  - Pure function: no `Date.now()`, no `Math.random()`, no I/O.
 *  - Permutation-invariant: given a fixed `baselineId`, the output does not
 *    depend on the order of the `inputs` array — non-baseline workflows are
 *    always processed in workflowId-ascending order, and duplicate
 *    workflowIds are deduped (first occurrence wins) before that sort.
 *  - `evidenceRunIds` is the sorted, deduped union across all inputs.
 *  - `version` is a fixed literal, bumped only when the alignment/row-
 *    assembly formula changes — mirrors `DIVERGENCE_ALGORITHM` /
 *    `TIME_SINK_MODEL_VERSION` convention.
 */

import { lcsAlignment } from '../divergenceAnalyzer.js';

/** Fixed literal version for this alignment + row-assembly formula. */
export const COMPARE_WORKFLOWS_ALGORITHM = 'compare-workflows/1.0.0';

// ─── Input contract ────────────────────────────────────────────────────────────

/**
 * One step in a workflow's ordered sequence, ready for cross-workflow
 * alignment. `key` is the privacy-safe alignment key (a step category /
 * `GroupingReason`, or a step fingerprint signature — never raw user
 * content, matching the `PathSignature.stepCategories` convention in
 * `pathSignature.ts`). `label` is the human-readable display value for the
 * swimlane cell (may be a title, may be the same as `key`'s display label —
 * caller's choice, not interpreted here).
 */
export interface CompareStep {
  key: string;
  label: string;
  durationMs: number | null;
}

export interface WorkflowCompareInput {
  workflowId: string;
  title: string;
  /** Ordered step sequence (already sorted by ordinal by the caller). */
  steps: CompareStep[];
  evidenceRunIds: string[];
}

export interface CompareWorkflowsOptions {
  /** Explicit baseline workflow id. Defaults to `inputs[0].workflowId` when omitted. */
  baselineId?: string;
}

// ─── Output contract ───────────────────────────────────────────────────────────

export type ProcessDiffCellStatus = 'matched' | 'added' | 'removed' | 'reordered' | 'absent';

export interface ProcessDiffCell {
  status: ProcessDiffCellStatus;
  /** Display label for this workflow's step at this row, or null when there is none. */
  label: string | null;
  durationMs: number | null;
  /** durationMs - (baseline's durationMs at this row), or null when either side is unavailable / not comparable. */
  deltaVsBaselineMs: number | null;
}

/**
 * One aligned step slot in the swimlane matrix. `baselineKey`/`baselineLabel`
 * are null for pure insertion rows (a step some non-baseline workflow(s)
 * added that has no corresponding baseline step at all).
 */
export interface ProcessDiffRow {
  baselineKey: string | null;
  baselineLabel: string | null;
  /** Keyed by workflowId — includes an entry for every input workflow, including the baseline. */
  cells: Record<string, ProcessDiffCell>;
}

export interface ProcessDiffWorkflowSummary {
  workflowId: string;
  matched: number;
  added: number;
  removed: number;
  reordered: number;
  /** Sum of this workflow's own step durations, or null if any step duration is unavailable (never a fabricated partial sum). */
  totalDurationMs: number | null;
  /** totalDurationMs - baseline's totalDurationMs, or null when either is unavailable. */
  deltaVsBaselineMs: number | null;
}

export interface ProcessDiffReport {
  baselineId: string;
  version: string;
  rowCount: number;
  rows: ProcessDiffRow[];
  summaries: ProcessDiffWorkflowSummary[];
  /** Sorted, deduped union of evidenceRunIds across all input workflows. */
  evidenceRunIds: string[];
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

function dedupeSort(ids: string[]): string[] {
  return [...new Set(ids)].sort();
}

function compareIds(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function absentCell(): ProcessDiffCell {
  return { status: 'absent', label: null, durationMs: null, deltaVsBaselineMs: null };
}

/** Sum of step durations, or null if ANY step's duration is unavailable (honest — never a fabricated partial total). */
function sumDurations(steps: readonly CompareStep[]): number | null {
  let total = 0;
  for (const step of steps) {
    if (step.durationMs === null) return null;
    total += step.durationMs;
  }
  return total;
}

// ─── Per-workflow alignment against the baseline ──────────────────────────────

interface WorkflowAlignment {
  /** baselineIndex -> otherIndex, for LCS-matched anchor steps. */
  matchedAtBaseline: Map<number, number>;
  /** baselineIndex -> otherIndex, for same-key steps LCS could not anchor (genuine reorder). */
  reorderedAtBaseline: Map<number, number>;
  /** otherIndex -> gap (the baseline index immediately preceding this segment; -1 = before the baseline's first step). */
  addedAtGap: Map<number, number>;
}

/**
 * Align one non-baseline workflow's step-key sequence against the baseline's,
 * via the reused `lcsAlignment` primitive. See module header for the
 * matched / reordered / added classification algorithm.
 */
function alignOtherToBaseline(otherKeys: readonly string[], baselineKeys: readonly string[]): WorkflowAlignment {
  const pairs = lcsAlignment(otherKeys, baselineKeys); // [otherIndex, baselineIndex], increasing order

  const matchedAtBaseline = new Map<number, number>();
  const matchedOtherIdx = new Set<number>();
  const matchedBaselineIdx = new Set<number>();
  for (const [otherIdx, baselineIdx] of pairs) {
    matchedAtBaseline.set(baselineIdx, otherIdx);
    matchedOtherIdx.add(otherIdx);
    matchedBaselineIdx.add(baselineIdx);
  }

  // Gap for every other-index: the baseline index of the LCS anchor
  // immediately preceding it (-1 if before the first anchor). Directly
  // re-derives the anchor-bracket concept `divergenceAnalyzer.branchesForRun`
  // already uses, from the SAME reused `lcsAlignment` pairs — not a second
  // alignment algorithm, just a bucketing of the same anchors.
  const gapForOtherIdx = new Map<number, number>();
  const seq: Array<[number, number]> = [[-1, -1], ...pairs, [otherKeys.length, baselineKeys.length]];
  for (let k = 0; k < seq.length - 1; k++) {
    const [r0, b0] = seq[k]!;
    const [r1] = seq[k + 1]!;
    for (let oi = r0 + 1; oi < r1; oi++) {
      gapForOtherIdx.set(oi, b0);
    }
  }

  // Reorder detection: an unmatched baseline step and an unmatched other step
  // sharing the same key are the same step relocated. LCS is optimal, so if
  // it left both unmatched despite the shared key, matching them would have
  // required crossing an existing anchor — i.e. they are genuinely out of
  // order, not merely un-annotated. Greedy left-to-right pairing by baseline
  // position, consuming each other-index at most once, keeps this
  // deterministic under repeated categories.
  const unmatchedOtherIndicesInOrder = [...otherKeys.keys()].filter((i) => !matchedOtherIdx.has(i));
  const reorderedAtBaseline = new Map<number, number>();
  const consumedForReorder = new Set<number>();

  for (let baselineIdx = 0; baselineIdx < baselineKeys.length; baselineIdx++) {
    if (matchedBaselineIdx.has(baselineIdx)) continue;
    const key = baselineKeys[baselineIdx]!;
    const foundOtherIdx = unmatchedOtherIndicesInOrder.find(
      (oi) => !consumedForReorder.has(oi) && otherKeys[oi] === key,
    );
    if (foundOtherIdx !== undefined) {
      reorderedAtBaseline.set(baselineIdx, foundOtherIdx);
      consumedForReorder.add(foundOtherIdx);
    }
  }

  // Whatever remains unmatched-and-unpaired on the other side is genuinely
  // new relative to the baseline ("added"), bucketed by its LCS-anchored gap.
  const addedAtGap = new Map<number, number>();
  for (const oi of unmatchedOtherIndicesInOrder) {
    if (consumedForReorder.has(oi)) continue;
    addedAtGap.set(oi, gapForOtherIdx.get(oi) ?? -1);
  }

  return { matchedAtBaseline, reorderedAtBaseline, addedAtGap };
}

// ─── Main entry point ──────────────────────────────────────────────────────────

/**
 * Align 1+ workflows against a chosen baseline into an N-way process diff
 * suitable for swimlane rendering. Pure, deterministic, permutation-invariant
 * (given a fixed `baselineId`, output does not depend on `inputs` array order).
 *
 * @throws if `inputs` is empty, or if `opts.baselineId` does not match any input.
 */
export function compareWorkflows(
  inputs: WorkflowCompareInput[],
  opts: CompareWorkflowsOptions = {},
): ProcessDiffReport {
  if (inputs.length === 0) {
    throw new Error('compareWorkflows: at least 1 workflow is required');
  }

  const baselineId = opts.baselineId ?? inputs[0]!.workflowId;
  const baseline = inputs.find((w) => w.workflowId === baselineId);
  if (!baseline) {
    throw new Error(`compareWorkflows: baselineId "${baselineId}" was not found in inputs`);
  }

  // Dedupe (first occurrence wins) + sort non-baseline workflows by
  // workflowId so output depends only on the SET of inputs + the chosen
  // baseline, never on the array order the caller happened to supply.
  const seen = new Set<string>([baseline.workflowId]);
  const others: WorkflowCompareInput[] = [];
  for (const w of inputs) {
    if (seen.has(w.workflowId)) continue;
    seen.add(w.workflowId);
    others.push(w);
  }
  others.sort((a, b) => compareIds(a.workflowId, b.workflowId));

  const baselineKeys = baseline.steps.map((s) => s.key);

  const alignments = new Map<string, WorkflowAlignment>();
  for (const other of others) {
    alignments.set(
      other.workflowId,
      alignOtherToBaseline(other.steps.map((s) => s.key), baselineKeys),
    );
  }

  // ─── Group insertion ("added") steps by gap, merging same-key
  //     contributions from different workflows into a single row ──────────
  interface InsertionEntry {
    key: string;
    contributors: Map<string, { label: string; durationMs: number | null }>;
  }
  const insertionsByGap = new Map<number, InsertionEntry[]>();
  const entryIndexByGapKey = new Map<string, number>();

  for (const other of others) {
    const alignment = alignments.get(other.workflowId)!;
    const otherKeys = other.steps.map((s) => s.key);
    const addedIndices = [...alignment.addedAtGap.keys()].sort((a, b) => a - b);
    for (const oi of addedIndices) {
      const gap = alignment.addedAtGap.get(oi)!;
      const key = otherKeys[oi]!;
      const rowList = insertionsByGap.get(gap) ?? [];
      insertionsByGap.set(gap, rowList);
      const mapKey = `${gap}|${key}`;
      let idx = entryIndexByGapKey.get(mapKey);
      if (idx === undefined) {
        idx = rowList.length;
        rowList.push({ key, contributors: new Map() });
        entryIndexByGapKey.set(mapKey, idx);
      }
      if (!rowList[idx]!.contributors.has(other.workflowId)) {
        const step = other.steps[oi]!;
        rowList[idx]!.contributors.set(other.workflowId, { label: step.label, durationMs: step.durationMs });
      }
    }
  }

  const rows: ProcessDiffRow[] = [];

  function pushInsertionRows(gap: number): void {
    const rowList = insertionsByGap.get(gap);
    if (!rowList) return;
    for (const entry of rowList) {
      const cells: Record<string, ProcessDiffCell> = {};
      cells[baseline!.workflowId] = absentCell();
      for (const other of others) {
        const contribution = entry.contributors.get(other.workflowId);
        cells[other.workflowId] = contribution
          ? { status: 'added', label: contribution.label, durationMs: contribution.durationMs, deltaVsBaselineMs: null }
          : absentCell();
      }
      rows.push({ baselineKey: null, baselineLabel: null, cells });
    }
  }

  // Insertions before the baseline's first step.
  pushInsertionRows(-1);

  for (let bi = 0; bi < baselineKeys.length; bi++) {
    const baselineStep = baseline.steps[bi]!;
    const baselineDuration = baselineStep.durationMs;
    const cells: Record<string, ProcessDiffCell> = {};

    cells[baseline.workflowId] = {
      status: 'matched',
      label: baselineStep.label,
      durationMs: baselineDuration,
      deltaVsBaselineMs: baselineDuration === null ? null : 0,
    };

    for (const other of others) {
      const alignment = alignments.get(other.workflowId)!;
      const matchedOtherIdx = alignment.matchedAtBaseline.get(bi);
      const reorderedOtherIdx = alignment.reorderedAtBaseline.get(bi);

      if (matchedOtherIdx !== undefined) {
        const step = other.steps[matchedOtherIdx]!;
        cells[other.workflowId] = {
          status: 'matched',
          label: step.label,
          durationMs: step.durationMs,
          deltaVsBaselineMs:
            step.durationMs === null || baselineDuration === null ? null : step.durationMs - baselineDuration,
        };
      } else if (reorderedOtherIdx !== undefined) {
        const step = other.steps[reorderedOtherIdx]!;
        cells[other.workflowId] = {
          status: 'reordered',
          label: step.label,
          durationMs: step.durationMs,
          deltaVsBaselineMs:
            step.durationMs === null || baselineDuration === null ? null : step.durationMs - baselineDuration,
        };
      } else {
        cells[other.workflowId] = { status: 'removed', label: null, durationMs: null, deltaVsBaselineMs: null };
      }
    }

    rows.push({ baselineKey: baselineKeys[bi]!, baselineLabel: baselineStep.label, cells });
    pushInsertionRows(bi);
  }

  // ─── Per-workflow summaries ──────────────────────────────────────────────
  const baselineTotalDurationMs = sumDurations(baseline.steps);
  const summaries: ProcessDiffWorkflowSummary[] = [
    {
      workflowId: baseline.workflowId,
      matched: baselineKeys.length,
      added: 0,
      removed: 0,
      reordered: 0,
      totalDurationMs: baselineTotalDurationMs,
      deltaVsBaselineMs: baselineTotalDurationMs === null ? null : 0,
    },
  ];

  for (const other of others) {
    let matched = 0;
    let added = 0;
    let removed = 0;
    let reordered = 0;
    for (const row of rows) {
      const cell = row.cells[other.workflowId];
      if (!cell) continue;
      if (cell.status === 'matched') matched++;
      else if (cell.status === 'added') added++;
      else if (cell.status === 'removed') removed++;
      else if (cell.status === 'reordered') reordered++;
    }
    const totalDurationMs = sumDurations(other.steps);
    summaries.push({
      workflowId: other.workflowId,
      matched,
      added,
      removed,
      reordered,
      totalDurationMs,
      deltaVsBaselineMs:
        totalDurationMs === null || baselineTotalDurationMs === null
          ? null
          : totalDurationMs - baselineTotalDurationMs,
    });
  }

  const evidenceRunIds = dedupeSort([baseline, ...others].flatMap((w) => w.evidenceRunIds));

  return {
    baselineId: baseline.workflowId,
    version: COMPARE_WORKFLOWS_ALGORITHM,
    rowCount: rows.length,
    rows,
    summaries,
    evidenceRunIds,
  };
}
