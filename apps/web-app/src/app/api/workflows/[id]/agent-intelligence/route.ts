import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { analyzeWorkflowAgentIntelligence } from '@/lib/agent-intelligence';

/**
 * POST /api/workflows/[id]/agent-intelligence
 * Run agent intelligence analysis on a single workflow.
 * Returns the full TransformationResult.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
