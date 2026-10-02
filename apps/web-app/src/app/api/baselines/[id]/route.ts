import { withApiRoute } from '@/lib/with-api-route';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';

/** DELETE /api/baselines/:id — remove one of the user's saved baseline snapshots. */
async function handleDELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await db.workflowBaseline.deleteMany({
    where: { id: params.id, userId: session.user.id },
  });
  if (result.count === 0) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json({ data: { ok: true } });
}

export const DELETE = withApiRoute('/api/baselines/[id]', handleDELETE);
