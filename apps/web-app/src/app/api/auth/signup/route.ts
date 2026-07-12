import { NextRequest, NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { db } from '@/db';
import { z } from 'zod';
import { trackServer } from '@/lib/analytics-server';
import { ensureSampleWorkflow, ensureAdditionalSampleWorkflows } from '@/lib/sample-workflow';
import { ensureSampleVariants } from '@/lib/sample-variants';
import { normalizeEmail } from '@/lib/email-normalize';
import { checkAuthRateLimit, AUTH_RATE_LIMITS } from '@/lib/rate-limit/auth-buckets';

const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required').optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = signupSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? 'Invalid input' },
        { status: 400 },
      );
    }

    const { password, name } = parsed.data;
    // Root-cause fix: normalize email before both the duplicate-check lookup
    // and the create — storing raw casing let mixed-case signups become
    // unfindable by the (already-normalized) forgot-password lookup.
    const email = normalizeEmail(parsed.data.email);

    // Abuse protection: 10 requests per IP per hour, checked before creating
    // the user (and before the duplicate-check lookup, which would otherwise
    // remain an unthrottled probe surface).
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
    const rl = checkAuthRateLimit(`signup:${ip}`, Date.now(), AUTH_RATE_LIMITS.signup);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } },
      );
    }

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 },
      );
    }

    const passwordHash = await hash(password, 12);

    const user = await db.user.create({
      data: {
        email,
        name: name ?? null,
        passwordHash,
        plan: 'free',
        subscriptionStatus: 'none',
      },
    });

    // Every new account gets the built-in example workflows so the dashboard,
    // SOP, process-map, and Variants views are populated immediately. Non-fatal:
    // both helpers never throw (return null on failure).
    await ensureSampleWorkflow(user.id);
    await ensureSampleVariants(user.id);
    await ensureAdditionalSampleWorkflows(user.id);

    trackServer('signup_completed', { userId: user.id, email: user.email });

    return NextResponse.json({ id: user.id, email: user.email }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
