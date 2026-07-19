'use client';

import { useEffect } from 'react';
import { track } from '@/lib/analytics';
import type { PageType } from '@/content/types';
import { classifyReferrer } from './referrerClassification';

const SCROLL_MILESTONES: ReadonlyArray<25 | 50 | 75 | 90> = [25, 50, 75, 90];

/**
 * Fires seo_page_viewed once on mount (with AI/organic referrer classification)
 * and seo_scroll_depth once per 25/50/75/90 milestone as the reader scrolls.
 */
export function SeoPageView({ pageType, slug }: { pageType: PageType; slug: string }) {
  useEffect(() => {
    try {
      track({ event: 'seo_page_viewed', pageType, slug, referrerClass: classifyReferrer() });
    } catch {
      // analytics must never break the page
    }

    if (typeof window === 'undefined') return;
    const fired = new Set<number>();
    let ticking = false;

    const measure = () => {
      ticking = false;
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - window.innerHeight;
      if (scrollable <= 0) return;
      const pct = (window.scrollY / scrollable) * 100;
      for (const m of SCROLL_MILESTONES) {
        if (pct >= m && !fired.has(m)) {
          fired.add(m);
          try {
            track({ event: 'seo_scroll_depth', pageType, slug, depthPct: m });
          } catch {
            // never break the page
          }
        }
      }
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(measure);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    measure(); // catch short pages already past a milestone on load
    return () => window.removeEventListener('scroll', onScroll);
  }, [pageType, slug]);

  return null;
}
