/**
 * Tests for GET /api/analytics/time-sinks — T1 Portfolio Time-Sink Ranking.
 *
 * Mocking strategy mirrors the ask-route precedent: vi.mock('@/lib/auth') for
 * the session, vi.mock('@/db') for user + processDefinition lookups. The real
 * `checkFeatureAccess` / `aggregateTimeSinks` run for real — these tests
 * exercise the actual deterministic pipeline against mocked persistence.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth', () => ({ auth: vi.fn() }));
vi.mock('@/db', () => ({
  db: {
    user: { findUnique: vi.fn() },
    processDefinition: { findMany: vi.fn() },
  },
}));

import { GET } from './route';
import { auth } from '@/lib/auth';
import { db } from '@/db';

const mockAuth = vi.mocked(auth);
const mockUserFindUnique = vi.mocked(db.user.findUnique);
const mockDefFindMany = vi.mocked(db.processDefinition.findMany);

const USER_ID = 'user-1';

function makeUser(overrides: Partial<{ plan: string; email: string }> = {}) {
  return {
    id: USER_ID,
    email: 'user@example.com',
    plan: 'team',
    ...overrides,
  } as never;
}

function makeReq(): NextRequest {
  return new NextRequest('http://localhost/api/analytics/time-sinks', { method: 'GET' });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth.mockResolvedValue({ user: { id: USER_ID } } as never);
  mockUserFindUnique.mockResolvedValue(makeUser());
  mockDefFindMany.mockResolvedValue([]);
});

describe('GET /api/analytics/time-sinks — auth', () => {
  it('401 when no session', async () => {
    mockAuth.mockResolvedValue(null as never);
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error.code).toBe('UNAUTHORIZED');
    expect(json.data).toBeNull();
    expect(mockDefFindMany).not.toHaveBeenCalled();
  });

  it('404 when the session user no longer exists', async () => {
    mockUserFindUnique.mockResolvedValue(null);
    const res = await GET(makeReq());
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error.code).toBe('USER_NOT_FOUND');
    expect(json.data).toBeNull();
  });

  it('403 when the user plan does not include intelligenceLayer', async () => {
    mockUserFindUnique.mockResolvedValue(makeUser({ plan: 'free' }));
    const res = await GET(makeReq());
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error.code).toBe('FEATURE_NOT_AVAILABLE');
    expect(json.data).toBeNull();
    expect(json.meta.requiredPlan).toBeDefined();
    expect(mockDefFindMany).not.toHaveBeenCalled();
  });
});

describe('GET /api/analytics/time-sinks — empty state', () => {
  it('200 with an empty ranked list + zeroed totals when there are no process definitions', async () => {
    mockDefFindMany.mockResolvedValue([]);
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.error).toBeNull();
    expect(json.data.ranked).toEqual([]);
    expect(json.data.totals).toEqual({ totalTimeMs: 0, workflowCount: 0, coveredWorkflowCount: 0 });
    expect(json.meta.modelVersion).toBeTruthy();
    expect(json.meta.cacheHit).toBe(false);
  });

  it('200 with entries present but zero timing data (all avgDurationMs null)', async () => {
    mockDefFindMany.mockResolvedValue([
      {
        id: 'def-1',
        canonicalName: 'Onboard vendor',
        runCount: 0,
        avgDurationMs: null,
        intelligenceJson: null,
      },
    ] as never);
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.error).toBeNull();
    expect(json.data.ranked).toHaveLength(1);
    expect(json.data.ranked[0].hasTimingData).toBe(false);
    expect(json.data.ranked[0].aggregateTimeMs).toBe(0);
    expect(json.data.totals.coveredWorkflowCount).toBe(0);
  });
});

describe('GET /api/analytics/time-sinks — happy path', () => {
  function intelligenceJsonFor(opts: {
    position: number;
    category: string;
    meanDurationMs: number;
    overallMeanStepDurationMs: number;
    durationRatio: number;
    evidenceRunIds: string[];
  }): string {
    return JSON.stringify({
      timestudy: {
        ruleVersion: '1.0.0',
        runCount: 5,
        computedAt: '2026-01-01T00:00:00.000Z',
        totalDuration: { meanMs: 20000, medianMs: 19000, p90Ms: 25000, minMs: 15000, maxMs: 30000, stdDevMs: 3000 },
        stepPositionTimestudies: [
          {
            position: opts.position,
            category: opts.category,
            runCount: 5,
            meanDurationMs: opts.meanDurationMs,
            medianDurationMs: opts.meanDurationMs - 200,
            minDurationMs: opts.meanDurationMs - 3000,
            maxDurationMs: opts.meanDurationMs + 3000,
            p90DurationMs: opts.meanDurationMs + 2000,
            stdDevMs: 1500,
            evidenceRunIds: opts.evidenceRunIds,
          },
        ],
        evidenceRunIds: opts.evidenceRunIds,
      },
      bottlenecks: {
        ruleVersion: '1.0.0',
        runCount: 5,
        computedAt: '2026-01-01T00:00:00.000Z',
        bottleneckCount: 1,
        bottlenecks: [
          {
            position: opts.position,
            category: opts.category,
            meanDurationMs: opts.meanDurationMs,
            overallMeanStepDurationMs: opts.overallMeanStepDurationMs,
            durationRatio: opts.durationRatio,
            isHighDuration: true,
            isHighVariance: false,
            coefficientOfVariation: 0.2,
            runCount: 5,
            evidenceRunIds: opts.evidenceRunIds,
          },
        ],
        bottleneckDurationMultiplier: 1.5,
        highVarianceCvThreshold: 0.5,
        evidenceRunIds: opts.evidenceRunIds,
      },
    });
  }

  it('ranks process definitions by aggregate time and passes through bottleneck/range data', async () => {
    mockDefFindMany.mockResolvedValue([
      {
        id: 'def-small',
        canonicalName: 'Small process',
        runCount: 10,
        avgDurationMs: 1000, // aggregate 10,000
        intelligenceJson: intelligenceJsonFor({
          position: 1,
          category: 'form_fill',
          meanDurationMs: 4000,
          overallMeanStepDurationMs: 2000,
          durationRatio: 2,
          evidenceRunIds: ['run-a', 'run-b'],
        }),
      },
      {
        id: 'def-big',
        canonicalName: 'Big process',
        runCount: 10,
        avgDurationMs: 5000, // aggregate 50,000
        intelligenceJson: intelligenceJsonFor({
          position: 2,
          category: 'approval_wait',
          meanDurationMs: 9000,
          overallMeanStepDurationMs: 3000,
          durationRatio: 3,
          evidenceRunIds: ['run-c'],
        }),
      },
    ] as never);

    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.error).toBeNull();

    const { ranked, totals } = json.data;
    expect(ranked.map((e: { workflowId: string }) => e.workflowId)).toEqual(['def-big', 'def-small']);
    expect(ranked[0].aggregateTimeMs).toBe(50000);
    expect(ranked[0].title).toBe('Big process');
    expect(ranked[0].topBottleneck.category).toBe('approval_wait');
    expect(ranked[0].topBottleneck.delayMs).toBe(6000);
    expect(ranked[0].stepDurationRange).not.toBeNull();
    expect(ranked[1].aggregateTimeMs).toBe(10000);

    expect(totals.totalTimeMs).toBe(60000);
    expect(totals.workflowCount).toBe(2);
    expect(totals.coveredWorkflowCount).toBe(2);

    // pct sums to ~100
    const pctSum = ranked.reduce((s: number, e: { pctOfPortfolioTime: number }) => s + e.pctOfPortfolioTime, 0);
    expect(pctSum).toBeCloseTo(100, 6);

    expect(json.meta.counts).toEqual({ workflowCount: 2, coveredWorkflowCount: 2 });
  });

  it('scopes the query to the requesting user and active-workflow-backed definitions', async () => {
    await GET(makeReq());
    expect(mockDefFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: USER_ID,
          workflows: { some: { status: 'active' } },
        }),
      }),
    );
  });

  it('500s honestly when aggregation throws, without leaking internals', async () => {
    mockDefFindMany.mockRejectedValue(new Error('db exploded'));
    const res = await GET(makeReq());
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error.code).toBe('AGGREGATION_FAILED');
    expect(json.data).toBeNull();
  });
});
