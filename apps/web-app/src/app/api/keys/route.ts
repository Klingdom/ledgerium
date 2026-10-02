import { withApiRoute } from '@/lib/with-api-route';
import { invalidFieldPaths, parseJsonBody } from '@/lib/read-json-body';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { generateApiKey } from '@/lib/api-keys';
import { trackServer } from '@/lib/analytics-server';

/**
 * Row #261. Producer: account/page.tsx sends `{ label: 'Extension' }` on create
 * and `{ id }` on delete. `label` is optional — a body with none (or no body at
 * all) is a valid create and keeps the 'Extension' default.
 */
const createKeySchema = z.object({ label: z.string().nullish() });
const deleteKeySchema = z.object({ id: z.string().min(1) });

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

  // An absent or malformed body is a valid create (defaults apply); a body that
  // parses but has the wrong shape — `{"label": 5}`, `null`, `[]` — is a 400, not
  // a Prisma validation error reported as a 500.
  const parsed = createKeySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request body', fields: invalidFieldPaths(parsed.error) }, { status: 400 });
  }
  const label = parsed.data.label ?? undefined;

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

  const { id } = await parseJsonBody(req, deleteKeySchema);

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
