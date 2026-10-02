/**
 * email.ts — provider selection unit tests (pure, node env).
 * Password-reset-email reliability, Option A (Hostinger SMTP).
 */

import { describe, it, expect, vi, afterEach } from 'vitest';

const sendMail = vi.fn();
const close = vi.fn();
const createTransport = vi.fn((_opts: unknown) => ({ sendMail, verify: vi.fn(), close }));
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
    expect(result).toEqual({ success: false, timedOut: true });
    err.mockRestore();
  });

  it('a prompt success is not delayed or failed by the deadline timer', async () => {
    process.env.SMTP_PASSWORD = 'pw';
    sendMail.mockResolvedValue({});
    expect(await sendEmail({ to: 'a@b.c', subject: 's', html: 'h' })).toEqual({ success: true });
  });
});

describe('email send cannot leak or outlive its result (row #285)', () => {
  const savedEnv = { ...process.env };
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    sendMail.mockReset();
    close.mockClear();
    __resetEmailTransport();
    process.env = { ...savedEnv };
  });
  const RESET = 'https://ledgerium.ai/reset-password?token=SECRETTOKEN123&email=a%40b.c';
  const html = '<a href="' + RESET + '">Reset</a>';

  function captureLogs(): () => string {
    const spies = [vi.spyOn(console, 'log'), vi.spyOn(console, 'warn'), vi.spyOn(console, 'error'), vi.spyOn(console, 'info')];
    spies.forEach((s) => s.mockImplementation(() => {}));
    return () => spies.flatMap((s) => s.mock.calls.flat()).map(String).join('\n');
  }

  it.each(['production', 'test', undefined])('console fallback with NODE_ENV=%s logs no body, URL or token', async (env) => {
    delete process.env.SMTP_PASSWORD;
    delete process.env.RESEND_API_KEY;
    if (env === undefined) delete (process.env as Record<string, string | undefined>).NODE_ENV;
    else (process.env as Record<string, string | undefined>).NODE_ENV = env;
    const logs = captureLogs();
    expect(await sendEmail({ to: 'victim@example.org', subject: 'Reset your Ledgerium password', html })).toEqual({ success: true });
    const out = logs();
    expect(out).toContain('send skipped');
    expect(out).toContain('example.org');
    expect(out).not.toContain('victim');
    expect(out).not.toContain('SECRETTOKEN123');
    expect(out).not.toContain('http');
    expect(out).not.toContain('href');
  });

  it('console fallback in development still prints the body (local flow testing)', async () => {
    delete process.env.SMTP_PASSWORD;
    delete process.env.RESEND_API_KEY;
    (process.env as Record<string, string | undefined>).NODE_ENV = 'development';
    const logs = captureLogs();
    await sendEmail({ to: 'a@b.c', subject: 's', html });
    expect(logs()).toContain('SECRETTOKEN123');
  });

  it('Resend fetch is aborted at the shared deadline and reported timedOut', async () => {
    process.env.RESEND_API_KEY = 're_x';
    delete process.env.SMTP_PASSWORD;
    vi.useFakeTimers();
    let signal: AbortSignal | undefined;
    vi.stubGlobal('fetch', (_u: string, init: RequestInit) => {
      signal = init.signal as AbortSignal;
      return new Promise((_, reject) => {
        signal!.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })));
      });
    });
    captureLogs();
    let result: unknown;
    const p = sendEmail({ to: 'a@b.c', subject: 's', html: 'h' }).then((r) => (result = r));
    await vi.advanceTimersByTimeAsync(SMTP_SEND_DEADLINE_MS - 1);
    expect(signal?.aborted).toBe(false);
    expect(result).toBeUndefined();
    await vi.advanceTimersByTimeAsync(2);
    await p;
    expect(signal?.aborted).toBe(true);
    expect(result).toEqual({ success: false, timedOut: true });
  });

  it('SMTP deadline closes the transporter, drops it from the cache, and reports timedOut', async () => {
    process.env.SMTP_PASSWORD = 'pw';
    vi.useFakeTimers();
    sendMail.mockReturnValue(new Promise(() => {}));
    captureLogs();
    let result: unknown;
    const p = sendEmail({ to: 'a@b.c', subject: 's', html: 'h' }).then((r) => (result = r));
    await vi.advanceTimersByTimeAsync(SMTP_SEND_DEADLINE_MS - 1);
    expect(close).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(2);
    await p;
    expect(close).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ success: false, timedOut: true });
    // next send gets a fresh transporter, not the timed-out one
    createTransport.mockClear();
    sendMail.mockResolvedValue({});
    await sendEmail({ to: 'a@b.c', subject: 's', html: 'h' });
    expect(createTransport).toHaveBeenCalledTimes(1);
  });

  it('a non-timeout SMTP failure is not marked timedOut and does not close the transporter', async () => {
    process.env.SMTP_PASSWORD = 'pw';
    sendMail.mockRejectedValue(new Error('boom'));
    captureLogs();
    expect(await sendEmail({ to: 'a@b.c', subject: 's', html: 'h' })).toEqual({ success: false });
    expect(close).not.toHaveBeenCalled();
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
