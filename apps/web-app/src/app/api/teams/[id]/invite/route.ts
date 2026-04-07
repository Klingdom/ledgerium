import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import crypto from 'crypto';

/**
 * POST /api/teams/:id/invite — create an invite link for a team
 * GET /api/teams/:id/invite — list pending invites
 */

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
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
      return NextResponse.json({ error: 'Only owners and admins can invite members' }, { status: 403 });
    }

    const body = await req.json();
    const email = body.email?.trim()?.toLowerCase();
    const role = body.role ?? 'member';

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
    }

    // Check if user is already a member
    const existingUser = await db.user.findUnique({ where: { email } });
    if (existingUser) {
      const existingMember = await (db as any).teamMember.findUnique({
        where: { teamId_userId: { teamId: params.id, userId: existingUser.id } },
      });
      if (existingMember) {
        return NextResponse.json({ error: 'User is already a team member' }, { status: 400 });
      }
    }

    // Create invite token (expires in 7 days)
    const token = crypto.randomBytes(20).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const invite = await (db as any).teamInvite.create({
      data: {
        teamId: params.id,
        email,
        role,
        token,
        invitedBy: session.user.id,
        expiresAt,
      },
    });

    const inviteUrl = `${process.env.NEXTAUTH_URL ?? 'https://ledgerium.ai'}/teams/join?token=${token}`;

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
    const membership = await (db as any).teamMember.findUnique({
      where: { teamId_userId: { teamId: params.id, userId: session.user.id } },
    });
    if (!membership) {
      return NextResponse.json({ error: 'Not a member' }, { status: 403 });
    }

    const invites = await (db as any).teamInvite.findMany({
      where: {
        teamId: params.id,
        acceptedAt: null,
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
