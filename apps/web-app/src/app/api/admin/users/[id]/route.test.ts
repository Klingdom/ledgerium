/**
 * Unit tests for GET /api/admin/users/[id].
 *
 * Covers:
 *  - 404 when unauthenticated (no session)
 *  - 404 when session exists but caller is not admin
 *  - 404 when userId resolves to no user in DB
 *  - 200 happy path — full response shape present
 *  - user.trialEndsAt is always null (schema gap placeholder)
 *  - activity.uploadCount and workflowCount from DB counts
 *  - activity.lastActivityAt populated from most-recent upload
 *  - activity.lastActivityAt null when no uploads
 *  - memberships array populated correctly
 *  - memberships empty array when user has no team memberships
 *  - 500 when a DB query throws
 *  - meta.generatedAt is an ISO-8601 datetime string
 *  - meta.durationMs is a non-negative number
 *
 * Mocking strategy:
 *  - vi.mock('@/lib/auth') — controls session
 *  - vi.mock('@/lib/admin-allowlist') — controls canAccessAdmin
 *  - vi.mock('@/db') — controls all Prisma calls
 *
 * @iter 095 / ADM-002 PR-6
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/admin-allowlist', () => ({
  canAccessAdmin: vi.fn(),
}));

vi.mock('@/db', () => ({
  db: {
    user: { findUnique: vi.fn() },
    upload: { count: vi.fn(), findFirst: vi.fn() },
    workflow: { count: vi.fn() },
    teamMember: { findMany: vi.fn() },
  },
}));

import { auth } from '@/lib/auth';
import { canAccessAdmin } from '@/lib/admin-allowlist';
import { db } from '@/db';
import { GET } from './route';

// ── Typed mock references ─────────────────────────────────────────────────────

const mockAuth = auth as ReturnType<typeof vi.fn>;
const mockCanAccessAdmin = canAccessAdmin as ReturnType<typeof vi.fn>;
const mockUserFindUnique = db.user.findUnique as ReturnType<typeof vi.fn>;
const mockUploadCount = db.upload.count as ReturnType<typeof vi.fn>;
const mockUploadFindFirst = db.upload.findFirst as ReturnType<typeof vi.fn>;
const mockWorkflowCount = db.workflow.count as ReturnType<typeof vi.fn>;
const mockTeamMemberFindMany = db.teamMember.findMany as ReturnType<typeof vi.fn>;

// ── Default fixture data ───────────────────────────────────────────────────────

const USER_ID = 'user_abc12345';
const ADMIN_EMAIL = 'admin@example.com';

const DB_USER = {
  id: USER_ID,
  email: 'target@example.com',
  name: 'Target User',
  plan: 'team',
  subscriptionStatus: 'active',
  stripeCustomerId: 'cus_test123',
  isAdmin: false,
  createdAt: new Date('2024-01-15T10:00:00.000Z'),
  updatedAt: new Date('2024-06-01T12:00:00.000Z'),
};

const DB_LAST_UPLOAD = {
  uploadedAt: new Date('2024-05-20T09:30:00.000Z'),
};

const DB_MEMBERSHIPS = [
  {
    teamId: 'team_001',
    role: 'member',
    status: 'active',
    joinedAt: new Date('2024-02-01T00:00:00.000Z'),
    team: { name: 'Alpha Team' },
  },
];

function setupAdminSession(): void {
  mockAuth.mockResolvedValue({ user: { email: ADMIN_EMAIL, id: 'admin_001' } });
  mockCanAccessAdmin.mockReturnValue(true);
  mockUserFindUnique.mockResolvedValue(DB_USER);
  mockUploadCount.mockResolvedValue(42);
  mockWorkflowCount.mockResolvedValue(7);
  mockUploadFindFirst.mockResolvedValue(DB_LAST_UPLOAD);
  mockTeamMemberFindMany.mockResolvedValue(DB_MEMBERSHIPS);
}

function makeRequest(id = USER_ID): NextRequest {
  return new NextRequest(`http://localhost/api/admin/users/${id}`);
}

function makeParams(id = USER_ID): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('GET /api/admin/users/[id]', () => {
  it('returns 404 when there is no session', async () => {
    mockAuth.mockResolvedValue(null);
    mockCanAccessAdmin.mockReturnValue(false);

    const response = await GET(makeRequest(), makeParams());
    expect(response.status).toBe(404);

    const body = await response.json();
    expect(body.error.code).toBe('not_found');
    expect(body.data).toBeNull();
  });

  it('returns 404 when session exists but caller is not admin', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'regular@example.com', id: 'user_002' } });
    mockCanAccessAdmin.mockReturnValue(false);

    const response = await GET(makeRequest(), makeParams());
    expect(response.status).toBe(404);

    const body = await response.json();
    expect(body.error.code).toBe('not_found');
  });

  it('returns 404 when userId resolves to no user in DB', async () => {
    mockAuth.mockResolvedValue({ user: { email: ADMIN_EMAIL, id: 'admin_001' } });
    mockCanAccessAdmin.mockReturnValue(true);
    mockUserFindUnique.mockResolvedValue(null);
    mockUploadCount.mockResolvedValue(0);
    mockWorkflowCount.mockResolvedValue(0);
    mockUploadFindFirst.mockResolvedValue(null);
    mockTeamMemberFindMany.mockResolvedValue([]);

    const response = await GET(makeRequest(), makeParams());
    expect(response.status).toBe(404);

    const body = await response.json();
    expect(body.error.code).toBe('not_found');
  });

  it('returns 200 with full response shape on happy path', async () => {
    setupAdminSession();

    const response = await GET(makeRequest(), makeParams());
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.data).not.toBeNull();
    expect(body.error).toBeNull();

    // Verify all top-level data sections are present
    expect('user' in body.data).toBe(true);
    expect('activity' in body.data).toBe(true);
    expect('memberships' in body.data).toBe(true);
    expect('generatedAt' in body.meta).toBe(true);
    expect('durationMs' in body.meta).toBe(true);
  });

  it('user.trialEndsAt is always null (schema gap placeholder)', async () => {
    setupAdminSession();

    const body = await (await GET(makeRequest(), makeParams())).json();
    expect(body.data.user.trialEndsAt).toBeNull();
  });

  it('activity.uploadCount and workflowCount reflect DB counts', async () => {
    setupAdminSession();

    const body = await (await GET(makeRequest(), makeParams())).json();
    expect(body.data.activity.uploadCount).toBe(42);
    expect(body.data.activity.workflowCount).toBe(7);
  });

  it('activity.lastActivityAt is populated from most-recent upload uploadedAt', async () => {
    setupAdminSession();

    const body = await (await GET(makeRequest(), makeParams())).json();
    expect(body.data.activity.lastActivityAt).toBe('2024-05-20T09:30:00.000Z');
  });

  it('activity.lastActivityAt is null when user has no uploads', async () => {
    setupAdminSession();
    mockUploadFindFirst.mockResolvedValue(null);

    const body = await (await GET(makeRequest(), makeParams())).json();
    expect(body.data.activity.lastActivityAt).toBeNull();
  });

  it('memberships array is populated with teamName, role, status, joinedAt', async () => {
    setupAdminSession();

    const body = await (await GET(makeRequest(), makeParams())).json();
    expect(Array.isArray(body.data.memberships)).toBe(true);
    expect(body.data.memberships).toHaveLength(1);

    const m = body.data.memberships[0];
    expect(m.teamId).toBe('team_001');
    expect(m.teamName).toBe('Alpha Team');
    expect(m.role).toBe('member');
    expect(m.status).toBe('active');
    expect(m.joinedAt).toBe('2024-02-01T00:00:00.000Z');
  });

  it('memberships is an empty array when user has no team memberships', async () => {
    setupAdminSession();
    mockTeamMemberFindMany.mockResolvedValue([]);

    const body = await (await GET(makeRequest(), makeParams())).json();
    expect(Array.isArray(body.data.memberships)).toBe(true);
    expect(body.data.memberships).toHaveLength(0);
  });

  it('returns 500 when a DB query throws', async () => {
    mockAuth.mockResolvedValue({ user: { email: ADMIN_EMAIL, id: 'admin_001' } });
    mockCanAccessAdmin.mockReturnValue(true);
    mockUserFindUnique.mockRejectedValue(new Error('DB connection failed'));
    mockUploadCount.mockResolvedValue(0);
    mockWorkflowCount.mockResolvedValue(0);
    mockUploadFindFirst.mockResolvedValue(null);
    mockTeamMemberFindMany.mockResolvedValue([]);

    const response = await GET(makeRequest(), makeParams());
    expect(response.status).toBe(500);

    const body = await response.json();
    expect(body.data).toBeNull();
    expect(body.error.code).toBe('internal_error');
  });

  it('meta.generatedAt is an ISO-8601 datetime string', async () => {
    setupAdminSession();

    const body = await (await GET(makeRequest(), makeParams())).json();
    expect(typeof body.meta.generatedAt).toBe('string');
    expect(body.meta.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it('meta.durationMs is a non-negative number', async () => {
    setupAdminSession();

    const body = await (await GET(makeRequest(), makeParams())).json();
    expect(typeof body.meta.durationMs).toBe('number');
    expect(body.meta.durationMs).toBeGreaterThanOrEqual(0);
  });
});
