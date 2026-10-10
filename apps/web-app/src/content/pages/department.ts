import type { DepartmentPage } from '../types';
import { SITE_AUTHOR } from '@/lib/seo/organization';

/** Department hub pages. Mid-funnel; aggregate workflows, problems, and AI-readiness scores. */

const finance: DepartmentPage = {
  type: 'department',
  slug: 'finance',
  metaTitle: 'Finance Workflows: Document, Standardize, Improve',
  metaDescription:
    'Document and improve finance workflows by recording how they really run. Get SOPs, process maps, and AI-readiness scores for AP, close, expenses, and approvals.',
  h1: 'Finance workflows',
  eyebrow: 'Department',
  shortAnswer:
    'Finance runs on repeatable workflows like invoice approval, the month-end close, expense reporting, and purchase orders, and most of them are documented from memory if at all. Recording how each one actually runs gives you an SOP, a process map, and a report showing where time is lost and what is worth automating. Ledgerium captures the real browser-based steps in your finance systems, so the documentation matches how the team works and gives you a baseline to standardize and improve against.',
  primaryKeyword: 'finance workflows',
  secondaryKeywords: ['finance process documentation', 'finance SOPs', 'document finance processes'],
  searchIntent: 'commercial',
  tags: ['department', 'finance', 'documentation', 'process-intelligence'],
  related: ['workflow:invoice-approval-workflow', 'workflow:month-end-close-workflow', 'persona:operations-managers'],
  overview:
    'Finance teams own controls, accuracy, and timing, and they carry an audit burden that makes trustworthy process documentation essential. Most finance processes span an ERP or accounting system plus spreadsheets and email, which is exactly why a written-from-memory SOP drifts from reality.',
  commonWorkflows: [
    'Invoice approval and accounts payable',
    'Month-end and period close',
    'Expense reporting and reimbursement',
    'Purchase order and procurement',
  ],
  documentationProblems: [
    'Close and approval steps live in one person’s head',
    'SOPs describe an ideal flow no one follows',
    'Cross-system steps are missed by single-system guides',
  ],
  sopNeeds: [
    'Evidence-linked procedures traceable to recorded steps',
    'Consistent approvals across the team',
    'Onboarding material for new finance hires',
  ],
  aiOpportunities: [
    'Auto-matching invoices to purchase orders',
    'Drafting recurring journal entries for review',
    'Flagging approvals and close tasks trending late',
  ],
  honestLimitation:
    'Ledgerium captures browser-based finance work. Steps performed in desktop spreadsheets or offline still need a linked note.',
  originalDataPoint:
    'Ledgerium timestamps each step of a recorded finance run, so the report shows where the time goes, including how long an invoice or close task waits between steps rather than how long the action takes.',
  mechanismIntro:
    'Finance teams document invoice approval and the month-end close from memory if at all, and Ledgerium records the real cross-system steps in each task so the output shows where the work actually stalls rather than how the procedure is supposed to run.',
  keyTakeaways: [
    'Finance workflows span an ERP plus spreadsheets and email, so a single-system guide misses the cross-system steps that actually carry the work.',
    'Month-end close and approval steps that live in one head become an audit risk the moment that person is unavailable.',
    'Documentation written from recall describes an ideal flow no one follows, while a recording captures the real sequence and exceptions.',
    'Ledgerium produces evidence-linked procedures traceable to the recorded steps, which a team can use for onboarding and as input to its own audit preparation.',
    'Timestamped steps show where time goes in a recorded run, including how long an invoice or close task waits between steps.',
  ],
  faqs: [
    {
      q: 'How do I document finance workflows?',
      a: 'Record each workflow once as someone runs it, then generate the SOP and process map from the recording. This captures the real cross-system steps and exceptions that memory-based SOPs miss.',
    },
    {
      q: 'Which finance processes are worth documenting first?',
      a: 'Start with the ones that carry control or audit risk and run often: invoice approval, the close, and expenses. They have the clearest payoff from consistency and measurement.',
    },
    {
      q: 'What does Ledgerium produce for audit preparation?',
      a: 'SOPs and process maps linked to the recorded steps. A team can use them as input to its own audit preparation. Ledgerium does not assess or certify an audit outcome.',
    },
    {
      q: 'Where can AI help in finance?',
      a: 'In finance, AI typically helps with high-volume, rules-heavy steps: matching invoices to purchase orders, categorizing expenses, preparing reconciliations, and flagging unusual transactions for review. Approvals and judgment calls usually stay with people. Ledgerium records how the browser-based work is actually done and scores how ready each recorded finance workflow is for AI, from step count, run time and number of systems. The scoring is rule-based; no AI model runs in Ledgerium.',
    },
    {
      q: 'How do I keep finance SOPs current?',
      a: 'Re-record a workflow after a process or system change and regenerate the SOP, rather than editing documents by hand each period.',
    },
  ],
  jsonLd: ['Article', 'FAQPage', 'BreadcrumbList', 'WebPage', 'Organization'],
  author: SITE_AUTHOR,
  updatedAt: '2026-10-04',
  published: true,
};

const hr: DepartmentPage = {
  type: 'department',
  slug: 'hr',
  metaTitle: 'HR Workflows: Document, Standardize, Improve',
  metaDescription:
    'Document HR and people ops workflows by recording how they really run. Get SOPs, process maps, and AI-readiness scores for hiring and onboarding.',
  h1: 'HR workflows',
  eyebrow: 'Department',
  shortAnswer:
    'HR and people ops run on repeatable workflows like employee onboarding, leave requests, case handling, and offboarding, and most are documented from memory if at all. Recording how each one actually runs gives you an SOP, a process map, and a report showing where time is lost and what is worth automating. Ledgerium captures the real browser-based steps in your HR systems, so the documentation matches how the team works and gives you a baseline to standardize and improve against.',
  primaryKeyword: 'HR workflows',
  secondaryKeywords: ['HR process documentation', 'HR SOPs', 'document HR processes'],
  searchIntent: 'commercial',
  tags: ['department', 'hr', 'documentation', 'process-intelligence'],
  related: ['workflow:employee-onboarding-workflow', 'aiOpportunity:hr-onboarding', 'persona:hr-teams'],
  overview:
    'HR teams carry sensitive data, compliance duties, and a constant flow of people moving in, through, and out of the organization. Most people ops processes span an HRIS plus email, spreadsheets, and ticketing, which is exactly why a written-from-memory SOP drifts from how the work is really done.',
  commonWorkflows: [
    'Employee onboarding and provisioning',
    'Leave and time-off requests',
    'Case and grievance handling',
    'Offboarding and access removal',
  ],
  documentationProblems: [
    'New-hire setup depends on one coordinator’s memory',
    'Policy SOPs lag behind how cases are actually handled',
    'Steps across HRIS, email, and tickets get left out',
  ],
  sopNeeds: [
    'Consistent onboarding for every new hire',
    'Step records for how sensitive HR cases are handled',
    'Training material that survives team turnover',
  ],
  aiOpportunities: [
    'Drafting onboarding checklists for human review',
    'Routing common HR cases to the right owner',
    'Flagging onboarding tasks trending late',
  ],
  honestLimitation:
    'Ledgerium captures browser-based HR work. Steps done in desktop tools or in-person conversations still need a linked note.',
  originalDataPoint:
    'Ledgerium timestamps each step of a recorded onboarding run, so the report shows where the time goes, including how long a new hire waits on access or paperwork between steps rather than how long the task takes.',
  mechanismIntro:
    'HR and people ops run onboarding, leave, and case handling across an HRIS, email, and tickets, and Ledgerium records the real steps so the documentation shows how a new hire is actually set up rather than how the policy describes it.',
  keyTakeaways: [
    'HR processes touch sensitive data and span an HRIS plus email, spreadsheets, and ticketing, so single-system guides leave steps out.',
    'New-hire provisioning that depends on a single coordinator becomes inconsistent the moment that coordinator is out.',
    'Policy SOPs written from recall lag behind how cases are actually handled, while a recording captures the real sequence.',
    'Ledgerium produces evidence-linked records traceable to the recorded steps, which a team can use when documenting how sensitive HR cases are handled.',
    'Timestamped onboarding steps show where time goes in a recorded run, including how long a new hire waits on access or paperwork.',
  ],
  faqs: [
    {
      q: 'How do I document HR workflows?',
      a: 'Record each workflow once as someone runs it, then generate the SOP and process map from the recording. This captures the real cross-system steps and exceptions that memory-based SOPs miss.',
    },
    {
      q: 'Which HR processes are worth documenting first?',
      a: 'Start with onboarding and case handling. They run often, touch sensitive data, and benefit from consistency and a traceable record.',
    },
    {
      q: 'What does Ledgerium produce for HR compliance work?',
      a: 'SOPs and process maps linked to the recorded steps. A team can use them as input to its own compliance reviews. Ledgerium does not assess or certify compliance.',
    },
    {
      q: 'Where can AI help in HR?',
      a: 'In HR, AI typically helps with repetitive, text-heavy steps: screening and scheduling in hiring, answering routine policy and benefits questions, and drafting job descriptions and onboarding checklists. Decisions about people and sensitive cases usually stay with a human. Ledgerium records how the browser-based work is actually done and scores how ready each recorded HR workflow is for AI, from step count, run time and number of systems. The scoring is rule-based; no AI model runs in Ledgerium.',
    },
    {
      q: 'How do I keep HR SOPs current?',
      a: 'Re-record a workflow after a policy or system change and regenerate the SOP, rather than editing documents by hand each time.',
    },
  ],
  jsonLd: ['Article', 'FAQPage', 'BreadcrumbList', 'WebPage', 'Organization'],
  author: SITE_AUTHOR,
  updatedAt: '2026-10-04',
  published: true,
};

const operations: DepartmentPage = {
  type: 'department',
  slug: 'operations',
  metaTitle: 'Operations Workflows: Document and Improve',
  metaDescription:
    'Document operations workflows by recording how they really run. Get SOPs, process maps, and AI-readiness scores for fulfillment, orders, and handoffs.',
  h1: 'Operations workflows',
  eyebrow: 'Department',
  shortAnswer:
    'Operations runs on repeatable workflows like order processing, fulfillment, incident handling, and returns, and most of them are documented from memory if at all. Recording how each one actually runs gives you an SOP, a process map, and a report showing where time is lost and what is worth automating. Ledgerium captures the real browser-based steps in your operations systems, so the documentation matches how the team works and gives you a baseline to standardize and improve against.',
  primaryKeyword: 'operations workflows',
  secondaryKeywords: ['operations process documentation', 'operations SOPs', 'document operations processes'],
  searchIntent: 'commercial',
  tags: ['department', 'operations', 'documentation', 'process-intelligence'],
  related: ['workflow:sales-order-processing-workflow', 'persona:operations-managers', 'problem:how-to-find-process-waste'],
  overview:
    'Operations teams own throughput, quality, and the handoffs between functions, and small inconsistencies compound into rework and delay. Most operations processes cross several systems and people, which is exactly why a written-from-memory SOP drifts from how the work is really run.',
  commonWorkflows: [
    'Sales order processing and fulfillment',
    'Incident and exception management',
    'Returns and reverse logistics',
    'Cross-team handoffs and approvals',
  ],
  documentationProblems: [
    'The real flow lives in a few experienced operators’ heads',
    'SOPs describe an ideal path that exceptions ignore',
    'Handoffs between systems go undocumented',
  ],
  sopNeeds: [
    'Consistent execution across shifts and sites',
    'Clear ownership at every handoff',
    'Onboarding material for new operators',
  ],
  aiOpportunities: [
    'Routing exceptions to the right owner automatically',
    'Drafting handoff checklists for human review',
    'Flagging orders and tickets trending late',
  ],
  honestLimitation:
    'Ledgerium captures browser-based operations work. Steps performed on the floor or in desktop tools still need a linked note.',
  originalDataPoint:
    'Ledgerium timestamps each step of a recorded operations run, so the report shows where the time goes, including how long an order waits between teams rather than how long the action takes.',
  mechanismIntro:
    'Operations teams own throughput and the handoffs between functions, and Ledgerium records order processing, fulfillment, and exception handling as they really run so the output shows where work waits between teams rather than the idealized path.',
  keyTakeaways: [
    'Operations workflows cross several systems and people, so small inconsistencies at handoffs compound into rework and delay.',
    'The real flow lives with a few experienced operators, leaving SOPs that describe an ideal path exceptions ignore.',
    'Recording the live process captures undocumented handoffs between systems that single-system guides miss.',
    'Ledgerium baselines the real flow so variation and repeated steps become visible, which a team can use when standardizing execution across shifts and sites.',
    'Timestamped steps show where time goes in a recorded run, including how long an order waits between teams.',
  ],
  faqs: [
    {
      q: 'How do I document operations workflows?',
      a: 'Record each workflow once as someone runs it, then generate the SOP and process map from the recording. This captures the real cross-system steps and exceptions that memory-based SOPs miss.',
    },
    {
      q: 'Which operations processes are worth documenting first?',
      a: 'Start with high-volume flows like order processing and exception handling. They run often and have the clearest payoff from consistency and measurement.',
    },
    {
      q: 'Does Ledgerium show where variation and repeated steps occur?',
      a: 'Yes. It baselines the recorded runs and reports variation and repeated steps, so a team can see where paths differ.',
    },
    {
      q: 'Where can AI help in operations?',
      a: 'In operations, AI typically helps where work is high-volume and rule-driven: extracting data from orders and shipping documents, routing exceptions to the right owner, forecasting demand, and flagging orders at risk of running late. Judgment calls on exceptions usually stay with people. Ledgerium records how the browser-based work is actually done and scores how ready each recorded operations workflow is for AI, from step count, run time and number of systems. The scoring is rule-based; no AI model runs in Ledgerium.',
    },
    {
      q: 'How do I keep operations SOPs current?',
      a: 'Re-record a workflow after a process or system change and regenerate the SOP, rather than editing documents by hand each time.',
    },
  ],
  jsonLd: ['Article', 'FAQPage', 'BreadcrumbList', 'WebPage', 'Organization'],
  author: SITE_AUTHOR,
  updatedAt: '2026-10-04',
  published: true,
};

const customerSupport: DepartmentPage = {
  type: 'department',
  slug: 'customer-support',
  metaTitle: 'Customer Support Workflows: Document and Improve',
  metaDescription:
    'Document customer support workflows by recording how they really run. Get SOPs, process maps, and AI-readiness scores for tickets and escalations.',
  h1: 'Customer support workflows',
  eyebrow: 'Department',
  shortAnswer:
    'Customer support runs on repeatable workflows like ticket resolution, escalations, refunds, and returns, and most of them are documented from memory if at all. Recording how each one actually runs gives you an SOP, a process map, and a report showing where time is lost and what is worth automating. Ledgerium captures the real browser-based steps in your support systems, so the documentation matches how the team works and gives you a baseline to standardize and improve against.',
  primaryKeyword: 'customer support workflows',
  secondaryKeywords: ['support process documentation', 'customer support SOPs', 'document support processes'],
  searchIntent: 'commercial',
  tags: ['department', 'customer-support', 'documentation', 'process-intelligence'],
  related: ['workflow:zendesk-ticket-resolution-workflow', 'aiOpportunity:customer-support', 'persona:customer-success-teams'],
  overview:
    'Support teams answer to response times, quality, and a steady volume of cases that each follow a slightly different path. Most support processes span a helpdesk plus internal tools and knowledge bases, which is exactly why a written-from-memory SOP drifts from how agents really resolve tickets.',
  commonWorkflows: [
    'Ticket triage and resolution',
    'Escalation to second-line or engineering',
    'Refund and credit processing',
    'Returns and replacement handling',
  ],
  documentationProblems: [
    'Resolution steps live in senior agents’ heads',
    'Macros and SOPs lag behind real ticket handling',
    'Steps across helpdesk and internal tools get missed',
  ],
  sopNeeds: [
    'Consistent answers across the whole team',
    'Onboarding material for new agents',
    'Clear escalation paths with owners',
  ],
  aiOpportunities: [
    'Drafting reply templates from resolved tickets',
    'Routing tickets to the right queue automatically',
    'Flagging cases trending toward an SLA breach',
  ],
  honestLimitation:
    'Ledgerium captures browser-based support work. Phone calls and steps in desktop tools still need a linked note.',
  originalDataPoint:
    'Ledgerium timestamps each step of a recorded support run, so the report shows where the time goes, including how long a ticket waits on an escalation rather than how long the reply takes.',
  mechanismIntro:
    'Customer support resolves tickets, escalations, and refunds across a helpdesk and internal tools, and Ledgerium records how agents actually resolve cases so the SOP reflects the real path rather than a macro written from recall.',
  keyTakeaways: [
    'Support workflows span a helpdesk plus internal tools and knowledge bases, so each case follows a slightly different path that guides rarely capture.',
    'Resolution steps that live with senior agents leave newer agents without a reliable path to follow.',
    'Macros and SOPs written from memory lag behind real ticket handling, while a recording captures the steps agents actually take.',
    'Ledgerium builds an SOP from a recorded run of how an agent resolves a case, which new agents can use as a step-by-step guide.',
    'Timestamped steps show where time goes in a recorded run, including how long a ticket waits on an escalation.',
  ],
  faqs: [
    {
      q: 'How do I document customer support workflows?',
      a: 'Record each workflow once as an agent resolves a case, then generate the SOP and process map from the recording. This captures the real cross-tool steps that memory-based SOPs miss.',
    },
    {
      q: 'Which support processes are worth documenting first?',
      a: 'Start with high-volume flows like ticket resolution and escalations. They run constantly and have the clearest payoff from consistency.',
    },
    {
      q: 'Can new agents learn from a recorded workflow?',
      a: 'Yes. Record an agent resolving a case and Ledgerium generates an SOP from the recorded steps, which a new agent can follow instead of a generic guide.',
    },
    {
      q: 'Where can AI help in support?',
      a: 'In support, AI typically helps with ticket triage and routing, suggested replies and knowledge-base answers for common questions, and summaries of long ticket threads. Escalations and sensitive cases usually stay with an agent. Ledgerium records how the browser-based work is actually done and scores how ready each recorded support workflow is for AI, from step count, run time and number of systems. The scoring is rule-based; no AI model runs in Ledgerium.',
    },
    {
      q: 'How do I keep support SOPs current?',
      a: 'Re-record a workflow after a tooling or policy change and regenerate the SOP, rather than editing macros and documents by hand.',
    },
  ],
  jsonLd: ['Article', 'FAQPage', 'BreadcrumbList', 'WebPage', 'Organization'],
  author: SITE_AUTHOR,
  updatedAt: '2026-10-04',
  published: true,
};

const salesOperations: DepartmentPage = {
  type: 'department',
  slug: 'sales-operations',
  metaTitle: 'Sales Operations Workflows: Document and Improve',
  metaDescription:
    'Document sales operations workflows by recording how they really run. Get SOPs, process maps, and AI-readiness scores for leads and orders.',
  h1: 'Sales operations workflows',
  eyebrow: 'Department',
  shortAnswer:
    'Sales operations runs on repeatable workflows like lead qualification, order processing, quoting, and CRM hygiene, and most of them are documented from memory if at all. Recording how each one actually runs gives you an SOP, a process map, and a report showing where time is lost and what is worth automating. Ledgerium captures the real browser-based steps in your CRM and sales systems, so the documentation matches how the team works and gives you a baseline to standardize and improve against.',
  primaryKeyword: 'sales operations workflows',
  secondaryKeywords: ['sales ops process documentation', 'sales operations SOPs', 'document sales ops processes'],
  searchIntent: 'commercial',
  tags: ['department', 'sales-operations', 'documentation', 'process-intelligence'],
  related: ['workflow:salesforce-lead-qualification-workflow', 'aiOpportunity:sales-operations', 'persona:revops-managers'],
  overview:
    'Sales ops teams keep the revenue engine consistent, from lead handoff through order entry and reporting. Most sales ops processes span a CRM plus quoting, finance, and spreadsheets, which is exactly why a written-from-memory SOP drifts from how reps and ops really work the pipeline.',
  commonWorkflows: [
    'Lead qualification and routing',
    'Quote and order processing',
    'CRM data entry and hygiene',
    'Pipeline and forecast reporting',
  ],
  documentationProblems: [
    'Qualification rules live in a few reps’ heads',
    'SOPs lag behind the current CRM configuration',
    'Steps across CRM and finance tools get missed',
  ],
  sopNeeds: [
    'Consistent qualification and routing rules',
    'Written steps for CRM entry and routing',
    'Onboarding material for new reps and ops hires',
  ],
  aiOpportunities: [
    'Scoring and routing leads for rep follow-up',
    'Drafting CRM update checklists for reps',
    'Flagging deals with stale or missing data',
  ],
  honestLimitation:
    'Ledgerium captures browser-based sales ops work. Steps in desktop spreadsheets or offline approvals still need a linked note.',
  originalDataPoint:
    'Ledgerium timestamps each step of a recorded sales ops run, so the report shows where the time goes, including how long a lead waits before qualification rather than how long the action takes.',
  mechanismIntro:
    'Sales operations runs lead qualification, quoting, and CRM hygiene across a CRM plus quoting and finance tools, and Ledgerium records the real steps so the SOP shows the steps and path the process follows rather than a rule kept in a few heads.',
  keyTakeaways: [
    'Sales ops workflows span a CRM plus quoting, finance, and spreadsheets, so a memory-based SOP drifts from how reps actually work the pipeline.',
    'Qualification rules that live with a few reps produce inconsistent routing the forecast cannot trust.',
    'A recorded SOP shows the steps and screens each process uses, so reps can follow the same path.',
    'SOPs written from recall lag behind the current CRM configuration, while a recording stays tied to how the system works now.',
    'Timestamped steps show where time goes in a recorded run, including how long a lead waits before qualification.',
  ],
  faqs: [
    {
      q: 'How do I document sales operations workflows?',
      a: 'Record each workflow once as someone runs it, then generate the SOP and process map from the recording. This captures the real CRM and cross-system steps that memory-based SOPs miss.',
    },
    {
      q: 'Which sales ops processes are worth documenting first?',
      a: 'Start with lead qualification and order processing. They run often and have the clearest payoff from consistent rules and clean data.',
    },
    {
      q: 'Can a recorded SOP guide how reps enter CRM data?',
      a: 'Yes. A recorded SOP shows the steps and screens each process uses, so reps can follow the same path. Ledgerium does not check or clean CRM data.',
    },
    {
      q: 'Where can AI help in sales ops?',
      a: 'In sales ops, AI typically helps with lead scoring and routing, CRM data entry and enrichment, call and meeting summaries, and flagging deals with stale or missing data. Pricing and deal judgment usually stay with people. Ledgerium records how the browser-based work is actually done and scores how ready each recorded sales ops workflow is for AI, from step count, run time and number of systems. The scoring is rule-based; no AI model runs in Ledgerium.',
    },
    {
      q: 'How do I keep sales ops SOPs current?',
      a: 'Re-record a workflow after a CRM or process change and regenerate the SOP, rather than editing documents by hand each quarter.',
    },
  ],
  jsonLd: ['Article', 'FAQPage', 'BreadcrumbList', 'WebPage', 'Organization'],
  author: SITE_AUTHOR,
  updatedAt: '2026-10-04',
  published: true,
};

const procurement: DepartmentPage = {
  type: 'department',
  slug: 'procurement',
  metaTitle: 'Procurement Workflows: Document and Improve',
  metaDescription:
    'Document procurement workflows by recording how they really run. Get SOPs, process maps, and AI-readiness scores for purchasing and vendors.',
  h1: 'Procurement workflows',
  eyebrow: 'Department',
  shortAnswer:
    'Procurement runs on repeatable workflows like purchase orders, vendor setup, approvals, and invoice matching, and most of them are documented from memory if at all. Recording how each one actually runs gives you an SOP, a process map, and a report showing where time is lost and what is worth automating. Ledgerium captures the real browser-based steps in your procurement systems, so the documentation matches how the team works and gives you a baseline to standardize and improve against.',
  primaryKeyword: 'procurement workflows',
  secondaryKeywords: ['procurement process documentation', 'procurement SOPs', 'document procurement processes'],
  searchIntent: 'commercial',
  tags: ['department', 'procurement', 'documentation', 'process-intelligence'],
  related: ['workflow:purchase-order-workflow', 'aiOpportunity:procurement', 'sopTemplate:purchase-order-sop-template'],
  overview:
    'Procurement teams control spend, vendor risk, and approval chains, and every exception carries a cost. Most procurement processes span an ERP or procurement tool plus email and spreadsheets, which is exactly why a written-from-memory SOP drifts from how requests really move through approval.',
  commonWorkflows: [
    'Purchase order creation and approval',
    'Vendor setup and onboarding',
    'Invoice and PO matching',
    'Spend approval and exception handling',
  ],
  documentationProblems: [
    'Approval thresholds live in one buyer’s head',
    'SOPs describe an ideal flow that exceptions ignore',
    'Steps across ERP and email go undocumented',
  ],
  sopNeeds: [
    'Consistent approvals and spend controls',
    'Evidence-linked vendor and PO procedures',
    'Onboarding material for new buyers',
  ],
  aiOpportunities: [
    'Matching invoices to purchase orders',
    'Drafting vendor setup checklists for human review',
    'Flagging approvals trending past their target',
  ],
  honestLimitation:
    'Ledgerium captures browser-based procurement work. Steps in desktop spreadsheets or offline vendor calls still need a linked note.',
  originalDataPoint:
    'Ledgerium timestamps each step of a recorded procurement run, so the report shows where the time goes, including how long a purchase order waits for sign-off rather than how long the action takes.',
  mechanismIntro:
    'Procurement runs purchase orders, vendor setup, and invoice matching across an ERP plus email and spreadsheets, and Ledgerium records how requests really move through approval so the output shows where a purchase order waits for sign-off.',
  keyTakeaways: [
    'Procurement workflows span an ERP plus email and spreadsheets, so cross-system approval steps go undocumented in single-system guides.',
    'Approval thresholds that live with one buyer turn every exception into an unrepeatable judgment call.',
    'SOPs written from recall describe an ideal flow exceptions ignore, while a recording captures how requests actually move through approval.',
    'Ledgerium produces vendor and PO procedures traceable to the recorded steps, which a team can use as input to its own audit preparation.',
    'Timestamped steps show where time goes in a recorded run, including how long a purchase order waits for sign-off.',
  ],
  faqs: [
    {
      q: 'How do I document procurement workflows?',
      a: 'Record each workflow once as someone runs it, then generate the SOP and process map from the recording. This captures the real cross-system steps and exceptions that memory-based SOPs miss.',
    },
    {
      q: 'Which procurement processes are worth documenting first?',
      a: 'Start with purchase orders and vendor setup. They run often, carry spend and risk, and have the clearest payoff from consistency.',
    },
    {
      q: 'What does Ledgerium produce for procurement audits?',
      a: 'SOPs and process maps linked to the recorded steps. A team can use them as input to its own audit preparation. Ledgerium does not assess or certify an audit outcome.',
    },
    {
      q: 'Where can AI help in procurement?',
      a: 'In procurement, AI typically helps with matching invoices to purchase orders, extracting terms from quotes and contracts, categorizing spend, and flagging duplicate or off-contract purchases. Supplier negotiation and approval decisions usually stay with people. Ledgerium records how the browser-based work is actually done and scores how ready each recorded procurement workflow is for AI, from step count, run time and number of systems. The scoring is rule-based; no AI model runs in Ledgerium.',
    },
    {
      q: 'How do I keep procurement SOPs current?',
      a: 'Re-record a workflow after a system or policy change and regenerate the SOP, rather than editing documents by hand each time.',
    },
  ],
  jsonLd: ['Article', 'FAQPage', 'BreadcrumbList', 'WebPage', 'Organization'],
  author: SITE_AUTHOR,
  updatedAt: '2026-10-04',
  published: true,
};

const it: DepartmentPage = {
  type: 'department',
  slug: 'it',
  metaTitle: 'IT Workflows: Document, Standardize, Improve',
  metaDescription:
    'Document IT workflows by recording how they really run. Get SOPs, process maps, and AI-readiness scores for access, incidents, and resets.',
  h1: 'IT workflows',
  eyebrow: 'Department',
  shortAnswer:
    'IT runs on repeatable workflows like access provisioning, password resets, incident management, and onboarding setup, and most of them are documented from memory if at all. Recording how each one actually runs gives you an SOP, a process map, and a report showing where time is lost and what is worth automating. Ledgerium captures the real browser-based steps in your IT systems, so the documentation matches how the team works and gives you a baseline to standardize and improve against.',
  primaryKeyword: 'IT workflows',
  secondaryKeywords: ['IT process documentation', 'IT SOPs', 'document IT processes'],
  searchIntent: 'commercial',
  tags: ['department', 'it', 'documentation', 'process-intelligence'],
  related: ['workflow:access-provisioning-workflow', 'workflow:incident-management-workflow', 'software:servicenow'],
  overview:
    'IT teams own access, uptime, and the requests that keep everyone else working, often under ticket queues and security requirements. Most IT processes span a service desk plus identity, directory, and admin consoles, which is exactly why a written-from-memory SOP drifts from how requests are really fulfilled.',
  commonWorkflows: [
    'Access provisioning and deprovisioning',
    'Password resets and account recovery',
    'Incident and major-incident management',
    'New-hire device and account setup',
  ],
  documentationProblems: [
    'Provisioning steps live in one admin’s head',
    'Runbooks lag behind the current console layout',
    'Steps across identity and admin tools get missed',
  ],
  sopNeeds: [
    'Consistent, least-privilege access grants',
    'Repeatable incident response with clear owners',
    'Onboarding material for new technicians',
  ],
  aiOpportunities: [
    'Drafting provisioning checklists for human review',
    'Routing incidents to the right team automatically',
    'Flagging requests trending past their target',
  ],
  honestLimitation:
    'Ledgerium captures browser-based IT work. Steps in desktop admin tools or terminals still need a linked note.',
  originalDataPoint:
    'Ledgerium timestamps each step of a recorded IT run, so the report shows where the time goes, including how long an access request waits for sign-off rather than how long the action takes.',
  mechanismIntro:
    'IT teams provision access, reset passwords, and manage incidents across a service desk plus identity and admin consoles, and Ledgerium records how requests are really fulfilled so the runbook reflects the live console flow rather than a memory-based guide.',
  keyTakeaways: [
    'IT workflows span a service desk plus identity, directory, and admin consoles, so cross-console steps fall out of memory-based runbooks.',
    'Provisioning steps that live with one admin make least-privilege grants inconsistent and hard to review.',
    'Runbooks written from recall lag behind the current console layout, while a recording stays tied to how the tools work now.',
    'A recorded SOP shows the systems and steps each request goes through, which access reviewers can use alongside their own records instead of recall.',
    'Timestamped steps show where time goes in a recorded run, including how long an access request waits for sign-off.',
  ],
  faqs: [
    {
      q: 'How do I document IT workflows?',
      a: 'Record each workflow once as a technician runs it, then generate the SOP and process map from the recording. This captures the real cross-console steps that memory-based runbooks miss.',
    },
    {
      q: 'Which IT processes are worth documenting first?',
      a: 'Start with access provisioning and incident response. They run often, carry security weight, and have the clearest payoff from consistency.',
    },
    {
      q: 'Can a recorded SOP support access reviews?',
      a: 'It documents the systems and steps a request went through, linked to the recorded steps. Reviewers can use it as input. Ledgerium does not check what access was granted.',
    },
    {
      q: 'Where can AI help in IT?',
      a: 'In IT, AI typically helps with classifying and routing tickets, guiding users through common requests, summarizing incidents, and matching alerts to known issues. Access approvals and major-incident decisions usually stay with people. Ledgerium records how the browser-based work is actually done and scores how ready each recorded IT workflow is for AI, from step count, run time and number of systems. The scoring is rule-based; no AI model runs in Ledgerium.',
    },
    {
      q: 'How do I keep IT runbooks current?',
      a: 'Re-record a workflow after a tooling or policy change and regenerate the SOP, rather than editing runbooks by hand each time.',
    },
  ],
  jsonLd: ['Article', 'FAQPage', 'BreadcrumbList', 'WebPage', 'Organization'],
  author: SITE_AUTHOR,
  updatedAt: '2026-10-04',
  published: true,
};

const compliance: DepartmentPage = {
  type: 'department',
  slug: 'compliance',
  metaTitle: 'Compliance Workflows: Document and Improve',
  metaDescription:
    'Document compliance workflows by recording how they really run. Get SOPs, process maps, and AI-readiness scores for audits and controls.',
  h1: 'Compliance workflows',
  eyebrow: 'Department',
  shortAnswer:
    'Compliance runs on repeatable workflows like control testing, audit preparation, evidence collection, and policy attestation, and most of them are documented from memory if at all. Recording how each one actually runs gives you an SOP, a process map, and a report showing where time is lost and what is worth automating. Ledgerium captures the real browser-based steps in your compliance systems, so the documentation matches how the team works and gives you a baseline to standardize and improve against.',
  primaryKeyword: 'compliance workflows',
  secondaryKeywords: ['compliance process documentation', 'compliance SOPs', 'document compliance processes'],
  searchIntent: 'commercial',
  tags: ['department', 'compliance', 'documentation', 'process-intelligence'],
  related: ['problem:how-to-document-a-process-for-compliance', 'persona:compliance-teams', 'aiOpportunity:compliance-workflows'],
  overview:
    'Compliance teams prove that controls operate as designed, and that proof depends on documentation that matches reality. Most compliance processes span a GRC tool plus email, evidence stores, and the systems under review, which is exactly why a written-from-memory SOP drifts from how testing is really performed.',
  commonWorkflows: [
    'Control testing and walkthroughs',
    'Audit preparation and evidence collection',
    'Policy attestation and tracking',
    'Issue and remediation management',
  ],
  documentationProblems: [
    'Testing steps live in one analyst’s head',
    'SOPs describe an ideal control no one follows exactly',
    'Evidence steps across systems go undocumented',
  ],
  sopNeeds: [
    'Evidence-linked procedures traceable to recorded steps',
    'Consistent control testing across reviewers',
    'Onboarding material for new compliance hires',
  ],
  aiOpportunities: [
    'Drafting evidence checklists for human review',
    'Routing remediation items to the right owner',
    'Flagging controls and reviews trending late',
  ],
  honestLimitation:
    'Ledgerium captures browser-based compliance work. Steps in desktop tools or offline interviews still need a linked note.',
  originalDataPoint:
    'Ledgerium timestamps each step of a recorded compliance run, so the report shows where the time goes, including how long a control test waits on evidence rather than how long the review takes.',
  mechanismIntro:
    'Compliance teams test controls and collect evidence across a GRC tool plus email and the systems under review, and Ledgerium records how testing is really performed so the procedure shows the steps that were actually performed.',
  keyTakeaways: [
    'Compliance proof depends on documentation that matches reality, yet most testing steps live with a single analyst.',
    'Compliance workflows span a GRC tool plus email, evidence stores, and the systems under review, so cross-system evidence steps go undocumented.',
    'SOPs written from recall describe an ideal control no one follows exactly, while a recording captures the real testing sequence.',
    'Ledgerium produces evidence-linked procedures traceable to the recorded steps, which a team can use as input to its own audit work.',
    'Timestamped steps show where time goes in a recorded run, including how long a control test waits on evidence.',
  ],
  faqs: [
    {
      q: 'How do I document compliance workflows?',
      a: 'Record each workflow once as someone performs it, then generate the SOP and process map from the recording. This captures the real cross-system evidence steps that memory-based SOPs miss.',
    },
    {
      q: 'Which compliance processes are worth documenting first?',
      a: 'Start with control testing and audit preparation. They run on a schedule and have the clearest payoff from consistent, traceable evidence.',
    },
    {
      q: 'What does Ledgerium produce for audit preparation?',
      a: 'SOPs and process maps linked to the recorded steps. A team can use them as input to its own audit preparation. Ledgerium does not assess or certify an audit outcome.',
    },
    {
      q: 'Where can AI help in compliance?',
      a: 'In compliance, AI typically helps with collecting and organizing evidence, mapping controls to policies, monitoring transactions or logs for anomalies, and summarizing findings for audit responses. Control conclusions and sign-off usually stay with people. Ledgerium records how the browser-based work is actually done and scores how ready each recorded compliance workflow is for AI, from step count, run time and number of systems. The scoring is rule-based; no AI model runs in Ledgerium.',
    },
    {
      q: 'How do I keep compliance SOPs current?',
      a: 'Re-record a workflow after a control or system change and regenerate the SOP, rather than editing documents by hand each cycle.',
    },
  ],
  jsonLd: ['Article', 'FAQPage', 'BreadcrumbList', 'WebPage', 'Organization'],
  author: SITE_AUTHOR,
  updatedAt: '2026-10-04',
  published: true,
};

const legal: DepartmentPage = {
  type: 'department',
  slug: 'legal',
  metaTitle: 'Legal Workflows: Document, Standardize, Improve',
  metaDescription:
    'Document legal workflows like contract review, redlines, and approval routing by recording how they really run. Get SOPs, process maps, and AI-readiness scores.',
  h1: 'Legal workflows',
  eyebrow: 'Department',
  shortAnswer:
    'Legal teams run on document-heavy workflows like contract review, redlining, approval routing, and matter intake, and much of the routing lives in a lead lawyer’s or paralegal’s head rather than in a written procedure. Recording how each one actually runs produces an SOP, a process map, and a report showing where a document waits for sign-off and which steps are worth automating. Ledgerium captures the real browser-based steps in your contract, e-signature, and matter-management systems, so the documentation matches how legal work is really routed and gives you a baseline to standardize against.',
  primaryKeyword: 'legal workflows',
  secondaryKeywords: ['legal process documentation', 'contract workflow documentation', 'document legal processes'],
  searchIntent: 'commercial',
  tags: ['department', 'legal', 'documentation', 'process-intelligence'],
  related: ['workflow:contract-review-workflow', 'sopTemplate:contract-review-sop-template', 'persona:compliance-teams'],
  overview:
    'Legal teams are the natural home of document workflows, contracts, redlines, approvals, and matter files, yet the routing that moves a document from draft to signature usually lives with a few people rather than in a procedure. Most legal work spans a contract or matter-management system plus email, a document store, and an e-signature tool, which is exactly why a written-from-memory SOP drifts from how approvals really happen.',
  commonWorkflows: [
    'Contract review and redlining',
    'Approval routing and sign-off',
    'Matter intake and conflict checks',
    'E-signature and executed-document filing',
  ],
  documentationProblems: [
    'Approval routing lives in a lead lawyer’s head',
    'Redline and version history spans email and drafts',
    'Steps across the matter system and e-signature tool get left out',
  ],
  sopNeeds: [
    'Consistent review and approval routing',
    'Step records of how each version was approved',
    'Onboarding material for new paralegals and counsel',
  ],
  aiOpportunities: [
    'Drafting intake and conflict-check checklists for human review',
    'Routing contracts to the right reviewer automatically',
    'Flagging approvals and matters trending past their target',
  ],
  honestLimitation:
    'Ledgerium captures browser-based legal work. Steps in desktop document editors or offline negotiations still need a linked note.',
  originalDataPoint:
    'Ledgerium timestamps each step of a recorded contract run, so the report shows where the time goes, including how long a contract waits for a reviewer or signature rather than how long the edit takes.',
  mechanismIntro:
    'Legal teams route contracts, redlines, and approvals across a matter system, a document store, and an e-signature tool, and Ledgerium records the real routing so the SOP shows how a document actually moves from draft to signature rather than how a procedure assumes it does.',
  keyTakeaways: [
    'Legal is the natural home of document workflows, contracts, redlines, approvals, and matter files, yet the routing that moves a document to signature rarely sits in a written procedure.',
    'Contract review and approval routing that live with a few people become a bottleneck the moment those people are unavailable.',
    'A recorded SOP shows the approval steps in the order the recorded user performed them, traceable to the actual steps.',
    'Ledgerium records steps across the matter system, document store, and e-signature tool in one workflow, so the SOP reflects the full routing path rather than one tool in isolation.',
    'Timestamped steps show where time goes in a recorded run, including how long a contract waits for a reviewer or signature.',
  ],
  faqs: [
    {
      q: 'How do I document legal document workflows?',
      a: 'Record each contract, approval, or matter-intake workflow once as someone runs it, then generate the SOP and process map from the recording. It captures the real routing steps that a memory-based procedure leaves out.',
    },
    {
      q: 'Which legal processes are worth documenting first?',
      a: 'Start with contract review and approval routing. They run often, carry the most sign-off risk, and have the clearest payoff from consistent, traceable routing.',
    },
    {
      q: 'Can a recording show how a contract was approved?',
      a: 'It shows the approval steps the recorded user took, in order, linked to the recorded steps. It is not a legal record of who approved a version, so keep your contract system as the source of record.',
    },
    {
      q: 'Where can AI help in legal workflows?',
      a: 'In legal, AI typically helps with first-pass contract review against a playbook, clause extraction and comparison, document summaries, and routing intake requests. Legal judgment and final approval stay with lawyers. Ledgerium records how the browser-based work is actually done and scores how ready each recorded legal workflow is for AI, from step count, run time and number of systems. The scoring is rule-based; no AI model runs in Ledgerium.',
    },
    {
      q: 'How do I keep legal SOPs current?',
      a: 'Re-record the workflow after a template, policy, or system change and regenerate the SOP, instead of hand-editing procedure documents each cycle.',
    },
  ],
  jsonLd: ['Article', 'FAQPage', 'BreadcrumbList', 'WebPage', 'Organization'],
  author: SITE_AUTHOR,
  updatedAt: '2026-10-04',
  published: true,
};

export const DEPARTMENT_PAGES: readonly DepartmentPage[] = [
  finance,
  hr,
  operations,
  customerSupport,
  salesOperations,
  procurement,
  it,
  compliance,
  legal,
];
