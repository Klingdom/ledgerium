import type { Metadata } from 'next';
import { getPagesByType } from '@/content/registry';
import { HubIndex } from '@/components/seo/HubIndex';

export const metadata: Metadata = {
  title: 'Document Workflows in Your Software, Step by Step',
  description:
    'Guides for documenting real workflows inside the software your team uses. Record the process once and generate an SOP and process map that match your own account.',
  alternates: { canonical: 'https://ledgerium.ai/software' },
};

export default function SoftwareIndex() {
  const pages = getPagesByType('software').filter((p) => p.published);
  return (
    <HubIndex
      eyebrow="Software guides"
      title="Document workflows in your software"
      intro="Every guide shows how to document a real process inside a specific tool, captured from how your team actually works, so the SOP matches your own configured account."
      pages={pages}
    />
  );
}
