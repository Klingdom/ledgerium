/**
 * Transactional email utility.
 *
 * Provider selection (first configured wins):
 *   1. SMTP    — when SMTP_PASSWORD is set (host/user default to Hostinger:
 *                smtp.hostinger.com / hello@ledgerium.ai). Chosen for Ledgerium
 *                since the ledgerium.ai domain mailbox already exists — no
 *                third-party signup or DNS domain-verification required.
 *   2. Resend  — when RESEND_API_KEY is set (dedicated provider, optional upgrade).
 *   3. Console — dev fallback: logs the message so flows work without email config.
 *
 * Every send returns { success } and NEVER throws — callers surface failures
 * (e.g. forgot-password logs delivery failures) but must not break the request.
 */

import { constants as osConstants } from 'node:os';
import nodemailer,{ type Transporter } from 'nodemailer';

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

export type EmailProvider = 'smtp' | 'resend' | 'console';

const HOSTINGER_SMTP_HOST = 'smtp.hostinger.com';
const DEFAULT_SMTP_USER = 'hello@ledgerium.ai';
const DEFAULT_EMAIL_FROM = 'Ledgerium AI <hello@ledgerium.ai>';

function isSet(v: string | undefined): boolean {
  return typeof v === 'string' && v.trim() !== '';
}

/**
 * Pure provider selection from env — deterministic and unit-testable.
 * SMTP takes precedence over Resend so setting SMTP_PASSWORD activates delivery.
 */
export function selectEmailProvider(env: Record<string, string | undefined> = process.env): EmailProvider {
  if (isSet(env.SMTP_PASSWORD)) return 'smtp';
  if (isSet(env.RESEND_API_KEY)) return 'resend';
  return 'console';
}

/** Whether transactional email delivery is configured (SMTP or Resend). */
export function isEmailDeliveryConfigured(env: Record<string, string | undefined> = process.env): boolean {
  return selectEmailProvider(env) !== 'console';
}

function fromAddress(): string {
  return process.env.EMAIL_FROM ?? DEFAULT_EMAIL_FROM;
}

// ── SMTP (nodemailer) ───────────────────────────────────────────────────────

/**
 * SMTP time bounds (row #266). nodemailer's defaults are 2 min connection,
 * 30 s greeting, 10 min socket - a hung mail server would outlast the hourly
 * job's HTTP max-time (30 s) and surface as "unreachable" (exit 3) instead of an
 * undelivered alert. Bounds are sized under that 30 s budget, alongside Slack's
 * 8 s:
 *  - connection 8 s: TCP + TLS handshake; generous for a healthy host, same as Slack.
 *  - greeting   8 s: server banner after connect.
 *  - socket    10 s: inactivity per command (AUTH, MAIL, RCPT, DATA ...).
 *  - overall   20 s: hard deadline on the whole send. The three above are
 *    per-phase, so a slow-but-alive server could still stack them past 30 s.
 * A timeout is an ordinary failed send ({ success: false }) and never throws.
 */
export const SMTP_CONNECTION_TIMEOUT_MS = 8_000;
export const SMTP_GREETING_TIMEOUT_MS = 8_000;
export const SMTP_SOCKET_TIMEOUT_MS = 10_000;
export const SMTP_SEND_DEADLINE_MS = 20_000;

let cachedTransporter: Transporter | null = null;

function getSmtpTransporter(): Transporter {
  if (cachedTransporter) return cachedTransporter;
  const host = process.env.SMTP_HOST ?? HOSTINGER_SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? '465');
  // Implicit TLS on 465; STARTTLS on 587. Overridable via SMTP_SECURE.
  const secure = (process.env.SMTP_SECURE ?? (port === 465 ? 'true' : 'false')) === 'true';
  const user = process.env.SMTP_USER ?? DEFAULT_SMTP_USER;
  const pass = process.env.SMTP_PASSWORD ?? '';
  cachedTransporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    connectionTimeout: SMTP_CONNECTION_TIMEOUT_MS,
    greetingTimeout: SMTP_GREETING_TIMEOUT_MS,
    socketTimeout: SMTP_SOCKET_TIMEOUT_MS,
  });
  return cachedTransporter;
}

/** Reset the cached transporter (used in tests / after config changes). */
export function __resetEmailTransport(): void {
  cachedTransporter = null;
}

async function sendViaSmtp({ to, subject, html }: SendEmailParams): Promise<{ success: boolean }> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const deadline = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => reject(new Error(`SMTP send exceeded ${SMTP_SEND_DEADLINE_MS}ms deadline`)),
        SMTP_SEND_DEADLINE_MS,
      );
    });
    await Promise.race([
      getSmtpTransporter().sendMail({ from: fromAddress(), to, subject, html }),
      deadline,
    ]);
    return { success: true };
  } catch (err) {
    console.error('[email] SMTP send failed:', err);
    return { success: false };
  } finally {
    clearTimeout(timer);
  }
}

// ── Resend ──────────────────────────────────────────────────────────────────

async function sendViaResend({ to, subject, html }: SendEmailParams): Promise<{ success: boolean }> {
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({ from: fromAddress(), to, subject, html }),
    });
    if (!res.ok) {
      console.error('[email] Resend error:', await res.text());
      return { success: false };
    }
    return { success: true };
  } catch (err) {
    console.error('[email] Resend send failed:', err);
    return { success: false };
  }
}

// ── Diagnostic (admin) ──────────────────────────────────────────────────────

/**
 * Stable, text-free diagnostic outcomes (row #267).
 *
 * The diagnostic used to return the transport error's `.message`. Producer of
 * that text: nodemailer builds it from the SMTP server's own reply
 * (`err.message += ': ' + response` in smtp-connection `_formatError`), the
 * socket error (`connect ECONNREFUSED <ip>:<port>`), and, for envelope
 * errors, the recipient address (`Invalid recipient "<to>"`). So it carries
 * server banners, resolved IPs and caller-supplied addresses: none of it is
 * ours to put in a response body. A code derived from `err.code` /
 * `err.responseCode` / `err.errno` is a closed set we chose; the detail goes to
 * the server log, where the operator who can read this response can also read
 * logs.
 */
export type EmailErrorCode =
  | 'auth_failed'
  | 'connection_refused'
  | 'connection_failed'
  | 'dns_failure'
  | 'timeout'
  | 'tls_failure'
  | 'recipient_rejected'
  | 'protocol_error'
  | 'provider_send_failed'
  | 'no_provider_configured'
  | 'unknown';

/** Fixed operator-facing text per code. Never interpolates anything. */
export const EMAIL_ERROR_MESSAGES: Record<EmailErrorCode, string> = {
  auth_failed: 'SMTP authentication failed - check SMTP_USER / SMTP_PASSWORD',
  connection_refused: 'SMTP connection refused - check SMTP_HOST / SMTP_PORT',
  connection_failed: 'SMTP connection failed (see server logs)',
  dns_failure: 'SMTP host name did not resolve - check SMTP_HOST',
  timeout: 'SMTP connection or send timed out',
  tls_failure: 'SMTP TLS negotiation failed - check SMTP_PORT / SMTP_SECURE',
  recipient_rejected: 'SMTP server rejected the sender or recipient (see server logs)',
  protocol_error: 'Unexpected SMTP server response (see server logs)',
  provider_send_failed: 'Provider send failed (see server logs)',
  no_provider_configured: 'No email provider configured',
  unknown: 'Email send failed (see server logs)',
};

/**
 * Map a thrown transport error to a code using ONLY its structured fields
 * (`code`, `responseCode`, `errno`). Reads no text: nodemailer overwrites
 * `err.code` with its own ECONNECTION/ESOCKET, leaving the OS errno intact, so
 * "refused" is recognised by errno, not by matching the message.
 */
export function classifyEmailError(err: unknown): EmailErrorCode {
  if (typeof err !== 'object' || err === null) return 'unknown';
  const f = err as { code?: unknown; responseCode?: unknown; errno?: unknown };
  const code = typeof f.code === 'string' ? f.code : '';
  const responseCode = typeof f.responseCode === 'number' ? f.responseCode : 0;

  if (code === 'EAUTH' || responseCode === 535 || responseCode === 534 || responseCode === 530) return 'auth_failed';
  if (code === 'ETIMEDOUT' || code === 'ESOCKETTIMEDOUT') return 'timeout';
  if (code === 'EDNS' || code === 'ENOTFOUND' || code === 'EAI_AGAIN') return 'dns_failure';
  if (code === 'ETLS') return 'tls_failure';
  if (code === 'EENVELOPE') return 'recipient_rejected';
  if (code === 'EPROTOCOL') return 'protocol_error';
  if (code === 'ECONNREFUSED') return 'connection_refused';
  if (code === 'ECONNECTION' || code === 'ESOCKET') {
    const refused = osConstants.errno.ECONNREFUSED;
    return typeof f.errno === 'number' && Math.abs(f.errno) === refused ? 'connection_refused' : 'connection_failed';
  }
  return 'unknown';
}

export interface EmailDiagnostic {
  provider: EmailProvider;
  attempted: boolean;
  success: boolean;
  /** Fixed text from EMAIL_ERROR_MESSAGES - never the transport's own message. */
  error: string | null;
  errorCode: EmailErrorCode | null;
  config: { host?: string; port?: number; secure?: boolean; user?: string; from: string };
}

function failure(
  provider: EmailProvider,
  attempted: boolean,
  code: EmailErrorCode,
  config: EmailDiagnostic['config'],
): EmailDiagnostic {
  return { provider, attempted, success: false, error: EMAIL_ERROR_MESSAGES[code], errorCode: code, config };
}

/**
 * Attempt a real test send and RETURN the outcome so delivery problems can be
 * diagnosed without server log access. On failure the outcome is a stable
 * code + fixed text (see EmailErrorCode); the transport's detail is logged.
 * Never throws.
 */
export async function runEmailDiagnostic(to: string): Promise<EmailDiagnostic> {
  const provider = selectEmailProvider();
  const from = fromAddress();
  const subject = 'Ledgerium email delivery test';
  const html = '<p>SMTP delivery test — if you received this, transactional email is working.</p>';

  if (provider === 'smtp') {
    const host = process.env.SMTP_HOST ?? HOSTINGER_SMTP_HOST;
    const port = Number(process.env.SMTP_PORT ?? '465');
    const secure = (process.env.SMTP_SECURE ?? (port === 465 ? 'true' : 'false')) === 'true';
    const user = process.env.SMTP_USER ?? DEFAULT_SMTP_USER;
    const config = { host, port, secure, user, from };
    try {
      const transporter = getSmtpTransporter();
      await transporter.verify();
      await transporter.sendMail({ from, to, subject, html });
      return { provider, attempted: true, success: true, error: null, errorCode: null, config };
    } catch (err) {
      console.error('[email] SMTP diagnostic failed:', err);
      return failure(provider, true, classifyEmailError(err), config);
    }
  }

  if (provider === 'resend') {
    const result = await sendViaResend({ to, subject, html });
    if (result.success) return { provider, attempted: true, success: true, error: null, errorCode: null, config: { from } };
    return failure(provider, true, 'provider_send_failed', { from });
  }

  return failure(provider, false, 'no_provider_configured', { from });
}

// ── Public API ──────────────────────────────────────────────────────────────

export async function sendEmail(params: SendEmailParams): Promise<{ success: boolean }> {
  const provider = selectEmailProvider();

  if (provider === 'smtp') return sendViaSmtp(params);
  if (provider === 'resend') return sendViaResend(params);

  // Console fallback (no provider configured).
  console.log('\n══════════════════════════════════════');
  console.log('[email] (no provider configured — logging only)');
  console.log('[email] TO:', params.to);
  console.log('[email] SUBJECT:', params.subject);
  console.log('[email] BODY:', params.html);
  console.log('══════════════════════════════════════\n');
  return { success: true };
}
