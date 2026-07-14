import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { checkFeatureAccess } from '@/lib/feature-gating';
import {
  aggregateTimeSinks,
  TIME_SINK_MODEL_VERSION,
  type TimeSinkInput,
  type PortfolioTimeSinkReport,
} from '@ledgerium/intelligence-engine';
import type { TimestudyResult, BottleneckReport } from '@ledgerium/intelligence-engine';

/**
 * GET /api/analytics/time-sinks — T1 Portfolio Time-Sink Ranking
 * (Cross-Workflow Intelligence program; see
 * `docs/features/cross-workflow-intelligence/BUILD_SPEC.md` §5 T1).
 *
 * Reads the user's already-persisted per-process timing/bottleneck data
 * (`ProcessDefinition.avgDurationMs` / `.runCount` / `.intelligenceJson`,
 * populated by `clusterWorkflows()` in `@/lib/intelligence`) and runs the
 * pure `aggregateTimeSinks()` rollup from `@ledgerium/intelligence-engine`
 * over it. Zero new engine computation is triggered by this route — it is a
 * read + pure-aggregate, matching the T1 "Effort/Risk: 1/1" scope.
 *
 * Grain: one ranked entry per `ProcessDefinition` (a distinct process — which
 * may be a single recording or a group of runs). This matches the existing
 * `/api/analytics` assembly (`db.processDefinition.findMany`) and avoids
 * double-counting the same process's aggregate time once per grouped
 * recording.
 *
 * Envelope: `{ data, error, meta }` per CLAUDE.md API Design.
 *   meta = { modelVersion, counts, computedAt, cacheHit: false }
 *
 * Empty state (no workflows / no timing data): 200 with an honest empty
 * `ranked: []` + zeroed `totals` — NOT an error. A user with zero recordings,
 * or whose recordings have not yet produced timing data, is a normal state.
 */

interface TimeSinkErrorBody {
  code: string;
  message: string;
}

const routeMeta = (counts: { workflowCount: number; coveredWorkflowCount: number }) => ({
  modelVersion: TIME_SINK_MODEL_VERSION,
  counts,
  computedAt: new Date().toISOString(),
  cacheHit: false,
});

function errorResponse(body: TimeSinkErrorBody, status: number): NextResponse {
  return NextResponse.json(
    {
      data: null,
      error: body,
      meta: routeMeta({ workflowCount: 0, coveredWorkflowCount: 0 }),
    },
    { status },
  );
}

/**
 * Parsed slice of a `ProcessDefinition.intelligenceJson` blob relevant to
 * time-sink aggregation. The JSON is only ever written by
 * `@/lib/intelligence` (never user-supplied), so this is a defensive
 * structural parse — not a full Zod re-validation of the entire
 * `PortfolioIntelligence` shape. Any failure mode returns nulls, never
 * throws, matching `parseIntelligenceJson` precedent in
 * `metrics-input-adapter.ts`.
 */
function parseTimeSinkIntelligence(raw: string | null): {
  timestudy: TimestudyResult | null;
  bottlenecks: BottleneckReport | null;
} {
  if (!raw) return { timestudy: null, bottlenecks: null };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { timestudy: null, bottlenecks: null };
  }

  if (typeof parsed !== 'object' || parsed === null) {
    return { timestudy: null, bottlenecks: null };
  }

  const obj = parsed as Record<string, unknown>;

  const timestudyCandidate = obj.timestudy;
  const timestudy: TimestudyResult | null =
    timestudyCandidate &&
    typeof timestudyCandidate === 'object' &&
    Array.isArray((timestudyCandidate as { stepPositionTimestudies?: unknown }).stepPositionTimestudies)
      ? (timestudyCandidate as TimestudyResult)
      : null;

  const bottlenecksCandidate = obj.bottlenecks;
  const bottlenecks: BottleneckReport | null =
    bottlenecksCandidate &&
    typeof bottlenecksCandidate === 'object' &&
    Array.isArray((bottlenecksCandidate as { bottlenecks?: unknown }).bottlenecks)
      ? (bottlenecksCandidate as BottleneckReport)
      : null;

  return { timestudy, bottlenecks };
}

/** Union of evidenceRunIds present anywhere on the parsed intelligence slice. */
function deriveEvidenceRunIds(
  timestudy: TimestudyResult | null,
  bottlenecks: BottleneckReport | null,
): string[] {
  const ids = new Set<string>();
  for (const id of timestudy?.evidenceRunIds ?? []) ids.add(id);
  for (const id of bottlenecks?.evidenceRunIds ?? []) ids.add(id);
  return [...ids];
}

export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return errorResponse({ code: 'UNAUTHORIZED', message: 'Authentication required.' }, 401);
  }
  const userId = session.user.id;

  const user = await db.user.findUnique({ where: { id: userId } });
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
          message: 'Portfolio time-sink ranking is not available on your plan.',
        },
        meta: {
          ...routeMeta({ workflowCount: 0, coveredWorkflowCount: 0 }),
          requiredPlan: access.requiredPlan,
          upgradeUrl: '/pricing',
        },
      },
      { status: 403 },
    );
  }

  try {
    // Restrict to definitions backed by at least one active (non-archived,
    // non-deleted) workflow — mirrors "the user's active workflows" scope.
    const definitions = await db.processDefinition.findMany({
      where: { userId, workflows: { some: { status: 'active' } } },
      select: {
        id: true,
        canonicalName: true,
        runCount: true,
        avgDurationMs: true,
        intelligenceJson: true,
      },
    });

    const inputs: TimeSinkInput[] = definitions.map((def) => {
      const { timestudy, bottlenecks } = parseTimeSinkIntelligence(def.intelligenceJson);
      return {
        workflowId: def.id,
        title: def.canonicalName,
        runCount: def.runCount,
        timestudy,
        bottlenecks,
        avgDurationMs: def.avgDurationMs,
        evidenceRunIds: deriveEvidenceRunIds(timestudy, bottlenecks),
      };
    });

    const report: PortfolioTimeSinkReport = aggregateTimeSinks(inputs);

    return NextResponse.json({
      data: report,
      error: null,
      meta: routeMeta({
        workflowCount: report.totals.workflowCount,
        coveredWorkflowCount: report.totals.coveredWorkflowCount,
      }),
    });
  } catch (err) {
    console.error('Portfolio time-sink aggregation failed:', err);
    return errorResponse(
      { code: 'AGGREGATION_FAILED', message: 'Failed to compute portfolio time-sink ranking.' },
      500,
    );
  }
}
