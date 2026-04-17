import type { MetadataRoute } from 'next';

import { SITE_CONFIG } from '@/lib/config';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = SITE_CONFIG.url;

  return [
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
    { url: `${baseUrl}/support`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/about`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/security`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/install`, changeFrequency: 'monthly', priority: 0.7 },

    // Legal
    { url: `${baseUrl}/privacy`, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${baseUrl}/terms`, changeFrequency: 'monthly', priority: 0.3 },
  ];
}
