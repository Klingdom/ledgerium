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

const standardizeWorkflows: ProblemPage = {
  type: 'problem',
  slug: 'how-to-standardize-workflows',
  metaTitle: 'How to Standardize a Workflow Across a Team',
  metaDescription:
    'Standardize a workflow by recording how each person runs it, comparing the variation, and agreeing on one documented version the team follows.',
  h1: 'How to standardize a workflow',
  eyebrow: 'Problem',
  shortAnswer:
    'To standardize how a team performs a workflow, record several people running it, compare the variation between their runs, agree on one best version, and document it as the SOP everyone follows. Standardization fails when the standard is written from memory and never matches what people actually do. Ledgerium AI records the real runs, surfaces where they differ, and generates an SOP from the agreed version, so the standard is built from observed work rather than an opinion about how the process should run.',
  primaryKeyword: 'how to standardize a workflow',
  secondaryKeywords: ['standardize a process', 'standard work documentation', 'reduce workflow variation'],
  searchIntent: 'informational',
  tags: ['problem', 'standardization', 'process-excellence', 'sop'],
  related: ['problem:how-to-reduce-process-variation', 'persona:process-excellence-leads', 'compare:process-street'],
  originalDataPoint:
    'Ledgerium captures how the same workflow differs run to run, so you can see exactly where two people diverge before you write a standard, instead of standardizing on a guess about which version is correct.',
  honestLimitation:
    'Ledgerium standardizes the browser-based steps it observes. Deciding which version is the right standard still needs a person who understands the trade-offs.',
  whyItHappens:
    'Workflows drift apart because each person learns them slightly differently and no documented standard reflects the real work. A written standard built from memory does not match anyone, so people ignore it and keep running their own version.',
  diagnostic: [
    'Two people produce different results from the same workflow',
    'There is a written standard but nobody actually follows it',
    'Quality depends on who happens to run the process',
  ],
  manualApproach:
    'Pick one person you trust, write down how they do it, and tell everyone to follow that. It ignores why the others do it differently, misses the exceptions, and the standard is out of date the moment the process changes.',
  ledgeriumApproach:
    'Record several people running the workflow. Ledgerium shows where the runs differ, you agree on the best version, and the SOP is generated from that agreed run, including the exceptions, so the standard reflects real work.',
  steps: [
    { title: 'Record several runs', detail: 'Capture the same workflow as a few different people perform it.' },
    { title: 'Compare the variation', detail: 'Review where the runs differ in steps, order, and time.' },
    { title: 'Agree on the best version', detail: 'Decide which path is the standard and why, with the team.' },
    { title: 'Generate the standard SOP', detail: 'Turn the agreed run into the documented standard everyone follows.' },
    { title: 'Re-record to keep it honest', detail: 'Re-record periodically to confirm people are still following the standard.' },
  ],
  commonMistakes: [
    'Standardizing on one person without understanding why others differ',
    'Writing the standard from memory so it matches nobody',
    'Publishing a standard once and never checking it is followed',
  ],
  faqs: [
    {
      q: 'How do I standardize a workflow across a team?',
      a: 'Record several people running it, compare where their runs differ, agree on the best version, and document that as the SOP. The standard is built from real work rather than from memory.',
    },
    {
      q: 'Why do written standards get ignored?',
      a: 'Because they are written from memory and do not match what people actually do. A standard generated from a real, agreed run reflects the work, so people are far more likely to follow it.',
    },
    {
      q: 'How do I know which version should be the standard?',
      a: 'Compare the recorded runs side by side. Seeing where people diverge, and how long each path takes, lets the team choose the best version with evidence instead of opinion.',
    },
    {
      q: 'Does standardizing remove necessary exceptions?',
      a: 'No. Recording the real runs captures the legitimate exceptions, so the standard documents how to handle them rather than pretending the process is a single clean path.',
    },
    {
      q: 'How do I keep the standard from drifting again?',
      a: 'Re-record the workflow periodically. Comparing new runs to the standard shows whether people are still following it and where it needs to be refreshed.',
    },
  ],
  jsonLd: ['Article', 'HowTo', 'FAQPage', 'BreadcrumbList', 'WebPage', 'Organization'],
  author: { name: 'Ledgerium Research Team', sameAs: ['https://www.linkedin.com/company/ledgerium'] },
  updatedAt: '2026-06-26',
  published: true,
};

const prepareForAudit: ProblemPage = {
  type: 'problem',
  slug: 'how-to-prepare-for-a-process-audit',
  metaTitle: 'How to Prepare for a Process Audit',
  metaDescription:
    'Prepare for a process audit by recording how the work is really done, generating SOPs and process maps, so your evidence matches actual practice.',
  h1: 'How to prepare for a process audit',
  eyebrow: 'Problem',
  shortAnswer:
    'To prepare for a process audit, document how the work is actually performed, not how a policy says it should be, so your SOPs and process maps match what an auditor will observe. Audits go badly when the documentation describes an ideal process the team does not follow. Ledgerium AI records the real workflow and generates SOPs and process maps from it, so your evidence reflects actual practice and the gap between written procedure and real work is closed before the auditor finds it.',
  primaryKeyword: 'how to prepare for a process audit',
  secondaryKeywords: ['audit process documentation', 'process audit evidence', 'audit readiness documentation'],
  searchIntent: 'informational',
  tags: ['problem', 'audit', 'compliance', 'documentation'],
  related: ['persona:compliance-teams', 'workflow:month-end-close-workflow', 'sopTemplate:invoice-approval-sop-template'],
  originalDataPoint:
    'Because Ledgerium documents from a real run, the SOP and the observed work are the same source, so the documentation an auditor reviews matches the practice they would see, which removes the most common audit finding.',
  honestLimitation:
    'Ledgerium evidences the browser-based steps it records. Approvals, sign-offs, and offline controls still need their own records attached to the documentation.',
  whyItHappens:
    'Audit preparation is painful because the documentation was written for the policy, not for the work. The team runs a different process than the binder describes, so auditors find gaps between what is written and what is done.',
  diagnostic: [
    'Your written procedures do not match how the team actually works',
    'Audit prep means scrambling to recreate documentation after the fact',
    'Past audits flagged gaps between policy and practice',
  ],
  manualApproach:
    'Pull the old procedure documents, interview the team to see what changed, and rewrite the binder before the auditor arrives. It is rushed, depends on recall, and still leaves gaps between the document and the real process.',
  ledgeriumApproach:
    'Record the process as it actually runs. Ledgerium generates the SOP and process map from that recording, so the documentation and the observed work share one source and the auditor sees consistency rather than a gap.',
  steps: [
    { title: 'List the audited processes', detail: 'Identify the workflows the audit will examine.' },
    { title: 'Record real runs', detail: 'Capture each process as the team actually performs it today.' },
    { title: 'Generate the evidence', detail: 'Produce SOPs and process maps from the recordings.' },
    { title: 'Attach offline controls', detail: 'Add approvals, sign-offs, and records that happen off-screen.' },
    { title: 'Review for gaps', detail: 'Confirm the documentation matches practice before the audit.' },
  ],
  commonMistakes: [
    'Documenting the policy instead of the real process',
    'Recreating documentation from memory under time pressure',
    'Leaving offline approvals and controls out of the evidence',
  ],
  faqs: [
    {
      q: 'How do I prepare documentation for a process audit?',
      a: 'Record how the work is actually performed and generate SOPs and process maps from the recording. The documentation then matches what an auditor observes instead of describing an ideal process.',
    },
    {
      q: 'Why do audits find gaps between policy and practice?',
      a: 'Because the documentation was written for the policy, not the work, and the team runs a different process. Documenting from a real run closes that gap before the auditor finds it.',
    },
    {
      q: 'What evidence does a recorded process provide?',
      a: 'A step-by-step SOP and a process map drawn from the observed run, showing the real steps and systems. You attach offline approvals and sign-offs to complete the record.',
    },
    {
      q: 'How current does audit documentation need to be?',
      a: 'It should reflect the process as it runs now. Re-recording when the process changes keeps the SOP and map aligned with current practice rather than a past version.',
    },
    {
      q: 'Does this cover approvals that happen off-screen?',
      a: 'Recording captures the browser steps precisely. Offline approvals and controls still need their own records, which you attach to the generated documentation at the right step.',
    },
  ],
  jsonLd: ['Article', 'HowTo', 'FAQPage', 'BreadcrumbList', 'WebPage', 'Organization'],
  author: { name: 'Ledgerium Research Team', sameAs: ['https://www.linkedin.com/company/ledgerium'] },
  updatedAt: '2026-06-26',
  published: true,
};

const documentAcrossSystems: ProblemPage = {
  type: 'problem',
  slug: 'how-to-document-a-workflow-across-multiple-systems',
  metaTitle: 'How to Document a Workflow Across Systems',
  metaDescription:
    'Document a workflow that spans several systems by recording one real run, so the cross-system handoffs are captured instead of lost between tools.',
  h1: 'How to document a workflow across multiple systems',
  eyebrow: 'Problem',
  shortAnswer:
    'To document a process that spans several tools, record one real run that moves across all of them, so the handoffs between systems are captured instead of falling through the cracks. Multi-system processes are hard to document because no single tool sees the whole path, and the steps between systems are where the real work hides. Ledgerium AI records the workflow across each browser-based system in one session and generates an SOP and process map that includes the lookups, copies, and handoffs that connect the tools together.',
  primaryKeyword: 'how to document a workflow across multiple systems',
  secondaryKeywords: ['cross-system process documentation', 'document a process across tools', 'multi-system workflow'],
  searchIntent: 'informational',
  tags: ['problem', 'documentation', 'cross-system', 'process-mapping'],
  related: ['software:salesforce', 'persona:business-analysts', 'problem:how-to-document-a-business-process'],
  originalDataPoint:
    'Ledgerium records the steps between systems, the lookups, copies, and re-keying that connect one tool to the next, which is exactly the work each individual system has no record of and interviews routinely skip.',
  honestLimitation:
    'Ledgerium captures the browser-based systems in the path. Steps that happen in desktop software or outside the browser need a person to add them to the recording.',
  whyItHappens:
    'Cross-system processes resist documentation because each tool only sees its own slice, and the glue work between tools lives in nobody’s system of record. Documenting from one system misses the handoffs, which is where the delays and errors usually start.',
  diagnostic: [
    'A process touches several tools and no document shows the whole path',
    'The handoffs between systems are where errors and delays appear',
    'Each team documents only its own system, not the connections',
  ],
  manualApproach:
    'Ask each system owner how their part works, then try to stitch the pieces together into one flow. The seams between systems get lost, the re-keying steps go undocumented, and the end-to-end picture never quite fits together.',
  ledgeriumApproach:
    'Record one real run that moves across every browser-based system in the process. Ledgerium captures the handoffs as they happen and generates a single SOP and process map that shows the whole path, tool to tool.',
  steps: [
    { title: 'Map the systems involved', detail: 'List the tools the process touches from start to finish.' },
    { title: 'Record end to end', detail: 'Capture one real run that moves across all the systems in one session.' },
    { title: 'Generate the unified map', detail: 'Produce an SOP and process map that includes the cross-system handoffs.' },
    { title: 'Add offline steps', detail: 'Note any steps that happen outside the browser to complete the path.' },
    { title: 'Validate with each owner', detail: 'Confirm each system’s part is right and the connections hold together.' },
  ],
  commonMistakes: [
    'Documenting each system separately and losing the handoffs',
    'Skipping the re-keying and lookup steps between tools',
    'Assuming the system of record shows the whole process',
  ],
  faqs: [
    {
      q: 'How do I document a process that spans multiple systems?',
      a: 'Record one real run that moves across all the tools in one session. Ledgerium captures the handoffs between systems and generates a single SOP and process map of the whole path.',
    },
    {
      q: 'Why are multi-system processes hard to document?',
      a: 'Because each tool only sees its own slice and the work between tools lives in nobody’s system of record. A recording follows the work across systems and captures the handoffs directly.',
    },
    {
      q: 'Where do cross-system processes usually break?',
      a: 'At the handoffs, the lookups, copies, and re-keying between tools. These steps go undocumented because no single system records them, which is where delays and errors start.',
    },
    {
      q: 'Can one recording cover several different tools?',
      a: 'Yes. A single session captures the steps across each browser-based system in the process, so the documentation shows the whole path rather than disconnected fragments per tool.',
    },
    {
      q: 'What about steps outside the browser?',
      a: 'Ledgerium records browser-based systems. Steps in desktop software or offline are added to the recording by a person, so the end-to-end documentation stays complete.',
    },
  ],
  jsonLd: ['Article', 'HowTo', 'FAQPage', 'BreadcrumbList', 'WebPage', 'Organization'],
  author: { name: 'Ledgerium Research Team', sameAs: ['https://www.linkedin.com/company/ledgerium'] },
  updatedAt: '2026-06-26',
  published: true,
};

const keepSopsCurrent: ProblemPage = {
  type: 'problem',
  slug: 'how-to-keep-sops-up-to-date',
  metaTitle: 'How to Keep SOPs Up to Date (Not Stale)',
  metaDescription:
    'Keep SOPs up to date by generating them from recordings, then re-recording when the process changes, so updating is a re-record not a rewrite.',
  h1: 'How to keep SOPs up to date',
  eyebrow: 'Problem',
  shortAnswer:
    'To keep SOPs current instead of stale, generate them from recordings of real work and re-record when the process changes, so updating is a quick re-record rather than a manual rewrite nobody has time for. SOPs go stale because hand-editing a document after every change is a job no one owns. Ledgerium AI generates the SOP from a recording, so when the process changes you re-record and the SOP regenerates, which keeps the documentation tied to how the work is actually done today.',
  primaryKeyword: 'how to keep SOPs up to date',
  secondaryKeywords: ['keep SOPs current', 'update SOPs', 'stop SOPs going stale'],
  searchIntent: 'informational',
  tags: ['problem', 'sop', 'documentation', 'maintenance'],
  related: ['problem:how-to-create-sops-automatically', 'persona:training-managers', 'compare:process-street'],
  originalDataPoint:
    'Because the SOP is generated from a recording, updating after a process change is a re-record, not a line-by-line rewrite, which removes the manual maintenance cost that is the real reason SOPs go stale.',
  honestLimitation:
    'Re-recording refreshes the observed steps. A process owner still reviews the regenerated SOP to confirm rationale and approvals are still correct.',
  whyItHappens:
    'SOPs go stale because keeping them current is manual work that competes with everyone’s real job. The process changes, the document does not get edited, and within months the SOP describes a process that no longer exists.',
  diagnostic: [
    'Your SOPs were written once and never updated since',
    'People know the SOP is wrong so they ignore it',
    'Nobody owns the job of keeping the documentation current',
  ],
  manualApproach:
    'Assign someone to review every SOP on a schedule, interview the team about what changed, and edit each document by hand. The reviews slip, the edits pile up, and the library falls behind the real processes.',
  ledgeriumApproach:
    'Generate each SOP from a recording. When the process changes, re-record it and the SOP regenerates from the new run, so keeping documentation current is a fast capture rather than a manual rewrite cycle.',
  steps: [
    { title: 'Generate SOPs from recordings', detail: 'Build the SOP library from real runs rather than hand-written docs.' },
    { title: 'Set a re-record trigger', detail: 'Re-record whenever a process changes or on a regular review cadence.' },
    { title: 'Regenerate the SOP', detail: 'Let the SOP refresh from the new recording instead of a manual edit.' },
    { title: 'Review the changes', detail: 'Have the owner confirm rationale and approvals are still correct.' },
    { title: 'Republish for the team', detail: 'Share the refreshed SOP so people trust and follow it again.' },
  ],
  commonMistakes: [
    'Treating SOPs as write-once instead of living documents',
    'Relying on manual edit cycles that always fall behind',
    'Skipping the owner review after regenerating the SOP',
  ],
  faqs: [
    {
      q: 'How do I keep SOPs from going stale?',
      a: 'Generate them from recordings and re-record when the process changes. Updating becomes a quick re-record that regenerates the SOP, rather than a manual rewrite that never happens.',
    },
    {
      q: 'Why do SOPs become outdated so fast?',
      a: 'Because keeping them current is manual work that competes with everyone’s real job. The process changes, the document does not get edited, and the SOP drifts from reality.',
    },
    {
      q: 'How often should SOPs be updated?',
      a: 'Whenever the process changes, plus a regular review cadence. Re-recording makes both cheap, so you can refresh SOPs as often as the work actually changes.',
    },
    {
      q: 'Do I still need to review a regenerated SOP?',
      a: 'Yes. Re-recording refreshes the observed steps, but a process owner should confirm the rationale and approvals are still correct before republishing.',
    },
    {
      q: 'What makes people trust an SOP again?',
      a: 'When it matches the real work. SOPs generated from current recordings reflect how the job is done today, so people stop ignoring them and start following them.',
    },
  ],
  jsonLd: ['Article', 'HowTo', 'FAQPage', 'BreadcrumbList', 'WebPage', 'Organization'],
  author: { name: 'Ledgerium Research Team', sameAs: ['https://www.linkedin.com/company/ledgerium'] },
  updatedAt: '2026-06-26',
  published: true,
};

const measureImprovement: ProblemPage = {
  type: 'problem',
  slug: 'how-to-measure-process-improvement',
  metaTitle: 'How to Measure Process Improvement',
  metaDescription:
    'Measure process improvement by baselining the workflow first, then re-recording after the change, so the gain is proven, not just claimed.',
  h1: 'How to measure process improvement',
  eyebrow: 'Problem',
  shortAnswer:
    'To measure whether a process change actually improved things, baseline the workflow before the change, make the change, then re-record and compare, so the gain in time, steps, or rework is proven rather than asserted. Improvements lose support when the impact cannot be shown in numbers. Ledgerium AI records the before and after of the same workflow and compares timing, wait time, rework, and variation, so you can see the real effect of a change instead of relying on impressions about whether it helped.',
  primaryKeyword: 'how to measure process improvement',
  secondaryKeywords: ['measure process change', 'prove process improvement', 'before and after process'],
  searchIntent: 'informational',
  tags: ['problem', 'measurement', 'continuous-improvement', 'process-intelligence'],
  related: ['problem:how-to-baseline-a-workflow', 'persona:process-excellence-leads', 'workflow:expense-reporting-workflow'],
  originalDataPoint:
    'Ledgerium compares the same workflow before and after a change across timing, wait time, rework, and variation, so the improvement is shown as a measured difference rather than a claimed one, on the same evidence base both times.',
  honestLimitation:
    'A before-and-after comparison reflects the runs you record. For high-volume processes, more runs on each side give a more reliable measure of the change.',
  whyItHappens:
    'Improvements cannot be measured because no one captured the before, so the after has nothing to compare against. Teams change a process, feel it is better, and then lose the argument when someone asks for proof and there is none.',
  diagnostic: [
    'You changed a process but cannot say by how much it improved',
    'A past improvement was reversed because impact could not be proven',
    'Debates about whether a change helped come down to opinion',
  ],
  manualApproach:
    'Estimate the before from memory, change the process, and ask people if it feels faster. The before is unreliable, the after is subjective, and the comparison cannot survive a skeptical question.',
  ledgeriumApproach:
    'Record the workflow before the change as a baseline, then re-record after. Ledgerium compares timing, wait time, rework, and variation across the two runs, so the improvement is a measured difference, not an impression.',
  steps: [
    { title: 'Baseline before changing', detail: 'Record the workflow as it runs today to fix the starting point.' },
    { title: 'Make one change', detail: 'Implement the single improvement you want to measure.' },
    { title: 'Re-record after', detail: 'Capture the workflow again once the change is in place.' },
    { title: 'Compare the numbers', detail: 'Review the difference in time, steps, wait, and rework.' },
    { title: 'Report the result', detail: 'Share the measured change so the improvement keeps its support.' },
  ],
  commonMistakes: [
    'Changing the process without capturing a before',
    'Judging improvement by feel instead of measured numbers',
    'Changing several things at once so the cause is unclear',
  ],
  faqs: [
    {
      q: 'How do I measure whether a process change improved things?',
      a: 'Baseline the workflow before the change, make the change, then re-record and compare. The difference in time, steps, and rework is measured, so the improvement is proven rather than claimed.',
    },
    {
      q: 'Why do improvements lose support?',
      a: 'Because the impact cannot be shown in numbers. Without a captured before, the after has nothing to compare against, and the change gets reversed when someone asks for proof.',
    },
    {
      q: 'What should I measure to prove improvement?',
      a: 'Timing split into work and wait, rework, and variation between people. Comparing these before and after shows where the change actually helped and by how much.',
    },
    {
      q: 'Why change only one thing at a time?',
      a: 'Because changing several things at once makes the cause unclear. Measuring one change against the baseline tells you which change produced the result.',
    },
    {
      q: 'How many runs do I need to measure a change?',
      a: 'One run on each side gives a directional read; several runs on each side give a more reliable measure, especially for high-volume work where runs vary.',
    },
  ],
  jsonLd: ['Article', 'HowTo', 'FAQPage', 'BreadcrumbList', 'WebPage', 'Organization'],
  author: { name: 'Ledgerium Research Team', sameAs: ['https://www.linkedin.com/company/ledgerium'] },
  updatedAt: '2026-06-26',
  published: true,
};

const identifyBottlenecks: ProblemPage = {
  type: 'problem',
  slug: 'how-to-identify-process-bottlenecks',
  metaTitle: 'How to Identify Process Bottlenecks',
  metaDescription:
    'Find process bottlenecks by recording the workflow and reviewing where work waits, so you target the step that holds up the whole process.',
  h1: 'How to identify process bottlenecks',
  eyebrow: 'Problem',
  shortAnswer:
    'To find where a process slows down, record the workflow and review where work piles up and waits, rather than guessing from the step that feels busiest. The bottleneck is usually a wait or a handoff, not the active work, so it stays invisible until you separate work time from wait time. Ledgerium AI records the real process and shows where time is spent waiting versus working, which step holds up the rest, and how much, so you fix the constraint that actually limits the process instead of a step that merely looks busy.',
  primaryKeyword: 'how to identify process bottlenecks',
  secondaryKeywords: ['find process bottlenecks', 'process bottleneck analysis', 'where a process slows down'],
  searchIntent: 'informational',
  tags: ['problem', 'bottleneck', 'process-excellence', 'continuous-improvement'],
  related: ['problem:how-to-find-process-waste', 'persona:operations-managers', 'workflow:purchase-order-workflow'],
  originalDataPoint:
    'Ledgerium separates work time from wait time on each step, so a queue that adds days of delay is visible even when the active task itself is fast, which is the bottleneck a stopwatch on the busy step would never find.',
  honestLimitation:
    'Ledgerium measures the browser-based steps it records. A bottleneck in a physical or desktop-only step needs separate observation to quantify.',
  whyItHappens:
    'Bottlenecks are misdiagnosed because people feel the busy step, not the queue in front of it. The constraint is usually a handoff where work waits for someone, but without measuring wait time the team optimizes the visible step and the process stays slow.',
  diagnostic: [
    'The process takes far longer end to end than the work inside it',
    'Work piles up waiting at one handoff before it moves on',
    'Speeding up the busy step did not make the process faster',
  ],
  manualApproach:
    'Ask the team which step feels slowest and add capacity there. It targets the busiest-feeling step rather than the real constraint, so the queue moves somewhere else and the end-to-end time barely changes.',
  ledgeriumApproach:
    'Record the real process. Ledgerium shows where work waits versus where it is active, ranks the steps by delay, and points to the constraint that holds up the rest, so you fix the bottleneck that actually limits throughput.',
  steps: [
    { title: 'Record the end-to-end process', detail: 'Capture the workflow from start to finish, ideally across several runs.' },
    { title: 'Separate work from wait', detail: 'Review where time is active versus where work sits waiting.' },
    { title: 'Find the constraint', detail: 'Identify the step or handoff that holds up everything after it.' },
    { title: 'Fix the bottleneck', detail: 'Address the real constraint rather than the busiest-looking step.' },
    { title: 'Re-record to confirm', detail: 'Capture again to check the bottleneck moved or shrank.' },
  ],
  commonMistakes: [
    'Adding capacity to the busy step instead of the real constraint',
    'Ignoring wait time at handoffs where work actually queues',
    'Diagnosing the bottleneck from feel rather than measurement',
  ],
  faqs: [
    {
      q: 'How do I find a bottleneck in a process?',
      a: 'Record the workflow and review where work waits, not just where it is busy. Ledgerium separates work from wait and ranks steps by delay, so the real constraint becomes visible.',
    },
    {
      q: 'Why is the bottleneck usually not the busy step?',
      a: 'Because the constraint is often a handoff where work queues, which is invisible until you measure wait time. People feel the busy step and miss the queue in front of it.',
    },
    {
      q: 'Why did speeding up a step not help?',
      a: 'Because it was not the constraint. Optimizing a non-bottleneck step just moves the queue elsewhere. Measuring the process points you to the step that actually limits throughput.',
    },
    {
      q: 'How do I confirm I fixed the right bottleneck?',
      a: 'Re-record the process after the change. If the end-to-end time dropped and the queue shrank, you addressed the real constraint rather than a step that only looked busy.',
    },
    {
      q: 'Does a bottleneck move after you fix it?',
      a: 'Often yes. Removing one constraint can expose the next one. Re-recording after each change shows where the new bottleneck is so you can keep improving throughput.',
    },
  ],
  jsonLd: ['Article', 'HowTo', 'FAQPage', 'BreadcrumbList', 'WebPage', 'Organization'],
  author: { name: 'Ledgerium Research Team', sameAs: ['https://www.linkedin.com/company/ledgerium'] },
  updatedAt: '2026-06-26',
  published: true,
};

const reduceVariation: ProblemPage = {
  type: 'problem',
  slug: 'how-to-reduce-process-variation',
  metaTitle: 'How to Reduce Process Variation Between People',
  metaDescription:
    'Reduce process variation by recording how different people run the same workflow, comparing the runs, and standardizing on one documented version.',
  h1: 'How to reduce process variation',
  eyebrow: 'Problem',
  shortAnswer:
    'To reduce how much a process differs between people, record several people running the same workflow, compare where their runs diverge, and standardize on one documented version with the exceptions made explicit. Variation hides because each person believes they follow the same process when they do not. Ledgerium AI records the real runs, quantifies how much they differ in steps and time, and generates an SOP from the agreed version, so the team converges on consistent work measured from real runs rather than assumed sameness.',
  primaryKeyword: 'how to reduce process variation',
  secondaryKeywords: ['reduce variation between people', 'process consistency', 'reduce variability in a workflow'],
  searchIntent: 'informational',
  tags: ['problem', 'variation', 'standardization', 'process-excellence'],
  related: ['problem:how-to-standardize-workflows', 'persona:bpo-operations', 'workflow:zendesk-ticket-resolution-workflow'],
  originalDataPoint:
    'Ledgerium quantifies how much the same workflow differs run to run, so variation is a measured number rather than a hunch, which lets a team see whether two people really run the process the same way before assuming they do.',
  honestLimitation:
    'Ledgerium measures variation in the browser-based steps it records. Variation in judgment or offline handling still needs a person to interpret and document.',
  whyItHappens:
    'Variation persists because everyone assumes they run the process the same way, and nothing measures whether that is true. Small differences in order, lookups, and decisions accumulate into inconsistent results that nobody can trace back to a cause.',
  diagnostic: [
    'The same workflow produces different results depending on who runs it',
    'Quality and timing swing depending on the person',
    'People believe they follow the same process but the outputs differ',
  ],
  manualApproach:
    'Tell everyone to follow the SOP and assume that fixes it. Without measuring how the runs actually differ, the variation stays invisible, the SOP does not match anyone, and the inconsistency continues.',
  ledgeriumApproach:
    'Record several people running the workflow. Ledgerium measures where the runs diverge in steps and time, you agree on the best version, and the SOP is generated from it, so the team converges on consistent, documented work.',
  steps: [
    { title: 'Record multiple people', detail: 'Capture the same workflow as several people perform it.' },
    { title: 'Measure the variation', detail: 'Review how much the runs differ in steps, order, and time.' },
    { title: 'Find the divergence points', detail: 'Identify exactly where people take different paths and why.' },
    { title: 'Agree on the standard', detail: 'Choose one version, with explicit exceptions, as the documented process.' },
    { title: 'Re-record to verify', detail: 'Capture again later to confirm the runs have converged.' },
  ],
  commonMistakes: [
    'Assuming everyone runs the process the same way without checking',
    'Issuing an SOP without measuring where runs actually diverge',
    'Treating every difference as error instead of a real exception',
  ],
  faqs: [
    {
      q: 'How do I reduce variation between people in a process?',
      a: 'Record several people running the workflow, measure where the runs diverge, and standardize on one documented version with explicit exceptions. The team converges on consistent work measured from real runs.',
    },
    {
      q: 'Why does process variation stay hidden?',
      a: 'Because everyone assumes they follow the same process and nothing measures whether that is true. Small differences accumulate into inconsistent results that are hard to trace without recordings.',
    },
    {
      q: 'How do I tell real exceptions from inconsistency?',
      a: 'Compare the recorded runs. Some divergence is a legitimate exception worth documenting; some is avoidable inconsistency. Seeing the runs side by side lets the team decide which is which.',
    },
    {
      q: 'Does reducing variation mean removing all flexibility?',
      a: 'No. The goal is consistent handling of the same situation. Recording captures the legitimate exceptions so the standard documents them rather than forcing a single rigid path.',
    },
    {
      q: 'How do I confirm variation actually dropped?',
      a: 'Re-record the workflow across several people later and compare. If the runs have converged in steps and time, the variation has measurably reduced.',
    },
  ],
  jsonLd: ['Article', 'HowTo', 'FAQPage', 'BreadcrumbList', 'WebPage', 'Organization'],
  author: { name: 'Ledgerium Research Team', sameAs: ['https://www.linkedin.com/company/ledgerium'] },
  updatedAt: '2026-06-26',
  published: true,
};

const documentWithoutInterviews: ProblemPage = {
  type: 'problem',
  slug: 'how-to-document-a-process-without-interviewing-everyone',
  metaTitle: 'How to Document a Process Without Interviews',
  metaDescription:
    'Document a process without rounds of interviews by recording one real run, then generating the SOP and process map from what was actually done.',
  h1: 'How to document a process without interviewing everyone',
  eyebrow: 'Problem',
  shortAnswer:
    'To capture a process without rounds of interviews, record one real run as someone performs it and generate the SOP and process map from the recording, instead of reconstructing the process through meetings. Interviews are slow, depend on recall, and miss the automatic steps people forget to mention. Ledgerium AI records the actual work, including the lookups and exceptions, and turns it into documentation, so you skip the interview cycle and the result reflects what was really done rather than what people remembered to say.',
  primaryKeyword: 'how to document a process without interviewing everyone',
  secondaryKeywords: ['document a process without interviews', 'capture a process fast', 'no-interview process documentation'],
  searchIntent: 'informational',
  tags: ['problem', 'documentation', 'efficiency', 'process-mapping'],
  related: ['problem:how-to-capture-tribal-knowledge', 'persona:consultants', 'compare:manual-sop-documentation'],
  originalDataPoint:
    'A recording captures the automatic steps an expert would never think to mention in an interview, so the documentation includes the lookups, copies, and exceptions that rounds of meetings routinely miss.',
  honestLimitation:
    'Recording captures what happens in the browser. The reasoning behind a judgment call still benefits from a short note the person adds to the relevant step.',
  whyItHappens:
    'Process documentation depends on interviews because no record of the real work exists, so analysts reconstruct it by asking people. The result is slow, biased toward what people remember, and misses the steps that are automatic and never get described.',
  diagnostic: [
    'Documenting a process means scheduling several rounds of interviews',
    'The write-up depends on what people happened to remember',
    'Automatic steps and workarounds never make it into the document',
  ],
  manualApproach:
    'Schedule interviews with each person, take notes, draft the steps, and circulate it for corrections, then repeat when someone says it is wrong. It consumes everyone’s time and still produces a document built from memory.',
  ledgeriumApproach:
    'Have one person record the process as they run it. Ledgerium generates the SOP and process map from the recording, including the automatic steps, so you skip the interview cycle and document from real work.',
  steps: [
    { title: 'Pick one person who runs it', detail: 'Choose someone who performs the process well and regularly.' },
    { title: 'Record one real run', detail: 'Capture the process as it actually happens in the browser.' },
    { title: 'Generate the documentation', detail: 'Turn the recording into a step-by-step SOP and a process map.' },
    { title: 'Add the why', detail: 'Have the person annotate judgment calls the recording cannot explain.' },
    { title: 'Review once, not repeatedly', detail: 'A single review confirms the draft instead of rounds of interviews.' },
  ],
  commonMistakes: [
    'Reconstructing a process from memory across many interviews',
    'Missing the automatic steps people never think to mention',
    'Repeating interview cycles every time the document is wrong',
  ],
  faqs: [
    {
      q: 'How do I document a process without interviewing everyone?',
      a: 'Record one real run as someone performs the process and generate the SOP and process map from it. You document from real work and skip the rounds of interviews entirely.',
    },
    {
      q: 'Why are interviews a weak way to document a process?',
      a: 'They are slow, depend on recall, and miss the automatic steps people forget to mention. A recording captures the real work directly, including the lookups and exceptions.',
    },
    {
      q: 'Do I need to record everyone who runs the process?',
      a: 'No. One real run captures the actual steps. If you want to reduce variation, recording a few people helps, but a single run already beats reconstructing the process from interviews.',
    },
    {
      q: 'How does recording capture the reasoning?',
      a: 'It captures the steps precisely; the reasoning behind judgment calls is added as a short note on the relevant step, which is faster and more accurate than a full interview.',
    },
    {
      q: 'How much time does this save over interviews?',
      a: 'You replace several interview rounds and a reconstructed draft with one recording and a single review, so documenting goes from a multi-meeting effort to a single capture.',
    },
  ],
  jsonLd: ['Article', 'HowTo', 'FAQPage', 'BreadcrumbList', 'WebPage', 'Organization'],
  author: { name: 'Ledgerium Research Team', sameAs: ['https://www.linkedin.com/company/ledgerium'] },
  updatedAt: '2026-06-26',
  published: true,
};

const reduceRework: ProblemPage = {
  type: 'problem',
  slug: 'how-to-reduce-rework',
  metaTitle: 'How to Reduce Rework and Do-Overs in a Process',
  metaDescription:
    'Reduce rework by recording where work loops back for correction, finding the upstream step that causes do-overs, and fixing the root cause.',
  h1: 'How to reduce rework',
  eyebrow: 'Problem',
  shortAnswer:
    'To reduce rework and do-overs, record the workflow, find where items loop back for correction, and trace each loop to the upstream step that caused it, then fix that root cause rather than the symptom. Rework hides because the correction happens far from the mistake that produced it. Ledgerium AI records the real process, flags where work returns for redo, and shows the earlier step where the error entered, so you fix the cause of the do-over instead of getting faster at repeating it.',
  primaryKeyword: 'how to reduce rework',
  secondaryKeywords: ['reduce do-overs', 'cut rework in a process', 'fix rework root cause'],
  searchIntent: 'informational',
  tags: ['problem', 'rework', 'process-excellence', 'continuous-improvement'],
  related: ['problem:how-to-find-process-waste', 'persona:process-excellence-leads', 'workflow:refund-processing-workflow'],
  originalDataPoint:
    'Ledgerium links each redo to the earlier step that introduced the error, so the cause of rework is shown as a traceable connection between two steps rather than guessed at from where the correction happens.',
  honestLimitation:
    'Ledgerium traces rework in the browser-based steps it records. A do-over caused by a physical or offline step needs separate observation to connect to its cause.',
  whyItHappens:
    'Rework persists because the do-over happens downstream of the mistake, so the team sees the correction but not the cause. People get better at fixing errors instead of preventing them, and the same defect keeps entering at the same earlier step run after run.',
  diagnostic: [
    'Items regularly come back for correction before they can move on',
    'The same kind of error shows up again and again',
    'People are skilled at fixing mistakes but the mistakes keep happening',
  ],
  manualApproach:
    'Add a review step to catch the errors, or coach whoever made the last correction. It treats the symptom, catches some defects later, and leaves the upstream step that produces them untouched, so the rework continues.',
  ledgeriumApproach:
    'Record the real process. Ledgerium shows where work loops back, links each redo to the earlier step that introduced the error, and quantifies how often it happens, so you fix the root cause and the do-overs stop rather than just getting caught later.',
  steps: [
    { title: 'Record the process', detail: 'Capture real runs of the workflow, including the corrections.' },
    { title: 'Find the loops', detail: 'Review where work returns for redo instead of moving forward.' },
    { title: 'Trace to the cause', detail: 'Link each redo to the upstream step that introduced the error.' },
    { title: 'Fix the root cause', detail: 'Change the earlier step so the defect stops entering the process.' },
    { title: 'Re-record to confirm', detail: 'Capture again to check the rework loop shrank or disappeared.' },
  ],
  commonMistakes: [
    'Adding a review step to catch errors instead of preventing them',
    'Fixing the correction step while ignoring the upstream cause',
    'Coaching the person who corrects rather than the step that fails',
  ],
  faqs: [
    {
      q: 'How do I reduce rework in a process?',
      a: 'Record the workflow, find where items loop back for correction, and trace each loop to the upstream step that caused it. Fixing that root cause stops the do-over rather than catching it later.',
    },
    {
      q: 'Why does rework keep happening?',
      a: 'Because the do-over happens downstream of the mistake, so the team fixes the symptom and never changes the earlier step that introduces the error. The same defect keeps entering run after run.',
    },
    {
      q: 'How do I find the cause of a do-over?',
      a: 'A recording links the correction back to the earlier step where the error entered. Seeing the two together points you at the root cause instead of the place the rework surfaces.',
    },
    {
      q: 'Is adding a review step a good fix for rework?',
      a: 'It catches some defects later but does not stop them. The review is a symptom fix; changing the upstream step that produces the error is what actually reduces rework.',
    },
    {
      q: 'How do I prove rework went down?',
      a: 'Re-record the process after the change and compare. If the loops where work returned for correction shrank, the rework measurably dropped.',
    },
  ],
  jsonLd: ['Article', 'HowTo', 'FAQPage', 'BreadcrumbList', 'WebPage', 'Organization'],
  author: { name: 'Ledgerium Research Team', sameAs: ['https://www.linkedin.com/company/ledgerium'] },
  updatedAt: '2026-06-27',
  published: true,
};

const documentApprovalWorkflows: ProblemPage = {
  type: 'problem',
  slug: 'how-to-document-approval-workflows',
  metaTitle: 'How to Document an Approval Workflow',
  metaDescription:
    'Document an approval workflow by recording a real run, capturing the routing, dollar thresholds, and exception paths approvers actually use.',
  h1: 'How to document an approval workflow',
  eyebrow: 'Problem',
  shortAnswer:
    'To document an approval workflow, record a real run from request to final sign-off and capture the routing rules, the dollar or risk thresholds that change who approves, and the exception paths people take when something does not fit. Approval processes are hard to write from memory because the routing and thresholds live in people’s habits. Ledgerium AI records how an approval actually moves, including the escalations and exceptions, and generates an SOP and process map, so the documented routing matches what approvers really do.',
  primaryKeyword: 'how to document an approval workflow',
  secondaryKeywords: ['document approval routing', 'approval workflow documentation', 'map approval thresholds'],
  searchIntent: 'informational',
  tags: ['problem', 'approvals', 'documentation', 'process-mapping'],
  related: ['workflow:invoice-approval-workflow', 'sopTemplate:invoice-approval-sop-template', 'persona:operations-managers'],
  originalDataPoint:
    'Ledgerium captures the threshold points where an approval path changes, who signs off, and how escalations are handled, so the routing is documented from observed approvals rather than from an approval matrix that describes intent.',
  honestLimitation:
    'Ledgerium records browser-based approval steps. Sign-offs that happen by email, chat, or in person need their own records attached to the documentation at the right step.',
  whyItHappens:
    'Approval workflows resist documentation because the routing depends on conditions, the amount, the type of request, an approver’s availability, and those rules live in habit rather than in a written matrix. The documented version shows one clean path while the real process branches at every threshold.',
  diagnostic: [
    'Nobody can say exactly who approves what above which amount',
    'Approvals stall and no one is sure where they are waiting',
    'Exceptions get routed by asking around rather than by a rule',
  ],
  manualApproach:
    'Write an approval matrix from memory and a policy document, then hope it matches practice. It captures the intended routing but misses the real thresholds, the escalations, and the exception paths people actually use when a request does not fit the matrix.',
  ledgeriumApproach:
    'Record real approvals as they move from request to sign-off. Ledgerium captures the routing, the threshold points where the path changes, and the exception handling, then generates an SOP and process map, so the documented workflow reflects how approvals truly flow.',
  steps: [
    { title: 'Record a full approval', detail: 'Capture a real request from submission to final sign-off.' },
    { title: 'Capture the routing', detail: 'Note who the request goes to and in what order.' },
    { title: 'Mark the thresholds', detail: 'Record the amounts or risk levels that change who approves.' },
    { title: 'Document the exceptions', detail: 'Capture the escalation paths for requests that do not fit.' },
    { title: 'Generate and review', detail: 'Produce the SOP and map and confirm the routing with an approver.' },
  ],
  commonMistakes: [
    'Writing an approval matrix from policy instead of from real approvals',
    'Documenting one threshold path and missing the escalations',
    'Leaving the exception routing undocumented so people ask around',
  ],
  faqs: [
    {
      q: 'How do I document an approval workflow?',
      a: 'Record a real approval from request to final sign-off and capture the routing, the thresholds that change who approves, and the exception paths. Ledgerium generates an SOP and process map from the recording.',
    },
    {
      q: 'Why are approval workflows hard to document?',
      a: 'Because the routing depends on conditions and thresholds that live in habit rather than a written matrix. The intended path looks clean while the real process branches at every threshold.',
    },
    {
      q: 'How do I capture approval thresholds?',
      a: 'Record approvals at different amounts or risk levels. The recording shows where the routing changes, so the documented thresholds come from real behavior rather than a guessed-at policy.',
    },
    {
      q: 'What about exception approvals?',
      a: 'Recording captures the escalations and the paths people take when a request does not fit the matrix, so the exception handling is documented instead of being passed around by word of mouth.',
    },
    {
      q: 'How do I keep the approval routing current?',
      a: 'Re-record an approval when the policy or thresholds change. The SOP and map regenerate, so the documented routing stays aligned with how approvals actually move.',
    },
  ],
  jsonLd: ['Article', 'HowTo', 'FAQPage', 'BreadcrumbList', 'WebPage', 'Organization'],
  author: { name: 'Ledgerium Research Team', sameAs: ['https://www.linkedin.com/company/ledgerium'] },
  updatedAt: '2026-06-27',
  published: true,
};

const trainEmployees: ProblemPage = {
  type: 'problem',
  slug: 'how-to-train-employees-on-a-process',
  metaTitle: 'How to Train Employees on a Process',
  metaDescription:
    'Train staff on a process using documentation generated from real work, so they learn how the job is actually done instead of by trial and error.',
  h1: 'How to train employees on a process',
  eyebrow: 'Problem',
  shortAnswer:
    'To train staff on a process, give them documentation generated from how the job is actually done, then have them follow it on a real task while an experienced person reviews the result. Training fails when the material describes an ideal process the team does not run. Ledgerium AI records the real workflows, including the exceptions, and turns them into SOPs and process maps trainees can follow step by step, so people learn the job as it truly works rather than picking it up by watching and guessing.',
  primaryKeyword: 'how to train employees on a process',
  secondaryKeywords: ['train staff on a process', 'process training material', 'train using SOPs'],
  searchIntent: 'informational',
  tags: ['problem', 'training', 'documentation', 'onboarding'],
  related: ['problem:how-to-reduce-onboarding-time', 'persona:training-managers', 'sopTemplate:employee-onboarding-sop-template'],
  originalDataPoint:
    'Because the training material is generated from a real run, every trainee follows the same documented steps and exceptions, which removes the variation that comes from each person learning by watching a different colleague.',
  honestLimitation:
    'Generated SOPs cover the observed browser steps. Judgment, customer rapport, and offline context still need an experienced person to teach alongside the documentation.',
  whyItHappens:
    'Training stays slow because the material is written from memory and does not match the real process, so trainees learn by shadowing and absorb whatever the person they watch happens to do. The result is inconsistent, depends on who trained whom, and leaves gaps the SOP should have covered.',
  diagnostic: [
    'New staff learn the job by watching whoever is free that day',
    'Two people trained on the same process work differently',
    'Training material does not match how the work is really done',
  ],
  manualApproach:
    'Pair the trainee with an experienced colleague and run a few sessions from slides. It depends on who does the training, varies between trainees, and the slides describe an ideal process rather than the real steps and exceptions.',
  ledgeriumApproach:
    'Record the real workflows and generate SOPs and process maps. Trainees follow documentation built from actual work, including the exceptions, and practice on real tasks, so training is consistent across people and reflects how the job is genuinely done.',
  steps: [
    { title: 'Record the real workflows', detail: 'Capture the processes a trainee must learn, as experts run them.' },
    { title: 'Generate the training docs', detail: 'Turn the recordings into SOPs and process maps to follow.' },
    { title: 'Sequence the learning path', detail: 'Order the SOPs the way a new staff member should learn them.' },
    { title: 'Practice on real tasks', detail: 'Have the trainee follow the SOP on a live task, not a slide.' },
    { title: 'Review and refresh', detail: 'Check the result and re-record when the process changes.' },
  ],
  commonMistakes: [
    'Training from slides that describe an ideal rather than the real process',
    'Letting each trainer teach the job their own way',
    'Using material that goes stale after the first training cohort',
  ],
  faqs: [
    {
      q: 'How do I train employees on a process effectively?',
      a: 'Give them documentation generated from real work and have them practice on a live task while an experienced person reviews the result. They learn the job as it actually works, not from idealized slides.',
    },
    {
      q: 'Why is shadowing a weak way to train?',
      a: 'Because trainees absorb whatever the person they watch happens to do, so training varies by who trained whom and leaves gaps. Documentation built from real work is consistent across every trainee.',
    },
    {
      q: 'What makes training material trustworthy?',
      a: 'When it matches the real process. SOPs generated from recordings show the actual steps and exceptions, so trainees follow how the job is genuinely done rather than a version nobody runs.',
    },
    {
      q: 'How do I keep training material current?',
      a: 'Re-record a workflow when it changes and regenerate the SOP, so the training path stays accurate for every new cohort instead of drifting from the real process.',
    },
    {
      q: 'Can trainees learn the exceptions, not just the happy path?',
      a: 'Yes. Recording the real workflow captures the exceptions and workarounds, which is exactly the knowledge trainees usually have to pick up the hard way.',
    },
  ],
  jsonLd: ['Article', 'HowTo', 'FAQPage', 'BreadcrumbList', 'WebPage', 'Organization'],
  author: { name: 'Ledgerium Research Team', sameAs: ['https://www.linkedin.com/company/ledgerium'] },
  updatedAt: '2026-06-27',
  published: true,
};

const documentFinanceProcess: ProblemPage = {
  type: 'problem',
  slug: 'how-to-document-a-finance-process',
  metaTitle: 'How to Document a Finance Process',
  metaDescription:
    'Document a finance process by recording a real run across each system, capturing the controls, approvals, and cross-system steps an auditor checks.',
  h1: 'How to document a finance process',
  eyebrow: 'Problem',
  shortAnswer:
    'To document a finance process, record a real run across each system it touches and capture the controls, the approvals, and the reconciliation steps that connect one tool to the next, so the documentation matches what actually happens at close. Finance work is hard to document because the controls and cross-system steps live in the preparer’s routine. Ledgerium AI records the real workflow, including the lookups and sign-offs between systems, and generates an SOP and process map, so the controls are documented from real work rather than from a policy binder.',
  primaryKeyword: 'how to document a finance process',
  secondaryKeywords: ['document financial controls', 'finance process documentation', 'document a close process'],
  searchIntent: 'informational',
  tags: ['problem', 'finance', 'controls', 'documentation'],
  related: ['workflow:journal-entry-workflow', 'department:finance', 'aiOpportunity:finance-operations'],
  originalDataPoint:
    'Ledgerium records the control steps a preparer performs between systems, the reconciliations, checks, and sign-offs, so the documented controls come from observed work rather than from a policy that states what should happen.',
  honestLimitation:
    'Ledgerium records the browser-based finance steps. Controls performed in desktop software or on paper need a person to add them to the recording and attach the supporting evidence.',
  whyItHappens:
    'Finance processes resist documentation because they cross several systems and carry controls the preparer performs from habit, a reconciliation here, a sign-off there. The binder describes the policy while the real work includes the lookups, the re-keying, and the checks that never made it onto paper.',
  diagnostic: [
    'A close step lives only in one preparer’s routine',
    'The control is performed but not written down anywhere',
    'The process crosses several systems and no document shows the whole path',
  ],
  manualApproach:
    'Pull the policy, interview the preparer about what they actually do, and write up the controls and steps before the next close. It depends on recall, misses the automatic checks, and leaves the cross-system reconciliation steps undocumented.',
  ledgeriumApproach:
    'Record the finance process as it runs across each system. Ledgerium captures the controls, approvals, and reconciliation steps between tools and generates an SOP and process map, so the documentation reflects the real work, including the checks the preparer does without thinking.',
  steps: [
    { title: 'Map the systems and controls', detail: 'List the tools the process touches and the controls it carries.' },
    { title: 'Record a real close run', detail: 'Capture the process end to end across each system.' },
    { title: 'Capture the controls', detail: 'Note the reconciliations, checks, and sign-offs as they happen.' },
    { title: 'Generate the documentation', detail: 'Produce an SOP and process map including the cross-system steps.' },
    { title: 'Attach offline records', detail: 'Add approvals and evidence that happen outside the browser.' },
  ],
  commonMistakes: [
    'Documenting the policy instead of the controls the preparer actually performs',
    'Missing the reconciliation steps between systems',
    'Leaving offline approvals and evidence out of the documentation',
  ],
  faqs: [
    {
      q: 'How do I document a finance process?',
      a: 'Record a real run across each system and capture the controls, approvals, and reconciliation steps. Ledgerium generates an SOP and process map, so the documentation matches what actually happens at close.',
    },
    {
      q: 'Why are finance processes hard to document?',
      a: 'Because they cross several systems and carry controls the preparer performs from habit. The policy binder misses the automatic checks and the cross-system steps that the real work depends on.',
    },
    {
      q: 'Does recording capture financial controls?',
      a: 'It captures the control steps the preparer performs in the browser, the reconciliations and checks, as they happen. Offline approvals and evidence are attached to the documentation at the right step.',
    },
    {
      q: 'How does this help with audit?',
      a: 'Because the SOP is documented from a real run, the controls described match what an auditor observes, which closes the common gap between the written procedure and the work performed.',
    },
    {
      q: 'How do I keep finance documentation current?',
      a: 'Re-record the process when a system or control changes and regenerate the SOP, so the documented controls stay aligned with how the close is actually run.',
    },
  ],
  jsonLd: ['Article', 'HowTo', 'FAQPage', 'BreadcrumbList', 'WebPage', 'Organization'],
  author: { name: 'Ledgerium Research Team', sameAs: ['https://www.linkedin.com/company/ledgerium'] },
  updatedAt: '2026-06-27',
  published: true,
};

const measureCycleTime: ProblemPage = {
  type: 'problem',
  slug: 'how-to-measure-cycle-time',
  metaTitle: 'How to Measure Process Cycle Time',
  metaDescription:
    'Measure process cycle time by recording a workflow and splitting it into work time and wait time, so you see where the days actually go.',
  h1: 'How to measure process cycle time',
  eyebrow: 'Problem',
  shortAnswer:
    'To measure process cycle time, record the workflow from start to finish and split the total into work time, the active steps, and wait time, the queues and handoffs in between, so you see where the days actually go. People underestimate cycle time because they only feel the active work, not the waiting. Ledgerium AI records the real process and separates work from wait on every step, so cycle time is measured from observed runs rather than estimated.',
  primaryKeyword: 'how to measure process cycle time',
  secondaryKeywords: ['measure cycle time', 'work time vs wait time', 'process cycle time analysis'],
  searchIntent: 'informational',
  tags: ['problem', 'cycle-time', 'measurement', 'process-intelligence'],
  related: ['problem:how-to-identify-process-bottlenecks', 'persona:operations-managers', 'workflow:incident-management-workflow'],
  originalDataPoint:
    'Ledgerium splits every step into work time and wait time, so cycle time is reported as activity plus queues rather than a single estimate, which usually reveals that the wait, not the work, is most of the elapsed time.',
  honestLimitation:
    'Ledgerium measures the browser-based steps it records. Wait time inside physical or desktop-only steps needs separate observation to include in the cycle time.',
  whyItHappens:
    'Cycle time gets underestimated because people report the active work and forget the waiting between steps. A task that takes ten minutes of work can take three days of cycle time, and without separating work from wait the queues that consume most of the elapsed time stay invisible.',
  diagnostic: [
    'A process takes days end to end but only minutes of actual work',
    'Nobody can say how much of the cycle is work versus waiting',
    'Estimates of how long the process takes are based on the active steps only',
  ],
  manualApproach:
    'Ask people how long the process takes and average their answers. They report the active work they remember and leave out the waiting, so the estimate captures a fraction of the real cycle time and the queues stay hidden.',
  ledgeriumApproach:
    'Record the process from start to finish. Ledgerium measures each step and splits it into work time and wait time, so cycle time is the sum of observed activity and queues, and you can see which part, the work or the wait, drives the elapsed time.',
  steps: [
    { title: 'Record end to end', detail: 'Capture the workflow from the first step to the last.' },
    { title: 'Split work from wait', detail: 'Review how much of each step is active versus waiting.' },
    { title: 'Total the cycle time', detail: 'Add work and wait across the steps to get the real cycle time.' },
    { title: 'Find the biggest wait', detail: 'Identify the queue or handoff that adds the most elapsed time.' },
    { title: 'Re-record to track it', detail: 'Capture again after a change to see cycle time move.' },
  ],
  commonMistakes: [
    'Reporting only the active work and ignoring the waiting',
    'Estimating cycle time from memory instead of measuring it',
    'Treating a fast task as a fast cycle when it waits in a queue',
  ],
  faqs: [
    {
      q: 'How do I measure process cycle time?',
      a: 'Record the workflow from start to finish and split the total into work time and wait time. Cycle time is the sum of observed activity and queues, measured from real runs rather than estimated.',
    },
    {
      q: 'What is the difference between work time and wait time?',
      a: 'Work time is the active steps someone performs; wait time is the queues and handoffs in between. Cycle time is both together, and the wait is usually the larger and more hidden part.',
    },
    {
      q: 'Why is cycle time usually underestimated?',
      a: 'Because people report the active work they remember and forget the waiting. A ten-minute task can carry days of cycle time once the queues between steps are counted.',
    },
    {
      q: 'Which part of cycle time should I reduce first?',
      a: 'Usually the largest wait. The recording ranks where elapsed time accumulates, so you target the queue that adds the most rather than speeding up an already-fast active step.',
    },
    {
      q: 'How do I track cycle time over time?',
      a: 'Re-record the process after a change and compare. Watching the work and wait split move shows whether the cycle time actually dropped and where the remaining delay sits.',
    },
  ],
  jsonLd: ['Article', 'HowTo', 'FAQPage', 'BreadcrumbList', 'WebPage', 'Organization'],
  author: { name: 'Ledgerium Research Team', sameAs: ['https://www.linkedin.com/company/ledgerium'] },
  updatedAt: '2026-06-27',
  published: true,
};

const documentForCompliance: ProblemPage = {
  type: 'problem',
  slug: 'how-to-document-a-process-for-compliance',
  metaTitle: 'How to Document a Process for Compliance',
  metaDescription:
    'Produce compliance-ready process documentation by recording how the work is really done, so your SOPs and evidence match what an auditor observes.',
  h1: 'How to document a process for compliance',
  eyebrow: 'Problem',
  shortAnswer:
    'To produce compliance-ready process documentation, record how the work is actually performed and generate the SOPs, process maps, and step evidence from that recording, so what you hand a reviewer matches what the team really does. Compliance documentation fails when it describes a policy the team does not follow. Ledgerium AI records the real workflow, including the controls and exceptions, and produces documentation tied to the observed run, so the evidence reflects practice and the gap between the written procedure and the work is closed before a reviewer finds it.',
  primaryKeyword: 'how to document a process for compliance',
  secondaryKeywords: ['compliance process documentation', 'audit-ready documentation', 'compliance evidence from real work'],
  searchIntent: 'informational',
  tags: ['problem', 'compliance', 'documentation', 'audit'],
  related: ['problem:how-to-prepare-for-a-process-audit', 'persona:compliance-teams', 'industry:banking'],
  originalDataPoint:
    'Because Ledgerium documents from a real run, the SOP and the observed work share one source, so the control a reviewer reads about is the same control they would watch performed, which removes the most common compliance finding.',
  honestLimitation:
    'Ledgerium evidences the browser-based steps it records. Approvals, retention, and sign-offs performed offline still need their own records attached to the documentation.',
  whyItHappens:
    'Compliance documentation drifts from reality because it is written to satisfy a regulation rather than to describe the work. The team runs a different process than the binder states, so reviewers find a gap between what is documented and what is actually done.',
  diagnostic: [
    'Your documented procedures do not match how the team really works',
    'Compliance evidence is recreated from memory when a review is due',
    'Past reviews flagged gaps between the written policy and practice',
  ],
  manualApproach:
    'Write procedures from the regulation, collect screenshots, and assemble a binder before the review. It describes the intended process, depends on recall, and leaves a gap between the documented control and the work the team actually performs.',
  ledgeriumApproach:
    'Record the process as it actually runs. Ledgerium generates the SOP, process map, and step evidence from that recording, so the documentation and the observed work share one source and a reviewer sees the control performed rather than only described.',
  steps: [
    { title: 'List the in-scope processes', detail: 'Identify the workflows the compliance requirement covers.' },
    { title: 'Record real runs', detail: 'Capture each process as the team actually performs it today.' },
    { title: 'Generate the evidence', detail: 'Produce SOPs, process maps, and step evidence from the recordings.' },
    { title: 'Attach offline controls', detail: 'Add approvals, sign-offs, and records that happen off-screen.' },
    { title: 'Review and refresh', detail: 'Confirm the documentation matches practice and re-record on change.' },
  ],
  commonMistakes: [
    'Writing documentation to the regulation instead of the real process',
    'Recreating evidence from memory under review pressure',
    'Leaving offline approvals and controls out of the evidence',
  ],
  faqs: [
    {
      q: 'How do I produce compliance-ready process documentation?',
      a: 'Record how the work is actually performed and generate SOPs, process maps, and step evidence from the recording. The documentation matches what a reviewer observes rather than describing an ideal process.',
    },
    {
      q: 'Why does compliance documentation drift from reality?',
      a: 'Because it is written to satisfy a regulation rather than to describe the work, so the team runs a different process than the binder states. Documenting from a real run closes that gap.',
    },
    {
      q: 'What evidence does a recorded process provide?',
      a: 'A step-by-step SOP and a process map drawn from the observed run, showing the real steps, systems, and controls. Offline approvals and sign-offs are attached to complete the record.',
    },
    {
      q: 'How current does compliance documentation need to be?',
      a: 'It should reflect the process as it runs now. Re-recording when the process changes keeps the SOP, map, and evidence aligned with current practice rather than a past version.',
    },
    {
      q: 'Is recorded documentation enough on its own?',
      a: 'It documents the browser-based steps and controls precisely. Offline approvals, retention records, and sign-offs still need to be attached so the compliance evidence is complete.',
    },
  ],
  jsonLd: ['Article', 'HowTo', 'FAQPage', 'BreadcrumbList', 'WebPage', 'Organization'],
  author: { name: 'Ledgerium Research Team', sameAs: ['https://www.linkedin.com/company/ledgerium'] },
  updatedAt: '2026-06-27',
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
  standardizeWorkflows,
  prepareForAudit,
  documentAcrossSystems,
  keepSopsCurrent,
  measureImprovement,
  identifyBottlenecks,
  reduceVariation,
  documentWithoutInterviews,
  reduceRework,
  documentApprovalWorkflows,
  trainEmployees,
  documentFinanceProcess,
  measureCycleTime,
  documentForCompliance,
];
