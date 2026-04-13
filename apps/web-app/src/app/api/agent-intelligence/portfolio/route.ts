import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { analyzePortfolioAgentIntelligence } from '@/lib/agent-intelligence';

/**
 * POST /api/agent-intelligence/portfolio
 * Run cross-workflow intelligence analysis on the user's workflow portfolio.
 * Optionally accepts { workflowIds: string[] } in the body to scope analysis.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
