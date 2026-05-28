import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { trackServer } from '@/lib/analytics-server';
import { checkBootstrapRateLimit } from '@/lib/rate-limit/bootstrap-buckets';

/**
 * POST /api/admin/bootstrap
 *
 * Promotes the current authenticated user to admin.
 * Only works when there are zero admins in the system (first-run bootstrap).
 * Once an admin exists, this endpoint is permanently disabled.
 *
 * Guard order (ADM-002 PR-2 Sub-task 5):
 *   1. DISABLE_ADMIN_BOOTSTRAP env var   → 404
 *   2. CSRF confirmation header           → 400
 *   3. Per-IP rate limit (3 / hour)       → 429
 *   4. Session auth                       → 401
 *   5. SERIALIZABLE transaction (check-and-promote) → 403 | 200
 *   6. Audit log emission (after success, before response)
 *
 * CSRF protection (Sub-task 2):
 *   Cross-origin browser forms cannot set arbitrary request headers, so
 *   requiring `X-Admin-Bootstrap-Confirm: true` blocks all CSRF vectors
 *   without a token round-trip.
 *
 * Race protection (Sub-task 1):
 *   The check-and-promote is wrapped in a SERIALIZABLE transaction so that
 *   two concurrent requests against an empty DB cannot both pass the
 *   existingAdmin check and both promote separate users.
 *
 * Rate-limit (Sub-task 3):
 *   3 requests per IP per hour. See bootstrap-buckets.ts.
 *
 * Demo-F1 (iter 087 / TEAM-P03.10):
 *   Set DISABLE_ADMIN_BOOTSTRAP=true to disable this endpoint entirely in
 *   production without code changes.
 *
 * @iter 087 / TEAM-P03.10 — DISABLE_ADMIN_BOOTSTRAP env guard
 * @iter 091 / ADM-002 PR-2 — CSRF + rate-limit + transactional hardening
 */
export async function POST(req: NextRequest) {
  // ── Guard 1: Demo-F1 disable flag ─────────────────────────────────────────
  if (process.env.DISABLE_ADMIN_BOOTSTRAP === 'true') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // ── Guard 2: CSRF confirmation header ─────────────────────────────────────
  // Cross-origin browser forms cannot set arbitrary headers without explicit
  // code running on the initiating origin. Requiring this header prevents CSRF.
  const csrfConfirm = req.headers.get('X-Admin-Bootstrap-Confirm');
  if (csrfConfirm !== 'true') {
    return NextResponse.json(
      { error: 'Bootstrap requires explicit confirmation header' },
      { status: 400 },
    );
  }

  // ── Guard 3: Per-IP rate limit ─────────────────────────────────────────────
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown';
  const nowMs = Date.now();
  const rl = checkBootstrapRateLimit(ip, nowMs);
  if (!rl.allowed) {
    return NextResponse.json(
      {
        error: 'Too many bootstrap attempts',
        code: 'rate_limit_exceeded',
        retryAfterSeconds: rl.retryAfterSeconds,
      },
      { status: 429 },
    );
  }

  // ── Guard 4: Session authentication ────────────────────────────────────────
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ── Guard 5: SERIALIZABLE transaction — check-and-promote ─────────────────
  // Using SERIALIZABLE isolation prevents the race condition where two
  // concurrent requests both pass findFirst (no admin yet) and both write.
  // The second concurrent transaction will see a serialization conflict and
  // abort with Prisma error code P2034.
  try {
    const result = await db.$transaction(
      async (tx) => {
        // Re-check inside transaction (sees any pending writes from sibling txns).
        const existingAdmin = await tx.user.findFirst({
          where: { isAdmin: true },
          select: { id: true },
        });
        if (existingAdmin) {
          return { kind: 'already-exists' as const };
        }

        const updated = await tx.user.update({
          where: { id: session.user!.id },
          data: { isAdmin: true },
          select: { id: true, email: true },
        });
        return { kind: 'promoted' as const, user: updated };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    if (result.kind === 'already-exists') {
      return NextResponse.json(
        { error: 'Admin already exists; bootstrap not available' },
        { status: 403 },
      );
    }

    // ── Guard 6: Audit log emission ──────────────────────────────────────────
    // PII-safe fields only: domain (not full email), partial IP, UA family.
    const emailDomain = result.user.email?.split('@')[1] ?? 'unknown';
    const ipPrefix =
      ip
        .split('.')
        .slice(0, 2)
        .join('.') + '.x.x';
    const userAgentFamily = parseUserAgentFamily(
      req.headers.get('user-agent'),
    );

    // Fire-and-forget — audit log failure must not block the 200 response.
    try {
      trackServer('admin_bootstrap_claimed', {
        userId: result.user.id,
        emailDomain,
        ipPrefix,
        userAgentFamily,
      });
    } catch {
      // Non-fatal: analytics failure must never affect promotion outcome.
    }

    return NextResponse.json({
      ok: true,
      message:
        'You are now an admin. Log out and log back in for changes to take effect.',
    });
  } catch (err) {
    // P2034 — SERIALIZABLE conflict from concurrent bootstrap attempt.
    if (
      err != null &&
      typeof err === 'object' &&
      'code' in err &&
      (err as { code: string }).code === 'P2034'
    ) {
      return NextResponse.json(
        {
          error: 'Concurrent bootstrap attempt detected — please retry',
          code: 'serialization_failure',
          retryable: true,
        },
        { status: 409 },
      );
    }

    console.error('[admin/bootstrap/POST]', err);
    return NextResponse.json(
      { error: 'Failed to promote admin' },
      { status: 500 },
    );
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Extract a coarse browser/client family from a User-Agent string.
 * Returns "unknown" rather than the raw UA to avoid storing PII-adjacent data.
 */
function parseUserAgentFamily(ua: string | null | undefined): string {
  if (!ua) return 'unknown';
  if (/curl/i.test(ua)) return 'curl';
  if (/postman/i.test(ua)) return 'Postman';
  if (/insomnia/i.test(ua)) return 'Insomnia';
  if (/chrome/i.test(ua) && !/edg|opr|brave/i.test(ua)) return 'Chrome';
  if (/safari/i.test(ua) && !/chrome|chromium/i.test(ua)) return 'Safari';
  if (/firefox/i.test(ua)) return 'Firefox';
  if (/edg/i.test(ua)) return 'Edge';
  return 'other';
}
