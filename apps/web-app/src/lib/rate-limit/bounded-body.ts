/**
 * Read a request body with a hard byte ceiling (row #299).
 *
 * Content-Length is advisory (absent on chunked requests, and a client can lie
 * about it), so it is only a fast reject; the real limit is enforced while
 * reading: the stream is cancelled as soon as the running total passes the cap,
 * so at most `maxBytes + one chunk` is ever held. Nothing is JSON-parsed here.
 */
export type BoundedBody = { ok: true; text: string } | { ok: false; reason: 'too_large' | 'unreadable' };

export async function readBodyWithLimit(
  req: { headers: { get(name: string): string | null }; body: ReadableStream<Uint8Array> | null },
  maxBytes: number,
): Promise<BoundedBody> {
  const declared = req.headers.get('content-length');
  if (declared !== null && /^\d+$/.test(declared.trim()) && Number(declared) > maxBytes) {
    // Do not read (or buffer) a body already declared oversized.
    try {
      await req.body?.cancel();
    } catch {
      /* nothing to release */
    }
    return { ok: false, reason: 'too_large' };
  }
  if (!req.body) return { ok: true, text: '' };

  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel().catch(() => {});
        return { ok: false, reason: 'too_large' };
      }
      chunks.push(value);
    }
  } catch {
    return { ok: false, reason: 'unreadable' };
  }
  const merged = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) {
    merged.set(c, off);
    off += c.byteLength;
  }
  return { ok: true, text: new TextDecoder().decode(merged) };
}
