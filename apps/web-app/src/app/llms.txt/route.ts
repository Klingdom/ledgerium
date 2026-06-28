import { getPublishedPages, ROUTE_PREFIX, PARENT_HUB } from '@/content/registry';
import { SITE_CONFIG } from '@/lib/config';
import type { PageType } from '@/content/types';

/**
 * /llms.txt — a curated, machine-readable map of the site for LLMs and answer
 * engines (llmstxt.org convention). Generated from the published-page registry
 * so it stays current as pages are authored. Served as text/plain.
 */
export const dynamic = 'force-static';

const TYPE_ORDER: { type: PageType; heading: string }[] = [
  { type: 'workflow', heading: 'Workflow documentation guides' },
  { type: 'sopTemplate', heading: 'SOP templates' },
  { type: 'software', heading: 'Document workflows in specific software' },
  { type: 'problem', heading: 'How-to / problem guides' },
  { type: 'aiOpportunity', heading: 'AI opportunities by function' },
  { type: 'department', heading: 'By department' },
  { type: 'industry', heading: 'By industry' },
  { type: 'persona', heading: 'By role' },
  { type: 'compare', heading: 'Comparisons' },
];

export function GET(): Response {
  const base = SITE_CONFIG.url;
  const pages = getPublishedPages();

  const lines: string[] = [
    '# Ledgerium AI',
    '',
    '> Ledgerium AI records real browser-based workflows and turns them into SOPs, process maps, workflow intelligence reports, and AI opportunity reports. The core idea: most process documentation is written from memory, so it is outdated and incomplete. Ledgerium documents from real recorded work instead. No screenshots and no keystrokes are captured; it records structured interaction events with timing and system context.',
    '',
    '## Key entry points',
    `- [Product overview](${base}/product): how recording produces SOPs, process maps, and intelligence`,
    `- [Pricing](${base}/pricing): Free (5 workflows/mo), Starter $49, Team $249, Growth $799`,
    `- [Workflow library](${base}/workflow-library): how to document specific business workflows`,
    `- [SOP templates](${base}/sop-templates): editable SOP structures plus generation from real work`,
    `- [AI opportunities](${base}/ai-opportunities): where AI and automation help, by function`,
    '',
  ];

  for (const { type, heading } of TYPE_ORDER) {
    const group = pages.filter((p) => p.type === type);
    if (group.length === 0) continue;
    const hub = PARENT_HUB[type];
    lines.push(`## ${heading}`);
    if (hub) lines.push(`Index: ${base}${hub.path}`);
    for (const p of group) {
      lines.push(`- [${p.h1}](${base}${ROUTE_PREFIX[type]}/${p.slug}): ${p.metaDescription}`);
    }
    lines.push('');
  }

  return new Response(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
