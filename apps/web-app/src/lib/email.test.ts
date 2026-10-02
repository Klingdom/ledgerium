/**
 * email.ts — provider selection unit tests (pure, node env).
 * Password-reset-email reliability, Option A (Hostinger SMTP).
 */

import { describe, it, expect, vi, afterEach } from 'vitest';

const sendMail = vi.fn();
const createTransport = vi.fn((_opts: unknown) => ({ sendMail, verify: vi.fn() }));
vi.mock('nodemailer', () => ({ default: { createTransport: (o: unknown) => createTransport(o) } }));

import {
  selectEmailProvider,
  isEmailDeliveryConfigured,
  sendEmail,
  __resetEmailTransport,
  SMTP_CONNECTION_TIMEOUT_MS,
  SMTP_GREETING_TIMEOUT_MS,
  SMTP_SOCKET_TIMEOUT_MS,
  SMTP_SEND_DEADLINE_MS,
} from './email';

describe('SMTP timeouts (row #266)', () => {
  const saved = process.env.SMTP_PASSWORD;
  afterEach(() => {
    vi.useRealTimers();
    sendMail.mockReset();
    createTransport.mockClear();
    __resetEmailTransport();
    if (saved === undefined) delete process.env.SMTP_PASSWORD;
    else process.env.SMTP_PASSWORD = saved;
  });

  it('configures connection, greeting and socket timeouts on the transport, all under the 30s job budget', async () => {
    process.env.SMTP_PASSWORD = 'pw';
    sendMail.mockResolvedValue({});
    await sendEmail({ to: 'a@b.c', subject: 's', html: 'h' });
    expect(createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        connectionTimeout: SMTP_CONNECTION_TIMEOUT_MS,
        greetingTimeout: SMTP_GREETING_TIMEOUT_MS,
        socketTimeout: SMTP_SOCKET_TIMEOUT_MS,
      }),
    );
    expect(SMTP_SEND_DEADLINE_MS).toBeLessThan(30_000);
  });

  it('a hung SMTP server fails the send at the deadline instead of hanging', async () => {
    process.env.SMTP_PASSWORD = 'pw';
    vi.useFakeTimers();
    sendMail.mockReturnValue(new Promise(() => {})); // never settles
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});

    let result: { success: boolean } | undefined;
    const p = sendEmail({ to: 'a@b.c', subject: 's', html: 'h' }).then((r) => (result = r));
    await vi.advanceTimersByTimeAsync(SMTP_SEND_DEADLINE_MS - 1);
    expect(result).toBeUndefined();
    await vi.advanceTimersByTimeAsync(2);
    await p;
    expect(result).toEqual({ success: false });
    err.mockRestore();
  });

  it('a prompt success is not delayed or failed by the deadline timer', async () => {
    process.env.SMTP_PASSWORD = 'pw';
    sendMail.mockResolvedValue({});
    expect(await sendEmail({ to: 'a@b.c', subject: 's', html: 'h' })).toEqual({ success: true });
  });
});

describe('selectEmailProvider', () => {
  it('chooses smtp when SMTP_PASSWORD is set (SMTP takes precedence)', () => {
    expect(selectEmailProvider({ SMTP_PASSWORD: 'pw' })).toBe('smtp');
    expect(selectEmailProvider({ SMTP_PASSWORD: 'pw', RESEND_API_KEY: 're_x' })).toBe('smtp');
  });

  it('chooses resend when only RESEND_API_KEY is set', () => {
    expect(selectEmailProvider({ RESEND_API_KEY: 're_x' })).toBe('resend');
  });

  it('falls back to console when nothing is configured', () => {
    expect(selectEmailProvider({})).toBe('console');
  });

  it('treats empty / whitespace-only values as unset', () => {
    expect(selectEmailProvider({ SMTP_PASSWORD: '', RESEND_API_KEY: '  ' })).toBe('console');
    expect(selectEmailProvider({ SMTP_PASSWORD: '   ', RESEND_API_KEY: 're_x' })).toBe('resend');
  });
});

describe('isEmailDeliveryConfigured', () => {
  it('is true for smtp or resend, false for console', () => {
    expect(isEmailDeliveryConfigured({ SMTP_PASSWORD: 'pw' })).toBe(true);
    expect(isEmailDeliveryConfigured({ RESEND_API_KEY: 're_x' })).toBe(true);
    expect(isEmailDeliveryConfigured({})).toBe(false);
  });
});
