import type { MetadataRoute } from 'next';
import { SITE_CONFIG } from '@/lib/config';
import { getPublishedPages, getPagesByType, ROUTE_PREFIX } from '@/content/registry';
import type { PageType } from '@/content/types';

/** Page types that have a public hub/index page. */
const HUB_TYPES: readonly PageType[] = [
  'workflow',
  'software',
  'persona',
  'problem',
  'sopTemplate',
  'aiOpportunity',
  'department',
  'industry',
  'alternatives',
  'competitors',
];

/** Newest `updatedAt` among published leaves of a type, for the hub's lastModified. */
function latestUpdatedFor(type: PageType): string | undefined {
  const dates = getPagesByType(type)
    .filter((p) => p.published)
    .map((p) => p.updatedAt)
    .sort();
  return dates.length > 0 ? dates[dates.length - 1] : undefined;
}

/**
 * Sitemap entries for engine-generated pages. ONLY published, non-reserved pages
 * are included (gated in getPublishedPages). These are MERGED with the existing
 * static entries in app/sitemap.ts — never replace them.
 */
export function generateSeoSitemapEntries(): MetadataRoute.Sitemap {
  const base = SITE_CONFIG.url;

  const hubs: MetadataRoute.Sitemap = HUB_TYPES.map((type) => {
    const lastModified = latestUpdatedFor(type);
    return {
      url: `${base}${ROUTE_PREFIX[type]}`,
      ...(lastModified ? { lastModified } : {}),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    };
  });

  const leaves: MetadataRoute.Sitemap = getPublishedPages().map((page) => ({
    url: `${base}${ROUTE_PREFIX[page.type]}/${page.slug}`,
    lastModified: page.updatedAt,
    changeFrequency: 'monthly',
    priority: page.type === 'compare' ? 0.8 : 0.7,
  }));

  return [...hubs, ...leaves];
}
