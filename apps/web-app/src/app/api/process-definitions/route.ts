import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { checkFeatureAccess } from '@/lib/feature-gating';

/** Safely parse a JSON string, returning null on failure instead of throwing. */
function safeJsonParse(json: string | null | undefined): unknown {
  if (!json) return null;
  try { return JSON.parse(json); }
  catch { return null; }
}

/**
 * GET /api/process-definitions
 * List all process definitions for the current user.
 * Requires intelligenceLayer feature (Team+).
 */
export async function GET() {
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

  const definitions = await db.processDefinition.findMany({
    where: { userId: session.user.id },
    orderBy: { runCount: 'desc' },
    include: {
      workflows: {
        where: { status: 'active' },
        select: { id: true, title: true, durationMs: true, stepCount: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      },
      insights: {
        where: { dismissed: false },
        select: { id: true, insightType: true, severity: true, title: true },
        orderBy: { severity: 'desc' },
      },
    },
  });

  return NextResponse.json({
    definitions: definitions.map((d) => ({
      id: d.id,
      canonicalName: d.canonicalName,
      description: d.description,
      pathSignature: d.pathSignature,
      runCount: d.runCount,
      variantCount: d.variantCount,
      avgDurationMs: d.avgDurationMs,
      medianDurationMs: d.medianDurationMs,
      stabilityScore: d.stabilityScore,
      confidenceScore: d.confidenceScore,
      analyzedAt: d.analyzedAt,
      workflows: d.workflows,
      insights: d.insights,
      intelligence: safeJsonParse(d.intelligenceJson),
      // Phase 5 hierarchy fields
      familyId: d.familyId,
      normalizedName: d.normalizedName,
      groupType: d.groupType,
      startAnchor: d.startAnchor,
      endAnchor: d.endAnchor,
      confidenceBand: d.confidenceBand,
      explanationJson: d.explanationJson,
      systems: d.systems,
      nameSignature: d.nameSignature,
      stepSignatureHash: d.stepSignatureHash,
      metricsJson: d.metricsJson,
    })),
  });
}
