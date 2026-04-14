import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { checkFeatureAccess } from '@/lib/feature-gating';
import { generateBpmnXml } from '@/lib/bpmn-export';
import type { ProcessOutput } from '@ledgerium/process-engine';

/**
 * GET /api/workflows/[id]/export-bpmn
 * Export the workflow's process map as a BPMN 2.0 XML file.
 * Requires priorityExports feature (Growth+).
 *
 * Returns: BPMN 2.0 XML with Content-Disposition: attachment header.
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

  // Gate: BPMN export is a Growth+ (priorityExports) feature
  const access = checkFeatureAccess(user, 'priorityExports');
  if (!access.allowed) {
    return NextResponse.json(
      {
        error: 'Feature not available on your plan',
        feature: 'priorityExports',
        requiredPlan: access.requiredPlan,
        upgradeUrl: '/pricing',
      },
      { status: 403 },
    );
  }

  // Verify workflow ownership and load process_output artifact
  const workflow = await db.workflow.findFirst({
    where: { id: params.id, userId: user.id, status: 'active' },
    select: {
      id: true,
      title: true,
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
      { error: 'No process output available for BPMN export' },
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

  const { processMap } = processOutput;
  if (!processMap) {
    return NextResponse.json(
      { error: 'Process map not available in process output' },
      { status: 422 },
    );
  }

  try {
    const bpmnXml = generateBpmnXml(processMap);

    // Build a safe filename from the workflow title
    const slug = workflow.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    const filename = `${slug}-process-map.bpmn`;

    return new NextResponse(bpmnXml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error('BPMN export failed:', err);
    return NextResponse.json({ error: 'BPMN export failed' }, { status: 500 });
  }
}
