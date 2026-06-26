import { SITE_CONFIG } from '@/lib/config';
import { pagePath } from '@/content/registry';
import type { SeoPage } from '@/content/types';

/** Absolute canonical URL for a page, derived from type+slug (never authored). */
export function pageUrl(page: Pick<SeoPage, 'type' | 'slug'>): string {
  return `${SITE_CONFIG.url}${pagePath(page)}`;
}
