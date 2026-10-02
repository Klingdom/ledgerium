import { describe, it, expect, vi, beforeEach } from 'vitest';

const purge = vi.hoisted(() => vi.fn(async (..._a: unknown[]) => ({
  dryRun: false, retentionDays: 30, eligible: 0, purged: 0, skipped: 0, failed: 0,
  uploadsRemoved: 0, filesRemoved: 0, fileFailures: 0, definitionsRemoved: 0, orphansRemoved: 0, hasMore: false,
})));
vi.mock('@/lib/workflow-retention', async (orig) => ({
  ...(await orig<typeof import('@/lib/workflow-retention')>()),
  purgeExpiredWorkflows: purge,
}));
vi.mock('@/db', () => ({ db: {} }));
vi.mock('@/lib/storage', () => ({ UPLOAD_DIR: '/tmp/uploads' }));
vi.mock('@/lib/cron-auth', () => ({ verifyCronBearer: () => 'ok' }));
vi.mock('@/lib/api-error-reporting', () => ({ reportApiError: vi.fn() }));
vi.mock('@/lib/with-api-route', () => ({ withApiRoute: (_n: string, h: unknown) => h }));

import { POST } from './route';

const call = (q: string) =>
  (POST as unknown as (r: unknown) => Promise<Response>)({
    nextUrl: new URL(`http://x/api/admin/retention/purge${q}`),
    headers: new Headers(),
  });

describe('#319 dryRun fails closed', () => {
  beforeEach(() => purge.mockClear());
  it.each(['?dryRun=yes', '?dryRun=', '?dryRun=2', '?dryRun=ture'])('%s -> 400, nothing purged', async (q) => {
    const res = await call(q);
    expect(res.status).toBe(400);
    expect(purge).not.toHaveBeenCalled();
  });
  it.each([['', false], ['?dryRun=1', true], ['?dryRun=TRUE', true], ['?dryRun=0', false], ['?dryRun=False', false]] as const)(
    '%s accepted',
    async (q, dry) => {
      const res = await call(q);
      expect(res.status).toBe(200);
      expect(purge.mock.calls[0]![1]).toMatchObject({ dryRun: dry });
    },
  );
});
