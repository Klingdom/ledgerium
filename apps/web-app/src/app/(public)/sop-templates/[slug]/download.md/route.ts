import { getBySlug, getPagesByType, isReservedSlug } from '@/content/registry';
import { renderSopExport } from '@/lib/sop-export';
import type { SopTemplatePage } from '@/content/types';

/**
 * GET /sop-templates/[slug]/download.md — the fillable Markdown download for
 * a published SOP template page.
 *
 * Source of truth: docs/meta/SEO_AEO_CONTENT_STRATEGY_001/sop_export_contract.md §3.
 *
 * Deliberately a `.md`-suffixed route segment (precedent: app/llms.txt/route.ts,
 * a dotted directory name), not `/download` and not `/sop-templates/[slug].md`
 * (the latter would collide with the existing `[slug]` dynamic segment). Lives
 * under `/sop-templates/**`, NOT `/api/` — robots.ts disallows `/api/`, and the
 * whole point of this route is that it is reachable, linkable, and fetchable
 * by assistants (kept out of the sitemap; see `X-Robots-Tag` below).
 *
 * `dynamic = 'force-static'` + `dynamicParams = false` prerenders exactly the
 * published SOP template slugs at build time; every other slug 404s with no
 * runtime execution at all.
 *
 * Forward risk: if `next.config.js` ever adds `output: 'export'`, custom
 * response headers (including `Content-Disposition` below) are dropped by
 * static hosting and this file may render inline instead of downloading.
 * `next.config.js` has no `output` key today. Mitigation already in place at
 * the call site: the download anchor should carry both `href` and
 * `download="<filename>"` (same-origin, header-independent) — see the
 * SopExportPanel client component that consumes this route.
 */
export const dynamic = 'force-static';
export const dynamicParams = false;

function publishedSopTemplateSlugs(): { slug: string }[] {
  // Byte-identical predicate to the page route
  // (app/(public)/sop-templates/[slug]/page.tsx), plus the same
  // !isReservedSlug guard getPublishedPages() applies — a no-op today
  // (RESERVED_SLUGS has no /sop-templates key) and a guard tomorrow.
  return getPagesByType('sopTemplate')
    .filter((p) => p.published && !isReservedSlug(p.type, p.slug))
    .map((p) => ({ slug: p.slug }));
}

export function generateStaticParams(): { slug: string }[] {
  return publishedSopTemplateSlugs();
}

export function GET(_req: Request, { params }: { params: { slug: string } }): Response {
  const page = getBySlug('sopTemplate', params.slug);

  // Defensive in-handler 404, even though dynamicParams = false should make
  // this unreachable — mirrors page.tsx's own not-found guard.
  if (!page || page.type !== 'sopTemplate' || !page.published) {
    return new Response(null, { status: 404 });
  }

  const doc = renderSopExport(page as SopTemplatePage);

  return new Response(doc.body, {
    status: 200,
    headers: {
      'Content-Type': doc.contentType,
      'Content-Disposition': `attachment; filename="${doc.filename}"`,
      // The .md URL is a near-duplicate of its own HTML page and must not
      // compete with it in search results — kept crawlable/linkable (not
      // under /api/) but not indexable.
      'X-Robots-Tag': 'noindex',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
