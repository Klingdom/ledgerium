/** Row #250: activation alert trips on low NEW-signup activation despite a large active base. */
import { describe, it, expect, vi } from 'vitest';

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 5, 30, 12, 0, 0);

type Ev = { eventName: string; userId: string | null; createdAt: Date };
const { events } = vi.hoisted(() => ({ events: [] as Ev[] }));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function matches(e: Ev, where: any): boolean {
  if (where.eventName && e.eventName !== where.eventName) return false;
  if (where.userId && 'not' in where.userId && e.userId === where.userId.not) return false;
  const c = where.createdAt;
  if (c?.gte && e.createdAt < c.gte) return false;
  if (c?.lte && e.createdAt > c.lte) return false;
  return true;
}

vi.mock('@/db', () => ({
  db: {
    analyticsEvent: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      count: async ({ where }: any) => events.filter((e) => matches(e, where)).length,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      findMany: async ({ where }: any) => events.filter((e) => matches(e, where)),
      // Legacy API kept so the pre-fix implementation runs (and yields ratio > 1).
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      groupBy: async ({ where }: any) => {
        const ids = new Set(events.filter((e) => matches(e, where)).map((e) => e.userId));
        return [...ids].map((userId) => ({ userId }));
      },
    },
  },
}));

import { computeAlerts } from './compute-alerts';

const activation = async () => (await computeAlerts(NOW)).find((x) => x.id === 'activation_rate_drop')!;

describe('activation_rate_drop (row #250)', () => {
  it('fires when new-signup activation is low even with many active long-tenured users', async () => {
    events.length = 0;
    for (let i = 0; i < 10; i++) events.push({ eventName: 'signup_completed', userId: `n${i}`, createdAt: new Date(NOW - 10 * DAY) });
    for (let i = 0; i < 4; i++) events.push({ eventName: 'signup_completed', userId: `r${i}`, createdAt: new Date(NOW - 2 * DAY) });
    for (let i = 0; i < 40; i++) events.push({ eventName: 'sop_section_viewed', userId: `old${i}`, createdAt: new Date(NOW - 1 * DAY) });

    const a = await activation();
    expect(a.value).toBe(0);
    expect(a.status).toBe('firing');
  });

  it('is ok and bounded when the cohort activates; insufficient_data on empty cohort', async () => {
    events.length = 0;
    expect((await activation()).status).toBe('insufficient_data');
    for (let i = 0; i < 10; i++) {
      events.push({ eventName: 'signup_completed', userId: `n${i}`, createdAt: new Date(NOW - 10 * DAY) });
      events.push({ eventName: 'sop_section_viewed', userId: `n${i}`, createdAt: new Date(NOW - 9 * DAY) });
    }
    const a = await activation();
    expect(a.value).toBe(1);
    expect(a.status).toBe('ok');
  });

  it('cohort below the minimum is insufficient_data with the size in the message, even at 0% (row #292)', async () => {
    events.length = 0;
    for (let i = 0; i < 3; i++) events.push({ eventName: 'signup_completed', userId: `n${i}`, createdAt: new Date(NOW - 10 * DAY) });
    const a = await activation();
    expect(a.status).toBe('insufficient_data');
    expect(a.value).toBeNull();
    expect(a.message).toContain('Only 3 signup');
  });

  it('cohort of exactly the minimum is evaluated (boundary)', async () => {
    events.length = 0;
    for (let i = 0; i < 10; i++) events.push({ eventName: 'signup_completed', userId: `n${i}`, createdAt: new Date(NOW - 10 * DAY) });
    expect((await activation()).status).toBe('firing');
  });

  it('upload success rate on a tiny sample (1 failed, 0 ok) is insufficient_data, not a P1 page (row #292)', async () => {
    events.length = 0;
    events.push({ eventName: 'upload_failed', userId: null, createdAt: new Date(NOW - 30 * 60_000) });
    const u = (await computeAlerts(NOW)).find((x) => x.id === 'upload_success_rate_low')!;
    expect(u.status).toBe('insufficient_data');
    expect(u.message).toContain('Only 1 upload');
    for (let i = 0; i < 4; i++) events.push({ eventName: 'upload_failed', userId: null, createdAt: new Date(NOW - 30 * 60_000) });
    expect((await computeAlerts(NOW)).find((x) => x.id === 'upload_success_rate_low')!.status).toBe('firing');
  });
});
