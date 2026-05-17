/**
 * Prisma query functions for the Admin Operations Dashboard.
 *
 * All functions are pure async queries — no side effects, no auth checks.
 * Auth is enforced at the route layer. These functions can be called in
 * parallel via Promise.all.
 *
 * Cross-DB safety:
 *   - Prisma `findMany` / `count` / `groupBy` calls work on both SQLite and Postgres.
 *   - The DB size query uses `pg_total_relation_size` (Postgres-only) and is
 *     wrapped in try/catch; on SQLite it returns `{ available: false }`.
 *
 * Privacy:
 *   - No raw email addresses are returned from any function.
 *   - userIds are truncated: `${id.slice(0, 8)}...${id.slice(-4)}`.
 *
 * @module admin-operations/queries
 * @iter 071
 */

import { db } from '@/db';
import type {
  UserVolumeSection,
  RecordingVolumeSection,
  WorkflowProcessingSection,
  SystemHealthSection,
  MemoryUsageSection,
  DailyBucket,
  DbSize,
  ErrorEventRow,
} from './types.js';

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Truncate a userId for display. Format: first 8 chars + "..." + last 4 chars.
 * If the id is shorter than 13 chars, return it unchanged (edge case in tests).
 */
export function truncateUserId(id: string): string {
  if (id.length <= 12) return id;
  return `${id.slice(0, 8)}...${id.slice(-4)}`;
}

/**
 * Convert a Date to an ISO date string (YYYY-MM-DD) using UTC.
 */
export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Build an array of ISO date strings from startDate to endDate (inclusive),
 * stepping by 1 calendar day. All in UTC.
 */
export function buildDateRange(startDate: Date, endDate: Date): string[] {
  const dates: string[] = [];
  const cursor = new Date(startDate);
  cursor.setUTCHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setUTCHours(23, 59, 59, 999);
  while (cursor <= end) {
    dates.push(toIsoDate(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

/**
 * Bin an array of dates into daily buckets.
 * Returns an array of { date, count } objects for every day in the range,
 * including days with zero events.
 */
export function binByDay(
  timestamps: Date[],
  startDate: Date,
  endDate: Date,
): DailyBucket[] {
  const dateRange = buildDateRange(startDate, endDate);
  const counts = new Map<string, number>(dateRange.map((d) => [d, 0]));
  for (const ts of timestamps) {
    const key = toIsoDate(ts);
    if (counts.has(key)) {
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return dateRange.map((date) => ({ date, count: counts.get(date) ?? 0 }));
}

/**
 * Format bytes as a human-readable string (e.g. "42.3 MB").
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

// ── Error event names ──────────────────────────────────────────────────────────

const ERROR_EVENT_NAMES = ['upload_failed', 'api_error', 'client_error'] as const;

// ── Section query functions ────────────────────────────────────────────────────

/**
 * Section 1 — User volume.
 *
 * Computes:
 *   - totalUsers (all time count)
 *   - mau30d (users with updatedAt >= now - 30d, regardless of range param)
 *   - newUsersTimeSeries (daily signups in range)
 *   - topUploaders (top 10 by upload count in range, truncated userId)
 */
export async function getUserVolume(
  startDate: Date,
  endDate: Date,
): Promise<UserVolumeSection> {
  const now = new Date();
  const mau30dStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    mau30d,
    newUsersRaw,
    topUploadersRaw,
  ] = await Promise.all([
    // Total registered users
    db.user.count(),

    // MAU proxy: updated in last 30 days
    db.user.count({
      where: {
        updatedAt: { gte: mau30dStart },
      },
    }),

    // New signups in range — pull raw timestamps for Node-side binning
    db.user.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: { createdAt: true },
    }),

    // Top 10 uploaders by upload count in range
    db.upload.groupBy({
      by: ['userId'],
      where: {
        uploadedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    }),
  ]);

  const newUsersTimeSeries = binByDay(
    newUsersRaw.map((u) => u.createdAt),
    startDate,
    endDate,
  );

  const topUploaders = topUploadersRaw.map((row) => ({
    userId: truncateUserId(row.userId),
    uploadCount: row._count.id,
  }));

  return {
    totalUsers,
    mau30d,
    newUsersTimeSeries,
    topUploaders,
  };
}

/**
 * Section 2 — Recording volume.
 *
 * Computes:
 *   - uploadsInRange (total uploads in time window)
 *   - uploadsTimeSeries (daily upload counts in range)
 *   - uploadsByStatus (breakdown by validationStatus in range)
 */
export async function getRecordingVolume(
  startDate: Date,
  endDate: Date,
): Promise<RecordingVolumeSection> {
  const [uploadsInRange, uploadsRaw, uploadsByStatusRaw] = await Promise.all([
    // Total count in range
    db.upload.count({
      where: {
        uploadedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    }),

    // Raw timestamps for time series binning
    db.upload.findMany({
      where: {
        uploadedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: { uploadedAt: true },
    }),

    // Group by validationStatus
    db.upload.groupBy({
      by: ['validationStatus'],
      where: {
        uploadedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      _count: { id: true },
    }),
  ]);

  const uploadsTimeSeries = binByDay(
    uploadsRaw.map((u) => u.uploadedAt),
    startDate,
    endDate,
  );

  const statusCounts = { pending: 0, valid: 0, invalid: 0 };
  for (const row of uploadsByStatusRaw) {
    const status = row.validationStatus as keyof typeof statusCounts;
    if (status in statusCounts) {
      statusCounts[status] = row._count.id;
    }
  }

  return {
    uploadsInRange,
    uploadsTimeSeries,
    uploadsByStatus: statusCounts,
  };
}

/**
 * Section 3 — Workflow processing.
 *
 * Computes:
 *   - totalWorkflows (active + archived; excludes deleted)
 *   - processingSuccessRate (confidence IS NOT NULL / total * 100)
 *   - workflowsTimeSeries (daily workflow creation in range)
 *
 * Note: There is no WorkflowRun model in the current schema. Processing success
 * is proxied by the presence of a non-null `confidence` field on the Workflow.
 */
export async function getWorkflowVolume(
  startDate: Date,
  endDate: Date,
): Promise<WorkflowProcessingSection> {
  const [
    totalWorkflows,
    processedCount,
    workflowsRaw,
  ] = await Promise.all([
    // Total non-deleted workflows
    db.workflow.count({
      where: {
        status: { not: 'deleted' },
      },
    }),

    // Workflows with a non-null confidence value (processing proxy)
    db.workflow.count({
      where: {
        status: { not: 'deleted' },
        confidence: { not: null },
      },
    }),

    // Raw creation timestamps in range for time series
    db.workflow.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        status: { not: 'deleted' },
      },
      select: { createdAt: true },
    }),
  ]);

  const processingSuccessRate =
    totalWorkflows === 0
      ? null
      : Math.round((processedCount / totalWorkflows) * 10000) / 100;

  const workflowsTimeSeries = binByDay(
    workflowsRaw.map((w) => w.createdAt),
    startDate,
    endDate,
  );

  return {
    totalWorkflows,
    processingSuccessRate,
    workflowsTimeSeries,
  };
}

/**
 * Section 4 — System health.
 *
 * Computes:
 *   - dbSize: Postgres pg_total_relation_size, or { available: false } on SQLite
 *   - errorEvents24h: analytics events with error-class names in last 24 hours
 *   - errorEvents24hTotal: total count
 */
export async function getSystemHealth(): Promise<SystemHealthSection> {
  const now = new Date();
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const [dbSize, errorEventsRaw] = await Promise.all([
    // DB size — Postgres only; SQLite degrades gracefully
    (async (): Promise<DbSize> => {
      try {
        const result = await db.$queryRaw<Array<{ size: bigint }>>`
          SELECT pg_total_relation_size(quote_ident(table_name))::bigint AS size
          FROM information_schema.tables
          WHERE table_schema = 'public'
        `;
        const totalBytes = result.reduce(
          (sum, row) => sum + Number(row.size),
          0,
        );
        return {
          available: true,
          totalBytes,
          humanReadable: formatBytes(totalBytes),
        };
      } catch {
        return {
          available: false,
          reason: 'sqlite-dev-mode',
        };
      }
    })(),

    // Error-class analytics events in last 24h
    db.analyticsEvent.groupBy({
      by: ['eventName'],
      where: {
        eventName: { in: [...ERROR_EVENT_NAMES] },
        createdAt: { gte: last24h },
      },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    }),
  ]);

  const errorEvents24h: ErrorEventRow[] = errorEventsRaw.map((row) => ({
    eventName: row.eventName,
    count: row._count.id,
  }));

  const errorEvents24hTotal = errorEvents24h.reduce(
    (sum, row) => sum + row.count,
    0,
  );

  return {
    dbSize,
    errorEvents24h,
    errorEvents24hTotal,
  };
}

/**
 * Section 5 — Node runtime memory.
 *
 * Reads process.memoryUsage() and process.uptime() at call time.
 * No async I/O — synchronous system call wrapped for consistent interface.
 */
export function getMemoryUsage(): MemoryUsageSection {
  const mem = process.memoryUsage();
  const uptimeSeconds = Math.floor(process.uptime());
  const heapUsedPercent =
    mem.heapTotal === 0
      ? 0
      : Math.round((mem.heapUsed / mem.heapTotal) * 10000) / 100;

  return {
    uptimeSeconds,
    heapUsedBytes: mem.heapUsed,
    heapTotalBytes: mem.heapTotal,
    rssBytes: mem.rss,
    heapUsedPercent,
  };
}
