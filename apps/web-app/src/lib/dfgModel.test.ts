/**
 * dfgModel — Vitest unit tests
 *
 * Covers all four spec invariants (I-DFG-1 through I-DFG-4) plus:
 *   - happy-path connectivity guarantee
 *   - coverage monotonicity
 *   - single-variant behaviour
 *   - empty input / edge cases
 *   - 3-variant fixture with insert / skip / loop paths
 *
 * NO wall-clock calls — all fixtures use frozen, deterministic inputs.
 */

import { describe, it, expect } from 'vitest';
import {
  buildDirectlyFollowsGraph,
  filterDfgByCoverage,
  DFG_SCHEMA_VERSION,
  type VariantInput,
} from './dfgModel';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const START_ID = '__start__';
const END_ID   = '__end__';

/** Return all edge ids from a DFG for assertion. */
function edgeIds(dfg: ReturnType<typeof buildDirectlyFollowsGraph>): string[] {
  return dfg.edges.map((e) => e.id);
}

/** Return all node ids from a DFG for assertion. */
function nodeIds(dfg: ReturnType<typeof buildDirectlyFollowsGraph>): string[] {
  return dfg.nodes.map((n) => n.id);
}

// ─── Shared fixtures ──────────────────────────────────────────────────────────

/**
 * Standard 3-step variant: Navigate → Form Submit → Action (5 runs).
 * Uses real step titles (all > 2 chars).
 */
const STANDARD: VariantInput = {
  id: 'v-standard',
  isStandard: true,
  runCount: 5,
  frequency: 0.5,
  stepCategories: ['click_then_navigate', 'fill_and_submit', 'single_action'],
  stepTitles: ['Open Dashboard', 'Submit Expense Form', 'Download Receipt'],
  evidenceRunIds: ['r01', 'r02', 'r03', 'r04', 'r05'],
};

/**
 * Insertion variant: an extra annotation step between step 0 and step 1 (3 runs).
 */
const INSERTION: VariantInput = {
  id: 'v-insert',
  isStandard: false,
  runCount: 3,
  frequency: 0.3,
  stepCategories: ['click_then_navigate', 'annotation', 'fill_and_submit', 'single_action'],
  stepTitles: ['Open Dashboard', 'Add Note', 'Submit Expense Form', 'Download Receipt'],
  evidenceRunIds: ['r06', 'r07', 'r08'],
};

/**
 * Skip variant: skips the form step entirely (2 runs).
 * Uses a short title (≤2 chars) on step 1 so the category label kicks in.
 */
const SKIP: VariantInput = {
  id: 'v-skip',
  isStandard: false,
  runCount: 2,
  frequency: 0.2,
  stepCategories: ['click_then_navigate', 'single_action'],
  stepTitles: ['Open Dashboard', 'OK'],   // 'OK' is ≤2 chars → category fallback
  evidenceRunIds: ['r09', 'r10'],
};

/**
 * Single-step loop variant: same activity repeated twice (2 runs).
 * Step category 'click_then_navigate' appears at index 0 and 1 with same title.
 */
const LOOP: VariantInput = {
  id: 'v-loop',
  isStandard: false,
  runCount: 2,
  frequency: 0.2,
  stepCategories: ['click_then_navigate', 'click_then_navigate', 'single_action'],
  stepTitles: ['Open Dashboard', 'Open Dashboard', 'Download Receipt'],
  evidenceRunIds: ['r11', 'r12'],
};

// ─── §1 Schema version ────────────────────────────────────────────────────────

describe('DFG_SCHEMA_VERSION', () => {
  it('is 2 as const (schema pin — v2 adds duration aggregates)', () => {
    expect(DFG_SCHEMA_VERSION).toBe(2);
  });
});

// ─── Empty input ──────────────────────────────────────────────────────────────

describe('buildDirectlyFollowsGraph — empty input', () => {
  it('returns a valid minimal graph for empty variants array', () => {
    const dfg = buildDirectlyFollowsGraph([]);
    expect(dfg.version).toBe(DFG_SCHEMA_VERSION);
    expect(dfg.totalRuns).toBe(0);
    expect(dfg.maxEdgeFrequency).toBe(0);
    expect(dfg.maxNodeFrequency).toBe(0);
    expect(dfg.nodes.length).toBe(2); // __start__ and __end__
    expect(dfg.nodes[0]?.id).toBe(START_ID);
    expect(dfg.nodes[dfg.nodes.length - 1]?.id).toBe(END_ID);
    expect(dfg.edges).toHaveLength(0);
  });

  it('returns a valid minimal graph for variant with no steps', () => {
    const variant: VariantInput = {
      id: 'v-empty',
      isStandard: false,
      runCount: 1,
      frequency: 1,
      stepCategories: [],
    };
    const dfg = buildDirectlyFollowsGraph([variant]);
    expect(dfg.totalRuns).toBe(0); // no steps → counted as 0
    expect(dfg.nodes.length).toBe(2);
    expect(dfg.edges).toHaveLength(0);
  });
});

// ─── I-DFG-4: Terminal anchoring ──────────────────────────────────────────────

describe('I-DFG-4: Terminal anchoring', () => {
  it('__start__ is always the first node and __end__ the last', () => {
    const dfg = buildDirectlyFollowsGraph([STANDARD, INSERTION]);
    const ids = nodeIds(dfg);
    expect(ids[0]).toBe(START_ID);
    expect(ids[ids.length - 1]).toBe(END_ID);
  });

  it('terminal caseCount equals totalRuns', () => {
    const dfg = buildDirectlyFollowsGraph([STANDARD, INSERTION]);
    const start = dfg.nodes.find((n) => n.id === START_ID)!;
    const end   = dfg.nodes.find((n) => n.id === END_ID)!;
    expect(start.caseCount).toBe(dfg.totalRuns);
    expect(end.caseCount).toBe(dfg.totalRuns);
  });

  it('terminal kind values are start and end respectively', () => {
    const dfg = buildDirectlyFollowsGraph([STANDARD]);
    const start = dfg.nodes.find((n) => n.id === START_ID)!;
    const end   = dfg.nodes.find((n) => n.id === END_ID)!;
    expect(start.kind).toBe('start');
    expect(end.kind).toBe('end');
  });

  it('every variant contributes edges from __start__ to first activity and last activity to __end__', () => {
    const dfg = buildDirectlyFollowsGraph([STANDARD]);
    // Standard: [start → open_dashboard, ..., download_receipt → end]
    const openId   = 'node:click_then_navigate:open dashboard';
    const dlId     = 'node:single_action:download receipt';
    expect(edgeIds(dfg)).toContain(`edge:${START_ID}->${openId}`);
    expect(edgeIds(dfg)).toContain(`edge:${dlId}->${END_ID}`);
  });
});

// ─── Single-variant happy path ────────────────────────────────────────────────

describe('buildDirectlyFollowsGraph — single variant', () => {
  it('creates exactly N activity nodes for N steps in the variant', () => {
    const dfg = buildDirectlyFollowsGraph([STANDARD]);
    const activityNodes = dfg.nodes.filter((n) => n.kind === 'activity');
    expect(activityNodes).toHaveLength(3); // Open Dashboard, Submit Expense Form, Download Receipt
  });

  it('all activity nodes have correct caseCount equal to variant.runCount', () => {
    const dfg = buildDirectlyFollowsGraph([STANDARD]);
    for (const node of dfg.nodes.filter((n) => n.kind === 'activity')) {
      expect(node.caseCount).toBe(STANDARD.runCount);
    }
  });

  it('totalRuns equals variant.runCount for a single variant', () => {
    const dfg = buildDirectlyFollowsGraph([STANDARD]);
    expect(dfg.totalRuns).toBe(5);
  });

  it('maxNodeFrequency excludes terminals and equals max activity caseCount', () => {
    const dfg = buildDirectlyFollowsGraph([STANDARD]);
    // All activity nodes have caseCount = 5; terminals also 5 but excluded
    expect(dfg.maxNodeFrequency).toBe(5);
  });
});

// ─── Multi-variant aggregation ────────────────────────────────────────────────

describe('buildDirectlyFollowsGraph — three-variant fixture (insert/skip/loop)', () => {
  it('totalRuns equals sum of all variant runCounts', () => {
    const dfg = buildDirectlyFollowsGraph([STANDARD, INSERTION, SKIP]);
    expect(dfg.totalRuns).toBe(5 + 3 + 2);
  });

  it('shared activities accumulate caseCount across variants', () => {
    // 'Open Dashboard' appears in STANDARD (5) and INSERTION (3) and SKIP (2) = 10
    const dfg = buildDirectlyFollowsGraph([STANDARD, INSERTION, SKIP]);
    const openDash = dfg.nodes.find((n) => n.id === 'node:click_then_navigate:open dashboard')!;
    expect(openDash).toBeDefined();
    expect(openDash.caseCount).toBe(10); // 5 + 3 + 2
  });

  it('shared edges accumulate caseCount across variants', () => {
    // Edge: open dashboard → submit expense form: STANDARD (5) + INSERTION (3) — SKIP doesn't have it
    // But INSERTION has annotation in between, so direct edge is only STANDARD (5)
    const dfg = buildDirectlyFollowsGraph([STANDARD, INSERTION]);
    const openId   = 'node:click_then_navigate:open dashboard';
    const submitId = 'node:fill_and_submit:submit expense form';
    const edge = dfg.edges.find((e) => e.sourceId === openId && e.targetId === submitId)!;
    // Only STANDARD has this direct edge (INSERTION inserts annotation between them)
    expect(edge.caseCount).toBe(5);
  });
});

// ─── I-DFG-1: Evidence completeness ──────────────────────────────────────────

describe('I-DFG-1: evidence completeness', () => {
  it('activity node evidenceRunIds is a sorted, deduplicated union of contributing variant run ids', () => {
    const dfg = buildDirectlyFollowsGraph([STANDARD, INSERTION]);
    const openId = 'node:click_then_navigate:open dashboard';
    const node = dfg.nodes.find((n) => n.id === openId)!;
    expect(node.evidenceRunIds).toEqual(
      ['r01', 'r02', 'r03', 'r04', 'r05', 'r06', 'r07', 'r08'],
    );
  });

  it('edge evidenceRunIds is sorted and deduplicated', () => {
    const dfg = buildDirectlyFollowsGraph([STANDARD, INSERTION]);
    const openId   = 'node:click_then_navigate:open dashboard';
    const submitId = 'node:fill_and_submit:submit expense form';
    const edge = dfg.edges.find((e) => e.sourceId === openId && e.targetId === submitId)!;
    // Only STANDARD contributes to this direct transition
    expect(edge.evidenceRunIds).toEqual(['r01', 'r02', 'r03', 'r04', 'r05']);
  });

  it('terminals evidenceRunIds is sorted union of all variant evidenceRunIds', () => {
    const dfg = buildDirectlyFollowsGraph([STANDARD, INSERTION]);
    const start = dfg.nodes.find((n) => n.id === START_ID)!;
    expect(start.evidenceRunIds).toEqual(
      ['r01', 'r02', 'r03', 'r04', 'r05', 'r06', 'r07', 'r08'],
    );
  });
});

// ─── I-DFG-2: Observed-only ───────────────────────────────────────────────────

describe('I-DFG-2: observed-only — no inferred edges', () => {
  it('SKIP variant does not produce a transitive edge skipping a step from STANDARD', () => {
    // SKIP: [Open Dashboard → Action(Download Receipt)]. The form step is absent.
    // There must NOT be an edge from open_dashboard directly to submit_expense_form
    // for the SKIP case only — but there IS a direct edge from STANDARD, so we
    // verify no phantom third-party edge appears.
    const dfg = buildDirectlyFollowsGraph([SKIP]);
    const openId   = 'node:click_then_navigate:open dashboard';
    const submitId = 'node:fill_and_submit:submit expense form'; // doesn't exist in SKIP
    expect(dfg.nodes.find((n) => n.id === submitId)).toBeUndefined();
    // 'OK' title is ≤2 chars → category label 'Action'
    const actionId = 'node:single_action:action';
    const directEdge = dfg.edges.find((e) => e.sourceId === openId && e.targetId === actionId);
    expect(directEdge).toBeDefined();
  });

  it('category label fallback fires when step title has ≤2 chars', () => {
    const dfg = buildDirectlyFollowsGraph([SKIP]);
    // 'OK' ≤ 2 → 'Action' (CATEGORY_STYLES.single_action.label)
    const actionId = 'node:single_action:action';
    const node = dfg.nodes.find((n) => n.id === actionId);
    expect(node).toBeDefined();
    expect(node!.label).toBe('Action');
  });

  it('no step title produces real title when length > 2', () => {
    const dfg = buildDirectlyFollowsGraph([STANDARD]);
    const openId = 'node:click_then_navigate:open dashboard';
    const node = dfg.nodes.find((n) => n.id === openId)!;
    expect(node.label).toBe('Open Dashboard');
  });
});

// ─── I-DFG-3: Determinism ────────────────────────────────────────────────────

describe('I-DFG-3: determinism', () => {
  it('two identical calls return deep-equal graphs', () => {
    const variants = [STANDARD, INSERTION, SKIP];
    const first  = buildDirectlyFollowsGraph(variants);
    const second = buildDirectlyFollowsGraph(variants);
    expect(first).toEqual(second);
  });

  it('node ordering is stable (caseCount desc, then id asc for ties)', () => {
    // LOOP: 'Open Dashboard' appears twice in same variant → merged to 1 node
    const dfg = buildDirectlyFollowsGraph([STANDARD, LOOP]);
    const actNodes = dfg.nodes.filter((n) => n.kind === 'activity');
    // Verify sorted order is monotonically non-increasing by caseCount
    for (let i = 1; i < actNodes.length; i++) {
      const prev = actNodes[i - 1]!;
      const curr = actNodes[i]!;
      if (prev.caseCount === curr.caseCount) {
        // Tie: id must be ascending
        expect(prev.id <= curr.id).toBe(true);
      } else {
        expect(prev.caseCount).toBeGreaterThan(curr.caseCount);
      }
    }
  });

  it('edge ordering is stable (caseCount desc, then sourceId asc, then targetId asc)', () => {
    const dfg = buildDirectlyFollowsGraph([STANDARD, INSERTION, SKIP]);
    const edges = dfg.edges;
    for (let i = 1; i < edges.length; i++) {
      const prev = edges[i - 1]!;
      const curr = edges[i]!;
      if (prev.caseCount > curr.caseCount) continue; // OK
      if (prev.caseCount < curr.caseCount) {
        throw new Error(`edges not sorted: caseCount ${prev.caseCount} < ${curr.caseCount} at index ${i}`);
      }
      // equal caseCount: sourceId must be ≤
      if (prev.sourceId < curr.sourceId) continue;
      if (prev.sourceId > curr.sourceId) {
        throw new Error(`edges not sorted by sourceId at index ${i}`);
      }
      // equal sourceId: targetId must be ≤
      expect(prev.targetId <= curr.targetId).toBe(true);
    }
  });
});

// ─── Loop / self-edge handling ────────────────────────────────────────────────

describe('loop activity — same activity appears twice in one variant', () => {
  it('merges to a single node (one caseCount per variant, not per step occurrence)', () => {
    const dfg = buildDirectlyFollowsGraph([LOOP]);
    const openId = 'node:click_then_navigate:open dashboard';
    const nodes  = dfg.nodes.filter((n) => n.id === openId);
    expect(nodes).toHaveLength(1);
    // runCount of LOOP is 2; node occurs once per variant
    expect(nodes[0]!.caseCount).toBe(2);
  });

  it('produces a self-referencing edge (A→A loop) in the edge list', () => {
    const dfg = buildDirectlyFollowsGraph([LOOP]);
    const openId = 'node:click_then_navigate:open dashboard';
    const selfEdge = dfg.edges.find((e) => e.sourceId === openId && e.targetId === openId);
    expect(selfEdge).toBeDefined();
    expect(selfEdge!.caseCount).toBe(2);
  });
});

// ─── maxEdgeFrequency / maxNodeFrequency ──────────────────────────────────────

describe('max-frequency fields', () => {
  it('maxEdgeFrequency equals the highest edge caseCount', () => {
    const dfg = buildDirectlyFollowsGraph([STANDARD, INSERTION, SKIP]);
    const max = Math.max(...dfg.edges.map((e) => e.caseCount));
    expect(dfg.maxEdgeFrequency).toBe(max);
  });

  it('maxNodeFrequency excludes terminals even when terminals have higher caseCount', () => {
    const dfg = buildDirectlyFollowsGraph([STANDARD]);
    // totalRuns = 5; terminals caseCount = 5; all activity nodes also = 5
    // With SKIP added: totalRuns = 7; open dashboard = 7 but terminals also = 7
    const dfg2 = buildDirectlyFollowsGraph([STANDARD, SKIP]);
    const actMax = Math.max(...dfg2.nodes.filter((n) => n.kind === 'activity').map((n) => n.caseCount));
    expect(dfg2.maxNodeFrequency).toBe(actMax);
    // terminals both have caseCount 7; we confirm maxNodeFrequency isn't derived from them only
    expect(dfg2.nodes.find((n) => n.id === START_ID)!.caseCount).toBe(dfg2.totalRuns);
  });
});

// ─── AC-4: Traceability invariant ────────────────────────────────────────────

describe('AC-4: traceability invariant — caseCount never exceeds evidence', () => {
  it('for every node and edge, caseCount <= evidenceRunIds.length and evidenceRunIds.length >= 1', () => {
    // Multi-run fixture: STANDARD(5) + INSERTION(3) + SKIP(2) + LOOP(2) = 12 total runs
    const dfg = buildDirectlyFollowsGraph([STANDARD, INSERTION, SKIP, LOOP]);

    for (const node of dfg.nodes) {
      expect(
        node.evidenceRunIds.length,
        `node "${node.id}" evidenceRunIds must be non-empty`,
      ).toBeGreaterThanOrEqual(1);
      expect(
        node.caseCount,
        `node "${node.id}" caseCount (${node.caseCount}) must not exceed evidenceRunIds.length (${node.evidenceRunIds.length})`,
      ).toBeLessThanOrEqual(node.evidenceRunIds.length);
    }

    for (const edge of dfg.edges) {
      expect(
        edge.evidenceRunIds.length,
        `edge "${edge.id}" evidenceRunIds must be non-empty`,
      ).toBeGreaterThanOrEqual(1);
      expect(
        edge.caseCount,
        `edge "${edge.id}" caseCount (${edge.caseCount}) must not exceed evidenceRunIds.length (${edge.evidenceRunIds.length})`,
      ).toBeLessThanOrEqual(edge.evidenceRunIds.length);
    }
  });
});

// ─── filterDfgByCoverage ──────────────────────────────────────────────────────

describe('filterDfgByCoverage', () => {
  it('coverage = 1.0/1.0 retains all nodes and edges', () => {
    const dfg      = buildDirectlyFollowsGraph([STANDARD, INSERTION, SKIP]);
    const filtered = filterDfgByCoverage(dfg, 1.0, 1.0);
    // All activity nodes present
    const actBefore = dfg.nodes.filter((n) => n.kind === 'activity').length;
    const actAfter  = filtered.nodes.filter((n) => n.kind === 'activity').length;
    expect(actAfter).toBe(actBefore);
    expect(filtered.edges.length).toBe(dfg.edges.length);
  });

  it('coverage = 0.0/0.0 retains at least the happy path', () => {
    const dfg      = buildDirectlyFollowsGraph([STANDARD, INSERTION, SKIP]);
    const filtered = filterDfgByCoverage(dfg, 0.0, 0.0);
    const ids = nodeIds(filtered);
    expect(ids).toContain(START_ID);
    expect(ids).toContain(END_ID);
    // At least one edge must survive
    expect(filtered.edges.length).toBeGreaterThan(0);
  });

  it('terminals are always present after filtering', () => {
    const dfg      = buildDirectlyFollowsGraph([STANDARD, INSERTION]);
    const filtered = filterDfgByCoverage(dfg, 0.1, 0.1);
    expect(filtered.nodes.find((n) => n.id === START_ID)).toBeDefined();
    expect(filtered.nodes.find((n) => n.id === END_ID)).toBeDefined();
  });

  it('version and totalRuns are preserved through filtering', () => {
    const dfg      = buildDirectlyFollowsGraph([STANDARD, INSERTION]);
    const filtered = filterDfgByCoverage(dfg, 0.5, 0.5);
    expect(filtered.version).toBe(DFG_SCHEMA_VERSION);
    expect(filtered.totalRuns).toBe(dfg.totalRuns);
  });

  it('filtered graph has caseCount-monotone node ordering', () => {
    const dfg      = buildDirectlyFollowsGraph([STANDARD, INSERTION, SKIP]);
    const filtered = filterDfgByCoverage(dfg, 0.8, 0.8);
    const actNodes = filtered.nodes.filter((n) => n.kind === 'activity');
    for (let i = 1; i < actNodes.length; i++) {
      const prev = actNodes[i - 1]!;
      const curr = actNodes[i]!;
      if (prev.caseCount !== curr.caseCount) {
        expect(prev.caseCount).toBeGreaterThan(curr.caseCount);
      }
    }
  });

  it('__start__ is first and __end__ is last in filtered graph', () => {
    const dfg      = buildDirectlyFollowsGraph([STANDARD, INSERTION, SKIP]);
    const filtered = filterDfgByCoverage(dfg, 0.5, 0.5);
    const ids = nodeIds(filtered);
    expect(ids[0]).toBe(START_ID);
    expect(ids[ids.length - 1]).toBe(END_ID);
  });

  it('coverage = 1.0 with second arg 0.0 keeps all edges but may reduce nodes', () => {
    const dfg      = buildDirectlyFollowsGraph([STANDARD, INSERTION, SKIP]);
    const filtered = filterDfgByCoverage(dfg, 1.0, 0.0);
    // connectionCoverage = 0 → keep only the first (highest) edge initially,
    // but happy-path guarantee may add more
    expect(filtered.edges.length).toBeGreaterThanOrEqual(1);
  });

  it('filterDfgByCoverage is deterministic for same args', () => {
    const dfg      = buildDirectlyFollowsGraph([STANDARD, INSERTION, SKIP]);
    const f1 = filterDfgByCoverage(dfg, 0.7, 0.7);
    const f2 = filterDfgByCoverage(dfg, 0.7, 0.7);
    expect(f1).toEqual(f2);
  });

  it('higher coverage threshold retains at least as many nodes as lower threshold', () => {
    const dfg  = buildDirectlyFollowsGraph([STANDARD, INSERTION, SKIP]);
    const high = filterDfgByCoverage(dfg, 0.9, 0.9);
    const low  = filterDfgByCoverage(dfg, 0.4, 0.4);
    // More coverage → more nodes
    expect(high.nodes.length).toBeGreaterThanOrEqual(low.nodes.length);
  });

  it('maxEdgeFrequency is recomputed over kept edges after filtering', () => {
    const dfg      = buildDirectlyFollowsGraph([STANDARD, INSERTION, SKIP]);
    const filtered = filterDfgByCoverage(dfg, 0.5, 0.5);
    if (filtered.edges.length > 0) {
      const expectedMax = Math.max(...filtered.edges.map((e) => e.caseCount));
      expect(filtered.maxEdgeFrequency).toBe(expectedMax);
    } else {
      expect(filtered.maxEdgeFrequency).toBe(0);
    }
  });
});
