import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';

/**
 * GET /api/workflows/:id/share — list who this workflow is shared with
 * POST /api/workflows/:id/share — share workflow with a user or team
 * DELETE /api/workflows/:id/share — revoke a share
 */

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Verify ownership
    const workflow = await db.workflow.findFirst({
      where: { id: params.id, userId: session.user.id },
    });
    if (!workflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
    }

    const shares = await (db as any).workflowShare.findMany({
      where: { workflowId: params.id },
      include: {
        sharer: { select: { email: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Resolve shared-with names
    const resolved = await Promise.all(shares.map(async (s: any) => {
      if (s.shareType === 'user') {
        const user = await db.user.findUnique({
          where: { id: s.sharedWith },
          select: { email: true, name: true },
        });
        return { ...s, sharedWithName: user?.name ?? user?.email ?? s.sharedWith };
      }
      if (s.shareType === 'team') {
        const team = await (db as any).team.findUnique({
          where: { id: s.sharedWith },
          select: { name: true },
        });
        return { ...s, sharedWithName: team?.name ?? s.sharedWith };
      }
      return { ...s, sharedWithName: s.sharedWith };
    }));

    return NextResponse.json({
      shares: resolved.map((s: any) => ({
        id: s.id,
        sharedWith: s.sharedWith,
        sharedWithName: s.sharedWithName,
        shareType: s.shareType,
        permission: s.permission,
        createdAt: s.createdAt,
      })),
      isPublic: !!(workflow as any).shareToken,
    });
  } catch (err) {
    console.error('[workflows/share/GET]', err);
    return NextResponse.json({ error: 'Failed to load shares' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const workflow = await db.workflow.findFirst({
      where: { id: params.id, userId: session.user.id },
    });
    if (!workflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
    }

    const body = await req.json();
    const { email, teamId, permission } = body;

    if (!email && !teamId) {
      return NextResponse.json({ error: 'email or teamId is required' }, { status: 400 });
    }

    if (email) {
      // Share with a specific user by email
      const targetUser = await db.user.findUnique({ where: { email: email.trim().toLowerCase() } });
      if (!targetUser) {
        return NextResponse.json({ error: 'User not found. They must have a Ledgerium account.' }, { status: 404 });
      }

      await (db as any).workflowShare.upsert({
        where: {
          workflowId_sharedWith_shareType: {
            workflowId: params.id,
            sharedWith: targetUser.id,
            shareType: 'user',
          },
        },
        create: {
          workflowId: params.id,
          sharedWith: targetUser.id,
          shareType: 'user',
          permission: permission ?? 'viewer',
          sharedBy: session.user.id,
        },
        update: {
          permission: permission ?? 'viewer',
        },
      });

      return NextResponse.json({ ok: true, sharedWith: targetUser.email });
    }

    if (teamId) {
      // Share with a team — verify caller is member of that team
      const membership = await (db as any).teamMember.findUnique({
        where: { teamId_userId: { teamId, userId: session.user.id } },
      });
      if (!membership) {
        return NextResponse.json({ error: 'You are not a member of this team' }, { status: 403 });
      }

      await (db as any).workflowShare.upsert({
        where: {
          workflowId_sharedWith_shareType: {
            workflowId: params.id,
            sharedWith: teamId,
            shareType: 'team',
          },
        },
        create: {
          workflowId: params.id,
          sharedWith: teamId,
          shareType: 'team',
          permission: permission ?? 'viewer',
          sharedBy: session.user.id,
        },
        update: {
          permission: permission ?? 'viewer',
        },
      });

      return NextResponse.json({ ok: true, sharedWith: teamId });
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  } catch (err) {
    console.error('[workflows/share/POST]', err);
    return NextResponse.json({ error: 'Failed to share workflow' }, { status: 500 });
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
    const workflow = await db.workflow.findFirst({
      where: { id: params.id, userId: session.user.id },
    });
    if (!workflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
    }

    const body = await req.json();
    const shareId = body.shareId;

    if (!shareId) {
      return NextResponse.json({ error: 'shareId is required' }, { status: 400 });
    }

    await (db as any).workflowShare.deleteMany({
      where: { id: shareId, workflowId: params.id },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[workflows/share/DELETE]', err);
    return NextResponse.json({ error: 'Failed to revoke share' }, { status: 500 });
  }
}
