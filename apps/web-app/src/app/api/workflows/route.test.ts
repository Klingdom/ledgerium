/**
 * Integration tests for GET /api/workflows — V2 metrics engine layer.
 *
 * Validates:
 *   - Each workflow in the response contains a `metricsV2` field.
 *   - `stats.portfolioHealthScore` is present and is an integer.
 *   - Free-tier user receives `metricsV2.healthScore.isGated === true`.
 *   - Starter+ user receives `metricsV2.healthScore.isGated === false`.
 *
 * Mocking strategy:
 *   - vi.mock('@/lib/auth') — controls session user.
 *   - vi.mock('@/db') — controls db responses without touching the real DB.
 *   - vi.mock('@/lib/plans') — controls plan/feature resolution.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ─── Module mocks ──────────────────────────────────────────────────────────────

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/plans', () => ({
  toPlanType: vi.fn((plan: string) => plan),
  hasFeature: vi.fn(),
}));

vi.mock('@/lib/health-scores', () => ({
  computeHealthScore: vi.fn().mockReturnValue({
    overall: 75,
    completeness: 25,
    confidence: 20,
    duration: 20,
    complexity: 10,
  }),
}));

vi.mock('@/lib/metrics-input-adapter', () => ({
  // toMetricsInput output is discarded by the mocked computeWorkflowMetrics below
  // (which returns a canned value regardless of input). A minimal stub is sufficient.
  toMetricsInput: vi.fn().mockReturnValue({
    id: 'wf-1',
    confidence: 0.8,
    stepCount: 5,
    durationMs: 120_000,
    phaseCount: 3,
    toolsUsed: ['Salesforce', 'Slack'],
    createdAt: new Date('2026-01-01T00:00:00Z'),
    lastViewedAt: new Date('2026-04-01T00:00:00Z'),
    processDefinition: null,
    processInsights: [],
  }),
}));

vi.mock('@/lib/workflow-metrics', () => ({
  computeWorkflowMetrics: vi.fn().mockReturnValue({
    runs: 8,
    avgTimeMs: 115_000,
    variationScore: 0.2,
    variationLabel: 'low',
    bottleneckLabel: null,
    healthScore: {
      overall: 72,
      speed: 30,
      consistency: 24,
      dataQuality: 16,
      standardization: 2,
      isGated: false,
    },
    opportunityTag: 'healthy',
    aiOpportunityScore: 42,
    confidence: 0.8,
  }),
  computePortfolioHealthScore: vi.fn().mockReturnValue(72),
  computePortfolioHealthScorePrior: vi.fn().mockReturnValue(null),
  computeInsightChips: vi.fn().mockReturnValue([]),
}));

vi.mock('@/db', () => {
  const mockWorkflow = {
    id: 'wf-1',
    title: 'Test Workflow',
    userId: 'user-1',
    status: 'active',
    confidence: 0.8,
    stepCount: 5,
    durationMs: 120_000,
    phaseCount: 3,
    toolsUsed: JSON.stringify(['Salesforce', 'Slack']),
    description: 'A test workflow',
    isFavorite: false,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-04-01T00:00:00Z'),
    lastViewedAt: new Date('2026-04-01T00:00:00Z'),
    viewCount: 10,
    processDefinition: {
      id: 'pd-1',
      canonicalName: 'Test Process',
      runCount: 8,
      variantCount: 2,
      avgDurationMs: 115_000,
      medianDurationMs: 110_000,
      stabilityScore: 0.8,
      confidenceScore: 0.8,
    },
    tags: [],
    portfolios: [],
  };

  return {
    db: {
      user: {
        findUnique: vi.fn().mockResolvedValue({ plan: 'free' }),
      },
      workflow: {
        findMany: vi.fn().mockResolvedValue([mockWorkflow]),
      },
      processInsight: {
        count: vi.fn().mockResolvedValue(0),
        findMany: vi.fn().mockResolvedValue([]),
      },
    },
  };
});

// ─── Helpers ───────────────────────────────────────────────────────────────────

function makeGetRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL('http://localhost/api/workflows');
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url.toString(), { method: 'GET' });
}

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe('GET /api/workflows — metricsV2 integration', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    // Default: authenticated session
    const { auth } = await import('@/lib/auth');
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user-1', email: 'test@test.com' } } as unknown as Awaited<ReturnType<typeof auth>>);
  });

  it('returns metricsV2 for each workflow', async () => {
    const { hasFeature } = await import('@/lib/plans');
    vi.mocked(hasFeature).mockReturnValue(true);

    const { GET } = await import('./route');
    const response = await GET(makeGetRequest());
    const body = await response.json() as { workflows: Array<{ metricsV2: unknown }> };

    expect(body.workflows).toBeDefined();
    expect(body.workflows.length).toBeGreaterThan(0);
    for (const workflow of body.workflows) {
      expect(workflow.metricsV2).toBeDefined();
    }
  });

  it('stats.portfolioHealthScore is present and is an integer', async () => {
    const { hasFeature } = await import('@/lib/plans');
    vi.mocked(hasFeature).mockReturnValue(true);

    const { GET } = await import('./route');
    const response = await GET(makeGetRequest());
    const body = await response.json() as { stats: { portfolioHealthScore: unknown } };

    expect(body.stats.portfolioHealthScore).toBeDefined();
    expect(typeof body.stats.portfolioHealthScore).toBe('number');
    expect(Number.isInteger(body.stats.portfolioHealthScore)).toBe(true);
    expect(body.stats.portfolioHealthScore as number).toBeGreaterThanOrEqual(0);
    expect(body.stats.portfolioHealthScore as number).toBeLessThanOrEqual(100);
  });

  it('free-tier user: metricsV2.healthScore.isGated === true', async () => {
    const { hasFeature } = await import('@/lib/plans');
    // Free tier: healthScores feature gated
    vi.mocked(hasFeature).mockReturnValue(false);

    const { GET } = await import('./route');
    const response = await GET(makeGetRequest());
    const body = await response.json() as {
      workflows: Array<{ metricsV2: { healthScore: { isGated: boolean } } }>
    };

    expect(body.workflows.length).toBeGreaterThan(0);
    for (const workflow of body.workflows) {
      expect(workflow.metricsV2.healthScore.isGated).toBe(true);
    }
  });

  it('starter+ user: metricsV2.healthScore.isGated === false', async () => {
    const { hasFeature } = await import('@/lib/plans');
    vi.mocked(hasFeature).mockReturnValue(true);

    const { GET } = await import('./route');
    const response = await GET(makeGetRequest());
    const body = await response.json() as {
      workflows: Array<{ metricsV2: { healthScore: { isGated: boolean } } }>
    };

    expect(body.workflows.length).toBeGreaterThan(0);
    for (const workflow of body.workflows) {
      expect(workflow.metricsV2.healthScore.isGated).toBe(false);
    }
  });
});
