/**
 * These assert restraint as much as correctness. The failure mode for trial
 * messaging is not "says nothing" — it is "says too much, too early, to the
 * wrong person". So the cases that matter most are the ones where the chip
 * must stay quiet: paying customers, people who never had a trial, and the
 * whole early stretch of the window where urgency would be manufactured.
 */

import { describe, it, expect } from 'vitest';
import { trialChipState, TRIAL_ATTENTION_DAYS, type TrialState } from './trial-chip';

function active(daysRemaining: number): TrialState {
  return { isActive: true, hasLapsed: false, daysRemaining, plan: 'solo' };
}
const LAPSED: TrialState = { isActive: false, hasLapsed: true, daysRemaining: 0, plan: null };
const NEVER: TrialState = { isActive: false, hasLapsed: false, daysRemaining: 0, plan: null };

describe('stays silent when it should', () => {
  it('shows nothing while account data is still loading', () => {
    // A chip that flashes in and out on every page load is worse than one
    // that appears a moment late.
    expect(trialChipState(null, 'none').show).toBe(false);
    expect(trialChipState(undefined, 'none').show).toBe(false);
  });

  it('shows nothing to someone who never had a trial', () => {
    expect(trialChipState(NEVER, 'none').show).toBe(false);
  });

  it('shows nothing to an active paying subscriber', () => {
    // Telling a paying customer about a trial is noise at best and a refund
    // prompt at worst.
    expect(trialChipState(active(5), 'active').show).toBe(false);
  });

  it('shows nothing to a past_due subscriber — they have their own messaging', () => {
    expect(trialChipState(active(5), 'past_due').show).toBe(false);
  });

  it('DOES show to a Stripe-side trialing user', () => {
    // 'trialing' is not a paid state. Hiding it here would suppress the chip
    // from exactly the people it exists for.
    expect(trialChipState(active(5), 'trialing').show).toBe(true);
  });

  it('hides a lapsed trial from someone who has since subscribed', () => {
    expect(trialChipState(LAPSED, 'active').show).toBe(false);
  });
});

describe('active trial — tone escalates only when it is actionable', () => {
  it('stays neutral through the early window', () => {
    // Nothing the user can do differs on day 10 from day 5. Colouring it
    // would be manufactured urgency.
    for (const d of [14, 10, 7, TRIAL_ATTENTION_DAYS + 1]) {
      expect(trialChipState(active(d), 'none').tone).toBe('neutral');
    }
  });

  it('shifts tone at the threshold and below', () => {
    for (const d of [TRIAL_ATTENTION_DAYS, 2, 1]) {
      expect(trialChipState(active(d), 'none').tone).toBe('attention');
    }
  });

  it('does not escalate a week out', () => {
    expect(TRIAL_ATTENTION_DAYS).toBeLessThanOrEqual(3);
  });
});

describe('active trial — label', () => {
  it('counts in days, never finer', () => {
    // A ticking countdown turns information into pressure.
    const label = trialChipState(active(6), 'none').label;
    expect(label).toBe('Trial · 6 days left');
    expect(label).not.toMatch(/hour|minute|second/i);
  });

  it('gets the singular right on the last day', () => {
    expect(trialChipState(active(1), 'none').label).toBe('Trial · 1 day left');
  });
});

describe('copy is honest about what happens next', () => {
  it('says the free plan continues, and that nothing is deleted', () => {
    const detail = trialChipState(active(2), 'none').detail;
    // The grant is Solo, not every tier. Claiming "every paid feature" would
    // be false against Team/Growth/Enterprise — lock the accurate framing.
    expect(detail).toMatch(/Solo plan/);
    expect(detail).not.toMatch(/every paid feature/i);
    expect(detail).toMatch(/free plan/i);
    expect(detail).toMatch(/not (?:be )?deleted|nothing .* deleted/i);
  });

  it('tells a lapsed user what changed without implying data loss', () => {
    const s = trialChipState(LAPSED, 'none');
    expect(s.show).toBe(true);
    expect(s.label).toBe('Trial ended');
    expect(s.detail).toMatch(/still here/i);
    expect(s.detail).toMatch(/paused/i);
  });

  it('never threatens deletion anywhere', () => {
    for (const state of [trialChipState(active(1), 'none'), trialChipState(LAPSED, 'none')]) {
      expect(state.detail).not.toMatch(/will be (?:deleted|removed|lost)/i);
      expect(state.detail).not.toMatch(/lose your (?:data|recordings)/i);
    }
  });

  it('points somewhere a decision can actually be made', () => {
    expect(trialChipState(active(3), 'none').href).toBe('/pricing');
    expect(trialChipState(LAPSED, 'none').href).toBe('/pricing');
  });
});

describe('contract', () => {
  it('is pure — equal input, equal output', () => {
    expect(trialChipState(active(4), 'none')).toEqual(trialChipState(active(4), 'none'));
  });

  it('returns empty strings, not undefined, when hidden', () => {
    // So a careless consumer rendering `state.label` cannot print "undefined".
    const hidden = trialChipState(NEVER, 'none');
    expect(hidden.label).toBe('');
    expect(hidden.detail).toBe('');
    expect(hidden.href).toBe('');
  });
});
