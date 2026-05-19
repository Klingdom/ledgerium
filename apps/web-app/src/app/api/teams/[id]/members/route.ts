import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';

/**
 * GET /api/teams/:id/members — list team members
 *
 * Query params:
 *   skip   — number of records to skip (default 0)
 *   take   — max records to return (default 50, max 100)
 *   status — filter by member status: 'active' | 'deactivated' | 'all' (default 'active')
 *
 * Response adds `memberId` (TeamMember row id) and `status` fields to each member.
 *
 * DELETE /api/teams/:id/members — remove a member (owner/admin only, legacy body-based endpoint)
 *
 * @iter 082 / TEAM-P02 Part D
 */

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Verify caller is a member
    const membership = await (db as any).teamMember.findUnique({
      where: { teamId_userId: { teamId: params.id, userId: session.user.id } },
    });
    if (!membership) {
      return NextResponse.json({ error: 'Not a member of this team' }, { status: 403 });
    }

    // Parse pagination + filter query params.
    const { searchParams } = new URL(req.url);
    const rawSkip = parseInt(searchParams.get('skip') ?? '0', 10);
    const rawTake = parseInt(searchParams.get('take') ?? '50', 10);
    const statusFilter = searchParams.get('status') ?? 'active';

    const skip = isNaN(rawSkip) || rawSkip < 0 ? 0 : rawSkip;
    const take = isNaN(rawTake) || rawTake < 1 ? 50 : Math.min(rawTake, 100);

    // Build WHERE clause based on status filter.
    let whereStatus: Record<string, unknown> = {};
    if (statusFilter === 'active') {
      whereStatus = { status: 'active' };
    } else if (statusFilter === 'deactivated') {
      whereStatus = { status: 'deactivated' };
    }
    // 'all' — no status filter applied.

    const [members, total] = await Promise.all([
      (db as any).teamMember.findMany({
        where: { teamId: params.id, ...whereStatus },
        include: { user: { select: { id: true, email: true, name: true } } },
        orderBy: { joinedAt: 'asc' },
        skip,
        take,
      }),
      (db as any).teamMember.count({
        where: { teamId: params.id, ...whereStatus },
      }),
    ]);

    return NextResponse.json({
      members: members.map((m: any) => ({
        memberId: m.id,
        id: m.user.id,
        email: m.user.email,
        name: m.user.name,
        role: m.role,
        status: m.status,
        joinedAt: m.joinedAt,
        deactivatedAt: m.deactivatedAt ?? null,
        reactivationDeadline: m.reactivationDeadline ?? null,
      })),
      pagination: { skip, take, total },
    });
  } catch (err) {
    console.error('[teams/members/GET]', err);
    return NextResponse.json({ error: 'Failed to load members' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const targetUserId = body.userId;
    if (!targetUserId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    // Verify caller is owner or admin
    const callerMembership = await (db as any).teamMember.findUnique({
      where: { teamId_userId: { teamId: params.id, userId: session.user.id } },
    });
    if (!callerMembership || !['owner', 'admin'].includes(callerMembership.role)) {
      return NextResponse.json({ error: 'Only owners and admins can remove members' }, { status: 403 });
    }

    // Fetch target membership.
    const targetMembership = await (db as any).teamMember.findUnique({
      where: { teamId_userId: { teamId: params.id, userId: targetUserId } },
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

    await (db as any).teamMember.deleteMany({
      where: { teamId: params.id, userId: targetUserId },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[teams/members/DELETE]', err);
    return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 });
  }
}
