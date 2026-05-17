/**
 * TypeScript interface for the Admin Operations Dashboard API response.
 *
 * Exported contract consumed by:
 *   - GET /api/admin/operations (route.ts — producer)
 *   - Frontend dashboard widgets (consumers — future)
 *
 * Privacy rules (PRD §6 / METRICS.md §6):
 *   - No raw email addresses in any field
 *   - userId values are truncated: first 8 chars + "..." + last 4 chars
 *   - DB size and heap memory exposed only to authenticated admin
 *
 * @module admin-operations/types
 * @iter 071
 */

// ── Shared ─────────────────────────────────────────────────────────────────────

/** ISO-8601 date string (YYYY-MM-DD) used for time-series bucket keys. */
export type IsoDateString = string;

/** Numeric time-range in days. Matches the ?range= query param values. */
export type TimeRangeDays = 7 | 30 | 90;

// ── Section 1: User volume ─────────────────────────────────────────────────────

export interface DailyBucket {
  /** ISO date string, e.g. "2026-05-01" */
  date: IsoDateString;
  /** Count of events/records in this bucket */
  count: number;
}

export interface UserVolumeSection {
  /** Total registered users (all time) */
  totalUsers: number;
  /** Monthly active users proxy: users with updatedAt >= now − 30d */
  mau30d: number;
  /** Daily new-user signups for the selected range */
  newUsersTimeSeries: DailyBucket[];
  /** Top 10 uploaders by upload count; userId truncated for privacy */
  topUploaders: Array<{ userId: string; uploadCount: number }>;
}

// ── Section 2: Recording volume ────────────────────────────────────────────────

export interface RecordingVolumeSection {
  /** Total uploads in the selected range */
  uploadsInRange: number;
  /** Daily upload counts for the selected range */
  uploadsTimeSeries: DailyBucket[];
  /** Breakdown by validationStatus for uploads in range */
  uploadsByStatus: {
    pending: number;
    valid: number;
    invalid: number;
  };
}

// ── Section 3: Workflow processing ────────────────────────────────────────────

export interface WorkflowProcessingSection {
  /** Total active (non-deleted) workflows */
  totalWorkflows: number;
  /**
   * Proxy for processing success rate:
   * (workflows with confidence IS NOT NULL) / total workflows * 100
   * Range: 0–100. null when totalWorkflows === 0.
   */
  processingSuccessRate: number | null;
  /** Daily new-workflow creation counts for the selected range */
  workflowsTimeSeries: DailyBucket[];
}

// ── Section 4: System health ───────────────────────────────────────────────────

export interface DbSizeInfo {
  available: true;
  /** Total Postgres DB size in bytes (pg_total_relation_size) */
  totalBytes: number;
  /** Human-readable string, e.g. "42.3 MB" */
  humanReadable: string;
}

export interface DbSizeUnavailable {
  available: false;
  /** Reason the DB size is unavailable (e.g. SQLite dev mode) */
  reason: string;
}

export type DbSize = DbSizeInfo | DbSizeUnavailable;

export interface ErrorEventRow {
  eventName: string;
  count: number;
}

export interface SystemHealthSection {
  dbSize: DbSize;
  /** Error-class analytics events in the last 24 hours */
  errorEvents24h: ErrorEventRow[];
  /** Total count of error-class events in the last 24 hours */
  errorEvents24hTotal: number;
}

// ── Section 5: Node runtime ────────────────────────────────────────────────────

export interface MemoryUsageSection {
  /** process.uptime() in seconds */
  uptimeSeconds: number;
  /** Heap used in bytes (process.memoryUsage().heapUsed) */
  heapUsedBytes: number;
  /** Heap total in bytes (process.memoryUsage().heapTotal) */
  heapTotalBytes: number;
  /** RSS in bytes (process.memoryUsage().rss) */
  rssBytes: number;
  /** Percentage of heap used relative to heap total, 0–100 */
  heapUsedPercent: number;
}

// ── Top-level KPI tiles ────────────────────────────────────────────────────────

export interface KpiTiles {
  totalUsers: number;
  mau30d: number;
  uploadsInRange: number;
  /** DB size in bytes, or null when unavailable */
  dbSizeBytes: number | null;
  /** Heap used in bytes */
  nodeHeapUsedBytes: number;
  errorEvents24hTotal: number;
}

// ── Top-level response ─────────────────────────────────────────────────────────

export interface AdminOperationsResponse {
  /** The range that was applied to time-windowed queries */
  rangeApplied: TimeRangeDays;
  /** Six KPI tiles displayed at the top of the dashboard */
  kpi: KpiTiles;
  /** Section 1 — User volume */
  userVolume: UserVolumeSection;
  /** Section 2 — Recording volume */
  recordingVolume: RecordingVolumeSection;
  /** Section 3 — Workflow processing */
  workflowProcessing: WorkflowProcessingSection;
  /** Section 4 — System health */
  systemHealth: SystemHealthSection;
  /** Section 5 — Node runtime memory */
  memoryUsage: MemoryUsageSection;
}

// ── API envelope ───────────────────────────────────────────────────────────────

export interface AdminOperationsApiResponse {
  data: AdminOperationsResponse | null;
  error: { code: string; message: string } | null;
  meta: {
    generatedAt: string;
    queryDurationMs: number;
  };
}
