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

/**
 * In-memory rate-limit state keyed by client IP.
 *
 * COLD-START RISK (TEAM-P03.9 Sub-task E — CEO-acked): In serverless/edge
 * runtimes (Vercel, etc.) each new function instance starts with an empty Map.
 * A coordinated burst from multiple IPs across cold-started instances will not
 * benefit from cross-instance rate-limit accumulation. The sliding-window and
 * failure-streak counters are therefore per-instance, not globally consistent.
 *
 * Accepted trade-off (CEO ack 2026-05-18 TEAM-P03.9): this endpoint is
 * invite-only with a 48-hour token TTL, and the failure-streak lockout (5 ×
 * 404 → 1-hour ban) still applies within a single warm instance. A Redis-backed
 * global rate-limiter is the correct long-term solution and is tracked as a
 * follow-up (TEAM-P04 infrastructure layer). For now the in-process Map
 * provides meaningful protection against unsophisticated enumeration attacks on
 * a single warm instance without introducing an external dependency.
 */
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

        // Sub-task 6 (iter 085 / TEAM-P03.7): handle re-acceptance of a
        // previously-removed member. A TeamMember row with status='removed'
        // is a terminal-but-resurrectable state. If found, reactivate it
        // (status='active', clear deactivatedAt) instead of treating as
        // "already a member" or attempting INSERT (which would violate
        // @@unique([teamId, userId])).
        const existingMembership = await tx.teamMember.findUnique({
          where: { teamId_userId: { teamId: invite.teamId, userId } },
        });
        if (existingMembership && existingMembership.status === 'active') {
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

        // Create or resurrect the team membership.
        if (existingMembership) {
          // Resurrect previously-removed (or deactivated) member.
          await tx.teamMember.update({
            where: { id: existingMembership.id },
            data: {
              role: invite.role,
              status: 'active',
              joinedAt: new Date(nowMs),
              deactivatedAt: null,
              reactivationDeadline: null,
            },
          });
        } else {
          // Create a fresh membership.
          await tx.teamMember.create({
            data: {
              teamId: invite.teamId,
              userId,
              role: invite.role,
              joinedAt: new Date(nowMs),
              status: 'active',
            },
          });
        }

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
    // Sub-task 5 (iter 085 / TEAM-P03.7): translate Prisma P2034 serialization
    // failures to HTTP 409 with a retryable hint. P2034 is common under
    // SERIALIZABLE isolation on Postgres production with concurrent
    // invite-accept requests. system-architect §2 review of iter 082 TEAM-P02
    // surfaced this: previously P2034 returned HTTP 500 which made clients
    // treat it as a permanent failure instead of a transient retry candidate.
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'P2034') {
      return NextResponse.json(
        {
          error: 'Concurrent acceptance detected — please retry',
          code: 'serialization_failure',
          retryable: true,
        },
        { status: 409 },
      );
    }

    console.error('[invites/accept/POST]', err);
    return NextResponse.json({ error: 'Failed to accept invite' }, { status: 500 });
  }
}
