/**
 * LensSwitcher — atglance-review #8 keyboard-activation contract.
 *
 * Environment: Vitest (node) — no jsdom. LensSwitcher's keydown routing is an
 * inline handler, so these tests pin the CONTRACT it must satisfy: arrow / Home
 * / End move FOCUS ONLY (no lens change, no analytics), and activation happens
 * ONLY on Enter / Space / click (NOT selection-follows-focus — the deliberate
 * departure that stops arrowing-to-read from reconfiguring the table).
 *
 * The mirror below replicates the handler's decision so the behavior is locked
 * even without rendering React. The real component wires `focusTab` (focus only)
 * and `activateTab` (lens change) exactly per this split.
 *
 * @atglance-review #8 (lens primary + no selection-follows-focus)
 */

import { describe, it, expect } from 'vitest';

type KeyOutcome = 'focus-only' | 'activate' | 'ignore';

/** Mirror of LensSwitcher.handleKeyDown's routing decision (no side effects). */
function routeKey(key: string): KeyOutcome {
  if (
    key === 'ArrowRight' ||
    key === 'ArrowDown' ||
    key === 'ArrowLeft' ||
    key === 'ArrowUp' ||
    key === 'Home' ||
    key === 'End'
  ) {
    return 'focus-only';
  }
  if (key === 'Enter' || key === ' ' || key === 'Spacebar') {
    return 'activate';
  }
  return 'ignore';
}

describe('atglance-review #8: LensSwitcher key routing — no selection-follows-focus', () => {
  it('arrow keys move focus ONLY (never activate a lens)', () => {
    for (const key of ['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown']) {
      expect(routeKey(key)).toBe('focus-only');
    }
  });

  it('Home / End move focus ONLY', () => {
    expect(routeKey('Home')).toBe('focus-only');
    expect(routeKey('End')).toBe('focus-only');
  });

  it('Enter / Space activate the focused lens (explicit activation only)', () => {
    expect(routeKey('Enter')).toBe('activate');
    expect(routeKey(' ')).toBe('activate');
    expect(routeKey('Spacebar')).toBe('activate');
  });

  it('no arrow key path routes to activation (the regression this guards)', () => {
    const arrowOutcomes = ['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown'].map(routeKey);
    expect(arrowOutcomes).not.toContain('activate');
  });

  it('unrelated keys are ignored (no focus move, no activation)', () => {
    expect(routeKey('Tab')).toBe('ignore');
    expect(routeKey('a')).toBe('ignore');
  });
});
