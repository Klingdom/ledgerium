import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getBySlug, getPagesByType } from '@/content/registry';
import { generateSeoMetadata } from '@/lib/seo/metadata';
import { generateJsonLd } from '@/lib/seo/jsonLd';
import { PersonaPageView } from '@/components/seo/PersonaPageView';
import type { PersonaPage } from '@/content/types';

export function generateStaticParams() {
  return getPagesByType('persona')
    .filter((p) => p.published)
    .map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const page = getBySlug('persona', params.slug);
  return page ? generateSeoMetadata(page) : {};
}

export default function PersonaSlugPage({ params }: { params: { slug: string } }) {
  const page = getBySlug('persona', params.slug);
  if (!page || page.type !== 'persona' || !page.published) notFound();
  const jsonLd = generateJsonLd(page);
  return (
    <>
      {jsonLd.map((obj, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(obj) }} />
      ))}
      <PersonaPageView page={page as PersonaPage} />
    </>
  );
}
