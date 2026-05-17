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
 *
 * Mocking strategy:
 *  - vi.mock('@/lib/auth') — controls session
 *  - vi.mock('@/lib/admin-allowlist') — controls isAdminUnlimited
 *  - vi.mock('@/lib/admin-operations/queries') — controls all DB calls
 *  - Query mocks return minimal valid shapes; structural validation done in
 *    queries.test.ts
 *
 * @iter 071
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
}));

import { auth } from '@/lib/auth';
import { isAdminUnlimited } from '@/lib/admin-allowlist';
import {
  getUserVolume,
  getRecordingVolume,
  getWorkflowVolume,
  getSystemHealth,
  getMemoryUsage,
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

// ── Default mock data ─────────────────────────────────────────────────────────

const ADMIN_EMAIL = 'admin@example.com';

const DEFAULT_USER_VOLUME = {
  totalUsers: 200,
  mau30d: 50,
  newUsersTimeSeries: [],
  topUploaders: [],
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

function setupAdminSession(): void {
  mockAuth.mockResolvedValue({ user: { email: ADMIN_EMAIL, id: 'user_001' } });
  mockIsAdmin.mockReturnValue(true);
  mockGetUserVolume.mockResolvedValue(DEFAULT_USER_VOLUME);
  mockGetRecordingVolume.mockResolvedValue(DEFAULT_RECORDING_VOLUME);
  mockGetWorkflowVolume.mockResolvedValue(DEFAULT_WORKFLOW_PROCESSING);
  mockGetSystemHealth.mockResolvedValue(DEFAULT_SYSTEM_HEALTH);
  mockGetMemoryUsage.mockReturnValue(DEFAULT_MEMORY_USAGE);
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
});
