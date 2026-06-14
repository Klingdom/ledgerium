import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { analyzeWorkflowVariants } from '@/lib/intelligence';
import { db } from '@/db';
import { checkFeatureAccess } from '@/lib/feature-gating';

/**
 * POST /api/workflows/[id]/analyze
 * Run intelligence analysis across the workflow's full run COHORT (the persisted
 * process-definition group ∪ similarity cluster ∪ self) — the same cross-run
 * analysis the Variants tab uses — so the Report's variance/variant figures
 * reflect every run, not just the single open recording. A genuinely single-run
 * workflow falls back to one bundle (runCount 1) so the honest "recorded once"
 * state still fires. Requires intelligenceLayer feature (Team+).
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

  const workflow = await db.workflow.findFirst({
    where: { id: params.id, userId: session.user.id },
  });

  if (!workflow) {
    return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
  }

  try {
    const intelligence = await analyzeWorkflowVariants(session.user.id, params.id);
    if (!intelligence) {
      return NextResponse.json({ error: 'No process output available for analysis' }, { status: 422 });
    }

    return NextResponse.json({ intelligence });
  } catch (err) {
    console.error('Workflow analysis failed:', err);
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 });
  }
}
