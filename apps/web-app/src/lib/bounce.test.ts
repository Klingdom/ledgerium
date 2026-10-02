/**
 * Tests for bounce detection — row #242.
 *
 * The predicate was already tested, nine times, against a copy of itself in
 * `DashboardV2Shell.test.tsx`. Every one of those passed while the real
 * emitter was registered on `beforeunload` and produced nothing on mobile.
 * The predicate was never the problem.
 *
 * So the case that matters here is the one about the trigger.
 */

import { describe, it, expect } from 'vitest';
import { BOUNCE_TRIGGER, shouldEmitBounce, bounceElapsedMs } from './bounce';

describe('BOUNCE_TRIGGER', () => {
  it('is pagehide', () => {
    // Pinned with its reasoning, because this is the field that was wrong and
    // the field no amount of predicate testing could see.
    expect(BOUNCE_TRIGGER).toBe('pagehide');
  });

  it('is not beforeunload, which mobile browsers routinely never fire', () => {
    // The defect, stated as an assertion. iOS Safari and Chrome on Android
    // discard pages without firing beforeunload, so the bounce was never
    // produced for those users — and they are disproportionately the ones who
    // bounced, which made the loss flattering rather than merely lossy.
    expect(BOUNCE_TRIGGER).not.toBe('beforeunload');
  });

  it('is not visibilitychange, which fires on a mere tab switch', () => {
    // Row #241 correctly used visibilitychange for *delivery*. Reaching for it
    // here too would have been the easy over-correction: glancing at another
    // tab is not leaving, and counting it would have swapped an undercount for
    // an overcount.
    expect(BOUNCE_TRIGGER).not.toBe('visibilitychange');
  });
});

describe('shouldEmitBounce', () => {
  it('is a bounce when the view fired and nothing was clicked', () => {
    expect(shouldEmitBounce({ viewFired: true, clickCount: 0 })).toBe(true);
  });

  it('is not a bounce once the user has clicked', () => {
    expect(shouldEmitBounce({ viewFired: true, clickCount: 1 })).toBe(false);
    expect(shouldEmitBounce({ viewFired: true, clickCount: 12 })).toBe(false);
  });

  it('is not a bounce if the view never fired', () => {
    // A page that never finished presenting itself is not a visit the user
    // declined to engage with.
    expect(shouldEmitBounce({ viewFired: false, clickCount: 0 })).toBe(false);
    expect(shouldEmitBounce({ viewFired: false, clickCount: 5 })).toBe(false);
  });
});

describe('bounceElapsedMs', () => {
  it('measures the visit', () => {
    expect(bounceElapsedMs(1_000, 4_500)).toBe(3_500);
  });

  it('rounds to whole milliseconds', () => {
    expect(bounceElapsedMs(1_000, 1_002.6)).toBe(3);
  });

  it('reports 0 when the view timestamp was never set', () => {
    // Zero rather than a computed-from-nothing figure: an unmeasurable visit
    // should read as unmeasured, not as instantaneous.
    expect(bounceElapsedMs(0, 5_000)).toBe(0);
    expect(bounceElapsedMs(-1, 5_000)).toBe(0);
  });

  it('never returns a negative duration', () => {
    expect(bounceElapsedMs(5_000, 1_000)).toBe(0);
  });
});

import { shouldEmitDashboardView } from './bounce';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('shouldEmitDashboardView (row #250)', () => {
  it('does not emit on the error path; emits once on success; not twice', () => {
    expect(shouldEmitDashboardView({ isError: true, alreadyFired: false })).toBe(false);
    expect(shouldEmitDashboardView({ isError: false, alreadyFired: false })).toBe(true);
    expect(shouldEmitDashboardView({ isError: false, alreadyFired: true })).toBe(false);
  });

  it('the shell gates its dashboard_v2_viewed emission on this predicate (wiring lock)', () => {
    const src = readFileSync(resolve(__dirname, '../components/dashboard-v2/DashboardV2Shell.tsx'), 'utf8');
    expect(src).toMatch(/shouldEmitDashboardView\(\{\s*isError,/);
  });
});
