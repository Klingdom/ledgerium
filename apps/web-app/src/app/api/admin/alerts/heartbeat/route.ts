import { withApiRoute } from '@/lib/with-api-route';
import { NextRequest, NextResponse } from 'next/server';
import { sendChannelHeartbeat } from '@/lib/notifications';
import { reportApiError } from '@/lib/api-error-reporting';
import { verifyCronBearer } from '@/lib/cron-auth';

/**
 * POST /api/admin/alerts/heartbeat   (row #282)
 *
 * Sends one clearly-labelled TEST message to every configured alert channel
 * (Slack webhook, alert email) and reports per-channel delivery, so a revoked
 * webhook or a dead mailbox is found on a quiet day instead of during an
 * incident. Called daily by .github/workflows/alerts-heartbeat.yml.
 *
 * Why a separate endpoint (not a parameter on alerts/check): the hourly check
 * is a read-only evaluation whose statuses mean "an ALERT could not be told";
 * a heartbeat is a side-effecting send with its own meaning and cadence.
 * Folding it in would put a daily write behind an hourly GET, make a mistyped
 * URL variable post to Slack hourly, and blur 424/207 between "alert undelivered"
 * and "test undelivered". POST because it has an external side effect (a GET
 * would be fired by prefetchers/link checkers); Next answers other methods 405.
 *
 * Auth: identical to alerts/check (lib/cron-auth.ts) - Authorization: Bearer
 * <CRON_SECRET> only, timing-safe, no query-string secret.
 *
 * Status scheme (the job labels each from the status alone; the body is never
 * printed in the public repo's logs). Reuses alerts/check's meanings:
 *   200  every configured channel delivered
 *   207  >= 1 channel delivered, >= 1 failed (redundancy decayed)
 *   424  channels configured but NONE delivered (nobody would hear an alert)
 *   412  NO channel configured at all (precondition missing; distinct from 424
 *        so "nothing set up" is not confused with "set up but broken")
 *   401  wrong secret          503  CRON_SECRET not configured on the server
 *   500  unexpected failure (wrapper)
 * 207/424/412 are not server faults and are not reported via reportApiError
 * (same reasoning as alerts/check); 503 is, as guard A requires.
 *
 * Body: counts and per-channel words only
 *   { configured, delivered, failed, channels: { slack, email } }
 * Never the message, addresses or URLs. The message is fixed text with no alert
 * data or timestamp, so a retried job is an identical, harmless duplicate.
 */
async function handlePOST(request: NextRequest) {
  const auth = verifyCronBearer(request);

  if (auth === 'unconfigured') {
    console.error('[admin/alerts/heartbeat] CRON_SECRET env var is not set');
    reportApiError('/api/admin/alerts/heartbeat', 503);
    return NextResponse.json({ error: 'Service not configured' }, { status: 503 });
  }
  if (auth === 'unauthorized') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await sendChannelHeartbeat();
  console.log(
    `[admin/alerts/heartbeat] configured: ${result.configured}, delivered: ${result.delivered}, failed: ${result.failed}`,
  );

  if (result.configured === 0) {
    console.error('[admin/alerts/heartbeat] no alert channel is configured - answering 412');
    return NextResponse.json({ error: 'No alert channel configured', ...result }, { status: 412 });
  }
  if (result.delivered === 0) {
    console.error('[admin/alerts/heartbeat] heartbeat reached NO channel - answering 424');
    return NextResponse.json({ error: 'Heartbeat delivery failed', ...result }, { status: 424 });
  }
  if (result.failed > 0) {
    console.error(`[admin/alerts/heartbeat] ${result.failed} channel(s) failed - answering 207`);
    return NextResponse.json(result, { status: 207 });
  }
  return NextResponse.json(result);
}

export const POST = withApiRoute('/api/admin/alerts/heartbeat', handlePOST);
