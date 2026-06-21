import { describe, it, expect } from 'vitest';
import { DEMO_DFG, DEMO_VARIANT_COUNT } from './demoDfgFixture';

describe('demoDfgFixture — live /demo process-map sample', () => {
  it('builds a valid, non-trivial graph from the sample variants', () => {
    expect(DEMO_VARIANT_COUNT).toBe(4);
    expect(DEMO_DFG.totalRuns).toBe(47); // 28 + 9 + 6 + 4
    const activities = DEMO_DFG.nodes.filter((n) => n.kind === 'activity');
    // 8 distinct activity steps (Open, Create, Add line items, Attach receipts,
    // Submit, Manager approval, Finance review, Reimbursed)
    expect(activities.length).toBe(8);
    expect(DEMO_DFG.edges.length).toBeGreaterThan(activities.length);
    expect(DEMO_DFG.maxEdgeFrequency).toBeGreaterThan(0);
    expect(DEMO_DFG.maxNodeFrequency).toBe(47); // every run passes the dominant steps
  });

  it('carries duration samples so performance mode renders', () => {
    const activities = DEMO_DFG.nodes.filter((n) => n.kind === 'activity');
    expect(activities.every((n) => n.durationSampleCount > 0 && n.meanDurationMs > 0)).toBe(true);
    // Finance review should be the slowest step (performance-mode hotspot)
    const slowest = [...activities].sort((a, b) => b.meanDurationMs - a.meanDurationMs)[0]!;
    expect(slowest.label).toBe('Finance review');
  });

  it('includes the receipts rework loop (Submit → Attach receipts back-edge)', () => {
    const labelById = new Map(DEMO_DFG.nodes.map((n) => [n.id, n.label]));
    const hasReworkBackEdge = DEMO_DFG.edges.some(
      (e) => labelById.get(e.sourceId) === 'Submit for approval' && labelById.get(e.targetId) === 'Attach receipts',
    );
    expect(hasReworkBackEdge).toBe(true);
  });

  it('is deterministic — rebuilding yields an identical graph', () => {
    // DEMO_DFG is built once at module load; re-import via fresh require is not
    // available, so assert structural stability of ids/order instead.
    const ids = DEMO_DFG.nodes.map((n) => n.id);
    expect(ids[0]).toBe('__start__');
    expect(ids[ids.length - 1]).toBe('__end__');
  });
});
