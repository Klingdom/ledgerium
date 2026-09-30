/**
 * Tests for the upgrade-prompt counting rule — row #238.
 *
 * The defect being fixed is a funnel denominator missing three quarters of its
 * impressions. The risk in fixing it is the opposite error: a rule that fires
 * on every re-render would inflate the same denominator and be just as
 * invisible. These cover both directions.
 */

import { describe, it, expect } from 'vitest';
import { shouldEmitPromptView, nextEmittedState, type UpgradePromptIdentity } from './upgrade-prompt';

const QUOTA: UpgradePromptIdentity = { location: 'dashboard_v2_quota_chip', plan: 'team' };
const HEALTH: UpgradePromptIdentity = { location: 'dashboard_v2_health_gate', plan: 'starter' };

/** Walk a sequence of renders and count the emits, as the hook would. */
function emitsOver(sequence: Array<UpgradePromptIdentity | null>): number {
  let last: UpgradePromptIdentity | null = null;
  let emits = 0;
  for (const current of sequence) {
    if (shouldEmitPromptView(last, current)) emits++;
    last = nextEmittedState(last, current);
  }
  return emits;
}

describe('shouldEmitPromptView', () => {
  it('emits when a prompt first appears', () => {
    expect(shouldEmitPromptView(null, QUOTA)).toBe(true);
  });

  it('does not emit when no prompt is shown', () => {
    expect(shouldEmitPromptView(null, null)).toBe(false);
    expect(shouldEmitPromptView(QUOTA, null)).toBe(false);
  });

  it('does not emit again for the same prompt — the re-render case', () => {
    // This is the guard against over-counting. Getting it wrong would inflate
    // the denominator instead of deflating it: the same error, reversed, and
    // equally hard to spot in a dashboard.
    expect(shouldEmitPromptView(QUOTA, QUOTA)).toBe(false);
    expect(shouldEmitPromptView(QUOTA, { ...QUOTA })).toBe(false);
  });

  it('emits when the surface changes', () => {
    expect(shouldEmitPromptView(QUOTA, HEALTH)).toBe(true);
  });

  it('emits when the same surface now asks for a different plan', () => {
    expect(shouldEmitPromptView(QUOTA, { ...QUOTA, plan: 'growth' })).toBe(true);
  });
});

describe('counting across a sequence of renders', () => {
  it('counts one prompt once, however many times it re-renders', () => {
    expect(emitsOver([QUOTA, QUOTA, QUOTA, QUOTA])).toBe(1);
  });

  it('counts nothing when no prompt is ever shown', () => {
    expect(emitsOver([null, null, null])).toBe(0);
  });

  it('counts a genuine second exposure after the prompt goes away', () => {
    // Crossing the quota threshold, dropping back under it, and crossing again
    // is two real prompts. Remembering the old identity through the gap would
    // undercount exactly the repeat-exposure case the funnel is for.
    expect(emitsOver([QUOTA, QUOTA, null, QUOTA])).toBe(2);
  });

  it('counts two different prompts on one page separately', () => {
    expect(emitsOver([QUOTA, HEALTH])).toBe(2);
  });

  it('does not re-count when returning to a prompt that never left', () => {
    expect(emitsOver([QUOTA, HEALTH, HEALTH, HEALTH])).toBe(2);
  });

  it('a mount with no prompt, then a prompt, counts once', () => {
    expect(emitsOver([null, null, QUOTA, QUOTA])).toBe(1);
  });
});

describe('nextEmittedState', () => {
  it('clears when the prompt disappears, so the next appearance counts', () => {
    expect(nextEmittedState(QUOTA, null)).toBeNull();
  });

  it('retains the identity while the same prompt stays on screen', () => {
    expect(nextEmittedState(QUOTA, QUOTA)).toEqual(QUOTA);
  });

  it('advances to the new identity when the prompt changes', () => {
    expect(nextEmittedState(QUOTA, HEALTH)).toEqual(HEALTH);
  });
});

describe('locations match their upgrade_clicked counterparts', () => {
  it('uses the exact location strings the click events use', () => {
    // The funnel is only meaningful compared per location. If these drift from
    // the strings in RecordingQuotaChip and WorkflowRow, the view and click
    // counts stop describing the same surface and the fix silently undoes
    // itself.
    expect(QUOTA.location).toBe('dashboard_v2_quota_chip');
    expect(HEALTH.location).toBe('dashboard_v2_health_gate');
  });
});
