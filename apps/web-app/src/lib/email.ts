/**
 * Lightweight email utility.
 * Uses Resend when RESEND_API_KEY is set, otherwise logs to console.
 * This ensures the flow works in development without email config.
 */

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailParams): Promise<{ success: boolean }> {
  const resendKey = process.env.RESEND_API_KEY;

  if (resendKey) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${resendKey}`,
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM ?? 'Ledgerium AI <noreply@ledgerium.ai>',
          to,
          subject,
          html,
        }),
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

  // Fallback: log to console in development
  console.log('\n══════════════════════════════════════');
  console.log('[email] TO:', to);
  console.log('[email] SUBJECT:', subject);
  console.log('[email] BODY:', html);
  console.log('══════════════════════════════════════\n');
  return { success: true };
}
