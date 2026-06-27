import type { MetadataRoute } from 'next';
import { SITE_CONFIG } from '@/lib/config';
import { getPublishedPages, ROUTE_PREFIX } from '@/content/registry';

/**
 * Sitemap entries for engine-generated pages. ONLY published, non-reserved pages
 * are included (gated in getPublishedPages). These are MERGED with the existing
 * static entries in app/sitemap.ts — never replace them.
 */
export function generateSeoSitemapEntries(): MetadataRoute.Sitemap {
  const base = SITE_CONFIG.url;

  // Hub/index pages for the live engine types.
  const hubPrefixes = [
    ROUTE_PREFIX.workflow,
    ROUTE_PREFIX.software,
    ROUTE_PREFIX.persona,
    ROUTE_PREFIX.problem,
    ROUTE_PREFIX.sopTemplate,
    ROUTE_PREFIX.aiOpportunity,
    ROUTE_PREFIX.department,
    ROUTE_PREFIX.industry,
  ];
  const hubs: MetadataRoute.Sitemap = hubPrefixes.map((path) => ({
    url: `${base}${path}`,
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  const leaves: MetadataRoute.Sitemap = getPublishedPages().map((page) => ({
    url: `${base}${ROUTE_PREFIX[page.type]}/${page.slug}`,
    lastModified: page.updatedAt,
    changeFrequency: 'monthly',
    priority: page.type === 'compare' ? 0.8 : 0.7,
  }));

  return [...hubs, ...leaves];
}
