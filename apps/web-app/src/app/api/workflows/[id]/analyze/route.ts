import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { analyzeWorkflow } from '@/lib/intelligence';
import { db } from '@/db';

/**
 * POST /api/workflows/[id]/analyze
 * Run intelligence analysis on a single workflow.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const workflow = await db.workflow.findFirst({
    where: { id: params.id, userId: session.user.id },
  });

  if (!workflow) {
    return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
  }

  try {
    const intelligence = await analyzeWorkflow(session.user.id, params.id);
    if (!intelligence) {
      return NextResponse.json({ error: 'No process output available for analysis' }, { status: 422 });
    }

    return NextResponse.json({ intelligence });
  } catch (err) {
    console.error('Workflow analysis failed:', err);
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 });
  }
}
