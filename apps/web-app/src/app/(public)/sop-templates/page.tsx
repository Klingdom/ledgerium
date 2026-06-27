import type { Metadata } from 'next';
import { getPagesByType } from '@/content/registry';
import { HubIndex } from '@/components/seo/HubIndex';

export const metadata: Metadata = {
  title: 'Free, Editable SOP Templates for Real Processes',
  description:
    'Editable SOP templates for invoice approval, onboarding, expenses, purchase orders, and the month-end close. Or record the real process and generate the SOP.',
  alternates: { canonical: 'https://ledgerium.ai/sop-templates' },
};

export default function SopTemplatesIndex() {
  const pages = getPagesByType('sopTemplate').filter((p) => p.published);
  return (
    <HubIndex
      eyebrow="SOP templates"
      title="SOP templates"
      intro="Start from a clear, editable SOP structure for common business processes. Better still, record the real process once and Ledgerium generates the SOP from the actual steps, so it matches how your team really works."
      pages={pages}
    />
  );
}
