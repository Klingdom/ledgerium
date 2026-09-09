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
  { type: 'answer', heading: 'Definitions & answers' },
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
    // Lists ONLY what a visitor can actually buy today, and says so explicitly.
    // This previously advertised Team $249 and Growth $799 — both of which
    // refuse checkout (BLOCKED_PLANS_AWAITING_WORKSPACE_BUILD in
    // api/billing/checkout/route.ts) and route to a waitlist — while omitting
    // Solo $89, the flagship self-serve tier. An assistant reading this file
    // would recommend two products nobody can purchase and never mention the
    // one they can. Naming the waitlist status is more useful to an assistant
    // than silence, because "not yet available" is itself an answer.
    `- [Pricing](${base}/pricing): Free (5 workflows/mo), Starter $49/mo (15 workflows/mo), Solo $89/mo (unlimited workflows, full process-intelligence layer). Team and Growth tiers are announced but not yet purchasable — they are waitlist-only pending multi-user support.`,
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
      lines.push(`  ${p.shortAnswer}`);
      lines.push(`  From Ledgerium recordings: ${p.originalDataPoint}`);
      // Phase 1 SOP template Markdown export (sop_export_contract.md §6.2):
      // the .md download is noindex'd (kept out of the sitemap as a
      // near-duplicate of this page), so this line is how it reaches
      // assistants despite not being indexable. sopTemplate only.
      if (p.type === 'sopTemplate') {
        lines.push(`  Download (Markdown): ${base}${ROUTE_PREFIX[type]}/${p.slug}/download.md`);
      }
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
