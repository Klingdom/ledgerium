/**
 * Unit tests for admin-operations query helpers.
 *
 * Covers:
 *  - truncateUserId: format + edge cases
 *  - toIsoDate: UTC date formatting
 *  - buildDateRange: inclusive start/end, single-day case
 *  - binByDay: zero-fill gaps, correct bucket counts, out-of-range ignored
 *  - formatBytes: B / KB / MB / GB thresholds
 *  - getMemoryUsage: structural contract (no async I/O needed)
 *  - getUserVolume: Prisma mock happy path
 *  - getRecordingVolume: Prisma mock + status groupBy
 *  - getWorkflowVolume: processingSuccessRate when 0 workflows vs n workflows
 *  - getSystemHealth: Postgres happy path + SQLite fallback
 *
 * @iter 071
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock('@/db', () => ({
  db: {
    user: {
      count: vi.fn(),
      findMany: vi.fn(),
      groupBy: vi.fn(), // added Iter C QA — required for getSubscriptionBreakdown
    },
    upload: {
      count: vi.fn(),
      findMany: vi.fn(),
      groupBy: vi.fn(),
    },
    workflow: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    analyticsEvent: {
      groupBy: vi.fn(),
    },
    $queryRaw: vi.fn(),
  },
}));

import { db } from '@/db';
import {
  truncateUserId,
  toIsoDate,
  buildDateRange,
  binByDay,
  formatBytes,
  getMemoryUsage,
  getUserVolume,
  getRecordingVolume,
  getWorkflowVolume,
  getSystemHealth,
  getSubscriptionBreakdown,
} from './queries.js';

// ── Helper: typed mock access ─────────────────────────────────────────────────

const mockDb = db as unknown as {
  user: { count: ReturnType<typeof vi.fn>; findMany: ReturnType<typeof vi.fn>; groupBy: ReturnType<typeof vi.fn> };
  upload: { count: ReturnType<typeof vi.fn>; findMany: ReturnType<typeof vi.fn>; groupBy: ReturnType<typeof vi.fn> };
  workflow: { count: ReturnType<typeof vi.fn>; findMany: ReturnType<typeof vi.fn> };
  analyticsEvent: { groupBy: ReturnType<typeof vi.fn> };
  $queryRaw: ReturnType<typeof vi.fn>;
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ── truncateUserId ─────────────────────────────────────────────────────────────

describe('truncateUserId', () => {
  it('formats a standard UUID: first 8 chars + ... + last 4 chars', () => {
    const id = 'abcdef12-3456-7890-abcd-ef1234567890';
    expect(truncateUserId(id)).toBe('abcdef12...7890');
  });

  it('returns short ids unchanged (≤12 chars)', () => {
    expect(truncateUserId('short')).toBe('short');
    expect(truncateUserId('123456789012')).toBe('123456789012');
  });

  it('works on exactly 13-char id', () => {
    const id = '1234567890123';
    expect(truncateUserId(id)).toBe('12345678...0123');
  });
});

// ── toIsoDate ─────────────────────────────────────────────────────────────────

describe('toIsoDate', () => {
  it('returns YYYY-MM-DD using UTC', () => {
    const d = new Date('2026-05-13T23:59:59.999Z');
    expect(toIsoDate(d)).toBe('2026-05-13');
  });

  it('does not shift by local timezone offset', () => {
    const d = new Date('2026-01-01T00:00:00.000Z');
    expect(toIsoDate(d)).toBe('2026-01-01');
  });
});

// ── buildDateRange ─────────────────────────────────────────────────────────────

describe('buildDateRange', () => {
  it('returns one entry for a single day range', () => {
    const start = new Date('2026-05-01T00:00:00Z');
    const end = new Date('2026-05-01T23:59:59Z');
    const result = buildDateRange(start, end);
    expect(result).toEqual(['2026-05-01']);
  });

  it('returns inclusive dates for a 3-day range', () => {
    const start = new Date('2026-05-01T00:00:00Z');
    const end = new Date('2026-05-03T00:00:00Z');
    const result = buildDateRange(start, end);
    expect(result).toEqual(['2026-05-01', '2026-05-02', '2026-05-03']);
  });
});

// ── binByDay ──────────────────────────────────────────────────────────────────

describe('binByDay', () => {
  const start = new Date('2026-05-01T00:00:00Z');
  const end = new Date('2026-05-03T23:59:59Z');

  it('zero-fills days with no events', () => {
    const result = binByDay([], start, end);
    expect(result).toEqual([
      { date: '2026-05-01', count: 0 },
      { date: '2026-05-02', count: 0 },
      { date: '2026-05-03', count: 0 },
    ]);
  });

  it('counts multiple events on the same day', () => {
    const ts = [
      new Date('2026-05-01T10:00:00Z'),
      new Date('2026-05-01T14:00:00Z'),
      new Date('2026-05-02T09:00:00Z'),
    ];
    const result = binByDay(ts, start, end);
    expect(result).toEqual([
      { date: '2026-05-01', count: 2 },
      { date: '2026-05-02', count: 1 },
      { date: '2026-05-03', count: 0 },
    ]);
  });

  it('ignores timestamps outside the range', () => {
    const ts = [
      new Date('2026-04-30T23:59:59Z'), // before range
      new Date('2026-05-02T12:00:00Z'), // in range
      new Date('2026-05-04T00:00:00Z'), // after range
    ];
    const result = binByDay(ts, start, end);
    const may2 = result.find((b) => b.date === '2026-05-02');
    expect(may2?.count).toBe(1);
    const total = result.reduce((s, b) => s + b.count, 0);
    expect(total).toBe(1);
  });
});

// ── formatBytes ───────────────────────────────────────────────────────────────

describe('formatBytes', () => {
  it('formats bytes under 1 KB as "N B"', () => {
    expect(formatBytes(512)).toBe('512 B');
  });

  it('formats bytes in the KB range', () => {
    expect(formatBytes(2048)).toBe('2.0 KB');
  });

  it('formats bytes in the MB range', () => {
    expect(formatBytes(42 * 1024 * 1024)).toBe('42.0 MB');
  });

  it('formats bytes in the GB range', () => {
    expect(formatBytes(2 * 1024 * 1024 * 1024)).toBe('2.00 GB');
  });
});

// ── getMemoryUsage ────────────────────────────────────────────────────────────

describe('getMemoryUsage', () => {
  it('returns a structurally valid MemoryUsageSection', () => {
    const result = getMemoryUsage();
    expect(typeof result.uptimeSeconds).toBe('number');
    expect(result.uptimeSeconds).toBeGreaterThanOrEqual(0);
    expect(typeof result.heapUsedBytes).toBe('number');
    expect(typeof result.heapTotalBytes).toBe('number');
    expect(typeof result.rssBytes).toBe('number');
    expect(result.heapUsedPercent).toBeGreaterThanOrEqual(0);
    expect(result.heapUsedPercent).toBeLessThanOrEqual(100);
  });
});

// ── getUserVolume ─────────────────────────────────────────────────────────────

describe('getUserVolume', () => {
  const start = new Date('2026-05-01T00:00:00Z');
  const end = new Date('2026-05-07T23:59:59Z');

  it('returns totalUsers, mau30d, timeseries, topUploaders, activationRatePct, and newUsersInRange', async () => {
    mockDb.user.count
      .mockResolvedValueOnce(150)   // totalUsers
      .mockResolvedValueOnce(42);   // mau30d
    mockDb.user.findMany.mockResolvedValue([
      { createdAt: new Date('2026-05-02T10:00:00Z') },
    ]);
    mockDb.upload.groupBy.mockResolvedValue([
      { userId: 'abcdef12-3456-7890-abcd-ef1234567890', _count: { id: 5 } },
    ]);
    // Growth Intelligence Extension — activation rate query
    mockDb.workflow.findMany.mockResolvedValue([
      { userId: 'user-a' },
      { userId: 'user-b' },
      { userId: 'user-a' }, // duplicate — should be counted once via Set
    ]);

    const result = await getUserVolume(start, end);

    expect(result.totalUsers).toBe(150);
    expect(result.mau30d).toBe(42);
    expect(result.newUsersTimeSeries.length).toBe(7); // 7-day range
    const may2 = result.newUsersTimeSeries.find((b) => b.date === '2026-05-02');
    expect(may2?.count).toBe(1);
    expect(result.topUploaders[0]!.userId).toBe('abcdef12...7890');
    expect(result.topUploaders[0]!.uploadCount).toBe(5);
    // Growth Intelligence Extension — new fields
    // 2 distinct users / 150 totalUsers * 100 = 1.33%
    expect(result.activationRatePct).toBe(Math.round((2 / 150) * 10000) / 100);
    // newUsersTimeSeries has 1 signup on 2026-05-02 → sum = 1
    expect(result.newUsersInRange).toBe(1);
  });
});

// ── getRecordingVolume ────────────────────────────────────────────────────────

describe('getRecordingVolume', () => {
  const start = new Date('2026-05-01T00:00:00Z');
  const end = new Date('2026-05-07T23:59:59Z');

  it('returns counts and status breakdown', async () => {
    mockDb.upload.count.mockResolvedValue(10);
    mockDb.upload.findMany.mockResolvedValue([
      { uploadedAt: new Date('2026-05-03T10:00:00Z') },
    ]);
    mockDb.upload.groupBy.mockResolvedValue([
      { validationStatus: 'valid', _count: { id: 7 } },
      { validationStatus: 'pending', _count: { id: 3 } },
    ]);

    const result = await getRecordingVolume(start, end);

    expect(result.uploadsInRange).toBe(10);
    expect(result.uploadsByStatus.valid).toBe(7);
    expect(result.uploadsByStatus.pending).toBe(3);
    expect(result.uploadsByStatus.invalid).toBe(0);
    expect(result.uploadsTimeSeries.length).toBe(7);
  });
});

// ── getWorkflowVolume ─────────────────────────────────────────────────────────

describe('getWorkflowVolume', () => {
  const start = new Date('2026-05-01T00:00:00Z');
  const end = new Date('2026-05-07T23:59:59Z');

  it('returns null processingSuccessRate when no workflows exist', async () => {
    mockDb.workflow.count
      .mockResolvedValueOnce(0)  // totalWorkflows
      .mockResolvedValueOnce(0); // processedCount
    mockDb.workflow.findMany.mockResolvedValue([]);

    const result = await getWorkflowVolume(start, end);
    expect(result.processingSuccessRate).toBeNull();
    expect(result.totalWorkflows).toBe(0);
  });

  it('computes processingSuccessRate as percent rounded to 2 dp', async () => {
    mockDb.workflow.count
      .mockResolvedValueOnce(10) // totalWorkflows
      .mockResolvedValueOnce(7); // processedCount (confidence not null)
    mockDb.workflow.findMany.mockResolvedValue([]);

    const result = await getWorkflowVolume(start, end);
    expect(result.processingSuccessRate).toBe(70);
    expect(result.totalWorkflows).toBe(10);
  });
});

// ── getSystemHealth ───────────────────────────────────────────────────────────

describe('getSystemHealth', () => {
  it('returns dbSize with available: true when Postgres query succeeds', async () => {
    mockDb.$queryRaw.mockResolvedValue([
      { size: BigInt(44_040_192) }, // 42 MB
    ]);
    mockDb.analyticsEvent.groupBy.mockResolvedValue([
      { eventName: 'upload_failed', _count: { id: 3 } },
    ]);

    const result = await getSystemHealth();

    expect(result.dbSize.available).toBe(true);
    if (result.dbSize.available) {
      expect(result.dbSize.totalBytes).toBe(44_040_192);
      expect(result.dbSize.humanReadable).toMatch(/MB/);
    }
    expect(result.errorEvents24hTotal).toBe(3);
    expect(result.errorEvents24h[0]!.eventName).toBe('upload_failed');
  });

  it('returns dbSize with available: false when $queryRaw throws (SQLite)', async () => {
    mockDb.$queryRaw.mockRejectedValue(new Error('near "pg_total_relation_size": syntax error'));
    mockDb.analyticsEvent.groupBy.mockResolvedValue([]);

    const result = await getSystemHealth();

    expect(result.dbSize.available).toBe(false);
    if (!result.dbSize.available) {
      expect(result.dbSize.reason).toBe('sqlite-dev-mode');
    }
    expect(result.errorEvents24hTotal).toBe(0);
  });
});

// ── getSubscriptionBreakdown — edge cases (Iter C QA) ─────────────────────────
//
// Edge cases verified:
//   (a) zero users → conversion 0, MRR 0, no divide-by-zero
//   (b) all users trialing → MRR excludes them (active-only)
//   (c) past_due/canceled > 0 → surfaced in byStatus
//   (d) enterprise users → excluded from MRR dollar sum, counted in enterpriseCount
//   (e) single compound groupBy (joint distribution) is the mechanism
//   (f) unknown plan string normalised via toPlanType (unknown → 'free')
//   (g) empty groupBy result (no-data / SQLite fresh DB) → zeroed output, no throw
//   (h) formatCurrency edge cases covered in format-utils.test.ts (cross-ref)

describe('getSubscriptionBreakdown — edge cases (Iter C QA)', () => {

  // ── (a) zero users ───────────────────────────────────────────────────────────

  it('(a) zero users: MRR is 0, paidUserCount is 0, freeToPaidConversionPct is 0 (no divide-by-zero)', async () => {
    mockDb.user.groupBy.mockResolvedValue([]);

    const result = await getSubscriptionBreakdown();

    expect(result.mrr.estimatedUsd).toBe(0);
    expect(result.paidUserCount).toBe(0);
    expect(result.freeToPaidConversionPct).toBe(0);
    // All plan counts should be zero
    expect(result.byPlan.free).toBe(0);
    expect(result.byPlan.starter).toBe(0);
    expect(result.byPlan.team).toBe(0);
    expect(result.byPlan.growth).toBe(0);
    expect(result.byPlan.enterprise).toBe(0);
    // All status counts should be zero
    expect(result.byStatus.none).toBe(0);
    expect(result.byStatus.trialing).toBe(0);
    expect(result.byStatus.active).toBe(0);
    expect(result.byStatus.past_due).toBe(0);
    expect(result.byStatus.canceled).toBe(0);
  });

  // ── (b) all users trialing — active-only MRR excludes trialing ───────────────

  it('(b) all 10 users are trialing starter: MRR is 0 (active-only), byStatus.trialing is 10', async () => {
    mockDb.user.groupBy.mockResolvedValue([
      { plan: 'starter', subscriptionStatus: 'trialing', _count: { id: 10 } },
    ]);

    const result = await getSubscriptionBreakdown();

    expect(result.mrr.estimatedUsd).toBe(0);        // trialing not in MRR_BILLABLE_STATUSES
    expect(result.paidUserCount).toBe(0);            // only active counts toward paidUserCount
    expect(result.byStatus.trialing).toBe(10);
    expect(result.byPlan.starter).toBe(10);
    // freeToPaidConversionPct: 0 paid / 10 total = 0
    expect(result.freeToPaidConversionPct).toBe(0);
  });

  // ── (c) past_due and canceled surfaced in byStatus ───────────────────────────

  it('(c) past_due and canceled users appear in byStatus counts', async () => {
    mockDb.user.groupBy.mockResolvedValue([
      { plan: 'team', subscriptionStatus: 'past_due', _count: { id: 3 } },
      { plan: 'starter', subscriptionStatus: 'canceled', _count: { id: 2 } },
      { plan: 'starter', subscriptionStatus: 'active', _count: { id: 5 } },
    ]);

    const result = await getSubscriptionBreakdown();

    expect(result.byStatus.past_due).toBe(3);
    expect(result.byStatus.canceled).toBe(2);
    expect(result.byStatus.active).toBe(5);
    // MRR: only active starter (5 × price.starter) — past_due and canceled excluded
    expect(result.mrr.estimatedUsd).toBeGreaterThan(0);
    // paidUserCount = active non-free only = 5
    expect(result.paidUserCount).toBe(5);
  });

  // ── (d) enterprise excluded from MRR, counted in enterpriseCount ─────────────

  it('(d) enterprise users: excluded from MRR dollar sum, reflected in enterpriseCount', async () => {
    mockDb.user.groupBy.mockResolvedValue([
      { plan: 'enterprise', subscriptionStatus: 'active', _count: { id: 4 } },
      { plan: 'starter', subscriptionStatus: 'active', _count: { id: 2 } },
    ]);

    const result = await getSubscriptionBreakdown();

    // Enterprise NOT in MRR — only starter × 2 contributes
    expect(result.mrr.estimatedUsd).toBeGreaterThan(0);
    expect(result.mrr.estimatedUsd).toBe(result.mrr.byPlanUsd.starter); // only starter in MRR
    // Enterprise count is tracked separately
    expect(result.mrr.enterpriseCount).toBe(4);
    expect(result.byPlan.enterprise).toBe(4);
    // paidUserCount = active non-free non-enterprise = starter 2 only
    expect(result.paidUserCount).toBe(2);
  });

  // ── (e) joint distribution: counts must match sum of groupBy rows ─────────────

  it('(e) joint compound groupBy: byPlan and byStatus totals both equal sum of all row counts', async () => {
    mockDb.user.groupBy.mockResolvedValue([
      { plan: 'free',    subscriptionStatus: 'none',    _count: { id: 50 } },
      { plan: 'starter', subscriptionStatus: 'trialing', _count: { id: 5 } },
      { plan: 'starter', subscriptionStatus: 'active',   _count: { id: 10 } },
      { plan: 'team',    subscriptionStatus: 'active',   _count: { id: 3 } },
      { plan: 'growth',  subscriptionStatus: 'active',   _count: { id: 2 } },
    ]);

    const result = await getSubscriptionBreakdown();

    const totalFromPlan = Object.values(result.byPlan).reduce((s, v) => s + v, 0);
    const totalFromStatus = Object.values(result.byStatus).reduce((s, v) => s + v, 0);
    const rowTotal = 50 + 5 + 10 + 3 + 2; // 70

    expect(totalFromPlan).toBe(rowTotal);
    expect(totalFromStatus).toBe(rowTotal);
  });

  // ── (f) unknown plan string normalised to 'free' via toPlanType ──────────────

  it('(f) unknown plan string "legacy_plan" normalises to "free" (toPlanType fallback)', async () => {
    mockDb.user.groupBy.mockResolvedValue([
      { plan: 'legacy_plan', subscriptionStatus: 'active', _count: { id: 7 } },
    ]);

    const result = await getSubscriptionBreakdown();

    // Unknown plan → toPlanType → 'free' (not a billable MRR plan)
    expect(result.byPlan.free).toBe(7);
    // Not in MRR_PLANS → MRR remains 0
    expect(result.mrr.estimatedUsd).toBe(0);
    // paidUserCount = 0 (free plan is not billable)
    expect(result.paidUserCount).toBe(0);
  });

  // ── (g) empty DB / SQLite no-data: empty groupBy → zeroed output, no throw ──

  it('(g) empty groupBy result (fresh DB / no users): all counts zero, no exception', async () => {
    mockDb.user.groupBy.mockResolvedValue([]);

    // Must not throw — await directly and assert on result
    const result = await getSubscriptionBreakdown();

    expect(result.mrr.estimatedUsd).toBe(0);
    expect(result.paidUserCount).toBe(0);
    expect(result.freeToPaidConversionPct).toBe(0);
    expect(result.mrr.enterpriseCount).toBe(0);
    // Zero-filled closed unions present
    expect(Object.keys(result.byPlan)).toEqual(
      expect.arrayContaining(['free', 'starter', 'team', 'growth', 'enterprise']),
    );
    expect(Object.keys(result.byStatus)).toEqual(
      expect.arrayContaining(['none', 'trialing', 'active', 'past_due', 'canceled']),
    );
  });

  // ── MRR correctness: mixed active plans compute correct dollar sum ────────────

  it('MRR correctness: 2 active starter + 1 active team → estimatedUsd = (2×starter) + (1×team)', async () => {
    const { MONTHLY_PRICE_USD } = await import('./pricing.js');

    mockDb.user.groupBy.mockResolvedValue([
      { plan: 'starter', subscriptionStatus: 'active', _count: { id: 2 } },
      { plan: 'team',    subscriptionStatus: 'active', _count: { id: 1 } },
    ]);

    const result = await getSubscriptionBreakdown();

    const expected = 2 * MONTHLY_PRICE_USD.starter + 1 * MONTHLY_PRICE_USD.team;
    expect(result.mrr.estimatedUsd).toBe(expected);
    expect(result.mrr.byPlanUsd.starter).toBe(2 * MONTHLY_PRICE_USD.starter);
    expect(result.mrr.byPlanUsd.team).toBe(1 * MONTHLY_PRICE_USD.team);
    expect(result.mrr.byPlanUsd.growth).toBe(0);
    expect(result.paidUserCount).toBe(3);
    // freeToPaidConversionPct: 3 paid / 3 total * 100 = 100
    expect(result.freeToPaidConversionPct).toBe(100);
  });

  // ── R-1 drift guard: MRR basis echoes MONTHLY_PRICE_USD ─────────────────────

  it('mrr.basis.billableStatuses contains "active" (R-1 MRR_BILLABLE_STATUSES pass-through)', async () => {
    mockDb.user.groupBy.mockResolvedValue([]);

    const result = await getSubscriptionBreakdown();

    expect(result.mrr.basis.billableStatuses).toContain('active');
  });
});
