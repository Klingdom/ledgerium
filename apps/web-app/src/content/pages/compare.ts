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

const taskMining: ComparePage = {
  type: 'compare',
  slug: 'task-mining',
  metaTitle: 'Workflow Recording vs Task Mining Compared',
  metaDescription:
    'Task mining samples desktop activity broadly and produces noisy data to analyze. Ledgerium records one real browser workflow into a usable SOP and map.',
  h1: 'Workflow recording vs task mining',
  eyebrow: 'Comparison',
  shortAnswer:
    'Task mining and workflow recording both watch how people work, but they aim at different things. Task mining runs on the desktop and samples a wide stream of activity across many applications, which produces a large, noisy dataset that needs analysis before it means anything. Ledgerium records one chosen browser workflow as you perform it and turns that single run into an SOP, a process map, and an intelligence report directly. Task mining suits broad discovery across a whole department. Workflow recording suits documenting one process you already know matters.',
  primaryKeyword: 'workflow recording vs task mining',
  secondaryKeywords: ['task mining alternative', 'desktop activity capture vs workflow recording', 'document a workflow without noisy data'],
  searchIntent: 'commercial',
  tags: ['comparison', 'process-intelligence', 'task-mining', 'documentation'],
  related: ['compare:process-mining', 'workflow:expense-reporting-workflow', 'persona:business-analysts'],
  originalDataPoint:
    'Task mining captures broad activity and leaves you to find the signal in it. Ledgerium captures one targeted workflow as structured steps with millisecond timing, so the output is already a readable SOP and map, not a dataset waiting for an analyst.',
  honestLimitation:
    'Ledgerium captures browser-based workflows through a Chrome extension. Task mining tools can observe activity in native desktop applications that Ledgerium does not see.',
  competitor: 'task mining',
  whyItMatters:
    'Broad capture and targeted capture solve different problems. Task mining is built for discovery, finding which processes exist across a team, and that breadth comes with a large dataset and an analysis step. If you already know the process you need documented, that analysis overhead is wasted effort, and a targeted recording gets you a usable SOP far faster.',
  rows: [
    { label: 'Capture scope', competitor: 'Broad desktop activity sampling', ledgerium: 'One targeted browser workflow' },
    { label: 'Output', competitor: 'Activity dataset to analyze', ledgerium: 'SOP, process map, intelligence report' },
    { label: 'Analysis step before value', competitor: 'Required', ledgerium: 'Not required' },
    { label: 'Data noise', competitor: 'High, needs filtering', ledgerium: 'Low, scoped to one process' },
    { label: 'Native desktop apps', competitor: true, ledgerium: false },
    { label: 'Produces a ready SOP', competitor: false, ledgerium: true },
  ],
  competitorStrength:
    'Task mining is stronger for discovery at scale. When you do not yet know which processes a department runs or where the volume sits, sampling activity across many desktops surfaces candidates that a single targeted recording would never reveal.',
  whenCompetitorFits: [
    'Broad discovery of which processes exist across a team',
    'You need to see activity in native desktop applications',
    'You have an analyst team to interpret a large activity dataset',
  ],
  whenLedgeriumFits: [
    'You already know which process needs documenting',
    'You want a usable SOP and map without an analysis step',
    'The work runs across browser systems',
    'You want documentation generated from real work, not memory',
  ],
  verifiedAsOf: 'June 2026',
  faqs: [
    {
      q: 'What is the difference between task mining and workflow recording?',
      a: 'Task mining samples broad desktop activity across many applications and produces a dataset you analyze to find processes. Workflow recording captures one chosen workflow as you perform it and turns that single run into an SOP and process map directly.',
    },
    {
      q: 'When is task mining the better choice?',
      a: 'When the goal is discovery across a department and you do not yet know which processes exist or where the volume is. Sampling activity across many desktops surfaces candidate processes that a single recording cannot.',
    },
    {
      q: 'Why is task mining data described as noisy?',
      a: 'Because it captures a wide stream of everything happening on the desktop, most of which is unrelated to any one process. Turning that into a documented workflow takes a filtering and analysis step. Recording one process avoids that step.',
    },
    {
      q: 'Does Ledgerium watch everything I do on my computer?',
      a: 'No. Ledgerium only records the specific browser workflow you start, and it captures structured interaction events rather than desktop-wide activity or screenshots. Capture is scoped to the process you choose to document.',
    },
    {
      q: 'Can I use both together?',
      a: 'Yes. Many teams use task mining to discover which processes are worth attention, then use Ledgerium to record and document the specific workflows that discovery surfaces. One finds the candidates, the other documents them.',
    },
  ],
  jsonLd: ['FAQPage', 'BreadcrumbList', 'WebPage', 'Organization'],
  author: { name: 'Ledgerium Research Team', sameAs: ['https://www.linkedin.com/company/ledgerium'] },
  updatedAt: '2026-06-26',
  published: true,
};

const screenRecording: ComparePage = {
  type: 'compare',
  slug: 'screen-recording',
  metaTitle: 'Workflow Recording vs Screen Recording',
  metaDescription:
    'A screen recording is great for a quick show-and-tell but is not structured or measurable. Ledgerium captures structured steps and timing, no screenshots.',
  h1: 'Workflow recording vs screen recording',
  eyebrow: 'Comparison',
  shortAnswer:
    'A screen recording captures video of what happened on screen, which is perfect for a quick show-and-tell a colleague can watch once. But video is not structured, searchable, diffable, or measurable. You cannot ask a video where time was lost or compare two runs without watching both end to end. Ledgerium captures the same work as structured steps with per-step timing, so the result is an SOP and a process map you can search, measure, and compare, and it records no screenshots at all. Screen recording fits explaining; workflow recording fits documenting and measuring.',
  primaryKeyword: 'workflow recording vs screen recording',
  secondaryKeywords: ['Loom alternative for SOPs', 'screen recording vs SOP', 'structured workflow capture vs video'],
  searchIntent: 'commercial',
  tags: ['comparison', 'sop', 'screen-recording', 'process-intelligence'],
  related: ['compare:tango', 'problem:how-to-document-a-workflow-across-multiple-systems', 'persona:training-managers'],
  originalDataPoint:
    'A video forces a viewer to watch in real time to find anything. Ledgerium records each step as structured data with millisecond timing, so a reader can jump to a step, search the SOP, or diff two runs to see exactly where cycle time changed, none of which a video supports.',
  honestLimitation:
    'Ledgerium captures browser-based workflows through a Chrome extension and records no screen content. Work in native desktop applications outside the browser is not captured, and a video can show visual detail that a structured step list does not.',
  competitor: 'screen recording',
  whyItMatters:
    'Video and structured capture answer different questions. A screen recording is fast to make and easy to watch, but it is a flat artifact: nothing in it can be searched, measured, or compared. If you need documentation that supports improvement, audit, or automation planning, a video leaves you re-watching footage instead of reading data.',
  rows: [
    { label: 'Output format', competitor: 'Video file', ledgerium: 'Structured steps, SOP, process map' },
    { label: 'Searchable', competitor: false, ledgerium: true },
    { label: 'Per-step timing', competitor: false, ledgerium: 'Yes, millisecond precision' },
    { label: 'Diff two runs', competitor: false, ledgerium: true },
    { label: 'Captures screen content', competitor: 'Yes, full video', ledgerium: 'No screenshots, no screen content' },
    { label: 'Update after a change', competitor: 'Re-shoot the video', ledgerium: 'Re-record' },
  ],
  competitorStrength:
    'Screen recording is faster and richer for a quick visual explanation. When you just want to show a colleague how something looks and moves, narrated video carries tone, context, and on-screen detail that a structured step list does not.',
  whenCompetitorFits: [
    'A quick show-and-tell to explain something once',
    'Content where visual and verbal nuance matters more than data',
    'Informal sharing where measurement is not the goal',
  ],
  whenLedgeriumFits: [
    'You need documentation you can search and measure',
    'You want to compare how a workflow changes over time',
    'You are preparing a process for audit or automation',
    'You want a privacy model with no screenshots or screen content',
  ],
  verifiedAsOf: 'June 2026',
  faqs: [
    {
      q: 'Is a screen recording good enough for an SOP?',
      a: 'For a one-time explanation, yes. For an SOP that needs to be searched, kept current, measured, or used for audit, no. Video is a flat artifact you re-watch; a structured recording produces a readable, measurable document instead.',
    },
    {
      q: 'What does Ledgerium capture instead of video?',
      a: 'It records the work as structured interaction steps, clicks, inputs, navigation, with per-step timing and system context, then generates an SOP and process map. It captures no screenshots and no screen content.',
    },
    {
      q: 'Can I search or measure a screen recording?',
      a: 'Not directly. A video has no structure to search and no timing data to measure, so finding a step or comparing two runs means watching footage. Ledgerium produces searchable steps and millisecond timing you can measure and diff.',
    },
    {
      q: 'Does Ledgerium record my screen?',
      a: 'No. Ledgerium never captures screenshots or screen content. It records structural browser interaction events only, which is a deliberate privacy choice that avoids capturing sensitive on-screen data.',
    },
    {
      q: 'When should I still use screen recording?',
      a: 'When you want a quick visual show-and-tell and the verbal and on-screen nuance matters more than searchable, measurable data. Many teams record a short video to explain context and use Ledgerium for the documented, measurable SOP.',
    },
  ],
  jsonLd: ['FAQPage', 'BreadcrumbList', 'WebPage', 'Organization'],
  author: { name: 'Ledgerium Research Team', sameAs: ['https://www.linkedin.com/company/ledgerium'] },
  updatedAt: '2026-06-26',
  published: true,
};

const processStreet: ComparePage = {
  type: 'compare',
  slug: 'process-street',
  metaTitle: 'Ledgerium vs Process Street Compared',
  metaDescription:
    'Process Street runs recurring checklists well once written. Ledgerium generates the SOP from real recorded work instead of authoring checklists by hand.',
  h1: 'Ledgerium vs Process Street: recorded work or hand-built checklists?',
  eyebrow: 'Comparison',
  shortAnswer:
    'Process Street and Ledgerium meet at documentation but start from opposite ends. Process Street is checklist and SOP software: once you author a checklist, it runs that recurring process well, with assignments, conditional logic, and tracking on every run. Ledgerium does not author checklists by hand. It records the real workflow as you perform it and generates the SOP and process map from what actually happened. If your priority is executing recurring checklists you maintain, Process Street fits. If your priority is producing an accurate SOP from real work without writing it from memory, Ledgerium fits.',
  primaryKeyword: 'Process Street alternative',
  secondaryKeywords: ['Ledgerium vs Process Street', 'checklist software vs recorded SOP', 'generate SOP instead of writing checklists'],
  searchIntent: 'commercial',
  tags: ['comparison', 'sop', 'checklists', 'process-intelligence'],
  related: ['compare:manual-sop-documentation', 'sopTemplate:invoice-approval-sop-template', 'persona:operations-managers'],
  originalDataPoint:
    'Checklist software starts empty: someone authors every step from memory before the first run. Ledgerium starts from a recording, so the first SOP draft reflects the real workflow including the steps and system handoffs an author would forget to write down.',
  honestLimitation:
    'Ledgerium captures browser-based workflows through a Chrome extension and documents what it observes. It is not a checklist-execution platform: it does not assign, track, and enforce recurring checklist runs the way dedicated checklist software does.',
  competitor: 'Process Street',
  whyItMatters:
    'Authoring and recording produce different first drafts. A hand-built checklist captures what the author remembers, which is where workarounds, exceptions, and cross-system steps go missing. Recording the real work removes that gap. But once a process is documented, running it repeatedly with assignments and tracking is its own job, and that is the part checklist software is built for.',
  rows: [
    { label: 'How the SOP starts', competitor: 'Authored by hand from memory', ledgerium: 'Generated from a real recording' },
    { label: 'Captures workarounds and exceptions', competitor: 'Only if the author writes them', ledgerium: 'Captured as they happen' },
    { label: 'Recurring checklist execution', competitor: 'Yes, with assignments and tracking', ledgerium: false },
    { label: 'Per-step timing and bottleneck data', competitor: false, ledgerium: true },
    { label: 'Process map from the work', competitor: false, ledgerium: true },
    { label: 'Conditional logic on runs', competitor: true, ledgerium: false },
  ],
  competitorStrength:
    'Process Street is better for ongoing recurring-checklist execution. Once a process is written down, it assigns tasks, applies conditional logic, and tracks completion across every run, which is exactly the operational job Ledgerium does not do.',
  whenCompetitorFits: [
    'Running recurring checklists with assignments and tracking',
    'Processes that need conditional logic on each run',
    'Teams that want a platform to execute, not just document, a workflow',
  ],
  whenLedgeriumFits: [
    'You want the SOP generated from real work, not written from memory',
    'The process spans several browser systems',
    'You also need timing, bottleneck, and automation signals',
    'You want documentation that reflects the work rather than a memory of it',
  ],
  verifiedAsOf: 'June 2026',
  faqs: [
    {
      q: 'Is Ledgerium a Process Street alternative?',
      a: 'For producing the SOP itself, yes. Process Street has you author checklists by hand, then runs them; Ledgerium records the real workflow and generates the SOP and process map from it. They overlap on documentation but differ on how the document is created.',
    },
    {
      q: 'Can Ledgerium run recurring checklists like Process Street?',
      a: 'No. Ledgerium documents and measures workflows but does not assign, track, and enforce recurring checklist runs. For ongoing checklist execution with assignments and conditional logic, Process Street is the stronger fit.',
    },
    {
      q: 'What is the main advantage of recording over authoring a checklist?',
      a: 'A recording captures what actually happened, including workarounds, exceptions, and cross-system steps an author would forget. A hand-built checklist only contains what the writer remembered, so it tends to describe an idealized process.',
    },
    {
      q: 'Can I use Ledgerium and Process Street together?',
      a: 'Yes, and it is a natural fit. Record the real workflow in Ledgerium to produce an accurate SOP, then build the recurring checklist in Process Street from that SOP so the checklist your team runs reflects the real process.',
    },
    {
      q: 'How is pricing different?',
      a: 'Ledgerium offers a free tier with 5 documented workflows per month and paid plans starting at 49 dollars per month. Verify current Process Street pricing on Process Street’s own pricing page, as plans change.',
    },
  ],
  jsonLd: ['FAQPage', 'BreadcrumbList', 'WebPage', 'Organization'],
  author: { name: 'Ledgerium Research Team', sameAs: ['https://www.linkedin.com/company/ledgerium'] },
  updatedAt: '2026-06-26',
  published: true,
};

export const COMPARE_PAGES: readonly ComparePage[] = [
  tango,
  manualSop,
  processMining,
  taskMining,
  screenRecording,
  processStreet,
];
