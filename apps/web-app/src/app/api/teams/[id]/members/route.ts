import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';

/**
 * GET /api/teams/:id/members — list team members
 * DELETE /api/teams/:id/members — remove a member (owner/admin only)
 */

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify caller is a member
  const membership = await (db as any).teamMember.findUnique({
    where: { teamId_userId: { teamId: params.id, userId: session.user.id } },
  });
  if (!membership) {
    return NextResponse.json({ error: 'Not a member of this team' }, { status: 403 });
  }

  const members = await (db as any).teamMember.findMany({
    where: { teamId: params.id },
    include: { user: { select: { id: true, email: true, name: true } } },
    orderBy: { joinedAt: 'asc' },
  });

  return NextResponse.json({
    members: members.map((m: any) => ({
      id: m.user.id,
      email: m.user.email,
      name: m.user.name,
      role: m.role,
      joinedAt: m.joinedAt,
    })),
  });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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

  // Cannot remove the owner
  const targetMembership = await (db as any).teamMember.findUnique({
    where: { teamId_userId: { teamId: params.id, userId: targetUserId } },
  });
  if (targetMembership?.role === 'owner') {
    return NextResponse.json({ error: 'Cannot remove team owner' }, { status: 400 });
  }

  await (db as any).teamMember.deleteMany({
    where: { teamId: params.id, userId: targetUserId },
  });

  return NextResponse.json({ ok: true });
}
