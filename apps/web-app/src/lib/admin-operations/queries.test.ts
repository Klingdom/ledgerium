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
} from './queries.js';

// ── Helper: typed mock access ─────────────────────────────────────────────────

const mockDb = db as unknown as {
  user: { count: ReturnType<typeof vi.fn>; findMany: ReturnType<typeof vi.fn> };
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

  it('returns totalUsers, mau30d, timeseries, and topUploaders', async () => {
    mockDb.user.count
      .mockResolvedValueOnce(150)   // totalUsers
      .mockResolvedValueOnce(42);   // mau30d
    mockDb.user.findMany.mockResolvedValue([
      { createdAt: new Date('2026-05-02T10:00:00Z') },
    ]);
    mockDb.upload.groupBy.mockResolvedValue([
      { userId: 'abcdef12-3456-7890-abcd-ef1234567890', _count: { id: 5 } },
    ]);

    const result = await getUserVolume(start, end);

    expect(result.totalUsers).toBe(150);
    expect(result.mau30d).toBe(42);
    expect(result.newUsersTimeSeries.length).toBe(7); // 7-day range
    const may2 = result.newUsersTimeSeries.find((b) => b.date === '2026-05-02');
    expect(may2?.count).toBe(1);
    expect(result.topUploaders[0]!.userId).toBe('abcdef12...7890');
    expect(result.topUploaders[0]!.uploadCount).toBe(5);
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
