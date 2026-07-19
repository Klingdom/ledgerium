/**
 * Referrer classification shared by SeoPageView (leaf pages) and HubPageView
 * (hub/index pages) — see SEO_AEO_EXPANSION_001 §2.2 Batch 2.
 *
 * Extracted from SeoPageView (PART 2 of the SEO attribution unblock) so the
 * AI-referrer domain list and classification logic have exactly one source of
 * truth. A second copy of a 10-domain referrer allowlist is exactly the kind
 * of duplication that silently drifts — one file gets a new AI search engine
 * added, the other doesn't, and `referrerClass` quietly disagrees between
 * `seo_page_viewed` and `seo_hub_viewed` for the same visit.
 *
 * Pure module — no React import, safe to unit-test directly in this
 * workspace's `environment: 'node'` vitest config (no jsdom).
 */

export const AI_REFERRERS = [
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

/**
 * Classifies the current page load's referrer into the taxonomy shared by
 * `seo_page_viewed.referrerClass` and `seo_hub_viewed.referrerClass`.
 *
 * Reads `document.referrer` — safe to call during SSR (returns `'direct'`
 * when `document` is undefined) and never throws on a malformed referrer URL
 * (returns `'other'`).
 */
export function classifyReferrer(): 'organic' | 'ai' | 'direct' | 'other' {
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
