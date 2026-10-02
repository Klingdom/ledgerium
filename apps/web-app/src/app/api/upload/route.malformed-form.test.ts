/**
 * Row #262 — `POST /api/upload` with a body that is not a usable multipart
 * upload answers 400, reports no `api_error`, and never echoes error text.
 * Previously: `formData()` threw into the route's catch -> reported 500 with
 * `detail: err.message`.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth', () => ({ auth: vi.fn(async () => ({ user: { id: 'u1' } })) }));
vi.mock('@/db', () => ({ db: { user: { findUnique: vi.fn(async () => ({ id: 'u1', plan: 'free' })) } } }));
vi.mock('@/lib/analytics-server', () => ({ trackServer: vi.fn() }));
vi.mock('@/lib/feature-gating', () => ({
  checkRecordingLimit: vi.fn(async () => ({ allowed: true, used: 0, limit: 5 })),
}));
vi.mock('@/lib/api-error-reporting', () => ({ reportApiError: vi.fn() }));
vi.mock('@/lib/intelligence', () => ({ clusterWorkflows: vi.fn() }));

import { POST } from './route';
import { reportApiError } from '@/lib/api-error-reporting';

function post(init: { body: BodyInit; headers?: Record<string, string> }) {
  return POST(new NextRequest('http://localhost/api/upload', { method: 'POST', ...init }));
}

describe('POST /api/upload malformed form body (row #262)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    ['JSON content-type', { body: '{"a":1}', headers: { 'content-type': 'application/json' } }],
    ['no content-type', { body: 'garbage' }],
    [
      'multipart with a broken boundary',
      { body: '--x\r\nnot a part', headers: { 'content-type': 'multipart/form-data; boundary=zzz' } },
    ],
  ])('%s -> 400, no api_error, no error text in the body', async (_l, init) => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await post(init);
    expect(res.status).toBe(400);
    const text = await res.text();
    expect(JSON.parse(text)).toEqual({ error: 'Request must be a multipart/form-data upload' });
    expect(text).not.toMatch(/detail|stack|TypeError|Failed to parse/i);
    expect(reportApiError).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('a text field named "file" (not a File) -> 400 "No file provided", not a TypeError 500', async () => {
    const fd = new FormData();
    fd.set('file', 'just a string');
    const res = await post({ body: fd });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'No file provided' });
    expect(reportApiError).not.toHaveBeenCalled();
  });

  it('a non-.json file is still 400 (existing behaviour unchanged)', async () => {
    const fd = new FormData();
    fd.set('file', new File(['x'], 'a.txt', { type: 'text/plain' }));
    const res = await post({ body: fd });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Only JSON files are supported' });
  });

  it('an unexpected server failure is still a 500 but carries no message', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const fd = new FormData();
    fd.set('file', new File(['{"ok":true}'], 'a.json', { type: 'application/json' }));
    // db.upload is absent from the mock -> the handler throws after the form is
    // accepted, exercising the route's own catch (which used to return
    // `detail: err.message`).
    const res = await post({ body: fd });
    expect(res.status).toBe(500);
    const text = await res.text();
    expect(JSON.parse(text)).toEqual({ error: 'Internal server error' });
    expect(reportApiError).toHaveBeenCalledWith('/api/upload', 500);
    spy.mockRestore();
  });
});
