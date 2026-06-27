import type { Metadata } from 'next';
import { getPagesByType } from '@/content/registry';
import { HubIndex } from '@/components/seo/HubIndex';

export const metadata: Metadata = {
  title: 'Process Documentation Problems, Solved Practically',
  description:
    'Practical answers to common process problems: how to document a process, create SOPs automatically, capture tribal knowledge, baseline a workflow, and find waste.',
  alternates: { canonical: 'https://ledgerium.ai/use-cases/problems' },
};

export default function ProblemsIndex() {
  const pages = getPagesByType('problem').filter((p) => p.published);
  return (
    <HubIndex
      eyebrow="Problems we solve"
      title="Operational problems, answered"
      intro="Clear, practical answers to the process problems teams actually face. Each guide gives the fastest way to solve it and shows how Ledgerium documents the work from real behavior, not memory."
      pages={pages}
    />
  );
}
