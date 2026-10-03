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
 *   400  dryRun not 1/true/0/false, bad mode, a repeated or unknown query
 *        parameter (only `mode` and `dryRun`, once each; nothing purged)
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

  // STRICT ALLOWLIST (#335): only `mode` and `dryRun` exist, each at most once. The
  // script builds exactly those two; anything else (or a repeat) is a mis-wired
  // caller, and a purge is irreversible, so it is refused with 400 before any work.
  // This closes the first-value-wins bypass (`?mode=purge&dryRun=0&dryRun=1`).
  const params = request.nextUrl.searchParams;
  const seen = new Set<string>();
  for (const key of params.keys()) {
    if (key !== 'mode' && key !== 'dryRun') {
      return NextResponse.json({ error: 'Unknown query parameter' }, { status: 400 });
    }
    if (seen.has(key)) {
      return NextResponse.json({ error: `Repeated query parameter: ${key}` }, { status: 400 });
    }
    seen.add(key);
  }
  // Fail closed: only absent / 1 / true / 0 / false (case-insensitive) are valid.
  const dryValues = params.getAll('dryRun').map((v) => v.toLowerCase());
  if (dryValues.some((v) => !['1', 'true', '0', 'false'].includes(v))) {
    return NextResponse.json({ error: 'Invalid dryRun (use 1, true, 0 or false)' }, { status: 400 });
  }
  // DEFENCE IN DEPTH (#333): the server DEFAULTS TO A DRY RUN. A real purge needs
  // exactly one `mode=purge` and NO truthy dryRun value. Bad mode -> 400.
  const modeValues = params.getAll('mode').map((v) => v.toLowerCase());
  if (modeValues.some((v) => !['purge', 'dryrun'].includes(v))) {
    return NextResponse.json({ error: 'Invalid mode (use purge or dryrun)' }, { status: 400 });
  }
  const anyDryTruthy = dryValues.some((v) => v === '1' || v === 'true');
  const dryRun = modeValues.length !== 1 || modeValues[0] !== 'purge' || anyDryTruthy;

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
