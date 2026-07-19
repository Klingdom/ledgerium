import type { Metadata } from 'next';
import { getPagesByType } from '@/content/registry';
import { HubIndex } from '@/components/seo/HubIndex';

export const metadata: Metadata = {
  title: 'Competitor Landscapes in Process Documentation',
  description:
    'Maps of the competitor landscape around Scribe, Tango, Celonis, and more, grouped by segment and use-fit. Understand the space before you choose a tool.',
  alternates: { canonical: '/competitors' },
};

export default function CompetitorsIndex() {
  const pages = getPagesByType('competitors').filter((p) => p.published);
  return (
    <HubIndex
      eyebrow="Competitors"
      title="Competitor landscapes"
      intro="Understand the competitive landscape around popular tools and categories. Each map groups the space by what each segment does and who it fits, so you can match the segment to your goal."
      pages={pages}
      hubType="competitors"
    />
  );
}
