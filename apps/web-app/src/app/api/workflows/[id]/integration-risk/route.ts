import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { checkFeatureAccess } from '@/lib/feature-gating';
import { transformWorkflow } from '@ledgerium/agent-intelligence';
import type { ProcessOutput } from '@ledgerium/process-engine';

/**
 * GET /api/workflows/[id]/integration-risk
 * Returns the integration risk assessment for a workflow's process map.
 * Requires integrationRisk feature (Growth+).
 *
 * Returns: { data: IntegrationRiskAnalysis, meta: { workflowId, source } }
 */
export async function GET(
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

  // Gate: integration risk analysis is a Growth+ feature
  const access = checkFeatureAccess(user, 'integrationRisk');
  if (!access.allowed) {
    return NextResponse.json(
      {
        error: 'Feature not available on your plan',
        feature: 'integrationRisk',
        requiredPlan: access.requiredPlan,
        upgradeUrl: '/pricing',
      },
      { status: 403 },
    );
  }

  // Verify workflow ownership and load process_output artifact
  const workflow = await db.workflow.findFirst({
    where: { id: params.id, userId: user.id, status: 'active' },
    include: {
      artifacts: {
        where: { artifactType: 'process_output' },
        select: { contentJson: true },
      },
    },
  });

  if (!workflow) {
    return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
  }

  const artifactJson = workflow.artifacts[0]?.contentJson;
  if (!artifactJson) {
    return NextResponse.json(
      { error: 'No process output available for integration risk analysis' },
      { status: 422 },
    );
  }

  let processOutput: ProcessOutput;
  try {
    processOutput = JSON.parse(artifactJson) as ProcessOutput;
  } catch {
    return NextResponse.json(
      { error: 'Process output artifact is malformed' },
      { status: 422 },
    );
  }

  try {
    const transformationResult = transformWorkflow(processOutput);
    const { integrationRisk } = transformationResult;

    return NextResponse.json({
      data: integrationRisk,
      meta: { workflowId: params.id },
    });
  } catch (err) {
    console.error('Integration risk analysis failed:', err);
    return NextResponse.json({ error: 'Integration risk analysis failed' }, { status: 500 });
  }
}
