import { withApiRoute } from '@/lib/with-api-route';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';

/**
 * Returns whether the user has a connected extension (active API key used recently).
 *
 * Response shape:
 *   { hasExtension: boolean, lastSyncAt: string | null, keyPrefix: string | null }
 */
async function handleGET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const recentKey = await db.apiKey.findFirst({
    where: {
      userId: session.user.id,
      lastUsedAt: { not: null },
    },
    orderBy: { lastUsedAt: 'desc' },
    select: { lastUsedAt: true, prefix: true },
  });

  return NextResponse.json({
    hasExtension: !!recentKey,
    lastSyncAt: recentKey?.lastUsedAt?.toISOString() ?? null,
    keyPrefix: recentKey?.prefix ?? null,
  });
}

export const GET = withApiRoute('/api/me/extension-status', handleGET);
