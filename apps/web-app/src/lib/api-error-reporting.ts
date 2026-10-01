/**
 * Server-side emission of `api_error` — backlog row #246 (MR-039 A-2).
 *
 * Until this module existed, `api_error` was declared in the event union,
 * watched by the P2 `api_error_spike` alert and counted by the admin error
 * panel, and emitted by nothing. The alert therefore read `ok` permanently:
 * "no API errors" and "no instrumentation" rendered identically, and the
 * rendering was the reassuring one.
 *
 * ## What counts as an api_error
 *
 * A response this server chose to send with a 5xx status — a failure on our
 * side. 4xx responses are NOT reported: validation refusals, auth failures and
 * plan gates are expected traffic, and counting them would make a threshold of
 * "more than 10 per hour" measure how many people mistyped a password.
 *
 * ## Why server-side, not in the client fetch path
 *
 * The client pipeline can only lose events (MR-039 §1: every failure mode there
 * is subtraction), and an API that is failing is disproportionately likely to
 * be called by a page that is also failing. Counting server errors from the
 * browser would undercount exactly when the count matters. The server is also
 * the only place that sees callers with no browser at all — the extension and
 * API-key clients.
 *
 * ## Payload
 *
 * `endpoint` is the route PATTERN (`/api/teams/[id]/members`), never the
 * request path: a path carries ids, and a pattern keeps the dimension bounded.
 * No error message is ever included — messages interpolate recorded content.
 *
 * ## Not covered
 *
 * An exception that escapes a route handler entirely is turned into a 500 by
 * Next.js without passing through any code here, and Next 14 offers no
 * `onRequestError` hook to observe it. Those 500s are still invisible to the
 * alert. The coverage guard (`api-error-coverage.test.ts`) enforces every 5xx
 * this codebase sends explicitly; it cannot see the ones it does not send.
 */

import { trackServer } from './analytics-server';

/** The pattern every reported endpoint must match. Exported for the guard test. */
export const API_ENDPOINT_PATTERN = /^\/api(\/[A-Za-z0-9_\-[\]]+)+$/;

/**
 * Report a server-side failure response. Safe to call unconditionally from a
 * shared error helper: any status outside 500-599 is ignored, so a helper that
 * also produces 4xx can call this on every path.
 *
 * Never throws — reporting must not be able to turn a handled error into an
 * unhandled one.
 */
export function reportApiError(endpoint: string, status: number): void {
  if (!Number.isInteger(status) || status < 500 || status > 599) return;
  // `next build` executes some GET handlers while deciding whether they can be
  // prerendered (observed at loop 80: /api/admin/alerts/check, with no
  // CRON_SECRET in the build env, returns 500). That is not a request from
  // anyone, and a build environment with a database would otherwise write one
  // spurious api_error per deploy. Next sets NEXT_PHASE for the build process.
  if (process.env.NEXT_PHASE === 'phase-production-build') return;
  try {
    trackServer('api_error', { endpoint, status });
  } catch (err) {
    console.error('[api-error-reporting] failed to report api_error:', err);
  }
}
