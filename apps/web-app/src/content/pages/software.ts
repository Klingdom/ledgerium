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

export const SOFTWARE_PAGES: readonly SoftwarePage[] = [salesforce, netsuite, servicenow, jira, zendesk];
