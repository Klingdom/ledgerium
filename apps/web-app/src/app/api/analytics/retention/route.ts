import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';

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
 * Weeks 1–4+ = subsequent ISO weeks.
 */
export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!session.user.isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const now = new Date();

    // Compute the Monday of the current ISO week
    const currentWeekMonday = getWeekMonday(now);

    // Build the 8 cohort week start dates (oldest to newest)
    const cohortWeeks: Date[] = [];
    for (let i = 7; i >= 0; i--) {
      const weekStart = new Date(currentWeekMonday.getTime() - i * 7 * 24 * 60 * 60 * 1000);
      cohortWeeks.push(weekStart);
    }

    const oldestCohortStart = cohortWeeks[0]!;

    // Fetch all users who signed up within the 8-week window
    const users = await db.user.findMany({
      where: { createdAt: { gte: oldestCohortStart } },
      select: { id: true, createdAt: true },
    });

    if (users.length === 0) {
      const emptyCohorts = cohortWeeks.map((week) => ({
        week: week.toISOString().slice(0, 10),
        signups: 0,
        retention: [100, 0, 0, 0, 0],
      }));
      return NextResponse.json({
        cohorts: emptyCohorts,
        averageRetention: [100, 0, 0, 0, 0],
      });
    }

    const userIds = users.map((u) => u.id);

    // Fetch all workflow_uploaded events for these users — no upper bound so
    // week 4+ activity beyond the window is captured
    const uploadEvents = await (db as any).analyticsEvent.findMany({
      where: {
        userId: { in: userIds },
        eventName: 'workflow_uploaded',
      },
      select: {
        userId: true,
        createdAt: true,
      },
    });

    // Group upload events by userId → Set<ISO week string>
    // A user is retained in week N if they have ANY upload event in that week offset
    const uploadWeeksByUser = new Map<string, Set<string>>();
    for (const evt of uploadEvents) {
      if (!evt.userId) continue;
      const weekStr = getWeekMonday(new Date(evt.createdAt)).toISOString().slice(0, 10);
      const existing = uploadWeeksByUser.get(evt.userId) ?? new Set<string>();
      existing.add(weekStr);
      uploadWeeksByUser.set(evt.userId, existing);
    }

    // Group users by their signup cohort week
    const usersByCohort = new Map<string, typeof users>();
    for (const user of users) {
      const cohortWeekStr = getWeekMonday(new Date(user.createdAt)).toISOString().slice(0, 10);
      const existing = usersByCohort.get(cohortWeekStr) ?? [];
      existing.push(user);
      usersByCohort.set(cohortWeekStr, existing);
    }

    // For each cohort week compute retention[0..4]
    // Index 4 = "week 4 or later"
    const RETENTION_WEEKS = 5; // indices 0,1,2,3,4(=4+)
    const cohortResults = cohortWeeks.map((cohortWeekStart) => {
      const cohortKey = cohortWeekStart.toISOString().slice(0, 10);
      const cohortUsers = usersByCohort.get(cohortKey) ?? [];
      const signups = cohortUsers.length;

      if (signups === 0) {
        return {
          week: cohortKey,
          signups: 0,
          retention: Array(RETENTION_WEEKS).fill(0) as number[],
        };
      }

      // Week 0 is always 100 (the cohort definition is signup, not first activity)
      const retention: number[] = [100];

      for (let weekOffset = 1; weekOffset < RETENTION_WEEKS; weekOffset++) {
        const targetWeekStart = new Date(
          cohortWeekStart.getTime() + weekOffset * 7 * 24 * 60 * 60 * 1000,
        );
        const targetWeekKey = targetWeekStart.toISOString().slice(0, 10);

        let retained = 0;
        for (const user of cohortUsers) {
          const uploadWeeks = uploadWeeksByUser.get(user.id);
          if (!uploadWeeks) continue;

          if (weekOffset < RETENTION_WEEKS - 1) {
            // Exact week match for weeks 1–3
            if (uploadWeeks.has(targetWeekKey)) retained++;
          } else {
            // Week 4+: any upload event in week 4 or later relative to signup
            const week4Start = new Date(
              cohortWeekStart.getTime() + 4 * 7 * 24 * 60 * 60 * 1000,
            );
            const hasWeek4Plus = [...uploadWeeks].some((wk) => new Date(wk) >= week4Start);
            if (hasWeek4Plus) retained++;
          }
        }

        retention.push(Math.round((retained / signups) * 100));
      }

      return { week: cohortKey, signups, retention };
    });

    // Compute average retention across cohorts that have at least 1 signup
    const activeCohorts = cohortResults.filter((c) => c.signups > 0);
    const averageRetention = Array(RETENTION_WEEKS)
      .fill(0)
      .map((_, i) => {
        if (activeCohorts.length === 0) return 0;
        const sum = activeCohorts.reduce((acc, c) => acc + (c.retention[i] ?? 0), 0);
        return Math.round(sum / activeCohorts.length);
      });

    return NextResponse.json({ cohorts: cohortResults, averageRetention });
  } catch (err) {
    console.error('[analytics/retention GET]', err);
    return NextResponse.json({ error: 'Failed to compute retention data' }, { status: 500 });
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Returns the Monday (start of ISO week) for the given date, at 00:00:00 UTC.
 */
function getWeekMonday(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  // getUTCDay(): 0=Sunday, 1=Monday, …, 6=Saturday
  const day = d.getUTCDay();
  // Distance to Monday: Sunday→-6, Monday→0, Tuesday→-1, …
  const daysToMonday = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + daysToMonday);
  return d;
}
