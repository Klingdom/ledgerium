import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { likeContains, propertiesMatch } from './like-test-support';

type Row = { eventName: string; properties: string | null; createdAt: Date };
const { rows } = vi.hoisted(() => ({ rows: [] as Row[] }));
vi.mock('@/db', () => ({
  db: {
    analyticsEvent: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      findFirst: async ({ where }: any) => {
        const { propertiesMatch: m } = await import('./like-test-support');
        return (
          rows
            .filter((r) => r.eventName === where.eventName && m(r.properties, where))
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0] ?? null
        );
      },
    },
  },
}));

import { loadAlertStates } from './store';
import { ALERT_EVENT_NAME } from './state-machine';

const src = readFileSync(join(__dirname, '..', 'compute-alerts.ts'), 'utf8');
const ALERT_IDS = [...new Set([...src.matchAll(/\bid:\s*'([^']+)'/g)].map((m) => m[1]!))];
const needle = (id: string) => `"alertId":${JSON.stringify(id)}`;

describe('alert ids vs LIKE semantics (D4 M2)', () => {
  it('finds the real alert ids', () => expect(ALERT_IDS.length).toBeGreaterThanOrEqual(8));
  it('every id is lowercase [a-z0-9_]+', () => {
    for (const id of ALERT_IDS) expect(id).toMatch(/^[a-z0-9_]+$/);
  });
  it('no id can match another id needle under LIKE', () => {
    for (const a of ALERT_IDS)
      for (const b of ALERT_IDS) {
        if (a === b) continue;
        expect(likeContains(JSON.stringify({ alertId: a, state: 'firing' }), needle(b)), `${b} matches ${a}`).toBe(false);
      }
  });
  it('LIKE matcher: _ is one char, % a run, case-insensitive', () => {
    expect(likeContains('abc', 'a_c')).toBe(true);
    expect(likeContains('abc', 'a%c')).toBe(true);
    expect(likeContains('ABC', 'abc')).toBe(true);
    expect(likeContains('abbc', 'a_c')).toBe(false);
    expect(propertiesMatch('{"a":1}', { AND: [{ properties: { contains: '"a"' } }, { properties: { contains: '2' } }] })).toBe(false);
  });
});

describe('loadAlertStates is key-order independent (D4 M1)', () => {
  beforeEach(() => {
    rows.length = 0;
  });
  it('a firing row stored with state before alertId still supplies notifiedAtMs', async () => {
    const T = Date.UTC(2026, 9, 1);
    rows.push({
      eventName: ALERT_EVENT_NAME,
      properties: '{"state":"firing","alertId":"zero_uploads_24h"}',
      createdAt: new Date(T),
    });
    rows.push({
      eventName: ALERT_EVENT_NAME,
      properties: '{"state":"continued","firingRuns":1,"alertId":"zero_uploads_24h"}',
      createdAt: new Date(T + 3_600_000),
    });
    const states = await loadAlertStates(T + 2 * 3_600_000, ['zero_uploads_24h']);
    expect(JSON.stringify(states)).toContain(String(T));
  });
});
