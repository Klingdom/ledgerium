import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { readJsonBody, parseJsonBody } from './read-json-body';

const req = (body?: string) =>
  new Request('http://localhost/x', body === undefined ? { method: 'POST' } : { method: 'POST', body });

async function thrown(p: Promise<unknown>): Promise<Response> {
  try {
    await p;
  } catch (e) {
    expect(e).toBeInstanceOf(Response);
    return e as Response;
  }
  throw new Error('expected readJsonBody to throw');
}

describe('readJsonBody (row #258)', () => {
  it('returns parsed valid JSON', async () => {
    expect(await readJsonBody(req('{"a":1}'))).toEqual({ a: 1 });
  });

  it('throws a 400 Response for malformed JSON', async () => {
    const res = await thrown(readJsonBody(req('{not json')));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Invalid JSON body' });
  });

  it('throws a 400 Response for an empty body', async () => {
    const res = await thrown(readJsonBody(req(undefined)));
    expect(res.status).toBe(400);
  });

  it('passes valid non-object JSON through (the schema decides)', async () => {
    expect(await readJsonBody(req('null'))).toBeNull();
    expect(await readJsonBody(req('[1]'))).toEqual([1]);
  });
});

describe('parseJsonBody (row #261)', () => {
  const schema = z.object({ email: z.string(), role: z.enum(['member', 'viewer']).optional() });

  it('returns the parsed, typed data for a valid body', async () => {
    expect(await parseJsonBody(req('{"email":"a@b.c","role":"viewer"}'), schema)).toEqual({
      email: 'a@b.c',
      role: 'viewer',
    });
  });

  it('keeps the malformed-JSON 400', async () => {
    const res = await thrown(parseJsonBody(req('{nope'), schema));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Invalid JSON body' });
  });

  it.each(['null', '[1]', '5', '"s"', '{"email":5}', '{}'])('answers %s with 400 naming fields only', async (raw) => {
    const res = await thrown(parseJsonBody(req(raw), schema));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Invalid request body');
    expect(Array.isArray(body.fields)).toBe(true);
  });

  it('never echoes the offending value, even when the Zod message would', async () => {
    // An enum issue message reads "... received 'SECRET-VALUE'" — paths only.
    const res = await thrown(parseJsonBody(req('{"email":"x","role":"SECRET-VALUE"}'), schema));
    const text = JSON.stringify(await res.json());
    expect(text).not.toContain('SECRET-VALUE');
    expect(JSON.parse(text).fields).toEqual(['role']);
  });
});
