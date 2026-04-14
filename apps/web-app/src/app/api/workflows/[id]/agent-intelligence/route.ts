import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { analyzeWorkflowAgentIntelligence } from '@/lib/agent-intelligence';
import { checkFeatureAccess } from '@/lib/feature-gating';
import { db } from '@/db';

/**
 * POST /api/workflows/[id]/agent-intelligence
 * Run agent intelligence analysis on a single workflow.
 * Returns the full TransformationResult.
 * Requires agentComposition feature (Growth+).
 */
export async function POST(
  _req: NextRequest,
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

  // Gate: agentComposition is a Growth+ feature
  const access = checkFeatureAccess(user, 'agentComposition');
  if (!access.allowed) {
    return NextResponse.json(
      {
        error: 'Feature not available on your plan',
        feature: 'agentComposition',
        requiredPlan: access.requiredPlan,
        upgradeUrl: '/pricing',
      },
      { status: 403 },
    );
  }

  try {
    const result = await analyzeWorkflowAgentIntelligence(session.user.id, params.id);
    if (!result) {
      return NextResponse.json(
        { error: 'No process output available for analysis' },
        { status: 422 },
      );
    }

    return NextResponse.json({ data: result });
  } catch (err) {
    console.error('Agent intelligence analysis failed:', err);
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 });
  }
}
