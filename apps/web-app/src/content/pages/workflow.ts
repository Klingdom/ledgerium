import type { WorkflowPage } from '../types';

/** Workflow pages. Mid-funnel; the user already knows their process. */

const invoiceApproval: WorkflowPage = {
  type: 'workflow',
  slug: 'invoice-approval-workflow',
  metaTitle: 'Invoice Approval Workflow: How to Document It',
  metaDescription:
    'Document your invoice approval workflow by recording it once. Get an SOP, a process map, and the approval steps, exceptions, and timing captured from real work.',
  h1: 'How to document an invoice approval workflow',
  eyebrow: 'Workflow',
  shortAnswer:
    'To document an invoice approval workflow, record someone actually approving an invoice from receipt to payment, then turn that recording into a step-by-step SOP and a process map, and review it with the approver. The steps usually are: receive the invoice, match it to a purchase order, check coding and approval limits, route for approval, and post for payment. Ledgerium records the real approval in the browser and generates the SOP, process map, and a workflow intelligence report that shows where approvals wait and stall.',
  primaryKeyword: 'invoice approval workflow',
  secondaryKeywords: ['invoice approval SOP', 'AP approval process', 'document invoice approval'],
  searchIntent: 'commercial',
  tags: ['workflow', 'finance', 'accounts-payable', 'approval', 'netsuite'],
  related: ['workflow:customer-onboarding-workflow', 'software:netsuite', 'compare:manual-sop-documentation'],
  originalDataPoint:
    'In invoice approval, most cycle time is wait time, not work time. Ledgerium separates the two by recording the timestamp of each step, so the report shows how long an invoice sits between routing and approval rather than how long the approval click takes.',
  honestLimitation:
    'Approval decisions made over email or in a hallway are not captured. Ledgerium records the steps performed in the browser; rationale added outside it needs a note.',
  whoUsesIt:
    'Accounts payable clerks, approvers, controllers, and the operations or finance lead who owns the close. Auditors review it when testing payment controls.',
  systems: ['ERP or accounting system', 'Email', 'Document or PO repository'],
  oldWay:
    'Someone writes the approval steps from memory, usually missing the exception paths, the rejection loop, and the threshold checks that decide who approves what. The document describes the happy path and quietly diverges from how invoices are really approved.',
  ledgeriumWay:
    'Record one real approval. Ledgerium captures every step, including the match to the purchase order, the threshold check, and the routing, and generates the SOP, the process map, and a report that highlights where invoices wait.',
  steps: [
    { title: 'Receive and log the invoice', detail: 'The invoice arrives and is entered or imported into the accounting system.' },
    { title: 'Match to purchase order', detail: 'Confirm the invoice matches an approved PO and receipt before it can be approved.' },
    { title: 'Check coding and approval limit', detail: 'Verify the cost coding and confirm the amount is within the approver’s limit.' },
    { title: 'Route for approval', detail: 'Send to the correct approver based on amount, department, or vendor.' },
    { title: 'Approve and post for payment', detail: 'The approver signs off and the invoice is posted into the payment run.' },
  ],
  commonMistakes: [
    'Documenting only the happy path and omitting the rejection and rework loop',
    'Leaving the approval-limit thresholds undocumented, so routing is unclear',
    'Not capturing the wait time between routing and approval, which is where delays hide',
  ],
  metrics: [
    { label: 'Cycle time per invoice', note: 'Receipt to posted-for-payment, split into work time and wait time.' },
    { label: 'Approval wait time', note: 'How long an invoice sits between routing and approval.' },
    { label: 'Rework rate', note: 'Share of invoices that loop back for correction before approval.' },
  ],
  aiOpportunities: [
    'Auto-match invoices to purchase orders and flag only the exceptions',
    'Pre-fill cost coding from vendor and historical patterns for human review',
    'Detect approvals that consistently exceed target wait time and escalate them',
  ],
  faqs: [
    {
      q: 'What are the steps in an invoice approval workflow?',
      a: 'Typically: receive and log the invoice, match it to a purchase order, check coding and approval limits, route to the right approver, then approve and post for payment. The exact routing depends on amount and department thresholds.',
    },
    {
      q: 'How do I document an invoice approval workflow quickly?',
      a: 'Record one real approval from receipt to payment, then generate the SOP and process map from the recording. This captures the exception paths and threshold checks that written-from-memory SOPs usually miss.',
    },
    {
      q: 'Where do invoice approvals usually get stuck?',
      a: 'In wait time, not work time. Most delay is an invoice sitting after it has been routed, waiting for an approver. Capturing per-step timing makes that wait visible.',
    },
    {
      q: 'Can Ledgerium document approvals across multiple systems?',
      a: 'Yes. It captures the steps across each browser-based system in the approval, the accounting system, email, and the document repository, in one recording.',
    },
    {
      q: 'Which AI opportunities apply to invoice approval?',
      a: 'Common candidates are auto-matching invoices to purchase orders, pre-filling cost coding for review, and escalating approvals that exceed a target wait time. Ledgerium scores these from the recorded process.',
    },
  ],
  jsonLd: ['Article', 'HowTo', 'FAQPage', 'BreadcrumbList', 'WebPage', 'Organization'],
  author: { name: 'Ledgerium Research Team', sameAs: ['https://www.linkedin.com/company/ledgerium'] },
  updatedAt: '2026-06-26',
  published: true,
};

const customerOnboarding: WorkflowPage = {
  type: 'workflow',
  slug: 'customer-onboarding-workflow',
  metaTitle: 'Customer Onboarding Workflow: How to Document It',
  metaDescription:
    'Document your customer onboarding workflow by recording it once. Capture the real handoffs and system steps, and generate an SOP and a process map.',
  h1: 'How to document a customer onboarding workflow',
  eyebrow: 'Workflow',
  shortAnswer:
    'To document a customer onboarding workflow, record the real onboarding from signed deal to activated account, then generate a step-by-step SOP and a process map from it and review it with the team that runs it. Onboarding usually spans several systems and several people, which is exactly why it drifts from any document written from memory. Ledgerium records the actual onboarding in the browser, captures the handoffs and waiting points, and generates the SOP, the process map, and a report showing where new customers stall.',
  primaryKeyword: 'customer onboarding workflow',
  secondaryKeywords: ['customer onboarding SOP', 'onboarding process documentation', 'reduce onboarding time'],
  searchIntent: 'commercial',
  tags: ['workflow', 'customer-success', 'onboarding', 'handoff', 'salesforce'],
  related: ['workflow:invoice-approval-workflow', 'software:salesforce', 'compare:tango'],
  originalDataPoint:
    'Onboarding delay usually lives in handoffs between teams, not inside any single task. Ledgerium timestamps each step, so the report shows how long a new customer waits at each handoff rather than only how long the active work takes.',
  honestLimitation:
    'Steps done in native desktop tools or over a call are not captured. Ledgerium records the browser-based onboarding steps; offline context needs a human note.',
  whoUsesIt:
    'Customer success and onboarding specialists, implementation managers, and the ops lead who owns time-to-value. Sales reviews it at the deal-to-onboarding handoff.',
  systems: ['CRM', 'Product or admin console', 'Email', 'Billing system'],
  oldWay:
    'An onboarding checklist is written once and never matches the real sequence, because onboarding changes constantly and spans teams. New hires follow the parts they remember and improvise the rest.',
  ledgeriumWay:
    'Record one real onboarding. Ledgerium captures the cross-team handoffs and system steps and generates the SOP, the process map, and a report that highlights where customers wait between stages.',
  steps: [
    { title: 'Receive the signed deal', detail: 'Onboarding is triggered from the closed opportunity in the CRM.' },
    { title: 'Provision the account', detail: 'Create the customer account and set up access in the product console.' },
    { title: 'Configure and set up billing', detail: 'Apply the right configuration and connect billing to the plan.' },
    { title: 'Run the kickoff and handoff', detail: 'Hand the customer from sales to success and confirm the first goal.' },
    { title: 'Confirm activation', detail: 'Verify the customer reached first value and close the onboarding.' },
  ],
  commonMistakes: [
    'Treating onboarding as one team’s task when it spans sales, success, and billing',
    'Not capturing the handoff points where new customers wait the longest',
    'Letting the checklist describe an ideal flow that no one actually follows',
  ],
  metrics: [
    { label: 'Time to value', note: 'Signed deal to first confirmed value, split by stage.' },
    { label: 'Handoff wait time', note: 'How long a customer waits between teams at each handoff.' },
    { label: 'Step variance', note: 'How much the onboarding sequence varies between specialists.' },
  ],
  aiOpportunities: [
    'Auto-create the account and apply configuration from the closed deal',
    'Draft the kickoff summary from the recorded onboarding for review',
    'Flag onboardings that exceed the target time-to-value and route them for help',
  ],
  faqs: [
    {
      q: 'What does a customer onboarding workflow include?',
      a: 'Usually: receive the signed deal, provision the account, configure and set up billing, run the kickoff and handoff, and confirm activation. The exact steps depend on your product and team structure.',
    },
    {
      q: 'How do I reduce onboarding time?',
      a: 'Start by making the real process visible. Record an onboarding, then look at the handoff wait times in the report. Most onboarding delay is waiting between teams, not the active work, so the fastest wins are at the handoffs.',
    },
    {
      q: 'Why do onboarding checklists stop matching reality?',
      a: 'Onboarding changes often and spans several teams, so a checklist written once quickly diverges. Recording the real onboarding keeps the documentation tied to how the work is actually done.',
    },
    {
      q: 'Can Ledgerium document onboarding across CRM, product, and billing?',
      a: 'Yes. A single recording captures the steps across each browser-based system in the onboarding, so the SOP and process map reflect the full cross-system flow.',
    },
    {
      q: 'What can be automated in onboarding?',
      a: 'Common candidates are auto-provisioning the account from the closed deal, drafting the kickoff summary, and flagging slow onboardings. Ledgerium scores these from the recorded process.',
    },
  ],
  jsonLd: ['Article', 'HowTo', 'FAQPage', 'BreadcrumbList', 'WebPage', 'Organization'],
  author: { name: 'Ledgerium Research Team', sameAs: ['https://www.linkedin.com/company/ledgerium'] },
  updatedAt: '2026-06-26',
  published: true,
};

const monthEndClose: WorkflowPage = {
  type: 'workflow',
  slug: 'month-end-close-workflow',
  metaTitle: 'Month-End Close Workflow: How to Document It',
  metaDescription:
    'Document your month-end close by recording it once. Capture the real reconciliations, journal entries, and review steps, and generate an SOP and process map.',
  h1: 'How to document a month-end close workflow',
  eyebrow: 'Workflow',
  shortAnswer:
    'To document a month-end close, record the real close as the accountant runs it, from reconciliations to locking the period, then generate a step-by-step SOP and a process map from the recording. The close is a long checklist spread across the accounting system, spreadsheets, and bank portals, which is why a written-from-memory version always misses steps. Ledgerium records the actual close in the browser, captures the order and the handoffs, and generates the SOP, the process map, and a report that shows which close tasks take the longest.',
  primaryKeyword: 'month-end close workflow',
  secondaryKeywords: ['month-end close checklist', 'close process documentation', 'financial close SOP'],
  searchIntent: 'commercial',
  tags: ['workflow', 'finance', 'accounting', 'close', 'netsuite'],
  related: ['workflow:invoice-approval-workflow', 'software:netsuite', 'compare:process-mining'],
  originalDataPoint:
    'The month-end close is mostly serial dependencies, one task cannot start until another finishes. Ledgerium timestamps each step, so the report shows which dependency is the real bottleneck holding up the close rather than which task feels busiest.',
  honestLimitation:
    'Steps performed in desktop spreadsheets outside the browser are not captured directly. Ledgerium records the browser-based close steps; offline spreadsheet work needs a linked note.',
  whoUsesIt:
    'Staff and senior accountants, the controller who owns the close calendar, and the CFO who signs off. Auditors review it when testing the close process.',
  systems: ['Accounting system or ERP', 'Spreadsheets', 'Bank and payment portals'],
  oldWay:
    'The close checklist lives in one person’s head or a stale spreadsheet. When that person is out, the close slips, because nobody else knows the exact order, the reconciliations, and the sign-offs.',
  ledgeriumWay:
    'Record one real close. Ledgerium captures the reconciliations, journal entries, and review steps in order, and generates the SOP, the process map, and a report that highlights the slowest close tasks.',
  steps: [
    { title: 'Reconcile accounts', detail: 'Reconcile bank, cash, and key balance-sheet accounts against statements.' },
    { title: 'Post journal entries', detail: 'Record accruals, prepaids, and adjusting entries for the period.' },
    { title: 'Review variances', detail: 'Compare actuals to budget and prior period and investigate variances.' },
    { title: 'Run and review reports', detail: 'Generate the financial statements and review them for errors.' },
    { title: 'Lock the period', detail: 'Sign off and lock the period so no further changes are posted.' },
  ],
  commonMistakes: [
    'Documenting the close as one task instead of an ordered, dependency-driven checklist',
    'Leaving the reconciliation sources and sign-off owners undocumented',
    'Not capturing which close tasks consistently run late',
  ],
  metrics: [
    { label: 'Days to close', note: 'Period end to locked period, broken down by task.' },
    { label: 'Task wait time', note: 'How long each close task waits on an upstream dependency.' },
    { label: 'Rework rate', note: 'Share of entries corrected after first posting.' },
  ],
  aiOpportunities: [
    'Auto-reconcile high-volume accounts and flag only the exceptions',
    'Draft recurring journal entries from prior-period patterns for review',
    'Detect close tasks trending late and alert the controller early',
  ],
  faqs: [
    {
      q: 'What are the steps in a month-end close?',
      a: 'Typically: reconcile accounts, post journal entries, review variances, run and review the financial reports, then lock the period. The exact checklist depends on your business and accounting system.',
    },
    {
      q: 'How do I document a month-end close quickly?',
      a: 'Record one real close as the accountant runs it, then generate the SOP and process map from the recording. This captures the order, the reconciliations, and the sign-offs that a memory-based checklist usually misses.',
    },
    {
      q: 'Why does the close slow down?',
      a: 'Mostly because of serial dependencies, where one task waits on another. Capturing per-step timing shows which dependency is the real bottleneck rather than which task simply feels busy.',
    },
    {
      q: 'Can Ledgerium document a close that spans several systems?',
      a: 'Yes. A single recording captures the steps across each browser-based system in the close, the accounting system, bank portals, and reporting, so the SOP reflects the full process.',
    },
    {
      q: 'What can be automated in the close?',
      a: 'Common candidates are auto-reconciling high-volume accounts, drafting recurring journal entries, and alerting on tasks trending late. Ledgerium scores these from the recorded close.',
    },
  ],
  jsonLd: ['Article', 'HowTo', 'FAQPage', 'BreadcrumbList', 'WebPage', 'Organization'],
  author: { name: 'Ledgerium Research Team', sameAs: ['https://www.linkedin.com/company/ledgerium'] },
  updatedAt: '2026-06-26',
  published: true,
};

const zendeskTicket: WorkflowPage = {
  type: 'workflow',
  slug: 'zendesk-ticket-resolution-workflow',
  metaTitle: 'Zendesk Ticket Resolution Workflow Documentation',
  metaDescription:
    'Document your Zendesk ticket resolution workflow by recording it once. Capture the real triage, investigation, and response steps in an SOP and process map.',
  h1: 'How to document a Zendesk ticket resolution workflow',
  eyebrow: 'Workflow',
  shortAnswer:
    'To document a Zendesk ticket resolution workflow, record an agent resolving a real ticket from arrival to close, then generate a step-by-step SOP and a process map from it. Support work varies a lot between agents, which is why a written-from-memory guide rarely matches how tickets are actually handled. Ledgerium records the real resolution in the browser, including the lookups in other tools, and generates the SOP, the process map, and a report that shows where resolution time is spent.',
  primaryKeyword: 'Zendesk ticket resolution workflow',
  secondaryKeywords: ['Zendesk SOP', 'support ticket process documentation', 'ticket resolution SOP'],
  searchIntent: 'commercial',
  tags: ['workflow', 'customer-support', 'zendesk', 'ticketing', 'resolution'],
  related: ['workflow:customer-onboarding-workflow', 'software:zendesk', 'compare:tango'],
  originalDataPoint:
    'Most ticket time is investigation, not typing the reply. Ledgerium timestamps each step, so the report separates time spent looking things up in other tools from time spent responding, which is where the biggest support gains usually hide.',
  honestLimitation:
    'Conversations that happen over phone or chat outside the browser are not captured. Ledgerium records the browser-based resolution steps; offline context needs a note.',
  whoUsesIt:
    'Support agents, team leads who own resolution time, and the support manager standardizing how tickets are handled. Quality reviewers use it to coach consistency.',
  systems: ['Zendesk', 'Knowledge base', 'Internal admin or product tools'],
  oldWay:
    'Each agent resolves tickets their own way, and the macro library captures only canned replies, not the investigation steps. New agents copy whoever sits near them, so quality varies.',
  ledgeriumWay:
    'Record one real resolution. Ledgerium captures the triage, the lookups, and the response in order and generates the SOP, the process map, and a report that highlights where resolution time goes.',
  steps: [
    { title: 'Receive and read the ticket', detail: 'The ticket arrives in Zendesk and the agent reads the request and context.' },
    { title: 'Triage and categorize', detail: 'Set priority, category, and assignee based on the issue type.' },
    { title: 'Investigate', detail: 'Look up the account and reproduce or diagnose the issue in the relevant tools.' },
    { title: 'Respond and resolve', detail: 'Send the resolution, apply any fix, and confirm the steps taken.' },
    { title: 'Confirm and close', detail: 'Verify the customer is satisfied and close the ticket with the right tags.' },
  ],
  commonMistakes: [
    'Documenting only the canned reply and not the investigation steps',
    'Leaving triage and categorization rules undocumented, so routing varies',
    'Not capturing where investigation time is actually spent',
  ],
  metrics: [
    { label: 'Resolution time', note: 'Ticket arrival to close, split into investigation and response.' },
    { label: 'Steps per resolution', note: 'How many steps and tools a typical resolution requires.' },
    { label: 'Agent variance', note: 'How much the resolution path varies between agents.' },
  ],
  aiOpportunities: [
    'Suggest the category and priority from the ticket content for agent review',
    'Draft a first-response based on similar resolved tickets',
    'Surface the knowledge-base article that matches the issue automatically',
  ],
  faqs: [
    {
      q: 'What are the steps in a Zendesk ticket resolution workflow?',
      a: 'Typically: receive and read the ticket, triage and categorize it, investigate, respond and resolve, then confirm and close. The investigation step is where most of the time and variation live.',
    },
    {
      q: 'How do I document ticket resolution without slowing agents down?',
      a: 'Record one real resolution while an agent works normally, then generate the SOP and process map from it. There is no separate writing step, so it does not add to the agent’s workload.',
    },
    {
      q: 'Why does ticket handling vary so much between agents?',
      a: 'Because the investigation steps are usually undocumented. Macros capture replies, not how agents diagnose issues. Recording a real resolution makes the diagnosis steps visible and repeatable.',
    },
    {
      q: 'Can Ledgerium capture steps in tools outside Zendesk?',
      a: 'Yes. A single recording captures the steps across each browser-based tool an agent uses during a resolution, so the SOP reflects the full cross-tool flow, not just Zendesk.',
    },
    {
      q: 'What can be automated in ticket resolution?',
      a: 'Common candidates are suggesting category and priority, drafting first responses from similar tickets, and surfacing the right knowledge-base article. Ledgerium scores these from the recorded resolution.',
    },
  ],
  jsonLd: ['Article', 'HowTo', 'FAQPage', 'BreadcrumbList', 'WebPage', 'Organization'],
  author: { name: 'Ledgerium Research Team', sameAs: ['https://www.linkedin.com/company/ledgerium'] },
  updatedAt: '2026-06-26',
  published: true,
};

const expenseReporting: WorkflowPage = {
  type: 'workflow',
  slug: 'expense-reporting-workflow',
  metaTitle: 'Expense Reporting Workflow: How to Document It',
  metaDescription:
    'Document your expense reporting workflow by recording it once. Capture the real submission, approval, and reimbursement steps in an SOP and a process map.',
  h1: 'How to document an expense reporting workflow',
  eyebrow: 'Workflow',
  shortAnswer:
    'To document an expense reporting workflow, record the real process from capturing a receipt to reimbursement, then generate a step-by-step SOP and a process map from it. Expense reporting frustrates people because the rules and approval routing are rarely written down clearly. Ledgerium records the real submission and approval in the browser, captures the policy checks and routing, and generates the SOP, the process map, and a report that shows where reports get rejected and reworked.',
  primaryKeyword: 'expense reporting workflow',
  secondaryKeywords: ['expense report SOP', 'expense approval process', 'document expense reporting'],
  searchIntent: 'commercial',
  tags: ['workflow', 'finance', 'expenses', 'approval', 'reimbursement'],
  related: ['workflow:invoice-approval-workflow', 'software:netsuite', 'compare:manual-sop-documentation'],
  originalDataPoint:
    'Most expense delay is rejection and resubmission, not the first submission. Ledgerium captures the rework loop, so the report shows how often reports bounce back and why, which a happy-path SOP never reveals.',
  honestLimitation:
    'Receipts captured only on a mobile app outside the browser are not recorded directly. Ledgerium captures the browser-based submission and approval steps.',
  whoUsesIt:
    'Employees submitting expenses, managers and finance approvers, and the finance lead who owns the policy. Auditors review it when testing spend controls.',
  systems: ['Expense or accounting system', 'Email', 'Card or banking portal'],
  oldWay:
    'The policy lives in a document nobody reads and the routing is tribal knowledge. Employees guess, get rejected, and resubmit, and the real rules only surface through trial and error.',
  ledgeriumWay:
    'Record one real expense submission and approval. Ledgerium captures the policy checks and routing and generates the SOP, the process map, and a report that highlights where reports get rejected.',
  steps: [
    { title: 'Capture receipts and details', detail: 'Collect receipts and enter the expense details and categories.' },
    { title: 'Create the report', detail: 'Group the expenses into a report and attach the supporting receipts.' },
    { title: 'Submit for approval', detail: 'Submit the report so it routes to the correct approver.' },
    { title: 'Approve or reject', detail: 'The approver checks policy and either approves or returns the report.' },
    { title: 'Reimburse', detail: 'Approved expenses are posted and paid in the next reimbursement run.' },
  ],
  commonMistakes: [
    'Documenting the submission but not the rejection and resubmission loop',
    'Leaving the policy limits and required receipts undocumented',
    'Not capturing how often reports bounce back and why',
  ],
  metrics: [
    { label: 'Time to reimburse', note: 'Submission to payment, split into approval and processing time.' },
    { label: 'Rejection rate', note: 'Share of reports returned for correction before approval.' },
    { label: 'Resubmission count', note: 'How many times a typical report is resubmitted.' },
  ],
  aiOpportunities: [
    'Auto-categorize expenses and flag policy exceptions before submission',
    'Pre-check receipts against policy so fewer reports get rejected',
    'Detect approvers who consistently exceed target approval time',
  ],
  faqs: [
    {
      q: 'What are the steps in an expense reporting workflow?',
      a: 'Typically: capture receipts and details, create the report, submit for approval, approve or reject, then reimburse. The rejection-and-resubmission loop is where most of the delay lives.',
    },
    {
      q: 'How do I document the expense process clearly?',
      a: 'Record a real submission and approval, then generate the SOP and process map from it. This captures the policy checks and routing that the written policy usually leaves vague.',
    },
    {
      q: 'Why do expense reports get rejected so often?',
      a: 'Because the policy and required receipts are rarely documented where employees submit. Capturing a real submission makes the actual rules visible, which reduces guesswork and rework.',
    },
    {
      q: 'Can Ledgerium document expense approval routing?',
      a: 'Yes. It records the routing as it happens in the browser, so the SOP and process map show the real approval path, including the policy checks, rather than an idealized one.',
    },
    {
      q: 'What can be automated in expense reporting?',
      a: 'Common candidates are auto-categorizing expenses, pre-checking receipts against policy, and flagging slow approvers. Ledgerium scores these from the recorded process.',
    },
  ],
  jsonLd: ['Article', 'HowTo', 'FAQPage', 'BreadcrumbList', 'WebPage', 'Organization'],
  author: { name: 'Ledgerium Research Team', sameAs: ['https://www.linkedin.com/company/ledgerium'] },
  updatedAt: '2026-06-26',
  published: true,
};

const purchaseOrder: WorkflowPage = {
  type: 'workflow',
  slug: 'purchase-order-workflow',
  metaTitle: 'Purchase Order Workflow: How to Document It',
  metaDescription:
    'Document your purchase order workflow by recording it once. Capture the real requisition, approval, and receiving steps in an SOP and a process map.',
  h1: 'How to document a purchase order workflow',
  eyebrow: 'Workflow',
  shortAnswer:
    'To document a purchase order workflow, record the real process from requisition to invoice match, then generate a step-by-step SOP and a process map from it. Purchasing spans requesters, approvers, and receiving, so a written-from-memory guide usually misses the approval thresholds and the three-way match. Ledgerium records the real PO process in the browser, captures the routing and checks, and generates the SOP, the process map, and a report that shows where orders wait for approval.',
  primaryKeyword: 'purchase order workflow',
  secondaryKeywords: ['purchase order SOP', 'PO approval process', 'procurement workflow documentation'],
  searchIntent: 'commercial',
  tags: ['workflow', 'procurement', 'purchase-order', 'approval', 'netsuite'],
  related: ['workflow:invoice-approval-workflow', 'software:netsuite', 'compare:process-mining'],
  originalDataPoint:
    'In purchasing, the three-way match between PO, receipt, and invoice is where errors surface. Ledgerium records the match step by step, so the report shows how often the match fails and at which document, not just that the order was placed.',
  honestLimitation:
    'Approvals given verbally or by email outside the procurement system are not captured. Ledgerium records the browser-based PO steps; offline approvals need a note.',
  whoUsesIt:
    'Requesters, procurement and finance approvers, and the receiving team. The procurement lead owns the policy and auditors review it when testing spend controls.',
  systems: ['ERP or procurement system', 'Email', 'Vendor portal'],
  oldWay:
    'The PO steps are written from memory and skip the approval thresholds and the three-way match, so new buyers route orders to the wrong approver and orders stall.',
  ledgeriumWay:
    'Record one real PO process. Ledgerium captures the requisition, approval routing, receiving, and match and generates the SOP, the process map, and a report that highlights where orders wait.',
  steps: [
    { title: 'Create the requisition', detail: 'A requester enters the requisition with items, quantities, and cost coding.' },
    { title: 'Approve the requisition', detail: 'Route for approval based on amount and department thresholds.' },
    { title: 'Issue the purchase order', detail: 'Convert the approved requisition into a PO and send it to the vendor.' },
    { title: 'Receive the goods', detail: 'Record receipt of the goods or services against the PO.' },
    { title: 'Match to the invoice', detail: 'Perform the three-way match of PO, receipt, and invoice before payment.' },
  ],
  commonMistakes: [
    'Leaving the approval thresholds undocumented, so requisitions route to the wrong approver',
    'Documenting issuance but skipping the receiving and three-way match steps',
    'Not capturing where orders wait between approval stages',
  ],
  metrics: [
    { label: 'Cycle time per PO', note: 'Requisition to matched invoice, split into work and wait time.' },
    { label: 'Approval wait time', note: 'How long a requisition waits between routing and approval.' },
    { label: 'Match failure rate', note: 'Share of orders where the three-way match fails first time.' },
  ],
  aiOpportunities: [
    'Suggest the correct approver from amount and department rules',
    'Auto-flag three-way match exceptions for review instead of manual checking',
    'Detect requisitions stalled beyond target approval time and escalate them',
  ],
  faqs: [
    {
      q: 'What are the steps in a purchase order workflow?',
      a: 'Typically: create the requisition, approve it, issue the purchase order, receive the goods, then match PO, receipt, and invoice. The approval thresholds and the three-way match are the steps most guides miss.',
    },
    {
      q: 'How do I document a purchase order process?',
      a: 'Record a real PO from requisition to invoice match, then generate the SOP and process map from it. This captures the routing thresholds and the match checks that written-from-memory guides leave out.',
    },
    {
      q: 'Where do purchase orders usually get stuck?',
      a: 'In approval wait time and in three-way match exceptions. Capturing per-step timing shows where orders wait, and recording the match shows how often it fails and at which document.',
    },
    {
      q: 'Can Ledgerium document purchasing across systems?',
      a: 'Yes. A single recording captures the steps across each browser-based system in the PO process, the procurement system, email, and the vendor portal, in one pass.',
    },
    {
      q: 'What can be automated in purchasing?',
      a: 'Common candidates are suggesting the right approver, auto-flagging match exceptions, and escalating stalled requisitions. Ledgerium scores these from the recorded process.',
    },
  ],
  jsonLd: ['Article', 'HowTo', 'FAQPage', 'BreadcrumbList', 'WebPage', 'Organization'],
  author: { name: 'Ledgerium Research Team', sameAs: ['https://www.linkedin.com/company/ledgerium'] },
  updatedAt: '2026-06-26',
  published: true,
};

const employeeOnboarding: WorkflowPage = {
  type: 'workflow',
  slug: 'employee-onboarding-workflow',
  metaTitle: 'Employee Onboarding Workflow: How to Document It',
  metaDescription:
    'Document your employee onboarding workflow by recording it once. Capture the real HR, IT, and manager setup steps in an SOP and a process map.',
  h1: 'How to document an employee onboarding workflow',
  eyebrow: 'Workflow',
  shortAnswer:
    'To document an employee onboarding workflow, record the real setup of a new hire from offer acceptance to a productive first week, then generate a step-by-step SOP and a process map from it. Onboarding spans HR, IT, and the hiring manager, so a written-from-memory checklist usually misses a system or a handoff. Ledgerium records the real onboarding in the browser, captures the account provisioning, access grants, and equipment steps, and generates the SOP, the process map, and a report that shows where new hires wait before they can work.',
  primaryKeyword: 'employee onboarding workflow',
  secondaryKeywords: ['employee onboarding SOP', 'new hire onboarding process', 'IT onboarding checklist'],
  searchIntent: 'commercial',
  tags: ['workflow', 'hr', 'it', 'onboarding', 'workday'],
  related: ['persona:hr-teams', 'software:workday', 'sopTemplate:employee-onboarding-sop-template'],
  originalDataPoint:
    'Most onboarding delay sits in cross-team handoffs, where HR finishes a step and IT has not yet started. Ledgerium timestamps each step, so the report shows how long a new hire waits between HR provisioning and IT access rather than only how long each task takes to perform.',
  honestLimitation:
    'Equipment shipping, badge printing, and any setup done in person are not captured. Ledgerium records the browser-based onboarding steps; physical and offline tasks need a linked note.',
  whoUsesIt:
    'HR coordinators, IT provisioning staff, and the hiring manager who owns the first week. People operations leads use it to standardize onboarding across departments.',
  systems: ['HRIS or HR system', 'Identity and access management', 'IT ticketing or device management', 'Email'],
  oldWay:
    'Each team keeps its own partial checklist and assumes the others have theirs. A system gets forgotten, an access grant is missed, and the new hire spends day one waiting for a login that nobody owned.',
  ledgeriumWay:
    'Record one real onboarding. Ledgerium captures the HR, IT, and manager steps in order across each system and generates the SOP, the process map, and a report that highlights the handoffs where new hires wait.',
  steps: [
    { title: 'Create the employee record', detail: 'HR enters the new hire into the HR system with role, start date, and department.' },
    { title: 'Provision accounts and identity', detail: 'IT creates the directory account and core logins, and assigns the right access groups.' },
    { title: 'Grant application access', detail: 'Add the new hire to the tools their role needs, based on the access matrix.' },
    { title: 'Prepare equipment and workspace', detail: 'Assign and configure the laptop and any role-specific tools or licenses.' },
    { title: 'Run the first-week handoff', detail: 'The manager confirms access works, shares the first tasks, and closes the onboarding.' },
  ],
  commonMistakes: [
    'Treating onboarding as HR alone when IT and the manager own half the steps',
    'Leaving the access matrix undocumented, so each new hire gets a different set of tools',
    'Not capturing the handoff wait between HR provisioning and IT setup',
  ],
  metrics: [
    { label: 'Time to productive', note: 'Start date to working access confirmed, split by HR, IT, and manager steps.' },
    { label: 'Handoff wait time', note: 'How long a new hire waits between HR finishing and IT starting.' },
    { label: 'Access completeness', note: 'Share of new hires who have full role access on day one.' },
  ],
  aiOpportunities: [
    'Auto-provision the standard access set from the role in the HR record',
    'Generate the IT setup tickets from the new hire record for review',
    'Flag onboardings missing a required access grant before the start date',
  ],
  faqs: [
    {
      q: 'What are the steps in an employee onboarding workflow?',
      a: 'Typically: create the employee record, provision accounts and identity, grant application access, prepare equipment, then run the first-week handoff. The exact systems depend on your HR and IT stack.',
    },
    {
      q: 'How do I document onboarding across HR and IT?',
      a: 'Record one real onboarding as each team performs its steps, then generate the SOP and process map from the recording. A single pass captures the HR, IT, and manager steps and the handoffs between them.',
    },
    {
      q: 'Why do new hires wait on day one?',
      a: 'Usually because an IT access step started late or a system was forgotten. Capturing per-step timing shows where the handoff wait lives, so the right team can close it.',
    },
    {
      q: 'Can Ledgerium document onboarding across several systems?',
      a: 'Yes. A single recording captures the steps across each browser-based system in the onboarding, the HR system, identity tools, and ticketing, so the SOP reflects the full cross-team flow.',
    },
    {
      q: 'What can be automated in onboarding?',
      a: 'Common candidates are auto-provisioning the standard access set, generating IT setup tickets from the role, and flagging missing access before the start date. Ledgerium scores these from the recorded process.',
    },
  ],
  jsonLd: ['Article', 'HowTo', 'FAQPage', 'BreadcrumbList', 'WebPage', 'Organization'],
  author: { name: 'Ledgerium Research Team', sameAs: ['https://www.linkedin.com/company/ledgerium'] },
  updatedAt: '2026-06-26',
  published: true,
};

const vendorSetup: WorkflowPage = {
  type: 'workflow',
  slug: 'vendor-setup-workflow',
  metaTitle: 'Vendor Setup Workflow: How to Document It',
  metaDescription:
    'Document your vendor setup workflow by recording it once. Capture the real request, validation, approval, and activation steps in an SOP and a process map.',
  h1: 'How to document a vendor setup workflow',
  eyebrow: 'Workflow',
  shortAnswer:
    'To document a vendor setup workflow, record the real process of adding a new vendor from request to active master record, then generate a step-by-step SOP and a process map from it. Vendor setup carries control risk, the tax and banking checks decide whether payments are safe, yet those checks are rarely written down clearly. Ledgerium records the real setup in the browser, captures the validation and approval routing, and generates the SOP, the process map, and a report that shows where requests wait and where they get returned.',
  primaryKeyword: 'vendor setup workflow',
  secondaryKeywords: ['vendor setup SOP', 'vendor onboarding process', 'vendor master data process'],
  searchIntent: 'commercial',
  tags: ['workflow', 'finance', 'procurement', 'vendor-management', 'sap'],
  related: ['persona:compliance-teams', 'software:sap', 'sopTemplate:vendor-setup-sop-template'],
  originalDataPoint:
    'In vendor setup, the control points are the tax and banking validations, and that is where requests get returned. Ledgerium records each validation step, so the report shows how often setups bounce back at banking validation rather than only that a vendor was eventually added.',
  honestLimitation:
    'Validations confirmed by phone with a bank or tax authority outside the browser are not captured. Ledgerium records the browser-based setup steps; offline confirmations need a note.',
  whoUsesIt:
    'Procurement requesters, vendor master data and accounts payable staff, and the finance approver who owns the control. Auditors review it when testing payment and supplier controls.',
  systems: ['ERP or accounting system', 'Vendor or supplier portal', 'Tax or banking validation tools', 'Email'],
  oldWay:
    'The setup steps and the validation rules live in tribal knowledge, so each clerk validates a little differently. Some checks get skipped under time pressure, which is exactly how bad banking details slip into the master record.',
  ledgeriumWay:
    'Record one real vendor setup. Ledgerium captures the request, the tax and banking validation, the approval routing, and activation, and generates the SOP, the process map, and a report that highlights where requests get returned.',
  steps: [
    { title: 'Receive the vendor request', detail: 'A requester submits the new vendor with category, contact, and supporting documents.' },
    { title: 'Enter vendor master data', detail: 'Create the vendor record with name, address, terms, and payment details.' },
    { title: 'Validate tax and banking', detail: 'Verify the tax registration and banking details against required evidence.' },
    { title: 'Route for approval', detail: 'Send to the finance approver based on category and spend thresholds.' },
    { title: 'Activate the vendor', detail: 'Approve and activate the vendor so it is available for purchase orders and payment.' },
  ],
  commonMistakes: [
    'Leaving the tax and banking validation rules undocumented, so checks vary by clerk',
    'Documenting the request but skipping the approval routing and activation steps',
    'Not capturing how often setups get returned and at which validation',
  ],
  metrics: [
    { label: 'Time to activate', note: 'Request received to active vendor, split into work and wait time.' },
    { label: 'Return rate', note: 'Share of vendor setups returned for correction before approval.' },
    { label: 'Validation completeness', note: 'Share of activated vendors with all required checks recorded.' },
  ],
  aiOpportunities: [
    'Pre-check tax and banking details against required evidence before approval',
    'Auto-flag duplicate vendor records before a new one is created',
    'Detect setups stalled beyond target validation time and escalate them',
  ],
  faqs: [
    {
      q: 'What are the steps in a vendor setup workflow?',
      a: 'Typically: receive the vendor request, enter the master data, validate tax and banking, route for approval, then activate the vendor. The tax and banking validations are the control steps most guides leave vague.',
    },
    {
      q: 'How do I document the vendor setup process clearly?',
      a: 'Record one real setup from request to activation, then generate the SOP and process map from it. This captures the validation rules and the approval routing that tribal knowledge usually hides.',
    },
    {
      q: 'Where do vendor setups get returned?',
      a: 'Most often at tax or banking validation, where evidence is missing or details do not match. Capturing each validation step shows how often setups bounce back and at which check.',
    },
    {
      q: 'Can Ledgerium document vendor setup across systems?',
      a: 'Yes. A single recording captures the steps across each browser-based system in the setup, the accounting system, the vendor portal, and validation tools, in one pass.',
    },
    {
      q: 'What can be automated in vendor setup?',
      a: 'Common candidates are pre-checking tax and banking details, flagging duplicate vendors, and escalating stalled setups. Ledgerium scores these from the recorded process.',
    },
  ],
  jsonLd: ['Article', 'HowTo', 'FAQPage', 'BreadcrumbList', 'WebPage', 'Organization'],
  author: { name: 'Ledgerium Research Team', sameAs: ['https://www.linkedin.com/company/ledgerium'] },
  updatedAt: '2026-06-26',
  published: true,
};

const salesforceLeadQualification: WorkflowPage = {
  type: 'workflow',
  slug: 'salesforce-lead-qualification-workflow',
  metaTitle: 'Salesforce Lead Qualification Workflow Guide',
  metaDescription:
    'Document your Salesforce lead qualification workflow by recording it once. Capture the real enrich, qualify, and routing steps in an SOP and process map.',
  h1: 'How to document a Salesforce lead qualification workflow',
  eyebrow: 'Workflow',
  shortAnswer:
    'To document a Salesforce lead qualification workflow, record a rep qualifying and routing a real lead from capture to assignment, then generate a step-by-step SOP and a process map from it. Qualification criteria and routing rules often live in one rep’s head, so leads get worked inconsistently and good ones slip. Ledgerium records the real qualification in the browser, captures the enrichment lookups and the criteria checks, and generates the SOP, the process map, and a report that shows where leads wait and where routing varies.',
  primaryKeyword: 'Salesforce lead qualification workflow',
  secondaryKeywords: ['lead qualification SOP', 'lead routing process', 'Salesforce qualification process'],
  searchIntent: 'commercial',
  tags: ['workflow', 'sales', 'revops', 'salesforce', 'qualification'],
  related: ['persona:revops-managers', 'software:salesforce', 'sopTemplate:lead-qualification-sop-template'],
  originalDataPoint:
    'Lead leakage usually happens between capture and assignment, where a lead sits unworked. Ledgerium timestamps each step, so the report shows how long a lead waits before a rep qualifies it rather than only how long the qualification call takes.',
  honestLimitation:
    'Qualification done on a discovery call or over the phone is not captured. Ledgerium records the browser-based steps in the CRM and enrichment tools; the call rationale needs a note.',
  whoUsesIt:
    'Sales development reps, account executives, and the RevOps manager who owns routing rules and conversion. Sales leaders review it to standardize how leads are qualified.',
  systems: ['Salesforce', 'Lead enrichment tools', 'Email and calendar', 'Marketing or web forms'],
  oldWay:
    'Each rep qualifies leads their own way and routing rules are remembered, not written. Leads route to the wrong owner, good ones sit too long, and the real criteria only surface in pipeline reviews.',
  ledgeriumWay:
    'Record one real qualification. Ledgerium captures the capture, enrichment, criteria check, and routing in order and generates the SOP, the process map, and a report that highlights where leads wait and where routing diverges.',
  steps: [
    { title: 'Capture the lead', detail: 'The lead lands in Salesforce from a form, list, or inbound source with its source fields.' },
    { title: 'Enrich the record', detail: 'Add firmographic and contact data from enrichment tools to complete the record.' },
    { title: 'Qualify against criteria', detail: 'Check the lead against the fit and intent criteria that define a qualified lead.' },
    { title: 'Route and assign', detail: 'Assign the lead to the right owner based on territory, segment, or round-robin rules.' },
    { title: 'Log and set next step', detail: 'Record the qualification outcome and set the first follow-up activity.' },
  ],
  commonMistakes: [
    'Leaving the qualification criteria undocumented, so each rep applies a different bar',
    'Documenting the capture but skipping the routing rules that decide ownership',
    'Not capturing how long leads wait between capture and first qualification',
  ],
  metrics: [
    { label: 'Time to first touch', note: 'Lead capture to first qualification activity, split into wait and work time.' },
    { label: 'Routing accuracy', note: 'Share of leads assigned to the correct owner the first time.' },
    { label: 'Rep variance', note: 'How much the qualification path varies between reps.' },
  ],
  aiOpportunities: [
    'Auto-enrich the lead record from connected data sources for review',
    'Score the lead against the fit and intent criteria before a rep opens it',
    'Suggest the correct owner from territory and segment routing rules',
  ],
  faqs: [
    {
      q: 'What are the steps in a Salesforce lead qualification workflow?',
      a: 'Typically: capture the lead, enrich the record, qualify it against criteria, route and assign it, then log the outcome and set the next step. The criteria and routing rules are the parts most guides leave undocumented.',
    },
    {
      q: 'How do I document lead qualification consistently?',
      a: 'Record one real qualification as a rep works a lead, then generate the SOP and process map from it. This captures the criteria checks and routing rules that usually live only in a rep’s head.',
    },
    {
      q: 'Where do leads leak in qualification?',
      a: 'Most leakage happens between capture and first touch, where a lead sits unworked, and at routing, where it goes to the wrong owner. Per-step timing makes both visible.',
    },
    {
      q: 'Can Ledgerium document steps outside Salesforce?',
      a: 'Yes. A single recording captures the steps across each browser-based tool the rep uses, including enrichment tools and email, so the SOP reflects the full qualification flow.',
    },
    {
      q: 'What can be automated in lead qualification?',
      a: 'Common candidates are auto-enriching the record, scoring fit and intent before a rep opens the lead, and suggesting the right owner. Ledgerium scores these from the recorded process.',
    },
  ],
  jsonLd: ['Article', 'HowTo', 'FAQPage', 'BreadcrumbList', 'WebPage', 'Organization'],
  author: { name: 'Ledgerium Research Team', sameAs: ['https://www.linkedin.com/company/ledgerium'] },
  updatedAt: '2026-06-26',
  published: true,
};

const contractReview: WorkflowPage = {
  type: 'workflow',
  slug: 'contract-review-workflow',
  metaTitle: 'Contract Review Workflow: How to Document It',
  metaDescription:
    'Document your contract review workflow by recording it once. Capture the real intake, legal review, redline, and approval steps in an SOP and process map.',
  h1: 'How to document a contract review workflow',
  eyebrow: 'Workflow',
  shortAnswer:
    'To document a contract review workflow, record the real review of a contract from intake to signature, then generate a step-by-step SOP and a process map from it. Contract review hides delay in legal queues and approval routing, and the rules for who reviews what are rarely clear. Ledgerium records the real review in the browser, captures the redline rounds and the approval routing, and generates the SOP, the process map, and a report that shows where contracts wait between review and approval.',
  primaryKeyword: 'contract review workflow',
  secondaryKeywords: ['contract review SOP', 'contract approval process', 'legal review workflow'],
  searchIntent: 'commercial',
  tags: ['workflow', 'legal', 'operations', 'approval', 'contracts'],
  related: ['persona:operations-managers', 'software:sharepoint', 'sopTemplate:contract-review-sop-template'],
  originalDataPoint:
    'Contract delay is mostly the wait in the legal queue and the redline rounds, not the reading itself. Ledgerium timestamps each step, so the report shows how many redline rounds a typical contract takes and how long it waits in review rather than only that it was signed.',
  honestLimitation:
    'Negotiation done by phone or in a meeting outside the browser is not captured. Ledgerium records the browser-based review and approval steps; the negotiation rationale needs a note.',
  whoUsesIt:
    'Contract requesters, legal reviewers, and the operations or deal-desk lead who owns turnaround time. Compliance reviews it when testing how contracts are approved and stored.',
  systems: ['Contract or document repository', 'Document editor', 'E-signature tool', 'Email'],
  oldWay:
    'Requesters email contracts to legal and hope, with no clear rule for who reviews what or what gets escalated. Versions multiply, the redline history scatters across inboxes, and turnaround is unpredictable.',
  ledgeriumWay:
    'Record one real contract review. Ledgerium captures the intake, the legal review, the redline rounds, the approval routing, and signature, and generates the SOP, the process map, and a report that highlights where contracts wait.',
  steps: [
    { title: 'Intake the contract', detail: 'The requester submits the contract with type, value, and counterparty details.' },
    { title: 'Run legal review', detail: 'Legal reviews the terms against playbook positions and risk thresholds.' },
    { title: 'Exchange redlines', detail: 'Mark up the contract and exchange revised versions until terms are agreed.' },
    { title: 'Route for approval', detail: 'Send to the right approver based on contract type, value, and risk.' },
    { title: 'Sign and store', detail: 'Collect signatures and file the executed contract in the repository.' },
  ],
  commonMistakes: [
    'Leaving the review thresholds undocumented, so it is unclear what legal must see',
    'Documenting the review but skipping the redline rounds where most time goes',
    'Not capturing where contracts wait between legal review and approval',
  ],
  metrics: [
    { label: 'Turnaround time', note: 'Intake to signature, split into review, redline, and approval time.' },
    { label: 'Redline rounds', note: 'How many revision rounds a typical contract takes before agreement.' },
    { label: 'Queue wait time', note: 'How long a contract waits in the legal review queue.' },
  ],
  aiOpportunities: [
    'Pre-classify the contract by type and value to set the review path',
    'Flag clauses that deviate from playbook positions for legal review',
    'Detect contracts stalled beyond target turnaround and escalate them',
  ],
  faqs: [
    {
      q: 'What are the steps in a contract review workflow?',
      a: 'Typically: intake the contract, run legal review, exchange redlines, route for approval, then sign and store it. The review thresholds and redline rounds are where most guides lose accuracy.',
    },
    {
      q: 'How do I document the contract review process?',
      a: 'Record one real review from intake to signature, then generate the SOP and process map from it. This captures the review thresholds and the approval routing that emails and memory leave unclear.',
    },
    {
      q: 'Where do contracts get stuck in review?',
      a: 'Mostly in the legal queue and in repeated redline rounds. Capturing per-step timing shows how long a contract waits and how many revision rounds it really takes.',
    },
    {
      q: 'Can Ledgerium document review across repository and signature tools?',
      a: 'Yes. A single recording captures the steps across each browser-based system in the review, the repository, the editor, and the e-signature tool, so the SOP reflects the full flow.',
    },
    {
      q: 'What can be automated in contract review?',
      a: 'Common candidates are pre-classifying contracts to set the review path, flagging off-playbook clauses, and escalating stalled contracts. Ledgerium scores these from the recorded process.',
    },
  ],
  jsonLd: ['Article', 'HowTo', 'FAQPage', 'BreadcrumbList', 'WebPage', 'Organization'],
  author: { name: 'Ledgerium Research Team', sameAs: ['https://www.linkedin.com/company/ledgerium'] },
  updatedAt: '2026-06-26',
  published: true,
};

const travelRequest: WorkflowPage = {
  type: 'workflow',
  slug: 'travel-request-workflow',
  metaTitle: 'Travel Request Workflow: How to Document It',
  metaDescription:
    'Document your travel request workflow by recording it once. Capture the real request, policy check, approval, and booking steps in an SOP and process map.',
  h1: 'How to document a travel request workflow',
  eyebrow: 'Workflow',
  shortAnswer:
    'To document a travel request workflow, record the real process from request to booked trip, then generate a step-by-step SOP and a process map from it. Travel requests stall on policy checks and approval routing that employees cannot see, so they guess and get returned. Ledgerium records the real request and approval in the browser, captures the policy checks and routing, and generates the SOP, the process map, and a report that shows where requests wait and where they get sent back.',
  primaryKeyword: 'travel request workflow',
  secondaryKeywords: ['travel request SOP', 'travel approval process', 'business travel request process'],
  searchIntent: 'commercial',
  tags: ['workflow', 'operations', 'finance', 'travel', 'approval'],
  related: ['persona:operations-managers', 'software:netsuite', 'sopTemplate:travel-request-sop-template'],
  originalDataPoint:
    'Travel delay is mostly the wait for approval before booking, where prices change while a request sits. Ledgerium timestamps each step, so the report shows how long a request waits between submission and approval rather than only how long the booking takes.',
  honestLimitation:
    'Bookings completed by a travel agent over phone or email are not captured. Ledgerium records the browser-based request, approval, and self-service booking steps; offline booking needs a note.',
  whoUsesIt:
    'Employees requesting travel, managers and finance approvers, and the operations lead who owns the travel policy. Finance reviews it when testing travel spend controls.',
  systems: ['Travel or expense system', 'Email and calendar', 'Booking or agency portal'],
  oldWay:
    'The travel policy lives in a document nobody opens and the approval routing is unclear. Employees submit requests that miss policy limits, get returned, and resubmit while fares climb.',
  ledgeriumWay:
    'Record one real travel request and approval. Ledgerium captures the policy checks and routing and generates the SOP, the process map, and a report that highlights where requests wait and why they get returned.',
  steps: [
    { title: 'Submit the request', detail: 'The employee enters the trip with dates, destination, purpose, and estimated cost.' },
    { title: 'Check against policy', detail: 'Verify the request against travel policy limits and any pre-trip approval rules.' },
    { title: 'Route for approval', detail: 'Send to the right approver based on cost, destination, or trip type.' },
    { title: 'Approve or return', detail: 'The approver confirms the trip or returns it for changes.' },
    { title: 'Book the trip', detail: 'Book flights, lodging, and ground travel against the approved request.' },
  ],
  commonMistakes: [
    'Leaving the policy limits undocumented, so employees submit requests that get returned',
    'Documenting the request but skipping the approval routing rules',
    'Not capturing how long requests wait before approval while prices change',
  ],
  metrics: [
    { label: 'Time to approval', note: 'Submission to approval, split into policy check and approval wait.' },
    { label: 'Return rate', note: 'Share of requests returned for changes before approval.' },
    { label: 'Pre-booking wait', note: 'How long an approved request waits before the trip is booked.' },
  ],
  aiOpportunities: [
    'Pre-check the request against policy limits before it routes for approval',
    'Suggest the correct approver from cost and destination rules',
    'Detect requests stalled beyond target approval time and escalate them',
  ],
  faqs: [
    {
      q: 'What are the steps in a travel request workflow?',
      a: 'Typically: submit the request, check it against policy, route for approval, approve or return it, then book the trip. The policy limits and approval routing are the parts employees most often cannot see.',
    },
    {
      q: 'How do I document the travel request process?',
      a: 'Record one real request and approval, then generate the SOP and process map from it. This captures the policy checks and routing that the written policy usually leaves vague.',
    },
    {
      q: 'Why do travel requests get returned?',
      a: 'Usually because a policy limit was missed or the trip needed pre-approval that the employee did not know about. Recording a real request makes the actual rules visible and reduces rework.',
    },
    {
      q: 'Can Ledgerium document travel approval and booking?',
      a: 'Yes. A single recording captures the browser-based steps across the travel system, email, and the booking portal, so the SOP and process map show the real approval and booking path.',
    },
    {
      q: 'What can be automated in travel requests?',
      a: 'Common candidates are pre-checking requests against policy, suggesting the right approver, and escalating stalled requests. Ledgerium scores these from the recorded process.',
    },
  ],
  jsonLd: ['Article', 'HowTo', 'FAQPage', 'BreadcrumbList', 'WebPage', 'Organization'],
  author: { name: 'Ledgerium Research Team', sameAs: ['https://www.linkedin.com/company/ledgerium'] },
  updatedAt: '2026-06-26',
  published: true,
};

const passwordReset: WorkflowPage = {
  type: 'workflow',
  slug: 'password-reset-workflow',
  metaTitle: 'Password Reset Workflow: How to Document It',
  metaDescription:
    'Document your IT password reset workflow by recording it once. Capture the real verification, reset, and confirmation steps in an SOP and process map.',
  h1: 'How to document a password reset workflow',
  eyebrow: 'Workflow',
  shortAnswer:
    'To document a password reset workflow, record a helpdesk agent resetting a real user password from identity check to confirmed access, then generate a step-by-step SOP and a process map from it. The identity verification step is a security control, yet it is often done from memory and varies by agent. Ledgerium records the real reset in the browser, captures the verification and the reset steps, and generates the SOP, the process map, and a report that shows where the identity check is skipped or inconsistent.',
  primaryKeyword: 'password reset workflow',
  secondaryKeywords: ['password reset SOP', 'IT helpdesk password reset process', 'account unlock process'],
  searchIntent: 'commercial',
  tags: ['workflow', 'it', 'helpdesk', 'security', 'servicenow'],
  related: ['persona:compliance-teams', 'software:servicenow', 'sopTemplate:password-reset-sop-template'],
  originalDataPoint:
    'The control that matters in a password reset is identity verification, and it is the step most likely to be rushed. Ledgerium records each step, so the report shows whether the verification was performed and how consistently rather than only that the password was reset.',
  honestLimitation:
    'Identity checks done by phone or over a desk-side visit outside the browser are not captured. Ledgerium records the browser-based reset and ticket steps; the verbal verification needs a note.',
  whoUsesIt:
    'IT helpdesk and service desk agents, the IT support lead who owns reset handling time, and security teams who own the verification control. Auditors review it when testing access controls.',
  systems: ['IT ticketing or service desk', 'Identity and access management', 'Directory or admin console', 'Email'],
  oldWay:
    'Each agent resets passwords their own way and the identity check is remembered, not enforced. Under pressure the verification gets shortened, which is exactly how a reset goes to the wrong person.',
  ledgeriumWay:
    'Record one real password reset. Ledgerium captures the identity verification, the reset, and the confirmation in order and generates the SOP, the process map, and a report that highlights where the verification is inconsistent.',
  steps: [
    { title: 'Receive the request', detail: 'The reset request arrives as a ticket with the user and the affected account.' },
    { title: 'Verify identity', detail: 'Confirm the user identity against the required verification method before any reset.' },
    { title: 'Reset the password', detail: 'Reset the password or unlock the account in the identity or directory tool.' },
    { title: 'Confirm access', detail: 'Have the user confirm they can sign in and the issue is resolved.' },
    { title: 'Log and close', detail: 'Record the verification method used and close the ticket with the right category.' },
  ],
  commonMistakes: [
    'Leaving the identity verification method undocumented, so the security control varies by agent',
    'Documenting the reset but skipping the access-confirmation and logging steps',
    'Not capturing whether the verification step was actually performed',
  ],
  metrics: [
    { label: 'Handling time', note: 'Request received to confirmed access, split into verification and reset.' },
    { label: 'Verification rate', note: 'Share of resets where the identity check was recorded.' },
    { label: 'Agent variance', note: 'How much the verification path varies between agents.' },
  ],
  aiOpportunities: [
    'Prompt the agent through the required verification before the reset is allowed',
    'Auto-classify and route the reset ticket from its content',
    'Flag resets where the verification step appears to be skipped for review',
  ],
  faqs: [
    {
      q: 'What are the steps in a password reset workflow?',
      a: 'Typically: receive the request, verify identity, reset the password, confirm access, then log and close the ticket. The identity verification step is the security control and the one most often rushed.',
    },
    {
      q: 'How do I document the password reset process?',
      a: 'Record one real reset as an agent works the ticket, then generate the SOP and process map from it. This captures the verification method and the steps that vary between agents.',
    },
    {
      q: 'Why does identity verification matter so much here?',
      a: 'Because a reset sent to the wrong person is an account takeover. Recording the real reset shows whether the verification was performed and how consistently, which is what auditors test.',
    },
    {
      q: 'Can Ledgerium document resets across ticketing and identity tools?',
      a: 'Yes. A single recording captures the steps across each browser-based system in the reset, the ticketing tool, identity tools, and the directory console, so the SOP reflects the full flow.',
    },
    {
      q: 'What can be automated in password resets?',
      a: 'Common candidates are prompting the agent through verification, auto-classifying the ticket, and flagging resets that skip the check. Ledgerium scores these from the recorded process.',
    },
  ],
  jsonLd: ['Article', 'HowTo', 'FAQPage', 'BreadcrumbList', 'WebPage', 'Organization'],
  author: { name: 'Ledgerium Research Team', sameAs: ['https://www.linkedin.com/company/ledgerium'] },
  updatedAt: '2026-06-26',
  published: true,
};

export const WORKFLOW_PAGES: readonly WorkflowPage[] = [
  invoiceApproval,
  customerOnboarding,
  monthEndClose,
  zendeskTicket,
  expenseReporting,
  purchaseOrder,
  employeeOnboarding,
  vendorSetup,
  salesforceLeadQualification,
  contractReview,
  travelRequest,
  passwordReset,
];
