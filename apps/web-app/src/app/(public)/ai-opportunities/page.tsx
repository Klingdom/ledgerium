import type { Metadata } from 'next';
import { getPagesByType } from '@/content/registry';
import { HubIndex } from '@/components/seo/HubIndex';

export const metadata: Metadata = {
  title: 'AI Opportunities by Function: Where AI Actually Helps',
  description:
    'Where AI and automation genuinely help across finance, HR, support, sales ops, and procurement, and where humans should stay. Find your candidates from real work.',
  alternates: { canonical: 'https://ledgerium.ai/ai-opportunities' },
};

export default function AiOpportunitiesIndex() {
  const pages = getPagesByType('aiOpportunity').filter((p) => p.published);
  return (
    <HubIndex
      eyebrow="AI opportunities"
      title="Where AI actually helps"
      intro="Find the repetitive, rule-based work AI and automation can take on, by function area, and see where humans should stay involved. Record a real workflow to score your strongest candidates with evidence."
      pages={pages}
    />
  );
}
