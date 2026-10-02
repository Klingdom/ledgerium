/**
 * Row #261 — well-formed JSON of the WRONG SHAPE is a 400, never a reported 5xx.
 *
 * `readJsonBody` (row #258) turns malformed JSON into a 400. A body that parses
 * but has the wrong shape — `{"email": 5}`, `null`, `{"workflowIds": "x"}` —
 * used to reach handlers that dereferenced it (`normalizeEmail(body.email)`) or
 * handed it to Prisma, and became a TypeError / validation error → a reported
 * 500. Each route below now has a schema in front of the first field read.
 *
 * Per route: (a) wrong-type body → 400, no `api_error` reported, the offending
 * value not echoed; (b) a valid body behaves as before (it reaches the route's
 * own post-parse logic — asserted by that logic's own status/message).
 *
 * The producer for each route (the client that calls it) is named in the schema's
 * doc comment in the route file; the valid bodies here are what that client sends.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const m = vi.hoisted(() => ({
  auth: vi.fn(),
  trackServer: vi.fn(),
  userFindUnique: vi.fn(),
  insightFindFirst: vi.fn(),
  insightUpdate: vi.fn(),
  apiKeyCreate: vi.fn(),
  apiKeyFindFirst: vi.fn(),
  apiKeyDelete: vi.fn(),
  teamCreate: vi.fn(),
  teamMemberFindFirst: vi.fn(),
  teamMemberFindMany: vi.fn(),
  teamMemberCount: vi.fn(),
  teamMemberFindUnique: vi.fn(),
  teamMemberUpdate: vi.fn(),
  teamMemberUpdateMany: vi.fn(),
  workflowFindFirst: vi.fn(),
  workflowShareUpsert: vi.fn(),
  workflowShareDeleteMany: vi.fn(),
  passwordResetTokenFindFirst: vi.fn(),
  checkFeatureAccess: vi.fn(),
  checkSoloFeatureAccess: vi.fn(),
  analyzeUserPortfolio: vi.fn(),
  clusterWorkflows: vi.fn(),
  analyzePortfolioAgentIntelligence: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ auth: m.auth }));
vi.mock('@/lib/analytics-server', () => ({ trackServer: m.trackServer }));
vi.mock('@/lib/feature-gating', () => ({
  checkFeatureAccess: m.checkFeatureAccess,
  checkSoloFeatureAccess: m.checkSoloFeatureAccess,
}));
vi.mock('@/lib/intelligence', () => ({
  analyzeUserPortfolio: m.analyzeUserPortfolio,
  clusterWorkflows: m.clusterWorkflows,
}));
vi.mock('@/lib/agent-intelligence', () => ({
  analyzePortfolioAgentIntelligence: m.analyzePortfolioAgentIntelligence,
}));
vi.mock('@/lib/email', () => ({ sendEmail: vi.fn() }));
vi.mock('@/db', () => ({
  db: {
    user: { findUnique: m.userFindUnique },
    processInsight: { findFirst: m.insightFindFirst, update: m.insightUpdate },
    apiKey: { create: m.apiKeyCreate, findFirst: m.apiKeyFindFirst, delete: m.apiKeyDelete },
    team: { create: m.teamCreate },
    teamMember: {
      findFirst: m.teamMemberFindFirst,
      findMany: m.teamMemberFindMany,
      count: m.teamMemberCount,
      findUnique: m.teamMemberFindUnique,
      update: m.teamMemberUpdate,
      updateMany: m.teamMemberUpdateMany,
    },
    workflow: { findFirst: m.workflowFindFirst },
    workflowShare: { upsert: m.workflowShareUpsert, deleteMany: m.workflowShareDeleteMany },
    passwordResetToken: { findFirst: m.passwordResetTokenFindFirst },
  },
}));

import { PATCH as insightPATCH } from './insights/[id]/route';
import { POST as keysPOST, DELETE as keysDELETE } from './keys/route';
import { POST as teamsPOST } from './teams/route';
import { POST as invitePOST } from './teams/[id]/invite/route';
import { GET as membersGET, DELETE as membersDELETE } from './teams/[id]/members/route';
import { PATCH as memberPATCH } from './teams/[id]/members/[memberId]/route';
import { POST as sharePOST, DELETE as shareDELETE } from './workflows/[id]/share/route';
import { POST as forgotPOST } from './auth/forgot-password/route';
import { POST as resetPOST } from './auth/reset-password/route';
import { POST as analyticsPOST } from './analytics/route';
import { POST as portfolioPOST } from './agent-intelligence/portfolio/route';

/** A value no response may ever contain: it proves the 400 does not echo input. */
const CANARY = 'CANARY-7f3a-do-not-echo';

type Handler = (req: NextRequest, ctx: { params: Record<string, string> }) => Promise<Response>;

function call(handler: Handler, method: string, path: string, body?: string, params: Record<string, string> = {}) {
  const req = new NextRequest(`http://localhost${path}`, {
    method,
    ...(body === undefined ? {} : { body, headers: { 'content-type': 'application/json' } }),
  });
  return handler(req, { params });
}

function expectNoApiError() {
  expect(m.trackServer).not.toHaveBeenCalledWith('api_error', expect.anything());
}

async function expect400NotEchoing(res: Response) {
  expect(res.status).toBe(400);
  expect(JSON.stringify(await res.json())).not.toContain(CANARY);
  expectNoApiError();
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  m.auth.mockResolvedValue({ user: { id: 'u1' } });
  m.userFindUnique.mockResolvedValue({ id: 'u1', email: 'me@example.com', plan: 'team' });
  m.checkFeatureAccess.mockResolvedValue({ allowed: true });
  m.checkSoloFeatureAccess.mockReturnValue({ allowed: true });
  m.insightFindFirst.mockResolvedValue({ id: 'i1' });
  m.insightUpdate.mockResolvedValue({});
  m.apiKeyCreate.mockResolvedValue({});
  m.apiKeyFindFirst.mockResolvedValue(null);
  m.teamCreate.mockResolvedValue({ id: 't1', name: 'Team', slug: 'team-abc' });
  m.teamMemberFindFirst.mockResolvedValue({ id: 'm1', role: 'owner', status: 'active' });
  m.teamMemberFindMany.mockResolvedValue([]);
  m.teamMemberCount.mockResolvedValue(0);
  m.teamMemberFindUnique.mockResolvedValue(null);
  m.workflowFindFirst.mockResolvedValue({ id: 'w1' });
  m.analyzeUserPortfolio.mockResolvedValue(null);
  m.analyzePortfolioAgentIntelligence.mockResolvedValue(null);
});

describe('PATCH /api/insights/[id]', () => {
  const patch = (b: string) => call(insightPATCH as Handler, 'PATCH', '/api/insights/i1', b, { id: 'i1' });

  it.each([`{"dismissed":"${CANARY}"}`, '{"dismissed":1}', 'null', '[]'])('wrong shape %s → 400', async (b) => {
    await expect400NotEchoing(await patch(b));
    expect(m.insightUpdate).not.toHaveBeenCalled();
  });

  it('valid body (what analytics/page.tsx sends) updates as before', async () => {
    const res = await patch('{"dismissed":true}');
    expect(res.status).toBe(200);
    expect(m.insightUpdate).toHaveBeenCalledWith({ where: { id: 'i1' }, data: { dismissed: true } });
  });
});

describe('POST/DELETE /api/keys', () => {
  it.each([`{"label":["${CANARY}"]}`, '{"label":5}', 'null', '[]'])('POST wrong shape %s → 400', async (b) => {
    await expect400NotEchoing(await call(keysPOST as Handler, 'POST', '/api/keys', b));
    expect(m.apiKeyCreate).not.toHaveBeenCalled();
  });

  it('POST valid body (account/page.tsx) keeps its label', async () => {
    const res = await call(keysPOST as Handler, 'POST', '/api/keys', '{"label":"Extension"}');
    expect(res.status).toBe(201);
    expect(m.apiKeyCreate.mock.calls[0]![0].data.label).toBe('Extension');
  });

  it('POST with no body, or malformed JSON, is still a valid create with the default label', async () => {
    for (const b of [undefined, '{nope', '{}']) {
      m.apiKeyCreate.mockClear();
      const res = await call(keysPOST as Handler, 'POST', '/api/keys', b);
      expect(res.status, String(b)).toBe(201);
      expect(m.apiKeyCreate.mock.calls[0]![0].data.label).toBe('Extension');
    }
  });

  it.each([`{"id":["${CANARY}"]}`, '{"id":5}', '{}', 'null'])('DELETE wrong shape %s → 400', async (b) => {
    await expect400NotEchoing(await call(keysDELETE as Handler, 'DELETE', '/api/keys', b));
    expect(m.apiKeyDelete).not.toHaveBeenCalled();
  });

  it('DELETE valid body (account/page.tsx) reaches the lookup', async () => {
    const res = await call(keysDELETE as Handler, 'DELETE', '/api/keys', '{"id":"k1"}');
    expect(res.status).toBe(404); // the route's own "Key not found" — the schema accepted it
  });
});

describe('POST /api/teams', () => {
  const post = (b: string) => call(teamsPOST as Handler, 'POST', '/api/teams', b);

  it.each([`{"name":["${CANARY}"]}`, '{"name":5}', '[]', 'null'])('wrong shape %s → 400, no reported 5xx', async (b) => {
    await expect400NotEchoing(await post(b));
    expect(m.teamCreate).not.toHaveBeenCalled();
  });

  it('valid body (teams/page.tsx) creates; a short/missing name keeps its own 400 message', async () => {
    expect((await post('{"name":"Ops Team"}')).status).toBe(200);
    for (const b of ['{}', '{"name":null}', '{"name":"a"}']) {
      const res = await post(b);
      expect(res.status, b).toBe(400);
      expect((await res.json()).error).toBe('Team name must be at least 2 characters');
    }
  });
});

describe('POST /api/teams/[id]/invite', () => {
  const post = (b: string) => call(invitePOST as Handler, 'POST', '/api/teams/t1/invite', b, { id: 't1' });

  it.each([
    `{"email":["${CANARY}"]}`,
    '{"email":5}',
    '{"email":{}}',
    `{"email":"a@b.co","role":["${CANARY}"]}`,
    'null',
    '[]',
  ])('wrong shape %s → 400, no reported 5xx (was a TypeError in normalizeEmail)', async (b) => {
    await expect400NotEchoing(await post(b));
  });

  it('valid body (teams/[id]/page.tsx) reaches the route’s own guards', async () => {
    const missing = await post('{"role":"member"}');
    expect(missing.status).toBe(400);
    expect((await missing.json()).error).toBe('Valid email is required');
    const self = await post('{"email":"me@example.com","role":"member"}');
    expect(self.status).toBe(400);
    expect((await self.json()).error).toBe('You cannot invite yourself');
  });
});

describe('/api/teams/[id]/members', () => {
  const del = (b: string) => call(membersDELETE as Handler, 'DELETE', '/api/teams/t1/members', b, { id: 't1' });
  const get = (qs = '') => call(membersGET as Handler, 'GET', `/api/teams/t1/members${qs}`, undefined, { id: 't1' });

  it.each([`{"userId":["${CANARY}"]}`, '{"userId":5}', 'null', '[]'])('DELETE wrong shape %s → 400', async (b) => {
    await expect400NotEchoing(await del(b));
    expect(m.teamMemberUpdateMany).not.toHaveBeenCalled();
  });

  it('DELETE valid body (teams/[id]/page.tsx) reaches the route’s own logic', async () => {
    const missing = await del('{}');
    expect((await missing.json()).error).toBe('userId is required');
    expect((await del('{"userId":"u2"}')).status).toBe(404); // "Member not found"
  });

  it.each(['?skip=-1', '?skip=abc', '?skip=1.5', '?skip=', '?skip=1e3', '?skip=100001', '?skip=99999999999999999999', '?take=0', '?take=abc', '?take=-5'])(
    'GET %s → 400, no reported 5xx, nothing queried',
    async (qs) => {
      const res = await get(qs);
      expect(res.status).toBe(400);
      expectNoApiError();
      expect(m.teamMemberFindMany).not.toHaveBeenCalled();
    },
  );

  it('GET valid skip/take are unchanged: absent → 0/50, in-range passes through, take above 100 clamps', async () => {
    await get();
    expect(m.teamMemberFindMany.mock.calls[0]![0]).toMatchObject({ skip: 0, take: 50 });
    await get('?skip=10&take=20');
    expect(m.teamMemberFindMany.mock.calls[1]![0]).toMatchObject({ skip: 10, take: 20 });
    await get('?skip=100000&take=999');
    expect(m.teamMemberFindMany.mock.calls[2]![0]).toMatchObject({ skip: 100000, take: 100 });
    await get('?skip=0');
    expect(m.teamMemberFindMany.mock.calls[3]![0]).toMatchObject({ skip: 0 });
  });
});

describe('PATCH /api/teams/[id]/members/[memberId]', () => {
  const patch = (b: string) =>
    call(memberPATCH as Handler, 'PATCH', '/api/teams/t1/members/m2', b, { id: 't1', memberId: 'm2' });

  it.each([`{"role":["${CANARY}"]}`, '{"role":5}', '{"role":"nope"}', 'null', '[]', '{nope'])('wrong shape %s → 400', async (b) => {
    const res = await patch(b);
    expect(res.status).toBe(400);
    expect(JSON.stringify(await res.json())).not.toContain(CANARY);
    expectNoApiError();
    expect(m.teamMemberUpdate).not.toHaveBeenCalled();
  });

  it('valid role is accepted and reaches the lookup', async () => {
    m.teamMemberFindFirst.mockResolvedValueOnce({ id: 'm1', role: 'owner', status: 'active' }).mockResolvedValueOnce(null);
    expect((await patch('{"role":"admin"}')).status).toBe(404); // "Member not found"
  });
});

describe('POST/DELETE /api/workflows/[id]/share', () => {
  const post = (b: string) => call(sharePOST as Handler, 'POST', '/api/workflows/w1/share', b, { id: 'w1' });
  const del = (b: string) => call(shareDELETE as Handler, 'DELETE', '/api/workflows/w1/share', b, { id: 'w1' });

  it.each([
    `{"email":["${CANARY}"]}`,
    '{"email":5}',
    '{"teamId":5}',
    `{"email":"a@b.co","permission":["${CANARY}"]}`,
    'null',
    '[]',
  ])('POST wrong shape %s → 400, no reported 5xx (was a TypeError in normalizeEmail)', async (b) => {
    await expect400NotEchoing(await post(b));
    expect(m.workflowShareUpsert).not.toHaveBeenCalled();
  });

  it('POST valid shapes reach the route’s own logic', async () => {
    const none = await post('{}');
    expect((await none.json()).error).toBe('email or teamId is required');
    m.userFindUnique.mockResolvedValueOnce(null);
    expect((await post('{"email":"x@y.co","permission":"viewer"}')).status).toBe(404); // "User not found"
  });

  it.each([`{"shareId":["${CANARY}"]}`, '{"shareId":5}', 'null', '[]'])('DELETE wrong shape %s → 400', async (b) => {
    await expect400NotEchoing(await del(b));
    expect(m.workflowShareDeleteMany).not.toHaveBeenCalled();
  });

  it('DELETE valid shapes reach the route’s own logic', async () => {
    expect(((await (await del('{}')).json()) as { error: string }).error).toBe('shareId is required');
    m.workflowShareDeleteMany.mockResolvedValue({ count: 1 });
    expect((await del('{"shareId":"s1"}')).status).toBe(200);
  });
});

describe('POST /api/auth/forgot-password', () => {
  const post = (b?: string) => call(forgotPOST as Handler, 'POST', '/api/auth/forgot-password', b);

  it.each(['null', '[]', '5', '{}', '{"email":5}', `{"email":["${CANARY}"]}`, '{"email":""}', '{nope', undefined])(
    'body %s → 400 "Email is required", no reported 5xx (JSON null used to throw on destructuring)',
    async (b) => {
      const res = await post(b);
      expect(res.status).toBe(400);
      const text = JSON.stringify(await res.json());
      expect(text).toBe('{"error":"Email is required"}');
      expectNoApiError();
    },
  );
});

describe('POST /api/auth/reset-password', () => {
  const post = (b?: string) => call(resetPOST as Handler, 'POST', '/api/auth/reset-password', b);

  it.each(['null', '[]', '5', '"s"'])('non-object body %s → 400, no reported 5xx (JSON null used to throw on destructuring)', async (b) => {
    const res = await post(b);
    expect(res.status).toBe(400);
    expectNoApiError();
  });

  it('keeps its distinct field messages', async () => {
    const msg = async (b?: string) => ((await (await post(b)).json()) as { error: string }).error;
    expect(await msg('{}')).toBe('Token, email, and password are required');
    expect(await msg('{nope')).toBe('Token, email, and password are required');
    expect(await msg('{"token":"t","email":"a@b.co","password":"short"}')).toBe('Password must be at least 8 characters');
    expect(await msg(`{"token":5,"email":"a@b.co","password":"longenough"}`)).toBe('Invalid request parameters');
  });

  it('a valid body (reset-password/page.tsx) reaches the token lookup', async () => {
    m.passwordResetTokenFindFirst.mockResolvedValue(null);
    const res = await post('{"token":"t","email":"a@b.co","password":"longenough"}');
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error: string }).error).toMatch(/Invalid or expired reset link/);
  });
});

describe('POST /api/analytics', () => {
  const post = (b?: string) => call(analyticsPOST as Handler, 'POST', '/api/analytics', b);

  it.each([`{"workflowIds":"${CANARY}"}`, '{"workflowIds":5}', '{"workflowIds":[1,2]}', 'null', '[]'])(
    'wrong shape %s → 400, no reported 5xx, analysis not started',
    async (b) => {
      await expect400NotEchoing(await post(b));
      expect(m.clusterWorkflows).not.toHaveBeenCalled();
    },
  );

  it('no body (dashboard/page.tsx), {} (analytics/page.tsx) and malformed JSON analyse everything, as before', async () => {
    for (const b of [undefined, '{}', '{nope']) {
      m.analyzeUserPortfolio.mockClear();
      const res = await post(b);
      expect(res.status, String(b)).toBe(404); // the route's own "No analyzable workflows found"
      expect(m.analyzeUserPortfolio).toHaveBeenCalledWith('u1', undefined);
    }
  });

  it('a valid workflowIds array is passed through unchanged', async () => {
    await post('{"workflowIds":["a","b"]}');
    expect(m.analyzeUserPortfolio).toHaveBeenCalledWith('u1', ['a', 'b']);
  });
});

describe('POST /api/agent-intelligence/portfolio', () => {
  const post = (b?: string) => call(portfolioPOST as Handler, 'POST', '/api/agent-intelligence/portfolio', b);

  it.each([`{"workflowIds":"${CANARY}"}`, '{"workflowIds":5}', '{"workflowIds":[1]}', 'null', '[]'])(
    'wrong shape %s → 400, no reported 5xx, analysis not started',
    async (b) => {
      await expect400NotEchoing(await post(b));
      expect(m.analyzePortfolioAgentIntelligence).not.toHaveBeenCalled();
    },
  );

  it('no body, {} and malformed JSON still analyse everything; a valid array scopes the analysis', async () => {
    for (const b of [undefined, '{}', '{nope']) {
      m.analyzePortfolioAgentIntelligence.mockClear();
      const res = await post(b);
      expect(res.status, String(b)).toBe(422); // the route's own "No workflows available"
      expect(m.analyzePortfolioAgentIntelligence).toHaveBeenCalledWith('u1', undefined);
    }
    await post('{"workflowIds":["a"]}');
    expect(m.analyzePortfolioAgentIntelligence).toHaveBeenLastCalledWith('u1', ['a']);
  });
});
