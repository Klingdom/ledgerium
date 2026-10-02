import { describe, it, expect } from 'vitest';
import { readJsonBody } from './read-json-body';

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

  it('without `object`, passes valid non-object JSON through (schema decides)', async () => {
    expect(await readJsonBody(req('null'))).toBeNull();
    expect(await readJsonBody(req('[1]'))).toEqual([1]);
  });

  it('with `object`, rejects null, arrays and primitives with 400', async () => {
    for (const raw of ['null', '[1]', '5', '"s"']) {
      const res = await thrown(readJsonBody(req(raw), { object: true }));
      expect(res.status, raw).toBe(400);
      expect(await res.json()).toEqual({ error: 'Request body must be a JSON object' });
    }
    expect(await readJsonBody(req('{}'), { object: true })).toEqual({});
  });
});
