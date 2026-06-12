/**
 * Tests for dashboard-band-stats — pure deterministic Batch B aggregates.
 *
 * Determinism is the core contract: a fixed referenceNowMs + fixed inputs MUST
 * always produce identical buckets. No wall-clock dependence anywhere.
 *
 * @batch B (2026-06-12)
 */

import { describe, it, expect } from 'vitest';
import {
  computeOpportunityCounts,
  computeHealthBandCounts,
  computeMedianCycleTimeMs,
  computeActivityByWeek,
} from './dashboard-band-stats';
import type { OpportunityTag } from './workflow-metrics';

// Fixed clock — 2026-06-12T00:00:00.000Z. Used across the activity tests.
const REF_NOW = Date.parse('2026-06-12T00:00:00.000Z');
const DAY = 24 * 60 * 60 * 1000;
const WEEK = 7 * DAY;

describe('computeOpportunityCounts', () => {
  it('counts each tag and zeroes absent tags', () => {
    const tags: OpportunityTag[] = ['automate', 'automate', 'monitor', 'healthy'];
    expect(computeOpportunityCounts(tags)).toEqual({
      automate: 2,
      standardize: 0,
      optimize: 0,
      monitor: 1,
      healthy: 1,
    });
  });

  it('returns all-zero for an empty input', () => {
    expect(computeOpportunityCounts([])).toEqual({
      automate: 0,
      standardize: 0,
      optimize: 0,
      monitor: 0,
      healthy: 0,
    });
  });

  it('is order-invariant (deterministic)', () => {
    const a = computeOpportunityCounts(['automate', 'monitor', 'optimize']);
    const b = computeOpportunityCounts(['optimize', 'automate', 'monitor']);
    expect(a).toEqual(b);
  });
});

describe('computeHealthBandCounts', () => {
  it('buckets by the 60/80 thresholds (poor/fair/good)', () => {
    // 59→poor, 60→fair, 79→fair, 80→good, 100→good, 0→poor
    expect(computeHealthBandCounts([59, 60, 79, 80, 100, 0])).toEqual({
      poor: 2,
      fair: 2,
      good: 2,
    });
  });

  it('treats exact boundary 60 as fair and 80 as good', () => {
    expect(computeHealthBandCounts([60])).toEqual({ poor: 0, fair: 1, good: 0 });
    expect(computeHealthBandCounts([80])).toEqual({ poor: 0, fair: 0, good: 1 });
  });

  it('returns all-zero for empty input', () => {
    expect(computeHealthBandCounts([])).toEqual({ poor: 0, fair: 0, good: 0 });
  });
});

describe('computeMedianCycleTimeMs', () => {
  it('returns null when no finite values exist', () => {
    expect(computeMedianCycleTimeMs([null, null])).toBeNull();
    expect(computeMedianCycleTimeMs([])).toBeNull();
  });

  it('returns the middle value for an odd count (order-invariant)', () => {
    expect(computeMedianCycleTimeMs([300, 100, 200])).toBe(200);
    expect(computeMedianCycleTimeMs([200, 300, 100])).toBe(200);
  });

  it('returns the rounded mean of the two central values for an even count', () => {
    // sorted [100, 200, 300, 400] → mean(200,300) = 250
    expect(computeMedianCycleTimeMs([400, 100, 300, 200])).toBe(250);
    // odd-mean rounding: [100, 200, 301] is odd → 200; [100, 201] → round(150.5)=151
    expect(computeMedianCycleTimeMs([100, 201])).toBe(151);
  });

  it('excludes null/non-finite values from the median', () => {
    expect(computeMedianCycleTimeMs([100, null, 300, Infinity])).toBe(200);
  });
});

describe('computeActivityByWeek', () => {
  it('produces exactly weekCount buckets, oldest-first, anchored to referenceNowMs', () => {
    const buckets = computeActivityByWeek([], REF_NOW, 12);
    expect(buckets).toHaveLength(12);
    // Oldest bucket starts 12 weeks before REF_NOW.
    expect(buckets[0]!.weekStartIso).toBe(new Date(REF_NOW - 12 * WEEK).toISOString());
    // Last bucket starts 1 week before REF_NOW.
    expect(buckets[11]!.weekStartIso).toBe(new Date(REF_NOW - 1 * WEEK).toISOString());
    expect(buckets.every((b) => b.count === 0)).toBe(true);
  });

  it('buckets a workflow created mid-window into the correct week', () => {
    // 3 days before now → lands in the final (most-recent) bucket.
    const recent = REF_NOW - 3 * DAY;
    // 8 days before now → lands in the second-to-last bucket.
    const lastWeek = REF_NOW - 8 * DAY;
    const buckets = computeActivityByWeek([recent, lastWeek], REF_NOW, 12);
    expect(buckets[11]!.count).toBe(1);
    expect(buckets[10]!.count).toBe(1);
    const total = buckets.reduce((s, b) => s + b.count, 0);
    expect(total).toBe(2);
  });

  it('places a workflow at exactly referenceNowMs in the final bucket', () => {
    const buckets = computeActivityByWeek([REF_NOW], REF_NOW, 12);
    expect(buckets[11]!.count).toBe(1);
    expect(buckets.reduce((s, b) => s + b.count, 0)).toBe(1);
  });

  it('excludes workflows older than the trailing window', () => {
    const tooOld = REF_NOW - 13 * WEEK; // before the 12-week window start
    const buckets = computeActivityByWeek([tooOld], REF_NOW, 12);
    expect(buckets.reduce((s, b) => s + b.count, 0)).toBe(0);
  });

  it('excludes future-dated workflows (ts > referenceNowMs)', () => {
    const future = REF_NOW + DAY;
    const buckets = computeActivityByWeek([future], REF_NOW, 12);
    expect(buckets.reduce((s, b) => s + b.count, 0)).toBe(0);
  });

  it('is deterministic — identical inputs + clock produce byte-identical buckets', () => {
    const input = [REF_NOW - 2 * DAY, REF_NOW - 10 * DAY, REF_NOW - 40 * DAY];
    const a = computeActivityByWeek(input, REF_NOW, 12);
    const b = computeActivityByWeek(input, REF_NOW, 12);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('respects a custom weekCount', () => {
    const buckets = computeActivityByWeek([], REF_NOW, 4);
    expect(buckets).toHaveLength(4);
    expect(buckets[0]!.weekStartIso).toBe(new Date(REF_NOW - 4 * WEEK).toISOString());
  });
});
