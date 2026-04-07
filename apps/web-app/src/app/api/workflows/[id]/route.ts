import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import crypto from 'crypto';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const workflow = await db.workflow.findFirst({
    where: { id: params.id, userId: session.user.id },
    include: { artifacts: true },
  });

  if (!workflow) {
    return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
  }

  // Track view — fire-and-forget for performance
  // viewCount and lastViewedAt are new schema fields; cast to avoid
  // Prisma client type mismatch until next prisma generate
  db.workflow.update({
    where: { id: params.id },
    data: {
      viewCount: { increment: 1 },
      lastViewedAt: new Date(),
    } as any,
  }).catch(() => { /* non-critical */ });

  return NextResponse.json({
    workflow: {
      ...workflow,
      toolsUsed: workflow.toolsUsed ? JSON.parse(workflow.toolsUsed) : [],
    },
    artifacts: workflow.artifacts.map((a) => ({
      id: a.id,
      artifactType: a.artifactType,
      schemaVersion: a.schemaVersion,
      contentJson: a.contentJson ? JSON.parse(a.contentJson) : null,
      createdAt: a.createdAt,
    })),
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();

  const workflow = await db.workflow.findFirst({
    where: { id: params.id, userId: session.user.id },
  });

  if (!workflow) {
    return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
  }

  const data: Record<string, unknown> = {};
  if (body.title !== undefined) data.title = body.title;
  if (body.description !== undefined) data.description = body.description;
  if (body.status !== undefined) data.status = body.status;
  if (body.isFavorite !== undefined) data.isFavorite = body.isFavorite;

  // Generate share token on demand
  // shareToken is a new schema field; cast safely
  if (body.enableSharing === true && !(workflow as any).shareToken) {
    data.shareToken = crypto.randomBytes(16).toString('hex');
  }
  if (body.enableSharing === false) {
    data.shareToken = null;
  }

  const updated = await db.workflow.update({
    where: { id: params.id },
    data,
  });

  // Handle tag assignment: { tagIds: ['id1', 'id2'] } replaces all tags
  if (Array.isArray(body.tagIds)) {
    // Verify all tags belong to this user
    const validTags = await db.tag.findMany({
      where: { id: { in: body.tagIds }, userId: session.user.id },
      select: { id: true },
    });
    const validIds = new Set(validTags.map((t) => t.id));

    // Remove existing tags and re-create
    await db.workflowTag.deleteMany({ where: { workflowId: params.id } });
    if (validIds.size > 0) {
      await db.workflowTag.createMany({
        data: [...validIds].map((tagId) => ({
          workflowId: params.id,
          tagId,
        })),
      });
    }
  }

  // Handle single tag add/remove for quick toggling
  if (body.addTagId) {
    const tag = await db.tag.findFirst({
      where: { id: body.addTagId, userId: session.user.id },
    });
    if (tag) {
      await db.workflowTag.upsert({
        where: { workflowId_tagId: { workflowId: params.id, tagId: tag.id } },
        create: { workflowId: params.id, tagId: tag.id },
        update: {},
      });
    }
  }
  if (body.removeTagId) {
    await db.workflowTag.deleteMany({
      where: { workflowId: params.id, tagId: body.removeTagId },
    });
  }

  return NextResponse.json({
    ok: true,
    shareToken: (updated as any).shareToken ?? null,
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const workflow = await db.workflow.findFirst({
    where: { id: params.id, userId: session.user.id },
  });

  if (!workflow) {
    return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
  }

  // Soft delete
  await db.workflow.update({
    where: { id: params.id },
    data: { status: 'deleted' },
  });

  return NextResponse.json({ ok: true });
}
