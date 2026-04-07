import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  monthlyCount: number;
  totalCount: number;
  lastRecordedDate: string | null;
  milestones: Milestone[];
}

interface Milestone {
  label: string;
  threshold: number;
  isReached: boolean;
}

const MILESTONES = [
  { label: 'First Step', threshold: 1 },
  { label: 'Getting Started', threshold: 5 },
  { label: 'Building Habits', threshold: 10 },
  { label: 'Consistent', threshold: 25 },
  { label: 'Prolific', threshold: 50 },
  { label: 'Process Expert', threshold: 100 },
];

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get all workflow creation dates for this user (active only)
  const workflows = await db.workflow.findMany({
    where: { userId: session.user.id, status: 'active' },
    select: { createdAt: true },
    orderBy: { createdAt: 'desc' },
  });

  const totalCount = workflows.length;

  if (totalCount === 0) {
    return NextResponse.json({
      data: {
        currentStreak: 0,
        longestStreak: 0,
        monthlyCount: 0,
        totalCount: 0,
        lastRecordedDate: null,
        milestones: MILESTONES.map((m) => ({ ...m, isReached: false })),
      } satisfies StreakData,
    });
  }

  // Compute unique recording days (UTC)
  const daySet = new Set<string>();
  for (const w of workflows) {
    daySet.add(w.createdAt.toISOString().slice(0, 10));
  }
  const sortedDays = [...daySet].sort().reverse(); // most recent first

  // Current streak: consecutive days ending today or yesterday
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);

  let currentStreak = 0;
  if (sortedDays[0] === today || sortedDays[0] === yesterday) {
    let checkDate = new Date(sortedDays[0]);
    for (const day of sortedDays) {
      const expected = checkDate.toISOString().slice(0, 10);
      if (day === expected) {
        currentStreak++;
        checkDate = new Date(checkDate.getTime() - 86_400_000);
      } else if (day < expected) {
        break;
      }
    }
  }

  // Longest streak: scan chronologically
  const chronoDays = [...daySet].sort(); // oldest first
  let longestStreak = 1;
  let runLength = 1;
  for (let i = 1; i < chronoDays.length; i++) {
    const prev = new Date(chronoDays[i - 1]!);
    const curr = new Date(chronoDays[i]!);
    const diffMs = curr.getTime() - prev.getTime();
    if (diffMs === 86_400_000) {
      runLength++;
      if (runLength > longestStreak) longestStreak = runLength;
    } else {
      runLength = 1;
    }
  }

  // Monthly count: workflows created this calendar month
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const monthlyCount = workflows.filter(
    (w) => w.createdAt >= monthStart,
  ).length;

  const milestones = MILESTONES.map((m) => ({
    ...m,
    isReached: totalCount >= m.threshold,
  }));

  return NextResponse.json({
    data: {
      currentStreak,
      longestStreak,
      monthlyCount,
      totalCount,
      lastRecordedDate: sortedDays[0] ?? null,
      milestones,
    } satisfies StreakData,
  });
}
