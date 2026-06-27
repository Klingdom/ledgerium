import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getBySlug, getPagesByType } from '@/content/registry';
import { generateSeoMetadata } from '@/lib/seo/metadata';
import { generateJsonLd } from '@/lib/seo/jsonLd';
import { IndustryPageView } from '@/components/seo/IndustryPageView';
import type { IndustryPage } from '@/content/types';

export function generateStaticParams() {
  return getPagesByType('industry')
    .filter((p) => p.published)
    .map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const page = getBySlug('industry', params.slug);
  return page ? generateSeoMetadata(page) : {};
}

export default function IndustrySlugPage({ params }: { params: { slug: string } }) {
  const page = getBySlug('industry', params.slug);
  if (!page || page.type !== 'industry' || !page.published) notFound();
  const jsonLd = generateJsonLd(page);
  return (
    <>
      {jsonLd.map((obj, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(obj) }} />
      ))}
      <IndustryPageView page={page as IndustryPage} />
    </>
  );
}
