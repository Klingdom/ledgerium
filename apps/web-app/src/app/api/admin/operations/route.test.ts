/**
 * Unit tests for GET /api/admin/operations.
 *
 * Covers:
 *  - 404 when unauthenticated (no session)
 *  - 404 when session exists but email is not on admin allowlist
 *  - 200 happy path with default 30d range
 *  - 200 with explicit 7d range
 *  - 200 with explicit 90d range
 *  - Invalid range param falls back to 30d default
 *  - rangeApplied field matches the parsed range
 *  - Response envelope shape: data / error / meta fields present
 *  - KPI tiles assembled correctly from section data
 *  - 500 when a query throws
 *  - 404 response has correct error code "not_found"
 *  - queryDurationMs is a non-negative number
 *  - generatedAt is an ISO-8601 string
 *  - processingSuccessRate is null when no workflows exist
 *  — Growth Intelligence Extension (Iteration A):
 *  - subscriptionBreakdown section present in response
 *  - mrrUsd KPI tile assembled from subscription breakdown
 *  - payingSubscribers KPI tile assembled from subscription breakdown
 *  - signupsInRange KPI tile assembled from userVolume.newUsersInRange
 *  - freeToPaidConversionPct KPI tile assembled from subscription breakdown
 *  - activationRatePct KPI tile assembled from userVolume
 *  - subscriptionBreakdown.byPlan contains all plan keys
 *  - subscriptionBreakdown.byStatus contains all status keys
 *  - subscriptionBreakdown.mrr.estimatedUsd is a non-negative number
 *
 * Mocking strategy:
 *  - vi.mock('@/lib/auth') — controls session
 *  - vi.mock('@/lib/admin-allowlist') — controls isAdminUnlimited
 *  - vi.mock('@/lib/admin-operations/queries') — controls all DB calls
 *  - Query mocks return minimal valid shapes; structural validation done in
 *    queries.test.ts
 *
 * @iter 071 — original
 * @iter Iteration A — Growth Intelligence Extension (additive tests)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/admin-allowlist', () => ({
  isAdminUnlimited: vi.fn(),
}));

vi.mock('@/lib/admin-operations/queries', () => ({
  getUserVolume: vi.fn(),
  getRecordingVolume: vi.fn(),
  getWorkflowVolume: vi.fn(),
  getSystemHealth: vi.fn(),
  getMemoryUsage: vi.fn(),
  getSubscriptionBreakdown: vi.fn(),
}));

import { auth } from '@/lib/auth';
import { isAdminUnlimited } from '@/lib/admin-allowlist';
import {
  getUserVolume,
  getRecordingVolume,
  getWorkflowVolume,
  getSystemHealth,
  getMemoryUsage,
  getSubscriptionBreakdown,
} from '@/lib/admin-operations/queries';
import { GET } from './route';

// ── Typed mock references ─────────────────────────────────────────────────────

const mockAuth = auth as ReturnType<typeof vi.fn>;
const mockIsAdmin = isAdminUnlimited as ReturnType<typeof vi.fn>;
const mockGetUserVolume = getUserVolume as ReturnType<typeof vi.fn>;
const mockGetRecordingVolume = getRecordingVolume as ReturnType<typeof vi.fn>;
const mockGetWorkflowVolume = getWorkflowVolume as ReturnType<typeof vi.fn>;
const mockGetSystemHealth = getSystemHealth as ReturnType<typeof vi.fn>;
const mockGetMemoryUsage = getMemoryUsage as ReturnType<typeof vi.fn>;
const mockGetSubscriptionBreakdown = getSubscriptionBreakdown as ReturnType<typeof vi.fn>;

// ── Default mock data ─────────────────────────────────────────────────────────

const ADMIN_EMAIL = 'admin@example.com';

const DEFAULT_USER_VOLUME = {
  totalUsers: 200,
  mau30d: 50,
  newUsersTimeSeries: [],
  topUploaders: [],
  // Growth Intelligence Extension fields
  activationRatePct: 40,
  newUsersInRange: 12,
};

const DEFAULT_RECORDING_VOLUME = {
  uploadsInRange: 30,
  uploadsTimeSeries: [],
  uploadsByStatus: { pending: 5, valid: 20, invalid: 5 },
};

const DEFAULT_WORKFLOW_PROCESSING = {
  totalWorkflows: 10,
  processingSuccessRate: 70,
  workflowsTimeSeries: [],
  // Growth Intelligence Extension field
  workflowUpdatesTimeSeries: [],
};

const DEFAULT_SYSTEM_HEALTH = {
  dbSize: { available: true, totalBytes: 10_000_000, humanReadable: '9.5 MB' },
  errorEvents24h: [],
  errorEvents24hTotal: 0,
};

const DEFAULT_MEMORY_USAGE = {
  uptimeSeconds: 3600,
  heapUsedBytes: 50_000_000,
  heapTotalBytes: 100_000_000,
  rssBytes: 80_000_000,
  heapUsedPercent: 50,
};

/**
 * Minimal zero-filled SubscriptionBreakdownSection fixture.
 * Real shape is validated in queries.test.ts.
 */
const DEFAULT_SUBSCRIPTION_BREAKDOWN = {
  byPlan: {
    free: 150,
    starter: 20,
    team: 15,
    growth: 5,
    enterprise: 2,
  },
  byStatus: {
    none: 155,
    trialing: 5,
    active: 37,
    past_due: 2,
    canceled: 1,
  },
  mrr: {
    estimatedUsd: 20 * 49 + 15 * 249 + 5 * 799, // 980 + 3735 + 3995 = 8710
    byPlanUsd: {
      starter: 20 * 49,
      team: 15 * 249,
      growth: 5 * 799,
    },
    enterpriseCount: 2,
    basis: {
      monthlyPriceUsd: { starter: 49, team: 249, growth: 799 },
      billableStatuses: ['active'],
    },
  },
  paidUserCount: 37,
  freeToPaidConversionPct: (37 / 200) * 100,
};

function setupAdminSession(): void {
  mockAuth.mockResolvedValue({ user: { email: ADMIN_EMAIL, id: 'user_001' } });
  mockIsAdmin.mockReturnValue(true);
  mockGetUserVolume.mockResolvedValue(DEFAULT_USER_VOLUME);
  mockGetRecordingVolume.mockResolvedValue(DEFAULT_RECORDING_VOLUME);
  mockGetWorkflowVolume.mockResolvedValue(DEFAULT_WORKFLOW_PROCESSING);
  mockGetSystemHealth.mockResolvedValue(DEFAULT_SYSTEM_HEALTH);
  mockGetMemoryUsage.mockReturnValue(DEFAULT_MEMORY_USAGE);
  mockGetSubscriptionBreakdown.mockResolvedValue(DEFAULT_SUBSCRIPTION_BREAKDOWN);
}

function makeRequest(range?: string): NextRequest {
  const url = range
    ? `http://localhost/api/admin/operations?range=${range}`
    : 'http://localhost/api/admin/operations';
  return new NextRequest(url);
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('GET /api/admin/operations', () => {
  it('returns 404 when there is no session', async () => {
    mockAuth.mockResolvedValue(null);
    mockIsAdmin.mockReturnValue(false);

    const response = await GET(makeRequest());
    expect(response.status).toBe(404);

    const body = await response.json();
    expect(body.error.code).toBe('not_found');
    expect(body.data).toBeNull();
  });

  it('returns 404 when session email is not on the admin allowlist', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'regular@example.com', id: 'user_002' } });
    mockIsAdmin.mockReturnValue(false);

    const response = await GET(makeRequest());
    expect(response.status).toBe(404);

    const body = await response.json();
    expect(body.error.code).toBe('not_found');
  });

  it('returns 200 on the happy path with default 30d range', async () => {
    setupAdminSession();

    const response = await GET(makeRequest());
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.data).not.toBeNull();
    expect(body.error).toBeNull();
    expect(body.data.rangeApplied).toBe(30);
  });

  it('returns 200 with explicit 7d range and sets rangeApplied = 7', async () => {
    setupAdminSession();

    const response = await GET(makeRequest('7d'));
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.data.rangeApplied).toBe(7);
  });

  it('returns 200 with explicit 90d range and sets rangeApplied = 90', async () => {
    setupAdminSession();

    const response = await GET(makeRequest('90d'));
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.data.rangeApplied).toBe(90);
  });

  it('falls back to 30d range when an invalid range param is provided', async () => {
    setupAdminSession();

    const response = await GET(makeRequest('14d'));
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.data.rangeApplied).toBe(30);
  });

  it('response envelope always contains data, error, and meta', async () => {
    setupAdminSession();

    const body = await (await GET(makeRequest())).json();

    expect('data' in body).toBe(true);
    expect('error' in body).toBe(true);
    expect('meta' in body).toBe(true);
    expect('generatedAt' in body.meta).toBe(true);
    expect('queryDurationMs' in body.meta).toBe(true);
  });

  it('KPI tile fields are assembled from section data', async () => {
    setupAdminSession();

    const body = await (await GET(makeRequest())).json();
    const kpi = body.data.kpi;

    expect(kpi.totalUsers).toBe(DEFAULT_USER_VOLUME.totalUsers);
    expect(kpi.mau30d).toBe(DEFAULT_USER_VOLUME.mau30d);
    expect(kpi.uploadsInRange).toBe(DEFAULT_RECORDING_VOLUME.uploadsInRange);
    expect(kpi.dbSizeBytes).toBe(DEFAULT_SYSTEM_HEALTH.dbSize.totalBytes);
    expect(kpi.nodeHeapUsedBytes).toBe(DEFAULT_MEMORY_USAGE.heapUsedBytes);
    expect(kpi.errorEvents24hTotal).toBe(DEFAULT_SYSTEM_HEALTH.errorEvents24hTotal);
  });

  it('dbSizeBytes is null in KPI when DB size is unavailable (SQLite)', async () => {
    setupAdminSession();
    mockGetSystemHealth.mockResolvedValue({
      dbSize: { available: false, reason: 'sqlite-dev-mode' },
      errorEvents24h: [],
      errorEvents24hTotal: 0,
    });

    const body = await (await GET(makeRequest())).json();
    expect(body.data.kpi.dbSizeBytes).toBeNull();
  });

  it('returns 500 when a query throws', async () => {
    mockAuth.mockResolvedValue({ user: { email: ADMIN_EMAIL, id: 'user_001' } });
    mockIsAdmin.mockReturnValue(true);
    mockGetUserVolume.mockRejectedValue(new Error('DB connection failed'));
    mockGetRecordingVolume.mockResolvedValue(DEFAULT_RECORDING_VOLUME);
    mockGetWorkflowVolume.mockResolvedValue(DEFAULT_WORKFLOW_PROCESSING);
    mockGetSystemHealth.mockResolvedValue(DEFAULT_SYSTEM_HEALTH);
    mockGetMemoryUsage.mockReturnValue(DEFAULT_MEMORY_USAGE);
    mockGetSubscriptionBreakdown.mockResolvedValue(DEFAULT_SUBSCRIPTION_BREAKDOWN);

    const response = await GET(makeRequest());
    expect(response.status).toBe(500);

    const body = await response.json();
    expect(body.data).toBeNull();
    expect(body.error.code).toBe('internal_error');
  });

  it('meta.queryDurationMs is a non-negative number', async () => {
    setupAdminSession();

    const body = await (await GET(makeRequest())).json();
    expect(typeof body.meta.queryDurationMs).toBe('number');
    expect(body.meta.queryDurationMs).toBeGreaterThanOrEqual(0);
  });

  it('meta.generatedAt is an ISO-8601 datetime string', async () => {
    setupAdminSession();

    const body = await (await GET(makeRequest())).json();
    expect(typeof body.meta.generatedAt).toBe('string');
    // Matches ISO-8601 format like "2026-05-16T12:00:00.000Z"
    expect(body.meta.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it('processingSuccessRate is null when totalWorkflows is 0', async () => {
    setupAdminSession();
    mockGetWorkflowVolume.mockResolvedValue({
      totalWorkflows: 0,
      processingSuccessRate: null,
      workflowsTimeSeries: [],
      workflowUpdatesTimeSeries: [],
    });

    const body = await (await GET(makeRequest())).json();
    expect(body.data.workflowProcessing.processingSuccessRate).toBeNull();
  });

  // ── Performance smoke test (QA item, iter 073) ────────────────────────────────

  it('meta.queryDurationMs is below the 500ms performance threshold (smoke test)', async () => {
    // All query mocks resolve synchronously (no real I/O). The measured duration
    // reflects route overhead only — async scheduling, JSON serialization, and the
    // performance.now() / Date.now() timing boundary, all of which must remain
    // well below 500ms in a mocked unit-test environment.
    //
    // If this test fails it means the route added significant blocking overhead
    // BEFORE the DB calls execute (e.g., a synchronous heavy computation) — the
    // mocks absorb the actual query time. That is the value of this assertion.
    setupAdminSession();

    const body = await (await GET(makeRequest())).json();

    expect(typeof body.meta.queryDurationMs).toBe('number');
    expect(body.meta.queryDurationMs).toBeGreaterThanOrEqual(0);
    expect(
      body.meta.queryDurationMs,
      `queryDurationMs ${body.meta.queryDurationMs}ms exceeds 500ms smoke threshold`,
    ).toBeLessThan(500);
  });

  // ── Growth Intelligence Extension tests (Iteration A) ────────────────────────

  describe('Growth Intelligence Extension — subscriptionBreakdown section', () => {
    it('subscriptionBreakdown section is present in the response', async () => {
      setupAdminSession();

      const body = await (await GET(makeRequest())).json();
      expect(body.data.subscriptionBreakdown).toBeDefined();
      expect(body.data.subscriptionBreakdown).not.toBeNull();
    });

    it('subscriptionBreakdown.byPlan contains all required plan keys', async () => {
      setupAdminSession();

      const body = await (await GET(makeRequest())).json();
      const byPlan = body.data.subscriptionBreakdown.byPlan;

      expect(typeof byPlan.free).toBe('number');
      expect(typeof byPlan.starter).toBe('number');
      expect(typeof byPlan.team).toBe('number');
      expect(typeof byPlan.growth).toBe('number');
      expect(typeof byPlan.enterprise).toBe('number');
    });

    it('subscriptionBreakdown.byStatus contains all required status keys', async () => {
      setupAdminSession();

      const body = await (await GET(makeRequest())).json();
      const byStatus = body.data.subscriptionBreakdown.byStatus;

      expect(typeof byStatus.none).toBe('number');
      expect(typeof byStatus.trialing).toBe('number');
      expect(typeof byStatus.active).toBe('number');
      expect(typeof byStatus.past_due).toBe('number');
      expect(typeof byStatus.canceled).toBe('number');
    });

    it('subscriptionBreakdown.mrr.estimatedUsd is a non-negative number', async () => {
      setupAdminSession();

      const body = await (await GET(makeRequest())).json();
      const mrrUsd = body.data.subscriptionBreakdown.mrr.estimatedUsd;

      expect(typeof mrrUsd).toBe('number');
      expect(mrrUsd).toBeGreaterThanOrEqual(0);
    });

    it('subscriptionBreakdown.mrr.estimatedUsd equals DEFAULT_SUBSCRIPTION_BREAKDOWN.mrr.estimatedUsd', async () => {
      setupAdminSession();

      const body = await (await GET(makeRequest())).json();
      expect(body.data.subscriptionBreakdown.mrr.estimatedUsd).toBe(
        DEFAULT_SUBSCRIPTION_BREAKDOWN.mrr.estimatedUsd,
      );
    });

    it('subscriptionBreakdown.paidUserCount is a non-negative integer', async () => {
      setupAdminSession();

      const body = await (await GET(makeRequest())).json();
      const paidUserCount = body.data.subscriptionBreakdown.paidUserCount;

      expect(typeof paidUserCount).toBe('number');
      expect(paidUserCount).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(paidUserCount)).toBe(true);
    });

    it('subscriptionBreakdown.freeToPaidConversionPct is in range [0, 100]', async () => {
      setupAdminSession();

      const body = await (await GET(makeRequest())).json();
      const pct = body.data.subscriptionBreakdown.freeToPaidConversionPct;

      expect(pct).toBeGreaterThanOrEqual(0);
      expect(pct).toBeLessThanOrEqual(100);
    });

    it('subscriptionBreakdown.mrr.basis.billableStatuses is non-empty', async () => {
      setupAdminSession();

      const body = await (await GET(makeRequest())).json();
      const billableStatuses = body.data.subscriptionBreakdown.mrr.basis.billableStatuses;

      expect(Array.isArray(billableStatuses)).toBe(true);
      expect(billableStatuses.length).toBeGreaterThan(0);
      expect(billableStatuses).toContain('active');
    });
  });

  describe('Growth Intelligence Extension — KPI tiles', () => {
    it('kpi.mrrUsd equals subscriptionBreakdown.mrr.estimatedUsd', async () => {
      setupAdminSession();

      const body = await (await GET(makeRequest())).json();

      expect(body.data.kpi.mrrUsd).toBe(
        DEFAULT_SUBSCRIPTION_BREAKDOWN.mrr.estimatedUsd,
      );
    });

    it('kpi.payingSubscribers equals subscriptionBreakdown.paidUserCount', async () => {
      setupAdminSession();

      const body = await (await GET(makeRequest())).json();

      expect(body.data.kpi.payingSubscribers).toBe(
        DEFAULT_SUBSCRIPTION_BREAKDOWN.paidUserCount,
      );
    });

    it('kpi.signupsInRange equals userVolume.newUsersInRange', async () => {
      setupAdminSession();

      const body = await (await GET(makeRequest())).json();

      expect(body.data.kpi.signupsInRange).toBe(DEFAULT_USER_VOLUME.newUsersInRange);
    });

    it('kpi.freeToPaidConversionPct equals subscriptionBreakdown.freeToPaidConversionPct', async () => {
      setupAdminSession();

      const body = await (await GET(makeRequest())).json();

      expect(body.data.kpi.freeToPaidConversionPct).toBe(
        DEFAULT_SUBSCRIPTION_BREAKDOWN.freeToPaidConversionPct,
      );
    });

    it('kpi.activationRatePct equals userVolume.activationRatePct', async () => {
      setupAdminSession();

      const body = await (await GET(makeRequest())).json();

      expect(body.data.kpi.activationRatePct).toBe(DEFAULT_USER_VOLUME.activationRatePct);
    });

    it('existing 6 KPI tiles are preserved when growth fields are also present', async () => {
      // Regression lock: existing 6 KPI tiles must be unaffected by the growth extension.
      setupAdminSession();

      const body = await (await GET(makeRequest())).json();
      const kpi = body.data.kpi;

      // Original 6
      expect(kpi.totalUsers).toBe(DEFAULT_USER_VOLUME.totalUsers);
      expect(kpi.mau30d).toBe(DEFAULT_USER_VOLUME.mau30d);
      expect(kpi.uploadsInRange).toBe(DEFAULT_RECORDING_VOLUME.uploadsInRange);
      expect(kpi.dbSizeBytes).toBe(DEFAULT_SYSTEM_HEALTH.dbSize.totalBytes);
      expect(kpi.nodeHeapUsedBytes).toBe(DEFAULT_MEMORY_USAGE.heapUsedBytes);
      expect(kpi.errorEvents24hTotal).toBe(DEFAULT_SYSTEM_HEALTH.errorEvents24hTotal);
      // Growth extension fields present alongside
      expect(typeof kpi.mrrUsd).toBe('number');
      expect(typeof kpi.payingSubscribers).toBe('number');
      expect(typeof kpi.signupsInRange).toBe('number');
      expect(typeof kpi.freeToPaidConversionPct).toBe('number');
      expect(typeof kpi.activationRatePct).toBe('number');
    });

    it('kpi.mrrUsd is 0 when all users are on the free plan', async () => {
      setupAdminSession();
      mockGetSubscriptionBreakdown.mockResolvedValue({
        byPlan: { free: 200, starter: 0, team: 0, growth: 0, enterprise: 0 },
        byStatus: { none: 200, trialing: 0, active: 0, past_due: 0, canceled: 0 },
        mrr: {
          estimatedUsd: 0,
          byPlanUsd: { starter: 0, team: 0, growth: 0 },
          enterpriseCount: 0,
          basis: {
            monthlyPriceUsd: { starter: 49, team: 249, growth: 799 },
            billableStatuses: ['active'],
          },
        },
        paidUserCount: 0,
        freeToPaidConversionPct: 0,
      });

      const body = await (await GET(makeRequest())).json();

      expect(body.data.kpi.mrrUsd).toBe(0);
      expect(body.data.kpi.payingSubscribers).toBe(0);
      expect(body.data.kpi.freeToPaidConversionPct).toBe(0);
    });
  });

  describe('Growth Intelligence Extension — workflowUpdatesTimeSeries', () => {
    it('workflowProcessing section contains workflowUpdatesTimeSeries', async () => {
      setupAdminSession();

      const body = await (await GET(makeRequest())).json();

      expect(body.data.workflowProcessing.workflowUpdatesTimeSeries).toBeDefined();
      expect(Array.isArray(body.data.workflowProcessing.workflowUpdatesTimeSeries)).toBe(true);
    });

    it('workflowUpdatesTimeSeries is passed through from getWorkflowVolume', async () => {
      setupAdminSession();
      const updateBuckets = [
        { date: '2026-06-01', count: 5 },
        { date: '2026-06-02', count: 3 },
      ];
      mockGetWorkflowVolume.mockResolvedValue({
        totalWorkflows: 10,
        processingSuccessRate: 70,
        workflowsTimeSeries: [],
        workflowUpdatesTimeSeries: updateBuckets,
      });

      const body = await (await GET(makeRequest())).json();

      expect(body.data.workflowProcessing.workflowUpdatesTimeSeries).toEqual(updateBuckets);
    });
  });

  describe('Growth Intelligence Extension — userVolume extension fields', () => {
    it('userVolume section contains activationRatePct', async () => {
      setupAdminSession();

      const body = await (await GET(makeRequest())).json();

      expect(typeof body.data.userVolume.activationRatePct).toBe('number');
    });

    it('userVolume section contains newUsersInRange', async () => {
      setupAdminSession();

      const body = await (await GET(makeRequest())).json();

      expect(typeof body.data.userVolume.newUsersInRange).toBe('number');
    });

    it('userVolume.activationRatePct is in range [0, 100]', async () => {
      setupAdminSession();

      const body = await (await GET(makeRequest())).json();
      const pct = body.data.userVolume.activationRatePct;

      expect(pct).toBeGreaterThanOrEqual(0);
      expect(pct).toBeLessThanOrEqual(100);
    });

    it('userVolume.newUsersInRange is a non-negative integer', async () => {
      setupAdminSession();

      const body = await (await GET(makeRequest())).json();
      const n = body.data.userVolume.newUsersInRange;

      expect(n).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(n)).toBe(true);
    });
  });
});
