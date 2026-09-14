/**
 * The risky cases here are the boundaries, because they decide whether someone
 * keeps paid features for an extra millisecond or loses them a day early — and
 * whether the countdown the user reads agrees with the entitlement they get.
 * A countdown saying "0 days left" while access still works, or "1 day left"
 * after access stopped, destroys trust in the number faster than no number.
 */

import { describe, it, expect } from 'vitest';
import {
  REVERSE_TRIAL_PLAN,
  REVERSE_TRIAL_DAYS,
  reverseTrialEndsAt,
  isReverseTrialActive,
  activeReverseTrialPlan,
  reverseTrialDaysRemaining,
  hasReverseTrialLapsed,
  type ReverseTrialFields,
} from './reverse-trial';

const NOW = 1_700_000_000_000; // frozen — never the wall clock
const DAY = 24 * 60 * 60 * 1000;

function trial(endsAtMs: number | null, plan: string | null = REVERSE_TRIAL_PLAN): ReverseTrialFields {
  return {
    reverseTrialPlan: plan,
    reverseTrialEndsAt: endsAtMs === null ? null : new Date(endsAtMs),
  };
}

describe('configuration', () => {
  it('grants a plan that exists and is above free', () => {
    expect(REVERSE_TRIAL_PLAN).toBe('solo');
  });

  it('defaults to a sane window', () => {
    expect(REVERSE_TRIAL_DAYS).toBeGreaterThan(0);
    expect(REVERSE_TRIAL_DAYS).toBeLessThanOrEqual(30);
  });
});

describe('reverseTrialEndsAt', () => {
  it('is exactly REVERSE_TRIAL_DAYS after the given instant', () => {
    const end = reverseTrialEndsAt(NOW);
    expect(end).not.toBeNull();
    expect(end!.getTime()).toBe(NOW + REVERSE_TRIAL_DAYS * DAY);
  });

  it('is pure — same input, same output', () => {
    expect(reverseTrialEndsAt(NOW)!.getTime()).toBe(reverseTrialEndsAt(NOW)!.getTime());
  });

  it('never reads the wall clock', () => {
    // Two different "now" values must produce different ends. If the
    // implementation ignored nowMs and called Date.now(), these would match.
    expect(reverseTrialEndsAt(NOW)!.getTime()).not.toBe(reverseTrialEndsAt(NOW + DAY)!.getTime());
  });
});

describe('isReverseTrialActive — boundaries', () => {
  it('is active one millisecond before expiry', () => {
    expect(isReverseTrialActive(trial(NOW + 1), NOW)).toBe(true);
  });

  it('is NOT active at the exact expiry instant', () => {
    // Inclusive would leave a 1ms window where the UI reads "0 days left"
    // while entitlement still grants the plan.
    expect(isReverseTrialActive(trial(NOW), NOW)).toBe(false);
  });

  it('is not active after expiry', () => {
    expect(isReverseTrialActive(trial(NOW - 1), NOW)).toBe(false);
  });

  it('is not active for a user who never had a trial', () => {
    expect(isReverseTrialActive(trial(null, null), NOW)).toBe(false);
  });

  it('is not active when the date is set but the plan is not', () => {
    // A half-written row must not grant anything.
    expect(isReverseTrialActive(trial(NOW + DAY, null), NOW)).toBe(false);
  });
});

describe('activeReverseTrialPlan', () => {
  it('grants the configured plan while the window is open', () => {
    expect(activeReverseTrialPlan(trial(NOW + DAY), NOW)).toBe('solo');
  });

  it('grants nothing once the window closes', () => {
    expect(activeReverseTrialPlan(trial(NOW - DAY), NOW)).toBeNull();
  });

  it('declines to guess at an unrecognised stored plan', () => {
    // A value outside PLAN_HIERARCHY means the row came from a different or
    // older code path. Silently upgrading someone on an unreadable field is
    // worse than declining.
    expect(activeReverseTrialPlan(trial(NOW + DAY, 'platinum'), NOW)).toBeNull();
    expect(activeReverseTrialPlan(trial(NOW + DAY, ''), NOW)).toBeNull();
  });
});

describe('reverseTrialDaysRemaining', () => {
  it('rounds up, so any time left never shows as zero', () => {
    // The trust-critical case: 1ms left must not read "0 days left" beside
    // features that still work.
    expect(reverseTrialDaysRemaining(trial(NOW + 1), NOW)).toBe(1);
  });

  it('reports the full window on day zero', () => {
    expect(reverseTrialDaysRemaining(trial(NOW + REVERSE_TRIAL_DAYS * DAY), NOW)).toBe(
      REVERSE_TRIAL_DAYS,
    );
  });

  it('counts down as time passes', () => {
    const end = NOW + 14 * DAY;
    expect(reverseTrialDaysRemaining(trial(end), NOW)).toBe(14);
    expect(reverseTrialDaysRemaining(trial(end), NOW + 13 * DAY)).toBe(1);
  });

  it('is zero once expired, never negative', () => {
    expect(reverseTrialDaysRemaining(trial(NOW - 100 * DAY), NOW)).toBe(0);
  });

  it('is zero for a user who never had a trial', () => {
    expect(reverseTrialDaysRemaining(trial(null, null), NOW)).toBe(0);
  });
});

describe('hasReverseTrialLapsed — distinct from "not active"', () => {
  it('is true for someone whose window closed', () => {
    expect(hasReverseTrialLapsed(trial(NOW - 1), NOW)).toBe(true);
  });

  it('is FALSE for someone who never had a trial', () => {
    // This distinction drives messaging: a lapsed user should be told what
    // they lost; someone who never had a trial should hear nothing about one.
    expect(hasReverseTrialLapsed(trial(null, null), NOW)).toBe(false);
    expect(isReverseTrialActive(trial(null, null), NOW)).toBe(false);
  });

  it('is false while the trial is still running', () => {
    expect(hasReverseTrialLapsed(trial(NOW + DAY), NOW)).toBe(false);
  });

  it('active and lapsed are never both true', () => {
    for (const offset of [-DAY, -1, 0, 1, DAY]) {
      const f = trial(NOW + offset);
      expect(isReverseTrialActive(f, NOW) && hasReverseTrialLapsed(f, NOW)).toBe(false);
    }
  });
});

describe('countdown agrees with entitlement at every boundary', () => {
  it('shows a positive day count exactly when the plan is granted', () => {
    // The invariant that matters to a user: the number they read and the
    // access they get must never disagree.
    for (const offset of [-DAY, -1, 0, 1, DAY, 7 * DAY]) {
      const f = trial(NOW + offset);
      const granted = activeReverseTrialPlan(f, NOW) !== null;
      const daysShown = reverseTrialDaysRemaining(f, NOW);
      expect(daysShown > 0).toBe(granted);
    }
  });
});
