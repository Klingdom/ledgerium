import type { PersonaPage } from '../types';

/** Persona pages. Mid-funnel; validate product fit for a specific buyer/champion. */

const operationsManager: PersonaPage = {
  type: 'persona',
  slug: 'operations-managers',
  metaTitle: 'Ledgerium AI for Operations Managers',
  metaDescription:
    'Operations managers use Ledgerium to document real workflows, build SOPs, and find improvements by recording how work actually happens.',
  h1: 'Ledgerium AI for operations managers',
  eyebrow: 'For operations managers',
  shortAnswer:
    'Ledgerium helps operations managers document how work actually happens, then turn it into SOPs, process maps, and improvement ideas. Instead of interviewing everyone and writing procedures from memory, you record the real workflow once and get a step-by-step SOP, a process map, and a report showing where time is lost. That gives you a current-state baseline you can standardize, measure, and improve, and that new hires can actually follow, without pulling your team off their work to write documentation.',
  primaryKeyword: 'process documentation for operations managers',
  secondaryKeywords: ['operations SOP software', 'document team workflows', 'standardize operations processes'],
  searchIntent: 'commercial',
  tags: ['persona', 'operations', 'sop', 'standardization', 'documentation'],
  related: ['workflow:invoice-approval-workflow', 'workflow:month-end-close-workflow', 'compare:tango'],
  originalDataPoint:
    'Ledgerium separates work time from wait time on every recorded process, so an operations manager can see that most cycle time is usually waiting and handoffs, not the active task, which is where the fastest improvements come from.',
  honestLimitation:
    'Ledgerium documents browser-based work. Steps that happen in native desktop software or offline still need a human to add context.',
  whoThisIsFor:
    'Operations managers who own how a team runs day to day and are responsible for consistency, onboarding, and continuous improvement.',
  painPoints: [
    'SOPs are written from memory and drift out of date',
    'Documentation pulls the team off real work',
    'No current-state baseline to measure improvements against',
    'New hires take too long to reach full productivity',
  ],
  whatTheySearchFor: [
    'How to document a business process',
    'How to standardize team workflows',
    'How to create SOPs without interviewing everyone',
    'How to reduce onboarding time',
  ],
  jobsToBeDone: [
    'Capture a reliable current-state baseline of a process',
    'Standardize how the team performs key workflows',
    'Onboard new hires faster with documentation they trust',
    'Find and remove process waste',
  ],
  commonWorkflowsToDocument: [
    'Invoice and expense approval',
    'Month-end and reporting routines',
    'Customer onboarding and handoffs',
    'Vendor and supplier setup',
  ],
  dayInTheLife:
    'An operations manager spends the morning answering the same how-do-I questions a written SOP should have covered, then firefights a handoff that fell between two teams. The procedures exist somewhere, but they describe an ideal flow nobody follows. By afternoon the real question is not what the process should be, but what it actually is, and nobody has a current, trustworthy picture of that.',
  howLedgeriumHelps:
    'Record each key workflow once while someone runs it normally. Ledgerium turns the recording into an SOP your team can follow, a process map you can share, and a report that shows where the process waits and reworks. You get a current-state baseline you can standardize against and measure improvements from, without a documentation project.',
  faqs: [
    {
      q: 'How does Ledgerium help operations managers?',
      a: 'It records the real workflow and generates an SOP, a process map, and an improvement report from it. You get accurate, current documentation and a baseline to measure against, without pulling the team off their work to write procedures.',
    },
    {
      q: 'Do I have to interview everyone to document a process?',
      a: 'No. You record the process once as someone performs it. The SOP and process map come from that recording, so you capture the real steps, including workarounds and exceptions, without a round of interviews.',
    },
    {
      q: 'Can I use this to standardize how my team works?',
      a: 'Yes. Recording the real process from your best run gives you a standard others can follow, and re-recording later shows whether the standard is actually holding across the team.',
    },
    {
      q: 'Will this help with onboarding?',
      a: 'Yes. New hires follow an SOP generated from real work rather than an idealized document, so they reach productivity faster and ask fewer repeat questions.',
    },
    {
      q: 'How do I find where to improve?',
      a: 'The report separates work time from wait time and highlights rework, so you can see where cycle time is actually lost. Most of it is usually waiting and handoffs rather than the active task.',
    },
  ],
  jsonLd: ['Article', 'FAQPage', 'BreadcrumbList', 'WebPage', 'Organization'],
  author: { name: 'Ledgerium Research Team', sameAs: ['https://www.linkedin.com/company/ledgerium'] },
  updatedAt: '2026-06-26',
  published: true,
};

const consultants: PersonaPage = {
  type: 'persona',
  slug: 'consultants',
  metaTitle: 'Ledgerium AI for Consultants and Advisors',
  metaDescription:
    'Consultants use Ledgerium to capture client current-state fast, recording real workflows to generate SOPs, process maps, and improvement findings.',
  h1: 'Ledgerium AI for consultants',
  eyebrow: 'For consultants',
  shortAnswer:
    'Ledgerium helps consultants capture a client current-state quickly and credibly. Instead of running days of interviews and workshops to reconstruct how a process works, you record the real workflow and get a process map, an SOP, and a report that shows bottlenecks and rework. That gives you an evidence-based current-state you can put in front of a client on day one, document deliverables your engagement can reuse, and a baseline to measure the improvement you deliver against.',
  primaryKeyword: 'process documentation for consultants',
  secondaryKeywords: ['current state mapping tool', 'consultant process mapping', 'document client workflows'],
  searchIntent: 'commercial',
  tags: ['persona', 'consulting', 'process-mapping', 'documentation', 'process-intelligence'],
  related: ['workflow:customer-onboarding-workflow', 'software:salesforce', 'compare:manual-sop-documentation'],
  originalDataPoint:
    'Because Ledgerium records the real workflow with timing, a consultant gets a current-state map backed by observed evidence rather than interview recall, which clients challenge far less than a workshop-built diagram.',
  honestLimitation:
    'Ledgerium captures browser-based work. Processes that run mainly in desktop software or on paper still need supplementary observation.',
  whoThisIsFor:
    'Management, operations, and process-improvement consultants who need to document client current-state quickly and deliver credible, evidence-based recommendations.',
  painPoints: [
    'Current-state mapping eats billable days in interviews and workshops',
    'Clients dispute diagrams built from recall',
    'Deliverables are hard to reuse across engagements',
    'No baseline to prove the improvement delivered',
  ],
  whatTheySearchFor: [
    'How to create current state process maps',
    'How to baseline a workflow',
    'How to document a process quickly for clients',
    'Process mapping tool for consultants',
  ],
  jobsToBeDone: [
    'Capture client current-state fast and credibly',
    'Produce reusable SOP and process-map deliverables',
    'Identify waste and automation opportunities to recommend',
    'Establish a baseline to measure delivered improvement',
  ],
  commonWorkflowsToDocument: [
    'Order-to-cash and approval flows',
    'Onboarding and handoff processes',
    'Back-office and finance routines',
    'Support and service workflows',
  ],
  dayInTheLife:
    'A consultant starts an engagement knowing the first week will disappear into interviews to reconstruct how a process really works, and that the resulting diagram will be argued over in the readout because it came from memory. The valuable analysis cannot start until the current-state is agreed, so the clock runs on mapping work the client barely values.',
  howLedgeriumHelps:
    'Record the client process as their team performs it. Ledgerium produces an evidence-based current-state map, an SOP, and a findings report with bottlenecks and automation candidates. You compress current-state capture from days to hours, walk in with observed evidence rather than recall, and reuse the deliverables across similar engagements.',
  faqs: [
    {
      q: 'How does Ledgerium help consultants?',
      a: 'It records the client process and generates a current-state map, an SOP, and a findings report. You capture current-state in hours instead of days, with observed evidence clients dispute far less than interview-based diagrams.',
    },
    {
      q: 'Can I capture current-state without long interviews?',
      a: 'Yes. You record the real process once as the client team performs it, and the map and SOP come from that recording, so you avoid reconstructing the process through a week of interviews.',
    },
    {
      q: 'Does it give me a baseline to prove value?',
      a: 'Yes. The recorded process is a measurable baseline. Re-recording after changes shows the improvement in timing and rework, which makes the value you delivered concrete.',
    },
    {
      q: 'Can I reuse the deliverables across clients?',
      a: 'The SOPs and process maps are structured outputs you can adapt across similar engagements, rather than bespoke diagrams rebuilt from scratch each time.',
    },
    {
      q: 'Is the output credible enough for a client readout?',
      a: 'It is generated from observed work with timing and system context, so it reflects what actually happens. That evidence base holds up in a readout better than a workshop diagram built from recall.',
    },
  ],
  jsonLd: ['Article', 'FAQPage', 'BreadcrumbList', 'WebPage', 'Organization'],
  author: { name: 'Ledgerium Research Team', sameAs: ['https://www.linkedin.com/company/ledgerium'] },
  updatedAt: '2026-06-26',
  published: true,
};

const revopsManager: PersonaPage = {
  type: 'persona',
  slug: 'revops-managers',
  metaTitle: 'Ledgerium AI for RevOps Managers',
  metaDescription:
    'RevOps managers use Ledgerium to document CRM workflows and handoffs by recording the real process and generating SOPs, process maps, and automation findings.',
  h1: 'Ledgerium AI for RevOps managers',
  eyebrow: 'For RevOps',
  shortAnswer:
    'Ledgerium helps RevOps managers document the CRM workflows and cross-team handoffs that revenue runs on. Lead routing, opportunity handoff, and renewal processes live across Salesforce, email, and billing, and the real steps are rarely written down. You record the actual process and get an SOP, a process map, and a report showing where deals and handoffs stall, so you can standardize the motion, onboard reps faster, and find the steps worth automating.',
  primaryKeyword: 'RevOps process documentation',
  secondaryKeywords: ['document CRM workflows', 'sales process documentation', 'RevOps SOP'],
  searchIntent: 'commercial',
  tags: ['persona', 'revops', 'sales-operations', 'crm', 'salesforce'],
  related: ['software:salesforce', 'workflow:customer-onboarding-workflow', 'compare:tango'],
  originalDataPoint:
    'Revenue handoffs lose time between teams, not inside a single task. Ledgerium timestamps each step, so a RevOps manager can see how long a lead or deal waits at each handoff rather than only how long the active work takes.',
  honestLimitation:
    'Ledgerium records browser-based steps. Automations that run inside the CRM, such as flows and assignment rules, are not observed directly and need documenting from their visible effect.',
  whoThisIsFor:
    'RevOps and sales-operations managers who own the CRM, the revenue process, and the handoffs between sales, success, and finance.',
  painPoints: [
    'Lead routing and handoff logic live in people’s heads',
    'Reps follow the process inconsistently',
    'No clear picture of where deals stall between teams',
    'Onboarding new reps to the motion is slow',
  ],
  whatTheySearchFor: [
    'How to document a sales process',
    'How to document CRM workflows',
    'How to standardize lead handoffs',
    'Document Salesforce processes',
  ],
  jobsToBeDone: [
    'Document the real revenue motion across systems',
    'Standardize lead routing and handoffs',
    'Onboard reps to a consistent process',
    'Find handoff delays and automation opportunities',
  ],
  commonWorkflowsToDocument: [
    'Lead qualification and routing',
    'Opportunity-to-onboarding handoff',
    'Renewal and expansion process',
    'Quote and approval routing',
  ],
  dayInTheLife:
    'A RevOps manager fields a complaint that leads are not being followed up, then discovers the routing rule everyone assumed exists was never documented and three reps each work it differently. The motion spans Salesforce, email, and billing, and the only record of how it really runs is tribal knowledge that changes every quarter.',
  howLedgeriumHelps:
    'Record the real revenue process across the systems it touches. Ledgerium generates an SOP, a process map of the full motion, and a report that shows where handoffs wait. You get a documented, consistent process to train reps on, plus the evidence to decide which steps are worth automating.',
  faqs: [
    {
      q: 'How does Ledgerium help RevOps managers?',
      a: 'It records the real revenue process across CRM, email, and billing and generates an SOP, a process map, and a report on where handoffs stall. You get a documented, consistent motion and clear automation candidates.',
    },
    {
      q: 'Can it document a process that spans Salesforce and other tools?',
      a: 'Yes. A single recording captures the steps across each browser-based system in the motion, so the SOP and map reflect the full cross-system process, not just the CRM.',
    },
    {
      q: 'Will this help standardize how reps work?',
      a: 'Yes. Recording the real motion from a strong run gives you a standard to train reps on, and re-recording shows whether reps are actually following it.',
    },
    {
      q: 'Does Ledgerium capture CRM automation?',
      a: 'It captures what users do and see in the browser. Assignment rules and flows that run inside the CRM are not observed directly, so document their effect from the visible result.',
    },
    {
      q: 'How do I find what to automate?',
      a: 'The report highlights repetitive steps and handoff delays, which are the strongest automation candidates. Ledgerium scores these from the recorded process.',
    },
  ],
  jsonLd: ['Article', 'FAQPage', 'BreadcrumbList', 'WebPage', 'Organization'],
  author: { name: 'Ledgerium Research Team', sameAs: ['https://www.linkedin.com/company/ledgerium'] },
  updatedAt: '2026-06-26',
  published: true,
};

const businessAnalyst: PersonaPage = {
  type: 'persona',
  slug: 'business-analysts',
  metaTitle: 'Ledgerium AI for Business Analysts',
  metaDescription:
    'Business analysts use Ledgerium to capture as-is processes by recording real workflows and producing process maps, SOPs, and grounded requirements.',
  h1: 'Ledgerium AI for business analysts',
  eyebrow: 'For business analysts',
  shortAnswer:
    'Ledgerium helps business analysts capture an accurate as-is process without reconstructing it from interviews. You record the real workflow and get a process map, an SOP, and timing data that show how the process actually runs, including the exceptions stakeholders forget to mention. That gives you an evidence-based as-is to anchor requirements, gap analysis, and to-be design, and a baseline to measure the change you specify against.',
  primaryKeyword: 'as-is process documentation',
  secondaryKeywords: ['business analyst process mapping', 'capture as-is process', 'requirements process documentation'],
  searchIntent: 'commercial',
  tags: ['persona', 'business-analysis', 'process-mapping', 'requirements', 'documentation'],
  related: ['workflow:purchase-order-workflow', 'software:servicenow', 'compare:process-mining'],
  originalDataPoint:
    'Ledgerium records the steps between systems that stakeholders forget in interviews, the lookups, copies, and manual checks, so an analyst’s as-is reflects the real process rather than the cleaned-up version people describe.',
  honestLimitation:
    'Ledgerium captures browser-based work. Decisions made verbally and offline steps still need the analyst to add context.',
  whoThisIsFor:
    'Business and systems analysts who document as-is processes, gather requirements, and design to-be processes for change and technology projects.',
  painPoints: [
    'Stakeholders describe an idealized process, not the real one',
    'As-is mapping takes weeks of interviews and revisions',
    'Exceptions and workarounds surface late and derail scope',
    'No measurable baseline for the to-be design',
  ],
  whatTheySearchFor: [
    'How to capture an as-is process',
    'How to create current state process maps',
    'How to document a process for requirements',
    'Process mapping for business analysts',
  ],
  jobsToBeDone: [
    'Capture an accurate, evidence-based as-is process',
    'Surface exceptions and workarounds early',
    'Ground requirements and gap analysis in observed work',
    'Establish a baseline to measure the to-be against',
  ],
  commonWorkflowsToDocument: [
    'Approval and routing processes',
    'Service and request fulfillment',
    'Finance and back-office routines',
    'Cross-system handoffs',
  ],
  dayInTheLife:
    'A business analyst books a third round of interviews because the as-is map keeps changing every time a new exception surfaces. Stakeholders describe the process they think they follow, the project plan assumes the as-is is settled, and the real workarounds only appear once development has already started against the wrong baseline.',
  howLedgeriumHelps:
    'Record the process as people actually perform it. Ledgerium produces an as-is process map, an SOP, and timing data that expose the exceptions and workarounds up front. You anchor requirements and gap analysis in observed evidence, reduce rework from late surprises, and keep a baseline to measure the to-be design against.',
  faqs: [
    {
      q: 'How does Ledgerium help business analysts?',
      a: 'It records the real process and generates an as-is map, an SOP, and timing data. You capture an accurate, evidence-based as-is without weeks of interviews, and exceptions surface early instead of mid-project.',
    },
    {
      q: 'Why is a recorded as-is better than interviews?',
      a: 'Stakeholders describe an idealized process. A recording captures the real steps, including the lookups and workarounds people forget, so the as-is reflects how work actually happens.',
    },
    {
      q: 'Can I use it for requirements and gap analysis?',
      a: 'Yes. An evidence-based as-is anchors requirements and gap analysis in what actually happens, which reduces scope surprises and rework later in the project.',
    },
    {
      q: 'Does it give me a baseline for the to-be?',
      a: 'Yes. The recorded process is a measurable baseline. After the change ships, re-recording shows the difference against the as-is in timing and steps.',
    },
    {
      q: 'Does Ledgerium capture work across multiple systems?',
      a: 'Yes. A single recording captures the steps across each browser-based system in the process, so the as-is reflects the full cross-system flow.',
    },
  ],
  jsonLd: ['Article', 'FAQPage', 'BreadcrumbList', 'WebPage', 'Organization'],
  author: { name: 'Ledgerium Research Team', sameAs: ['https://www.linkedin.com/company/ledgerium'] },
  updatedAt: '2026-06-26',
  published: true,
};

const maIntegrationLead: PersonaPage = {
  type: 'persona',
  slug: 'ma-integration-leads',
  metaTitle: 'Ledgerium AI for M&A Integration Leads',
  metaDescription:
    'M&A integration leads use Ledgerium to capture acquired-company processes fast by recording real workflows into SOPs, process maps, and findings.',
  h1: 'Ledgerium AI for M&A integration leads',
  eyebrow: 'For M&A integration',
  shortAnswer:
    'Ledgerium helps M&A integration leads capture how an acquired company actually works before harmonizing systems. Post-close timelines are tight and the target’s processes live in people’s heads, so reconstructing them through interviews is slow and risky. You record the real workflows and get SOPs, process maps, and a report on differences and overlaps, giving you an evidence-based current-state to plan harmonization, retain process knowledge as people leave, and measure the integration against.',
  primaryKeyword: 'M&A process documentation',
  secondaryKeywords: ['post-merger integration process mapping', 'document acquired company processes', 'capture tribal knowledge'],
  searchIntent: 'commercial',
  tags: ['persona', 'm-and-a', 'integration', 'process-mapping', 'documentation'],
  related: ['workflow:month-end-close-workflow', 'software:netsuite', 'compare:process-mining'],
  originalDataPoint:
    'When key people leave after a deal, their process knowledge usually goes with them. Ledgerium captures the real workflow as structured, recorded evidence, so the acquired-company process survives even after the person who ran it departs.',
  honestLimitation:
    'Ledgerium captures browser-based work. Processes in legacy desktop systems or on paper at the target need supplementary capture.',
  whoThisIsFor:
    'M&A integration and post-merger leads who must document how an acquired company works and harmonize it with the parent under tight timelines.',
  painPoints: [
    'Acquired-company processes live in tribal knowledge',
    'Tight post-close timelines leave no time for long interviews',
    'Key people leave and take process knowledge with them',
    'No clear view of overlaps and differences to harmonize',
  ],
  whatTheySearchFor: [
    'How to document acquired company processes',
    'How to capture tribal knowledge',
    'Post-merger process mapping',
    'How to baseline a workflow before integration',
  ],
  jobsToBeDone: [
    'Capture acquired-company current-state quickly',
    'Retain process knowledge before people leave',
    'Compare overlaps and differences to plan harmonization',
    'Establish a baseline to measure the integration against',
  ],
  commonWorkflowsToDocument: [
    'Finance and close routines',
    'Order-to-cash and procurement',
    'Customer onboarding and support',
    'Approval and control processes',
  ],
  dayInTheLife:
    'An integration lead has ninety days to harmonize two finance operations and just learned the acquired team’s controller is leaving in three weeks. The real close process is in that person’s head, the documentation is years out of date, and every day spent reconstructing it through interviews is a day not spent planning the integration.',
  howLedgeriumHelps:
    'Have the acquired team record their key processes as they run them. Ledgerium produces SOPs, process maps, and a report on overlaps and differences with the parent. You capture current-state in days, retain critical process knowledge before people leave, and plan harmonization from evidence rather than interviews under time pressure.',
  faqs: [
    {
      q: 'How does Ledgerium help with M&A integration?',
      a: 'The acquired team records their key workflows, and Ledgerium generates SOPs, process maps, and a report on overlaps and differences. You capture current-state in days and plan harmonization from evidence, not interviews.',
    },
    {
      q: 'Can it capture knowledge before key people leave?',
      a: 'Yes. Recording a process turns one person’s tribal knowledge into structured, reusable documentation, so the process survives after they depart.',
    },
    {
      q: 'How fast can we document the target’s processes?',
      a: 'Each workflow is recorded once as someone performs it, so documentation time is roughly the time to run the process once, far faster than reconstructing it through rounds of interviews.',
    },
    {
      q: 'Does it help compare the two companies’ processes?',
      a: 'Yes. With both sides recorded, you can compare the real steps to find overlaps, gaps, and differences, which is the basis for a harmonization plan.',
    },
    {
      q: 'Does it give a baseline for the integration?',
      a: 'Yes. The recorded current-state is a measurable baseline. Re-recording after harmonization shows whether the integrated process is actually working.',
    },
  ],
  jsonLd: ['Article', 'FAQPage', 'BreadcrumbList', 'WebPage', 'Organization'],
  author: { name: 'Ledgerium Research Team', sameAs: ['https://www.linkedin.com/company/ledgerium'] },
  updatedAt: '2026-06-26',
  published: true,
};

const processExcellenceLead: PersonaPage = {
  type: 'persona',
  slug: 'process-excellence-leads',
  metaTitle: 'Ledgerium AI for Process Excellence Leads',
  metaDescription:
    'Process excellence leads use Ledgerium to baseline workflows, find waste, and measure improvement by recording how work really happens.',
  h1: 'Ledgerium AI for process excellence leads',
  eyebrow: 'For process excellence',
  shortAnswer:
    'Ledgerium helps process excellence and continuous improvement leads baseline a process from real work, find waste, and prove the gains. Instead of building a value-stream map from a workshop and recall, you record the actual workflow and get a process map, timing, variation between people, and rework data. That gives you an evidence-based current-state to target waste, a measurable baseline for every improvement, and a fast way to check whether a standard is holding after you roll it out.',
  primaryKeyword: 'process improvement documentation',
  secondaryKeywords: ['baseline a workflow', 'find process waste', 'continuous improvement process mapping'],
  searchIntent: 'commercial',
  tags: ['persona', 'process-excellence', 'continuous-improvement', 'standardization', 'process-intelligence'],
  related: ['workflow:invoice-approval-workflow', 'compare:process-mining', 'software:servicenow'],
  originalDataPoint:
    'Ledgerium measures variation between people running the same process, so an improvement lead can quantify how much a workflow differs run to run, which is the standardization gap that value-stream workshops only estimate.',
  honestLimitation:
    'Ledgerium captures browser-based work. Physical and desktop-only steps in a value stream still need separate observation.',
  whoThisIsFor:
    'Process excellence, continuous improvement, and operational-excellence leads who baseline processes, remove waste, and standardize how work is done.',
  painPoints: [
    'Value-stream maps are built from workshops and recall, not real data',
    'No measurable baseline to prove improvement',
    'Hard to quantify variation between people',
    'Standards drift after rollout with no way to check',
  ],
  whatTheySearchFor: [
    'How to baseline a workflow',
    'How to find process waste',
    'How to create current state process maps',
    'How to standardize workflows',
  ],
  jobsToBeDone: [
    'Baseline a process from observed work',
    'Quantify waste, wait time, and rework',
    'Measure variation between people',
    'Prove and sustain improvement after rollout',
  ],
  commonWorkflowsToDocument: [
    'Approval and routing processes',
    'Finance and close routines',
    'Service and request fulfillment',
    'High-volume back-office tasks',
  ],
  dayInTheLife:
    'A process excellence lead runs a kaizen with a value-stream map drawn from sticky notes and best guesses, then struggles to prove the improvement landed because there was never a hard baseline. Everyone agrees the process varies between people, but nobody can put a number on it, so the standard that gets rolled out quietly erodes within a month.',
  howLedgeriumHelps:
    'Record the process from several real runs. Ledgerium produces a process map with timing, wait time, rework, and variation between people. You target waste with evidence, set a hard baseline for every improvement, prove the gain by re-recording, and check whether the standard is holding after rollout.',
  faqs: [
    {
      q: 'How does Ledgerium support continuous improvement?',
      a: 'It records real runs of a process and produces a map with timing, wait time, rework, and variation. You get an evidence-based baseline to target waste and a way to prove and sustain improvement by re-recording.',
    },
    {
      q: 'How do I baseline a workflow?',
      a: 'Record the process as it runs today. The recording becomes the baseline, with timing and variation data, so later improvements can be measured against it rather than against a guess.',
    },
    {
      q: 'Can it quantify variation between people?',
      a: 'Yes. Recording several runs of the same process shows how much the steps and timing vary between people, which quantifies the standardization gap a workshop can only estimate.',
    },
    {
      q: 'How do I prove an improvement worked?',
      a: 'Re-record the process after the change. Ledgerium compares it to the baseline, so the reduction in time, steps, or rework is concrete rather than asserted.',
    },
    {
      q: 'Will it tell me if a standard is holding?',
      a: 'Yes. Re-recording later shows whether people are still following the standard or whether the process has drifted, so you can intervene before it fully erodes.',
    },
  ],
  jsonLd: ['Article', 'FAQPage', 'BreadcrumbList', 'WebPage', 'Organization'],
  author: { name: 'Ledgerium Research Team', sameAs: ['https://www.linkedin.com/company/ledgerium'] },
  updatedAt: '2026-06-26',
  published: true,
};

export const PERSONA_PAGES: readonly PersonaPage[] = [
  operationsManager,
  consultants,
  revopsManager,
  businessAnalyst,
  maIntegrationLead,
  processExcellenceLead,
];
