import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getBySlug, getPagesByType, isReservedSlug } from '@/content/registry';
import { generateSeoMetadata } from '@/lib/seo/metadata';
import { generateJsonLd } from '@/lib/seo/jsonLd';
import { AnswerPageView } from '@/components/seo/AnswerPageView';
import type { AnswerPage } from '@/content/types';

export function generateStaticParams() {
  return getPagesByType('answer')
    .filter((p) => p.published && !isReservedSlug('answer', p.slug))
    .map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const page = getBySlug('answer', params.slug);
  return page ? generateSeoMetadata(page) : {};
}

export default function AnswerSlugPage({ params }: { params: { slug: string } }) {
  const page = getBySlug('answer', params.slug);
  if (!page || page.type !== 'answer' || !page.published || isReservedSlug('answer', page.slug)) notFound();
  const jsonLd = generateJsonLd(page);
  return (
    <>
      {jsonLd.map((obj, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(obj) }} />
      ))}
      <AnswerPageView page={page as AnswerPage} />
    </>
  );
}
