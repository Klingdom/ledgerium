import { withApiRoute } from '@/lib/with-api-route';
import { readJsonBody } from '@/lib/read-json-body';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { z } from 'zod';

const TAG_COLORS = [
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#f43f5e', // rose
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#14b8a6', // teal
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#6b7280', // gray
];

const createTagSchema = z.object({
  name: z.string().trim().min(1).max(32),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

async function handleGET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const tags = await db.tag.findMany({
    where: { userId: session.user.id },
    include: { workflows: { select: { workflowId: true } } },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json({
    tags: tags.map((t) => ({
      id: t.id,
      name: t.name,
      color: t.color,
      workflowCount: t.workflows.length,
      createdAt: t.createdAt,
    })),
  });
}

async function handlePOST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await readJsonBody(req);
  const parsed = createTagSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid tag data', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { name, color } = parsed.data;

  // Check for duplicate tag name per user
  const existing = await db.tag.findUnique({
    where: { userId_name: { userId: session.user.id, name } },
  });
  if (existing) {
    return NextResponse.json({ error: 'Tag already exists' }, { status: 409 });
  }

  // Cap at 50 tags per user
  const count = await db.tag.count({ where: { userId: session.user.id } });
  if (count >= 50) {
    return NextResponse.json({ error: 'Tag limit reached (50)' }, { status: 422 });
  }

  const assignedColor = color ?? TAG_COLORS[count % TAG_COLORS.length] ?? '#6366f1';

  const tag = await db.tag.create({
    data: {
      userId: session.user.id,
      name,
      color: assignedColor,
    },
  });

  return NextResponse.json({ tag }, { status: 201 });
}

export const GET = withApiRoute('/api/tags', handleGET);
export const POST = withApiRoute('/api/tags', handlePOST);
