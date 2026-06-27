import type { Metadata } from 'next';
import { getPagesByType } from '@/content/registry';
import { HubIndex } from '@/components/seo/HubIndex';

export const metadata: Metadata = {
  title: 'Workflow Documentation by Industry',
  description:
    'Industry-specific workflow documentation for manufacturing, healthcare, insurance, banking, SaaS, and more. Generated from how the work really runs, not memory.',
  alternates: { canonical: 'https://ledgerium.ai/industries' },
};

export default function IndustriesIndex() {
  const pages = getPagesByType('industry').filter((p) => p.published);
  return (
    <HubIndex
      eyebrow="Industries"
      title="Workflow documentation by industry"
      intro="Every industry has workflows and compliance concerns that generic guides miss. Find yours to see common workflows, documentation and compliance concerns, and where AI can help."
      pages={pages}
    />
  );
}
