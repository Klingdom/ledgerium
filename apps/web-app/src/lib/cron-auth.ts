import crypto from 'crypto';

/**
 * Shared bearer-secret check for scheduler-called admin endpoints
 * (alerts/check, alerts/heartbeat). One implementation so the two cannot drift.
 *
 *   'unconfigured' - CRON_SECRET is not set on the server (callers answer 503)
 *   'unauthorized' - header missing / not Bearer / wrong value (callers answer 401)
 *   'ok'
 *
 * The secret is accepted ONLY via `Authorization: Bearer <CRON_SECRET>`.
 * Query-string delivery is deliberately unsupported: query strings land in
 * access/CDN logs. The comparison is timing-safe; the length pre-check is safe
 * because the expected value is a server-side constant.
 *
 * The caller owns the HTTP response (and reportApiError for 503) so that the
 * api-error-coverage guard sees each literal 5xx next to its report.
 */
export type CronAuthResult = 'ok' | 'unconfigured' | 'unauthorized';

export function verifyCronBearer(request: { headers: { get(name: string): string | null } }): CronAuthResult {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return 'unconfigured';

  const authHeader = request.headers.get('authorization') ?? '';
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  const providedBuf = Buffer.from(match?.[1] ?? '', 'utf8');
  const expectedBuf = Buffer.from(cronSecret, 'utf8');

  if (providedBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(providedBuf, expectedBuf)) {
    return 'unauthorized';
  }
  return 'ok';
}
