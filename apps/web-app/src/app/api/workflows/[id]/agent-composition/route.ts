import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { checkFeatureAccess } from '@/lib/feature-gating';
import { transformWorkflow } from '@ledgerium/agent-intelligence';
import type { ProcessOutput } from '@ledgerium/process-engine';

/**
 * GET /api/workflows/[id]/agent-composition
 * Returns AI agent profiles composed from the workflow's process output.
 * Requires agentComposition feature (Growth+).
 *
 * If an 'agent_intelligence' artifact is already stored for the workflow, it
 * is returned directly. Otherwise the pipeline is run on demand.
 *
 * Returns: { data: { agents: AgentProfile[], workflowId: string } }
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

  // Gate: agent composition is a Growth+ feature
  const access = checkFeatureAccess(user, 'agentComposition');
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

  // Verify workflow ownership
  const workflow = await db.workflow.findFirst({
    where: { id: params.id, userId: user.id, status: 'active' },
    include: {
      artifacts: {
        where: { artifactType: { in: ['process_output', 'agent_intelligence'] } },
        select: { artifactType: true, contentJson: true },
      },
    },
  });

  if (!workflow) {
    return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
  }

  // Return cached agent_intelligence artifact if available.
  // The stored artifact is expected to be an AgentComposition object.
  const cachedArtifact = workflow.artifacts.find(
    (a) => a.artifactType === 'agent_intelligence',
  );
  if (cachedArtifact?.contentJson) {
    try {
      const cached = JSON.parse(cachedArtifact.contentJson) as Record<string, unknown>;
      return NextResponse.json({
        data: { ...cached, workflowId: params.id },
        meta: { source: 'cached' },
      });
    } catch {
      // Fall through to recompute if cached artifact is malformed
    }
  }

  // Compute on demand from process_output artifact
  const processArtifact = workflow.artifacts.find(
    (a) => a.artifactType === 'process_output',
  );
  if (!processArtifact?.contentJson) {
    return NextResponse.json(
      { error: 'No process output available for agent composition' },
      { status: 422 },
    );
  }

  let processOutput: ProcessOutput;
  try {
    processOutput = JSON.parse(processArtifact.contentJson) as ProcessOutput;
  } catch {
    return NextResponse.json(
      { error: 'Process output artifact is malformed' },
      { status: 422 },
    );
  }

  try {
    const transformationResult = transformWorkflow(processOutput);
    const { agentComposition } = transformationResult;

    return NextResponse.json({
      data: {
        agents: agentComposition.agents,
        agentCount: agentComposition.agentCount,
        collaborations: agentComposition.collaborations,
        coverageRatio: agentComposition.coverageRatio,
        roleDistribution: agentComposition.roleDistribution,
        workflowId: params.id,
      },
      meta: { source: 'computed' },
    });
  } catch (err) {
    console.error('Agent composition failed:', err);
    return NextResponse.json({ error: 'Agent composition failed' }, { status: 500 });
  }
}
