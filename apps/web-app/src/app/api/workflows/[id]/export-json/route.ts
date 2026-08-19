import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { requireFeature } from '@/lib/feature-gating';
import { LATEST_ARTIFACT_ORDER_BY } from '@/lib/artifacts';

/**
 * GET /api/workflows/[id]/export-json
 *
 * Returns the complete process_output artifact for a workflow as a
 * downloadable JSON file.
 *
 * Access: Starter+ only (cleanExports feature).
 * Free-tier users receive a 403 with upgrade details.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Fetch full user record — requireFeature expects a User object.
  const user = await db.user.findUnique({
    where: { id: session.user.id },
  });
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Gate: Starter+ only. requireFeature throws a NextResponse for free-tier users.
  // Catch it and return rather than letting it propagate as an unhandled rejection.
  try {
    await requireFeature(user, 'cleanExports');
  } catch (thrown: unknown) {
    if (thrown instanceof NextResponse) return thrown;
    throw thrown;
  }

  // Verify workflow ownership
  const workflow = await db.workflow.findFirst({
    where: { id: params.id, userId: session.user.id },
    select: { id: true, title: true },
  });
  if (!workflow) {
    return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
  }

  // Retrieve the process_output artifact. B-3: order deterministically and
  // take the newest — see @/lib/artifacts for why a uniqueness constraint is
  // not the fix here.
  const artifact = await db.workflowArtifact.findFirst({
    where: {
      workflowId: params.id,
      artifactType: 'process_output',
    },
    orderBy: LATEST_ARTIFACT_ORDER_BY,
    select: { contentJson: true },
  });
  if (!artifact?.contentJson) {
    return NextResponse.json(
      { error: 'Process output artifact not found for this workflow' },
      { status: 404 },
    );
  }

  // Sanitize filename: only alphanumerics, hyphens, and underscores.
  const safeFilename = workflow.title.replace(/[^a-zA-Z0-9-_]/g, '_');

  return new NextResponse(artifact.contentJson, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="${safeFilename}.json"`,
    },
  });
}
