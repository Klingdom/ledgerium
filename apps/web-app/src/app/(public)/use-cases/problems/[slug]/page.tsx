import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getBySlug, getPagesByType } from '@/content/registry';
import { generateSeoMetadata } from '@/lib/seo/metadata';
import { generateJsonLd } from '@/lib/seo/jsonLd';
import { ProblemPageView } from '@/components/seo/ProblemPageView';
import type { ProblemPage } from '@/content/types';

export function generateStaticParams() {
  return getPagesByType('problem')
    .filter((p) => p.published)
    .map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const page = getBySlug('problem', params.slug);
  return page ? generateSeoMetadata(page) : {};
}

export default function ProblemSlugPage({ params }: { params: { slug: string } }) {
  const page = getBySlug('problem', params.slug);
  if (!page || page.type !== 'problem' || !page.published) notFound();
  const jsonLd = generateJsonLd(page);
  return (
    <>
      {jsonLd.map((obj, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(obj) }} />
      ))}
      <ProblemPageView page={page as ProblemPage} />
    </>
  );
}
