import type { Metadata } from 'next';
import { getPagesByType } from '@/content/registry';
import { HubIndex } from '@/components/seo/HubIndex';

export const metadata: Metadata = {
  title: 'Alternatives to Popular Workflow & SOP Tools',
  description:
    'Honest alternatives roundups for Scribe, Tango, Loom, and other workflow and SOP tools, grouped by what each is best for. Find the right fit, not just a switch.',
  alternates: { canonical: '/alternatives' },
};

export default function AlternativesIndex() {
  const pages = getPagesByType('alternatives').filter((p) => p.published);
  return (
    <HubIndex
      eyebrow="Alternatives"
      title="Alternatives to popular tools"
      intro="Looking to switch? These roundups compare the real alternatives to popular workflow and SOP tools by what each is best for, including where structured, recorded process data fits."
      pages={pages}
    />
  );
}
