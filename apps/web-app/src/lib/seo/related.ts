import type { SeoPage } from '@/content/types';
import { ALL_PAGES, ROUTE_PREFIX } from '@/content/registry';

export interface RelatedLink {
  readonly title: string;
  readonly path: string;
  readonly type: SeoPage['type'];
  readonly eyebrow: string;
  /** Plain-language reason this page is related, for the "why related" label. */
  readonly why: string;
}

/** Parse a `${type}:${slug}` related token. */
function parseToken(token: string): { type: string; slug: string } | null {
  const idx = token.indexOf(':');
  if (idx < 0) return null;
  return { type: token.slice(0, idx), slug: token.slice(idx + 1) };
}

function toLink(page: SeoPage, why: string): RelatedLink {
  return {
    title: page.h1,
    path: `${prefixFor(page.type)}/${page.slug}`,
    type: page.type,
    eyebrow: page.eyebrow,
    why,
  };
}

// Derive the route prefix from the single source of truth (registry) to avoid drift.
function prefixFor(type: SeoPage['type']): string {
  return ROUTE_PREFIX[type];
}

/**
 * Deterministic related-page resolver.
 *
 * Order:
 *   1. Explicit `related` tokens, in authored order (curated, highest signal).
 *   2. Tag-overlap scored pages, by overlap count desc, then slug asc (stable).
 * Self is always excluded. Returns at most `limit`. Pure: no Date/random.
 * Cycle-safe by construction — it returns immediate neighbors, never recurses.
 */
export function getRelatedPages(page: SeoPage, limit = 3, pool: readonly SeoPage[] = ALL_PAGES): RelatedLink[] {
  const out: RelatedLink[] = [];
  const seen = new Set<string>([`${page.type}:${page.slug}`]);

  // 1. Explicit curated links.
  for (const token of page.related) {
    if (out.length >= limit) break;
    const parsed = parseToken(token);
    if (!parsed) continue;
    const key = `${parsed.type}:${parsed.slug}`;
    if (seen.has(key)) continue;
    const target = pool.find((p) => p.type === parsed.type && p.slug === parsed.slug);
    if (!target || !target.published) continue;
    seen.add(key);
    out.push(toLink(target, 'Hand-picked next step for this topic'));
  }

  // 2. Tag-overlap fill, deterministic ordering.
  const pageTags = new Set(page.tags);
  const scored = pool
    .filter((p) => p.published && !seen.has(`${p.type}:${p.slug}`))
    .map((p) => ({ p, overlap: p.tags.filter((t) => pageTags.has(t)).length }))
    .filter((s) => s.overlap > 0)
    .sort((a, b) => (b.overlap - a.overlap) || a.p.slug.localeCompare(b.p.slug));

  for (const { p, overlap } of scored) {
    if (out.length >= limit) break;
    out.push(toLink(p, `Shares ${overlap} topic ${overlap === 1 ? 'tag' : 'tags'} with this page`));
    seen.add(`${p.type}:${p.slug}`);
  }

  return out;
}
