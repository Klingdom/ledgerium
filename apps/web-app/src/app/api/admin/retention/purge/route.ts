import { withApiRoute } from '@/lib/with-api-route';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { UPLOAD_DIR } from '@/lib/storage';
import { verifyCronBearer } from '@/lib/cron-auth';
import { reportApiError } from '@/lib/api-error-reporting';
import { purgeExpiredWorkflows, resolvePurgeAfterDays, type RetentionDb } from '@/lib/workflow-retention';

/**
 * POST /api/admin/retention/purge   (row #319)
 *
 * Permanently removes workflows deleted more than WORKFLOW_PURGE_AFTER_DAYS
 * (default 30) ago, with their derived data. See lib/workflow-retention.ts for
 * the policy, the deletion clock and the data map.
 *
 * Auth: identical to alerts/check - `Authorization: Bearer <CRON_SECRET>` only,
 * timing-safe, no query-string secret (lib/cron-auth.ts). POST only: a purge is
 * a mutation and must never be a prefetchable GET.
 *
 * DRY RUN BY DEFAULT: nothing is deleted unless the request carries `?mode=purge`
 * (and not `dryRun=1`). A dry run returns counts only: `eligibleTotal` (all
 * eligible, uncapped), `eligible` (what the next real run removes), and
 * `orphanCandidates` (sweep candidates).
 * Bounded: at most 100 workflows per call; `hasMore: true` means the next
 * scheduled run continues.
 *
 *   200  counts (dryRun, retentionDays, eligible, purged, skipped, failed, ...)
 *   400  dryRun present but not 1/true/0/false (nothing purged)
 *   401  wrong secret      503  CRON_SECRET not configured
 *   500  WORKFLOW_PURGE_AFTER_DAYS invalid (nothing purged), or the purge threw,
 *        or any workflow/file failed (counts in the body; the job must go red)
 *
 * Bodies carry COUNTS only - never titles, ids, paths or error text.
 */
async function handlePOST(request: NextRequest) {
  const auth = verifyCronBearer(request);
  if (auth === 'unconfigured') {
    console.error('[admin/retention/purge] CRON_SECRET env var is not set');
    reportApiError('/api/admin/retention/purge', 503);
    return NextResponse.json({ error: 'Service not configured' }, { status: 503 });
  }
  if (auth === 'unauthorized') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const days = resolvePurgeAfterDays(process.env.WORKFLOW_PURGE_AFTER_DAYS);
  if (!days.ok) {
    console.error('[admin/retention/purge] WORKFLOW_PURGE_AFTER_DAYS is invalid (integer 1-365 required); purging nothing');
    reportApiError('/api/admin/retention/purge', 500);
    return NextResponse.json({ error: 'Retention misconfigured' }, { status: 500 });
  }

  // Fail closed: only absent / 1 / true / 0 / false (case-insensitive) are valid.
  // A typo must not silently turn a dry run into a real purge.
  const dryParam = request.nextUrl.searchParams.get('dryRun');
  const dryNorm = dryParam === null ? null : dryParam.toLowerCase();
  if (dryNorm !== null && !['1', 'true', '0', 'false'].includes(dryNorm)) {
    return NextResponse.json({ error: 'Invalid dryRun (use 1, true, 0 or false)' }, { status: 400 });
  }
  // DEFENCE IN DEPTH (#333): the server DEFAULTS TO A DRY RUN. A real purge needs the
  // caller to say `mode=purge` explicitly, so a mis-wired caller (bare POST, old
  // script, `?dryRun=0` alone) can never delete. `dryRun=1|true` still wins over
  // `mode=purge`. Anything but `purge`/`dryrun` is refused (a typo never deletes).
  const modeParam = request.nextUrl.searchParams.get('mode');
  const modeNorm = modeParam === null ? null : modeParam.toLowerCase();
  if (modeNorm !== null && !['purge', 'dryrun'].includes(modeNorm)) {
    return NextResponse.json({ error: 'Invalid mode (use purge or dryrun)' }, { status: 400 });
  }
  const dryRun = modeNorm !== 'purge' || dryNorm === '1' || dryNorm === 'true';

  try {
    const summary = await purgeExpiredWorkflows(
      db as unknown as RetentionDb,
      { nowMs: Date.now(), retentionDays: days.days, dryRun },
      { uploadDir: UPLOAD_DIR },
    );
    console.log(
      `[admin/retention/purge] dryRun: ${summary.dryRun}, days: ${summary.retentionDays}, eligible: ${summary.eligible}, eligibleTotal: ${summary.eligibleTotal}, orphanCandidates: ${summary.orphanCandidates}, purged: ${summary.purged}, skipped: ${summary.skipped}, failed: ${summary.failed}, uploadsRemoved: ${summary.uploadsRemoved}, filesRemoved: ${summary.filesRemoved}, fileFailures: ${summary.fileFailures}, definitionsRemoved: ${summary.definitionsRemoved}, hasMore: ${summary.hasMore}`,
    );
    if (summary.failed > 0 || summary.fileFailures > 0) {
      reportApiError('/api/admin/retention/purge', 500);
      return NextResponse.json({ error: 'Purge incomplete', ...summary }, { status: 500 });
    }
    return NextResponse.json(summary);
  } catch (err) {
    console.error('[admin/retention/purge POST]', err);
    reportApiError('/api/admin/retention/purge', 500);
    return NextResponse.json({ error: 'Failed to purge' }, { status: 500 });
  }
}

export const POST = withApiRoute('/api/admin/retention/purge', handlePOST);
