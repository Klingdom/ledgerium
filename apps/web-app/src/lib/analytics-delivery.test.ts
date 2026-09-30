/**
 * Tests for analytics delivery — row #241.
 *
 * The defect is lost events. The risk in fixing it is duplicated events, and
 * the two are symmetric: both quietly bias every number computed from this
 * data, and neither announces itself. Both directions are covered.
 */

import { describe, it, expect } from 'vitest';
import {
  drain,
  shouldScheduleFlush,
  shouldDeliverOnVisibility,
  FLUSH_THRESHOLD,
} from './analytics-delivery';

describe('drain', () => {
  it('returns every event and leaves the buffer empty', () => {
    const buffer = [{ event: 'a' }, { event: 'b' }];
    expect(drain(buffer)).toEqual([{ event: 'a' }, { event: 'b' }]);
    expect(buffer).toEqual([]);
  });

  it('a second drain sends nothing — the duplicate-delivery guard', () => {
    // This is the case that matters. `visibilitychange` fires on every tab
    // switch, app switch and screen lock. The old unload handler read the
    // buffer without clearing it, so adding visibility delivery without this
    // would have turned a user who alt-tabs five times into six copies of the
    // same events.
    const buffer = [{ event: 'a' }];
    expect(drain(buffer)).toHaveLength(1);
    expect(drain(buffer)).toHaveLength(0);
  });

  it('empties in place rather than replacing the array', () => {
    // The buffer hangs off `window` and other code holds a reference to it —
    // `analytics.test.ts` and the funnel e2e both read it directly. Replacing
    // the array would leave those references pointing at an orphan.
    const buffer = [{ event: 'a' }];
    const alias = buffer;
    drain(buffer);
    expect(alias).toBe(buffer);
    expect(alias).toEqual([]);
  });

  it('is safe on an empty buffer', () => {
    const buffer: unknown[] = [];
    expect(drain(buffer)).toEqual([]);
  });
});

describe('shouldScheduleFlush', () => {
  it('waits until the threshold', () => {
    expect(shouldScheduleFlush(FLUSH_THRESHOLD - 1)).toBe(false);
    expect(shouldScheduleFlush(FLUSH_THRESHOLD)).toBe(true);
    expect(shouldScheduleFlush(FLUSH_THRESHOLD + 1)).toBe(true);
  });

  it('pins the threshold at 10', () => {
    // A product-visible number, not an implementation detail: below it, a
    // session's events depend entirely on the page-lifecycle path working.
    expect(FLUSH_THRESHOLD).toBe(10);
  });
});

describe('shouldDeliverOnVisibility', () => {
  it('delivers when the page becomes hidden', () => {
    expect(shouldDeliverOnVisibility('hidden')).toBe(true);
  });

  it('does not deliver when the page becomes visible again', () => {
    // visibilitychange fires in both directions. Delivering on the way back in
    // would send an empty payload at best, and on a page restored from bfcache
    // — where the buffer survives — a duplicate at worst.
    expect(shouldDeliverOnVisibility('visible')).toBe(false);
    expect(shouldDeliverOnVisibility('prerender')).toBe(false);
  });
});

describe('a session that hides, returns, and hides again', () => {
  it('delivers each event exactly once', () => {
    // The realistic mobile pattern: glance at the dashboard, switch apps, come
    // back, do something, switch away. Under-delivering loses the first half;
    // over-delivering counts the first half twice. Neither is visible in a
    // dashboard without going looking.
    const buffer: Array<{ event: string }> = [];
    const delivered: Array<{ event: string }> = [];

    function hide() {
      if (shouldDeliverOnVisibility('hidden')) delivered.push(...drain(buffer));
    }

    buffer.push({ event: 'dashboard_v2_viewed' }, { event: 'upgrade_prompt_viewed' });
    hide();

    // Returning must not re-deliver.
    if (shouldDeliverOnVisibility('visible')) delivered.push(...drain(buffer));

    buffer.push({ event: 'upgrade_clicked' });
    hide();

    expect(delivered.map((e) => e.event)).toEqual([
      'dashboard_v2_viewed',
      'upgrade_prompt_viewed',
      'upgrade_clicked',
    ]);
  });
});
