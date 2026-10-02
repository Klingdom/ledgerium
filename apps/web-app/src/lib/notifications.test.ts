/**
 * Row #263 - sendAlertNotification REPORTS delivery outcomes instead of
 * swallowing them. Counts only; never throws.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/lib/email', () => ({
  sendEmail: vi.fn(),
  isEmailDeliveryConfigured: vi.fn(),
}));

import { isEmailDeliveryConfigured, sendEmail } from '@/lib/email';
import { sendAlertNotification } from './notifications';

const mockSendEmail = sendEmail as ReturnType<typeof vi.fn>;
const mockEmailConfigured = isEmailDeliveryConfigured as ReturnType<typeof vi.fn>;

const ALERT = { title: 'db down', severity: 'P1' as const, message: 'm', value: 3 };
const WEBHOOK = 'https://hooks.slack.test/services/SECRET-TOKEN';

const saved = { slack: process.env.SLACK_ALERTS_WEBHOOK_URL, email: process.env.ALERT_EMAIL_TO };
const fetchMock = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.SLACK_ALERTS_WEBHOOK_URL;
  delete process.env.ALERT_EMAIL_TO;
  mockEmailConfigured.mockReturnValue(true);
  mockSendEmail.mockResolvedValue({ success: true });
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockResolvedValue({ ok: true, status: 200 });
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  if (saved.slack === undefined) delete process.env.SLACK_ALERTS_WEBHOOK_URL;
  else process.env.SLACK_ALERTS_WEBHOOK_URL = saved.slack;
  if (saved.email === undefined) delete process.env.ALERT_EMAIL_TO;
  else process.env.ALERT_EMAIL_TO = saved.email;
});

describe('sendAlertNotification outcome reporting (row #263)', () => {
  it('no channel configured → configured 0 / delivered 0 (a console line is not a delivery)', async () => {
    expect(await sendAlertNotification(ALERT)).toEqual({ configured: 0, delivered: 0, failed: 0 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('blank / whitespace-only env values are not channels', async () => {
    process.env.SLACK_ALERTS_WEBHOOK_URL = '   ';
    process.env.ALERT_EMAIL_TO = '';
    expect(await sendAlertNotification(ALERT)).toEqual({ configured: 0, delivered: 0, failed: 0 });
  });

  it('Slack 2xx → delivered', async () => {
    process.env.SLACK_ALERTS_WEBHOOK_URL = WEBHOOK;
    expect(await sendAlertNotification(ALERT)).toEqual({ configured: 1, delivered: 1, failed: 0 });
  });

  it('Slack non-ok (revoked webhook) → failed, logs status only', async () => {
    process.env.SLACK_ALERTS_WEBHOOK_URL = WEBHOOK;
    fetchMock.mockResolvedValue({ ok: false, status: 404 });
    expect(await sendAlertNotification(ALERT)).toEqual({ configured: 1, delivered: 0, failed: 1 });
    const logged = JSON.stringify((console.error as ReturnType<typeof vi.fn>).mock.calls);
    expect(logged).toContain('404');
    expect(logged).not.toContain('SECRET-TOKEN');
  });

  it('Slack network error → failed, never throws, URL not logged', async () => {
    process.env.SLACK_ALERTS_WEBHOOK_URL = WEBHOOK;
    fetchMock.mockRejectedValue(new TypeError(`fetch failed for ${WEBHOOK}`));
    expect(await sendAlertNotification(ALERT)).toEqual({ configured: 1, delivered: 0, failed: 1 });
    expect(JSON.stringify((console.error as ReturnType<typeof vi.fn>).mock.calls)).not.toContain('SECRET-TOKEN');
  });

  it('Slack request carries an abort signal (a hung webhook cannot hang the route)', async () => {
    process.env.SLACK_ALERTS_WEBHOOK_URL = WEBHOOK;
    await sendAlertNotification(ALERT);
    expect(fetchMock.mock.calls[0]![1].signal).toBeInstanceOf(AbortSignal);
  });

  it('email success → delivered', async () => {
    process.env.ALERT_EMAIL_TO = 'ops@example.test';
    expect(await sendAlertNotification(ALERT)).toEqual({ configured: 1, delivered: 1, failed: 0 });
  });

  it('email provider reports { success: false } → failed', async () => {
    process.env.ALERT_EMAIL_TO = 'ops@example.test';
    mockSendEmail.mockResolvedValue({ success: false });
    expect(await sendAlertNotification(ALERT)).toEqual({ configured: 1, delivered: 0, failed: 1 });
  });

  it('email sender throws → failed, never throws out', async () => {
    process.env.ALERT_EMAIL_TO = 'ops@example.test';
    mockSendEmail.mockRejectedValue(new Error('smtp down'));
    expect(await sendAlertNotification(ALERT)).toEqual({ configured: 1, delivered: 0, failed: 1 });
  });

  it('ALERT_EMAIL_TO set but no email provider → failed, sendEmail NOT called (its console fallback reports success)', async () => {
    process.env.ALERT_EMAIL_TO = 'ops@example.test';
    mockEmailConfigured.mockReturnValue(false);
    expect(await sendAlertNotification(ALERT)).toEqual({ configured: 1, delivered: 0, failed: 1 });
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it('both channels, Slack fails and email succeeds → delivered 1 / failed 1', async () => {
    process.env.SLACK_ALERTS_WEBHOOK_URL = WEBHOOK;
    process.env.ALERT_EMAIL_TO = 'ops@example.test';
    fetchMock.mockResolvedValue({ ok: false, status: 500 });
    expect(await sendAlertNotification(ALERT)).toEqual({ configured: 2, delivered: 1, failed: 1 });
  });
});
