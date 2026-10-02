import { withApiRoute } from '@/lib/with-api-route';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';

async function handleGET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { plan: true },
  });
  return NextResponse.json({ plan: user?.plan ?? 'free' });
}

export const GET = withApiRoute('/api/me', handleGET);
