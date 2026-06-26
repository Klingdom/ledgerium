import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getBySlug, getPagesByType, isReservedSlug } from '@/content/registry';
import { generateSeoMetadata } from '@/lib/seo/metadata';
import { generateJsonLd } from '@/lib/seo/jsonLd';
import { SoftwarePageView } from '@/components/seo/SoftwarePageView';
import type { SoftwarePage } from '@/content/types';

export function generateStaticParams() {
  return getPagesByType('software')
    .filter((p) => p.published && !isReservedSlug('software', p.slug))
    .map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const page = getBySlug('software', params.slug);
  return page ? generateSeoMetadata(page) : {};
}

export default function SoftwareSlugPage({ params }: { params: { slug: string } }) {
  const page = getBySlug('software', params.slug);
  if (!page || page.type !== 'software' || !page.published) notFound();
  const jsonLd = generateJsonLd(page);
  return (
    <>
      {jsonLd.map((obj, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(obj) }} />
      ))}
      <SoftwarePageView page={page as SoftwarePage} />
    </>
  );
}
