/**
 * Row #10 - POST /api/upload rejects a shape-valid bundle whose step evidence
 * does not resolve: 422, counts only, no ids echoed, no `api_error`.
 * A valid bundle still passes the integrity gate.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  uploadCreate: vi.fn(async (_args: unknown) => ({ id: 'up-1' })),
}));

vi.mock('@/lib/auth', () => ({ auth: vi.fn(async () => ({ user: { id: 'u1' } })) }));
vi.mock('@/db', () => ({
  db: {
    user: { findUnique: vi.fn(async () => ({ id: 'u1', plan: 'free' })) },
    upload: { create: mocks.uploadCreate, update: vi.fn() },
  },
}));
vi.mock('@/lib/analytics-server', () => ({ trackServer: vi.fn() }));
vi.mock('@/lib/feature-gating', () => ({
  checkRecordingLimit: vi.fn(async () => ({ allowed: true, used: 0, limit: 5 })),
}));
vi.mock('@/lib/api-error-reporting', () => ({ reportApiError: vi.fn() }));
vi.mock('@/lib/intelligence', () => ({ clusterWorkflows: vi.fn() }));
vi.mock('@/lib/storage', () => ({ UPLOAD_DIR: 'C:/nonexistent-upload-dir-for-test' }));
vi.mock('fs', () => {
  const m = { existsSync: vi.fn(() => true), mkdirSync: vi.fn(), writeFileSync: vi.fn() };
  return { default: m, ...m };
});
// Stop right after the integrity gate for the valid-bundle case.
vi.mock('@ledgerium/process-engine', async (orig) => {
  const actual = await orig<typeof import('@ledgerium/process-engine')>();
  return {
    ...actual,
    processSession: vi.fn(() => {
      throw new Error('stop-after-gate');
    }),
  };
});

import { POST } from './route';
import { reportApiError } from '@/lib/api-error-reporting';
import { buildSampleBundle } from '@/lib/sample-workflow';

function post(bundle: unknown) {
  const fd = new FormData();
  fd.set('file', new File([JSON.stringify(bundle)], 'b.json', { type: 'application/json' }));
  return POST(new NextRequest('http://localhost/api/upload', { method: 'POST', body: fd }));
}

function createdData(): { validationStatus: string; validationErrors: string | null } {
  return (mocks.uploadCreate.mock.calls[0] as unknown as [{ data: { validationStatus: string; validationErrors: string | null } }])[0].data;
}

describe('POST /api/upload evidence integrity (row #10)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('dangling source_event_ids -> 422 with counts only, no ids, no api_error', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const b: any = JSON.parse(JSON.stringify(buildSampleBundle()));
    b.derivedSteps[0].source_event_ids.push('SECRET-GHOST-ID');
    const res = await post(b);
    expect(res.status).toBe(422);
    const text = await res.text();
    expect(JSON.parse(text)).toMatchObject({
      error: 'Bundle evidence integrity check failed',
      unresolvedSourceRefs: 1,
      duplicateEventIds: 0,
      sessionIdMismatches: 0,
    });
    expect(text).not.toContain('SECRET-GHOST-ID');
    expect(reportApiError).not.toHaveBeenCalled();
    // Recorded as an invalid upload, counts only.
    expect(createdData().validationStatus).toBe('invalid');
    expect(createdData().validationErrors).not.toContain('SECRET-GHOST-ID');
  });

  it('duplicate event ids and session mismatch are counted, ids not echoed', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const b: any = JSON.parse(JSON.stringify(buildSampleBundle()));
    b.normalizedEvents.push({ ...b.normalizedEvents[0], session_id: 'SECRET-OTHER-SESSION' });
    const res = await post(b);
    expect(res.status).toBe(422);
    const text = await res.text();
    expect(JSON.parse(text)).toMatchObject({ duplicateEventIds: 1, sessionIdMismatches: 1 });
    expect(text).not.toContain('SECRET-OTHER-SESSION');
  });

  it('a valid bundle passes the gate (reaches the engine, not the 422)', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await post(buildSampleBundle());
    // Assert the property, not a status number. This originally read
    // `not.toBe(400)` and passed while the response was a 422 from a later
    // stage (the engine, under this test's mocks) — true by accident of which
    // number the gate used. What matters is that the gate did not reject it.
    const body = await res.json();
    expect(body.error).not.toBe('Bundle evidence integrity check failed');
    expect(body).not.toHaveProperty('unresolvedSourceRefs');
    expect(createdData().validationStatus).toBe('valid');
  });
});
