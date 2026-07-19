/**
 * HubPageView — fires `seo_hub_viewed` once on mount for the 11 hub/index
 * pages. SEO attribution unblock (SEO_AEO_EXPANSION_001 §2.2 Batch 2), PART 2
 * of 2.
 *
 * Environment: Vitest `node` — no jsdom, no React rendering (this workspace's
 * default; see apps/web-app/vitest.config.ts and the identical convention in
 * WorkflowRow.test.tsx / DashboardV2Shell.test.tsx). `useEffect` cannot be
 * exercised outside a real React commit phase in this environment, so this
 * suite mirrors the effect body in `runHubPageViewEffect` below — kept
 * deliberately byte-for-byte identical to the `useEffect` callback in
 * `HubPageView.tsx` (both wrap a single `track(...)` call in try/catch; both
 * derive `referrerClass` from `classifyReferrer()`). If the two drift, this
 * suite stops being meaningful — see the "test-mirror-divergence" pattern
 * already flagged for this codebase's mirror-style component tests.
 *
 * `classifyReferrer` itself is imported and tested for real (no mirror
 * needed) since it's a pure function with no React dependency — see
 * referrerClassification.test.ts for its own dedicated coverage.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/analytics.js', () => ({ track: vi.fn() }));

import { track } from '@/lib/analytics.js';
import { HubPageView } from './HubPageView.js';
import { classifyReferrer } from './referrerClassification.js';

const trackMock = vi.mocked(track);

// ── Mirror of HubPageView's useEffect body ────────────────────────────────────

function runHubPageViewEffect(
  hubType: string,
  pageCount: number,
  trackFn: typeof track,
  classifyReferrerFn: () => 'organic' | 'ai' | 'direct' | 'other',
): void {
  try {
    trackFn({ event: 'seo_hub_viewed', hubType, pageCount, referrerClass: classifyReferrerFn() });
  } catch {
    // analytics must never break the page
  }
}

beforeEach(() => {
  trackMock.mockReset();
});

describe('HubPageView: component surface', () => {
  it('is a function component (mount-only render, no children)', () => {
    expect(typeof HubPageView).toBe('function');
  });
});

describe('HubPageView: fires seo_hub_viewed once on mount', () => {
  it('calls track exactly once for a single mount', () => {
    runHubPageViewEffect('alternatives', 12, trackMock, () => 'organic');
    expect(trackMock).toHaveBeenCalledTimes(1);
  });
});

describe('HubPageView: correct payload', () => {
  it('sends event=seo_hub_viewed with the given hubType, pageCount, and referrerClass', () => {
    runHubPageViewEffect('software', 34, trackMock, () => 'ai');
    expect(trackMock).toHaveBeenCalledWith({
      event: 'seo_hub_viewed',
      hubType: 'software',
      pageCount: 34,
      referrerClass: 'ai',
    });
  });

  it('threads pageCount=0 through faithfully (an empty hub is not a bug)', () => {
    runHubPageViewEffect('persona', 0, trackMock, () => 'direct');
    expect(trackMock).toHaveBeenCalledWith(
      expect.objectContaining({ hubType: 'persona', pageCount: 0, referrerClass: 'direct' }),
    );
  });

  it('threads the hand-built /comparisons hubType through unchanged', () => {
    runHubPageViewEffect('comparisons', 1, trackMock, () => 'other');
    expect(trackMock).toHaveBeenCalledWith(
      expect.objectContaining({ hubType: 'comparisons', referrerClass: 'other' }),
    );
  });

  it.each(['organic', 'ai', 'direct', 'other'] as const)(
    'passes referrerClass=%s straight through from classifyReferrer()',
    (referrerClass) => {
      runHubPageViewEffect('industry', 5, trackMock, () => referrerClass);
      expect(trackMock).toHaveBeenCalledWith(expect.objectContaining({ referrerClass }));
    },
  );
});

describe('HubPageView: try/catch swallows a throwing track()', () => {
  it('does not propagate when track() throws', () => {
    const throwingTrack = vi.fn(() => {
      throw new Error('simulated analytics failure');
    }) as unknown as typeof track;

    expect(() => runHubPageViewEffect('workflow', 8, throwingTrack, () => 'organic')).not.toThrow();
  });

  it('does not propagate when classifyReferrer() itself throws', () => {
    const throwingClassify = () => {
      throw new Error('simulated referrer-classification failure');
    };

    expect(() => runHubPageViewEffect('workflow', 8, trackMock, throwingClassify)).not.toThrow();
  });
});

describe('HubPageView: classifyReferrer integration (real function, not mirrored)', () => {
  it('is the same classifyReferrer exported by the shared referrerClassification module', () => {
    // HubPageView.tsx imports classifyReferrer from referrerClassification.ts —
    // this is a smoke check that the module resolves and is callable.
    expect(typeof classifyReferrer).toBe('function');
  });
});
