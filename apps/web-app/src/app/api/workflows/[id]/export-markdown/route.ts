import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { renderProcessMapMarkdown, renderSOPMarkdown } from '@ledgerium/process-engine';

/**
 * GET /api/workflows/[id]/export-markdown?artifactType=template_sop_enterprise
 *
 * Renders a stored template artifact to Markdown and returns it as a download.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const artifactType = req.nextUrl.searchParams.get('artifactType');
  if (!artifactType || !artifactType.startsWith('template_')) {
    return NextResponse.json({ error: 'artifactType query parameter required' }, { status: 400 });
  }

  // Verify workflow ownership
  const workflow = await db.workflow.findFirst({
    where: { id: params.id, userId: session.user.id },
    select: { id: true, title: true },
  });
  if (!workflow) {
    return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
  }

  // Find the template artifact
  const artifact = await db.workflowArtifact.findFirst({
    where: { workflowId: params.id, artifactType },
  });
  if (!artifact?.contentJson) {
    return NextResponse.json({ error: 'Template artifact not found' }, { status: 404 });
  }

  const content = JSON.parse(artifact.contentJson);
  let markdown: string;

  if (artifactType.startsWith('template_process_map_')) {
    markdown = renderProcessMapMarkdown(content);
  } else if (artifactType.startsWith('template_sop_')) {
    markdown = renderSOPMarkdown(content);
  } else {
    return NextResponse.json({ error: 'Unsupported artifact type' }, { status: 400 });
  }

  const slug = workflow.title.replace(/\s+/g, '-').toLowerCase();
  const templateName = artifactType.replace('template_process_map_', '').replace('template_sop_', '');
  const filename = `${slug}-${templateName}.md`;

  return new NextResponse(markdown, {
    status: 200,
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
