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

import nodemailer, { type Transporter } from 'nodemailer';

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

export interface EmailDiagnostic {
  provider: EmailProvider;
  attempted: boolean;
  success: boolean;
  error: string | null;
  config: { host?: string; port?: number; secure?: boolean; user?: string; from: string };
}

/**
 * Attempt a real test send and RETURN the outcome (including the underlying
 * error message on failure) so delivery problems can be diagnosed without
 * server log access. Never throws.
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
      return { provider, attempted: true, success: true, error: null, config };
    } catch (err) {
      return { provider, attempted: true, success: false, error: (err as Error).message, config };
    }
  }

  if (provider === 'resend') {
    const result = await sendViaResend({ to, subject, html });
    return {
      provider,
      attempted: true,
      success: result.success,
      error: result.success ? null : 'Resend send failed (see server logs)',
      config: { from },
    };
  }

  return { provider, attempted: false, success: false, error: 'No email provider configured', config: { from } };
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
