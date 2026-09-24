import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/db', () => ({
  db: { apiKey: { findUnique: vi.fn() } },
}));
vi.mock('@/lib/api-keys', () => ({ hashKey: vi.fn(() => 'hashed-key') }));
vi.mock('@/lib/analytics-server', () => ({ trackServer: vi.fn() }));
vi.mock('@/lib/rate-limit/extension-telemetry-buckets', () => ({
  checkExtensionTelemetryRateLimit: vi.fn(() => ({ allowed: true })),
}));

import { POST } from './route';
import { db } from '@/db';
import { trackServer } from '@/lib/analytics-server';
import { checkExtensionTelemetryRateLimit } from '@/lib/rate-limit/extension-telemetry-buckets';

const mockFindUnique = vi.mocked((db as any).apiKey.findUnique);
const mockTrackServer = vi.mocked(trackServer);
const mockRateLimit = vi.mocked(checkExtensionTelemetryRateLimit);

function req(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/analytics/extension', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

const VALID_INSTALL_ID = '11111111-1111-4111-8111-111111111111';

beforeEach(() => {
  vi.clearAllMocks();
  mockRateLimit.mockReturnValue({ allowed: true });
});

describe('POST /api/analytics/extension — extension_installed', () => {
  it('accepts a valid payload and forwards to trackServer with no userId (anonymous)', async () => {
    const res = await POST(req({
      event: 'extension_installed',
      installType: 'install',
      extensionVersion: '2.0.0',
      browser: 'chrome',
    }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ data: { received: true }, error: null });
    expect(mockTrackServer).toHaveBeenCalledWith('extension_installed', {
      installType: 'install',
      extensionVersion: '2.0.0',
      browser: 'chrome',
    });
  });
});

describe('POST /api/analytics/extension — validation', () => {
  it('rejects an unknown event name', async () => {
    const res = await POST(req({ event: 'extension_totally_made_up', foo: 'bar' }));
    expect(res.status).toBe(400);
    expect(mockTrackServer).not.toHaveBeenCalled();
  });

  it('rejects a malformed extensionVersion', async () => {
    const res = await POST(req({
      event: 'extension_session_active',
      extensionVersion: 'v2.0.0-beta',
      installId: VALID_INSTALL_ID,
    }));
    expect(res.status).toBe(400);
    expect(mockTrackServer).not.toHaveBeenCalled();
  });

  it('rejects an extra/unexpected field (.strict())', async () => {
    const res = await POST(req({
      event: 'extension_installed',
      installType: 'install',
      extensionVersion: '2.0.0',
      browser: 'chrome',
      pageUrl: 'https://example.com/secret', // must never be accepted
    }));
    expect(res.status).toBe(400);
    expect(mockTrackServer).not.toHaveBeenCalled();
  });

  it('rejects a non-UUID installId', async () => {
    const res = await POST(req({
      event: 'extension_session_active',
      extensionVersion: '2.0.0',
      installId: 'not-a-uuid',
    }));
    expect(res.status).toBe(400);
  });

  it('rejects invalid JSON bodies without throwing', async () => {
    const badReq = new NextRequest('http://localhost/api/analytics/extension', {
      method: 'POST',
      body: '{not json',
      headers: { 'content-type': 'application/json' },
    });
    const res = await POST(badReq);
    expect(res.status).toBe(400);
  });
});

describe('POST /api/analytics/extension — extension_signin_linked', () => {
  it('resolves userId from apiKey server-side and never stores the raw key', async () => {
    mockFindUnique.mockResolvedValue({ userId: 'user-42' });
    const res = await POST(req({
      event: 'extension_signin_linked',
      installId: VALID_INSTALL_ID,
      apiKey: 'ldg_abc123',
    }));
    expect(res.status).toBe(200);
    expect(mockTrackServer).toHaveBeenCalledWith('extension_signin_linked', {
      userId: 'user-42',
      installId: VALID_INSTALL_ID,
    });
    // The raw key is never forwarded to trackServer / persisted.
    const [, properties] = mockTrackServer.mock.calls[0]!;
    expect(JSON.stringify(properties)).not.toContain('ldg_abc123');
  });

  it('is a silent no-op (still 200) for an unknown apiKey — not an oracle', async () => {
    mockFindUnique.mockResolvedValue(null);
    const res = await POST(req({
      event: 'extension_signin_linked',
      installId: VALID_INSTALL_ID,
      apiKey: 'ldg_does_not_exist',
    }));
    expect(res.status).toBe(200);
    expect(mockTrackServer).not.toHaveBeenCalled();
  });
});

describe('POST /api/analytics/extension — rate limiting', () => {
  it('returns 429 when the per-IP rate limit is exceeded', async () => {
    mockRateLimit.mockReturnValue({ allowed: false, retryAfterSeconds: 42 });
    const res = await POST(req({
      event: 'extension_installed',
      installType: 'install',
      extensionVersion: '2.0.0',
      browser: 'chrome',
    }));
    expect(res.status).toBe(429);
    expect(mockTrackServer).not.toHaveBeenCalled();
  });
});

describe('POST /api/analytics/extension — a failing trackServer/db call does not surface as a crash', () => {
  it('still returns 200 even if the downstream db lookup throws', async () => {
    mockFindUnique.mockRejectedValue(new Error('db unavailable'));
    const res = await POST(req({
      event: 'extension_signin_linked',
      installId: VALID_INSTALL_ID,
      apiKey: 'ldg_whatever',
    }));
    expect(res.status).toBe(200);
  });
});
