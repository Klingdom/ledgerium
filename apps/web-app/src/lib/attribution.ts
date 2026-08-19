/**
 * Ledgerium AI — Acquisition Attribution Join
 *
 * REVENUE_PLAN_20K attribution fix (2026-08 —
 * docs/meta/REVENUE_PLAN_20K/analytics_analysis.md §2).
 *
 * Answers the question the CEO needs to make acquisition-channel decisions:
 * "for a given paying customer, what was the first-touch acquisition
 * source?" — i.e. the earliest recorded anonymous event (typically an SEO
 * landing-page view, a marketing nav click, or a direct page_viewed) for the
 * visitor who eventually became that paying customer.
 *
 * The join, end to end:
 *
 *   AnalyticsEvent (anonymous, source='client', visitorId set by track())
 *     ──── visitorId ────▶ User.firstTouchVisitorId (set once, at signup)
 *                              │
 *                              ▼
 *                          User.plan / User.subscriptionStatus
 *                          (paying-customer gate — same definition as the
 *                           admin "Est. MRR" tile: MRR_BILLABLE_STATUSES)
 *
 * Both `AnalyticsEvent.visitorId` and `User.firstTouchVisitorId` are
 * first-class indexed columns (see `prisma/schema.prisma` and migration
 * `20260818010000_add_visitor_attribution`) — this module runs as ordinary
 * indexed Prisma queries, not a JSON-blob scan.
 *
 * No PII: `visitorId` is a random anonymous UUID (see analytics.ts
 * getOrCreateVisitorId()), never derived from email/IP/device. `email` is
 * returned on the attribution record only because it already exists on
 * `User` and is useful for a human reading the report — it is not part of
 * the join key and carries no additional privacy exposure beyond what the
 * `User` table already has.
 */

import { db } from '@/db';
import { MRR_BILLABLE_STATUSES } from './admin-operations/pricing';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FirstTouchEvent {
  /** e.g. 'seo_page_viewed', 'page_viewed', 'nav_link_clicked'. */
  eventName: string;
  occurredAt: Date;
  /** Path the event fired from, when captured (client events only). */
  url: string | null;
  /** Parsed JSON metadata for the event — taxonomy/counts only, never PII. */
  properties: Record<string, unknown> | null;
}

export interface FirstTouchAttribution {
  userId: string;
  email: string;
  plan: string;
  subscriptionStatus: string;
  /**
   * null when this account predates the attribution fix (created before
   * migration 20260818010000), or the client never captured one (e.g.
   * localStorage blocked at signup time). Never fabricated.
   */
  visitorId: string | null;
  /**
   * The earliest AnalyticsEvent recorded for this visitor — the acquisition
   * source. null when `visitorId` is null, or when no AnalyticsEvent for
   * that visitorId exists yet (e.g. the row exists but no anonymous event
   * ever fired for it — possible for accounts created directly via API/seed
   * scripts without a browser session).
   */
  firstTouch: FirstTouchEvent | null;
}

// ─── Internal helpers ────────────────────────────────────────────────────────

function parseProperties(raw: string | null): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

interface MinimalUser {
  id: string;
  email: string;
  plan: string;
  subscriptionStatus: string;
  firstTouchVisitorId: string | null;
}

function toFirstTouchEvent(evt: {
  eventName: string;
  createdAt: Date;
  url: string | null;
  properties: string | null;
}): FirstTouchEvent {
  return {
    eventName: evt.eventName,
    occurredAt: evt.createdAt,
    url: evt.url,
    properties: parseProperties(evt.properties),
  };
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Answers "what was the first-touch acquisition source for this specific
 * user?" — regardless of whether they are currently paying. Returns `null`
 * only if the user does not exist.
 */
export async function getFirstTouchAttributionForUser(
  userId: string,
): Promise<FirstTouchAttribution | null> {
  const user: MinimalUser | null = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, plan: true, subscriptionStatus: true, firstTouchVisitorId: true },
  });
  if (!user) return null;

  if (!user.firstTouchVisitorId) {
    return {
      userId: user.id,
      email: user.email,
      plan: user.plan,
      subscriptionStatus: user.subscriptionStatus,
      visitorId: null,
      firstTouch: null,
    };
  }

  const firstEvent = await db.analyticsEvent.findFirst({
    where: { visitorId: user.firstTouchVisitorId },
    orderBy: { createdAt: 'asc' },
  });

  return {
    userId: user.id,
    email: user.email,
    plan: user.plan,
    subscriptionStatus: user.subscriptionStatus,
    visitorId: user.firstTouchVisitorId,
    firstTouch: firstEvent ? toFirstTouchEvent(firstEvent) : null,
  };
}

/**
 * Answers "what was the first-touch acquisition source, for every currently
 * paying customer?" — the query the CEO needs to see which acquisition
 * channels actually produce revenue.
 *
 * "Paying" is defined identically to `MRR_BILLABLE_STATUSES`
 * (admin-operations/pricing.ts) — the same gate the admin "Est. MRR" tile
 * uses — so this list and the MRR number always describe the same
 * population. (Team/Growth subscriptions billed through the `Team` model
 * are out of scope here: `Team` has no individual first-touch visitor of
 * its own — see the webhook route's "ATTRIBUTION SCOPE NOTE" — so this
 * function reads solo-subscriber `User` rows, which is where
 * `firstTouchVisitorId` lives.)
 *
 * Batches the AnalyticsEvent lookup into a single indexed query (rather than
 * N+1 per user) by fetching every event for the involved visitorIds, ordered
 * ascending, and keeping only the first row seen per visitorId.
 */
export async function listPayingCustomerFirstTouchAttribution(): Promise<FirstTouchAttribution[]> {
  const payingUsers: MinimalUser[] = await db.user.findMany({
    where: { subscriptionStatus: { in: [...MRR_BILLABLE_STATUSES] } },
    select: { id: true, email: true, plan: true, subscriptionStatus: true, firstTouchVisitorId: true },
    orderBy: { createdAt: 'asc' },
  });

  if (payingUsers.length === 0) return [];

  const visitorIds = Array.from(
    new Set(
      payingUsers
        .map((u) => u.firstTouchVisitorId)
        .filter((v): v is string => v !== null),
    ),
  );

  const firstEventByVisitorId = new Map<string, FirstTouchEvent>();
  if (visitorIds.length > 0) {
    const events = await db.analyticsEvent.findMany({
      where: { visitorId: { in: visitorIds } },
      orderBy: { createdAt: 'asc' },
    });
    for (const evt of events) {
      if (!evt.visitorId) continue;
      if (firstEventByVisitorId.has(evt.visitorId)) continue; // already have the earliest for this visitor
      firstEventByVisitorId.set(evt.visitorId, toFirstTouchEvent(evt));
    }
  }

  return payingUsers.map((u) => ({
    userId: u.id,
    email: u.email,
    plan: u.plan,
    subscriptionStatus: u.subscriptionStatus,
    visitorId: u.firstTouchVisitorId,
    firstTouch: u.firstTouchVisitorId
      ? firstEventByVisitorId.get(u.firstTouchVisitorId) ?? null
      : null,
  }));
}
