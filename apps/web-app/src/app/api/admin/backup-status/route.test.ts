/**
 * Unit tests for GET /api/admin/backup-status.
 *
 * Covers:
 *  - 404 when unauthenticated (no session)
 *  - 404 when session exists but email is not on admin allowlist
 *  - 200 happy path, never-run (file absent)
 *  - 200 happy path, ok file → summary passed through
 *  - 500 when readBackupStatusFile throws unexpectedly
 *  - Response envelope shape: data / error / meta fields present
 *  - generatedAt is an ISO-8601 string; queryDurationMs is non-negative
 *
 * Mocking strategy (mirrors api/admin/operations/route.test.ts):
 *  - vi.mock('@/lib/auth') — controls session
 *  - vi.mock('@/lib/admin-allowlist') — controls isAdminUnlimited
 *  - vi.mock('@/lib/admin-operations/backup-status') — controls the read +
 *    the derivation; derivation logic itself is covered exhaustively in
 *    backup-status.test.ts, so here we only assert the route wires the
 *    result through correctly.
 *
 * @module api/admin/backup-status/route.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/admin-allowlist', () => ({
  isAdminUnlimited: vi.fn(),
}));

vi.mock('@/lib/admin-operations/backup-status', () => ({
  readBackupStatusFile: vi.fn(),
  buildBackupStatusSummary: vi.fn(),
}));

import { auth } from '@/lib/auth';
import { isAdminUnlimited } from '@/lib/admin-allowlist';
import { readBackupStatusFile, buildBackupStatusSummary } from '@/lib/admin-operations/backup-status';
import { GET } from './route';

// ── Typed mock references ─────────────────────────────────────────────────────

const mockAuth = auth as ReturnType<typeof vi.fn>;
const mockIsAdmin = isAdminUnlimited as ReturnType<typeof vi.fn>;
const mockRead = readBackupStatusFile as ReturnType<typeof vi.fn>;
const mockBuild = buildBackupStatusSummary as ReturnType<typeof vi.fn>;

const ADMIN_EMAIL = 'admin@example.com';

const NEVER_RUN_SUMMARY = {
  overallState: 'never-run' as const,
  unknownReason: null,
  offHostConfigured: null,
  lastRunAt: null,
  db: null,
  evidence: null,
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Auth gate ──────────────────────────────────────────────────────────────────

describe('GET /api/admin/backup-status — auth gate', () => {
  it('returns 404 when there is no session', async () => {
    mockAuth.mockResolvedValue(null);

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.data).toBeNull();
    expect(json.error).toEqual({ code: 'not_found', message: 'Not Found' });
    expect(mockRead).not.toHaveBeenCalled();
  });

  it('returns 404 when the session email is not on the admin allowlist', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'nobody@example.com' } });
    mockIsAdmin.mockReturnValue(false);

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.error?.code).toBe('not_found');
    expect(mockRead).not.toHaveBeenCalled();
  });

  it('returns 404 when session exists but has no email', async () => {
    mockAuth.mockResolvedValue({ user: {} });

    const res = await GET();
    expect(res.status).toBe(404);
  });
});

// ── Happy path ─────────────────────────────────────────────────────────────────

describe('GET /api/admin/backup-status — happy path', () => {
  beforeEach(() => {
    mockAuth.mockResolvedValue({ user: { email: ADMIN_EMAIL } });
    mockIsAdmin.mockReturnValue(true);
  });

  it('returns 200 with the never-run summary when the status file is absent', async () => {
    mockRead.mockResolvedValue({ kind: 'absent' });
    mockBuild.mockReturnValue(NEVER_RUN_SUMMARY);

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data).toEqual(NEVER_RUN_SUMMARY);
    expect(json.error).toBeNull();
    expect(mockRead).toHaveBeenCalledTimes(1);
    expect(mockBuild).toHaveBeenCalledWith({ kind: 'absent' }, expect.any(Number));
  });

  it('passes the read outcome and current time through to buildBackupStatusSummary, and the result through as data', async () => {
    const durableSummary = {
      overallState: 'durable' as const,
      unknownReason: null,
      offHostConfigured: true,
      lastRunAt: '2026-07-20T11:00:00Z',
      db: {
        state: 'durable' as const,
        lastAttemptAt: '2026-07-20T11:00:00Z',
        lastSuccessAt: '2026-07-20T11:00:00Z',
        lastError: null,
        durable: true,
        sizeBytes: 1234567,
      },
      evidence: {
        state: 'durable' as const,
        lastAttemptAt: '2026-07-20T11:00:00Z',
        lastSuccessAt: '2026-07-20T10:00:00Z',
        lastError: null,
        durable: true,
        archiveCount: 12,
      },
    };
    mockRead.mockResolvedValue({ kind: 'ok', file: { schemaVersion: 1 } });
    mockBuild.mockReturnValue(durableSummary);

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data).toEqual(durableSummary);
  });

  it('response envelope has data / error / meta fields with correct types', async () => {
    mockRead.mockResolvedValue({ kind: 'absent' });
    mockBuild.mockReturnValue(NEVER_RUN_SUMMARY);

    const res = await GET();
    const json = await res.json();

    expect(json).toHaveProperty('data');
    expect(json).toHaveProperty('error');
    expect(json).toHaveProperty('meta');
    expect(typeof json.meta.generatedAt).toBe('string');
    expect(() => new Date(json.meta.generatedAt).toISOString()).not.toThrow();
    expect(typeof json.meta.queryDurationMs).toBe('number');
    expect(json.meta.queryDurationMs).toBeGreaterThanOrEqual(0);
  });
});

// ── Failure path ───────────────────────────────────────────────────────────────

describe('GET /api/admin/backup-status — failure path', () => {
  beforeEach(() => {
    mockAuth.mockResolvedValue({ user: { email: ADMIN_EMAIL } });
    mockIsAdmin.mockReturnValue(true);
  });

  it('returns 500 with a generic message when readBackupStatusFile throws unexpectedly', async () => {
    mockRead.mockRejectedValue(new Error('unexpected I/O failure'));

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.data).toBeNull();
    expect(json.error).toEqual({
      code: 'internal_error',
      message: 'Failed to load backup status',
    });
  });

  it('returns 500 when buildBackupStatusSummary throws unexpectedly', async () => {
    mockRead.mockResolvedValue({ kind: 'absent' });
    mockBuild.mockImplementation(() => {
      throw new Error('derivation blew up');
    });

    const res = await GET();
    expect(res.status).toBe(500);
  });
});
