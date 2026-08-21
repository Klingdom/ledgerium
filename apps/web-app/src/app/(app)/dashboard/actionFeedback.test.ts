/**
 * Regression: dashboard actions must not fail silently.
 *
 * Five user-initiated actions swallowed failures — their own comments read
 * "Silently fail", "Endpoint may not exist yet", "non-fatal". The user
 * clicked, the spinner stopped, nothing happened.
 */

import { describe, it, expect } from 'vitest';
import { dashboardActionError, type DashboardAction } from './actionFeedback';

const ALL_ACTIONS: DashboardAction[] = [
  'run_analysis',
  'create_tag',
  'toggle_tag',
  'load_sample',
  'load_variants_demo',
];

describe('dashboardActionError', () => {
  it('never returns an empty message for any action or any junk input', () => {
    // Silence is the bug. Every path must produce something the user can read.
    const junk = [undefined, null, '', '   ', 0, false, {}, [], NaN];
    for (const action of ALL_ACTIONS) {
      for (const bad of junk) {
        const msg = dashboardActionError(action, bad);
        expect(
          msg.trim().length,
          `empty message for ${action} with ${JSON.stringify(bad)}`,
        ).toBeGreaterThan(0);
      }
    }
  });

  it("surfaces the API's own message when it is usable", () => {
    expect(dashboardActionError('create_tag', 'A tag with that name already exists')).toBe(
      'A tag with that name already exists',
    );
  });

  it('ignores whitespace-only API messages rather than showing a blank alert', () => {
    expect(dashboardActionError('create_tag', '   ')).toBe(
      dashboardActionError('create_tag'),
    );
  });

  it('tells the user the tag change was not saved', () => {
    // The user watched a checkbox move. They must know it did not stick,
    // otherwise they believe the tag is applied when it is not.
    expect(dashboardActionError('toggle_tag')).toMatch(/not saved/i);
  });

  it('reassures that a failed analysis did not alter workflows', () => {
    // The scarier reading of a failed analysis is that it damaged something.
    expect(dashboardActionError('run_analysis')).toMatch(/unchanged/i);
  });

  it('gives each action its own message rather than one generic string', () => {
    const messages = ALL_ACTIONS.map((a) => dashboardActionError(a));
    expect(new Set(messages).size).toBe(ALL_ACTIONS.length);
  });

  it('never falls back to a content-free message', () => {
    for (const action of ALL_ACTIONS) {
      expect(dashboardActionError(action)).not.toMatch(/^(something went wrong|error)\.?$/i);
    }
  });
});
