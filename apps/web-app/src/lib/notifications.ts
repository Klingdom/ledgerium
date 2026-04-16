/**
 * Push notification utility for admin alerts.
 * Supports Slack webhook and email (via existing sendEmail utility).
 * Falls back to console.log when no channels are configured.
 */

import { sendEmail } from '@/lib/email';

interface Alert {
  title: string;
  severity: 'P1' | 'P2' | 'P3';
  message: string;
  value?: string | number | undefined;
}

const SEVERITY_EMOJI: Record<string, string> = {
  P1: '🔴',
  P2: '🟡',
  P3: '🔵',
};

/**
 * Send alert to all configured channels.
 * Uses Promise.allSettled so a failure in one channel does not block others.
 */
export async function sendAlertNotification(alert: Alert): Promise<void> {
  const channels: Promise<void>[] = [];

  // Slack
  const slackWebhook = process.env.SLACK_ALERTS_WEBHOOK_URL;
  if (slackWebhook) {
    channels.push(sendSlackAlert(slackWebhook, alert));
  }

  // Email
  const alertEmail = process.env.ALERT_EMAIL_TO;
  if (alertEmail) {
    channels.push(sendEmailAlert(alertEmail, alert));
  }

  if (channels.length === 0) {
    console.log(
      `[alert] ${SEVERITY_EMOJI[alert.severity]} ${alert.severity}: ${alert.title} — ${alert.message}`,
    );
    return;
  }

  await Promise.allSettled(channels);
}

async function sendSlackAlert(webhookUrl: string, alert: Alert): Promise<void> {
  try {
    const emoji = SEVERITY_EMOJI[alert.severity] ?? '⚪';
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `${emoji} *${alert.severity}: ${alert.title}*\n${alert.message}${alert.value != null ? `\nValue: \`${alert.value}\`` : ''}`,
      }),
    });
  } catch (err) {
    console.error('[alert] Slack notification failed:', err);
  }
}

async function sendEmailAlert(to: string, alert: Alert): Promise<void> {
  try {
    await sendEmail({
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
  } catch (err) {
    console.error('[alert] Email notification failed:', err);
  }
}
