import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';

/**
 * PATCH /api/teams/:id/members/:memberId — change a member's role
 * DELETE /api/teams/:id/members/:memberId — remove a member
 *
 * Authorization: caller must be owner or admin.
 *
 * PATCH:
 *   - Body: { role: 'owner' | 'admin' | 'member' }
 *   - 400 if role is invalid.
 *   - 404 if memberId not found in this team.
 *   - 200 { ok: true, memberId, role } on success.
 *
 * DELETE:
 *   - 404 if memberId not found in this team.
 *   - 400 if the target is the sole owner (sole-owner protection).
 *   - 200 { ok: true } on success.
 *
 * Sole-owner protection: count TeamMember rows with role='owner' for this team.
 * If count <= 1 and target is owner → 400.
 *
 * @iter 082 / TEAM-P02 Part D
 */

const VALID_ROLES = new Set(['owner', 'admin', 'member']);

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; memberId: string } },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const newRole: string | undefined = body?.role;

  if (!newRole || !VALID_ROLES.has(newRole)) {
    return NextResponse.json(
      { error: `role must be one of: ${[...VALID_ROLES].join(', ')}` },
      { status: 400 },
    );
  }

  try {
    // Verify caller is owner or admin.
    const callerMembership = await (db as any).teamMember.findUnique({
      where: { teamId_userId: { teamId: params.id, userId: session.user.id } },
    });
    if (!callerMembership || !['owner', 'admin'].includes(callerMembership.role)) {
      return NextResponse.json(
        { error: 'Only owners and admins can change member roles' },
        { status: 403 },
      );
    }

    // Guard: only an owner can promote someone to owner.
    if (newRole === 'owner' && callerMembership.role !== 'owner') {
      return NextResponse.json(
        { error: 'Only an owner can promote a member to owner', code: 'forbidden_role_elevation' },
        { status: 403 },
      );
    }

    // Fetch target membership by TeamMember.id (not userId).
    const targetMembership = await (db as any).teamMember.findFirst({
      where: { id: params.memberId, teamId: params.id },
    });
    if (!targetMembership) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Sole-owner protection: cannot demote the last owner.
    if (targetMembership.role === 'owner' && newRole !== 'owner') {
      const ownerCount = await (db as any).teamMember.count({
        where: { teamId: params.id, role: 'owner' },
      });
      if (ownerCount <= 1) {
        return NextResponse.json(
          { error: 'Cannot change the role of the sole owner — promote another member first' },
          { status: 400 },
        );
      }
    }

    await (db as any).teamMember.update({
      where: { id: params.memberId },
      data: { role: newRole },
    });

    return NextResponse.json({ ok: true, memberId: params.memberId, role: newRole });
  } catch (err) {
    console.error('[teams/members/[memberId]/PATCH]', err);
    return NextResponse.json({ error: 'Failed to update member role' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; memberId: string } },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Verify caller is owner or admin.
    const callerMembership = await (db as any).teamMember.findUnique({
      where: { teamId_userId: { teamId: params.id, userId: session.user.id } },
    });
    if (!callerMembership || !['owner', 'admin'].includes(callerMembership.role)) {
      return NextResponse.json(
        { error: 'Only owners and admins can remove members' },
        { status: 403 },
      );
    }

    // Fetch target membership by TeamMember.id.
    const targetMembership = await (db as any).teamMember.findFirst({
      where: { id: params.memberId, teamId: params.id },
    });
    if (!targetMembership) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Sole-owner protection: count owners; refuse if this is the last one.
    if (targetMembership.role === 'owner') {
      const ownerCount = await (db as any).teamMember.count({
        where: { teamId: params.id, role: 'owner' },
      });
      if (ownerCount <= 1) {
        return NextResponse.json(
          { error: 'Cannot remove the sole owner of a workspace' },
          { status: 400 },
        );
      }
    }

    await (db as any).teamMember.delete({
      where: { id: params.memberId },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[teams/members/[memberId]/DELETE]', err);
    return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 });
  }
}
