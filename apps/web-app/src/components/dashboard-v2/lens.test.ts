/**
 * lens — SSR-safe lens-persistence contract tests (DASHBOARD_PERSONAS_REVIEW_001 P0).
 *
 * Environment: Vitest (node) — no jsdom, no React rendering. The SSR-safe
 * `useLens` hook itself requires a React renderer and is exercised in the
 * flash-safety / E2E gate (same convention as `density.test.ts`). Here we lock
 * the pure persistence contract that makes the hook hydration-safe:
 *   - the stable default value rendered on the server + first client paint,
 *   - the namespaced localStorage key,
 *   - the defensive parse of stored values.
 *
 * The SSR-safety guarantee is structural: `useLens` initializes state to
 * DEFAULT_LENS and only reads localStorage in a post-mount effect, so the first
 * render is always DEFAULT_LENS regardless of any stored value — no hydration
 * mismatch. This test pins the constants that guarantee that contract.
 */

import { describe, it, expect } from 'vitest';
import { LENS_STORAGE_KEY } from './lens.js';
import { DEFAULT_LENS, parseLens } from '@/lib/dashboard-lenses/lenses.js';

describe('SSR-safe lens persistence contract', () => {
  it('DEFAULT_LENS is "library" — the stable first-paint value (no hydration mismatch)', () => {
    // useLens initializes to this on the server AND the first client paint; the
    // stored value is only read post-mount. The first render is deterministic.
    expect(DEFAULT_LENS).toBe('library');
  });

  it('storage key is namespaced under ledgerium.dashboard', () => {
    expect(LENS_STORAGE_KEY).toBe('ledgerium.dashboard.activeLens');
  });

  it('parseLens reconciles only valid stored values (defends against corruption)', () => {
    // After mount, the hook applies parseLens(stored); invalid/forward-incompatible
    // values are ignored and the default is kept — never a thrown render.
    expect(parseLens('library')).toBe('library');
    expect(parseLens('lss')).toBe('lss');
    expect(parseLens('garbage')).toBeNull();
    expect(parseLens(null)).toBeNull();
  });

  it('a corrupted stored value falls back to the stable default (no flash)', () => {
    // Simulate the post-mount reconciliation logic: stored ?? default.
    const stored = parseLens('not-a-lens');
    const reconciled = stored ?? DEFAULT_LENS;
    expect(reconciled).toBe('library');
  });
});
