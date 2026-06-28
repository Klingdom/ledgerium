import type { SoftwarePage } from '../types';

/**
 * Software pages. Editorial "how to document a workflow in <vendor>" frame.
 * Non-affiliation: these guides are not endorsed by or affiliated with the
 * vendor. No vendor logos. Bottom-funnel, stack-fit intent.
 */

const salesforce: SoftwarePage = {
  type: 'software',
  slug: 'salesforce',
  vendor: 'Salesforce',
  metaTitle: 'How to Document a Workflow in Salesforce',
  metaDescription:
    'Document a Salesforce workflow by recording it once. Capture the real clicks and page flows, and generate an SOP and process map from the actual work.',
  h1: 'How to document a workflow in Salesforce',
  eyebrow: 'Software guide',
  shortAnswer:
    'To document a workflow in Salesforce, record someone performing the real process in Salesforce, lead qualification, opportunity handoff, or case resolution, then turn that recording into a step-by-step SOP and a process map. Salesforce screens vary by org configuration, so a written-from-memory guide rarely matches what users actually see. Ledgerium records the real interaction in the browser and generates the SOP, process map, and a workflow intelligence report, so the documentation reflects your org, not a generic example.',
  primaryKeyword: 'Salesforce workflow documentation',
  secondaryKeywords: ['document Salesforce process', 'Salesforce SOP', 'Salesforce lead qualification workflow'],
  searchIntent: 'commercial',
  tags: ['software', 'salesforce', 'crm', 'sales-operations', 'workflow'],
  related: ['workflow:customer-onboarding-workflow', 'software:netsuite', 'compare:tango'],
  originalDataPoint:
    'Salesforce orgs are heavily customized, so the same standard process looks different across companies. Ledgerium documents your actual org by recording real clicks and page flows, rather than describing a generic Salesforce screen that may not exist in your instance.',
  mechanismIntro:
    'Salesforce orgs are customized so heavily that two teams running the same standard process click through different layouts, and Ledgerium records the real path so the SOP shows your instance rather than a generic screen.',
  keyTakeaways: [
    'Salesforce lead qualification, opportunity handoff, and case resolution each follow a path shaped by your org configuration, which a generic guide cannot predict.',
    'Admin-built automation in Salesforce hides steps users never see, making the real flow hard to describe from memory.',
    'A guide written against a standard Salesforce layout references buttons and fields a customized org may not have, and trust erodes the first time it is wrong.',
    'Recording the process in your own Salesforce org captures the actual clicks, page flows, and cross-system steps in one pass.',
    'Ledgerium generates the SOP, process map, and a report flagging where the Salesforce process slows down from a single recorded run.',
  ],
  honestLimitation:
    'Ledgerium captures the browser-based steps inside Salesforce. Automations that run server-side, such as flows and triggers, are not observed directly; document their effect from what the user sees.',
  documentationFrame: 'How to document a workflow in Salesforce',
  commonWorkflows: [
    'Lead qualification and routing',
    'Opportunity-to-onboarding handoff',
    'Case creation and resolution',
    'Quote and approval routing',
  ],
  documentationChallenges: [
    'Org customization means generic guides do not match real screens',
    'Processes span Salesforce plus email and other systems',
    'Admin-built automation hides steps users never see, making the flow hard to describe',
  ],
  oldWay:
    'An admin or analyst writes the steps from memory against a generic Salesforce layout. Because every org is customized, the guide references buttons and fields that differ from what the team actually sees, and trust erodes fast.',
  ledgeriumWay:
    'Record the real process in your Salesforce org. Ledgerium captures the actual clicks, page flows, and cross-system steps and generates the SOP, the process map, and a report that highlights where the process slows down.',
  commonMistakes: [
    'Documenting against a generic layout instead of your customized org',
    'Stopping at the Salesforce boundary when the process continues in email or billing',
    'Omitting the validation and approval branches that vary by record type',
  ],
  faqs: [
    {
      q: 'How do I document a Salesforce process?',
      a: 'Record a real run of the process in your Salesforce org, then generate the SOP and process map from the recording. Because it captures your actual screens and clicks, the documentation matches your customized org rather than a generic example.',
    },
    {
      q: 'Why do generic Salesforce guides not match my screens?',
      a: 'Salesforce orgs are heavily customized with different layouts, fields, and automation. A guide written against a standard layout references things your org may not have. Recording your real process avoids that mismatch.',
    },
    {
      q: 'Can Ledgerium document a process that spans Salesforce and other tools?',
      a: 'Yes. A single recording captures the steps across Salesforce and the other browser-based systems in the process, such as email and billing, so the SOP reflects the full flow.',
    },
    {
      q: 'Does Ledgerium capture Salesforce flows and triggers?',
      a: 'It captures what the user does and sees in the browser. Server-side automation such as flows and triggers is not observed directly, so document its effect from the user-visible result.',
    },
    {
      q: 'Is this affiliated with Salesforce?',
      a: 'No. This is an independent guide. Salesforce is a trademark of its owner, and Ledgerium is not affiliated with or endorsed by Salesforce.',
    },
  ],
  jsonLd: ['Article', 'SoftwareApplication', 'FAQPage', 'BreadcrumbList', 'WebPage', 'Organization'],
  author: { name: 'Ledgerium Research Team', sameAs: ['https://www.linkedin.com/company/ledgerium'] },
  updatedAt: '2026-06-26',
  published: true,
};

const netsuite: SoftwarePage = {
  type: 'software',
  slug: 'netsuite',
  vendor: 'NetSuite',
  metaTitle: 'How to Document a Workflow in NetSuite',
  metaDescription:
    'Document a NetSuite workflow by recording it once. Capture the real approval routing, role-based screens, and steps, and generate an SOP and process map.',
  h1: 'How to document a workflow in NetSuite',
  eyebrow: 'Software guide',
  shortAnswer:
    'To document a workflow in NetSuite, record someone performing the real process, a purchase order approval, a vendor setup, or month-end steps, then generate a step-by-step SOP and a process map from it. NetSuite screens depend on role and customization, so written-from-memory guides drift from what users actually see. Ledgerium records the real interaction in the browser and produces the SOP, process map, and a workflow intelligence report, so the documentation matches your account and the role performing the work.',
  primaryKeyword: 'NetSuite workflow documentation',
  secondaryKeywords: ['document NetSuite process', 'NetSuite approval workflow', 'NetSuite SOP'],
  searchIntent: 'commercial',
  tags: ['software', 'netsuite', 'erp', 'finance', 'workflow'],
  related: ['workflow:invoice-approval-workflow', 'software:salesforce', 'compare:manual-sop-documentation'],
  originalDataPoint:
    'NetSuite screens and available actions change by role and permission. Ledgerium records the process as the actual role performs it, so the SOP reflects what that user can see and do rather than an administrator’s view of the system.',
  mechanismIntro:
    'NetSuite shows different screens and actions to each role, so Ledgerium records the process as the person who actually performs it works, producing an SOP that matches what that role can see and do rather than an administrator view.',
  keyTakeaways: [
    'NetSuite screens and available actions change by role and permission, so the same purchase order approval looks different to a clerk and an administrator.',
    'Approval routing in NetSuite depends on amount and subsidiary rules that are easy to leave out of a written guide.',
    'A NetSuite SOP written from an admin view references menus and actions the role running the work does not actually have.',
    'Recording the run as the performing role captures the real approval routing and steps for vendor setup, invoice processing, and month-end close.',
    'Ledgerium produces the SOP, process map, and a report showing where the NetSuite process waits or reworks from one session.',
  ],
  honestLimitation:
    'Ledgerium captures the browser-based steps in NetSuite. Scheduled scripts and back-end workflow actions are not observed directly; document their effect from the user-visible result.',
  documentationFrame: 'How to document a workflow in NetSuite',
  commonWorkflows: [
    'Purchase order approval routing',
    'New vendor setup',
    'Invoice and bill processing',
    'Month-end close steps',
  ],
  documentationChallenges: [
    'Role-based screens mean different users see different steps',
    'Approval routing depends on amount and subsidiary rules that are easy to miss',
    'Processes cross NetSuite and other systems, breaking single-system guides',
  ],
  oldWay:
    'A finance analyst documents the steps from memory, often from an administrator view that ordinary users never see. The guide references actions and menus the role performing the work does not actually have.',
  ledgeriumWay:
    'Record the real process as the role that performs it. Ledgerium captures the actual approval routing and steps and generates the SOP, the process map, and a report that highlights where the process waits or reworks.',
  commonMistakes: [
    'Documenting from an admin view instead of the role that runs the process',
    'Leaving approval thresholds and subsidiary rules out of the routing steps',
    'Stopping at the NetSuite boundary when the process continues elsewhere',
  ],
  faqs: [
    {
      q: 'How do I document a NetSuite process?',
      a: 'Record a real run of the process as the role that performs it, then generate the SOP and process map from the recording. The result reflects what that role actually sees and does in your account.',
    },
    {
      q: 'Why do NetSuite guides drift from reality?',
      a: 'NetSuite screens and actions depend on role, permission, and customization. A guide written from an admin view or from memory references steps that ordinary users do not have. Recording the real role avoids that gap.',
    },
    {
      q: 'Can Ledgerium capture NetSuite approval routing?',
      a: 'Yes. It records the approval steps as they happen in the browser, including the routing the user follows, so the SOP and process map show the real approval path rather than an idealized one.',
    },
    {
      q: 'Does Ledgerium capture NetSuite scripts and back-end workflows?',
      a: 'It captures what the user does and sees in the browser. Scheduled scripts and server-side workflow actions are not observed directly, so document their effect from the user-visible result.',
    },
    {
      q: 'Is this affiliated with NetSuite?',
      a: 'No. This is an independent guide. NetSuite is a trademark of its owner, and Ledgerium is not affiliated with or endorsed by NetSuite.',
    },
  ],
  jsonLd: ['Article', 'SoftwareApplication', 'FAQPage', 'BreadcrumbList', 'WebPage', 'Organization'],
  author: { name: 'Ledgerium Research Team', sameAs: ['https://www.linkedin.com/company/ledgerium'] },
  updatedAt: '2026-06-26',
  published: true,
};

const servicenow: SoftwarePage = {
  type: 'software',
  slug: 'servicenow',
  vendor: 'ServiceNow',
  metaTitle: 'How to Document a Workflow in ServiceNow',
  metaDescription:
    'Document a ServiceNow workflow by recording it once. Capture the real incident, request, and change steps, and generate an SOP and process map from real work.',
  h1: 'How to document a workflow in ServiceNow',
  eyebrow: 'Software guide',
  shortAnswer:
    'To document a workflow in ServiceNow, record someone performing the real process, an incident resolution, a service request, or a change, then generate a step-by-step SOP and a process map from it. ServiceNow is heavily configured per organization, so a generic guide rarely matches what fulfillers actually see. Ledgerium records the real interaction in the browser and produces the SOP, process map, and a workflow intelligence report, so the documentation reflects your instance and the role doing the work.',
  primaryKeyword: 'ServiceNow workflow documentation',
  secondaryKeywords: ['document ServiceNow process', 'ServiceNow SOP', 'ITSM process documentation'],
  searchIntent: 'commercial',
  tags: ['software', 'servicenow', 'itsm', 'it', 'workflow'],
  related: ['software:jira', 'workflow:zendesk-ticket-resolution-workflow', 'compare:process-mining'],
  originalDataPoint:
    'ServiceNow workflows differ by fulfiller group and configuration. Ledgerium records the process as the actual fulfiller performs it, so the SOP reflects what that group sees and does rather than a platform-admin view of the workflow.',
  mechanismIntro:
    'ServiceNow is configured so differently per organization that fulfiller groups see their own forms and routing, and Ledgerium records the real fulfillment so the SOP reflects your instance instead of a platform-admin view.',
  keyTakeaways: [
    'ServiceNow forms, fields, and routing are configured per organization, so a generic incident or request guide rarely matches what fulfillers see.',
    'Different ServiceNow fulfiller groups work different steps and fields, which a single written procedure cannot capture.',
    'Flow Designer automation moves records through steps fulfillers never see, leaving gaps in any from-memory documentation.',
    'Recording a real incident, service request, or change as the fulfiller works captures the actual forms and assignment routing.',
    'Ledgerium generates the SOP, process map, and a report highlighting where ServiceNow requests wait from one recorded run.',
  ],
  honestLimitation:
    'Ledgerium captures the browser-based steps in ServiceNow. Flow Designer actions and server-side scripts are not observed directly; document their effect from the user-visible result.',
  documentationFrame: 'How to document a workflow in ServiceNow',
  commonWorkflows: [
    'Incident logging and resolution',
    'Service request fulfillment',
    'Change request and approval',
    'Access and onboarding requests',
  ],
  documentationChallenges: [
    'Per-org configuration means generic guides do not match real forms',
    'Different fulfiller groups see different steps and fields',
    'Automation in Flow Designer hides steps users never see',
  ],
  oldWay:
    'An analyst writes the steps from a platform-admin view that fulfillers never use. The guide references fields and actions the actual group does not have, so it is wrong the first time someone follows it.',
  ledgeriumWay:
    'Record the real process as the fulfiller group performs it. Ledgerium captures the actual forms, routing, and steps and generates the SOP, the process map, and a report that highlights where requests wait.',
  commonMistakes: [
    'Documenting from an admin view instead of the fulfiller’s real screens',
    'Skipping the approval and assignment routing that varies by request type',
    'Stopping at the ServiceNow boundary when the process continues elsewhere',
  ],
  faqs: [
    {
      q: 'How do I document a ServiceNow process?',
      a: 'Record a real run of the process as the fulfiller performs it, then generate the SOP and process map from the recording. The result reflects what that group actually sees and does in your instance.',
    },
    {
      q: 'Why do generic ServiceNow guides not match my forms?',
      a: 'ServiceNow is configured per organization, with different forms, fields, and routing. A guide written from a standard or admin view references things your fulfiller group may not have. Recording the real process avoids that mismatch.',
    },
    {
      q: 'Can Ledgerium document a request that spans ServiceNow and other tools?',
      a: 'Yes. A single recording captures the steps across ServiceNow and the other browser-based systems in the process, so the SOP reflects the full fulfillment flow.',
    },
    {
      q: 'Does Ledgerium capture Flow Designer automation?',
      a: 'It captures what the user does and sees in the browser. Flow Designer actions and server-side scripts are not observed directly, so document their effect from the user-visible result.',
    },
    {
      q: 'Is this affiliated with ServiceNow?',
      a: 'No. This is an independent guide. ServiceNow is a trademark of its owner, and Ledgerium is not affiliated with or endorsed by ServiceNow.',
    },
  ],
  jsonLd: ['Article', 'SoftwareApplication', 'FAQPage', 'BreadcrumbList', 'WebPage', 'Organization'],
  author: { name: 'Ledgerium Research Team', sameAs: ['https://www.linkedin.com/company/ledgerium'] },
  updatedAt: '2026-06-26',
  published: true,
};

const jira: SoftwarePage = {
  type: 'software',
  slug: 'jira',
  vendor: 'Jira',
  metaTitle: 'How to Document a Workflow in Jira',
  metaDescription:
    'Document a Jira workflow by recording it once. Capture the real triage, transition, and resolution steps, and generate an SOP and process map from real work.',
  h1: 'How to document a workflow in Jira',
  eyebrow: 'Software guide',
  shortAnswer:
    'To document a workflow in Jira, record someone performing the real process, issue triage, a board transition, or a bug resolution, then generate a step-by-step SOP and a process map from it. Jira workflows and screens are customized per project, so a generic guide rarely matches a given team’s board. Ledgerium records the real interaction in the browser and produces the SOP, process map, and a workflow intelligence report, so the documentation matches your project and how the team actually moves work.',
  primaryKeyword: 'Jira workflow documentation',
  secondaryKeywords: ['document Jira process', 'Jira SOP', 'Jira issue workflow documentation'],
  searchIntent: 'commercial',
  tags: ['software', 'jira', 'engineering', 'issue-tracking', 'workflow'],
  related: ['software:servicenow', 'software:zendesk', 'compare:tango'],
  originalDataPoint:
    'Jira workflows are configured per project, so the same status name can mean different things across teams. Ledgerium records the real transitions a team performs, so the SOP reflects how that project actually moves work rather than a default scheme.',
  mechanismIntro:
    'Jira workflows are configured per project, so the same status name means different things across teams, and Ledgerium records the real transitions a team performs so the SOP reflects how that board actually moves work.',
  keyTakeaways: [
    'Jira status names and transitions are configured per project, so a default-scheme guide references steps a given team does not use.',
    'Automation rules in Jira move issues between statuses in ways users never see, which from-memory documentation misses.',
    'A Jira workflow written against a default scheme drifts immediately because each project is configured differently.',
    'Recording triage, board transitions, and bug resolution on the team’s actual board captures the real statuses and screens.',
    'Ledgerium produces the SOP, process map, and a report flagging where Jira issues stall from a single recording.',
  ],
  honestLimitation:
    'Ledgerium captures the browser-based steps in Jira. Automation rules and integrations that run in the background are not observed directly; document their effect from the user-visible result.',
  documentationFrame: 'How to document a workflow in Jira',
  commonWorkflows: [
    'Issue intake and triage',
    'Board and status transitions',
    'Bug investigation and resolution',
    'Release and handoff steps',
  ],
  documentationChallenges: [
    'Per-project configuration means status names and screens differ',
    'Automation rules move issues in ways users do not see',
    'Work spans Jira plus code, chat, and other tools',
  ],
  oldWay:
    'A lead writes the workflow from memory against a default scheme. Because each project is configured differently, the guide references statuses and transitions the team does not use, and it drifts immediately.',
  ledgeriumWay:
    'Record the real process on the team’s actual board. Ledgerium captures the real transitions and screens and generates the SOP, the process map, and a report that highlights where issues stall.',
  commonMistakes: [
    'Documenting a default scheme instead of the team’s configured board',
    'Skipping the transitions automation performs behind the scenes',
    'Stopping at the Jira boundary when the work continues in other tools',
  ],
  faqs: [
    {
      q: 'How do I document a Jira workflow?',
      a: 'Record a real run of the process on the team’s board, then generate the SOP and process map from the recording. The result reflects the actual statuses, transitions, and screens that project uses.',
    },
    {
      q: 'Why do generic Jira guides not match my board?',
      a: 'Jira workflows and screens are configured per project, so status names and transitions vary. A guide written against a default scheme references things your team may not use. Recording the real process avoids that.',
    },
    {
      q: 'Can Ledgerium document work that spans Jira and other tools?',
      a: 'Yes. A single recording captures the steps across Jira and the other browser-based tools in the process, so the SOP reflects the full flow rather than just the board.',
    },
    {
      q: 'Does Ledgerium capture Jira automation rules?',
      a: 'It captures what the user does and sees in the browser. Automation rules and integrations are not observed directly, so document their effect from the user-visible result.',
    },
    {
      q: 'Is this affiliated with Jira or Atlassian?',
      a: 'No. This is an independent guide. Jira is a trademark of its owner, and Ledgerium is not affiliated with or endorsed by Jira or Atlassian.',
    },
  ],
  jsonLd: ['Article', 'SoftwareApplication', 'FAQPage', 'BreadcrumbList', 'WebPage', 'Organization'],
  author: { name: 'Ledgerium Research Team', sameAs: ['https://www.linkedin.com/company/ledgerium'] },
  updatedAt: '2026-06-26',
  published: true,
};

const zendesk: SoftwarePage = {
  type: 'software',
  slug: 'zendesk',
  vendor: 'Zendesk',
  metaTitle: 'How to Document a Workflow in Zendesk',
  metaDescription:
    'Document a Zendesk workflow by recording it once. Capture the real triage, investigation, and response steps in an SOP and a process map.',
  h1: 'How to document a workflow in Zendesk',
  eyebrow: 'Software guide',
  shortAnswer:
    'To document a workflow in Zendesk, record an agent performing the real process, ticket triage, resolution, or escalation, then generate a step-by-step SOP and a process map from it. Zendesk is configured per team with custom fields, macros, and routing, so a generic guide rarely matches how agents actually work. Ledgerium records the real interaction in the browser, including lookups in other tools, and produces the SOP, process map, and a workflow intelligence report tied to how your team handles tickets.',
  primaryKeyword: 'Zendesk workflow documentation',
  secondaryKeywords: ['document Zendesk process', 'Zendesk SOP', 'support workflow documentation'],
  searchIntent: 'commercial',
  tags: ['software', 'zendesk', 'customer-support', 'ticketing', 'workflow'],
  related: ['workflow:zendesk-ticket-resolution-workflow', 'software:servicenow', 'compare:tango'],
  originalDataPoint:
    'Macros capture canned replies, not how agents diagnose issues. Ledgerium records the real investigation steps an agent takes across tools, so the SOP shows the diagnosis work that Zendesk’s own configuration never documents.',
  mechanismIntro:
    'Zendesk macros capture canned replies but not how agents diagnose issues, so Ledgerium records the real investigation across tools and produces an SOP showing the diagnosis work Zendesk configuration never documents.',
  keyTakeaways: [
    'Zendesk macros document replies, not the investigation steps agents take to diagnose an issue across other tools.',
    'Zendesk is configured per team with custom fields, macros, and routing, so a generic support guide misses how agents actually work.',
    'Support investigation steps that live outside Zendesk go undocumented when only the help desk is captured.',
    'Recording a real resolution as the agent works captures triage, cross-tool investigation, and response together.',
    'Ledgerium generates the SOP, process map, and a report highlighting where ticket time is spent from one session.',
  ],
  honestLimitation:
    'Ledgerium captures the browser-based steps in Zendesk. Triggers, automations, and routing rules that run in the background are not observed directly; document their effect from the user-visible result.',
  documentationFrame: 'How to document a workflow in Zendesk',
  commonWorkflows: [
    'Ticket triage and categorization',
    'Investigation and resolution',
    'Escalation to another team',
    'SLA and follow-up handling',
  ],
  documentationChallenges: [
    'Per-team configuration means fields, macros, and routing differ',
    'The investigation steps live outside Zendesk and go undocumented',
    'Automations move tickets in ways agents do not see',
  ],
  oldWay:
    'The macro library captures replies, and the rest is tribal knowledge. New agents learn by watching whoever is nearby, so the diagnosis steps are never written down and quality varies.',
  ledgeriumWay:
    'Record a real resolution as the agent works. Ledgerium captures the triage, investigation, and response across tools and generates the SOP, the process map, and a report that highlights where time is spent.',
  commonMistakes: [
    'Documenting macros and replies but not the investigation steps',
    'Leaving routing and escalation rules undocumented',
    'Stopping at the Zendesk boundary when diagnosis happens in other tools',
  ],
  faqs: [
    {
      q: 'How do I document a Zendesk workflow?',
      a: 'Record a real resolution as the agent works, then generate the SOP and process map from the recording. The result reflects the triage, investigation, and response steps your team actually uses.',
    },
    {
      q: 'Why do generic Zendesk guides fall short?',
      a: 'Zendesk is configured per team with custom fields, macros, and routing, and the investigation steps live in other tools. A generic guide misses both. Recording the real work captures what actually happens.',
    },
    {
      q: 'Can Ledgerium capture steps in tools outside Zendesk?',
      a: 'Yes. A single recording captures the steps across each browser-based tool an agent uses during a resolution, so the SOP reflects the full cross-tool flow, not just Zendesk.',
    },
    {
      q: 'Does Ledgerium capture Zendesk triggers and automations?',
      a: 'It captures what the user does and sees in the browser. Triggers and automations are not observed directly, so document their effect from the user-visible result.',
    },
    {
      q: 'Is this affiliated with Zendesk?',
      a: 'No. This is an independent guide. Zendesk is a trademark of its owner, and Ledgerium is not affiliated with or endorsed by Zendesk.',
    },
  ],
  jsonLd: ['Article', 'SoftwareApplication', 'FAQPage', 'BreadcrumbList', 'WebPage', 'Organization'],
  author: { name: 'Ledgerium Research Team', sameAs: ['https://www.linkedin.com/company/ledgerium'] },
  updatedAt: '2026-06-26',
  published: true,
};

const sap: SoftwarePage = {
  type: 'software',
  slug: 'sap',
  vendor: 'SAP',
  metaTitle: 'How to Document a Workflow in SAP',
  metaDescription:
    'Document an SAP workflow by recording it once. Capture the real role screens, transaction steps, and postings, and generate an SOP and process map.',
  h1: 'How to document a workflow in SAP',
  eyebrow: 'Software guide',
  shortAnswer:
    'To document a workflow in SAP, record someone performing the real process, a purchase requisition, a goods receipt, or an invoice verification, then generate a step-by-step SOP and a process map from it. SAP screens depend on role, transaction code, and configuration, so a written-from-memory guide rarely matches what the user actually runs. Ledgerium records the real interaction in the browser and produces the SOP, process map, and a workflow intelligence report, so the documentation reflects the transactions and fields that role actually touches.',
  primaryKeyword: 'SAP workflow documentation',
  secondaryKeywords: ['document SAP process', 'SAP SOP', 'SAP transaction documentation'],
  searchIntent: 'commercial',
  tags: ['software', 'sap', 'erp', 'finance', 'workflow'],
  related: ['workflow:purchase-order-workflow', 'software:netsuite', 'compare:process-mining'],
  originalDataPoint:
    'SAP shows different transactions and fields depending on role, transaction code, and configuration. Ledgerium records the process as the actual role performs it, so the SOP reflects the screens and entries that user works through rather than a configuration-team view of the system.',
  mechanismIntro:
    'SAP shows different transactions and fields by role, transaction code, and configuration, so Ledgerium records the run as the actual role performs it and produces an SOP covering the screens and entries that user works through.',
  keyTakeaways: [
    'SAP screens depend on role, transaction code, and configuration, so a from-memory guide references transactions a given role may not run.',
    'SAP entry screens carry many fields, and a guide listing transaction codes without the field entries leaves users stuck.',
    'Release strategies and posting rules in SAP depend on conditions that are easy to omit from a written procedure.',
    'Recording a purchase requisition, goods receipt, or invoice verification as the role works captures the real field entries and release steps.',
    'Ledgerium produces the SOP, process map, and a report showing where the SAP process waits or reworks from one recording.',
  ],
  honestLimitation:
    'Ledgerium captures the browser-based steps in SAP, including Fiori and web GUI sessions. Background jobs, workflow steps, and ABAP routines that run server-side are not observed directly; document their effect from the user-visible result.',
  documentationFrame: 'How to document a workflow in SAP',
  commonWorkflows: [
    'Purchase requisition entry and release',
    'Goods receipt posting',
    'Invoice verification and matching',
    'Financial postings and journal entries',
  ],
  documentationChallenges: [
    'Role and transaction-code differences mean users see different screens',
    'Field-heavy entry screens hide which fields actually matter for the step',
    'Release strategies and postings depend on rules that are easy to leave out',
  ],
  oldWay:
    'A key user writes the steps from memory, often listing transaction codes without the field entries that make each screen work. New users hit fields the guide never mentions, so they ask the person next to them instead.',
  ledgeriumWay:
    'Record the real process as the role that performs it. Ledgerium captures the actual transaction screens, field entries, and release steps and generates the SOP, the process map, and a report that highlights where the process waits or reworks.',
  commonMistakes: [
    'Listing transaction codes without the field entries the step depends on',
    'Documenting from a configuration view instead of the role that runs the work',
    'Leaving release strategy and posting rules out of the routing steps',
  ],
  faqs: [
    {
      q: 'How do I document an SAP process?',
      a: 'Record a real run of the process as the role that performs it, then generate the SOP and process map from the recording. The result reflects the transactions, fields, and entries that role actually works through.',
    },
    {
      q: 'Why do SAP guides drift from what users see?',
      a: 'SAP screens depend on role, transaction code, and configuration, and entry screens carry many fields. A guide written from memory or a config view references things the role may not have. Recording the real process avoids that gap.',
    },
    {
      q: 'Can Ledgerium document a process that spans SAP and other tools?',
      a: 'Yes. A single recording captures the steps across SAP and the other browser-based systems in the process, such as email and a vendor portal, so the SOP reflects the full flow.',
    },
    {
      q: 'Does Ledgerium capture SAP background jobs and workflows?',
      a: 'It captures what the user does and sees in the browser. Background jobs and server-side workflow steps are not observed directly, so document their effect from the user-visible result.',
    },
    {
      q: 'Is this affiliated with SAP?',
      a: 'No. This is an independent guide. SAP is a trademark of its owner, and Ledgerium is not affiliated with or endorsed by SAP.',
    },
  ],
  jsonLd: ['Article', 'SoftwareApplication', 'FAQPage', 'BreadcrumbList', 'WebPage', 'Organization'],
  author: { name: 'Ledgerium Research Team', sameAs: ['https://www.linkedin.com/company/ledgerium'] },
  updatedAt: '2026-06-26',
  published: true,
};

const quickbooks: SoftwarePage = {
  type: 'software',
  slug: 'quickbooks',
  vendor: 'QuickBooks',
  metaTitle: 'How to Document a Workflow in QuickBooks',
  metaDescription:
    'Document a QuickBooks workflow by recording it once. Capture the real bill approval, invoicing, and reconciliation steps in an SOP and a process map.',
  h1: 'How to document a workflow in QuickBooks',
  eyebrow: 'Software guide',
  shortAnswer:
    'To document a workflow in QuickBooks, record someone performing the real process, a bill approval, an invoice, or a bank reconciliation, then generate a step-by-step SOP and a process map from it. Small teams often hold these steps in one person’s head, so the process is undocumented until that person is out. Ledgerium records the real interaction in the browser, including the lookups and approvals outside QuickBooks, and produces the SOP, process map, and a workflow intelligence report tied to how your books are actually kept.',
  primaryKeyword: 'QuickBooks workflow documentation',
  secondaryKeywords: ['document QuickBooks process', 'QuickBooks SOP', 'bookkeeping workflow documentation'],
  searchIntent: 'commercial',
  tags: ['software', 'quickbooks', 'accounting', 'finance', 'workflow'],
  related: ['workflow:month-end-close-workflow', 'persona:compliance-teams', 'compare:manual-sop-documentation'],
  originalDataPoint:
    'In small teams, bookkeeping steps live in one person’s memory and the approval and review steps happen in email or chat. Ledgerium records the real run across QuickBooks and those tools, so the SOP shows the full month-end and approval work that QuickBooks alone never documents.',
  mechanismIntro:
    'QuickBooks bookkeeping often lives in one person’s memory with approvals happening in email, so Ledgerium records the real run across QuickBooks and those tools to produce an SOP of the full month-end and approval work.',
  keyTakeaways: [
    'QuickBooks bookkeeping steps on small teams live in one person’s memory, leaving the process undocumented until that person is out.',
    'Approvals and reviews for the books happen in email outside QuickBooks, so a QuickBooks-only guide misses them.',
    'Bank reconciliation judgment calls are hard to describe from memory and rarely get written down.',
    'Recording the bookkeeper at work captures bill, invoice, and reconciliation steps across QuickBooks and email in one pass.',
    'Ledgerium generates the SOP, process map, and a report highlighting where the close slows down from a single recording.',
  ],
  honestLimitation:
    'Ledgerium captures the browser-based steps in QuickBooks Online. Bank feeds, recurring transactions, and rules that post automatically are not observed directly; document their effect from the user-visible result.',
  documentationFrame: 'How to document a workflow in QuickBooks',
  commonWorkflows: [
    'Bill entry and approval',
    'Invoicing and payment recording',
    'Bank and credit card reconciliation',
    'Month-end review and close steps',
  ],
  documentationChallenges: [
    'Steps live in one person’s head with nothing written down',
    'Approvals and reviews happen in email, outside the books',
    'Reconciliation judgment calls are hard to describe from memory',
  ],
  oldWay:
    'The bookkeeper keeps the process in their head and a few notes. When they are out or hand off the work, the next person guesses at the order, misses a review step, and the close slips.',
  ledgeriumWay:
    'Record the real process as the bookkeeper works. Ledgerium captures the bill, invoice, and reconciliation steps across QuickBooks and email and generates the SOP, the process map, and a report that highlights where the close slows down.',
  commonMistakes: [
    'Documenting data entry but skipping the review and approval steps',
    'Leaving the reconciliation judgment calls undocumented',
    'Stopping at the QuickBooks boundary when approvals happen in email',
  ],
  faqs: [
    {
      q: 'How do I document a QuickBooks process?',
      a: 'Record a real run of the process as the bookkeeper works, then generate the SOP and process map from the recording. The result reflects the entry, review, and reconciliation steps your books actually use.',
    },
    {
      q: 'Why is bookkeeping so often undocumented?',
      a: 'On small teams the steps live in one person’s memory and the approvals happen in email. Nothing is written down until a handoff forces it. Recording a real run captures the process before that pressure hits.',
    },
    {
      q: 'Can Ledgerium capture steps outside QuickBooks?',
      a: 'Yes. A single recording captures the steps across QuickBooks and the other browser-based tools in the process, such as email approvals and a bank portal, so the SOP reflects the full flow.',
    },
    {
      q: 'Does Ledgerium capture QuickBooks bank rules and recurring transactions?',
      a: 'It captures what the user does and sees in the browser. Bank feeds, rules, and recurring transactions that post automatically are not observed directly, so document their effect from the user-visible result.',
    },
    {
      q: 'Is this affiliated with QuickBooks or Intuit?',
      a: 'No. This is an independent guide. QuickBooks is a trademark of its owner, and Ledgerium is not affiliated with or endorsed by QuickBooks or Intuit.',
    },
  ],
  jsonLd: ['Article', 'SoftwareApplication', 'FAQPage', 'BreadcrumbList', 'WebPage', 'Organization'],
  author: { name: 'Ledgerium Research Team', sameAs: ['https://www.linkedin.com/company/ledgerium'] },
  updatedAt: '2026-06-26',
  published: true,
};

const hubspot: SoftwarePage = {
  type: 'software',
  slug: 'hubspot',
  vendor: 'HubSpot',
  metaTitle: 'How to Document a Workflow in HubSpot',
  metaDescription:
    'Document a HubSpot workflow by recording it once. Capture the real lead handoff, deal stage, and pipeline steps, and generate an SOP and process map.',
  h1: 'How to document a workflow in HubSpot',
  eyebrow: 'Software guide',
  shortAnswer:
    'To document a workflow in HubSpot, record someone performing the real process, a lead handoff, a deal stage change, or a ticket move, then generate a step-by-step SOP and a process map from it. HubSpot pipelines and properties are configured per team, so a generic guide rarely matches how reps actually move records. Ledgerium records the real interaction in the browser and produces the SOP, process map, and a workflow intelligence report, so the documentation matches your portal and the way the team actually works deals and tickets.',
  primaryKeyword: 'HubSpot workflow documentation',
  secondaryKeywords: ['document HubSpot process', 'HubSpot SOP', 'CRM workflow documentation'],
  searchIntent: 'commercial',
  tags: ['software', 'hubspot', 'crm', 'revenue-operations', 'workflow'],
  related: ['workflow:salesforce-lead-qualification-workflow', 'software:salesforce', 'persona:revops-managers'],
  originalDataPoint:
    'HubSpot pipelines, stages, and properties are configured per team, so what counts as a stage change differs across portals. Ledgerium records the real steps a rep takes, so the SOP reflects how that team actually moves deals and tickets rather than a default pipeline.',
  mechanismIntro:
    'HubSpot pipelines, stages, and properties are configured per team, so what counts as a stage change differs across portals, and Ledgerium records the steps a rep takes so the SOP reflects how that team moves deals and tickets.',
  keyTakeaways: [
    'HubSpot pipelines, stages, and properties are configured per team, so a default-pipeline playbook references steps reps do not follow.',
    'HubSpot automation and sequences enroll and move records in ways reps never see, which from-memory documentation misses.',
    'HubSpot work spans email and calendars, so a portal-only guide stops short of the full follow-up flow.',
    'Recording a rep working a record captures the real stage moves, property updates, and follow-up steps.',
    'Ledgerium produces the SOP, process map, and a report flagging where HubSpot deals stall from one recording.',
  ],
  honestLimitation:
    'Ledgerium captures the browser-based steps in HubSpot. Automation, sequence enrollment, and workflow actions that run in the background are not observed directly; document their effect from the user-visible result.',
  documentationFrame: 'How to document a workflow in HubSpot',
  commonWorkflows: [
    'Lead handoff from marketing to sales',
    'Deal stage progression and updates',
    'Ticket pipeline handling',
    'Sequence enrollment and follow-up',
  ],
  documentationChallenges: [
    'Per-team pipelines and properties mean stage steps differ across portals',
    'Automation enrolls and moves records in ways reps do not see',
    'Work spans HubSpot plus email, calendars, and other tools',
  ],
  oldWay:
    'A RevOps lead writes the playbook from memory against a default pipeline. Because each team configures stages and properties differently, the guide references steps reps do not follow, and it drifts as the portal changes.',
  ledgeriumWay:
    'Record the real process as the rep works the record. Ledgerium captures the actual stage moves, property updates, and follow-up steps and generates the SOP, the process map, and a report that highlights where deals stall.',
  commonMistakes: [
    'Documenting a default pipeline instead of the team’s configured stages',
    'Skipping the steps automation and sequences perform behind the scenes',
    'Stopping at the HubSpot boundary when follow-up happens in email or calendar',
  ],
  faqs: [
    {
      q: 'How do I document a HubSpot workflow?',
      a: 'Record a real run of the process as the rep works the record, then generate the SOP and process map from the recording. The result reflects the actual stages, properties, and follow-up steps your team uses.',
    },
    {
      q: 'Why do generic HubSpot guides not match my portal?',
      a: 'HubSpot pipelines, stages, and properties are configured per team. A guide written against a default pipeline references steps your reps may not follow. Recording the real process avoids that mismatch.',
    },
    {
      q: 'Can Ledgerium document work that spans HubSpot and other tools?',
      a: 'Yes. A single recording captures the steps across HubSpot and the other browser-based tools in the process, such as email and calendar, so the SOP reflects the full flow.',
    },
    {
      q: 'Does Ledgerium capture HubSpot automation and sequences?',
      a: 'It captures what the user does and sees in the browser. Automation and sequence enrollment that run in the background are not observed directly, so document their effect from the user-visible result.',
    },
    {
      q: 'Is this affiliated with HubSpot?',
      a: 'No. This is an independent guide. HubSpot is a trademark of its owner, and Ledgerium is not affiliated with or endorsed by HubSpot.',
    },
  ],
  jsonLd: ['Article', 'SoftwareApplication', 'FAQPage', 'BreadcrumbList', 'WebPage', 'Organization'],
  author: { name: 'Ledgerium Research Team', sameAs: ['https://www.linkedin.com/company/ledgerium'] },
  updatedAt: '2026-06-26',
  published: true,
};

const workday: SoftwarePage = {
  type: 'software',
  slug: 'workday',
  vendor: 'Workday',
  metaTitle: 'How to Document a Workflow in Workday',
  metaDescription:
    'Document a Workday workflow by recording it once. Capture the real onboarding, time-off, and approval steps, and generate an SOP and process map.',
  h1: 'How to document a workflow in Workday',
  eyebrow: 'Software guide',
  shortAnswer:
    'To document a workflow in Workday, record someone performing the real process, a hire and onboarding, a time-off request, or an expense approval, then generate a step-by-step SOP and a process map from it. Workday business processes and security groups vary by tenant, so a generic guide rarely matches what an employee or approver actually sees. Ledgerium records the real interaction in the browser and produces the SOP, process map, and a workflow intelligence report, so the documentation reflects your tenant and the role doing the work.',
  primaryKeyword: 'Workday workflow documentation',
  secondaryKeywords: ['document Workday process', 'Workday SOP', 'HR workflow documentation'],
  searchIntent: 'commercial',
  tags: ['software', 'workday', 'hcm', 'human-resources', 'workflow'],
  related: ['workflow:employee-onboarding-workflow', 'software:servicenow', 'persona:hr-teams'],
  originalDataPoint:
    'Workday business processes and what each security group can do vary by tenant, so an employee, a manager, and an HR partner each see a different slice of the same process. Ledgerium records the process as the actual role performs it, so the SOP reflects what that role sees and does rather than an HR-admin view.',
  mechanismIntro:
    'Workday business processes and security groups vary by tenant, so an employee, manager, and HR partner each see a different slice, and Ledgerium records the run as the actual role performs it to produce a matching SOP.',
  keyTakeaways: [
    'Workday business processes and security groups vary by tenant, so each role sees a different slice of the same process.',
    'Workday tasks land in inboxes and route on conditions that are hard to describe from memory.',
    'A Workday SOP written from an HR-admin view references inbox items and actions employees and managers do not have.',
    'Recording a hire, time-off request, or expense approval as the performing role captures the real tasks and inbox routing.',
    'Ledgerium generates the SOP, process map, and a report showing where Workday requests wait from a single recording.',
  ],
  honestLimitation:
    'Ledgerium captures the browser-based steps in Workday. Business process routing, conditions, and integrations that run server-side are not observed directly; document their effect from the user-visible result.',
  documentationFrame: 'How to document a workflow in Workday',
  commonWorkflows: [
    'Hire and onboarding tasks',
    'Time-off request and approval',
    'Job change and transfer',
    'Expense report submission and approval',
  ],
  documentationChallenges: [
    'Security groups mean employees, managers, and HR see different steps',
    'Business process routing depends on conditions that are easy to miss',
    'Tasks land in inboxes, so the routing is hard to describe from memory',
  ],
  oldWay:
    'An HR partner writes the steps from an admin view that employees and managers never use. The guide references inbox items and actions the role performing the work does not have, so it confuses the people it is meant to help.',
  ledgeriumWay:
    'Record the real process as the role that performs it. Ledgerium captures the actual tasks, inbox routing, and approval steps and generates the SOP, the process map, and a report that highlights where requests wait.',
  commonMistakes: [
    'Documenting from an HR-admin view instead of the role that runs the process',
    'Leaving the inbox routing and approval conditions out of the steps',
    'Stopping at the Workday boundary when onboarding continues in other systems',
  ],
  faqs: [
    {
      q: 'How do I document a Workday process?',
      a: 'Record a real run of the process as the role that performs it, then generate the SOP and process map from the recording. The result reflects what that role actually sees and does in your tenant.',
    },
    {
      q: 'Why do Workday guides drift from reality?',
      a: 'Workday business processes and security groups vary by tenant, so each role sees a different slice. A guide written from an admin view references steps employees and managers do not have. Recording the real role avoids that gap.',
    },
    {
      q: 'Can Ledgerium document an onboarding that spans Workday and other tools?',
      a: 'Yes. A single recording captures the steps across Workday and the other browser-based systems in the process, such as an IT request portal, so the SOP reflects the full flow.',
    },
    {
      q: 'Does Ledgerium capture Workday business process routing?',
      a: 'It captures what the user does and sees in the browser, including the inbox items they act on. The routing and conditions that run server-side are not observed directly, so document their effect from the user-visible result.',
    },
    {
      q: 'Is this affiliated with Workday?',
      a: 'No. This is an independent guide. Workday is a trademark of its owner, and Ledgerium is not affiliated with or endorsed by Workday.',
    },
  ],
  jsonLd: ['Article', 'SoftwareApplication', 'FAQPage', 'BreadcrumbList', 'WebPage', 'Organization'],
  author: { name: 'Ledgerium Research Team', sameAs: ['https://www.linkedin.com/company/ledgerium'] },
  updatedAt: '2026-06-26',
  published: true,
};

const sharepoint: SoftwarePage = {
  type: 'software',
  slug: 'sharepoint',
  vendor: 'SharePoint',
  metaTitle: 'How to Document a Workflow in SharePoint',
  metaDescription:
    'Document a SharePoint workflow by recording it once. Capture the real approval, access request, and publishing steps in an SOP and a process map.',
  h1: 'How to document a workflow in SharePoint',
  eyebrow: 'Software guide',
  shortAnswer:
    'To document a workflow in SharePoint, record someone performing the real process, a document approval, an access request, or a page publish, then generate a step-by-step SOP and a process map from it. SharePoint sites are configured per team with their own libraries, permissions, and approval flows, so a generic guide rarely matches a given site. Ledgerium records the real interaction in the browser and produces the SOP, process map, and a workflow intelligence report, so the documentation reflects your site and how the team actually handles content.',
  primaryKeyword: 'SharePoint workflow documentation',
  secondaryKeywords: ['document SharePoint process', 'SharePoint SOP', 'document approval workflow documentation'],
  searchIntent: 'commercial',
  tags: ['software', 'sharepoint', 'document-management', 'intranet', 'workflow'],
  related: [
    'workflow:contract-review-workflow',
    'problem:how-to-document-a-process-without-interviewing-everyone',
    'compare:process-street',
  ],
  originalDataPoint:
    'SharePoint sites differ by library structure, permission level, and approval flow, so the same task looks different across teams. Ledgerium records the real steps a contributor takes, so the SOP reflects how that site actually handles approval and publishing rather than a generic library example.',
  mechanismIntro:
    'SharePoint sites are configured per team with their own libraries, permissions, and approval flows, so Ledgerium records a contributor working the content to produce an SOP that reflects how that site actually handles approval and publishing.',
  keyTakeaways: [
    'SharePoint sites are configured per team with their own libraries, permissions, and approval flows, so a standard-library guide misses real steps.',
    'Power Automate flows in SharePoint move documents in ways contributors never see, leaving gaps in from-memory documentation.',
    'SharePoint approval and publishing steps span email and Teams, so a SharePoint-only guide stops short of the full flow.',
    'A SharePoint SOP written against a standard library references columns and permissions a configured site may not have.',
    'Ledgerium produces the SOP, process map, and a report highlighting where SharePoint content waits from one recording.',
  ],
  honestLimitation:
    'Ledgerium captures the browser-based steps in SharePoint. Power Automate flows and retention policies that run in the background are not observed directly; document their effect from the user-visible result.',
  documentationFrame: 'How to document a workflow in SharePoint',
  commonWorkflows: [
    'Document review and approval',
    'Site and library access requests',
    'Records management and retention steps',
    'Page authoring and publishing',
  ],
  documentationChallenges: [
    'Per-site configuration means libraries, permissions, and flows differ',
    'Power Automate flows move documents in ways contributors do not see',
    'Approval and publishing steps span SharePoint plus email and Teams',
  ],
  oldWay:
    'A site owner writes the steps from memory against a standard library. Because each site is configured differently, the guide references columns, permissions, and approval flows the team does not have, and it drifts as the site changes.',
  ledgeriumWay:
    'Record the real process as the contributor works the content. Ledgerium captures the actual library steps, approval routing, and publishing actions and generates the SOP, the process map, and a report that highlights where content waits.',
  commonMistakes: [
    'Documenting a standard library instead of the team’s configured site',
    'Skipping the steps Power Automate flows perform behind the scenes',
    'Stopping at the SharePoint boundary when approvals happen in email or Teams',
  ],
  faqs: [
    {
      q: 'How do I document a SharePoint process?',
      a: 'Record a real run of the process as the contributor works the content, then generate the SOP and process map from the recording. The result reflects the actual library, approval, and publishing steps your site uses.',
    },
    {
      q: 'Why do generic SharePoint guides not match my site?',
      a: 'SharePoint sites are configured per team with their own libraries, permissions, and approval flows. A guide written against a standard library references things your site may not have. Recording the real process avoids that mismatch.',
    },
    {
      q: 'Can Ledgerium document an approval that spans SharePoint and other tools?',
      a: 'Yes. A single recording captures the steps across SharePoint and the other browser-based tools in the process, such as email and Teams, so the SOP reflects the full flow.',
    },
    {
      q: 'Does Ledgerium capture Power Automate flows?',
      a: 'It captures what the user does and sees in the browser. Power Automate flows and retention policies that run in the background are not observed directly, so document their effect from the user-visible result.',
    },
    {
      q: 'Is this affiliated with SharePoint or Microsoft?',
      a: 'No. This is an independent guide. SharePoint is a trademark of its owner, and Ledgerium is not affiliated with or endorsed by SharePoint or Microsoft.',
    },
  ],
  jsonLd: ['Article', 'SoftwareApplication', 'FAQPage', 'BreadcrumbList', 'WebPage', 'Organization'],
  author: { name: 'Ledgerium Research Team', sameAs: ['https://www.linkedin.com/company/ledgerium'] },
  updatedAt: '2026-06-26',
  published: true,
};

export const SOFTWARE_PAGES: readonly SoftwarePage[] = [
  salesforce,
  netsuite,
  servicenow,
  jira,
  zendesk,
  sap,
  quickbooks,
  hubspot,
  workday,
  sharepoint,
];
