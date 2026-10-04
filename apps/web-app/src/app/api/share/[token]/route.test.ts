/**
 * #388 — GET /api/share/[token] must not let the share token (a bearer
 * capability) leave the app through analytics: not in the stored
 * AnalyticsEvent.properties, not in logs (server events no longer reach PostHog at all, #404).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

const TOKEN = 'shrTOKEN9f8e7d6c5b4a';

vi.mock('@/db', () => ({
  db: {
    workflow: {
      findFirst: vi.fn(),
      update: vi.fn().mockResolvedValue({}),
    },
    analyticsEvent: { create: vi.fn().mockResolvedValue({}) },
  },
}));

describe('GET /api/share/[token] analytics (#388)', () => {
  let GET: (req: NextRequest, ctx: { params: { token: string } }) => Promise<Response>;
  let dbMod: any;

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubEnv('NODE_ENV', 'production'); // exercise the console.log branch
    dbMod = await import('@/db');
    dbMod.db.workflow.findFirst.mockResolvedValue({
      id: 'wf_1', userId: 'owner_1', title: 't', stepCount: 1, durationMs: 1, phaseCount: 1,
      confidence: 1, toolsUsed: null, createdAt: new Date(0), artifacts: [],
    });
    ({ GET } = (await import('./route')) as any);
  });
  afterEach(() => { vi.unstubAllEnvs(); });

  it('keeps the token out of the stored properties, and the log', async () => {
    const logs: unknown[][] = [];
    const spy = vi.spyOn(console, 'log').mockImplementation((...a) => { logs.push(a); });
    const res = await GET(new NextRequest(`http://localhost/api/share/${TOKEN}`), { params: { token: TOKEN } });
    expect(res.status).toBe(200);
    await Promise.resolve();
    await Promise.resolve();

    const create = dbMod.db.analyticsEvent.create.mock.calls;
    expect(create).toHaveLength(1);
    expect(create[0][0].data.eventName).toBe('shared_workflow_viewed');
    const stored = JSON.parse(create[0][0].data.properties);
    expect(stored).toEqual({ workflowId: 'wf_1', ownerId: 'owner_1' });
    expect(JSON.stringify(create)).not.toContain(TOKEN);

    const analyticsLogs = logs.filter((l) => l[0] === '[analytics:server]');
    expect(analyticsLogs).toEqual([['[analytics:server]', 'shared_workflow_viewed']]);
    expect(JSON.stringify(logs)).not.toContain(TOKEN);
    spy.mockRestore();
  });
});
