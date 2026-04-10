import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import crypto from 'crypto';
import { z } from 'zod';
import { renderAllTemplates } from '@/lib/ingestion';

/** Validation schema for workflow PATCH body fields. */
const patchSchema = z.object({
  title: z.string().min(1).max(256).optional(),
  description: z.string().max(2000).optional(),
  status: z.enum(['active', 'archived', 'deleted']).optional(),
  isFavorite: z.boolean().optional(),
  enableSharing: z.boolean().optional(),
  tagIds: z.array(z.string().uuid()).optional(),
  addTagId: z.string().uuid().optional(),
  removeTagId: z.string().uuid().optional(),
}).passthrough();

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
  db.workflow.update({
    where: { id: params.id },
    data: {
      viewCount: { increment: 1 },
      lastViewedAt: new Date(),
    },
  }).catch(() => { /* non-critical */ });

  // Lazy template backfill — generate templates for older workflows that lack them
  let artifacts = workflow.artifacts;
  const hasTemplates = artifacts.some((a) => a.artifactType === 'template_selection');
  if (!hasTemplates) {
    const processOutputArtifact = artifacts.find((a) => a.artifactType === 'process_output');
    if (processOutputArtifact?.contentJson) {
      try {
        const processOutput = JSON.parse(processOutputArtifact.contentJson);
        const templateArtifacts = renderAllTemplates(processOutput);
        if (templateArtifacts.length > 0) {
          await db.workflowArtifact.createMany({
            data: templateArtifacts.map((ta) => ({
              workflowId: params.id,
              artifactType: ta.artifactType,
              schemaVersion: '1.0.0',
              contentJson: ta.contentJson,
            })),
          });
          // Re-fetch artifacts to include the newly generated templates
          const updated = await db.workflow.findFirst({
            where: { id: params.id },
            include: { artifacts: true },
          });
          if (updated) artifacts = updated.artifacts;
        }
      } catch (err) {
        console.error('Template backfill failed (non-blocking):', err);
      }
    }
  }

  return NextResponse.json({
    workflow: {
      ...workflow,
      toolsUsed: workflow.toolsUsed ? JSON.parse(workflow.toolsUsed) : [],
    },
    artifacts: artifacts.map((a) => ({
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

  const rawBody = await req.json();

  // Validate input — prevents arbitrary status values, XSS via long strings,
  // and ensures type safety on all updateable fields.
  const parsed = patchSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({
      error: 'Invalid request body',
      details: parsed.error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
    }, { status: 400 });
  }
  const body = parsed.data;

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
