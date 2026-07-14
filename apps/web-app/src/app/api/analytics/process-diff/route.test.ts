/**
 * Tests for POST /api/analytics/process-diff — T2 N-Way Process Diff.
 *
 * Mocking strategy mirrors the `/api/analytics/time-sinks` precedent:
 * vi.mock('@/lib/auth') for the session, vi.mock('@/db') for user +
 * workflow lookups. The real `checkFeatureAccess` / `compareWorkflows` run
 * for real — these tests exercise the actual deterministic pipeline against
 * mocked persistence.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth', () => ({ auth: vi.fn() }));
vi.mock('@/db', () => ({
  db: {
    user: { findUnique: vi.fn() },
    workflow: { findMany: vi.fn() },
  },
}));

import { POST } from './route';
import { auth } from '@/lib/auth';
import { db } from '@/db';

const mockAuth = vi.mocked(auth);
const mockUserFindUnique = vi.mocked(db.user.findUnique);
const mockWorkflowFindMany = vi.mocked(db.workflow.findMany);

const USER_ID = 'user-1';

function makeUser(overrides: Partial<{ plan: string; email: string }> = {}) {
  return {
    id: USER_ID,
    email: 'user@example.com',
    plan: 'team',
    ...overrides,
  } as never;
}

function makeReq(body: unknown, opts: { rawBody?: string } = {}): NextRequest {
  return new NextRequest('http://localhost/api/analytics/process-diff', {
    method: 'POST',
    body: opts.rawBody ?? JSON.stringify(body),
  });
}

interface StepFixture {
  ordinal: number;
  title: string;
  category: string;
  durationMs?: number | null;
}

function processOutputJson(steps: StepFixture[]): string {
  return JSON.stringify({
    processRun: { runId: 'run-x' },
    processDefinition: {
      stepDefinitions: steps.map((s) => ({
        ordinal: s.ordinal,
        stepId: `step-${s.ordinal}`,
        title: s.title,
        category: s.category,
        durationMs: s.durationMs,
      })),
    },
  });
}

function workflowRow(id: string, title: string, artifactJson: string | null) {
  return {
    id,
    title,
    artifacts: artifactJson ? [{ contentJson: artifactJson }] : [],
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth.mockResolvedValue({ user: { id: USER_ID } } as never);
  mockUserFindUnique.mockResolvedValue(makeUser());
  mockWorkflowFindMany.mockResolvedValue([]);
});

describe('POST /api/analytics/process-diff — auth', () => {
  it('401 when no session', async () => {
    mockAuth.mockResolvedValue(null as never);
    const res = await POST(makeReq({ workflowIds: ['a', 'b'] }));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error.code).toBe('UNAUTHORIZED');
    expect(json.data).toBeNull();
    expect(mockWorkflowFindMany).not.toHaveBeenCalled();
  });

  it('404 when the session user no longer exists', async () => {
    mockUserFindUnique.mockResolvedValue(null);
    const res = await POST(makeReq({ workflowIds: ['a', 'b'] }));
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error.code).toBe('USER_NOT_FOUND');
  });

  it('403 when the user plan does not include intelligenceLayer', async () => {
    mockUserFindUnique.mockResolvedValue(makeUser({ plan: 'free' }));
    const res = await POST(makeReq({ workflowIds: ['a', 'b'] }));
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error.code).toBe('FEATURE_NOT_AVAILABLE');
    expect(json.meta.requiredPlan).toBeDefined();
    expect(mockWorkflowFindMany).not.toHaveBeenCalled();
  });
});

describe('POST /api/analytics/process-diff — validation', () => {
  it('400 on invalid JSON body', async () => {
    const res = await POST(makeReq(undefined, { rawBody: '{not json' }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe('INVALID_JSON');
  });

  it('400 when fewer than 2 workflowIds are supplied', async () => {
    const res = await POST(makeReq({ workflowIds: ['a'] }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe('VALIDATION_ERROR');
    expect(mockWorkflowFindMany).not.toHaveBeenCalled();
  });

  it('400 when more than 6 workflowIds are supplied', async () => {
    const res = await POST(makeReq({ workflowIds: ['a', 'b', 'c', 'd', 'e', 'f', 'g'] }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe('VALIDATION_ERROR');
  });

  it('400 when workflowIds is missing entirely', async () => {
    const res = await POST(makeReq({}));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe('VALIDATION_ERROR');
  });

  it('400 when baselineId is not one of workflowIds', async () => {
    const res = await POST(makeReq({ workflowIds: ['a', 'b'], baselineId: 'zzz' }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe('VALIDATION_ERROR');
    expect(mockWorkflowFindMany).not.toHaveBeenCalled();
  });
});

describe('POST /api/analytics/process-diff — missing / unusable workflows', () => {
  it('404 when one or more requested workflow ids are not found', async () => {
    mockWorkflowFindMany.mockResolvedValue([
      workflowRow('a', 'A', processOutputJson([{ ordinal: 1, title: 'Step', category: 'form_fill' }])),
    ] as never);
    const res = await POST(makeReq({ workflowIds: ['a', 'missing'] }));
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error.code).toBe('WORKFLOWS_NOT_FOUND');
    expect(json.meta.missingIds).toEqual(['missing']);
  });

  it('422 when fewer than 2 workflows have usable process output', async () => {
    mockWorkflowFindMany.mockResolvedValue([
      workflowRow('a', 'A', processOutputJson([{ ordinal: 1, title: 'Step', category: 'form_fill' }])),
      workflowRow('b', 'B', null), // no artifact at all
    ] as never);
    const res = await POST(makeReq({ workflowIds: ['a', 'b'] }));
    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.error.code).toBe('INSUFFICIENT_WORKFLOWS');
    expect(json.meta.skipped).toEqual(['b']);
  });

  it('422 when the requested baseline workflow has corrupt process output', async () => {
    mockWorkflowFindMany.mockResolvedValue([
      workflowRow('a', 'A', '{not valid json'),
      workflowRow('b', 'B', processOutputJson([{ ordinal: 1, title: 'Step', category: 'form_fill' }])),
      workflowRow('c', 'C', processOutputJson([{ ordinal: 1, title: 'Step', category: 'form_fill' }])),
    ] as never);
    const res = await POST(makeReq({ workflowIds: ['a', 'b', 'c'], baselineId: 'a' }));
    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.error.code).toBe('BASELINE_UNAVAILABLE');
  });

  it('skips a workflow with malformed stepDefinitions rather than throwing', async () => {
    mockWorkflowFindMany.mockResolvedValue([
      workflowRow('a', 'A', processOutputJson([{ ordinal: 1, title: 'Step', category: 'form_fill' }])),
      workflowRow('b', 'B', JSON.stringify({ processDefinition: { stepDefinitions: 'not-an-array' } })),
      workflowRow('c', 'C', processOutputJson([{ ordinal: 1, title: 'Step', category: 'form_fill' }])),
    ] as never);
    const res = await POST(makeReq({ workflowIds: ['a', 'b', 'c'] }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.meta.skipped).toEqual(['b']);
    expect(json.data.summaries).toHaveLength(2);
  });
});

describe('POST /api/analytics/process-diff — happy path', () => {
  it('scopes the query to the requesting user and active workflows', async () => {
    mockWorkflowFindMany.mockResolvedValue([
      workflowRow('a', 'A', processOutputJson([{ ordinal: 1, title: 'Step', category: 'form_fill' }])),
      workflowRow('b', 'B', processOutputJson([{ ordinal: 1, title: 'Step', category: 'form_fill' }])),
    ] as never);
    await POST(makeReq({ workflowIds: ['a', 'b'] }));
    expect(mockWorkflowFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { in: ['a', 'b'] }, userId: USER_ID, status: 'active' },
      }),
    );
  });

  it('returns a full ProcessDiffReport with the default (first) baseline', async () => {
    mockWorkflowFindMany.mockResolvedValue([
      workflowRow(
        'a',
        'Baseline Workflow',
        processOutputJson([
          { ordinal: 1, title: 'Fill Form', category: 'form_fill', durationMs: 1000 },
          { ordinal: 2, title: 'Submit', category: 'submission', durationMs: 2000 },
        ]),
      ),
      workflowRow(
        'b',
        'Other Workflow',
        processOutputJson([
          { ordinal: 1, title: 'Fill Form', category: 'form_fill', durationMs: 1200 },
          { ordinal: 2, title: 'Extra Review', category: 'approval_wait', durationMs: 500 },
          { ordinal: 3, title: 'Submit', category: 'submission', durationMs: 1800 },
        ]),
      ),
    ] as never);

    const res = await POST(makeReq({ workflowIds: ['a', 'b'] }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.error).toBeNull();

    const data = json.data;
    expect(data.baselineId).toBe('a');
    expect(data.rowCount).toBe(3); // form_fill, approval_wait (inserted), submission
    expect(data.rows.map((r: { baselineKey: string | null }) => r.baselineKey)).toEqual([
      'form_fill',
      null,
      'submission',
    ]);
    expect(data.summaries).toHaveLength(2);
    const bSummary = data.summaries.find((s: { workflowId: string }) => s.workflowId === 'b');
    expect(bSummary).toMatchObject({ matched: 2, added: 1, removed: 0, reordered: 0 });

    expect(json.meta.modelVersion).toBeTruthy();
    expect(json.meta.cacheHit).toBe(false);
    expect(json.meta.counts).toEqual({ requested: 2, loaded: 2, skipped: 0 });
  });

  it('honors an explicit baselineId', async () => {
    mockWorkflowFindMany.mockResolvedValue([
      workflowRow('a', 'A', processOutputJson([{ ordinal: 1, title: 'Step A', category: 'form_fill' }])),
      workflowRow('b', 'B', processOutputJson([{ ordinal: 1, title: 'Step B', category: 'form_fill' }])),
    ] as never);

    const res = await POST(makeReq({ workflowIds: ['a', 'b'], baselineId: 'b' }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.baselineId).toBe('b');
  });

  it('produces a structural diff (durations null) when no workflow has timing data', async () => {
    mockWorkflowFindMany.mockResolvedValue([
      workflowRow('a', 'A', processOutputJson([{ ordinal: 1, title: 'Step', category: 'form_fill' }])),
      workflowRow('b', 'B', processOutputJson([{ ordinal: 1, title: 'Step', category: 'form_fill' }])),
    ] as never);

    const res = await POST(makeReq({ workflowIds: ['a', 'b'] }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.rows[0].baselineKey).toBe('form_fill');
    for (const row of json.data.rows) {
      for (const wfId of ['a', 'b']) {
        expect(row.cells[wfId].durationMs).toBeNull();
        expect(row.cells[wfId].deltaVsBaselineMs).toBeNull();
      }
    }
  });

  it('500s honestly when the database throws, without leaking internals', async () => {
    mockWorkflowFindMany.mockRejectedValue(new Error('db exploded'));
    const res = await POST(makeReq({ workflowIds: ['a', 'b'] }));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error.code).toBe('PROCESS_DIFF_FAILED');
    expect(json.data).toBeNull();
  });
});
