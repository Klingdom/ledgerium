import type { Metadata } from 'next';
import type { PageType, SeoPage } from '@/content/types';
import { pageUrl } from './url';

/** Default social-share image (existing product screenshot). Resolved against metadataBase. */
const DEFAULT_OG_IMAGE = '/img/demo/dashboard.png';

/** OpenGraph object type per page type. Only types that emit Article schema use 'article'. */
const OG_TYPE: Record<PageType, 'article' | 'website'> = {
  workflow: 'article',
  sopTemplate: 'article',
  aiOpportunity: 'article',
  problem: 'article',
  compare: 'article',
  alternatives: 'article',
  competitors: 'article',
  software: 'website',
  department: 'website',
  industry: 'website',
  persona: 'website',
  libraryIndex: 'website',
};

/**
 * Deterministic Next.js Metadata for an SEO page. Same content object → identical
 * output on every build (no Date/random). Unpublished pages are marked noindex.
 */
export function generateSeoMetadata(page: SeoPage): Metadata {
  const url = pageUrl(page);
  const image = { url: DEFAULT_OG_IMAGE, width: 1200, height: 630, alt: page.h1 };
  return {
    title: page.metaTitle,
    description: page.metaDescription,
    keywords: [page.primaryKeyword, ...page.secondaryKeywords],
    alternates: { canonical: url },
    robots: page.published
      ? { index: true, follow: true }
      : { index: false, follow: true },
    openGraph: {
      type: OG_TYPE[page.type],
      title: page.metaTitle,
      description: page.metaDescription,
      url,
      siteName: 'Ledgerium AI',
      images: [image],
    },
    twitter: {
      card: 'summary_large_image',
      title: page.metaTitle,
      description: page.metaDescription,
      images: [DEFAULT_OG_IMAGE],
    },
  };
}
