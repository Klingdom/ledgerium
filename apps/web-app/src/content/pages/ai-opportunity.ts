import type { AiOpportunityPage } from '../types';

/** AI opportunity pages by function area. Mid-to-bottom funnel; ROI evaluation intent. */

const accountsPayable: AiOpportunityPage = {
  type: 'aiOpportunity',
  slug: 'accounts-payable',
  metaTitle: 'AI Opportunities in Accounts Payable',
  metaDescription:
    'Where AI and automation actually help in accounts payable, and where humans should stay. Record a real AP workflow to find your strongest candidates.',
  h1: 'AI opportunities in accounts payable',
  eyebrow: 'AI opportunities',
  shortAnswer:
    'The strongest AI and automation opportunities in accounts payable are the repetitive, rule-based steps: matching invoices to purchase orders, coding expenses, and flagging exceptions. Approvals and judgment calls should keep a human involved. You cannot pick the right candidates from opinion, so start by recording a real AP workflow. Ledgerium captures the steps and timing, then scores where time is spent and which steps repeat, so you target the costly work with evidence instead of automating whatever feels busiest.',
  primaryKeyword: 'AI opportunities in accounts payable',
  secondaryKeywords: ['AP automation', 'automate accounts payable', 'AI in finance operations'],
  searchIntent: 'commercial',
  tags: ['ai-opportunity', 'finance', 'accounts-payable', 'automation'],
  related: ['workflow:invoice-approval-workflow', 'problem:how-to-identify-ai-automation-opportunities', 'persona:process-excellence-leads'],
  functionArea: 'Accounts payable',
  originalDataPoint:
    'Ledgerium scores AP automation candidates from the recorded process by combining how often a step repeats with how much time it takes, so the highest-value candidate is identified from observed data rather than from opinion.',
  honestLimitation:
    'Ledgerium surfaces and scores opportunities from observed browser work. Deciding what to actually automate still needs human judgment about risk, controls, and exceptions.',
  commonRepetitiveWork: [
    'Matching invoices to purchase orders and receipts',
    'Entering and coding invoice line items',
    'Chasing approvals and checking thresholds',
    'Re-keying the same data across systems',
  ],
  whereAiHelps: [
    'Reading and extracting invoice fields for human review',
    'Suggesting cost coding from vendor and history',
    'Flagging duplicate or anomalous invoices',
  ],
  whereAutomationHelps: [
    'Auto-matching invoices to purchase orders and posting clean matches',
    'Routing approvals based on amount and department rules',
    'Escalating invoices that exceed a target wait time',
  ],
  whereHumansStayInvolved: [
    'Approving payments and exceptions',
    'Resolving disputes and mismatches',
    'Anything outside the documented rules',
  ],
  readinessChecklist: [
    'You have a recorded, current AP workflow',
    'Approval thresholds and routing rules are documented',
    'Exception paths are captured, not just the happy path',
    'You have a baseline to measure the change against',
  ],
  exampleAnalysis:
    'Record a clerk processing a batch of invoices from receipt to posting. The report shows most time goes to matching and chasing approvals, not to the approval click itself. That points to auto-matching and approval routing as the first candidates, with the exception loop left to a human.',
  faqs: [
    {
      q: 'What can AI do in accounts payable?',
      a: 'AI can extract invoice fields, suggest cost coding, and flag duplicates or anomalies for review. The strongest gains come from pairing that with automation of the repetitive matching and routing steps.',
    },
    {
      q: 'What should stay manual in AP?',
      a: 'Approving payments, resolving disputes, and handling anything outside the documented rules should keep a human involved. Automate the repetitive, rule-based steps, not the judgment calls.',
    },
    {
      q: 'How do I find the best AP automation candidates?',
      a: 'Record a real AP workflow and review where time is spent and which steps repeat. Ledgerium scores the candidates from that data, so you target the costly work rather than the loudest complaint.',
    },
    {
      q: 'How do I prove an AP automation worked?',
      a: 'Re-record the workflow after the change and compare it to the baseline. The reduction in cycle time, wait time, and rework is measured rather than estimated.',
    },
    {
      q: 'Where does most AP time actually go?',
      a: 'Usually to matching and waiting for approvals, not the approval action itself. Capturing per-step timing makes that visible so you automate the right step.',
    },
  ],
  jsonLd: ['Article', 'FAQPage', 'BreadcrumbList', 'WebPage', 'Organization'],
  author: { name: 'Ledgerium Research Team', sameAs: ['https://www.linkedin.com/company/ledgerium'] },
  updatedAt: '2026-06-27',
  published: true,
};

const hrOnboarding: AiOpportunityPage = {
  type: 'aiOpportunity',
  slug: 'hr-onboarding',
  metaTitle: 'AI Opportunities in HR Onboarding',
  metaDescription:
    'Where AI and automation help in HR onboarding, and where HR judgment must stay. Record a real onboarding workflow to find strong candidates.',
  h1: 'AI opportunities in HR onboarding',
  eyebrow: 'AI opportunities',
  shortAnswer:
    'The strongest AI and automation opportunities in HR onboarding are the repetitive, rule-based steps: creating accounts, sending standard documents, and scheduling first-week tasks. Hiring decisions, accommodation requests, and sensitive conversations should keep a human involved. You cannot pick the right candidates from memory, so start by recording a real onboarding workflow. Ledgerium captures the steps and timing, then scores where time is spent and which steps repeat, so you target the costly work with evidence documented from real work, not from a wish list.',
  primaryKeyword: 'AI opportunities in HR onboarding',
  secondaryKeywords: ['HR onboarding automation', 'automate employee onboarding', 'AI in HR operations'],
  searchIntent: 'commercial',
  tags: ['ai-opportunity', 'hr', 'onboarding', 'automation'],
  related: ['workflow:employee-onboarding-workflow', 'problem:how-to-reduce-onboarding-time', 'persona:hr-teams'],
  functionArea: 'HR onboarding',
  originalDataPoint:
    'Ledgerium scores onboarding automation candidates from the recorded process by combining how often a step repeats with how much time it takes, so the highest-value candidate is documented from real work rather than guessed at in a planning meeting.',
  honestLimitation:
    'Ledgerium surfaces and scores opportunities from observed browser work. Deciding what to actually automate still needs human judgment about employee experience, privacy, and local employment rules.',
  commonRepetitiveWork: [
    'Creating accounts and provisioning system access',
    'Sending standard offer, policy, and tax documents',
    'Scheduling orientation, training, and check-ins',
    'Re-entering new-hire data across HR, payroll, and IT systems',
  ],
  whereAiHelps: [
    'Drafting personalized welcome and first-week messages for review',
    'Checking submitted documents for missing fields',
    'Answering common new-hire policy questions from approved sources',
  ],
  whereAutomationHelps: [
    'Triggering account creation once a hire is confirmed',
    'Routing equipment and access requests by role and location',
    'Reminding managers of overdue onboarding tasks',
  ],
  whereHumansStayInvolved: [
    'Reviewing accommodation and sensitive personal requests',
    'Handling exceptions in pay, visa, or contract terms',
    'Anything outside the documented onboarding rules',
  ],
  readinessChecklist: [
    'You have a recorded, current onboarding workflow',
    'Role-based access and equipment rules are documented',
    'Exception paths are captured, not just the standard hire',
    'You have a baseline to measure time-to-productive against',
  ],
  exampleAnalysis:
    'Record a coordinator onboarding a new hire from offer acceptance to first-day readiness. The report shows most time goes to re-entering the same data across HR, payroll, and IT, not to the welcome note. That points to account provisioning and data sync as the first candidates, with accommodation reviews left to a person.',
  faqs: [
    {
      q: 'What can AI do in HR onboarding?',
      a: 'AI can draft welcome messages, check documents for missing fields, and answer common policy questions from approved sources. The strongest gains come from pairing that with automation of the repetitive provisioning and scheduling steps.',
    },
    {
      q: 'What should stay manual in onboarding?',
      a: 'Accommodation requests, sensitive personal conversations, and exceptions in pay or contract terms should keep a human involved. Automate the repetitive, rule-based steps, not the judgment calls.',
    },
    {
      q: 'How do I find the best onboarding automation candidates?',
      a: 'Record a real onboarding workflow and review where time is spent and which steps repeat. Ledgerium scores the candidates from that data, so you target the costly work rather than the most visible task.',
    },
    {
      q: 'How do I prove an onboarding automation worked?',
      a: 'Re-record the workflow after the change and compare it to the baseline. The reduction in setup time, rework, and time-to-productive is measured rather than estimated.',
    },
    {
      q: 'Where does most onboarding time actually go?',
      a: 'Usually to re-keying the same new-hire data across systems and chasing task completion, not the welcome steps. Capturing per-step timing makes that visible so you automate the right step.',
    },
  ],
  jsonLd: ['Article', 'FAQPage', 'BreadcrumbList', 'WebPage', 'Organization'],
  author: { name: 'Ledgerium Research Team', sameAs: ['https://www.linkedin.com/company/ledgerium'] },
  updatedAt: '2026-06-27',
  published: true,
};

const customerSupport: AiOpportunityPage = {
  type: 'aiOpportunity',
  slug: 'customer-support',
  metaTitle: 'AI Opportunities in Customer Support',
  metaDescription:
    'Where AI and automation help in customer support, and where agents must stay. Record a real ticket workflow to find your best candidates.',
  h1: 'AI opportunities in customer support',
  eyebrow: 'AI opportunities',
  shortAnswer:
    'The strongest AI and automation opportunities in customer support are the repetitive, rule-based steps: triaging tickets, drafting standard replies, and looking up account details. Refunds, escalations, and upset-customer recovery should keep a human involved. You cannot pick the right candidates from memory, so start by recording a real ticket workflow. Ledgerium captures the steps and timing, then scores where time is spent and which steps repeat, so you target the costly work with evidence documented from real work rather than from the noisiest queue.',
  primaryKeyword: 'AI opportunities in customer support',
  secondaryKeywords: ['customer support automation', 'automate ticket resolution', 'AI in support operations'],
  searchIntent: 'commercial',
  tags: ['ai-opportunity', 'customer-support', 'tickets', 'automation'],
  related: ['workflow:zendesk-ticket-resolution-workflow', 'problem:how-to-identify-process-bottlenecks', 'software:zendesk'],
  functionArea: 'Customer support',
  originalDataPoint:
    'Ledgerium scores support automation candidates from the recorded process by combining how often a step repeats with how much time it takes, so the highest-value candidate is documented from real agent work instead of assumed from ticket counts.',
  honestLimitation:
    'Ledgerium surfaces and scores opportunities from observed browser work. Deciding what to actually automate still needs human judgment about tone, customer risk, and edge cases the rules do not cover.',
  commonRepetitiveWork: [
    'Triaging and tagging incoming tickets',
    'Looking up account and order details across tools',
    'Drafting standard replies for common questions',
    'Copying ticket data between the help desk and other systems',
  ],
  whereAiHelps: [
    'Suggesting a category and priority for each ticket',
    'Drafting first-response replies from approved articles',
    'Summarizing long threads before an agent picks them up',
  ],
  whereAutomationHelps: [
    'Routing tickets to the right queue by topic and account',
    'Auto-closing resolved tickets after a set wait time',
    'Escalating tickets that breach a response-time target',
  ],
  whereHumansStayInvolved: [
    'Approving refunds, credits, and goodwill gestures',
    'Handling escalations and upset customers',
    'Anything outside the documented support rules',
  ],
  readinessChecklist: [
    'You have a recorded, current ticket-resolution workflow',
    'Routing rules and response-time targets are documented',
    'Exception paths are captured, not just simple tickets',
    'You have a baseline to measure handle time against',
  ],
  exampleAnalysis:
    'Record an agent resolving a batch of tickets from intake to close. The report shows most time goes to looking up account details across tools, not to writing the reply. That points to account lookup and ticket routing as the first candidates, with refund decisions left to a person.',
  faqs: [
    {
      q: 'What can AI do in customer support?',
      a: 'AI can suggest ticket categories, draft first replies from approved articles, and summarize long threads. The strongest gains come from pairing that with automation of the repetitive routing and lookup steps.',
    },
    {
      q: 'What should stay manual in support?',
      a: 'Refunds, escalations, and upset-customer recovery should keep a human involved. Automate the repetitive, rule-based steps, not the judgment calls.',
    },
    {
      q: 'How do I find the best support automation candidates?',
      a: 'Record a real ticket workflow and review where time is spent and which steps repeat. Ledgerium scores the candidates from that data, so you target the costly work rather than the loudest queue.',
    },
    {
      q: 'How do I prove a support automation worked?',
      a: 'Re-record the workflow after the change and compare it to the baseline. The reduction in handle time, wait time, and rework is measured rather than estimated.',
    },
    {
      q: 'Where does most support time actually go?',
      a: 'Usually to hunting for account details across tools and re-keying data, not to the reply itself. Capturing per-step timing makes that visible so you automate the right step.',
    },
  ],
  jsonLd: ['Article', 'FAQPage', 'BreadcrumbList', 'WebPage', 'Organization'],
  author: { name: 'Ledgerium Research Team', sameAs: ['https://www.linkedin.com/company/ledgerium'] },
  updatedAt: '2026-06-27',
  published: true,
};

const salesOperations: AiOpportunityPage = {
  type: 'aiOpportunity',
  slug: 'sales-operations',
  metaTitle: 'AI Opportunities in Sales Operations',
  metaDescription:
    'Where AI and automation help in sales operations, and where reps must judge. Record a real sales workflow to find strong candidates.',
  h1: 'AI opportunities in sales operations',
  eyebrow: 'AI opportunities',
  shortAnswer:
    'The strongest AI and automation opportunities in sales operations are the repetitive, rule-based steps: enriching leads, updating records, and generating routine quotes. Deal strategy, discount approvals, and forecast calls should keep a human involved. You cannot pick the right candidates from memory, so start by recording a real sales-ops workflow. Ledgerium captures the steps and timing, then scores where time is spent and which steps repeat, so you target the costly work with evidence documented from real work rather than from the loudest rep.',
  primaryKeyword: 'AI opportunities in sales operations',
  secondaryKeywords: ['sales operations automation', 'automate CRM updates', 'AI in revenue operations'],
  searchIntent: 'commercial',
  tags: ['ai-opportunity', 'sales-operations', 'crm', 'automation'],
  related: ['workflow:salesforce-lead-qualification-workflow', 'software:salesforce', 'persona:revops-managers'],
  functionArea: 'Sales operations',
  originalDataPoint:
    'Ledgerium scores sales-ops automation candidates from the recorded process by combining how often a step repeats with how much time it takes, so the highest-value candidate is documented from real work rather than guessed from pipeline reports.',
  honestLimitation:
    'Ledgerium surfaces and scores opportunities from observed browser work. Deciding what to actually automate still needs human judgment about deal risk, customer relationships, and revenue policy.',
  commonRepetitiveWork: [
    'Enriching and routing inbound leads',
    'Updating opportunity stages and fields in the CRM',
    'Generating routine quotes and order forms',
    'Re-keying deal data between CRM, CPQ, and finance tools',
  ],
  whereAiHelps: [
    'Scoring and prioritizing leads for review',
    'Drafting follow-up emails from deal context',
    'Flagging stale or at-risk opportunities',
  ],
  whereAutomationHelps: [
    'Assigning leads by territory and segment rules',
    'Syncing won deals into billing and order systems',
    'Reminding reps of overdue pipeline updates',
  ],
  whereHumansStayInvolved: [
    'Approving discounts and non-standard terms',
    'Making forecast and deal-strategy calls',
    'Anything outside the documented sales rules',
  ],
  readinessChecklist: [
    'You have a recorded, current sales-ops workflow',
    'Lead routing and approval rules are documented',
    'Exception paths are captured, not just clean deals',
    'You have a baseline to measure cycle time against',
  ],
  exampleAnalysis:
    'Record a sales-ops analyst processing inbound leads from capture to assignment. The report shows most time goes to enriching records and re-keying data between the CRM and quoting tool, not to the routing decision. That points to lead enrichment and CRM sync as the first candidates, with discount approvals left to a person.',
  faqs: [
    {
      q: 'What can AI do in sales operations?',
      a: 'AI can score leads, draft context-aware follow-ups, and flag at-risk deals. The strongest gains come from pairing that with automation of the repetitive enrichment and record-update steps.',
    },
    {
      q: 'What should stay manual in sales ops?',
      a: 'Discount approvals, forecast calls, and deal strategy should keep a human involved. Automate the repetitive, rule-based steps, not the judgment calls.',
    },
    {
      q: 'How do I find the best sales-ops automation candidates?',
      a: 'Record a real sales-ops workflow and review where time is spent and which steps repeat. Ledgerium scores the candidates from that data, so you target the costly work rather than the busiest-looking task.',
    },
    {
      q: 'How do I prove a sales-ops automation worked?',
      a: 'Re-record the workflow after the change and compare it to the baseline. The reduction in cycle time, manual updates, and rework is measured rather than estimated.',
    },
    {
      q: 'Where does most sales-ops time actually go?',
      a: 'Usually to enriching records and re-keying deal data across systems, not to the routing click. Capturing per-step timing makes that visible so you automate the right step.',
    },
  ],
  jsonLd: ['Article', 'FAQPage', 'BreadcrumbList', 'WebPage', 'Organization'],
  author: { name: 'Ledgerium Research Team', sameAs: ['https://www.linkedin.com/company/ledgerium'] },
  updatedAt: '2026-06-27',
  published: true,
};

const procurement: AiOpportunityPage = {
  type: 'aiOpportunity',
  slug: 'procurement',
  metaTitle: 'AI Opportunities in Procurement',
  metaDescription:
    'Where AI and automation help in procurement, and where buyers must judge. Record a real purchasing workflow to find strong candidates.',
  h1: 'AI opportunities in procurement',
  eyebrow: 'AI opportunities',
  shortAnswer:
    'The strongest AI and automation opportunities in procurement are the repetitive, rule-based steps: creating purchase orders, matching them to receipts, and onboarding routine vendors. Sourcing decisions, contract terms, and risk reviews should keep a human involved. You cannot pick the right candidates from memory, so start by recording a real procurement workflow. Ledgerium captures the steps and timing, then scores where time is spent and which steps repeat, so you target the costly work with evidence documented from real work, not from a procurement policy binder.',
  primaryKeyword: 'AI opportunities in procurement',
  secondaryKeywords: ['procurement automation', 'automate purchase orders', 'AI in procurement operations'],
  searchIntent: 'commercial',
  tags: ['ai-opportunity', 'procurement', 'purchasing', 'automation'],
  related: ['workflow:purchase-order-workflow', 'problem:how-to-document-approval-workflows', 'department:procurement'],
  functionArea: 'Procurement',
  originalDataPoint:
    'Ledgerium scores procurement automation candidates from the recorded process by combining how often a step repeats with how much time it takes, so the highest-value candidate is documented from real buyer work instead of inferred from spend reports.',
  honestLimitation:
    'Ledgerium surfaces and scores opportunities from observed browser work. Deciding what to actually automate still needs human judgment about supplier risk, controls, and negotiation.',
  commonRepetitiveWork: [
    'Creating purchase orders from approved requests',
    'Matching purchase orders to receipts and invoices',
    'Collecting and entering vendor onboarding details',
    'Re-keying order data across procurement and finance systems',
  ],
  whereAiHelps: [
    'Extracting line items from requisitions for review',
    'Suggesting the right vendor and category from history',
    'Flagging duplicate or off-contract requests',
  ],
  whereAutomationHelps: [
    'Generating purchase orders from approved requisitions',
    'Routing approvals by amount and category rules',
    'Escalating orders that exceed a target turnaround',
  ],
  whereHumansStayInvolved: [
    'Approving spend and selecting suppliers',
    'Negotiating contract terms and resolving disputes',
    'Anything outside the documented procurement rules',
  ],
  readinessChecklist: [
    'You have a recorded, current procurement workflow',
    'Approval thresholds and category rules are documented',
    'Exception paths are captured, not just standard orders',
    'You have a baseline to measure turnaround against',
  ],
  exampleAnalysis:
    'Record a buyer turning an approved request into a purchase order and matching it on receipt. The report shows most time goes to entering vendor details and re-keying order data into finance, not to the approval step. That points to PO generation and vendor data entry as the first candidates, with supplier selection left to a person.',
  faqs: [
    {
      q: 'What can AI do in procurement?',
      a: 'AI can extract requisition line items, suggest vendors and categories, and flag off-contract requests. The strongest gains come from pairing that with automation of the repetitive PO and matching steps.',
    },
    {
      q: 'What should stay manual in procurement?',
      a: 'Supplier selection, contract negotiation, and dispute resolution should keep a human involved. Automate the repetitive, rule-based steps, not the judgment calls.',
    },
    {
      q: 'How do I find the best procurement automation candidates?',
      a: 'Record a real procurement workflow and review where time is spent and which steps repeat. Ledgerium scores the candidates from that data, so you target the costly work rather than the most-discussed task.',
    },
    {
      q: 'How do I prove a procurement automation worked?',
      a: 'Re-record the workflow after the change and compare it to the baseline. The reduction in turnaround, manual entry, and rework is measured rather than estimated.',
    },
    {
      q: 'Where does most procurement time actually go?',
      a: 'Usually to vendor data entry and re-keying orders across systems, not to the approval action. Capturing per-step timing makes that visible so you automate the right step.',
    },
  ],
  jsonLd: ['Article', 'FAQPage', 'BreadcrumbList', 'WebPage', 'Organization'],
  author: { name: 'Ledgerium Research Team', sameAs: ['https://www.linkedin.com/company/ledgerium'] },
  updatedAt: '2026-06-27',
  published: true,
};

const financeOperations: AiOpportunityPage = {
  type: 'aiOpportunity',
  slug: 'finance-operations',
  metaTitle: 'AI Opportunities in Finance Operations',
  metaDescription:
    'Where AI and automation help in finance operations, and where controllers must stay. Record a real finance workflow to find candidates.',
  h1: 'AI opportunities in finance operations',
  eyebrow: 'AI opportunities',
  shortAnswer:
    'The strongest AI and automation opportunities in finance operations are the repetitive, rule-based steps: reconciling accounts, posting routine journal entries, and pulling data for close. Adjustments, estimates, and sign-offs should keep a human involved. You cannot pick the right candidates from memory, so start by recording a real finance workflow. Ledgerium captures the steps and timing, then scores where time is spent and which steps repeat, so you target the costly work with evidence documented from real work rather than from a close checklist.',
  primaryKeyword: 'AI opportunities in finance operations',
  secondaryKeywords: ['finance operations automation', 'automate account reconciliation', 'AI in accounting operations'],
  searchIntent: 'commercial',
  tags: ['ai-opportunity', 'finance', 'finance-operations', 'automation'],
  related: ['workflow:month-end-close-workflow', 'problem:how-to-document-a-finance-process', 'department:finance'],
  functionArea: 'Finance operations',
  originalDataPoint:
    'Ledgerium scores finance-ops automation candidates from the recorded process by combining how often a step repeats with how much time it takes, so the highest-value candidate is documented from real work instead of assumed from the close calendar.',
  honestLimitation:
    'Ledgerium surfaces and scores opportunities from observed browser work. Deciding what to actually automate still needs human judgment about controls, materiality, and audit requirements.',
  commonRepetitiveWork: [
    'Reconciling accounts against statements and sub-ledgers',
    'Posting recurring and templated journal entries',
    'Pulling and formatting data for the monthly close',
    'Re-keying figures across spreadsheets and the ERP',
  ],
  whereAiHelps: [
    'Matching transactions and flagging reconciliation breaks',
    'Drafting variance explanations for review',
    'Spotting entries that fall outside normal ranges',
  ],
  whereAutomationHelps: [
    'Posting recurring journal entries on a schedule',
    'Pulling close data into a standard template',
    'Reminding owners of overdue close tasks',
  ],
  whereHumansStayInvolved: [
    'Approving adjustments, accruals, and estimates',
    'Signing off on the close and financial statements',
    'Anything outside the documented finance rules',
  ],
  readinessChecklist: [
    'You have a recorded, current finance workflow',
    'Posting rules and approval thresholds are documented',
    'Exception paths are captured, not just clean periods',
    'You have a baseline to measure close cycle time against',
  ],
  exampleAnalysis:
    'Record an accountant running a reconciliation and close from data pull to posting. The report shows most time goes to pulling and formatting data across the ERP and spreadsheets, not to the posting click. That points to data extraction and recurring entries as the first candidates, with adjustments and sign-off left to a person.',
  faqs: [
    {
      q: 'What can AI do in finance operations?',
      a: 'AI can match transactions, draft variance explanations, and flag entries outside normal ranges. The strongest gains come from pairing that with automation of the repetitive reconciliation and data-pull steps.',
    },
    {
      q: 'What should stay manual in finance ops?',
      a: 'Adjustments, estimates, and final sign-off should keep a human involved. Automate the repetitive, rule-based steps, not the judgment calls.',
    },
    {
      q: 'How do I find the best finance-ops automation candidates?',
      a: 'Record a real finance workflow and review where time is spent and which steps repeat. Ledgerium scores the candidates from that data, so you target the costly work rather than the most painful-feeling task.',
    },
    {
      q: 'How do I prove a finance-ops automation worked?',
      a: 'Re-record the workflow after the change and compare it to the baseline. The reduction in close cycle time, manual entry, and rework is measured rather than estimated.',
    },
    {
      q: 'Where does most finance-ops time actually go?',
      a: 'Usually to pulling and re-keying data across the ERP and spreadsheets, not to the final posting. Capturing per-step timing makes that visible so you automate the right step.',
    },
  ],
  jsonLd: ['Article', 'FAQPage', 'BreadcrumbList', 'WebPage', 'Organization'],
  author: { name: 'Ledgerium Research Team', sameAs: ['https://www.linkedin.com/company/ledgerium'] },
  updatedAt: '2026-06-27',
  published: true,
};

const complianceWorkflows: AiOpportunityPage = {
  type: 'aiOpportunity',
  slug: 'compliance-workflows',
  metaTitle: 'AI Opportunities in Compliance Workflows',
  metaDescription:
    'Where AI and automation help in compliance work, and where reviewers must stay. Record a real compliance workflow to find candidates.',
  h1: 'AI opportunities in Compliance',
  eyebrow: 'AI opportunities',
  shortAnswer:
    'The strongest AI and automation opportunities in compliance work are the repetitive, rule-based steps: collecting evidence, checking records against a standard, and assembling audit packets. Risk judgments, control sign-offs, and regulator responses should keep a human involved. You cannot pick the right candidates from memory, so start by recording a real compliance workflow. Ledgerium captures the steps and timing, then scores where time is spent and which steps repeat, so you target the costly work with evidence documented from real work, not from a control narrative written after the fact.',
  primaryKeyword: 'AI opportunities in compliance workflows',
  secondaryKeywords: ['compliance automation', 'automate audit evidence', 'AI in compliance operations'],
  searchIntent: 'commercial',
  tags: ['ai-opportunity', 'compliance', 'audit', 'automation'],
  related: ['problem:how-to-document-a-process-for-compliance', 'persona:compliance-teams', 'department:compliance'],
  functionArea: 'Compliance',
  originalDataPoint:
    'Ledgerium scores compliance automation candidates from the recorded process by combining how often a step repeats with how much time it takes, so the highest-value candidate is documented from real work rather than described from memory in a control narrative.',
  honestLimitation:
    'Ledgerium surfaces and scores opportunities from observed browser work. Deciding what to actually automate still needs human judgment about regulatory risk, accountability, and control design.',
  commonRepetitiveWork: [
    'Collecting evidence and screenshots for controls',
    'Checking records against a checklist or standard',
    'Assembling audit and review packets',
    'Re-entering the same control data across systems',
  ],
  whereAiHelps: [
    'Summarizing policies and mapping them to controls',
    'Flagging records that miss a required field',
    'Drafting control descriptions from observed steps for review',
  ],
  whereAutomationHelps: [
    'Collecting recurring evidence on a schedule',
    'Routing reviews and attestations by control owner',
    'Escalating overdue or failing controls',
  ],
  whereHumansStayInvolved: [
    'Judging risk and approving control exceptions',
    'Signing off on controls and responding to regulators',
    'Anything outside the documented compliance rules',
  ],
  readinessChecklist: [
    'You have a recorded, current compliance workflow',
    'Controls, owners, and evidence rules are documented',
    'Exception paths are captured, not just passing controls',
    'You have a baseline to measure review effort against',
  ],
  exampleAnalysis:
    'Record an analyst preparing evidence for a control review from data pull to packet. The report shows most time goes to collecting evidence and re-entering control data across systems, not to the sign-off. That points to evidence collection and attestation routing as the first candidates, with the risk judgment left to a person.',
  faqs: [
    {
      q: 'What can AI do in compliance workflows?',
      a: 'AI can summarize policies, map them to controls, flag records missing required fields, and draft control descriptions for review. The strongest gains come from pairing that with automation of the repetitive evidence and routing steps.',
    },
    {
      q: 'What should stay manual in compliance?',
      a: 'Risk judgments, control sign-offs, and regulator responses should keep a human involved. Automate the repetitive, rule-based steps, not the judgment calls.',
    },
    {
      q: 'How do I find the best compliance automation candidates?',
      a: 'Record a real compliance workflow and review where time is spent and which steps repeat. Ledgerium scores the candidates from that data, so you target the costly work rather than the most-feared task.',
    },
    {
      q: 'How do I prove a compliance automation worked?',
      a: 'Re-record the workflow after the change and compare it to the baseline. The reduction in review effort, manual evidence work, and rework is measured rather than estimated.',
    },
    {
      q: 'Where does most compliance time actually go?',
      a: 'Usually to collecting evidence and re-keying control data across systems, not to the sign-off itself. Capturing per-step timing makes that visible so you automate the right step.',
    },
  ],
  jsonLd: ['Article', 'FAQPage', 'BreadcrumbList', 'WebPage', 'Organization'],
  author: { name: 'Ledgerium Research Team', sameAs: ['https://www.linkedin.com/company/ledgerium'] },
  updatedAt: '2026-06-27',
  published: true,
};

const erpWorkflows: AiOpportunityPage = {
  type: 'aiOpportunity',
  slug: 'erp-workflows',
  metaTitle: 'AI Opportunities in ERP Workflows',
  metaDescription:
    'Where AI and automation help in ERP operations, and where staff must judge exceptions. Record a real ERP workflow to find candidates.',
  h1: 'AI opportunities in ERP operations',
  eyebrow: 'AI opportunities',
  shortAnswer:
    'The strongest AI and automation opportunities in ERP operations are the repetitive, rule-based steps: entering orders, maintaining master data, and moving records between modules. Configuration changes, exceptions, and approvals should keep a human involved. You cannot pick the right candidates from memory, so start by recording a real ERP workflow. Ledgerium captures the steps and timing, then scores where time is spent and which steps repeat, so you target the costly work with evidence documented from real work rather than from a system diagram.',
  primaryKeyword: 'AI opportunities in ERP operations',
  secondaryKeywords: ['ERP automation', 'automate ERP data entry', 'AI in ERP operations'],
  searchIntent: 'commercial',
  tags: ['ai-opportunity', 'erp', 'operations', 'automation'],
  related: ['workflow:sales-order-processing-workflow', 'software:sap', 'persona:operations-managers'],
  functionArea: 'ERP operations',
  originalDataPoint:
    'Ledgerium scores ERP automation candidates from the recorded process by combining how often a step repeats with how much time it takes, so the highest-value candidate is documented from real work instead of guessed from a system map.',
  honestLimitation:
    'Ledgerium surfaces and scores opportunities from observed browser work. Deciding what to actually automate still needs human judgment about data integrity, controls, and downstream module effects.',
  commonRepetitiveWork: [
    'Entering sales and purchase orders into the ERP',
    'Maintaining customer, vendor, and item master data',
    'Moving records between ERP modules and reports',
    'Re-keying the same data across the ERP and outside tools',
  ],
  whereAiHelps: [
    'Extracting order fields from documents for review',
    'Suggesting master-data values from existing records',
    'Flagging records that break validation rules',
  ],
  whereAutomationHelps: [
    'Creating orders from validated inputs',
    'Syncing master data between connected systems',
    'Escalating stuck or failed transactions',
  ],
  whereHumansStayInvolved: [
    'Approving configuration and master-data changes',
    'Resolving exceptions and posting errors',
    'Anything outside the documented ERP rules',
  ],
  readinessChecklist: [
    'You have a recorded, current ERP workflow',
    'Validation and approval rules are documented',
    'Exception paths are captured, not just clean transactions',
    'You have a baseline to measure processing time against',
  ],
  exampleAnalysis:
    'Record a clerk entering and posting a sales order across ERP modules. The report shows most time goes to re-keying the same data across the ERP and outside tools, not to the posting step. That points to order entry and master-data sync as the first candidates, with configuration changes and posting errors left to a person.',
  faqs: [
    {
      q: 'What can AI do in ERP operations?',
      a: 'AI can extract order fields, suggest master-data values, and flag records that break validation rules. The strongest gains come from pairing that with automation of the repetitive entry and sync steps.',
    },
    {
      q: 'What should stay manual in ERP operations?',
      a: 'Configuration changes, exception handling, and approvals should keep a human involved. Automate the repetitive, rule-based steps, not the judgment calls.',
    },
    {
      q: 'How do I find the best ERP automation candidates?',
      a: 'Record a real ERP workflow and review where time is spent and which steps repeat. Ledgerium scores the candidates from that data, so you target the costly work rather than the most-complained-about screen.',
    },
    {
      q: 'How do I prove an ERP automation worked?',
      a: 'Re-record the workflow after the change and compare it to the baseline. The reduction in processing time, manual entry, and rework is measured rather than estimated.',
    },
    {
      q: 'Where does most ERP time actually go?',
      a: 'Usually to re-keying the same data across the ERP and outside tools, not to the posting click. Capturing per-step timing makes that visible so you automate the right step.',
    },
  ],
  jsonLd: ['Article', 'FAQPage', 'BreadcrumbList', 'WebPage', 'Organization'],
  author: { name: 'Ledgerium Research Team', sameAs: ['https://www.linkedin.com/company/ledgerium'] },
  updatedAt: '2026-06-27',
  published: true,
};

export const AI_OPPORTUNITY_PAGES: readonly AiOpportunityPage[] = [
  accountsPayable,
  hrOnboarding,
  customerSupport,
  salesOperations,
  procurement,
  financeOperations,
  complianceWorkflows,
  erpWorkflows,
];
