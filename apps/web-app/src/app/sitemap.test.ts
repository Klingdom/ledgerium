/**
 * Regression coverage for the merged public sitemap.
 *
 * SEO_AEO_EFFECTIVENESS_REVIEW_001 §5 P1 (frontend_analysis.md P1-4): `/comparisons`
 * and `/methodology` are live, nav-linked, canonical'd pages that were absent from
 * `sitemap.xml` — inverse drift from the `/answers` 404 (a real route with no
 * sitemap entry, rather than a sitemap entry with no route). Locks both directions:
 * every hand-built static entry stays present, and the two previously-missing
 * routes are now included, without regressing the registry-driven leaf/hub count.
 */

import { describe, it, expect } from 'vitest';
import { SITE_CONFIG } from '@/lib/config';
import { getPublishedPages } from '@/content/registry';
import sitemap from './sitemap';

describe('public sitemap()', () => {
  it('includes /comparisons and /methodology (previously missing — P1-4)', () => {
    const urls = sitemap().map((e) => e.url);
    expect(urls).toContain(`${SITE_CONFIG.url}/comparisons`);
    expect(urls).toContain(`${SITE_CONFIG.url}/methodology`);
  });

  it('preserves every pre-existing hand-built static entry', () => {
    const urls = new Set(sitemap().map((e) => e.url));
    const expected = [
      '/', '/product', '/pricing',
      '/use-cases/operations', '/use-cases/compliance', '/use-cases/ai-implementation',
      '/compare/scribe',
      '/docs', '/blog',
      '/blog/why-your-sops-are-already-outdated',
      '/blog/what-is-process-intelligence',
      '/blog/screenshot-tools-vs-structured-capture',
      '/blog/capture-before-you-automate',
      '/support', '/about', '/security', '/install',
      '/privacy', '/terms',
    ];
    for (const path of expected) {
      expect(urls.has(`${SITE_CONFIG.url}${path}`), `missing ${path}`).toBe(true);
    }
  });

  it('has no duplicate URLs (static entries win on collision, per source doc comment)', () => {
    const urls = sitemap().map((e) => e.url);
    expect(new Set(urls).size).toBe(urls.length);
  });

  it('total URL count is at least static-entry-count + hub-count + published-leaf-count', () => {
    // Lower bound, not exact equality: exact equality would break every time a
    // content page is authored, which is expected and desired churn. This
    // guards against the count going DOWN, which is the failure mode both
    // sitemap defects in the review produced.
    const minExpected = 21 /* static incl. comparisons + methodology */ + getPublishedPages().length;
    expect(sitemap().length).toBeGreaterThanOrEqual(minExpected);
  });

  it('is deterministic', () => {
    const a = JSON.stringify(sitemap());
    const b = JSON.stringify(sitemap());
    expect(a).toBe(b);
  });
});
