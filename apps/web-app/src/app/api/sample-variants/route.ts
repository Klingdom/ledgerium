import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { ensureSampleVariants } from '@/lib/sample-variants';

/**
 * POST /api/sample-variants
 *
 * Creates the built-in sample VARIANT set ("Approve Expense Report") — one process
 * recorded 8 different ways — so the signed-in user can immediately explore the
 * Process Variants tab (branch map, decision points, Variant DNA, evidence drill).
 * Idempotent — returns the existing set if already present.
 */
export async function POST(_req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await ensureSampleVariants(session.user.id);
  if (!result) {
    return NextResponse.json(
      { error: 'Failed to create sample variant set' },
      { status: 500 },
    );
  }

  return NextResponse.json({ id: result.id, alreadyExists: !result.created, count: result.count });
}
