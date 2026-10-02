import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth', () => ({ auth: vi.fn(async () => ({ user: { id: 'u1' } })) }));
vi.mock('@/db', () => ({ db: { apiKey: { findFirst: vi.fn(), delete: vi.fn() } } }));
vi.mock('@/lib/api-keys', () => ({ generateApiKey: vi.fn() }));
vi.mock('@/lib/analytics-server', () => ({ trackServer: vi.fn() }));

import { DELETE } from './route';
import { trackServer } from '@/lib/analytics-server';

describe('DELETE /api/keys malformed body (row #16)', () => {
  it('answers 400 and reports NO api_error (row #258; was a reported 500 under row #16)', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const req = new NextRequest('http://localhost/api/keys', { method: 'DELETE', body: '{not json' });
    const res = await DELETE(req);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Invalid JSON body' });
    expect(trackServer).not.toHaveBeenCalledWith('api_error', expect.anything());
    spy.mockRestore();
  });
});
