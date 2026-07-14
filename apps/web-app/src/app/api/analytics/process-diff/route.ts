import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { checkFeatureAccess } from '@/lib/feature-gating';
import {
  compareWorkflows,
  COMPARE_WORKFLOWS_ALGORITHM,
  type WorkflowCompareInput,
  type CompareStep,
  type ProcessDiffReport,
} from '@ledgerium/intelligence-engine';
import type { ProcessOutput } from '@ledgerium/process-engine';
import { z } from 'zod';

/**
 * POST /api/analytics/process-diff — T2 N-Way Process Diff
 * (Cross-Workflow Intelligence program; see
 * `docs/features/cross-workflow-intelligence/BUILD_SPEC.md` §5 T2).
 *
 * Loads each requested workflow's already-persisted `process_output` artifact
 * (same per-workflow grain + artifact shape `/api/analytics/compare` reads —
 * this route does NOT modify or replace that route), extracts its ordered
 * step sequence (category + title + durationMs, sorted by ordinal — the same
 * privacy-safe `category` key `computePathSignature()` uses in
 * `@ledgerium/intelligence-engine`), and runs the pure `compareWorkflows()`
 * step-level alignment engine over it. On-demand only — no persistence, no
 * clustering (BUILD_SPEC §3: "Compare (T2) — On-demand, bounded N (cap ~6),
 * no persistence").
 *
 * Gate: `intelligenceLayer` (Team+), matching the T1 `/api/analytics/
 * time-sinks` route's gating tier for cross-workflow-intelligence surfaces.
 *
 * Envelope: `{ data, error, meta }` per CLAUDE.md API Design.
 *   meta = { modelVersion, counts, computedAt, cacheHit: false, skipped?, missingIds? }
 *
 * A workflow with no usable per-step timing still participates fully in the
 * diff — its steps simply carry `durationMs: null` and every cell/delta that
 * depends on duration is honestly null (never fabricated), matching
 * `compareWorkflows()`'s own null-duration contract.
 */

const processDiffSchema = z.object({
  workflowIds: z
    .array(z.string())
    .min(2, 'At least 2 workflow IDs are required')
    .max(6, 'At most 6 workflow IDs are supported'),
  baselineId: z.string().optional(),
});

interface ProcessDiffErrorBody {
  code: string;
  message: string;
}

function buildMeta(
  counts: { requested: number; loaded: number; skipped: number },
  extra: Record<string, unknown> = {},
) {
  return {
    modelVersion: COMPARE_WORKFLOWS_ALGORITHM,
    counts,
    computedAt: new Date().toISOString(),
    cacheHit: false,
    ...extra,
  };
}

function errorResponse(
  body: ProcessDiffErrorBody,
  status: number,
  extra: Record<string, unknown> = {},
): NextResponse {
  return NextResponse.json(
    {
      data: null,
      error: body,
      meta: buildMeta({ requested: 0, loaded: 0, skipped: 0 }, extra),
    },
    { status },
  );
}

interface LoadedWorkflow {
  id: string;
  title: string;
  steps: CompareStep[];
}

/**
 * Extract an ordered `CompareStep[]` from a workflow's raw `process_output`
 * artifact JSON. Returns null on any structural failure (missing artifact,
 * invalid JSON, missing/malformed `stepDefinitions`) — never throws. The JSON
 * is only ever written by the process engine (never user-supplied), so this
 * is a defensive structural parse, not a full re-validation — matching the
 * `parseTimeSinkIntelligence` precedent in `/api/analytics/time-sinks`.
 */
function parseCompareSteps(raw: string | null | undefined): CompareStep[] | null {
  if (!raw) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  const output = parsed as Partial<ProcessOutput> | null;
  const stepDefinitions = output?.processDefinition?.stepDefinitions;
  if (!Array.isArray(stepDefinitions)) return null;

  return [...stepDefinitions]
    .sort((a, b) => a.ordinal - b.ordinal)
    .map((s) => ({
      key: s.category as string,
      label: s.title,
      durationMs: typeof s.durationMs === 'number' ? s.durationMs : null,
    }));
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return errorResponse({ code: 'UNAUTHORIZED', message: 'Authentication required.' }, 401);
  }

  const user = await db.user.findUnique({ where: { id: session.user.id } });
  if (!user) {
    return errorResponse({ code: 'USER_NOT_FOUND', message: 'User not found.' }, 404);
  }

  const access = checkFeatureAccess(user, 'intelligenceLayer');
  if (!access.allowed) {
    return NextResponse.json(
      {
        data: null,
        error: {
          code: 'FEATURE_NOT_AVAILABLE',
          message: 'Process diff comparison is not available on your plan.',
        },
        meta: buildMeta(
          { requested: 0, loaded: 0, skipped: 0 },
          { requiredPlan: access.requiredPlan, upgradeUrl: '/pricing' },
        ),
      },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse({ code: 'INVALID_JSON', message: 'Request body must be valid JSON.' }, 400);
  }

  const parsed = processDiffSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(
      { code: 'VALIDATION_ERROR', message: 'Invalid request body.' },
      400,
      { details: parsed.error.flatten() },
    );
  }

  const { workflowIds, baselineId } = parsed.data;

  if (baselineId && !workflowIds.includes(baselineId)) {
    return errorResponse(
      { code: 'VALIDATION_ERROR', message: 'baselineId must be one of the requested workflowIds.' },
      400,
    );
  }

  try {
    const workflows = await db.workflow.findMany({
      where: { id: { in: workflowIds }, userId: user.id, status: 'active' },
      select: {
        id: true,
        title: true,
        artifacts: {
          where: { artifactType: 'process_output' },
          select: { contentJson: true },
        },
      },
    });

    const foundIds = new Set(workflows.map((w) => w.id));
    const missingIds = workflowIds.filter((id) => !foundIds.has(id));
    if (missingIds.length > 0) {
      return errorResponse(
        { code: 'WORKFLOWS_NOT_FOUND', message: 'One or more workflows were not found.' },
        404,
        { missingIds },
      );
    }

    const loaded: LoadedWorkflow[] = [];
    const skipped: string[] = [];

    for (const w of workflows) {
      const steps = parseCompareSteps(w.artifacts[0]?.contentJson);
      if (steps === null) {
        skipped.push(w.id);
        continue;
      }
      loaded.push({ id: w.id, title: w.title, steps });
    }

    if (loaded.length < 2) {
      return errorResponse(
        {
          code: 'INSUFFICIENT_WORKFLOWS',
          message: 'At least 2 workflows with valid process output are required for comparison.',
        },
        422,
        { skipped },
      );
    }

    if (baselineId && !loaded.some((w) => w.id === baselineId)) {
      return errorResponse(
        {
          code: 'BASELINE_UNAVAILABLE',
          message: 'The requested baseline workflow has no usable process output.',
        },
        422,
        { skipped },
      );
    }

    const inputs: WorkflowCompareInput[] = loaded.map((w) => ({
      workflowId: w.id,
      title: w.title,
      steps: w.steps,
      evidenceRunIds: [w.id],
    }));

    let report: ProcessDiffReport;
    try {
      report = compareWorkflows(inputs, baselineId ? { baselineId } : {});
    } catch (err) {
      console.error('Process diff computation failed:', err);
      return errorResponse({ code: 'COMPARE_FAILED', message: 'Failed to compute process diff.' }, 500);
    }

    return NextResponse.json({
      data: report,
      error: null,
      meta: buildMeta(
        { requested: workflowIds.length, loaded: loaded.length, skipped: skipped.length },
        skipped.length > 0 ? { skipped } : {},
      ),
    });
  } catch (err) {
    console.error('Process diff route failed:', err);
    return errorResponse({ code: 'PROCESS_DIFF_FAILED', message: 'Failed to compute process diff.' }, 500);
  }
}
