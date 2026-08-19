/**
 * attribution.ts — the acquisition-attribution join.
 *
 * REVENUE_PLAN_20K attribution fix (2026-08 —
 * docs/meta/REVENUE_PLAN_20K/analytics_analysis.md §2).
 *
 * REGRESSION LOCK: this suite is written against the NEW module. It fails
 * outright (module does not exist / does not export these functions) before
 * the fix, and exercises the full join end to end after it: an anonymous
 * event → a signup (User.firstTouchVisitorId) → a subscription
 * (User.subscriptionStatus / plan) → joined back to the first-touch source.
 *
 * Mocking strategy: vi.mock('@/db') with an in-memory analyticsEvent/user
 * store, so the join logic runs against real Prisma-shaped query semantics
 * (findFirst/findMany with where/orderBy) rather than pre-baked fixtures —
 * this is what actually proves the join, not just the plumbing around it.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

interface FakeUser {
  id: string;
  email: string;
  plan: string;
  subscriptionStatus: string;
  firstTouchVisitorId: string | null;
  createdAt: Date;
}

interface FakeEvent {
  id: string;
  visitorId: string | null;
  eventName: string;
  properties: string | null;
  url: string | null;
  createdAt: Date;
}

let users: FakeUser[] = [];
let events: FakeEvent[] = [];

vi.mock('@/db', () => ({
  db: {
    user: {
      findUnique: vi.fn((args: { where: { id: string } }) =>
        Promise.resolve(users.find((u) => u.id === args.where.id) ?? null),
      ),
      findMany: vi.fn((args: { where?: { subscriptionStatus?: { in: string[] } }; orderBy?: { createdAt: 'asc' | 'desc' } }) => {
        let result = [...users];
        const statusIn = args.where?.subscriptionStatus?.in;
        if (statusIn) {
          result = result.filter((u) => statusIn.includes(u.subscriptionStatus));
        }
        result.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        return Promise.resolve(result);
      }),
    },
    analyticsEvent: {
      findFirst: vi.fn((args: { where: { visitorId: string }; orderBy: { createdAt: 'asc' } }) => {
        const matches = events
          .filter((e) => e.visitorId === args.where.visitorId)
          .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        return Promise.resolve(matches[0] ?? null);
      }),
      findMany: vi.fn((args: { where: { visitorId: { in: string[] } }; orderBy: { createdAt: 'asc' } }) => {
        const result = events
          .filter((e) => e.visitorId !== null && args.where.visitorId.in.includes(e.visitorId))
          .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        return Promise.resolve(result);
      }),
    },
  },
}));

vi.mock('@/lib/admin-operations/pricing', () => ({
  MRR_BILLABLE_STATUSES: ['active'] as const,
}));

describe('attribution.ts: the acquisition-attribution join', () => {
  let attribution: typeof import('./attribution.js');

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    users = [];
    events = [];
    attribution = await import('./attribution.js');
  });

  // ── End-to-end: anonymous event → signup → subscription → joined back ────

  it('END TO END: an anonymous SEO event, a signup, and a subscription join back to the first-touch source', async () => {
    const visitorId = 'vid-e2e-001';

    // 1. Anonymous event — before signup, source='client', no userId yet.
    events.push({
      id: 'evt_1',
      visitorId,
      eventName: 'seo_page_viewed',
      properties: JSON.stringify({ pageType: 'alternatives', slug: 'sweetprocess', referrerClass: 'organic' }),
      url: '/alternatives/sweetprocess',
      createdAt: new Date('2026-08-01T10:00:00Z'),
    });

    // 2. Signup — the pivot: User.firstTouchVisitorId is set from the same visitorId.
    users.push({
      id: 'user_e2e_001',
      email: 'e2e@example.com',
      plan: 'starter',
      subscriptionStatus: 'active', // 3. Subscription — this user is now paying.
      firstTouchVisitorId: visitorId,
      createdAt: new Date('2026-08-01T10:05:00Z'),
    });

    // A later, unrelated event for the same visitor (post-signup) must NOT
    // be picked as "first touch" — the join must return the EARLIEST event.
    events.push({
      id: 'evt_2',
      visitorId,
      eventName: 'dashboard_v2_viewed',
      properties: JSON.stringify({ workflowCount: 3 }),
      url: '/dashboard',
      createdAt: new Date('2026-08-02T09:00:00Z'),
    });

    // 4. Joined back to first-touch source.
    const result = await attribution.getFirstTouchAttributionForUser('user_e2e_001');

    expect(result).not.toBeNull();
    expect(result!.userId).toBe('user_e2e_001');
    expect(result!.plan).toBe('starter');
    expect(result!.subscriptionStatus).toBe('active');
    expect(result!.visitorId).toBe(visitorId);
    expect(result!.firstTouch).not.toBeNull();
    // Must be the EARLIEST event, not the later dashboard view.
    expect(result!.firstTouch!.eventName).toBe('seo_page_viewed');
    expect(result!.firstTouch!.url).toBe('/alternatives/sweetprocess');
    expect(result!.firstTouch!.properties).toEqual({
      pageType: 'alternatives',
      slug: 'sweetprocess',
      referrerClass: 'organic',
    });

    // Also reachable via the paying-customers list — same join, list form.
    const paying = await attribution.listPayingCustomerFirstTouchAttribution();
    expect(paying).toHaveLength(1);
    expect(paying[0]!.userId).toBe('user_e2e_001');
    expect(paying[0]!.firstTouch!.eventName).toBe('seo_page_viewed');
  });

  // ── getFirstTouchAttributionForUser ────────────────────────────────────

  describe('getFirstTouchAttributionForUser()', () => {
    it('returns null for a user that does not exist', async () => {
      const result = await attribution.getFirstTouchAttributionForUser('nope');
      expect(result).toBeNull();
    });

    it('returns visitorId: null, firstTouch: null for a pre-fix account (no firstTouchVisitorId captured)', async () => {
      users.push({
        id: 'user_prefix',
        email: 'prefix@example.com',
        plan: 'starter',
        subscriptionStatus: 'active',
        firstTouchVisitorId: null,
        createdAt: new Date('2026-01-01T00:00:00Z'),
      });

      const result = await attribution.getFirstTouchAttributionForUser('user_prefix');

      expect(result).toEqual({
        userId: 'user_prefix',
        email: 'prefix@example.com',
        plan: 'starter',
        subscriptionStatus: 'active',
        visitorId: null,
        firstTouch: null,
      });
    });

    it('returns firstTouch: null when the visitorId exists on User but no AnalyticsEvent for it exists', async () => {
      users.push({
        id: 'user_no_events',
        email: 'noevents@example.com',
        plan: 'free',
        subscriptionStatus: 'none',
        firstTouchVisitorId: 'vid-orphan',
        createdAt: new Date('2026-01-01T00:00:00Z'),
      });

      const result = await attribution.getFirstTouchAttributionForUser('user_no_events');

      expect(result!.visitorId).toBe('vid-orphan');
      expect(result!.firstTouch).toBeNull();
    });

    it('handles malformed JSON in properties gracefully (returns null properties, does not throw)', async () => {
      const visitorId = 'vid-malformed';
      events.push({
        id: 'evt_malformed',
        visitorId,
        eventName: 'page_viewed',
        properties: '{not valid json',
        url: '/x',
        createdAt: new Date('2026-01-01T00:00:00Z'),
      });
      users.push({
        id: 'user_malformed',
        email: 'malformed@example.com',
        plan: 'free',
        subscriptionStatus: 'none',
        firstTouchVisitorId: visitorId,
        createdAt: new Date('2026-01-01T00:00:00Z'),
      });

      const result = await attribution.getFirstTouchAttributionForUser('user_malformed');

      expect(result!.firstTouch!.eventName).toBe('page_viewed');
      expect(result!.firstTouch!.properties).toBeNull();
    });
  });

  // ── listPayingCustomerFirstTouchAttribution ────────────────────────────

  describe('listPayingCustomerFirstTouchAttribution()', () => {
    it('returns an empty array when there are no paying customers (honest, expected pre-launch state)', async () => {
      users.push({
        id: 'user_free',
        email: 'free@example.com',
        plan: 'free',
        subscriptionStatus: 'none',
        firstTouchVisitorId: 'vid-free',
        createdAt: new Date('2026-01-01T00:00:00Z'),
      });

      const result = await attribution.listPayingCustomerFirstTouchAttribution();
      expect(result).toEqual([]);
    });

    it('excludes trialing subscribers — only MRR_BILLABLE_STATUSES (["active"]) count as "paying"', async () => {
      users.push(
        {
          id: 'user_trialing',
          email: 'trialing@example.com',
          plan: 'starter',
          subscriptionStatus: 'trialing',
          firstTouchVisitorId: 'vid-trialing',
          createdAt: new Date('2026-01-01T00:00:00Z'),
        },
        {
          id: 'user_active',
          email: 'active@example.com',
          plan: 'starter',
          subscriptionStatus: 'active',
          firstTouchVisitorId: 'vid-active',
          createdAt: new Date('2026-01-02T00:00:00Z'),
        },
      );

      const result = await attribution.listPayingCustomerFirstTouchAttribution();

      expect(result).toHaveLength(1);
      expect(result[0]!.userId).toBe('user_active');
    });

    it('batches the event lookup — multiple paying customers each get their own correct first-touch event', async () => {
      events.push(
        {
          id: 'evt_a',
          visitorId: 'vid-a',
          eventName: 'seo_page_viewed',
          properties: JSON.stringify({ pageType: 'blog', slug: 'a' }),
          url: '/blog/a',
          createdAt: new Date('2026-07-01T00:00:00Z'),
        },
        {
          id: 'evt_b',
          visitorId: 'vid-b',
          eventName: 'nav_link_clicked',
          properties: JSON.stringify({ item: 'pricing' }),
          url: '/',
          createdAt: new Date('2026-07-02T00:00:00Z'),
        },
      );
      users.push(
        {
          id: 'user_a',
          email: 'a@example.com',
          plan: 'starter',
          subscriptionStatus: 'active',
          firstTouchVisitorId: 'vid-a',
          createdAt: new Date('2026-07-01T01:00:00Z'),
        },
        {
          id: 'user_b',
          email: 'b@example.com',
          plan: 'team',
          subscriptionStatus: 'active',
          firstTouchVisitorId: 'vid-b',
          createdAt: new Date('2026-07-02T01:00:00Z'),
        },
      );

      const result = await attribution.listPayingCustomerFirstTouchAttribution();

      expect(result).toHaveLength(2);
      const byUserId = new Map(result.map((r) => [r.userId, r]));
      expect(byUserId.get('user_a')!.firstTouch!.eventName).toBe('seo_page_viewed');
      expect(byUserId.get('user_b')!.firstTouch!.eventName).toBe('nav_link_clicked');
    });

    it('handles a paying customer with no firstTouchVisitorId without crashing or fabricating an event', async () => {
      users.push({
        id: 'user_no_visitor',
        email: 'novisitor@example.com',
        plan: 'starter',
        subscriptionStatus: 'active',
        firstTouchVisitorId: null,
        createdAt: new Date('2026-01-01T00:00:00Z'),
      });

      const result = await attribution.listPayingCustomerFirstTouchAttribution();

      expect(result).toHaveLength(1);
      expect(result[0]!.visitorId).toBeNull();
      expect(result[0]!.firstTouch).toBeNull();
    });
  });
});
