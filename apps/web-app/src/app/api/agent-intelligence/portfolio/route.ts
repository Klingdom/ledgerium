import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { analyzePortfolioAgentIntelligence } from '@/lib/agent-intelligence';
import { checkFeatureAccess } from '@/lib/feature-gating';
import { db } from '@/db';

/**
 * POST /api/agent-intelligence/portfolio
 * Run cross-workflow intelligence analysis on the user's workflow portfolio.
 * Optionally accepts { workflowIds: string[] } in the body to scope analysis.
 * Requires agentComposition feature (Growth+).
 */
export async function POST(req: NextRequest) {
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

  let workflowIds: string[] | undefined;
  try {
    const body = await req.json();
    if (Array.isArray(body.workflowIds)) {
      workflowIds = body.workflowIds;
    }
  } catch {
    // No body or invalid JSON — analyze all workflows
  }

  try {
    const result = await analyzePortfolioAgentIntelligence(session.user.id, workflowIds);
    if (!result) {
      return NextResponse.json(
        { error: 'No workflows available for analysis' },
        { status: 422 },
      );
    }

    return NextResponse.json({ data: result });
  } catch (err) {
    console.error('Portfolio agent intelligence analysis failed:', err);
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 });
  }
}
