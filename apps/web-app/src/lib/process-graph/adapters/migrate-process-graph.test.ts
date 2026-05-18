/**
 * Path E — migrateProcessGraph v1.0 → v2.0 Tests (iter 076 / PATHE-P01)
 *
 * Verifies honest degraded synthesis: every entity flagged `isInferred: true`
 * with `confidenceScore: 0.40` (below INFERRED_CONFIDENCE_THRESHOLD).
 * Determinism + graceful-degradation defensive branches.
 */

import { describe, it, expect } from 'vitest';

import { migrateProcessGraph } from './migrate-process-graph.js';
import {
  PROCESS_GRAPH_SCHEMA_VERSION,
  V1_DEGRADED_SYNTHESIS_CONFIDENCE,
} from '../types/closed-unions.js';
import { validateGraphTopology } from '../validation/topology.js';

// ── Defensive branches ────────────────────────────────────────────────────────

describe('migrateProcessGraph defensive branches', () => {
  it('M1: null input → { ok: null, reason: "null-or-undefined" }', () => {
    const r = migrateProcessGraph(null);
    expect(r.ok).toBeNull();
    if (r.ok === null) expect(r.reason).toBe('null-or-undefined');
  });

  it('M2: undefined input → { ok: null, reason: "null-or-undefined" }', () => {
    const r = migrateProcessGraph(undefined);
    expect(r.ok).toBeNull();
  });

  it('M3: string input → { ok: null, reason: "not-an-object" }', () => {
    const r = migrateProcessGraph('not-a-graph');
    expect(r.ok).toBeNull();
    if (r.ok === null) expect(r.reason).toBe('not-an-object');
  });

  it('M4: array input → { ok: null, reason: "array-not-object" }', () => {
    const r = migrateProcessGraph([]);
    expect(r.ok).toBeNull();
    if (r.ok === null) expect(r.reason).toBe('array-not-object');
  });

  it('M5: missing required fields → { ok: null, reason: "missing-required-fields" }', () => {
    const r = migrateProcessGraph({ id: 'g1', workflowId: 'wf1' });
    expect(r.ok).toBeNull();
    if (r.ok === null) expect(r.reason).toBe('missing-required-fields');
  });
});

// ── Happy path ────────────────────────────────────────────────────────────────

describe('migrateProcessGraph happy path (v1.0 → v2.0 honest degraded synthesis)', () => {
  const input = {
    id: 'pg-001',
    workflowId: 'wf-001',
    pathSignature: 'Open record:Fill form:Submit',
    runCount: 5,
    computedAtMs: 1_800_000_000_000,
  };

  it('M6: produces a v2.0 ProcessGraph with correct schema version', () => {
    const r = migrateProcessGraph(input);
    expect(r.ok).not.toBeNull();
    if (r.ok) {
      expect(r.ok.graphSchemaVersion).toBe(PROCESS_GRAPH_SCHEMA_VERSION);
      expect(r.ok.graphVersion).toBe(1);
    }
  });

  it('M7: synthesizes start + N actions + end nodes (linear path)', () => {
    const r = migrateProcessGraph(input);
    expect(r.ok).not.toBeNull();
    if (r.ok) {
      expect(r.ok.nodes.length).toBe(5); // start + 3 actions + end
      expect(r.ok.nodes[0]?.nodeType).toBe('start');
      expect(r.ok.nodes[r.ok.nodes.length - 1]?.nodeType).toBe('end');
      expect(r.ok.nodes.filter((n) => n.nodeType === 'action').length).toBe(3);
    }
  });

  it('M8: synthesizes N+1 sequence edges (N nodes → N-1 edges + start->n1 + n3->end)', () => {
    const r = migrateProcessGraph(input);
    expect(r.ok).not.toBeNull();
    if (r.ok) {
      expect(r.ok.edges.length).toBe(4); // 5 nodes → 4 edges (linear)
      expect(r.ok.edges.every((e) => e.edgeType === 'sequence')).toBe(true);
      expect(r.ok.edges.every((e) => e.runFrequencyPct === 1.0)).toBe(true);
    }
  });

  it('M9: every node + edge flagged isInferred=true + confidence=V1_DEGRADED_SYNTHESIS_CONFIDENCE', () => {
    const r = migrateProcessGraph(input);
    expect(r.ok).not.toBeNull();
    if (r.ok) {
      for (const node of r.ok.nodes) {
        expect(node.isInferred).toBe(true);
        expect(node.confidenceScore).toBe(V1_DEGRADED_SYNTHESIS_CONFIDENCE);
      }
      for (const edge of r.ok.edges) {
        expect(edge.isInferred).toBe(true);
        expect(edge.confidenceScore).toBe(V1_DEGRADED_SYNTHESIS_CONFIDENCE);
      }
      expect(r.ok.isInferred).toBe(true);
    }
  });

  it('M10: zero DecisionPoints + zero Variants in v1.0→v2.0 honest-synthesis output', () => {
    const r = migrateProcessGraph(input);
    expect(r.ok).not.toBeNull();
    if (r.ok) {
      expect(r.ok.decisionPoints).toEqual([]);
      expect(r.ok.variants).toEqual([]);
    }
  });

  it('M11: deterministic — same input produces byte-identical output across calls', () => {
    const r1 = migrateProcessGraph(input);
    const r2 = migrateProcessGraph(input);
    expect(r1).toEqual(r2);
  });

  it('M12: empty pathSignature → start→end only (no intermediate actions)', () => {
    const r = migrateProcessGraph({ ...input, pathSignature: '' });
    expect(r.ok).not.toBeNull();
    if (r.ok) {
      expect(r.ok.nodes.length).toBe(2); // start + end
      expect(r.ok.edges.length).toBe(1); // start → end
      // warnings live on the outer MigrationResult discriminant, not on the ProcessGraph itself
      expect(r.warnings.some((w: string) => w.includes('Empty pathSignature'))).toBe(true);
    }
  });

  it('M13: migrated graph passes validateGraphTopology (audit-honesty IFF + structural)', () => {
    const r = migrateProcessGraph(input);
    expect(r.ok).not.toBeNull();
    if (r.ok) {
      const v = validateGraphTopology(r.ok);
      expect(v.ok).toBe(true);
      expect(v.violations).toEqual([]);
    }
  });

  it('M14: deterministic node IDs — same workflowId + step index + label → same hash', () => {
    const r1 = migrateProcessGraph(input);
    const r2 = migrateProcessGraph(input);
    if (r1.ok && r2.ok) {
      for (let i = 0; i < r1.ok.nodes.length; i++) {
        expect(r1.ok.nodes[i]?.id).toBe(r2.ok.nodes[i]?.id);
      }
    }
  });

  it('M15: caller-supplied computedAtMs flows through unchanged (no clock reads)', () => {
    const r = migrateProcessGraph({ ...input, computedAtMs: 1_700_000_000_000 });
    expect(r.ok).not.toBeNull();
    if (r.ok) {
      expect(r.ok.computedAtMs).toBe(1_700_000_000_000);
    }
  });
});
