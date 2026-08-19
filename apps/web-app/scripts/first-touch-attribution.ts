/**
 * First-Touch Attribution Report — Ledgerium AI
 *
 * REVENUE_PLAN_20K attribution fix (2026-08 —
 * docs/meta/REVENUE_PLAN_20K/analytics_analysis.md §2).
 *
 * Prints, for every currently-paying customer, the earliest recorded
 * acquisition event (SEO landing page, marketing nav click, direct visit,
 * etc.) their visitorId was ever attached to — answering "which acquisition
 * channel produces revenue?"
 *
 * Usage:
 *   pnpm --filter web-app attribution:first-touch
 *
 * DATABASE_URL env var controls which database is read. Read-only — this
 * script never writes to the database.
 *
 * Exits 0 on success (including "zero paying customers yet" — an honest,
 * expected state per docs/meta/REVENUE_PLAN_20K/analytics_analysis.md §0),
 * 1 on failure.
 */

import { PrismaClient } from '@prisma/client';

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  try {
    // Mirrors listPayingCustomerFirstTouchAttribution() in src/lib/attribution.ts,
    // duplicated here (rather than imported) so this script has zero
    // dependency on Next.js path aliases and can run under plain `tsx`.
    const MRR_BILLABLE_STATUSES = ['active'] as const;

    const payingUsers = await prisma.user.findMany({
      where: { subscriptionStatus: { in: [...MRR_BILLABLE_STATUSES] } },
      select: { id: true, email: true, plan: true, subscriptionStatus: true, firstTouchVisitorId: true },
      orderBy: { createdAt: 'asc' },
    });

    if (payingUsers.length === 0) {
      console.log(
        '[attribution] No currently-paying customers found ' +
          '(User.subscriptionStatus never reaches "active" until Stripe is ' +
          'operationalized and Team/Growth is sellable — see ' +
          'docs/meta/REVENUE_PLAN_20K_001.md §3). Nothing to attribute yet.',
      );
      return;
    }

    const visitorIds = Array.from(
      new Set(
        payingUsers.map((u) => u.firstTouchVisitorId).filter((v): v is string => v !== null),
      ),
    );

    const firstEventByVisitorId = new Map<
      string,
      { eventName: string; occurredAt: Date; url: string | null }
    >();
    if (visitorIds.length > 0) {
      const events = await prisma.analyticsEvent.findMany({
        where: { visitorId: { in: visitorIds } },
        orderBy: { createdAt: 'asc' },
      });
      for (const evt of events) {
        if (!evt.visitorId || firstEventByVisitorId.has(evt.visitorId)) continue;
        firstEventByVisitorId.set(evt.visitorId, {
          eventName: evt.eventName,
          occurredAt: evt.createdAt,
          url: evt.url,
        });
      }
    }

    const rows = payingUsers.map((u) => {
      const firstTouch = u.firstTouchVisitorId
        ? firstEventByVisitorId.get(u.firstTouchVisitorId)
        : undefined;
      return {
        userId: u.id,
        plan: u.plan,
        status: u.subscriptionStatus,
        visitorId: u.firstTouchVisitorId ?? '(none — pre-fix account)',
        firstTouchEvent: firstTouch?.eventName ?? '(no anonymous event found)',
        firstTouchUrl: firstTouch?.url ?? '—',
        firstTouchAt: firstTouch?.occurredAt.toISOString() ?? '—',
      };
    });

    console.table(rows);

    const attributed = rows.filter((r) => r.firstTouchEvent !== '(no anonymous event found)').length;
    console.log(
      `\n[attribution] ${attributed} of ${rows.length} paying customers have a resolvable first-touch source.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('[attribution] Failed:', err);
  process.exitCode = 1;
});
