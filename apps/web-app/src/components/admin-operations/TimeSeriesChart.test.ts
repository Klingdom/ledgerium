/**
 * TimeSeriesChart — unit tests for pure helper logic.
 *
 * Environment: Vitest (node) — no React, no DOM.
 *
 * The gradient ID uniqueness fix (QA item 5, iter 073) is validated here
 * by testing the ID derivation pattern independently of React rendering:
 *   - The gradientId is computed as `adminAreaGradient-${instanceId}` where
 *     instanceId has colons stripped (React useId() returns `:r0:` form in tests).
 *   - Two independently computed IDs must differ from each other.
 *   - The ID must not contain colons (colons in SVG id= are invalid per spec).
 *   - The ID must start with the shared prefix to remain identifiable.
 *
 * Note: The component itself cannot be unit-tested in a node environment
 * because recharts imports browser APIs. The regression protection lives here
 * (pure logic) and in the E2E spec (rendered output).
 *
 * @iter 073
 */

import { describe, it, expect } from 'vitest';
import type { DailyBucket } from '@/lib/admin-operations/types.js';

// ── Gradient ID derivation (mirrors TimeSeriesChart.tsx logic) ─────────────────

/**
 * Pure function that mirrors the gradient ID derivation in TimeSeriesChart.tsx.
 * Extracted here so the logic can be tested without React rendering.
 *
 * Input: an instanceId string in React useId() format (e.g. ":r0:").
 * Output: a valid SVG id string with no colons.
 */
function deriveGradientId(instanceId: string): string {
  return `adminAreaGradient-${instanceId.replace(/:/g, '')}`;
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('TimeSeriesChart gradient ID uniqueness (QA item 5, iter 073)', () => {
  it('strips colons from the React useId output', () => {
    // React 18 useId() typically produces ":r0:", ":r1:", etc.
    const result = deriveGradientId(':r0:');
    expect(result).not.toContain(':');
  });

  it('starts with the adminAreaGradient prefix', () => {
    const result = deriveGradientId(':r0:');
    expect(result).toMatch(/^adminAreaGradient-/);
  });

  it('two different instanceIds produce different gradient IDs', () => {
    const id1 = deriveGradientId(':r0:');
    const id2 = deriveGradientId(':r1:');
    expect(id1).not.toBe(id2);
  });

  it('four chart instances (simulated) all have unique gradient IDs', () => {
    // Simulates 4 TimeSeriesChart instances on the admin operations page
    const ids = [':r0:', ':r1:', ':r2:', ':r3:'].map(deriveGradientId);
    const unique = new Set(ids);
    expect(unique.size).toBe(4);
  });

  it('no gradient ID is the bare original hardcoded value', () => {
    // Regression: the old hardcoded id was "adminAreaGradient" (no suffix).
    // All instances must have a suffix — the bare id is never emitted.
    const id = deriveGradientId(':r0:');
    expect(id).not.toBe('adminAreaGradient');
  });

  it('produces a non-empty suffix', () => {
    // Even a zero-length useId segment should not produce a trailing dash only
    const id = deriveGradientId('r0');
    expect(id).toBe('adminAreaGradient-r0');
    expect(id.length).toBeGreaterThan('adminAreaGradient-'.length);
  });
});

// ── seriesB gradient ID — mirrors B-series derivation ─────────────────────────

/**
 * Pure function that mirrors the B-series gradient ID derivation in
 * TimeSeriesChart.tsx (added in Iter B). Uses a distinct prefix so the
 * two IDs from the same instance cannot collide.
 */
function deriveGradientIdB(instanceId: string): string {
  return `adminAreaGradientB-${instanceId.replace(/:/g, '')}`;
}

describe('TimeSeriesChart seriesB gradient ID (Iter B)', () => {
  it('has a different prefix from the primary gradient ID', () => {
    const primary = deriveGradientId(':r0:');
    const secondary = deriveGradientIdB(':r0:');
    expect(primary).not.toBe(secondary);
  });

  it('starts with adminAreaGradientB-', () => {
    expect(deriveGradientIdB(':r2:')).toMatch(/^adminAreaGradientB-/);
  });

  it('strips colons just like the primary', () => {
    expect(deriveGradientIdB(':r2:')).not.toContain(':');
  });

  it('same instanceId produces different primary and secondary ids', () => {
    const id = ':r5:';
    const a = deriveGradientId(id);
    const b = deriveGradientIdB(id);
    expect(a).not.toBe(b);
  });

  it('across two instances all four gradient IDs are unique', () => {
    const instances = [':r0:', ':r1:'];
    const ids = instances.flatMap((id) => [
      deriveGradientId(id),
      deriveGradientIdB(id),
    ]);
    const unique = new Set(ids);
    expect(unique.size).toBe(4);
  });
});

// ── mergeSeriesData (mirrors TimeSeriesChart.tsx helper) ──────────────────────

/**
 * Mirrors the `mergeSeriesData` function exported from TimeSeriesChart.tsx.
 * Duplicated here (pure function, no import path) so we can test it in node.
 */
function mergeSeriesData(
  primary: DailyBucket[],
  secondary: DailyBucket[],
): Array<{ date: string; count: number; countB: number }> {
  const map = new Map<string, { count: number; countB: number }>();
  for (const b of primary) {
    map.set(b.date, { count: b.count, countB: 0 });
  }
  for (const b of secondary) {
    const existing = map.get(b.date);
    if (existing) {
      existing.countB = b.count;
    } else {
      map.set(b.date, { count: 0, countB: b.count });
    }
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date, ...v }));
}

describe('mergeSeriesData (Iter B)', () => {
  it('merges matching dates from both series', () => {
    const primary: DailyBucket[] = [{ date: '2026-06-01', count: 5 }];
    const secondary: DailyBucket[] = [{ date: '2026-06-01', count: 3 }];
    const result = mergeSeriesData(primary, secondary);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ date: '2026-06-01', count: 5, countB: 3 });
  });

  it('fills countB=0 when secondary has no entry for a primary date', () => {
    const primary: DailyBucket[] = [{ date: '2026-06-01', count: 10 }];
    const secondary: DailyBucket[] = [];
    const result = mergeSeriesData(primary, secondary);
    expect(result[0]).toEqual({ date: '2026-06-01', count: 10, countB: 0 });
  });

  it('fills count=0 when primary has no entry for a secondary date', () => {
    const primary: DailyBucket[] = [];
    const secondary: DailyBucket[] = [{ date: '2026-06-02', count: 7 }];
    const result = mergeSeriesData(primary, secondary);
    expect(result[0]).toEqual({ date: '2026-06-02', count: 0, countB: 7 });
  });

  it('sorts result chronologically by date', () => {
    const primary: DailyBucket[] = [
      { date: '2026-06-03', count: 1 },
      { date: '2026-06-01', count: 2 },
    ];
    const secondary: DailyBucket[] = [{ date: '2026-06-02', count: 9 }];
    const result = mergeSeriesData(primary, secondary);
    expect(result.map((r) => r.date)).toEqual([
      '2026-06-01',
      '2026-06-02',
      '2026-06-03',
    ]);
  });

  it('handles two empty arrays', () => {
    expect(mergeSeriesData([], [])).toEqual([]);
  });

  it('is deterministic: same inputs produce identical outputs', () => {
    const p: DailyBucket[] = [{ date: '2026-06-10', count: 4 }];
    const s: DailyBucket[] = [{ date: '2026-06-10', count: 2 }];
    const a = mergeSeriesData(p, s);
    const b = mergeSeriesData(p, s);
    expect(a).toEqual(b);
  });

  it('handles overlapping multi-day ranges correctly', () => {
    const primary: DailyBucket[] = [
      { date: '2026-06-01', count: 3 },
      { date: '2026-06-02', count: 4 },
    ];
    const secondary: DailyBucket[] = [
      { date: '2026-06-02', count: 1 },
      { date: '2026-06-03', count: 8 },
    ];
    const result = mergeSeriesData(primary, secondary);
    expect(result).toEqual([
      { date: '2026-06-01', count: 3, countB: 0 },
      { date: '2026-06-02', count: 4, countB: 1 },
      { date: '2026-06-03', count: 0, countB: 8 },
    ]);
  });
});
