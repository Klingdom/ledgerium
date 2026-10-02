/**
 * POST /api/admin/email-test (row #267).
 *
 * The response must carry a stable code and fixed text on failure - never the
 * transport's own message, which nodemailer builds from the SMTP server's reply,
 * the socket error (IP:port) and the recipient address. The real lib/email.ts
 * runs here (only nodemailer is mocked), so this exercises the classifier and
 * the route together.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { constants as osConstants } from 'node:os';

vi.mock('@/lib/auth', () => ({ auth: vi.fn() }));
vi.mock('@/lib/admin-allowlist', () => ({ canAccessAdmin: vi.fn() }));

const verify = vi.fn();
const sendMail = vi.fn();
vi.mock('nodemailer', () => ({
  default: { createTransport: () => ({ verify, sendMail }) },
}));

import { auth } from '@/lib/auth';
import { canAccessAdmin } from '@/lib/admin-allowlist';
import { __resetEmailTransport, classifyEmailError, EMAIL_ERROR_MESSAGES } from '@/lib/email';
import { POST } from './route';

const PASSWORD = 'sup3r-secret-smtp-pw';
const BANNER = 'mx17.secret-provider.example ESMTP SECRETBANNER 203.0.113.9';

/** Shape nodemailer produces: message carries the server reply / socket text. */
function transportError(code: string, extra: Record<string, unknown> = {}): Error {
  return Object.assign(new Error(`${code}: ${BANNER} rcpt target@victim.example ${PASSWORD}`), { code, ...extra });
}

function req(body: unknown = { to: 'target@victim.example' }): NextRequest {
  return new NextRequest('http://localhost/api/admin/email-test', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

const saved = { pw: process.env.SMTP_PASSWORD, resend: process.env.RESEND_API_KEY };

beforeEach(() => {
  vi.clearAllMocks();
  __resetEmailTransport();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  (auth as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { email: 'admin@x.test' } });
  (canAccessAdmin as ReturnType<typeof vi.fn>).mockReturnValue(true);
  process.env.SMTP_PASSWORD = PASSWORD;
  delete process.env.RESEND_API_KEY;
});

afterEach(() => {
  vi.restoreAllMocks();
  if (saved.pw === undefined) delete process.env.SMTP_PASSWORD;
  else process.env.SMTP_PASSWORD = saved.pw;
  if (saved.resend !== undefined) process.env.RESEND_API_KEY = saved.resend;
});

describe('POST /api/admin/email-test', () => {
  it('404s a non-admin without running a send', async () => {
    (canAccessAdmin as ReturnType<typeof vi.fn>).mockReturnValue(false);
    const res = await POST(req());
    expect(res.status).toBe(404);
    expect(verify).not.toHaveBeenCalled();
  });

  it('200 on success with no error fields set', async () => {
    verify.mockResolvedValue(true);
    sendMail.mockResolvedValue({});
    const res = await POST(req());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toMatchObject({ success: true, error: null, errorCode: null, provider: 'smtp' });
  });

  const CASES: Array<[string, Error, string]> = [
    ['auth failure (EAUTH)', transportError('EAUTH', { responseCode: 535 }), 'auth_failed'],
    ['auth failure by response code alone', transportError('EPROTOCOL', { responseCode: 535 }), 'auth_failed'],
    [
      'connection refused (nodemailer overwrites code with ECONNECTION; errno survives)',
      transportError('ECONNECTION', { errno: -osConstants.errno.ECONNREFUSED }),
      'connection_refused',
    ],
    ['connection failure without refusal', transportError('ECONNECTION', { errno: -9999 }), 'connection_failed'],
    ['connection timeout (ETIMEDOUT)', transportError('ETIMEDOUT'), 'timeout'],
    ['DNS failure (EDNS)', transportError('EDNS'), 'dns_failure'],
    ['TLS failure (ETLS)', transportError('ETLS'), 'tls_failure'],
    ['recipient rejected (EENVELOPE)', transportError('EENVELOPE'), 'recipient_rejected'],
    ['an error with no recognisable code', new Error(`weird ${BANNER} ${PASSWORD}`), 'unknown'],
  ];

  it.each(CASES)('%s -> 502 with code, fixed text, and none of the error text', async (_name, err, code) => {
    verify.mockRejectedValue(err);
    const res = await POST(req());
    expect(res.status).toBe(502);
    const raw = await res.text();
    const body = JSON.parse(raw);
    expect(body.data.success).toBe(false);
    expect(body.data.errorCode).toBe(code);
    expect(body.data.error).toBe(EMAIL_ERROR_MESSAGES[code as keyof typeof EMAIL_ERROR_MESSAGES]);
    // The leak this row removes: server banner, resolved IP, recipient echoed in the
    // transport text, and the SMTP password.
    for (const secret of [BANNER, 'SECRETBANNER', '203.0.113.9', PASSWORD, err.message]) {
      expect(raw, `response must not contain ${secret}`).not.toContain(secret);
    }
    // The detail is not discarded: it goes to the server log.
    expect(console.error).toHaveBeenCalled();
  });

  it('a failure on sendMail (after a good verify) is classified the same way', async () => {
    verify.mockResolvedValue(true);
    sendMail.mockRejectedValue(transportError('ETIMEDOUT'));
    const res = await POST(req());
    expect(res.status).toBe(502);
    expect((await res.json()).data.errorCode).toBe('timeout');
  });

  it('no provider configured -> fixed text and code, no transport involved', async () => {
    delete process.env.SMTP_PASSWORD;
    const res = await POST(req());
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.data).toMatchObject({
      attempted: false,
      errorCode: 'no_provider_configured',
      error: EMAIL_ERROR_MESSAGES.no_provider_configured,
    });
    expect(verify).not.toHaveBeenCalled();
  });

  it('never echoes the SMTP password in config', async () => {
    verify.mockRejectedValue(transportError('EAUTH'));
    const raw = await (await POST(req())).text();
    expect(raw).not.toContain(PASSWORD);
  });
});

describe('classifyEmailError', () => {
  it('reads structured fields only: the message is never consulted', () => {
    // Message screams "timeout" and "auth"; the fields say otherwise.
    const e = Object.assign(new Error('ETIMEDOUT EAUTH 535 connection refused'), { code: 'EDNS' });
    expect(classifyEmailError(e)).toBe('dns_failure');
    expect(classifyEmailError(new Error('ETIMEDOUT'))).toBe('unknown');
  });

  it('handles non-objects', () => {
    for (const v of [null, undefined, 'ETIMEDOUT', 42]) expect(classifyEmailError(v)).toBe('unknown');
  });
});
