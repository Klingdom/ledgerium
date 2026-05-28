import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { canAccessAdmin } from '@/lib/admin-allowlist';
import { db } from '@/db';

const DEFAULT_RETENTION_DAYS = 90;
const MAX_RETENTION_DAYS = 3650; // safety cap: 10 years
const MIN_RETENTION_DAYS = 7;    // safety floor: never delete last 7 days

/**
 * GET /api/admin/cleanup-events
 *
 * Admin-only. Deletes (or previews deletion of) analytics events older than a
 * configurable threshold.
 *
 * Query params:
 *   days   — retention window in days (default 90, min 7, max 3650)
 *   dryRun — "true" (default) returns count only; "false" performs the delete
 *
 * Response:
 *   { deletedCount, dryRun, olderThan, retainedCount }
 */
export async function GET(req: NextRequest) {
  const session = await auth();

  if (!canAccessAdmin(session)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    const params = req.nextUrl.searchParams;

    // Parse and validate `days`
    const rawDays = params.get('days');
    let days = DEFAULT_RETENTION_DAYS;
    if (rawDays !== null) {
      const parsed = parseInt(rawDays, 10);
      if (isNaN(parsed) || parsed < MIN_RETENTION_DAYS || parsed > MAX_RETENTION_DAYS) {
        return NextResponse.json(
          {
            error: `Invalid 'days' parameter. Must be an integer between ${MIN_RETENTION_DAYS} and ${MAX_RETENTION_DAYS}.`,
          },
          { status: 400 },
        );
      }
      days = parsed;
    }

    // Parse `dryRun` — default true (safe)
    const dryRun = params.get('dryRun') !== 'false';

    const olderThan = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    olderThan.setUTCHours(0, 0, 0, 0); // normalise to start-of-day UTC

    if (dryRun) {
      // Count only — no mutation
      const deletedCount = await (db as any).analyticsEvent.count({
        where: { createdAt: { lt: olderThan } },
      });

      const retainedCount = await (db as any).analyticsEvent.count({
        where: { createdAt: { gte: olderThan } },
      });

      return NextResponse.json({
        deletedCount,
        dryRun: true,
        olderThan: olderThan.toISOString(),
        retainedCount,
      });
    }

    // Actual deletion
    // Count before deleting so we can return an accurate number
    const deletedCount = await (db as any).analyticsEvent.count({
      where: { createdAt: { lt: olderThan } },
    });

    // Batched deletion to avoid long table locks
    const BATCH_SIZE = 1000;
    let totalDeleted = 0;
    while (totalDeleted < deletedCount) {
      const batch = await (db as any).analyticsEvent.findMany({
        where: { createdAt: { lt: olderThan } },
        select: { id: true },
        take: BATCH_SIZE,
      }) as { id: string }[];
      if (batch.length === 0) break;
      await (db as any).analyticsEvent.deleteMany({
        where: { id: { in: batch.map((e: { id: string }) => e.id) } },
      });
      totalDeleted += batch.length;
    }

    const retainedCount = await (db as any).analyticsEvent.count();

    console.info(
      `[admin/cleanup-events] Deleted ${deletedCount} events older than ${olderThan.toISOString()} (requestedBy=${session?.user?.id ?? 'unknown'})`,
    );

    return NextResponse.json({
      deletedCount,
      dryRun: false,
      olderThan: olderThan.toISOString(),
      retainedCount,
    });
  } catch (err) {
    console.error('[admin/cleanup-events GET]', err);
    return NextResponse.json({ error: 'Failed to process cleanup request' }, { status: 500 });
  }
}
