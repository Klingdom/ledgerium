import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getBySlug, getPagesByType } from '@/content/registry';
import { generateSeoMetadata } from '@/lib/seo/metadata';
import { generateJsonLd } from '@/lib/seo/jsonLd';
import { DepartmentPageView } from '@/components/seo/DepartmentPageView';
import type { DepartmentPage } from '@/content/types';

export function generateStaticParams() {
  return getPagesByType('department')
    .filter((p) => p.published)
    .map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const page = getBySlug('department', params.slug);
  return page ? generateSeoMetadata(page) : {};
}

export default function DepartmentSlugPage({ params }: { params: { slug: string } }) {
  const page = getBySlug('department', params.slug);
  if (!page || page.type !== 'department' || !page.published) notFound();
  const jsonLd = generateJsonLd(page);
  return (
    <>
      {jsonLd.map((obj, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(obj) }} />
      ))}
      <DepartmentPageView page={page as DepartmentPage} />
    </>
  );
}
