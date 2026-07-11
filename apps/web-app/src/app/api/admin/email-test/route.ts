/**
 * POST /api/admin/email-test
 *
 * Admin/ops-only diagnostic: attempts a real transactional-email send and
 * returns the outcome, INCLUDING the underlying error on failure, so email
 * delivery can be debugged without server log access.
 *
 * Auth: interactive admin session OR the time-windowed HMAC ops token
 * (x-ops-token), mirroring /api/admin/password-reset-link. 404-cloaked.
 *
 * Body: { to?: string }  (defaults to the configured SMTP user / from mailbox)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { auth } from '@/lib/auth';
import { canAccessAdmin } from '@/lib/admin-allowlist';
import { runEmailDiagnostic } from '@/lib/email';

const OPS_TOKEN_LABEL = 'admin-email-test.v1';
const OPS_TOKEN_WINDOW_TOLERANCE = 2;

function expectedOpsToken(secret: string, windowMinute: number): string {
  return createHmac('sha256', secret).update(`${OPS_TOKEN_LABEL}:${windowMinute}`).digest('hex');
}

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

function notFound(): NextResponse {
  return NextResponse.json({ data: null, error: { code: 'not_found', message: 'Not Found' } }, { status: 404 });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const nowMs = Date.now();

  const session = await auth();
  if (!canAccessAdmin(session) && !opsTokenAuthorized(request, nowMs)) {
    return notFound();
  }

  let to = 'hello@ledgerium.ai';
  try {
    const body = (await request.json()) as { to?: unknown };
    if (body && typeof body.to === 'string' && body.to.trim() !== '') to = body.to.trim();
  } catch {
    // no body → use default recipient
  }

  const diagnostic = await runEmailDiagnostic(to);
  return NextResponse.json(
    { data: { to, ...diagnostic }, error: null },
    { status: diagnostic.success ? 200 : 502 },
  );
}
