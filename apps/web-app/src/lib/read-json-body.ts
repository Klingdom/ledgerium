/**
 * Parse a request's JSON body, answering malformed input with a 400.
 *
 * Row #258: `await req.json()` on `{not json` throws, which becomes a 500 and —
 * since #246 — counts against `api_error_spike`. A client mistake is not a
 * server failure. This throws a ready-made `Response` (400), which
 * `withApiRoute` passes through untouched and unreported.
 *
 * ## The trap
 * A route that calls this inside its OWN `try { … } catch { return 500 }` will
 * catch the thrown 400 and turn it back into a reported 500. Such a catch must
 * begin with `if (err instanceof Response) return err;`. The guard in
 * `app/api/api-error-coverage.test.ts` does not see inside catches; the
 * route-level tests for those routes do.
 *
 * ## Options
 * `object: true` additionally rejects valid JSON that is not a plain object
 * (`null`, a number, an array). Use it where the handler dereferences
 * properties directly (`body.name`) with no schema in front: `null` there is a
 * TypeError, i.e. the same 5xx by another road. Routes that hand the value to
 * Zod should leave it off — the schema already answers 400.
 */

import { NextResponse } from 'next/server';

export interface ReadJsonBodyOptions {
  /** Require the parsed value to be a non-null, non-array object. */
  object?: boolean;
}

function badRequest(message: string): Response {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function readJsonBody(
  req: { json(): Promise<unknown> },
  options: ReadJsonBodyOptions = {},
  // `any`, deliberately and only for parity: `Request.json()` is itself typed
  // `Promise<any>`, so this is a drop-in that leaves every converted route's
  // typing exactly as it was. Narrowing to `unknown` is the right end state but
  // forces a schema at each of the 13 call sites — a separate change, not this
  // one. Callers that already validate (Zod) are unaffected either way.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    // Malformed JSON and an empty body both land here.
    throw badRequest('Invalid JSON body');
  }
  if (options.object && (typeof body !== 'object' || body === null || Array.isArray(body))) {
    throw badRequest('Request body must be a JSON object');
  }
  return body;
}
