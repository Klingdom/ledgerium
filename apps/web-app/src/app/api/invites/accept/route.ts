import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import crypto from 'crypto';

/**
 * POST /api/invites/accept — accept a workspace invite
 *
 * Request body: { token: string }
 *
 * Two paths:
 *   AUTHENTICATED — joins the workspace atomically in a SERIALIZABLE transaction.
 *     Returns { ok: true, teamId, role }.
 *   UNAUTHENTICATED — validates token and returns workspace metadata so the
 *     client can redirect to login/signup with the token preserved.
 *     Returns { requiresAuth: true, teamId, teamName, role, email }.
 *
 * Invite validation (both paths):
 *   - Token does not match → 404
 *   - Invite revoked       → 410 Gone
 *   - Invite expired       → 410 Gone
 *   - Invite already used  → 409 Conflict
 *
 * Rate limiting (per-IP, module-level in-memory, zero external deps):
 *   - 10 requests per 60-second sliding window → 429 Too Many Requests
 *   - 5 consecutive 404s → 1-hour lockout → 429 Too Many Requests
 *
 * Race protection: authenticated join uses an SERIALIZABLE transaction to
 * prevent double-acceptance under concurrent requests.
 *
 * @iter 082 / TEAM-P02 Part C
 * @iter 084 / TEAM-P03.6 rate-limiting added
 */

// ── In-memory rate-limit store ──────────────────────────────────────────────

interface RateLimitEntry {
  /** Number of requests in the current window. */
  count: number;
  /** Timestamp (ms) when the current window started. */
  windowStart: number;
  /** Consecutive 404-not-found responses since last success or window reset. */
  failureStreak: number;
  /** If non-zero, requests are blocked until this timestamp (ms). */
  lockedUntil: number;
}

const rateLimits = new Map<string, RateLimitEntry>();

const RATE_LIMIT_WINDOW_MS = 60_000;   // 1-minute sliding window
const RATE_LIMIT_MAX = 10;             // max requests per window
const LOCKOUT_STREAK = 5;             // consecutive 404s that trigger lockout
const LOCKOUT_DURATION_MS = 60 * 60_000; // 1-hour lockout

function getIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]!.trim();
  return req.headers.get('x-real-ip') ?? 'unknown';
}

/**
 * Check rate limit for the given IP.
 * Returns true if the request should be blocked (rate-limited), false if allowed.
 */
function checkRateLimit(ip: string, now: number): boolean {
  const entry = rateLimits.get(ip);
  if (!entry) return false;

  // Hard lockout check.
  if (entry.lockedUntil > now) return true;

  // Sliding-window check.
  if (now - entry.windowStart < RATE_LIMIT_WINDOW_MS) {
    return entry.count >= RATE_LIMIT_MAX;
  }

  return false;
}

/**
 * Increment request count for the given IP, resetting the window if stale.
 */
function recordRequest(ip: string, now: number): void {
  const entry = rateLimits.get(ip);
  if (!entry || now - entry.windowStart >= RATE_LIMIT_WINDOW_MS) {
    rateLimits.set(ip, { count: 1, windowStart: now, failureStreak: entry?.failureStreak ?? 0, lockedUntil: entry?.lockedUntil ?? 0 });
    return;
  }
  entry.count += 1;
}

/**
 * Record a 404 "token not found" failure.
 * Triggers lockout when the streak reaches LOCKOUT_STREAK.
 */
function recordFailure(ip: string, now: number): void {
  const entry = rateLimits.get(ip);
  const streak = (entry?.failureStreak ?? 0) + 1;
  const lockedUntil = streak >= LOCKOUT_STREAK ? now + LOCKOUT_DURATION_MS : (entry?.lockedUntil ?? 0);
  rateLimits.set(ip, {
    count: entry?.count ?? 1,
    windowStart: entry?.windowStart ?? now,
    failureStreak: streak,
    lockedUntil,
  });
}

/**
 * Record a successful token match (resets the failure streak).
 */
function recordSuccess(ip: string): void {
  const entry = rateLimits.get(ip);
  if (entry) {
    entry.failureStreak = 0;
    entry.lockedUntil = 0;
  }
}

/** NOT exported — use vi.resetModules() + dynamic import in tests for isolation. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function _resetRateLimitsForTesting(): void {
  rateLimits.clear();
}

// ── Token hashing ────────────────────────────────────────────────────────────

/** SHA-256 hash of a raw invite token — mirrors the hash stored at creation time. */
function hashInviteToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const rawToken: string | undefined = body?.token;

  if (!rawToken || typeof rawToken !== 'string' || rawToken.trim() === '') {
    return NextResponse.json({ error: 'token is required' }, { status: 400 });
  }

  // ── Rate limiting ───────────────────────────────────────────────────────────
  const ip = getIp(req);
  const nowMs = Date.now();

  if (checkRateLimit(ip, nowMs)) {
    return NextResponse.json({ error: 'Too many requests — please wait before trying again' }, { status: 429 });
  }
  recordRequest(ip, nowMs);

  const tokenHash = hashInviteToken(rawToken.trim());

  // ── Unauthenticated path ────────────────────────────────────────────────────
  // Even without a session we validate the token so the client can show
  // workspace context on the login/signup page.
  const session = await auth();

  if (!session?.user?.id) {
    // Look up the invite by hash.
    const invite = await (db as any).teamInvite.findFirst({
      where: { token: tokenHash },
      include: { team: { select: { id: true, name: true } } },
    });

    if (!invite) {
      recordFailure(ip, nowMs);
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
    }
    if (invite.revokedAt !== null) {
      return NextResponse.json({ error: 'Invite has been revoked' }, { status: 410 });
    }
    if (new Date(invite.expiresAt) <= new Date()) {
      return NextResponse.json({ error: 'Invite has expired' }, { status: 410 });
    }
    if (invite.acceptedAt !== null) {
      return NextResponse.json({ error: 'Invite has already been accepted' }, { status: 409 });
    }

    recordSuccess(ip);
    return NextResponse.json({
      requiresAuth: true,
      teamId: invite.teamId,
      teamName: invite.team?.name ?? null,
      role: invite.role,
      email: invite.email,
    });
  }

  // ── Authenticated path ──────────────────────────────────────────────────────
  const userId = session.user.id;

  try {
    const result = await (db as any).$transaction(
      async (tx: any) => {
        // Re-read invite inside the transaction for serializable isolation.
        const invite = await tx.teamInvite.findFirst({
          where: { token: tokenHash },
          include: { team: { select: { id: true, name: true, slug: true } } },
        });

        if (!invite) {
          return { error: 'Invite not found', status: 404, isNotFound: true };
        }
        if (invite.revokedAt !== null) {
          return { error: 'Invite has been revoked', status: 410 };
        }
        if (new Date(invite.expiresAt) <= new Date(nowMs)) {
          return { error: 'Invite has expired', status: 410 };
        }
        if (invite.acceptedAt !== null) {
          return { error: 'Invite has already been accepted', status: 409 };
        }

        // Check email matches (optional but recommended — prevents token-sharing abuse).
        const invitee = await tx.user.findUnique({
          where: { id: userId },
          select: { email: true },
        });
        if (invitee && invite.email !== invitee.email.toLowerCase()) {
          return { error: 'This invite was sent to a different email address', status: 403 };
        }

        // Check if user is already a member of this team.
        const existingMembership = await tx.teamMember.findUnique({
          where: { teamId_userId: { teamId: invite.teamId, userId } },
        });
        if (existingMembership) {
          return { error: 'You are already a member of this workspace', status: 409 };
        }

        // Mark invite accepted.
        await tx.teamInvite.update({
          where: { id: invite.id },
          data: {
            acceptedAt: new Date(nowMs),
            acceptedBy: userId,
          },
        });

        // Create the team membership.
        await tx.teamMember.create({
          data: {
            teamId: invite.teamId,
            userId,
            role: invite.role,
            joinedAt: new Date(nowMs),
            status: 'active',
          },
        });

        return {
          ok: true,
          teamId: invite.teamId,
          teamName: invite.team?.name ?? null,
          role: invite.role,
        };
      },
      { isolationLevel: 'Serializable' },
    );

    if ('error' in result) {
      if ((result as any).isNotFound) {
        recordFailure(ip, nowMs);
      } else if ('ok' in result) {
        recordSuccess(ip);
      }
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    recordSuccess(ip);
    return NextResponse.json(result);
  } catch (err) {
    console.error('[invites/accept/POST]', err);
    return NextResponse.json({ error: 'Failed to accept invite' }, { status: 500 });
  }
}
