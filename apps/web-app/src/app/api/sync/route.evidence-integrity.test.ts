/**
 * Row #269 (3) - POST /api/sync evidence-integrity gate, at the route.
 *
 * route.test.ts mocks all of lib/ingestion, so it cannot see the gate. This
 * file uses the REAL validateBundle + checkBundleEvidenceIntegrity and only
 * stubs I/O. Mirrors upload/route.evidence-integrity.test.ts.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  uploadCreate: vi.fn(async (_args: unknown) => ({ id: 'up-1' })),
}));

vi.mock('@/db', () => ({
  db: {
    apiKey: {
      findUnique: vi.fn(async () => ({ id: 'key-1', userId: 'u1', keyHash: 'h' })),
      update: vi.fn(async () => ({})),
    },
    user: { findUnique: vi.fn(async () => ({ id: 'u1', plan: 'free', uploadCount: 0 })) },
    upload: { create: mocks.uploadCreate, update: vi.fn(async () => ({})) },
  },
}));
vi.mock('@/lib/api-keys', () => ({ hashKey: vi.fn(() => 'h') }));
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
// Stop right after the gate for the accepted cases.
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
import { trackServer } from '@/lib/analytics-server';
import { buildSampleBundle } from '@/lib/sample-workflow';

function post(bundle: unknown) {
  return POST(
    new NextRequest('http://localhost/api/sync', {
      method: 'POST',
      body: JSON.stringify(bundle),
      headers: { 'content-type': 'application/json', authorization: 'Bearer ldg_test_key' },
    }),
  );
}

function createdData(): { validationStatus: string; validationErrors: string | null } {
  return (mocks.uploadCreate.mock.calls[0] as unknown as [{ data: { validationStatus: string; validationErrors: string | null } }])[0].data;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fresh = (): any => JSON.parse(JSON.stringify(buildSampleBundle()));

describe('POST /api/sync evidence integrity (row #269 (3))', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('corrupt bundle (dangling evidence + duplicate id) -> 422, counts only, no ids echoed, no api_error', async () => {
    const b = fresh();
    // Give the event we duplicate a distinctive id before asserting it is not
    // echoed. The sample's own ids are short ('e1'), and the response also
    // carries a random uploadId — which contained 'e1' by chance about one run
    // in five, failing this test for no real reason (found at loop 104).
    const oldId = b.normalizedEvents[0].event_id;
    b.normalizedEvents[0].event_id = 'SECRET-DUP-EVENT-ID';
    for (const step of b.derivedSteps) {
      step.source_event_ids = step.source_event_ids.map((id: string) => (id === oldId ? 'SECRET-DUP-EVENT-ID' : id));
    }
    b.derivedSteps[0].source_event_ids.push('SECRET-GHOST-ID');
    b.normalizedEvents.push({ ...b.normalizedEvents[0] });
    const res = await post(b);
    expect(res.status).toBe(422);
    const text = await res.text();
    expect(JSON.parse(text)).toMatchObject({
      error: 'Bundle evidence integrity check failed',
      unresolvedSourceRefs: 1,
      duplicateEventIds: 1,
      sessionIdMismatches: 0,
    });
    expect(text).not.toContain('SECRET-GHOST-ID');
    expect(text).not.toContain(b.normalizedEvents[0].event_id);
    expect(reportApiError).not.toHaveBeenCalled();
    expect(createdData().validationStatus).toBe('invalid');
    const stored = createdData().validationErrors ?? '';
    expect(stored).not.toContain('SECRET-GHOST-ID');
    expect(stored).not.toContain(b.normalizedEvents[0].event_id);
    expect(trackServer).toHaveBeenCalledWith('upload_failed', expect.objectContaining({ error: 'bundle_evidence_integrity_failed' }));
  });

  it('a step with an empty evidence list is rejected like unresolved evidence (row #269 (4))', async () => {
    const b = fresh();
    b.derivedSteps[0].source_event_ids = [];
    const res = await post(b);
    expect(res.status).toBe(422);
    expect(await res.json()).toMatchObject({ error: 'Bundle evidence integrity check failed', unresolvedSourceRefs: 1 });
  });

  it('session-mismatch-only bundle is accepted past the gate and bundle_session_id_mismatch is tracked', async () => {
    const b = fresh();
    b.normalizedEvents[0].session_id = 'previous-session-from-bfcache';
    b.normalizedEvents[1].session_id = 'previous-session-from-bfcache';
    const res = await post(b);
    const text = await res.text();
    expect(JSON.parse(text).error).not.toBe('Bundle evidence integrity check failed');
    expect(createdData().validationStatus).toBe('valid');
    expect(trackServer).toHaveBeenCalledWith('bundle_session_id_mismatch', {
      path: 'sync',
      sessionIdMismatches: 2,
      rejectedForOtherReasons: false,
    });
    expect(JSON.stringify(vi.mocked(trackServer).mock.calls)).not.toContain('previous-session-from-bfcache');
    expect(text).not.toContain('previous-session-from-bfcache');
  });

  it('a clean bundle passes the gate and tracks no mismatch', async () => {
    const res = await post(buildSampleBundle());
    expect((await res.json()).error).not.toBe('Bundle evidence integrity check failed');
    expect(createdData().validationStatus).toBe('valid');
    expect(trackServer).not.toHaveBeenCalledWith('bundle_session_id_mismatch', expect.anything());
  });
});
