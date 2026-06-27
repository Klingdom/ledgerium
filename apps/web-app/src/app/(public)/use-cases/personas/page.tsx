import type { Metadata } from 'next';
import { getPagesByType } from '@/content/registry';
import { HubIndex } from '@/components/seo/HubIndex';

export const metadata: Metadata = {
  title: 'Who Ledgerium AI Helps: Roles and Personas',
  description:
    'See how Ledgerium helps operations managers, consultants, RevOps, business analysts, and improvement leads document real workflows and find process improvements.',
  alternates: { canonical: 'https://ledgerium.ai/use-cases/personas' },
};

export default function PersonasIndex() {
  const pages = getPagesByType('persona').filter((p) => p.published);
  return (
    <HubIndex
      eyebrow="Who it helps"
      title="Who Ledgerium helps"
      intro="Ledgerium fits any role that needs to document how work really happens. Find your role and see the workflows you can capture, the questions it answers, and how the documentation gets generated from real work."
      pages={pages}
    />
  );
}
