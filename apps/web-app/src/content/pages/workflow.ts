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

export const WORKFLOW_PAGES: readonly WorkflowPage[] = [
  invoiceApproval,
  customerOnboarding,
  monthEndClose,
  zendeskTicket,
  expenseReporting,
  purchaseOrder,
];
