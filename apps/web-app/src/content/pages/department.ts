import type { DepartmentPage } from '../types';

/** Department hub pages. Mid-funnel; aggregate workflows, problems, and AI opportunities. */

const finance: DepartmentPage = {
  type: 'department',
  slug: 'finance',
  metaTitle: 'Finance Workflows: Document, Standardize, Improve',
  metaDescription:
    'Document and improve finance workflows by recording how they really run. Get SOPs, process maps, and AI opportunities for AP, close, expenses, and approvals.',
  h1: 'Finance workflows',
  eyebrow: 'Department',
  shortAnswer:
    'Finance runs on repeatable workflows like invoice approval, the month-end close, expense reporting, and purchase orders, and most of them are documented from memory if at all. Recording how each one actually runs gives you an SOP, a process map, and a report showing where time is lost and what is worth automating. Ledgerium captures the real steps across your finance systems, so the documentation matches how the team works and gives you a baseline to standardize and improve against.',
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
    'Audit-ready, evidence-linked procedures',
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
    'Across finance processes, most cycle time is wait time, not work time. Ledgerium timestamps each step, so the report shows how long an invoice or close task waits rather than how long the action takes.',
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
      q: 'Can Ledgerium help with audit readiness?',
      a: 'Yes. It produces evidence-linked documentation traceable to the recorded steps, which is stronger audit evidence than a procedure written from recall.',
    },
    {
      q: 'Where can AI help in finance?',
      a: 'In the repetitive, rule-based steps like matching, coding, and drafting recurring entries. Approvals and judgment calls should keep a human involved.',
    },
    {
      q: 'How do I keep finance SOPs current?',
      a: 'Re-record a workflow after a process or system change and regenerate the SOP, rather than editing documents by hand each period.',
    },
  ],
  jsonLd: ['Article', 'FAQPage', 'BreadcrumbList', 'WebPage', 'Organization'],
  author: { name: 'Ledgerium Research Team', sameAs: ['https://www.linkedin.com/company/ledgerium'] },
  updatedAt: '2026-06-27',
  published: true,
};

const hr: DepartmentPage = {
  type: 'department',
  slug: 'hr',
  metaTitle: 'HR Workflows: Document, Standardize, Improve',
  metaDescription:
    'Document HR and people ops workflows by recording how they really run. Get SOPs, process maps, and AI opportunities for hiring and onboarding.',
  h1: 'HR workflows',
  eyebrow: 'Department',
  shortAnswer:
    'HR and people ops run on repeatable workflows like employee onboarding, leave requests, case handling, and offboarding, and most are documented from memory if at all. Recording how each one actually runs gives you an SOP, a process map, and a report showing where time is lost and what is worth automating. Ledgerium captures the real steps across your HR systems, so the documentation matches how the team works and gives you a baseline to standardize and improve against.',
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
    'Defensible records for sensitive HR cases',
    'Training material that survives team turnover',
  ],
  aiOpportunities: [
    'Drafting onboarding checklists from the recorded flow',
    'Routing common HR cases to the right owner',
    'Flagging onboarding tasks trending late',
  ],
  honestLimitation:
    'Ledgerium captures browser-based HR work. Steps done in desktop tools or in-person conversations still need a linked note.',
  originalDataPoint:
    'Across onboarding processes, most cycle time is wait time between handoffs, not work time. Ledgerium timestamps each step, so the report shows how long a new hire waits on access or paperwork rather than how long the task takes.',
  faqs: [
    {
      q: 'How do I document HR workflows?',
      a: 'Record each workflow once as someone runs it, then generate the SOP and process map from the recording. This captures the real cross-system steps and exceptions that memory-based SOPs miss.',
    },
    {
      q: 'Which HR processes are worth documenting first?',
      a: 'Start with onboarding and case handling. They run often, touch sensitive data, and have the clearest payoff from consistency and a defensible record.',
    },
    {
      q: 'Can Ledgerium help with HR compliance?',
      a: 'Yes. It produces evidence-linked documentation traceable to the recorded steps, which is stronger support during an audit than a procedure written from recall.',
    },
    {
      q: 'Where can AI help in HR?',
      a: 'In repetitive, rule-based steps like checklist drafting, case routing, and reminders. Decisions about people should keep a human involved.',
    },
    {
      q: 'How do I keep HR SOPs current?',
      a: 'Re-record a workflow after a policy or system change and regenerate the SOP, rather than editing documents by hand each time.',
    },
  ],
  jsonLd: ['Article', 'FAQPage', 'BreadcrumbList', 'WebPage', 'Organization'],
  author: { name: 'Ledgerium Research Team', sameAs: ['https://www.linkedin.com/company/ledgerium'] },
  updatedAt: '2026-06-27',
  published: true,
};

const operations: DepartmentPage = {
  type: 'department',
  slug: 'operations',
  metaTitle: 'Operations Workflows: Document and Improve',
  metaDescription:
    'Document operations workflows by recording how they really run. Get SOPs, process maps, and AI opportunities for fulfillment, orders, and handoffs.',
  h1: 'Operations workflows',
  eyebrow: 'Department',
  shortAnswer:
    'Operations runs on repeatable workflows like order processing, fulfillment, incident handling, and returns, and most of them are documented from memory if at all. Recording how each one actually runs gives you an SOP, a process map, and a report showing where time is lost and what is worth automating. Ledgerium captures the real steps across your operations systems, so the documentation matches how the team works and gives you a baseline to standardize and improve against.',
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
    'Drafting handoff checklists from the recorded flow',
    'Flagging orders and tickets trending late',
  ],
  honestLimitation:
    'Ledgerium captures browser-based operations work. Steps performed on the floor or in desktop tools still need a linked note.',
  originalDataPoint:
    'Across operations processes, most cycle time is wait time at handoffs, not work time. Ledgerium timestamps each step, so the report shows how long an order waits between teams rather than how long the action takes.',
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
      q: 'Can Ledgerium help reduce rework?',
      a: 'Yes. By baselining the real flow it shows where variation and repeated steps appear, so you can standardize the path that works.',
    },
    {
      q: 'Where can AI help in operations?',
      a: 'In repetitive, rule-based steps like routing, status updates, and checklist drafting. Judgment calls on exceptions should keep a human involved.',
    },
    {
      q: 'How do I keep operations SOPs current?',
      a: 'Re-record a workflow after a process or system change and regenerate the SOP, rather than editing documents by hand each time.',
    },
  ],
  jsonLd: ['Article', 'FAQPage', 'BreadcrumbList', 'WebPage', 'Organization'],
  author: { name: 'Ledgerium Research Team', sameAs: ['https://www.linkedin.com/company/ledgerium'] },
  updatedAt: '2026-06-27',
  published: true,
};

const customerSupport: DepartmentPage = {
  type: 'department',
  slug: 'customer-support',
  metaTitle: 'Customer Support Workflows: Document and Improve',
  metaDescription:
    'Document customer support workflows by recording how they really run. Get SOPs, process maps, and AI opportunities for tickets and escalations.',
  h1: 'Customer support workflows',
  eyebrow: 'Department',
  shortAnswer:
    'Customer support runs on repeatable workflows like ticket resolution, escalations, refunds, and returns, and most of them are documented from memory if at all. Recording how each one actually runs gives you an SOP, a process map, and a report showing where time is lost and what is worth automating. Ledgerium captures the real steps across your support systems, so the documentation matches how the team works and gives you a baseline to standardize and improve against.',
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
    'Faster ramp for new agents',
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
    'Across support processes, most cycle time is wait time between replies and handoffs, not work time. Ledgerium timestamps each step, so the report shows how long a ticket waits on an escalation rather than how long the reply takes.',
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
      q: 'Can Ledgerium help new agents ramp faster?',
      a: 'Yes. New agents follow an SOP built from how your best agents actually resolve cases, rather than a generic guide.',
    },
    {
      q: 'Where can AI help in support?',
      a: 'In repetitive, rule-based steps like routing, tagging, and reply drafting. Judgment on sensitive cases should keep a human involved.',
    },
    {
      q: 'How do I keep support SOPs current?',
      a: 'Re-record a workflow after a tooling or policy change and regenerate the SOP, rather than editing macros and documents by hand.',
    },
  ],
  jsonLd: ['Article', 'FAQPage', 'BreadcrumbList', 'WebPage', 'Organization'],
  author: { name: 'Ledgerium Research Team', sameAs: ['https://www.linkedin.com/company/ledgerium'] },
  updatedAt: '2026-06-27',
  published: true,
};

const salesOperations: DepartmentPage = {
  type: 'department',
  slug: 'sales-operations',
  metaTitle: 'Sales Operations Workflows: Document and Improve',
  metaDescription:
    'Document sales operations workflows by recording how they really run. Get SOPs, process maps, and AI opportunities for leads and orders.',
  h1: 'Sales operations workflows',
  eyebrow: 'Department',
  shortAnswer:
    'Sales operations runs on repeatable workflows like lead qualification, order processing, quoting, and CRM hygiene, and most of them are documented from memory if at all. Recording how each one actually runs gives you an SOP, a process map, and a report showing where time is lost and what is worth automating. Ledgerium captures the real steps across your CRM and sales systems, so the documentation matches how the team works and gives you a baseline to standardize and improve against.',
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
    'Clean CRM data the forecast can trust',
    'Onboarding material for new reps and ops hires',
  ],
  aiOpportunities: [
    'Scoring and routing leads from the recorded flow',
    'Drafting CRM update checklists for reps',
    'Flagging deals with stale or missing data',
  ],
  honestLimitation:
    'Ledgerium captures browser-based sales ops work. Steps in desktop spreadsheets or offline approvals still need a linked note.',
  originalDataPoint:
    'Across sales ops processes, most cycle time is wait time between handoffs, not work time. Ledgerium timestamps each step, so the report shows how long a lead waits before qualification rather than how long the action takes.',
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
      q: 'Can Ledgerium help with CRM data quality?',
      a: 'Yes. A recorded SOP shows the exact fields and steps each process expects, so reps follow the same path and the data stays consistent.',
    },
    {
      q: 'Where can AI help in sales ops?',
      a: 'In repetitive, rule-based steps like lead scoring, routing, and data updates. Deal judgment should keep a human involved.',
    },
    {
      q: 'How do I keep sales ops SOPs current?',
      a: 'Re-record a workflow after a CRM or process change and regenerate the SOP, rather than editing documents by hand each quarter.',
    },
  ],
  jsonLd: ['Article', 'FAQPage', 'BreadcrumbList', 'WebPage', 'Organization'],
  author: { name: 'Ledgerium Research Team', sameAs: ['https://www.linkedin.com/company/ledgerium'] },
  updatedAt: '2026-06-27',
  published: true,
};

const procurement: DepartmentPage = {
  type: 'department',
  slug: 'procurement',
  metaTitle: 'Procurement Workflows: Document and Improve',
  metaDescription:
    'Document procurement workflows by recording how they really run. Get SOPs, process maps, and AI opportunities for purchasing and vendors.',
  h1: 'Procurement workflows',
  eyebrow: 'Department',
  shortAnswer:
    'Procurement runs on repeatable workflows like purchase orders, vendor setup, approvals, and invoice matching, and most of them are documented from memory if at all. Recording how each one actually runs gives you an SOP, a process map, and a report showing where time is lost and what is worth automating. Ledgerium captures the real steps across your procurement systems, so the documentation matches how the team works and gives you a baseline to standardize and improve against.',
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
    'Audit-ready vendor and PO records',
    'Onboarding material for new buyers',
  ],
  aiOpportunities: [
    'Matching invoices to purchase orders',
    'Drafting vendor setup checklists from the recorded flow',
    'Flagging approvals trending past their target',
  ],
  honestLimitation:
    'Ledgerium captures browser-based procurement work. Steps in desktop spreadsheets or offline vendor calls still need a linked note.',
  originalDataPoint:
    'Across procurement processes, most cycle time is wait time in approval queues, not work time. Ledgerium timestamps each step, so the report shows how long a purchase order waits for sign-off rather than how long the action takes.',
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
      q: 'Can Ledgerium help with procurement audits?',
      a: 'Yes. It produces evidence-linked documentation traceable to the recorded steps, which is stronger audit support than a procedure written from recall.',
    },
    {
      q: 'Where can AI help in procurement?',
      a: 'In repetitive, rule-based steps like matching, coding, and checklist drafting. Approvals and vendor judgment should keep a human involved.',
    },
    {
      q: 'How do I keep procurement SOPs current?',
      a: 'Re-record a workflow after a system or policy change and regenerate the SOP, rather than editing documents by hand each time.',
    },
  ],
  jsonLd: ['Article', 'FAQPage', 'BreadcrumbList', 'WebPage', 'Organization'],
  author: { name: 'Ledgerium Research Team', sameAs: ['https://www.linkedin.com/company/ledgerium'] },
  updatedAt: '2026-06-27',
  published: true,
};

const it: DepartmentPage = {
  type: 'department',
  slug: 'it',
  metaTitle: 'IT Workflows: Document, Standardize, Improve',
  metaDescription:
    'Document IT workflows by recording how they really run. Get SOPs, process maps, and AI opportunities for access, incidents, and resets.',
  h1: 'IT workflows',
  eyebrow: 'Department',
  shortAnswer:
    'IT runs on repeatable workflows like access provisioning, password resets, incident management, and onboarding setup, and most of them are documented from memory if at all. Recording how each one actually runs gives you an SOP, a process map, and a report showing where time is lost and what is worth automating. Ledgerium captures the real steps across your IT systems, so the documentation matches how the team works and gives you a baseline to standardize and improve against.',
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
    'Drafting provisioning checklists from the recorded flow',
    'Routing incidents to the right team automatically',
    'Flagging requests trending past their target',
  ],
  honestLimitation:
    'Ledgerium captures browser-based IT work. Steps in desktop admin tools or terminals still need a linked note.',
  originalDataPoint:
    'Across IT processes, most cycle time is wait time in approval and queue handoffs, not work time. Ledgerium timestamps each step, so the report shows how long an access request waits for sign-off rather than how long the action takes.',
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
      q: 'Can Ledgerium help with access reviews?',
      a: 'Yes. A recorded SOP shows the exact systems and grants each request touches, which gives reviewers traceable evidence rather than recall.',
    },
    {
      q: 'Where can AI help in IT?',
      a: 'In repetitive, rule-based steps like provisioning, routing, and reset handling. Security judgment should keep a human involved.',
    },
    {
      q: 'How do I keep IT runbooks current?',
      a: 'Re-record a workflow after a tooling or policy change and regenerate the SOP, rather than editing runbooks by hand each time.',
    },
  ],
  jsonLd: ['Article', 'FAQPage', 'BreadcrumbList', 'WebPage', 'Organization'],
  author: { name: 'Ledgerium Research Team', sameAs: ['https://www.linkedin.com/company/ledgerium'] },
  updatedAt: '2026-06-27',
  published: true,
};

const compliance: DepartmentPage = {
  type: 'department',
  slug: 'compliance',
  metaTitle: 'Compliance Workflows: Document and Improve',
  metaDescription:
    'Document compliance workflows by recording how they really run. Get SOPs, process maps, and AI opportunities for audits and controls.',
  h1: 'Compliance workflows',
  eyebrow: 'Department',
  shortAnswer:
    'Compliance runs on repeatable workflows like control testing, audit preparation, evidence collection, and policy attestation, and most of them are documented from memory if at all. Recording how each one actually runs gives you an SOP, a process map, and a report showing where time is lost and what is worth automating. Ledgerium captures the real steps across your compliance systems, so the documentation matches how the team works and gives you a baseline to standardize and improve against.',
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
    'Audit-ready, evidence-linked procedures',
    'Consistent control testing across reviewers',
    'Onboarding material for new compliance hires',
  ],
  aiOpportunities: [
    'Drafting evidence checklists from the recorded flow',
    'Routing remediation items to the right owner',
    'Flagging controls and reviews trending late',
  ],
  honestLimitation:
    'Ledgerium captures browser-based compliance work. Steps in desktop tools or offline interviews still need a linked note.',
  originalDataPoint:
    'Across compliance processes, most cycle time is wait time on evidence requests, not work time. Ledgerium timestamps each step, so the report shows how long a control test waits on evidence rather than how long the review takes.',
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
      q: 'Can Ledgerium help with audit readiness?',
      a: 'Yes. It produces evidence-linked documentation traceable to the recorded steps, which is stronger audit evidence than a procedure written from recall.',
    },
    {
      q: 'Where can AI help in compliance?',
      a: 'In repetitive, rule-based steps like evidence gathering, routing, and reminders. Control judgment and sign-off should keep a human involved.',
    },
    {
      q: 'How do I keep compliance SOPs current?',
      a: 'Re-record a workflow after a control or system change and regenerate the SOP, rather than editing documents by hand each cycle.',
    },
  ],
  jsonLd: ['Article', 'FAQPage', 'BreadcrumbList', 'WebPage', 'Organization'],
  author: { name: 'Ledgerium Research Team', sameAs: ['https://www.linkedin.com/company/ledgerium'] },
  updatedAt: '2026-06-27',
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
];
