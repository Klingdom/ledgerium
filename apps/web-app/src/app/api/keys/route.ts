import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { generateApiKey } from '@/lib/api-keys';

/** List user's API keys (without hashes). */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const keys = await db.apiKey.findMany({
    where: { userId: session.user.id },
    select: { id: true, prefix: true, label: true, lastUsedAt: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ keys });
}

/** Create a new API key. Returns the raw key ONCE. */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const label = (body as Record<string, unknown>).label as string | undefined;

  const { rawKey, keyHash, prefix } = generateApiKey();

  await db.apiKey.create({
    data: {
      userId: session.user.id,
      keyHash,
      prefix,
      label: label ?? 'Extension',
    },
  });

  return NextResponse.json({
    key: rawKey,
    prefix,
    message: 'Save this key — it will not be shown again.',
  }, { status: 201 });
}

/** Delete an API key. */
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await req.json() as { id: string };

  const key = await db.apiKey.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!key) {
    return NextResponse.json({ error: 'Key not found' }, { status: 404 });
  }

  await db.apiKey.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
