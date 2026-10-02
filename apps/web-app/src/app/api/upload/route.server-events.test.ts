/**
 * Row #295 follow-up: web uploads must reach the upload alerts, which count
 * only source:'server' rows. Uses the REAL trackServer + an in-memory
 * analyticsEvent table, then runs computeAlerts over what the route wrote.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const h = vi.hoisted(() => ({
  rows: [] as Array<{ userId?: string | null; eventName: string; source: string; createdAt: Date; properties: string }>,
}));

vi.mock('@/lib/auth', () => ({ auth: vi.fn(async () => ({ user: { id: 'u1' } })) }));
vi.mock('@/db', () => ({
  db: {
    user: { findUnique: vi.fn(async () => ({ id: 'u1', plan: 'free', uploadCount: 0 })), update: vi.fn(async () => ({})) },
    upload: { create: vi.fn(async () => ({ id: 'up-1' })), update: vi.fn() },
    workflow: { create: vi.fn(async () => ({ id: 'wf-1' })) },
    analyticsEvent: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      create: vi.fn(async ({ data }: any) => {
        h.rows.push({ userId: data.userId, eventName: data.eventName, source: data.source, createdAt: new Date(), properties: data.properties });
        return {};
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      count: vi.fn(async ({ where }: any) =>
        h.rows.filter((r) => r.eventName === where.eventName && (!where.source || r.source === where.source)).length),
      findMany: vi.fn(async () => []),
      groupBy: vi.fn(async () => []),
    },
  },
}));
vi.mock('@/lib/posthog-server', () => ({ captureServerEvent: vi.fn() }));
vi.mock('@/lib/feature-gating', () => ({
  checkRecordingLimit: vi.fn(async () => ({ allowed: true, used: 0, limit: 5 })),
}));
vi.mock('@/lib/api-error-reporting', () => ({ reportApiError: vi.fn() }));
vi.mock('@/lib/intelligence', () => ({ clusterWorkflows: vi.fn(async () => {}) }));
vi.mock('@/lib/storage', () => ({ UPLOAD_DIR: 'C:/nonexistent-upload-dir-for-test' }));
vi.mock('fs', () => {
  const m = { existsSync: vi.fn(() => true), mkdirSync: vi.fn(), writeFileSync: vi.fn() };
  return { default: m, ...m };
});

import { POST } from './route';
import { buildSampleBundle } from '@/lib/sample-workflow';
import { computeAlerts } from '@/lib/compute-alerts';

function post(bundle: unknown) {
  const fd = new FormData();
  fd.set('file', new File([JSON.stringify(bundle)], 'b.json', { type: 'application/json' }));
  return POST(new NextRequest('http://localhost/api/upload', { method: 'POST', body: fd }));
}
const flush = () => new Promise((r) => setTimeout(r, 0));
const named = (n: string) => h.rows.filter((r) => r.eventName === n && r.source === 'server');

describe('POST /api/upload server analytics (row #295 follow-up)', () => {
  beforeEach(() => {
    h.rows.length = 0;
  });

  it('success -> exactly one server workflow_uploaded, PII-free, via web', async () => {
    const res = await post(buildSampleBundle());
    await flush();
    expect(res.status).toBe(201);
    const rows = named('workflow_uploaded');
    expect(rows).toHaveLength(1);
    expect(rows[0]!.userId).toBe('u1'); // retention/engagement attribute by userId
    const props = JSON.parse(rows[0]!.properties);
    expect(props).toMatchObject({ workflowId: 'wf-1', via: 'web', uploadNumber: 1 });
    expect(Object.keys(props).sort()).toEqual(
      ['confidence', 'durationMs', 'phaseCount', 'stepCount', 'systemCount', 'uploadNumber', 'via', 'workflowId'].sort(),
    );
  });

  it('validation failure -> server upload_failed', async () => {
    const res = await post({ not: 'a bundle' });
    await flush();
    expect(res.status).toBe(422);
    expect(named('upload_failed')).toHaveLength(1);
    expect(JSON.parse(named('upload_failed')[0]!.properties)).toMatchObject({ error: 'bundle_validation_failed', via: 'web' });
    expect(named('workflow_uploaded')).toHaveLength(0);
  });

  it('integrity failure -> server upload_failed', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const b: any = JSON.parse(JSON.stringify(buildSampleBundle()));
    b.derivedSteps[0].source_event_ids.push('ghost');
    expect((await post(b)).status).toBe(422);
    await flush();
    expect(JSON.parse(named('upload_failed')[0]!.properties).error).toBe('bundle_evidence_integrity_failed');
  });

  it('zero_uploads_24h stays ok when only web uploads occurred', async () => {
    await post(buildSampleBundle());
    await flush();
    const a = (await computeAlerts()).find((x) => x.id === 'zero_uploads_24h')!;
    expect(a.status).toBe('ok');
    expect(a.value).toBe(1);
  });
});
