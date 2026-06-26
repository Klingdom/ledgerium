import type { ProblemPage } from '../types';

/** Problem pages. Top-of-funnel, informational "how to" intent — answer-first. */

const documentProcess: ProblemPage = {
  type: 'problem',
  slug: 'how-to-document-a-business-process',
  metaTitle: 'How to Document a Business Process (Step by Step)',
  metaDescription:
    'The fastest way to document a business process is to record the real workflow once, turn it into an SOP and process map, and review it with the process owner.',
  h1: 'How to document a business process',
  eyebrow: 'Problem',
  shortAnswer:
    'The fastest way to document a business process is to record someone performing the real workflow, convert the recording into a step-by-step SOP, create a process map, review it with the process owner, and update it whenever the process changes. Documenting from memory is what makes SOPs incomplete and quickly outdated. Ledgerium AI automates the slow part by turning a browser workflow recording into an SOP, a process map, and a workflow intelligence report, so the documentation reflects how the work actually happens rather than how someone remembers it.',
  primaryKeyword: 'how to document a business process',
  secondaryKeywords: ['document a process', 'business process documentation', 'process documentation steps'],
  searchIntent: 'informational',
  tags: ['problem', 'documentation', 'sop', 'process-mapping'],
  related: ['problem:how-to-create-sops-automatically', 'persona:operations-managers', 'compare:manual-sop-documentation'],
  originalDataPoint:
    'Recording a process captures the steps between systems, the lookups, copies, and manual checks, that interviews miss. These in-between steps are usually where the undocumented work and rework actually live.',
  honestLimitation:
    'Ledgerium documents browser-based work. Steps done in desktop software or offline still need a person to add context to the recording.',
  whyItHappens:
    'Process documentation goes stale because it is written from memory at a single point in time. The author records an idealized version, misses the exceptions and workarounds, and the document drifts from reality the moment the process changes.',
  diagnostic: [
    'New hires ask questions the SOP should already answer',
    'People follow a different process than the document describes',
    'The documentation has not been updated since it was first written',
  ],
  manualApproach:
    'Interview the people who run the process, write up the steps, draw a flowchart, circulate it for review, and repeat the interviews whenever something changes. It is slow, depends on recall, and the result is out of date almost immediately.',
  ledgeriumApproach:
    'Record the real workflow once as someone performs it. Ledgerium generates the SOP and the process map from the recording, including the exceptions and the system steps, and re-recording after a change regenerates the documentation instead of requiring a rewrite.',
  steps: [
    { title: 'Pick one real process', detail: 'Choose a specific, repeatable workflow and a person who runs it well.' },
    { title: 'Record it as it happens', detail: 'Capture the real run in the browser, including the steps between systems.' },
    { title: 'Generate the SOP and map', detail: 'Turn the recording into a step-by-step SOP and a process map.' },
    { title: 'Review with the owner', detail: 'Have the process owner confirm the steps and add any offline context.' },
    { title: 'Keep it current', detail: 'Re-record when the process changes so the documentation stays accurate.' },
  ],
  commonMistakes: [
    'Documenting the happy path and omitting exceptions and workarounds',
    'Writing from memory instead of from a real run of the process',
    'Treating documentation as one-time instead of keeping it current',
  ],
  faqs: [
    {
      q: 'What is the fastest way to document a business process?',
      a: 'Record the real workflow once as someone performs it, then generate a step-by-step SOP and a process map from the recording and review it with the process owner. This captures the real steps without rounds of interviews.',
    },
    {
      q: 'Why do process documents become outdated?',
      a: 'Because they are written from memory at one point in time. They miss exceptions and workarounds and drift from reality as soon as the process changes. Recording the process keeps the documentation tied to how work is actually done.',
    },
    {
      q: 'Do I need to interview everyone to document a process?',
      a: 'No. Recording the process once captures the real steps, including the workarounds people forget to mention, so you avoid reconstructing the process through a series of interviews.',
    },
    {
      q: 'What should good process documentation include?',
      a: 'The real step sequence, the systems involved, decision points and exceptions, and a way to keep it current. An SOP plus a process map generated from a real recording covers these without guesswork.',
    },
    {
      q: 'How do I keep the documentation up to date?',
      a: 'Re-record the process when it changes. With Ledgerium, that regenerates the SOP and process map, rather than requiring someone to manually rewrite the document.',
    },
  ],
  jsonLd: ['Article', 'HowTo', 'FAQPage', 'BreadcrumbList', 'WebPage', 'Organization'],
  author: { name: 'Ledgerium Research Team', sameAs: ['https://www.linkedin.com/company/ledgerium'] },
  updatedAt: '2026-06-26',
  published: true,
};

const createSops: ProblemPage = {
  type: 'problem',
  slug: 'how-to-create-sops-automatically',
  metaTitle: 'How to Create SOPs Automatically From Real Work',
  metaDescription:
    'Create SOPs automatically by recording a real workflow and generating the procedure from it, so the SOP reflects the actual steps, not memory.',
  h1: 'How to create SOPs automatically',
  eyebrow: 'Problem',
  shortAnswer:
    'To create SOPs automatically, record the real workflow as someone performs it and generate the procedure from the recording instead of writing it by hand. The recording captures the actual clicks, inputs, and decisions, so the SOP reflects the real process rather than a remembered version. Ledgerium AI does this by turning a browser workflow recording into a step-by-step SOP, a process map, and an intelligence report, then regenerating the SOP when the process changes, so it stays accurate without a manual rewrite.',
  primaryKeyword: 'how to create SOPs automatically',
  secondaryKeywords: ['auto generate SOP', 'automatic SOP creation', 'generate SOP from recording'],
  searchIntent: 'informational',
  tags: ['problem', 'sop', 'documentation', 'automation'],
  related: ['problem:how-to-document-a-business-process', 'compare:tango', 'persona:operations-managers'],
  originalDataPoint:
    'Because the SOP is generated from a recording, updating it after a process change is a re-record, not a rewrite. The manual equivalent is editing a document by hand every time the process drifts.',
  honestLimitation:
    'A generated SOP is an accurate draft of the observed steps. A process owner should still review it to add rationale, approvals, and any offline context.',
  whyItHappens:
    'Writing SOPs by hand is slow and the result reflects what the author remembers, not what the team does. So SOPs are either never written or written once and left to rot, and people fall back on the real, undocumented process.',
  diagnostic: [
    'You have a backlog of processes that should be documented but are not',
    'Existing SOPs are written but nobody trusts or follows them',
    'Updating an SOP after a change never actually happens',
  ],
  manualApproach:
    'Sit with an expert, take notes, write the steps, format the document, add screenshots, and circulate it. Each SOP takes hours, and keeping a library of them current is a job nobody has time for.',
  ledgeriumApproach:
    'Record the workflow once. Ledgerium generates the SOP from the real steps automatically, with the systems and decision points included, and regenerates it from a new recording when the process changes.',
  steps: [
    { title: 'Record the workflow', detail: 'Perform the process once in the browser while Ledgerium records it.' },
    { title: 'Generate the SOP', detail: 'Ledgerium turns the recording into a step-by-step procedure automatically.' },
    { title: 'Review and annotate', detail: 'A process owner confirms the steps and adds rationale or offline context.' },
    { title: 'Share and reuse', detail: 'Publish the SOP for the team and reuse it for onboarding and training.' },
    { title: 'Regenerate on change', detail: 'Re-record when the process changes to refresh the SOP automatically.' },
  ],
  commonMistakes: [
    'Hand-writing SOPs that go stale before anyone uses them',
    'Skipping the owner review that adds rationale and approvals',
    'Capturing only the canned steps and not the real decision points',
  ],
  faqs: [
    {
      q: 'Can you really generate an SOP automatically?',
      a: 'Yes. Recording a real workflow captures the actual steps, and Ledgerium generates a step-by-step SOP from that recording. You get an accurate draft without writing the procedure by hand.',
    },
    {
      q: 'How is an auto-generated SOP different from a written one?',
      a: 'A written SOP reflects the author’s memory; an auto-generated one reflects the recorded work, including the real clicks, inputs, and decisions. It is more accurate and faster to keep current.',
    },
    {
      q: 'Do I still need to review the generated SOP?',
      a: 'Yes. The generated SOP is an accurate draft of the observed steps. A process owner should review it to add rationale, approvals, and any context that happens off-screen.',
    },
    {
      q: 'How do auto-generated SOPs stay up to date?',
      a: 'Re-record the process after a change and the SOP regenerates from the new recording, so updating is a quick re-record rather than a manual document edit.',
    },
    {
      q: 'What processes work best for automatic SOPs?',
      a: 'Repeatable, browser-based workflows with clear steps, such as approvals, onboarding, and back-office routines, are the strongest fit because the real steps are easy to capture in a recording.',
    },
  ],
  jsonLd: ['Article', 'HowTo', 'FAQPage', 'BreadcrumbList', 'WebPage', 'Organization'],
  author: { name: 'Ledgerium Research Team', sameAs: ['https://www.linkedin.com/company/ledgerium'] },
  updatedAt: '2026-06-26',
  published: true,
};

const aiOpportunities: ProblemPage = {
  type: 'problem',
  slug: 'how-to-identify-ai-automation-opportunities',
  metaTitle: 'How to Identify AI Automation Opportunities',
  metaDescription:
    'Identify AI automation opportunities by recording how a process really runs, then scoring the repetitive, rule-based steps where AI can help.',
  h1: 'How to identify AI automation opportunities',
  eyebrow: 'Problem',
  shortAnswer:
    'To identify AI automation opportunities, document how a process really runs, then look for steps that are repetitive, rule-based, and high-volume, where AI or automation can help, while keeping humans on judgment and exceptions. You cannot automate what you have not measured, so start by recording the real workflow. Ledgerium AI records the process, then produces a report that scores where time is spent, which steps repeat, and which are the strongest automation candidates, so the decision is based on observed work rather than a guess.',
  primaryKeyword: 'how to identify AI automation opportunities',
  secondaryKeywords: ['find automation opportunities', 'AI automation candidates', 'where to use AI in a process'],
  searchIntent: 'informational',
  tags: ['problem', 'ai', 'automation', 'process-intelligence'],
  related: ['problem:how-to-find-process-waste', 'persona:process-excellence-leads', 'workflow:invoice-approval-workflow'],
  originalDataPoint:
    'Ledgerium scores automation candidates from the recorded process by combining how often a step repeats with how much time it takes, so the highest-value candidate is identified from observed data rather than from opinion.',
  honestLimitation:
    'Ledgerium surfaces and scores opportunities from observed browser work. Deciding what to actually automate still needs human judgment about risk and exceptions.',
  whyItHappens:
    'Teams pick automation targets from opinion and visibility, not data, so they automate the loud task instead of the costly one. Without a measured baseline, the steps that quietly consume the most time stay invisible.',
  diagnostic: [
    'Automation ideas come from whoever complains loudest, not from data',
    'Nobody can say which step actually consumes the most time',
    'Past automation efforts targeted the wrong part of the process',
  ],
  manualApproach:
    'Run workshops, ask people which tasks feel repetitive, and build a list from intuition. The list reflects what is annoying rather than what is expensive, and the strongest candidates are often missed.',
  ledgeriumApproach:
    'Record the real process. Ledgerium scores each step on repetition and time, separates work from wait, and flags the repetitive, rule-based steps that are the strongest AI and automation candidates, with the evidence to back the choice.',
  steps: [
    { title: 'Record the process', detail: 'Capture a real run of the workflow you want to evaluate.' },
    { title: 'Review the report', detail: 'See where time is spent and which steps repeat across runs.' },
    { title: 'Find the candidates', detail: 'Identify repetitive, rule-based, high-volume steps suited to AI or automation.' },
    { title: 'Keep humans on judgment', detail: 'Reserve exceptions and decisions for people, not automation.' },
    { title: 'Measure the change', detail: 'Re-record after automating to confirm the time saved.' },
  ],
  commonMistakes: [
    'Automating the loudest task instead of the most costly one',
    'Picking targets from opinion without a measured baseline',
    'Automating steps that still need human judgment',
  ],
  faqs: [
    {
      q: 'How do I find AI automation opportunities in a process?',
      a: 'Record how the process really runs, then look for repetitive, rule-based, high-volume steps. Ledgerium scores these from the recording so the strongest candidates are identified from data, not opinion.',
    },
    {
      q: 'Which steps are good candidates for AI or automation?',
      a: 'Repetitive, rule-based, high-volume steps with clear inputs and outputs. Steps that require judgment, handle exceptions, or carry high risk should keep a human involved.',
    },
    {
      q: 'Why measure before automating?',
      a: 'Because you cannot automate what you have not measured. A recorded baseline shows which step actually consumes the most time, so you target the costly work rather than the merely annoying work.',
    },
    {
      q: 'Where should humans stay involved?',
      a: 'On exceptions, judgment calls, and anything high-risk. Automation handles the repetitive, rule-based steps; people handle the cases that do not fit the rules.',
    },
    {
      q: 'How do I prove an automation worked?',
      a: 'Re-record the process after the change. Comparing it to the baseline shows the reduction in time and steps, which makes the impact concrete.',
    },
  ],
  jsonLd: ['Article', 'HowTo', 'FAQPage', 'BreadcrumbList', 'WebPage', 'Organization'],
  author: { name: 'Ledgerium Research Team', sameAs: ['https://www.linkedin.com/company/ledgerium'] },
  updatedAt: '2026-06-26',
  published: true,
};

const reduceOnboarding: ProblemPage = {
  type: 'problem',
  slug: 'how-to-reduce-onboarding-time',
  metaTitle: 'How to Reduce Onboarding Time for New Hires',
  metaDescription:
    'Reduce onboarding time by giving new hires SOPs generated from real work, so they follow how the job is actually done instead of learning by trial and error.',
  h1: 'How to reduce onboarding time',
  eyebrow: 'Problem',
  shortAnswer:
    'To reduce onboarding time, give new hires documentation generated from how the job is actually done, not idealized procedures or trial-and-error shadowing. New hires are slow when the real process lives in people’s heads and the SOPs do not match reality. Ledgerium AI records the real workflows and turns them into SOPs and process maps new hires can follow step by step, including the exceptions, so they reach productivity faster and ask fewer repeat questions, while freeing experienced staff from constant interruptions.',
  primaryKeyword: 'how to reduce onboarding time',
  secondaryKeywords: ['speed up onboarding', 'reduce ramp time', 'onboarding documentation'],
  searchIntent: 'informational',
  tags: ['problem', 'onboarding', 'documentation', 'training'],
  related: ['problem:how-to-capture-tribal-knowledge', 'persona:operations-managers', 'workflow:customer-onboarding-workflow'],
  originalDataPoint:
    'Because Ledgerium captures the real steps including exceptions, new hires follow what the job actually requires rather than a happy-path document, which removes most of the trial-and-error that slows ramp time.',
  honestLimitation:
    'Generated SOPs cover the observed browser steps. Judgment, culture, and offline context still need a person to teach.',
  whyItHappens:
    'Onboarding is slow because the real process is undocumented and the existing SOPs describe an ideal that no one follows. New hires learn by shadowing and trial and error, which is inconsistent and pulls experienced staff away from their work.',
  diagnostic: [
    'New hires take months to reach full productivity',
    'Experienced staff are constantly interrupted with the same questions',
    'Every new hire learns the job slightly differently',
  ],
  manualApproach:
    'Pair the new hire with an experienced colleague and hope they absorb the process by watching. It works eventually but is slow, inconsistent, and expensive in senior time.',
  ledgeriumApproach:
    'Record the key workflows and turn them into SOPs and process maps. New hires follow documentation generated from real work, including the exceptions, so they ramp faster and rely less on interrupting colleagues.',
  steps: [
    { title: 'Record the core workflows', detail: 'Capture the processes a new hire must learn, as experts run them.' },
    { title: 'Generate SOPs and maps', detail: 'Turn the recordings into step-by-step SOPs and process maps.' },
    { title: 'Build an onboarding path', detail: 'Sequence the SOPs into the order a new hire should learn them.' },
    { title: 'Let new hires self-serve', detail: 'New hires follow the SOPs and ask only the genuinely judgment questions.' },
    { title: 'Refresh as work changes', detail: 'Re-record when a process changes so the onboarding stays accurate.' },
  ],
  commonMistakes: [
    'Relying on shadowing instead of documented, repeatable steps',
    'Handing new hires SOPs that do not match the real process',
    'Letting onboarding material go stale after the first cohort',
  ],
  faqs: [
    {
      q: 'How can I reduce onboarding time?',
      a: 'Give new hires SOPs generated from real work so they follow how the job is actually done. Recording the key workflows turns expert knowledge into step-by-step documentation that removes most trial-and-error.',
    },
    {
      q: 'Why do new hires take so long to ramp?',
      a: 'Because the real process is undocumented and existing SOPs do not match reality, so new hires learn by shadowing and guesswork. Documentation generated from real work shortens that.',
    },
    {
      q: 'How is this better than shadowing?',
      a: 'Shadowing is slow, inconsistent, and consumes senior time. SOPs generated from real recordings are repeatable, consistent across hires, and free experienced staff from constant interruptions.',
    },
    {
      q: 'Does it capture exceptions, not just the happy path?',
      a: 'Yes. Recording the real workflow captures the exceptions and workarounds, which is exactly the knowledge new hires usually have to learn the hard way.',
    },
    {
      q: 'How do I keep onboarding material current?',
      a: 'Re-record a workflow when it changes and regenerate the SOP, so the onboarding path stays accurate for every new cohort.',
    },
  ],
  jsonLd: ['Article', 'HowTo', 'FAQPage', 'BreadcrumbList', 'WebPage', 'Organization'],
  author: { name: 'Ledgerium Research Team', sameAs: ['https://www.linkedin.com/company/ledgerium'] },
  updatedAt: '2026-06-26',
  published: true,
};

const tribalKnowledge: ProblemPage = {
  type: 'problem',
  slug: 'how-to-capture-tribal-knowledge',
  metaTitle: 'How to Capture Tribal Knowledge Before It Leaves',
  metaDescription:
    'Capture tribal knowledge by recording how experts actually do the work, turning what lives in their heads into SOPs and process maps before they leave.',
  h1: 'How to capture tribal knowledge',
  eyebrow: 'Problem',
  shortAnswer:
    'To capture tribal knowledge, record how your experts actually perform their key processes and turn those recordings into SOPs and process maps before the knowledge walks out the door. Tribal knowledge is risky because it lives in one person’s head and disappears when they leave. Ledgerium AI records the real workflow, including the shortcuts and exceptions experts take without thinking, and generates documentation from it, so the process survives the person and the organization keeps what it knows.',
  primaryKeyword: 'how to capture tribal knowledge',
  secondaryKeywords: ['document tribal knowledge', 'knowledge transfer process', 'capture expert knowledge'],
  searchIntent: 'informational',
  tags: ['problem', 'tribal-knowledge', 'documentation', 'knowledge-transfer'],
  related: ['problem:how-to-document-a-business-process', 'persona:ma-integration-leads', 'workflow:month-end-close-workflow'],
  originalDataPoint:
    'Experts perform shortcuts and exception handling automatically and rarely think to mention them in an interview. Ledgerium records those steps as they happen, so the captured knowledge includes the parts the expert would never have described.',
  honestLimitation:
    'Recording captures what the expert does in the browser. The why behind a judgment call still needs the expert to explain it as a note.',
  whyItHappens:
    'Tribal knowledge accumulates because experts are too busy to document and because much of what they know is automatic and hard to articulate. When they leave or change roles, the organization loses processes it cannot reconstruct.',
  diagnostic: [
    'One person is the only one who knows how a critical process works',
    'You worry about what happens when a key employee leaves',
    'Past departures left processes broken or guessed at',
  ],
  manualApproach:
    'Schedule knowledge-transfer interviews and ask the expert to write everything down. They forget the automatic steps, run out of time, and the document captures only the parts that were easy to articulate.',
  ledgeriumApproach:
    'Have the expert record their key processes as they run them. Ledgerium captures the real steps, including the automatic shortcuts and exception handling, and generates SOPs and process maps that outlast the person.',
  steps: [
    { title: 'Identify the at-risk processes', detail: 'Find the workflows only one or two people truly know.' },
    { title: 'Record the expert at work', detail: 'Capture the expert running each process the way they actually do.' },
    { title: 'Generate the documentation', detail: 'Turn the recordings into SOPs and process maps.' },
    { title: 'Add the why', detail: 'Have the expert annotate the judgment calls the recording cannot explain.' },
    { title: 'Store and share', detail: 'Keep the documentation where the team can find and reuse it.' },
  ],
  commonMistakes: [
    'Relying on interviews that miss the automatic steps',
    'Waiting until someone gives notice to start capturing',
    'Documenting the steps but not the reasoning behind them',
  ],
  faqs: [
    {
      q: 'What is the best way to capture tribal knowledge?',
      a: 'Record how the expert actually performs the process, then generate SOPs and process maps from the recording. This captures the automatic shortcuts and exceptions that interviews miss.',
    },
    {
      q: 'Why do interviews miss tribal knowledge?',
      a: 'Much of an expert’s knowledge is automatic and hard to articulate, so they forget to mention it. Recording the real work captures those steps directly instead of relying on recall.',
    },
    {
      q: 'When should we capture tribal knowledge?',
      a: 'Before you need to. Waiting until someone gives notice leaves no time. Recording key processes while experts are still in role removes the risk of losing the knowledge.',
    },
    {
      q: 'Does recording capture the reasoning, not just the steps?',
      a: 'It captures the steps precisely. The reasoning behind judgment calls still benefits from a short annotation by the expert, which the recording makes easy to attach to the right step.',
    },
    {
      q: 'How does this reduce key-person risk?',
      a: 'Once a process is recorded and documented, it no longer depends on one person’s memory, so the organization keeps the knowledge even if that person leaves.',
    },
  ],
  jsonLd: ['Article', 'HowTo', 'FAQPage', 'BreadcrumbList', 'WebPage', 'Organization'],
  author: { name: 'Ledgerium Research Team', sameAs: ['https://www.linkedin.com/company/ledgerium'] },
  updatedAt: '2026-06-26',
  published: true,
};

const currentStateMaps: ProblemPage = {
  type: 'problem',
  slug: 'how-to-create-current-state-process-maps',
  metaTitle: 'How to Create Current State Process Maps',
  metaDescription:
    'Create current state process maps by recording the real workflow and generating the map from it, so it shows how work actually happens.',
  h1: 'How to create current state process maps',
  eyebrow: 'Problem',
  shortAnswer:
    'To create a current state process map, record the real workflow as people perform it and generate the map from that recording rather than drawing it in a workshop. A current state map is only useful if it reflects reality, and workshop maps drift toward the ideal process. Ledgerium AI records the actual steps, including the cross-system handoffs, and produces a process map backed by observed evidence, so your current state shows how the work truly runs and gives you a baseline to design changes against.',
  primaryKeyword: 'how to create current state process maps',
  secondaryKeywords: ['current state mapping', 'as-is process map', 'process mapping from real work'],
  searchIntent: 'informational',
  tags: ['problem', 'process-mapping', 'current-state', 'documentation'],
  related: ['problem:how-to-baseline-a-workflow', 'persona:business-analysts', 'compare:process-mining'],
  originalDataPoint:
    'A workshop map is an agreement about the process; a recorded map is a record of it. Ledgerium builds the current-state map from observed steps with timing, so it reflects the real path including the cross-system handoffs a whiteboard usually omits.',
  honestLimitation:
    'Ledgerium maps the browser-based steps. Physical or desktop-only steps in the process need separate observation to complete the map.',
  whyItHappens:
    'Current state maps drift toward the ideal because they are drawn from memory in a workshop, where people describe how the process should work. The real handoffs and exceptions get smoothed over, so the map does not match the work.',
  diagnostic: [
    'Your process map was drawn in a workshop and never verified against reality',
    'The map shows a clean flow but the real process has detours',
    'Different people describe the same process differently',
  ],
  manualApproach:
    'Gather people in a room, draw the process on a whiteboard, and digitize the result. It captures consensus, not reality, and the exceptions and cross-system steps rarely make it onto the map.',
  ledgeriumApproach:
    'Record the real workflow. Ledgerium generates a current-state process map from the observed steps, with timing and the cross-system handoffs included, so the map reflects how the work actually runs.',
  steps: [
    { title: 'Choose the process to map', detail: 'Pick the workflow whose current state you need to understand.' },
    { title: 'Record real runs', detail: 'Capture one or more real runs as people perform the process.' },
    { title: 'Generate the map', detail: 'Ledgerium builds the current-state process map from the recordings.' },
    { title: 'Validate with the team', detail: 'Confirm the map matches reality and note any offline steps.' },
    { title: 'Use it as a baseline', detail: 'Design the future state and measure changes against this current state.' },
  ],
  commonMistakes: [
    'Mapping the ideal process instead of the real one',
    'Leaving cross-system handoffs and exceptions off the map',
    'Never verifying the workshop map against actual work',
  ],
  faqs: [
    {
      q: 'How do I create a current state process map?',
      a: 'Record the real workflow as people perform it and generate the map from the recording. This produces a map backed by observed steps rather than a workshop drawing of the ideal process.',
    },
    {
      q: 'Why are workshop process maps often wrong?',
      a: 'They are drawn from memory and tend toward how the process should work. The real handoffs and exceptions get smoothed over, so the map does not match what actually happens.',
    },
    {
      q: 'What makes a current state map useful?',
      a: 'Accuracy. It must reflect the real path, including detours and cross-system steps, so it can be trusted as a baseline for designing the future state.',
    },
    {
      q: 'Can a recorded map capture steps across systems?',
      a: 'Yes. A single recording captures the steps across each browser-based system in the process, so the map includes the handoffs a whiteboard usually omits.',
    },
    {
      q: 'How does the map become a baseline?',
      a: 'The recorded current state has timing and structure, so changes can be measured against it. Re-recording later shows how the process moved from current to future state.',
    },
  ],
  jsonLd: ['Article', 'HowTo', 'FAQPage', 'BreadcrumbList', 'WebPage', 'Organization'],
  author: { name: 'Ledgerium Research Team', sameAs: ['https://www.linkedin.com/company/ledgerium'] },
  updatedAt: '2026-06-26',
  published: true,
};

const baselineWorkflow: ProblemPage = {
  type: 'problem',
  slug: 'how-to-baseline-a-workflow',
  metaTitle: 'How to Baseline a Workflow Before You Change It',
  metaDescription:
    'Baseline a workflow by recording how it runs today, capturing timing, steps, and variation, so you can measure any improvement against a real starting point.',
  h1: 'How to baseline a workflow',
  eyebrow: 'Problem',
  shortAnswer:
    'To baseline a workflow, record how it runs today and capture the timing, steps, and variation between people, so you have a real starting point to measure improvement against. Without a baseline, any change is asserted rather than proven. Ledgerium AI records the current workflow and produces a process map with timing, wait time, rework, and variation, which becomes your baseline. After you change the process, re-recording shows the difference against that baseline in concrete numbers rather than impressions.',
  primaryKeyword: 'how to baseline a workflow',
  secondaryKeywords: ['process baseline', 'baseline a process', 'measure process improvement'],
  searchIntent: 'informational',
  tags: ['problem', 'baseline', 'process-intelligence', 'continuous-improvement'],
  related: ['problem:how-to-find-process-waste', 'persona:process-excellence-leads', 'workflow:invoice-approval-workflow'],
  originalDataPoint:
    'Ledgerium captures variation between people running the same workflow, so a baseline includes not just the average time but how much the process differs run to run, which is the standardization gap most baselines never quantify.',
  honestLimitation:
    'A recorded baseline reflects the runs you capture. For high-volume processes, more recordings give a more representative baseline.',
  whyItHappens:
    'Teams skip baselining because it feels like overhead, then cannot prove their improvement worked. Without a measured starting point, debates about impact come down to opinion and the change quietly gets undone.',
  diagnostic: [
    'You are about to change a process but have no starting measurement',
    'Past improvements could not be proven and lost support',
    'Nobody can say how long the process takes today',
  ],
  manualApproach:
    'Time a few runs with a stopwatch and average them, or estimate from memory. It is rough, misses variation, and rarely captures wait time or rework, so the baseline is weak.',
  ledgeriumApproach:
    'Record the workflow as it runs today. Ledgerium produces a baseline with timing, wait time, rework, and variation between people, so the starting point is precise and re-recording later proves the change.',
  steps: [
    { title: 'Record the current process', detail: 'Capture how the workflow runs today, ideally across several runs.' },
    { title: 'Capture the baseline metrics', detail: 'Review timing, wait time, rework, and variation in the report.' },
    { title: 'Make the change', detail: 'Implement the improvement you want to test.' },
    { title: 'Re-record', detail: 'Capture the workflow again after the change.' },
    { title: 'Compare', detail: 'Measure the difference against the baseline in concrete numbers.' },
  ],
  commonMistakes: [
    'Skipping the baseline and arguing about impact afterward',
    'Baselining with a stopwatch that misses wait time and rework',
    'Capturing a single run and ignoring variation between people',
  ],
  faqs: [
    {
      q: 'How do I baseline a workflow?',
      a: 'Record how the workflow runs today and capture the timing, steps, and variation. That recording is your baseline, and re-recording after a change shows the difference in concrete numbers.',
    },
    {
      q: 'Why is a baseline important?',
      a: 'Without a measured starting point, any improvement is asserted rather than proven, and changes lose support when impact cannot be shown. A baseline makes the gain concrete.',
    },
    {
      q: 'What should a good baseline capture?',
      a: 'Timing split into work and wait, rework, and variation between people. A stopwatch average misses most of this; a recording captures it.',
    },
    {
      q: 'How many runs do I need to baseline?',
      a: 'One run gives a starting point; several runs give a more representative baseline and reveal how much the process varies between people, especially for high-volume work.',
    },
    {
      q: 'How do I prove the improvement later?',
      a: 'Re-record the workflow after the change and compare it to the baseline. The reduction in time, steps, or rework is measured rather than estimated.',
    },
  ],
  jsonLd: ['Article', 'HowTo', 'FAQPage', 'BreadcrumbList', 'WebPage', 'Organization'],
  author: { name: 'Ledgerium Research Team', sameAs: ['https://www.linkedin.com/company/ledgerium'] },
  updatedAt: '2026-06-26',
  published: true,
};

const findWaste: ProblemPage = {
  type: 'problem',
  slug: 'how-to-find-process-waste',
  metaTitle: 'How to Find Process Waste in a Workflow',
  metaDescription:
    'Find process waste by recording a workflow and reviewing where time is lost to waiting, rework, and unnecessary steps, with the evidence to back each finding.',
  h1: 'How to find process waste',
  eyebrow: 'Problem',
  shortAnswer:
    'To find process waste, record a workflow and review where time goes to waiting, rework, and steps that add no value, instead of guessing from a value-stream workshop. Most waste hides in wait time and handoffs, which people underestimate because they only feel the active work. Ledgerium AI records the real process and produces a report that separates work time from wait time, flags rework, and shows variation between people, so you can target the waste that actually costs the most with evidence behind every finding.',
  primaryKeyword: 'how to find process waste',
  secondaryKeywords: ['identify process waste', 'reduce process waste', 'find inefficiency in a workflow'],
  searchIntent: 'informational',
  tags: ['problem', 'process-excellence', 'waste', 'continuous-improvement'],
  related: ['problem:how-to-baseline-a-workflow', 'problem:how-to-identify-ai-automation-opportunities', 'persona:process-excellence-leads'],
  originalDataPoint:
    'Ledgerium separates work time from wait time on every step, so the report shows that most waste is usually waiting and handoffs rather than the active task, which is the waste a stopwatch on the busy step never reveals.',
  honestLimitation:
    'Ledgerium measures the browser-based steps. Waste in physical or desktop-only steps needs separate observation to quantify.',
  whyItHappens:
    'Waste is hard to see because people experience the active work, not the waiting between steps. Workshops surface the visible, annoying tasks while the costly wait time and rework stay invisible without measurement.',
  diagnostic: [
    'A process takes far longer end to end than the work inside it',
    'Items bounce back for correction and rework is common',
    'Improvement efforts target busy steps but the process is still slow',
  ],
  manualApproach:
    'Run a value-stream workshop and estimate where time goes. It captures the visible tasks but underestimates wait time and rework, so the biggest waste is often missed.',
  ledgeriumApproach:
    'Record the real process. Ledgerium separates work from wait, flags rework, and shows variation, so the report points to the waste that actually costs the most, with evidence behind each finding.',
  steps: [
    { title: 'Record the process', detail: 'Capture one or more real runs of the workflow.' },
    { title: 'Split work from wait', detail: 'Review the report to see where time is active versus waiting.' },
    { title: 'Flag rework and detours', detail: 'Identify steps that loop back or add no value.' },
    { title: 'Target the costly waste', detail: 'Prioritize the waste with the largest time impact.' },
    { title: 'Measure the result', detail: 'Re-record after changes to confirm the waste was removed.' },
  ],
  commonMistakes: [
    'Targeting busy steps while ignoring wait time and handoffs',
    'Estimating waste from a workshop instead of measuring it',
    'Removing a visible step that was not the real cost',
  ],
  faqs: [
    {
      q: 'How do I find waste in a process?',
      a: 'Record the workflow and review where time goes to waiting, rework, and no-value steps. Ledgerium separates work from wait and flags rework, so you target the waste that costs the most.',
    },
    {
      q: 'Where does most process waste hide?',
      a: 'In wait time and handoffs, not the active work. People underestimate it because they only feel the busy steps. Measuring the process makes the wait visible.',
    },
    {
      q: 'Why are workshops not enough to find waste?',
      a: 'Workshops surface the visible, annoying tasks and underestimate wait time and rework, so the biggest waste is often missed. A recording measures it directly.',
    },
    {
      q: 'How do I know which waste to tackle first?',
      a: 'Prioritize by time impact. The report ranks where time is actually lost, so you target the costliest waste rather than the most visible one.',
    },
    {
      q: 'How do I confirm the waste is gone?',
      a: 'Re-record the process after the change and compare to the baseline. The reduction in wait time and rework is measured rather than assumed.',
    },
  ],
  jsonLd: ['Article', 'HowTo', 'FAQPage', 'BreadcrumbList', 'WebPage', 'Organization'],
  author: { name: 'Ledgerium Research Team', sameAs: ['https://www.linkedin.com/company/ledgerium'] },
  updatedAt: '2026-06-26',
  published: true,
};

export const PROBLEM_PAGES: readonly ProblemPage[] = [
  documentProcess,
  createSops,
  aiOpportunities,
  reduceOnboarding,
  tribalKnowledge,
  currentStateMaps,
  baselineWorkflow,
  findWaste,
];
