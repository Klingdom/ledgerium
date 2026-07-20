import { describe, it, expect } from 'vitest';
import { findLatestArtifact, LATEST_ARTIFACT_ORDER_BY } from './artifacts';

/**
 * SOP_BUILDER_REVIEW_001 B-3 regression suite.
 *
 * `findLatestArtifact` is the load-bearing fix: every read site that filters
 * a workflow's artifacts by type must agree on which row is "current" when
 * more than one row of the same type exists (append-only regeneration —
 * see docs/features/sop-authoring/OVERLAY_ARCHITECTURE_DECISION.md — makes
 * this the normal case, not an edge case).
 */

interface Row {
  id: string;
  artifactType: string;
  createdAt: Date;
  label: string;
}

function row(id: string, artifactType: string, createdAt: string, label = id): Row {
  return { id, artifactType, createdAt: new Date(createdAt), label };
}

describe('findLatestArtifact', () => {
  it('returns the newest row by createdAt when multiple rows of the same type exist', () => {
    const rows = [
      row('a', 'template_sop_enterprise', '2026-01-01T00:00:00.000Z', 'oldest'),
      row('b', 'template_sop_enterprise', '2026-01-03T00:00:00.000Z', 'newest'),
      row('c', 'template_sop_enterprise', '2026-01-02T00:00:00.000Z', 'middle'),
    ];

    const result = findLatestArtifact(rows, 'template_sop_enterprise');

    expect(result?.label).toBe('newest');
    expect(result?.id).toBe('b');
  });

  it('returns the same row across repeated calls on the same input (deterministic)', () => {
    const rows = [
      row('a', 'template_sop_enterprise', '2026-01-01T00:00:00.000Z'),
      row('b', 'template_sop_enterprise', '2026-01-03T00:00:00.000Z'),
      row('c', 'template_sop_enterprise', '2026-01-02T00:00:00.000Z'),
    ];

    const first = findLatestArtifact(rows, 'template_sop_enterprise');
    const second = findLatestArtifact(rows, 'template_sop_enterprise');
    const third = findLatestArtifact(rows, 'template_sop_enterprise');

    expect(first).toBe(second);
    expect(second).toBe(third);
    expect(first?.id).toBe('b');
  });

  it('is independent of input array order (same result regardless of insertion order)', () => {
    const ascending = [
      row('a', 'sop', '2026-01-01T00:00:00.000Z'),
      row('b', 'sop', '2026-01-02T00:00:00.000Z'),
      row('c', 'sop', '2026-01-03T00:00:00.000Z'),
    ];
    const shuffled = [ascending[2]!, ascending[0]!, ascending[1]!];

    expect(findLatestArtifact(ascending, 'sop')?.id).toBe('c');
    expect(findLatestArtifact(shuffled, 'sop')?.id).toBe('c');
  });

  it('engages the id tiebreak when createdAt values are identical', () => {
    // This is the exact shape the concurrent-GET race in
    // /api/workflows/[id]/route.ts produces: two rows inserted in the same
    // createMany call (or the same SQLite-resolution tick) carry the same
    // `createdAt`. Without an id tiebreak, `findLatestArtifact` would be
    // non-deterministic under `Array.prototype.find`-style "first wins"
    // semantics whenever the input order varied.
    const sameInstant = '2026-01-01T00:00:00.000Z';
    const rows = [
      row('11111111-0000-0000-0000-000000000000', 'template_selection', sameInstant),
      row('99999999-0000-0000-0000-000000000000', 'template_selection', sameInstant),
      row('55555555-0000-0000-0000-000000000000', 'template_selection', sameInstant),
    ];

    const result = findLatestArtifact(rows, 'template_selection');

    // { id: 'desc' } — the lexicographically greatest id wins the tie.
    expect(result?.id).toBe('99999999-0000-0000-0000-000000000000');

    // Order-independence must hold under the tie too.
    const reversed = [...rows].reverse();
    expect(findLatestArtifact(reversed, 'template_selection')?.id).toBe(
      '99999999-0000-0000-0000-000000000000',
    );
  });

  it('filters by artifactType — ignores rows of other types', () => {
    const rows = [
      row('a', 'process_output', '2026-01-05T00:00:00.000Z'),
      row('b', 'template_sop_enterprise', '2026-01-01T00:00:00.000Z'),
      row('c', 'template_sop_enterprise', '2026-01-02T00:00:00.000Z'),
    ];

    expect(findLatestArtifact(rows, 'template_sop_enterprise')?.id).toBe('c');
    expect(findLatestArtifact(rows, 'process_output')?.id).toBe('a');
  });

  it('returns undefined when no row of the requested type exists', () => {
    const rows = [row('a', 'process_output', '2026-01-01T00:00:00.000Z')];
    expect(findLatestArtifact(rows, 'template_selection')).toBeUndefined();
    expect(findLatestArtifact([], 'process_output')).toBeUndefined();
  });

  it('returns the single row when only one match exists', () => {
    const rows = [
      row('a', 'sop', '2026-01-01T00:00:00.000Z'),
      row('b', 'process_output', '2026-01-01T00:00:00.000Z'),
    ];
    expect(findLatestArtifact(rows, 'sop')?.id).toBe('a');
  });
});

describe('LATEST_ARTIFACT_ORDER_BY', () => {
  it('orders by createdAt desc, then id desc — matching findLatestArtifact semantics', () => {
    expect(LATEST_ARTIFACT_ORDER_BY).toEqual([{ createdAt: 'desc' }, { id: 'desc' }]);
  });
});
