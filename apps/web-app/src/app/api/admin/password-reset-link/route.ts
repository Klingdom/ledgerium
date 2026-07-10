/**
 * POST /api/admin/password-reset-link
 *
 * Admin-only endpoint that mints a working password-reset link for a given
 * user and returns it directly to the caller — bypassing the transactional
 * email pipeline entirely. This is the operational fallback for the
 * password-reset-email-reliability defect (2026-07-09): `sendEmail()` only
 * actually delivers via Resend when `RESEND_API_KEY` is configured, and the
 * forgot-password route previously ignored delivery failures. An admin can
 * use this endpoint to hand a real, valid reset link to a user directly
 * (support ticket, Slack, etc.) without depending on outbound email at all.
 *
 * Auth:
 *   Returns 404 (not 401/403) for unauthenticated or non-admin callers,
 *   mirroring the cloaking behavior of /api/admin/operations and
 *   /api/admin/users/[id] — this hides the existence of the admin surface
 *   from non-admin users.
 *
 * Request body: { email: string }
 *
 * Response shape: PasswordResetLinkApiResponse
 *   { data: { resetUrl, expiresAt } | null, error: {...} | null, meta: {...} }
 *
 * Token scheme (identical to /api/auth/forgot-password):
 *   - 32-byte random raw token; only the SHA-256 hash is ever persisted.
 *   - Prior unused tokens for the email are invalidated first.
 *   - 24-hour expiry (longer than the self-serve 1-hour window since an admin
 *     link is typically relayed to the user with some delay).
 *
 * @module api/admin/password-reset-link/route
 */

import { NextRequest, NextResponse } from 'next/server';
import { randomBytes, createHash, createHmac, timingSafeEqual } from 'crypto';
import { auth } from '@/lib/auth';
import { canAccessAdmin } from '@/lib/admin-allowlist';
import { db } from '@/db';
import { normalizeEmail } from '@/lib/email-normalize';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://ledgerium.ai';
// 1 hour — matches the self-serve forgot-password window and limits the
// takeover window for a link relayed out-of-band. Re-run the workflow if it
// expires before the user clicks.
const TOKEN_TTL_MS = 60 * 60 * 1000;

/**
 * Domain-separation label for the server-to-server ops token. The token is
 * HMAC-SHA256(NEXTAUTH_SECRET, this label) — it lets a trusted automation
 * (the `mint-reset-link` GitHub Action) call this endpoint without an
 * interactive admin session, using a secret that already exists in both the
 * app env and CI. No new secret is introduced.
 *
 * Threat model: anyone who can read NEXTAUTH_SECRET (GitHub repo/deploy admins)
 * already controls production deploys, so this adds no privilege beyond the
 * existing repo-admin trust boundary. The token is never persisted; it is
 * derived inside CI and sent once over TLS. Compared with an attacker-facing
 * primitive, minting a reset link is no stronger than the unauthenticated
 * /api/auth/forgot-password flow — except the link is returned instead of
 * emailed, which is exactly why it is gated behind this secret.
 */
const OPS_TOKEN_LABEL = 'admin-password-reset-link.v1';

/** Number of past 1-minute windows still accepted (tolerates CI dispatch delay + skew). */
const OPS_TOKEN_WINDOW_TOLERANCE = 2;

/** HMAC of the label bound to a specific 1-minute time window. */
function expectedOpsToken(secret: string, windowMinute: number): string {
  return createHmac('sha256', secret).update(`${OPS_TOKEN_LABEL}:${windowMinute}`).digest('hex');
}

/**
 * Constant-time check of the `x-ops-token` header. The token is bound to the
 * current unix-minute window (plus a small tolerance for the delay between CI
 * computing it and the request arriving), so a captured token is replayable
 * only for ~3 minutes rather than indefinitely.
 */
function opsTokenAuthorized(request: NextRequest, nowMs: number): boolean {
  const provided = request.headers.get('x-ops-token');
  const secret = process.env.NEXTAUTH_SECRET;
  if (!provided || !secret) return false;
  const providedBuf = Buffer.from(provided);
  const nowMinute = Math.floor(nowMs / 60000);
  for (let back = 0; back <= OPS_TOKEN_WINDOW_TOLERANCE; back++) {
    const expectedBuf = Buffer.from(expectedOpsToken(secret, nowMinute - back));
    if (providedBuf.length === expectedBuf.length && timingSafeEqual(providedBuf, expectedBuf)) {
      return true;
    }
  }
  return false;
}

// ── Types ──────────────────────────────────────────────────────────────────────

export interface PasswordResetLinkData {
  resetUrl: string;
  expiresAt: string;
}

export interface PasswordResetLinkApiResponse {
  data: PasswordResetLinkData | null;
  error: { code: string; message: string } | null;
  meta: { generatedAt: string; durationMs: number };
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function notFoundResponse(generatedAt: string): NextResponse {
  const body: PasswordResetLinkApiResponse = {
    data: null,
    error: { code: 'not_found', message: 'Not Found' },
    meta: { generatedAt, durationMs: 0 },
  };
  return NextResponse.json(body, { status: 404 });
}

function errorResponse(
  code: string,
  message: string,
  status: number,
  generatedAt: string,
  durationMs: number,
): NextResponse {
  const body: PasswordResetLinkApiResponse = {
    data: null,
    error: { code, message },
    meta: { generatedAt, durationMs },
  };
  return NextResponse.json(body, { status });
}

// ── Route handler ──────────────────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Single upstream clock boundary.
  const referenceNowMs = Date.now();
  const generatedAt = new Date(referenceNowMs).toISOString();

  // Auth gate: an interactive admin session OR the server-to-server ops token
  // (used by the mint-reset-link GitHub Action). 404 hides the admin surface
  // from non-admin callers, matching /api/admin/operations and
  // /api/admin/users/[id].
  const session = await auth();
  if (!canAccessAdmin(session) && !opsTokenAuthorized(request, referenceNowMs)) {
    return notFoundResponse(generatedAt);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse('bad_request', 'Invalid JSON body', 400, generatedAt, Date.now() - referenceNowMs);
  }

  const rawEmail = (body as { email?: unknown } | null)?.email;
  if (!rawEmail || typeof rawEmail !== 'string') {
    return errorResponse('bad_request', 'email is required', 400, generatedAt, Date.now() - referenceNowMs);
  }

  const email = normalizeEmail(rawEmail);

  try {
    const user = await db.user.findUnique({ where: { email } });
    if (!user) {
      // Same 404 shape as the auth-failure path — do not leak account
      // existence via a differently-shaped response.
      return notFoundResponse(generatedAt);
    }

    // Invalidate any existing unused tokens for this email — same behavior
    // as the self-serve forgot-password flow.
    await db.passwordResetToken.updateMany({
      where: { email: user.email, usedAt: null },
      data: { usedAt: new Date(referenceNowMs) },
    });

    // Generate token — store only the SHA-256 hash, never the raw token.
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(referenceNowMs + TOKEN_TTL_MS);

    await db.passwordResetToken.create({
      data: {
        email: user.email,
        tokenHash,
        expiresAt,
      },
    });

    const resetUrl = `${SITE_URL}/reset-password?token=${rawToken}&email=${encodeURIComponent(user.email)}`;

    const durationMs = Date.now() - referenceNowMs;
    const responseBody: PasswordResetLinkApiResponse = {
      data: { resetUrl, expiresAt: expiresAt.toISOString() },
      error: null,
      meta: { generatedAt, durationMs },
    };
    return NextResponse.json(responseBody, { status: 200 });
  } catch (err) {
    console.error('[admin/password-reset-link POST]', err);
    return errorResponse(
      'internal_error',
      'Failed to generate password reset link',
      500,
      generatedAt,
      Date.now() - referenceNowMs,
    );
  }
}
