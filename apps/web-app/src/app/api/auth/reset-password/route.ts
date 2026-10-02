import { withApiRoute } from '@/lib/with-api-route';
import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { hash } from 'bcryptjs';
import { db } from '@/db';
import { normalizeEmail } from '@/lib/email-normalize';
import { z } from 'zod';

/**
 * Row #261. Producer: reset-password/page.tsx sends `{ token, email, password }`,
 * all strings. The body must be an OBJECT — destructuring the valid JSON `null`
 * threw, a 500. Field presence and type keep their existing, distinct 400
 * messages below, so this schema only fixes the shape of the container.
 */
const resetPasswordSchema = z.object({
  token: z.unknown(),
  email: z.unknown(),
  password: z.unknown(),
});

async function handlePOST(req: NextRequest) {
  const parsedBody = resetPasswordSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsedBody.success) {
    return NextResponse.json(
      { error: 'Token, email, and password are required' },
      { status: 400 },
    );
  }
  const { token, email, password } = parsedBody.data;

  if (!token || !email || !password) {
    return NextResponse.json(
      { error: 'Token, email, and password are required' },
      { status: 400 },
    );
  }

  if (typeof password !== 'string' || password.length < 8) {
    return NextResponse.json(
      { error: 'Password must be at least 8 characters' },
      { status: 400 },
    );
  }

  if (typeof token !== 'string' || typeof email !== 'string') {
    return NextResponse.json(
      { error: 'Invalid request parameters' },
      { status: 400 },
    );
  }

  const tokenHash = createHash('sha256').update(token).digest('hex');

  const resetToken = await db.passwordResetToken.findFirst({
    where: {
      tokenHash,
      email: normalizeEmail(email),
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
  });

  if (!resetToken) {
    return NextResponse.json(
      { error: 'Invalid or expired reset link. Please request a new one.' },
      { status: 400 },
    );
  }

  // Hash new password and mark token used — both in a single transaction
  const passwordHash = await hash(password, 12);

  await db.$transaction([
    db.user.update({
      where: { email: resetToken.email },
      data: { passwordHash },
    }),
    db.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: new Date() },
    }),
  ]);

  return NextResponse.json({ message: 'Password updated successfully. You can now sign in.' });
}

export const POST = withApiRoute('/api/auth/reset-password', handlePOST);
