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
 * ## Row #261 — the result is `unknown`
 * Well-formed JSON of the wrong SHAPE (`{"email": 5}`) used to reach handlers
 * typed `any`, where `normalizeEmail(body.email)` threw a TypeError — a client
 * mistake reported as a 500. `readJsonBody` now returns `unknown`, so reading a
 * field with no schema in front no longer compiles. Use `parseJsonBody(req,
 * schema)` (read + validate in one call), or
 * `schema.safeParse(await readJsonBody(req))` where the route builds its own
 * error body. A cast (`as {…}`) on the result defeats the type and is rejected
 * by the guard in `app/api/api-error-coverage.test.ts`.
 */

import { NextResponse } from 'next/server';
import type { z } from 'zod';

function badRequest(message: string): Response {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function readJsonBody(req: { json(): Promise<unknown> }): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    // Malformed JSON and an empty body both land here.
    throw badRequest('Invalid JSON body');
  }
}

/**
 * Names the fields a Zod failure is about — and nothing else.
 *
 * Zod's own `issue.message` is NOT safe to return: for an enum or literal it
 * reads "Invalid enum value. Expected 'a' | 'b', received '<the caller's
 * value>'", i.e. it echoes input. Paths are field names the caller already
 * knows. A root-level failure (body is not an object) has an empty path.
 */
export function invalidFieldPaths(error: z.ZodError): string[] {
  const paths = new Set<string>();
  for (const issue of error.issues) paths.add(issue.path.length > 0 ? issue.path.join('.') : '(body)');
  return [...paths];
}

/**
 * Read AND validate a JSON body. Throws a ready-made 400 `Response` for
 * malformed JSON (see `readJsonBody`) or for a body that does not satisfy
 * `schema`; `withApiRoute` passes it through unreported — a client mistake is
 * not a server failure. The 400 body is `{ error: 'Invalid request body',
 * fields: [...] }`: field names only, never values.
 *
 * Like `readJsonBody`, a route that calls this inside its OWN
 * `try { … } catch { return 500 }` must begin that catch with
 * `if (err instanceof Response) return err;`.
 */
export async function parseJsonBody<S extends z.ZodTypeAny>(
  req: { json(): Promise<unknown> },
  schema: S,
): Promise<z.infer<S>> {
  const parsed = schema.safeParse(await readJsonBody(req));
  if (!parsed.success) {
    throw NextResponse.json(
      { error: 'Invalid request body', fields: invalidFieldPaths(parsed.error) },
      { status: 400 },
    );
  }
  return parsed.data;
}
