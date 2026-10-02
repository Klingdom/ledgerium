/**
 * Shared route-handler wrapper — backlog rows #8 (unguarded handlers) and #253
 * (exceptions that escape a handler are invisible to `api_error_spike`).
 *
 * Next.js turns an uncaught throw in a route handler into a 500 without passing
 * through any application code, and Next 14 has no `onRequestError` hook. The
 * result was ~25 routes whose unexpected failures were (a) unobserved and
 * (b) not guaranteed to use this project's non-leaking error shape. One wrapper,
 * applied to every exported HTTP method and enforced by
 * `app/api/api-error-coverage.test.ts`, replaces 25 hand-written try/catch blocks.
 *
 * ## What an uncaught throw becomes
 *
 *  - full detail (`console.error`, with the endpoint) server-side only;
 *  - `reportApiError(endpoint, 500)` so the alert sees it;
 *  - `{ error: 'Internal server error' }` / 500. Never the message or stack:
 *    messages in this codebase interpolate recorded user content (see
 *    `safe-error-name.ts`).
 *
 * ## What it must NOT catch: Next's control-flow throws
 *
 * Next implements `redirect()`, `notFound()` and — critically — the
 * dynamic-server-usage signal as THROWN errors. `headers()` / `cookies()` (so
 * `auth()`, which 61 routes call) throw `DynamicServerError` during
 * `next build` when Next probes whether a GET can be prerendered. If this wrapper
 * converted that throw into a 500 response, Next would conclude the handler is
 * static and prerender a frozen 500 into production. So these are RE-THROWN.
 *
 * Detection is by the error's `digest` / `code` property, not by importing
 * `isDynamicServerError` / `isRedirectError` / `isNotFoundError` from
 * `next/dist/client/components/*`. Those are private paths that move between
 * minor versions; the digest strings are the wire contract Next itself matches
 * on (Next 14.2: `NEXT_REDIRECT;…`, `NEXT_NOT_FOUND`, `DYNAMIC_SERVER_USAGE`,
 * `BAILOUT_TO_CLIENT_SIDE_RENDERING`, and `code: NEXT_STATIC_GEN_BAILOUT`).
 * `with-api-route.test.ts` constructs the REAL errors with Next's own
 * `redirect()` / `notFound()` / `DynamicServerError`, so a Next upgrade that
 * changes a digest fails that test instead of silently prerendering a 500.
 * Any digest beginning `NEXT_` is also re-thrown, as a forward-compat default:
 * wrongly re-throwing is a visible build/runtime failure; wrongly swallowing is
 * a silent frozen 500.
 */

import { NextResponse } from 'next/server';
import { reportApiError } from './api-error-reporting';

const CONTROL_FLOW_DIGESTS: ReadonlySet<string> = new Set([
  'DYNAMIC_SERVER_USAGE',
  'BAILOUT_TO_CLIENT_SIDE_RENDERING',
]);

/** True for errors Next throws to steer rendering/routing, which must propagate. */
export function isNextControlFlowError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const { digest, code } = error as { digest?: unknown; code?: unknown };
  if (code === 'NEXT_STATIC_GEN_BAILOUT') return true;
  if (typeof digest !== 'string') return false;
  return CONTROL_FLOW_DIGESTS.has(digest) || digest.startsWith('NEXT_');
}

/** Response type of the wrapped handler: sync stays sync, async stays async. */
export type WrappedResult<R> = R extends PromiseLike<infer U> ? Promise<U | NextResponse> : R | NextResponse;

function failureResponse(endpoint: string, error: unknown): NextResponse {
  if (isNextControlFlowError(error)) throw error;
  console.error(`[api] unhandled error in ${endpoint}:`, error);
  reportApiError(endpoint, 500);
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}

/**
 * Wrap a route handler. `endpoint` is the route PATTERN (`/api/teams/[id]/members`),
 * the same string `reportApiError` takes. The handler's argument list is
 * preserved exactly (`GET()`, `(req)`, `(req, ctx)`); its normal responses are
 * returned untouched. A synchronous handler stays synchronous (some
 * `force-static` routes and their tests call it without `await`); an async one
 * stays async.
 */
export function withApiRoute<A extends unknown[], R>(
  endpoint: string,
  handler: (...args: A) => R,
): (...args: A) => WrappedResult<R> {
  return ((...args: A) => {
    try {
      const result = handler(...args);
      if (result !== null && typeof result === 'object' && typeof (result as unknown as PromiseLike<unknown>).then === 'function') {
        return Promise.resolve(result as unknown as PromiseLike<unknown>).then(undefined, (error: unknown) =>
          failureResponse(endpoint, error),
        );
      }
      return result;
    } catch (error) {
      return failureResponse(endpoint, error);
    }
  }) as (...args: A) => WrappedResult<R>;
}
