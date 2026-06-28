import type { MetadataRoute } from 'next';

import { SITE_CONFIG } from '@/lib/config';
import { generateSeoSitemapEntries } from '@/lib/seo/sitemap';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = SITE_CONFIG.url;

  const staticEntries: MetadataRoute.Sitemap = [
    // Core pages
    { url: `${baseUrl}/`, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${baseUrl}/product`, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${baseUrl}/pricing`, changeFrequency: 'monthly', priority: 0.9 },

    // Use cases
    { url: `${baseUrl}/use-cases/operations`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/use-cases/compliance`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/use-cases/ai-implementation`, changeFrequency: 'monthly', priority: 0.8 },

    // Compare
    { url: `${baseUrl}/compare/scribe`, changeFrequency: 'monthly', priority: 0.8 },

    // Resources
    { url: `${baseUrl}/docs`, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${baseUrl}/blog`, changeFrequency: 'weekly', priority: 0.7 },
    {
      url: `${baseUrl}/blog/why-your-sops-are-already-outdated`,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/blog/what-is-process-intelligence`,
      lastModified: '2026-06-28',
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/blog/screenshot-tools-vs-structured-capture`,
      lastModified: '2026-06-26',
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/blog/capture-before-you-automate`,
      lastModified: '2026-06-24',
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    { url: `${baseUrl}/support`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/about`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/security`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/install`, changeFrequency: 'monthly', priority: 0.7 },

    // Legal
    { url: `${baseUrl}/privacy`, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${baseUrl}/terms`, changeFrequency: 'monthly', priority: 0.3 },
  ];

  // Merge engine-generated SEO pages (published-only). Static entries win on
  // URL collision; never replace the static set.
  const seoEntries = generateSeoSitemapEntries();
  const seen = new Set(staticEntries.map((e) => e.url));
  const merged = [...staticEntries];
  for (const entry of seoEntries) {
    if (!seen.has(entry.url)) {
      seen.add(entry.url);
      merged.push(entry);
    }
  }
  return merged;
}
