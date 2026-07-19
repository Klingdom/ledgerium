import type { AnswerPage } from '../types';

/**
 * Answer pages. AEO-first "what is X" / "X vs Y (definitional)" pages, optimized
 * for AI-answer-engine citation (DefinedTerm + Speakable + hedge-free direct
 * answer in the first 30% of the page). See docs/features/seo-answer-pages/BUILD_SPEC.md.
 *
 * Slug convention: `what-is-<term>` and `<a>-vs-<b>`.
 */

const whatIsProcessIntelligence: AnswerPage = {
  type: 'answer',
  slug: 'what-is-process-intelligence',
  metaTitle: 'What Is Process Intelligence? Definition and How It Works',
  metaDescription:
    'Process intelligence is the practice of analyzing how work actually happens from recorded events. Learn what it means, how it works, and why it matters.',
  h1: 'What is process intelligence?',
  eyebrow: 'Definition',
  shortAnswer:
    'Process intelligence is the practice of understanding how a business process really runs by analyzing recorded events from the actual work — the clicks, systems, timing, and handoffs — rather than how people remember it. It turns real execution data into maps, metrics, and improvement opportunities.',
  primaryKeyword: 'process intelligence',
  secondaryKeywords: ['what is process intelligence', 'process intelligence definition', 'process intelligence software'],
  searchIntent: 'informational',
  tags: ['answer', 'process-intelligence', 'process-mining', 'definition', 'glossary'],
  related: ['answer:what-is-process-mining', 'answer:process-mining-vs-task-mining'],
  originalDataPoint:
    'In Ledgerium recordings, most of a process\'s elapsed time is wait time between systems and approvers, not active work — a split that only becomes visible once each step is timestamped from real execution rather than estimated from memory.',
  mechanismIntro:
    'Ledgerium produces process intelligence by recording the real browser workflow — every click, system, and handoff with its timing — and computing a process map, cycle-time metrics, and improvement opportunities from that evidence rather than from a memory-written description.',
  keyTakeaways: [
    'Process intelligence describes how a process actually executes, reconstructed from recorded interaction events rather than from interviews or memory.',
    'It is distinct from a static process map: intelligence carries timing, systems, variants, and exceptions, so it can be measured and compared over time.',
    'Process mining and task mining are two techniques that feed process intelligence — mining event logs from systems, and observing the desktop/browser work itself.',
    'The core payoff is a current-state, evidence-based baseline: where time is lost, where variants diverge, and where automation would actually help.',
    'Documentation written from memory drifts out of date; process intelligence stays current because it is regenerated from real recorded work.',
  ],
  honestLimitation:
    'Ledgerium builds process intelligence from browser-based work. Steps performed in native desktop applications or on paper are not observed directly and need a person to add that context.',
  term: 'Process intelligence',
  definition:
    'Process intelligence is a category of software and practice that reconstructs how a business process actually executes by capturing and analyzing real interaction events — the steps, systems, timing, and decision points of the work as performed. Unlike documentation written from memory, it produces an evidence-based, current-state view of the process that can be measured, compared across runs, and improved.',
  inDepth: [
    {
      heading: 'How process intelligence works',
      body: 'Process intelligence starts by capturing a real execution of the process as an ordered stream of structured events — each with a timestamp, the system it occurred in, and enough context to identify the step. Those events are normalized and segmented into steps, then grouped into the end-to-end flow. From that structured record the software computes a process map, cycle-time and wait-time metrics, the common variants and exceptions, and the points where the process stalls. Because the output is derived deterministically from the recorded events, the same run always produces the same map — which is what makes the result trustworthy enough to act on.',
    },
    {
      heading: 'Process intelligence vs a static process map',
      body: 'A hand-drawn process map or flowchart captures how a process is supposed to run. Process intelligence captures how it did run, with the timing and system context attached. That difference matters because the gaps between the intended flow and the real flow — the rework loops, the off-path exceptions, the handoffs that sit idle for days — are exactly where time and money are lost, and a static diagram cannot show them.',
    },
    {
      heading: 'What teams use process intelligence for',
      body: 'The most common uses are establishing a current-state baseline before an improvement or automation project, generating SOPs that reflect the real process rather than an idealized one, finding where cycle time is actually spent, and identifying which steps are repetitive enough to be good automation candidates. In each case the value comes from working off evidence — a recording of the real work — instead of an estimate.',
    },
  ],
  relatedTerms: [
    { term: 'Process mining', slug: 'what-is-process-mining' },
    { term: 'Task mining', slug: 'what-is-task-mining' },
    { term: 'Cycle time', slug: 'what-is-cycle-time' },
  ],
  sources: [
    { label: 'Ledgerium AI — Product overview', url: 'https://ledgerium.ai/product', retrievedAt: '2026-07-16' },
    { label: 'Ledgerium AI — Methodology (how we research this)', url: 'https://ledgerium.ai/methodology', retrievedAt: '2026-07-16' },
  ],
  faqs: [
    { q: 'What is process intelligence in simple terms?', a: 'It is a way of seeing how a business process really runs — the actual steps, systems, timing, and handoffs — by analyzing a recording of the real work, instead of relying on how people describe it from memory.' },
    { q: 'How is process intelligence different from process mining?', a: 'Process mining is one technique that feeds process intelligence: it reconstructs a process from event logs left behind in systems. Process intelligence is the broader outcome — the current-state, measurable view of the process, which can be built from mining, from task observation, or both.' },
    { q: 'Is process intelligence the same as a process map?', a: 'No. A process map is a diagram of the intended flow. Process intelligence is the evidence-based version, carrying real timing, variants, and exceptions, so it can be measured and compared rather than just read.' },
    { q: 'What do you actually get from process intelligence?', a: 'A current-state baseline: a process map computed from real work, cycle-time and wait-time metrics, the common variants and exceptions, and the steps where automation would genuinely help.' },
  ],
  jsonLd: ['Article', 'FAQPage', 'DefinedTerm', 'BreadcrumbList', 'WebPage', 'Organization'],
  author: { name: 'Ledgerium Research Team', sameAs: ['https://www.linkedin.com/company/ledgerium'] },
  updatedAt: '2026-07-16',
  published: true,
};

const whatIsProcessMining: AnswerPage = {
  type: 'answer',
  slug: 'what-is-process-mining',
  metaTitle: 'What Is Process Mining? Definition, Method, and Uses',
  metaDescription:
    'Process mining reconstructs how a process actually ran by analyzing the event logs systems already keep. Learn how the method works and what it needs.',
  h1: 'What is process mining?',
  eyebrow: 'Definition',
  shortAnswer:
    'Process mining is a technique that reconstructs how a business process actually ran by analyzing the timestamped event logs that IT systems leave behind — logins, tickets, transactions, status changes — and reassembling them into a process map, timing, and variants without watching anyone work.',
  primaryKeyword: 'process mining',
  secondaryKeywords: ['process mining definition', 'process mining vs task mining', 'what is process mining used for'],
  searchIntent: 'informational',
  tags: ['answer', 'process-mining', 'process-intelligence', 'definition', 'glossary'],
  related: ['answer:what-is-process-intelligence', 'answer:process-mining-vs-task-mining', 'answer:what-is-task-mining'],
  originalDataPoint:
    'Because Ledgerium records the browser session directly, a single recorded workflow captures steps across unrelated systems — a CRM, a spreadsheet, an email client — in one continuous event stream, something a log-based process-mining export from any one of those systems alone cannot do.',
  mechanismIntro:
    'Ledgerium complements process mining by capturing the browser-level actions a person takes during a workflow, producing an event stream even when the underlying systems do not emit clean, minable logs.',
  keyTakeaways: [
    'Process mining works from event logs already stored in systems like ERPs, ticketing tools, and CRMs — it does not require watching anyone do the work directly.',
    'The output is a process map built from timestamps and event sequences, so it shows the process as it actually ran, including rework and exceptions.',
    'Process mining needs systems that log structured, timestamped events; work that lives outside those systems — spreadsheets, email, desktop apps — is invisible to it.',
    'It differs from task mining, which observes the screen-level actions a person takes rather than the events a system records.',
  ],
  honestLimitation:
    "Ledgerium's approach is closer to task mining than classical process mining: it observes real browser and application activity directly rather than depending on IT systems having complete, well-structured event logs to mine.",
  term: 'Process mining',
  definition:
    "Process mining is a data science technique that extracts a business process's real execution path from the event logs already produced by enterprise systems — ERPs, case-management tools, ticketing systems — using timestamps and case IDs to algorithmically reconstruct the sequence, timing, and variants of the process as it actually happened.",
  inDepth: [
    {
      heading: 'How process mining works',
      body: "Process mining starts from an event log: a table of records where each row has a case identifier, an activity name, and a timestamp, usually exported from a system such as an ERP, a ticketing tool, or a case-management platform. A process-mining algorithm groups the events by case ID, orders them by timestamp, and looks for the sequences that repeat across cases. From that it draws a process map showing the paths cases actually took, the frequency of each path, and how long each step and transition took. Because the technique is purely a function of the log's structure and completeness, its output is only as good as the data the underlying systems were set up to record.",
    },
    {
      heading: 'What process mining needs to work',
      body: 'The technique depends on the source systems already emitting structured, timestamped, case-identified events — which is common in ERP and ticketing software but rare in the ad hoc mix of spreadsheets, email threads, chat messages, and manual steps that make up much of real office work. Where that structured logging does not exist, process mining has nothing to mine, and the process stays invisible even though the work is still happening.',
    },
    {
      heading: 'Process mining vs. task mining',
      body: "Process mining reconstructs a process from the event logs systems already keep. Task mining instead observes the user's screen — clicks, keystrokes, application switches — to capture the steps a person takes, including the parts of the work that never touch a loggable system. The two are complementary: process mining is strong wherever clean system logs already exist, and task mining is strong wherever the real work is manual, cross-application, or otherwise undocumented by any single system's logs.",
    },
  ],
  relatedTerms: [
    { term: 'Process intelligence', slug: 'what-is-process-intelligence' },
    { term: 'Task mining', slug: 'what-is-task-mining' },
    { term: 'Process mining vs task mining', slug: 'process-mining-vs-task-mining' },
  ],
  sources: [
    { label: 'Ledgerium AI — Product overview', url: 'https://ledgerium.ai/product', retrievedAt: '2026-07-18' },
    { label: 'Ledgerium AI — Methodology (how we research this)', url: 'https://ledgerium.ai/methodology', retrievedAt: '2026-07-18' },
  ],
  faqs: [
    { q: 'Is process mining the same as process intelligence?', a: 'No. Process mining is one technique for producing process intelligence — it reconstructs a process from system event logs. Process intelligence is the broader outcome, which can also be built from task mining or a mix of both.' },
    { q: 'What data does process mining need?', a: 'It needs an event log: timestamped records tied to a case ID, typically exported from an ERP, ticketing system, or case-management platform. Without that structured log, there is nothing to mine.' },
    { q: 'Can process mining see work done outside a system, like email or spreadsheets?', a: 'No. Process mining only sees what the source systems log. Work that happens in email, spreadsheets, or manual handoffs outside a logging system is invisible to it.' },
    { q: 'Is process mining the same as task mining?', a: 'No. Process mining works from system logs; task mining works from observed screen activity. See our process mining vs. task mining comparison for the full breakdown.' },
  ],
  jsonLd: ['Article', 'FAQPage', 'DefinedTerm', 'BreadcrumbList', 'WebPage', 'Organization'],
  author: { name: 'Ledgerium Research Team', sameAs: ['https://www.linkedin.com/company/ledgerium'] },
  updatedAt: '2026-07-18',
  published: true,
};

const processMiningVsTaskMining: AnswerPage = {
  type: 'answer',
  slug: 'process-mining-vs-task-mining',
  metaTitle: 'Process Mining vs Task Mining: What Is the Difference?',
  metaDescription:
    'Process mining analyzes system event logs; task mining observes screen-level user activity. Compare what each needs, produces, and where they overlap.',
  h1: 'Process mining vs task mining',
  eyebrow: 'Comparison',
  shortAnswer:
    "Process mining reconstructs a process from the timestamped event logs that IT systems already keep, while task mining observes a person's actual screen activity — clicks, keystrokes, app switches — to capture work that never touches a loggable system. Most real processes need both to see the full picture.",
  primaryKeyword: 'process mining vs task mining',
  secondaryKeywords: ['process mining vs task mining difference', 'task mining vs process mining', 'process mining and task mining compared'],
  searchIntent: 'informational',
  tags: ['answer', 'process-mining', 'task-mining', 'comparison', 'glossary'],
  related: ['answer:what-is-process-mining', 'answer:what-is-task-mining', 'answer:what-is-process-intelligence'],
  originalDataPoint:
    "Ledgerium's recordings work like task mining, not process mining: every workflow captures the exact element clicked and the system it occurred in for each step, a level of interface detail no system-log export used for process mining ever contains.",
  mechanismIntro:
    'Ledgerium sits on the task-mining side of this comparison: it records the actual clicks, systems, and timing of a workflow as it happens, which is how it captures cross-application work that a log-based process-mining export would miss.',
  keyTakeaways: [
    'Process mining works from system-generated event logs; task mining works from directly observed screen activity — they capture the process from two different vantage points.',
    'Process mining needs a system that already logs structured, case-identified events. Task mining needs nothing from the underlying systems — it watches the user instead.',
    'Task mining sees cross-application, manual, and ad hoc work that process mining cannot, because that work never produces a loggable event in any single system.',
    'The two techniques are complementary, not competing: mature process-intelligence programs often combine system logs with observed activity for a complete picture.',
  ],
  honestLimitation:
    "Ledgerium's recordings function like task mining — capturing real browser and application activity directly — rather than mining existing system event logs, so it will not surface historical process data from before a workflow was recorded.",
  term: 'Process mining vs task mining',
  definition:
    'Process mining and task mining are two techniques for reconstructing how a business process actually runs, distinguished by their data source: process mining derives the process from timestamped event logs already produced by enterprise systems, while task mining derives it from directly observed user interactions such as clicks, keystrokes, and application switches captured during the work itself.',
  inDepth: [
    {
      heading: 'Where each technique gets its data',
      body: "Process mining's raw material is an event log: a table of case-identified, timestamped records exported from a system like an ERP, a ticketing tool, or a case-management platform. Task mining's raw material is direct observation — software that watches the screen and records clicks, keystrokes, window switches, and field entries as a person actually works, regardless of which systems are involved. That difference in data source is the reason the two techniques see different parts of the same process.",
    },
    {
      heading: 'What each technique is good at',
      body: "Process mining is strong wherever the process already lives inside systems with clean, structured logging — it can process years of historical case data in one export. Task mining is strong wherever the real work is manual, spans multiple unrelated applications, or involves steps — like copying a number from a spreadsheet into a web form — that never generate a loggable event in any single system's log.",
    },
    {
      heading: 'Choosing between them (or using both)',
      body: 'Teams whose process lives mostly inside one well-instrumented system, like a mature ERP, get the most value from process mining. Teams whose process spans multiple systems, involves manual steps, or is not yet well-logged get more value from task mining, because it captures the work directly rather than depending on the systems to have recorded it. Many process-intelligence programs eventually use both: system logs where they exist, and observed activity to fill the gaps.',
    },
  ],
  comparisonTable: {
    itemA: 'Process mining',
    itemB: 'Task mining',
    rows: [
      { label: 'Data source', itemA: 'Timestamped event logs exported from IT systems', itemB: 'Direct observation of screen-level user activity' },
      { label: 'Setup requirement', itemA: 'Systems must already log structured, case-identified events', itemB: 'No system logging required — captured by watching the work' },
      { label: 'Sees cross-application work', itemA: 'No — limited to what one system logs', itemB: 'Yes — captures work across any application the user touches' },
      { label: 'Historical data', itemA: 'Can analyze years of past cases from existing logs', itemB: 'Only sees work recorded going forward' },
      { label: 'Best fit', itemA: 'Processes concentrated in one well-instrumented system', itemB: 'Processes that are manual, cross-application, or ad hoc' },
    ],
  },
  relatedTerms: [
    { term: 'Process mining', slug: 'what-is-process-mining' },
    { term: 'Task mining', slug: 'what-is-task-mining' },
    { term: 'Process intelligence', slug: 'what-is-process-intelligence' },
  ],
  sources: [
    { label: 'Ledgerium AI — Product overview', url: 'https://ledgerium.ai/product', retrievedAt: '2026-07-18' },
    { label: 'Ledgerium AI — Methodology (how we research this)', url: 'https://ledgerium.ai/methodology', retrievedAt: '2026-07-18' },
  ],
  faqs: [
    { q: 'Which is better, process mining or task mining?', a: 'Neither is universally better — they capture different data. Process mining is best where systems already log clean, structured events; task mining is best where the real work is manual or spans multiple systems.' },
    { q: 'Can I use both process mining and task mining together?', a: 'Yes. Many process-intelligence programs combine system-derived event logs with directly observed activity to get a complete picture, using each technique where it is strongest.' },
    { q: 'Does task mining replace process mining?', a: 'No. Task mining fills the gap where process mining cannot see — manual and cross-application work — but it does not replace the years of historical case data a mature system\'s logs can provide.' },
    { q: 'Which technique does Ledgerium use?', a: "Ledgerium's recordings work like task mining: they capture real browser and application activity directly as a workflow happens, rather than mining historical logs from existing systems." },
  ],
  jsonLd: ['Article', 'FAQPage', 'DefinedTerm', 'BreadcrumbList', 'WebPage', 'Organization'],
  author: { name: 'Ledgerium Research Team', sameAs: ['https://www.linkedin.com/company/ledgerium'] },
  updatedAt: '2026-07-18',
  published: true,
};

const whatIsTaskMining: AnswerPage = {
  type: 'answer',
  slug: 'what-is-task-mining',
  metaTitle: 'What Is Task Mining? Definition and How It Works',
  metaDescription:
    'Task mining captures how people actually work by observing screen-level activity — clicks, keystrokes, and app switches. Learn what it captures and why.',
  h1: 'What is task mining?',
  eyebrow: 'Definition',
  shortAnswer:
    "Task mining is the practice of observing a person's real screen-level activity — the clicks, keystrokes, field entries, and application switches — as they perform a piece of work, in order to reconstruct exactly how that work happens, including the manual and cross-application steps that never appear in any system's logs.",
  primaryKeyword: 'task mining',
  secondaryKeywords: ['task mining definition', 'what is task mining software', 'task mining vs process mining'],
  searchIntent: 'informational',
  tags: ['answer', 'task-mining', 'process-intelligence', 'definition', 'glossary'],
  related: ['answer:what-is-process-mining', 'answer:process-mining-vs-task-mining', 'answer:what-is-process-intelligence'],
  originalDataPoint:
    "Ledgerium's task-mining recordings capture the exact element clicked and the system it occurred in for every step, which is what lets a workflow's automation-opportunity score be computed from real repetition patterns rather than a self-reported estimate of how often a task repeats.",
  mechanismIntro:
    "Ledgerium performs task mining by recording the actual clicks, page changes, and timing of a person's browser session as the work happens, then converting that raw activity into a structured, timestamped sequence of steps.",
  keyTakeaways: [
    'Task mining observes the user directly — clicks, keystrokes, and application switches — rather than reading event logs a system already stores.',
    'Because it watches the work itself, task mining captures manual, cross-application, and ad hoc steps that process mining cannot see.',
    'Task mining needs nothing from the underlying systems to already log events — it works even when the systems involved keep no usable logs at all.',
    'The output is typically an ordered sequence of observed actions, which can be grouped into steps and combined with timing to show cycle time and variation.',
  ],
  honestLimitation:
    'Ledgerium observes browser-based work. Actions performed in native desktop applications outside the browser, or entirely on paper, are outside what its recordings can directly capture.',
  term: 'Task mining',
  definition:
    'Task mining is a technique for understanding how work actually gets done by capturing the user-level actions performed during it — mouse clicks, keystrokes, field entries, and switches between applications or browser tabs — and assembling those observed actions into an ordered record of the task as it was really carried out, independent of what any underlying system happens to log.',
  inDepth: [
    {
      heading: 'How task mining captures work',
      body: 'Task mining software runs alongside the person doing the work — as a browser extension, a desktop agent, or similar — and records the interface-level events as they happen: which element was clicked, what was typed, which page or application became active, and when each of these occurred. That raw stream of interface events is then grouped into meaningful steps, so the output is not just a log of clicks but a reconstructed sequence of what the person actually did, in order, with timing attached to each step.',
    },
    {
      heading: 'What task mining sees that process mining cannot',
      body: 'Because task mining observes the interface directly rather than depending on a system to log an event, it captures work that never produces a record anywhere — copying a value between two unrelated tools, checking something in a spreadsheet before continuing in a web form, or working entirely inside an application that keeps no usable audit trail. That is exactly the kind of manual, cross-application work that makes up a large share of real office processes and that log-based process mining cannot observe.',
    },
    {
      heading: 'What task mining is used for',
      body: 'Common uses include building an accurate baseline of how a task is actually performed today, before trying to standardize or automate it; measuring how long a task really takes and where the time and variation come from; and identifying steps that are repetitive enough to be strong robotic-process-automation or AI-automation candidates. In each case, the value comes from observing the work directly instead of relying on a description of how it is supposed to be done.',
    },
  ],
  relatedTerms: [
    { term: 'Process mining', slug: 'what-is-process-mining' },
    { term: 'Process mining vs task mining', slug: 'process-mining-vs-task-mining' },
    { term: 'Process intelligence', slug: 'what-is-process-intelligence' },
  ],
  sources: [
    { label: 'Ledgerium AI — Product overview', url: 'https://ledgerium.ai/product', retrievedAt: '2026-07-18' },
    { label: 'Ledgerium AI — Methodology (how we research this)', url: 'https://ledgerium.ai/methodology', retrievedAt: '2026-07-18' },
  ],
  faqs: [
    { q: 'Is task mining the same as screen recording?', a: 'Not quite. Task mining captures structured, interpretable events — which element was clicked, what was typed, which step occurred — rather than just a video, so the output can be measured, grouped into steps, and compared across runs.' },
    { q: 'Does task mining require IT to set anything up in the source systems?', a: 'No. Because task mining observes the interface directly, it does not depend on the underlying systems already logging events, which is what distinguishes it from process mining.' },
    { q: "What can't task mining see?", a: "Work performed entirely outside the observed surface — for example, in a native desktop app that isn't monitored, or on paper — is not captured, since task mining only sees the interface it is watching." },
    { q: 'How is task mining different from process mining?', a: 'Task mining observes the user\'s real actions directly; process mining reconstructs the process from event logs a system already stores. See our full process mining vs. task mining comparison.' },
  ],
  jsonLd: ['Article', 'FAQPage', 'DefinedTerm', 'BreadcrumbList', 'WebPage', 'Organization'],
  author: { name: 'Ledgerium Research Team', sameAs: ['https://www.linkedin.com/company/ledgerium'] },
  updatedAt: '2026-07-18',
  published: true,
};

const processMapVsFlowchart: AnswerPage = {
  type: 'answer',
  slug: 'process-map-vs-flowchart',
  metaTitle: 'Process Map vs Flowchart: What Is the Real Difference?',
  metaDescription:
    'A flowchart diagrams a sequence of steps and decisions; a process map adds real systems, timing, and variants from how work actually happens. See how.',
  h1: 'Process map vs flowchart',
  eyebrow: 'Comparison',
  shortAnswer:
    'A flowchart is a generic diagram of steps and decision points, usable for any kind of logic. A process map is a flowchart applied specifically to a business process, and — when built from real execution data — it adds the systems each step runs in, how long each step takes, and the variants and exceptions that occurred, not just the intended sequence.',
  primaryKeyword: 'process map vs flowchart',
  secondaryKeywords: ['process map vs flowchart difference', 'what is a process map', 'flowchart vs process map'],
  searchIntent: 'informational',
  tags: ['answer', 'process-map', 'flowchart', 'comparison', 'glossary'],
  related: ['answer:what-is-process-intelligence', 'answer:what-is-cycle-time', 'answer:what-is-a-document-workflow'],
  originalDataPoint:
    'When Ledgerium builds a process map from a recorded workflow, the map routinely surfaces variant paths and rework loops that were not part of the process as anyone described it beforehand — differences that only became visible once the real execution was recorded step by step.',
  mechanismIntro:
    'Ledgerium builds a process map by segmenting a recorded browser session into discrete steps and drawing the sequence, systems, and timing directly from that recording, rather than starting from a hand-drawn flowchart of how the process is supposed to work.',
  keyTakeaways: [
    'A flowchart is a general-purpose diagramming format for any sequence of steps and decisions — it says nothing inherently about systems, timing, or real execution.',
    'A process map applies that same diagram style specifically to a business process, and typically adds context like which system each step runs in.',
    'A hand-drawn process map shows the intended flow; a process map built from recorded execution data shows the real flow, including rework and exceptions a diagram alone would not reveal.',
    'The two terms are often used loosely, but the practical difference that matters is whether the map reflects the process as designed or as it actually ran.',
  ],
  honestLimitation:
    'Ledgerium generates process maps from recorded browser activity, so the map reflects the digital, browser-based portion of a workflow; steps that happen outside the browser are not automatically included.',
  term: 'Process map vs flowchart',
  definition:
    'A flowchart is a general diagramming convention that represents a sequence of steps, decisions, and branches using standardized shapes and connecting arrows, and can represent any kind of logic, not only business processes. A process map is that same diagramming approach applied to a specific business process, and, when generated from real execution data rather than drawn from memory, additionally carries the systems each step touches, the time each step and transition took, and the variants the process actually followed.',
  inDepth: [
    {
      heading: 'What a flowchart is',
      body: 'A flowchart is a diagramming standard — boxes for steps, diamonds for decisions, arrows for flow — that predates and extends well beyond business process work; it is used for algorithms, decision trees, and logic of any kind. On its own, a flowchart carries no information about which system a step happens in, how long it takes, or whether it reflects how work is actually performed versus how it was designed to be performed.',
    },
    {
      heading: 'What a process map adds',
      body: 'A process map takes the same visual grammar as a flowchart but applies it specifically to a business process, and — critically, when it is built from recorded execution data rather than drawn by hand — adds the operational context a plain flowchart lacks: the system or application each step runs in, the time spent in each step and each handoff, the frequency of each path, and the exceptions and rework loops that occurred along the way.',
    },
    {
      heading: 'Designed flow vs. real flow',
      body: 'A flowchart or a hand-drawn process map typically shows the intended, idealized version of a process. A process map generated from real execution data shows the process as it actually ran, which is often meaningfully different — extra approval loops, off-path exceptions, and steps that take far longer than expected are common findings that a diagram of the intended flow would never surface.',
    },
  ],
  comparisonTable: {
    itemA: 'Flowchart',
    itemB: 'Process map (from real data)',
    rows: [
      { label: 'Scope', itemA: 'Any sequence of steps or decisions, not specific to business processes', itemB: 'Specifically models a business process' },
      { label: 'System/tool context', itemA: 'Not included by default', itemB: 'Shows which system or application each step runs in' },
      { label: 'Timing', itemA: 'Not included', itemB: 'Shows time spent per step and per handoff' },
      { label: 'Reflects real execution', itemA: 'Usually hand-drawn from an intended design', itemB: 'Built directly from recorded, real execution when generated from data' },
      { label: 'Shows exceptions and variants', itemA: 'No — typically one idealized path', itemB: 'Yes — shows the paths that actually occurred, including rework' },
    ],
  },
  relatedTerms: [
    { term: 'Process intelligence', slug: 'what-is-process-intelligence' },
    { term: 'Cycle time', slug: 'what-is-cycle-time' },
    { term: 'Document workflow', slug: 'what-is-a-document-workflow' },
  ],
  sources: [
    { label: 'Ledgerium AI — Product overview', url: 'https://ledgerium.ai/product', retrievedAt: '2026-07-18' },
    { label: 'Ledgerium AI — Methodology (how we research this)', url: 'https://ledgerium.ai/methodology', retrievedAt: '2026-07-18' },
  ],
  faqs: [
    { q: 'Is a process map just a fancy flowchart?', a: 'In form, yes — a process map uses the same steps-and-arrows visual grammar as a flowchart. The meaningful difference is content: a process map built from real execution data adds systems, timing, and variants that a plain flowchart does not carry.' },
    { q: 'Do I need software to make a process map, or can I just draw a flowchart?', a: 'You can draw either by hand, but a hand-drawn version only shows the intended flow. A process map built from recorded execution data shows how the process actually ran, which is where most of the useful insight lives.' },
    { q: 'Can a flowchart represent a business process?', a: 'Yes — that is essentially what a process map is. But a flowchart alone, without execution data behind it, only represents the designed sequence, not the real one.' },
    { q: 'Why does it matter whether a process map reflects real execution?', a: 'Because the gaps between the intended flow and the real flow — extra approval loops, exceptions, idle handoffs — are usually where time and money are actually lost, and only a map built from real data can show them.' },
  ],
  jsonLd: ['Article', 'FAQPage', 'DefinedTerm', 'BreadcrumbList', 'WebPage', 'Organization'],
  author: { name: 'Ledgerium Research Team', sameAs: ['https://www.linkedin.com/company/ledgerium'] },
  updatedAt: '2026-07-18',
  published: true,
};

const whatIsAnSop: AnswerPage = {
  type: 'answer',
  slug: 'what-is-an-sop',
  metaTitle: 'What Is an SOP? Standard Operating Procedure Explained',
  metaDescription:
    'An SOP is a written, step-by-step document that defines exactly how a task should be performed. Learn what belongs in one and why they go out of date.',
  h1: 'What is an SOP?',
  eyebrow: 'Definition',
  shortAnswer:
    'A standard operating procedure, or SOP, is a written document that spells out the exact steps someone should follow to complete a specific task the same way every time. Its purpose is consistency — making sure the task produces the same result no matter who performs it, and giving new people a reliable reference for how the work is done.',
  primaryKeyword: 'what is an SOP',
  secondaryKeywords: ['what is a standard operating procedure', 'SOP definition', 'what does SOP mean'],
  searchIntent: 'informational',
  tags: ['answer', 'sop', 'standard-operating-procedure', 'definition', 'glossary'],
  related: ['answer:what-is-a-document-workflow', 'sopTemplate:invoice-approval-sop-template', 'answer:what-is-process-intelligence'],
  originalDataPoint:
    "Ledgerium can generate a draft SOP's procedure section directly from a single recorded run of a task, producing the ordered steps, systems, and timing without anyone having to write the procedure from memory first.",
  mechanismIntro:
    'Ledgerium generates the procedure section of an SOP by converting a recorded workflow into an ordered list of steps with the system and timing for each one, so the document reflects how the task is actually performed rather than a best guess written from memory.',
  keyTakeaways: [
    'An SOP is a step-by-step written procedure for one specific task, meant to make the outcome consistent regardless of who performs it.',
    'SOPs typically include the purpose, who performs the task, the exact steps, and common exceptions — enough detail that someone unfamiliar with the task could follow it.',
    'An SOP describes how a task should be done; it is different from a process map, which shows how a broader process actually runs across steps and systems.',
    'SOPs written from memory tend to drift out of date as the real process changes, unless someone keeps updating them to match reality.',
  ],
  honestLimitation:
    'This page defines what an SOP is. For editable SOP templates for specific tasks, and for how Ledgerium generates an SOP from a recorded workflow, see the SOP template library rather than this definitional page.',
  term: 'Standard operating procedure (SOP)',
  definition:
    'A standard operating procedure (SOP) is a formal, written document that defines a fixed, repeatable set of steps for completing a specific task or process, along with the roles responsible for it, the scope it applies to, and the exceptions it needs to handle. Its purpose is to make the outcome of that task consistent and predictable, whoever performs it, by removing ambiguity about exactly what to do.',
  inDepth: [
    {
      heading: 'What typically goes in an SOP',
      body: 'Most SOPs share a common shape: a stated purpose explaining why the procedure exists, the scope of what it does and does not cover, the roles or job titles responsible for carrying it out, the ordered steps themselves, the exceptions or edge cases the person should watch for, and often a record of when the document was last reviewed. The exact sections vary by organization and by task, but the goal across all of them is the same — remove ambiguity about what to do.',
    },
    {
      heading: 'Why organizations use SOPs',
      body: "SOPs exist to make a task's outcome independent of who performs it: a documented, agreed-upon procedure means a new hire, a temporary cover, or an auditor can all expect the same result, instead of the outcome depending on one person's memory or judgment. This matters most for tasks with real consequences for getting a step wrong — compliance-sensitive work, financial approvals, and anything customer-facing — where consistency is the point, not just convenience.",
    },
    {
      heading: 'Why SOPs go stale',
      body: 'An SOP is a snapshot of how a task was performed at the moment it was written. Processes drift over time — a new system gets added, a step gets skipped in practice, an exception becomes the common case — and unless someone actively keeps the document in sync with the real process, the written procedure and the actual work quietly diverge. That gap is one reason SOPs generated directly from a recorded execution of the task, rather than written from memory, tend to stay closer to what people actually do.',
    },
  ],
  relatedTerms: [
    { term: 'Document workflow', slug: 'what-is-a-document-workflow' },
    { term: 'Process intelligence', slug: 'what-is-process-intelligence' },
  ],
  sources: [
    { label: 'Ledgerium AI — Product overview', url: 'https://ledgerium.ai/product', retrievedAt: '2026-07-18' },
    { label: 'Ledgerium AI — SOP template library', url: 'https://ledgerium.ai/sop-templates', retrievedAt: '2026-07-18' },
  ],
  faqs: [
    { q: 'What does SOP stand for?', a: 'SOP stands for standard operating procedure — a written, step-by-step document describing how a specific task should be performed.' },
    { q: "What's the difference between an SOP and a process map?", a: 'An SOP is a written procedure for a single task, focused on the steps someone should follow. A process map is typically broader, showing how an end-to-end process actually runs, including systems, timing, and variants.' },
    { q: 'Do SOPs need to be updated?', a: "Yes. A process tends to drift from how it was documented as systems and habits change, so an SOP that isn't kept in sync with the real work becomes inaccurate over time." },
    { q: 'Where can I get an SOP template for a specific task?', a: 'See the SOP template library for editable, ready-to-use templates for common tasks like invoice approval, customer onboarding, and expense reporting.' },
  ],
  jsonLd: ['Article', 'FAQPage', 'DefinedTerm', 'BreadcrumbList', 'WebPage', 'Organization'],
  author: { name: 'Ledgerium Research Team', sameAs: ['https://www.linkedin.com/company/ledgerium'] },
  updatedAt: '2026-07-18',
  published: true,
};

const whatIsADocumentWorkflow: AnswerPage = {
  type: 'answer',
  slug: 'what-is-a-document-workflow',
  metaTitle: 'What Is a Document Workflow? Definition and Examples',
  metaDescription:
    'A document workflow is the sequence of steps a document moves through — creation, review, approval, storage — across the people and systems involved.',
  h1: 'What is a document workflow?',
  eyebrow: 'Definition',
  shortAnswer:
    'A document workflow is the sequence of steps a document moves through from creation to its final state — being drafted, reviewed, edited, approved, signed, filed, or shared — along with the people and systems involved at each step. It describes the path a document takes through a process, not the content of the document itself.',
  primaryKeyword: 'what is a document workflow',
  secondaryKeywords: ['document workflow definition', 'document workflow examples', 'document workflow meaning'],
  searchIntent: 'informational',
  tags: ['answer', 'document-workflow', 'process', 'definition', 'glossary'],
  related: ['answer:what-is-an-sop', 'problem:how-to-document-a-business-process', 'answer:what-is-cycle-time'],
  originalDataPoint:
    'In Ledgerium recordings of document-centric workflows, a significant share of total elapsed time is typically the document sitting untouched between handoffs — in an inbox or approval queue — rather than time spent actively working on it.',
  mechanismIntro:
    'Ledgerium reconstructs a document workflow by recording each step a person takes as a document moves through its path — where it is opened, edited, sent for approval, and filed — and turning that recording into an ordered map of the real flow.',
  keyTakeaways: [
    'A document workflow is the path a document takes through a process — draft, review, approval, storage — not the content of the document itself.',
    'Most document workflows involve handoffs between people and multiple systems: a drafting tool, an email inbox, an approval system, a storage location.',
    'The steps a document workflow is supposed to follow and the steps it actually follows in practice often diverge, especially around approvals and exceptions.',
    'Document workflows are common across departments — invoices, contracts, expense reports, and onboarding paperwork are all examples of a document moving through a defined path.',
  ],
  honestLimitation:
    'This page defines what a document workflow is. For the concrete steps involved in documenting one, see the how-to guide on documenting a business process rather than this definitional page.',
  term: 'Document workflow',
  definition:
    'A document workflow is the defined or observed sequence of steps a specific document passes through as it moves from creation to its final disposition — such as being drafted, reviewed, revised, approved, signed, and archived — together with the people responsible for each step and the systems or tools each step happens in. It describes the document\'s path through a process, distinct from the document\'s own content or format.',
  inDepth: [
    {
      heading: 'What moves through a document workflow',
      body: 'A document workflow can apply to almost any document that has to pass through more than one hand before it reaches its final state: an invoice moving from receipt to approval to payment, a contract moving from drafting to legal review to signature, an expense report moving from submission to manager approval to reimbursement. In each case, the document itself is fairly static — the workflow is the sequence of steps and handoffs it goes through around that document.',
    },
    {
      heading: 'The systems and handoffs involved',
      body: 'Document workflows rarely stay inside a single tool. A typical example touches an email inbox, a shared drive or document-management system, a review or approval tool, and sometimes a signature platform, with the document — or a link to it — moving between them at each handoff. Each handoff is a point where the document can wait, get lost, or diverge from the intended path, which is part of why document workflows are a common source of process delay.',
    },
    {
      heading: 'Designed workflow vs. real workflow',
      body: 'The document workflow that is supposed to happen — as described in a policy or a diagram — and the one that actually happens are often different in practice: an approval step gets skipped when someone is out, a document sits in an inbox for days before anyone notices, or a required review gets done after the fact instead of before. Seeing the real workflow, not just the intended one, is usually the starting point for fixing where a document process is actually losing time.',
    },
  ],
  relatedTerms: [
    { term: 'Standard operating procedure', slug: 'what-is-an-sop' },
    { term: 'Cycle time', slug: 'what-is-cycle-time' },
  ],
  sources: [
    { label: 'Ledgerium AI — Product overview', url: 'https://ledgerium.ai/product', retrievedAt: '2026-07-18' },
    { label: 'Ledgerium AI — Methodology (how we research this)', url: 'https://ledgerium.ai/methodology', retrievedAt: '2026-07-18' },
  ],
  faqs: [
    { q: "What's an example of a document workflow?", a: 'An invoice moving from receipt, to manager approval, to accounts-payable processing, to payment is a document workflow. So is a contract moving through drafting, legal review, and signature.' },
    { q: 'Is a document workflow the same as a business process?', a: 'A document workflow is usually a specific kind of business process — one centered on a document moving through steps and handoffs — rather than a separate category. Not every business process involves a document.' },
    { q: 'How do I document a document workflow?', a: 'Start by tracing an actual document through its real path — who touches it, in what system, and in what order — rather than the intended path. See our how-to guide on documenting a business process for the concrete steps.' },
    { q: 'Why do document workflows tend to run slower than expected?', a: 'Handoffs are the usual cause: a document waiting in someone\'s inbox, sitting in a queue for approval, or being routed to the wrong person are common sources of delay that are easy to miss until the real workflow is traced.' },
  ],
  jsonLd: ['Article', 'FAQPage', 'DefinedTerm', 'BreadcrumbList', 'WebPage', 'Organization'],
  author: { name: 'Ledgerium Research Team', sameAs: ['https://www.linkedin.com/company/ledgerium'] },
  updatedAt: '2026-07-18',
  published: true,
};

const whatIsCycleTime: AnswerPage = {
  type: 'answer',
  slug: 'what-is-cycle-time',
  metaTitle: "What Is Cycle Time? Definition and How It's Measured",
  metaDescription:
    "Cycle time is the elapsed time from when a process starts to when it finishes. Learn what it includes, how it's measured, and why wait time matters.",
  h1: 'What is cycle time?',
  eyebrow: 'Definition',
  shortAnswer:
    "Cycle time is the total elapsed time it takes for a process to run from its starting point to its finish — the sum of both the time actively spent working on it and the time it spends waiting between steps. It's usually measured directly from timestamped records of when each step started and ended, not estimated.",
  primaryKeyword: 'what is cycle time',
  secondaryKeywords: ['cycle time definition', 'how is cycle time measured', 'cycle time vs process time'],
  searchIntent: 'informational',
  tags: ['answer', 'cycle-time', 'metrics', 'definition', 'glossary'],
  related: ['answer:what-is-process-intelligence', 'answer:process-map-vs-flowchart', 'answer:what-is-a-document-workflow'],
  originalDataPoint:
    "Across Ledgerium recordings, breaking cycle time down step by step routinely shows that a small number of handoffs — not the number of steps — account for most of a process's total elapsed time.",
  mechanismIntro:
    'Ledgerium computes cycle time by timestamping the start and end of every step in a recorded workflow run and summing the elapsed time across the full sequence, so the figure comes directly from real execution rather than a manual estimate.',
  keyTakeaways: [
    'Cycle time is the full elapsed time from the start of a process to its finish, including both active work and idle wait time between steps.',
    'Cycle time is different from active work time: a process can have low active effort but a long cycle time if it spends most of its elapsed time waiting.',
    'Accurate cycle time needs a timestamp for when each step actually started and ended — estimates based on memory tend to understate wait time significantly.',
    'Breaking cycle time down by step usually reveals that a small number of steps or handoffs account for most of the total elapsed time.',
  ],
  honestLimitation:
    'Ledgerium measures cycle time from the timestamps in a recorded workflow, so the figure reflects the runs that were actually recorded; it does not retroactively estimate cycle time for work that happened before recording began.',
  term: 'Cycle time',
  definition:
    'Cycle time is the total elapsed time between the start of a process instance and its completion, measured end to end and including every phase in between — both the time actively spent performing steps and the time the process instance spends waiting, whether that is an item sitting in a queue, waiting for approval, or idle between handoffs. It is distinct from active work time, which counts only the effort directly applied to the task.',
  inDepth: [
    {
      heading: 'What counts toward cycle time',
      body: 'Cycle time covers the entire span from when a process instance begins to when it finishes, not just the parts where someone is actively working on it. That means it includes time spent waiting for an approval, sitting in a queue behind other work, or being idle between one handoff and the next. Because wait time is so often the larger share of the total, a process can look efficient when measured only by active effort and still have a long cycle time overall.',
    },
    {
      heading: 'How cycle time is measured',
      body: "Cycle time is measured by recording the timestamp at which a process instance starts and the timestamp at which it ends, then taking the difference; breaking it down further means capturing a timestamp at the start and end of each individual step, so the total can be attributed across the steps and handoffs that make it up. The reliability of the measurement depends entirely on the timestamps being accurate and complete — cycle times estimated from memory or from a rough sense of 'usually a few days' tend to significantly understate how much time is actually spent waiting.",
    },
    {
      heading: 'Why cycle time matters',
      body: 'Cycle time is one of the clearest signals of where a process is actually losing time, because breaking it down by step routinely shows that the total is dominated by one or two slow handoffs rather than being spread evenly across the whole process. That makes it a natural starting point for improvement work: instead of guessing where a process is slow, a step-by-step cycle-time breakdown points directly at the handoff or approval step that is responsible for most of the delay.',
    },
  ],
  relatedTerms: [
    { term: 'Process intelligence', slug: 'what-is-process-intelligence' },
    { term: 'Process map vs flowchart', slug: 'process-map-vs-flowchart' },
    { term: 'Document workflow', slug: 'what-is-a-document-workflow' },
  ],
  sources: [
    { label: 'Ledgerium AI — Product overview', url: 'https://ledgerium.ai/product', retrievedAt: '2026-07-18' },
    { label: 'Ledgerium AI — Methodology (how we research this)', url: 'https://ledgerium.ai/methodology', retrievedAt: '2026-07-18' },
  ],
  faqs: [
    { q: 'Is cycle time the same as active work time?', a: 'No. Cycle time includes the full elapsed time, including waiting and idle periods between steps. Active work time only counts the time someone is directly working on the task, which is usually a small fraction of total cycle time.' },
    { q: "What's a good cycle time?", a: "It depends entirely on the process — there's no universal target. The more useful question is usually how a process's current cycle time compares to its own history, and which specific steps account for most of it." },
    { q: 'How do you reduce cycle time?', a: 'The first step is usually identifying which steps or handoffs account for most of the elapsed time, since cycle time is rarely spread evenly across a process — a small number of slow handoffs is a common finding.' },
    { q: 'Do you need special tools to measure cycle time accurately?', a: 'You need a timestamp for when each step actually starts and ends. Manual estimates tend to understate cycle time because people notice active work far more easily than idle wait time.' },
  ],
  jsonLd: ['Article', 'FAQPage', 'DefinedTerm', 'BreadcrumbList', 'WebPage', 'Organization'],
  author: { name: 'Ledgerium Research Team', sameAs: ['https://www.linkedin.com/company/ledgerium'] },
  updatedAt: '2026-07-18',
  published: true,
};

export const ANSWER_PAGES: readonly AnswerPage[] = [
  whatIsProcessIntelligence,
  whatIsProcessMining,
  processMiningVsTaskMining,
  whatIsTaskMining,
  processMapVsFlowchart,
  whatIsAnSop,
  whatIsADocumentWorkflow,
  whatIsCycleTime,
];
