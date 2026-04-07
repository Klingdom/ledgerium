import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';

/**
 * POST /api/teams/join — accept a team invite
 * Body: { token: string }
 */

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized — please sign in first' }, { status: 401 });
  }

  const body = await req.json();
  const token = body.token;

  if (!token) {
    return NextResponse.json({ error: 'Invite token is required' }, { status: 400 });
  }

  // Find the invite
  const invite = await (db as any).teamInvite.findUnique({
    where: { token },
    include: { team: true },
  });

  if (!invite) {
    return NextResponse.json({ error: 'Invalid invite link' }, { status: 404 });
  }

  if (invite.acceptedAt) {
    return NextResponse.json({ error: 'This invite has already been used' }, { status: 400 });
  }

  if (invite.expiresAt < new Date()) {
    return NextResponse.json({ error: 'This invite has expired' }, { status: 400 });
  }

  // Check if already a member
  const existing = await (db as any).teamMember.findUnique({
    where: { teamId_userId: { teamId: invite.teamId, userId: session.user.id } },
  });
  if (existing) {
    return NextResponse.json({
      teamId: invite.teamId,
      teamName: invite.team.name,
      alreadyMember: true,
    });
  }

  // Add user to team
  await (db as any).teamMember.create({
    data: {
      teamId: invite.teamId,
      userId: session.user.id,
      role: invite.role,
    },
  });

  // Mark invite as accepted
  await (db as any).teamInvite.update({
    where: { id: invite.id },
    data: { acceptedAt: new Date() },
  });

  return NextResponse.json({
    teamId: invite.teamId,
    teamName: invite.team.name,
    role: invite.role,
  });
}
