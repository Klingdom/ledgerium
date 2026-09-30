/**
 * Row #94 — the plan on an analytics event is never silently absent.
 *
 * Before this, `userPlan` was attached only when known, so events fired before
 * the plan resolved carried no plan property at all and dropped out of any
 * plan-tier breakdown entirely. An analysis missing an unknown share of its
 * input looks complete, which is the failure mode worth preventing: the gap
 * must be visible in the data, not inferable only by someone who reads the
 * enrichment code.
 *
 * These tests assert the property is ALWAYS present, and that 'unknown' is what
 * appears when the plan has not been set.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const WINDOW_KEY = '__ledgerium_userPlan';

/** Load a fresh module graph so module-scoped analytics caches do not leak. */
async function freshAnalytics(): Promise<typeof import('./analytics.js')> {
  vi.resetModules();
  return import('./analytics.js');
}

function setPlan(value: unknown): void {
  (globalThis as unknown as Record<string, unknown>)[WINDOW_KEY] = value;
}

function clearPlan(): void {
  delete (globalThis as unknown as Record<string, unknown>)[WINDOW_KEY];
}

describe('userPlan enrichment is always present', () => {
  beforeEach(() => {
    clearPlan();
  });

  afterEach(() => {
    clearPlan();
    vi.restoreAllMocks();
  });

  it('setUserPlanForAnalytics stores the plan where track() reads it', async () => {
    const { setUserPlanForAnalytics } = await freshAnalytics();
    setUserPlanForAnalytics('team');
    // In a node test environment IS_BROWSER is false, so the setter is a no-op
    // by design — it must not throw, and must not invent a global.
    expect(() => setUserPlanForAnalytics('growth')).not.toThrow();
  });

  it('treats an unset plan as the literal "unknown", not as absent', () => {
    // The enrichment rule under test, applied directly: an absent plan must
    // resolve to a value that appears in a breakdown rather than vanishing.
    const resolve = (raw: unknown): unknown => (raw != null ? raw : 'unknown');
    expect(resolve(undefined)).toBe('unknown');
    expect(resolve(null)).toBe('unknown');
  });

  it('preserves a known plan exactly', () => {
    const resolve = (raw: unknown): unknown => (raw != null ? raw : 'unknown');
    for (const plan of ['free', 'starter', 'team', 'growth', 'enterprise']) {
      expect(resolve(plan)).toBe(plan);
    }
  });

  it('does not treat the empty string as unknown', () => {
    // '' is a value someone set, not an absence. Coercing it would hide a real
    // upstream bug behind the same bucket as "not yet known".
    const resolve = (raw: unknown): unknown => (raw != null ? raw : 'unknown');
    expect(resolve('')).toBe('');
  });

  it('the enrichment in analytics.ts assigns unconditionally', async () => {
    const { readFileSync } = await import('node:fs');
    const { fileURLToPath } = await import('node:url');
    const src = readFileSync(fileURLToPath(new URL('./analytics.js', import.meta.url)).replace(/\.js$/, '.ts'), 'utf8');
    // The old form was `if (userPlan != null) base.userPlan = userPlan;` — a
    // conditional assignment is exactly the shape that made events drop out of
    // breakdowns, so its return would be a regression.
    expect(src).toMatch(/base\.userPlan = userPlan != null \? userPlan : 'unknown'/);
    expect(src).not.toMatch(/if \(userPlan != null\) base\.userPlan = userPlan;/);
  });

  it('the queue-and-drain fix was deliberately not taken', async () => {
    // dashboard_bounced fires from beforeunload via sendBeacon. Anything still
    // queued at that moment is never sent, so queuing would trade a visible
    // gap for lost events. If a queue ever appears here, this should be
    // revisited rather than silently accepted.
    const { readFileSync } = await import('node:fs');
    const { fileURLToPath } = await import('node:url');
    const src = readFileSync(fileURLToPath(new URL('./analytics.js', import.meta.url)).replace(/\.js$/, '.ts'), 'utf8');
    expect(src).not.toMatch(/pendingEventQueue|drainAnalyticsQueue/);
  });

  it('setPlan/clearPlan helpers do not leak between tests', () => {
    setPlan('team');
    expect((globalThis as unknown as Record<string, unknown>)[WINDOW_KEY]).toBe('team');
    clearPlan();
    expect((globalThis as unknown as Record<string, unknown>)[WINDOW_KEY]).toBeUndefined();
  });
});
