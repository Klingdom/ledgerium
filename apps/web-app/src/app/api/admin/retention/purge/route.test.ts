/**
 * POST /api/admin/retention/purge (row #319). Mirrors alerts/check auth tests.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

const purge = vi.hoisted(() => vi.fn());
vi.mock('@/lib/workflow-retention', async (orig) => ({
  ...(await orig<typeof import('@/lib/workflow-retention')>()),
  purgeExpiredWorkflows: purge,
}));
vi.mock('@/db', () => ({ db: {} }));
vi.mock('@/lib/storage', () => ({ UPLOAD_DIR: '/data/uploads' }));
vi.mock('@/lib/api-error-reporting', () => ({ reportApiError: vi.fn() }));

import { POST } from './route';
import * as routeModule from './route';
import { reportApiError } from '@/lib/api-error-reporting';

const SECRET = 'test-cron-secret-value';
const URL_BASE = 'http://localhost/api/admin/retention/purge';
const req = (opts: { auth?: string; query?: string; method?: string } = {}) =>
  new NextRequest(URL_BASE + (opts.query ?? ''), {
    method: opts.method ?? 'POST',
    headers: opts.auth ? { authorization: opts.auth } : {},
  });
const summary = {
  dryRun: false, retentionDays: 30, eligible: 2, purged: 2, skipped: 0, failed: 0,
  uploadsRemoved: 2, filesRemoved: 2, fileFailures: 0, definitionsRemoved: 1, hasMore: false,
};

describe('POST /api/admin/retention/purge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = SECRET;
    delete process.env.WORKFLOW_PURGE_AFTER_DAYS;
    purge.mockResolvedValue(summary);
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.CRON_SECRET;
    delete process.env.WORKFLOW_PURGE_AFTER_DAYS;
  });

  it('exports POST only (no GET: a purge must not be prefetchable)', () => {
    expect(Object.keys(routeModule).filter((k) => /^(GET|PUT|PATCH|DELETE)$/.test(k))).toEqual([]);
  });

  it('503 when CRON_SECRET is not configured, and reports it', async () => {
    delete process.env.CRON_SECRET;
    const res = await POST(req({ auth: `Bearer ${SECRET}` }));
    expect(res.status).toBe(503);
    expect(reportApiError).toHaveBeenCalledWith('/api/admin/retention/purge', 503);
    expect(purge).not.toHaveBeenCalled();
  });

  it('401 with no header, a wrong secret, or a query-string secret', async () => {
    expect((await POST(req())).status).toBe(401);
    expect((await POST(req({ auth: 'Bearer wrong-secret-value-xx' }))).status).toBe(401);
    expect((await POST(req({ query: `?secret=${SECRET}` }))).status).toBe(401);
    expect(purge).not.toHaveBeenCalled();
  });

  it('200 with counts only; default 30 days, not a dry run', async () => {
    const res = await POST(req({ auth: `Bearer ${SECRET}` }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(summary);
    expect(purge.mock.calls[0]![1]).toMatchObject({ retentionDays: 30, dryRun: false });
  });

  it('?dryRun=1 passes dryRun and still answers 200', async () => {
    purge.mockResolvedValue({ ...summary, dryRun: true, purged: 0 });
    const res = await POST(req({ auth: `Bearer ${SECRET}`, query: '?dryRun=1' }));
    expect(res.status).toBe(200);
    expect(purge.mock.calls[0]![1]).toMatchObject({ dryRun: true });
  });

  it('uses WORKFLOW_PURGE_AFTER_DAYS when valid', async () => {
    process.env.WORKFLOW_PURGE_AFTER_DAYS = '45';
    await POST(req({ auth: `Bearer ${SECRET}` }));
    expect(purge.mock.calls[0]![1]).toMatchObject({ retentionDays: 45 });
  });

  it('500 and purges nothing when WORKFLOW_PURGE_AFTER_DAYS is invalid', async () => {
    process.env.WORKFLOW_PURGE_AFTER_DAYS = '0';
    const res = await POST(req({ auth: `Bearer ${SECRET}` }));
    expect(res.status).toBe(500);
    expect(purge).not.toHaveBeenCalled();
    expect(reportApiError).toHaveBeenCalledWith('/api/admin/retention/purge', 500);
  });

  it('500 with counts when any workflow or file failed (the job must go red)', async () => {
    purge.mockResolvedValue({ ...summary, failed: 1 });
    const res = await POST(req({ auth: `Bearer ${SECRET}` }));
    expect(res.status).toBe(500);
    expect((await res.json()).failed).toBe(1);
    purge.mockResolvedValue({ ...summary, fileFailures: 1 });
    expect((await POST(req({ auth: `Bearer ${SECRET}` }))).status).toBe(500);
  });

  it('500 without leaking the error when the purge throws', async () => {
    purge.mockRejectedValue(new Error('DB path /secret/title'));
    const res = await POST(req({ auth: `Bearer ${SECRET}` }));
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toMatch(/secret/);
  });
});
