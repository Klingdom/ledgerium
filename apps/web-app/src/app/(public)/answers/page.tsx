import type { Metadata } from 'next';
import { getPagesByType } from '@/content/registry';
import { HubIndex } from '@/components/seo/HubIndex';

export const metadata: Metadata = {
  title: 'Process Intelligence Definitions & Answers',
  description:
    'Plain-language answers for the terms behind process intelligence: SOP, process mining, task mining, cycle time, and more, grounded in real recorded work.',
  alternates: { canonical: '/answers' },
};

export default function AnswersIndex() {
  const pages = getPagesByType('answer').filter((p) => p.published);
  return (
    <HubIndex
      eyebrow="Definitions & answers"
      title="Definitions and answers"
      intro="Straightforward answers to the terms that come up around process intelligence: SOP, process mining, task mining, cycle time, and more. Each page leads with a direct definition, then goes deeper, and includes a data point pulled from real Ledgerium recordings instead of an outside benchmark."
      pages={pages}
      hubType="answer"
    />
  );
}
