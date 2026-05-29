import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { ensureSampleWorkflow } from '@/lib/sample-workflow';

/**
 * POST /api/sample-workflow
 *
 * Creates the built-in sample workflow ("Create Purchase Order") for the
 * signed-in user so they can immediately explore an SOP, process map, and
 * report without recording first. Idempotent — returns the existing one if
 * already present. Sample data + creation logic live in @/lib/sample-workflow.
 */
export async function POST(_req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await ensureSampleWorkflow(session.user.id);
  if (!result) {
    return NextResponse.json(
      { error: 'Failed to create sample workflow' },
      { status: 500 },
    );
  }

  return NextResponse.json({ id: result.id, alreadyExists: !result.created });
}
