/**
 * Weekly cohort retention — pure computation for /api/analytics/retention.
 *
 * Row #250 (MR-039 A-4): a cell for week N is only MEASURABLE once week N of
 * that cohort has fully elapsed (cohortWeekStart + (N+1) weeks <= now). Before
 * that it is `null` ("not yet measurable"), not 0, and is excluded from the
 * average. Previously a cohort that signed up three days ago counted as 0%
 * week-4 retention and dragged the average down.
 *
 * Week 0 is 100 by definition (cohort = signup). Week 4+ is open-ended
 * ("any upload in week 4 or later") but becomes measurable on the same rule as
 * week 4. Deterministic: `nowMs` is injected.
 */

export const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
export const RETENTION_WEEKS = 5; // indices 0,1,2,3,4(=4+)
const COHORT_COUNT = 8;

export type RetentionCell = number | null;

export interface RetentionCohortRow {
  week: string;
  signups: number;
  retention: RetentionCell[];
}

export interface RetentionResult {
  cohorts: RetentionCohortRow[];
  averageRetention: RetentionCell[];
}

/** Monday (ISO week start) 00:00:00 UTC for the given date. */
export function getWeekMonday(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  const day = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() + (day === 0 ? -6 : 1 - day));
  return d;
}

const isoDay = (d: Date): string => d.toISOString().slice(0, 10);

export function computeRetention(
  users: readonly { id: string; createdAt: Date | string }[],
  uploadEvents: readonly { userId: string | null; createdAt: Date | string }[],
  nowMs: number,
): RetentionResult {
  const currentMonday = getWeekMonday(new Date(nowMs));
  const cohortWeeks: Date[] = [];
  for (let i = COHORT_COUNT - 1; i >= 0; i--) {
    cohortWeeks.push(new Date(currentMonday.getTime() - i * WEEK_MS));
  }

  const uploadWeeksByUser = new Map<string, Set<string>>();
  for (const evt of uploadEvents) {
    if (!evt.userId) continue;
    const wk = isoDay(getWeekMonday(new Date(evt.createdAt)));
    const set = uploadWeeksByUser.get(evt.userId) ?? new Set<string>();
    set.add(wk);
    uploadWeeksByUser.set(evt.userId, set);
  }

  const usersByCohort = new Map<string, string[]>();
  for (const u of users) {
    const key = isoDay(getWeekMonday(new Date(u.createdAt)));
    const arr = usersByCohort.get(key) ?? [];
    arr.push(u.id);
    usersByCohort.set(key, arr);
  }

  const cohorts: RetentionCohortRow[] = cohortWeeks.map((start) => {
    const key = isoDay(start);
    const ids = usersByCohort.get(key) ?? [];
    const signups = ids.length;
    if (signups === 0) {
      return { week: key, signups: 0, retention: Array<RetentionCell>(RETENTION_WEEKS).fill(null) }; // no cohort, nothing to measure
    }
    const retention: RetentionCell[] = [100];
    for (let n = 1; n < RETENTION_WEEKS; n++) {
      // Measurable only once week n of this cohort has fully elapsed.
      if (start.getTime() + (n + 1) * WEEK_MS > nowMs) {
        retention.push(null);
        continue;
      }
      const targetKey = isoDay(new Date(start.getTime() + n * WEEK_MS));
      const week4Start = start.getTime() + 4 * WEEK_MS;
      let retained = 0;
      for (const id of ids) {
        const weeks = uploadWeeksByUser.get(id);
        if (!weeks) continue;
        if (n < RETENTION_WEEKS - 1) {
          if (weeks.has(targetKey)) retained++;
        } else if ([...weeks].some((wk) => new Date(wk).getTime() >= week4Start)) {
          retained++;
        }
      }
      retention.push(Math.round((retained / signups) * 100));
    }
    return { week: key, signups, retention };
  });

  // Average over cohorts with signups AND a measurable cell at that index.
  const active = cohorts.filter((c) => c.signups > 0);
  const averageRetention: RetentionCell[] = Array.from({ length: RETENTION_WEEKS }, (_, i) => {
    const cells = active
      .map((c) => c.retention[i])
      .filter((v): v is number => typeof v === 'number');
    if (cells.length === 0) return i === 0 && active.length === 0 ? 100 : null;
    return Math.round(cells.reduce((a, b) => a + b, 0) / cells.length);
  });

  return { cohorts, averageRetention };
}
