/**
 * Regression: the Process Intelligence page must not lie about what happened.
 *
 * `dismissInsight` previously removed an insight from local state without ever
 * checking `res.ok`. A failed PATCH left the row visually gone while the record
 * stayed `dismissed: false` server-side, so it reappeared on the next load.
 *
 * The rollback depends on `applyInsightDismissal` returning a NEW object rather
 * than mutating — if it mutated, the component's snapshot would already be
 * modified and restoring it would restore nothing. That is the property these
 * tests exist to pin.
 */

import { describe, it, expect } from 'vitest';
import { applyInsightDismissal, analyticsActionErrorMessage } from './insightActions';

function state() {
  return {
    insights: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
    totalInsights: 3,
    // An unrelated field, to prove the transition preserves the rest of the payload.
    totalWorkflows: 12,
  };
}

describe('applyInsightDismissal', () => {
  it('removes the named insight and decrements the count', () => {
    const next = applyInsightDismissal(state(), 'b');
    expect(next.insights.map((i) => i.id)).toEqual(['a', 'c']);
    expect(next.totalInsights).toBe(2);
  });

  it('preserves unrelated fields', () => {
    expect(applyInsightDismissal(state(), 'b').totalWorkflows).toBe(12);
  });

  it('does NOT mutate its input — this is what makes rollback possible', () => {
    const original = state();
    const snapshot = JSON.stringify(original);
    applyInsightDismissal(original, 'b');
    expect(JSON.stringify(original)).toBe(snapshot);
  });

  it('round-trips: the pre-dismissal snapshot still describes the original state', () => {
    // Mirrors what the component does — keep `previous`, apply optimistically,
    // then restore `previous` when the request fails.
    const previous = state();
    const optimistic = applyInsightDismissal(previous, 'b');
    expect(optimistic.insights).toHaveLength(2);
    // The rollback value must be untouched and complete.
    expect(previous.insights.map((i) => i.id)).toEqual(['a', 'b', 'c']);
    expect(previous.totalInsights).toBe(3);
  });

  it('is a no-op for an id that is not present, and does not skew the counter', () => {
    const next = applyInsightDismissal(state(), 'does-not-exist');
    expect(next.insights).toHaveLength(3);
    expect(next.totalInsights).toBe(3);
  });

  it('never drives the counter below zero', () => {
    const skewed = { insights: [{ id: 'a' }], totalInsights: 0, totalWorkflows: 1 };
    expect(applyInsightDismissal(skewed, 'a').totalInsights).toBe(0);
  });
});

describe('analyticsActionErrorMessage', () => {
  it('always tells the user the insight was restored', () => {
    // The user just watched the row vanish — silence would leave them unsure
    // what the app now believes.
    expect(analyticsActionErrorMessage('dismiss_insight')).toMatch(/restored/i);
  });

  it("surfaces the API's own message for a failed analysis run", () => {
    expect(analyticsActionErrorMessage('run_analysis', 'No workflows to analyze')).toBe(
      'No workflows to analyze',
    );
  });

  it('falls back to an actionable message when the API says nothing useful', () => {
    for (const bad of [undefined, null, '', '   ', 42, {}]) {
      const msg = analyticsActionErrorMessage('run_analysis', bad);
      expect(msg.trim().length, `empty message for ${JSON.stringify(bad)}`).toBeGreaterThan(0);
      expect(msg).toMatch(/try again/i);
    }
  });
});
