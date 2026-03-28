import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { analyzeUserPortfolio, clusterWorkflows } from '@/lib/intelligence';
import { db } from '@/db';

/**
 * POST /api/analytics
 * Run portfolio-level intelligence analysis for the current user.
 * Optionally accepts { workflowIds: string[] } to analyze a subset.
 * Also triggers auto-clustering into process definitions.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    const body = await req.json().catch(() => ({}));
    const workflowIds = (body as Record<string, unknown>).workflowIds as string[] | undefined;

    // Run clustering first to create/update process definitions
    await clusterWorkflows(userId);

    // Run portfolio analysis
    const intelligence = await analyzeUserPortfolio(userId, workflowIds);
    if (!intelligence) {
      return NextResponse.json({
        error: 'No analyzable workflows found',
      }, { status: 404 });
    }

    // Load process definitions for this user
    const definitions = await db.processDefinition.findMany({
      where: { userId },
      orderBy: { runCount: 'desc' },
      select: {
        id: true,
        canonicalName: true,
        pathSignature: true,
        runCount: true,
        variantCount: true,
        avgDurationMs: true,
        medianDurationMs: true,
        stabilityScore: true,
        confidenceScore: true,
        analyzedAt: true,
      },
    });

    // Load recent insights
    const insights = await db.processInsight.findMany({
      where: { userId, dismissed: false },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return NextResponse.json({
      intelligence,
      definitions,
      insights: insights.map((i) => ({
        ...i,
        evidenceJson: i.evidenceJson ? JSON.parse(i.evidenceJson) : null,
        affectedRunIds: i.affectedRunIds ? JSON.parse(i.affectedRunIds) : [],
      })),
    });
  } catch (err) {
    console.error('Analytics failed:', err);
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 });
  }
}

/**
 * GET /api/analytics
 * Get cached intelligence summary without re-running analysis.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;

  const definitions = await db.processDefinition.findMany({
    where: { userId },
    orderBy: { runCount: 'desc' },
  });

  const insights = await db.processInsight.findMany({
    where: { userId, dismissed: false },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  const totalWorkflows = await db.workflow.count({
    where: { userId, status: 'active' },
  });

  return NextResponse.json({
    totalWorkflows,
    totalDefinitions: definitions.length,
    totalInsights: insights.length,
    definitions: definitions.map((d) => ({
      ...d,
      intelligenceJson: undefined, // don't send full intelligence on list
    })),
    insights: insights.map((i) => ({
      ...i,
      evidenceJson: i.evidenceJson ? JSON.parse(i.evidenceJson) : null,
      affectedRunIds: i.affectedRunIds ? JSON.parse(i.affectedRunIds) : [],
    })),
  });
}
