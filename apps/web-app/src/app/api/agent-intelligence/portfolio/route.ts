import { withApiRoute } from '@/lib/with-api-route';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { analyzePortfolioAgentIntelligence } from '@/lib/agent-intelligence';
import { checkFeatureAccess } from '@/lib/feature-gating';
import { db } from '@/db';
import { reportApiError } from '@/lib/api-error-reporting';
import { invalidFieldPaths } from '@/lib/read-json-body';
import { z } from 'zod';

/**
 * Row #261. No in-repo producer calls this route. An absent or malformed body
 * stays valid (analyse everything); a parsed body of the wrong shape is a 400.
 * A non-array `workflowIds` used to be silently ignored; it is now rejected,
 * because ignoring it widens the analysis the caller asked to scope.
 */
const portfolioSchema = z.object({ workflowIds: z.array(z.string()).optional() });

/**
 * POST /api/agent-intelligence/portfolio
 * Run cross-workflow intelligence analysis on the user's workflow portfolio.
 * Optionally accepts { workflowIds: string[] } in the body to scope analysis.
 * Requires agentComposition feature (Growth+).
 */
async function handlePOST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await db.user.findUnique({ where: { id: session.user.id } });
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Gate: agentComposition is a Growth+ feature
  const access = await checkFeatureAccess(user, 'agentComposition');
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

  // No body or invalid JSON — analyze all workflows.
  const parsedBody = portfolioSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsedBody.success) {
    return NextResponse.json(
      { error: 'Invalid request body', fields: invalidFieldPaths(parsedBody.error) },
      { status: 400 },
    );
  }
  const workflowIds = parsedBody.data.workflowIds;

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
    reportApiError('/api/agent-intelligence/portfolio', 500);
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 });
  }
}

export const POST = withApiRoute('/api/agent-intelligence/portfolio', handlePOST);
