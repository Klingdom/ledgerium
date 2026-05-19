import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';

/**
 * DELETE /api/teams/:id/invite/:inviteId — revoke an invite
 *
 * Authorization: caller must be owner or admin of the workspace.
 * - 404 if invite not found or already accepted (accepted invites cannot be revoked).
 * - 409 if invite already revoked.
 * - 200 { ok: true } on success.
 *
 * @iter 082 / TEAM-P02 Part B
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; inviteId: string } },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Verify caller is owner or admin
    const membership = await (db as any).teamMember.findUnique({
      where: { teamId_userId: { teamId: params.id, userId: session.user.id } },
    });
    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json(
        { error: 'Only owners and admins can revoke invites' },
        { status: 403 },
      );
    }

    // Fetch the invite — must belong to this team.
    const invite = await (db as any).teamInvite.findFirst({
      where: { id: params.inviteId, teamId: params.id },
    });

    // 404 when: invite does not exist, or invite was already accepted.
    if (!invite || invite.acceptedAt !== null) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
    }

    // 409 if already revoked.
    if (invite.revokedAt !== null) {
      return NextResponse.json({ error: 'Invite is already revoked' }, { status: 409 });
    }

    // Stamp revokedAt.
    await (db as any).teamInvite.update({
      where: { id: params.inviteId },
      data: { revokedAt: new Date() },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[teams/invite/[inviteId]/DELETE]', err);
    return NextResponse.json({ error: 'Failed to revoke invite' }, { status: 500 });
  }
}
