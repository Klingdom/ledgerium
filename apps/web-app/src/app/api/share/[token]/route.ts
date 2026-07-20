import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { trackServer } from '@/lib/analytics-server';
import { findLatestArtifact, LATEST_ARTIFACT_ORDER_BY } from '@/lib/artifacts';

/**
 * GET /api/share/{token}
 *
 * Public endpoint — no auth required.
 * Returns a read-only view of a shared workflow's SOP and report.
 * Only works if the workflow has a valid shareToken.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { token: string } },
) {
  // shareToken is a new schema field; use raw query filter via 'where' cast
  const workflow = await db.workflow.findFirst({
    where: {
      shareToken: params.token,
      status: 'active',
    } as any,
    // B-3: order deterministically; findLatestArtifact below re-derives this
    // anyway, but ordering here keeps the two in agreement.
    include: { artifacts: { orderBy: LATEST_ARTIFACT_ORDER_BY } },
  });

  if (!workflow) {
    return NextResponse.json({ error: 'Workflow not found or sharing disabled' }, { status: 404 });
  }

  // Increment view count (non-critical, fire-and-forget)
  db.workflow.update({
    where: { id: workflow.id },
    data: { viewCount: { increment: 1 } } as any,
  }).catch(() => {});

  // Only return SOP and report artifacts — not raw evidence or source bundle.
  // B-3: select the current row deterministically rather than whichever one
  // happens to be first.
  const sopArtifact = findLatestArtifact(workflow.artifacts, 'sop');
  const reportArtifact = findLatestArtifact(workflow.artifacts, 'workflow_report');

  trackServer('shared_workflow_viewed', {
    token: params.token,
    workflowId: workflow.id,
    ownerId: workflow.userId,
  });

  return NextResponse.json({
    workflow: {
      title: workflow.title,
      stepCount: workflow.stepCount,
      durationMs: workflow.durationMs,
      phaseCount: workflow.phaseCount,
      confidence: workflow.confidence,
      toolsUsed: workflow.toolsUsed ? JSON.parse(workflow.toolsUsed) : [],
      createdAt: workflow.createdAt,
    },
    sop: sopArtifact?.contentJson ? JSON.parse(sopArtifact.contentJson) : null,
    report: reportArtifact?.contentJson ? JSON.parse(reportArtifact.contentJson) : null,
  });
}
