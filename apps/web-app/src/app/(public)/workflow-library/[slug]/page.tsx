import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getBySlug, getPagesByType, isReservedSlug } from '@/content/registry';
import { generateSeoMetadata } from '@/lib/seo/metadata';
import { generateJsonLd } from '@/lib/seo/jsonLd';
import { WorkflowPageView } from '@/components/seo/WorkflowPageView';
import type { WorkflowPage } from '@/content/types';

export function generateStaticParams() {
  return getPagesByType('workflow')
    .filter((p) => p.published && !isReservedSlug('workflow', p.slug))
    .map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const page = getBySlug('workflow', params.slug);
  return page ? generateSeoMetadata(page) : {};
}

export default function WorkflowSlugPage({ params }: { params: { slug: string } }) {
  const page = getBySlug('workflow', params.slug);
  if (!page || page.type !== 'workflow' || !page.published) notFound();
  const jsonLd = generateJsonLd(page);
  return (
    <>
      {jsonLd.map((obj, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(obj) }} />
      ))}
      <WorkflowPageView page={page as WorkflowPage} />
    </>
  );
}
