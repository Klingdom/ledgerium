import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';

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
    include: { artifacts: true },
  });

  if (!workflow) {
    return NextResponse.json({ error: 'Workflow not found or sharing disabled' }, { status: 404 });
  }

  // Increment view count (non-critical, fire-and-forget)
  db.workflow.update({
    where: { id: workflow.id },
    data: { viewCount: { increment: 1 } } as any,
  }).catch(() => {});

  // Only return SOP and report artifacts — not raw evidence or source bundle
  const sopArtifact = workflow.artifacts.find(a => a.artifactType === 'sop');
  const reportArtifact = workflow.artifacts.find(a => a.artifactType === 'workflow_report');

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
