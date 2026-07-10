import { NextRequest, NextResponse } from 'next/server';
import { randomBytes, createHash } from 'crypto';
import { db } from '@/db';
import { sendEmail } from '@/lib/email';
import { normalizeEmail } from '@/lib/email-normalize';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export async function POST(req: NextRequest) {
  const { email } = await req.json().catch(() => ({ email: '' }));

  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }

  // Always return success to prevent email enumeration
  const successResponse = NextResponse.json({
    message: 'If an account exists with this email, a reset link has been sent.',
  });

  const user = await db.user.findUnique({ where: { email: normalizeEmail(email) } });
  if (!user) return successResponse;

  // Invalidate any existing unused tokens for this email
  await db.passwordResetToken.updateMany({
    where: { email: user.email, usedAt: null },
    data: { usedAt: new Date() },
  });

  // Generate token — store only the SHA-256 hash, never the raw token
  const rawToken = randomBytes(32).toString('hex');
  const tokenHash = createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await db.passwordResetToken.create({
    data: {
      email: user.email,
      tokenHash,
      expiresAt,
    },
  });

  const resetUrl = `${SITE_URL}/reset-password?token=${rawToken}&email=${encodeURIComponent(user.email)}`;

  const result = await sendEmail({
    to: user.email,
    subject: 'Reset your Ledgerium password',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 0;">
        <h2 style="color: #f1f5f9; font-size: 20px;">Reset your password</h2>
        <p style="color: #94a3b8; font-size: 14px; line-height: 1.6;">
          You requested a password reset for your Ledgerium AI account. Click the link below to set a new password:
        </p>
        <p style="margin: 24px 0;">
          <a href="${resetUrl}" style="display: inline-block; background: #059669; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
            Reset Password
          </a>
        </p>
        <p style="color: #64748b; font-size: 12px; line-height: 1.6;">
          This link expires in 1 hour. If you didn't request this, you can safely ignore this email.
        </p>
        <hr style="border: none; border-top: 1px solid #334155; margin: 24px 0;" />
        <p style="color: #475569; font-size: 11px;">Ledgerium AI &middot; Evidence-based workflow intelligence</p>
      </div>
    `,
  });

  // Delivery failures were previously invisible — the route always returned
  // the enumeration-safe success response regardless of whether the email
  // actually sent. Surface the failure server-side (never client-side, to
  // preserve the enumeration-safe contract) so an operator can notice and use
  // the admin password-reset-link endpoint as a fallback delivery path.
  // Never log the raw token/resetUrl here — only the account identifier.
  if (!result.success) {
    console.error('[forgot-password] email delivery failed for', user.email);
  }

  return successResponse;
}
