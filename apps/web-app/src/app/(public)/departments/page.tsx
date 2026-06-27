import type { Metadata } from 'next';
import { getPagesByType } from '@/content/registry';
import { HubIndex } from '@/components/seo/HubIndex';

export const metadata: Metadata = {
  title: 'Workflows by Department: Document and Improve',
  description:
    'Document and improve workflows by department: finance, HR, operations, support, sales ops, procurement, IT, and compliance. Generated from how the work really runs.',
  alternates: { canonical: 'https://ledgerium.ai/departments' },
};

export default function DepartmentsIndex() {
  const pages = getPagesByType('department').filter((p) => p.published);
  return (
    <HubIndex
      eyebrow="Departments"
      title="Workflows by department"
      intro="Every department runs on workflows that are rarely documented well. Find your department to see its common workflows, the documentation problems, and where AI can help, all backed by recording the real work."
      pages={pages}
    />
  );
}
