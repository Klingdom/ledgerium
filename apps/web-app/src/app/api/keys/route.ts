import { withApiRoute } from '@/lib/with-api-route';
import { readJsonBody } from '@/lib/read-json-body';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { generateApiKey } from '@/lib/api-keys';
import { trackServer } from '@/lib/analytics-server';

/** List user's API keys (without hashes). */
async function handleGET() {
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
async function handlePOST(req: NextRequest) {
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

  trackServer('extension_api_key_created', { userId: session.user.id, keyPrefix: prefix });

  return NextResponse.json({
    key: rawKey,
    prefix,
    message: 'Save this key — it will not be shown again.',
  }, { status: 201 });
}

/** Delete an API key. */
async function handleDELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = (await readJsonBody(req, { object: true })) as { id: string };

  const key = await db.apiKey.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!key) {
    return NextResponse.json({ error: 'Key not found' }, { status: 404 });
  }

  await db.apiKey.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}

export const GET = withApiRoute('/api/keys', handleGET);
export const POST = withApiRoute('/api/keys', handlePOST);
export const DELETE = withApiRoute('/api/keys', handleDELETE);
