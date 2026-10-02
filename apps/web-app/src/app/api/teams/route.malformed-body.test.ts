/**
 * Row #258 — malformed body is a 400, never a reported 5xx.
 * POST /api/teams calls readJsonBody INSIDE its own broad try/catch whose
 * handler returns a reported 500: the thrown 400 must survive that catch.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth', () => ({ auth: vi.fn(async () => ({ user: { id: 'u1' } })) }));
vi.mock('@/db', () => ({ db: { user: { findUnique: vi.fn(async () => ({ id: 'u1', plan: 'team' })) } } }));
vi.mock('@/lib/feature-gating', () => ({ checkSoloFeatureAccess: vi.fn(() => ({ allowed: true })) }));
vi.mock('@/lib/analytics-server', () => ({ trackServer: vi.fn() }));

import { POST } from './route';
import { trackServer } from '@/lib/analytics-server';

const post = (body: string) =>
  new NextRequest('http://localhost/api/teams', { method: 'POST', body });

describe('POST /api/teams malformed body (row #258)', () => {
  beforeEach(() => {
    vi.mocked(trackServer).mockClear();
  });

  it.each(['{not json', '', 'null'])('answers %j with 400 and reports no api_error', async (raw) => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await POST(post(raw));
    expect(res.status).toBe(400);
    expect(trackServer).not.toHaveBeenCalledWith('api_error', expect.anything());
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
