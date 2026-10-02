/**
 * POST /api/admin/alerts/heartbeat (row #282): status scheme + auth parity with
 * alerts/check. The channel senders run for real with global fetch and
 * lib/email mocked, so the fixed message text is asserted at the wire.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/lib/api-error-reporting', () => ({ reportApiError: vi.fn() }));
vi.mock('@/lib/email', () => ({
  isEmailDeliveryConfigured: vi.fn(),
  sendEmail: vi.fn(),
}));

import { reportApiError } from '@/lib/api-error-reporting';
import { isEmailDeliveryConfigured, sendEmail } from '@/lib/email';
import { HEARTBEAT_TEXT, HEARTBEAT_EMAIL_SUBJECT } from '@/lib/notifications';
import * as routeModule from './route';

const { POST } = routeModule;

const SECRET = 'test_cron_secret_value';
const SLACK_URL = 'https://hooks.slack.test/T000/B000/xxxxSECRETxxxx';
const MAIL = 'oncall@example.test';

const mockEmailConfigured = isEmailDeliveryConfigured as ReturnType<typeof vi.fn>;
const mockSendEmail = sendEmail as ReturnType<typeof vi.fn>;
const mockReport = reportApiError as ReturnType<typeof vi.fn>;
const fetchMock = vi.fn();

function req(auth?: string, query = ''): Request {
  const headers: Record<string, string> = {};
  if (auth !== undefined) headers['authorization'] = auth;
  return new Request(`http://localhost/api/admin/alerts/heartbeat${query}`, { method: 'POST', headers });
}
const call = (r: Request) => POST(r as never);

const saved = { ...process.env };
beforeEach(() => {
  vi.clearAllMocks();
  process.env.CRON_SECRET = SECRET;
  process.env.SLACK_ALERTS_WEBHOOK_URL = SLACK_URL;
  process.env.ALERT_EMAIL_TO = MAIL;
  mockEmailConfigured.mockReturnValue(true);
  mockSendEmail.mockResolvedValue({ success: true });
  fetchMock.mockResolvedValue({ ok: true, status: 200 });
  vi.stubGlobal('fetch', fetchMock);
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'log').mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  process.env = { ...saved };
});

describe('heartbeat auth (parity with alerts/check)', () => {
  it('503 when CRON_SECRET unset, reported as a 503 api error, nothing sent', async () => {
    delete process.env.CRON_SECRET;
    const res = await call(req(`Bearer ${SECRET}`));
    expect(res.status).toBe(503);
    expect(mockReport).toHaveBeenCalledWith('/api/admin/alerts/heartbeat', 503);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    ['missing header', undefined],
    ['wrong value', 'Bearer wrong_secret_value'],
    ['wrong length', 'Bearer short'],
    ['no Bearer prefix', SECRET],
  ])('401 on %s, nothing sent', async (_name, header) => {
    const res = await call(req(header));
    expect(res.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it('401 for a correct secret in the query string (no fallback)', async () => {
    const res = await call(req(undefined, `?secret=${SECRET}`));
    expect(res.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('does not export GET (a link prefetch must not send a message)', () => {
    expect((routeModule as Record<string, unknown>).GET).toBeUndefined();
  });
});

describe('heartbeat status scheme', () => {
  it('200 when every configured channel delivered; per-channel words only', async () => {
    const res = await call(req(`Bearer ${SECRET}`));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      configured: 2,
      delivered: 2,
      failed: 0,
      channels: { slack: 'delivered', email: 'delivered' },
    });
    expect(mockReport).not.toHaveBeenCalled();
  });

  it('207 when Slack is revoked but email delivers', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 404 });
    const res = await call(req(`Bearer ${SECRET}`));
    expect(res.status).toBe(207);
    expect((await res.json()).channels).toEqual({ slack: 'failed', email: 'delivered' });
    expect(mockReport).not.toHaveBeenCalled();
  });

  it('207 when email fails but Slack delivers', async () => {
    mockSendEmail.mockResolvedValue({ success: false });
    const res = await call(req(`Bearer ${SECRET}`));
    expect(res.status).toBe(207);
    expect((await res.json()).channels).toEqual({ slack: 'delivered', email: 'failed' });
  });

  it('424 when channels are configured but none delivered (and no URL leaks)', async () => {
    fetchMock.mockRejectedValue(new Error(`boom ${SLACK_URL}`));
    mockSendEmail.mockRejectedValue(new Error('smtp'));
    const res = await call(req(`Bearer ${SECRET}`));
    expect(res.status).toBe(424);
    const body = await res.json();
    expect(body).toMatchObject({ configured: 2, delivered: 0, failed: 2 });
    expect(JSON.stringify(body)).not.toContain(SLACK_URL);
    expect(mockReport).not.toHaveBeenCalled();
  });

  it('424 when ALERT_EMAIL_TO is set but no email provider exists (channel cannot deliver)', async () => {
    delete process.env.SLACK_ALERTS_WEBHOOK_URL;
    mockEmailConfigured.mockReturnValue(false);
    const res = await call(req(`Bearer ${SECRET}`));
    expect(res.status).toBe(424);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it('412 when no channel is configured (distinct from 424/503/500/401)', async () => {
    delete process.env.SLACK_ALERTS_WEBHOOK_URL;
    process.env.ALERT_EMAIL_TO = '   ';
    const res = await call(req(`Bearer ${SECRET}`));
    expect(res.status).toBe(412);
    expect(await res.json()).toMatchObject({ configured: 0, delivered: 0, failed: 0 });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it('only configured channels are attempted (Slack only -> 200, no email)', async () => {
    delete process.env.ALERT_EMAIL_TO;
    const res = await call(req(`Bearer ${SECRET}`));
    expect(res.status).toBe(200);
    expect((await res.json()).channels).toEqual({ slack: 'delivered', email: 'not_configured' });
    expect(mockSendEmail).not.toHaveBeenCalled();
  });
});

describe('heartbeat message', () => {
  it('sends the fixed, unmistakable test text to Slack and email, with no alert data', async () => {
    await call(req(`Bearer ${SECRET}`));
    expect(HEARTBEAT_TEXT).toMatch(/heartbeat — no action needed/);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe(SLACK_URL);
    expect(JSON.parse(init.body).text).toContain(HEARTBEAT_TEXT);
    const mail = mockSendEmail.mock.calls[0]![0];
    expect(mail.to).toBe(MAIL);
    expect(mail.subject).toBe(HEARTBEAT_EMAIL_SUBJECT);
    expect(mail.subject).toMatch(/^\[TEST\]/);
    expect(mail.html).toContain(HEARTBEAT_TEXT);
  });

  it('is identical across retries (idempotent-safe: no timestamp or counter)', async () => {
    await call(req(`Bearer ${SECRET}`));
    await call(req(`Bearer ${SECRET}`));
    expect(fetchMock.mock.calls[0]![1].body).toBe(fetchMock.mock.calls[1]![1].body);
    expect(mockSendEmail.mock.calls[0]![0]).toEqual(mockSendEmail.mock.calls[1]![0]);
  });

  it('logs no webhook URL or address', async () => {
    fetchMock.mockRejectedValue(new Error(`x ${SLACK_URL}`));
    await call(req(`Bearer ${SECRET}`));
    const logged = [
      ...(console.error as unknown as { mock: { calls: unknown[][] } }).mock.calls,
      ...(console.log as unknown as { mock: { calls: unknown[][] } }).mock.calls,
    ]
      .flat()
      .join(' ');
    expect(logged).not.toContain(SLACK_URL);
    expect(logged).not.toContain(MAIL);
  });
});
