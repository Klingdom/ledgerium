import { describe, it, expect } from 'vitest';
import { readBodyWithLimit } from './bounded-body';

function streamOf(chunks: Uint8Array[], onCancel?: () => void): ReadableStream<Uint8Array> {
  let i = 0;
  return new ReadableStream<Uint8Array>({
    pull(c) {
      if (i < chunks.length) c.enqueue(chunks[i++]!);
      else c.close();
    },
    cancel() {
      onCancel?.();
    },
  });
}
const enc = (s: string) => new TextEncoder().encode(s);
const hdr = (h: Record<string, string>) => ({ get: (n: string) => h[n.toLowerCase()] ?? null });

describe('readBodyWithLimit (row #299)', () => {
  it('accepts a body exactly at the limit', async () => {
    const r = await readBodyWithLimit({ headers: hdr({ 'content-length': '10' }), body: streamOf([enc('0123456789')]) }, 10);
    expect(r).toEqual({ ok: true, text: '0123456789' });
  });

  it('rejects one byte over on Content-Length without reading the stream', async () => {
    let pulled = false;
    const body = new ReadableStream<Uint8Array>({
      pull() {
        pulled = true;
      },
    });
    const r = await readBodyWithLimit({ headers: hdr({ 'content-length': '11' }), body }, 10);
    expect(r).toEqual({ ok: false, reason: 'too_large' });
    expect(pulled).toBe(false);
  });

  it('rejects an over-limit body with no Content-Length (chunked) and cancels the stream', async () => {
    let cancelled = false;
    const r = await readBodyWithLimit(
      { headers: hdr({}), body: streamOf([enc('aaaaaa'), enc('bbbbbb'), enc('cccccc')], () => (cancelled = true)) },
      10,
    );
    expect(r).toEqual({ ok: false, reason: 'too_large' });
    expect(cancelled).toBe(true);
  });

  it('rejects when Content-Length lies low but the stream is larger', async () => {
    const r = await readBodyWithLimit({ headers: hdr({ 'content-length': '3' }), body: streamOf([enc('x'.repeat(50))]) }, 10);
    expect(r).toEqual({ ok: false, reason: 'too_large' });
  });

  it('counts bytes, not characters', async () => {
    const r = await readBodyWithLimit({ headers: hdr({}), body: streamOf([enc('é'.repeat(6))]) }, 10); // 12 bytes
    expect(r).toEqual({ ok: false, reason: 'too_large' });
  });

  it('reassembles multi-chunk bodies and treats a missing body as empty', async () => {
    expect(await readBodyWithLimit({ headers: hdr({}), body: streamOf([enc('ab'), enc('cd')]) }, 10)).toEqual({
      ok: true,
      text: 'abcd',
    });
    expect(await readBodyWithLimit({ headers: hdr({}), body: null }, 10)).toEqual({ ok: true, text: '' });
  });
});
