/**
 * Unit tests for GET /api/admin/alerts/check (cron endpoint).
 *
 * Covers:
 *  - Missing CRON_SECRET env → 500
 *  - Wrong Bearer token (value mismatch) → 401
 *  - Wrong-length Bearer token → 401
 *  - Correct Bearer token → 200
 *  - ?secret= query-param attempt (removed path) → 401
 *  - Both wrong Authorization header AND ?secret=correct → 401 (no fallback)
 *  - Missing Authorization header entirely → 401
 *  - Authorization header without Bearer prefix → 401
 *
 * Mocking strategy:
 *  - vi.mock('@/lib/compute-alerts')   — controls alert evaluation
 *  - vi.mock('@/lib/notifications')    — prevents real notifications
 *  - process.env.CRON_SECRET           — controlled per test via beforeEach/afterEach
 *
 * @iter 092 / ADM-002 PR-3
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock('@/lib/compute-alerts', () => ({
  computeAlerts: vi.fn(),
}));

vi.mock('@/lib/notifications', () => ({
  sendAlertNotification: vi.fn(),
}));

import { computeAlerts } from '@/lib/compute-alerts';
import { sendAlertNotification } from '@/lib/notifications';
import { GET } from './route';

// ── Typed mock references ─────────────────────────────────────────────────────

const mockComputeAlerts = computeAlerts as ReturnType<typeof vi.fn>;
const mockSendAlertNotification = sendAlertNotification as ReturnType<typeof vi.fn>;

// ── Test constants ─────────────────────────────────────────────────────────────

const VALID_SECRET = 'test_cron_secret_value';

const SAMPLE_ALERT = {
  id: 'error_rate_high',
  severity: 'P2' as const,
  status: 'ok' as const,
  message: 'Error rate within bounds',
  value: 0.5,
  threshold: 5,
  checkedAt: new Date().toISOString(),
};

// ── Request factory ───────────────────────────────────────────────────────────

function makeRequest(options: {
  authHeader?: string;
  queryParams?: Record<string, string>;
} = {}): Request {
  const url = new URL('http://localhost/api/admin/alerts/check');
  if (options.queryParams) {
    for (const [key, value] of Object.entries(options.queryParams)) {
      url.searchParams.set(key, value);
    }
  }
  const headers: Record<string, string> = {};
  if (options.authHeader !== undefined) {
    headers['authorization'] = options.authHeader;
  }
  return new Request(url.toString(), { headers });
}

// ── Env management ────────────────────────────────────────────────────────────

const originalCronSecret = process.env.CRON_SECRET;

beforeEach(() => {
  vi.clearAllMocks();
  process.env.CRON_SECRET = VALID_SECRET;
  mockSendAlertNotification.mockResolvedValue(undefined);
});

afterEach(() => {
  process.env.CRON_SECRET = originalCronSecret;
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('GET /api/admin/alerts/check — cron secret enforcement', () => {
  it('returns 500 when CRON_SECRET env var is not set', async () => {
    delete process.env.CRON_SECRET;

    const response = await GET(makeRequest({ authHeader: `Bearer ${VALID_SECRET}` }) as any);
    expect(response.status).toBe(500);

    const body = await response.json();
    expect(body.error).toBe('Server misconfiguration');
  });

  it('returns 401 when Bearer token does not match (wrong value)', async () => {
    const response = await GET(makeRequest({ authHeader: 'Bearer wrong_secret_value' }) as any);
    expect(response.status).toBe(401);

    const body = await response.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 401 when Bearer token has wrong length (before timingSafeEqual)', async () => {
    // A shorter token than the real secret — the length check fires before
    // crypto.timingSafeEqual is called, preventing a throw on mismatched lengths.
    const response = await GET(makeRequest({ authHeader: 'Bearer short' }) as any);
    expect(response.status).toBe(401);

    const body = await response.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 200 with alertsSent count when Bearer token is correct', async () => {
    mockComputeAlerts.mockResolvedValue([SAMPLE_ALERT]);

    const response = await GET(makeRequest({ authHeader: `Bearer ${VALID_SECRET}` }) as any);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.checked).toBe(true);
    expect(typeof body.alertsSent).toBe('number');
    expect(body.alertsSent).toBe(0); // SAMPLE_ALERT is status:'ok', not firing
  });

  it('returns 401 when secret is provided via ?secret= query param (removed path)', async () => {
    // The query-param acceptance path has been removed due to log-exposure risk.
    // Providing the correct value via ?secret= must NOT grant access.
    const response = await GET(
      makeRequest({ queryParams: { secret: VALID_SECRET } }) as any,
    );
    expect(response.status).toBe(401);

    const body = await response.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 401 when Authorization header is wrong AND ?secret= has correct value (no fallback)', async () => {
    // Confirms there is no query-param fallback even when the header is present
    // but incorrect. The ?secret= path must be fully inoperative.
    const response = await GET(
      makeRequest({
        authHeader: 'Bearer wrong_value',
        queryParams: { secret: VALID_SECRET },
      }) as any,
    );
    expect(response.status).toBe(401);

    const body = await response.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 401 when Authorization header is entirely absent', async () => {
    // No header at all — provided string will be empty after regex fails.
    const response = await GET(makeRequest() as any);
    expect(response.status).toBe(401);

    const body = await response.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 401 when Authorization header omits the Bearer prefix', async () => {
    // Raw secret without "Bearer " prefix must be rejected.
    const response = await GET(makeRequest({ authHeader: VALID_SECRET }) as any);
    expect(response.status).toBe(401);

    const body = await response.json();
    expect(body.error).toBe('Unauthorized');
  });
});

describe('GET /api/admin/alerts/check — notification dispatch', () => {
  it('sends notifications only for P1 and P2 firing alerts', async () => {
    const firingP1 = { ...SAMPLE_ALERT, severity: 'P1' as const, status: 'firing' as const };
    const firingP2 = { ...SAMPLE_ALERT, severity: 'P2' as const, status: 'firing' as const, id: 'db_conn_high' };
    const okP1 = { ...SAMPLE_ALERT, severity: 'P1' as const, status: 'ok' as const, id: 'ok_alert' };
    const firingP3 = { ...SAMPLE_ALERT, severity: 'P3' as const, status: 'firing' as const, id: 'p3_alert' };

    mockComputeAlerts.mockResolvedValue([firingP1, firingP2, okP1, firingP3]);

    const response = await GET(makeRequest({ authHeader: `Bearer ${VALID_SECRET}` }) as any);
    expect(response.status).toBe(200);

    const body = await response.json();
    // P3 firing and ok P1 must not generate notifications; only the 2 firing P1/P2
    expect(body.alertsSent).toBe(2);
    expect(mockSendAlertNotification).toHaveBeenCalledTimes(2);
  });

  it('returns 500 when computeAlerts throws', async () => {
    mockComputeAlerts.mockRejectedValue(new Error('DB connection failed'));

    const response = await GET(makeRequest({ authHeader: `Bearer ${VALID_SECRET}` }) as any);
    expect(response.status).toBe(500);

    const body = await response.json();
    expect(body.error).toBe('Failed to check alerts');
  });
});
