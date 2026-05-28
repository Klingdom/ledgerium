/**
 * Unit tests for GET /api/admin/alerts and POST /api/admin/alerts.
 *
 * Covers:
 *  - 404 for non-admin caller (GET + POST)
 *  - 200 happy path for admin caller (GET + POST)
 *  - POST threshold parsing
 *  - 500 when computeAlerts throws
 *
 * Mocking strategy:
 *  - vi.mock('@/lib/auth')                  — controls session
 *  - vi.mock('@/lib/admin-allowlist')       — controls canAccessAdmin
 *  - vi.mock('@/lib/compute-alerts')        — controls alert evaluation
 *  - vi.mock('@/lib/notifications')         — prevents real notifications
 *
 * @iter 090 / ADM-002 PR-1
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/admin-allowlist', () => ({
  canAccessAdmin: vi.fn(),
  isAdminUnlimited: vi.fn(),
}));

vi.mock('@/lib/compute-alerts', () => ({
  computeAlerts: vi.fn(),
}));

vi.mock('@/lib/notifications', () => ({
  sendAlertNotification: vi.fn(),
}));

import { auth } from '@/lib/auth';
import { canAccessAdmin } from '@/lib/admin-allowlist';
import { computeAlerts } from '@/lib/compute-alerts';
import { sendAlertNotification } from '@/lib/notifications';
import { GET, POST } from './route';

// ── Typed mock references ─────────────────────────────────────────────────────

const mockAuth = auth as ReturnType<typeof vi.fn>;
const mockCanAccessAdmin = canAccessAdmin as ReturnType<typeof vi.fn>;
const mockComputeAlerts = computeAlerts as ReturnType<typeof vi.fn>;
const mockSendAlertNotification = sendAlertNotification as ReturnType<typeof vi.fn>;

// ── Default mock data ─────────────────────────────────────────────────────────

const SAMPLE_ALERT = {
  id: 'error_rate_high',
  severity: 'P2',
  status: 'ok',
  message: 'Error rate within bounds',
  value: 0.5,
  threshold: 5,
  checkedAt: new Date().toISOString(),
};

function makePostRequest(body?: object): Request {
  if (body === undefined) {
    return new Request('http://localhost/api/admin/alerts', { method: 'POST' });
  }
  return new Request('http://localhost/api/admin/alerts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockSendAlertNotification.mockResolvedValue(undefined);
});

// ── GET tests ─────────────────────────────────────────────────────────────────

describe('GET /api/admin/alerts', () => {
  it('returns 404 for a non-admin caller', async () => {
    mockAuth.mockResolvedValue(null);
    mockCanAccessAdmin.mockReturnValue(false);

    const response = await GET();
    expect(response.status).toBe(404);

    const body = await response.json();
    expect(body.error).toBe('Not found');
  });

  it('returns 200 with alerts and summary for an admin caller', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'philklingmbb@gmail.com', id: 'u1' } });
    mockCanAccessAdmin.mockReturnValue(true);
    mockComputeAlerts.mockResolvedValue([SAMPLE_ALERT]);

    const response = await GET();
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(Array.isArray(body.alerts)).toBe(true);
    expect(body.alerts).toHaveLength(1);
    expect(body.summary).toBeDefined();
    expect(body.summary.ok).toBe(1);
    expect(body.summary.firing).toBe(0);
  });

  it('returns 500 when computeAlerts throws', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'philklingmbb@gmail.com', id: 'u1' } });
    mockCanAccessAdmin.mockReturnValue(true);
    mockComputeAlerts.mockRejectedValue(new Error('DB failure'));

    const response = await GET();
    expect(response.status).toBe(500);
  });
});

// ── POST tests ────────────────────────────────────────────────────────────────

describe('POST /api/admin/alerts', () => {
  it('returns 404 for a non-admin caller', async () => {
    mockAuth.mockResolvedValue(null);
    mockCanAccessAdmin.mockReturnValue(false);

    const response = await POST(makePostRequest());
    expect(response.status).toBe(404);

    const body = await response.json();
    expect(body.error).toBe('Not found');
  });

  it('returns 200 with sent count for an admin caller', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'philklingmbb@gmail.com', id: 'u1' } });
    mockCanAccessAdmin.mockReturnValue(true);
    mockComputeAlerts.mockResolvedValue([
      { ...SAMPLE_ALERT, status: 'firing', severity: 'P1' },
    ]);

    const response = await POST(makePostRequest({ threshold: 'P2' }));
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(typeof body.sent).toBe('number');
    expect(body.sent).toBe(1);
    expect(Array.isArray(body.alerts)).toBe(true);
  });

  it('uses default P2 threshold when body is missing', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'philklingmbb@gmail.com', id: 'u1' } });
    mockCanAccessAdmin.mockReturnValue(true);
    // Only a P3 alert firing — below P2 default threshold, should not be sent
    mockComputeAlerts.mockResolvedValue([
      { ...SAMPLE_ALERT, status: 'firing', severity: 'P3' },
    ]);

    const response = await POST(makePostRequest());
    expect(response.status).toBe(200);

    const body = await response.json();
    // P3 is below default P2 threshold → sent = 0
    expect(body.sent).toBe(0);
  });

  it('returns 500 when computeAlerts throws', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'philklingmbb@gmail.com', id: 'u1' } });
    mockCanAccessAdmin.mockReturnValue(true);
    mockComputeAlerts.mockRejectedValue(new Error('Alert evaluation failed'));

    const response = await POST(makePostRequest());
    expect(response.status).toBe(500);
  });
});
