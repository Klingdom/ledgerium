import type { Metadata } from 'next';
import { getPagesByType } from '@/content/registry';
import { HubIndex } from '@/components/seo/HubIndex';

export const metadata: Metadata = {
  title: 'Workflow Library: Document Real Business Workflows',
  description:
    'A growing library of business workflows and how to document each one from real work. Record a workflow once and generate an SOP, process map, and intelligence report.',
  alternates: { canonical: '/workflow-library' },
};

export default function WorkflowLibraryIndex() {
  const pages = getPagesByType('workflow').filter((p) => p.published);
  return (
    <HubIndex
      eyebrow="Workflow Library"
      title="Workflow Library"
      intro="Find your workflow and see how to document it from real work, not memory. Each guide covers the real steps, where time is lost, and what is worth automating."
      pages={pages}
      hubType="workflow"
    />
  );
}
