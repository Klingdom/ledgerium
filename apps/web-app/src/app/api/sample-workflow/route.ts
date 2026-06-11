import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { ensureSampleWorkflow } from '@/lib/sample-workflow';
import { ensureSampleVariants } from '@/lib/sample-variants';

/**
 * POST /api/sample-workflow
 *
 * Creates the built-in sample workflows for the signed-in user so they can
 * immediately explore the product without recording first:
 *  - "Create Purchase Order" — SOP / process map / report.
 *  - "Approve Expense Report" recorded 8 ways — the Process Variants tab.
 * Idempotent — returns the existing PO sample if already present.
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

  // Also populate the variant sample set (non-fatal — never throws).
  await ensureSampleVariants(session.user.id);

  return NextResponse.json({ id: result.id, alreadyExists: !result.created });
}
