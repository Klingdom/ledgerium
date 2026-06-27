import type { IndustryPage } from '../types';

/** Industry pages. Mid-funnel; industry-specific documentation and compliance context. */

const manufacturing: IndustryPage = {
  type: 'industry',
  slug: 'manufacturing',
  metaTitle: 'Manufacturing Workflow Documentation',
  metaDescription:
    'Document manufacturing back-office and ERP workflows by recording how they really run. Get SOPs, process maps, and AI opportunities tied to the real work.',
  h1: 'Manufacturing workflow documentation',
  eyebrow: 'Industry',
  shortAnswer:
    'Manufacturers depend on consistent processes, but the office and system side, order processing, procurement, quality records, and ERP steps, is often documented from memory and drifts out of date. Recording how each workflow actually runs gives you an SOP, a process map, and a report showing where time is lost and what is worth automating. Ledgerium captures the real browser-based steps across your ERP and systems, so the documentation matches how the plant office actually works.',
  primaryKeyword: 'manufacturing workflow documentation',
  secondaryKeywords: ['manufacturing SOPs', 'document manufacturing processes', 'manufacturing process documentation'],
  searchIntent: 'commercial',
  tags: ['industry', 'manufacturing', 'erp', 'documentation'],
  related: ['workflow:purchase-order-workflow', 'software:sap', 'persona:process-excellence-leads'],
  industryContext:
    'Manufacturing has a strong process-improvement culture on the shop floor, but the office and system workflows that surround production are frequently undocumented. ERP-heavy steps vary by role and configuration, so generic guides rarely match what a given plant actually does.',
  commonWorkflows: [
    'Sales order processing',
    'Purchase order and supplier setup',
    'Goods receipt and inventory updates',
    'Quality and nonconformance records',
  ],
  documentationConcerns: [
    'ERP steps differ by role and plant configuration',
    'Knowledge lives with long-tenured staff nearing retirement',
    'Office workflows lack the rigor applied on the shop floor',
  ],
  complianceConcerns: [
    'Traceability and quality records for audits',
    'Consistent procedures across plants and shifts',
    'Evidence that the documented process is the one followed',
  ],
  aiOpportunities: [
    'Auto-matching purchase orders, receipts, and invoices',
    'Flagging order or quality steps that consistently run late',
    'Drafting routine ERP entries for human review',
  ],
  honestLimitation:
    'Ledgerium captures browser-based ERP and office work. Machine and shop-floor steps outside the browser need separate capture.',
  originalDataPoint:
    'Manufacturing ERP workflows differ by role and plant configuration. Ledgerium records the process as the actual role performs it, so the SOP reflects what that user sees rather than an administrator’s view.',
  faqs: [
    {
      q: 'How do I document manufacturing workflows?',
      a: 'Record each office or ERP workflow once as the role performs it, then generate the SOP and process map from the recording. This captures the real role-specific steps that generic guides miss.',
    },
    {
      q: 'Why do generic manufacturing guides not match our plant?',
      a: 'ERP screens and steps depend on role and plant configuration. A guide written from a standard or admin view references things your team may not have. Recording the real process avoids that.',
    },
    {
      q: 'Can this help capture retiring staff knowledge?',
      a: 'Yes. Recording a long-tenured employee’s process turns their knowledge into structured SOPs and process maps before they leave, including the shortcuts they take automatically.',
    },
    {
      q: 'How does this support audits and quality?',
      a: 'It produces evidence-linked documentation traceable to the recorded steps, which shows that the documented process is the one actually followed.',
    },
    {
      q: 'Where can AI help in manufacturing back-office?',
      a: 'In repetitive ERP steps like matching documents and drafting routine entries. Quality decisions and exceptions should keep a human involved.',
    },
  ],
  jsonLd: ['Article', 'FAQPage', 'BreadcrumbList', 'WebPage', 'Organization'],
  author: { name: 'Ledgerium Research Team', sameAs: ['https://www.linkedin.com/company/ledgerium'] },
  updatedAt: '2026-06-27',
  published: true,
};

const healthcare: IndustryPage = {
  type: 'industry',
  slug: 'healthcare',
  metaTitle: 'Healthcare Workflow Documentation',
  metaDescription:
    'Document healthcare admin and back-office workflows by recording how they really run. Get SOPs, process maps, and AI ideas, no PHI captured.',
  h1: 'Healthcare workflow documentation',
  eyebrow: 'Industry',
  shortAnswer:
    'Healthcare back-office work, patient admissions, scheduling, billing, prior authorization, and records handling, is often run from memory and varies by clinic. Recording how each workflow actually runs gives you an SOP, a process map, and a report showing where time is lost and what is worth automating. Ledgerium captures the real browser-based steps across your admin systems. It records no screenshots and no PHI, so documentation reflects how the office really works without exposing patient data.',
  primaryKeyword: 'healthcare workflow documentation',
  secondaryKeywords: ['healthcare SOPs', 'document healthcare admin processes', 'healthcare process documentation'],
  searchIntent: 'commercial',
  tags: ['industry', 'healthcare', 'admin', 'documentation'],
  related: ['persona:compliance-teams', 'problem:how-to-document-a-process-for-compliance', 'software:servicenow'],
  industryContext:
    'Healthcare runs on procedure and compliance, yet the administrative and back-office workflows around patient care are frequently undocumented or written once and left to age. Systems vary by clinic, payer, and role, so generic guides rarely match what a given front desk or billing team actually does day to day.',
  commonWorkflows: [
    'Patient registration and admissions',
    'Insurance eligibility and prior authorization',
    'Claims submission and billing',
    'Records requests and release of information',
  ],
  documentationConcerns: [
    'Admin steps differ by clinic, payer, and role',
    'Knowledge sits with experienced front-desk and billing staff',
    'Procedures change with payer rules and rarely get updated',
  ],
  complianceConcerns: [
    'HIPAA handling of patient data during documentation',
    'Evidence that staff follow the approved procedure',
    'Consistent processes across sites and shifts',
  ],
  aiOpportunities: [
    'Flagging eligibility or authorization steps that stall',
    'Drafting routine billing entries for human review',
    'Spotting repetitive records-request handling',
  ],
  honestLimitation:
    'Ledgerium captures browser-based admin work and records no screenshots or PHI. Clinical decisions and steps inside dedicated medical devices need separate handling.',
  originalDataPoint:
    'Healthcare admin workflows vary by payer and clinic configuration. Ledgerium records the process as the actual role performs it and captures no PHI, so the SOP reflects the real steps without exposing patient data.',
  faqs: [
    {
      q: 'How do I document healthcare admin workflows?',
      a: 'Record each admin or billing workflow once as the role performs it, then generate the SOP and process map from the recording. It captures the real payer and clinic-specific steps that generic guides miss.',
    },
    {
      q: 'Does Ledgerium capture patient data or PHI?',
      a: 'No. Ledgerium records the workflow steps and structure, not screenshots or patient health information, so you can document processes without exposing PHI.',
    },
    {
      q: 'How does this support HIPAA compliance?',
      a: 'It documents how a process runs without capturing patient data, and produces evidence-linked SOPs traceable to the recorded steps, supporting your own HIPAA controls and audits.',
    },
    {
      q: 'Why do generic healthcare guides not match our clinic?',
      a: 'Admin screens and steps depend on payer, clinic, and role. A guide written from a standard view references things your team may not have. Recording the real process avoids that.',
    },
    {
      q: 'Where can AI help in healthcare back-office?',
      a: 'In repetitive admin steps like eligibility checks and routine billing entries. Clinical and patient-care decisions should keep a qualified human involved.',
    },
  ],
  jsonLd: ['Article', 'FAQPage', 'BreadcrumbList', 'WebPage', 'Organization'],
  author: { name: 'Ledgerium Research Team', sameAs: ['https://www.linkedin.com/company/ledgerium'] },
  updatedAt: '2026-06-27',
  published: true,
};

const insurance: IndustryPage = {
  type: 'industry',
  slug: 'insurance',
  metaTitle: 'Insurance Workflow Documentation',
  metaDescription:
    'Document insurance claims, underwriting, and policy admin workflows by recording how they run. Get SOPs, process maps, and AI opportunities.',
  h1: 'Insurance workflow documentation',
  eyebrow: 'Industry',
  shortAnswer:
    'Insurance operations run on claims intake, underwriting reviews, and policy administration, but these workflows are usually documented from memory and drift as systems change. Recording how each one actually runs produces an SOP, a process map, and a report showing where handoffs stall and what is worth automating. Ledgerium captures the real browser-based steps across your policy and claims systems, so the documentation matches how adjusters and underwriters actually work, not how a manual assumes they do.',
  primaryKeyword: 'insurance workflow documentation',
  secondaryKeywords: ['insurance SOPs', 'document insurance processes', 'claims process documentation'],
  searchIntent: 'commercial',
  tags: ['industry', 'insurance', 'claims', 'documentation'],
  related: ['workflow:contract-review-workflow', 'software:salesforce', 'problem:how-to-document-approval-workflows'],
  industryContext:
    'Insurance is process-heavy by nature, but claims, underwriting, and policy administration are often documented from memory and spread across legacy and modern systems. Steps differ by line of business and role, so a manual written for one team rarely reflects how another actually handles the work.',
  commonWorkflows: [
    'Claims intake and triage',
    'Underwriting review and risk assessment',
    'Policy issuance and endorsements',
    'Renewals and cancellations',
  ],
  documentationConcerns: [
    'Steps differ by line of business and adjuster',
    'Knowledge lives with senior underwriters and adjusters',
    'Procedures span legacy and modern systems',
  ],
  complianceConcerns: [
    'Consistent claims handling for regulatory review',
    'Evidence that the documented process is the one followed',
    'Auditable records of underwriting decisions',
  ],
  aiOpportunities: [
    'Flagging claims steps that consistently run late',
    'Drafting routine policy entries for human review',
    'Spotting variation in how adjusters handle similar claims',
  ],
  honestLimitation:
    'Ledgerium captures browser-based claims and policy work. Phone calls, field inspections, and steps outside the browser need separate capture.',
  originalDataPoint:
    'Insurance claims and underwriting workflows vary by line of business and role. Ledgerium records the process as the actual adjuster or underwriter performs it, so the SOP reflects the real steps rather than a manual’s assumptions.',
  faqs: [
    {
      q: 'How do I document insurance claims and underwriting workflows?',
      a: 'Record each workflow once as the adjuster or underwriter performs it, then generate the SOP and process map from the recording. It captures the real line-of-business steps a manual misses.',
    },
    {
      q: 'Why do our claims and underwriting manuals go out of date?',
      a: 'They are written from memory and rarely updated as systems and rules change. Recording the live process keeps documentation tied to how the work is actually done now.',
    },
    {
      q: 'How does this support regulatory and audit needs?',
      a: 'It produces evidence-linked documentation traceable to the recorded steps, which shows consistent handling and that the documented process is the one followed.',
    },
    {
      q: 'Can this capture knowledge from senior adjusters?',
      a: 'Yes. Recording an experienced adjuster’s process turns their judgment-driven steps into structured SOPs before they move on, including the shortcuts they take automatically.',
    },
    {
      q: 'Where can AI help in insurance operations?',
      a: 'In repetitive claims and policy steps like routine entries and stall detection. Coverage and risk decisions should keep a human involved.',
    },
  ],
  jsonLd: ['Article', 'FAQPage', 'BreadcrumbList', 'WebPage', 'Organization'],
  author: { name: 'Ledgerium Research Team', sameAs: ['https://www.linkedin.com/company/ledgerium'] },
  updatedAt: '2026-06-27',
  published: true,
};

const banking: IndustryPage = {
  type: 'industry',
  slug: 'banking',
  metaTitle: 'Banking Workflow Documentation',
  metaDescription:
    'Document banking and financial services workflows by recording how they really run. Get SOPs, process maps, and AI opportunities.',
  h1: 'Banking workflow documentation',
  eyebrow: 'Industry',
  shortAnswer:
    'Banking and financial services depend on consistent onboarding, KYC checks, operations, and controls, but the system steps are often documented from memory and vary by team. Recording how each workflow actually runs gives you an SOP, a process map, and a report showing where time is lost and what is worth automating. Ledgerium captures the real browser-based steps across your core and back-office systems, so documentation reflects how the work is really performed and supports audit evidence.',
  primaryKeyword: 'banking workflow documentation',
  secondaryKeywords: ['banking SOPs', 'financial services process documentation', 'document banking operations'],
  searchIntent: 'commercial',
  tags: ['industry', 'banking', 'operations', 'documentation'],
  related: ['workflow:customer-onboarding-workflow', 'persona:compliance-teams', 'problem:how-to-prepare-for-a-process-audit'],
  industryContext:
    'Banking and financial services operate under heavy controls, yet onboarding, KYC, and back-office operations are often documented from memory and vary by team. System steps differ by product and role, so a generic procedure rarely matches how a given operations group actually works.',
  commonWorkflows: [
    'Customer onboarding and KYC checks',
    'Account opening and maintenance',
    'Payment and transaction processing',
    'Controls testing and exception handling',
  ],
  documentationConcerns: [
    'Steps differ by product, system, and role',
    'Knowledge lives with experienced operations staff',
    'Procedures change with regulation and rarely get updated',
  ],
  complianceConcerns: [
    'KYC and AML evidence for regulatory review',
    'SOX-aligned documentation of financial controls',
    'Evidence that staff follow the approved procedure',
  ],
  aiOpportunities: [
    'Flagging onboarding or KYC steps that stall',
    'Drafting routine operations entries for human review',
    'Spotting variation in how teams handle the same control',
  ],
  honestLimitation:
    'Ledgerium captures browser-based banking operations work. Core mainframe terminals and steps outside the browser need separate capture.',
  originalDataPoint:
    'Banking operations workflows vary by product and role. Ledgerium records the process as the actual operator performs it, so the SOP reflects the real steps and provides audit evidence rather than an idealized procedure.',
  faqs: [
    {
      q: 'How do I document banking and operations workflows?',
      a: 'Record each onboarding or operations workflow once as the role performs it, then generate the SOP and process map from the recording. It captures the real product-specific steps a generic procedure misses.',
    },
    {
      q: 'How does this support KYC, AML, and SOX needs?',
      a: 'It produces evidence-linked documentation traceable to the recorded steps, which supports KYC and AML reviews and SOX control documentation by showing the process actually followed.',
    },
    {
      q: 'Why do our operations procedures drift out of date?',
      a: 'They are written from memory and rarely revised as systems and rules change. Recording the live process keeps documentation tied to current practice.',
    },
    {
      q: 'Can this capture knowledge from experienced operations staff?',
      a: 'Yes. Recording a long-tenured operator’s process turns their knowledge into structured SOPs before they leave, including the shortcuts they take automatically.',
    },
    {
      q: 'Where can AI help in banking operations?',
      a: 'In repetitive steps like routine entries and stall detection across onboarding and processing. Credit, risk, and compliance decisions should keep a human involved.',
    },
  ],
  jsonLd: ['Article', 'FAQPage', 'BreadcrumbList', 'WebPage', 'Organization'],
  author: { name: 'Ledgerium Research Team', sameAs: ['https://www.linkedin.com/company/ledgerium'] },
  updatedAt: '2026-06-27',
  published: true,
};

const saas: IndustryPage = {
  type: 'industry',
  slug: 'saas',
  metaTitle: 'SaaS Operations Workflow Documentation',
  metaDescription:
    'Document SaaS onboarding, support, and RevOps workflows by recording how they really run. Get SOPs, process maps, and AI opportunities.',
  h1: 'SaaS workflow documentation',
  eyebrow: 'Industry',
  shortAnswer:
    'SaaS teams run customer onboarding, support, and RevOps across many tools, but the steps live in people’s heads and change every release. Recording how each workflow actually runs produces an SOP, a process map, and a report showing where time is lost and what is worth automating. Ledgerium captures the real browser-based steps across your CRM, support, and billing tools, so documentation matches how the team works today rather than a stale onboarding doc written months ago.',
  primaryKeyword: 'saas workflow documentation',
  secondaryKeywords: ['SaaS SOPs', 'document SaaS processes', 'RevOps process documentation'],
  searchIntent: 'commercial',
  tags: ['industry', 'saas', 'revops', 'documentation'],
  related: ['workflow:customer-onboarding-workflow', 'software:salesforce', 'persona:revops-managers'],
  industryContext:
    'SaaS companies move fast, and onboarding, support, and RevOps processes change with nearly every release. Steps live across the CRM, support desk, and billing tools, so documentation written once is stale within weeks and new hires learn by shadowing rather than from a current SOP.',
  commonWorkflows: [
    'Customer onboarding and provisioning',
    'Support ticket triage and resolution',
    'Lead qualification and routing',
    'Renewals, billing, and churn handling',
  ],
  documentationConcerns: [
    'Processes change with frequent product releases',
    'Steps span the CRM, support desk, and billing tools',
    'Knowledge lives with early employees and team leads',
  ],
  complianceConcerns: [
    'Consistent handling for SOC 2 and security reviews',
    'Evidence that the documented process is the one followed',
    'Auditable records of customer data handling',
  ],
  aiOpportunities: [
    'Flagging onboarding or support steps that stall',
    'Drafting routine ticket responses for human review',
    'Spotting variation in how reps qualify the same leads',
  ],
  honestLimitation:
    'Ledgerium captures browser-based SaaS workflows. Steps inside desktop apps or external partner systems need separate capture.',
  originalDataPoint:
    'SaaS processes change with each release and rarely get re-documented. Ledgerium records how the workflow runs today across your tools, so the SOP reflects current practice rather than an onboarding doc written months ago.',
  faqs: [
    {
      q: 'How do I document SaaS onboarding and support workflows?',
      a: 'Record each workflow once as the rep performs it across your tools, then generate the SOP and process map from the recording. It captures the real cross-system steps a static doc misses.',
    },
    {
      q: 'How do we keep SaaS SOPs current as the product changes?',
      a: 'Re-record the workflow after a release to refresh the SOP and process map from how it actually runs now, instead of editing a document from memory.',
    },
    {
      q: 'Can this document a process across multiple tools?',
      a: 'Yes. Ledgerium records the steps across your CRM, support desk, and billing tools in one workflow, so the SOP reflects the full path rather than one system in isolation.',
    },
    {
      q: 'How does this support SOC 2 and security reviews?',
      a: 'It produces evidence-linked documentation traceable to the recorded steps, which shows consistent handling for security and audit reviews.',
    },
    {
      q: 'Where can AI help in SaaS operations?',
      a: 'In repetitive onboarding, support, and RevOps steps like routine responses and stall detection. Customer and revenue decisions should keep a human involved.',
    },
  ],
  jsonLd: ['Article', 'FAQPage', 'BreadcrumbList', 'WebPage', 'Organization'],
  author: { name: 'Ledgerium Research Team', sameAs: ['https://www.linkedin.com/company/ledgerium'] },
  updatedAt: '2026-06-27',
  published: true,
};

const professionalServices: IndustryPage = {
  type: 'industry',
  slug: 'professional-services',
  metaTitle: 'Professional Services Workflow Documentation',
  metaDescription:
    'Document professional services client onboarding, delivery, and billing workflows by recording how they run. Get SOPs and process maps.',
  h1: 'Professional services workflow documentation',
  eyebrow: 'Industry',
  shortAnswer:
    'Professional services firms run client onboarding, delivery, and billing the same way each engagement, in theory, but in practice the steps live with individual staff and vary by client. Recording how each workflow actually runs gives you an SOP, a process map, and a report showing where time is lost and what is worth automating. Ledgerium captures the real browser-based steps across your delivery and billing systems, so documentation reflects how work is really done and new hires ramp faster.',
  primaryKeyword: 'professional services workflow documentation',
  secondaryKeywords: ['professional services SOPs', 'document consulting processes', 'client delivery documentation'],
  searchIntent: 'commercial',
  tags: ['industry', 'professional-services', 'delivery', 'documentation'],
  related: ['workflow:customer-onboarding-workflow', 'persona:consultants', 'problem:how-to-document-a-business-process'],
  industryContext:
    'Professional services firms sell their process as much as their people, yet client onboarding, delivery, and billing usually live with individual staff and vary by client and partner. New hires ramp slowly because the real steps are rarely written down in a way that matches how the work is actually performed.',
  commonWorkflows: [
    'Client onboarding and intake',
    'Engagement delivery and handoffs',
    'Time tracking and approvals',
    'Invoicing and billing',
  ],
  documentationConcerns: [
    'Steps vary by client, partner, and engagement',
    'Knowledge lives with individual consultants and managers',
    'Onboarding relies on shadowing rather than written SOPs',
  ],
  complianceConcerns: [
    'Consistent delivery against agreed scope',
    'Auditable records of approvals and billing',
    'Evidence that the documented process is the one followed',
  ],
  aiOpportunities: [
    'Flagging delivery or billing steps that stall',
    'Drafting routine onboarding tasks for human review',
    'Spotting variation in how consultants run the same engagement',
  ],
  honestLimitation:
    'Ledgerium captures browser-based delivery and billing work. Client meetings and steps outside the browser need separate capture.',
  originalDataPoint:
    'Professional services delivery varies by client and consultant. Ledgerium records the process as the actual person performs it, so the SOP reflects how work is really done and shortens ramp time for new hires.',
  faqs: [
    {
      q: 'How do I document professional services workflows?',
      a: 'Record each onboarding, delivery, or billing workflow once as the person performs it, then generate the SOP and process map from the recording. It captures the real steps shadowing leaves implicit.',
    },
    {
      q: 'How does this shorten new-hire ramp time?',
      a: 'New hires follow an SOP and process map built from how an experienced colleague actually works, instead of learning only by watching over a shoulder.',
    },
    {
      q: 'Can this capture knowledge from senior consultants?',
      a: 'Yes. Recording an experienced consultant’s process turns their approach into structured SOPs before they roll off, including the shortcuts they take automatically.',
    },
    {
      q: 'Why do our delivery processes vary by client?',
      a: 'Each engagement adapts to the client, and the steps live in people’s heads. Recording the real process per workflow makes the variation visible and easier to standardize.',
    },
    {
      q: 'Where can AI help in professional services?',
      a: 'In repetitive onboarding, delivery, and billing steps like routine tasks and stall detection. Client judgment and scope decisions should keep a human involved.',
    },
  ],
  jsonLd: ['Article', 'FAQPage', 'BreadcrumbList', 'WebPage', 'Organization'],
  author: { name: 'Ledgerium Research Team', sameAs: ['https://www.linkedin.com/company/ledgerium'] },
  updatedAt: '2026-06-27',
  published: true,
};

const government: IndustryPage = {
  type: 'industry',
  slug: 'government',
  metaTitle: 'Government Workflow Documentation',
  metaDescription:
    'Document public sector case processing, approvals, and records workflows by recording how they run. Get SOPs and process maps.',
  h1: 'Government workflow documentation',
  eyebrow: 'Industry',
  shortAnswer:
    'Public sector teams process cases, approvals, and records through defined procedures, but the actual system steps are often documented from memory and vary by office. Recording how each workflow actually runs produces an SOP, a process map, and a report showing where time is lost and what is worth automating. Ledgerium captures the real browser-based steps across your case and records systems, so documentation matches how staff really work and provides evidence the procedure is followed.',
  primaryKeyword: 'government workflow documentation',
  secondaryKeywords: ['public sector SOPs', 'document government processes', 'case processing documentation'],
  searchIntent: 'commercial',
  tags: ['industry', 'government', 'public-sector', 'documentation'],
  related: ['workflow:access-provisioning-workflow', 'persona:compliance-teams', 'problem:how-to-document-approval-workflows'],
  industryContext:
    'Government and public sector teams work to defined procedures, but the actual system steps behind case processing, approvals, and records are often documented from memory and vary by office. Staff turnover and long-running legacy systems mean the written procedure and the real process frequently diverge.',
  commonWorkflows: [
    'Case intake and processing',
    'Application review and approvals',
    'Records management and retention',
    'Permit or license issuance',
  ],
  documentationConcerns: [
    'Steps vary by office and legacy system',
    'Knowledge lives with long-tenured public servants',
    'Procedures change with policy and rarely get updated',
  ],
  complianceConcerns: [
    'Evidence that staff follow the approved procedure',
    'Auditable records for public accountability',
    'Consistent case handling across offices',
  ],
  aiOpportunities: [
    'Flagging approval steps that consistently run late',
    'Drafting routine case entries for human review',
    'Spotting variation in how offices handle the same case type',
  ],
  honestLimitation:
    'Ledgerium captures browser-based case and records work. Paper-based steps and legacy terminals outside the browser need separate capture.',
  originalDataPoint:
    'Public sector workflows vary by office and legacy system. Ledgerium records the process as the actual caseworker performs it, so the SOP reflects the real steps and provides evidence the procedure is followed.',
  faqs: [
    {
      q: 'How do I document public sector workflows?',
      a: 'Record each case, approval, or records workflow once as the caseworker performs it, then generate the SOP and process map from the recording. It captures the real office-specific steps a procedure document misses.',
    },
    {
      q: 'How does this support audits and accountability?',
      a: 'It produces evidence-linked documentation traceable to the recorded steps, which shows consistent handling and that the documented procedure is the one followed.',
    },
    {
      q: 'Can this capture knowledge before staff retire?',
      a: 'Yes. Recording a long-tenured public servant’s process turns their knowledge into structured SOPs before they leave, including the shortcuts they take automatically.',
    },
    {
      q: 'Why do our written procedures not match practice?',
      a: 'Procedures are written once and offices adapt over time. Recording the live process keeps documentation tied to how the work is actually done.',
    },
    {
      q: 'Where can AI help in public sector operations?',
      a: 'In repetitive case and records steps like routine entries and stall detection. Eligibility and policy decisions should keep a qualified human involved.',
    },
  ],
  jsonLd: ['Article', 'FAQPage', 'BreadcrumbList', 'WebPage', 'Organization'],
  author: { name: 'Ledgerium Research Team', sameAs: ['https://www.linkedin.com/company/ledgerium'] },
  updatedAt: '2026-06-27',
  published: true,
};

const education: IndustryPage = {
  type: 'industry',
  slug: 'education',
  metaTitle: 'Education Workflow Documentation',
  metaDescription:
    'Document education admissions, enrollment, and administrative workflows by recording how they run. Get SOPs and process maps.',
  h1: 'Education workflow documentation',
  eyebrow: 'Industry',
  shortAnswer:
    'Education institutions run admissions, enrollment, and administrative processes across many systems, but the steps are usually documented from memory and shift each term. Recording how each workflow actually runs gives you an SOP, a process map, and a report showing where time is lost and what is worth automating. Ledgerium captures the real browser-based steps across your student and administrative systems, so documentation reflects how staff actually work rather than an outdated handbook.',
  primaryKeyword: 'education workflow documentation',
  secondaryKeywords: ['education SOPs', 'document admissions processes', 'enrollment process documentation'],
  searchIntent: 'commercial',
  tags: ['industry', 'education', 'admissions', 'documentation'],
  related: ['workflow:employee-onboarding-workflow', 'persona:operations-managers', 'problem:how-to-document-a-business-process'],
  industryContext:
    'Education institutions run admissions, enrollment, and administrative processes across student information systems and many supporting tools. The steps are usually documented from memory and shift each term, so staff learn by experience and the written guide rarely matches the current system.',
  commonWorkflows: [
    'Admissions application review',
    'Enrollment and registration',
    'Financial aid and records updates',
    'Transcript and records requests',
  ],
  documentationConcerns: [
    'Steps change each term and intake cycle',
    'Knowledge lives with experienced administrative staff',
    'Procedures span the student system and supporting tools',
  ],
  complianceConcerns: [
    'Consistent handling of student records',
    'Evidence that staff follow the approved procedure',
    'Auditable records for accreditation reviews',
  ],
  aiOpportunities: [
    'Flagging admissions or enrollment steps that stall',
    'Drafting routine records updates for human review',
    'Spotting variation in how staff process the same application',
  ],
  honestLimitation:
    'Ledgerium captures browser-based admissions and administrative work. In-person steps and offline systems need separate capture.',
  originalDataPoint:
    'Education admin workflows shift each term and span several systems. Ledgerium records the process as the actual administrator performs it, so the SOP reflects the current steps rather than a handbook written for a past cycle.',
  faqs: [
    {
      q: 'How do I document admissions and enrollment workflows?',
      a: 'Record each workflow once as the administrator performs it across your systems, then generate the SOP and process map from the recording. It captures the real cross-system steps a handbook misses.',
    },
    {
      q: 'How do we keep education SOPs current across terms?',
      a: 'Re-record the workflow at the start of a new cycle to refresh the SOP and process map from how it actually runs now, instead of editing a guide from memory.',
    },
    {
      q: 'Can this document a process across multiple systems?',
      a: 'Yes. Ledgerium records the steps across your student information system and supporting tools in one workflow, so the SOP reflects the full path.',
    },
    {
      q: 'How does this support accreditation reviews?',
      a: 'It produces evidence-linked documentation traceable to the recorded steps, which shows consistent handling of student records and processes.',
    },
    {
      q: 'Where can AI help in education administration?',
      a: 'In repetitive admissions and records steps like routine updates and stall detection. Admissions and academic decisions should keep a human involved.',
    },
  ],
  jsonLd: ['Article', 'FAQPage', 'BreadcrumbList', 'WebPage', 'Organization'],
  author: { name: 'Ledgerium Research Team', sameAs: ['https://www.linkedin.com/company/ledgerium'] },
  updatedAt: '2026-06-27',
  published: true,
};

export const INDUSTRY_PAGES: readonly IndustryPage[] = [
  manufacturing,
  healthcare,
  insurance,
  banking,
  saas,
  professionalServices,
  government,
  education,
];
