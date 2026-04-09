import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import type { Prisma } from '@prisma/client';

// ── Per-workflow intelligence computation ────────────────────────────────────

type HealthStatus = 'healthy' | 'needs_review' | 'high_variation' | 'stale' | 'new';
type SopReadiness = 'ready' | 'partial' | 'not_ready';
type RiskLevel = 'high' | 'medium' | 'low';
type BottleneckRisk = 'high' | 'medium' | 'low' | 'none';

const STALE_CREATED_DAYS = 30;
const STALE_VIEWED_DAYS = 14;
const NEW_WORKFLOW_DAYS = 7;

function computeVariationScore(
  confidence: number | null,
  processDefinition: { variantCount: number; stabilityScore: number | null } | null,
): number {
  if (processDefinition && processDefinition.variantCount > 0) {
    // More variants = higher variation; cap at 1
    const raw = Math.min(processDefinition.variantCount / 10, 1);
    // Blend with inverse stability if available
    if (processDefinition.stabilityScore != null) {
      return Math.round(((raw + (1 - processDefinition.stabilityScore)) / 2) * 100) / 100;
    }
    return Math.round(raw * 100) / 100;
  }
  // Derive from confidence: low confidence implies higher variation
  if (confidence != null) {
    return Math.round((1 - confidence) * 100) / 100;
  }
  return 0.5; // unknown defaults to middle
}

function computeSopReadiness(confidence: number | null, stepCount: number | null): SopReadiness {
  if (stepCount == null || stepCount === 0) return 'not_ready';
  if (confidence != null && confidence > 0.8) return 'ready';
  if (confidence != null && confidence > 0.5 && stepCount > 0) return 'partial';
  return 'not_ready';
}

function computeOptimizationPotential(
  durationMs: number | null,
  stepCount: number | null,
  confidence: number | null,
): RiskLevel {
  let score = 0;

  // High step count suggests optimization opportunity
  if (stepCount != null && stepCount > 15) score += 2;
  else if (stepCount != null && stepCount > 8) score += 1;

  // Long duration suggests inefficiency
  if (durationMs != null && durationMs > 300_000) score += 2; // > 5 min
  else if (durationMs != null && durationMs > 120_000) score += 1; // > 2 min

  // Low confidence suggests inconsistent process
  if (confidence != null && confidence < 0.5) score += 1;

  if (score >= 4) return 'high';
  if (score >= 2) return 'medium';
  return 'low';
}

function computeDocumentationCompleteness(
  description: string | null,
  toolsUsed: string | null,
  tagCount: number,
): number {
  let score = 0;
  const maxScore = 4;

  // Description presence and quality
  if (description && description.length > 0) {
    score += 1;
    if (description.length > 50) score += 1; // meaningful description
  }

  // Tools documented
  if (toolsUsed) {
    try {
      const tools = JSON.parse(toolsUsed);
      if (Array.isArray(tools) && tools.length > 0) score += 1;
    } catch {
      // malformed JSON, no credit
    }
  }

  // Tags applied
  if (tagCount > 0) score += 1;

  return Math.round((score / maxScore) * 100);
}

function computeIsStale(createdAt: Date, lastViewedAt: Date | null): boolean {
  const now = Date.now();
  const createdDaysAgo = (now - createdAt.getTime()) / (1000 * 60 * 60 * 24);
  if (createdDaysAgo <= STALE_CREATED_DAYS) return false;

  if (lastViewedAt == null) return true;
  const viewedDaysAgo = (now - lastViewedAt.getTime()) / (1000 * 60 * 60 * 24);
  return viewedDaysAgo > STALE_VIEWED_DAYS;
}

function computeBottleneckRisk(
  stepCount: number | null,
  durationMs: number | null,
): BottleneckRisk {
  if (stepCount == null && durationMs == null) return 'none';

  const isHighSteps = stepCount != null && stepCount > 20;
  const isHighDuration = durationMs != null && durationMs > 600_000; // > 10 min
  const isMedSteps = stepCount != null && stepCount > 10;
  const isMedDuration = durationMs != null && durationMs > 180_000; // > 3 min

  if (isHighSteps && isHighDuration) return 'high';
  if (isHighSteps || isHighDuration) return 'medium';
  if (isMedSteps || isMedDuration) return 'low';
  return 'none';
}

function computeHealthStatus(
  createdAt: Date,
  isStale: boolean,
  variationScore: number,
  confidence: number | null,
  sopReadiness: SopReadiness,
): HealthStatus {
  const now = Date.now();
  const daysSinceCreated = (now - createdAt.getTime()) / (1000 * 60 * 60 * 24);

  if (daysSinceCreated <= NEW_WORKFLOW_DAYS) return 'new';
  if (isStale) return 'stale';
  if (variationScore > 0.7) return 'high_variation';
  if (confidence != null && confidence < 0.5) return 'needs_review';
  if (sopReadiness === 'not_ready') return 'needs_review';
  return 'healthy';
}

// ── Lightweight interpretation-derived fields ────────────────────────────────

function computeProcessType(
  toolsUsed: string | null,
  stepCount: number | null,
  description: string | null,
): string {
  // Lightweight heuristic classifier based on observable signals
  const desc = (description ?? '').toLowerCase();
  const toolCount = toolsUsed ? (() => {
    try {
      const parsed = JSON.parse(toolsUsed);
      return Array.isArray(parsed) ? parsed.length : 0;
    } catch { return 0; }
  })() : 0;

  // Keyword-based classification from description
  if (desc.includes('approv') || desc.includes('sign off') || desc.includes('authorize')) return 'approval';
  if (desc.includes('review') || desc.includes('audit') || desc.includes('check')) return 'review';
  if (desc.includes('exception') || desc.includes('error') || desc.includes('escalat')) return 'exception_handling';
  if (desc.includes('collect') || desc.includes('gather') || desc.includes('survey') || desc.includes('form')) return 'data_collection';
  if (desc.includes('research') || desc.includes('investigat') || desc.includes('analyz')) return 'research';

  // Signal-based fallbacks
  if (toolCount >= 3) return 'coordination';
  if (stepCount != null && stepCount <= 5) return 'transaction';

  return 'general';
}

function computeComplexityScore(
  stepCount: number | null,
  toolsUsed: string | null,
  durationMs: number | null,
): number {
  let score = 0;

  // Step count contribution (0-40 points)
  if (stepCount != null) {
    score += Math.min(Math.round((stepCount / 30) * 40), 40);
  }

  // System count contribution (0-30 points)
  const toolCount = toolsUsed ? (() => {
    try {
      const parsed = JSON.parse(toolsUsed);
      return Array.isArray(parsed) ? parsed.length : 0;
    } catch { return 0; }
  })() : 0;
  score += Math.min(Math.round((toolCount / 5) * 30), 30);

  // Duration contribution (0-30 points)
  if (durationMs != null) {
    // 10 minutes = full 30 points
    score += Math.min(Math.round((durationMs / 600_000) * 30), 30);
  }

  return Math.min(score, 100);
}

// ── Helpers for system extraction ────────────────────────────────────────────

function extractSystems(workflows: Array<{ toolsUsed: string | null }>): Array<{ system: string; workflowCount: number }> {
  const systemMap = new Map<string, number>();

  for (const w of workflows) {
    if (!w.toolsUsed) continue;
    try {
      const tools = JSON.parse(w.toolsUsed);
      if (Array.isArray(tools)) {
        for (const tool of tools) {
          if (typeof tool === 'string' && tool.length > 0) {
            systemMap.set(tool, (systemMap.get(tool) ?? 0) + 1);
          }
        }
      }
    } catch {
      // skip malformed
    }
  }

  return Array.from(systemMap.entries())
    .map(([system, workflowCount]) => ({ system, workflowCount }))
    .sort((a, b) => b.workflowCount - a.workflowCount);
}

// ── Route handler ────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const params = req.nextUrl.searchParams;
  const search = params.get('search') ?? '';
  const sortBy = params.get('sort') ?? 'created_at';
  const sortDir = (params.get('dir') ?? 'desc') as 'asc' | 'desc';
  const toolFilter = params.get('tool') ?? '';
  const status = params.get('status') ?? 'active';
  const tagFilter = params.get('tag') ?? '';

  // New filter params
  const healthFilter = params.get('health') ?? '';
  const sopReadinessFilter = params.get('sopReadiness') ?? '';
  const staleFilter = params.get('stale') ?? '';
  const minConfidence = params.get('minConfidence') ? parseFloat(params.get('minConfidence')!) : null;
  const maxConfidence = params.get('maxConfidence') ? parseFloat(params.get('maxConfidence')!) : null;
  const minSteps = params.get('minSteps') ? parseInt(params.get('minSteps')!, 10) : null;
  const maxSteps = params.get('maxSteps') ? parseInt(params.get('maxSteps')!, 10) : null;

  // ── Build Prisma where clause ──────────────────────────────────────────

  const where: Prisma.WorkflowWhereInput = {
    userId: session.user.id,
    status,
  };

  if (search) {
    where.title = { contains: search };
  }

  if (toolFilter) {
    where.toolsUsed = { contains: toolFilter };
  }

  if (tagFilter) {
    where.tags = { some: { tagId: tagFilter } };
  }

  // Confidence range filters (applied at DB level)
  if (minConfidence != null || maxConfidence != null) {
    const confidenceFilter: Prisma.FloatNullableFilter = {};
    if (minConfidence != null) confidenceFilter.gte = minConfidence;
    if (maxConfidence != null) confidenceFilter.lte = maxConfidence;
    where.confidence = confidenceFilter;
  }

  // Step count range filters (applied at DB level)
  if (minSteps != null || maxSteps != null) {
    const stepFilter: Prisma.IntNullableFilter = {};
    if (minSteps != null) stepFilter.gte = minSteps;
    if (maxSteps != null) stepFilter.lte = maxSteps;
    where.stepCount = stepFilter;
  }

  // ── Sort mapping ───────────────────────────────────────────────────────

  const orderByField =
    sortBy === 'title' ? 'title' :
    sortBy === 'step_count' ? 'stepCount' :
    sortBy === 'last_viewed' ? 'lastViewedAt' :
    sortBy === 'views' ? 'viewCount' :
    sortBy === 'confidence' ? 'confidence' :
    sortBy === 'duration' ? 'durationMs' :
    'createdAt';

  // ── Query ──────────────────────────────────────────────────────────────

  const [results, insightCount] = await Promise.all([
    db.workflow.findMany({
      where,
      orderBy: { [orderByField]: sortDir },
      include: {
        tags: { include: { tag: true } },
        processDefinition: true,
      },
    }),
    db.processInsight.count({
      where: { userId: session.user.id, dismissed: false },
    }),
  ]);

  // ── Enrich each workflow ───────────────────────────────────────────────

  const now = Date.now();
  const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;

  const enrichedWorkflows = results.map((w) => {
    const tagsMapped = w.tags.map((wt) => ({
      id: wt.tag.id,
      name: wt.tag.name,
      color: wt.tag.color,
    }));

    const parsedTools: string[] = w.toolsUsed ? (() => {
      try {
        const parsed = JSON.parse(w.toolsUsed!);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    })() : [];

    const variationScore = computeVariationScore(w.confidence, w.processDefinition);
    const sopReadiness = computeSopReadiness(w.confidence, w.stepCount);
    const optimizationPotential = computeOptimizationPotential(w.durationMs, w.stepCount, w.confidence);
    const documentationCompleteness = computeDocumentationCompleteness(
      w.description, w.toolsUsed, w.tags.length,
    );
    const isStale = computeIsStale(w.createdAt, w.lastViewedAt);
    const bottleneckRisk = computeBottleneckRisk(w.stepCount, w.durationMs);
    const healthStatus = computeHealthStatus(
      w.createdAt, isStale, variationScore, w.confidence, sopReadiness,
    );
    const processType = computeProcessType(w.toolsUsed, w.stepCount, w.description);
    const complexityScore = computeComplexityScore(w.stepCount, w.toolsUsed, w.durationMs);

    // Exclude processDefinition relation from spread to keep response clean
    const { processDefinition: _pd, tags: _tags, ...workflowBase } = w;

    return {
      ...workflowBase,
      toolsUsed: parsedTools,
      tags: tagsMapped,
      // Enriched intelligence fields
      variationScore,
      sopReadiness,
      optimizationPotential,
      documentationCompleteness,
      isStale,
      bottleneckRisk,
      healthStatus,
      processType,
      complexityScore,
      // Include processDefinition summary if present
      processDefinition: w.processDefinition ? {
        id: w.processDefinition.id,
        canonicalName: w.processDefinition.canonicalName,
        variantCount: w.processDefinition.variantCount,
        runCount: w.processDefinition.runCount,
        stabilityScore: w.processDefinition.stabilityScore,
        confidenceScore: w.processDefinition.confidenceScore,
      } : null,
    };
  });

  // ── Post-query filters (computed fields not in DB) ─────────────────────

  let filteredWorkflows = enrichedWorkflows;

  if (healthFilter) {
    filteredWorkflows = filteredWorkflows.filter((w) => w.healthStatus === healthFilter);
  }

  if (sopReadinessFilter) {
    filteredWorkflows = filteredWorkflows.filter((w) => w.sopReadiness === sopReadinessFilter);
  }

  if (staleFilter === 'true') {
    filteredWorkflows = filteredWorkflows.filter((w) => w.isStale);
  }

  // ── Post-query sorting for computed fields ─────────────────────────────

  if (sortBy === 'optimization') {
    const potentialOrder: Record<string, number> = { high: 3, medium: 2, low: 1 };
    filteredWorkflows.sort((a, b) => {
      const diff = (potentialOrder[b.optimizationPotential] ?? 0) - (potentialOrder[a.optimizationPotential] ?? 0);
      return sortDir === 'desc' ? diff : -diff;
    });
  }

  if (sortBy === 'variation') {
    filteredWorkflows.sort((a, b) => {
      const diff = b.variationScore - a.variationScore;
      return sortDir === 'desc' ? diff : -diff;
    });
  }

  // ── Compute executive stats from full enriched set ─────────────────────

  const allEnriched = enrichedWorkflows; // stats always computed from full set, not filtered subset

  const totalWorkflows = allEnriched.length;

  const recordedThisWeek = allEnriched.filter(
    (w) => w.createdAt.getTime() >= oneWeekAgo,
  ).length;

  const needsReview = allEnriched.filter(
    (w) => w.healthStatus === 'needs_review' || w.healthStatus === 'high_variation',
  ).length;

  const sopReady = allEnriched.filter(
    (w) => w.sopReadiness === 'ready',
  ).length;

  const confidenceValues = allEnriched
    .map((w) => w.confidence)
    .filter((c): c is number => c != null);
  const avgConfidence = confidenceValues.length > 0
    ? Math.round((confidenceValues.reduce((sum, c) => sum + c, 0) / confidenceValues.length) * 100) / 100
    : 0;

  const durationValues = allEnriched
    .map((w) => w.durationMs)
    .filter((d): d is number => d != null);
  const avgDuration = durationValues.length > 0
    ? Math.round(durationValues.reduce((sum, d) => sum + d, 0) / durationValues.length)
    : 0;

  const stepValues = allEnriched
    .map((w) => w.stepCount)
    .filter((s): s is number => s != null);
  const avgStepCount = stepValues.length > 0
    ? Math.round((stepValues.reduce((sum, s) => sum + s, 0) / stepValues.length) * 10) / 10
    : 0;

  const optimizationOpportunities = allEnriched.filter(
    (w) => w.optimizationPotential === 'high',
  ).length;

  const favoriteCount = allEnriched.filter((w) => w.isFavorite).length;

  const staleCount = allEnriched.filter((w) => w.isStale).length;

  const recentlyViewed = allEnriched
    .filter((w) => w.lastViewedAt != null)
    .sort((a, b) => new Date(b.lastViewedAt!).getTime() - new Date(a.lastViewedAt!).getTime())
    .slice(0, 3);

  const systemCoverage = extractSystems(results);

  return NextResponse.json({
    workflows: filteredWorkflows,
    stats: {
      totalWorkflows,
      recordedThisWeek,
      needsReview,
      sopReady,
      avgConfidence,
      avgDuration,
      avgStepCount,
      optimizationOpportunities,
      insightCount,
      favoriteCount,
      staleCount,
      systemCoverage,
      // Backward-compatible fields
      recentlyViewedIds: recentlyViewed.map((w) => w.id),
    },
  });
}
