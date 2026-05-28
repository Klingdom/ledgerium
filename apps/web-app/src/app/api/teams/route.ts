import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import crypto from 'crypto';
import { checkFeatureAccess } from '@/lib/feature-gating';
import { toPlanType } from '@/lib/plans';
import { trackServer } from '@/lib/analytics-server';

/**
 * GET /api/teams — list user's teams
 * POST /api/teams — create a new team
 *
 * Demo-F3: set DEMO_MODE_DISABLE_TEAMS=true to 404 team creation (POST only).
 * GET is preserved so existing teams remain visible during demo.
 *
 * @iter 087 / TEAM-P03.10
 */

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const memberships = await (db as any).teamMember.findMany({
      where: { userId: session.user.id },
      include: {
        team: {
          include: {
            // P0-L: filter to active members only — removed/deactivated must not leak.
            members: {
              where: { status: 'active' },
              include: { user: { select: { id: true, email: true, name: true } } },
            },
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
  } catch (err) {
    console.error('[teams/GET] Error:', err);
    return NextResponse.json({ error: 'Failed to load teams' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  // Demo-F3: disable team creation during demo period without code changes.
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

  // Gate: creating teams is a Team+ (teamWorkspace) feature.
  // P0-F: include code:'plan_upgrade_required' so frontend can render upgrade CTA.
  const access = checkFeatureAccess(user, 'teamWorkspace');
  if (!access.allowed) {
    return NextResponse.json(
      {
        error: 'Feature not available on your plan',
        code: 'plan_upgrade_required',
        feature: 'teamWorkspace',
        requiredPlan: access.requiredPlan,
        upgradeUrl: '/pricing',
      },
      { status: 403 },
    );
  }

  try {
    const body = await req.json();
    const name = body.name?.trim();

    if (!name || name.length < 2) {
      return NextResponse.json({ error: 'Team name must be at least 2 characters' }, { status: 400 });
    }

    const baseSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const slug = `${baseSlug}-${crypto.randomBytes(3).toString('hex')}`;

    const team = await (db as any).team.create({
      data: {
        name,
        slug,
        plan: toPlanType(user.plan),
        createdBy: session.user.id,
        members: {
          create: {
            userId: session.user.id,
            role: 'owner',
          },
        },
      },
    });

    // P0-G: fire server-side analytics — PII-free (teamId only, no email/name).
    try {
      trackServer('team_created', { teamId: team.id, userId: session.user.id });
    } catch {
      // Non-fatal: analytics failure must never block team creation.
    }

    return NextResponse.json({ id: team.id, name: team.name, slug: team.slug });
  } catch (err) {
    console.error('[teams/POST] Error:', err);
    return NextResponse.json({ error: 'Failed to create team' }, { status: 500 });
  }
}
