import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getBySlug, getPagesByType } from '@/content/registry';
import { generateSeoMetadata } from '@/lib/seo/metadata';
import { generateJsonLd } from '@/lib/seo/jsonLd';
import { AlternativesPageView } from '@/components/seo/AlternativesPageView';
import type { AlternativesPage } from '@/content/types';

export function generateStaticParams() {
  return getPagesByType('alternatives')
    .filter((p) => p.published)
    .map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const page = getBySlug('alternatives', params.slug);
  return page ? generateSeoMetadata(page) : {};
}

export default function AlternativesSlugPage({ params }: { params: { slug: string } }) {
  const page = getBySlug('alternatives', params.slug);
  if (!page || page.type !== 'alternatives' || !page.published) notFound();
  const jsonLd = generateJsonLd(page);
  return (
    <>
      {jsonLd.map((obj, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(obj) }} />
      ))}
      <AlternativesPageView page={page as AlternativesPage} />
    </>
  );
}
