import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';

/**
 * GET /api/baselines — list the signed-in user's saved baseline snapshots
 * (newest first), with the source workflow title. Powers the /compare baseline
 * selector.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const baselines = await db.workflowBaseline.findMany({
    where: { userId: session.user.id },
    orderBy: { capturedAt: 'desc' },
    include: { workflow: { select: { title: true } } },
  });

  return NextResponse.json({
    data: baselines.map((b) => ({
      id: b.id,
      workflowId: b.workflowId,
      label: b.label,
      workflowTitle: b.workflow?.title ?? null,
      avgTimeMs: b.avgTimeMs,
      runs: b.runs,
      stepCount: b.stepCount,
      systemCount: b.systemCount,
      healthOverall: b.healthOverall,
      healthGated: b.healthGated,
      capturedAt: b.capturedAt,
    })),
  });
}
