/** Row #258 — a route with NO enclosing try: the thrown 400 reaches withApiRoute. */
import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth', () => ({ auth: vi.fn(async () => ({ user: { id: 'u1' } })) }));
vi.mock('@/db', () => ({ db: { tag: {} } }));
vi.mock('@/lib/analytics-server', () => ({ trackServer: vi.fn() }));

import { POST } from './route';
import { trackServer } from '@/lib/analytics-server';

describe('POST /api/tags malformed body (row #258)', () => {
  it('is 400 with no api_error report', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await POST(new NextRequest('http://localhost/api/tags', { method: 'POST', body: '{not json' }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Invalid JSON body' });
    expect(trackServer).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
