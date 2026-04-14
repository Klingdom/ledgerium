import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { checkFeatureAccess } from '@/lib/feature-gating';

/**
 * PATCH /api/insights/[id]
 * Dismiss or update an insight.
 * Requires intelligenceLayer feature (Team+).
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await db.user.findUnique({ where: { id: session.user.id } });
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Gate: intelligenceLayer is a Team+ feature
  const access = checkFeatureAccess(user, 'intelligenceLayer');
  if (!access.allowed) {
    return NextResponse.json(
      {
        error: 'Feature not available on your plan',
        feature: 'intelligenceLayer',
        requiredPlan: access.requiredPlan,
        upgradeUrl: '/pricing',
      },
      { status: 403 },
    );
  }

  const insight = await db.processInsight.findFirst({
    where: { id: params.id, userId: session.user.id },
  });

  if (!insight) {
    return NextResponse.json({ error: 'Insight not found' }, { status: 404 });
  }

  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (typeof body.dismissed === 'boolean') data.dismissed = body.dismissed;

  await db.processInsight.update({
    where: { id: params.id },
    data,
  });

  return NextResponse.json({ ok: true });
}
