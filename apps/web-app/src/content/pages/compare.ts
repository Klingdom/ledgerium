import type { ComparePage } from '../types';

/**
 * Comparison pages. Bottom-funnel, decision-stage.
 * Rules: competitor claims are dated (`verifiedAsOf`), sourced to public docs in
 * copy, and concede at least one competitor strength (`competitorStrength`).
 * `/compare/scribe` is a reserved hand-built page and is intentionally absent.
 */

const tango: ComparePage = {
  type: 'compare',
  slug: 'tango',
  metaTitle: 'Tango Alternative: Ledgerium vs Tango Compared',
  metaDescription:
    'Tango captures annotated screenshots of a process. Ledgerium captures structured interaction data with timing and system context. See the difference.',
  h1: 'Ledgerium vs Tango: which fits how your team documents work?',
  eyebrow: 'Comparison',
  shortAnswer:
    'Tango and Ledgerium both watch you work, but they record different things. Tango produces an annotated screenshot guide that shows what the screen looked like at each step. Ledgerium records structured interaction data, clicks, inputs, navigation, timing, and system context, then turns it into an SOP, a process map, and a workflow intelligence report. If you need a quick visual how-to, Tango fits. If you need process data you can measure, diff over time, and use to plan automation, Ledgerium fits.',
  primaryKeyword: 'Tango alternative',
  secondaryKeywords: ['Ledgerium vs Tango', 'Tango vs SOP software', 'structured workflow capture'],
  searchIntent: 'commercial',
  tags: ['comparison', 'sop', 'screenshots', 'process-intelligence'],
  related: ['compare:manual-sop-documentation', 'workflow:invoice-approval-workflow', 'software:salesforce'],
  originalDataPoint:
    'Ledgerium records millisecond-level timing on every captured step, so two recordings of the same process can be diffed to show exactly where cycle time changed. A screenshot guide carries no timing, so the same comparison is not possible.',
  honestLimitation:
    'Ledgerium captures browser-based workflows through a Chrome extension. Work that happens in native desktop applications outside the browser is not captured.',
  competitor: 'Tango',
  whyItMatters:
    'A screenshot guide answers "where do I click?" A structured recording answers "where is time lost, what varies between people, and what is worth automating?" The two solve different problems. Choosing the wrong one means either over-documenting a one-time how-to or under-measuring a process you need to improve.',
  rows: [
    { label: 'Capture method', competitor: 'Annotated screenshots', ledgerium: 'Structured interaction data' },
    { label: 'Output', competitor: 'Visual walkthrough (images)', ledgerium: 'SOP, process map, intelligence report' },
    { label: 'Per-step timing', competitor: false, ledgerium: 'Yes, millisecond precision' },
    { label: 'Diff two recordings', competitor: false, ledgerium: true },
    { label: 'System / app context per step', competitor: false, ledgerium: true },
    { label: 'Automation opportunity scoring', competitor: false, ledgerium: true },
    { label: 'Privacy model', competitor: 'Screenshots can contain visible data', ledgerium: 'No screenshots, no keystrokes' },
  ],
  competitorStrength:
    'Tango is faster for producing a simple, attractive visual how-to that a colleague can follow once. For ad hoc "show me where to click" content, it is well established and easy to share.',
  whenCompetitorFits: [
    'One-time visual guides for showing a UI step sequence',
    'Teams that want screenshot-based wiki content',
    'Quick onboarding snippets where measurement is not the goal',
  ],
  whenLedgeriumFits: [
    'You want to measure cycle time and find bottlenecks',
    'You need to compare how a workflow changes over time',
    'You are preparing a process for automation or audit',
    'You want documentation generated from real work, not memory',
  ],
  verifiedAsOf: 'June 2026',
  faqs: [
    {
      q: 'Is Ledgerium a Tango alternative?',
      a: 'Yes, for teams that need structured process data rather than a screenshot guide. Tango produces an annotated visual walkthrough; Ledgerium records structured interaction events with timing and system context and generates an SOP, process map, and intelligence report from them.',
    },
    {
      q: 'What is the main difference between Ledgerium and Tango?',
      a: 'Tango records what the screen looked like at each step. Ledgerium records what actually happened, the clicks, inputs, navigation, timing, and the systems involved, as structured data you can measure and diff.',
    },
    {
      q: 'Does Ledgerium take screenshots like Tango?',
      a: 'No. Ledgerium never captures screenshots or screen content. It records structural browser interaction events. This is a deliberate privacy choice: no screenshots means no risk of capturing sensitive on-screen data.',
    },
    {
      q: 'Can Ledgerium replace Tango for SOPs?',
      a: 'For SOPs backed by real, measurable process data, yes. If your only need is a quick image-based how-to, Tango may be enough. Ledgerium fits when the SOP needs to be auditable, comparable over time, or used to plan automation.',
    },
    {
      q: 'How is pricing different?',
      a: 'Ledgerium offers a free tier with 5 documented workflows per month and paid plans starting at 49 dollars per month. Verify current Tango pricing on Tango’s own pricing page, as plans change.',
    },
  ],
  jsonLd: ['FAQPage', 'BreadcrumbList', 'WebPage', 'Organization'],
  author: { name: 'Ledgerium Research Team', sameAs: ['https://www.linkedin.com/company/ledgerium'] },
  updatedAt: '2026-06-26',
  published: true,
};

const manualSop: ComparePage = {
  type: 'compare',
  slug: 'manual-sop-documentation',
  metaTitle: 'Ledgerium vs Manual SOP Documentation',
  metaDescription:
    'Manual SOPs are written from memory and go stale fast. Ledgerium records the real workflow and generates the SOP from it. Compare the two approaches.',
  h1: 'Ledgerium vs writing SOPs by hand',
  eyebrow: 'Comparison',
  shortAnswer:
    'Writing an SOP by hand means someone recalls a process and types it up. That is why manual SOPs miss workarounds, exceptions, and the exact system clicks, and why they drift out of date the moment the process changes. Ledgerium records the real workflow in the browser and generates the SOP from what actually happened, so it reflects the work rather than a memory of it. Manual documentation is cheaper to start and needs no tooling. Ledgerium is faster to keep accurate and produces measurable process data alongside the SOP.',
  primaryKeyword: 'automated SOP vs manual SOP',
  secondaryKeywords: ['stop writing SOPs by hand', 'auto generate SOP', 'SOP from screen recording'],
  searchIntent: 'commercial',
  tags: ['comparison', 'sop', 'documentation', 'process-intelligence'],
  related: ['compare:tango', 'workflow:customer-onboarding-workflow', 'software:netsuite'],
  originalDataPoint:
    'Because Ledgerium captures every step as structured data, regenerating an SOP after a process changes is a re-record, not a rewrite. The manual equivalent is a full document edit each time the process drifts.',
  honestLimitation:
    'Ledgerium documents what it observes in the browser. Policy rationale, approvals made verbally, and offline steps still need a human to add context.',
  competitor: 'manual documentation',
  whyItMatters:
    'An SOP nobody trusts is worse than none, because people follow the real, undocumented process instead. The core failure of manual SOPs is that they describe an idealized process from memory, not the one your team actually runs. Recording the real workflow removes that gap.',
  rows: [
    { label: 'Source of truth', competitor: 'Author memory', ledgerium: 'Recorded real workflow' },
    { label: 'Captures workarounds and exceptions', competitor: 'Usually missed', ledgerium: 'Captured as they happen' },
    { label: 'Time to update after a change', competitor: 'Manual rewrite', ledgerium: 'Re-record' },
    { label: 'Process measurement included', competitor: false, ledgerium: 'Timing, bottlenecks, variants' },
    { label: 'Up-front cost', competitor: 'None', ledgerium: 'Free tier, then paid plans' },
    { label: 'Consistency across authors', competitor: 'Varies by writer', ledgerium: 'Deterministic from the recording' },
  ],
  competitorStrength:
    'Manual documentation needs no tools and no setup, and a skilled process writer can add judgment, rationale, and policy context that observation alone does not reveal.',
  whenCompetitorFits: [
    'A one-off process that will not change',
    'Documentation that is mostly policy and judgment, not system steps',
    'Teams with no browser-based system steps to capture',
  ],
  whenLedgeriumFits: [
    'Processes that change often and drift out of date',
    'Work that spans several browser systems',
    'You also want timing, bottleneck, and automation signals',
    'You want consistent output regardless of who documents it',
  ],
  verifiedAsOf: 'June 2026',
  faqs: [
    {
      q: 'Why do manual SOPs go out of date so fast?',
      a: 'They are written from memory at a point in time. The moment the process changes, the document is wrong, and updating it means a manual rewrite that rarely happens on schedule.',
    },
    {
      q: 'Can Ledgerium generate an SOP automatically?',
      a: 'Yes. It records the real workflow in the browser and generates a step-by-step SOP, a process map, and an intelligence report from the captured data, so the SOP reflects the actual work.',
    },
    {
      q: 'Is manual documentation ever the better choice?',
      a: 'Yes, for processes that are mostly policy and human judgment rather than system steps, or one-off procedures that will not change, manual writing can be simpler and gives an author room to add rationale.',
    },
    {
      q: 'Do I still need a human to review the generated SOP?',
      a: 'Yes. Ledgerium produces an accurate draft from observed work; a process owner should review it to add rationale, approvals, and any offline context the browser cannot see.',
    },
    {
      q: 'How long does it take to document a workflow with Ledgerium?',
      a: 'You record the workflow once while you do it. The SOP, process map, and report are generated from that single recording, so documentation time is roughly the time it takes to perform the process once.',
    },
  ],
  jsonLd: ['FAQPage', 'BreadcrumbList', 'WebPage', 'Organization'],
  author: { name: 'Ledgerium Research Team', sameAs: ['https://www.linkedin.com/company/ledgerium'] },
  updatedAt: '2026-06-26',
  published: true,
};

const processMining: ComparePage = {
  type: 'compare',
  slug: 'process-mining',
  metaTitle: 'Workflow Recording vs Process Mining Compared',
  metaDescription:
    'Process mining reads event logs from your systems. Ledgerium records the real browser workflow directly. Compare the two ways to see how work actually happens.',
  h1: 'Workflow recording vs process mining',
  eyebrow: 'Comparison',
  shortAnswer:
    'Process mining and workflow recording both reveal how work happens, but they start from different data. Process mining reconstructs a process from event logs already sitting in your systems, so it needs systems that log the right events and a data team to extract them. Workflow recording captures the process directly as a person performs it in the browser, including the steps between systems that logs never see. Process mining suits high-volume, single-system processes with clean logs. Workflow recording suits cross-system, human-driven work where the logs are incomplete or do not exist.',
  primaryKeyword: 'workflow recording vs process mining',
  secondaryKeywords: ['process mining alternative', 'task mining vs process mining', 'document a process without event logs'],
  searchIntent: 'commercial',
  tags: ['comparison', 'process-intelligence', 'process-mining', 'documentation'],
  related: ['compare:tango', 'workflow:month-end-close-workflow', 'software:servicenow'],
  originalDataPoint:
    'Process mining can only see steps a system writes to a log. Ledgerium records the steps between systems, the copy-paste, the lookup in another tab, the manual check, which is exactly where undocumented work and rework hide.',
  honestLimitation:
    'For very high-volume, single-system processes with clean event logs, process mining analyzes far more cases than a handful of recordings can. Ledgerium captures observed runs, not millions of historical log events.',
  competitor: 'process mining',
  whyItMatters:
    'Picking the wrong approach wastes months. Process mining projects stall when the logs are missing or messy, which is common for work that spans several browser tools. Recording the real workflow gets you a documented, measurable process in an afternoon, without a data-extraction project, when the work is human-driven and cross-system.',
  rows: [
    { label: 'Data source', competitor: 'Existing system event logs', ledgerium: 'Directly recorded browser workflow' },
    { label: 'Needs clean logs', competitor: true, ledgerium: false },
    { label: 'Captures steps between systems', competitor: false, ledgerium: true },
    { label: 'Setup effort', competitor: 'Data extraction project', ledgerium: 'Install and record' },
    { label: 'Volume of cases analyzed', competitor: 'Very high from history', ledgerium: 'Observed runs' },
    { label: 'Produces a ready SOP', competitor: false, ledgerium: true },
  ],
  competitorStrength:
    'Process mining is stronger when you have a high-volume process inside one well-logged system and need to analyze thousands or millions of historical cases for conformance and bottlenecks at scale.',
  whenCompetitorFits: [
    'High-volume processes inside a single, well-logged system',
    'You already have clean event logs and a data team',
    'You need conformance analysis across millions of historical cases',
  ],
  whenLedgeriumFits: [
    'Work that spans several browser tools',
    'Logs are missing, messy, or do not capture the real steps',
    'You want a documented, measurable process quickly',
    'You also need an SOP and process map, not just analysis',
  ],
  verifiedAsOf: 'June 2026',
  faqs: [
    {
      q: 'What is the difference between process mining and workflow recording?',
      a: 'Process mining reconstructs a process from event logs your systems already produce. Workflow recording captures the process directly as a person performs it, including the manual steps between systems that logs never record.',
    },
    {
      q: 'When is process mining the better choice?',
      a: 'When you have a high-volume process inside one well-logged system and the goal is to analyze thousands or millions of historical cases. Clean logs and a data team make process mining powerful at that scale.',
    },
    {
      q: 'Why do process mining projects stall?',
      a: 'They depend on event logs being complete and clean. For work that spans several browser tools, the logs are often missing the steps in between, so the reconstructed process has gaps. Recording the real workflow avoids that dependency.',
    },
    {
      q: 'Does Ledgerium do process mining?',
      a: 'Ledgerium is not a log-based process mining tool. It records the real workflow directly and produces a process map, an SOP, and intelligence from the observed runs, which is a complementary approach to log-based mining.',
    },
    {
      q: 'Can I use both together?',
      a: 'Yes. Many teams use recording to document and standardize a cross-system process, then use process mining for high-volume conformance analysis inside the systems that log well. They answer different questions.',
    },
  ],
  jsonLd: ['FAQPage', 'BreadcrumbList', 'WebPage', 'Organization'],
  author: { name: 'Ledgerium Research Team', sameAs: ['https://www.linkedin.com/company/ledgerium'] },
  updatedAt: '2026-06-26',
  published: true,
};

export const COMPARE_PAGES: readonly ComparePage[] = [tango, manualSop, processMining];
