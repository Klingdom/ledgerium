import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { checkFeatureAccess } from '@/lib/feature-gating';
import { transformWorkflow, analyzePortfolio } from '@ledgerium/agent-intelligence';
import type { TransformationResult } from '@ledgerium/agent-intelligence';
import type { ProcessOutput } from '@ledgerium/process-engine';
import { z } from 'zod';

const compareSchema = z.object({
  workflowIds: z.array(z.string()).min(2, 'At least 2 workflow IDs are required'),
});

/**
 * POST /api/analytics/compare
 * Run cross-workflow comparison analysis on 2+ workflows.
 * Requires crossWorkflowComparison feature (Growth+).
 *
 * Body: { workflowIds: string[] }
 * Returns: CrossWorkflowIntelligence with shared skills, patterns, and portfolio summary.
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

  // Gate: cross-workflow comparison is a Growth+ feature
  const access = checkFeatureAccess(user, 'crossWorkflowComparison');
  if (!access.allowed) {
    return NextResponse.json(
      {
        error: 'Feature not available on your plan',
        feature: 'crossWorkflowComparison',
        requiredPlan: access.requiredPlan,
        upgradeUrl: '/pricing',
      },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = compareSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request body', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { workflowIds } = parsed.data;

  // Load all specified workflows — enforce ownership
  const workflows = await db.workflow.findMany({
    where: {
      id: { in: workflowIds },
      userId: user.id,
      status: 'active',
    },
    include: {
      artifacts: {
        where: { artifactType: 'process_output' },
        select: { contentJson: true },
      },
    },
  });

  // Ensure all requested IDs were found and owned by this user
  const foundIds = new Set(workflows.map((w) => w.id));
  const missingIds = workflowIds.filter((id) => !foundIds.has(id));
  if (missingIds.length > 0) {
    return NextResponse.json(
      { error: 'One or more workflows not found', missingIds },
      { status: 404 },
    );
  }

  // Build TransformationResult array from process_output artifacts
  const results: TransformationResult[] = [];
  const skipped: string[] = [];

  for (const workflow of workflows) {
    const artifactJson = workflow.artifacts[0]?.contentJson;
    if (!artifactJson) {
      skipped.push(workflow.id);
      continue;
    }
    try {
      const processOutput = JSON.parse(artifactJson) as ProcessOutput;
      results.push(transformWorkflow(processOutput));
    } catch {
      skipped.push(workflow.id);
    }
  }

  if (results.length < 2) {
    return NextResponse.json(
      {
        error: 'At least 2 workflows with valid process output are required for comparison',
        skipped,
      },
      { status: 422 },
    );
  }

  try {
    const comparison = analyzePortfolio(results);
    return NextResponse.json({
      data: comparison,
      meta: {
        workflowCount: results.length,
        skipped: skipped.length > 0 ? skipped : undefined,
      },
    });
  } catch (err) {
    console.error('Cross-workflow comparison failed:', err);
    return NextResponse.json({ error: 'Comparison analysis failed' }, { status: 500 });
  }
}
