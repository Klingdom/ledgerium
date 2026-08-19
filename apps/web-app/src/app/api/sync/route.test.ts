/**
 * Integration test: POST /api/sync — proves the workspace-aware
 * `checkRecordingLimit` fix end-to-end at a real route (the extension's
 * upload path), not just at the feature-gating.ts unit level.
 *
 * `docs/meta/REVENUE_PLAN_20K/team_workspace_status.md` §3.1 named this route
 * directly: "the recording-quota gate ... consumed by upload/route.ts and
 * sync/route.ts — still reads user.plan directly, never effectivePlanFor."
 *
 * Only the recording-limit gate (the earliest possible exit in the handler)
 * is exercised here — the full ingestion pipeline (process engine, template
 * rendering, filesystem writes) is out of scope for this test and is already
 * covered elsewhere; this file proves the gate wiring only.
 *
 * No production code is modified by this file.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/db', () => ({
  db: {
    apiKey: {
      findUnique: vi.fn(),
      update: vi.fn().mockResolvedValue({}),
    },
    user: { findUnique: vi.fn() },
    upload: {
      count: vi.fn(),
      create: vi.fn().mockResolvedValue({ id: 'upload-1' }),
      update: vi.fn().mockResolvedValue({ id: 'upload-1' }),
    },
    teamMember: { findMany: vi.fn() },
  },
}));
vi.mock('@/lib/api-keys', () => ({ hashKey: vi.fn(() => 'hashed-key') }));
vi.mock('@/lib/analytics-server', () => ({ trackServer: vi.fn() }));
vi.mock('@/lib/intelligence', () => ({ clusterWorkflows: vi.fn().mockResolvedValue(undefined) }));
vi.mock('@/lib/ingestion', () => ({
  validateBundle: vi.fn(),
  runProcessEngine: vi.fn(),
  buildWorkflowReportFromOutput: vi.fn(),
  renderAllTemplates: vi.fn(),
}));

import { POST } from './route';
import { db } from '@/db';

const mockApiKeyFindUnique = vi.mocked((db as any).apiKey.findUnique);
const mockUserFindUnique = vi.mocked(db.user.findUnique);
const mockUploadCount = vi.mocked(db.upload.count);
const mockTeamMemberFindMany = vi.mocked((db as any).teamMember.findMany);

const USER_ID = 'user-1';

function makeReq(body: unknown = { sessionJson: {} }): NextRequest {
  return new NextRequest('http://localhost/api/sync', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'content-type': 'application/json',
      authorization: 'Bearer ldg_test_key',
    },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockApiKeyFindUnique.mockResolvedValue({
    id: 'key-1',
    userId: USER_ID,
    keyHash: 'hashed-key',
  });
  mockUserFindUnique.mockResolvedValue({ id: USER_ID, plan: 'free', uploadCount: 5 } as never);
  mockUploadCount.mockResolvedValue(5); // at the free-tier cap
  mockTeamMemberFindMany.mockResolvedValue([]);
});

describe('POST /api/sync — solo free user (no team)', () => {
  it('THE BUG must remain absent for solo users: still capped at the free-tier recording limit (403)', async () => {
    const res = await POST(makeReq());
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.code).toBe('UPGRADE_REQUIRED');
    expect(body.limit).toBe(5);
  });

  it('queried the caller\'s own active team memberships (not an arbitrary user)', async () => {
    await POST(makeReq());
    expect(mockTeamMemberFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: USER_ID, status: 'active' } }),
    );
  });
});

describe('POST /api/sync — free user in an active Team-plan workspace', () => {
  it('THE FIX: recording-limit gate resolves to the workspace plan (unlimited), not the solo free cap', async () => {
    mockTeamMemberFindMany.mockResolvedValue([{ team: { plan: 'team' } }] as never);
    // With an unlimited effective plan, checkRecordingLimit short-circuits
    // before ever touching db.upload.count — so the gate passes regardless
    // of the same at-the-cap upload history that blocked the solo case above.
    const { validateBundle } = await import('@/lib/ingestion');
    vi.mocked(validateBundle).mockReturnValue({ valid: false, errors: ['stub'] } as never);

    const res = await POST(makeReq());
    // Not blocked by the recording-limit gate — falls through to bundle
    // validation, which we've stubbed to fail with 422, proving we got past
    // the gate rather than being blocked by it.
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.code).not.toBe('UPGRADE_REQUIRED');
    expect(mockUploadCount).not.toHaveBeenCalled();
  });
});
