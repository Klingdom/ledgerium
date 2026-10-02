import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth', () => ({ auth: vi.fn(async () => ({ user: { id: 'u1' } })) }));
vi.mock('@/db', () => ({ db: { apiKey: { findFirst: vi.fn(), delete: vi.fn() } } }));
vi.mock('@/lib/api-keys', () => ({ generateApiKey: vi.fn() }));
vi.mock('@/lib/analytics-server', () => ({ trackServer: vi.fn() }));

import { DELETE } from './route';
import { trackServer } from '@/lib/analytics-server';

describe('DELETE /api/keys malformed body (row #16)', () => {
  it('yields the non-leaking 500 and reports api_error, rather than an unobserved crash', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const req = new NextRequest('http://localhost/api/keys', { method: 'DELETE', body: '{not json' });
    const res = await DELETE(req);
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Internal server error' });
    expect(trackServer).toHaveBeenCalledWith('api_error', { endpoint: '/api/keys', status: 500 });
    spy.mockRestore();
  });
});
