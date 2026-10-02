import { describe, it, expect, vi, beforeEach, afterEach, type MockInstance } from 'vitest';
import { NextResponse } from 'next/server';
// Next's OWN constructors, so a Next upgrade that changes a digest fails here
// rather than silently turning control flow into a prerendered 500.
import { redirect } from 'next/navigation';
import { notFound } from 'next/dist/client/components/not-found';
import { DynamicServerError } from 'next/dist/client/components/hooks-server-context';

vi.mock('./api-error-reporting', () => ({ reportApiError: vi.fn() }));

import { withApiRoute, isNextControlFlowError } from './with-api-route';
import { reportApiError } from './api-error-reporting';

describe('withApiRoute (rows #8 / #253)', () => {
  let errSpy: MockInstance;
  beforeEach(() => {
    vi.mocked(reportApiError).mockClear();
    errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => errSpy.mockRestore());

  it('returns the handler response untouched and reports nothing', async () => {
    const res = NextResponse.json({ ok: true }, { status: 201 });
    const wrapped = withApiRoute('/api/x', async () => res);
    expect(await wrapped()).toBe(res);
    expect(reportApiError).not.toHaveBeenCalled();
  });

  it('passes (req, ctx) through and supports sync handlers', async () => {
    const handler = vi.fn((req: string, ctx: { params: { id: string } }) => `${req}:${ctx.params.id}`);
    const wrapped = withApiRoute('/api/x/[id]', handler);
    // Sync in, sync out: not a Promise.
    expect(wrapped('r', { params: { id: '7' } })).toBe('r:7');
    expect(handler).toHaveBeenCalledWith('r', { params: { id: '7' } });
  });

  it('turns an uncaught throw into a non-leaking 500 and reports it', async () => {
    const wrapped = withApiRoute('/api/x', async () => {
      throw new Error('title "Quarterly payroll" failed');
    });
    const res = (await wrapped()) as Response;
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ error: 'Internal server error' });
    expect(JSON.stringify(body)).not.toContain('payroll');
    expect(reportApiError).toHaveBeenCalledWith('/api/x', 500);
    // Full detail stays server-side.
    expect(errSpy).toHaveBeenCalled();
  });

  it('passes a THROWN Response through untouched and unreported (MR-041 §3.2)', async () => {
    // requireFeature() throws a 403 by design; it must stay a 403, not become
    // a reported 500 that counts against the server-failure alert.
    const forbidden = NextResponse.json({ error: 'upgrade required' }, { status: 403 });
    const asyncWrapped = withApiRoute('/api/x', async () => {
      throw forbidden;
    });
    expect(await asyncWrapped()).toBe(forbidden);
    const syncWrapped = withApiRoute('/api/x', () => {
      throw new Response(null, { status: 402 });
    });
    expect((syncWrapped() as Response).status).toBe(402);
    expect(reportApiError).not.toHaveBeenCalled();
  });

  it('a THROWN 5xx Response is still reported — only <500 passes through silently (MR-042 §3.3)', async () => {
    const unavailable = new Response(null, { status: 503 });
    const wrapped = withApiRoute('/api/x', async () => {
      throw unavailable;
    });
    expect(await wrapped()).toBe(unavailable);
    expect(reportApiError).toHaveBeenCalledWith('/api/x', 503);
  });

  it('re-throws everything during `next build`, so a broken static route fails the build (MR-041 §3.2)', async () => {
    vi.stubEnv('NEXT_PHASE', 'phase-production-build');
    try {
      const wrapped = withApiRoute('/llms.txt', () => {
        throw new Error('broken at build');
      });
      expect(() => wrapped()).toThrow('broken at build');
      const asyncWrapped = withApiRoute('/api/x', async () => {
        throw new Error('broken at build');
      });
      await expect(asyncWrapped()).rejects.toThrow('broken at build');
      expect(reportApiError).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it('also catches synchronous throws and non-Error throws', async () => {
    const sync = withApiRoute('/api/s', () => {
      throw new Error('boom');
    });
    expect((sync() as Response).status).toBe(500);
    const str = withApiRoute('/api/t', async () => {
      throw 'a string';
    });
    expect(((await str()) as Response).status).toBe(500);
    expect(reportApiError).toHaveBeenCalledTimes(2);
  });

  describe('re-throws Next control-flow errors instead of converting them', () => {
    it('redirect()', async () => {
      const wrapped = withApiRoute('/api/x', async () => {
        redirect('/login');
      });
      await expect(wrapped()).rejects.toMatchObject({ digest: expect.stringMatching(/^NEXT_REDIRECT/) });
      expect(reportApiError).not.toHaveBeenCalled();
    });

    it('notFound()', async () => {
      const wrapped = withApiRoute('/api/x', async () => {
        notFound();
      });
      await expect(wrapped()).rejects.toMatchObject({ digest: 'NEXT_NOT_FOUND' });
      expect(reportApiError).not.toHaveBeenCalled();
    });

    it('the dynamic-server-usage signal (headers()/cookies() during next build)', async () => {
      const wrapped = withApiRoute('/api/x', async () => {
        throw new DynamicServerError('Route /api/x couldn\'t be rendered statically because it used `headers`');
      });
      await expect(wrapped()).rejects.toBeInstanceOf(DynamicServerError);
      expect(reportApiError).not.toHaveBeenCalled();
      expect(errSpy).not.toHaveBeenCalled();
    });

    it('client-render bailout and static-gen bailout', async () => {
      const csr = Object.assign(new Error('x'), { digest: 'BAILOUT_TO_CLIENT_SIDE_RENDERING' });
      const gen = Object.assign(new Error('y'), { code: 'NEXT_STATIC_GEN_BAILOUT' });
      for (const e of [csr, gen]) {
        await expect(withApiRoute('/api/x', async () => { throw e; })()).rejects.toBe(e);
      }
      expect(reportApiError).not.toHaveBeenCalled();
    });
  });

  describe('isNextControlFlowError', () => {
    it('is false for ordinary and malformed throws', () => {
      for (const v of [new Error('x'), null, undefined, 'str', 42, { digest: 7 }, { digest: 'OTHER' }, { code: 'ENOENT' }]) {
        expect(isNextControlFlowError(v)).toBe(false);
      }
    });
  });
});
