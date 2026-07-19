'use client';

import { useEffect } from 'react';
import { track } from '@/lib/analytics';
import { classifyReferrer } from './referrerClassification';

/**
 * Fires `seo_hub_viewed` once on mount for the 11 hub/index pages (alternatives,
 * industries, ai-opportunities, departments, software, sop-templates,
 * workflow-library, competitors, use-cases/personas, use-cases/problems, and
 * the hand-built /comparisons page) — see SEO_AEO_EXPANSION_001 §2.2 Batch 2,
 * PART 2 of 2, and the `seo_hub_viewed` taxonomy JSDoc in `lib/analytics.ts`
 * for the "why a distinct event" rationale.
 *
 * Deliberately no scroll-depth tracking here (unlike SeoPageView) — hubs are
 * short link grids, not long-form content; a scroll-depth signal on a grid of
 * cards doesn't measure engagement the way it does on a leaf page's prose.
 */
export function HubPageView({ hubType, pageCount }: { hubType: string; pageCount: number }) {
  useEffect(() => {
    try {
      track({ event: 'seo_hub_viewed', hubType, pageCount, referrerClass: classifyReferrer() });
    } catch {
      // analytics must never break the page
    }
    // `hubType` alone is the identity of this view. `pageCount` is deliberately
    // EXCLUDED: it is a payload value, not identity, and including it would
    // refire a duplicate `seo_hub_viewed` if the count ever changed without a
    // remount — inflating the very metric this event exists to measure. The
    // event's contract is "cards rendered at view time", so capturing the
    // first-render value is the correct semantic.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hubType]);

  return null;
}
