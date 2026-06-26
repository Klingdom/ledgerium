import Link from 'next/link';
import { SITE_CONFIG } from '@/lib/config';
import { ROUTE_PREFIX } from '@/content/registry';
import type { SeoPage } from '@/content/types';

/**
 * Index/hub page for one engine page type. Lists published pages and emits an
 * ItemList JSON-LD. Tranche 0 ships a clean grouped grid; faceted filtering is a
 * Tranche-1 follow-up once page counts justify it.
 */
export function HubIndex({
  eyebrow,
  title,
  intro,
  pages,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  pages: readonly SeoPage[];
}) {
  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: pages.map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${SITE_CONFIG.url}${ROUTE_PREFIX[p.type]}/${p.slug}`,
      name: p.h1,
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }} />
      <nav aria-label="Breadcrumb" className="mx-auto max-w-5xl px-4 sm:px-6 pt-8">
        <ol className="flex items-center gap-2 text-xs text-[var(--content-tertiary)]">
          <li><Link href="/" className="hover:text-brand-500">Home</Link></li>
          <li aria-hidden>/</li>
          <li className="text-[var(--content-secondary)]">{title}</li>
        </ol>
      </nav>
      <section className="mx-auto max-w-3xl px-4 sm:px-6 pt-8 pb-10">
        <span className="inline-block text-xs font-semibold text-brand-600 uppercase tracking-widest border border-brand-700/40 rounded-full px-4 py-1.5 mb-6 bg-brand-900/20">{eyebrow}</span>
        <h1 className="text-3xl sm:text-4xl font-bold text-[var(--content-primary)] tracking-tight">{title}</h1>
        <p className="mt-5 text-lg text-[#e2e8f0] leading-relaxed">{intro}</p>
      </section>
      <section className="pb-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {pages.map((p) => (
            <Link
              key={p.slug}
              href={`${ROUTE_PREFIX[p.type]}/${p.slug}`}
              className="card p-6 flex flex-col gap-2 hover:border-brand-700/40 transition-colors"
            >
              <span className="text-xs font-semibold text-brand-600 uppercase tracking-widest">{p.eyebrow}</span>
              <span className="text-base font-semibold text-[var(--content-primary)] leading-snug">{p.h1}</span>
              <span className="text-sm text-[var(--content-tertiary)] leading-relaxed">{p.metaDescription}</span>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
