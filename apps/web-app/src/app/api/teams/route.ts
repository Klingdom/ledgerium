import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import crypto from 'crypto';

/**
 * GET /api/teams — list user's teams
 * POST /api/teams — create a new team
 */

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const memberships = await (db as any).teamMember.findMany({
    where: { userId: session.user.id },
    include: {
      team: {
        include: {
          members: { include: { user: { select: { id: true, email: true, name: true } } } },
          _count: { select: { members: true } },
        },
      },
    },
  });

  return NextResponse.json({
    teams: memberships.map((m: any) => ({
      id: m.team.id,
      name: m.team.name,
      slug: m.team.slug,
      role: m.role,
      memberCount: m.team._count.members,
      members: m.team.members.map((mem: any) => ({
        id: mem.user.id,
        email: mem.user.email,
        name: mem.user.name,
        role: mem.role,
      })),
      createdAt: m.team.createdAt,
    })),
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const name = body.name?.trim();

  if (!name || name.length < 2) {
    return NextResponse.json({ error: 'Team name must be at least 2 characters' }, { status: 400 });
  }

  // Generate URL-safe slug
  const baseSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const slug = `${baseSlug}-${crypto.randomBytes(3).toString('hex')}`;

  const team = await (db as any).team.create({
    data: {
      name,
      slug,
      createdBy: session.user.id,
      members: {
        create: {
          userId: session.user.id,
          role: 'owner',
        },
      },
    },
  });

  return NextResponse.json({ id: team.id, name: team.name, slug: team.slug });
}
