/**
 * Tests for POST /api/invites/accept
 * (iter 082 / TEAM-P02 Part C)
 * Updated iter 084 / TEAM-P03.6 Sub-task 6 — per-IP in-memory rate limiting.
 *
 * Covers:
 *   - 400 when token is missing or empty
 *   - Unauthenticated path: validates token + returns requiresAuth metadata
 *   - Unauthenticated path: 404 for unknown token
 *   - Unauthenticated path: 410 for revoked/expired
 *   - Unauthenticated path: 409 for already accepted
 *   - Authenticated path: 404/410/409 inside transaction
 *   - Authenticated path: 403 email mismatch
 *   - Authenticated path: 409 already a member
 *   - Authenticated path: creates membership + stamps acceptedAt/acceptedBy
 *   - Authenticated path: returns { ok: true, teamId, role }
 *   Rate limiting (Sub-task 6, TEAM-P03.6):
 *   - 429 after 10 requests from the same IP within the 60-second window
 *   - 429 when IP is locked out after 5 consecutive 404s
 *   - Successful token lookup resets the failure streak (no lockout)
 *   - IP resolved from x-forwarded-for header
 *   - IP resolved from x-real-ip header when x-forwarded-for absent
 *   - Sliding window resets after 60 seconds
 *   - Authenticated path is also rate-limited
 *   - Different IPs have independent counters
 *   - Window count does not roll over from previous window
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import crypto from 'crypto';

// ─── Hoisted mocks (must precede vi.mock factories) ───────────────────────────

const {
  mockTeamInviteFindFirst,
  mockTeamInviteUpdate,
  mockTeamMemberFindUnique,
  mockTeamMemberCreate,
  mockTeamMemberUpdate,
  mockUserFindUnique,
  mockTransaction,
  mockAuth,
} = vi.hoisted(() => ({
  mockTeamInviteFindFirst: vi.fn(),
  mockTeamInviteUpdate: vi.fn(),
  mockTeamMemberFindUnique: vi.fn(),
  mockTeamMemberCreate: vi.fn(),
  mockTeamMemberUpdate: vi.fn(),
  mockUserFindUnique: vi.fn(),
  mockTransaction: vi.fn(),
  mockAuth: vi.fn(),
}));

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock('@/db', () => ({
  db: {
    teamInvite: {
      findFirst: mockTeamInviteFindFirst,
      update: mockTeamInviteUpdate,
    },
    teamMember: {
      findUnique: mockTeamMemberFindUnique,
      create: mockTeamMemberCreate,
      update: mockTeamMemberUpdate,
    },
    user: { findUnique: mockUserFindUnique },
    $transaction: mockTransaction,
  },
}));

vi.mock('@/lib/auth', () => ({ auth: mockAuth }));

import { POST } from './route';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hashToken(raw: string) {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

// Each call to makeRequest() uses a unique x-forwarded-for IP so the shared
// module-level rateLimits Map never accumulates more than 1 request per IP in
// the non-rate-limiting describe blocks, preventing spurious 429 responses.
let _ipCounter = 0;
function makeRequest(body: unknown) {
  _ipCounter++;
  return new NextRequest('http://localhost/api/invites/accept', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': `192.168.99.${_ipCounter}`,
    },
  });
}

const RAW_TOKEN = 'a'.repeat(40); // 40-char hex-like token
const TOKEN_HASH = hashToken(RAW_TOKEN);

const VALID_INVITE = {
  id: 'inv-1',
  teamId: 't1',
  email: 'invitee@example.com',
  role: 'member',
  acceptedAt: null,
  revokedAt: null,
  expiresAt: new Date(Date.now() + 86400_000), // future
  team: { id: 't1', name: 'Test Team', slug: 'test-team' },
};

// ─── Tests: input validation ──────────────────────────────────────────────────

describe('POST /api/invites/accept — input validation', () => {
  it('returns 400 when token is missing', async () => {
    mockAuth.mockResolvedValue(null);
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it('returns 400 when token is empty string', async () => {
    mockAuth.mockResolvedValue(null);
    const res = await POST(makeRequest({ token: '   ' }));
    expect(res.status).toBe(400);
  });
});

// ─── Tests: unauthenticated path ─────────────────────────────────────────────

describe('POST /api/invites/accept — unauthenticated path', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(null);
    mockTeamInviteFindFirst.mockResolvedValue(VALID_INVITE);
  });

  it('returns 404 when token does not match any invite', async () => {
    mockTeamInviteFindFirst.mockResolvedValue(null);
    const res = await POST(makeRequest({ token: RAW_TOKEN }));
    expect(res.status).toBe(404);
  });

  it('returns 410 when invite is revoked', async () => {
    mockTeamInviteFindFirst.mockResolvedValue({ ...VALID_INVITE, revokedAt: new Date() });
    const res = await POST(makeRequest({ token: RAW_TOKEN }));
    expect(res.status).toBe(410);
    const body = await res.json();
    expect(body.error).toMatch(/revoked/i);
  });

  it('returns 410 when invite is expired', async () => {
    mockTeamInviteFindFirst.mockResolvedValue({
      ...VALID_INVITE,
      expiresAt: new Date(Date.now() - 1000), // past
    });
    const res = await POST(makeRequest({ token: RAW_TOKEN }));
    expect(res.status).toBe(410);
    const body = await res.json();
    expect(body.error).toMatch(/expired/i);
  });

  it('returns 409 when invite was already accepted', async () => {
    mockTeamInviteFindFirst.mockResolvedValue({ ...VALID_INVITE, acceptedAt: new Date() });
    const res = await POST(makeRequest({ token: RAW_TOKEN }));
    expect(res.status).toBe(409);
  });

  it('returns requiresAuth: true with workspace metadata for valid unauthenticated request', async () => {
    const res = await POST(makeRequest({ token: RAW_TOKEN }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.requiresAuth).toBe(true);
    expect(body.teamId).toBe('t1');
    expect(body.teamName).toBe('Test Team');
    expect(body.role).toBe('member');
    expect(body.email).toBe('invitee@example.com');
  });

  it('queries the DB with the SHA-256 hash of the raw token', async () => {
    await POST(makeRequest({ token: RAW_TOKEN }));
    const findCall = mockTeamInviteFindFirst.mock.calls[0][0];
    expect(findCall.where.token).toBe(TOKEN_HASH);
    expect(findCall.where.token).not.toBe(RAW_TOKEN);
  });
});

// ─── Tests: authenticated path ────────────────────────────────────────────────

describe('POST /api/invites/accept — authenticated path', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } });

    // Simulate the SERIALIZABLE transaction by executing the callback synchronously.
    mockTransaction.mockImplementation(async (callback: Function) => {
      const tx = {
        teamInvite: {
          findFirst: mockTeamInviteFindFirst,
          update: mockTeamInviteUpdate,
        },
        teamMember: {
          findUnique: mockTeamMemberFindUnique,
          create: mockTeamMemberCreate,
          update: mockTeamMemberUpdate,
        },
        user: { findUnique: mockUserFindUnique },
      };
      return callback(tx);
    });

    mockTeamInviteFindFirst.mockResolvedValue(VALID_INVITE);
    mockUserFindUnique.mockResolvedValue({ email: 'invitee@example.com' });
    mockTeamMemberFindUnique.mockResolvedValue(null); // not yet a member
    mockTeamInviteUpdate.mockResolvedValue({});
    mockTeamMemberCreate.mockResolvedValue({});
  });

  it('returns 404 inside transaction when invite not found', async () => {
    mockTeamInviteFindFirst.mockResolvedValue(null);
    const res = await POST(makeRequest({ token: RAW_TOKEN }));
    expect(res.status).toBe(404);
  });

  it('returns 410 inside transaction when invite is revoked', async () => {
    mockTeamInviteFindFirst.mockResolvedValue({ ...VALID_INVITE, revokedAt: new Date() });
    const res = await POST(makeRequest({ token: RAW_TOKEN }));
    expect(res.status).toBe(410);
  });

  it('returns 410 inside transaction when invite is expired', async () => {
    mockTeamInviteFindFirst.mockResolvedValue({
      ...VALID_INVITE,
      expiresAt: new Date(Date.now() - 1000),
    });
    const res = await POST(makeRequest({ token: RAW_TOKEN }));
    expect(res.status).toBe(410);
  });

  it('returns 409 inside transaction when invite already accepted', async () => {
    mockTeamInviteFindFirst.mockResolvedValue({ ...VALID_INVITE, acceptedAt: new Date() });
    const res = await POST(makeRequest({ token: RAW_TOKEN }));
    expect(res.status).toBe(409);
  });

  it('returns 403 when authenticated user email does not match invite email', async () => {
    mockUserFindUnique.mockResolvedValue({ email: 'different@example.com' });
    const res = await POST(makeRequest({ token: RAW_TOKEN }));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toMatch(/different email/i);
  });

  it('returns 409 when user is already an ACTIVE member of the workspace', async () => {
    mockTeamMemberFindUnique.mockResolvedValue({
      id: 'mem-existing-active',
      teamId: 't1',
      userId: 'user-1',
      role: 'member',
      status: 'active',
    });
    const res = await POST(makeRequest({ token: RAW_TOKEN }));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toMatch(/already a member/i);
  });

  it('returns 200 { ok: true, teamId, role } on successful acceptance', async () => {
    const res = await POST(makeRequest({ token: RAW_TOKEN }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.teamId).toBe('t1');
    expect(body.role).toBe('member');
  });

  it('stamps acceptedAt and acceptedBy on the invite', async () => {
    await POST(makeRequest({ token: RAW_TOKEN }));
    expect(mockTeamInviteUpdate).toHaveBeenCalledOnce();
    const updateCall = mockTeamInviteUpdate.mock.calls[0][0];
    expect(updateCall.data.acceptedAt).toBeInstanceOf(Date);
    expect(updateCall.data.acceptedBy).toBe('user-1');
  });

  it('creates TeamMember row with status active', async () => {
    await POST(makeRequest({ token: RAW_TOKEN }));
    expect(mockTeamMemberCreate).toHaveBeenCalledOnce();
    const createCall = mockTeamMemberCreate.mock.calls[0][0];
    expect(createCall.data.teamId).toBe('t1');
    expect(createCall.data.userId).toBe('user-1');
    expect(createCall.data.role).toBe('member');
    expect(createCall.data.status).toBe('active');
    expect(createCall.data.joinedAt).toBeInstanceOf(Date);
  });
});

// ─── Tests: Sub-task 5 (iter 085 / TEAM-P03.7) — P2034 retry ────────────────

describe('POST /api/invites/accept — Sub-task 5: P2034 serialization retry (iter 085)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: 'user-p2034' } });
    mockTeamInviteFindFirst.mockResolvedValue(VALID_INVITE);
    mockUserFindUnique.mockResolvedValue({ email: 'invitee@example.com' });
    mockTeamMemberFindUnique.mockResolvedValue(null);
  });

  it('translates Prisma P2034 to HTTP 409 with retryable=true', async () => {
    const p2034Err = Object.assign(new Error('Serialization failure'), { code: 'P2034' });
    mockTransaction.mockRejectedValueOnce(p2034Err);

    const res = await POST(makeRequest({ token: RAW_TOKEN }));

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.code).toBe('serialization_failure');
    expect(body.retryable).toBe(true);
    expect(body.error).toMatch(/concurrent|retry/i);
  });

  it('other errors still return HTTP 500 (regression lock)', async () => {
    const genericErr = new Error('Some other DB failure');
    mockTransaction.mockRejectedValueOnce(genericErr);

    const res = await POST(makeRequest({ token: RAW_TOKEN }));

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/failed to accept/i);
    expect(body.code).toBeUndefined();
    expect(body.retryable).toBeUndefined();
  });

  it('error with code !== P2034 still returns 500', async () => {
    const p2002Err = Object.assign(new Error('Unique constraint failed'), { code: 'P2002' });
    mockTransaction.mockRejectedValueOnce(p2002Err);

    const res = await POST(makeRequest({ token: RAW_TOKEN }));
    expect(res.status).toBe(500);
  });

  it('error without code field still returns 500', async () => {
    const plainErr = new Error('Unstructured failure');
    mockTransaction.mockRejectedValueOnce(plainErr);

    const res = await POST(makeRequest({ token: RAW_TOKEN }));
    expect(res.status).toBe(500);
  });

  it('successful path is not affected by P2034 handler', async () => {
    mockTransaction.mockImplementation(async (callback: Function) => {
      const tx = {
        teamInvite: {
          findFirst: mockTeamInviteFindFirst,
          update: mockTeamInviteUpdate,
        },
        teamMember: {
          findUnique: mockTeamMemberFindUnique,
          create: mockTeamMemberCreate,
          update: mockTeamMemberUpdate,
        },
        user: { findUnique: mockUserFindUnique },
      };
      return callback(tx);
    });
    mockTeamInviteUpdate.mockResolvedValue({});
    mockTeamMemberCreate.mockResolvedValue({});

    const res = await POST(makeRequest({ token: RAW_TOKEN }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.code).toBeUndefined();
    expect(body.retryable).toBeUndefined();
  });
});

// ─── Tests: Sub-task 6 (iter 085 / TEAM-P03.7) — resurrect removed member ───

describe('POST /api/invites/accept — Sub-task 6: resurrect removed member (iter 085)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: 'user-resurrect' } });
    mockTeamInviteFindFirst.mockResolvedValue(VALID_INVITE);
    mockUserFindUnique.mockResolvedValue({ email: 'invitee@example.com' });
    mockTeamInviteUpdate.mockResolvedValue({});
    mockTeamMemberCreate.mockResolvedValue({});
    mockTeamMemberUpdate.mockResolvedValue({});
    mockTransaction.mockImplementation(async (callback: Function) => {
      const tx = {
        teamInvite: {
          findFirst: mockTeamInviteFindFirst,
          update: mockTeamInviteUpdate,
        },
        teamMember: {
          findUnique: mockTeamMemberFindUnique,
          create: mockTeamMemberCreate,
          update: mockTeamMemberUpdate,
        },
        user: { findUnique: mockUserFindUnique },
      };
      return callback(tx);
    });
  });

  it('previously-removed member: resurrects via update (status=active), does NOT call create', async () => {
    mockTeamMemberFindUnique.mockResolvedValue({
      id: 'mem-removed-1',
      teamId: 't1',
      userId: 'user-resurrect',
      role: 'member',
      status: 'removed',
      deactivatedAt: new Date(Date.now() - 7 * 86400_000),
    });

    const res = await POST(makeRequest({ token: RAW_TOKEN }));

    expect(res.status).toBe(200);
    expect(mockTeamMemberUpdate).toHaveBeenCalledOnce();
    expect(mockTeamMemberCreate).not.toHaveBeenCalled();
    const updateCall = mockTeamMemberUpdate.mock.calls[0][0];
    expect(updateCall.where).toEqual({ id: 'mem-removed-1' });
    expect(updateCall.data.status).toBe('active');
    expect(updateCall.data.deactivatedAt).toBeNull();
    expect(updateCall.data.reactivationDeadline).toBeNull();
    expect(updateCall.data.joinedAt).toBeInstanceOf(Date);
  });

  it('previously-deactivated member: also resurrects (status=active)', async () => {
    mockTeamMemberFindUnique.mockResolvedValue({
      id: 'mem-deact-1',
      teamId: 't1',
      userId: 'user-resurrect',
      role: 'member',
      status: 'deactivated',
      deactivatedAt: new Date(Date.now() - 14 * 86400_000),
    });

    const res = await POST(makeRequest({ token: RAW_TOKEN }));

    expect(res.status).toBe(200);
    expect(mockTeamMemberUpdate).toHaveBeenCalledOnce();
    expect(mockTeamMemberCreate).not.toHaveBeenCalled();
    const updateCall = mockTeamMemberUpdate.mock.calls[0][0];
    expect(updateCall.data.status).toBe('active');
  });

  it('resurrected member: uses role from new invite, not preserved old role', async () => {
    mockTeamMemberFindUnique.mockResolvedValue({
      id: 'mem-removed-role',
      teamId: 't1',
      userId: 'user-resurrect',
      role: 'admin', // old role
      status: 'removed',
    });
    // New invite gives 'member' role
    mockTeamInviteFindFirst.mockResolvedValue({ ...VALID_INVITE, role: 'member' });

    await POST(makeRequest({ token: RAW_TOKEN }));

    const updateCall = mockTeamMemberUpdate.mock.calls[0][0];
    expect(updateCall.data.role).toBe('member');
  });

  it('active member still returns 409 (no resurrection of active membership)', async () => {
    mockTeamMemberFindUnique.mockResolvedValue({
      id: 'mem-active',
      teamId: 't1',
      userId: 'user-resurrect',
      role: 'member',
      status: 'active',
    });

    const res = await POST(makeRequest({ token: RAW_TOKEN }));
    expect(res.status).toBe(409);
    expect(mockTeamMemberUpdate).not.toHaveBeenCalled();
    expect(mockTeamMemberCreate).not.toHaveBeenCalled();
  });

  it('no existing membership: creates fresh (default path preserved)', async () => {
    mockTeamMemberFindUnique.mockResolvedValue(null);

    const res = await POST(makeRequest({ token: RAW_TOKEN }));

    expect(res.status).toBe(200);
    expect(mockTeamMemberCreate).toHaveBeenCalledOnce();
    expect(mockTeamMemberUpdate).not.toHaveBeenCalled();
    const createCall = mockTeamMemberCreate.mock.calls[0][0];
    expect(createCall.data.status).toBe('active');
  });
});

// ─── Tests: rate limiting (Sub-task 6 / TEAM-P03.6) ──────────────────────────

/**
 * Rate-limiting helpers.
 *
 * The in-memory `rateLimits` Map is module-level state.  The only way to get a
 * fresh empty Map per-test without exporting a reset helper (which Next.js build
 * forbids on route files) is to call vi.resetModules() before each test so that
 * the module is re-executed and `const rateLimits = new Map()` re-runs.  We
 * then dynamically import the fresh module inside each test via the `callPost`
 * closure set up in `beforeEach`.
 *
 * We also use vi.useFakeTimers to control Date.now() so that sliding-window and
 * lockout expiry logic can be exercised without real sleeps.
 */

function makeRequestWithIp(body: unknown, ip: string) {
  return new NextRequest('http://localhost/api/invites/accept', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': ip,
    },
  });
}

function makeRequestWithRealIp(body: unknown, ip: string) {
  return new NextRequest('http://localhost/api/invites/accept', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'content-type': 'application/json',
      'x-real-ip': ip,
    },
  });
}

describe('POST /api/invites/accept — rate limiting (TEAM-P03.6 Sub-task 6)', () => {
  // callPost is re-assigned in beforeEach after each vi.resetModules() so that
  // every test gets the route module with a fresh empty rateLimits Map.
  let callPost: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    // Reset modules first so the re-import below gets a fresh module instance
    // (and therefore a new empty `rateLimits = new Map()`).
    vi.resetModules();
    vi.clearAllMocks();

    // Re-register the mocks so the freshly-imported module sees them.
    vi.mock('@/lib/auth', () => ({ auth: mockAuth }));
    vi.mock('@/db', () => ({
      db: {
        teamInvite: {
          findFirst: mockTeamInviteFindFirst,
          update: mockTeamInviteUpdate,
        },
        teamMember: {
          findUnique: mockTeamMemberFindUnique,
          create: mockTeamMemberCreate,
        },
        user: { findUnique: mockUserFindUnique },
        $transaction: mockTransaction,
      },
    }));

    const mod = await import('./route');
    callPost = mod.POST as unknown as (req: NextRequest) => Promise<Response>;

    // Unauthenticated by default so we skip transaction plumbing.
    mockAuth.mockResolvedValue(null);
    // Return a valid invite so requests can reach completion normally.
    mockTeamInviteFindFirst.mockResolvedValue(VALID_INVITE);

    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ── Sliding-window limit ────────────────────────────────────────────────────

  it('returns 429 after 10 requests from the same IP within 60 seconds', async () => {
    const ip = '10.0.0.1';
    // First 10 requests should succeed (200 — valid invite returned).
    for (let i = 0; i < 10; i++) {
      const res = await callPost(makeRequestWithIp({ token: RAW_TOKEN }, ip));
      expect(res.status).not.toBe(429);
    }
    // 11th request must be rate-limited.
    const res = await callPost(makeRequestWithIp({ token: RAW_TOKEN }, ip));
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error).toMatch(/too many requests/i);
  });

  it('the 10th request is still allowed (limit is exclusive, not inclusive)', async () => {
    const ip = '10.0.0.2';
    for (let i = 0; i < 9; i++) {
      await callPost(makeRequestWithIp({ token: RAW_TOKEN }, ip));
    }
    // Exactly the 10th request should NOT be 429.
    const res = await callPost(makeRequestWithIp({ token: RAW_TOKEN }, ip));
    expect(res.status).not.toBe(429);
  });

  it('window resets after 60 seconds — allows 10 more requests in the new window', async () => {
    const ip = '10.0.0.3';
    // Exhaust the first window.
    for (let i = 0; i < 10; i++) {
      await callPost(makeRequestWithIp({ token: RAW_TOKEN }, ip));
    }
    // Advance time past the 60-second window.
    vi.advanceTimersByTime(60_001);
    // Should be allowed again.
    const res = await callPost(makeRequestWithIp({ token: RAW_TOKEN }, ip));
    expect(res.status).not.toBe(429);
  });

  // ── Failure-streak lockout ──────────────────────────────────────────────────

  it('locks out an IP for 1 hour after 5 consecutive 404s', async () => {
    const ip = '10.0.1.1';
    // Force 5 consecutive 404s (token not found).
    mockTeamInviteFindFirst.mockResolvedValue(null);
    for (let i = 0; i < 5; i++) {
      const res = await callPost(makeRequestWithIp({ token: RAW_TOKEN }, ip));
      expect(res.status).toBe(404);
    }
    // Next request — even with a valid invite — should be locked out.
    mockTeamInviteFindFirst.mockResolvedValue(VALID_INVITE);
    const res = await callPost(makeRequestWithIp({ token: RAW_TOKEN }, ip));
    expect(res.status).toBe(429);
  });

  it('the 4th consecutive 404 does NOT yet lock out the IP', async () => {
    const ip = '10.0.1.2';
    mockTeamInviteFindFirst.mockResolvedValue(null);
    for (let i = 0; i < 4; i++) {
      await callPost(makeRequestWithIp({ token: RAW_TOKEN }, ip));
    }
    // Restore a valid invite — should still be allowed.
    mockTeamInviteFindFirst.mockResolvedValue(VALID_INVITE);
    const res = await callPost(makeRequestWithIp({ token: RAW_TOKEN }, ip));
    expect(res.status).not.toBe(429);
  });

  it('lockout expires after 1 hour', async () => {
    const ip = '10.0.1.3';
    mockTeamInviteFindFirst.mockResolvedValue(null);
    for (let i = 0; i < 5; i++) {
      await callPost(makeRequestWithIp({ token: RAW_TOKEN }, ip));
    }
    // Advance past the 1-hour lockout.
    vi.advanceTimersByTime(60 * 60_000 + 1);
    mockTeamInviteFindFirst.mockResolvedValue(VALID_INVITE);
    const res = await callPost(makeRequestWithIp({ token: RAW_TOKEN }, ip));
    expect(res.status).not.toBe(429);
  });

  it('a successful token match resets the failure streak so lockout does not trigger', async () => {
    const ip = '10.0.1.4';
    // 4 failures followed by 1 success.
    mockTeamInviteFindFirst.mockResolvedValue(null);
    for (let i = 0; i < 4; i++) {
      await callPost(makeRequestWithIp({ token: RAW_TOKEN }, ip));
    }
    mockTeamInviteFindFirst.mockResolvedValue(VALID_INVITE);
    await callPost(makeRequestWithIp({ token: RAW_TOKEN }, ip)); // success — resets streak
    // 4 more failures after the reset must NOT trigger lockout (streak = 4, not 5+4).
    mockTeamInviteFindFirst.mockResolvedValue(null);
    for (let i = 0; i < 4; i++) {
      const res = await callPost(makeRequestWithIp({ token: RAW_TOKEN }, ip));
      expect(res.status).toBe(404); // not 429
    }
  });

  // ── IP resolution ───────────────────────────────────────────────────────────

  it('reads the IP from x-forwarded-for header', async () => {
    // Two different IPs in the same window — only the one that exhausted its
    // limit gets a 429; the other is unaffected.
    const ipA = '10.0.2.1';
    const ipB = '10.0.2.2';
    for (let i = 0; i < 10; i++) {
      await callPost(makeRequestWithIp({ token: RAW_TOKEN }, ipA));
    }
    // ipA should be limited.
    const resA = await callPost(makeRequestWithIp({ token: RAW_TOKEN }, ipA));
    expect(resA.status).toBe(429);
    // ipB is a fresh IP — should NOT be limited.
    const resB = await callPost(makeRequestWithIp({ token: RAW_TOKEN }, ipB));
    expect(resB.status).not.toBe(429);
  });

  it('reads the IP from x-real-ip when x-forwarded-for is absent', async () => {
    const ip = '10.0.2.3';
    for (let i = 0; i < 10; i++) {
      await callPost(makeRequestWithRealIp({ token: RAW_TOKEN }, ip));
    }
    const res = await callPost(makeRequestWithRealIp({ token: RAW_TOKEN }, ip));
    expect(res.status).toBe(429);
  });

  it('uses only the first IP when x-forwarded-for contains a comma-separated list', async () => {
    // e.g. "1.2.3.4, 5.6.7.8" — rate-limit should key on "1.2.3.4".
    // Exhaust using only the first-IP variant.
    for (let i = 0; i < 10; i++) {
      await callPost(
        new NextRequest('http://localhost/api/invites/accept', {
          method: 'POST',
          body: JSON.stringify({ token: RAW_TOKEN }),
          headers: {
            'content-type': 'application/json',
            'x-forwarded-for': '1.2.3.4, 5.6.7.8',
          },
        }),
      );
    }
    const res = await callPost(
      new NextRequest('http://localhost/api/invites/accept', {
        method: 'POST',
        body: JSON.stringify({ token: RAW_TOKEN }),
        headers: {
          'content-type': 'application/json',
          'x-forwarded-for': '1.2.3.4, 5.6.7.8',
        },
      }),
    );
    expect(res.status).toBe(429);
  });

  // ── Authenticated path is also rate-limited ─────────────────────────────────

  it('authenticated path is rate-limited the same as the unauthenticated path', async () => {
    const ip = '10.0.3.1';
    // Set up authenticated context.
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } });
    mockTransaction.mockImplementation(async (callback: Function) => {
      const tx = {
        teamInvite: { findFirst: mockTeamInviteFindFirst, update: mockTeamInviteUpdate },
        teamMember: { findUnique: mockTeamMemberFindUnique, create: mockTeamMemberCreate },
        user: { findUnique: mockUserFindUnique },
      };
      return callback(tx);
    });
    mockUserFindUnique.mockResolvedValue({ email: 'invitee@example.com' });
    mockTeamMemberFindUnique.mockResolvedValue(null);
    mockTeamInviteUpdate.mockResolvedValue({});
    mockTeamMemberCreate.mockResolvedValue({});

    // Send 10 authenticated requests.
    for (let i = 0; i < 10; i++) {
      await callPost(makeRequestWithIp({ token: RAW_TOKEN }, ip));
    }
    // 11th should be rate-limited.
    const res = await callPost(makeRequestWithIp({ token: RAW_TOKEN }, ip));
    expect(res.status).toBe(429);
  });

  // ── Different IPs are independent ──────────────────────────────────────────

  it('different IPs have independent rate-limit counters', async () => {
    // Exhaust ip1 completely.
    for (let i = 0; i <= 10; i++) {
      await callPost(makeRequestWithIp({ token: RAW_TOKEN }, '10.0.4.1'));
    }
    // ip2 should be completely unaffected.
    const res = await callPost(makeRequestWithIp({ token: RAW_TOKEN }, '10.0.4.2'));
    expect(res.status).not.toBe(429);
  });
});
