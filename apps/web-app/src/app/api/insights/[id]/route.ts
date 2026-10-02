import { withApiRoute } from '@/lib/with-api-route';
import { parseJsonBody } from '@/lib/read-json-body';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { checkFeatureAccess } from '@/lib/feature-gating';

/** Row #261. Producer: analytics/page.tsx sends `{ dismissed: true }`. */
const patchInsightSchema = z.object({ dismissed: z.boolean().optional() });

/**
 * PATCH /api/insights/[id]
 * Dismiss or update an insight.
 * Requires intelligenceLayer feature (Team+).
 */
async function handlePATCH(
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
  const access = await checkFeatureAccess(user, 'intelligenceLayer');
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

  const body = await parseJsonBody(req, patchInsightSchema);
  const data: Record<string, unknown> = {};
  if (body.dismissed !== undefined) data.dismissed = body.dismissed;

  await db.processInsight.update({
    where: { id: params.id },
    data,
  });

  return NextResponse.json({ ok: true });
}

export const PATCH = withApiRoute('/api/insights/[id]', handlePATCH);
