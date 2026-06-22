/**
 * Integration tests for POST /api/workflows/[id]/ask — deterministic Phase-A
 * "Ask This Process" route (NO LLM).
 *
 * Validates the honesty + tenant-scoping contract:
 *   - auth required (401 when no session)
 *   - non-owned/missing workflow → 404 (the { id, userId } predicate)
 *   - valid grounded question → grounded answer + citations ⊆ CitationSet
 *   - must-not-answer question → scoped decline (200, refused, out_of_scope)
 *   - no-SOP workflow → insufficient-data refusal (200, refused, NOT 500)
 *   - empty / oversized input → 400
 *
 * Mocking strategy mirrors the GET /api/workflows route tests: vi.mock('@/lib/auth')
 * for the session, vi.mock('@/db') for the workflow + artifacts. The Phase-A engine
 * (@/lib/ask-this-process) is consumed for real — these tests exercise the actual
 * deterministic pipeline against the canonical SOP fixture.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { SAMPLE_SOP, SAMPLE_PROCESS_MAP } from '@/lib/ask-this-process/__fixtures__/sampleSop';

vi.mock('@/lib/auth', () => ({ auth: vi.fn() }));
vi.mock('@/db', () => ({
  db: {
    workflow: { findFirst: vi.fn() },
  },
}));

import { POST } from './route';
import { auth } from '@/lib/auth';
import { db } from '@/db';

const mockAuth = vi.mocked(auth);
const mockFindFirst = vi.mocked(db.workflow.findFirst);

const OWNER_ID = 'user-1';
const WORKFLOW_ID = 'wf-1';

/** Build a workflow row whose artifacts carry the given parsed JSON bodies. */
function workflowWithArtifacts(artifacts: Array<{ artifactType: string; body: unknown }>) {
  return {
    id: WORKFLOW_ID,
    userId: OWNER_ID,
    artifacts: artifacts.map((a, i) => ({
      id: `art-${i}`,
      artifactType: a.artifactType,
      contentJson: a.body === undefined ? null : JSON.stringify(a.body),
    })),
    processDefinition: { intelligenceJson: null, runCount: 1 },
  };
}

function makeReq(body: unknown): NextRequest {
  return new NextRequest(`http://localhost/api/workflows/${WORKFLOW_ID}/ask`, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

const params = { params: { id: WORKFLOW_ID } };

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth.mockResolvedValue({ user: { id: OWNER_ID } } as never);
});

describe('POST /api/workflows/[id]/ask — auth + ownership', () => {
  it('401 when no session', async () => {
    mockAuth.mockResolvedValue(null as never);
    const res = await POST(makeReq({ question: 'How many steps?' }), params);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error.code).toBe('UNAUTHORIZED');
    expect(json.data).toBeNull();
    expect(mockFindFirst).not.toHaveBeenCalled();
  });

  it('404 when the workflow is not owned / does not exist', async () => {
    mockFindFirst.mockResolvedValue(null as never);
    const res = await POST(makeReq({ question: 'How many steps?' }), params);
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error.code).toBe('WORKFLOW_NOT_FOUND');
    // Ownership predicate: scoped to { id, userId } — never a bare id lookup.
    const callArg = mockFindFirst.mock.calls[0]![0] as { where: Record<string, unknown> };
    expect(callArg.where).toMatchObject({ id: WORKFLOW_ID, userId: OWNER_ID });
  });
});

describe('POST /api/workflows/[id]/ask — input bounds', () => {
  beforeEach(() => {
    mockFindFirst.mockResolvedValue(
      workflowWithArtifacts([
        { artifactType: 'sop', body: SAMPLE_SOP },
        { artifactType: 'process_map', body: SAMPLE_PROCESS_MAP },
      ]) as never,
    );
  });

  it('400 on empty question', async () => {
    const res = await POST(makeReq({ question: '' }), params);
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe('INVALID_QUESTION');
  });

  it('400 on whitespace-only question', async () => {
    const res = await POST(makeReq({ question: '   ' }), params);
    expect(res.status).toBe(400);
  });

  it('400 on oversized question (> 500 chars)', async () => {
    const res = await POST(makeReq({ question: 'a'.repeat(501) }), params);
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe('INVALID_QUESTION');
  });

  it('400 on missing question field', async () => {
    const res = await POST(makeReq({ notAQuestion: true }), params);
    expect(res.status).toBe(400);
  });

  it('400 on non-JSON body', async () => {
    const req = new NextRequest(`http://localhost/api/workflows/${WORKFLOW_ID}/ask`, {
      method: 'POST',
      body: 'not json{',
      headers: { 'content-type': 'application/json' },
    });
    const res = await POST(req, params);
    expect(res.status).toBe(400);
  });
});

describe('POST /api/workflows/[id]/ask — grounded answers', () => {
  beforeEach(() => {
    mockFindFirst.mockResolvedValue(
      workflowWithArtifacts([
        { artifactType: 'sop', body: SAMPLE_SOP },
        { artifactType: 'process_map', body: SAMPLE_PROCESS_MAP },
      ]) as never,
    );
  });

  it('grounded count answer with a process citation (200)', async () => {
    const res = await POST(makeReq({ question: 'How many steps are in this process?' }), params);
    expect(res.status).toBe(200);
    const { data, error, meta } = await res.json();
    expect(error).toBeNull();
    expect(meta.groundingDeterministic).toBe(true);
    expect(meta.llm).toBe(false);
    expect(data.refused).toBe(false);
    expect(data.grounded).toBe(true);
    expect(data.citations.length).toBeGreaterThan(0);
    expect(data.isAuthoritative).toBe(false);
    expect(data.answer).toContain('3 steps');
  });

  it('grounded shape answer cites every step; citations ⊆ the SOP ordinals', async () => {
    const res = await POST(makeReq({ question: 'What systems does it use?' }), params);
    const { data } = await res.json();
    expect(data.refused).toBe(false);
    expect(data.grounded).toBe(true);
    const validOrdinals = new Set(SAMPLE_SOP.steps.map((s) => s.ordinal));
    // Every cited step ordinal is authorized by the bundle's CitationSet.
    for (const ord of data.evidenceUsed.stepsCited) {
      expect(validOrdinals.has(ord)).toBe(true);
    }
    expect(data.evidenceUsed.stepsCited.length).toBeGreaterThan(0);
  });

  it('grounded decision answer cites the decision-point step (200)', async () => {
    const res = await POST(makeReq({ question: 'Where are the decision points?' }), params);
    const { data } = await res.json();
    expect(data.refused).toBe(false);
    expect(data.grounded).toBe(true);
    expect(data.evidenceUsed.stepsCited).toContain(2);
  });

  it('is deterministic — identical input ⇒ identical answer + bundleHash', async () => {
    const q = { question: 'How many steps are in this process?' };
    const a = await (await POST(makeReq(q), params)).json();
    const b = await (await POST(makeReq(q), params)).json();
    expect(a.data.answer).toBe(b.data.answer);
    expect(a.data.bundleHash).toBe(b.data.bundleHash);
  });
});

describe('POST /api/workflows/[id]/ask — refusals (a 200 TRUST state, not an error)', () => {
  beforeEach(() => {
    mockFindFirst.mockResolvedValue(
      workflowWithArtifacts([
        { artifactType: 'sop', body: SAMPLE_SOP },
        { artifactType: 'process_map', body: SAMPLE_PROCESS_MAP },
      ]) as never,
    );
  });

  it('must-not-answer (ROI) → scoped decline (200, refused, out_of_scope, no grounded header)', async () => {
    const res = await POST(makeReq({ question: 'What is the ROI of automating this?' }), params);
    expect(res.status).toBe(200);
    const { data, error } = await res.json();
    expect(error).toBeNull();
    expect(data.refused).toBe(true);
    expect(data.refusalReason).toBe('out_of_scope');
    expect(data.grounded).toBe(false);
    expect(data.citations).toEqual([]);
  });

  it('unmatched free-form question → no_relevant_evidence refusal (200)', async () => {
    const res = await POST(makeReq({ question: 'asdf qwerty zxcv' }), params);
    expect(res.status).toBe(200);
    const { data } = await res.json();
    expect(data.refused).toBe(true);
    expect(data.grounded).toBe(false);
  });
});

describe('POST /api/workflows/[id]/ask — no SOP artifact', () => {
  it('insufficient-data refusal (200, refused) — NOT a 500', async () => {
    // Owned workflow exists but has no `sop` artifact yet.
    mockFindFirst.mockResolvedValue(
      workflowWithArtifacts([{ artifactType: 'process_map', body: SAMPLE_PROCESS_MAP }]) as never,
    );
    const res = await POST(makeReq({ question: 'How many steps?' }), params);
    expect(res.status).toBe(200);
    const { data, error } = await res.json();
    expect(error).toBeNull();
    expect(data.refused).toBe(true);
    expect(data.refusalReason).toBe('insufficient_data');
    expect(data.grounded).toBe(false);
    expect(data.citations).toEqual([]);
  });

  it('malformed SOP JSON → insufficient-data refusal (200), never throws', async () => {
    mockFindFirst.mockResolvedValue({
      id: WORKFLOW_ID,
      userId: OWNER_ID,
      artifacts: [{ id: 'a', artifactType: 'sop', contentJson: '{bad json' }],
      processDefinition: { intelligenceJson: null, runCount: 1 },
    } as never);
    const res = await POST(makeReq({ question: 'How many steps?' }), params);
    expect(res.status).toBe(200);
    expect((await res.json()).data.refused).toBe(true);
  });
});
