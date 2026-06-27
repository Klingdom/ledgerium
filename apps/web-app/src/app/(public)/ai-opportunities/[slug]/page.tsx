import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getBySlug, getPagesByType } from '@/content/registry';
import { generateSeoMetadata } from '@/lib/seo/metadata';
import { generateJsonLd } from '@/lib/seo/jsonLd';
import { AiOpportunityPageView } from '@/components/seo/AiOpportunityPageView';
import type { AiOpportunityPage } from '@/content/types';

export function generateStaticParams() {
  return getPagesByType('aiOpportunity')
    .filter((p) => p.published)
    .map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const page = getBySlug('aiOpportunity', params.slug);
  return page ? generateSeoMetadata(page) : {};
}

export default function AiOpportunitySlugPage({ params }: { params: { slug: string } }) {
  const page = getBySlug('aiOpportunity', params.slug);
  if (!page || page.type !== 'aiOpportunity' || !page.published) notFound();
  const jsonLd = generateJsonLd(page);
  return (
    <>
      {jsonLd.map((obj, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(obj) }} />
      ))}
      <AiOpportunityPageView page={page as AiOpportunityPage} />
    </>
  );
}
