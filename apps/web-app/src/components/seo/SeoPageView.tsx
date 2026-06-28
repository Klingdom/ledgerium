'use client';

import { useEffect } from 'react';
import { track } from '@/lib/analytics';
import type { PageType } from '@/content/types';

const AI_REFERRERS = [
  'chatgpt.com',
  'perplexity.ai',
  'claude.ai',
  'copilot.microsoft.com',
  'gemini.google.com',
  'grok.com',
  'you.com',
  'phind.com',
  'meta.ai',
  'poe.com',
];

function classifyReferrer(): 'organic' | 'ai' | 'direct' | 'other' {
  if (typeof document === 'undefined') return 'direct';
  const ref = document.referrer;
  if (!ref) return 'direct';
  let host = '';
  try {
    host = new URL(ref).hostname.replace(/^www\./, '');
  } catch {
    return 'other';
  }
  if (AI_REFERRERS.some((d) => host === d || host.endsWith(`.${d}`))) return 'ai';
  if (/(^|\.)(google|bing|duckduckgo|yahoo|ecosia)\.[a-z.]+$/.test(host)) return 'organic';
  return 'other';
}

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
