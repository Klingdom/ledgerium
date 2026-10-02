import { withApiRoute } from '@/lib/with-api-route';
import { readJsonBody } from '@/lib/read-json-body';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { z } from 'zod';

const updateTagSchema = z.object({
  name: z.string().trim().min(1).max(32).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

async function handlePATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const tag = await db.tag.findFirst({
    where: { id: params.id, userId: session.user.id },
  });
  if (!tag) {
    return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
  }

  const body = await readJsonBody(req);
  const parsed = updateTagSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid tag data', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const data: Record<string, string> = {};
  if (parsed.data.name !== undefined) data.name = parsed.data.name;
  if (parsed.data.color !== undefined) data.color = parsed.data.color;

  const updated = await db.tag.update({
    where: { id: params.id },
    data,
  });

  return NextResponse.json({ tag: updated });
}

async function handleDELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const tag = await db.tag.findFirst({
    where: { id: params.id, userId: session.user.id },
  });
  if (!tag) {
    return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
  }

  await db.tag.delete({ where: { id: params.id } });

  return NextResponse.json({ ok: true });
}

export const PATCH = withApiRoute('/api/tags/[id]', handlePATCH);
export const DELETE = withApiRoute('/api/tags/[id]', handleDELETE);
