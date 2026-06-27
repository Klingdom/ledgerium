import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getBySlug, getPagesByType, isReservedSlug } from '@/content/registry';
import { generateSeoMetadata } from '@/lib/seo/metadata';
import { generateJsonLd } from '@/lib/seo/jsonLd';
import { ComparePageView } from '@/components/seo/ComparePageView';
import type { ComparePage } from '@/content/types';

export function generateStaticParams() {
  return getPagesByType('compare')
    .filter((p) => p.published && !isReservedSlug('compare', p.slug))
    .map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const page = getBySlug('compare', params.slug);
  return page ? generateSeoMetadata(page) : {};
}

export default function CompareSlugPage({ params }: { params: { slug: string } }) {
  const page = getBySlug('compare', params.slug);
  if (!page || page.type !== 'compare' || !page.published || isReservedSlug('compare', page.slug)) notFound();
  const jsonLd = generateJsonLd(page);
  return (
    <>
      {jsonLd.map((obj, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(obj) }} />
      ))}
      <ComparePageView page={page as ComparePage} />
    </>
  );
}
