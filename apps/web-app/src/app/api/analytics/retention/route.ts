import { withApiRoute } from '@/lib/with-api-route';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { canAccessAdmin } from '@/lib/admin-allowlist';
import { db } from '@/db';
import { reportApiError } from '@/lib/api-error-reporting';
import { computeRetention, getWeekMonday, WEEK_MS } from '@/lib/retention-cohorts';

/**
 * GET /api/analytics/retention
 *
 * Admin-only. Computes weekly cohort retention for the last 8 signup weeks.
 *
 * For each cohort week (Monday-anchored ISO week start), we track the % of
 * users who fired a `workflow_uploaded` event in weeks 0, 1, 2, 3, or 4+
 * relative to their signup week.
 *
 * Week 0 = same ISO week as signup (always 100% by definition).
 * Weeks 1–4+ = subsequent ISO weeks. A cell whose target week has not yet
 * fully elapsed for that cohort is `null` (not yet measurable), never 0, and is
 * excluded from the averages (row #250 / MR-039 A-4). See lib/retention-cohorts.ts.
 */
async function handleGET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!canAccessAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const now = new Date();
    const currentWeekMonday = getWeekMonday(now);

    // Build the 8 cohort week start dates (oldest to newest)
    const cohortWeeks: Date[] = [];
    for (let i = 7; i >= 0; i--) {
      cohortWeeks.push(new Date(currentWeekMonday.getTime() - i * WEEK_MS));
    }
    const oldestCohortStart = cohortWeeks[0]!;

    // Fetch all users who signed up within the 8-week window
    const users = await db.user.findMany({
      where: { createdAt: { gte: oldestCohortStart } },
      select: { id: true, createdAt: true },
    });

    // Fetch all workflow_uploaded events for these users — no upper bound so
    // week 4+ activity beyond the window is captured
    const uploadEvents =
      users.length === 0
        ? []
        : await db.analyticsEvent.findMany({
            where: { userId: { in: users.map((u) => u.id) }, eventName: 'workflow_uploaded' },
            select: { userId: true, createdAt: true },
          });

    return NextResponse.json(computeRetention(users, uploadEvents, now.getTime()));
  } catch (err) {
    console.error('[analytics/retention GET]', err);
    reportApiError('/api/analytics/retention', 500);
    return NextResponse.json({ error: 'Failed to compute retention data' }, { status: 500 });
  }
}

export const GET = withApiRoute('/api/analytics/retention', handleGET);
