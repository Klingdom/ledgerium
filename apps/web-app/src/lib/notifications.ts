/**
 * Push notification utility for admin alerts.
 * Supports Slack webhook and email (via existing sendEmail utility).
 * With no channel configured the alert is only logged, and the outcome says so
 * (see AlertDeliveryResult) - callers must not treat that as delivered.
 */

import { isEmailDeliveryConfigured, sendEmail } from '@/lib/email';

interface Alert {
  title: string;
  severity: 'P1' | 'P2' | 'P3';
  message: string;
  value?: string | number | undefined;
}

/**
 * Outcome of delivering ONE alert (row #263). Counts only - no addresses, URLs
 * or messages - so it is safe to log and to derive a public status from.
 *
 *  - configured: channels this alert was attempted on. 0 = nowhere to send it.
 *  - delivered:  channels that confirmed acceptance (Slack 2xx; email provider
 *                reported success). A channel that is configured but cannot
 *                actually deliver counts as configured + failed, never delivered.
 *  - failed:     configured - delivered.
 *
 * `delivered === 0` means the alert reached no person-facing channel.
 */
export interface AlertDeliveryResult {
  configured: number;
  delivered: number;
  failed: number;
}

const SEVERITY_EMOJI: Record<string, string> = {
  P1: '🔴',
  P2: '🟡',
  P3: '🔵',
};

/** A set-but-blank env var (e.g. SLACK_ALERTS_WEBHOOK_URL=" ") is NOT a channel. */
function nonBlank(v: string | undefined): string | null {
  return typeof v === 'string' && v.trim() !== '' ? v.trim() : null;
}

/**
 * Send alert to all configured channels and REPORT what happened.
 * Never throws: a failure in one channel does not block others, and a failure
 * is a returned outcome, not an exception. With no channel configured the alert
 * is logged and `{ configured: 0, delivered: 0, failed: 0 }` is returned - the
 * caller decides that is a failure, because a console line is not a delivery.
 */
export async function sendAlertNotification(alert: Alert): Promise<AlertDeliveryResult> {
  const attempts: Promise<boolean>[] = [];

  // Slack
  const slackWebhook = nonBlank(process.env.SLACK_ALERTS_WEBHOOK_URL);
  if (slackWebhook) {
    attempts.push(sendSlackAlert(slackWebhook, alert));
  }

  // Email
  const alertEmail = nonBlank(process.env.ALERT_EMAIL_TO);
  if (alertEmail) {
    attempts.push(sendEmailAlert(alertEmail, alert));
  }

  if (attempts.length === 0) {
    console.log(
      `[alert] ${SEVERITY_EMOJI[alert.severity]} ${alert.severity}: ${alert.title} — ${alert.message}`,
    );
    return { configured: 0, delivered: 0, failed: 0 };
  }

  const settled = await Promise.allSettled(attempts);
  const delivered = settled.filter((r) => r.status === 'fulfilled' && r.value === true).length;
  return { configured: attempts.length, delivered, failed: attempts.length - delivered };
}

const SLACK_TIMEOUT_MS = 8000;

/** Slack incoming webhooks answer 200 "ok" on success; 4xx/5xx for a revoked or wrong URL. */
async function sendSlackAlert(webhookUrl: string, alert: Alert): Promise<boolean> {
  try {
    const emoji = SEVERITY_EMOJI[alert.severity] ?? '⚪';
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `${emoji} *${alert.severity}: ${alert.title}*\n${alert.message}${alert.value != null ? `\nValue: \`${alert.value}\`` : ''}`,
      }),
      signal: AbortSignal.timeout(SLACK_TIMEOUT_MS),
    });
    if (!res.ok) {
      // Status only: the response body and the URL are never logged.
      console.error(`[alert] Slack notification rejected: HTTP ${res.status}`);
      return false;
    }
    return true;
  } catch (err) {
    // Error NAME only: a fetch error message can embed the webhook URL.
    console.error('[alert] Slack notification failed:', err instanceof Error ? err.name : 'unknown error');
    return false;
  }
}

async function sendEmailAlert(to: string, alert: Alert): Promise<boolean> {
  // sendEmail() with no provider configured logs to the console and reports
  // success - right for a dev signup flow, a lie for an alert. ALERT_EMAIL_TO
  // without SMTP_PASSWORD / RESEND_API_KEY is a channel that cannot deliver.
  if (!isEmailDeliveryConfigured()) {
    console.error('[alert] ALERT_EMAIL_TO is set but no email provider is configured (SMTP_PASSWORD / RESEND_API_KEY)');
    return false;
  }
  try {
    const result = await sendEmail({
      to,
      subject: `[${alert.severity}] ${alert.title} — Ledgerium AI`,
      html: `
        <div style="font-family: -apple-system, sans-serif; max-width: 480px; padding: 24px 0;">
          <p style="color: #ef4444; font-weight: 600; font-size: 13px;">${alert.severity}</p>
          <h2 style="color: #f1f5f9; font-size: 18px; margin: 8px 0;">${alert.title}</h2>
          <p style="color: #94a3b8; font-size: 14px; line-height: 1.6;">${alert.message}</p>
          ${alert.value != null ? `<p style="color: #64748b; font-size: 12px;">Value: ${alert.value}</p>` : ''}
          <hr style="border: none; border-top: 1px solid #334155; margin: 20px 0;" />
          <p style="color: #475569; font-size: 11px;">Ledgerium AI Admin Alerts</p>
        </div>
      `,
    });
    return result.success === true;
  } catch (err) {
    console.error('[alert] Email notification failed:', err instanceof Error ? err.name : 'unknown error');
    return false;
  }
}

// ── Channel heartbeat (row #282) ─────────────────────────────────────────────

/**
 * The ONE message a heartbeat ever sends. Fixed text: no alert data, no
 * timestamp, no counter - so a retried job posts an identical, harmless line
 * and nothing about the system leaks into a channel that may be shared.
 */
export const HEARTBEAT_TEXT =
  'Ledgerium alert channel heartbeat — no action needed. This is a scheduled test of the alert delivery path, not an alert.';
export const HEARTBEAT_EMAIL_SUBJECT = '[TEST] Ledgerium alert channel heartbeat — no action needed';

export type HeartbeatChannelOutcome = 'delivered' | 'failed' | 'not_configured';

/** Counts and per-channel words only - never addresses, URLs or response bodies. */
export interface HeartbeatResult {
  configured: number;
  delivered: number;
  failed: number;
  channels: { slack: HeartbeatChannelOutcome; email: HeartbeatChannelOutcome };
}

async function sendSlackHeartbeat(webhookUrl: string): Promise<boolean> {
  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: `🟢 ${HEARTBEAT_TEXT}` }),
      signal: AbortSignal.timeout(SLACK_TIMEOUT_MS),
    });
    if (!res.ok) {
      console.error(`[heartbeat] Slack rejected: HTTP ${res.status}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[heartbeat] Slack failed:', err instanceof Error ? err.name : 'unknown error');
    return false;
  }
}

async function sendEmailHeartbeat(to: string): Promise<boolean> {
  if (!isEmailDeliveryConfigured()) {
    console.error('[heartbeat] ALERT_EMAIL_TO is set but no email provider is configured (SMTP_PASSWORD / RESEND_API_KEY)');
    return false;
  }
  try {
    const result = await sendEmail({
      to,
      subject: HEARTBEAT_EMAIL_SUBJECT,
      html: `<p style="font-family: -apple-system, sans-serif; font-size: 14px;">${HEARTBEAT_TEXT}</p>`,
    });
    return result.success === true;
  } catch (err) {
    console.error('[heartbeat] Email failed:', err instanceof Error ? err.name : 'unknown error');
    return false;
  }
}

/**
 * Send the heartbeat to EVERY configured alert channel, with the same contract
 * as sendAlertNotification (same env vars, same "configured but cannot deliver
 * = failed" rule, same timeouts). Never throws.
 */
export async function sendChannelHeartbeat(): Promise<HeartbeatResult> {
  const slackWebhook = nonBlank(process.env.SLACK_ALERTS_WEBHOOK_URL);
  const alertEmail = nonBlank(process.env.ALERT_EMAIL_TO);

  const [slackOk, emailOk] = await Promise.all([
    slackWebhook ? sendSlackHeartbeat(slackWebhook) : Promise.resolve(null),
    alertEmail ? sendEmailHeartbeat(alertEmail) : Promise.resolve(null),
  ]);

  const word = (ok: boolean | null): HeartbeatChannelOutcome =>
    ok === null ? 'not_configured' : ok ? 'delivered' : 'failed';
  const channels = { slack: word(slackOk), email: word(emailOk) };
  const outcomes = Object.values(channels);
  const delivered = outcomes.filter((o) => o === 'delivered').length;
  const failed = outcomes.filter((o) => o === 'failed').length;
  return { configured: delivered + failed, delivered, failed, channels };
}
