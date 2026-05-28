/**
 * Tests for POST /api/admin/bootstrap
 *
 * @iter 091 / ADM-002 PR-2
 *
 * Covers (guard order per Sub-task 5):
 *   Guard 1 — DISABLE_ADMIN_BOOTSTRAP=true                 → 404
 *   Guard 2 — Missing X-Admin-Bootstrap-Confirm header      → 400
 *   Guard 2 — X-Admin-Bootstrap-Confirm: false              → 400
 *   Guard 3 — Rate limit (3/hour; 4th request blocked)      → 429
 *   Guard 3 — Rate limit window reset (new request allowed)
 *   Guard 4 — No session                                    → 401
 *   Guard 5 — Existing admin found in transaction           → 403
 *   Guard 5 — No existing admin; promotion succeeds         → 200
 *   Guard 5 — Correct user's isAdmin flag set to true
 *   Guard 6 — admin_bootstrap_claimed analytics event emitted
 *   Guard 6 — Audit event payload is PII-safe
 *   Guard 5 — P2034 serialization failure                   → 409
 *
 * Mocking strategy:
 *   - vi.hoisted pattern for db + auth + analytics mocks
 *   - Rate-limit module is mocked to allow deterministic testing
 *   - Each test uses a unique IP to avoid rate-limit state bleeds
 *     (rate-limit bypass NODE_ENV=test is always active; explicit rate-limit
 *      tests call the module-level helpers directly via bootstrap-buckets.test.ts)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Hoisted mock factories ────────────────────────────────────────────────────

const {
  mockUserFindFirst,
  mockUserUpdate,
  mockTransaction,
  mockAuth,
  mockTrackServer,
  mockCheckBootstrapRateLimit,
} = vi.hoisted(() => ({
  mockUserFindFirst: vi.fn(),
  mockUserUpdate: vi.fn(),
  mockTransaction: vi.fn(),
  mockAuth: vi.fn(),
  mockTrackServer: vi.fn(),
  mockCheckBootstrapRateLimit: vi.fn(),
}));

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock('@/db', () => ({
  db: {
    user: {
      findFirst: mockUserFindFirst,
      update: mockUserUpdate,
    },
    $transaction: mockTransaction,
  },
}));

vi.mock('@/lib/auth', () => ({ auth: mockAuth }));

vi.mock('@/lib/analytics-server', () => ({
  trackServer: mockTrackServer,
}));

vi.mock('@/lib/rate-limit/bootstrap-buckets', () => ({
  checkBootstrapRateLimit: mockCheckBootstrapRateLimit,
}));

// ── Import handler AFTER mocks ────────────────────────────────────────────────

import { POST } from './route';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Build a minimal NextRequest with sensible defaults. */
function makeRequest(opts: {
  confirmHeader?: string | null;
  ip?: string;
  userAgent?: string;
} = {}): NextRequest {
  const {
    confirmHeader = 'true',
    ip = '10.0.0.1',
    userAgent = 'curl/7.88.0',
  } = opts;

  const headers: Record<string, string> = {
    'x-forwarded-for': ip,
    'user-agent': userAgent,
  };

  if (confirmHeader !== null) {
    headers['x-admin-bootstrap-confirm'] = confirmHeader;
  }

  return new NextRequest('http://localhost/api/admin/bootstrap', {
    method: 'POST',
    headers,
  });
}

/** Simulate a successful transaction: callback receives a tx stub. */
function setupSuccessfulTransaction(opts: {
  existingAdmin?: { id: string } | null;
  promotedUser?: { id: string; email: string };
} = {}) {
  const {
    existingAdmin = null,
    promotedUser = { id: 'user-1', email: 'admin@example.com' },
  } = opts;

  mockTransaction.mockImplementation(async (callback: Function) => {
    const tx = {
      user: {
        findFirst: vi.fn().mockResolvedValue(existingAdmin),
        update: vi.fn().mockResolvedValue(promotedUser),
      },
    };
    return callback(tx);
  });
}

// ── Default session ───────────────────────────────────────────────────────────

const VALID_SESSION = { user: { id: 'user-1', email: 'admin@example.com' } };

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('POST /api/admin/bootstrap — Guard 1: DISABLE_ADMIN_BOOTSTRAP env flag', () => {
  const original = process.env.DISABLE_ADMIN_BOOTSTRAP;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckBootstrapRateLimit.mockReturnValue({ allowed: true });
  });

  afterEach(() => {
    if (original === undefined) {
      delete process.env.DISABLE_ADMIN_BOOTSTRAP;
    } else {
      process.env.DISABLE_ADMIN_BOOTSTRAP = original;
    }
  });

  it('returns 404 when DISABLE_ADMIN_BOOTSTRAP=true', async () => {
    process.env.DISABLE_ADMIN_BOOTSTRAP = 'true';
    const res = await POST(makeRequest());
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe('Not found');
  });

  it('does not call auth or DB when disabled', async () => {
    process.env.DISABLE_ADMIN_BOOTSTRAP = 'true';
    await POST(makeRequest());
    expect(mockAuth).not.toHaveBeenCalled();
    expect(mockTransaction).not.toHaveBeenCalled();
  });
});

describe('POST /api/admin/bootstrap — Guard 2: CSRF confirmation header', () => {
  const original = process.env.DISABLE_ADMIN_BOOTSTRAP;

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.DISABLE_ADMIN_BOOTSTRAP;
    mockCheckBootstrapRateLimit.mockReturnValue({ allowed: true });
  });

  afterEach(() => {
    if (original === undefined) {
      delete process.env.DISABLE_ADMIN_BOOTSTRAP;
    } else {
      process.env.DISABLE_ADMIN_BOOTSTRAP = original;
    }
  });

  it('returns 400 when X-Admin-Bootstrap-Confirm header is absent', async () => {
    const res = await POST(makeRequest({ confirmHeader: null }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/confirmation header/i);
  });

  it('returns 400 when X-Admin-Bootstrap-Confirm is "false"', async () => {
    const res = await POST(makeRequest({ confirmHeader: 'false' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/confirmation header/i);
  });

  it('does not advance to auth when CSRF header is missing', async () => {
    await POST(makeRequest({ confirmHeader: null }));
    expect(mockAuth).not.toHaveBeenCalled();
  });
});

describe('POST /api/admin/bootstrap — Guard 3: Rate limit', () => {
  const original = process.env.DISABLE_ADMIN_BOOTSTRAP;

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.DISABLE_ADMIN_BOOTSTRAP;
  });

  afterEach(() => {
    if (original === undefined) {
      delete process.env.DISABLE_ADMIN_BOOTSTRAP;
    } else {
      process.env.DISABLE_ADMIN_BOOTSTRAP = original;
    }
  });

  it('returns 429 when rate limit is exceeded', async () => {
    mockCheckBootstrapRateLimit.mockReturnValue({
      allowed: false,
      retryAfterSeconds: 3599,
    });
    const res = await POST(makeRequest());
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.code).toBe('rate_limit_exceeded');
    expect(body.retryAfterSeconds).toBe(3599);
  });

  it('does not call auth when rate limit is exceeded', async () => {
    mockCheckBootstrapRateLimit.mockReturnValue({
      allowed: false,
      retryAfterSeconds: 1,
    });
    await POST(makeRequest());
    expect(mockAuth).not.toHaveBeenCalled();
  });

  it('allows request when rate limit returns { allowed: true }', async () => {
    mockCheckBootstrapRateLimit.mockReturnValue({ allowed: true });
    mockAuth.mockResolvedValue(null); // stops at Guard 4 — just verifying RL passes through
    const res = await POST(makeRequest());
    expect(res.status).toBe(401); // reached auth guard
  });
});

describe('POST /api/admin/bootstrap — Guard 4: Session authentication', () => {
  const original = process.env.DISABLE_ADMIN_BOOTSTRAP;

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.DISABLE_ADMIN_BOOTSTRAP;
    mockCheckBootstrapRateLimit.mockReturnValue({ allowed: true });
  });

  afterEach(() => {
    if (original === undefined) {
      delete process.env.DISABLE_ADMIN_BOOTSTRAP;
    } else {
      process.env.DISABLE_ADMIN_BOOTSTRAP = original;
    }
  });

  it('returns 401 when there is no session', async () => {
    mockAuth.mockResolvedValue(null);
    const res = await POST(makeRequest());
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toMatch(/unauthorized/i);
  });

  it('returns 401 when session has no user id', async () => {
    mockAuth.mockResolvedValue({ user: {} });
    const res = await POST(makeRequest());
    expect(res.status).toBe(401);
  });

  it('does not call $transaction when session is absent', async () => {
    mockAuth.mockResolvedValue(null);
    await POST(makeRequest());
    expect(mockTransaction).not.toHaveBeenCalled();
  });
});

describe('POST /api/admin/bootstrap — Guard 5: SERIALIZABLE transaction', () => {
  const original = process.env.DISABLE_ADMIN_BOOTSTRAP;

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.DISABLE_ADMIN_BOOTSTRAP;
    mockCheckBootstrapRateLimit.mockReturnValue({ allowed: true });
    mockAuth.mockResolvedValue(VALID_SESSION);
    mockTrackServer.mockReturnValue(undefined);
  });

  afterEach(() => {
    if (original === undefined) {
      delete process.env.DISABLE_ADMIN_BOOTSTRAP;
    } else {
      process.env.DISABLE_ADMIN_BOOTSTRAP = original;
    }
  });

  it('returns 403 when an existing admin is found inside the transaction', async () => {
    setupSuccessfulTransaction({ existingAdmin: { id: 'existing-admin' } });
    const res = await POST(makeRequest());
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toMatch(/admin already exists/i);
  });

  it('returns 200 with ok:true when promotion succeeds', async () => {
    setupSuccessfulTransaction();
    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.message).toMatch(/admin/i);
  });

  it('calls update with isAdmin:true for the correct user id', async () => {
    let capturedUpdateArgs: unknown;

    mockTransaction.mockImplementation(async (callback: Function) => {
      const tx = {
        user: {
          findFirst: vi.fn().mockResolvedValue(null),
          update: vi.fn().mockImplementation((args: unknown) => {
            capturedUpdateArgs = args;
            return Promise.resolve({ id: 'user-1', email: 'admin@example.com' });
          }),
        },
      };
      return callback(tx);
    });

    await POST(makeRequest());

    expect(capturedUpdateArgs).toMatchObject({
      where: { id: 'user-1' },
      data: { isAdmin: true },
    });
  });

  it('returns 409 with code serialization_failure on Prisma P2034', async () => {
    const p2034 = Object.assign(new Error('Serialization failure'), { code: 'P2034' });
    mockTransaction.mockRejectedValue(p2034);

    const res = await POST(makeRequest());
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.code).toBe('serialization_failure');
    expect(body.retryable).toBe(true);
    expect(body.error).toMatch(/concurrent|retry/i);
  });

  it('non-P2034 errors return 500', async () => {
    mockTransaction.mockRejectedValue(new Error('Connection timeout'));
    const res = await POST(makeRequest());
    expect(res.status).toBe(500);
  });
});

describe('POST /api/admin/bootstrap — Guard 6: Audit log emission', () => {
  const original = process.env.DISABLE_ADMIN_BOOTSTRAP;

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.DISABLE_ADMIN_BOOTSTRAP;
    mockCheckBootstrapRateLimit.mockReturnValue({ allowed: true });
    mockAuth.mockResolvedValue(VALID_SESSION);
    mockTrackServer.mockReturnValue(undefined);
    setupSuccessfulTransaction();
  });

  afterEach(() => {
    if (original === undefined) {
      delete process.env.DISABLE_ADMIN_BOOTSTRAP;
    } else {
      process.env.DISABLE_ADMIN_BOOTSTRAP = original;
    }
  });

  it('emits admin_bootstrap_claimed analytics event on success', async () => {
    await POST(makeRequest({ userAgent: 'Chrome/122.0' }));
    expect(mockTrackServer).toHaveBeenCalledWith(
      'admin_bootstrap_claimed',
      expect.objectContaining({ emailDomain: 'example.com' }),
    );
  });

  it('audit event does not include the full email (PII-safe)', async () => {
    await POST(makeRequest());
    const callArgs = mockTrackServer.mock.calls[0]?.[1] as Record<string, unknown> | undefined;
    expect(callArgs).toBeDefined();
    // emailDomain must not contain '@' or the local-part
    expect(callArgs!['emailDomain']).not.toContain('@');
    expect(callArgs!['emailDomain']).not.toContain('admin');
  });

  it('audit event does not include the full IP (PII-safe ipPrefix)', async () => {
    await POST(makeRequest({ ip: '203.0.113.42' }));
    const callArgs = mockTrackServer.mock.calls[0]?.[1] as Record<string, unknown> | undefined;
    expect(callArgs).toBeDefined();
    // ipPrefix should be "203.0.x.x" — not the full IP
    expect(callArgs!['ipPrefix']).toMatch(/^203\.0\.x\.x$/);
    expect(callArgs!['ipPrefix']).not.toContain('113');
    expect(callArgs!['ipPrefix']).not.toContain('42');
  });

  it('audit event includes userAgentFamily (not raw UA string)', async () => {
    await POST(makeRequest({ userAgent: 'curl/7.88.0' }));
    const callArgs = mockTrackServer.mock.calls[0]?.[1] as Record<string, unknown> | undefined;
    expect(callArgs).toBeDefined();
    // Should be the parsed family, not the raw value
    expect(callArgs!['userAgentFamily']).toBe('curl');
    expect(callArgs!['userAgentFamily']).not.toContain('7.88.0');
  });

  it('does not emit analytics event when promotion fails (existing admin)', async () => {
    setupSuccessfulTransaction({ existingAdmin: { id: 'other-admin' } });
    await POST(makeRequest());
    expect(mockTrackServer).not.toHaveBeenCalled();
  });
});
