import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import crypto from 'crypto';
import { getPlanConfig, toPlanType } from '@/lib/plans';
import { countPendingInvites } from '@/lib/workspace/seat-management';
import { trackServer } from '@/lib/analytics-server';
import { checkInviteRateLimit } from '@/lib/rate-limit/invite-buckets';

/**
 * POST /api/teams/:id/invite — create an invite link for a team
 * GET  /api/teams/:id/invite — list pending invites
 *
 * Part A changes (iter 082 / TEAM-P02):
 *   - Self-invite guard          → 400
 *   - Duplicate-pending guard    → 409
 *   - Seat-quota guard           → 402  (activeMembers + pendingInvites >= maxSeats)
 *   - Token stored as SHA-256 hash; raw token returned to caller only once
 *
 * iter 087 / TEAM-P03.10 changes:
 *   - P0-G: trackServer('team_invite_sent') after successful upsert
 *   - P0-K: SERIALIZABLE transaction wrapping quota check + upsert to close race condition
 *   - Demo-F3: DEMO_MODE_DISABLE_TEAMS env var short-circuits POST with 404
 *
 * iter 088 / TEAM-P03.8 changes:
 *   - Sub-task 1: POLISH copy substitutions (workspace terminology, clearer user messages)
 *   - Sub-task 6: in-memory per-team rate limit (20 invites/hour) to prevent Resend quota DoS
 */

// ── Per-team invite rate limiter (Sub-task 6, iter 088) ──────────────────────
//
// Extracted to apps/web-app/src/lib/rate-limit/invite-buckets.ts at iter 088
// coordinator-cleanup. Next.js route modules cannot export arbitrary symbols
// beyond HTTP method handlers + config; the test-introspection reset helper
// must live in a separate module.
//
// See @/lib/rate-limit/invite-buckets.ts for the @ledgerium-rate-limit-cold-start
// risk acknowledgement.

/** SHA-256 hash of a raw invite token. Never store the raw token. */
function hashInviteToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  // Demo-F3: disable invite creation during demo period without code changes.
  if (process.env.DEMO_MODE_DISABLE_TEAMS === 'true') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await db.user.findUnique({ where: { id: session.user.id } });
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  try {
    // Verify caller is an active owner or admin (P0-E: status:'active' guard — removed/deactivated
    // admins must not retain management capability for up to JWT TTL)
    const membership = await (db as any).teamMember.findFirst({
      where: { teamId: params.id, userId: session.user.id, status: 'active' },
    });
    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json({ error: 'Only owners and admins can invite members' }, { status: 403 });
    }

    const body = await req.json();
    const email = body.email?.trim()?.toLowerCase();
    const role = body.role ?? 'member';

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
    }

    // ── Guard 1: Self-invite ────────────────────────────────────────────────
    if (email === user.email.toLowerCase()) {
      return NextResponse.json({ error: 'You cannot invite yourself' }, { status: 400 });
    }

    // Check if user is already a member
    const existingUser = await db.user.findUnique({ where: { email } });
    if (existingUser) {
      const existingMember = await (db as any).teamMember.findUnique({
        where: { teamId_userId: { teamId: params.id, userId: existingUser.id } },
      });
      if (existingMember) {
        return NextResponse.json({ error: 'This person is already a member of this workspace' }, { status: 400 });
      }
    }

    // ── Sub-task 6: Per-team rate limit (iter 088) ──────────────────────────
    const nowMs = Date.now();
    const rateLimit = checkInviteRateLimit(params.id, nowMs);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: 'too_many_invites',
          code: 'rate_limit_exceeded',
          retryAfterSeconds: rateLimit.retryAfterSeconds,
        },
        { status: 429 },
      );
    }

    // ── Guard 2: Duplicate-pending invite ───────────────────────────────────
    // Uses @@unique([teamId, email]) — findFirst is the safe cross-DB query.
    const existingPending = await (db as any).teamInvite.findFirst({
      where: {
        teamId: params.id,
        email,
        acceptedAt: null,
        revokedAt: null,
        expiresAt: { gt: new Date(nowMs) },
      },
    });
    if (existingPending) {
      return NextResponse.json(
        { error: 'An invite is already pending for this email address', inviteId: existingPending.id },
        { status: 409 },
      );
    }

    // ── Guard 3: Workspace plan gate + Seat-quota ───────────────────────────
    // Gate is based on the workspace plan, not the caller's personal plan.
    // A free personal user who owns a Team-plan workspace CAN invite.
    const team = await (db as any).team.findUnique({
      where: { id: params.id },
      select: { plan: true },
    });
    const teamPlan = toPlanType(team?.plan ?? 'free');
    const teamPlanConfig = getPlanConfig(teamPlan);

    if (!teamPlanConfig.features?.teamWorkspace) {
      return NextResponse.json(
        {
          error: 'Workspace collaboration requires the Team plan — upgrade at /pricing',
          feature: 'teamWorkspace',
          requiredPlan: 'team',
          upgradeUrl: '/pricing',
        },
        { status: 403 },
      );
    }

    const { maxSeats } = teamPlanConfig;

    // ── P0-K: SERIALIZABLE transaction wraps quota check + invite upsert ──────
    // Concurrent requests can both pass the quota check before either commits.
    // SERIALIZABLE isolation forces them to serialize, preventing over-invite.
    const rawToken = crypto.randomBytes(20).toString('hex');
    const tokenHash = hashInviteToken(rawToken);
    const expiresAt = new Date(nowMs + 7 * 24 * 60 * 60 * 1000);

    let quotaError: NextResponse | null = null;
    let invite: any = null;

    await (db as any).$transaction(
      async (tx: any) => {
        if (maxSeats !== Number.MAX_SAFE_INTEGER) {
          // Sub-task 4 (iter 085 / TEAM-P03.7): sole-owner-overflow protection.
          // Owners are protected from soft-deactivation per iter 082
          // softDeactivateExcessMembers. They can overflow the seat quota and
          // remain active. Exclude them from the quota check; otherwise an
          // owner-overflow state (e.g., 6 owners on a Team plan with maxSeats=5)
          // permanently blocks ALL invites (backend-engineer F6 from quality review).
          const activeMembers = await tx.teamMember.findMany({
            where: { teamId: params.id, status: 'active' },
            select: { role: true },
          });
          const ownerCount = activeMembers.filter((m: { role: string }) => m.role === 'owner').length;
          const activeNonOwnerCount = activeMembers.length - ownerCount;
          const pendingInviteCount = await countPendingInvites(params.id, nowMs);

          // Seats available for non-owner members: maxSeats minus owner-count, clamped to 0.
          const availableNonOwnerSeats = Math.max(0, maxSeats - ownerCount);

          if (activeNonOwnerCount + pendingInviteCount >= availableNonOwnerSeats) {
            quotaError = NextResponse.json(
              {
                error: ownerCount >= maxSeats
                  ? 'No seats available for additional teammates — promote a member to owner OR remove an owner to make room'
                  : 'This workspace is at its member limit — upgrade to add more seats or remove an existing member',
                code: 'seat_quota_exceeded',
                currentSeats: activeNonOwnerCount + pendingInviteCount,
                maxSeats: availableNonOwnerSeats,
                ownerCount,
                upgradeUrl: '/pricing',
              },
              { status: 402 },
            );
            return; // abort transaction path — quotaError returned below
          }
        }

        // ── Create or re-create invite (hashed token) ────────────────────────
        // Upsert on @@unique([teamId, email]) so expired/revoked invites can be
        // re-sent without hitting a P2002 unique-constraint violation.
        invite = await tx.teamInvite.upsert({
          where: { teamId_email: { teamId: params.id, email } },
          create: {
            teamId: params.id,
            email,
            role,
            token: tokenHash,
            invitedBy: session.user.id,
            expiresAt,
          },
          update: {
            role,
            token: tokenHash,
            invitedBy: session.user.id,
            expiresAt,
            acceptedAt: null,
            acceptedBy: null,
            revokedAt: null,
          },
        });
      },
      { isolationLevel: 'Serializable' },
    );

    if (quotaError) return quotaError;

    // P0-G: server-side analytics — PII-free (no email).
    try {
      trackServer('team_invite_sent', { teamId: params.id, role, userId: session.user.id });
    } catch {
      // Non-fatal.
    }

    // Return raw token to caller — it will never be stored in plain form.
    const inviteUrl = `${process.env.NEXTAUTH_URL ?? 'https://ledgerium.ai'}/teams/join?token=${rawToken}`;

    return NextResponse.json({
      inviteId: invite.id,
      inviteUrl,
      email,
      expiresAt,
    });
  } catch (err) {
    console.error('[teams/invite/POST]', err);
    return NextResponse.json({ error: 'Failed to create invite' }, { status: 500 });
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // P0-E: status:'active' guard — removed/deactivated members must not list invites.
    const membership = await (db as any).teamMember.findFirst({
      where: { teamId: params.id, userId: session.user.id, status: 'active' },
    });
    if (!membership) {
      return NextResponse.json({ error: 'Not a member' }, { status: 403 });
    }

    const invites = await (db as any).teamInvite.findMany({
      where: {
        teamId: params.id,
        acceptedAt: null,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      invites: invites.map((i: any) => ({
        id: i.id,
        email: i.email,
        role: i.role,
        expiresAt: i.expiresAt,
        createdAt: i.createdAt,
      })),
    });
  } catch (err) {
    console.error('[teams/invite/GET]', err);
    return NextResponse.json({ error: 'Failed to load invites' }, { status: 500 });
  }
}
