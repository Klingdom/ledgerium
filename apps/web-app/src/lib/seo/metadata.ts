import type { Metadata } from 'next';
import type { SeoPage } from '@/content/types';
import { pageUrl } from './url';

/**
 * Deterministic Next.js Metadata for an SEO page. Same content object → identical
 * output on every build (no Date/random). Unpublished pages are marked noindex.
 */
export function generateSeoMetadata(page: SeoPage): Metadata {
  const url = pageUrl(page);
  return {
    title: page.metaTitle,
    description: page.metaDescription,
    keywords: [page.primaryKeyword, ...page.secondaryKeywords],
    alternates: { canonical: url },
    robots: page.published
      ? { index: true, follow: true }
      : { index: false, follow: true },
    openGraph: {
      type: 'article',
      title: page.metaTitle,
      description: page.metaDescription,
      url,
      siteName: 'Ledgerium AI',
    },
    twitter: {
      card: 'summary_large_image',
      title: page.metaTitle,
      description: page.metaDescription,
    },
  };
}
