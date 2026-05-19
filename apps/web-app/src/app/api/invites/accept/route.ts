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
 * Race protection: authenticated join uses an SERIALIZABLE transaction to
 * prevent double-acceptance under concurrent requests.
 *
 * @iter 082 / TEAM-P02 Part C
 */

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
  const nowMs = Date.now();

  try {
    const result = await (db as any).$transaction(
      async (tx: any) => {
        // Re-read invite inside the transaction for serializable isolation.
        const invite = await tx.teamInvite.findFirst({
          where: { token: tokenHash },
          include: { team: { select: { id: true, name: true, slug: true } } },
        });

        if (!invite) {
          return { error: 'Invite not found', status: 404 };
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
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error('[invites/accept/POST]', err);
    return NextResponse.json({ error: 'Failed to accept invite' }, { status: 500 });
  }
}
